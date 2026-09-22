using HealthBridge.Api.DTOs.Patient;

namespace HealthBridge.Api.Services;

public interface IPatientService
{
    Task<IEnumerable<PatientResponse>> GetAllPatientsAsync();
    Task<PatientResponse?> GetPatientByIdAsync(int id);
    Task<PatientResponse?> GetPatientByUserIdAsync(int userId);
    Task<PatientResponse?> UpdatePatientProfileAsync(int id, UpdatePatientProfileRequest request);
    Task<bool> TogglePatientStatusAsync(int id);
}
