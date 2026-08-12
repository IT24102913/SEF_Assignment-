namespace LabManagement.API.Models;

public class LabTimeSlot
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public DateOnly Date { get; set; }
    public TimeOnly Time { get; set; }
    public int MaxCapacity { get; set; } = 5;
    public int CurrentBookings { get; set; } = 0;
    public bool IsAvailable => CurrentBookings < MaxCapacity;
}
