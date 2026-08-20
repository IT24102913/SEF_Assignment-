using System.ComponentModel.DataAnnotations;

namespace HealthBridge.Api.DTOs.Lab;

public class RejectBookingRequest
{
    [Required] public string Reason { get; set; } = string.Empty;
}
