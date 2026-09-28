namespace HealthBridge.Api.Models.EMR;

public class Prescription
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid PatientId { get; set; }
    public string PatientCode { get; set; } = string.Empty;
    public string MedicationName { get; set; } = string.Empty;
    public string Dosage { get; set; } = string.Empty;
    public string Duration { get; set; } = string.Empty;
    public DateTime StartDate { get; set; } = DateTime.UtcNow;
    public DateTime EndDate { get; set; } = DateTime.UtcNow.AddDays(7);
    public decimal UnitPrice { get; set; } = 0.0m;
    public string PrescribedDoctor { get; set; } = string.Empty;
    public string Status { get; set; } = "Active"; // Active, Completed, Cancelled
    public bool HasAuthorizationRequest { get; set; } = false;
    public string? AuthorizationType { get; set; } // "Delete", "Edit"
    public string? AuthorizationReason { get; set; }
    public string? AuthorizationRequestedBy { get; set; }
    public DateTime? AuthorizationRequestedAt { get; set; }
    public string? AuthorizationStatus { get; set; } // "Pending", "Approved", "Rejected"
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public Patient? Patient { get; set; }
}
