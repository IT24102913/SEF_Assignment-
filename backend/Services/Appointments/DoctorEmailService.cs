using MailKit.Net.Smtp;
using MimeKit;

namespace HealthBridge.Api.Services;

public interface IDoctorEmailService
{
    Task SendDoctorSessionStartedAsync(string toEmail, string patientName, string doctorName, string sessionName, string currentlyServingText);
    Task SendDoctorSessionDelayedAsync(string toEmail, string patientName, string doctorName, string sessionName, int delayMinutes, string expectedStartTimeStr, string updatedEstimatedTimeStr, string recommendedArrivalStr, string? reason);
    Task SendDoctorReadyAlertAsync(string toEmail, string patientName, string doctorName, string roomNumber, string currentlyServingText, int patientsAway, string yourToken);
}

public class DoctorEmailService : IDoctorEmailService
{
    private readonly IConfiguration _config;
    private readonly ILogger<DoctorEmailService> _logger;
    private readonly HttpClient _httpClient;

    public DoctorEmailService(IConfiguration config, ILogger<DoctorEmailService> logger, IHttpClientFactory? httpClientFactory = null)
    {
        _config = config;
        _logger = logger;
        _httpClient = httpClientFactory?.CreateClient() ?? new HttpClient();
    }

    private async Task SendEmailAsync(string toEmail, string toName, string subject, string htmlContent)
    {
        var fromEmail = _config["Brevo:FromEmail"] ?? "diniruga@gmail.com";
        var fromName = _config["Brevo:FromName"] ?? "Health Bridge Pvt - Doctor Channeling";
        var apiKey = _config["Brevo:ApiKey"];

        _logger.LogInformation("[DoctorEmail] Attempting to send email FROM={From} TO={To} SUBJECT={Subject}", fromEmail, toEmail, subject);

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
                    _logger.LogInformation("[DoctorEmail] ✅ Email sent successfully to {Email} via Brevo HTTP REST API", toEmail);
                    return;
                }
                else
                {
                    _logger.LogWarning("[DoctorEmail] ⚠️ Brevo HTTP REST API returned {StatusCode}: {Body}. Trying SMTP fallback...", response.StatusCode, responseBody);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "[DoctorEmail] ⚠️ Brevo HTTP REST API exception: {Message}. Trying SMTP fallback...", ex.Message);
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

            _logger.LogInformation("[DoctorEmail] ✅ Email sent successfully to {Email} via SMTP ({Server}:{Port})", toEmail, smtpServer, smtpPort);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[DoctorEmail] ❌ FAILED to send email to {Email}. Error: {Message}", toEmail, ex.Message);
        }
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
