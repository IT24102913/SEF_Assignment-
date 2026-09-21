using HealthBridge.Api.Data;
using HealthBridge.Api.DTOs.Appointments;
using HealthBridge.Api.Models;
using HealthBridge.Api.Models.Appointments;
using Microsoft.EntityFrameworkCore;

namespace HealthBridge.Api.Services;

public class AppointmentService : IAppointmentService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<AppointmentService> _logger;

    private static readonly string[] FixedSpecialties = new[]
    {
        "Cardiology", "Neurology", "Orthopaedics", "Paediatrics",
        "Gynaecology", "Dermatology", "ENT", "General Medicine"
    };

    public AppointmentService(ApplicationDbContext context, ILogger<AppointmentService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<List<DoctorDto>> GetDoctorsAsync(string? search, string? specialization, string? hospitalBranch, string? date, string? sortBy)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var tomorrow = today.AddDays(1);

        var query = _context.Doctors
            .Include(d => d.Sessions)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            query = query.Where(d => d.FullName.ToLower().Contains(s) ||
                                     d.Specialization.ToLower().Contains(s) ||
                                     d.HospitalBranch.ToLower().Contains(s));
        }

        if (!string.IsNullOrWhiteSpace(specialization) && specialization != "ALL" && specialization != "All Specialties")
        {
            query = query.Where(d => d.Specialization.ToLower() == specialization.Trim().ToLower());
        }

        if (!string.IsNullOrWhiteSpace(hospitalBranch) && hospitalBranch != "ALL" && hospitalBranch != "All Hospitals")
        {
            query = query.Where(d => d.HospitalBranch.ToLower().Contains(hospitalBranch.Trim().ToLower()));
        }

        if (!string.IsNullOrWhiteSpace(date) && DateOnly.TryParse(date, out var filterDate))
        {
            query = query.Where(d => d.Sessions.Any(s => s.SessionDate == filterDate && s.IsActive && s.CurrentBookings < s.MaxCapacity));
        }

        var doctors = await query.ToListAsync();

        var result = doctors.Select(d =>
        {
            var upcomingSessions = d.Sessions.Where(s => s.IsActive && s.SessionDate >= today).ToList();
            var todaySessions = upcomingSessions.Where(s => s.SessionDate == today && s.CurrentBookings < s.MaxCapacity).ToList();
            var tomorrowSessions = upcomingSessions.Where(s => s.SessionDate == tomorrow && s.CurrentBookings < s.MaxCapacity).ToList();
            var totalAvailableSlots = upcomingSessions.Sum(s => Math.Max(0, s.MaxCapacity - s.CurrentBookings));

            return new DoctorDto
            {
                Id = d.Id,
                FullName = d.FullName,
                Specialization = d.Specialization,
                Qualifications = d.Qualifications,
                Hospital = d.Hospital,
                HospitalBranch = d.HospitalBranch,
                RoomNumber = d.RoomNumber,
                ConsultationFee = d.ConsultationFee,
                AvailableDays = d.AvailableDays,
                AvailableTime = d.AvailableTime,
                ImageUrl = d.ImageUrl,
                PhoneNumber = d.PhoneNumber,
                Rating = d.Rating,
                ReviewCount = d.ReviewCount,
                ExperienceYears = d.ExperienceYears,
                IsVerifiedConsultant = d.IsVerifiedConsultant,
                Bio = d.Bio,
                Email = d.Email,
                IsAvailable = d.IsAvailable,
                AvailableToday = todaySessions.Any(),
                AvailableTomorrow = tomorrowSessions.Any(),
                SlotsLeft = totalAvailableSlots
            };
        }).ToList();

        // Sort results
        result = sortBy?.ToLower() switch
        {
            "fee" or "fee_asc" => result.OrderBy(d => d.ConsultationFee).ToList(),
            "rating" => result.OrderByDescending(d => d.Rating).ThenByDescending(d => d.ReviewCount).ToList(),
            "experience" => result.OrderByDescending(d => d.ExperienceYears).ToList(),
            _ => result.OrderByDescending(d => d.Rating).ThenBy(d => d.FullName).ToList()
        };

        return result;
    }

    public async Task<List<SpecialtyCountDto>> GetSpecialtiesAsync()
    {
        var doctors = await _context.Doctors.Where(d => d.IsAvailable).ToListAsync();

        var list = new List<SpecialtyCountDto>();
        foreach (var specialty in FixedSpecialties)
        {
            var count = doctors.Count(d => d.Specialization.Equals(specialty, StringComparison.OrdinalIgnoreCase));
            var icon = specialty switch
            {
                "Cardiology" => "HeartPulse",
                "Neurology" => "Brain",
                "Orthopaedics" => "Bone",
                "Paediatrics" => "Baby",
                "Gynaecology" => "Activity",
                "Dermatology" => "Sparkles",
                "ENT" => "Headphones",
                "General Medicine" => "Stethoscope",
                _ => "Cross"
            };

            list.Add(new SpecialtyCountDto
            {
                Name = specialty,
                ConsultantCount = count,
                IconName = icon
            });
        }

        return list;
    }

    public async Task<DoctorDto?> GetDoctorByIdAsync(int id)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var doc = await _context.Doctors
            .Include(d => d.Sessions)
            .FirstOrDefaultAsync(d => d.Id == id);

        if (doc == null) return null;

        var upcoming = doc.Sessions.Where(s => s.IsActive && s.SessionDate >= today).ToList();

        return new DoctorDto
        {
            Id = doc.Id,
            FullName = doc.FullName,
            Specialization = doc.Specialization,
            Qualifications = doc.Qualifications,
            Hospital = doc.Hospital,
            HospitalBranch = doc.HospitalBranch,
            RoomNumber = doc.RoomNumber,
            ConsultationFee = doc.ConsultationFee,
            AvailableDays = doc.AvailableDays,
            AvailableTime = doc.AvailableTime,
            ImageUrl = doc.ImageUrl,
            PhoneNumber = doc.PhoneNumber,
            Rating = doc.Rating,
            ReviewCount = doc.ReviewCount,
            ExperienceYears = doc.ExperienceYears,
            IsVerifiedConsultant = doc.IsVerifiedConsultant,
            Bio = doc.Bio,
            Email = doc.Email,
            IsAvailable = doc.IsAvailable,
            AvailableToday = upcoming.Any(s => s.SessionDate == today && s.CurrentBookings < s.MaxCapacity),
            AvailableTomorrow = upcoming.Any(s => s.SessionDate == today.AddDays(1) && s.CurrentBookings < s.MaxCapacity),
            SlotsLeft = upcoming.Sum(s => Math.Max(0, s.MaxCapacity - s.CurrentBookings))
        };
    }

    public async Task<List<DoctorSessionDto>> GetDoctorSessionsAsync(int doctorId, DateOnly? date)
    {
        var query = _context.DoctorSessions
            .Include(s => s.Doctor)
            .Where(s => s.DoctorId == doctorId && s.IsActive);

        if (date.HasValue)
        {
            query = query.Where(s => s.SessionDate == date.Value);
        }
        else
        {
            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            query = query.Where(s => s.SessionDate >= today);
        }

        var list = await query
            .OrderBy(s => s.SessionDate)
            .ThenBy(s => s.SessionTime)
            .ToListAsync();

        return list.Select(s => new DoctorSessionDto
        {
            Id = s.Id,
            DoctorId = s.DoctorId,
            DoctorName = s.Doctor?.FullName ?? string.Empty,
            SessionDate = s.SessionDate.ToString("yyyy-MM-dd"),
            SessionTime = s.SessionTime.ToString("HH:mm"),
            TimeFormatted = FormatTimeSlot(s.SessionTime),
            MaxCapacity = s.MaxCapacity,
            CurrentBookings = s.CurrentBookings,
            IsAvailable = s.IsAvailable,
            SlotsLeft = Math.Max(0, s.MaxCapacity - s.CurrentBookings)
        }).ToList();
    }

    public async Task<AppointmentDto> BookAppointmentAsync(BookAppointmentRequest request, int? patientId)
    {
        var session = await _context.DoctorSessions
            .Include(s => s.Doctor)
            .FirstOrDefaultAsync(s => s.Id == request.DoctorSessionId);

        if (session == null)
            throw new InvalidOperationException("Selected doctor session was not found.");

        if (!session.IsActive || session.CurrentBookings >= session.MaxCapacity)
            throw new InvalidOperationException("Selected time slot is no longer available. Please select another slot.");

        var doctor = session.Doctor ?? await _context.Doctors.FindAsync(request.DoctorId)
            ?? throw new InvalidOperationException("Doctor not found.");

        // Allocate slot
        session.CurrentBookings += 1;
        var queueNumber = session.CurrentBookings;

        var fee = doctor.ConsultationFee;
        var serviceCharge = 300.00m;
        var total = fee + serviceCharge;

        var aptNumber = $"APT-{DateTime.UtcNow:yyyyMMdd}-{Random.Shared.Next(100, 999)}";

        var aptDateTime = session.SessionDate.ToDateTime(session.SessionTime, DateTimeKind.Utc);

        var appointment = new DoctorAppointment
        {
            AppointmentNumber = aptNumber,
            DoctorId = doctor.Id,
            Doctor = doctor,
            DoctorName = doctor.FullName,
            Specialization = doctor.Specialization,
            PatientId = patientId,
            PatientName = request.PatientName.Trim(),
            PatientPhone = request.PatientPhone.Trim(),
            PatientEmail = request.PatientEmail.Trim(),
            PatientNic = request.PatientNic.Trim(),
            PatientAddress = request.PatientAddress?.Trim(),
            AppointmentDate = aptDateTime,
            TimeSlot = FormatTimeSlot(session.SessionTime),
            DoctorSessionId = session.Id,
            DoctorSession = session,
            QueueNumber = queueNumber,
            ConsultationFee = fee,
            ServiceCharge = serviceCharge,
            TotalAmount = total,
            Status = AppointmentStatus.PendingPayment,
            PaymentMethod = "CreditCard",
            PaymentStatus = "Pending",
            Notes = request.Notes,
            CreatedAt = DateTime.UtcNow
        };

        _context.DoctorAppointments.Add(appointment);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Booked appointment {AptNo} for Doctor {DoctorId}, Queue #{QueueNo}",
            aptNumber, doctor.Id, queueNumber);

        return MapToDto(appointment, doctor.HospitalBranch);
    }

    public async Task<AppointmentDto> ProcessPaymentAsync(int appointmentId, PaymentRequest request)
    {
        var apt = await _context.DoctorAppointments
            .Include(a => a.Doctor)
            .Include(a => a.DoctorSession)
            .FirstOrDefaultAsync(a => a.Id == appointmentId);

        if (apt == null)
            throw new KeyNotFoundException("Appointment not found.");

        if (apt.Status == AppointmentStatus.Cancelled)
            throw new InvalidOperationException("Cannot pay for a cancelled appointment.");

        apt.PaymentMethod = request.PaymentMethod;
        apt.PaymentStatus = "Paid";
        apt.Status = AppointmentStatus.Confirmed;

        if (request.PaymentMethod == "CreditCard")
        {
            apt.PaymentReference = string.IsNullOrWhiteSpace(request.CardMaskedReference)
                ? "**** **** **** 3456"
                : request.CardMaskedReference;
        }
        else if (!string.IsNullOrWhiteSpace(request.BankReference))
        {
            apt.PaymentReference = request.BankReference;
        }
        else
        {
            apt.PaymentReference = $"WAL-{DateTime.UtcNow.Ticks % 1000000:D6}";
        }

        await _context.SaveChangesAsync();
        _logger.LogInformation("Payment processed for Appointment {AptNo}, Status Confirmed", apt.AppointmentNumber);

        return MapToDto(apt, apt.Doctor?.HospitalBranch);
    }

    public async Task<AppointmentDto> CancelAppointmentAsync(int appointmentId, int? patientId)
    {
        var apt = await _context.DoctorAppointments
            .Include(a => a.Doctor)
            .Include(a => a.DoctorSession)
            .FirstOrDefaultAsync(a => a.Id == appointmentId);

        if (apt == null)
            throw new KeyNotFoundException("Appointment not found.");

        if (patientId.HasValue && apt.PatientId.HasValue && apt.PatientId.Value != patientId.Value)
            throw new UnauthorizedAccessException("You are not authorized to cancel this appointment.");

        if (apt.Status == AppointmentStatus.Completed)
            throw new InvalidOperationException("Completed appointments cannot be cancelled.");

        apt.Status = AppointmentStatus.Cancelled;

        // Release slot capacity
        if (apt.DoctorSession != null && apt.DoctorSession.CurrentBookings > 0)
        {
            apt.DoctorSession.CurrentBookings -= 1;
        }

        await _context.SaveChangesAsync();
        _logger.LogInformation("Appointment {AptNo} cancelled, capacity freed", apt.AppointmentNumber);

        return MapToDto(apt, apt.Doctor?.HospitalBranch);
    }

    public async Task<AppointmentDto> RescheduleAppointmentAsync(int appointmentId, int newSessionId, int? patientId)
    {
        var apt = await _context.DoctorAppointments
            .Include(a => a.Doctor)
            .Include(a => a.DoctorSession)
            .FirstOrDefaultAsync(a => a.Id == appointmentId);

        if (apt == null)
            throw new KeyNotFoundException("Appointment not found.");

        if (patientId.HasValue && apt.PatientId.HasValue && apt.PatientId.Value != patientId.Value)
            throw new UnauthorizedAccessException("You are not authorized to reschedule this appointment.");

        if (apt.Status == AppointmentStatus.Completed || apt.Status == AppointmentStatus.Cancelled)
            throw new InvalidOperationException($"Cannot reschedule an appointment in {apt.Status} status.");

        var newSession = await _context.DoctorSessions
            .Include(s => s.Doctor)
            .FirstOrDefaultAsync(s => s.Id == newSessionId);

        if (newSession == null)
            throw new InvalidOperationException("New session slot not found.");

        if (!newSession.IsActive || newSession.CurrentBookings >= newSession.MaxCapacity)
            throw new InvalidOperationException("Selected reschedule slot is no longer available.");

        // Release old session
        if (apt.DoctorSession != null && apt.DoctorSession.CurrentBookings > 0)
        {
            apt.DoctorSession.CurrentBookings -= 1;
        }

        // Allocate new session
        newSession.CurrentBookings += 1;
        apt.DoctorSessionId = newSession.Id;
        apt.DoctorSession = newSession;
        apt.AppointmentDate = newSession.SessionDate.ToDateTime(newSession.SessionTime, DateTimeKind.Utc);
        apt.TimeSlot = FormatTimeSlot(newSession.SessionTime);
        apt.QueueNumber = newSession.CurrentBookings;

        await _context.SaveChangesAsync();
        _logger.LogInformation("Appointment {AptNo} rescheduled to {Date} {Slot}", apt.AppointmentNumber, apt.AppointmentDate, apt.TimeSlot);

        return MapToDto(apt, apt.Doctor?.HospitalBranch);
    }

    public async Task<List<AppointmentDto>> GetMyAppointmentsAsync(int? patientId, string? patientEmail, string? status)
    {
        var query = _context.DoctorAppointments
            .Include(a => a.Doctor)
            .Include(a => a.DoctorSession)
            .AsQueryable();

        if (patientId.HasValue && patientId.Value > 0)
        {
            query = query.Where(a => a.PatientId == patientId.Value ||
                                     (!string.IsNullOrEmpty(patientEmail) && a.PatientEmail.ToLower() == patientEmail.ToLower()));
        }
        else if (!string.IsNullOrEmpty(patientEmail))
        {
            query = query.Where(a => a.PatientEmail.ToLower() == patientEmail.ToLower());
        }

        if (!string.IsNullOrWhiteSpace(status) && status != "ALL")
        {
            if (Enum.TryParse<AppointmentStatus>(status, true, out var parsedStatus))
            {
                query = query.Where(a => a.Status == parsedStatus);
            }
        }

        var list = await query
            .OrderByDescending(a => a.AppointmentDate)
            .ThenBy(a => a.QueueNumber)
            .ToListAsync();

        return list.Select(a => MapToDto(a, a.Doctor?.HospitalBranch)).ToList();
    }

    public async Task<List<AppointmentDto>> GetAllAppointmentsAsync(string? search, string? status, int? doctorId)
    {
        var query = _context.DoctorAppointments
            .Include(a => a.Doctor)
            .Include(a => a.DoctorSession)
            .AsQueryable();

        if (doctorId.HasValue)
        {
            query = query.Where(a => a.DoctorId == doctorId.Value);
        }

        if (!string.IsNullOrWhiteSpace(status) && status != "ALL")
        {
            if (Enum.TryParse<AppointmentStatus>(status, true, out var parsedStatus))
            {
                query = query.Where(a => a.Status == parsedStatus);
            }
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            query = query.Where(a => a.PatientName.ToLower().Contains(s) ||
                                     a.DoctorName.ToLower().Contains(s) ||
                                     a.AppointmentNumber.ToLower().Contains(s) ||
                                     a.PatientNic.ToLower().Contains(s));
        }

        var list = await query
            .OrderByDescending(a => a.AppointmentDate)
            .ThenBy(a => a.QueueNumber)
            .ToListAsync();

        return list.Select(a => MapToDto(a, a.Doctor?.HospitalBranch)).ToList();
    }

    public async Task<AppointmentDto> UpdateStatusAsync(int appointmentId, string status, string? notes)
    {
        var apt = await _context.DoctorAppointments
            .Include(a => a.Doctor)
            .Include(a => a.DoctorSession)
            .FirstOrDefaultAsync(a => a.Id == appointmentId);

        if (apt == null)
            throw new KeyNotFoundException("Appointment not found.");

        if (!Enum.TryParse<AppointmentStatus>(status, true, out var newStatus))
            throw new ArgumentException($"Invalid status value: {status}");

        apt.Status = newStatus;
        if (!string.IsNullOrWhiteSpace(notes))
        {
            apt.Notes = notes;
        }

        // If cancelled, release slot
        if (newStatus == AppointmentStatus.Cancelled && apt.DoctorSession != null && apt.DoctorSession.CurrentBookings > 0)
        {
            apt.DoctorSession.CurrentBookings -= 1;
        }

        await _context.SaveChangesAsync();
        return MapToDto(apt, apt.Doctor?.HospitalBranch);
    }

    public async Task<DoctorStatsDto> GetStatsAsync()
    {
        var appointments = await _context.DoctorAppointments.ToListAsync();
        var today = DateTime.UtcNow.Date;

        return new DoctorStatsDto
        {
            TotalAppointments = appointments.Count,
            TodayQueueCount = appointments.Count(a => a.AppointmentDate.Date == today &&
                                                      (a.Status == AppointmentStatus.Confirmed || a.Status == AppointmentStatus.InProgress)),
            ConfirmedCount = appointments.Count(a => a.Status == AppointmentStatus.Confirmed),
            InProgressCount = appointments.Count(a => a.Status == AppointmentStatus.InProgress),
            CompletedCount = appointments.Count(a => a.Status == AppointmentStatus.Completed),
            TotalRevenue = appointments.Where(a => a.PaymentStatus == "Paid").Sum(a => a.TotalAmount)
        };
    }

    public async Task<bool> DeleteAppointmentAsync(int appointmentId)
    {
        var apt = await _context.DoctorAppointments
            .Include(a => a.DoctorSession)
            .FirstOrDefaultAsync(a => a.Id == appointmentId);

        if (apt == null) return false;

        if (apt.DoctorSession != null && apt.DoctorSession.CurrentBookings > 0 && apt.Status != AppointmentStatus.Cancelled)
        {
            apt.DoctorSession.CurrentBookings -= 1;
        }

        _context.DoctorAppointments.Remove(apt);
        await _context.SaveChangesAsync();
        return true;
    }

    private static string FormatTimeSlot(TimeOnly time)
    {
        var dt = DateTime.Today.Add(time.ToTimeSpan());
        return dt.ToString("hh:mm tt");
    }

    private static AppointmentDto MapToDto(DoctorAppointment apt, string? hospitalBranch)
    {
        var branch = hospitalBranch ?? "Health Bridge Hospital - Colombo";
        var dateFormatted = apt.AppointmentDate.ToString("yyyy-MM-dd");
        var qrPayload = $"MEDIX APPOINTMENT\nRef: {apt.AppointmentNumber}\nQueue: #{apt.QueueNumber:D2}\nDoctor: {apt.DoctorName}\nSpecialty: {apt.Specialization}\nDate: {dateFormatted} {apt.TimeSlot}\nPatient: {apt.PatientName} (NIC: {apt.PatientNic})\nHospital: {branch}\nStatus: {apt.Status}\nAmount: LKR {apt.TotalAmount:N2}";

        return new AppointmentDto
        {
            Id = apt.Id,
            AppointmentNumber = apt.AppointmentNumber,
            DoctorId = apt.DoctorId,
            DoctorName = apt.DoctorName,
            Specialization = apt.Specialization,
            Hospital = apt.Doctor?.Hospital ?? "Health Bridge Hospital",
            HospitalBranch = branch,
            PatientId = apt.PatientId,
            PatientName = apt.PatientName,
            PatientPhone = apt.PatientPhone,
            PatientEmail = apt.PatientEmail,
            PatientNic = apt.PatientNic,
            PatientAddress = apt.PatientAddress,
            AppointmentDate = dateFormatted,
            TimeSlot = apt.TimeSlot,
            DoctorSessionId = apt.DoctorSessionId,
            QueueNumber = apt.QueueNumber,
            ConsultationFee = apt.ConsultationFee,
            ServiceCharge = apt.ServiceCharge,
            TotalAmount = apt.TotalAmount,
            Status = apt.Status.ToString(),
            PaymentMethod = apt.PaymentMethod,
            PaymentStatus = apt.PaymentStatus,
            PaymentReference = apt.PaymentReference,
            Notes = apt.Notes,
            CreatedAt = apt.CreatedAt,
            QrCodeText = qrPayload
        };
    }
}
