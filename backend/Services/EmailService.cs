using MailKit.Net.Smtp;
using MimeKit;

namespace HealthBridge.Api.Services;

public interface IEmailService
{
    Task SendBookingReceivedAsync(string toEmail, string patientName, string testName, DateOnly date, TimeOnly time, bool requiresPrescription);
    Task SendBookingConfirmationAsync(string toEmail, string patientName, string testName, DateOnly date, TimeOnly time);
    Task SendBookingRejectionAsync(string toEmail, string patientName, string testName, string reason);
    Task SendResultsReadyAsync(string toEmail, string patientName, string testName);
    Task SendStatusUpdateAsync(string toEmail, string patientName, string testName, string newStatus);
}

public class EmailService : IEmailService
{
    private readonly IConfiguration _config;
    private readonly ILogger<EmailService> _logger;

    public EmailService(IConfiguration config, ILogger<EmailService> logger)
    {
        _config = config;
        _logger = logger;
    }

    private async Task SendEmailAsync(string toEmail, string toName, string subject, string htmlContent)
    {
        var smtpServer = _config["Brevo:SmtpServer"] ?? "smtp-relay.brevo.com";
        var smtpPort = int.Parse(_config["Brevo:SmtpPort"] ?? "587");
        var smtpUser = _config["Brevo:SmtpUser"];
        var smtpPass = _config["Brevo:SmtpPass"];
        var fromEmail = _config["Brevo:FromEmail"] ?? "noreply@labsystem.com";
        var fromName = _config["Brevo:FromName"] ?? "HealthCare Lab System";

        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(fromName, fromEmail));
        message.To.Add(new MailboxAddress(toName, toEmail));
        message.Subject = subject;

        var bodyBuilder = new BodyBuilder { HtmlBody = htmlContent };
        message.Body = bodyBuilder.ToMessageBody();

