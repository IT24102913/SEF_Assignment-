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

    public string? DetectedPatientName { get; set; }
    public bool PatientNameMatch { get; set; } = true;
    public string? PatientNameMismatchReason { get; set; }

    public bool PrescriptionDateValid { get; set; } = true;
    public bool IsPrescriptionExpired { get; set; } = false;
    public string? PrescriptionDateReason { get; set; }

    // 5-Stage Document Classification & Authenticity Properties
    public string DocumentClassification { get; set; } = "UNKNOWN"; 
    // HANDWRITTEN_PRESCRIPTION | COMPUTER_PRINTED_PRESCRIPTION | NON_MEDICAL_IMAGE | NON_PRESCRIPTION_DOCUMENT | SUSPICIOUS_FORGERY
    public string DocumentTypeDescription { get; set; } = string.Empty;
    public bool IsValidMedicalPrescription { get; set; }
    public bool IsForgeryOrTrainingSample { get; set; }
    public List<string> SecurityFlags { get; set; } = new();

    public List<string> FlagReasons { get; set; } = new();
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
                                    mime_type = GetMimeType(input.PrescriptionImageUrl),
                                    data = base64Data
                                }
                            }
                        }
                    }
                },
                generationConfig = new
                {
                    temperature = 0.1,
                    maxOutputTokens = 8192,
                    responseMimeType = "application/json"
                }
            };

            var jsonPayload = JsonSerializer.Serialize(requestBody);
            var configuredModel = _config["Gemini:Model"] ?? "gemini-3.5-flash";

            var candidateModels = new[]
            {
                configuredModel,
                "gemini-3.5-flash",
                "gemini-3.5-flash-lite",
                "gemini-3.8-flash"
            }.Where(m => !string.IsNullOrWhiteSpace(m)).Distinct().ToArray();

            var endpointsList = new List<string>();
            foreach (var m in candidateModels)
            {
                if (!string.IsNullOrWhiteSpace(apiKey) && apiKey.StartsWith("ya29."))
                {
                    endpointsList.Add($"https://generativelanguage.googleapis.com/v1beta/models/{m}:generateContent");
                }
                endpointsList.Add($"https://generativelanguage.googleapis.com/v1beta/models/{m}:generateContent?key={apiKey}");
            }

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
                _logger.LogWarning("[{Agent}] Model endpoint {Endpoint} failed with {StatusCode}: {Body}", AgentName, ep.Split('?')[0], response.StatusCode, responseBody.Length > 200 ? responseBody[..200] : responseBody);
            }

            if (response == null || !response.IsSuccessStatusCode)
            {
                _logger.LogWarning("[{Agent}] Gemini Vision API returned status {StatusCode}. Fallback engaged.", AgentName, response?.StatusCode);
                return BuildFallback(input.TestName, $"AI API response status {response?.StatusCode}. Queued for technician inspection.");
            }

            var geminiDoc = JsonSerializer.Deserialize<JsonElement>(responseBody);
            var sb = new StringBuilder();
            if (geminiDoc.TryGetProperty("candidates", out var candidates) &&
                candidates.GetArrayLength() > 0 &&
                candidates[0].TryGetProperty("content", out var content) &&
                content.TryGetProperty("parts", out var parts))
            {
                foreach (var part in parts.EnumerateArray())
                {
                    if (part.TryGetProperty("text", out var t))
                    {
                        sb.Append(t.GetString());
                    }
                }
            }
            var rawText = sb.ToString();
            _logger.LogInformation("[{Agent}] Gemini Vision returned text length {Length}: {Preview}", AgentName, rawText.Length, rawText.Length > 200 ? rawText[..200] : rawText);

            var cleanedJson = CleanJsonText(rawText);
            JsonDocument? ocrDoc = null;
            try
            {
                var jsonOptions = new JsonDocumentOptions
                {
                    CommentHandling = JsonCommentHandling.Skip,
                    AllowTrailingCommas = true
                };
                ocrDoc = JsonDocument.Parse(cleanedJson, jsonOptions);
            }
            catch (JsonException jex)
            {
                _logger.LogWarning("[{Agent}] Vision OCR returned non-JSON text ({Error}). Fallback engaged. Raw: {Raw}",
                    AgentName, jex.Message, rawText.Length > 200 ? rawText.Substring(0, 200) : rawText);
                return BuildFallback(input.TestName, "AI response could not be parsed as structured JSON. Queued for technician inspection.");
            }

            using (ocrDoc)
            {
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
                    if (t.GetString() is string ts && !string.IsNullOrWhiteSpace(ts)) extractedTests.Add(ts.Trim());
                }
            }

            var doctorName = root.TryGetProperty("doctorName", out var doc) ? doc.GetString() : "Not Detected";
            var detectedPatientName = root.TryGetProperty("patientName", out var pn) ? pn.GetString() : null;

            var prescriptionDateStr = root.TryGetProperty("prescriptionDate", out var pdate) ? pdate.GetString() : null;
            DateOnly? parsedPrescriptionDate = null;
            if (DateOnly.TryParse(prescriptionDateStr, out var parsedDate))
            {
                parsedPrescriptionDate = parsedDate;
            }

            var notes = root.TryGetProperty("notes", out var n) ? n.GetString() : "Gemini Vision OCR analysis complete.";

            // 1. Evaluate Investigation Match using synonyms dictionary
            var (investigationMatch, investigationReason) = EvaluateInvestigationMatch(input.TestName, extractedTests, matchFound);
            matchFound = investigationMatch;

            // 2. Evaluate Patient Name Match
            var (nameMatch, resolvedPatientName, nameReason) = EvaluatePatientNameMatch(input.PatientName, detectedPatientName);

            // 3. Evaluate Prescription Date Validity & Expiry
            var (dateValid, dateExpired, dateReason) = EvaluatePrescriptionDate(parsedPrescriptionDate);

            // 4. Collect Flag Reasons
            var flagReasons = new List<string>();
            if (isForgery || docClassification == "SUSPICIOUS_FORGERY")
            {
                flagReasons.Add("Document flagged as suspicious forgery or training dataset watermark");
                matchFound = false;
                confidence = Math.Min(confidence, 0.05);
            }
            if (docClassification == "NON_MEDICAL_IMAGE")
            {
                flagReasons.Add("Uploaded image is a non-medical picture/graphic (no prescription content)");
                matchFound = false;
                confidence = 0.0;
            }
            if (docClassification == "NON_PRESCRIPTION_DOCUMENT")
            {
                flagReasons.Add("Uploaded file is non-medical text/homework/code (not a doctor's prescription)");
                matchFound = false;
                confidence = 0.0;
            }
            if (!matchFound)
            {
                var slipList = extractedTests.Any() ? string.Join(", ", extractedTests) : "None detected";
                flagReasons.Add($"Requested test '{input.TestName}' was not found on prescription slip (detected: {slipList})");
            }
            if (!nameMatch)
            {
                flagReasons.Add(nameReason ?? $"Patient name on slip ('{resolvedPatientName}') does not match registered profile name '{input.PatientName}'");
            }
            if (dateExpired)
            {
                flagReasons.Add(dateReason ?? "Prescription is older than 90 days (expired)");
            }
            else if (!dateValid && parsedPrescriptionDate.HasValue)
            {
                flagReasons.Add(dateReason ?? "Prescription date is invalid or in the future");
            }
            if (string.IsNullOrWhiteSpace(doctorName) || doctorName.Equals("Not Detected", StringComparison.OrdinalIgnoreCase) || doctorName.Equals("Unknown", StringComparison.OrdinalIgnoreCase))
            {
                flagReasons.Add("Doctor name/signature was not clearly identified on the prescription slip");
            }

            var isFullyVerified = isValidRx && matchFound && nameMatch && dateValid && !dateExpired && !isForgery && docClassification != "NON_MEDICAL_IMAGE" && docClassification != "NON_PRESCRIPTION_DOCUMENT" && docClassification != "SUSPICIOUS_FORGERY";

            string statusMessage;
            if (flagReasons.Any())
            {
                statusMessage = $"Flagged for technician review: {string.Join(" • ", flagReasons)}";
            }
            else
            {
                statusMessage = $"Prescription verified ({docClassification.Replace('_', ' ')}). Doctor: {doctorName}. Test '{input.TestName}' confirmed on slip.";
            }

            return new PrescriptionVerificationOutput
            {
                Success = isFullyVerified,
                Confidence = confidence,
                MatchFound = matchFound,
                DoctorName = doctorName,
                PrescriptionDate = parsedPrescriptionDate,
                ExtractedInvestigations = extractedTests,
                DetectedPatientName = resolvedPatientName,
                PatientNameMatch = nameMatch,
                PatientNameMismatchReason = nameReason,
                PrescriptionDateValid = dateValid,
                IsPrescriptionExpired = dateExpired,
                PrescriptionDateReason = dateReason,
                DocumentClassification = docClassification,
                DocumentTypeDescription = string.IsNullOrWhiteSpace(docDesc) ? docClassification.Replace('_', ' ') : docDesc,
                IsValidMedicalPrescription = isValidRx,
                IsForgeryOrTrainingSample = isForgery,
                SecurityFlags = flags,
                FlagReasons = flagReasons,
                StatusMessage = statusMessage,
                Notes = notes,
                AuditLog = $"Processed at {DateTime.UtcNow:O} by {AgentName} (Classification: {docClassification}, Match: {matchFound}, NameMatch: {nameMatch})"
            };
            }
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

        Uri? uri = null;
        string relativePath;
        if (Uri.TryCreate(imageUrl, UriKind.Absolute, out uri) && (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps))
        {
            relativePath = uri.AbsolutePath.TrimStart('/', '\\');
        }
        else
        {
            relativePath = imageUrl.TrimStart('/', '\\');
        }

        if (!string.IsNullOrEmpty(relativePath))
        {
            var localPath = Path.Combine(_env.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot"), relativePath);
            if (File.Exists(localPath))
            {
                var bytes = await File.ReadAllBytesAsync(localPath);
                return Convert.ToBase64String(bytes);
            }
        }

        if (uri != null && (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps))
        {
            var bytes = await _httpClient.GetByteArrayAsync(imageUrl);
            return Convert.ToBase64String(bytes);
        }

        return null;
    }

    private static string GetMimeType(string? url)
    {
        if (string.IsNullOrWhiteSpace(url)) return "image/jpeg";
        if (url.StartsWith("data:image/png", StringComparison.OrdinalIgnoreCase) || url.EndsWith(".png", StringComparison.OrdinalIgnoreCase))
            return "image/png";
        if (url.StartsWith("data:image/webp", StringComparison.OrdinalIgnoreCase) || url.EndsWith(".webp", StringComparison.OrdinalIgnoreCase))
            return "image/webp";
        if (url.StartsWith("data:image/gif", StringComparison.OrdinalIgnoreCase) || url.EndsWith(".gif", StringComparison.OrdinalIgnoreCase))
            return "image/gif";
        return "image/jpeg";
    }

    private static string CleanJsonText(string text)
    {
        if (string.IsNullOrWhiteSpace(text)) return "{}";

        var trimmed = text.Trim();
        if (trimmed.StartsWith("```json", StringComparison.OrdinalIgnoreCase))
            trimmed = trimmed.Substring(7);
        else if (trimmed.StartsWith("```"))
            trimmed = trimmed.Substring(3);

        if (trimmed.EndsWith("```"))
            trimmed = trimmed.Substring(0, trimmed.Length - 3);

        trimmed = trimmed.Trim();

        int firstBrace = trimmed.IndexOf('{');
        int lastBrace = trimmed.LastIndexOf('}');
        if (firstBrace >= 0 && lastBrace > firstBrace)
        {
            return trimmed.Substring(firstBrace, lastBrace - firstBrace + 1).Trim();
        }

        return "{}";
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
            DetectedPatientName = "Pending Inspection",
            PatientNameMatch = false,
            PatientNameMismatchReason = reason,
            PrescriptionDateValid = false,
            IsPrescriptionExpired = false,
            DocumentClassification = "PENDING_INSPECTION",
            DocumentTypeDescription = "Queued for Pathologist Review",
            IsValidMedicalPrescription = false,
            IsForgeryOrTrainingSample = false,
            FlagReasons = new List<string> { $"Manual inspection required: {reason}" },
            StatusMessage = $"Prescription image queued for manual inspection by Lab Technician. ({reason})",
            Notes = reason,
            AuditLog = $"Processed at {DateTime.UtcNow:O} by {AgentName} (Human-in-the-Loop Fallback)"
        };
    }

    public static (bool IsMatch, string FinalName, string? Reason) EvaluatePatientNameMatch(
        string profileName,
        string? detectedName,
        bool? geminiReportedMatch = null,
        string? geminiReason = null)
    {
        if (string.IsNullOrWhiteSpace(detectedName) ||
            detectedName.Equals("Unknown", StringComparison.OrdinalIgnoreCase) ||
            detectedName.Equals("Not Detected", StringComparison.OrdinalIgnoreCase))
        {
            return (false, "Unreadable / Not Detected", "No readable patient name was identified on the uploaded prescription slip.");
        }

        if (geminiReportedMatch == false)
        {
            return (false, detectedName, geminiReason ?? $"Detected patient name '{detectedName}' does not match account name '{profileName}'.");
        }

        if (geminiReportedMatch == true)
        {
            return (true, detectedName, null);
        }

        var cleanProfile = profileName.Replace("Mr.", "").Replace("Mrs.", "").Replace("Ms.", "").Replace("Dr.", "").Trim().ToLower();
        var cleanDetected = detectedName.Replace("Mr.", "").Replace("Mrs.", "").Replace("Ms.", "").Replace("Dr.", "").Trim().ToLower();

        if (cleanProfile == cleanDetected || cleanDetected.Contains(cleanProfile) || cleanProfile.Contains(cleanDetected))
        {
            return (true, detectedName, null);
        }

        return (false, detectedName, $"Detected patient name '{detectedName}' does not match registered profile name '{profileName}'.");
    }

    public static (bool IsValid, bool IsExpired, string? Reason) EvaluatePrescriptionDate(
        DateOnly? prescriptionDate,
        bool? aiReportedDateValid = null,
        bool? aiReportedExpired = null,
        string? aiReportedReason = null,
        DateOnly? referenceDate = null,
        int validityDays = 90)
    {
        if (!prescriptionDate.HasValue)
        {
            return (false, false, "Prescription date was not detected or unreadable on the uploaded document.");
        }

        var today = referenceDate ?? DateOnly.FromDateTime(DateTime.UtcNow);
        var date = prescriptionDate.Value;

        if (date > today)
        {
            return (false, false, $"Prescription contains an invalid future date ({date:yyyy-MM-dd}). Potential forgery or misread.");
        }

        var ageInDays = today.DayNumber - date.DayNumber;
        if (ageInDays > validityDays)
        {
            return (false, true, $"Prescription has expired ({date:yyyy-MM-dd}). Clinical guidelines require a valid prescription within the last {validityDays} days.");
        }

        if (aiReportedExpired == true)
        {
            return (false, true, aiReportedReason ?? "Prescription reported as expired by clinical validation.");
        }

        if (aiReportedDateValid == false)
        {
            return (false, false, aiReportedReason ?? "Prescription date validation failed.");
        }

        return (true, false, null);
    }

    public static (bool IsMatch, string? Reason) EvaluateInvestigationMatch(
        string requestedTest,
        IEnumerable<string> prescribedTests,
        bool? geminiReportedMatch = null)
    {
        if (geminiReportedMatch == true)
        {
            return (true, null);
        }

        var testsList = prescribedTests?.ToList() ?? new List<string>();
        if (!testsList.Any())
        {
            return (false, $"No medical investigations matching requested test '{requestedTest}' were detected on the prescription.");
        }

        var synonyms = new Dictionary<string, string[]>(StringComparer.OrdinalIgnoreCase)
        {
            { "Full Blood Count", new[] { "FBC", "CBC", "Complete Blood Count", "Full Blood Examination", "FBE", "Blood Picture" } },
            { "Fasting Blood Sugar", new[] { "FBS", "Fasting Blood Glucose", "FBG", "Blood Sugar", "Fasting Glucose" } },
            { "Liver Function Test", new[] { "LFT", "Liver Panel", "Hepatic Function" } },
            { "HIV 1/2 Antibody Screening", new[] { "HIV", "HIV ELISA", "HIV Rapid", "HIV 1/2", "HIV Screen", "HIV Antibody" } },
            { "Lipid Profile", new[] { "Lipid Panel", "Lipids", "Cholesterol Panel", "Fasting Lipids" } },
            { "Serum Creatinine", new[] { "Creatinine", "Renal Function", "RFT", "Kidney Function", "KFT" } },
            { "Urine Full Report", new[] { "UFR", "Urine Analysis", "Urinalysis", "Routine Urine" } },
            { "Thyroid Stimulating Hormone", new[] { "TSH", "Thyroid Profile", "TFT" } }
        };

        var reqClean = requestedTest.Trim().ToLower();

        foreach (var p in testsList)
        {
            var pClean = p.Trim().ToLower();
            if (pClean.Contains(reqClean) || reqClean.Contains(pClean))
            {
                return (true, null);
            }

            foreach (var kvp in synonyms)
            {
                bool reqMatchesKey = reqClean.Contains(kvp.Key.ToLower()) || kvp.Key.ToLower().Contains(reqClean);
                bool reqMatchesSynonym = kvp.Value.Any(s => reqClean.Contains(s.ToLower()) || s.ToLower().Contains(reqClean));

                if (reqMatchesKey || reqMatchesSynonym)
                {
                    if (pClean.Contains(kvp.Key.ToLower()) || kvp.Key.ToLower().Contains(pClean) ||
                        kvp.Value.Any(s => pClean.Contains(s.ToLower()) || s.ToLower().Contains(pClean)))
                    {
                        return (true, null);
                    }
                }
            }
        }

        return (false, $"Prescription investigations ({string.Join(", ", testsList)}) do not include requested test '{requestedTest}'.");
    }
}
