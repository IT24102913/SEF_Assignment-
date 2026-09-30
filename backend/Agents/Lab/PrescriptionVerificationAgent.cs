using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace HealthBridge.Api.Agents.Lab;

/// <summary>
/// Input contract for the PrescriptionVerificationAgent.
/// </summary>
public class PrescriptionVerificationInput
{
    public Guid BookingId { get; set; }
    public string PatientName { get; set; } = string.Empty;
    public string TestName { get; set; } = string.Empty;
    public string? PrescriptionImageUrl { get; set; }
}

/// <summary>
/// Output contract for the PrescriptionVerificationAgent.
/// </summary>
public class PrescriptionVerificationOutput
{
    public bool Success { get; set; }
    public double Confidence { get; set; } = 1.0;
    public bool MatchFound { get; set; }
    public string? DoctorName { get; set; }
    public DateOnly? PrescriptionDate { get; set; }
    public List<string> ExtractedInvestigations { get; set; } = new();

    // 5-Stage Document Classification & Authenticity Properties
    public string DocumentClassification { get; set; } = "UNKNOWN"; 
    // HANDWRITTEN_PRESCRIPTION | COMPUTER_PRINTED_PRESCRIPTION | NON_MEDICAL_IMAGE | NON_PRESCRIPTION_DOCUMENT | SUSPICIOUS_FORGERY
    public string DocumentTypeDescription { get; set; } = string.Empty;
    public bool IsValidMedicalPrescription { get; set; }
    public bool IsForgeryOrTrainingSample { get; set; }
    public List<string> SecurityFlags { get; set; } = new();

    public string StatusMessage { get; set; } = string.Empty;
    public string Notes { get; set; } = string.Empty;
    public string AuditLog { get; set; } = string.Empty;
}

/// <summary>
/// PrescriptionVerificationAgent — Specialized Multimodal Vision AI Agent (Agent 1 of 2 in Lab Management).
/// 
/// Core Capabilities across 5 Document Types:
/// 1. Handwritten Prescriptions (Doctor handwritten cursive script / clinic notes)
/// 2. Computer Printed Prescriptions (Digital hospital prescription forms)
/// 3. Random Non-Medical Images (Anime posters, personal photos, graphic artwork) -> Auto-Rejected
/// 4. Non-Prescription Text Documents (School homework exercises, R/Python code instructions) -> Auto-Rejected
/// 5. Fake / Forged / Annotated Training Data ("TRAINING DATA - DO NOT USE", "FORGERY", future dates) -> Security Flagged
/// 
/// Enforces Human-in-the-Loop compliance: Never auto-approves fake or non-medical images.
/// </summary>
public class PrescriptionVerificationAgent
{
    public string AgentName => "PrescriptionVerificationAgent";
    public string Role => "Clinical Document AI & Authenticity Validator";

    private readonly IConfiguration _config;
    private readonly HttpClient _httpClient;
    private readonly ILogger<PrescriptionVerificationAgent> _logger;
    private readonly IWebHostEnvironment _env;

    public PrescriptionVerificationAgent(
        IConfiguration config,
        IHttpClientFactory httpClientFactory,
        ILogger<PrescriptionVerificationAgent> logger,
        IWebHostEnvironment env)
    {
        _config = config;
        _httpClient = httpClientFactory.CreateClient("GeminiClient");
        _logger = logger;
        _env = env;
    }

