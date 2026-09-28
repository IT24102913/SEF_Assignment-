using HealthBridge.Api.Authentication;
using HealthBridge.Api.Data;
using HealthBridge.Api.DTOs;
using HealthBridge.Api.DTOs.Auth;
using HealthBridge.Api.DTOs.EMR;
using HealthBridge.Api.Models;
using HealthBridge.Api.Models.Appointments;
using HealthBridge.Api.Models.EMR;
using HealthBridge.Api.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace HealthBridge.Api.Services.EMR;

public class EMRService : IEMRService
{
    private readonly ApplicationDbContext _db;
    private readonly ILogger<EMRService> _logger;
    private readonly IJwtTokenGenerator _jwtTokenGenerator;

    public EMRService(ApplicationDbContext db, ILogger<EMRService> logger, IJwtTokenGenerator jwtTokenGenerator)
    {
        _db = db;
        _logger = logger;
        _jwtTokenGenerator = jwtTokenGenerator;
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
        var profiles = await _db.PatientProfiles.Include(pr => pr.User).ToListAsync();

        return patients.Select(p =>
        {
            var prof = (p.UserId.HasValue ? profiles.FirstOrDefault(pr => pr.UserId == p.UserId.Value) : null)
                    ?? (!string.IsNullOrWhiteSpace(p.Email) ? profiles.FirstOrDefault(pr => pr.User != null && pr.User.Email.Equals(p.Email, StringComparison.OrdinalIgnoreCase)) : null);
            return MapPatientToDto(p, prof);
        });
    }

    public async Task<PatientDto?> GetPatientByIdAsync(Guid id)
    {
        var patient = await _db.Patients.FindAsync(id);
        if (patient == null) return null;
        var prof = await FindPatientProfileAsync(patient);
        return MapPatientToDto(patient, prof);
    }

    public async Task<PatientDto?> GetPatientByUserIdAsync(int userId)
    {
        var patient = await _db.Patients.FirstOrDefaultAsync(p => p.UserId == userId);
        if (patient == null)
        {
            var user = await _db.Users.FindAsync(userId);
            if (user != null)
            {
                // Try linking if matched by email
                var existingByEmail = await _db.Patients.FirstOrDefaultAsync(p => p.Email.ToLower() == user.Email.ToLower());
                if (existingByEmail != null)
                {
                    existingByEmail.UserId = user.Id;
                    await _db.SaveChangesAsync();
                    patient = existingByEmail;
                }
                else
                {
                    // Auto-create EMR patient for this registered user
                    var prof = await _db.PatientProfiles.FirstOrDefaultAsync(pr => pr.UserId == userId);
                    var patientCount = await _db.Patients.CountAsync();
                    patient = new Patient
                    {
                        Id = Guid.NewGuid(),
                        UserId = user.Id,
                        PatientCode = $"PAT-{1000 + patientCount + 1}",
                        FullName = user.FullName,
                        Email = user.Email,
                        ContactPhone = prof?.PhoneNumber ?? "",
                        Gender = prof?.Gender ?? "Other",
                        DateOfBirth = prof?.DateOfBirth,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };
                    _db.Patients.Add(patient);
                    await _db.SaveChangesAsync();
                }
            }
        }

        if (patient == null) return null;

        var profile = await FindPatientProfileAsync(patient, userId);

        // Auto-heal empty fields in the Patient entity itself if profile has them
        bool patientNeedsSave = false;
        if (profile != null)
        {
            if (string.IsNullOrWhiteSpace(patient.ContactPhone) && !string.IsNullOrWhiteSpace(profile.PhoneNumber))
            {
                patient.ContactPhone = profile.PhoneNumber;
                patientNeedsSave = true;
            }
            if ((string.IsNullOrWhiteSpace(patient.Gender) || patient.Gender == "Other") && !string.IsNullOrWhiteSpace(profile.Gender) && profile.Gender != "Other")
            {
                patient.Gender = profile.Gender;
                patientNeedsSave = true;
            }
            if (!patient.DateOfBirth.HasValue && profile.DateOfBirth.HasValue)
            {
                patient.DateOfBirth = profile.DateOfBirth;
                patientNeedsSave = true;
            }
            if (string.IsNullOrWhiteSpace(patient.Address) && !string.IsNullOrWhiteSpace(profile.Address))
            {
                patient.Address = profile.Address + (!string.IsNullOrWhiteSpace(profile.City) ? ", " + profile.City : "");
                patientNeedsSave = true;
            }
            if (!patient.UserId.HasValue)
            {
                patient.UserId = userId;
                patientNeedsSave = true;
            }
        }
        if (patientNeedsSave)
        {
            await _db.SaveChangesAsync();
        }

        return MapPatientToDto(patient, profile);
    }

    public async Task<PatientDto?> GetPatientByCodeAsync(string code)
    {
        var patient = await _db.Patients.FirstOrDefaultAsync(p => p.PatientCode.ToUpper() == code.Trim().ToUpper());
        if (patient == null) return null;
        var prof = await FindPatientProfileAsync(patient);
        return MapPatientToDto(patient, prof);
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
            DateOfBirth = dto.DateOfBirth.HasValue ? DateTime.SpecifyKind(dto.DateOfBirth.Value, DateTimeKind.Utc) : null,
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

        var prof = await FindPatientProfileAsync(patient);
        return MapPatientToDto(patient, prof);
    }

