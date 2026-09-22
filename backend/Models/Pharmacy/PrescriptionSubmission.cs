using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HealthBridge.Api.Models;

public class PrescriptionSubmission
{
    public int Id { get; set; }

    [Required]
    [MaxLength(50)]
    public string PrescriptionCode { get; set; } = string.Empty;

    public int? PatientId { get; set; }

    [ForeignKey(nameof(PatientId))]
    public User? Patient { get; set; }

    [Required]
    [MaxLength(100)]
    public string PatientName { get; set; } = string.Empty;

    [Required]
    [MaxLength(150)]
    public string PatientEmail { get; set; } = string.Empty;

    [MaxLength(100)]
    public string? DoctorName { get; set; }

    [MaxLength(1000)]
    public string? Notes { get; set; }

    [Column(TypeName = "text")]
    public string? ImageUrl { get; set; }

    [Required]
    [MaxLength(50)]
    public string Status { get; set; } = "Pending"; // Pending, Approved, Processing, Rejected, Fulfilled

    public DateTime SubmittedAt { get; set; } = DateTime.UtcNow;

    public DateTime? ProcessedAt { get; set; }
}
