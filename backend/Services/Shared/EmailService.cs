using MailKit.Net.Smtp;
using MimeKit;
namespace HealthBridge.Api.Services;

public interface IEmailService
{
    Task SendBookingReceivedAsync(string toEmail, string patientName, string testName, DateOnly date, TimeOnly time, bool requiresPrescription);
    Task SendBookingConfirmationAsync(string toEmail, string patientName, string testName, DateOnly date, TimeOnly time, int? assignedChairNo = null, string? queueToken = null);
    Task SendBookingRejectionAsync(string toEmail, string patientName, string testName, string reason);
    Task SendPrescriptionApprovedAsync(string toEmail, string patientName, string testName, DateOnly date, TimeOnly time, decimal price, int? assignedChairNo = null, string? queueToken = null);
    Task SendPrescriptionRejectedAsync(string toEmail, string patientName, string testName, string reason);
    Task SendResultsReadyAsync(string toEmail, string patientName, string testName);
    Task SendStatusUpdateAsync(string toEmail, string patientName, string testName, string newStatus);
    Task SendOrderCompletedAsync(string toEmail, string patientName, string testName, string? reportUrl = null);
    Task SendBookingCancelledAsync(string toEmail, string patientName, string testName, DateOnly date, TimeOnly time, string? queueToken = null);
    Task SendDoctorSessionStartedAsync(string toEmail, string patientName, string doctorName, string sessionName, string currentlyServingText);
    Task SendDoctorSessionDelayedAsync(string toEmail, string patientName, string doctorName, string sessionName, int delayMinutes, string expectedStartTimeStr, string updatedEstimatedTimeStr, string recommendedArrivalStr, string? reason);
    Task SendDoctorReadyAlertAsync(string toEmail, string patientName, string doctorName, string roomNumber, string currentlyServingText, int patientsAway, string yourToken);
}

public class EmailService : IEmailService
{
    private readonly IConfiguration _config;
    private readonly ILogger<EmailService> _logger;
    private readonly HttpClient _httpClient;

    public EmailService(IConfiguration config, ILogger<EmailService> logger, IHttpClientFactory? httpClientFactory = null)
    {
        _config = config;
        _logger = logger;
        _httpClient = httpClientFactory?.CreateClient() ?? new HttpClient();
    }

    private async Task SendEmailAsync(string toEmail, string toName, string subject, string htmlContent)
    {
        var fromEmail = _config["Brevo:FromEmail"] ?? "diniruga@gmail.com";
        var fromName = _config["Brevo:FromName"] ?? "Health Bridge Pvt - Lab System";
        var apiKey = _config["Brevo:ApiKey"];

        _logger.LogInformation("[Email] Attempting to send email FROM={From} TO={To} SUBJECT={Subject}", fromEmail, toEmail, subject);

        // 1. Try Brevo HTTPS REST API first (Cloud/Railway safe — ports 587/465 are blocked by Railway firewall)
        if (!string.IsNullOrWhiteSpace(apiKey))
        {
            try
            {
                var payload = new
                {
                    sender = new { name = fromName, email = fromEmail },
                    to = new[] { new { email = toEmail, name = string.IsNullOrWhiteSpace(toName) ? toEmail : toName } },
                    subject = subject,
                    htmlContent = htmlContent
                };

                using var requestMsg = new HttpRequestMessage(HttpMethod.Post, "https://api.brevo.com/v3/smtp/email");
                requestMsg.Headers.Add("api-key", apiKey);
                requestMsg.Headers.Add("Accept", "application/json");
                requestMsg.Content = new StringContent(System.Text.Json.JsonSerializer.Serialize(payload), System.Text.Encoding.UTF8, "application/json");

                using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(10));
                var response = await _httpClient.SendAsync(requestMsg, cts.Token);
                var responseBody = await response.Content.ReadAsStringAsync(cts.Token);

                if (response.IsSuccessStatusCode)
                {
                    _logger.LogInformation("[Email] ✅ Email sent successfully to {Email} via Brevo HTTP REST API", toEmail);
                    return;
                }
                else
                {
                    _logger.LogWarning("[Email] ⚠️ Brevo HTTP REST API returned {StatusCode}: {Body}. Trying SMTP fallback...", response.StatusCode, responseBody);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "[Email] ⚠️ Brevo HTTP REST API exception: {Message}. Trying SMTP fallback...", ex.Message);
            }
        }

