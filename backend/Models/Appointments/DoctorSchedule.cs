using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace HealthBridge.Api.Models;

public class DoctorSchedule
{
    public int Id { get; set; }

    [Required]
    public int DoctorId { get; set; }

    [Required]
    public DayOfWeek DayOfWeek { get; set; }

    [Required]
    public TimeOnly StartTime { get; set; }

    [Required]
    public TimeOnly EndTime { get; set; }

    public int SlotDurationMinutes { get; set; } = 60;
    
    public int MaxPatientsPerSlot { get; set; } = 3;

    public bool IsActive { get; set; } = true;

    [JsonIgnore]
    public Doctor Doctor { get; set; } = null!;
}
