using MailKit.Net.Smtp;
using MimeKit;

namespace HealthBridge.Api.Services;

public interface IEmailService
{
    Task SendBookingReceivedAsync(string toEmail, string patientName, string testName, DateOnly date, TimeOnly time, bool requiresPrescription);
    Task SendBookingConfirmationAsync(string toEmail, string patientName, string testName, DateOnly date, TimeOnly time);
    Task SendBookingRejectionAsync(string toEmail, string patientName, string testName, string reason);
    Task SendPrescriptionApprovedAsync(string toEmail, string patientName, string testName, DateOnly date, TimeOnly time, decimal price);
    Task SendPrescriptionRejectedAsync(string toEmail, string patientName, string testName, string reason);
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

    public async Task SendPrescriptionApprovedAsync(string toEmail, string patientName, string testName, DateOnly date, TimeOnly time, decimal price)
    {
        var subject = "🎉 Prescription Approved: Proceed to Payment for Your Lab Appointment";
        var html = $@"
        <div style='font-family: -apple-system, BlinkMacSystemFont, Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; border-radius: 12px; background: #f8fafc; border: 1px solid #e2e8f0;'>
            <div style='background: #059669; color: white; padding: 18px 24px; border-radius: 10px; margin-bottom: 20px;'>
                <h2 style='margin: 0; font-size: 20px; font-weight: 800;'>Prescription Verified & Approved!</h2>
                <p style='margin: 6px 0 0 0; font-size: 13px; opacity: 0.9;'>Action Required: Choose your payment method in the Medix app</p>
            </div>
            <p style='font-size: 15px; color: #1e293b;'>Dear <strong>{patientName}</strong>,</p>
            <p style='font-size: 14px; line-height: 1.6; color: #475569;'>
                Great news! Your doctor's prescription for <strong>{testName}</strong> has been successfully reviewed and certified by our Gemini Vision AI and clinical laboratory staff.
            </p>
            <table style='background: white; width: 100%; padding: 16px; border-radius: 10px; border: 1px solid #cbd5e1; margin: 16px 0;'>
                <tr><td style='padding: 6px 0; color: #64748b;'><strong>Diagnostic Test:</strong></td><td style='color: #0f172a; font-weight: 700;'>{testName}</td></tr>
                <tr><td style='padding: 6px 0; color: #64748b;'><strong>Appointment Date:</strong></td><td style='color: #0f172a; font-weight: 700;'>{date:dddd, MMMM d, yyyy}</td></tr>
                <tr><td style='padding: 6px 0; color: #64748b;'><strong>Time Slot:</strong></td><td style='color: #0f172a; font-weight: 700;'>{time:hh:mm tt}</td></tr>
                <tr><td style='padding: 6px 0; color: #64748b;'><strong>Total Amount Due:</strong></td><td style='color: #059669; font-weight: 800; font-size: 16px;'>LKR {price:N2}</td></tr>
                <tr><td style='padding: 6px 0; color: #64748b;'><strong>Prescription Status:</strong></td><td><span style='background: #d1fae5; color: #065f46; padding: 3px 8px; border-radius: 6px; font-size: 12px; font-weight: 700;'>Verified & Certified</span></td></tr>
            </table>

            <div style='background: #eff6ff; border-left: 4px solid #2563eb; padding: 14px 16px; border-radius: 8px; margin: 20px 0;'>
                <p style='margin: 0; font-size: 13px; font-weight: 700; color: #1e40af;'>Next Step: Complete Payment in Mobile App</p>
                <p style='margin: 6px 0 0 0; font-size: 12.5px; color: #1e3a8a; line-height: 1.5;'>
                    Please open your <strong>Medix Mobile App</strong>, go to <strong>My Bookings</strong>, and tap on your approved booking. You can choose to <strong>Pay Online via Card</strong> for instant clearance, or select <strong>Pay at Counter</strong> to pay via Cash or POS Card when you arrive for sample collection.
                </p>
            </div>

            <p style='margin-top: 24px; font-size: 13px; color: #334155;'>Thank you for placing your trust in Medix Diagnostics!</p>
            <p style='color: #94a3b8; font-size: 11px; margin-top: 12px;'>Medix Clinical Healthcare System • Automated Medical Notification</p>
        </div>";
        await SendEmailAsync(toEmail, patientName, subject, html);
    }

    public async Task SendPrescriptionRejectedAsync(string toEmail, string patientName, string testName, string reason)
    {
        var subject = "❌ Prescription Verification Notice - Booking Cancelled";
        var html = $@"
        <div style='font-family: -apple-system, BlinkMacSystemFont, Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; border-radius: 12px; background: #f8fafc; border: 1px solid #e2e8f0;'>
            <div style='background: #dc2626; color: white; padding: 18px 24px; border-radius: 10px; margin-bottom: 20px;'>
                <h2 style='margin: 0; font-size: 20px; font-weight: 800;'>Prescription Verification Declined</h2>
                <p style='margin: 6px 0 0 0; font-size: 13px; opacity: 0.9;'>Booking Status: Cancelled</p>
            </div>
            <p style='font-size: 15px; color: #1e293b;'>Dear <strong>{patientName}</strong>,</p>
            <p style='font-size: 14px; line-height: 1.6; color: #475569;'>
                Our clinical laboratory team has reviewed the prescription document submitted for your <strong>{testName}</strong> booking request. Unfortunately, the prescription could not be approved.
            </p>
            <div style='background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 14px; margin: 16px 0;'>
                <strong style='color: #991b1b; font-size: 13px;'>Clinical Reason for Decline:</strong>
                <p style='margin: 6px 0 0 0; color: #7f1d1d; font-size: 13px;'>{reason}</p>
            </div>
            <div style='background: #f1f5f9; padding: 12px; border-radius: 8px; margin: 16px 0;'>
                <p style='margin: 0; color: #475569; font-size: 12.5px; line-height: 1.5;'>
                    <strong>Notice:</strong> This booking has been cancelled in our system. No payment was charged, and no further action is required. If you have a valid and clear prescription from your doctor, you are welcome to submit a new booking request in the Medix app.
                </p>
            </div>
            <p style='color: #94a3b8; font-size: 11px; margin-top: 16px;'>Medix Clinical Healthcare System • Automated Medical Notification</p>
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
