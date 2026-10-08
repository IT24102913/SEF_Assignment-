using System.ComponentModel.DataAnnotations;

namespace HealthBridge.Api.Models;

public class RecommendationWorkflow
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    public int? PatientId { get; set; }

    [Required]
    public string InputText { get; set; } = string.Empty;

    public string Objective { get; set; } = string.Empty;

    public string PlanJson { get; set; } = "[]";

    public string StepResultsJson { get; set; } = "[]";

    public string StatusPath { get; set; } = string.Empty;

    [Required]
    public string FinalStatus { get; set; } = string.Empty;

    public string? Specialty { get; set; }

    public double Confidence { get; set; }

    public int Retries { get; set; }

    public string? Errors { get; set; }

    public long DurationMs { get; set; }

    public string ApprovalStatus { get; set; } = "NOT_REQUIRED";

    public DateTime? ApprovedAt { get; set; }

    public string? MatchedDoctorsJson { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
