using HealthBridge.Api.DTOs.Appointments;
using System.Text;
using System.Text.Json;

namespace HealthBridge.Api.Agents.Appointments;

/// <summary>
/// DoctorRecommendationAgent — Agentic AI Component (Doctor Channeling / Appointment Management)
/// 
/// This agent utilizes Google Gemini LLM to:
/// 1. Take in unstructured natural language symptoms described by a patient
/// 2. Analyze the clinical presentation against the 8 hospital specialties
/// 3. Rank 1-3 appropriate specialties with clinical reasoning and match confidence
/// 4. Surface suggestion chips to help patients find the right consultant
/// 
/// NOTE: The agent NEVER auto-books or commits transactions. It strictly advises and pre-fills
/// search filters while the patient retains complete human-in-the-loop agency to select doctor,
/// session slot, and finalize booking.
/// </summary>
public class DoctorRecommendationAgent
{
    private readonly IConfiguration _config;
    private readonly ILogger<DoctorRecommendationAgent> _logger;
    private readonly HttpClient _httpClient;

    private static readonly string[] AllowedSpecialties = new[]
    {
        "Cardiology", "Neurology", "Orthopaedics", "Paediatrics",
        "Gynaecology", "Dermatology", "ENT", "General Medicine"
    };

    public DoctorRecommendationAgent(IConfiguration config, ILogger<DoctorRecommendationAgent> logger, IHttpClientFactory httpClientFactory)
    {
        _config = config;
        _logger = logger;
        _httpClient = httpClientFactory.CreateClient("GeminiClient");
    }

