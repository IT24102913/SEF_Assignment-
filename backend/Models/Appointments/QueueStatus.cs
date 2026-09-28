namespace HealthBridge.Api.Models.Appointments;

public enum QueueStatus
{
    NotCheckedIn,
    Waiting,
    Called,
    InConsultation,
    Completed,
    Skipped,
    NoShow
}
