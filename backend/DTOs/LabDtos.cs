using LabManagement.API.Models;
using System.ComponentModel.DataAnnotations;

namespace LabManagement.API.DTOs;

// ─── Lab Test DTOs ───────────────────────────────────────────────────────────

public class LabTestDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public bool IsRestricted { get; set; }
    public int TurnaroundDays { get; set; }
    public string Category { get; set; } = string.Empty;
    public bool IsActive { get; set; }
}

public class CreateLabTestDto
{
    [Required, MaxLength(200)] public string Name { get; set; } = string.Empty;
    [Required] public string Description { get; set; } = string.Empty;
    [Required, Range(0.01, 1000000)] public decimal Price { get; set; }
    public bool IsRestricted { get; set; } = false;
    [Range(1, 30)] public int TurnaroundDays { get; set; } = 1;
    [Required, MaxLength(100)] public string Category { get; set; } = string.Empty;
}

public class UpdateLabTestDto
{
    public string? Name { get; set; }
    public string? Description { get; set; }
    public decimal? Price { get; set; }
    public bool? IsRestricted { get; set; }
    public int? TurnaroundDays { get; set; }
    public string? Category { get; set; }
    public bool? IsActive { get; set; }
}

// ─── Lab Booking DTOs ────────────────────────────────────────────────────────

public class CreateBookingDto
{
    [Required] public Guid LabTestId { get; set; }
    [Required] public Guid PatientId { get; set; }
    [Required] public string PatientName { get; set; } = string.Empty;
    [Required, EmailAddress] public string PatientEmail { get; set; } = string.Empty;
    [Required] public DateOnly BookingDate { get; set; }
    [Required] public TimeOnly TimeSlot { get; set; }
}

public class LabBookingDto
{
    public Guid Id { get; set; }
    public Guid PatientId { get; set; }
    public string PatientName { get; set; } = string.Empty;
    public string PatientEmail { get; set; } = string.Empty;
    public LabTestDto? LabTest { get; set; }
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

public class ApproveBookingDto
{
    public string? Notes { get; set; }
}

public class RejectBookingDto
{
    [Required] public string Reason { get; set; } = string.Empty;
}

// ─── Time Slot DTOs ──────────────────────────────────────────────────────────

public class LabTimeSlotDto
{
    public Guid Id { get; set; }
    public DateOnly Date { get; set; }
    public TimeOnly Time { get; set; }
    public int MaxCapacity { get; set; }
    public int CurrentBookings { get; set; }
    public bool IsAvailable { get; set; }
}

// ─── AI Verification DTOs ────────────────────────────────────────────────────

public class AIVerificationResponseDto
{
    public string Status { get; set; } = string.Empty; // PRE_APPROVED / FLAGGED
    public double Confidence { get; set; }
    public List<string> ExtractedTests { get; set; } = new();
    public string RequestedTest { get; set; } = string.Empty;
    public bool MatchFound { get; set; }
    public string? DoctorName { get; set; }
    public string? PrescriptionDate { get; set; }
    public string Notes { get; set; } = string.Empty;
    public string AuditLog { get; set; } = string.Empty;
}
