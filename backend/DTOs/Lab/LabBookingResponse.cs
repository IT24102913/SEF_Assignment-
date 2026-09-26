namespace HealthBridge.Api.DTOs.Lab;

public class LabBookingResponse
{
    public Guid Id { get; set; }
    public int PatientId { get; set; }
    public string PatientName { get; set; } = string.Empty;
    public string PatientEmail { get; set; } = string.Empty;
    public LabTestResponse? LabTest { get; set; }
    public DateOnly BookingDate { get; set; }
    public TimeOnly TimeSlot { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? PrescriptionImageUrl { get; set; }
    public string? AIVerification { get; set; }
    public string? AIVerificationNotes { get; set; }
    public double? AIConfidenceScore { get; set; }
    public string? AIExtractedDoctorName { get; set; }
    public DateOnly? AIPrescriptionDate { get; set; }
    public bool? AIPrescriptionExpired { get; set; }
    public bool? AIPrescriptionDateValid { get; set; }
    public string? AIPrescriptionDateReason { get; set; }
    public string? AIExtractedPatientName { get; set; }
    public bool? AIPatientNameMismatch { get; set; }
    public string? AIPatientNameMismatchReason { get; set; }
    public bool? AITestMismatch { get; set; }
    public List<string>? AIExtractedInvestigations { get; set; }
    public string? AITestMismatchReason { get; set; }
    public string? TechnicianNotes { get; set; }
    public string? ResultFileUrl { get; set; }
    public DateTime? ResultsUploadedAt { get; set; }
    public string? QueueToken { get; set; }
    public string? PriorityTier { get; set; }
    public int EstimatedServiceDurationMinutes { get; set; }
    public int EstimatedWaitMinutes { get; set; }
    public int AssignedChairNo { get; set; }
    public string? AgentWorkflowStateJson { get; set; }
    public string PaymentStatus { get; set; } = "Unpaid";
    public string? PaymentMethod { get; set; }
    public string? ReceiptNumber { get; set; }
    public decimal AmountPaid { get; set; }
    public DateTime? PaidAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
