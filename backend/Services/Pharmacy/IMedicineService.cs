using HealthBridge.Api.DTOs.Medicine;

namespace HealthBridge.Api.Services;

public interface IMedicineService
{
    Task<IEnumerable<MedicineResponse>> GetAllMedicinesAsync();
    Task<MedicineResponse?> GetMedicineByIdAsync(int id);
    Task<MedicineResponse> CreateMedicineAsync(CreateMedicineRequest request);
    Task<MedicineResponse?> UpdateMedicineAsync(int id, UpdateMedicineRequest request);
    Task<MedicineResponse?> RestockMedicineAsync(int id, int additionalQuantity);
    Task<MedicineResponse?> SetStockQuantityAsync(int id, int newQuantity);
    Task<bool> DeleteMedicineAsync(int id);
}
