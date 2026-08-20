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
    public string? TechnicianNotes { get; set; }
    public string? ResultFileUrl { get; set; }
    public DateTime? ResultsUploadedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
