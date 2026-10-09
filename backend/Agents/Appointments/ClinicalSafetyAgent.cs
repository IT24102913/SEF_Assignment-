using HealthBridge.Api.DTOs.Appointments;
using System.Text.RegularExpressions;

namespace HealthBridge.Api.Agents.Appointments;

/// <summary>
/// ClinicalSafetyAgent — Specialized Deterministic Agent for Patient Safety & Red-Flag Escalation.
/// Complies with SE3090 Section 9.1:
///   - Validation / Safety Agent with identifiable responsibility
///   - Pure C# execution with ZERO LLM dependency (zero hallucinations, zero network latency)
///   - Executes FIRST before any length or vagueness checks to prioritize patient safety
///   - Immediately escalates emergency complaints to Sri Lankan national helplines (1990 / 119 / 1926)
/// </summary>
public interface IClinicalSafetyAgent : IWorkflowAgent
{
    SafetyEvaluationResult EvaluateSafety(string symptoms);
}

public static class RedFlagCodes
{
    public const string Cardiac = "CARDIAC";
    public const string Stroke = "STROKE";
    public const string Unconscious = "UNCONSCIOUS";
    public const string Bleeding = "BLEEDING";
    public const string Anaphylaxis = "ANAPHYLAXIS";
    public const string SelfHarm = "SELF_HARM";
    public const string Seizure = "SEIZURE";
    public const string Respiratory = "RESPIRATORY";
    public const string Poisoning = "POISONING";
}

public class SafetyEvaluationResult
{
    public bool IsSafeToTriage { get; set; }
    public string Status { get; set; } = "SAFE"; // SAFE | INPUT_INVALID | NEED_MORE_CONTEXT | SAFETY_ESCALATION
    public string? RedFlagCode { get; set; }
    public string? Reason { get; set; }
    public string? SafetyMessage { get; set; }
    public List<string> FollowUpQuestions { get; set; } = new();
}

public class ClinicalSafetyAgent : IClinicalSafetyAgent
{
    private readonly ILogger<ClinicalSafetyAgent> _logger;

    public string AgentName => "ClinicalSafetyAgent";
    public string Role => "Deterministic emergency red-flag audit and input validity gating before clinical triage.";

    private static readonly HashSet<string> GreetingOnlyWords =
    [
        "hi", "hello", "hey", "howdy", "hiya", "greetings", "good", "morning",
        "afternoon", "evening", "happy", "fine", "ok", "okay", "doctor", "doc",
        "test", "asdf", "qwerty", "abc", "123", "nothing", "n/a", "na", "please", "help"
    ];

