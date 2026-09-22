using System.ComponentModel.DataAnnotations;

namespace HealthBridge.Api.Models;

public class PatientFeedback
{
    public int Id { get; set; }

    [Required]
    [MaxLength(150)]
    public string PatientName { get; set; } = string.Empty;

    [MaxLength(150)]
    public string PatientEmail { get; set; } = string.Empty;

    public int Rating { get; set; } = 5; // 1 to 5 stars

    [Required]
    [MaxLength(200)]
    public string Subject { get; set; } = string.Empty;

    [Required]
    public string Comment { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
