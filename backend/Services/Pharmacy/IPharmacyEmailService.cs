using HealthBridge.Api.DTOs.Pharmacy;

namespace HealthBridge.Api.Services;

public interface IPharmacyEmailService
{
    Task SendPharmacyOrderNotificationAsync(
        string toEmail,
        string patientName,
        string orderNumber,
        string status,
        decimal totalAmount,
        string? paymentMethod,
        string? deliveryAddress,
        List<PharmacyOrderItemResponse>? items,
        string? adminNote = null);

    Task SendSalesReportAsync(
        string toEmail,
        string note,
        decimal totalRevenue,
        int totalOrders,
        string reportDate,
        List<PharmacyOrderReportItemDto>? items);
}