    public async Task<PatientDto?> UpdatePatientAsync(Guid id, UpdatePatientDto dto)
    {
        var patient = await _db.Patients.FindAsync(id);
        if (patient == null) return null;

        ApplyPatientUpdates(patient, dto);
        var prof = await FindPatientProfileAsync(patient);
        if (prof != null)
        {
            if (!string.IsNullOrWhiteSpace(dto.NicNumber)) prof.NicNumber = dto.NicNumber;
            if (dto.ContactPhone != null) prof.PhoneNumber = dto.ContactPhone;
            if (dto.Address != null) prof.Address = dto.Address;
            if (dto.DateOfBirth.HasValue) prof.DateOfBirth = DateTime.SpecifyKind(dto.DateOfBirth.Value, DateTimeKind.Utc);
            if (!string.IsNullOrWhiteSpace(dto.Gender)) prof.Gender = dto.Gender;
            prof.UpdatedAt = DateTime.UtcNow;
        }
        await _db.SaveChangesAsync();
        return MapPatientToDto(patient, prof);
    }

    public async Task<PatientDto?> UpdatePatientByCodeAsync(string patientCode, UpdatePatientDto dto)
    {
        var patient = await _db.Patients.FirstOrDefaultAsync(p => p.PatientCode.ToUpper() == patientCode.Trim().ToUpper());
        if (patient == null) return null;

        ApplyPatientUpdates(patient, dto);
        var prof = await FindPatientProfileAsync(patient);
        if (prof != null)
        {
            if (!string.IsNullOrWhiteSpace(dto.NicNumber)) prof.NicNumber = dto.NicNumber;
            if (dto.ContactPhone != null) prof.PhoneNumber = dto.ContactPhone;
            if (dto.Address != null) prof.Address = dto.Address;
            if (dto.DateOfBirth.HasValue) prof.DateOfBirth = DateTime.SpecifyKind(dto.DateOfBirth.Value, DateTimeKind.Utc);
            if (!string.IsNullOrWhiteSpace(dto.Gender)) prof.Gender = dto.Gender;
            prof.UpdatedAt = DateTime.UtcNow;
        }
        await _db.SaveChangesAsync();
        return MapPatientToDto(patient, prof);
    }

    private static void ApplyPatientUpdates(Patient patient, UpdatePatientDto dto)
    {
        if (!string.IsNullOrWhiteSpace(dto.FullName)) patient.FullName = dto.FullName;
        if (dto.DateOfBirth.HasValue) 
            patient.DateOfBirth = DateTime.SpecifyKind(dto.DateOfBirth.Value, DateTimeKind.Utc);
        else if (dto.DateOfBirth == null)
            patient.DateOfBirth = null;
        if (!string.IsNullOrWhiteSpace(dto.Gender)) patient.Gender = dto.Gender;
        if (!string.IsNullOrWhiteSpace(dto.BloodGroup)) patient.BloodGroup = dto.BloodGroup;
        if (dto.ContactPhone != null) patient.ContactPhone = dto.ContactPhone;
        if (!string.IsNullOrWhiteSpace(dto.Email)) patient.Email = dto.Email;
        if (dto.Address != null) patient.Address = dto.Address;
        if (dto.EmergencyContactName != null) patient.EmergencyContactName = dto.EmergencyContactName;
        if (dto.EmergencyContactPhone != null) patient.EmergencyContactPhone = dto.EmergencyContactPhone;
        if (dto.Allergies != null) patient.Allergies = dto.Allergies;
        if (dto.ChronicConditions != null) patient.ChronicConditions = dto.ChronicConditions;
        patient.UpdatedAt = DateTime.UtcNow;
    }

    // ─── Consultation Notes ───────────────────────────────────────────────────

