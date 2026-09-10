namespace LabManagement.API.DTOs.EMR;

public class PrescriptionDto
{
    public Guid Id { get; set; }
    public Guid PatientId { get; set; }
    public string PatientCode { get; set; } = string.Empty;
    public string MedicationName { get; set; } = string.Empty;
    public string Dosage { get; set; } = string.Empty;
    public string Duration { get; set; } = string.Empty;
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public decimal UnitPrice { get; set; }
    public string PrescribedDoctor { get; set; } = string.Empty;
    public string Status { get; set; } = "Active";
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class CreatePrescriptionDto
{
    public string PatientCode { get; set; } = string.Empty;
    public string MedicationName { get; set; } = string.Empty;
    public string Dosage { get; set; } = string.Empty;
    public string Duration { get; set; } = "7 Days";
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public decimal UnitPrice { get; set; } = 0.0m;
    public string PrescribedDoctor { get; set; } = string.Empty;
    public string Status { get; set; } = "Active";
}

public class UpdatePrescriptionStatusDto
{
    public string Status { get; set; } = "Completed";
}