        // 2. SMTP fallback (for local development or environments where port 587 is open)
        try
        {
            var hasBrevoSmtp = !string.IsNullOrWhiteSpace(_config["Brevo:SmtpPass"]);
            var smtpServer = hasBrevoSmtp
                ? (_config["Brevo:SmtpServer"] ?? "smtp-relay.brevo.com")
                : (_config["SmtpSettings:SmtpServer"] ?? "smtp.gmail.com");
            var smtpPortStr = hasBrevoSmtp
                ? _config["Brevo:SmtpPort"]
                : _config["SmtpSettings:SmtpPort"];
            var smtpPort = int.TryParse(smtpPortStr, out var p) ? p : 587;
            var smtpUser = hasBrevoSmtp
                ? _config["Brevo:SmtpUser"]
                : _config["SmtpSettings:SmtpUser"];
            var smtpPass = hasBrevoSmtp
                ? _config["Brevo:SmtpPass"]
                : _config["SmtpSettings:SmtpPass"];
            var actualFromEmail = hasBrevoSmtp
                ? fromEmail
                : (_config["SmtpSettings:SenderEmail"] ?? fromEmail);
            var actualFromName = hasBrevoSmtp
                ? fromName
                : (_config["SmtpSettings:SenderName"] ?? fromName);

            var message = new MimeMessage();
            message.From.Add(new MailboxAddress(actualFromName, actualFromEmail));
            message.To.Add(new MailboxAddress(toName, toEmail));
            message.Subject = subject;

            var bodyBuilder = new BodyBuilder { HtmlBody = htmlContent };
            message.Body = bodyBuilder.ToMessageBody();

            using var client = new SmtpClient();
            using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(10));
            await client.ConnectAsync(smtpServer, smtpPort, MailKit.Security.SecureSocketOptions.StartTls, cts.Token);
            if (!string.IsNullOrWhiteSpace(smtpUser))
            {
                await client.AuthenticateAsync(smtpUser, smtpPass ?? string.Empty, cts.Token);
            }
            await client.SendAsync(message, cts.Token);
            await client.DisconnectAsync(true, cts.Token);

            _logger.LogInformation("[Email] ✅ Email sent successfully to {Email} via SMTP ({Server}:{Port})", toEmail, smtpServer, smtpPort);
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

