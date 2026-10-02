using MailKit.Net.Smtp;
using MimeKit;
using Microsoft.Extensions.Options;

namespace HealthBridge.Api.Services;

public class EmailSender : IEmailSender
{
    private readonly SmtpSettings _smtpSettings;
    private readonly IConfiguration _config;
    private readonly ILogger<EmailSender> _logger;
    private readonly IHostEnvironment _env;
    private readonly HttpClient _httpClient;

    public EmailSender(
        IOptions<SmtpSettings> smtpOptions,
        IConfiguration config,
        ILogger<EmailSender> logger,
        IHostEnvironment env,
        IHttpClientFactory? httpClientFactory = null)
    {
        _smtpSettings = smtpOptions.Value ?? new SmtpSettings();
        _config = config;
        _logger = logger;
        _env = env;
        _httpClient = httpClientFactory?.CreateClient() ?? new HttpClient();
    }

    public async Task<bool> SendVerificationEmailAsync(string toEmail, string toName, string verificationToken, string verificationUrl)
    {
        if (_env.IsDevelopment())
        {
            _logger.LogInformation("[EmailSender] Dev Verification URL: {VerificationUrl}", verificationUrl);
        }

        var subject = "✉️ Verify Your HealthBridge Account Email";
        var htmlBody = $@"
        <div style='font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; border-radius: 12px; background: #ffffff; border: 1px solid #e2e8f0;'>
            <h2 style='color: #0d9488;'>Verify Your Email Address</h2>
            <p>Dear <strong>{toName}</strong>,</p>
            <p>Thank you for registering with <strong>HealthBridge</strong>. Please click the button below to verify your email address and activate sign in access:</p>
            <div style='text-align: center; margin: 28px 0;'>
                <a href='{verificationUrl}' style='background-color: #0d9488; color: white; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;'>
                    Verify Email Address →
                </a>
            </div>
            <p style='font-size: 12px; color: #64748b;'>Or copy and paste this link into your browser:<br /><a href='{verificationUrl}' style='color: #0d9488;'>{verificationUrl}</a></p>
            <hr style='border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;' />
            <p style='font-size: 11px; color: #94a3b8;'>If you did not create a HealthBridge account, please ignore this email.</p>
        </div>";

        return await SendEmailAsync(toEmail, toName, subject, htmlBody);
    }

    public async Task<bool> SendEmailAsync(string toEmail, string toName, string subject, string htmlContent)
    {
        // 1. Resolve configuration (supporting both SmtpSettings section and Brevo section)
        var smtpServer = !string.IsNullOrWhiteSpace(_smtpSettings.SmtpServer)
            ? _smtpSettings.SmtpServer
            : (_config["Brevo:SmtpServer"] ?? "smtp-relay.brevo.com");

        var smtpPort = _smtpSettings.SmtpPort > 0
            ? _smtpSettings.SmtpPort
            : (int.TryParse(_config["Brevo:SmtpPort"], out var p) ? p : 587);

        var smtpUser = !string.IsNullOrWhiteSpace(_smtpSettings.SmtpUser)
            ? _smtpSettings.SmtpUser
            : _config["Brevo:SmtpUser"];

        var smtpPass = !string.IsNullOrWhiteSpace(_smtpSettings.SmtpPass)
            ? _smtpSettings.SmtpPass
            : _config["Brevo:SmtpPass"];

        var senderEmail = !string.IsNullOrWhiteSpace(_smtpSettings.SenderEmail)
            ? _smtpSettings.SenderEmail
            : (_config["Brevo:FromEmail"] ?? "noreply@healthbridge.com");

        var senderName = !string.IsNullOrWhiteSpace(_smtpSettings.SenderName)
            ? _smtpSettings.SenderName
            : (_config["Brevo:FromName"] ?? "HealthBridge System");

        var brevoApiKey = _config["Brevo:ApiKey"];

        // 2. Validate credentials
        var hasValidSmtp = !string.IsNullOrWhiteSpace(smtpUser) &&
                           !string.IsNullOrWhiteSpace(smtpPass) &&
                           !smtpUser.StartsWith("YOUR_") &&
                           !smtpPass.StartsWith("YOUR_");

        var hasValidHttpApi = !string.IsNullOrWhiteSpace(brevoApiKey) && !brevoApiKey.StartsWith("YOUR_");

        if (!hasValidSmtp && !hasValidHttpApi)
        {
            _logger.LogWarning("[EmailSender] SMTP credentials missing. Delivery skipped.");
            return false;
        }

        // 3. Attempt Brevo REST API first if API key is present
        if (hasValidHttpApi)
        {
            try
            {
                var payload = new
                {
                    sender = new { name = senderName, email = senderEmail },
                    to = new[] { new { email = toEmail, name = string.IsNullOrWhiteSpace(toName) ? toEmail : toName } },
                    subject = subject,
                    htmlContent = htmlContent
                };

                using var requestMsg = new HttpRequestMessage(HttpMethod.Post, "https://api.brevo.com/v3/smtp/email");
                requestMsg.Headers.Add("api-key", brevoApiKey);
                requestMsg.Headers.Add("Accept", "application/json");
                requestMsg.Content = new StringContent(System.Text.Json.JsonSerializer.Serialize(payload), System.Text.Encoding.UTF8, "application/json");

                using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(10));
                var response = await _httpClient.SendAsync(requestMsg, cts.Token);

                if (response.IsSuccessStatusCode)
                {
                    _logger.LogInformation("[EmailSender] ✅ Email sent successfully to {Email} via HTTP REST API", toEmail);
                    return true;
                }
                else
                {
                    var errorBody = await response.Content.ReadAsStringAsync();
                    _logger.LogWarning("[EmailSender] Brevo HTTP REST API error {Status}: {Body}", response.StatusCode, errorBody);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[EmailSender] Exception caught while sending email via HTTP API to {Email}: {Message}", toEmail, ex.Message);
            }
        }

        // 4. Attempt SMTP delivery
        if (hasValidSmtp)
        {
            try
            {
                var message = new MimeMessage();
                message.From.Add(new MailboxAddress(senderName, senderEmail));
                message.To.Add(new MailboxAddress(toName, toEmail));
                message.Subject = subject;

                var bodyBuilder = new BodyBuilder { HtmlBody = htmlContent };
                message.Body = bodyBuilder.ToMessageBody();

                using var client = new SmtpClient();
                using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(10));

                await client.ConnectAsync(smtpServer, smtpPort, MailKit.Security.SecureSocketOptions.StartTls, cts.Token);
                await client.AuthenticateAsync(smtpUser, smtpPass, cts.Token);
                await client.SendAsync(message, cts.Token);
                await client.DisconnectAsync(true, cts.Token);

                _logger.LogInformation("[EmailSender] ✅ Email sent successfully to {Email} via SMTP", toEmail);
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[EmailSender] Exception caught while sending email to {Email}: {Message}", toEmail, ex.Message);
                return false;
            }
        }

        return false;
    }
}
