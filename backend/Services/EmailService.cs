using MailKit.Net.Smtp;
using MimeKit;
using HealthBridge.Api.DTOs.Pharmacy;

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
    Task SendOrderCompletedAsync(string toEmail, string patientName, string testName, string? reportUrl = null);
    Task SendSalesReportAsync(string toEmail, string note, decimal totalRevenue, int totalOrders, string reportDate, List<PharmacyOrderReportItemDto>? items);
    Task SendPharmacyOrderNotificationAsync(string toEmail, string patientName, string orderNumber, string status, decimal totalAmount, string? paymentMethod, string? deliveryAddress, List<PharmacyOrderItemResponse>? items, string? adminNote = null);
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
        var fromName = _config["Brevo:FromName"] ?? "Health Bridge Pharmacy";

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
            await client.AuthenticateAsync(smtpUser ?? string.Empty, smtpPass ?? string.Empty);
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

    public async Task SendSalesReportAsync(string toEmail, string note, decimal totalRevenue, int totalOrders, string reportDate, List<PharmacyOrderReportItemDto>? items)
    {
        var subject = $"📊 Health Bridge Pharmacy POS Sales Report - {reportDate}";

        var rowsHtml = "";
        if (items != null && items.Any())
        {
            foreach (var item in items)
            {
                rowsHtml += $@"
                <tr style='border-bottom: 1px solid #e2e8f0;'>
                    <td style='padding: 10px; font-weight: 700; color: #059669;'>#{item.OrderNumber}</td>
                    <td style='padding: 10px; color: #475569;'>{item.Date}</td>
                    <td style='padding: 10px; color: #0f172a; font-weight: 600;'>{item.CustomerName}</td>
                    <td style='padding: 10px; font-weight: 800; color: #0f172a;'>LKR {item.TotalAmount:N2}</td>
                    <td style='padding: 10px;'><span style='background: #d1fae5; color: #065f46; padding: 2px 8px; border-radius: 6px; font-size: 11px; font-weight: 700;'>{item.Status}</span></td>
                </tr>";
            }
        }

        var noteBlock = string.IsNullOrWhiteSpace(note) ? "" : $@"
        <div style='background: #f0fdf4; border-left: 4px solid #16a34a; padding: 12px 16px; border-radius: 8px; margin-bottom: 20px;'>
            <strong style='color: #15803d; font-size: 13px;'>Note from Staff:</strong>
            <p style='margin: 4px 0 0 0; color: #166534; font-size: 13.5px;'>{note}</p>
        </div>";

        var html = $@"
        <div style='font-family: -apple-system, BlinkMacSystemFont, Arial, sans-serif; max-width: 680px; margin: auto; padding: 28px; border-radius: 16px; background: #ffffff; border: 1px solid #e2e8f0;'>
            <div style='text-align: center; border-bottom: 2px dashed #059669; padding-bottom: 18px; margin-bottom: 20px;'>
                <h2 style='margin: 0; font-size: 22px; font-weight: 900; color: #064e3b;'>🏥 HEALTH BRIDGE PHARMACY</h2>
                <p style='margin: 4px 0 0 0; font-size: 13px; color: #475569; font-weight: 600;'>Executive POS Sales & Revenue Report • {reportDate}</p>
            </div>

            {noteBlock}

            <div style='display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 24px;'>
                <div style='background: #f8fafc; padding: 16px; border-radius: 12px; border: 1px solid #e2e8f0;'>
                    <div style='font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase;'>Total Orders Processed</div>
                    <div style='font-size: 22px; font-weight: 900; color: #0f172a; margin-top: 4px;'>{totalOrders} Orders</div>
                </div>
                <div style='background: #ecfdf5; padding: 16px; border-radius: 12px; border: 1px solid #a7f3d0;'>
                    <div style='font-size: 11px; color: #047857; font-weight: 700; text-transform: uppercase;'>Total Sales Volume</div>
                    <div style='font-size: 22px; font-weight: 900; color: #059669; margin-top: 4px;'>LKR {totalRevenue:N2}</div>
                </div>
            </div>

            <h3 style='font-size: 15px; font-weight: 800; color: #334155; margin-bottom: 12px;'>Recent Transaction Breakdown</h3>
            <table style='width: 100%; border-collapse: collapse; font-size: 12.5px; text-align: left; margin-bottom: 24px;'>
                <thead>
                    <tr style='background: #f1f5f9; color: #475569;'>
                        <th style='padding: 10px;'>Order #</th>
                        <th style='padding: 10px;'>Date</th>
                        <th style='padding: 10px;'>Customer</th>
                        <th style='padding: 10px;'>Total Amount</th>
                        <th style='padding: 10px;'>Status</th>
                    </tr>
                </thead>
                <tbody>
                    {rowsHtml}
                </tbody>
            </table>

            <div style='border-top: 1px solid #f1f5f9; padding-top: 16px; text-align: center; color: #94a3b8; font-size: 11.5px;'>
                Health Bridge Dispensary POS Analytics • Automated Official Report
            </div>
        </div>";

        await SendEmailAsync(toEmail, "Pharmacy Management", subject, html);
    }

    public async Task SendPharmacyOrderNotificationAsync(
        string toEmail,
        string patientName,
        string orderNumber,
        string status,
        decimal totalAmount,
        string? paymentMethod,
        string? deliveryAddress,
        List<PharmacyOrderItemResponse>? items,
        string? adminNote = null)
    {
        if (string.IsNullOrWhiteSpace(toEmail)) return;

        string normalizedStatus = status?.Trim() ?? "PendingVerification";
        string headerBg = "#0284C7";
        string statusBadgeBg = "#e0f2fe";
        string statusBadgeFg = "#0369a1";
        string statusText = "Pending Verification";
        string headline = "We have received your pharmacy order!";
        string subject = $"🛒 Order Received: {orderNumber} - Health Bridge Pharmacy";

        int activeStep = 1;

        if (normalizedStatus.Equals("Confirmed", StringComparison.OrdinalIgnoreCase))
        {
            headerBg = "#059669";
            statusBadgeBg = "#d1fae5";
            statusBadgeFg = "#065f46";
            statusText = "Order Confirmed & Quoted";
            headline = "Your order has been verified and confirmed!";
            subject = $"✅ Order Confirmed: {orderNumber} - Health Bridge Pharmacy";
            activeStep = 2;
        }
        else if (normalizedStatus.Equals("Dispatched", StringComparison.OrdinalIgnoreCase) ||
                 normalizedStatus.Equals("Shipped", StringComparison.OrdinalIgnoreCase) ||
                 normalizedStatus.Equals("OutForDelivery", StringComparison.OrdinalIgnoreCase))
        {
            headerBg = "#2563EB";
            statusBadgeBg = "#dbeafe";
            statusBadgeFg = "#1e40af";
            statusText = "Out for Delivery";
            headline = "Your order is packaged and out for delivery!";
            subject = $"🚚 Order Shipped / Out for Delivery: {orderNumber} - Health Bridge Pharmacy";
            activeStep = 3;
        }
        else if (normalizedStatus.Equals("Delivered", StringComparison.OrdinalIgnoreCase) ||
                 normalizedStatus.Equals("Completed", StringComparison.OrdinalIgnoreCase))
        {
            headerBg = "#15803D";
            statusBadgeBg = "#dcfce7";
            statusBadgeFg = "#166534";
            statusText = "Delivered";
            headline = "Your order has been successfully delivered!";
            subject = $"🎉 Order Delivered: {orderNumber} - Health Bridge Pharmacy";
            activeStep = 4;
        }
        else if (normalizedStatus.Equals("Cancelled", StringComparison.OrdinalIgnoreCase) ||
                 normalizedStatus.Equals("Rejected", StringComparison.OrdinalIgnoreCase))
        {
            headerBg = "#DC2626";
            statusBadgeBg = "#fee2e2";
            statusBadgeFg = "#991b1b";
            statusText = "Cancelled";
            headline = "Your pharmacy order has been cancelled.";
            subject = $"❌ Order Cancelled: {orderNumber} - Health Bridge Pharmacy";
            activeStep = 0;
        }

        var step1Color = activeStep >= 1 ? "#059669" : "#cbd5e1";
        var step2Color = activeStep >= 2 ? "#059669" : "#cbd5e1";
        var step3Color = activeStep >= 3 ? "#059669" : "#cbd5e1";
        var step4Color = activeStep >= 4 ? "#059669" : "#cbd5e1";

        var stepperHtml = activeStep > 0 ? $@"
        <div style='background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin: 20px 0; text-align: center;'>
            <div style='font-size: 11px; font-weight: 800; color: #64748b; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 14px;'>ORDER LIVE PROGRESS</div>
            <table style='width: 100%; border-collapse: collapse;'>
                <tr>
                    <td style='text-align: center; width: 25%; font-size: 12px; font-weight: 700; color: {step1Color};'>
                        <div style='width: 28px; height: 28px; border-radius: 50%; background: {step1Color}; color: white; line-height: 28px; margin: 0 auto 6px auto; font-weight: 800;'>✓</div>
                        Order Placed
                    </td>
                    <td style='text-align: center; width: 25%; font-size: 12px; font-weight: 700; color: {step2Color};'>
                        <div style='width: 28px; height: 28px; border-radius: 50%; background: {step2Color}; color: white; line-height: 28px; margin: 0 auto 6px auto; font-weight: 800;'>{(activeStep >= 2 ? "✓" : "2")}</div>
                        Confirmed
                    </td>
                    <td style='text-align: center; width: 25%; font-size: 12px; font-weight: 700; color: {step3Color};'>
                        <div style='width: 28px; height: 28px; border-radius: 50%; background: {step3Color}; color: white; line-height: 28px; margin: 0 auto 6px auto; font-weight: 800;'>{(activeStep >= 3 ? "✓" : "3")}</div>
                        Shipped
                    </td>
                    <td style='text-align: center; width: 25%; font-size: 12px; font-weight: 700; color: {step4Color};'>
                        <div style='width: 28px; height: 28px; border-radius: 50%; background: {step4Color}; color: white; line-height: 28px; margin: 0 auto 6px auto; font-weight: 800;'>{(activeStep >= 4 ? "✓" : "4")}</div>
                        Delivered
                    </td>
                </tr>
            </table>
        </div>" : "";

        var itemsHtml = "";
        if (items != null && items.Any())
        {
            foreach (var item in items)
            {
                itemsHtml += $@"
                <tr style='border-bottom: 1px solid #f1f5f9;'>
                    <td style='padding: 10px 12px; font-weight: 700; color: #1e293b;'>{item.MedicineName}</td>
                    <td style='padding: 10px 12px; text-align: center; color: #475569;'>{item.Quantity} {item.UnitType}</td>
                    <td style='padding: 10px 12px; text-align: right; font-weight: 800; color: #059669;'>LKR {item.Subtotal:N2}</td>
                </tr>";
            }
        }
        else
        {
            itemsHtml = @"
            <tr>
                <td colspan='3' style='padding: 12px; color: #64748b; font-style: italic; text-align: center;'>Custom Doctor Prescription Attachment Submitted (Items quoted by Pharmacist)</td>
            </tr>";
        }

        var noteHtml = !string.IsNullOrWhiteSpace(adminNote) ? $@"
        <div style='background: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 14px 16px; margin: 20px 0;'>
            <strong style='color: #b45309; font-size: 13px;'>💬 Pharmacist Note:</strong>
            <p style='margin: 4px 0 0 0; color: #92400e; font-size: 13.5px; line-height: 1.5;'>{adminNote}</p>
        </div>" : "";

        var html = $@"
        <div style='font-family: -apple-system, BlinkMacSystemFont, Arial, sans-serif; max-width: 640px; margin: auto; padding: 24px; border-radius: 16px; background: #ffffff; border: 1px solid #e2e8f0;'>
            <div style='background: {headerBg}; color: white; padding: 22px 24px; border-radius: 12px; margin-bottom: 20px;'>
                <h2 style='margin: 0; font-size: 20px; font-weight: 900;'>🏥 HEALTH BRIDGE PHARMACY</h2>
                <p style='margin: 8px 0 0 0; font-size: 14px; opacity: 0.95; font-weight: 600;'>{headline}</p>
            </div>

            <div style='padding: 0 4px;'>
                <p style='font-size: 15px; color: #1e293b; margin-top: 0;'>Dear <strong>{patientName}</strong>,</p>

                <div style='display: flex; align-items: center; justify-content: space-between; background: #f8fafc; border: 1px solid #e2e8f0; padding: 14px 18px; border-radius: 10px; margin-bottom: 16px;'>
                    <div>
                        <div style='font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase;'>Order Reference</div>
                        <div style='font-size: 16px; font-weight: 900; color: #0f172a; margin-top: 2px;'>{orderNumber}</div>
                    </div>
                    <div>
                        <span style='background: {statusBadgeBg}; color: {statusBadgeFg}; padding: 6px 14px; border-radius: 999px; font-weight: 800; font-size: 12.5px;'>{statusText}</span>
                    </div>
                </div>

                {stepperHtml}

                {noteHtml}

                <h3 style='font-size: 14px; font-weight: 800; color: #334155; margin: 20px 0 10px 0;'>Pharmaceutical Items Summary</h3>
                <table style='width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 16px;'>
                    <thead>
                        <tr style='background: #f1f5f9; color: #475569; text-align: left;'>
                            <th style='padding: 10px 12px; border-radius: 6px 0 0 6px;'>Medicine / Item</th>
                            <th style='padding: 10px 12px; text-align: center;'>Qty</th>
                            <th style='padding: 10px 12px; text-align: right; border-radius: 0 6px 6px 0;'>Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        {itemsHtml}
                    </tbody>
                </table>

                <div style='background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 12px; padding: 16px; margin-bottom: 20px;'>
                    <div style='display: flex; justify-content: space-between; align-items: center;'>
                        <span style='font-size: 13.5px; font-weight: 700; color: #065f46;'>Total Quoted Amount:</span>
                        <span style='font-size: 20px; font-weight: 900; color: #047857;'>LKR {totalAmount:N2}</span>
                    </div>
                    <div style='font-size: 12px; color: #047857; margin-top: 6px;'>
                        Payment Method: <strong>{paymentMethod ?? "Cash on Delivery"}</strong>
                    </div>
                    {(!string.IsNullOrWhiteSpace(deliveryAddress) ? $"<div style='font-size: 12px; color: #047857; margin-top: 4px;'>Delivery Address: <strong>{deliveryAddress}</strong></div>" : "")}
                </div>

                <p style='font-size: 13px; color: #475569; line-height: 1.5;'>
                    You can track your order live anytime by logging into the <strong>Health Bridge Mobile App</strong> or <strong>Patient Web Portal</strong>.
                </p>

                <div style='border-top: 1px solid #f1f5f9; padding-top: 16px; margin-top: 24px; text-align: center; color: #94a3b8; font-size: 11.5px;'>
                    Health Bridge Dispensary & Pharmacy Services • Colombo 03, Sri Lanka<br/>
                    This is an automated order tracking notification sent to {toEmail}.
                </div>
            </div>
        </div>";

        await SendEmailAsync(toEmail, patientName, subject, html);
    }
}


