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

    // ── Plain HTML email (no inline attachment) ─────────────────────────────
    public Task<bool> SendEmailAsync(string toEmail, string toName, string subject, string htmlContent)
        => SendEmailCoreAsync(toEmail, toName, subject, htmlContent, null, "appointment_qr_code");

    // ── HTML + inline QR via multipart/related (CID-based) ──────────────────
    // The HTML body must reference: <img src="cid:{imageCid}">
    // qrPngBytes is the raw PNG bytes; they are attached as a LinkedResource
    // with ContentId = imageCid, producing a proper multipart/related envelope
    // that Gmail mobile app renders natively.
    public Task<bool> SendEmailWithInlineQrAsync(
        string toEmail,
        string toName,
        string subject,
        string htmlContent,
        byte[] qrPngBytes,
        string imageCid = "appointment_qr_code")
        => SendEmailCoreAsync(toEmail, toName, subject, htmlContent, qrPngBytes, imageCid);

    // ── Core dispatch logic ──────────────────────────────────────────────────
    private async Task<bool> SendEmailCoreAsync(
        string toEmail,
        string toName,
        string subject,
        string htmlContent,
        byte[]? qrPngBytes,
        string imageCid)
    {
        if (string.IsNullOrWhiteSpace(toEmail)) return false;

        // ── 1. Resolve credentials ──────────────────────────────────────────
        var smtpServer = !string.IsNullOrWhiteSpace(_smtpSettings.SmtpServer)
            ? _smtpSettings.SmtpServer
            : (Environment.GetEnvironmentVariable("SmtpSettings__SmtpServer") ?? _config["SmtpSettings:SmtpServer"] ?? "smtp.gmail.com");

        var smtpPortStr = Environment.GetEnvironmentVariable("SmtpSettings__SmtpPort") ?? _config["SmtpSettings:SmtpPort"];
        var smtpPort = _smtpSettings.SmtpPort > 0
            ? _smtpSettings.SmtpPort
            : (int.TryParse(smtpPortStr, out var p) ? p : 465);

        var smtpUser = !string.IsNullOrWhiteSpace(_smtpSettings.SmtpUser)
            ? _smtpSettings.SmtpUser
            : (Environment.GetEnvironmentVariable("SmtpSettings__SmtpUser") ?? _config["SmtpSettings:SmtpUser"] ?? "teeranya123danansuriya@gmail.com");

        var smtpPass = !string.IsNullOrWhiteSpace(_smtpSettings.SmtpPass)
            ? _smtpSettings.SmtpPass
            : (Environment.GetEnvironmentVariable("SmtpSettings__SmtpPass") ?? _config["SmtpSettings:SmtpPass"] ?? "rvci rqxr toba cxgg");

        var senderEmail = !string.IsNullOrWhiteSpace(_smtpSettings.SenderEmail)
            ? _smtpSettings.SenderEmail
            : (Environment.GetEnvironmentVariable("SmtpSettings__SenderEmail") ?? _config["SmtpSettings:SenderEmail"] ?? "teeranya123danansuriya@gmail.com");

        var senderName = !string.IsNullOrWhiteSpace(_smtpSettings.SenderName)
            ? _smtpSettings.SenderName
            : (Environment.GetEnvironmentVariable("SmtpSettings__SenderName") ?? _config["SmtpSettings:SenderName"] ?? "Health Bridge Hospital");

        var brevoApiKey = _config["Brevo:ApiKey"]
            ?? Environment.GetEnvironmentVariable("Brevo__ApiKey")
            ?? _config["PharmacyBrevo:ApiKey"]
            ?? Environment.GetEnvironmentVariable("PharmacyBrevo__ApiKey");

        bool hasInlineQr   = qrPngBytes is { Length: > 0 };
        bool hasValidSmtp  = !string.IsNullOrWhiteSpace(smtpUser) && !string.IsNullOrWhiteSpace(smtpPass)
                             && !smtpUser!.StartsWith("YOUR_") && !smtpPass!.StartsWith("YOUR_");
        bool hasValidHttpApi = !string.IsNullOrWhiteSpace(brevoApiKey) && !brevoApiKey!.StartsWith("YOUR_");

        // ── 2. Brevo HTTPS REST API (Port 443 — firewall-immune) ────────────
        if (hasValidHttpApi)
        {
            try
            {
                object payload;
                if (hasInlineQr)
                {
                    payload = new
                    {
                        sender      = new { name = senderName, email = senderEmail },
                        to          = new[] { new { email = toEmail, name = string.IsNullOrWhiteSpace(toName) ? toEmail : toName } },
                        subject     = subject,
                        htmlContent = htmlContent,
                        attachment  = new[]
                        {
                            new
                            {
                                name    = "appointment_qr.png",
                                content = Convert.ToBase64String(qrPngBytes!)
                            }
                        }
                    };
                }
                else
                {
                    payload = new
                    {
                        sender      = new { name = senderName, email = senderEmail },
                        to          = new[] { new { email = toEmail, name = string.IsNullOrWhiteSpace(toName) ? toEmail : toName } },
                        subject     = subject,
                        htmlContent = htmlContent
                    };
                }

                using var requestMsg = new HttpRequestMessage(HttpMethod.Post, "https://api.brevo.com/v3/smtp/email");
                requestMsg.Headers.Add("api-key", brevoApiKey!);
                requestMsg.Headers.Add("Accept", "application/json");
                requestMsg.Content = new StringContent(
                    System.Text.Json.JsonSerializer.Serialize(payload),
                    System.Text.Encoding.UTF8, "application/json");

                using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(12));
                var response = await _httpClient.SendAsync(requestMsg, cts.Token);

                if (response.IsSuccessStatusCode)
                {
                    _logger.LogInformation("[EmailSender] ✅ Sent to {Email} via Brevo REST API", toEmail);
                    return true;
                }
                var errorBody = await response.Content.ReadAsStringAsync();
                _logger.LogWarning("[EmailSender] Brevo HTTP {Status}: {Body} — falling back to SMTP", response.StatusCode, errorBody);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "[EmailSender] Brevo REST exception for {Email} — falling back to SMTP", toEmail);
            }
        }

        // ── 3. SMTP via MailKit — multi-port retry loop (465 SSL, 587 StartTLS, 2525) ──
        if (!hasValidSmtp)
        {
            _logger.LogWarning("[EmailSender] No valid SMTP credentials configured. Email to {Email} skipped.", toEmail);
            return false;
        }

        try
        {
            var message = new MimeMessage();
            message.From.Add(new MailboxAddress(senderName, senderEmail));
            message.To.Add(new MailboxAddress(string.IsNullOrWhiteSpace(toName) ? toEmail : toName, toEmail));
            message.Subject = subject;

            if (hasInlineQr)
            {
                var builder = new BodyBuilder();
                builder.HtmlBody = htmlContent;

                var linkedImg = (MimePart) builder.LinkedResources.Add(
                    "qr_code.png",
                    qrPngBytes!,
                    new ContentType("image", "png"));
                linkedImg.ContentId               = imageCid;
                linkedImg.ContentTransferEncoding  = ContentEncoding.Base64;

                message.Body = builder.ToMessageBody();
                _logger.LogInformation("[EmailSender] Built multipart/related with CID={Cid} ({Bytes} bytes)", imageCid, qrPngBytes!.Length);
            }
            else
            {
                message.Body = new TextPart("html") { Text = htmlContent };
            }

            // Connection targets to attempt in priority order
            var attempts = new List<(int Port, MailKit.Security.SecureSocketOptions Option)>
            {
                (smtpPort, smtpPort == 465 ? MailKit.Security.SecureSocketOptions.SslOnConnect : MailKit.Security.SecureSocketOptions.StartTls),
                (465, MailKit.Security.SecureSocketOptions.SslOnConnect),
                (587, MailKit.Security.SecureSocketOptions.StartTls),
                (2525, MailKit.Security.SecureSocketOptions.StartTls)
            };

            // Deduplicate preserving order
            var distinctAttempts = new List<(int Port, MailKit.Security.SecureSocketOptions Option)>();
            foreach (var a in attempts)
            {
                if (!distinctAttempts.Any(x => x.Port == a.Port && x.Option == a.Option))
                    distinctAttempts.Add(a);
            }

            Exception? lastEx = null;
            foreach (var (targetPort, targetOption) in distinctAttempts)
            {
                try
                {
                    using var client = new SmtpClient();
                    // Disable certificate revocation check which fails on Linux containers without system CRL cache
                    client.CheckCertificateRevocation = false;
                    client.ServerCertificateValidationCallback = (s, c, h, e) => true;

                    using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(15));
                    _logger.LogInformation("[EmailSender] Attempting SMTP connect to {Server}:{Port} ({Option})...", smtpServer, targetPort, targetOption);

                    await client.ConnectAsync(smtpServer, targetPort, targetOption, cts.Token);
                    await client.AuthenticateAsync(smtpUser!, smtpPass!, cts.Token);
                    await client.SendAsync(message, cts.Token);
                    await client.DisconnectAsync(true, cts.Token);

                    _logger.LogInformation("[EmailSender] ✅ Email delivered to {Email} via SMTP ({Server}:{Port})", toEmail, smtpServer, targetPort);
                    return true;
                }
                catch (Exception attemptEx)
                {
                    lastEx = attemptEx;
                    _logger.LogWarning("[EmailSender] SMTP attempt on {Server}:{Port} ({Option}) failed: {Msg}",
                        smtpServer, targetPort, targetOption, attemptEx.Message);
                }
            }

            if (lastEx != null)
            {
                _logger.LogError(lastEx, "[EmailSender] All SMTP connection attempts failed for {Email}", toEmail);
            }
            return false;
        }
        catch (MailKit.Net.Smtp.SmtpCommandException smtpEx)
        {
            _logger.LogError("[EmailSender] SMTP command error for {Email} — StatusCode={Code} Message={Message}",
                toEmail, smtpEx.StatusCode, smtpEx.Message);
            return false;
        }
        catch (MailKit.Security.AuthenticationException authEx)
        {
            _logger.LogError("[EmailSender] SMTP authentication failed for {Email} — check App Password. Details: {Message}",
                toEmail, authEx.Message);
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[EmailSender] Failed to send email to {Email}: {Message}", toEmail, ex.Message);
            return false;
        }
    }
}
