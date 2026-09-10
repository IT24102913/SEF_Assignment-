namespace LabManagement.API.DTOs.EMR;

public class ClinicalSummaryDto
{
    public Guid PatientId { get; set; }
    public string PatientCode { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public int Age { get; set; }
    public string Gender { get; set; } = string.Empty;
    public string BloodGroup { get; set; } = string.Empty;
    public string EmergencyContact { get; set; } = string.Empty;
    public List<string> KnownAllergies { get; set; } = new();
    public List<string> ChronicConditions { get; set; } = new();
    public int TotalConsultationsCount { get; set; }
    public int ActivePrescriptionsCount { get; set; }
    public int CompletedLabReportsCount { get; set; }
    public int PendingLabReportsCount { get; set; }
    public List<PrescriptionDto> ActiveMedications { get; set; } = new();
    public List<ConsultationNoteDto> RecentConsultations { get; set; } = new();
    public List<LabReportDto> RecentLabReports { get; set; } = new();
    public List<string> ClinicalAlerts { get; set; } = new();
    public string OverallAssessment { get; set; } = string.Empty;
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
}
