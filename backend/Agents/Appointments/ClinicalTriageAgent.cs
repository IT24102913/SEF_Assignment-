using HealthBridge.Api.DTOs.Appointments;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace HealthBridge.Api.Agents.Appointments;

/// <summary>
/// ClinicalTriageAgent — Specialized Agent for Medical Domain Analysis.
/// Complies with SE3090 Section 9.1: "Domain analysis agent with defined contract".
/// 
/// Analyzes non-emergency patient symptoms and determines the appropriate clinical specialty
/// (Cardiology, Neurology, Orthopaedics, Paediatrics, Gynaecology, Dermatology, ENT, General Medicine).
/// Uses schema-constrained Gemini LLM with an automatic deterministic weighted scoring fallback.
/// </summary>
public interface IClinicalTriageAgent : IWorkflowAgent
{
    Task<TriageAnalysisResult> TriageSymptomsAsync(string symptoms);
}

public class TriageAnalysisResult
{
    public string Status { get; set; } = "RECOMMENDATION_READY"; // RECOMMENDATION_READY | NEED_MORE_CONTEXT | SAFE_FAILURE
    public string? Specialty { get; set; }
    public double Confidence { get; set; }
    public string? Reason { get; set; }
    public List<string> FollowUpQuestions { get; set; } = new();
    public bool UsedFallbackEngine { get; set; }
}

public class ClinicalTriageAgent : IClinicalTriageAgent
{
    private readonly IConfiguration _config;
    private readonly ILogger<ClinicalTriageAgent> _logger;
    private readonly HttpClient _httpClient;

    public string AgentName => "ClinicalTriageAgent";
    public string Role => "Clinical specialty routing and confidence estimation using medical LLM with rule-based fallback.";

    private static readonly string[] AllowedSpecialties = CanonicalSpecialties.AllowedSpecialties;

