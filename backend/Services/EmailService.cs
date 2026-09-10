using Microsoft.Extensions.Logging;

namespace LabManagement.API.Services;

public class EmailService : IEmailService
{
    private readonly ILogger<EmailService> _logger;

    public EmailService(ILogger<EmailService> logger)
    {
        _logger = logger;
    }

    public Task SendResultsReadyAsync(string patientEmail, string patientName, string testName)
    {
        _logger.LogInformation("[EmailService] Sending results ready email to {Email} for patient {Name} - Test: {Test}",
            patientEmail, patientName, testName);
        return Task.CompletedTask;
    }

    public Task SendBookingReceivedAsync(string patientEmail, string patientName, string testName, DateOnly bookingDate, TimeOnly timeSlot, bool isRestricted)
    {
        _logger.LogInformation("[EmailService] Sending booking confirmation to {Email} for {Name} - Test: {Test}, Date: {Date}, Slot: {Slot}, Restricted: {Restricted}",
            patientEmail, patientName, testName, bookingDate.ToString(), timeSlot.ToString(), isRestricted);
        return Task.CompletedTask;
    }

    public Task SendGenericEmailAsync(string toEmail, string subject, string body)
    {
        _logger.LogInformation("[EmailService] Sending email to {Email} | Subject: {Subject}", toEmail, subject);
        return Task.CompletedTask;
    }
}
