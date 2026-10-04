using System.Diagnostics;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
using HealthBridge.Api.Data;
using HealthBridge.Api.DTOs.Appointments;
using HealthBridge.Api.Models;

namespace HealthBridge.Api.Agents.Appointments;

/// <summary>
/// DoctorRecommendationAgent — Agentic AI Component (Doctor Channeling / Appointment Management)
///
/// Full 9-step deterministic pipeline:
///   1. Input gate (pure C#, no LLM)
///   2. Vague-input check (pure C#)
///   3. Red-flag safety rules (pure C#)
///   4. Gemini call with JSON schema enforcement
///   5. Parse + retry (up to 1 retry)
///   6. Deterministic validation + confidence gate
///   7. Keyword fallback (on Gemini failure)
///   8. Persist audit record
///   9. Return final response
///
/// NEVER diagnoses, NEVER recommends medication, NEVER books an appointment.
/// </summary>
public class DoctorRecommendationAgent
{
    // ─── Allowed specialties ─────────────────────────────────────────────────
    private static readonly string[] AllowedSpecialties =
    [
        "Cardiology", "Neurology", "Orthopaedics", "Paediatrics",
        "Gynaecology", "Dermatology", "ENT", "General Medicine"
    ];

    // ─── Greeting / nonsense word list ───────────────────────────────────────
    private static readonly HashSet<string> GreetingOnlyWords =
    [
        "hi", "hello", "hey", "howdy", "hiya", "greetings", "good morning",
        "good afternoon", "good evening", "happy", "fine", "ok", "okay",
        "test", "asdf", "qwerty", "abc", "123", "nothing", "n/a", "na"
    ];

    // ─── Red-flag patterns (pure C#, NO LLM) ─────────────────────────────────
    private static readonly (Regex Pattern, string Message)[] RedFlagPatterns =
    [
        (
            new Regex(@"\bchest\s*pain\b.{0,80}\b(breath|breathing|breathless|can'?t breathe|cannot breathe|short of breath)\b",
                RegexOptions.IgnoreCase | RegexOptions.Compiled),
            "⚠️ Emergency: Chest pain combined with breathing difficulty may indicate a heart attack. Call emergency services (1990 / 119) or go to the nearest Emergency Room immediately."
        ),
        (
            new Regex(@"\b(facial\s*droop|slurred\s*speech|sudden\s*weakness|can'?t\s*speak|face\s*(drooping|numb)|arm\s*weak|sudden\s*confusion|stroke)\b",
                RegexOptions.IgnoreCase | RegexOptions.Compiled),
            "⚠️ Emergency: These symptoms may indicate a stroke. Time is critical — call emergency services (1990 / 119) immediately."
        ),
        (
            new Regex(@"\b(unconscious|loss\s*of\s*consciousness|passed\s*out|unresponsive|fainted)\b",
                RegexOptions.IgnoreCase | RegexOptions.Compiled),
            "⚠️ Emergency: Loss of consciousness requires immediate medical attention. Call emergency services (1990 / 119) or go to the nearest Emergency Room now."
        ),
        (
            new Regex(@"\b(severe\s*bleed|bleeding\s*heavily|blood\s*everywhere|arterial\s*bleed)\b",
                RegexOptions.IgnoreCase | RegexOptions.Compiled),
            "⚠️ Emergency: Severe bleeding requires immediate emergency care. Apply pressure and call 1990 / 119 immediately."
        ),
        (
            new Regex(@"\b(anaphyla|severe\s*allergic|throat\s*swell|tongue\s*swell|can'?t\s*swallow)\b",
                RegexOptions.IgnoreCase | RegexOptions.Compiled),
            "⚠️ Emergency: Signs of severe allergic reaction. Use an EpiPen if available and call emergency services (1990 / 119) immediately."
        ),
        (
            new Regex(@"\b(suicid|kill\s*myself|end\s*my\s*life|want\s*to\s*die|self.harm)\b",
                RegexOptions.IgnoreCase | RegexOptions.Compiled),
            "⚠️ You are not alone. Please call the National Mental Health Helpline at 1926 or go to your nearest Emergency Department immediately."
        ),
        (
            new Regex(@"\b(seizure|convuls|fitting|epileptic\s*fit)\b",
                RegexOptions.IgnoreCase | RegexOptions.Compiled),
            "⚠️ Emergency: Seizures require immediate medical evaluation. Call emergency services (1990 / 119) or attend the nearest Emergency Room."
        )
    ];

