namespace LabManagement.API.DTOs.EMR;

public class LabReportDto
{
    public Guid Id { get; set; }
    public Guid PatientId { get; set; }
    public string PatientCode { get; set; } = string.Empty;
    public string TestTitle { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string OrderedDoctor { get; set; } = string.Empty;
    public DateTime ReportDate { get; set; }
    public string Status { get; set; } = "Pending";
    public string? FileName { get; set; }
    public string? FileUrl { get; set; }
    public string ResultsSummary { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class CreateLabReportDto
{
    public string PatientCode { get; set; } = string.Empty;
    public string TestTitle { get; set; } = string.Empty;
    public string Category { get; set; } = "General";
    public string OrderedDoctor { get; set; } = string.Empty;
    public DateTime? ReportDate { get; set; }
    public string Status { get; set; } = "Pending";
    public string? FileName { get; set; }
    public string? FileUrl { get; set; }
    public string ResultsSummary { get; set; } = string.Empty;
}

public class UpdateLabReportStatusDto
{
    public string Status { get; set; } = "Completed";
    public string? ResultsSummary { get; set; }
}
