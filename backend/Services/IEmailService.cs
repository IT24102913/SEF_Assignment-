namespace LabManagement.API.Services;

public interface IEmailService
{
    Task SendResultsReadyAsync(string patientEmail, string patientName, string testName);
    Task SendBookingReceivedAsync(string patientEmail, string patientName, string testName, DateOnly bookingDate, TimeOnly timeSlot, bool isRestricted);
    Task SendGenericEmailAsync(string toEmail, string subject, string body);
}
