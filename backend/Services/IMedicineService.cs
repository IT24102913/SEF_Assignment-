using HealthBridge.Api.DTOs.Medicine;

namespace HealthBridge.Api.Services;

public interface IMedicineService
{
    Task<IEnumerable<MedicineResponse>> GetAllMedicinesAsync();
    Task<MedicineResponse?> GetMedicineByIdAsync(int id);
    Task<MedicineResponse> CreateMedicineAsync(CreateMedicineRequest request);
    Task<MedicineResponse?> UpdateMedicineAsync(int id, UpdateMedicineRequest request);
    Task<bool> DeleteMedicineAsync(int id);
}
