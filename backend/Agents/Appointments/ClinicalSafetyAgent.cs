using HealthBridge.Api.DTOs.Appointments;
using System.Text.RegularExpressions;

namespace HealthBridge.Api.Agents.Appointments;

/// <summary>
/// ClinicalSafetyAgent — Specialized Agent for Patient Safety & Red-Flag Escalation.
/// Complies with SE3090 Section 9.1: "Validation or Safety Agent with identifiable responsibility".
/// 
/// Runs deterministic, pure C# checks with ZERO LLM dependency to guarantee zero hallucinations
/// and immediate life-saving escalations for emergency medical complaints.
/// </summary>
public interface IClinicalSafetyAgent
{
    string AgentName { get; }
    SafetyEvaluationResult EvaluateSafety(string symptoms);
}

public class SafetyEvaluationResult
{
    public bool IsSafeToTriage { get; set; }
    public string Status { get; set; } = "SAFE"; // SAFE | INPUT_INVALID | NEED_MORE_CONTEXT | SAFETY_ESCALATION
    public string? Reason { get; set; }
    public string? SafetyMessage { get; set; }
    public List<string> FollowUpQuestions { get; set; } = new();
}

public class ClinicalSafetyAgent : IClinicalSafetyAgent
{
    private readonly ILogger<ClinicalSafetyAgent> _logger;

    public string AgentName => "ClinicalSafetyAgent";

    private static readonly HashSet<string> GreetingOnlyWords =
    [
        "hi", "hello", "hey", "howdy", "hiya", "greetings", "good morning",
        "good afternoon", "good evening", "happy", "fine", "ok", "okay",
        "test", "asdf", "qwerty", "abc", "123", "nothing", "n/a", "na"
    ];

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

    private static readonly HashSet<string> VagueSingleTerms =
    [
        "pain", "hurt", "ache", "tired", "fatigue", "sick", "unwell", "fever",
        "headache", "nausea", "dizzy", "cough", "sore", "weak", "weakness"
    ];

    public ClinicalSafetyAgent(ILogger<ClinicalSafetyAgent> logger)
    {
        _logger = logger;
    }

    public SafetyEvaluationResult EvaluateSafety(string symptoms)
    {
        var input = symptoms?.Trim() ?? string.Empty;

        // 1. Word count & length gate
        var words = input.Split([' ', '\t', '\n', '\r', ',', ';'], StringSplitOptions.RemoveEmptyEntries);
        if (words.Length < 2)
        {
            _logger.LogInformation("[{Agent}] Input too short (< 2 words): '{Input}'", AgentName, input);
            return new SafetyEvaluationResult
            {
                IsSafeToTriage = false,
                Status = "INPUT_INVALID",
                Reason = "Please describe your symptoms in 2 or more words (e.g., 'frequent headache', 'persistent knee pain', or 'chest tightness'). Single words lack clinical context for accurate triage."
            };
        }

        var lower = input.ToLowerInvariant();
        if (IsGreetingOrNonsense(lower))
        {
            _logger.LogInformation("[{Agent}] Greeting or nonsense detected: '{Input}'", AgentName, input);
            return new SafetyEvaluationResult
            {
                IsSafeToTriage = false,
                Status = "INPUT_INVALID",
                Reason = "Please describe your medical symptoms — for example, 'I have had a severe headache and nausea for two days.'"
            };
        }

        // 2. Vague symptom check
        var vagueResult = CheckVagueInput(input);
        if (vagueResult != null)
        {
            return vagueResult;
        }

        // 3. Red flag emergency rules
        foreach (var (pattern, message) in RedFlagPatterns)
        {
            if (pattern.IsMatch(input))
            {
                _logger.LogWarning("[{Agent}] Emergency red flag triggered for input: '{Input}'", AgentName, input);
                return new SafetyEvaluationResult
                {
                    IsSafeToTriage = false,
                    Status = "SAFETY_ESCALATION",
                    SafetyMessage = message,
                    Reason = "Immediate emergency medical attention required."
                };
            }
        }

        return new SafetyEvaluationResult
        {
            IsSafeToTriage = true,
            Status = "SAFE",
            Reason = "No emergency red flags identified. Clinical triage may proceed."
        };
    }

    private static bool IsGreetingOrNonsense(string lower)
    {
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
