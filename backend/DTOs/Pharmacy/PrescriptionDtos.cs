using System.ComponentModel.DataAnnotations;

namespace HealthBridge.Api.DTOs.Pharmacy;

public class CreatePrescriptionRequest
{
    public int? PatientId { get; set; }

    [Required]
    public string PatientName { get; set; } = string.Empty;

    [Required]
    [EmailAddress]
    public string PatientEmail { get; set; } = string.Empty;

    public string? DoctorName { get; set; }
    public string? Notes { get; set; }
    public string? ImageUrl { get; set; }
}

public class PrescriptionResponse
{
    public int Id { get; set; }
    public string PrescriptionCode { get; set; } = string.Empty;
    public int? PatientId { get; set; }
    public string PatientName { get; set; } = string.Empty;
    public string PatientEmail { get; set; } = string.Empty;
    public string? DoctorName { get; set; }
    public string? Notes { get; set; }
    public string? ImageUrl { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime SubmittedAt { get; set; }
    public DateTime? ProcessedAt { get; set; }
}

public class UpdatePrescriptionStatusRequest
{
    [Required]
    public string Status { get; set; } = string.Empty;
}
