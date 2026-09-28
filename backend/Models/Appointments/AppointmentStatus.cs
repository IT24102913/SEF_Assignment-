namespace HealthBridge.Api.Models.Appointments;

public enum AppointmentStatus
{
    PendingPayment,
    Reserved,
    Confirmed,
    InProgress,
    Completed,
    Cancelled,
    NoShow
}