        try
        {
            _logger.LogInformation("[Email] Attempting to send email FROM={From} TO={To} SUBJECT={Subject}", fromEmail, toEmail, subject);
            
            using var client = new SmtpClient();
            await client.ConnectAsync(smtpServer, smtpPort, MailKit.Security.SecureSocketOptions.StartTls);
            await client.AuthenticateAsync(smtpUser, smtpPass);
            await client.SendAsync(message);
            await client.DisconnectAsync(true);
            
            _logger.LogInformation("[Email] ✅ Email sent successfully to {Email} via Brevo SMTP", toEmail);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[Email] ❌ FAILED to send email to {Email}. Error: {Message}", toEmail, ex.Message);
        }
    }

    public async Task SendBookingReceivedAsync(string toEmail, string patientName, string testName, DateOnly date, TimeOnly time, bool requiresPrescription)
    {
        var subject = "📋 Your Lab Test Booking Has Been Received";
        var statusNote = requiresPrescription
            ? "Your test requires a prescription. Please upload it in the app. Once uploaded, our AI system will verify it and the lab team will review your booking."
            : "Your booking is now in the queue for lab approval. You will receive a confirmation email once it is approved.";
        var html = $@"
        <div style='font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border-radius: 10px; background: #f9f9f9;'>
            <h2 style='color: #2E86AB;'>Booking Received!</h2>
            <p>Dear <strong>{patientName}</strong>,</p>
            <p>We have received your lab test booking request. Here are the details:</p>
            <table style='background: white; width: 100%; padding: 15px; border-radius: 8px; border: 1px solid #ddd;'>
                <tr><td><strong>Test:</strong></td><td>{testName}</td></tr>
                <tr><td><strong>Date:</strong></td><td>{date:dddd, MMMM d, yyyy}</td></tr>
                <tr><td><strong>Time:</strong></td><td>{time:hh:mm tt}</td></tr>
                <tr><td><strong>Status:</strong></td><td>⏳ Pending Approval</td></tr>
            </table>
            <div style='margin-top: 16px; padding: 12px; background: #FFF3E0; border-radius: 8px; border-left: 4px solid #FF9800;'>
                <p style='margin: 0; color: #E65100; font-size: 14px;'>{statusNote}</p>
            </div>
            <p style='margin-top: 20px;'>Thank you for choosing HealthCare Lab System!</p>
            <p style='color: #888; font-size: 12px;'>HealthCare Lab System | This is an automated email.</p>
        </div>";
        await SendEmailAsync(toEmail, patientName, subject, html);
    }

    public async Task SendBookingConfirmationAsync(string toEmail, string patientName, string testName, DateOnly date, TimeOnly time)
    {
        var subject = "✅ Your Lab Test Appointment is Confirmed";
        var html = $@"
        <div style='font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border-radius: 10px; background: #f9f9f9;'>
            <h2 style='color: #2E86AB;'>Appointment Confirmed!</h2>
            <p>Dear <strong>{patientName}</strong>,</p>
            <p>Your lab test appointment has been successfully booked. Here are your details:</p>
            <table style='background: white; width: 100%; padding: 15px; border-radius: 8px; border: 1px solid #ddd;'>
                <tr><td><strong>Test:</strong></td><td>{testName}</td></tr>
                <tr><td><strong>Date:</strong></td><td>{date:dddd, MMMM d, yyyy}</td></tr>
                <tr><td><strong>Time:</strong></td><td>{time:hh:mm tt}</td></tr>
            </table>
            <p style='margin-top: 20px;'>Please arrive 10 minutes early. Bring your National ID and any relevant documents.</p>
            <p style='color: #888; font-size: 12px;'>HealthCare Lab System | This is an automated email.</p>
        </div>";
        await SendEmailAsync(toEmail, patientName, subject, html);
    }

    public async Task SendBookingRejectionAsync(string toEmail, string patientName, string testName, string reason)
    {
        var subject = "Update on Your Lab Test Request";
        var html = $@"
        <div style='font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border-radius: 10px; background: #f9f9f9;'>
            <h2 style='color: #E74C3C;'>Booking Update</h2>
            <p>Dear <strong>{patientName}</strong>,</p>
            <p>Unfortunately, your booking request for <strong>{testName}</strong> could not be approved at this time.</p>
            <p><strong>Reason:</strong> {reason}</p>
            <p>Please contact our lab reception or speak to your doctor for further guidance.</p>
            <p style='color: #888; font-size: 12px;'>HealthCare Lab System | This is an automated email.</p>
        </div>";
        await SendEmailAsync(toEmail, patientName, subject, html);
    }

    public async Task SendResultsReadyAsync(string toEmail, string patientName, string testName)
    {
        var subject = "🧪 Your Lab Test Results are Now Available";
        var html = $@"
        <div style='font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border-radius: 10px; background: #f9f9f9;'>
            <h2 style='color: #27AE60;'>Results Ready!</h2>
            <p>Dear <strong>{patientName}</strong>,</p>
            <p>Your results for <strong>{testName}</strong> are now available.</p>
            <p>Please log in to the HealthCare app to view and download your full report.</p>
            <p style='color: #888; font-size: 12px;'>HealthCare Lab System | This is an automated email.</p>
        </div>";
        await SendEmailAsync(toEmail, patientName, subject, html);
    }

    public async Task SendStatusUpdateAsync(string toEmail, string patientName, string testName, string newStatus)
    {
        var subject = $"🔄 Update on your {testName} booking";
        var html = $@"
        <div style='font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border-radius: 10px; background: #f9f9f9;'>
            <h2 style='color: #2E86AB;'>Status Update</h2>
            <p>Dear <strong>{patientName}</strong>,</p>
            <p>Your lab test booking for <strong>{testName}</strong> has a new status update.</p>
            <p>Current Status: <strong>{newStatus}</strong></p>
            <p>Track your full order timeline in the HealthCare mobile app.</p>
            <p style='color: #888; font-size: 12px;'>HealthCare Lab System | This is an automated email.</p>
        </div>";
        await SendEmailAsync(toEmail, patientName, subject, html);
    }
}
