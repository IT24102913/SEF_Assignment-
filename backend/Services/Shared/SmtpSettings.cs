namespace HealthBridge.Api.Services;

public class SmtpSettings
{
    public const string SectionName = "SmtpSettings";

    public string SmtpServer { get; set; } = "smtp.gmail.com";
    public int SmtpPort { get; set; } = 465;
    public string? SmtpUser { get; set; } = "teeranya123danansuriya@gmail.com";
    public string? SmtpPass { get; set; } = "rvci rqxr toba cxgg";
    public string SenderEmail { get; set; } = "teeranya123danansuriya@gmail.com";
    public string SenderName { get; set; } = "Health Bridge Hospital";
}