    // ─── Weighted keyword scoring engine (used when Gemini is unavailable) ─────
    // Each specialty has a list of (Regex, weight) pairs.
    // All patterns are evaluated; scores accumulate; highest wins.
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
            (new Regex(@"\b(swallowing\s*(difficulty|problem)|dysphagia)\b", RegexOptions.IgnoreCase | RegexOptions.Compiled), 1.8),
        ]),
        ("General Medicine", [
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

    // ─── Vague single-word / short symptoms ──────────────────────────────────
    private static readonly HashSet<string> VagueSingleTerms =
    [
        "pain", "hurt", "ache", "tired", "fatigue", "sick", "unwell", "fever",
        "headache", "nausea", "dizzy", "cough", "sore", "weak", "weakness"
    ];

    private readonly IConfiguration _config;
    private readonly ILogger<DoctorRecommendationAgent> _logger;
    private readonly HttpClient _httpClient;
    private readonly ApplicationDbContext _context;

    public DoctorRecommendationAgent(
        IConfiguration config,
        ILogger<DoctorRecommendationAgent> logger,
        IHttpClientFactory httpClientFactory,
        ApplicationDbContext context)
    {
        _config = config;
        _logger = logger;
        _httpClient = httpClientFactory.CreateClient("GeminiClient");
        _context = context;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Public entry point
    // ═══════════════════════════════════════════════════════════════════════════
    public async Task<DoctorRecommendationResponseDto> RunAsync(string rawSymptoms, int? patientId)
    {
        var sw = Stopwatch.StartNew();
        var workflowId = Guid.NewGuid();
        var steps = new List<object>();
        var statusPath = new List<string>();
        var retries = 0;
        var errors = new List<string>();

        DoctorRecommendationResponseDto result;
        string finalStatus;
        string? finalSpecialty = null;
        double finalConfidence = 0;

        try
        {
            // ── Step 1: Input gate ─────────────────────────────────────────
            var symptoms = rawSymptoms?.Trim() ?? string.Empty;
            steps.Add(new { Step = "InputGate", Input = symptoms });

            var wordCount = symptoms.Split([' ', '\t', '\n', '\r', ',', ';'], StringSplitOptions.RemoveEmptyEntries).Length;
            if (wordCount < 2)
            {
                _logger.LogInformation("[DocRecAgent] INPUT_INVALID — single word or too short: '{Symptoms}'", symptoms);
                finalStatus = "INPUT_INVALID";
                result = BuildInvalidInput("Please describe your symptoms in 2 or more words (e.g., 'frequent headache', 'persistent knee pain', or 'chest tightness'). Single words lack clinical context for accurate triage.");
                result.WorkflowId = workflowId;
                await PersistAsync(workflowId, patientId, symptoms, steps, statusPath, finalStatus, null, 0, retries, string.Join("; ", errors), sw.ElapsedMilliseconds);
                return result;
            }

            var lower = symptoms.ToLowerInvariant();
            if (IsGreetingOrNonsense(lower))
            {
                _logger.LogInformation("[DocRecAgent] INPUT_INVALID — greeting/nonsense");
                finalStatus = "INPUT_INVALID";
                result = BuildInvalidInput("Please describe your medical symptoms — for example, 'I have had a severe headache and nausea for two days.'");
                result.WorkflowId = workflowId;
                await PersistAsync(workflowId, patientId, symptoms, steps, statusPath, finalStatus, null, 0, retries, string.Join("; ", errors), sw.ElapsedMilliseconds);
                return result;
            }

            statusPath.Add("InputGate:PASS");

            // ── Step 2: Vague-input check ──────────────────────────────────
            steps.Add(new { Step = "VagueCheck" });
            var vagueResult = CheckVagueInput(symptoms);
            if (vagueResult != null)
            {
                _logger.LogInformation("[DocRecAgent] NEED_MORE_CONTEXT (vague)");
                statusPath.Add("VagueCheck:NEED_MORE_CONTEXT");
                finalStatus = "NEED_MORE_CONTEXT";
                result = vagueResult;
                result.WorkflowId = workflowId;
                await PersistAsync(workflowId, patientId, symptoms, steps, statusPath, finalStatus, null, 0, retries, string.Join("; ", errors), sw.ElapsedMilliseconds);
                return result;
            }
            statusPath.Add("VagueCheck:PASS");

            // ── Step 3: Red-flag safety rules ─────────────────────────────
            steps.Add(new { Step = "SafetyCheck" });
            var safetyResult = CheckRedFlags(symptoms);
            if (safetyResult != null)
            {
                _logger.LogWarning("[DocRecAgent] SAFETY_ESCALATION triggered");
                statusPath.Add("SafetyCheck:ESCALATE");
                finalStatus = "SAFETY_ESCALATION";
                result = safetyResult;
                result.WorkflowId = workflowId;
                await PersistAsync(workflowId, patientId, symptoms, steps, statusPath, finalStatus, null, 0, retries, string.Join("; ", errors), sw.ElapsedMilliseconds);
                return result;
            }
            statusPath.Add("SafetyCheck:PASS");

            // ── Step 4-6: Gemini call + parse + validate ───────────────────
            steps.Add(new { Step = "GeminiCall" });
            GeminiTriageResult? gemini = null;
            var geminiOk = false;

            for (var attempt = 0; attempt <= 1; attempt++)
            {
                if (attempt == 1) retries++;
                try
                {
                    gemini = await CallGeminiAsync(symptoms);
                    if (gemini != null && ValidateGeminiResult(gemini))
                    {
                        geminiOk = true;
                        break;
                    }
                    errors.Add($"Attempt {attempt + 1}: Gemini output failed validation");
                }
                catch (Exception ex)
                {
                    errors.Add($"Attempt {attempt + 1}: {ex.GetType().Name} — {ex.Message}");
                    _logger.LogWarning(ex, "[DocRecAgent] Gemini call attempt {Attempt} failed", attempt + 1);
                }
            }

            // ── Step 7: Keyword fallback ───────────────────────────────────
            if (!geminiOk)
            {
                statusPath.Add("Gemini:FAILED");
                steps.Add(new { Step = "KeywordFallback" });
                var fallback = RunKeywordFallback(symptoms);
                if (fallback != null)
                {
                    statusPath.Add("Fallback:MATCHED");
                    finalStatus = "RECOMMENDATION_READY";
                    finalSpecialty = fallback.Specialty;
                    finalConfidence = fallback.Confidence ?? 0;
                    result = fallback;
                    result.WorkflowId = workflowId;
                }
                else
                {
                    statusPath.Add("Fallback:NO_MATCH");
                    finalStatus = "SAFE_FAILURE";
                    result = new DoctorRecommendationResponseDto
                    {
                        WorkflowId = workflowId,
                        Status = "SAFE_FAILURE",
                        Reason = "Please select a specialty manually."
                    };
                }

                await PersistAsync(workflowId, patientId, symptoms, steps, statusPath, finalStatus, finalSpecialty, finalConfidence, retries, string.Join("; ", errors), sw.ElapsedMilliseconds);
                return result;
            }

            // ── Gemini success — apply confidence gate ─────────────────────
            var threshold = _config.GetValue<double>("DoctorRecommendation:ConfidenceThreshold", 0.6);
            if (gemini!.Confidence < threshold)
            {
                _logger.LogInformation("[DocRecAgent] Confidence {C} < threshold {T} → NEED_MORE_CONTEXT", gemini.Confidence, threshold);
                statusPath.Add("ConfidenceGate:LOW");
                finalStatus = "NEED_MORE_CONTEXT";
                result = new DoctorRecommendationResponseDto
                {
                    WorkflowId = workflowId,
                    Status = "NEED_MORE_CONTEXT",
                    Reason = gemini.Reason,
                    FollowUpQuestions = gemini.FollowUpQuestions ?? GenerateGenericFollowUps()
                };
                await PersistAsync(workflowId, patientId, symptoms, steps, statusPath, finalStatus, null, gemini.Confidence, retries, string.Join("; ", errors), sw.ElapsedMilliseconds);
                return result;
            }

            if (gemini.Status == "NEED_MORE_CONTEXT")
            {
                statusPath.Add("Gemini:NEED_MORE_CONTEXT");
                finalStatus = "NEED_MORE_CONTEXT";
                result = new DoctorRecommendationResponseDto
                {
                    WorkflowId = workflowId,
                    Status = "NEED_MORE_CONTEXT",
                    Reason = gemini.Reason,
                    FollowUpQuestions = gemini.FollowUpQuestions ?? GenerateGenericFollowUps()
                };
                await PersistAsync(workflowId, patientId, symptoms, steps, statusPath, finalStatus, null, gemini.Confidence, retries, string.Join("; ", errors), sw.ElapsedMilliseconds);
                return result;
            }

            // ── RECOMMENDATION_READY ───────────────────────────────────────
            statusPath.Add($"Gemini:RECOMMENDATION_READY:{gemini.Specialty}:{gemini.Confidence:F2}");
            finalStatus = "RECOMMENDATION_READY";
            finalSpecialty = gemini.Specialty;
            finalConfidence = gemini.Confidence;

            result = new DoctorRecommendationResponseDto
            {
                WorkflowId = workflowId,
                Status = "RECOMMENDATION_READY",
                Specialty = gemini.Specialty,
                Confidence = Math.Round(gemini.Confidence, 2),
                Reason = gemini.Reason
            };

            _logger.LogInformation("[DocRecAgent] RECOMMENDATION_READY → {Specialty} ({Conf:P0}) in {Ms}ms",
                gemini.Specialty, gemini.Confidence, sw.ElapsedMilliseconds);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[DocRecAgent] Unexpected top-level failure");
            errors.Add(ex.Message);
            finalStatus = "SAFE_FAILURE";
            result = new DoctorRecommendationResponseDto
            {
                WorkflowId = workflowId,
                Status = "SAFE_FAILURE",
                Reason = "Please select a specialty manually."
            };
        }

        await PersistAsync(workflowId, patientId, rawSymptoms ?? string.Empty, steps, statusPath, finalStatus, finalSpecialty, finalConfidence, retries, string.Join("; ", errors), sw.ElapsedMilliseconds);
        return result;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Step 1 helpers
    // ═══════════════════════════════════════════════════════════════════════════
    private static bool IsGreetingOrNonsense(string lower)
    {
        var words = lower.Split([' ', ',', '.', '!', '?'], StringSplitOptions.RemoveEmptyEntries);
        if (words.All(w => GreetingOnlyWords.Contains(w))) return true;
        // Pure digit / punctuation only
        if (Regex.IsMatch(lower, @"^[\d\s\W]+$")) return true;
        // No real words longer than 3 chars
        return !words.Any(w => w.Length > 3 && !GreetingOnlyWords.Contains(w));
    }

    private static DoctorRecommendationResponseDto BuildInvalidInput(string message) =>
        new()
        {
            Status = "INPUT_INVALID",
            Reason = message
        };

    // ═══════════════════════════════════════════════════════════════════════════
    // Step 2: Vague-input check
    // ═══════════════════════════════════════════════════════════════════════════
    private static DoctorRecommendationResponseDto? CheckVagueInput(string symptoms)
    {
        var lower = symptoms.ToLowerInvariant();
        var words = lower.Split([' ', ',', '.', ';'], StringSplitOptions.RemoveEmptyEntries);

        // Only a single medical vague term with no context (no duration, no detail)
        if (words.Length <= 3 && words.Any(w => VagueSingleTerms.Contains(w))
            && !Regex.IsMatch(lower, @"\b(since|for|days?|hours?|weeks?|ago|with|and|also|plus|wors(e|en))\b"))
        {
            return new DoctorRecommendationResponseDto
            {
                Status = "NEED_MORE_CONTEXT",
                Reason = "Your description is a little brief. A few more details will help us point you to the right specialist.",
                FollowUpQuestions =
                [
                    "How long have you been experiencing this symptom? (e.g., since yesterday, for a week)",
                    "Are there any other symptoms alongside this — such as fever, nausea, or swelling?",
                    "How would you rate the severity on a scale of 1 to 10?"
                ]
            };
        }

        return null;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Step 3: Red-flag safety rules
    // ═══════════════════════════════════════════════════════════════════════════
    private static DoctorRecommendationResponseDto? CheckRedFlags(string symptoms)
    {
        foreach (var (pattern, message) in RedFlagPatterns)
        {
            if (pattern.IsMatch(symptoms))
            {
                return new DoctorRecommendationResponseDto
                {
                    Status = "SAFETY_ESCALATION",
                    SafetyMessage = message
                };
            }
        }
        return null;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Step 4: Gemini API call
    // ═══════════════════════════════════════════════════════════════════════════
    private async Task<GeminiTriageResult?> CallGeminiAsync(string symptoms)
    {
        var apiKey = _config["Gemini:ApiKey"];
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            _logger.LogWarning("[DocRecAgent] Gemini:ApiKey not configured — skipping LLM.");
            return null;
        }

        var model = _config["DoctorRecommendation:GeminiModel"] ?? _config["Gemini:Model"] ?? "gemini-3.5-flash-lite";
        var timeoutSec = _config.GetValue<int>("DoctorRecommendation:TimeoutSeconds", 10);
        var endpoint = $"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={apiKey}";

        var systemPrompt = """
            You are a clinical triage ROUTER, not a doctor. Your only job is to map symptoms to one hospital specialty from a fixed list.
            Rules:
            - NEVER diagnose any condition.
            - NEVER recommend medication or treatments.
            - NEVER book or suggest a specific doctor.
            - Output ONLY valid JSON — no markdown, no preamble.
            - Keep "reason" to one or two plain, non-diagnostic sentences suitable for a patient.
            - If genuinely unsure or symptoms are too vague, set status to NEED_MORE_CONTEXT and provide 2-3 follow-up questions.
            """;

        var userPrompt = $$"""
            A patient has described symptoms: "{{symptoms}}"

            Choose the SINGLE most appropriate specialty from this exact list only:
            ["Cardiology","Neurology","Orthopaedics","Paediatrics","Gynaecology","Dermatology","ENT","General Medicine"]

            Respond ONLY with this JSON (no extra fields, no markdown):
            {
              "status": "RECOMMENDATION_READY",
              "specialty": "<one from allowed list>",
              "confidence": 0.85,
              "reason": "<1-2 plain sentences, no diagnosis>",
              "followUpQuestions": []
            }

            If status is NEED_MORE_CONTEXT, set specialty to null and populate followUpQuestions with 2-3 strings.
            Valid status values: RECOMMENDATION_READY, NEED_MORE_CONTEXT
            """;

        var requestBody = new
        {
            system_instruction = new { parts = new[] { new { text = systemPrompt } } },
            contents = new[] { new { parts = new[] { new { text = userPrompt } } } },
            generationConfig = new
            {
                temperature = 0,
                maxOutputTokens = 512,
                responseMimeType = "application/json"
            }
        };

        var json = JsonSerializer.Serialize(requestBody);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(timeoutSec));
        var response = await _httpClient.PostAsync(endpoint, content, cts.Token);

        if (!response.IsSuccessStatusCode)
        {
            var err = await response.Content.ReadAsStringAsync();
            throw new InvalidOperationException($"Gemini HTTP {(int)response.StatusCode}: {err[..Math.Min(200, err.Length)]}");
        }

        var body = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(body);

        var text = doc.RootElement
            .GetProperty("candidates")[0]
            .GetProperty("content")
            .GetProperty("parts")[0]
            .GetProperty("text")
            .GetString();

        if (string.IsNullOrWhiteSpace(text)) return null;

        // Strip markdown fences if present
        var clean = text.Trim();
        if (clean.StartsWith("```"))
        {
            var nl = clean.IndexOf('\n');
            var lb = clean.LastIndexOf("```");
            if (nl >= 0 && lb > nl) clean = clean[(nl + 1)..lb].Trim();
        }

        return JsonSerializer.Deserialize<GeminiTriageResult>(clean,
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Step 5: Validate Gemini result (deterministic C#)
    // ═══════════════════════════════════════════════════════════════════════════
    private bool ValidateGeminiResult(GeminiTriageResult r)
    {
        if (r == null) return false;

        // Normalize status
        var status = r.Status?.Trim().ToUpperInvariant() ?? string.Empty;
        if (status is "SUCCESS" or "READY" or "RECOMMENDATION_READY" or "RECOMMENDED")
        {
            r.Status = "RECOMMENDATION_READY";
        }
        else if (status.Contains("CONTEXT") || status.Contains("MORE") || status.Contains("QUESTION") || (r.FollowUpQuestions != null && r.FollowUpQuestions.Count > 0 && string.IsNullOrWhiteSpace(r.Specialty)))
        {
            r.Status = "NEED_MORE_CONTEXT";
        }
        else
        {
            // If Gemini produced a valid specialty from our allowed list, treat as RECOMMENDATION_READY
            if (!string.IsNullOrWhiteSpace(r.Specialty) &&
                AllowedSpecialties.Any(s => string.Equals(s, r.Specialty.Trim(), StringComparison.OrdinalIgnoreCase)))
            {
                r.Status = "RECOMMENDATION_READY";
            }
            else
            {
                return false;
            }
        }

        // Normalize confidence
        if (r.Confidence < 0 || r.Confidence > 1)
        {
            if (r.Confidence > 1.0 && r.Confidence <= 100.0)
            {
                r.Confidence /= 100.0;
            }
            else
            {
                r.Confidence = 0.85;
            }
        }

        if (r.Status == "RECOMMENDATION_READY")
        {
            if (string.IsNullOrWhiteSpace(r.Specialty)) return false;
            var canonical = AllowedSpecialties.FirstOrDefault(s => string.Equals(s, r.Specialty.Trim(), StringComparison.OrdinalIgnoreCase));
            if (canonical == null) return false;
            r.Specialty = canonical;
            if (string.IsNullOrWhiteSpace(r.Reason))
            {
                r.Reason = $"Based on your symptoms, consultation with {canonical} is recommended.";
            }
        }

        return true;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Step 7: Weighted keyword scoring engine (replaces simple first-match fallback)
    // ═══════════════════════════════════════════════════════════════════════════
    private DoctorRecommendationResponseDto? RunKeywordFallback(string symptoms)
    {
        const double MinWinScore = 1.0; // must accumulate at least this to count as a match

        string? bestSpecialty = null;
        double bestScore = 0;
        double secondBestScore = 0;

        foreach (var (specialty, terms) in ScoredSpecialties)
        {
            double score = 0;
            foreach (var (pattern, weight) in terms)
            {
                var matchCount = pattern.Matches(symptoms).Count;
                score += matchCount * weight;
            }

            if (score > bestScore)
            {
                secondBestScore = bestScore;
                bestScore = score;
                bestSpecialty = specialty;
            }
            else if (score > secondBestScore)
            {
                secondBestScore = score;
            }
        }

        if (bestSpecialty == null || bestScore < MinWinScore)
        {
            _logger.LogInformation("[DocRecAgent] Weighted scoring: no specialty cleared min threshold ({Score:F2})", bestScore);
            return null;
        }

        // Confidence = how clearly the winner leads over runner-up, capped at 0.88 for rule-based results
        double lead = bestScore - secondBestScore;
        double rawConf = Math.Min(0.88, 0.55 + (lead / Math.Max(bestScore, 1.0)) * 0.33);
        double confidence = Math.Round(rawConf, 2);

        _logger.LogInformation(
            "[DocRecAgent] Weighted scoring winner: {Specialty} score={Score:F2} conf={Conf:P0} (2nd={Second:F2})",
            bestSpecialty, bestScore, confidence, secondBestScore);

        var reason = bestSpecialty switch
        {
            "General Medicine" => "Your symptoms are commonly managed by a General Physician who can assess and refer if needed.",
            "Cardiology"       => "Your symptoms suggest they may be related to the heart or circulatory system.",
            "Neurology"        => "Your symptoms may be related to the nervous system or brain function.",
            "Orthopaedics"     => "Your symptoms appear to relate to bones, joints, or the musculoskeletal system.",
            "Paediatrics"      => "Based on the details provided, a specialist in children's health would be most appropriate.",
            "Gynaecology"      => "Your symptoms appear to relate to women's reproductive or hormonal health.",
            "Dermatology"      => "Your symptoms appear to involve the skin, hair, or nails.",
            "ENT"              => "Your symptoms appear to relate to the ear, nose, throat, or sinuses.",
            _                  => "This suggestion is for guidance only. Please consult your doctor for a proper evaluation."
        };

        return new DoctorRecommendationResponseDto
        {
            Status     = "RECOMMENDATION_READY",
            Specialty  = bestSpecialty,
            Confidence = confidence,
            Reason     = reason
        };
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Step 8: Persist audit record
    // ═══════════════════════════════════════════════════════════════════════════
    private async Task PersistAsync(
        Guid workflowId, int? patientId, string inputText,
        List<object> steps, List<string> statusPath,
        string finalStatus, string? specialty, double confidence,
        int retries, string errors, long durationMs)
    {
        try
        {
            var wf = new RecommendationWorkflow
            {
                Id = workflowId,
                PatientId = patientId,
                InputText = inputText,
                Objective = "Find an appropriate hospital specialty for the patient's reported symptoms.",
                PlanJson = JsonSerializer.Serialize(new[]
                {
                    "InputGate", "VagueCheck", "SafetyCheck",
                    "GeminiCall", "ParseAndRetry", "DeterministicValidation",
                    "ConfidenceGate", "KeywordFallback", "Persist"
                }),
                StepResultsJson = JsonSerializer.Serialize(steps),
                StatusPath = string.Join(" → ", statusPath),
                FinalStatus = finalStatus,
                Specialty = specialty,
                Confidence = confidence,
                Retries = retries,
                Errors = errors.Length > 0 ? errors : null,
                DurationMs = durationMs,
                CreatedAt = DateTime.UtcNow
            };

            _context.RecommendationWorkflows.Add(wf);
            await _context.SaveChangesAsync();
            _logger.LogInformation("[DocRecAgent] Workflow {Id} persisted. Status={Status} Duration={Ms}ms",
                workflowId, finalStatus, durationMs);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[DocRecAgent] Failed to persist workflow {Id}. Continuing.", workflowId);
        }
    }

    private static List<string> GenerateGenericFollowUps() =>
    [
        "How long have you been experiencing these symptoms?",
        "Are there any additional symptoms you haven't mentioned?",
        "How severe are the symptoms on a scale of 1 to 10?"
    ];
}