    private static readonly (string Specialty, (Regex Pattern, double Weight)[] Terms)[] ScoredSpecialties =
    [
        ("Cardiology", [
            (new Regex(@"\b(heart|cardiac|cardio)\b", RegexOptions.IgnoreCase | RegexOptions.Compiled), 2.0),
            (new Regex(@"\b(chest\s*pain|chest\s*tight(ness)?|chest\s*pressure|angina)\b", RegexOptions.IgnoreCase | RegexOptions.Compiled), 2.5),
            (new Regex(@"\b(palpitation|irregular\s*heartbeat|heart\s*rate|racing\s*heart|skipped\s*beat)\b", RegexOptions.IgnoreCase | RegexOptions.Compiled), 2.0),
            (new Regex(@"\b(blood\s*pressure|hypertension|hypotension|low\s*bp|high\s*bp)\b", RegexOptions.IgnoreCase | RegexOptions.Compiled), 1.8),
            (new Regex(@"\b(swollen\s*legs?|leg\s*swelling|ankle\s*swelling|oedema|edema)\b", RegexOptions.IgnoreCase | RegexOptions.Compiled), 1.5),
            (new Regex(@"\b(shortness\s*of\s*breath|breathless(ness)?|dyspnoea|can'?t\s*breathe)\b", RegexOptions.IgnoreCase | RegexOptions.Compiled), 1.2),
            (new Regex(@"\b(atherosclerosis|cholesterol|stent|bypass|ecg|ekg|angiogram)\b", RegexOptions.IgnoreCase | RegexOptions.Compiled), 2.0),
        ]),
        ("Neurology", [
            (new Regex(@"\b(headache|migraine|head\s*pain|throbbing\s*head)\b", RegexOptions.IgnoreCase | RegexOptions.Compiled), 2.0),
            (new Regex(@"\b(dizziness|vertigo|balance|lightheaded|spinning)\b", RegexOptions.IgnoreCase | RegexOptions.Compiled), 1.8),
            (new Regex(@"\b(numb(ness)?|tingling|pins\s*and\s*needles|burning\s*sensation)\b", RegexOptions.IgnoreCase | RegexOptions.Compiled), 1.8),
            (new Regex(@"\b(tremor|shaking|trembling|involuntary\s*movement)\b", RegexOptions.IgnoreCase | RegexOptions.Compiled), 2.0),
            (new Regex(@"\b(memory\s*(loss|problem)|forget(ting)?|confusion|disoriented)\b", RegexOptions.IgnoreCase | RegexOptions.Compiled), 1.8),
            (new Regex(@"\b(nerve|neuro|brain|spinal|epilepsy|convulsion|blackout)\b", RegexOptions.IgnoreCase | RegexOptions.Compiled), 2.0),
            (new Regex(@"\b(weakness\s*(in\s*(arm|leg|hand|face))|facial\s*droop|slurred\s*speech)\b", RegexOptions.IgnoreCase | RegexOptions.Compiled), 2.5),
            (new Regex(@"\b(parkinson|alzheimer|dementia|multiple\s*sclerosis|ms)\b", RegexOptions.IgnoreCase | RegexOptions.Compiled), 2.5),
            (new Regex(@"\b(stroke|tia|mini.stroke)\b", RegexOptions.IgnoreCase | RegexOptions.Compiled), 2.5),
        ]),
        ("Orthopaedics", [
            (new Regex(@"\b(bone|joint|fracture|break|broken|sprain|strain|dislocation)\b", RegexOptions.IgnoreCase | RegexOptions.Compiled), 2.2),
            (new Regex(@"\b(knee|hip|shoulder|elbow|wrist|ankle|foot|toe|finger)\b", RegexOptions.IgnoreCase | RegexOptions.Compiled), 1.5),
            (new Regex(@"\b(back\s*pain|lower\s*back|spine|spinal|disc|herniat|sciatica)\b", RegexOptions.IgnoreCase | RegexOptions.Compiled), 2.0),
            (new Regex(@"\b(arthritis|gout|rheumat|inflamed\s*joint|stiff\s*(joint|knee|hip))\b", RegexOptions.IgnoreCase | RegexOptions.Compiled), 2.0),
            (new Regex(@"\b(muscle\s*pain|myalgia|ligament|tendon|tendinitis|rotator\s*cuff)\b", RegexOptions.IgnoreCase | RegexOptions.Compiled), 1.8),
            (new Regex(@"\b(can'?t\s*walk|limping|walking\s*(difficulty|problem)|weak\s*leg)\b", RegexOptions.IgnoreCase | RegexOptions.Compiled), 1.5),
            (new Regex(@"\b(ortho|physiotherapy|x.ray|mri|cast|splint)\b", RegexOptions.IgnoreCase | RegexOptions.Compiled), 1.5),
        ]),
        ("Paediatrics", [
            (new Regex(@"\b(child|infant|baby|toddler|newborn|kid|boy|girl)\b", RegexOptions.IgnoreCase | RegexOptions.Compiled), 2.5),
            (new Regex(@"\b(paediatric|pediatric|my\s*(son|daughter|child))\b", RegexOptions.IgnoreCase | RegexOptions.Compiled), 2.5),
            (new Regex(@"\b(years?\s*old)\b", RegexOptions.IgnoreCase | RegexOptions.Compiled), 1.0),
            (new Regex(@"\b([0-9]+\s*month|[0-9]+\s*year)\b", RegexOptions.IgnoreCase | RegexOptions.Compiled), 0.8),
            (new Regex(@"\b(vaccination|immunization|growth|development|feeding)\b", RegexOptions.IgnoreCase | RegexOptions.Compiled), 2.0),
            (new Regex(@"\b(teething|nappy|colic|jaundice\s*(in\s*baby)|neonatal)\b", RegexOptions.IgnoreCase | RegexOptions.Compiled), 2.5),
        ]),
        ("Gynaecology", [
            (new Regex(@"\b(pregnancy|pregnant|trimester|antenatal|postnatal|labour|delivery)\b", RegexOptions.IgnoreCase | RegexOptions.Compiled), 2.5),
            (new Regex(@"\b(period|menstrual|menstruation|irregular\s*period|missed\s*period|pms)\b", RegexOptions.IgnoreCase | RegexOptions.Compiled), 2.5),
            (new Regex(@"\b(pcos|polycystic|endometriosis|fibroids?|ovarian\s*cyst)\b", RegexOptions.IgnoreCase | RegexOptions.Compiled), 2.5),
            (new Regex(@"\b(vaginal|uterus|uterine|cervix|cervical|ovary|ovarian)\b", RegexOptions.IgnoreCase | RegexOptions.Compiled), 2.0),
            (new Regex(@"\b(gynaecolog|gynecolog|obstetr|fertility|contraception|iud|pap\s*smear)\b", RegexOptions.IgnoreCase | RegexOptions.Compiled), 2.5),
            (new Regex(@"\b(breast\s*(lump|pain|discharge)|nipple|mammogram)\b", RegexOptions.IgnoreCase | RegexOptions.Compiled), 2.0),
            (new Regex(@"\b(menopause|hot\s*flushes?|hormonal|hrt)\b", RegexOptions.IgnoreCase | RegexOptions.Compiled), 2.0),
        ]),
        ("Dermatology", [
            (new Regex(@"\b(rash|itching|itch|hives|urticaria|skin\s*reaction)\b", RegexOptions.IgnoreCase | RegexOptions.Compiled), 2.2),
            (new Regex(@"\b(acne|pimple|blackhead|whitehead|breakout)\b", RegexOptions.IgnoreCase | RegexOptions.Compiled), 2.0),
            (new Regex(@"\b(eczema|psoriasis|dermatitis|atopic|seborrhoea)\b", RegexOptions.IgnoreCase | RegexOptions.Compiled), 2.5),
            (new Regex(@"\b(skin|lesion|patch|blemish|pigmentation|dark\s*spot|mole|wart)\b", RegexOptions.IgnoreCase | RegexOptions.Compiled), 1.8),
            (new Regex(@"\b(fungal|ringworm|tinea|candida|athlete'?s\s*foot)\b", RegexOptions.IgnoreCase | RegexOptions.Compiled), 2.0),
            (new Regex(@"\b(hair\s*(loss|fall|thinning)|alopecia|dandruff|scalp)\b", RegexOptions.IgnoreCase | RegexOptions.Compiled), 1.8),
            (new Regex(@"\b(allerg(y|ic)\s*(rash|skin|reaction)|contact\s*dermatitis)\b", RegexOptions.IgnoreCase | RegexOptions.Compiled), 2.0),
            (new Regex(@"\b(nail\s*(fungus|infection|problem)|ingrown\s*nail)\b", RegexOptions.IgnoreCase | RegexOptions.Compiled), 1.5),
        ]),
        ("ENT", [
            (new Regex(@"\b(ear|hearing|deaf(ness)?|earache|ear\s*infection|tinnitus|wax)\b", RegexOptions.IgnoreCase | RegexOptions.Compiled), 2.2),
            (new Regex(@"\b(nose|nasal|nostril|nosebleed|rhinitis|sinusitis|sinus)\b", RegexOptions.IgnoreCase | RegexOptions.Compiled), 2.0),
            (new Regex(@"\b(throat|tonsil|tonsillitis|pharyngitis|laryngitis|sore\s*throat)\b", RegexOptions.IgnoreCase | RegexOptions.Compiled), 2.2),
            (new Regex(@"\b(sneezing|runny\s*nose|blocked\s*nose|nasal\s*congestion|post.nasal)\b", RegexOptions.IgnoreCase | RegexOptions.Compiled), 1.8),
            (new Regex(@"\b(hoarse|hoarseness|voice\s*(change|loss)|vocal\s*cord|larynx)\b", RegexOptions.IgnoreCase | RegexOptions.Compiled), 2.0),
            (new Regex(@"\b(snoring|sleep\s*apnea|apnoea|adenoid|polyp)\b", RegexOptions.IgnoreCase | RegexOptions.Compiled), 2.0),
            (new Regex(@"\b(ent|otolaryngol|audiolog)\b", RegexOptions.IgnoreCase | RegexOptions.Compiled), 2.5),
            (new Regex(@"\b(swallowing\s*(difficulty|problem)|dysphagia|choking\s*sensation|globus)\b", RegexOptions.IgnoreCase | RegexOptions.Compiled), 2.5),
        ]),
        ("General Medicine", [
            (new Regex(@"\b(food\s*poisoning|gastroenteritis|stomach\s*bug)\b", RegexOptions.IgnoreCase | RegexOptions.Compiled), 2.5),
            (new Regex(@"\b(fever|temperature|pyrexia|high\s*temp|chills|rigors?)\b", RegexOptions.IgnoreCase | RegexOptions.Compiled), 2.0),
            (new Regex(@"\b(cold|flu|influenza|covid|viral|infection|bacteria)\b", RegexOptions.IgnoreCase | RegexOptions.Compiled), 2.0),
            (new Regex(@"\b(cough|coughing|phlegm|mucus|sputum|whooping)\b", RegexOptions.IgnoreCase | RegexOptions.Compiled), 1.8),
            (new Regex(@"\b(fatigue|tiredness|tired|exhausted|lethargic|no\s*energy|weakness)\b", RegexOptions.IgnoreCase | RegexOptions.Compiled), 1.5),
            (new Regex(@"\b(nausea|vomiting|vomit|throwing\s*up|stomach\s*(ache|pain|upset)|indigestion|heartburn|acid\s*reflux)\b", RegexOptions.IgnoreCase | RegexOptions.Compiled), 1.8),
            (new Regex(@"\b(diarrhoea|diarrhea|loose\s*stool|constipation|bowel)\b", RegexOptions.IgnoreCase | RegexOptions.Compiled), 1.8),
            (new Regex(@"\b(diabetes|sugar|insulin|glucose|thyroid|hypothyroid|hyperthyroid)\b", RegexOptions.IgnoreCase | RegexOptions.Compiled), 2.0),
            (new Regex(@"\b(weight\s*(loss|gain)|appetite|anemia|anaemia|vitamin|deficiency)\b", RegexOptions.IgnoreCase | RegexOptions.Compiled), 1.5),
            (new Regex(@"\b(urine|urination|uti|urinary\s*(tract|infection)|kidney\s*infection)\b", RegexOptions.IgnoreCase | RegexOptions.Compiled), 1.8),
            (new Regex(@"\b(general|check.?up|routine|not\s*feeling\s*well|unwell|sick)\b", RegexOptions.IgnoreCase | RegexOptions.Compiled), 1.0),
        ]),
    ];

