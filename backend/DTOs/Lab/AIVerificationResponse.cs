using System.Collections.Generic;

namespace HealthBridge.Api.DTOs.Lab;

public class AIVerificationResponse
{
    public string Status { get; set; } = string.Empty; // PRE_APPROVED / FLAGGED
    public double Confidence { get; set; }
    public List<string> ExtractedTests { get; set; } = new();
    public string RequestedTest { get; set; } = string.Empty;
    public bool MatchFound { get; set; }
    public string? DoctorName { get; set; }
    public string? PrescriptionDate { get; set; }
    public string Notes { get; set; } = string.Empty;
    public string AuditLog { get; set; } = string.Empty;
}
