using HealthBridge.Api.Data;
using HealthBridge.Api.DTOs.Appointments;
using HealthBridge.Api.Models;
using HealthBridge.Api.Models.Appointments;
using Microsoft.EntityFrameworkCore;
using MimeKit;
using MailKit.Net.Smtp;

namespace HealthBridge.Api.Services;

public class AppointmentService : IAppointmentService
{
    private readonly ApplicationDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly ILogger<AppointmentService> _logger;

    private static readonly string[] FixedSpecialties = new[]
    {
        "Cardiology", "Neurology", "Orthopaedics", "Paediatrics",
        "Gynaecology", "Dermatology", "ENT", "General Medicine"
    };

    public AppointmentService(
        ApplicationDbContext context,
        IConfiguration configuration,
        ILogger<AppointmentService> logger)
    {
        _context = context;
        _configuration = configuration;
        _logger = logger;
    }

    private static readonly TimeZoneInfo LocalHospitalTimeZone = GetHospitalTimeZone();

    private static TimeZoneInfo GetHospitalTimeZone()
    {
        // Try Sri Lanka Standard Time (Windows) or Asia/Colombo (Linux / macOS)
        try
        {
            return TimeZoneInfo.FindSystemTimeZoneById("Sri Lanka Standard Time");
        }
        catch
        {
            try
            {
                return TimeZoneInfo.FindSystemTimeZoneById("Asia/Colombo");
            }
            catch
            {
                // Custom fixed UTC+05:30 fallback for Sri Lanka Standard Time
                return TimeZoneInfo.CreateCustomTimeZone("SLST", TimeSpan.FromHours(5.5), "Sri Lanka Standard Time", "Sri Lanka Standard Time");
            }
        }
    }