    public ClinicalTriageAgent(
        IConfiguration config,
        ILogger<ClinicalTriageAgent> logger,
        IHttpClientFactory httpClientFactory)
    {
        _config = config;
        _logger = logger;
        _httpClient = httpClientFactory.CreateClient("GeminiClient");
    }

    public async Task<TriageAnalysisResult> TriageSymptomsAsync(string symptoms)
    {
        var apiKey = _config["Gemini:ApiKey"]
            ?? _config["GeminiApiKey"]
            ?? _config["Google:ApiKey"]
            ?? Environment.GetEnvironmentVariable("GEMINI_API_KEY");

        if (!string.IsNullOrWhiteSpace(apiKey))
        {
            try
            {
                var gemini = await CallGeminiAsync(symptoms, apiKey);
                if (gemini != null && ValidateGeminiResult(gemini))
                {
                    var threshold = _config.GetValue<double>("DoctorRecommendation:ConfidenceThreshold", 0.6);
                    if (gemini.Confidence < threshold || gemini.Status == "NEED_MORE_CONTEXT")
                    {
                        return new TriageAnalysisResult
                        {
                            Status = "NEED_MORE_CONTEXT",
                            Confidence = gemini.Confidence,
                            Reason = gemini.Reason,
                            FollowUpQuestions = gemini.FollowUpQuestions ?? GenerateGenericFollowUps()
                        };
                    }

                    return new TriageAnalysisResult
                    {
                        Status = "RECOMMENDATION_READY",
                        Specialty = gemini.Specialty,
                        Confidence = gemini.Confidence,
                        Reason = gemini.Reason,
                        UsedFallbackEngine = false
                    };
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "[{Agent}] Gemini call failed. Falling back to deterministic keyword engine.", AgentName);
            }
        }

        // Deterministic Fallback Engine
        var fallback = RunKeywordFallback(symptoms);
        if (fallback != null)
        {
            return new TriageAnalysisResult
            {
                Status = "RECOMMENDATION_READY",
                Specialty = fallback.Specialty,
                Confidence = fallback.Confidence ?? 0.85,
                Reason = fallback.Reason,
                UsedFallbackEngine = true
            };
        }

        return new TriageAnalysisResult
        {
            Status = "SAFE_FAILURE",
            Reason = "Unable to determine a specific specialty. Please browse available specialists manually.",
            UsedFallbackEngine = true
        };
    }