    private static readonly Regex GreetingRegex = new(
        @"^(hi|hello|hey|good\s*(morning|afternoon|evening)|greetings|howdy|hiya)(\s+(doctor|doc|there|please|help|sir|madam))?[\s.!?,]*$",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private static readonly HashSet<string> VagueSingleTerms =
    [
        "pain", "hurt", "ache", "tired", "fatigue", "sick", "unwell", "fever",
        "headache", "nausea", "dizzy", "cough", "sore", "weak", "weakness"
    ];

    // Red-Flag Rules evaluated FIRST on normalized raw input
    private static readonly (string Code, Regex Pattern, string Message)[] RedFlagRules =
    [
        // 1. CARDIAC
        (
            RedFlagCodes.Cardiac,
            new Regex(@"\b(heart\s*attack|cardiac\s*arrest|crushing\s*chest\s*pain|no\s*pulse|pulseless)\b|\bleft\s*arm\s*pain\b.{0,60}\bchest\b|\bchest\b.{0,60}\bleft\s*arm\s*pain\b|\bchest\s*(pain|tight\w*|pressure)\b.{0,80}\b(breath\w*|can'?t\s*breathe|cannot\s*breathe|short\w*\s*of\s*breath)\b|\b(breath\w*|can'?t\s*breathe|cannot\s*breathe|short\w*\s*of\s*breath)\b.{0,80}\bchest\s*(pain|tight\w*|pressure)\b",
                RegexOptions.IgnoreCase | RegexOptions.Compiled),
            "⚠️ Emergency: Possible acute cardiac event (heart attack / cardiac arrest). Time is critical — call emergency services (1990 Suwa Seriya Ambulance / 119) or attend the nearest Emergency Room immediately."
        ),
        // 2. STROKE
        (
            RedFlagCodes.Stroke,
            new Regex(@"\b(stroke|facial\s*droop\w*|slurred\s*speech|face\s*(?:is\s*)?(droop\w*|numb\w*)|can'?t\s*speak|sudden\s*weakness|arm\s*(?:is\s*)?weak\w*|sudden\s*confusion)\b",
                RegexOptions.IgnoreCase | RegexOptions.Compiled),
            "⚠️ Emergency: Symptoms suggest a possible acute stroke. Time is brain — call emergency services (1990 Suwa Seriya Ambulance / 119) immediately."
        ),
        // 3. UNCONSCIOUS
        (
            RedFlagCodes.Unconscious,
            new Regex(@"\b(unconscious\w*|loss\s*of\s*consciousness|passed\s*out|unresponsive\w*|not\s*responding|blackout|fainted|fainting|collapsed)\b",
                RegexOptions.IgnoreCase | RegexOptions.Compiled),
            "⚠️ Emergency: Loss of consciousness or unresponsiveness requires urgent medical attention. Call emergency services (1990 / 119) or go to the nearest Emergency Department now."
        ),
        // 4. BLEEDING
        (
            RedFlagCodes.Bleeding,
            new Regex(@"\b(severe\s*bleed\w*|bleed\w*\s*heavily|blood\s*everywhere|arterial\s*bleed\w*|uncontrolled\s*bleed\w*|(cough\w*|vomit\w*|spit\w*|spitting)\s*(up\s*)?blood)\b",
                RegexOptions.IgnoreCase | RegexOptions.Compiled),
            "⚠️ Emergency: Severe or uncontrolled bleeding requires immediate medical intervention. Apply direct pressure and call emergency services (1990 / 119) immediately."
        ),
        // 5. ANAPHYLAXIS
        (
            RedFlagCodes.Anaphylaxis,
            new Regex(@"\b(anaphyla\w*|severe\s*allergic\s*reaction|throat\s*swell\w*|tongue\s*swell\w*|airway\s*swell\w*|can'?t\s*swallow)\b",
                RegexOptions.IgnoreCase | RegexOptions.Compiled),
            "⚠️ Emergency: Signs of acute anaphylaxis or airway swelling. Administer an EpiPen if prescribed and call emergency services (1990 / 119) immediately."
        ),
        // 6. SELF_HARM
        (
            RedFlagCodes.SelfHarm,
            new Regex(@"\b(suicid\w*|kill\s*myself|end\s*my\s*life|want\s*to\s*die|self[\s-]harm)\b",
                RegexOptions.IgnoreCase | RegexOptions.Compiled),
            "⚠️ You are not alone. Please reach out for immediate support: call the National Mental Health Helpline at 1926 (Toll-Free, 24/7) or attend the nearest Emergency Department immediately."
        ),
        // 7. SEIZURE
        (
            RedFlagCodes.Seizure,
            new Regex(@"\b(seiz\w*|convuls\w*|epileptic\s*fit|fitting)\b",
                RegexOptions.IgnoreCase | RegexOptions.Compiled),
            "⚠️ Emergency: Seizures or convulsions require emergency medical care. Ensure the patient is in a safe position, do not restrain them, and call 1990 / 119 immediately."
        ),
        // 8. RESPIRATORY
        (
            RedFlagCodes.Respiratory,
            new Regex(@"\b(chok\w*|not\s*breathing|stopped\s*breathing|cannot\s*breathe|can'?t\s*breathe|gasping\s*for\s*air|asphyxiat\w*|severe\s*stridor)\b",
                RegexOptions.IgnoreCase | RegexOptions.Compiled),
            "⚠️ Emergency: Acute respiratory arrest or choking. Call emergency services (1990 / 119) immediately for urgent paramedic assistance."
        ),
        // 9. POISONING (Excludes food poisoning/foodborne illness which is triaged to General Medicine)
        (
            RedFlagCodes.Poisoning,
            new Regex(@"\b(overdos\w*|(?<!food\s+|foodborne\s+)poison\w*|ingested\s*(chemical|toxin|pesticide)|swallowed\s*(bleach|poison|battery)|rat\s*poison|pesticide\s*poison\w*)\b",
                RegexOptions.IgnoreCase | RegexOptions.Compiled),
            "⚠️ Emergency: Suspected acute poisoning or drug overdose. Call the National Poison Information Centre or 1990 / 119 immediately. Do not induce vomiting unless advised by medical staff."
        )
    ];

    // Negative states that represent the emergency condition itself — NEVER suppressed by negation
    private static readonly Regex NegativeStatePattern = new(
        @"\b(not\s*breathing|stopped\s*breathing|cannot\s*breathe|can'?t\s*breathe|not\s*responding|unresponsive\w*|no\s*pulse|pulseless|can'?t\s*speak|cannot\s*speak|can'?t\s*swallow|cannot\s*swallow)\b",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    // Clause boundary separator (splits at conjunctions, transitions, and punctuation)
    private static readonly Regex ClauseSeparator = new(
        @"\b(?:but|however|though|although|except|and\s+now)\b|[,;.:]",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    // Negation words that cancel preceding symptom nouns in the same clause
    private static readonly Regex NegationPrefixPattern = new(
        @"\b(no|not|without|denies|denying|ruled\s*out)\s+(?:\w+\s+){0,3}",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    // Past / Chronic qualifiers
    private static readonly Regex HistoricalQualifierPattern = new(
        @"\b(years?\s*ago|months?\s*ago|weeks?\s*ago|last\s*(?:year|month)|history\s*of|prior|previous|past|follow-?up|post-stroke\s*follow-?up)\b",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    // Chronic sensation (e.g. globus sensation for weeks)
    private static readonly Regex ChronicSensationPattern = new(
        @"\bchoking\s*sensation\b.{0,30}\b(for\s*weeks|for\s*months|chronic)\b|\b(for\s*weeks|for\s*months|chronic)\b.{0,30}\bchoking\s*sensation\b",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    // Acute event recurrence indicators that OVERRIDE historical suppression
    private static readonly Regex AcuteRecurrencePattern = new(
        @"\b(had\s*one\s*(?:today|again|just\s*now|tonight|this\s*morning)|another\s*(?:one\s*)?(?:today|again|just\s*now|tonight|this\s*morning)|(?:seizure|faint\w*|stroke|attack)\s*(?:today|again|just\s*now|tonight|this\s*morning)|\b\d+\s*minutes?\s*ago\b|\b\d+\s*hours?\s*ago\b)\b",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    public ClinicalSafetyAgent(ILogger<ClinicalSafetyAgent> logger)
    {
        _logger = logger;
    }

    /// <summary>
    /// Normalizes raw symptom text: strips zero-width and control characters,
    /// corrects unambiguous common typos, and collapses whitespace.
    /// </summary>
    public static string NormalizeInput(string raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return string.Empty;

        // 1. Strip zero-width, invisible, and control characters
        var cleaned = Regex.Replace(raw, @"[\u200B-\u200D\uFEFF\u0000-\u001F\u007F-\u009F]", string.Empty);

        // 2. Normalize simple common misspellings for red-flag terminology
        cleaned = Regex.Replace(cleaned, @"\bhart\s*attack\b", "heart attack", RegexOptions.IgnoreCase);
        cleaned = Regex.Replace(cleaned, @"\bseisure\b", "seizure", RegexOptions.IgnoreCase);
        cleaned = Regex.Replace(cleaned, @"\bunconcious\b", "unconscious", RegexOptions.IgnoreCase);

        // 3. Collapse whitespace and trim
        return Regex.Replace(cleaned, @"\s+", " ").Trim();
    }

    public SafetyEvaluationResult EvaluateSafety(string symptoms)
    {
        var normalized = NormalizeInput(symptoms);

        // ───────────────────────────────────────────────────────────────────────
        // STEP 1: RED-FLAG EMERGENCY CHECK (RUNS FIRST ON NORMALIZED INPUT)
        // Evaluates clause-scoped negation, historical/chronic suppression, and acute overrides.
        // ───────────────────────────────────────────────────────────────────────
        if (!string.IsNullOrEmpty(normalized))
        {
            var emergencyResult = EvaluateEmergencyPatterns(normalized);
            if (emergencyResult != null)
            {
                _logger.LogWarning("[{Agent}] Emergency red flag triggered: Code={Code}, Length={Len}",
                    AgentName, emergencyResult.RedFlagCode, normalized.Length);

                return emergencyResult;
            }
        }

        // ───────────────────────────────────────────────────────────────────────
        // STEP 2: WORD COUNT & INPUT LENGTH GATE (NON-EMERGENCY ONLY)
        // ───────────────────────────────────────────────────────────────────────
        var words = normalized.Split([' ', '\t', '\n', '\r', ',', ';'], StringSplitOptions.RemoveEmptyEntries);
        if (words.Length < 2)
        {
            _logger.LogInformation("[{Agent}] Input too short (< 2 words): Length={Len}", AgentName, normalized.Length);
            return new SafetyEvaluationResult
            {
                IsSafeToTriage = false,
                Status = "INPUT_INVALID",
                Reason = "Please describe your symptoms in 2 or more words (e.g., 'frequent headache', 'persistent knee pain', or 'chest tightness'). Single words lack clinical context for accurate triage."
            };
        }

        var lower = normalized.ToLowerInvariant();
        if (IsGreetingOrNonsense(lower))
        {
            _logger.LogInformation("[{Agent}] Greeting or nonsense detected: Length={Len}", AgentName, normalized.Length);
            return new SafetyEvaluationResult
            {
                IsSafeToTriage = false,
                Status = "INPUT_INVALID",
                Reason = "Please describe your medical symptoms — for example, 'I have had a severe headache and nausea for two days.'"
            };
        }

        // ───────────────────────────────────────────────────────────────────────
        // STEP 3: VAGUE SYMPTOM CHECK
        // ───────────────────────────────────────────────────────────────────────
        var vagueResult = CheckVagueInput(normalized);
        if (vagueResult != null)
        {
            return vagueResult;
        }

        // ───────────────────────────────────────────────────────────────────────
        // STEP 4: PASSED ALL SAFETY GATES
        // ───────────────────────────────────────────────────────────────────────
        return new SafetyEvaluationResult
        {
            IsSafeToTriage = true,
            Status = "SAFE",
            Reason = "No emergency red flags identified. Clinical triage may proceed."
        };
    }

    private static SafetyEvaluationResult? EvaluateEmergencyPatterns(string normalized)
    {
        // 1. Chronic globus sensation check (choking sensation for weeks -> non-emergency ENT/GI)
        bool hasChronicChokingSensation = ChronicSensationPattern.IsMatch(normalized);

        // 2. Split input into clauses at conjunctions and punctuation to evaluate clause-scoped negation
        var clauses = ClauseSeparator.Split(normalized);

        foreach (var (code, pattern, message) in RedFlagRules)
        {
            // Respiratory chronic sensation exception
            if (code == RedFlagCodes.Respiratory && hasChronicChokingSensation)
            {
                var withoutChronic = ChronicSensationPattern.Replace(normalized, "");
                if (!pattern.IsMatch(withoutChronic))
                {
                    continue;
                }
            }

            foreach (var clause in clauses)
            {
                var trimmedClause = clause.Trim();
                if (string.IsNullOrEmpty(trimmedClause)) continue;

                var match = pattern.Match(trimmedClause);
                if (!match.Success) continue;

                // Rule 2.a: Negation NEVER applies to patterns that are themselves negative states
                bool isNegativeState = NegativeStatePattern.IsMatch(match.Value);
                if (!isNegativeState)
                {
                    // For symptom nouns, check if preceded by negation in this clause
                    var prefixText = trimmedClause[..match.Index];
                    if (NegationPrefixPattern.IsMatch(prefixText))
                    {
                        // Negated in this clause -> skip this match
                        continue;
                    }
                }

                // Rule 2.b: Historical/chronic suppression
                // NEVER suppress SELF_HARM or ANAPHYLAXIS
                if (code != RedFlagCodes.SelfHarm && code != RedFlagCodes.Anaphylaxis)
                {
                    bool isHistoricalQualified = HistoricalQualifierPattern.IsMatch(trimmedClause);

                    if (isHistoricalQualified)
                    {
                        // Check if whole input contains an acute recurrence/event marker
                        bool hasAcuteRecurrence = AcuteRecurrencePattern.IsMatch(normalized);
                        if (!hasAcuteRecurrence)
                        {
                            // Historical event with no acute marker/recurrence -> suppress emergency
                            continue;
                        }
                    }
                }

                // Un-negated, acute emergency detected
                return new SafetyEvaluationResult
                {
                    IsSafeToTriage = false,
                    Status = "SAFETY_ESCALATION",
                    RedFlagCode = code,
                    SafetyMessage = message,
                    Reason = "Immediate emergency medical attention required."
                };
            }
        }

        return null;
    }

    private static bool IsGreetingOrNonsense(string lower)
    {
        if (GreetingRegex.IsMatch(lower)) return true;
        var words = lower.Split([' ', ',', '.', '!', '?'], StringSplitOptions.RemoveEmptyEntries);
        if (words.All(w => GreetingOnlyWords.Contains(w))) return true;
        // Pure digit / punctuation only
        if (Regex.IsMatch(lower, @"^[\d\s\W]+$")) return true;
        // No real words longer than 3 chars
        return !words.Any(w => w.Length > 3 && !GreetingOnlyWords.Contains(w));
    }

    private static SafetyEvaluationResult? CheckVagueInput(string symptoms)
    {
        var lower = symptoms.ToLowerInvariant();
        var words = lower.Split([' ', ',', '.', ';'], StringSplitOptions.RemoveEmptyEntries);

        // Only a single medical vague term with no context (no duration, no detail)
        if (words.Length <= 3 && words.Any(w => VagueSingleTerms.Contains(w))
            && !Regex.IsMatch(lower, @"\b(since|for|days?|hours?|weeks?|ago|with|and|also|plus|wors(e|en))\b"))
        {
            return new SafetyEvaluationResult
            {
                IsSafeToTriage = false,
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
}
