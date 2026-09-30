using System.Text;
using System.Text.Json;
using HealthBridge.Api.DTOs.Lab;

namespace HealthBridge.Api.Agents;

/// <summary>
/// QwenVisionAgent — Open-Source Vision AI Provider (Hugging Face Serverless Inference API)
/// Model: Qwen/Qwen2-VL-7B-Instruct
/// </summary>
public class QwenVisionAgent
{
    private readonly IConfiguration _config;
    private readonly ILogger<QwenVisionAgent> _logger;
    private readonly HttpClient _httpClient;

    public QwenVisionAgent(IConfiguration config, ILogger<QwenVisionAgent> logger, IHttpClientFactory httpClientFactory)
    {
        _config = config;
        _logger = logger;
        _httpClient = httpClientFactory.CreateClient();
    }

    /// <summary>
    /// Analyzes a prescription image using Qwen2-VL-7B-Instruct on Hugging Face API.
    /// </summary>
    public async Task<AIVerificationResponse> AnalyzePrescriptionAsync(string prescriptionImageUrl)
    {
        _logger.LogInformation("[QwenVisionAgent] Starting Qwen2-VL Vision analysis");

        try
        {
            var apiKey = _config["HuggingFace:ApiKey"];
            var model = _config["HuggingFace:Model"] ?? "Qwen/Qwen2-VL-7B-Instruct";

            if (string.IsNullOrWhiteSpace(apiKey))
            {
                _logger.LogWarning("[QwenVisionAgent] HuggingFace:ApiKey is missing in appsettings.json.");
                return BuildFallbackResponse("HuggingFace API Key missing.");
            }

            var endpoint = "https://api-inference.huggingface.co/v1/chat/completions";

            var prompt = @"You are a medical prescription vision validator.
Analyze the provided image and classify it into one of 5 categories:
1. HANDWRITTEN_PRESCRIPTION
2. COMPUTER_PRINTED_PRESCRIPTION
3. NON_MEDICAL_IMAGE
4. NON_PRESCRIPTION_DOCUMENT
5. SUSPICIOUS_FORGERY

Respond strictly with valid JSON format:
{
  ""documentClassification"": ""HANDWRITTEN_PRESCRIPTION"",
  ""isValidMedicalPrescription"": true,
  ""isForgeryOrTrainingSample"": false,
  ""securityFlags"": [],
  ""extractedTests"": [],
  ""confidence"": 0.95,
  ""notes"": ""Detailed analysis""
}";

            var requestBody = new
            {
                model = model,
                messages = new[]
                {
                    new
                    {
                        role = "user",
                        content = new object[]
                        {
                            new { type = "text", text = prompt },
                            new { type = "image_url", image_url = new { url = prescriptionImageUrl } }
                        }
                    }
                },
                max_tokens = 1024,
                temperature = 0.1
            };

            var json = JsonSerializer.Serialize(requestBody);
            var httpRequest = new HttpRequestMessage(HttpMethod.Post, endpoint);
            httpRequest.Headers.Add("Authorization", $"Bearer {apiKey}");
            httpRequest.Content = new StringContent(json, Encoding.UTF8, "application/json");

            var response = await _httpClient.SendAsync(httpRequest);
            var responseBody = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("[QwenVisionAgent] Hugging Face API error ({Status}): {Body}", response.StatusCode, responseBody);
                return BuildFallbackResponse($"API Error: {response.StatusCode}");
            }

            using var doc = JsonDocument.Parse(responseBody);
            var contentStr = doc.RootElement
                .GetProperty("choices")[0]
                .GetProperty("message")
                .GetProperty("content")
                .GetString() ?? "";

            var cleanJson = CleanJsonFences(contentStr);
            var parsed = JsonSerializer.Deserialize<AIVerificationResponse>(cleanJson, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            return parsed ?? BuildFallbackResponse("Failed to parse JSON response");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[QwenVisionAgent] Exception during Qwen2-VL vision analysis");
            return BuildFallbackResponse(ex.Message);
        }
    }

    private static string CleanJsonFences(string input)
    {
        if (string.IsNullOrWhiteSpace(input)) return "{}";
        var trimmed = input.Trim();
        if (trimmed.StartsWith("```"))
        {
            var firstLine = trimmed.IndexOf('\n');
            var lastBackticks = trimmed.LastIndexOf("```");
            if (firstLine >= 0 && lastBackticks > firstLine)
            {
                return trimmed.Substring(firstLine + 1, lastBackticks - firstLine - 1).Trim();
            }
        }
        return trimmed;
    }

    private static AIVerificationResponse BuildFallbackResponse(string reason)
    {
        return new AIVerificationResponse
        {
            DocumentClassification = "UNVERIFIED",
            IsValidMedicalPrescription = false,
            IsForgeryOrTrainingSample = false,
            SecurityFlags = new List<string> { $"Qwen Vision Fallback: {reason}" },
            ExtractedTests = new List<string>(),
            Confidence = 0.0,
            Notes = "Manual pathologist review required."
        };
    }
}
