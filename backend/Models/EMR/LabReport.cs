namespace LabManagement.API.Models.EMR;

public class LabReport
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid PatientId { get; set; }
    public string PatientCode { get; set; } = string.Empty;
    public string TestTitle { get; set; } = string.Empty;
    public string Category { get; set; } = "General";
    public string OrderedDoctor { get; set; } = string.Empty;
    public DateTime ReportDate { get; set; } = DateTime.UtcNow;
    public string Status { get; set; } = "Pending"; // Pending, In Progress, Completed
    public string? FileName { get; set; }
    public string? FileUrl { get; set; }
    public string ResultsSummary { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public Patient? Patient { get; set; }
}