    public async Task<IEnumerable<ConsultationNoteDto>> GetConsultationsAsync(string? patientCode = null, string? search = null, string? doctorName = null)
    {
        var query = _db.ConsultationNotes.Include(c => c.Patient).AsQueryable();

        if (!string.IsNullOrWhiteSpace(patientCode))
        {
            query = query.Where(c => c.PatientCode.ToUpper() == patientCode.Trim().ToUpper());
        }

        if (!string.IsNullOrWhiteSpace(doctorName) && doctorName != "ALL")
        {
            query = query.Where(c => c.DoctorName.ToLower().Contains(doctorName.Trim().ToLower()));
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(c => c.PatientCode.ToLower().Contains(term) ||
                                     c.DoctorName.ToLower().Contains(term) ||
                                     c.Diagnosis.ToLower().Contains(term) ||
                                     c.ClinicalNotes.ToLower().Contains(term) ||
                                     (c.Patient != null && c.Patient.FullName.ToLower().Contains(term)));
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

    public async Task<IEnumerable<LabReportDto>> GetLabReportsAsync(string? patientCode = null, string? search = null, string? category = null, string? status = null)
    {
        var query = _db.LabReports.Include(l => l.Patient).AsQueryable();

        if (!string.IsNullOrWhiteSpace(patientCode))
        {
            query = query.Where(l => l.PatientCode.ToUpper() == patientCode.Trim().ToUpper());
        }

        if (!string.IsNullOrWhiteSpace(category) && category != "ALL")
        {
            query = query.Where(l => l.Category.ToLower() == category.Trim().ToLower());
        }

        if (!string.IsNullOrWhiteSpace(status) && status != "ALL")
        {
            query = query.Where(l => l.Status.ToLower() == status.Trim().ToLower());
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(l => l.PatientCode.ToLower().Contains(term) ||
                                     l.TestTitle.ToLower().Contains(term) ||
                                     l.OrderedDoctor.ToLower().Contains(term) ||
                                     l.ResultsSummary.ToLower().Contains(term) ||
                                     (l.Patient != null && l.Patient.FullName.ToLower().Contains(term)));
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

    public async Task<IEnumerable<PrescriptionDto>> GetPrescriptionsAsync(string? patientCode = null, string? search = null, string? status = null, string? doctorName = null)
    {
        var query = _db.Prescriptions.Include(p => p.Patient).AsQueryable();

        if (!string.IsNullOrWhiteSpace(patientCode))
        {
            query = query.Where(p => p.PatientCode.ToUpper() == patientCode.Trim().ToUpper());
        }

        if (!string.IsNullOrWhiteSpace(status) && status != "ALL")
        {
            query = query.Where(p => p.Status.ToLower() == status.Trim().ToLower());
        }

        if (!string.IsNullOrWhiteSpace(doctorName) && doctorName != "ALL")
        {
            query = query.Where(p => p.PrescribedDoctor.ToLower().Contains(doctorName.Trim().ToLower()));
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(p => p.PatientCode.ToLower().Contains(term) ||
                                     p.MedicationName.ToLower().Contains(term) ||
                                     p.Dosage.ToLower().Contains(term) ||
                                     p.PrescribedDoctor.ToLower().Contains(term) ||
                                     (p.Patient != null && p.Patient.FullName.ToLower().Contains(term)));
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

    public async Task<IEnumerable<PrescriptionDto>> CreatePrescriptionsBatchAsync(BatchCreatePrescriptionsDto dto)
    {
        var patient = await _db.Patients.FirstOrDefaultAsync(p => p.PatientCode.ToUpper() == dto.PatientCode.Trim().ToUpper());
        if (patient == null)
            throw new ArgumentException($"Patient with code {dto.PatientCode} does not exist.");

        var createdList = new List<Prescription>();
        var now = DateTime.UtcNow;

        foreach (var item in dto.Items)
        {
            if (string.IsNullOrWhiteSpace(item.MedicationName)) continue;

            var days = 7;
            var match = System.Text.RegularExpressions.Regex.Match(item.Duration ?? "", @"\d+");
            if (match.Success && int.TryParse(match.Value, out var parsedDays))
            {
                days = parsedDays;
            }

            var rx = new Prescription
            {
                Id = Guid.NewGuid(),
                PatientId = patient.Id,
                PatientCode = patient.PatientCode,
                MedicationName = item.MedicationName.Trim(),
                Dosage = item.Dosage?.Trim() ?? string.Empty,
                Duration = item.Duration?.Trim() ?? $"{days} Days",
                StartDate = now,
                EndDate = now.AddDays(days),
                UnitPrice = item.UnitPrice,
                PrescribedDoctor = string.IsNullOrWhiteSpace(dto.PrescribedDoctor) ? "Attending Physician" : dto.PrescribedDoctor.Trim(),
                Status = string.IsNullOrWhiteSpace(item.Status) ? "Active" : item.Status.Trim(),
                CreatedAt = now,
                UpdatedAt = now
            };

            createdList.Add(rx);
        }

        if (createdList.Any())
        {
            _db.Prescriptions.AddRange(createdList);
            await _db.SaveChangesAsync();
            _logger.LogInformation("[EMR] Dispensed batch of {Count} prescriptions for patient {Patient}", createdList.Count, patient.PatientCode);
        }

        return createdList.Select(MapPrescriptionToDto);
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

    public async Task<PrescriptionDto?> RequestPrescriptionAuthorizationAsync(Guid id, RequestPrescriptionAuthorizationDto dto)
    {
        var rx = await _db.Prescriptions.FindAsync(id);
        if (rx == null) return null;

        rx.HasAuthorizationRequest = true;
        rx.AuthorizationType = string.IsNullOrWhiteSpace(dto.RequestType) ? "Delete" : dto.RequestType.Trim();
        rx.AuthorizationReason = dto.Reason?.Trim() ?? string.Empty;
        rx.AuthorizationRequestedBy = dto.RequestedBy?.Trim() ?? "Pharmacist";
        rx.AuthorizationRequestedAt = DateTime.UtcNow;
        rx.AuthorizationStatus = "Pending";
        rx.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        _logger.LogInformation("[EMR] Pharmacist requested {Type} authorization for prescription {Id} ({Med}). Reason: {Reason}",
            rx.AuthorizationType, rx.Id, rx.MedicationName, rx.AuthorizationReason);

        return MapPrescriptionToDto(rx);
    }

    public async Task<bool> ApproveAndDeletePrescriptionAsync(Guid id, string? adminNote = null)
    {
        var rx = await _db.Prescriptions.FindAsync(id);
        if (rx == null) return false;

        _logger.LogInformation("[EMR] Admin approved pharmacist deletion request for prescription {Id} ({Med}). Note: {Note}",
            rx.Id, rx.MedicationName, adminNote ?? "None");

        _db.Prescriptions.Remove(rx);
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<PrescriptionDto?> RejectPrescriptionAuthorizationAsync(Guid id, string? adminNote = null)
    {
        var rx = await _db.Prescriptions.FindAsync(id);
        if (rx == null) return null;

        rx.HasAuthorizationRequest = false;
        rx.AuthorizationStatus = "Rejected";
        rx.UpdatedAt = DateTime.UtcNow;

        _logger.LogInformation("[EMR] Admin rejected pharmacist authorization request for prescription {Id}. Note: {Note}",
            rx.Id, adminNote ?? "None");

        await _db.SaveChangesAsync();
        return MapPrescriptionToDto(rx);
    }

    public async Task<IEnumerable<PrescriptionDto>> GetPendingPrescriptionAuthorizationsAsync()
    {
        var list = await _db.Prescriptions
            .Include(p => p.Patient)
            .Where(p => p.HasAuthorizationRequest && p.AuthorizationStatus == "Pending")
            .OrderByDescending(p => p.AuthorizationRequestedAt)
            .ToListAsync();

        return list.Select(MapPrescriptionToDto);
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

        var age = patient.DateOfBirth.HasValue ? (int)((DateTime.UtcNow - patient.DateOfBirth.Value).TotalDays / 365.2425) : (int?)null;

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

    // ─── Channeling Appointments ──────────────────────────────────────────────

    public async Task<IEnumerable<ChannelingAppointmentDto>> GetChannelingAppointmentsAsync(string? patientCode = null)
    {
        Patient? patient = null;
        if (!string.IsNullOrWhiteSpace(patientCode))
        {
            var pCodeTrim = patientCode.Trim();
            patient = await _db.Patients.FirstOrDefaultAsync(p => p.PatientCode.ToUpper() == pCodeTrim.ToUpper());
            if (patient == null && int.TryParse(pCodeTrim, out int parsedUserId))
            {
                patient = await _db.Patients.FirstOrDefaultAsync(p => p.UserId == parsedUserId);
            }
            if (patient == null && pCodeTrim.Contains('@'))
            {
                patient = await _db.Patients.FirstOrDefaultAsync(p => p.Email.ToLower() == pCodeTrim.ToLower());
            }
        }

        var nowUtc = DateTime.UtcNow;

        // 1. Fetch from DoctorAppointments (Channeling booking system)
        var docQuery = _db.DoctorAppointments
            .Include(a => a.Doctor)
            .Include(a => a.DoctorSession)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(patientCode))
        {
            var pCodeTrim = patientCode.Trim().ToLower();
            int? uId = patient?.UserId;
            if (!uId.HasValue && int.TryParse(patientCode, out int parsedId))
            {
                uId = parsedId;
            }
            var pEmail = patient?.Email?.ToLower() ?? (patientCode.Contains('@') ? pCodeTrim : null);
            var pPhone = patient?.ContactPhone;
            var pName = patient?.FullName?.ToLower();

            docQuery = docQuery.Where(a =>
                (uId.HasValue && a.PatientId == uId.Value) ||
                (!string.IsNullOrEmpty(pEmail) && a.PatientEmail.ToLower() == pEmail) ||
                (!string.IsNullOrEmpty(pPhone) && a.PatientPhone == pPhone) ||
                (pName != null && a.PatientName.ToLower() == pName)
            );
        }

        var docList = await docQuery.OrderByDescending(a => a.AppointmentDate).ToListAsync();

        var mappedDoctorApts = docList.Select(a =>
        {
            string statusStr;
            string categoryStr;

            if (a.Status == AppointmentStatus.Cancelled)
            {
                statusStr = "Cancelled";
                categoryStr = "Past";
            }
            else if (a.Status == AppointmentStatus.Completed || a.Status == AppointmentStatus.NoShow || a.QueueStatus == QueueStatus.Completed || a.QueueStatus == QueueStatus.NoShow)
            {
                statusStr = a.Status == AppointmentStatus.NoShow || a.QueueStatus == QueueStatus.NoShow ? "No Show" : "Completed";
                categoryStr = "Past";
            }
            else if (a.Status == AppointmentStatus.InProgress || a.QueueStatus == QueueStatus.InConsultation || a.QueueStatus == QueueStatus.Called || a.CheckedInAt != null)
            {
                statusStr = a.QueueStatus == QueueStatus.InConsultation ? "In Consultation" : "Ongoing";
                categoryStr = "Ongoing";
            }
            else
            {
                if (a.AppointmentDate.Date == nowUtc.Date)
                {
                    statusStr = a.Status == AppointmentStatus.PendingPayment ? "Pending Payment" : "Ongoing";
                    categoryStr = "Ongoing";
                }
                else if (a.AppointmentDate.Date > nowUtc.Date)
                {
                    statusStr = a.Status == AppointmentStatus.PendingPayment ? "Pending Payment" : "Upcoming";
                    categoryStr = "Upcoming";
                }
                else
                {
                    statusStr = "Completed";
                    categoryStr = "Past";
                }
            }

            var roomStr = !string.IsNullOrWhiteSpace(a.Doctor?.RoomNumber)
                ? a.Doctor.RoomNumber
                : "Consultation Suite";
            if (!string.IsNullOrWhiteSpace(a.Doctor?.HospitalBranch))
            {
                roomStr += $", {a.Doctor.HospitalBranch}";
            }

            return new ChannelingAppointmentDto
            {
                Id = Guid.NewGuid(),
                AppointmentCode = a.AppointmentNumber,
                PatientCode = patient?.PatientCode ?? (a.PatientId.HasValue ? $"PAT-{a.PatientId}" : "PAT-USER"),
                DoctorName = a.DoctorName,
                Specialty = !string.IsNullOrWhiteSpace(a.Specialization) ? a.Specialization : (a.Doctor?.Specialization ?? "General Specialist"),
                AppointmentDate = a.AppointmentDate,
                Room = roomStr,
                Status = statusStr,
                Category = categoryStr,
                QueueNumber = a.QueueNumber,
                TotalAmount = a.TotalAmount,
                PaymentStatus = a.PaymentStatus,
                HospitalBranch = a.Doctor?.HospitalBranch ?? "Health Bridge Hospital - Colombo",
                TimeSlot = a.TimeSlot
            };
        }).ToList();

        // 2. Fetch from ChannelingAppointments (EMR Channeling table)
        var chanQuery = _db.ChannelingAppointments.AsQueryable();
        if (!string.IsNullOrWhiteSpace(patientCode))
        {
            var targetCode = patient?.PatientCode?.ToUpper() ?? patientCode.Trim().ToUpper();
            chanQuery = chanQuery.Where(a => a.PatientCode.ToUpper() == targetCode);
        }
        var chanList = await chanQuery.OrderByDescending(a => a.AppointmentDate).ToListAsync();

        var mappedChanApts = chanList.Select(c =>
        {
            string statusStr = c.Status ?? "Upcoming";
            string categoryStr = "Upcoming";
            var sUpper = statusStr.Trim().ToUpper();

            if (sUpper == "CANCELLED" || sUpper == "CANCELED")
            {
                categoryStr = "Past";
                statusStr = "Cancelled";
            }
            else if (sUpper == "COMPLETED" || sUpper == "FINISHED")
            {
                categoryStr = "Past";
                statusStr = "Completed";
            }
            else if (sUpper == "ONGOING" || sUpper == "IN CONSULTATION" || sUpper == "CHECKED IN" || sUpper == "IN PROGRESS")
            {
                categoryStr = "Ongoing";
            }
            else
            {
                if (c.AppointmentDate.Date == nowUtc.Date)
                {
                    categoryStr = "Ongoing";
                    if (sUpper == "UPCOMING") statusStr = "Ongoing";
                }
                else if (c.AppointmentDate.Date > nowUtc.Date)
                {
                    categoryStr = "Upcoming";
                }
                else
                {
                    categoryStr = "Past";
                    if (sUpper == "UPCOMING") statusStr = "Completed";
                }
            }

            return new ChannelingAppointmentDto
            {
                Id = c.Id,
                AppointmentCode = c.AppointmentCode,
                PatientCode = c.PatientCode,
                DoctorName = c.DoctorName,
                Specialty = c.Specialty,
                AppointmentDate = c.AppointmentDate,
                Room = c.Room,
                Status = statusStr,
                Category = categoryStr,
                QueueNumber = null,
                TotalAmount = null,
                PaymentStatus = null,
                HospitalBranch = null,
                TimeSlot = c.AppointmentDate.ToString("hh:mm tt")
            };
        }).ToList();

        // Merge without duplicating AppointmentCode
        var seenCodes = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var merged = new List<ChannelingAppointmentDto>();

        foreach (var apt in mappedDoctorApts)
        {
            if (!string.IsNullOrEmpty(apt.AppointmentCode) && seenCodes.Add(apt.AppointmentCode))
            {
                merged.Add(apt);
            }
        }

        foreach (var apt in mappedChanApts)
        {
            if (string.IsNullOrEmpty(apt.AppointmentCode) || seenCodes.Add(apt.AppointmentCode))
            {
                merged.Add(apt);
            }
        }

        return merged
            .OrderByDescending(x => x.AppointmentDate)
            .ThenBy(x => x.QueueNumber ?? 999);
    }

    public async Task<ChannelingAppointmentDto> CreateChannelingAppointmentAsync(CreateChannelingAppointmentDto dto)
    {
        var patient = await _db.Patients.FirstOrDefaultAsync(p => p.PatientCode.ToUpper() == dto.PatientCode.Trim().ToUpper());
        var count = await _db.ChannelingAppointments.CountAsync() + await _db.DoctorAppointments.CountAsync();
        var code = $"APT-{3000 + count + 1}";

        var appointment = new ChannelingAppointment
        {
            AppointmentCode = code,
            PatientId = patient?.Id ?? Guid.Empty,
            PatientCode = dto.PatientCode.ToUpper().Trim(),
            DoctorName = dto.DoctorName,
            Specialty = dto.Specialty,
            AppointmentDate = DateTime.SpecifyKind(dto.AppointmentDate, DateTimeKind.Utc),
            Room = dto.Room,
            Status = dto.Status,
            CreatedAt = DateTime.UtcNow
        };

        _db.ChannelingAppointments.Add(appointment);
        await _db.SaveChangesAsync();

        return new ChannelingAppointmentDto
        {
            Id = appointment.Id,
            AppointmentCode = appointment.AppointmentCode,
            PatientCode = appointment.PatientCode,
            DoctorName = appointment.DoctorName,
            Specialty = appointment.Specialty,
            AppointmentDate = appointment.AppointmentDate,
            Room = appointment.Room,
            Status = appointment.Status,
            Category = "Upcoming"
        };
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private async Task<string> GenerateNextPatientCodeAsync()
    {
        var count = await _db.Patients.CountAsync();
        return $"PAT-{1000 + count + 1}";
    }

    private async Task<PatientProfile?> FindPatientProfileAsync(Patient patient, int? knownUserId = null)
    {
        int? targetUserId = knownUserId ?? patient.UserId;
        if (targetUserId.HasValue)
        {
            var p = await _db.PatientProfiles.FirstOrDefaultAsync(pr => pr.UserId == targetUserId.Value);
            if (p != null) return p;
        }

        if (!string.IsNullOrWhiteSpace(patient.Email))
        {
            var p = await _db.PatientProfiles.Include(pr => pr.User)
                .FirstOrDefaultAsync(pr => pr.User != null && pr.User.Email.ToLower() == patient.Email.ToLower());
            if (p != null) return p;
        }

        return null;
    }

    private static PatientDto MapPatientToDto(Patient p, PatientProfile? profile = null) => new()
    {
        Id = p.Id,
        PatientCode = p.PatientCode,
        FullName = p.FullName,
        DateOfBirth = p.DateOfBirth ?? profile?.DateOfBirth,
        Gender = (!string.IsNullOrWhiteSpace(p.Gender) && p.Gender != "Other") ? p.Gender : (profile?.Gender ?? p.Gender),
        BloodGroup = p.BloodGroup,
        ContactPhone = !string.IsNullOrWhiteSpace(p.ContactPhone) ? p.ContactPhone : (profile?.PhoneNumber ?? ""),
        Email = p.Email,
        NicNumber = profile?.NicNumber,
        Address = !string.IsNullOrWhiteSpace(p.Address) ? p.Address : (!string.IsNullOrWhiteSpace(profile?.Address) ? profile.Address + (!string.IsNullOrWhiteSpace(profile?.City) ? ", " + profile.City : "") : ""),
        EmergencyContactName = !string.IsNullOrWhiteSpace(p.EmergencyContactName) ? p.EmergencyContactName : (profile?.EmergencyContact ?? ""),
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
        HasAuthorizationRequest = p.HasAuthorizationRequest,
        AuthorizationType = p.AuthorizationType,
        AuthorizationReason = p.AuthorizationReason,
        AuthorizationRequestedBy = p.AuthorizationRequestedBy,
        AuthorizationRequestedAt = p.AuthorizationRequestedAt,
        AuthorizationStatus = p.AuthorizationStatus,
        CreatedAt = p.CreatedAt,
        UpdatedAt = p.UpdatedAt
    };

    public async Task<IEnumerable<EMRNotificationDto>> GetUserNotificationsAsync(int userId, string role)
    {
        var user = await _db.Users.FindAsync(userId);
        if (user == null) return Enumerable.Empty<EMRNotificationDto>();

        var normalizedRole = string.IsNullOrWhiteSpace(role) ? user.Role : role;
        var notifs = new List<EMRNotificationDto>();

        if (string.Equals(normalizedRole, "Patient", StringComparison.OrdinalIgnoreCase))
        {
            var patient = await _db.Patients.FirstOrDefaultAsync(p => p.UserId == userId || p.Email.ToLower() == user.Email.ToLower());
            if (patient == null)
            {
                return new List<EMRNotificationDto>
                {
                    new()
                    {
                        Id = "notif-profile-init",
                        Title = "EMR Account Initialized",
                        Message = "Your digital health records are active. Please open your Health Passport to fill in your profile details.",
                        Category = "Profile",
                        Priority = "High",
                        Link = "/emr/profile",
                        Time = "Just now",
                        Unread = true,
                        CreatedAt = DateTime.UtcNow
                    }
                };
            }

            // 1. Real profile gaps for THIS patient
            if (!patient.DateOfBirth.HasValue)
            {
                notifs.Add(new EMRNotificationDto
                {
                    Id = $"notif-dob-{patient.Id}",
                    Title = "Set Your Date of Birth",
                    Message = "Your date of birth is currently empty. You can choose and save your birthday in your Health Passport.",
                    Category = "Profile",
                    Priority = "High",
                    Link = "/emr/profile",
                    Time = "Action Required",
                    Unread = true,
                    CreatedAt = patient.CreatedAt
                });
            }

            if (string.IsNullOrWhiteSpace(patient.EmergencyContactPhone))
            {
                notifs.Add(new EMRNotificationDto
                {
                    Id = $"notif-emg-{patient.Id}",
                    Title = "Add Emergency Contact",
                    Message = "Emergency contact details are not provided yet. Add a contact for safety during clinical visits.",
                    Category = "Profile",
                    Priority = "Normal",
                    Link = "/emr/profile",
                    Time = "Profile Notice",
                    Unread = true,
                    CreatedAt = patient.CreatedAt
                });
            }

            if (!string.IsNullOrWhiteSpace(patient.Allergies))
            {
                notifs.Add(new EMRNotificationDto
                {
                    Id = $"notif-allergy-{patient.Id}",
                    Title = "Allergy Guard Screening Active",
                    Message = $"Your recorded allergies ({patient.Allergies}) are actively screened against doctor prescriptions.",
                    Category = "Clinical Safety",
                    Priority = "Normal",
                    Link = "/emr/profile",
                    Time = "Active Guard",
                    Unread = false,
                    CreatedAt = patient.UpdatedAt
                });
            }

            // 2. Real Channeling Appointments for THIS patient
            var appointments = await _db.ChannelingAppointments
                .Where(a => a.PatientId == patient.Id)
                .OrderByDescending(a => a.AppointmentDate)
                .Take(5)
                .ToListAsync();

            foreach (var a in appointments)
            {
                notifs.Add(new EMRNotificationDto
                {
                    Id = $"notif-apt-{a.Id}",
                    Title = $"Doctor Session: Dr. {a.DoctorName}",
                    Message = $"{a.Specialty} on {a.AppointmentDate:MMM dd, yyyy} at {a.AppointmentDate:hh:mm tt}, Room {a.Room}. Status: {a.Status}",
                    Category = "Appointments",
                    Priority = a.Status == "Upcoming" ? "High" : "Normal",
                    Link = "/emr/channeling-history",
                    Time = a.AppointmentDate.ToString("MMM dd, yyyy"),
                    Unread = a.Status == "Upcoming",
                    CreatedAt = a.AppointmentDate
                });
            }

            // 3. Real Prescriptions for THIS patient
            var prescriptions = await _db.Prescriptions
                .Where(p => p.PatientId == patient.Id)
                .OrderByDescending(p => p.CreatedAt)
                .Take(5)
                .ToListAsync();

            foreach (var p in prescriptions)
            {
                notifs.Add(new EMRNotificationDto
                {
                    Id = $"notif-rx-{p.Id}",
                    Title = p.Status == "Active" ? $"Active Medication: {p.MedicationName}" : $"Medication: {p.MedicationName} ({p.Status})",
                    Message = $"Prescribed by Dr. {p.PrescribedDoctor}. Dosage: {p.Dosage}. Duration: {p.Duration}.",
                    Category = "Prescriptions",
                    Priority = p.Status == "Active" ? "High" : "Normal",
                    Link = "/emr/pharmacy",
                    Time = p.CreatedAt.ToString("MMM dd, yyyy"),
                    Unread = p.Status == "Active",
                    CreatedAt = p.CreatedAt
                });
            }

            // 4. Real Lab Reports for THIS patient
            var labReports = await _db.LabReports
                .Where(l => l.PatientId == patient.Id)
                .OrderByDescending(l => l.ReportDate)
                .Take(5)
                .ToListAsync();

            foreach (var l in labReports)
            {
                notifs.Add(new EMRNotificationDto
                {
                    Id = $"notif-lab-{l.Id}",
                    Title = l.Status == "Completed" ? $"Lab Report Ready: {l.TestTitle}" : $"Lab Diagnostic: {l.TestTitle} ({l.Status})",
                    Message = $"Ordered by Dr. {l.OrderedDoctor}. {l.ResultsSummary}",
                    Category = "Lab Diagnostics",
                    Priority = l.Status == "Completed" ? "Normal" : "High",
                    Link = "/emr/lab-reports",
                    Time = l.ReportDate.ToString("MMM dd, yyyy"),
                    Unread = l.Status == "Completed",
                    CreatedAt = l.ReportDate
                });
            }

            // 5. Real Consultation Notes for THIS patient
            var consults = await _db.ConsultationNotes
                .Where(c => c.PatientId == patient.Id)
                .OrderByDescending(c => c.ConsultationDate)
                .Take(5)
                .ToListAsync();

            foreach (var c in consults)
            {
                notifs.Add(new EMRNotificationDto
                {
                    Id = $"notif-cn-{c.Id}",
                    Title = $"Clinical Note: Dr. {c.DoctorName}",
                    Message = $"Diagnosis: {c.Diagnosis}. Clinical notes recorded in your patient history.",
                    Category = "Consultations",
                    Priority = "Normal",
                    Link = "/emr/consultation-notes",
                    Time = c.ConsultationDate.ToString("MMM dd, yyyy"),
                    Unread = false,
                    CreatedAt = c.ConsultationDate
                });
            }
        }
        else if (string.Equals(normalizedRole, "Doctor", StringComparison.OrdinalIgnoreCase))
        {
            var activePatientCount = await _db.Patients.CountAsync();
            var pendingLabs = await _db.LabReports.CountAsync(l => l.Status == "Pending");

            notifs.Add(new EMRNotificationDto
            {
                Id = "notif-doc-patients",
                Title = "Registered Clinical Patients",
                Message = $"There are currently {activePatientCount} active patient charts in the EMR system.",
                Category = "Patients",
                Priority = "Normal",
                Link = "/emr/staff",
                Time = "Active System",
                Unread = false,
                CreatedAt = DateTime.UtcNow
            });

            if (pendingLabs > 0)
            {
                notifs.Add(new EMRNotificationDto
                {
                    Id = "notif-doc-labs",
                    Title = "Pending Diagnostic Tests",
                    Message = $"{pendingLabs} lab test(s) are currently undergoing laboratory analysis.",
                    Category = "Diagnostics",
                    Priority = "High",
                    Link = "/emr/staff",
                    Time = "Lab Queue",
                    Unread = true,
                    CreatedAt = DateTime.UtcNow
                });
            }
        }
        else if (string.Equals(normalizedRole, "Pharmacist", StringComparison.OrdinalIgnoreCase))
        {
            var activeRxCount = await _db.Prescriptions.CountAsync(p => p.Status == "Active");
            notifs.Add(new EMRNotificationDto
            {
                Id = "notif-ph-rx",
                Title = "Active Prescriptions Queue",
                Message = activeRxCount > 0
                    ? $"{activeRxCount} active prescription(s) registered in the clinical dispensary."
                    : "No active prescriptions waiting in dispensary queue.",
                Category = "Dispensing",
                Priority = activeRxCount > 0 ? "High" : "Low",
                Link = "/pharmacy/dashboard",
                Time = "Realtime",
                Unread = activeRxCount > 0,
                CreatedAt = DateTime.UtcNow
            });
        }
        else if (string.Equals(normalizedRole, "Laboratory", StringComparison.OrdinalIgnoreCase))
        {
            var pendingTests = await _db.LabReports.CountAsync(l => l.Status == "Pending");
            notifs.Add(new EMRNotificationDto
            {
                Id = "notif-lab-pending",
                Title = "Lab Requisitions Queue",
                Message = pendingTests > 0
                    ? $"{pendingTests} diagnostic investigation(s) awaiting completion."
                    : "All ordered lab diagnostics are completed. No pending requisitions.",
                Category = "Laboratory",
                Priority = pendingTests > 0 ? "High" : "Low",
                Link = "/lab/staff/dashboard",
                Time = "Realtime",
                Unread = pendingTests > 0,
                CreatedAt = DateTime.UtcNow
            });
        }
        else if (string.Equals(normalizedRole, "Admin", StringComparison.OrdinalIgnoreCase))
        {
            var totalUsers = await _db.Users.CountAsync();
            var totalPatients = await _db.Patients.CountAsync();
            notifs.Add(new EMRNotificationDto
            {
                Id = "notif-adm-stats",
                Title = "PostgreSQL EMR Database Active",
                Message = $"{totalPatients} registered EMR patients and {totalUsers} total system accounts synchronized.",
                Category = "System",
                Priority = "Normal",
                Link = "/admin/dashboard",
                Time = "Live",
                Unread = false,
                CreatedAt = DateTime.UtcNow
            });
        }

        return notifs;
    }

    // ─── Staff Authentication & Role Verification ─────────────────────────────

    public async Task<StaffLoginResponseDto> StaffLoginAsync(EmrStaffLoginDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.StaffIdOrEmail) || string.IsNullOrWhiteSpace(dto.Password))
        {
            throw new ArgumentException("Staff ID / Email and password are required.");
        }

        var input = dto.StaffIdOrEmail.Trim().ToLowerInvariant();

        // 1. Locate user in database by email, staff identifier, or full name
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == input);

        if (user == null)
        {
            if (input == "doc-01" || input == "doc-101" || input == "doctor" || input.StartsWith("doc"))
            {
                user = await _db.Users.FirstOrDefaultAsync(u => u.Role == UserRole.Doctor);
            }
            else if (input == "lab-01" || input == "lab-101" || input == "lab" || input.StartsWith("lab"))
            {
                user = await _db.Users.FirstOrDefaultAsync(u => u.Role == UserRole.Laboratory);
            }
            else if (input == "pharm-01" || input == "pharm-101" || input == "pharm" || input == "pharmacist" || input.StartsWith("pharm"))
            {
                user = await _db.Users.FirstOrDefaultAsync(u => u.Role == UserRole.Pharmacist);
            }
            else if (input == "admin-01" || input == "admin" || input.StartsWith("admin"))
            {
                user = await _db.Users.FirstOrDefaultAsync(u => u.Role == UserRole.Admin);
            }
            else
            {
                user = await _db.Users.FirstOrDefaultAsync(u => u.FullName.ToLower() == input);
            }
        }

        if (user == null || !BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
        {
            throw new UnauthorizedAccessException("Invalid staff credentials. Please check your Staff ID/Email and password.");
        }

        if (!user.IsActive)
        {
            throw new InvalidOperationException("Your staff account has been deactivated. Please contact the administrator.");
        }

        if (user.Role == UserRole.Patient)
        {
            throw new InvalidOperationException("Access Denied: Patient accounts are not authorized to log into the Hospital Staff & Admin Portal.");
        }

        // 2. Strict Role Enforcement (User Requirement):
        // - To log as Doctor: staff MUST be Doctor or Admin
        // - To log as Laboratorian: staff MUST be Laboratorian (Laboratory) or Admin
        // - To log as Pharmacist: staff MUST be Pharmacist or Admin
        // - To log as Admin: staff MUST be Admin
        var target = (dto.TargetRole ?? "").Trim();
        var userRole = user.Role;

        if (target.Equals("Consultant", StringComparison.OrdinalIgnoreCase) || target.Equals("Doctor", StringComparison.OrdinalIgnoreCase))
        {
            if (userRole != UserRole.Doctor && userRole != UserRole.Admin)
            {
                throw new InvalidOperationException(
                    $"Access Denied: Your registered role is '{userRole}'. To log in as a Doctor, you must have Doctor or Admin privileges. (A {userRole} cannot log in as a Doctor).");
            }
        }
        else if (target.Equals("Laboratorian", StringComparison.OrdinalIgnoreCase) || target.Equals("Laboratory", StringComparison.OrdinalIgnoreCase))
        {
            if (userRole != UserRole.Laboratory && userRole != UserRole.Admin)
            {
                throw new InvalidOperationException(
                    $"Access Denied: Your registered role is '{userRole}'. To log in as a Laboratorian, you must have Laboratorian (Lab Staff) or Admin privileges. (A {userRole} cannot log in as a Laboratorian).");
            }
        }
        else if (target.Equals("Pharmacist", StringComparison.OrdinalIgnoreCase))
        {
            if (userRole != UserRole.Pharmacist && userRole != UserRole.Admin)
            {
                throw new InvalidOperationException(
                    $"Access Denied: Your registered role is '{userRole}'. To log in as a Pharmacist, you must have Pharmacist or Admin privileges. (A {userRole} cannot log in as a Pharmacist).");
            }
        }
        else if (target.Equals("Admin", StringComparison.OrdinalIgnoreCase))
        {
            if (userRole != UserRole.Admin)
            {
                throw new InvalidOperationException(
                    $"Access Denied: Your registered role is '{userRole}'. To log in as an Admin, you must be a System Administrator.");
            }
        }

        var token = _jwtTokenGenerator.GenerateToken(user);

        return new StaffLoginResponseDto
        {
            Token = token,
            Role = target,
            StaffId = user.FullName ?? user.Email,
            User = new UserResponse
            {
                Id = user.Id,
                FullName = user.FullName,
                Email = user.Email,
                Role = user.Role,
                PatientCode = null
            }
        };
    }
}

