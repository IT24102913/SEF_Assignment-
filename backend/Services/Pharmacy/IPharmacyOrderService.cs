using HealthBridge.Api.DTOs.Pharmacy;

namespace HealthBridge.Api.Services;

public interface IPharmacyOrderService
{
    Task<IEnumerable<PharmacyOrderResponse>> GetAllOrdersAsync();
    Task<PharmacyOrderResponse?> GetOrderByIdAsync(int id);
    Task<IEnumerable<PharmacyOrderResponse>> GetOrdersByPatientIdAsync(int patientId);
    Task<PharmacyOrderResponse> CreateOrderAsync(CreatePharmacyOrderRequest request);
    Task<PharmacyOrderResponse?> UpdateOrderStatusAsync(int id, UpdatePharmacyOrderStatusRequest request);
    Task<bool> DeleteOrderAsync(int id);
    Task<PrescriptionSafetyResponse?> ValidateOrderSafetyAsync(int id);
}
