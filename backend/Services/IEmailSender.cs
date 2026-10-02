namespace HealthBridge.Api.Services;

public interface IEmailSender
{
    Task<bool> SendVerificationEmailAsync(string toEmail, string toName, string verificationToken, string verificationUrl);
    Task<bool> SendEmailAsync(string toEmail, string toName, string subject, string htmlContent);
}
