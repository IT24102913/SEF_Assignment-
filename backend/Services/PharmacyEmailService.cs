using MailKit.Net.Smtp;
using MimeKit;
using HealthBridge.Api.DTOs.Pharmacy;
using System.Net;
using System.Net.Sockets;

namespace HealthBridge.Api.Services;

public class PharmacyEmailService : IPharmacyEmailService
{
    private readonly IConfiguration _config;
    private readonly ILogger<PharmacyEmailService> _logger;
    private readonly HttpClient _httpClient;

    public PharmacyEmailService(IConfiguration config, ILogger<PharmacyEmailService> logger, IHttpClientFactory? httpClientFactory = null)
    {
        _config = config;
        _logger = logger;
        _httpClient = httpClientFactory?.CreateClient() ?? new HttpClient();
    }

    private async Task SendEmailAsync(string toEmail, string toName, string subject, string htmlContent, byte[]? qrPngBytes = null, string? qrPayload = null)
    {
        var fromEmail = _config["PharmacyBrevo:FromEmail"] 
            ?? Environment.GetEnvironmentVariable("PharmacyBrevo__FromEmail") 
            ?? _config["Brevo:FromEmail"] 
            ?? Environment.GetEnvironmentVariable("Brevo__FromEmail") 
            ?? "diniruga@gmail.com";

        var fromName = _config["PharmacyBrevo:FromName"] 
            ?? Environment.GetEnvironmentVariable("PharmacyBrevo__FromName") 
            ?? _config["Brevo:FromName"] 
            ?? Environment.GetEnvironmentVariable("Brevo__FromName") 
            ?? "Health Bridge Pharmacy";

        var apiKey = _config["PharmacyBrevo:ApiKey"] 
            ?? Environment.GetEnvironmentVariable("PharmacyBrevo__ApiKey") 
            ?? _config["Brevo:ApiKey"] 
            ?? Environment.GetEnvironmentVariable("Brevo__ApiKey");

        _logger.LogInformation("[PharmacyEmail] Attempting to send email FROM={From} TO={To} SUBJECT={Subject}", fromEmail, toEmail, subject);

        string processedHtml = htmlContent;
        var attachments = new List<object>();

        if (!string.IsNullOrWhiteSpace(qrPayload))
        {
            var qrUrl = $"https://api.qrserver.com/v1/create-qr-code/?size=220x220&format=png&data={Uri.EscapeDataString(qrPayload)}";
            processedHtml = processedHtml.Replace("cid:appointment_qr_code", qrUrl, StringComparison.OrdinalIgnoreCase)
                                         .Replace("cid:order_qr_code", qrUrl, StringComparison.OrdinalIgnoreCase);
        }

        if (qrPngBytes != null && qrPngBytes.Length > 0)
        {
            var base64Qr = Convert.ToBase64String(qrPngBytes);
            var dataUri = $"data:image/png;base64,{base64Qr}";
            processedHtml = processedHtml.Replace("cid:appointment_qr_code", dataUri, StringComparison.OrdinalIgnoreCase)
                                         .Replace("cid:order_qr_code", dataUri, StringComparison.OrdinalIgnoreCase);

            attachments.Add(new
            {
                name = "qr_code.png",
                content = base64Qr
            });
        }

        // 1. Try Brevo HTTPS REST API first (Cloud/Railway safe — ports 587/465 are blocked by Railway firewall)
        if (!string.IsNullOrWhiteSpace(apiKey) && !apiKey.StartsWith("YOUR_"))
        {
            try
            {
                var payload = new
                {
                    sender = new { name = fromName, email = fromEmail },
                    to = new[] { new { email = toEmail, name = string.IsNullOrWhiteSpace(toName) ? toEmail : toName } },
                    subject = subject,
                    htmlContent = processedHtml,
                    attachment = attachments.Count > 0 ? attachments : null
                };

                using var requestMsg = new HttpRequestMessage(HttpMethod.Post, "https://api.brevo.com/v3/smtp/email");
                requestMsg.Headers.Add("api-key", apiKey);
                requestMsg.Headers.Add("Accept", "application/json");
                requestMsg.Content = new StringContent(
                    System.Text.Json.JsonSerializer.Serialize(payload, new System.Text.Json.JsonSerializerOptions { DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull }),
                    System.Text.Encoding.UTF8,
                    "application/json");

                using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(12));
                var response = await _httpClient.SendAsync(requestMsg, cts.Token);
                var responseBody = await response.Content.ReadAsStringAsync(cts.Token);

                if (response.IsSuccessStatusCode)
                {
                    _logger.LogInformation("[PharmacyEmail] ✅ Email sent successfully to {Email} via Brevo HTTP REST API", toEmail);
                    return;
                }
                else
                {
                    _logger.LogWarning("[PharmacyEmail] ⚠️ Brevo HTTP REST API returned {StatusCode}: {Body}. Trying SMTP fallback...", response.StatusCode, responseBody);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "[PharmacyEmail] ⚠️ Brevo HTTP REST API exception: {Message}. Trying SMTP fallback...", ex.Message);
            }
        }

