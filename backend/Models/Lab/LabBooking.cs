using System.ComponentModel.DataAnnotations;

namespace LabManagement.API.Models;

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
    public Guid PatientId { get; set; }

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

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
