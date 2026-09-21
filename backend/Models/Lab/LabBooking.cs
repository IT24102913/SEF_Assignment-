using System.ComponentModel.DataAnnotations;

namespace HealthBridge.Api.Models;

public enum BookingStatus
{
    PendingPrescriptionUpload,
    PendingAIVerification,
    PendingLabApproval,
    Confirmed,
    Rejected,
    SampleCollected,
    TestingInProgress,
    ResultVerification,
    ResultsReady,
    ReportDelivered,
    Completed,
    Cancelled
}

public enum AIVerificationResult
{
    NotRequired,
    PreApproved,
    Flagged,
    Pending
}

public class LabBooking
{
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    public int PatientId { get; set; }

    [Required]
    public string PatientName { get; set; } = string.Empty;

    [Required]
    public string PatientEmail { get; set; } = string.Empty;

    [Required]
    public Guid LabTestId { get; set; }
    public LabTest LabTest { get; set; } = null!;

    [Required]
    public DateOnly BookingDate { get; set; }

    [Required]
    public TimeOnly TimeSlot { get; set; }

    public BookingStatus Status { get; set; } = BookingStatus.PendingLabApproval;

    // Prescription
    public string? PrescriptionImageUrl { get; set; }

    // AI Verification
    public AIVerificationResult AIVerification { get; set; } = AIVerificationResult.NotRequired;
    public string? AIVerificationNotes { get; set; }
    public double? AIConfidenceScore { get; set; }
    public string? AIExtractedDoctorName { get; set; }
    public DateOnly? AIPrescriptionDate { get; set; }

    // Technician
    public Guid? TechnicianId { get; set; }
    public string? TechnicianNotes { get; set; }

    // Results
    public string? ResultFileUrl { get; set; }
    public DateTime? ResultsUploadedAt { get; set; }

    // Smart Queue & Agentic AI Workflow State
    public string? QueueToken { get; set; }
    public string? PriorityTier { get; set; }
    public int EstimatedServiceDurationMinutes { get; set; } = 10;
    public int EstimatedWaitMinutes { get; set; } = 0;
    public int AssignedChairNo { get; set; } = 1;
    public string? AgentWorkflowStateJson { get; set; }

    // Centralized Payment Fields
    public PaymentStatus PaymentStatus { get; set; } = PaymentStatus.Unpaid;
    public string? PaymentMethod { get; set; }
    public string? ReceiptNumber { get; set; }
    public decimal AmountPaid { get; set; } = 0;
    public DateTime? PaidAt { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
