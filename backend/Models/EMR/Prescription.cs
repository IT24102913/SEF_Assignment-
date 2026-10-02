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
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // ── Authorization Request Fields (Edit/Delete permission workflow) ─────────
    /// <summary>Whether a staff member has submitted an edit/delete permission request</summary>
    public bool HasAuthorizationRequest { get; set; } = false;
    /// <summary>Pending | Approved | Rejected</summary>
    public string AuthorizationStatus { get; set; } = string.Empty;
    public string AuthorizationRequestedBy { get; set; } = string.Empty;
    public string AuthorizationRequestReason { get; set; } = string.Empty;
    public string AuthorizationAction { get; set; } = string.Empty; // Edit | Delete
    public string AdminNote { get; set; } = string.Empty;
    public DateTime? AuthorizationRequestedAt { get; set; }

    public Patient? Patient { get; set; }
}