    public async Task SendBookingConfirmationAsync(string toEmail, string patientName, string testName, DateOnly date, TimeOnly time, int? assignedChairNo = null, string? queueToken = null)
    {
        var subject = "✅ Your Lab Test Appointment is Confirmed";
        var chairHtml = assignedChairNo.HasValue && assignedChairNo.Value > 0
            ? $"<tr><td><strong>Assigned Seat / Station:</strong></td><td style='font-weight: 700; color: #059669;'>Phlebotomy Chair #{assignedChairNo.Value}</td></tr>"
            : "";
        var tokenHtml = !string.IsNullOrWhiteSpace(queueToken)
            ? $"<tr><td><strong>Smart Queue Token:</strong></td><td style='font-weight: 800; color: #1e40af;'>#{queueToken}</td></tr>"
            : "";

        var html = $@"
        <div style='font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border-radius: 10px; background: #f9f9f9;'>
            <h2 style='color: #2E86AB;'>Appointment Confirmed!</h2>
            <p>Dear <strong>{patientName}</strong>,</p>
            <p>Your lab test appointment has been successfully booked. Here are your details:</p>
            <table style='background: white; width: 100%; padding: 15px; border-radius: 8px; border: 1px solid #ddd;'>
                <tr><td><strong>Test:</strong></td><td>{testName}</td></tr>
                <tr><td><strong>Date:</strong></td><td>{date:dddd, MMMM d, yyyy}</td></tr>
                <tr><td><strong>Time:</strong></td><td>{time:hh:mm tt}</td></tr>
                {chairHtml}
                {tokenHtml}
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

    public async Task SendPrescriptionApprovedAsync(string toEmail, string patientName, string testName, DateOnly date, TimeOnly time, decimal price, int? assignedChairNo = null, string? queueToken = null)
    {
        var subject = "🎉 Prescription Approved: Proceed to Payment for Your Lab Appointment";
        var chairHtml = assignedChairNo.HasValue && assignedChairNo.Value > 0
            ? $"<tr><td style='padding: 6px 0; color: #64748b;'><strong>Assigned Seat / Station:</strong></td><td style='color: #059669; font-weight: 800;'>Phlebotomy Chair #{assignedChairNo.Value}</td></tr>"
            : "";
        var tokenHtml = !string.IsNullOrWhiteSpace(queueToken)
            ? $"<tr><td style='padding: 6px 0; color: #64748b;'><strong>Smart Queue Token:</strong></td><td style='color: #1e40af; font-weight: 800;'>#{queueToken}</td></tr>"
            : "";

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
                {chairHtml}
                {tokenHtml}
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

    public async Task SendOrderCompletedAsync(string toEmail, string patientName, string testName, string? reportUrl = null)
    {
        var subject = $"✅ Diagnostic Order Completed: {testName} - HealthBridge Laboratory";
        var resolvedUrl = ResolveReportUrl(reportUrl);
        var buttonHtml = !string.IsNullOrWhiteSpace(resolvedUrl) ? $@"
            <div style='text-align: center; margin: 24px 0;'>
                <a href='{resolvedUrl}' target='_blank' style='display: inline-block; background: #059669; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px;'>
                    📄 Download Official PDF Report
                </a>
            </div>" : "";

        var html = $@"
        <div style='font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; border-radius: 12px; background: #f8fafc; border: 1px solid #e2e8f0;'>
            <div style='text-align: center; margin-bottom: 20px;'>
                <div style='display: inline-block; width: 48px; height: 48px; line-height: 48px; border-radius: 50%; background: #dcfce7; color: #15803d; font-size: 24px;'>✓</div>
                <h2 style='color: #065f46; margin: 12px 0 4px 0; font-size: 20px;'>Diagnostic Order Completed</h2>
                <p style='color: #64748b; font-size: 13px; margin: 0;'>HealthBridge Diagnostic & Pathology Services</p>
            </div>
            <div style='background: #ffffff; padding: 20px; border-radius: 10px; border: 1px solid #e2e8f0; margin-bottom: 16px;'>
                <p style='margin-top: 0; color: #1e293b; font-size: 15px;'>Dear <strong>{patientName}</strong>,</p>
                <p style='color: #334155; line-height: 1.6; font-size: 14px;'>
                    Your diagnostic test order for <strong>{testName}</strong> has been marked as <strong>Completed</strong> and finalized by our laboratory clinical team.
                </p>
                <p style='color: #334155; line-height: 1.6; font-size: 14px;'>
                    Your official diagnostic laboratory findings are verified and safely archived in your electronic medical records.
                </p>
                {buttonHtml}
                <div style='background: #f1f5f9; padding: 12px 14px; border-radius: 8px; font-size: 12.5px; color: #475569;'>
                    📱 <strong>Patient App Access:</strong> You can view and download all past and present verified lab reports anytime directly from the HealthBridge Patient App under <em>Laboratory &gt; Test Reports</em>.
                </div>
            </div>
            <p style='color: #94a3b8; font-size: 11px; text-align: center; margin: 0;'>
                Medix Clinical Healthcare System • Automated Medical Notification
            </p>
        </div>";

        await SendEmailAsync(toEmail, patientName, subject, html);
    }

    public async Task SendBookingCancelledAsync(string toEmail, string patientName, string testName, DateOnly date, TimeOnly time, string? queueToken = null)
    {
        var subject = $"❌ Appointment Cancelled: {testName}";
        var tokenHtml = !string.IsNullOrWhiteSpace(queueToken)
            ? $"<tr><td style='padding: 6px 0; color: #64748b;'><strong>Cancelled Queue Token:</strong></td><td style='color: #475569; font-weight: 700;'>#{queueToken}</td></tr>"
            : "";

        var html = $@"
        <div style='font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;'>
            <div style='background: linear-gradient(135deg, #ef4444, #b91c1c); color: white; padding: 20px 24px; border-radius: 10px; margin-bottom: 20px;'>
                <h2 style='margin: 0; font-size: 20px; font-weight: 800;'>Laboratory Appointment Cancelled</h2>
                <p style='margin: 6px 0 0 0; font-size: 13px; opacity: 0.9;'>Status: Cancelled by Patient</p>
            </div>
            <p style='font-size: 15px; color: #1e293b;'>Dear <strong>{patientName}</strong>,</p>
            <p style='font-size: 14px; line-height: 1.6; color: #475569;'>
                As requested, your diagnostic laboratory appointment has been successfully cancelled in our system.
            </p>
            <div style='background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 18px 0;'>
                <table style='width: 100%; border-collapse: collapse; font-size: 13.5px;'>
                    <tr>
                        <td style='padding: 6px 0; color: #64748b; width: 45%;'><strong>Investigation / Test:</strong></td>
                        <td style='padding: 6px 0; color: #0f172a; font-weight: 700;'>{testName}</td>
                    </tr>
                    <tr>
                        <td style='padding: 6px 0; color: #64748b;'><strong>Scheduled Date:</strong></td>
                        <td style='padding: 6px 0; color: #0f172a;'>{date:yyyy-MM-dd}</td>
                    </tr>
                    <tr>
                        <td style='padding: 6px 0; color: #64748b;'><strong>Scheduled Time:</strong></td>
                        <td style='padding: 6px 0; color: #0f172a;'>{time:HH:mm}</td>
                    </tr>
                    {tokenHtml}
                    <tr>
                        <td style='padding: 6px 0; color: #64748b;'><strong>Current Status:</strong></td>
                        <td style='padding: 6px 0; color: #ef4444; font-weight: 700;'>Cancelled</td>
                    </tr>
                </table>
            </div>
            <div style='background: #fef2f2; border: 1px solid #fee2e2; border-radius: 8px; padding: 14px; margin: 16px 0;'>
                <p style='margin: 0; color: #991b1b; font-size: 13px; line-height: 1.5;'>
                    <strong>Schedule Released:</strong> Your reserved phlebotomy time slot and station have been released back into the clinical schedule.
                </p>
                <p style='margin: 8px 0 0 0; color: #7f1d1d; font-size: 12.5px;'>
                    If you paid online via card, any refundable authorization will be automatically reversed to your account in accordance with billing policy.
                </p>
            </div>
            <p style='font-size: 13.5px; color: #475569;'>
                Need to reschedule? You can book a new appointment at your convenience anytime via the Medix mobile app or web portal.
            </p>
            <hr style='border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;' />
            <p style='color: #94a3b8; font-size: 11px; margin: 0;'>Medix Clinical Healthcare System • Automated Medical Notification</p>
        </div>";

        await SendEmailAsync(toEmail, patientName, subject, html);
    }

    private string? ResolveReportUrl(string? reportUrl)
    {
        if (string.IsNullOrWhiteSpace(reportUrl)) return null;

        var url = reportUrl.Trim();
        var publicHost = _config["PublicBaseUrl"]?.TrimEnd('/');
        if (string.IsNullOrWhiteSpace(publicHost))
        {
            var localIp = GetLocalIpAddress();
            publicHost = $"http://{localIp}:5126";
        }

        if (url.StartsWith("/uploads/", StringComparison.OrdinalIgnoreCase))
        {
            return $"{publicHost}{url}";
        }

        if (url.Contains("localhost:5126", StringComparison.OrdinalIgnoreCase) || 
            url.Contains("127.0.0.1:5126", StringComparison.OrdinalIgnoreCase))
        {
            return url
                .Replace("http://localhost:5126", publicHost, StringComparison.OrdinalIgnoreCase)
                .Replace("https://localhost:5126", publicHost, StringComparison.OrdinalIgnoreCase)
                .Replace("http://127.0.0.1:5126", publicHost, StringComparison.OrdinalIgnoreCase)
                .Replace("https://127.0.0.1:5126", publicHost, StringComparison.OrdinalIgnoreCase);
        }

        return url;
    }

    private static string GetLocalIpAddress()
    {
        try
        {
            using var socket = new System.Net.Sockets.Socket(
                System.Net.Sockets.AddressFamily.InterNetwork, 
                System.Net.Sockets.SocketType.Dgram, 0);
            socket.Connect("8.8.8.8", 65530);
            var endPoint = socket.LocalEndPoint as System.Net.IPEndPoint;
            if (endPoint != null)
            {
                return endPoint.Address.ToString();
            }
        }
        catch
        {
        }
        return "192.168.1.5";
    }
    private static string FormatDocName(string docName)
    {
        if (string.IsNullOrWhiteSpace(docName)) return "Doctor";
        return docName.StartsWith("Dr.", StringComparison.OrdinalIgnoreCase) || docName.StartsWith("Dr ", StringComparison.OrdinalIgnoreCase)
            ? docName
            : $"Dr. {docName}";
    }

    public async Task SendDoctorSessionStartedAsync(string toEmail, string patientName, string doctorName, string sessionName, string currentlyServingText)
    {
        var docFormatted = FormatDocName(doctorName);
        var subject = $"Consultations Started — {docFormatted} ({sessionName}) — Health Bridge";
        var html = $@"
        <div style='font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border-radius: 12px; background: #F0FDF4; border: 1px solid #BBF7D0;'>
            <div style='background: #00796B; padding: 20px; border-radius: 8px 8px 0 0; color: white;'>
                <h2 style='margin: 0; font-size: 20px;'>🩺 Doctor Has Arrived &amp; Consultations Started</h2>
                <p style='margin: 5px 0 0; font-size: 13px; color: #E0F2F1;'>Health Bridge Hospital OPD Channeling</p>
            </div>
            <div style='background: white; padding: 20px; border-radius: 0 0 8px 8px; border: 1px solid #E2E8F0; border-top: none;'>
                <p>Dear <strong>{patientName}</strong>,</p>
                <p><strong>{docFormatted}</strong> has started consultations for the <strong>{sessionName}</strong>.</p>
                <div style='background: #F8FAFC; border-left: 4px solid #00796B; padding: 14px 18px; border-radius: 6px; margin: 16px 0;'>
                    <div style='font-size: 14px; color: #1E293B;'>
                        Currently serving: <strong style='color: #00796B; font-size: 16px;'>{currentlyServingText}</strong>
                    </div>
                    <div style='font-size: 12px; color: #64748B; margin-top: 4px;'>
                        Please check in at the reception if you have not already arrived.
                    </div>
                </div>
                <p style='font-size: 13px; color: #475569;'>
                    You can view live queue progress anytime on your Patient Portal or Mobile App.
                </p>
                <div style='border-top: 1px solid #E2E8F0; padding-top: 12px; margin-top: 20px; color: #94A3B8; font-size: 11px;'>
                    Health Bridge Hospital Group • Automated Channeling Desk Notification
                </div>
            </div>
        </div>";
        await SendEmailAsync(toEmail, patientName, subject, html);
    }

    public async Task SendDoctorSessionDelayedAsync(string toEmail, string patientName, string doctorName, string sessionName, int delayMinutes, string expectedStartTimeStr, string updatedEstimatedTimeStr, string recommendedArrivalStr, string? reason)
    {
        var docFormatted = FormatDocName(doctorName);
        var subject = $"Schedule Update: {docFormatted} Session Delayed — Health Bridge";
        var delayText = delayMinutes > 0 ? $"delayed by {delayMinutes} minutes, " : "";
        var reasonText = !string.IsNullOrWhiteSpace(reason) ? $"<p style='font-size: 12px; color: #B45309; margin: 4px 0 0 0;'>Note: {reason}</p>" : "";
        var html = $@"
        <div style='font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border-radius: 12px; background: #FEF3C7; border: 1px solid #FDE68A;'>
            <div style='background: #D97706; padding: 20px; border-radius: 8px 8px 0 0; color: white;'>
                <h2 style='margin: 0; font-size: 20px;'>⚠️ Consultation Schedule Update</h2>
                <p style='margin: 5px 0 0; font-size: 13px; color: #FEF3C7;'>Health Bridge Hospital OPD Channeling</p>
            </div>
            <div style='background: white; padding: 20px; border-radius: 0 0 8px 8px; border: 1px solid #E2E8F0; border-top: none;'>
                <p>Dear <strong>{patientName}</strong>,</p>
                <p><strong>{docFormatted}</strong>'s {sessionName} is {delayText}new expected start <strong>{expectedStartTimeStr}</strong>.</p>
                {reasonText}
                <div style='background: #FFFBEB; border-left: 4px solid #F59E0B; padding: 14px 18px; border-radius: 6px; margin: 16px 0;'>
                    <div style='font-size: 14px; color: #92400E; font-weight: 700;'>
                        Your updated estimated consultation time is ~{updatedEstimatedTimeStr} (approximate).
                    </div>
                    <div style='font-size: 12px; color: #B45309; margin-top: 4px;'>
                        Please arrive by {recommendedArrivalStr}.
                    </div>
                </div>
                <p style='font-size: 13px; color: #475569;'>
                    We apologize for any inconvenience caused. You can track live queue status in real time via the app.
                </p>
                <div style='border-top: 1px solid #E2E8F0; padding-top: 12px; margin-top: 20px; color: #94A3B8; font-size: 11px;'>
                    Health Bridge Hospital Group • Automated Channeling Desk Notification
                </div>
            </div>
        </div>";
        await SendEmailAsync(toEmail, patientName, subject, html);
    }

    public async Task SendDoctorReadyAlertAsync(string toEmail, string patientName, string doctorName, string roomNumber, string currentlyServingText, int patientsAway, string yourToken)
    {
        var docFormatted = FormatDocName(doctorName);
        var subject = $"Get Ready for Consultation: {docFormatted} — Health Bridge";
        var html = $@"
        <div style='font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border-radius: 12px; background: #E0F2FE; border: 1px solid #BAE6FD;'>
            <div style='background: #0284C7; padding: 20px; border-radius: 8px 8px 0 0; color: white;'>
                <h2 style='margin: 0; font-size: 20px;'>🔔 Please Get Ready — Consultation Approaching</h2>
                <p style='margin: 5px 0 0; font-size: 13px; color: #E0F2FE;'>Health Bridge Hospital OPD Channeling</p>
            </div>
            <div style='background: white; padding: 20px; border-radius: 0 0 8px 8px; border: 1px solid #E2E8F0; border-top: none;'>
                <p>Dear <strong>{patientName}</strong>,</p>
                <p><strong>{docFormatted}</strong> is currently serving <strong>{currentlyServingText}</strong>.</p>
                <div style='background: #F0F9FF; border-left: 4px solid #0284C7; padding: 14px 18px; border-radius: 6px; margin: 16px 0;'>
                    <div style='font-size: 15px; color: #0369A1; font-weight: 700;'>
                        Please make your way towards {roomNumber}.
                    </div>
                    <div style='font-size: 13px; color: #0C4A6E; margin-top: 4px;'>
                        You're approximately <strong>{patientsAway} patient{(patientsAway > 1 ? "s" : "")} away</strong> (Your Token: <strong>{yourToken}</strong>).
                    </div>
                </div>
                <p style='font-size: 13px; color: #475569;'>
                    Please remain near the consultation suite. The nursing officer will call your token number shortly.
                </p>
                <div style='border-top: 1px solid #E2E8F0; padding-top: 12px; margin-top: 20px; color: #94A3B8; font-size: 11px;'>
                    Health Bridge Hospital Group • Automated Channeling Desk Notification
                </div>
            </div>
        </div>";
        await SendEmailAsync(toEmail, patientName, subject, html);
    }
}


