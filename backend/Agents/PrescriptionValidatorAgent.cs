using LabManagement.API.DTOs;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace LabManagement.API.Agents;

/// <summary>
/// PrescriptionValidatorAgent — Agentic AI Component (Student D's AI Contribution)
/// 
/// This agent uses Google Gemini Vision API to:
/// 1. OCR-read an uploaded prescription image
/// 2. Extract test names, doctor name, and prescription date
/// 3. Determine whether the requested test is mentioned in the prescription
/// 4. Return a structured validation result for the Lab Technician to review
/// 
/// NOTE: The agent NEVER auto-approves. It only provides a recommendation.
/// The human Lab Technician always makes the final approval decision.
/// This satisfies the "Human-in-the-Loop" requirement of the assignment.
/// </summary>
public class PrescriptionValidatorAgent
{
    private readonly IConfiguration _config;
    private readonly ILogger<PrescriptionValidatorAgent> _logger;
    private readonly HttpClient _httpClient;

    public PrescriptionValidatorAgent(IConfiguration config, ILogger<PrescriptionValidatorAgent> logger, IHttpClientFactory httpClientFactory)
    {
        _config = config;
        _logger = logger;
        _httpClient = httpClientFactory.CreateClient("GeminiClient");
    }

    public async Task<AIVerificationResponseDto> ValidatePrescriptionAsync(string prescriptionImageUrl, string requestedTestName)
    {
        _logger.LogInformation("[AI Agent] Starting prescription validation for test: {TestName}", requestedTestName);

        try
        {
            var apiKey = _config["Gemini:ApiKey"];
            var model = "gemini-flash-latest";
            var endpoint = $"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={apiKey}";

            // Build the prompt for Gemini Vision
            var prompt = $@"You are a medical prescription validator for a hospital laboratory system.
            
Analyze the prescription image provided and extract the following information:
1. All lab tests or medical investigations mentioned
2. The prescribing doctor's name
3. The prescription date
4. The patient's name if visible

Then determine if the following requested lab test is mentioned in the prescription:
REQUESTED TEST: ""{requestedTestName}""

Be lenient with minor spelling variations (e.g., 'Full Blood Count' matches 'Complete Blood Count (CBC)').

Respond ONLY in the following JSON format (no markdown, no extra text):
{{
  ""extractedTests"": [""test1"", ""test2""],
  ""doctorName"": ""Dr. Name or null"",
  ""prescriptionDate"": ""YYYY-MM-DD or null"",
  ""patientName"": ""name or null"",
  ""matchFound"": true or false,
  ""confidence"": 0.0 to 1.0,
  ""notes"": ""brief explanation""
}}";

            // Gemini Vision API request with image URL
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
                                    data = await GetBase64ImageAsync(prescriptionImageUrl)
                                }
                            }
                        }
                    }
                },
                generationConfig = new
                {
                    temperature = 0.1, // Low temperature for deterministic output
                    maxOutputTokens = 1024
                }
            };

            var json = JsonSerializer.Serialize(requestBody);
            var content = new StringContent(json, Encoding.UTF8, "application/json");
            var response = await _httpClient.PostAsync(endpoint, content);
            var responseBody = await response.Content.ReadAsStringAsync();

            _logger.LogInformation("[AI Agent] Gemini API response received. Status: {Status}", response.StatusCode);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("[AI Agent] Gemini API error: {Body}", responseBody);
                return BuildFallbackResponse(requestedTestName, "AI service temporarily unavailable. Manual review required.");
            }

            // Parse Gemini response
            var geminiResponse = JsonSerializer.Deserialize<JsonElement>(responseBody);
            var textContent = geminiResponse
                .GetProperty("candidates")[0]
                .GetProperty("content")
                .GetProperty("parts")[0]
                .GetProperty("text")
                .GetString() ?? "";

            // Parse the structured JSON from Gemini
            var aiResult = JsonSerializer.Deserialize<JsonElement>(textContent.Trim());

            var matchFound = aiResult.GetProperty("matchFound").GetBoolean();
            var confidence = aiResult.GetProperty("confidence").GetDouble();
            var extractedTests = aiResult.GetProperty("extractedTests").EnumerateArray()
                                         .Select(t => t.GetString() ?? "").ToList();
            var doctorName = aiResult.TryGetProperty("doctorName", out var doc) ? doc.GetString() : null;
            var prescriptionDate = aiResult.TryGetProperty("prescriptionDate", out var pd) ? pd.GetString() : null;
            var notes = aiResult.GetProperty("notes").GetString() ?? "";

            var status = matchFound && confidence >= 0.7 ? "PRE_APPROVED" : "FLAGGED";

            _logger.LogInformation("[AI Agent] Validation complete. Status: {Status}, Confidence: {Confidence}", status, confidence);

            return new AIVerificationResponseDto
            {
                Status = status,
                Confidence = confidence,
                ExtractedTests = extractedTests,
                RequestedTest = requestedTestName,
                MatchFound = matchFound,
                DoctorName = doctorName,
                PrescriptionDate = prescriptionDate,
                Notes = notes,
                AuditLog = $"Processed at {DateTime.UtcNow:O} by PrescriptionValidatorAgent v1.0 using Gemini Vision"
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[AI Agent] Unexpected error during prescription validation");
            return BuildFallbackResponse(requestedTestName, $"AI processing error: {ex.Message}. Manual review required.");
        }
    }

    private async Task<string> GetBase64ImageAsync(string imageUrl)
    {
        if (imageUrl.StartsWith("data:image"))
        {
            return imageUrl.Substring(imageUrl.IndexOf(",") + 1);
        }

        var bytes = await _httpClient.GetByteArrayAsync(imageUrl);
        return Convert.ToBase64String(bytes);
    }

    private static AIVerificationResponseDto BuildFallbackResponse(string requestedTestName, string notes)
    {
        return new AIVerificationResponseDto
        {
            Status = "FLAGGED",
            Confidence = 0,
            ExtractedTests = new List<string>(),
            RequestedTest = requestedTestName,
            MatchFound = false,
            Notes = notes,
            AuditLog = $"Fallback response generated at {DateTime.UtcNow:O}"
        };
    }
}