        // 2. Fail-safe SMTP fallback (for local development or environments where SMTP port is unblocked)
        try
        {
            var smtpServer = _config["PharmacyBrevo:SmtpServer"] ?? Environment.GetEnvironmentVariable("PharmacyBrevo__SmtpServer") ?? _config["Brevo:SmtpServer"] ?? Environment.GetEnvironmentVariable("Brevo__SmtpServer") ?? "smtp.gmail.com";
            var smtpPortStr = _config["PharmacyBrevo:SmtpPort"] ?? Environment.GetEnvironmentVariable("PharmacyBrevo__SmtpPort") ?? _config["Brevo:SmtpPort"] ?? Environment.GetEnvironmentVariable("Brevo__SmtpPort");
            var smtpPort = !string.IsNullOrEmpty(smtpPortStr) && int.TryParse(smtpPortStr, out int p) ? p : 587;
            var smtpUser = _config["PharmacyBrevo:SmtpUser"] ?? Environment.GetEnvironmentVariable("PharmacyBrevo__SmtpUser") ?? _config["Brevo:SmtpUser"] ?? Environment.GetEnvironmentVariable("Brevo__SmtpUser") ?? "Healthbridgeyourpharmacy@gmail.com";
            var smtpPass = _config["PharmacyBrevo:SmtpPass"] ?? Environment.GetEnvironmentVariable("PharmacyBrevo__SmtpPass") ?? _config["Brevo:SmtpPass"] ?? Environment.GetEnvironmentVariable("Brevo__SmtpPass") ?? "yquswsakkintccqc";

            var message = new MimeMessage();
            message.From.Add(new MailboxAddress(fromName, fromEmail));
            message.To.Add(new MailboxAddress(toName, toEmail));
            message.Subject = subject;

            var bodyBuilder = new BodyBuilder { HtmlBody = processedHtml };
            if (qrPngBytes != null && qrPngBytes.Length > 0)
            {
                bodyBuilder.Attachments.Add("qr_code.png", qrPngBytes, new ContentType("image", "png"));
            }
            message.Body = bodyBuilder.ToMessageBody();

            // Resolve IPv4 explicitly to avoid Linux IPv6 routing timeouts
            string connectHost = smtpServer;
            try
            {
                var hostAddresses = await Dns.GetHostAddressesAsync(smtpServer);
                var ipv4 = hostAddresses.FirstOrDefault(a => a.AddressFamily == AddressFamily.InterNetwork);
                if (ipv4 != null)
                {
                    connectHost = ipv4.ToString();
                }
            }
            catch (Exception dnsEx)
            {
                _logger.LogWarning(dnsEx, "[PharmacyEmail] DNS resolution fallback to hostname {Server}", smtpServer);
            }

            try
            {
                using var client = new SmtpClient();
                client.CheckCertificateRevocation = false;
                client.ServerCertificateValidationCallback = (s, c, h, e) => true;

                using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(10));
                var socketOptions = smtpPort == 465 ? MailKit.Security.SecureSocketOptions.SslOnConnect : MailKit.Security.SecureSocketOptions.StartTls;
                await client.ConnectAsync(connectHost, smtpPort, socketOptions, cts.Token);
                await client.AuthenticateAsync(smtpUser, smtpPass, cts.Token);
                await client.SendAsync(message, cts.Token);
                await client.DisconnectAsync(true, cts.Token);

                _logger.LogInformation("[PharmacyEmail] ✅ Email sent successfully to {Email} via SMTP ({Server}:{Port})", toEmail, smtpServer, smtpPort);
                return;
            }
            catch (Exception primaryEx)
            {
                _logger.LogWarning("[PharmacyEmail] ⚠️ Primary SMTP connection on port {Port} failed: {Msg}. Retrying via SSL Port 465...", smtpPort, primaryEx.Message);

                if (smtpPort != 465)
                {
                    using var fallbackClient = new SmtpClient();
                    fallbackClient.CheckCertificateRevocation = false;
                    fallbackClient.ServerCertificateValidationCallback = (s, c, h, e) => true;

                    using var fallbackCts = new CancellationTokenSource(TimeSpan.FromSeconds(10));
                    await fallbackClient.ConnectAsync(connectHost, 465, MailKit.Security.SecureSocketOptions.SslOnConnect, fallbackCts.Token);
                    await fallbackClient.AuthenticateAsync(smtpUser, smtpPass, fallbackCts.Token);
                    await fallbackClient.SendAsync(message, fallbackCts.Token);
                    await fallbackClient.DisconnectAsync(true, fallbackCts.Token);

                    _logger.LogInformation("[PharmacyEmail] ✅ Email sent successfully to {Email} via SMTP SSL Port 465 fallback", toEmail);
                    return;
                }
                throw;
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[PharmacyEmail] ❌ FAILED to send email to {Email}. Error: {Message}", toEmail, ex.Message);
        }
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
                <h2 style='margin: 0; font-size: 20px; font-weight: 900;'>HEALTH BRIDGE PHARMACY</h2>
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

