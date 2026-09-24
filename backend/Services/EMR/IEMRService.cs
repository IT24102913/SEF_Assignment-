using HealthBridge.Api.DTOs.EMR;

namespace HealthBridge.Api.Services.EMR;

public interface IEMRService
{
    // Patients
    Task<IEnumerable<PatientDto>> GetAllPatientsAsync(string? search = null);
    Task<PatientDto?> GetPatientByIdAsync(Guid id);
    Task<PatientDto?> GetPatientByCodeAsync(string code);
    Task<PatientDto?> GetPatientByUserIdAsync(int userId);
    Task<PatientDto> CreatePatientAsync(CreatePatientDto dto);
    Task<PatientDto?> UpdatePatientAsync(Guid id, UpdatePatientDto dto);
    Task<PatientDto?> UpdatePatientByCodeAsync(string patientCode, UpdatePatientDto dto);

    // Consultation Notes
    Task<IEnumerable<ConsultationNoteDto>> GetConsultationsAsync(string? patientCode = null, string? search = null, string? doctorName = null);
    Task<ConsultationNoteDto?> GetConsultationByIdAsync(Guid id);
    Task<ConsultationNoteDto> CreateConsultationAsync(CreateConsultationNoteDto dto);
    Task<bool> DeleteConsultationAsync(Guid id);

    // Lab Reports
    Task<IEnumerable<LabReportDto>> GetLabReportsAsync(string? patientCode = null, string? search = null, string? category = null, string? status = null);
    Task<LabReportDto?> GetLabReportByIdAsync(Guid id);
    Task<LabReportDto> CreateLabReportAsync(CreateLabReportDto dto);
    Task<LabReportDto?> UpdateLabReportStatusAsync(Guid id, UpdateLabReportStatusDto dto);
    Task<bool> DeleteLabReportAsync(Guid id);

    // Prescriptions
    Task<IEnumerable<PrescriptionDto>> GetPrescriptionsAsync(string? patientCode = null, string? search = null, string? status = null, string? doctorName = null);
    Task<PrescriptionDto?> GetPrescriptionByIdAsync(Guid id);
    Task<PrescriptionDto> CreatePrescriptionAsync(CreatePrescriptionDto dto);
    Task<IEnumerable<PrescriptionDto>> CreatePrescriptionsBatchAsync(BatchCreatePrescriptionsDto dto);
    Task<PrescriptionDto?> UpdatePrescriptionStatusAsync(Guid id, UpdatePrescriptionStatusDto dto);
    Task<bool> DeletePrescriptionAsync(Guid id);

    // Channeling Appointments
    Task<IEnumerable<ChannelingAppointmentDto>> GetChannelingAppointmentsAsync(string? patientCode = null);
    Task<ChannelingAppointmentDto> CreateChannelingAppointmentAsync(CreateChannelingAppointmentDto dto);

    // Business-Specific Operation
    Task<ClinicalSummaryDto?> GenerateClinicalSummaryAsync(string patientCodeOrId);

    // Notifications (100% User-Specific and Role-Based)
    Task<IEnumerable<EMRNotificationDto>> GetUserNotificationsAsync(int userId, string role);
}
