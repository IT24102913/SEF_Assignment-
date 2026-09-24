namespace HealthBridge.Api.DTOs.EMR;

public class EMRNotificationDto
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Priority { get; set; } = "Normal";
    public string? Link { get; set; }
    public string Time { get; set; } = string.Empty;
    public bool Unread { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
