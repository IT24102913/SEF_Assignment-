using HealthBridge.Api.DTOs.Pharmacy;

namespace HealthBridge.Api.Services;

public interface IPrescriptionService
{
    Task<IEnumerable<PrescriptionResponse>> GetAllPrescriptionsAsync();
    Task<PrescriptionResponse?> GetPrescriptionByIdAsync(int id);
    Task<IEnumerable<PrescriptionResponse>> GetPrescriptionsByPatientIdAsync(int patientId);
    Task<PrescriptionResponse> CreatePrescriptionAsync(CreatePrescriptionRequest request);
    Task<PrescriptionResponse?> UpdatePrescriptionStatusAsync(int id, UpdatePrescriptionStatusRequest request);
    Task<bool> DeletePrescriptionAsync(int id);
}
