namespace LabManagement.API.Models.EMR;

public class ConsultationNote
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid PatientId { get; set; }
    public string PatientCode { get; set; } = string.Empty;
    public string DoctorId { get; set; } = string.Empty; // e.g. DOC-101
    public string DoctorName { get; set; } = string.Empty;
    public string DoctorDesignation { get; set; } = string.Empty;
    public DateTime ConsultationDate { get; set; } = DateTime.UtcNow;
    public string Diagnosis { get; set; } = string.Empty;
    public string RecommendedTests { get; set; } = string.Empty; // Comma-separated or JSON
    public string PrescribedMedicines { get; set; } = string.Empty; // JSON structure
    public string ClinicalNotes { get; set; } = string.Empty;
    public string Status { get; set; } = "Completed";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public Patient? Patient { get; set; }
}