    private async Task<GeminiTriageResult?> CallGeminiAsync(string symptoms, string apiKey)
    {
        var model = _config["Gemini:Model"] ?? "gemini-3.5-flash-lite";
        var endpoint = $"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={apiKey}";

        var allowedListStr = string.Join(", ", AllowedSpecialties.Select(s => $"\"{s}\""));
        var systemInstruction = $@"You are a clinical triage assistant for a Sri Lankan hospital channeling system.
Your job is to match non-emergency patient symptoms to the most appropriate medical specialty from this exact allowed list:
[{allowedListStr}]

Rules:
1. Never diagnose conditions.
2. Never suggest medications or treatments.
3. If symptoms strongly match a specialty, return Status='RECOMMENDATION_READY', Specialty, Confidence (0.6 to 1.0), and a concise 1-2 sentence Reason.
4. If symptoms are ambiguous or insufficient, return Status='NEED_MORE_CONTEXT', FollowUpQuestions (2-3 questions), and Confidence < 0.6.
5. Return JSON only matching the schema.";

        var payload = new
        {
            contents = new[]
            {
                new
                {
                    parts = new object[]
                    {
                        new { text = $"{systemInstruction}\n\nPatient Symptoms:\n{symptoms}" }
                    }
                }
            },
            generationConfig = new
            {
                responseMimeType = "application/json",
                temperature = 0.2
            }
        };

        var json = JsonSerializer.Serialize(payload);
        using var content = new StringContent(json, Encoding.UTF8, "application/json");
        using var response = await _httpClient.PostAsync(endpoint, content);

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogWarning("[{Agent}] Gemini returned status {Code}", AgentName, response.StatusCode);
            return null;
        }