    public async Task<PrescriptionVerificationOutput> VerifyPrescriptionAsync(PrescriptionVerificationInput input)
    {
        _logger.LogInformation("[{Agent}] Verifying document for booking {BookingId}, requested item/test: '{TestName}'", 
            AgentName, input.BookingId, input.TestName);

        if (string.IsNullOrWhiteSpace(input.PrescriptionImageUrl))
        {
            return new PrescriptionVerificationOutput
            {
                Success = false,
                Confidence = 0.0,
                MatchFound = false,
                DocumentClassification = "NO_DOCUMENT",
                DocumentTypeDescription = "No Document Provided",
                IsValidMedicalPrescription = false,
                StatusMessage = "No prescription document provided for verification.",
                Notes = "Uploaded prescription image URL was empty.",
                AuditLog = $"Executed at {DateTime.UtcNow:O} by {AgentName}: No image provided."
            };
        }

        try
        {
            var apiKey = _config["Gemini:ApiKey"];
            var base64Data = await GetBase64ImageDataAsync(input.PrescriptionImageUrl);

            if (string.IsNullOrEmpty(base64Data))
            {
                return BuildFallback(input.TestName, "Could not load or decode prescription image file.");
            }

            var prompt = $@"You are an advanced hospital Pathology & Pharmacy Prescription Vision AI Inspector.
Analyze the uploaded image thoroughly and perform a 5-step classification, authenticity, and clinical extraction audit.

DOCUMENT CATEGORIES:
1. HANDWRITTEN_PRESCRIPTION: Authentic doctor handwritten prescription on medical letterhead/notepad.
2. COMPUTER_PRINTED_PRESCRIPTION: Authentic computer generated/printed medical prescription form.
3. NON_MEDICAL_IMAGE: Random picture, anime poster (e.g., Naruto), artwork, landscape, pet, meme, or personal photo containing no medical content.
4. NON_PRESCRIPTION_DOCUMENT: Non-medical text document (e.g., homework exercise sheet, R/Python code instructions, essay, receipt, book page).
5. SUSPICIOUS_FORGERY: Fake prescription, invalid training dataset image with watermarks (""TRAINING DATA"", ""DO NOT USE"", ""FORGERY"", ""DOSAGE ERROR"", ""SIG MISMATCH"", ""DUPLICATE""), future dates, or tampered medical credentials.

RULES & SECURITY FORGERY CHECKS:
- If the image contains text like ""TRAINING DATA"", ""DO NOT USE"", ""FORGERY"", ""DOSAGE ERROR"", ""SIG MISMATCH"", ""DUPLICATE"", or red marker annotations pointing out errors, mark documentClassification as ""SUSPICIOUS_FORGERY"", set isForgeryOrTrainingSample to true, set isValidMedicalPrescription to false, set matchFound to false, set confidence to 0.05.
- If the image is an anime character poster (e.g. Naruto), photo, artwork, or graphic, mark documentClassification as ""NON_MEDICAL_IMAGE"", set isValidMedicalPrescription to false, set matchFound to false, set confidence to 0.0.
- If the image is a school homework assignment, code listing, or non-medical document, mark documentClassification as ""NON_PRESCRIPTION_DOCUMENT"", set isValidMedicalPrescription to false, set matchFound to false, set confidence to 0.0.
- If the image is a valid doctor handwritten or computer printed prescription, mark documentClassification accordingly, set isValidMedicalPrescription to true, set isForgeryOrTrainingSample to false.

REQUESTED INVESTIGATION / TEST NAME: ""{input.TestName}""

Be flexible with medical abbreviations and synonyms (e.g. 'Full Blood Count' = 'CBC' = 'FBC', 'Lipid Profile' = 'Lipid', 'FBS' = 'Fasting Blood Sugar', 'Amoxicillin 500mg' = 'Tab. Amoxicillin').

Respond STRICTLY in pure JSON format without any markdown code fences or backticks:
{{
  ""documentClassification"": ""HANDWRITTEN_PRESCRIPTION"" | ""COMPUTER_PRINTED_PRESCRIPTION"" | ""NON_MEDICAL_IMAGE"" | ""NON_PRESCRIPTION_DOCUMENT"" | ""SUSPICIOUS_FORGERY"",
  ""documentTypeDescription"": ""Brief summary description of document type"",
  ""isValidMedicalPrescription"": true or false,
  ""isForgeryOrTrainingSample"": true or false,
  ""securityFlags"": [""flag1"", ""flag2""],
  ""doctorName"": ""Dr. Name or Unknown"",
  ""prescriptionDate"": ""YYYY-MM-DD or Unknown"",
  ""patientName"": ""Name or Unknown"",
  ""extractedTests"": [""test1"", ""test2""],
  ""matchFound"": true or false,
  ""confidence"": 0.0 to 1.0,
  ""notes"": ""Detailed clinical explanation and security findings""
}}";

            var requestBody = new
            {
                contents = new[]
                {
                    new
                    {
                        parts = new object[]
                        {
                            new { text = prompt },
                            new
                            {
                                inline_data = new
                                {
                                    mime_type = "image/jpeg",
                                    data = base64Data
                                }
                            }
                        }
                    }
                },
                generationConfig = new
                {
                    temperature = 0.1,
                    maxOutputTokens = 1024
                }
            };

            var jsonPayload = JsonSerializer.Serialize(requestBody);
            var configuredModel = _config["Gemini:Model"] ?? "gemini-1.5-flash";

            var endpointsList = new List<string>();
            if (!string.IsNullOrWhiteSpace(apiKey) && apiKey.StartsWith("ya29."))
            {
                endpointsList.Add($"https://generativelanguage.googleapis.com/v1beta/models/{configuredModel}:generateContent");
                endpointsList.Add("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent");
                endpointsList.Add("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent");
                endpointsList.Add("https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent");
            }

            endpointsList.Add($"https://generativelanguage.googleapis.com/v1beta/models/{configuredModel}:generateContent?key={apiKey}");
            endpointsList.Add($"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={apiKey}");
            endpointsList.Add($"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={apiKey}");
            endpointsList.Add($"https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key={apiKey}");

            var endpoints = endpointsList.Distinct().ToArray();
            HttpResponseMessage? response = null;
            string responseBody = string.Empty;

            foreach (var ep in endpoints)
            {
                using var requestMsg = new HttpRequestMessage(HttpMethod.Post, ep);
                requestMsg.Content = new StringContent(jsonPayload, Encoding.UTF8, MediaTypeHeaderValue.Parse("application/json"));

                if (!string.IsNullOrWhiteSpace(apiKey))
                {
                    requestMsg.Headers.TryAddWithoutValidation("x-goog-api-key", apiKey);
                    if (apiKey.StartsWith("ya29."))
                    {
                        requestMsg.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
                    }
                }

                response = await _httpClient.SendAsync(requestMsg);
                responseBody = await response.Content.ReadAsStringAsync();

                if (response.IsSuccessStatusCode) break;
            }

            if (response == null || !response.IsSuccessStatusCode)
            {
                _logger.LogWarning("[{Agent}] Gemini Vision API returned status {StatusCode}. Fallback engaged.", AgentName, response?.StatusCode);
                return BuildFallback(input.TestName, $"AI API response status {response?.StatusCode}. Queued for technician inspection.");
            }

            var geminiDoc = JsonSerializer.Deserialize<JsonElement>(responseBody);
            var rawText = geminiDoc
                .GetProperty("candidates")[0]
                .GetProperty("content")
                .GetProperty("parts")[0]
                .GetProperty("text")
                .GetString() ?? "";

            var cleanedJson = CleanJsonText(rawText);
            using var ocrDoc = JsonDocument.Parse(cleanedJson);
            var root = ocrDoc.RootElement;

            var docClassification = root.TryGetProperty("documentClassification", out var dc) ? dc.GetString() ?? "UNKNOWN" : "UNKNOWN";
            var docDesc = root.TryGetProperty("documentTypeDescription", out var dd) ? dd.GetString() ?? "" : "";
            var isValidRx = root.TryGetProperty("isValidMedicalPrescription", out var iv) && iv.GetBoolean();
            var isForgery = root.TryGetProperty("isForgeryOrTrainingSample", out var iff) && iff.GetBoolean();

            var flags = new List<string>();
            if (root.TryGetProperty("securityFlags", out var secArr) && secArr.ValueKind == JsonValueKind.Array)
            {
                foreach (var item in secArr.EnumerateArray())
                {
                    if (item.GetString() is string s) flags.Add(s);
                }
            }

            var matchFound = root.TryGetProperty("matchFound", out var mf) && mf.GetBoolean();
            var confidence = root.TryGetProperty("confidence", out var conf) ? conf.GetDouble() : 0.85;

            var extractedTests = new List<string>();
            if (root.TryGetProperty("extractedTests", out var testsArr) && testsArr.ValueKind == JsonValueKind.Array)
            {
                foreach (var t in testsArr.EnumerateArray())
                {
                    if (t.GetString() is string ts) extractedTests.Add(ts);
                }
            }

            var doctorName = root.TryGetProperty("doctorName", out var doc) ? doc.GetString() : "Not Detected";
            var prescriptionDateStr = root.TryGetProperty("prescriptionDate", out var pdate) ? pdate.GetString() : null;
            DateOnly? parsedPrescriptionDate = null;
            if (DateOnly.TryParse(prescriptionDateStr, out var parsedDate))
            {
                parsedPrescriptionDate = parsedDate;
            }

            var notes = root.TryGetProperty("notes", out var n) ? n.GetString() : "Gemini Vision OCR analysis complete.";

            string statusMessage;
            if (isForgery || docClassification == "SUSPICIOUS_FORGERY")
            {
                statusMessage = "SECURITY REJECTION: Document identified as fake/forgery or annotated training dataset ('TRAINING DATA - DO NOT USE').";
                matchFound = false;
                confidence = Math.Min(confidence, 0.05);
            }
            else if (docClassification == "NON_MEDICAL_IMAGE")
            {
                statusMessage = "REJECTED: Uploaded file is a non-medical graphic/photo (e.g. anime poster or picture). No prescription header found.";
                matchFound = false;
                confidence = 0.0;
            }
            else if (docClassification == "NON_PRESCRIPTION_DOCUMENT")
            {
                statusMessage = "REJECTED: Uploaded file is a non-medical text document (e.g. homework code sheet). No valid doctor prescription found.";
                matchFound = false;
                confidence = 0.0;
            }
            else if (isValidRx && matchFound)
            {
                statusMessage = $"Prescription verified ({docClassification.Replace('_', ' ')}). Doctor: {doctorName}.";
            }
            else if (isValidRx && !matchFound)
            {
                statusMessage = $"Valid prescription detected ({docClassification.Replace('_', ' ')}), but requested item '{input.TestName}' was not found on the prescription.";
            }
            else
            {
                statusMessage = notes;
            }

            return new PrescriptionVerificationOutput
            {
                Success = true,
                Confidence = confidence,
                MatchFound = matchFound,
                DoctorName = doctorName,
                PrescriptionDate = parsedPrescriptionDate,
                ExtractedInvestigations = extractedTests,
                DocumentClassification = docClassification,
                DocumentTypeDescription = string.IsNullOrWhiteSpace(docDesc) ? docClassification.Replace('_', ' ') : docDesc,
                IsValidMedicalPrescription = isValidRx,
                IsForgeryOrTrainingSample = isForgery,
                SecurityFlags = flags,
                StatusMessage = statusMessage,
                Notes = notes,
                AuditLog = $"Processed at {DateTime.UtcNow:O} by {AgentName} (Classification: {docClassification}, Match: {matchFound})"
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[{Agent}] Exception verifying prescription image", AgentName);
            return BuildFallback(input.TestName, $"OCR processing exception: {ex.Message}");
        }
    }

    private async Task<string?> GetBase64ImageDataAsync(string imageUrl)
    {
        if (imageUrl.StartsWith("data:image"))
        {
            var commaIdx = imageUrl.IndexOf(",");
            return commaIdx >= 0 ? imageUrl.Substring(commaIdx + 1) : imageUrl;
        }

        if (Uri.TryCreate(imageUrl, UriKind.Absolute, out var uri) && (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps))
        {
            var bytes = await _httpClient.GetByteArrayAsync(imageUrl);
            return Convert.ToBase64String(bytes);
        }

        var relativePath = imageUrl.TrimStart('/', '\\');
        var localPath = Path.Combine(_env.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot"), relativePath);
        if (File.Exists(localPath))
        {
            var bytes = await File.ReadAllBytesAsync(localPath);
            return Convert.ToBase64String(bytes);
        }

        return null;
    }

    private static string CleanJsonText(string text)
    {
        var trimmed = text.Trim();
        if (trimmed.StartsWith("```json"))
            trimmed = trimmed.Substring(7);
        else if (trimmed.StartsWith("```"))
            trimmed = trimmed.Substring(3);

        if (trimmed.EndsWith("```"))
            trimmed = trimmed.Substring(0, trimmed.Length - 3);

        return trimmed.Trim();
    }

    private PrescriptionVerificationOutput BuildFallback(string testName, string reason)
    {
        _logger.LogInformation("[{Agent}] Human-in-the-Loop fallback engaged for test: {TestName}", AgentName, testName);
        return new PrescriptionVerificationOutput
        {
            Success = false,
            Confidence = 0.40,
            MatchFound = false,
            DoctorName = "Pending Inspection",
            PrescriptionDate = null,
            ExtractedInvestigations = new List<string>(),
            DocumentClassification = "PENDING_INSPECTION",
            DocumentTypeDescription = "Queued for Pathologist Review",
            IsValidMedicalPrescription = false,
            IsForgeryOrTrainingSample = false,
            StatusMessage = $"Prescription image queued for manual inspection by Lab Technician. ({reason})",
            Notes = reason,
            AuditLog = $"Processed at {DateTime.UtcNow:O} by {AgentName} (Human-in-the-Loop Fallback)"
        };
    }
}
