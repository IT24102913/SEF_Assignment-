using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace HealthBridge.Api.Models;

public class DoctorSession
{
    public int Id { get; set; }

    [Required]
    public int DoctorId { get; set; }

    [JsonIgnore]
    public Doctor? Doctor { get; set; }

    [Required]
    public DateOnly SessionDate { get; set; }

    [Required]
    public TimeOnly SessionTime { get; set; }

    public int MaxCapacity { get; set; } = 1;

    public int CurrentBookings { get; set; } = 0;

    public bool IsActive { get; set; } = true;

    [NotMapped]
    public bool IsAvailable => IsActive && CurrentBookings < MaxCapacity;
}
