namespace HealthBridge.Api.DTOs.Lab;

public class LabTimeSlotResponse
{
    public Guid Id { get; set; }
    public DateOnly Date { get; set; }
    public TimeOnly Time { get; set; }
    public int MaxCapacity { get; set; }
    public int CurrentBookings { get; set; }
    public bool IsAvailable { get; set; }
}
