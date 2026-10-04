namespace HealthBridge.Api.Services;

public interface IEmailSender
{
    /// <summary>Plain HTML email with no inline attachments.</summary>
    Task<bool> SendEmailAsync(string toEmail, string toName, string subject, string htmlContent);

    /// <summary>
    /// HTML email with an inline PNG QR code embedded via CID.
    /// The HTML body should reference the image as: &lt;img src="cid:{imageCid}"&gt;
    /// </summary>
    Task<bool> SendEmailWithInlineQrAsync(
        string toEmail,
        string toName,
        string subject,
        string htmlContent,
        byte[] qrPngBytes,
        string imageCid = "appointment_qr_code");
}