    public async Task<AIRecommendationResponse> RecommendSpecialtiesAsync(string symptoms)
    {
        _logger.LogInformation("[AI Agent] Starting doctor specialty recommendation for symptoms: {Symptoms}", symptoms);

        var fallbackResponse = BuildRuleBasedFallback(symptoms);

        if (string.IsNullOrWhiteSpace(symptoms))
        {
            return fallbackResponse;
        }

        try
        {
            var apiKey = _config["Gemini:ApiKey"];
            if (string.IsNullOrWhiteSpace(apiKey))
            {
                _logger.LogWarning("[AI Agent] Gemini:ApiKey is not configured; using heuristic fallback.");
                return fallbackResponse;
            }

            var model = "gemini-flash-latest";
            var endpoint = $"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={apiKey}";

            var prompt = $@"You are an intelligent clinical triage advisor for Health Bridge Hospital.
A patient describes their symptoms:
""{symptoms}""

Based strictly on these symptoms, recommend 1 to 3 relevant specialties from this exact allowed list ONLY:
[Cardiology, Neurology, Orthopaedics, Paediatrics, Gynaecology, Dermatology, ENT, General Medicine]

Instructions:
1. Provide a confidence score between 0.1 and 0.99 for each recommendation.
2. Provide a concise, compassionate 1-sentence clinical reasoning explaining why this specialty is appropriate for the symptom.
3. Provide a short clinical summary notes disclaimer.

Respond ONLY with valid JSON in this exact structure (no markdown formatting, no code block backticks):
{{
  ""recommendations"": [
    {{
      ""specialty"": ""Cardiology"",
      ""matchScore"": 0.95,
      ""reasoning"": ""Chest pain, pressure, and palpitations warrant immediate cardiac evaluation.""
    }}
  ],
  ""clinicalNotes"": ""Suggestions are for guidance. Consult a doctor immediately for emergencies.""
}}";

            var requestBody = new
            {
                contents = new[]
                {
                    new
                    {
                        parts = new object[]
                        {
                            new { text = prompt }
                        }
                    }
                },
                generationConfig = new
                {
                    temperature = 0.1,
                    maxOutputTokens = 800
                }
            };

            var json = JsonSerializer.Serialize(requestBody);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(8));
            var response = await _httpClient.PostAsync(endpoint, content, cts.Token);

            if (!response.IsSuccessStatusCode)
            {
                var errorBody = await response.Content.ReadAsStringAsync();
                _logger.LogWarning("[AI Agent] Gemini API returned status {Status}: {Error}", response.StatusCode, errorBody);
                return fallbackResponse;
            }

            var responseBody = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(responseBody);

            var candidateText = doc.RootElement
                .GetProperty("candidates")[0]
                .GetProperty("content")
                .GetProperty("parts")[0]
                .GetProperty("text")
                .GetString();

            if (string.IsNullOrWhiteSpace(candidateText))
            {
                return fallbackResponse;
            }

            var cleanJson = candidateText.Trim();
            if (cleanJson.StartsWith("```"))
            {
                var firstLineEnd = cleanJson.IndexOf('\n');
                var lastBackticks = cleanJson.LastIndexOf("```");
                if (firstLineEnd >= 0 && lastBackticks > firstLineEnd)
                {
                    cleanJson = cleanJson.Substring(firstLineEnd + 1, lastBackticks - firstLineEnd - 1).Trim();
                }
            }

            var parsed = JsonSerializer.Deserialize<GeminiParsedResult>(cleanJson, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            if (parsed == null || parsed.Recommendations == null || parsed.Recommendations.Count == 0)
            {
                return fallbackResponse;
            }

            var validRecs = parsed.Recommendations
                .Where(r => AllowedSpecialties.Contains(r.Specialty, StringComparer.OrdinalIgnoreCase))
                .Select(r => new SpecialtyRecommendation
                {
                    Specialty = r.Specialty,
                    MatchScore = Math.Round(r.MatchScore, 2),
                    Reasoning = r.Reasoning
                })
                .ToList();

            if (validRecs.Count == 0)
            {
                return fallbackResponse;
            }

            _logger.LogInformation("[AI Agent] Successfully retrieved {Count} specialty recommendations", validRecs.Count);

            return new AIRecommendationResponse
            {
                AnalyzedSymptoms = symptoms,
                Recommendations = validRecs,
                ClinicalNotes = parsed.ClinicalNotes ?? "Recommendations provided to assist specialist search. Always consult a physician."
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[AI Agent] Error during AI recommendation. Falling back safely.");
            return fallbackResponse;
        }
    }

    private static AIRecommendationResponse BuildRuleBasedFallback(string symptoms)
    {
        var text = (symptoms ?? string.Empty).ToLowerInvariant();
        var recs = new List<SpecialtyRecommendation>();

        if (text.Contains("heart") || text.Contains("chest") || text.Contains("palpitation") || text.Contains("breath"))
        {
            recs.Add(new SpecialtyRecommendation
            {
                Specialty = "Cardiology",
                MatchScore = 0.90,
                Reasoning = "Symptoms suggest cardiovascular investigation."
            });
        }
        if (text.Contains("headache") || text.Contains("dizziness") || text.Contains("numb") || text.Contains("seizure") || text.Contains("spine") || text.Contains("brain"))
        {
            recs.Add(new SpecialtyRecommendation
            {
                Specialty = "Neurology",
                MatchScore = 0.88,
                Reasoning = "Neurological assessment recommended for headaches, numbness or coordination symptoms."
            });
        }
        if (text.Contains("bone") || text.Contains("joint") || text.Contains("knee") || text.Contains("fracture") || text.Contains("back pain"))
        {
            recs.Add(new SpecialtyRecommendation
            {
                Specialty = "Orthopaedics",
                MatchScore = 0.87,
                Reasoning = "Bone, joint, or musculoskeletal issues indicate orthopaedic consultation."
            });
        }
        if (text.Contains("ear") || text.Contains("throat") || text.Contains("nose") || text.Contains("sinus") || text.Contains("hearing"))
        {
            recs.Add(new SpecialtyRecommendation
            {
                Specialty = "ENT",
                MatchScore = 0.89,
                Reasoning = "Ear, nose, throat or sinus symptoms correspond to an ENT surgeon."
            });
        }
        if (text.Contains("skin") || text.Contains("rash") || text.Contains("itching") || text.Contains("acne") || text.Contains("allergy"))
        {
            recs.Add(new SpecialtyRecommendation
            {
                Specialty = "Dermatology",
                MatchScore = 0.86,
                Reasoning = "Dermatologist review recommended for cutaneous reactions and skin conditions."
            });
        }
        if (text.Contains("child") || text.Contains("baby") || text.Contains("infant") || text.Contains("pediatric"))
        {
            recs.Add(new SpecialtyRecommendation
            {
                Specialty = "Paediatrics",
                MatchScore = 0.92,
                Reasoning = "Paediatric care recommended for children and infant health concerns."
            });
        }
        if (text.Contains("pregnancy") || text.Contains("period") || text.Contains("menstrual") || text.Contains("gynae"))
        {
            recs.Add(new SpecialtyRecommendation
            {
                Specialty = "Gynaecology",
                MatchScore = 0.91,
                Reasoning = "Consultant Gynaecologist review indicated for reproductive health."
            });
        }

        if (recs.Count == 0)
        {
            recs.Add(new SpecialtyRecommendation
            {
                Specialty = "General Medicine",
                MatchScore = 0.75,
                Reasoning = "General Physician consultation recommended for overall clinical evaluation."
            });
        }

        return new AIRecommendationResponse
        {
            AnalyzedSymptoms = symptoms ?? string.Empty,
            Recommendations = recs.Take(3).ToList(),
            ClinicalNotes = "Heuristic guidance generated. Please confirm with your healthcare provider."
        };
    }

    private class GeminiParsedResult
    {
        public List<SpecialtyRecommendation>? Recommendations { get; set; }
        public string? ClinicalNotes { get; set; }
    }
}
