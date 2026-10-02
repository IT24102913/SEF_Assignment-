namespace HealthBridge.Api.Services;

public class SmtpSettings
{
    public const string SectionName = "SmtpSettings";

    public string SmtpServer { get; set; } = "smtp-relay.brevo.com";
    public int SmtpPort { get; set; } = 587;
    public string? SmtpUser { get; set; }
    public string? SmtpPass { get; set; }
    public string SenderEmail { get; set; } = "noreply@healthbridge.com";
    public string SenderName { get; set; } = "HealthBridge System";
}
