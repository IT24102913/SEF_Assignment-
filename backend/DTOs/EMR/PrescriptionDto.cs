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
    public bool HasAuthorizationRequest { get; set; } = false;
    public string? AuthorizationType { get; set; }
    public string? AuthorizationReason { get; set; }
    public string? AuthorizationRequestedBy { get; set; }
    public DateTime? AuthorizationRequestedAt { get; set; }
    public string? AuthorizationStatus { get; set; }
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

public class RequestPrescriptionAuthorizationDto
{
    public string RequestType { get; set; } = "Delete"; // "Delete" or "Edit"
    public string Reason { get; set; } = string.Empty;
    public string? RequestedBy { get; set; }
}

public class ResolvePrescriptionAuthorizationDto
{
    public string Action { get; set; } = "ApproveDelete"; // "ApproveDelete" or "Reject"
    public string? AdminNote { get; set; }
}

