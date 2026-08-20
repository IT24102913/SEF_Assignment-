using System.ComponentModel.DataAnnotations;

namespace HealthBridge.Api.DTOs.Lab;

public class CreateBookingRequest
{
    [Required] public Guid LabTestId { get; set; }
    [Required] public int PatientId { get; set; }
    [Required] public string PatientName { get; set; } = string.Empty;
    [Required, EmailAddress] public string PatientEmail { get; set; } = string.Empty;
    [Required] public DateOnly BookingDate { get; set; }
    [Required] public TimeOnly TimeSlot { get; set; }
}
