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

        bool hasInlineQr   = qrPngBytes is { Length: > 0 };
        bool hasValidSmtp  = !string.IsNullOrWhiteSpace(smtpUser) && !string.IsNullOrWhiteSpace(smtpPass)
                             && !smtpUser!.StartsWith("YOUR_") && !smtpPass!.StartsWith("YOUR_");
        bool hasValidHttpApi = !string.IsNullOrWhiteSpace(brevoApiKey) && !brevoApiKey!.StartsWith("YOUR_");

        // ── 2. Brevo REST — only used for plain-HTML mails (no QR attachment) ──
        //    Brevo REST API does not support multipart/related linked resources,
        //    so skip it when an inline QR is requested.
        if (hasValidHttpApi && !hasInlineQr)
        {
            try
            {
                var payload = new
                {
                    sender      = new { name = senderName, email = senderEmail },
                    to          = new[] { new { email = toEmail, name = string.IsNullOrWhiteSpace(toName) ? toEmail : toName } },
                    subject     = subject,
                    htmlContent = htmlContent
                };

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

        // ── 3. SMTP via MailKit — multipart/related when QR bytes are present ──
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
                // ── Build multipart/related using MimeKit BodyBuilder ──────────
                // BodyBuilder.LinkedResources produces the exact MIME structure:
                //   Content-Type: multipart/related
                //     └─ text/html  (references cid:{imageCid})
                //     └─ image/png  (Content-ID: <{imageCid}>; Content-Transfer-Encoding: base64)
                // This is the format Gmail mobile app renders inline images from.
                var builder = new BodyBuilder();
                builder.HtmlBody = htmlContent; // must contain <img src="cid:{imageCid}">

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

            var primarySocketOption = smtpPort == 465
                ? MailKit.Security.SecureSocketOptions.SslOnConnect
                : MailKit.Security.SecureSocketOptions.StartTls;

            try
            {
                using var client = new SmtpClient();
                using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(20));

                _logger.LogInformation("[EmailSender] Connecting to {Server}:{Port} ({Option})", smtpServer, smtpPort, primarySocketOption);
                await client.ConnectAsync(smtpServer, smtpPort, primarySocketOption, cts.Token);
                await client.AuthenticateAsync(smtpUser!, smtpPass!, cts.Token);
                await client.SendAsync(message, cts.Token);
                await client.DisconnectAsync(true, cts.Token);

                _logger.LogInformation("[EmailSender] ✅ Email delivered to {Email} via SMTP ({Server}:{Port})", toEmail, smtpServer, smtpPort);
                return true;
            }
            catch (Exception primaryEx) when (smtpPort != 465)
            {
                _logger.LogWarning(primaryEx, "[EmailSender] Primary SMTP port {Port} connection failed: {Msg}. Retrying via SSL Port 465 fallback...", smtpPort, primaryEx.Message);

                try
                {
                    using var retryClient = new SmtpClient();
                    using var retryCts = new CancellationTokenSource(TimeSpan.FromSeconds(20));

                    await retryClient.ConnectAsync(smtpServer, 465, MailKit.Security.SecureSocketOptions.SslOnConnect, retryCts.Token);
                    await retryClient.AuthenticateAsync(smtpUser!, smtpPass!, retryCts.Token);
                    await retryClient.SendAsync(message, retryCts.Token);
                    await retryClient.DisconnectAsync(true, retryCts.Token);

                    _logger.LogInformation("[EmailSender] ✅ Email delivered to {Email} via SMTP SSL Port 465 fallback", toEmail);
                    return true;
                }
                catch (Exception retryEx)
                {
                    _logger.LogError(retryEx, "[EmailSender] SSL Port 465 fallback also failed for {Email}: {Msg}", toEmail, retryEx.Message);
                    return false;
                }
            }
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
