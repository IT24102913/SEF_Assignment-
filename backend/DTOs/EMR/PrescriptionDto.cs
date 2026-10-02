namespace HealthBridge.Api.DTOs.EMR;

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

    // Authorization request fields
    public bool HasAuthorizationRequest { get; set; }
    public string AuthorizationStatus { get; set; } = string.Empty;
    public string AuthorizationRequestedBy { get; set; } = string.Empty;
    public string AuthorizationRequestReason { get; set; } = string.Empty;
    public string AuthorizationAction { get; set; } = string.Empty;
    public string AdminNote { get; set; } = string.Empty;
    public DateTime? AuthorizationRequestedAt { get; set; }
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

public class BatchCreatePrescriptionsDto
{
    public string PatientCode { get; set; } = string.Empty;
    public string PrescribedDoctor { get; set; } = string.Empty;
    public List<CreatePrescriptionItemDto> Items { get; set; } = new();
}

public class CreatePrescriptionItemDto
{
    public string MedicationName { get; set; } = string.Empty;
    public string Dosage { get; set; } = string.Empty;
    public string Duration { get; set; } = "7 Days";
    public decimal UnitPrice { get; set; } = 0.0m;
    public string Status { get; set; } = "Active";
}

/// <summary>Payload when a staff member requests edit/delete permission from Admin</summary>
public class RequestPrescriptionAuthorizationDto
{
    public string RequestedBy { get; set; } = string.Empty;   // e.g. "PHARM-01"
    public string Role { get; set; } = string.Empty;           // Pharmacist, Doctor, etc.
    public string Action { get; set; } = string.Empty;         // "Edit" or "Delete"
    public string Reason { get; set; } = string.Empty;
}

/// <summary>Payload when Admin approves and deletes a prescription</summary>
public class ApprovePrescriptionDeleteDto
{
    public string Action { get; set; } = "ApproveDelete";
    public string AdminNote { get; set; } = string.Empty;
}

/// <summary>Payload when Admin rejects a permission request</summary>
public class RejectPrescriptionAuthorizationDto
{
    public string Action { get; set; } = "Reject";
    public string AdminNote { get; set; } = string.Empty;
}

/// <summary>Summarized pending authorization for Admin notification panel</summary>
public class PrescriptionAuthorizationSummaryDto
{
    public Guid Id { get; set; }
    public string PatientCode { get; set; } = string.Empty;
    public string MedicationName { get; set; } = string.Empty;
    public string AuthorizationRequestedBy { get; set; } = string.Empty;
    public string AuthorizationAction { get; set; } = string.Empty;
    public string AuthorizationRequestReason { get; set; } = string.Empty;
    public DateTime? AuthorizationRequestedAt { get; set; }
    public string AuthorizationStatus { get; set; } = string.Empty;
}
