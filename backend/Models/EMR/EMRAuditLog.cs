namespace LabManagement.API.Models.EMR;

public class EMRAuditLog
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid? PatientId { get; set; }
    public string ActorId { get; set; } = string.Empty;
    public string ActorRole { get; set; } = string.Empty;
    public string ActionType { get; set; } = string.Empty; // Create, Update, Delete, StatusChange
    public string EntityType { get; set; } = string.Empty; // Patient, ConsultationNote, LabReport, Prescription
    public string EntityId { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}
