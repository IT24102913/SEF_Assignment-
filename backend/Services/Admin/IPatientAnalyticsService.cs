using HealthBridge.Api.DTOs.Pharmacy;

namespace HealthBridge.Api.Services;

public interface IPatientAnalyticsService
{
    Task<PatientAnalyticsResponse?> GetPatientAnalyticsAsync(string patientEmail);
    Task<List<ViolatedPatientSummaryDto>> GetViolatedPatientsAsync();
}
