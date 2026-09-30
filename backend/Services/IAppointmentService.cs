using HealthBridge.Api.DTOs.Appointments;

namespace HealthBridge.Api.Services;

public interface IAppointmentService
{
    Task<List<DoctorDto>> GetDoctorsAsync(string? search, string? specialization, string? hospitalBranch, string? date, string? sortBy);
    Task<List<SpecialtyCountDto>> GetSpecialtiesAsync();
    Task<DoctorDto?> GetDoctorByIdAsync(int id);
    Task<List<DoctorSessionDto>> GetDoctorSessionsAsync(int doctorId, DateOnly? date);
    Task<AppointmentDto> BookAppointmentAsync(BookAppointmentRequest request, int? patientId);
    Task<AppointmentDto> ProcessPaymentAsync(int appointmentId, PaymentRequest request);
    Task<AppointmentDto> CancelAppointmentAsync(int appointmentId, int? patientId);
    Task<AppointmentDto> RescheduleAppointmentAsync(int appointmentId, int newSessionId, int? patientId);
    Task<List<AppointmentDto>> GetMyAppointmentsAsync(int? patientId, string? patientEmail, string? status);
    Task<List<AppointmentDto>> GetAllAppointmentsAsync(string? search, string? status, int? doctorId);
    Task<AppointmentDto> UpdateStatusAsync(int appointmentId, string status, string? notes);
    Task<DoctorStatsDto> GetStatsAsync();
    Task<bool> DeleteAppointmentAsync(int appointmentId);
}
