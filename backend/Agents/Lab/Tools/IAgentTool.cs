namespace HealthBridge.Api.Agents.Lab.Tools;

public class ToolInput
{
    public Guid BookingId { get; set; }
    public string PatientName { get; set; } = string.Empty;
    public int PatientAge { get; set; } = 35;
    public string TestName { get; set; } = string.Empty;
    public string TestCategory { get; set; } = string.Empty;
    public bool TestIsRestricted { get; set; }
    public string? PrescriptionImageUrl { get; set; }
    public DateOnly BookingDate { get; set; }
    public TimeOnly TimeSlot { get; set; }
    public int ExistingBookingsInSlot { get; set; }
    public int DailySequenceNo { get; set; }
    public List<string> RecentPatientTests { get; set; } = new();
}

public class ToolResult
{
    public bool Success { get; set; }
    public string ToolName { get; set; } = string.Empty;
    public string StatusMessage { get; set; } = string.Empty;
    public double Confidence { get; set; } = 1.0;
    public object? Data { get; set; }
}

public interface IAgentTool
{
    string Name { get; }
    string Description { get; }
    Task<ToolResult> ExecuteAsync(ToolInput input);
}