    public static DateTime GetLocalNow()
    {
        return TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, LocalHospitalTimeZone);
    }

    public async Task<List<DoctorDto>> GetDoctorsAsync(string? search, string? specialization, string? hospitalBranch, string? date, string? sortBy)
    {
        var localNow = GetLocalNow();
        var today = DateOnly.FromDateTime(localNow);
        var nowTime = TimeOnly.FromDateTime(localNow);
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
            if (filterDate < today)
            {
                query = query.Where(d => false);
            }
            else if (filterDate == today)
            {
                query = query.Where(d => d.Sessions.Any(s => s.SessionDate == filterDate && s.IsActive && s.CurrentBookings < s.MaxCapacity && s.SessionTime > nowTime));
            }
            else
            {
                query = query.Where(d => d.Sessions.Any(s => s.SessionDate == filterDate && s.IsActive && s.CurrentBookings < s.MaxCapacity));
            }
        }

        var doctors = await query.ToListAsync();

        var result = doctors.Select(d =>
        {
            var upcomingSessions = d.Sessions.Where(s => s.IsActive && (s.SessionDate > today || (s.SessionDate == today && s.SessionTime > nowTime))).ToList();
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
        var localNow = GetLocalNow();
        var today = DateOnly.FromDateTime(localNow);
        var nowTime = TimeOnly.FromDateTime(localNow);
        var tomorrow = today.AddDays(1);

        var doc = await _context.Doctors
            .Include(d => d.Sessions)
            .FirstOrDefaultAsync(d => d.Id == id);

        if (doc == null) return null;

        var upcoming = doc.Sessions.Where(s => s.IsActive && (s.SessionDate > today || (s.SessionDate == today && s.SessionTime > nowTime))).ToList();

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
            AvailableTomorrow = upcoming.Any(s => s.SessionDate == tomorrow && s.CurrentBookings < s.MaxCapacity),
            SlotsLeft = upcoming.Sum(s => Math.Max(0, s.MaxCapacity - s.CurrentBookings))
        };
    }

    public async Task<List<DoctorSessionDto>> GetDoctorSessionsAsync(int doctorId, DateOnly? date)
    {
        var localNow = GetLocalNow();
        var today = DateOnly.FromDateTime(localNow);
        var nowTime = TimeOnly.FromDateTime(localNow);

        var query = _context.DoctorSessions
            .Include(s => s.Doctor)
            .Where(s => s.DoctorId == doctorId && s.IsActive);

        if (date.HasValue)
        {
            query = query.Where(s => s.SessionDate == date.Value);
        }
        else
        {
            query = query.Where(s => s.SessionDate >= today);
        }

        var list = await query
            .OrderBy(s => s.SessionDate)
            .ThenBy(s => s.SessionTime)
            .ToListAsync();

        return list.Select(s =>
        {
            var isPast = s.SessionDate < today || (s.SessionDate == today && s.SessionTime <= nowTime);
            var isAvailable = s.IsActive && !isPast && s.CurrentBookings < s.MaxCapacity;
            var slotsLeft = isPast ? 0 : Math.Max(0, s.MaxCapacity - s.CurrentBookings);

            return new DoctorSessionDto
            {
                Id = s.Id,
                DoctorId = s.DoctorId,
                DoctorName = s.Doctor?.FullName ?? string.Empty,
                SessionDate = s.SessionDate.ToString("yyyy-MM-dd"),
                SessionTime = s.SessionTime.ToString("HH:mm"),
                TimeFormatted = FormatTimeSlot(s.SessionTime),
                MaxCapacity = s.MaxCapacity,
                CurrentBookings = s.CurrentBookings,
                IsAvailable = isAvailable,
                IsExpired = isPast,
                SlotsLeft = slotsLeft,
                SessionStatus = isPast && s.SessionStatus == SessionStatus.Scheduled ? "Expired" : s.SessionStatus.ToString(),
                ActualStartTime = s.ActualStartTime,
                ExpectedStartTime = s.ExpectedStartTime,
                CurrentlyServingQueueNumber = s.CurrentlyServingQueueNumber,
                DelayReason = s.DelayReason
            };
        }).ToList();
    }

    public async Task<AppointmentDto> BookAppointmentAsync(BookAppointmentRequest request, int? patientId)
    {
        var localNow = GetLocalNow();
        var today = DateOnly.FromDateTime(localNow);
        var nowTime = TimeOnly.FromDateTime(localNow);

        var session = await _context.DoctorSessions
            .Include(s => s.Doctor)
            .FirstOrDefaultAsync(s => s.Id == request.DoctorSessionId);

        if (session == null)
        {
            throw new InvalidOperationException("Doctor session not found.");
        }

        if (session.SessionDate < today || (session.SessionDate == today && session.SessionTime <= nowTime))
        {
            throw new InvalidOperationException("Selected time slot has already passed and is no longer available.");
        }

        if (!session.IsActive || session.CurrentBookings >= session.MaxCapacity)
        {
            throw new InvalidOperationException("Selected time slot is no longer available. Please select another slot.");
        }

        var doctor = session.Doctor ?? await _context.Doctors.FindAsync(request.DoctorId)
            ?? throw new InvalidOperationException("Doctor not found.");

        session.CurrentBookings += 1;
        var queueNumber = session.CurrentBookings;
        var aptNumber = $"APT-{session.SessionDate:yyyyMMdd}-{session.Id:D4}-{queueNumber:D3}";
        var aptDateTime = session.SessionDate.ToDateTime(session.SessionTime, DateTimeKind.Utc);

        var fee = doctor.ConsultationFee;
        var serviceCharge = 300.00m;
        var total = fee + serviceCharge;

        var isReservation = string.Equals(request.BookingType, "Reservation", StringComparison.OrdinalIgnoreCase);
        var bookingType = isReservation ? BookingType.Reservation : BookingType.OnlinePayment;
        var initialStatus = isReservation ? AppointmentStatus.Reserved : AppointmentStatus.PendingPayment;
        var paymentStatus = isReservation ? "NotRequired" : "Pending";
        var paymentMethod = isReservation ? "PayOnArrival" : "CreditCard";

        var qrToken = Guid.NewGuid();

        var appointment = new DoctorAppointment
        {
            AppointmentNumber = aptNumber,
            DoctorId = doctor.Id,
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
            QueueNumber = queueNumber,
            ConsultationFee = fee,
            ServiceCharge = serviceCharge,
            TotalAmount = total,
            Status = initialStatus,
            BookingType = bookingType,
            QrToken = qrToken,
            ArrivalStatus = ArrivalStatus.NotArrived,
            QueueStatus = QueueStatus.NotCheckedIn,
            PaymentMethod = paymentMethod,
            PaymentStatus = paymentStatus,
            Notes = request.Notes,
            CreatedAt = DateTime.UtcNow
        };

        _context.DoctorAppointments.Add(appointment);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Booked appointment {AptNo} for Doctor {DoctorId}, Queue #{QueueNo}, BookingType={Type}",
            aptNumber, doctor.Id, queueNumber, bookingType);

        // Send booking confirmation email asynchronously (fire-and-forget safe)
        _ = SendChannelingEmailAsync(
            appointment.PatientEmail,
            appointment.PatientName,
            isReservation ? $"Reservation Confirmed: {appointment.AppointmentNumber}" : $"Appointment Booking Created: {appointment.AppointmentNumber}",
            $@"<h2>HealthBridge Channeling {(isReservation ? "Reservation" : "Booking")}</h2>
               <p>Dear {appointment.PatientName},</p>
               <p>Your appointment with <strong>{appointment.DoctorName}</strong> ({appointment.Specialization}) has been {(isReservation ? "reserved" : "created")}.</p>
               <ul>
                 <li><strong>Appointment Ref:</strong> {appointment.AppointmentNumber}</li>
                 <li><strong>Queue Number:</strong> #{appointment.QueueNumber}</li>
                 <li><strong>Date & Time:</strong> {appointment.AppointmentDate:yyyy-MM-dd} at {appointment.TimeSlot}</li>
                 <li><strong>Status:</strong> {appointment.Status}</li>
                 <li><strong>Fee:</strong> LKR {appointment.TotalAmount:N2}</li>
               </ul>
               <p>Please present your Check-in QR Token on arrival at the hospital channeling desk: <code>{appointment.QrToken}</code></p>");

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

        // Payment decline test branch (e.g. card ending in 0000 or contains 'decline' / 'fail')
        if (request.PaymentMethod == "CreditCard" && !string.IsNullOrWhiteSpace(request.CardMaskedReference))
        {
            var refLower = request.CardMaskedReference.ToLower();
            if (refLower.Contains("decline") || refLower.Contains("fail") || refLower.EndsWith("0000"))
            {
                apt.PaymentStatus = "Failed";
                await _context.SaveChangesAsync();
                _logger.LogWarning("Payment declined for appointment {AptNo}", apt.AppointmentNumber);
                throw new InvalidOperationException("Payment was declined by the card issuer. Please use another card.");
            }
        }

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

        // Send confirmation email
        _ = SendChannelingEmailAsync(
            apt.PatientEmail,
            apt.PatientName,
            $"Payment Confirmed - HealthBridge Appointment #{apt.QueueNumber}",
            $@"<h2>Payment Confirmation</h2>
               <p>Dear {apt.PatientName},</p>
               <p>Your payment of <strong>LKR {apt.TotalAmount:N2}</strong> for Appointment <strong>{apt.AppointmentNumber}</strong> has been successfully received.</p>
               <p>Doctor: {apt.DoctorName} | Queue: #{apt.QueueNumber}</p>
               <p>Your check-in QR Token is: <code>{apt.QrToken}</code></p>");

        return MapToDto(apt, apt.Doctor?.HospitalBranch);
    }

    public async Task<AppointmentDto> CancelAppointmentAsync(int appointmentId, int? patientId, bool isAdmin = false)
    {
        var apt = await _context.DoctorAppointments
            .Include(a => a.Doctor)
            .Include(a => a.DoctorSession)
            .FirstOrDefaultAsync(a => a.Id == appointmentId);

        if (apt == null)
            throw new KeyNotFoundException("Appointment not found.");

        if (!isAdmin && patientId.HasValue && apt.PatientId.HasValue && apt.PatientId.Value != patientId.Value)
            throw new UnauthorizedAccessException("You are not authorized to cancel this appointment.");

        if (apt.Status == AppointmentStatus.Completed)
            throw new InvalidOperationException("Completed appointments cannot be cancelled.");

        apt.Status = AppointmentStatus.Cancelled;
        apt.QueueStatus = QueueStatus.Skipped;

        // Release slot capacity
        if (apt.DoctorSession != null && apt.DoctorSession.CurrentBookings > 0)
        {
            apt.DoctorSession.CurrentBookings -= 1;
        }

        await _context.SaveChangesAsync();
        _logger.LogInformation("Appointment {AptNo} cancelled, capacity freed", apt.AppointmentNumber);

        _ = SendChannelingEmailAsync(
            apt.PatientEmail,
            apt.PatientName,
            $"Appointment Cancelled - {apt.AppointmentNumber}",
            $@"<h2>Appointment Cancellation</h2>
               <p>Dear {apt.PatientName},</p>
               <p>Your appointment <strong>{apt.AppointmentNumber}</strong> with {apt.DoctorName} on {apt.AppointmentDate:yyyy-MM-dd} has been cancelled.</p>");

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
            throw new KeyNotFoundException("Selected reschedule session not found.");

        var localNow = GetLocalNow();
        var today = DateOnly.FromDateTime(localNow);
        var nowTime = TimeOnly.FromDateTime(localNow);

        if (newSession.SessionDate < today || (newSession.SessionDate == today && newSession.SessionTime <= nowTime))
        {
            throw new InvalidOperationException("Selected reschedule slot has already passed. Please choose an upcoming slot.");
        }

        if (!newSession.IsActive || newSession.CurrentBookings >= newSession.MaxCapacity)
            throw new InvalidOperationException("Selected reschedule slot is no longer available.");

        // Release old session capacity
        if (apt.DoctorSessionId.HasValue)
        {
            var oldSession = await _context.DoctorSessions.FindAsync(apt.DoctorSessionId.Value);
            if (oldSession != null && oldSession.CurrentBookings > 0)
            {
                oldSession.CurrentBookings -= 1;
            }
        }

        newSession.CurrentBookings += 1;

        apt.DoctorSessionId = newSession.Id;
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

        if (newStatus == AppointmentStatus.InProgress)
        {
            apt.QueueStatus = QueueStatus.InConsultation;
        }
        else if (newStatus == AppointmentStatus.Completed)
        {
            apt.QueueStatus = QueueStatus.Completed;
        }
        else if (newStatus == AppointmentStatus.NoShow)
        {
            apt.QueueStatus = QueueStatus.NoShow;
        }
        else if (newStatus == AppointmentStatus.Cancelled && apt.DoctorSession != null && apt.DoctorSession.CurrentBookings > 0)
        {
            apt.QueueStatus = QueueStatus.Skipped;
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
                                                      (a.Status == AppointmentStatus.Confirmed || a.Status == AppointmentStatus.Reserved || a.Status == AppointmentStatus.InProgress)),
            ConfirmedCount = appointments.Count(a => a.Status == AppointmentStatus.Confirmed || a.Status == AppointmentStatus.Reserved),
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

    // ── Phase 2 Workflow Operations ────────────────────────────────────────────────

    public async Task<AppointmentDto> CheckInAsync(int appointmentId, string qrToken)
    {
        var apt = await _context.DoctorAppointments
            .Include(a => a.Doctor)
            .Include(a => a.DoctorSession)
            .FirstOrDefaultAsync(a => a.Id == appointmentId);

        if (apt == null)
            throw new KeyNotFoundException("Appointment not found.");

        // Validation 1: Token resolves to appointment
        if (!Guid.TryParse(qrToken, out var parsedToken) || apt.QrToken != parsedToken)
        {
            throw new InvalidOperationException("Invalid QR check-in token.");
        }

        // Validation 2: Status is Confirmed or Reserved
        if (apt.Status != AppointmentStatus.Confirmed && apt.Status != AppointmentStatus.Reserved)
        {
            throw new InvalidOperationException($"Cannot check in an appointment with status: {apt.Status}.");
        }

        // Validation 3: Not already checked in
        if (apt.CheckedInAt.HasValue)
        {
            throw new InvalidOperationException("Patient has already checked in for this appointment.");
        }

        // Validation 4: Parent session IsActive
        if (apt.DoctorSession == null || !apt.DoctorSession.IsActive || apt.DoctorSession.SessionStatus == SessionStatus.Cancelled)
        {
            throw new InvalidOperationException("The doctor's session for this appointment is not active.");
        }

        var now = DateTime.UtcNow;
        var earlyThreshold = int.TryParse(_configuration["CheckIn:EarlyThresholdMinutes"], out var t) ? t : 15;

        var expectedStart = apt.DoctorSession.ExpectedStartTime ?? 
            apt.DoctorSession.SessionDate.ToDateTime(apt.DoctorSession.SessionTime, DateTimeKind.Utc);

        var diffMinutes = (expectedStart - now).TotalMinutes;
        ArrivalStatus arrival;
        if (diffMinutes > earlyThreshold)
        {
            arrival = ArrivalStatus.Early;
        }
        else if (diffMinutes >= -earlyThreshold)
        {
            arrival = ArrivalStatus.OnTime;
        }
        else
        {
            arrival = ArrivalStatus.Late;
        }

        apt.CheckedInAt = now;
        apt.ArrivalStatus = arrival;
        apt.QueueStatus = QueueStatus.Waiting;

        await _context.SaveChangesAsync();
        _logger.LogInformation("Patient checked in for Appointment {AptNo}. ArrivalStatus={Status}", apt.AppointmentNumber, arrival);

        _ = SendChannelingEmailAsync(
            apt.PatientEmail,
            apt.PatientName,
            $"Checked In - HealthBridge Queue #{apt.QueueNumber}",
            $@"<h2>Check-In Confirmed</h2>
               <p>Dear {apt.PatientName},</p>
               <p>You have successfully checked in for your consultation with <strong>{apt.DoctorName}</strong>.</p>
               <p><strong>Queue Number:</strong> #{apt.QueueNumber}</p>
               <p><strong>Arrival Status:</strong> {arrival}</p>
               <p>Please take a seat in the waiting area. Your number will be called shortly.</p>");

        return MapToDto(apt, apt.Doctor?.HospitalBranch);
    }

    public async Task<DoctorSessionQueueDto> GetSessionQueueAsync(int sessionId)
    {
        var session = await _context.DoctorSessions
            .Include(s => s.Doctor)
            .FirstOrDefaultAsync(s => s.Id == sessionId);

        if (session == null)
            throw new KeyNotFoundException("Doctor session not found.");

        var queueAppointments = await _context.DoctorAppointments
            .Include(a => a.Doctor)
            .Where(a => a.DoctorSessionId == sessionId &&
                       (a.QueueStatus == QueueStatus.Waiting || a.QueueStatus == QueueStatus.Called || a.QueueStatus == QueueStatus.InConsultation))
            .OrderBy(a => a.QueueNumber)
            .ToListAsync();

        return new DoctorSessionQueueDto
        {
            SessionId = session.Id,
            DoctorId = session.DoctorId,
            DoctorName = session.Doctor?.FullName ?? string.Empty,
            Specialization = session.Doctor?.Specialization ?? string.Empty,
            SessionStatus = session.SessionStatus.ToString(),
            SessionDate = session.SessionDate.ToString("yyyy-MM-dd"),
            SessionTime = session.SessionTime.ToString("HH:mm"),
            ExpectedStartTime = session.ExpectedStartTime,
            ActualStartTime = session.ActualStartTime,
            CurrentlyServingQueueNumber = session.CurrentlyServingQueueNumber,
            DelayReason = session.DelayReason,
            Queue = queueAppointments.Select(a => MapToDto(a, session.Doctor?.HospitalBranch)).ToList()
        };
    }

    public async Task<DoctorSessionDto> StartSessionAsync(int sessionId)
    {
        var session = await _context.DoctorSessions
            .Include(s => s.Doctor)
            .FirstOrDefaultAsync(s => s.Id == sessionId);

        if (session == null)
            throw new KeyNotFoundException("Doctor session not found.");

        if (session.SessionStatus == SessionStatus.Cancelled || session.SessionStatus == SessionStatus.Completed)
        {
            throw new InvalidOperationException($"Cannot start a session in {session.SessionStatus} state.");
        }

        session.SessionStatus = SessionStatus.Active;
        session.ActualStartTime ??= DateTime.UtcNow;

        await _context.SaveChangesAsync();
        _logger.LogInformation("Doctor session {SessionId} started at {Time}", sessionId, session.ActualStartTime);

        return new DoctorSessionDto
        {
            Id = session.Id,
            DoctorId = session.DoctorId,
            DoctorName = session.Doctor?.FullName ?? string.Empty,
            SessionDate = session.SessionDate.ToString("yyyy-MM-dd"),
            SessionTime = session.SessionTime.ToString("HH:mm"),
            TimeFormatted = FormatTimeSlot(session.SessionTime),
            MaxCapacity = session.MaxCapacity,
            CurrentBookings = session.CurrentBookings,
            IsAvailable = session.IsAvailable,
            SlotsLeft = Math.Max(0, session.MaxCapacity - session.CurrentBookings),
            SessionStatus = session.SessionStatus.ToString(),
            ActualStartTime = session.ActualStartTime,
            ExpectedStartTime = session.ExpectedStartTime,
            CurrentlyServingQueueNumber = session.CurrentlyServingQueueNumber,
            DelayReason = session.DelayReason
        };
    }

    public async Task<DoctorSessionDto> DelaySessionAsync(int sessionId, DateTime expectedStartTime, string? reason)
    {
        var session = await _context.DoctorSessions
            .Include(s => s.Doctor)
            .FirstOrDefaultAsync(s => s.Id == sessionId);

        if (session == null)
            throw new KeyNotFoundException("Doctor session not found.");

        if (session.SessionStatus == SessionStatus.Cancelled || session.SessionStatus == SessionStatus.Completed)
        {
            throw new InvalidOperationException($"Cannot delay a session in {session.SessionStatus} state.");
        }

        session.SessionStatus = SessionStatus.Delayed;
        session.ExpectedStartTime = expectedStartTime;
        session.DelayReason = reason;

        await _context.SaveChangesAsync();
        _logger.LogInformation("Doctor session {SessionId} delayed to {ExpectedTime}. Reason: {Reason}", sessionId, expectedStartTime, reason);

        return new DoctorSessionDto
        {
            Id = session.Id,
            DoctorId = session.DoctorId,
            DoctorName = session.Doctor?.FullName ?? string.Empty,
            SessionDate = session.SessionDate.ToString("yyyy-MM-dd"),
            SessionTime = session.SessionTime.ToString("HH:mm"),
            TimeFormatted = FormatTimeSlot(session.SessionTime),
            MaxCapacity = session.MaxCapacity,
            CurrentBookings = session.CurrentBookings,
            IsAvailable = session.IsAvailable,
            SlotsLeft = Math.Max(0, session.MaxCapacity - session.CurrentBookings),
            SessionStatus = session.SessionStatus.ToString(),
            ActualStartTime = session.ActualStartTime,
            ExpectedStartTime = session.ExpectedStartTime,
            CurrentlyServingQueueNumber = session.CurrentlyServingQueueNumber,
            DelayReason = session.DelayReason
        };
    }

    public async Task<AppointmentDto> CallNextPatientAsync(int sessionId)
    {
        var nextApt = await _context.DoctorAppointments
            .Include(a => a.Doctor)
            .Include(a => a.DoctorSession)
            .Where(a => a.DoctorSessionId == sessionId && a.QueueStatus == QueueStatus.Waiting)
            .OrderBy(a => a.QueueNumber)
            .FirstOrDefaultAsync();

        if (nextApt == null)
        {
            throw new KeyNotFoundException("No patients waiting in queue for this session.");
        }

        nextApt.QueueStatus = QueueStatus.Called;
        nextApt.CalledAt = DateTime.UtcNow;

        var session = await _context.DoctorSessions.FindAsync(sessionId);
        if (session != null)
        {
            session.CurrentlyServingQueueNumber = nextApt.QueueNumber;
            if (session.SessionStatus == SessionStatus.Scheduled || session.SessionStatus == SessionStatus.Delayed)
            {
                session.SessionStatus = SessionStatus.Active;
                session.ActualStartTime ??= DateTime.UtcNow;
            }
        }

        await _context.SaveChangesAsync();
        _logger.LogInformation("Calling next patient for session {SessionId}: Queue #{QueueNo} (Apt {AptNo})",
            sessionId, nextApt.QueueNumber, nextApt.AppointmentNumber);

        return MapToDto(nextApt, nextApt.Doctor?.HospitalBranch);
    }

    public async Task<DoctorSessionDto> CancelSessionAsync(int sessionId)
    {
        var session = await _context.DoctorSessions
            .Include(s => s.Doctor)
            .FirstOrDefaultAsync(s => s.Id == sessionId);

        if (session == null)
            throw new KeyNotFoundException("Doctor session not found.");

        session.SessionStatus = SessionStatus.Cancelled;
        session.IsActive = false;

        // Cascade cancel affected appointments
        var affectedAppointments = await _context.DoctorAppointments
            .Where(a => a.DoctorSessionId == sessionId &&
                       (a.Status == AppointmentStatus.Confirmed ||
                        a.Status == AppointmentStatus.Reserved ||
                        a.Status == AppointmentStatus.PendingPayment))
            .ToListAsync();

        foreach (var apt in affectedAppointments)
        {
            apt.Status = AppointmentStatus.Cancelled;
            apt.QueueStatus = QueueStatus.Skipped;

            _ = SendChannelingEmailAsync(
                apt.PatientEmail,
                apt.PatientName,
                $"Session Cancelled: Appointment {apt.AppointmentNumber}",
                $@"<h2>Doctor Session Cancelled</h2>
                   <p>Dear {apt.PatientName},</p>
                   <p>We regret to inform you that the consultation session for <strong>{session.Doctor?.FullName}</strong> on {session.SessionDate:yyyy-MM-dd} at {FormatTimeSlot(session.SessionTime)} has been cancelled.</p>
                   <p>Your appointment <strong>{apt.AppointmentNumber}</strong> has been cancelled. Please log in to your portal to reschedule or contact our desk for support.</p>");
        }

        await _context.SaveChangesAsync();
        _logger.LogInformation("Cancelled doctor session {SessionId}, cascaded to {Count} appointments", sessionId, affectedAppointments.Count);

        return new DoctorSessionDto
        {
            Id = session.Id,
            DoctorId = session.DoctorId,
            DoctorName = session.Doctor?.FullName ?? string.Empty,
            SessionDate = session.SessionDate.ToString("yyyy-MM-dd"),
            SessionTime = session.SessionTime.ToString("HH:mm"),
            TimeFormatted = FormatTimeSlot(session.SessionTime),
            MaxCapacity = session.MaxCapacity,
            CurrentBookings = session.CurrentBookings,
            IsAvailable = false,
            SlotsLeft = 0,
            SessionStatus = session.SessionStatus.ToString(),
            ActualStartTime = session.ActualStartTime,
            ExpectedStartTime = session.ExpectedStartTime,
            CurrentlyServingQueueNumber = session.CurrentlyServingQueueNumber,
            DelayReason = session.DelayReason
        };
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

        // QR payload contains ONLY the secure server-generated QrToken (NO PHI!)
        var qrPayload = apt.QrToken.ToString();
        var summary = $"Ref: {apt.AppointmentNumber} | Queue: #{apt.QueueNumber:D2} | Doctor: {apt.DoctorName} | Patient: {apt.PatientName} | Date: {dateFormatted} {apt.TimeSlot}";

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
            BookingType = apt.BookingType.ToString(),
            QrToken = apt.QrToken,
            CheckedInAt = apt.CheckedInAt,
            ArrivalStatus = apt.ArrivalStatus.ToString(),
            QueueStatus = apt.QueueStatus.ToString(),
            CalledAt = apt.CalledAt,
            PaymentMethod = apt.PaymentMethod,
            PaymentStatus = apt.PaymentStatus,
            PaymentReference = apt.PaymentReference,
            Notes = apt.Notes,
            CreatedAt = apt.CreatedAt,
            QrCodeText = qrPayload,
            DisplaySummary = summary
        };
    }

    private async Task SendChannelingEmailAsync(string toEmail, string toName, string subject, string htmlBody)
    {
        if (string.IsNullOrWhiteSpace(toEmail)) return;
        try
        {
            var smtpServer = _configuration["Brevo:SmtpServer"] ?? "smtp-relay.brevo.com";
            var smtpPort = int.TryParse(_configuration["Brevo:SmtpPort"], out var p) ? p : 587;
            var smtpUser = _configuration["Brevo:SmtpUser"];
            var smtpPass = _configuration["Brevo:SmtpPass"];
            var fromEmail = _configuration["Brevo:FromEmail"] ?? "noreply@healthbridge.com";
            var fromName = _configuration["Brevo:FromName"] ?? "HealthBridge Channeling";

            if (string.IsNullOrWhiteSpace(smtpUser) || string.IsNullOrWhiteSpace(smtpPass))
            {
                _logger.LogInformation("[Email Mock] TO={To} | SUBJECT={Subject}", toEmail, subject);
                return;
            }

            var message = new MimeMessage();
            message.From.Add(new MailboxAddress(fromName, fromEmail));
            message.To.Add(new MailboxAddress(toName, toEmail));
            message.Subject = subject;

            var builder = new BodyBuilder { HtmlBody = htmlBody };
            message.Body = builder.ToMessageBody();

            using var client = new SmtpClient();
            await client.ConnectAsync(smtpServer, smtpPort, MailKit.Security.SecureSocketOptions.StartTls);
            await client.AuthenticateAsync(smtpUser, smtpPass);
            await client.SendAsync(message);
            await client.DisconnectAsync(true);
            _logger.LogInformation("[Email] Channeling notification sent to {Email}", toEmail);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "[Email] Could not send channeling email to {Email}", toEmail);
        }
    }
}