    public async Task SendSalesReportAsync(string toEmail, string note, decimal totalRevenue, int totalOrders, string reportDate, List<PharmacyOrderReportItemDto>? items)
    {
        var subject = $"📊 Health Bridge Pharmacy POS Sales Report - {reportDate}";

        var rowsHtml = "";
        if (items != null && items.Any())
        {
            foreach (var item in items)
            {
                rowsHtml += $@"
                <tr style='border-bottom: 1px solid #f1f5f9;'>
                    <td style='padding: 10px 12px; font-weight: 700; color: #0284c7;'>{item.OrderNumber}</td>
                    <td style='padding: 10px 12px; color: #475569;'>{item.Date}</td>
                    <td style='padding: 10px 12px; color: #1e293b; font-weight: 600;'>{item.CustomerName}</td>
                    <td style='padding: 10px 12px; text-align: center;'><span style='background: #d1fae5; color: #065f46; padding: 2px 8px; border-radius: 6px; font-size: 11px; font-weight: 700;'>{item.Status}</span></td>
                    <td style='padding: 10px 12px; text-align: right; font-weight: 800; color: #059669;'>LKR {item.TotalAmount:N2}</td>
                </tr>";
            }
        }
        else
        {
            rowsHtml = @"
            <tr>
                <td colspan='5' style='padding: 12px; color: #64748b; font-style: italic; text-align: center;'>No individual orders recorded for this shift.</td>
            </tr>";
        }

        var html = $@"
        <div style='font-family: -apple-system, BlinkMacSystemFont, Arial, sans-serif; max-width: 640px; margin: auto; padding: 24px; border-radius: 16px; background: #ffffff; border: 1px solid #e2e8f0;'>
            <div style='background: #0f172a; color: white; padding: 22px 24px; border-radius: 12px; margin-bottom: 20px;'>
                <h2 style='margin: 0; font-size: 20px; font-weight: 900;'>HEALTH BRIDGE PHARMACY POS</h2>
                <p style='margin: 6px 0 0 0; font-size: 13.5px; opacity: 0.9;'>Official Sales & Revenue Report • {reportDate}</p>
            </div>

            <div style='background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin-bottom: 20px;'>
                <div style='display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;'>
                    <span style='font-size: 13px; color: #64748b; font-weight: 700;'>Shift Total Revenue:</span>
                    <span style='font-size: 22px; font-weight: 900; color: #059669;'>LKR {totalRevenue:N2}</span>
                </div>
                <div style='display: flex; justify-content: space-between; align-items: center;'>
                    <span style='font-size: 13px; color: #64748b; font-weight: 700;'>Completed Orders:</span>
                    <span style='font-size: 16px; font-weight: 800; color: #0f172a;'>{totalOrders} Orders</span>
                </div>
            </div>

            {(!string.IsNullOrWhiteSpace(note) ? $@"
            <div style='background: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 14px 16px; margin-bottom: 20px;'>
                <strong style='color: #b45309; font-size: 13px;'>📝 Pharmacist / Cashier Note:</strong>
                <p style='margin: 4px 0 0 0; color: #92400e; font-size: 13.5px;'>{note}</p>
            </div>" : "")}

            <h3 style='font-size: 14px; font-weight: 800; color: #334155; margin: 20px 0 10px 0;'>Sales Transaction Breakdown</h3>
            <table style='width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 20px;'>
                <thead>
                    <tr style='background: #f1f5f9; color: #475569; text-align: left;'>
                        <th style='padding: 10px 12px;'>Order Ref</th>
                        <th style='padding: 10px 12px;'>Date</th>
                        <th style='padding: 10px 12px;'>Customer</th>
                        <th style='padding: 10px 12px; text-align: center;'>Status</th>
                        <th style='padding: 10px 12px; text-align: right;'>Amount</th>
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
}
