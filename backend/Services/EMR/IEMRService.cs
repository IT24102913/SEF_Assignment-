using LabManagement.API.DTOs.EMR;

namespace LabManagement.API.Services.EMR;

public interface IEMRService
{
    // Patients
    Task<IEnumerable<PatientDto>> GetAllPatientsAsync(string? search = null);
    Task<PatientDto?> GetPatientByIdAsync(Guid id);
    Task<PatientDto?> GetPatientByCodeAsync(string code);
    Task<PatientDto> CreatePatientAsync(CreatePatientDto dto);
    Task<PatientDto?> UpdatePatientAsync(Guid id, UpdatePatientDto dto);
    Task<PatientDto?> UpdatePatientByCodeAsync(string patientCode, UpdatePatientDto dto);

    // Consultation Notes
    Task<IEnumerable<ConsultationNoteDto>> GetConsultationsAsync(string? patientCode = null);
    Task<ConsultationNoteDto?> GetConsultationByIdAsync(Guid id);
    Task<ConsultationNoteDto> CreateConsultationAsync(CreateConsultationNoteDto dto);
    Task<bool> DeleteConsultationAsync(Guid id);

    // Lab Reports
    Task<IEnumerable<LabReportDto>> GetLabReportsAsync(string? patientCode = null);
    Task<LabReportDto?> GetLabReportByIdAsync(Guid id);
    Task<LabReportDto> CreateLabReportAsync(CreateLabReportDto dto);
    Task<LabReportDto?> UpdateLabReportStatusAsync(Guid id, UpdateLabReportStatusDto dto);
    Task<bool> DeleteLabReportAsync(Guid id);

    // Prescriptions
    Task<IEnumerable<PrescriptionDto>> GetPrescriptionsAsync(string? patientCode = null);
    Task<PrescriptionDto?> GetPrescriptionByIdAsync(Guid id);
    Task<PrescriptionDto> CreatePrescriptionAsync(CreatePrescriptionDto dto);
    Task<PrescriptionDto?> UpdatePrescriptionStatusAsync(Guid id, UpdatePrescriptionStatusDto dto);
    Task<bool> DeletePrescriptionAsync(Guid id);

    // Channeling Appointments
    Task<IEnumerable<ChannelingAppointmentDto>> GetChannelingAppointmentsAsync(string? patientCode = null);
    Task<ChannelingAppointmentDto> CreateChannelingAppointmentAsync(CreateChannelingAppointmentDto dto);

    // Business-Specific Operation
    Task<ClinicalSummaryDto?> GenerateClinicalSummaryAsync(string patientCodeOrId);
}
