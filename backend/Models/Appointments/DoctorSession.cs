using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;
using HealthBridge.Api.Models.Appointments;

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

    public SessionType SessionType { get; set; } = SessionType.Morning;

    public int MaxCapacity { get; set; } = 25;

    public int CurrentBookings { get; set; } = 0;

    public bool IsActive { get; set; } = true;

    public SessionStatus SessionStatus { get; set; } = SessionStatus.Scheduled;

    public DateTime? ActualStartTime { get; set; }

    public DateTime? ExpectedStartTime { get; set; }

    public int? CurrentlyServingQueueNumber { get; set; }

    public string? DelayReason { get; set; }

    [NotMapped]
    public bool IsAvailable => IsActive && CurrentBookings < MaxCapacity;
}
