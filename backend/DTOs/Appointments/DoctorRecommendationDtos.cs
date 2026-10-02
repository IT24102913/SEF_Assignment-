using System.ComponentModel.DataAnnotations;

namespace HealthBridge.Api.DTOs.Appointments;

/// <summary>Request DTO for the AI doctor-recommendation endpoint.</summary>
public class DoctorRecommendationRequestDto
{
    [Required(ErrorMessage = "Symptoms are required.")]
    [MinLength(3, ErrorMessage = "Please describe your symptoms in 2 or more words (e.g., 'frequent headache' or 'persistent cough').")]
    [MaxLength(500, ErrorMessage = "Symptom description must not exceed 500 characters.")]
    public string Symptoms { get; set; } = string.Empty;
}

/// <summary>Response DTO returned by POST /api/appointments/recommend-doctor.</summary>
public class DoctorRecommendationResponseDto
{
    /// <summary>Unique workflow ID for audit tracing.</summary>
    public Guid WorkflowId { get; set; }

    /// <summary>
    /// One of: RECOMMENDATION_READY | NEED_MORE_CONTEXT | SAFETY_ESCALATION | INPUT_INVALID | SAFE_FAILURE
    /// </summary>
    public string Status { get; set; } = string.Empty;

    /// <summary>Recommended specialty (only present when Status == RECOMMENDATION_READY).</summary>
    public string? Specialty { get; set; }

    /// <summary>Confidence score 0–1 (only present when Status == RECOMMENDATION_READY).</summary>
    public double? Confidence { get; set; }

    /// <summary>One or two plain-language sentences explaining the suggestion (never a diagnosis).</summary>
    public string? Reason { get; set; }

    /// <summary>Targeted follow-up questions (only when Status == NEED_MORE_CONTEXT).</summary>
    public List<string> FollowUpQuestions { get; set; } = new();

    /// <summary>Safety message to show prominently (only when Status == SAFETY_ESCALATION).</summary>
    public string? SafetyMessage { get; set; }
}

/// <summary>Internal Gemini response shape.</summary>
public class GeminiTriageResult
{
    public string? Status { get; set; }
    public string? Specialty { get; set; }
    public double Confidence { get; set; }
    public string? Reason { get; set; }
    public List<string>? FollowUpQuestions { get; set; }
}
