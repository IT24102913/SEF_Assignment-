using HealthBridge.Api.DTOs.Appointments;

namespace HealthBridge.Api.Agents.Appointments;

/// <summary>
/// Result of deterministic validation performed on the proposed recommendation.
/// </summary>
public class RecommendationValidationResult
{
    public bool IsValid { get; set; }
    public string Status { get; set; } = "VALID"; // VALID | INVALID_SPECIALTY | NO_DOCTORS | INVALID_DOCTOR_SPECIALTY | LOW_CONFIDENCE | NO_BOOKABLE_SESSION
    public string? Reason { get; set; }
}

/// <summary>
/// Deterministic validation agent acting as the final safety & clinical gate before proposal generation.
/// Complies with SE3090 Section 9.1: "Deterministic validation (schema / business logic / safety constraints)
/// performed after tool execution and before generating the final result."
/// </summary>
public interface IRecommendationValidationAgent : IWorkflowAgent
{
    RecommendationValidationResult Validate(
        string? specialty,
        double confidence,
        List<MatchedDoctorDto> matchedDoctors);
}

public class RecommendationValidationAgent : IRecommendationValidationAgent
{
    public string AgentName => "RecommendationValidationAgent";
    public string Responsibility => "Deterministic validation of canonical specialty, confidence thresholds, and verified bookable consultant status.";
    public string InputContract => "(string? specialty, double confidence, List<MatchedDoctorDto> matchedDoctors)";
    public string OutputContract => "RecommendationValidationResult (IsValid, Status, Reason)";
    public IReadOnlyList<string> AllowedTools => Array.Empty<string>(); // Least privilege: pure deterministic validation logic

    public RecommendationValidationResult Validate(
        string? specialty,
        double confidence,
        List<MatchedDoctorDto> matchedDoctors)
    {
        // 1. Validate proposed specialty against canonical clinical roster
        if (string.IsNullOrWhiteSpace(specialty) || !CanonicalSpecialties.IsValid(specialty))
        {
            return new RecommendationValidationResult
            {
                IsValid = false,
                Status = "INVALID_SPECIALTY",
                Reason = $"Proposed specialty '{specialty}' is not in the canonical clinical specialties list."
            };
        }

        // 2. Validate confidence score is non-zero
        if (confidence <= 0)
        {
            return new RecommendationValidationResult
            {
                IsValid = false,
                Status = "LOW_CONFIDENCE",
                Reason = "Triage confidence score must be greater than zero."
            };
        }

        // 3. Ensure at least one verified consultant with bookable slots exists
        if (matchedDoctors == null || matchedDoctors.Count == 0)
        {
            return new RecommendationValidationResult
            {
                IsValid = false,
                Status = "NO_DOCTORS",
                Reason = $"No active verified consultants with open slots found for specialty '{specialty}'."
            };
        }

        var normalizedSpecialty = CanonicalSpecialties.Normalize(specialty);

        // 4. Validate each doctor's specialty alignment and bookable slot integrity
        foreach (var doc in matchedDoctors)
        {
            if (!string.Equals(doc.Specialization, normalizedSpecialty, StringComparison.OrdinalIgnoreCase))
            {
                return new RecommendationValidationResult
                {
                    IsValid = false,
                    Status = "INVALID_DOCTOR_SPECIALTY",
                    Reason = $"Doctor '{doc.FullName}' has specialization '{doc.Specialization}', mismatching proposed '{normalizedSpecialty}'."
                };
            }

            if (doc.AvailableSlots <= 0 || !doc.NextSessionId.HasValue)
            {
                return new RecommendationValidationResult
                {
                    IsValid = false,
                    Status = "NO_BOOKABLE_SESSION",
                    Reason = $"Doctor '{doc.FullName}' has no bookable session slots."
                };
            }
        }

        return new RecommendationValidationResult
        {
            IsValid = true,
            Status = "VALID",
            Reason = "All deterministic validation checks passed: specialty aligned, verified consultants validated, and session slots confirmed."
        };
    }
}
