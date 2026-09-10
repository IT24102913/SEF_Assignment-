namespace LabManagement.API.DTOs.EMR;

public class ConsultationNoteDto
{
    public Guid Id { get; set; }
    public Guid PatientId { get; set; }
    public string PatientCode { get; set; } = string.Empty;
    public string DoctorId { get; set; } = string.Empty;
    public string DoctorName { get; set; } = string.Empty;
    public string DoctorDesignation { get; set; } = string.Empty;
    public DateTime ConsultationDate { get; set; }
    public string Diagnosis { get; set; } = string.Empty;
    public string RecommendedTests { get; set; } = string.Empty;
    public string PrescribedMedicines { get; set; } = string.Empty;
    public string ClinicalNotes { get; set; } = string.Empty;
    public string Status { get; set; } = "Completed";
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class CreateConsultationNoteDto
{
    public string PatientCode { get; set; } = string.Empty;
    public string DoctorId { get; set; } = string.Empty;
    public string DoctorName { get; set; } = string.Empty;
    public string DoctorDesignation { get; set; } = string.Empty;
    public DateTime? ConsultationDate { get; set; }
    public string Diagnosis { get; set; } = string.Empty;
    public string RecommendedTests { get; set; } = string.Empty;
    public string PrescribedMedicines { get; set; } = string.Empty;
    public string ClinicalNotes { get; set; } = string.Empty;
}