        var responseBody = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(responseBody);
        var text = doc.RootElement
            .GetProperty("candidates")[0]
            .GetProperty("content")
            .GetProperty("parts")[0]
            .GetProperty("text")
            .GetString();

        if (string.IsNullOrWhiteSpace(text)) return null;

        return JsonSerializer.Deserialize<GeminiTriageResult>(text, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });
    }

    private bool ValidateGeminiResult(GeminiTriageResult r)
    {
        if (r.Status == "RECOMMENDATION_READY")
        {
            return !string.IsNullOrWhiteSpace(r.Specialty) &&
                   AllowedSpecialties.Contains(r.Specialty, StringComparer.OrdinalIgnoreCase) &&
                   r.Confidence >= 0.0 && r.Confidence <= 1.0;
        }
        return r.Status == "NEED_MORE_CONTEXT";
    }

    private DoctorRecommendationResponseDto? RunKeywordFallback(string symptoms)
    {
        var bestSpecialty = (string?)null;
        var bestScore = 0.0;

        foreach (var (specialty, terms) in ScoredSpecialties)
        {
            var total = 0.0;
            foreach (var (pattern, weight) in terms)
            {
                if (pattern.IsMatch(symptoms))
                {
                    total += weight;
                }
            }

            if (total > bestScore)
            {
                bestScore = total;
                bestSpecialty = specialty;
            }
        }

        if (bestSpecialty == null || bestScore < 1.0)
            return null;

        var confidence = Math.Min(0.95, 0.65 + (bestScore * 0.05));
        var reason = $"Based on clinical keywords in your symptoms, a consultation with a specialist in {bestSpecialty} is recommended.";

        return new DoctorRecommendationResponseDto
        {
            Status = "RECOMMENDATION_READY",
            Specialty = bestSpecialty,
            Confidence = Math.Round(confidence, 2),
            Reason = reason
        };
    }

    private List<string> GenerateGenericFollowUps() =>
    [
        "How long have you been experiencing these symptoms?",
        "Are your symptoms getting progressively worse or staying about the same?",
        "Do you have any related discomfort elsewhere in your body?"
    ];
}
