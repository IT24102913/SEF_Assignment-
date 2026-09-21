using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace HealthBridge.Api.Models;

public class Doctor
{
    public int Id { get; set; }

    [Required]
    [MaxLength(150)]
    public string FullName { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string Specialization { get; set; } = string.Empty;

    [MaxLength(200)]
    public string Qualifications { get; set; } = string.Empty;

    [MaxLength(150)]
    public string Hospital { get; set; } = "Health Bridge Hospital - Colombo";

    [MaxLength(150)]
    public string HospitalBranch { get; set; } = "Health Bridge Hospital - Colombo";

    [MaxLength(50)]
    public string RoomNumber { get; set; } = "Consultation Suite";

    [Column(TypeName = "decimal(18,2)")]
    public decimal ConsultationFee { get; set; }

    [MaxLength(100)]
    public string AvailableDays { get; set; } = "Mon, Wed, Fri";

    [MaxLength(100)]
    public string AvailableTime { get; set; } = "08:00 AM - 04:00 PM";

    public string? ImageUrl { get; set; }

    [MaxLength(30)]
    public string PhoneNumber { get; set; } = "+94 76 447 7999";

    public double Rating { get; set; } = 4.8;

    public int ReviewCount { get; set; } = 120;

    public int ExperienceYears { get; set; } = 12;

    public bool IsVerifiedConsultant { get; set; } = true;

    [MaxLength(500)]
    public string Bio { get; set; } = string.Empty;

    public int? UserId { get; set; }

    [MaxLength(150)]
    public string? Email { get; set; }

    public bool IsAvailable { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [JsonIgnore]
    public ICollection<DoctorSession> Sessions { get; set; } = new List<DoctorSession>();

    [JsonIgnore]
    public ICollection<DoctorAppointment> Appointments { get; set; } = new List<DoctorAppointment>();
}
