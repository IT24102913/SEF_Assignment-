using LabManagement.API.Data;
using LabManagement.API.DTOs.EMR;
using LabManagement.API.Models.EMR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace LabManagement.API.Services.EMR;

public class EMRService : IEMRService
{
    private readonly AppDbContext _db;
    private readonly ILogger<EMRService> _logger;

    public EMRService(AppDbContext db, ILogger<EMRService> logger)
    {
        _db = db;
        _logger = logger;
    }

    // ─── Patients ─────────────────────────────────────────────────────────────

    public async Task<IEnumerable<PatientDto>> GetAllPatientsAsync(string? search = null)
    {
        var query = _db.Patients.AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            query = query.Where(p =>
                p.PatientCode.ToLower().Contains(s) ||
                p.FullName.ToLower().Contains(s) ||
                p.Email.ToLower().Contains(s) ||
                p.ContactPhone.Contains(s));
        }

        var patients = await query.OrderBy(p => p.PatientCode).ToListAsync();
        return patients.Select(MapPatientToDto);
    }

    public async Task<PatientDto?> GetPatientByIdAsync(Guid id)
    {
        var patient = await _db.Patients.FindAsync(id);
        return patient == null ? null : MapPatientToDto(patient);
    }

    public async Task<PatientDto?> GetPatientByCodeAsync(string code)
    {
        var patient = await _db.Patients.FirstOrDefaultAsync(p => p.PatientCode.ToUpper() == code.Trim().ToUpper());
        return patient == null ? null : MapPatientToDto(patient);
    }

    public async Task<PatientDto> CreatePatientAsync(CreatePatientDto dto)
    {
        var code = string.IsNullOrWhiteSpace(dto.PatientCode)
            ? await GenerateNextPatientCodeAsync()
            : dto.PatientCode.Trim().ToUpper();

        var patient = new Patient
        {
            Id = Guid.NewGuid(),
            PatientCode = code,
            FullName = dto.FullName,
            DateOfBirth = DateTime.SpecifyKind(dto.DateOfBirth, DateTimeKind.Utc),
            Gender = dto.Gender,
            BloodGroup = dto.BloodGroup,
            ContactPhone = dto.ContactPhone,
            Email = dto.Email,
            Address = dto.Address,
            EmergencyContactName = dto.EmergencyContactName,
            EmergencyContactPhone = dto.EmergencyContactPhone,
            Allergies = dto.Allergies,
            ChronicConditions = dto.ChronicConditions,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _db.Patients.Add(patient);
        await _db.SaveChangesAsync();
        _logger.LogInformation("[EMR] Registered new patient: {Code} ({Name})", patient.PatientCode, patient.FullName);

        return MapPatientToDto(patient);
    }

    public async Task<PatientDto?> UpdatePatientAsync(Guid id, UpdatePatientDto dto)
    {
        var patient = await _db.Patients.FindAsync(id);
        if (patient == null) return null;

        patient.FullName = dto.FullName;
        patient.ContactPhone = dto.ContactPhone;
        patient.Email = dto.Email;
        patient.Address = dto.Address;
        patient.EmergencyContactName = dto.EmergencyContactName;
        patient.EmergencyContactPhone = dto.EmergencyContactPhone;
        patient.Allergies = dto.Allergies;
        patient.ChronicConditions = dto.ChronicConditions;
        patient.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return MapPatientToDto(patient);
    }

    // ─── Consultation Notes ───────────────────────────────────────────────────

    public async Task<IEnumerable<ConsultationNoteDto>> GetConsultationsAsync(string? patientCode = null)
    {
        var query = _db.ConsultationNotes.AsQueryable();

        if (!string.IsNullOrWhiteSpace(patientCode))
        {
            query = query.Where(c => c.PatientCode.ToUpper() == patientCode.Trim().ToUpper());
        }

        var notes = await query.OrderByDescending(c => c.ConsultationDate).ToListAsync();
        return notes.Select(MapConsultationToDto);
    }

    public async Task<ConsultationNoteDto?> GetConsultationByIdAsync(Guid id)
    {
        var note = await _db.ConsultationNotes.FindAsync(id);
        return note == null ? null : MapConsultationToDto(note);
    }

    public async Task<ConsultationNoteDto> CreateConsultationAsync(CreateConsultationNoteDto dto)
    {
        var patient = await _db.Patients.FirstOrDefaultAsync(p => p.PatientCode.ToUpper() == dto.PatientCode.Trim().ToUpper());
        if (patient == null)
            throw new ArgumentException($"Patient with code {dto.PatientCode} does not exist.");

        var note = new ConsultationNote
        {
            Id = Guid.NewGuid(),
            PatientId = patient.Id,
            PatientCode = patient.PatientCode,
            DoctorId = dto.DoctorId,
            DoctorName = dto.DoctorName,
            DoctorDesignation = dto.DoctorDesignation,
            ConsultationDate = dto.ConsultationDate.HasValue
                ? DateTime.SpecifyKind(dto.ConsultationDate.Value, DateTimeKind.Utc)
                : DateTime.UtcNow,
            Diagnosis = dto.Diagnosis,
            RecommendedTests = dto.RecommendedTests,
            PrescribedMedicines = dto.PrescribedMedicines,
            ClinicalNotes = dto.ClinicalNotes,
            Status = "Completed",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _db.ConsultationNotes.Add(note);
        await _db.SaveChangesAsync();
        _logger.LogInformation("[EMR] Saved consultation note {Id} by {Doctor} for patient {Patient}", note.Id, note.DoctorName, note.PatientCode);

        return MapConsultationToDto(note);
    }

    public async Task<bool> DeleteConsultationAsync(Guid id)
    {
        var note = await _db.ConsultationNotes.FindAsync(id);
        if (note == null) return false;

        _db.ConsultationNotes.Remove(note);
        await _db.SaveChangesAsync();
        return true;
    }

    // ─── Lab Reports ──────────────────────────────────────────────────────────

    public async Task<IEnumerable<LabReportDto>> GetLabReportsAsync(string? patientCode = null)
    {
        var query = _db.LabReports.AsQueryable();

        if (!string.IsNullOrWhiteSpace(patientCode))
        {
            query = query.Where(l => l.PatientCode.ToUpper() == patientCode.Trim().ToUpper());
        }

        var reports = await query.OrderByDescending(l => l.ReportDate).ToListAsync();
        return reports.Select(MapLabReportToDto);
    }

    public async Task<LabReportDto?> GetLabReportByIdAsync(Guid id)
    {
        var report = await _db.LabReports.FindAsync(id);
        return report == null ? null : MapLabReportToDto(report);
    }

    public async Task<LabReportDto> CreateLabReportAsync(CreateLabReportDto dto)
    {
        var patient = await _db.Patients.FirstOrDefaultAsync(p => p.PatientCode.ToUpper() == dto.PatientCode.Trim().ToUpper());
        if (patient == null)
            throw new ArgumentException($"Patient with code {dto.PatientCode} does not exist.");

        var report = new LabReport
        {
            Id = Guid.NewGuid(),
            PatientId = patient.Id,
            PatientCode = patient.PatientCode,
            TestTitle = dto.TestTitle,
            Category = dto.Category,
            OrderedDoctor = dto.OrderedDoctor,
            ReportDate = dto.ReportDate.HasValue
                ? DateTime.SpecifyKind(dto.ReportDate.Value, DateTimeKind.Utc)
                : DateTime.UtcNow,
            Status = dto.Status,
            FileName = dto.FileName,
            FileUrl = dto.FileUrl,
            ResultsSummary = dto.ResultsSummary,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _db.LabReports.Add(report);
        await _db.SaveChangesAsync();
        _logger.LogInformation("[EMR] Added lab report {Id} ({Test}) for patient {Patient}", report.Id, report.TestTitle, report.PatientCode);

        return MapLabReportToDto(report);
    }

    public async Task<LabReportDto?> UpdateLabReportStatusAsync(Guid id, UpdateLabReportStatusDto dto)
    {
        var report = await _db.LabReports.FindAsync(id);
        if (report == null) return null;

        report.Status = dto.Status;
        if (!string.IsNullOrWhiteSpace(dto.ResultsSummary))
        {
            report.ResultsSummary = dto.ResultsSummary;
        }
        report.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return MapLabReportToDto(report);
    }

    public async Task<bool> DeleteLabReportAsync(Guid id)
    {
        var report = await _db.LabReports.FindAsync(id);
        if (report == null) return false;

        _db.LabReports.Remove(report);
        await _db.SaveChangesAsync();
        return true;
    }

    // ─── Prescriptions ────────────────────────────────────────────────────────

    public async Task<IEnumerable<PrescriptionDto>> GetPrescriptionsAsync(string? patientCode = null)
    {
        var query = _db.Prescriptions.AsQueryable();

        if (!string.IsNullOrWhiteSpace(patientCode))
        {
            query = query.Where(p => p.PatientCode.ToUpper() == patientCode.Trim().ToUpper());
        }

        var rxs = await query.OrderByDescending(p => p.StartDate).ToListAsync();
        return rxs.Select(MapPrescriptionToDto);
    }

    public async Task<PrescriptionDto?> GetPrescriptionByIdAsync(Guid id)
    {
        var rx = await _db.Prescriptions.FindAsync(id);
        return rx == null ? null : MapPrescriptionToDto(rx);
    }

    public async Task<PrescriptionDto> CreatePrescriptionAsync(CreatePrescriptionDto dto)
    {
        var patient = await _db.Patients.FirstOrDefaultAsync(p => p.PatientCode.ToUpper() == dto.PatientCode.Trim().ToUpper());
        if (patient == null)
            throw new ArgumentException($"Patient with code {dto.PatientCode} does not exist.");

        var startDate = dto.StartDate.HasValue
            ? DateTime.SpecifyKind(dto.StartDate.Value, DateTimeKind.Utc)
            : DateTime.UtcNow;

        var endDate = dto.EndDate.HasValue
            ? DateTime.SpecifyKind(dto.EndDate.Value, DateTimeKind.Utc)
            : startDate.AddDays(7);

        var rx = new Prescription
        {
            Id = Guid.NewGuid(),
            PatientId = patient.Id,
            PatientCode = patient.PatientCode,
            MedicationName = dto.MedicationName,
            Dosage = dto.Dosage,
            Duration = dto.Duration,
            StartDate = startDate,
            EndDate = endDate,
            UnitPrice = dto.UnitPrice,
            PrescribedDoctor = dto.PrescribedDoctor,
            Status = dto.Status,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _db.Prescriptions.Add(rx);
        await _db.SaveChangesAsync();
        _logger.LogInformation("[EMR] Dispensed prescription {Id} ({Med}) for patient {Patient}", rx.Id, rx.MedicationName, rx.PatientCode);

        return MapPrescriptionToDto(rx);
    }

    public async Task<PrescriptionDto?> UpdatePrescriptionStatusAsync(Guid id, UpdatePrescriptionStatusDto dto)
    {
        var rx = await _db.Prescriptions.FindAsync(id);
        if (rx == null) return null;

        rx.Status = dto.Status;
        rx.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return MapPrescriptionToDto(rx);
    }

    public async Task<bool> DeletePrescriptionAsync(Guid id)
    {
        var rx = await _db.Prescriptions.FindAsync(id);
        if (rx == null) return false;

        _db.Prescriptions.Remove(rx);
        await _db.SaveChangesAsync();
        return true;
    }

    // ─── Business-Specific Operation: Clinical Health Summary & Safety Checks ──

    public async Task<ClinicalSummaryDto?> GenerateClinicalSummaryAsync(string patientCodeOrId)
    {
        Patient? patient = null;

        if (Guid.TryParse(patientCodeOrId, out var patientGuid))
        {
            patient = await _db.Patients
                .Include(p => p.ConsultationNotes)
                .Include(p => p.LabReports)
                .Include(p => p.Prescriptions)
                .FirstOrDefaultAsync(p => p.Id == patientGuid);
        }
        else
        {
            var code = patientCodeOrId.Trim().ToUpper();
            patient = await _db.Patients
                .Include(p => p.ConsultationNotes)
                .Include(p => p.LabReports)
                .Include(p => p.Prescriptions)
                .FirstOrDefaultAsync(p => p.PatientCode.ToUpper() == code);
        }

        if (patient == null) return null;

        var activePrescriptions = patient.Prescriptions
            .Where(rx => rx.Status == "Active" && rx.EndDate >= DateTime.UtcNow.Date)
            .OrderByDescending(rx => rx.StartDate)
            .Select(MapPrescriptionToDto)
            .ToList();

        var recentConsultations = patient.ConsultationNotes
            .OrderByDescending(c => c.ConsultationDate)
            .Take(5)
            .Select(MapConsultationToDto)
            .ToList();

        var recentLabReports = patient.LabReports
            .OrderByDescending(l => l.ReportDate)
            .Take(5)
            .Select(MapLabReportToDto)
            .ToList();

        // ── Automated Clinical Safety & Alert Evaluation ─────────────────────
        var alerts = new List<string>();

        // 1. Allergy conflict detection against active prescriptions
        var allergiesLower = (patient.Allergies ?? string.Empty).ToLower();
        foreach (var rx in activePrescriptions)
        {
            var medLower = rx.MedicationName.ToLower();
            if (allergiesLower.Contains("penicillin") && (medLower.Contains("amoxicillin") || medLower.Contains("ampicillin") || medLower.Contains("penicillin")))
            {
                alerts.Add($"SAFETY ALERT: Patient has documented Penicillin allergy but has active prescription for {rx.MedicationName}.");
            }
            if (allergiesLower.Contains("sulfa") && medLower.Contains("bactrim"))
            {
                alerts.Add($"SAFETY ALERT: Patient has documented Sulfa allergy but has active prescription for {rx.MedicationName}.");
            }
        }

        // 2. Chronic condition management review
        var chronicLower = (patient.ChronicConditions ?? string.Empty).ToLower();
        if (chronicLower.Contains("hypertension") && !activePrescriptions.Any(rx => rx.MedicationName.ToLower().Contains("lisinopril") || rx.MedicationName.ToLower().Contains("amlodipine")))
        {
            alerts.Add("CLINICAL NOTE: Documented Hypertension without detected active ACE-inhibitor or Calcium Channel Blocker on current file.");
        }

        // 3. Pending diagnostics alert
        var pendingLabs = patient.LabReports.Count(l => l.Status == "Pending");
        if (pendingLabs > 0)
        {
            alerts.Add($"DIAGNOSTICS NOTICE: {pendingLabs} ordered laboratory investigation(s) currently pending processing.");
        }

        // Parse lists from strings
        var allergyList = (patient.Allergies ?? string.Empty)
            .Split(new[] { ',', ';' }, StringSplitOptions.RemoveEmptyEntries)
            .Select(s => s.Trim())
            .ToList();

        var chronicList = (patient.ChronicConditions ?? string.Empty)
            .Split(new[] { ',', ';' }, StringSplitOptions.RemoveEmptyEntries)
            .Select(s => s.Trim())
            .ToList();

        var age = (int)((DateTime.UtcNow - patient.DateOfBirth).TotalDays / 365.2425);

        var overallAssessment = alerts.Count > 0
            ? $"Requires clinical review: {alerts.Count} alert(s) identified in patient record."
            : "Stable clinical profile. All active medications and diagnostic follow-ups up to date.";

        return new ClinicalSummaryDto
        {
            PatientId = patient.Id,
            PatientCode = patient.PatientCode,
            FullName = patient.FullName,
            Age = age,
            Gender = patient.Gender,
            BloodGroup = patient.BloodGroup,
            EmergencyContact = $"{patient.EmergencyContactName} ({patient.EmergencyContactPhone})",
            KnownAllergies = allergyList,
            ChronicConditions = chronicList,
            TotalConsultationsCount = patient.ConsultationNotes.Count,
            ActivePrescriptionsCount = activePrescriptions.Count,
            CompletedLabReportsCount = patient.LabReports.Count(l => l.Status == "Completed"),
            PendingLabReportsCount = pendingLabs,
            ActiveMedications = activePrescriptions,
            RecentConsultations = recentConsultations,
            RecentLabReports = recentLabReports,
            ClinicalAlerts = alerts,
            OverallAssessment = overallAssessment,
            GeneratedAt = DateTime.UtcNow
        };
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private async Task<string> GenerateNextPatientCodeAsync()
    {
        var count = await _db.Patients.CountAsync();
        return $"PAT-{1000 + count + 1}";
    }

    private static PatientDto MapPatientToDto(Patient p) => new()
    {
        Id = p.Id,
        PatientCode = p.PatientCode,
        FullName = p.FullName,
        DateOfBirth = p.DateOfBirth,
        Gender = p.Gender,
        BloodGroup = p.BloodGroup,
        ContactPhone = p.ContactPhone,
        Email = p.Email,
        Address = p.Address,
        EmergencyContactName = p.EmergencyContactName,
        EmergencyContactPhone = p.EmergencyContactPhone,
        Allergies = p.Allergies,
        ChronicConditions = p.ChronicConditions,
        CreatedAt = p.CreatedAt,
        UpdatedAt = p.UpdatedAt
    };

    private static ConsultationNoteDto MapConsultationToDto(ConsultationNote c) => new()
    {
        Id = c.Id,
        PatientId = c.PatientId,
        PatientCode = c.PatientCode,
        DoctorId = c.DoctorId,
        DoctorName = c.DoctorName,
        DoctorDesignation = c.DoctorDesignation,
        ConsultationDate = c.ConsultationDate,
        Diagnosis = c.Diagnosis,
        RecommendedTests = c.RecommendedTests,
        PrescribedMedicines = c.PrescribedMedicines,
        ClinicalNotes = c.ClinicalNotes,
        Status = c.Status,
        CreatedAt = c.CreatedAt,
        UpdatedAt = c.UpdatedAt
    };

    private static LabReportDto MapLabReportToDto(LabReport l) => new()
    {
        Id = l.Id,
        PatientId = l.PatientId,
        PatientCode = l.PatientCode,
        TestTitle = l.TestTitle,
        Category = l.Category,
        OrderedDoctor = l.OrderedDoctor,
        ReportDate = l.ReportDate,
        Status = l.Status,
        FileName = l.FileName,
        FileUrl = l.FileUrl,
        ResultsSummary = l.ResultsSummary,
        CreatedAt = l.CreatedAt,
        UpdatedAt = l.UpdatedAt
    };

    private static PrescriptionDto MapPrescriptionToDto(Prescription p) => new()
    {
        Id = p.Id,
        PatientId = p.PatientId,
        PatientCode = p.PatientCode,
        MedicationName = p.MedicationName,
        Dosage = p.Dosage,
        Duration = p.Duration,
        StartDate = p.StartDate,
        EndDate = p.EndDate,
        UnitPrice = p.UnitPrice,
        PrescribedDoctor = p.PrescribedDoctor,
        Status = p.Status,
        CreatedAt = p.CreatedAt,
        UpdatedAt = p.UpdatedAt
    };
}

