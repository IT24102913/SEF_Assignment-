using HealthBridge.Api.Data;
using HealthBridge.Api.DTOs.Appointments;
using HealthBridge.Api.Models;
using HealthBridge.Api.Models.Appointments;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using QRCoder;
using System.Text.Json;

namespace HealthBridge.Api.Services;

public class AppointmentService : IAppointmentService
{
    private readonly ApplicationDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly ILogger<AppointmentService> _logger;
    private readonly IEmailSender _emailSender;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IDoctorEmailService? _emailService;

    public AppointmentService(
        ApplicationDbContext context,
        IConfiguration configuration,
        ILogger<AppointmentService> logger,
        IEmailSender emailSender,
        IServiceScopeFactory scopeFactory,
        IDoctorEmailService? emailService = null)
    {
        _context       = context;
        _configuration = configuration;
        _logger        = logger;
        _emailSender   = emailSender;
        _scopeFactory  = scopeFactory;
        _emailService  = emailService;
    }

    private static readonly string[] FixedSpecialties = new[]
    {
        "Cardiology", "Neurology", "Orthopaedics", "Paediatrics",
        "Gynaecology", "Dermatology", "ENT", "General Medicine"
    };



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

    public static int GetSessionDurationMinutes(SessionType sessionType)
    {
        return sessionType switch
        {
            SessionType.Morning => 210, // 08:30 - 12:00
            SessionType.Evening => 180, // 16:30 - 19:30
            SessionType.Night   => 120, // 20:00 - 22:00
            _ => 180
        };
    }

    public static string FormatQueueLabel(SessionType sessionType, int queueNumber)
    {
        var prefix = sessionType switch
        {
            SessionType.Morning => "M",
            SessionType.Evening => "E",
            SessionType.Night   => "N",
            _ => "S"
        };
        return $"{prefix}-{queueNumber:D2}";
    }

    public static string FormatSessionWindow(SessionType sessionType, DateOnly sessionDate)
    {
        return sessionType switch
        {
            SessionType.Morning => "Morning Session, 08:30 AM – 12:00 PM",
            SessionType.Evening => "Evening Session, 04:30 PM – 07:30 PM",
            SessionType.Night   => "Night Session, 08:00 PM – 10:00 PM",
            _ => $"{sessionType} Session"
        };
    }

    public static (DateTime Estimated, DateTime RecommendedArrival) EstimateConsultationTime(
        DateTime sessionStart,
        int queueNumber,
        int sessionDurationMinutes,
        int maxCapacity,
        int arrivalBufferMinutes = 20)
    {
        if (sessionStart < DateTime.MinValue.AddDays(1))
        {
            sessionStart = DateTime.Today;
        }

        var effectiveCap = maxCapacity > 0 ? maxCapacity : 25;
        var avgMinutesPerPatient = sessionDurationMinutes / (double)effectiveCap;
        var estimated = sessionStart.AddMinutes(Math.Max(0, queueNumber - 1) * avgMinutesPerPatient);
        var sessionEnd = sessionStart.AddMinutes(sessionDurationMinutes);
        if (estimated > sessionEnd) estimated = sessionEnd;
        var recommendedArrival = estimated > DateTime.MinValue.AddMinutes(arrivalBufferMinutes)
            ? estimated.AddMinutes(-arrivalBufferMinutes)
            : sessionStart;
        if (recommendedArrival < sessionStart) recommendedArrival = sessionStart;
        if (recommendedArrival > sessionEnd) recommendedArrival = sessionEnd;
        return (estimated, recommendedArrival);
    }

    public async Task<List<DoctorDto>> GetDoctorsAsync(string? search, string? specialization, string? hospitalBranch, string? date, string? sortBy)
    {
        var localNow = GetLocalNow();
        var today = DateOnly.FromDateTime(localNow);
        var nowTime = TimeOnly.FromDateTime(localNow);
        var tomorrow = today.AddDays(1);

        var query = _context.Doctors
            .Include(d => d.Sessions)
            .Include(d => d.Schedules)
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
                query = query.Where(d => 
                    d.Sessions.Any(s => s.SessionDate == filterDate && s.IsActive && s.CurrentBookings < s.MaxCapacity && s.SessionTime > nowTime) ||
                    d.Schedules.Any(s => s.IsActive && s.DayOfWeek == filterDate.DayOfWeek && s.EndTime > nowTime));
            }
            else
            {
                query = query.Where(d => 
                    d.Sessions.Any(s => s.SessionDate == filterDate && s.IsActive && s.CurrentBookings < s.MaxCapacity) ||
                    d.Schedules.Any(s => s.IsActive && s.DayOfWeek == filterDate.DayOfWeek));
            }
        }

        var doctors = await query.ToListAsync();

        var result = doctors.Select(d =>
        {
            var upcomingSessions = d.Sessions.Where(s => s.IsActive && (s.SessionDate > today || (s.SessionDate == today && s.SessionTime > nowTime))).ToList();
            var todaySessions = upcomingSessions.Where(s => s.SessionDate == today && s.CurrentBookings < s.MaxCapacity).ToList();
            var tomorrowSessions = upcomingSessions.Where(s => s.SessionDate == tomorrow && s.CurrentBookings < s.MaxCapacity).ToList();

            var hasTodaySchedule = d.Schedules.Any(s => s.IsActive && s.DayOfWeek == today.DayOfWeek && s.EndTime > nowTime);
            var hasTomorrowSchedule = d.Schedules.Any(s => s.IsActive && s.DayOfWeek == tomorrow.DayOfWeek);

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
                AvailableToday = todaySessions.Any() || hasTodaySchedule,
                AvailableTomorrow = tomorrowSessions.Any() || hasTomorrowSchedule,
                SlotsLeft = totalAvailableSlots > 0 ? totalAvailableSlots : (hasTodaySchedule || hasTomorrowSchedule ? 15 : 0)
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
            .Include(d => d.Schedules)
            .FirstOrDefaultAsync(d => d.Id == id);

        if (doc == null) return null;

        var upcoming = doc.Sessions.Where(s => s.IsActive && (s.SessionDate > today || (s.SessionDate == today && s.SessionTime > nowTime))).ToList();
        var hasTodaySchedule = doc.Schedules.Any(s => s.IsActive && s.DayOfWeek == today.DayOfWeek && s.EndTime > nowTime);
        var hasTomorrowSchedule = doc.Schedules.Any(s => s.IsActive && s.DayOfWeek == tomorrow.DayOfWeek);
        var totalAvailableSlots = upcoming.Sum(s => Math.Max(0, s.MaxCapacity - s.CurrentBookings));

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
            AvailableToday = upcoming.Any(s => s.SessionDate == today && s.CurrentBookings < s.MaxCapacity) || hasTodaySchedule,
            AvailableTomorrow = upcoming.Any(s => s.SessionDate == tomorrow && s.CurrentBookings < s.MaxCapacity) || hasTomorrowSchedule,
            SlotsLeft = totalAvailableSlots > 0 ? totalAvailableSlots : (hasTodaySchedule || hasTomorrowSchedule ? 15 : 0)
        };
    }

    public async Task<List<DoctorSessionDto>> GetDoctorSessionsAsync(int doctorId, DateOnly? date)
    {
        var localNow = GetLocalNow();
        var today = DateOnly.FromDateTime(localNow);
        var nowTime = TimeOnly.FromDateTime(localNow);

        // 1. Determine target dates: specific date or next 14 days
        List<DateOnly> targetDates;
        if (date.HasValue)
        {
            targetDates = new List<DateOnly> { date.Value };
        }
        else
        {
            // Up to 14 days ahead
            targetDates = Enumerable.Range(0, 14).Select(i => today.AddDays(i)).ToList();
        }

        // 2. Fetch Doctor and weekly recurring schedule templates
        var doctor = await _context.Doctors.FindAsync(doctorId);
        var schedules = await _context.DoctorSchedules
            .Where(s => s.DoctorId == doctorId && s.IsActive)
            .ToListAsync();

        if (!schedules.Any() && doctor != null)
        {
            schedules = DbInitializer.GetDefaultSchedulesForDoctor(doctor);
            _context.DoctorSchedules.AddRange(schedules);
            await _context.SaveChangesAsync();
        }

        // 3. Dynamically ensure DoctorSessions exist for target dates as real OPD clinic blocks
        if (doctor != null)
        {
            var minDate = targetDates.Min();
            var maxDate = targetDates.Max();

            var existingSessions = await _context.DoctorSessions
                .Where(s => s.DoctorId == doctorId && s.SessionDate >= minDate && s.SessionDate <= maxDate)
                .ToListAsync();

            var existingTypes = new HashSet<(DateOnly Date, SessionType Type)>(
                existingSessions.Select(s => (s.SessionDate, s.SessionType))
            );

            var spec = (doctor.Specialization ?? string.Empty).ToLower();
            bool isGenMed = spec.Contains("general") || spec.Contains("physician");

            var sessionConfigs = new List<(SessionType Type, TimeOnly Time, int Capacity)>
            {
                (SessionType.Morning, new TimeOnly(8, 30), 25),
                (SessionType.Evening, new TimeOnly(16, 30), 25)
            };

            if (isGenMed)
            {
                sessionConfigs.Add((SessionType.Night, new TimeOnly(20, 0), 15));
            }

            var newSessions = new List<DoctorSession>();

            foreach (var targetDate in targetDates)
            {
                if (targetDate < today) continue;

                foreach (var cfg in sessionConfigs)
                {
                    if (!existingTypes.Contains((targetDate, cfg.Type)))
                    {
                        newSessions.Add(new DoctorSession
                        {
                            DoctorId = doctorId,
                            SessionDate = targetDate,
                            SessionTime = cfg.Time,
                            SessionType = cfg.Type,
                            MaxCapacity = cfg.Capacity,
                            CurrentBookings = 0,
                            IsActive = true,
                            SessionStatus = SessionStatus.Scheduled
                        });
                        existingTypes.Add((targetDate, cfg.Type));
                    }
                }
            }

            if (newSessions.Any())
            {
                _context.DoctorSessions.AddRange(newSessions);
                await _context.SaveChangesAsync();
            }
        }

        // 4. Query sessions for the requested date or upcoming 14 days
        var query = _context.DoctorSessions
            .Include(s => s.Doctor)
            .Where(s => s.DoctorId == doctorId && s.IsActive);

        if (date.HasValue)
        {
            query = query.Where(s => s.SessionDate == date.Value);
        }
        else
        {
            query = query.Where(s => s.SessionDate >= today && s.SessionDate <= today.AddDays(14));
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

            var timeRange = s.SessionType switch
            {
                SessionType.Morning => "08:30 AM – 12:00 PM",
                SessionType.Evening => "04:30 PM – 07:30 PM",
                SessionType.Night   => "08:00 PM – 10:00 PM",
                _ => FormatTimeSlot(s.SessionTime)
            };

            return new DoctorSessionDto
            {
                Id = s.Id,
                DoctorId = s.DoctorId,
                DoctorName = s.Doctor?.FullName ?? string.Empty,
                RoomNumber = s.Doctor?.RoomNumber ?? "Suite 201",
                HospitalBranch = s.Doctor?.HospitalBranch ?? "Health Bridge Colombo",
                SessionDate = s.SessionDate.ToString("yyyy-MM-dd"),
                SessionTime = s.SessionTime.ToString("HH:mm"),
                TimeFormatted = FormatTimeSlot(s.SessionTime),
                SessionType = s.SessionType.ToString(),
                TimeRange = timeRange,
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
            throw new InvalidOperationException("This session is full, please choose another session or date.");
        }

        var doctor = session.Doctor ?? await _context.Doctors.FindAsync(request.DoctorId)
            ?? throw new InvalidOperationException("Doctor not found.");

        var fee = doctor.ConsultationFee;
        var serviceCharge = 300.00m;
        var total = fee + serviceCharge;

        var isReservation = string.Equals(request.BookingType, "Reservation", StringComparison.OrdinalIgnoreCase);
        var bookingType = isReservation ? BookingType.Reservation : BookingType.OnlinePayment;
        var initialStatus = isReservation ? AppointmentStatus.Reserved : AppointmentStatus.PendingPayment;
        var paymentStatus = isReservation ? "NotRequired" : "Pending";
        var paymentMethod = isReservation ? "PayOnArrival" : "CreditCard";
        var qrToken = Guid.NewGuid();

        var patientEmail = request.PatientEmail?.Trim();
        if (string.IsNullOrWhiteSpace(patientEmail) && patientId.HasValue)
        {
            var user = await _context.Users.FindAsync(patientId.Value);
            if (user != null && !string.IsNullOrWhiteSpace(user.Email))
            {
                patientEmail = user.Email.Trim();
            }
        }

        // ── Queue number allocation: lowest unused slot in [minAllowed..MaxCapacity] ──────────
        // Handles cancellations correctly: if slot #2 was cancelled, the next booking fills #2
        // rather than appending a duplicate at the end.
        // For Postgres we open an explicit transaction and lock the session row with SELECT FOR UPDATE
        // so that the row lock is held until the transaction commits after SaveChangesAsync.
        // NpgsqlRetryingExecutionStrategy requires user transactions to be wrapped in CreateExecutionStrategy().ExecuteAsync.
        int queueNumber = 0;
        DoctorAppointment appointment = null!;

        var strategy = _context.Database.CreateExecutionStrategy();
        await strategy.ExecuteAsync(async () =>
        {
            queueNumber = 0;
            if (appointment != null)
            {
                _context.Entry(appointment).State = EntityState.Detached;
                appointment = null!;
            }

            IDbContextTransaction? dbTransaction = null;
            try
            {
                if (_context.Database.IsNpgsql())
                {
                    dbTransaction = await _context.Database.BeginTransactionAsync();
                    var conn = _context.Database.GetDbConnection();
                    if (conn.State != System.Data.ConnectionState.Open)
                    {
                        await conn.OpenAsync();
                    }

                    var currentDbTx = dbTransaction.GetDbTransaction();

                    // Lock the session row so no two concurrent bookings read the same free slots
                    using var lockCmd = conn.CreateCommand();
                    lockCmd.Transaction = currentDbTx;
                    lockCmd.CommandText = "SELECT \"Id\" FROM public.\"DoctorSessions\" WHERE \"Id\" = @p0 FOR UPDATE;";
                    var lockP0 = lockCmd.CreateParameter();
                    lockP0.ParameterName = "@p0";
                    lockP0.Value = session.Id;
                    lockCmd.Parameters.Add(lockP0);
                    await lockCmd.ExecuteScalarAsync();

                    // Determine the minimum allowed queue slot
                    int minAllowed = 1;
                    if (session.SessionStatus == SessionStatus.Active && session.CurrentlyServingQueueNumber.HasValue)
                    {
                        minAllowed = session.CurrentlyServingQueueNumber.Value + 1;
                    }

                    // Load all active (non-cancelled) queue numbers for this session
                    using var slotCmd = conn.CreateCommand();
                    slotCmd.Transaction = currentDbTx;
                    slotCmd.CommandText = "SELECT \"QueueNumber\" FROM public.\"DoctorAppointments\" WHERE \"DoctorSessionId\" = @p0 AND \"Status\" != 'Cancelled';";
                    var slotP0 = slotCmd.CreateParameter();
                    slotP0.ParameterName = "@p0";
                    slotP0.Value = session.Id;
                    slotCmd.Parameters.Add(slotP0);

                    var activeSlots = new HashSet<int>();
                    using (var reader = await slotCmd.ExecuteReaderAsync())
                    {
                        while (await reader.ReadAsync())
                        {
                            activeSlots.Add(reader.GetInt32(0));
                        }
                    }

                    // Find the lowest unused slot in [minAllowed..MaxCapacity]
                    int allocated = -1;
                    for (int q = minAllowed; q <= session.MaxCapacity; q++)
                    {
                        if (!activeSlots.Contains(q))
                        {
                            allocated = q;
                            break;
                        }
                    }

                    if (allocated == -1)
                    {
                        throw new InvalidOperationException("This session is full, please choose another session or date.");
                    }

                    queueNumber = allocated;

                    // Keep CurrentBookings accurate (count of non-cancelled appointments after this booking)
                    var newCurrentBookings = Math.Min(activeSlots.Count + 1, session.MaxCapacity);
                    using var updateCmd = conn.CreateCommand();
                    updateCmd.Transaction = currentDbTx;
                    updateCmd.CommandText = "UPDATE public.\"DoctorSessions\" SET \"CurrentBookings\" = @cb WHERE \"Id\" = @sid;";
                    var cbParam = updateCmd.CreateParameter();
                    cbParam.ParameterName = "@cb";
                    cbParam.Value = newCurrentBookings;
                    updateCmd.Parameters.Add(cbParam);
                    var updSid = updateCmd.CreateParameter();
                    updSid.ParameterName = "@sid";
                    updSid.Value = session.Id;
                    updateCmd.Parameters.Add(updSid);
                    await updateCmd.ExecuteNonQueryAsync();

                    session.CurrentBookings = newCurrentBookings;
                }
                else
                {
                    // In-memory / SQLite provider (used by tests)
                    int minAllowed = 1;
                    if (session.SessionStatus == SessionStatus.Active && session.CurrentlyServingQueueNumber.HasValue)
                    {
                        minAllowed = session.CurrentlyServingQueueNumber.Value + 1;
                    }

                    var activeSlotsList = await _context.DoctorAppointments
                        .Where(a => a.DoctorSessionId == session.Id && a.Status != AppointmentStatus.Cancelled)
                        .Select(a => a.QueueNumber)
                        .ToListAsync();

                    var activeSlotsSet = new HashSet<int>(activeSlotsList);

                    int allocated = -1;
                    for (int q = minAllowed; q <= session.MaxCapacity; q++)
                    {
                        if (!activeSlotsSet.Contains(q))
                        {
                            allocated = q;
                            break;
                        }
                    }

                    if (allocated == -1)
                    {
                        throw new InvalidOperationException("This session is full, please choose another session or date.");
                    }

                    queueNumber = allocated;
                    session.CurrentBookings = Math.Min(activeSlotsSet.Count + 1, session.MaxCapacity);
                }

                var baseAptNumber = $"APT-{session.SessionDate:yyyyMMdd}-{session.Id:D4}-{queueNumber:D3}";
                var aptNumber = baseAptNumber;
                var existingCount = await _context.DoctorAppointments.CountAsync(a => a.AppointmentNumber.StartsWith(baseAptNumber));
                if (existingCount > 0)
                {
                    aptNumber = $"{baseAptNumber}-R{existingCount}";
                }
                var aptDateTime = session.SessionDate.ToDateTime(session.SessionTime, DateTimeKind.Utc);

                appointment = new DoctorAppointment
                {
                    AppointmentNumber = aptNumber,
                    DoctorId = doctor.Id,
                    DoctorName = doctor.FullName,
                    Specialization = doctor.Specialization,
                    PatientId = patientId,
                    PatientName = request.PatientName.Trim(),
                    PatientPhone = request.PatientPhone.Trim(),
                    PatientEmail = patientEmail ?? string.Empty,
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

                if (dbTransaction != null)
                {
                    await dbTransaction.CommitAsync();
                }
            }
            finally
            {
                if (dbTransaction != null)
                {
                    await dbTransaction.DisposeAsync();
                }
            }
        });

        _logger.LogInformation("Booked appointment {AptNo} for Doctor {DoctorId}, Queue #{QueueNo}, BookingType={Type}, PatientEmail={Email}",
            appointment.AppointmentNumber, doctor.Id, appointment.QueueNumber, appointment.BookingType, appointment.PatientEmail);

        // Send booking confirmation email with embedded QR code (using dedicated background DI scope)
        var capturedBooking = appointment;
        var capturedHospital  = doctor.HospitalBranch;
        var capturedScopeFactory = _scopeFactory;
        var capturedLogger2   = _logger;

        var bookSessionType = session.SessionType;
        var bookQueueLabel = FormatQueueLabel(bookSessionType, appointment.QueueNumber);
        var bookSessionWindow = FormatSessionWindow(bookSessionType, session.SessionDate);
        var bookDuration = GetSessionDurationMinutes(bookSessionType);
        var bookStartTime = session.ExpectedStartTime ?? session.SessionDate.ToDateTime(session.SessionTime);
        var bookBuffer = int.TryParse(_configuration?["Queue:ArrivalBufferMinutes"], out var bBuf) ? bBuf : 20;
        var (bookEstTime, bookRecArrival) = EstimateConsultationTime(bookStartTime, appointment.QueueNumber, bookDuration, session.MaxCapacity, bookBuffer);
        var bookSessionStartStr = session.SessionTime.ToString("h:mm tt");
        var bookEstStr = bookEstTime.ToString("h:mm tt");
        var bookArrStr = bookRecArrival.ToString("h:mm tt");

        _ = Task.Run(async () =>
        {
            try
            {
                if (string.IsNullOrWhiteSpace(capturedBooking.PatientEmail))
                {
                    capturedLogger2.LogWarning("[Email] Skipped booking confirmation email for {AptNo}: patient email is empty", capturedBooking.AppointmentNumber);
                    return;
                }

                using var scope = capturedScopeFactory.CreateScope();
                var emailer = scope.ServiceProvider.GetRequiredService<IEmailSender>();

                var payStatus     = isReservation ? "PendingAtDesk" : "PendingPayment";
                var qrJson        = BuildQrPayload(
                    capturedBooking.AppointmentNumber,
                    capturedBooking.PatientName,
                    capturedBooking.PatientNic ?? "",
                    capturedBooking.DoctorName,
                    capturedBooking.QueueNumber,
                    capturedBooking.AppointmentDate.ToString("yyyy-MM-dd") + "T" + capturedBooking.TimeSlot,
                    capturedHospital ?? "Health Bridge Hospital",
                    payStatus);
                var qrBytes       = GenerateQrCodeBytes(qrJson);
                var statusLabel   = isReservation ? "Pay at Hospital Counter" : "Pending Payment";
                var emailSubject  = isReservation
                    ? $"Reservation Confirmed - Ref: {capturedBooking.AppointmentNumber} - Health Bridge Hospital"
                    : $"Booking Pending - {capturedBooking.AppointmentNumber} - Health Bridge Hospital";
                var html = BuildAppointmentEmailHtml(
                    capturedBooking.PatientName,
                    capturedBooking.AppointmentNumber,
                    capturedBooking.DoctorName,
                    capturedBooking.Specialization,
                    capturedBooking.AppointmentDate.ToString("yyyy-MM-dd") + " at " + capturedBooking.TimeSlot,
                    capturedBooking.QueueNumber,
                    capturedBooking.TotalAmount,
                    capturedBooking.PatientNic ?? "",
                    capturedHospital ?? "Health Bridge Hospital",
                    statusLabel,
                    capturedBooking.PaymentReference ?? "Pending",
                    isReservation,
                    qrJson,
                    bookQueueLabel,
                    bookSessionWindow,
                    bookSessionStartStr,
                    bookEstStr,
                    bookArrStr);

                capturedLogger2.LogInformation("[Email] Dispatching booking confirmation to {Email} for {AptNo}...", capturedBooking.PatientEmail, capturedBooking.AppointmentNumber);
                var success = await emailer.SendEmailWithInlineQrAsync(
                    capturedBooking.PatientEmail, capturedBooking.PatientName,
                    emailSubject, html, qrBytes);
                capturedLogger2.LogInformation("[Email] Dispatch result for {Email} ({AptNo}): Success={Success}", capturedBooking.PatientEmail, capturedBooking.AppointmentNumber, success);
            }
            catch (Exception ex)
            {
                capturedLogger2.LogError(ex, "[Email] Failed to send booking confirmation to {Email}", capturedBooking.PatientEmail);
            }
        });

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

        // Payment decline test branch (e.g. card reference explicitly contains 'decline' or 'fail')
        if (request.PaymentMethod == "CreditCard" && !string.IsNullOrWhiteSpace(request.CardMaskedReference))
        {
            var refLower = request.CardMaskedReference.ToLower();
            if (refLower.Contains("decline") || refLower.Contains("fail"))
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

        // Send payment confirmation email with embedded QR code (using dedicated background DI scope)
        var capturedApt     = apt;
        var capturedScopeFactory2 = _scopeFactory;
        var capturedLogger  = _logger;

        var paySess = capturedApt.DoctorSession;
        var paySessType = paySess?.SessionType ?? SessionType.Morning;
        var payQueueLabel = FormatQueueLabel(paySessType, capturedApt.QueueNumber);
        var paySessionWindow = paySess != null ? FormatSessionWindow(paySessType, paySess.SessionDate) : capturedApt.TimeSlot;
        var payDuration = GetSessionDurationMinutes(paySessType);
        var payMaxCap = paySess?.MaxCapacity ?? 25;
        var payStartTime = paySess != null
            ? (paySess.ExpectedStartTime ?? paySess.SessionDate.ToDateTime(paySess.SessionTime))
            : capturedApt.AppointmentDate;
        var payBuffer = int.TryParse(_configuration?["Queue:ArrivalBufferMinutes"], out var pBuf) ? pBuf : 20;
        var (payEst, payArr) = EstimateConsultationTime(payStartTime, capturedApt.QueueNumber, payDuration, payMaxCap, payBuffer);
        var paySessionStartStr = paySess != null ? paySess.SessionTime.ToString("h:mm tt") : capturedApt.TimeSlot;
        var payEstStr = payEst.ToString("h:mm tt");
        var payArrStr = payArr.ToString("h:mm tt");

        _ = Task.Run(async () =>
        {
            try
            {
                if (string.IsNullOrWhiteSpace(capturedApt.PatientEmail))
                {
                    capturedLogger.LogWarning("[Email] Skipped payment confirmation email for {AptNo}: patient email is empty", capturedApt.AppointmentNumber);
                    return;
                }

                using var scope = capturedScopeFactory2.CreateScope();
                var emailer = scope.ServiceProvider.GetRequiredService<IEmailSender>();

                var qrJson = BuildQrPayload(
                    capturedApt.AppointmentNumber,
                    capturedApt.PatientName,
                    capturedApt.PatientNic ?? "",
                    capturedApt.DoctorName,
                    capturedApt.QueueNumber,
                    capturedApt.AppointmentDate.ToString("yyyy-MM-dd") + "T" + capturedApt.TimeSlot,
                    capturedApt.Doctor?.HospitalBranch ?? "Health Bridge Hospital",
                    "Paid");
                var qrBytes  = GenerateQrCodeBytes(qrJson);
                var html = BuildAppointmentEmailHtml(
                    capturedApt.PatientName,
                    capturedApt.AppointmentNumber,
                    capturedApt.DoctorName,
                    capturedApt.Specialization,
                    capturedApt.AppointmentDate.ToString("yyyy-MM-dd") + " at " + capturedApt.TimeSlot,
                    capturedApt.QueueNumber,
                    capturedApt.TotalAmount,
                    capturedApt.PatientNic ?? "",
                    capturedApt.Doctor?.HospitalBranch ?? "Health Bridge Hospital",
                    capturedApt.PaymentMethod ?? "Credit / Debit Card",
                    capturedApt.PaymentReference ?? "VERIFIED",
                    false,
                    qrJson,
                    payQueueLabel,
                    paySessionWindow,
                    paySessionStartStr,
                    payEstStr,
                    payArrStr);

                capturedLogger.LogInformation("[Email] Dispatching payment confirmation to {Email} for {AptNo}...", capturedApt.PatientEmail, capturedApt.AppointmentNumber);
                var success = await emailer.SendEmailWithInlineQrAsync(
                    capturedApt.PatientEmail, capturedApt.PatientName,
                    $"\u2705 Payment & Appointment Confirmed - Ref: {capturedApt.AppointmentNumber} - Health Bridge Hospital",
                    html, qrBytes);
                capturedLogger.LogInformation("[Email] Payment confirmation result for {Email} ({AptNo}): Success={Success}", capturedApt.PatientEmail, capturedApt.AppointmentNumber, success);
            }
            catch (Exception ex)
            {
                capturedLogger.LogError(ex, "[Email] Failed to send payment confirmation to {Email}", capturedApt.PatientEmail);
            }
        });

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

        _ = _emailSender.SendEmailAsync(
            apt.PatientEmail,
            apt.PatientName,
            $"Appointment Cancelled - Ref: {apt.AppointmentNumber} - Health Bridge Hospital",
            $"<h2>Appointment Cancellation</h2><p>Dear {apt.PatientName},</p><p>Your appointment <strong>{apt.AppointmentNumber}</strong> with {apt.DoctorName} on {apt.AppointmentDate:yyyy-MM-dd} has been cancelled. Please contact us if you need to rebook.</p>");

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
            .OrderBy(a => a.AppointmentDate)
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

        // No-Show gating: reject if target is NoShow unless QueueStatus=Called or session has passed patient
        if (newStatus == AppointmentStatus.NoShow)
        {
            var isCalled = apt.QueueStatus == QueueStatus.Called;
            var isSessionPassed = apt.DoctorSession != null && (
                (apt.DoctorSession.CurrentlyServingQueueNumber.HasValue && apt.DoctorSession.CurrentlyServingQueueNumber.Value > apt.QueueNumber) ||
                apt.DoctorSession.SessionStatus == SessionStatus.Completed
            );

            if (!isCalled && !isSessionPassed)
            {
                throw new InvalidOperationException("Patient cannot be marked as No-Show until they have been called by the doctor (QueueStatus = Called) or their queue position has been passed in the session.");
            }
        }

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

    public async Task<AppointmentDto> ForceStatusAsync(int appointmentId, string status, string reason)
    {
        if (string.IsNullOrWhiteSpace(reason))
        {
            throw new ArgumentException("A non-empty reason is strictly required to force appointment status.");
        }

        var apt = await _context.DoctorAppointments
            .Include(a => a.Doctor)
            .Include(a => a.DoctorSession)
            .FirstOrDefaultAsync(a => a.Id == appointmentId);

        if (apt == null)
            throw new KeyNotFoundException("Appointment not found.");

        if (!Enum.TryParse<AppointmentStatus>(status, true, out var newStatus))
            throw new ArgumentException($"Invalid status value: {status}");

        apt.Status = newStatus;
        apt.StatusChangeReason = reason.Trim();

        // Update QueueStatus consistently according to the forced AppointmentStatus
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
        else if (newStatus == AppointmentStatus.Cancelled)
        {
            apt.QueueStatus = QueueStatus.Skipped;
            if (apt.DoctorSession != null && apt.DoctorSession.CurrentBookings > 0)
            {
                apt.DoctorSession.CurrentBookings -= 1;
            }
        }
        else if (newStatus == AppointmentStatus.Confirmed || newStatus == AppointmentStatus.Reserved)
        {
            if (apt.CheckedInAt.HasValue)
            {
                apt.QueueStatus = QueueStatus.Waiting;
            }
            else
            {
                apt.QueueStatus = QueueStatus.NotCheckedIn;
            }
        }

        await _context.SaveChangesAsync();
        _logger.LogInformation("Admin forced status of Appointment {AptNo} to {Status}. Reason: {Reason}",
            apt.AppointmentNumber, newStatus, reason);

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

    public async Task<AppointmentDto?> GetByQrTokenAsync(string qrToken)
    {
        if (string.IsNullOrWhiteSpace(qrToken))
            return null;

        var tokenStr = qrToken.Trim();
        DoctorAppointment? apt = null;

        if (Guid.TryParse(tokenStr, out var parsedGuid))
        {
            apt = await _context.DoctorAppointments
                .Include(a => a.Doctor)
                .Include(a => a.DoctorSession)
                .FirstOrDefaultAsync(a => a.QrToken == parsedGuid);
        }

        if (apt == null)
        {
            apt = await _context.DoctorAppointments
                .Include(a => a.Doctor)
                .Include(a => a.DoctorSession)
                .FirstOrDefaultAsync(a => a.AppointmentNumber.ToLower() == tokenStr.ToLower());
        }

        return apt == null ? null : MapToDto(apt, apt.Doctor?.HospitalBranch);
    }

    public async Task<AppointmentDto> CheckInAsync(int appointmentId, string? qrToken, int? checkedInByUserId)
    {
        var apt = await _context.DoctorAppointments
            .Include(a => a.Doctor)
            .Include(a => a.DoctorSession)
            .FirstOrDefaultAsync(a => a.Id == appointmentId);

        if (apt == null)
            throw new KeyNotFoundException("Appointment not found.");

        // Validation 1: If QR token is supplied, verify it resolves to this specific appointment ID
        if (!string.IsNullOrWhiteSpace(qrToken))
        {
            if (!Guid.TryParse(qrToken.Trim(), out var parsedToken) || apt.QrToken != parsedToken)
            {
                throw new InvalidOperationException("Invalid QR check-in token for this appointment.");
            }
        }
        else
        {
            // Manual search path - must be performed by authenticated staff
            _logger.LogInformation("Manual desk check-in without QR token for Appointment {AptNo} by User {UserId}", apt.AppointmentNumber, checkedInByUserId);
        }

        // Validation 2: Status check (Cannot check in Cancelled or PendingPayment)
        if (apt.Status == AppointmentStatus.Cancelled)
        {
            throw new InvalidOperationException("Cannot check in a cancelled appointment.");
        }

        if (apt.Status == AppointmentStatus.PendingPayment)
        {
            throw new InvalidOperationException("Cannot check in an appointment with pending payment. Patient must settle fees first.");
        }

        if (apt.Status != AppointmentStatus.Confirmed && apt.Status != AppointmentStatus.Reserved)
        {
            throw new InvalidOperationException($"Cannot check in an appointment with status: {apt.Status}.");
        }

        // Validation 3: Double check-in idempotency (if already checked in, return current state smoothly)
        if (apt.CheckedInAt.HasValue)
        {
            return MapToDto(apt, apt.Doctor?.HospitalBranch);
        }

        // Validation 4: Parent session IsActive & Not Cancelled
        if (apt.DoctorSession == null || !apt.DoctorSession.IsActive || apt.DoctorSession.SessionStatus == SessionStatus.Cancelled)
        {
            throw new InvalidOperationException("The doctor's session for this appointment is cancelled or inactive.");
        }

        // Validation 5: Wrong-day check-in detection
        var today = DateTime.UtcNow.Date;
        if (apt.AppointmentDate.Date != today)
        {
            throw new InvalidOperationException($"Wrong-day check-in: This appointment is scheduled for {apt.AppointmentDate:yyyy-MM-dd}, not today ({today:yyyy-MM-dd}).");
        }

        // Compute ArrivalStatus at CONFIRM time (not lookup time)
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

        var newPaymentStatus = apt.BookingType == BookingType.Reservation ? "Paid" : apt.PaymentStatus;
        var newPaymentMethod = apt.BookingType == BookingType.Reservation ? "CashierDesk" : apt.PaymentMethod;

        // Atomic conditional update to prevent double-check-in race condition (two counters at the same instant)
        var rowsAffected = await _context.DoctorAppointments
            .Where(a => a.Id == appointmentId && a.CheckedInAt == null)
            .ExecuteUpdateAsync(s => s
                .SetProperty(a => a.CheckedInAt, now)
                .SetProperty(a => a.CheckedInByUserId, checkedInByUserId)
                .SetProperty(a => a.ArrivalStatus, arrival)
                .SetProperty(a => a.QueueStatus, QueueStatus.Waiting)
                .SetProperty(a => a.PaymentStatus, newPaymentStatus)
                .SetProperty(a => a.PaymentMethod, newPaymentMethod)
                .SetProperty(a => a.Status, AppointmentStatus.Confirmed));

        if (rowsAffected == 0)
        {
            // Another counter won the race condition; reload and return idempotent response without error
            var reloaded = await _context.DoctorAppointments
                .Include(a => a.Doctor)
                .Include(a => a.DoctorSession)
                .FirstOrDefaultAsync(a => a.Id == appointmentId);

            if (reloaded?.CheckedInAt != null)
            {
                return MapToDto(reloaded, reloaded.Doctor?.HospitalBranch);
            }
            throw new InvalidOperationException("Failed to check in appointment.");
        }

        // Update local in-memory entity for DTO mapping and email dispatch
        apt.CheckedInAt = now;
        apt.CheckedInByUserId = checkedInByUserId;
        apt.ArrivalStatus = arrival;
        apt.QueueStatus = QueueStatus.Waiting;
        apt.PaymentStatus = newPaymentStatus;
        apt.PaymentMethod = newPaymentMethod;
        apt.Status = AppointmentStatus.Confirmed;

        _logger.LogInformation("Patient checked in for Appointment {AptNo} by User {UserId}. ArrivalStatus={Status}", apt.AppointmentNumber, checkedInByUserId, arrival);

        _ = _emailSender.SendEmailAsync(
            apt.PatientEmail,
            apt.PatientName,
            $"Checked In - Health Bridge Queue #{apt.QueueNumber:D2}",
            $"<h2>Check-In Confirmed</h2><p>Dear {apt.PatientName},</p><p>You have successfully checked in for your consultation with <strong>{apt.DoctorName}</strong>.</p><p><strong>Queue Number:</strong> #{apt.QueueNumber:D2}</p><p><strong>Arrival Status:</strong> {arrival}</p><p>Please take a seat in the waiting area. Your number will be called shortly.</p>");

        return MapToDto(apt, apt.Doctor?.HospitalBranch);
    }

    public async Task<List<AppointmentSearchResultDto>> SearchAppointmentsForDeskAsync(string query)
    {
        if (string.IsNullOrWhiteSpace(query))
            return new List<AppointmentSearchResultDto>();

        var s = query.Trim().ToLower();

        // 1. Fetch matching entities from database first (EF Core translated expressions only)
        var rawList = await _context.DoctorAppointments
            .Where(a => a.PatientName.ToLower().Contains(s) ||
                        a.DoctorName.ToLower().Contains(s) ||
                        a.AppointmentNumber.ToLower().Contains(s) ||
                        (a.PatientNic != null && a.PatientNic.ToLower().Contains(s)) ||
                        (a.PatientPhone != null && a.PatientPhone.Contains(s)))
            .OrderByDescending(a => a.AppointmentDate)
            .ThenBy(a => a.QueueNumber)
            .Take(15)
            .ToListAsync();

        // 2. Perform in-memory projection with C# helper methods and date formatting
        return rawList.Select(a => new AppointmentSearchResultDto
        {
            Id = a.Id,
            AppointmentNumber = a.AppointmentNumber,
            PatientName = a.PatientName,
            MaskedNic = MaskNic(a.PatientNic),
            DoctorName = a.DoctorName,
            Specialization = a.Specialization,
            AppointmentDate = a.AppointmentDate.ToString("yyyy-MM-dd"),
            TimeSlot = a.TimeSlot,
            QueueNumber = a.QueueNumber,
            Status = a.Status.ToString()
        }).ToList();
    }

    private static string MaskNic(string? nic)
    {
        if (string.IsNullOrWhiteSpace(nic)) return "N/A";
        if (nic.Length <= 4) return "****";
        return new string('*', nic.Length - 4) + nic[^4..];
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
            .Include(a => a.DoctorSession)
            .Where(a => a.DoctorSessionId == sessionId && a.Status != AppointmentStatus.Cancelled)
            .OrderBy(a => a.QueueNumber)
            .ToListAsync();

        return new DoctorSessionQueueDto
        {
            SessionId = session.Id,
            DoctorId = session.DoctorId,
            DoctorName = session.Doctor?.FullName ?? string.Empty,
            Specialization = session.Doctor?.Specialization ?? string.Empty,
            RoomNumber = session.Doctor?.RoomNumber ?? "Suite 201",
            HospitalBranch = session.Doctor?.HospitalBranch ?? "Health Bridge Colombo",
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

    private static DoctorSessionDto MapToSessionDto(DoctorSession session)
    {
        return new DoctorSessionDto
        {
            Id = session.Id,
            DoctorId = session.DoctorId,
            DoctorName = session.Doctor?.FullName ?? string.Empty,
            RoomNumber = session.Doctor?.RoomNumber ?? "Suite 201",
            HospitalBranch = session.Doctor?.HospitalBranch ?? "Health Bridge Colombo",
            SessionDate = session.SessionDate.ToString("yyyy-MM-dd"),
            SessionTime = session.SessionTime.ToString("HH:mm"),
            TimeFormatted = FormatTimeSlot(session.SessionTime),
            SessionType = session.SessionType.ToString(),
            TimeRange = FormatSessionWindow(session.SessionType, session.SessionDate),
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

        // Idempotency: if already Active, no-op and do not send duplicate emails
        if (session.SessionStatus == SessionStatus.Active)
        {
            _logger.LogInformation("Doctor session {SessionId} is already Active; skipping duplicate start notifications.", sessionId);
            return MapToSessionDto(session);
        }

        session.SessionStatus = SessionStatus.Active;
        session.ActualStartTime ??= DateTime.UtcNow;

        await _context.SaveChangesAsync();
        _logger.LogInformation("Doctor session {SessionId} started at {Time}", sessionId, session.ActualStartTime);

        var affectedAppointments = await _context.DoctorAppointments
            .Where(a => a.DoctorSessionId == sessionId &&
                       (a.Status == AppointmentStatus.Confirmed ||
                        a.Status == AppointmentStatus.Reserved ||
                        a.QueueStatus == QueueStatus.Waiting) &&
                       a.Status != AppointmentStatus.Cancelled &&
                       a.Status != AppointmentStatus.Completed)
            .ToListAsync();

        if (affectedAppointments.Count > 0)
        {
            var capturedApts = affectedAppointments.ToList();
            var capturedDoctorName = session.Doctor?.FullName ?? "Doctor";
            var capturedSessionName = $"{session.SessionType} session";
            var currentlyServingText = session.CurrentlyServingQueueNumber.HasValue && session.CurrentlyServingQueueNumber.Value > 0
                ? FormatQueueLabel(session.SessionType, session.CurrentlyServingQueueNumber.Value)
                : "the first patient";
            var capturedScopeFactory = _scopeFactory;
            var capturedLogger = _logger;

            _ = Task.Run(async () =>
            {
                try
                {
                    using var scope = capturedScopeFactory.CreateScope();
                    var emailSvc = scope.ServiceProvider.GetRequiredService<IDoctorEmailService>();
                    foreach (var apt in capturedApts)
                    {
                        if (string.IsNullOrWhiteSpace(apt.PatientEmail)) continue;
                        try
                        {
                            await emailSvc.SendDoctorSessionStartedAsync(
                                apt.PatientEmail,
                                apt.PatientName,
                                capturedDoctorName,
                                capturedSessionName,
                                currentlyServingText);
                        }
                        catch (Exception ex)
                        {
                            capturedLogger.LogWarning(ex, "[Email] Failed to send DoctorSessionStarted to {Email}", apt.PatientEmail);
                        }
                    }
                }
                catch (Exception ex)
                {
                    capturedLogger.LogError(ex, "[Email] Batch start session email dispatch failed for session {SessionId}", sessionId);
                }
            });
        }

        return MapToSessionDto(session);
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

        var origStart = session.SessionDate.ToDateTime(session.SessionTime);
        if (expectedStartTime <= origStart || expectedStartTime == default)
        {
            expectedStartTime = origStart.AddMinutes(30);
        }
        else if (DateOnly.FromDateTime(expectedStartTime) != session.SessionDate)
        {
            expectedStartTime = session.SessionDate.ToDateTime(TimeOnly.FromDateTime(expectedStartTime));
        }

        session.SessionStatus = SessionStatus.Delayed;
        session.ExpectedStartTime = expectedStartTime;
        session.DelayReason = reason;

        await _context.SaveChangesAsync();
        _logger.LogInformation("Doctor session {SessionId} delayed to {ExpectedTime}. Reason: {Reason}", sessionId, expectedStartTime, reason);

        var affectedAppointments = await _context.DoctorAppointments
            .Where(a => a.DoctorSessionId == sessionId &&
                       (a.Status == AppointmentStatus.Confirmed ||
                        a.Status == AppointmentStatus.Reserved ||
                        a.QueueStatus == QueueStatus.Waiting) &&
                       a.Status != AppointmentStatus.Cancelled &&
                       a.Status != AppointmentStatus.Completed)
            .ToListAsync();

        if (affectedAppointments.Count > 0)
        {
            var delayMinutes = Math.Max(0, (int)Math.Round((expectedStartTime - origStart).TotalMinutes));
            var sessionDuration = GetSessionDurationMinutes(session.SessionType);
            var maxCap = session.MaxCapacity;
            var expectedStartTimeStr = expectedStartTime.ToString("h:mm tt");
            var doctorName = session.Doctor?.FullName ?? "Doctor";
            var sessionName = $"{session.SessionType} session";
            var buffer = int.TryParse(_configuration?["Queue:ArrivalBufferMinutes"], out var dBuf) ? dBuf : 20;

            var aptRecs = affectedAppointments.Select(a => {
                var (est, rec) = EstimateConsultationTime(expectedStartTime, a.QueueNumber, sessionDuration, maxCap, buffer);
                return new {
                    a.PatientEmail,
                    a.PatientName,
                    EstimatedStr = est.ToString("h:mm tt"),
                    ArrivalStr = rec.ToString("h:mm tt")
                };
            }).ToList();

            var capturedScopeFactory = _scopeFactory;
            var capturedLogger = _logger;

            _ = Task.Run(async () =>
            {
                try
                {
                    using var scope = capturedScopeFactory.CreateScope();
                    var emailSvc = scope.ServiceProvider.GetRequiredService<IDoctorEmailService>();
                    foreach (var item in aptRecs)
                    {
                        if (string.IsNullOrWhiteSpace(item.PatientEmail)) continue;
                        try
                        {
                            await emailSvc.SendDoctorSessionDelayedAsync(
                                item.PatientEmail,
                                item.PatientName,
                                doctorName,
                                sessionName,
                                delayMinutes,
                                expectedStartTimeStr,
                                item.EstimatedStr,
                                item.ArrivalStr,
                                reason);
                        }
                        catch (Exception ex)
                        {
                            capturedLogger.LogWarning(ex, "[Email] Failed to send DoctorSessionDelayed to {Email}", item.PatientEmail);
                        }
                    }
                }
                catch (Exception ex)
                {
                    capturedLogger.LogError(ex, "[Email] Batch delay email dispatch failed for session {SessionId}", sessionId);
                }
            });
        }

        return MapToSessionDto(session);
    }

    public async Task<AppointmentDto> CallNextPatientAsync(int sessionId)
    {
        var nextApt = await _context.DoctorAppointments
            .Include(a => a.Doctor)
            .Include(a => a.DoctorSession)
            .Where(a => a.DoctorSessionId == sessionId &&
                       (a.QueueStatus == QueueStatus.Waiting || a.QueueStatus == QueueStatus.NotCheckedIn) &&
                       a.Status != AppointmentStatus.Cancelled &&
                       a.Status != AppointmentStatus.Completed)
            .OrderBy(a => a.QueueStatus == QueueStatus.Waiting ? 0 : 1)
            .ThenBy(a => a.QueueNumber)
            .FirstOrDefaultAsync();

        if (nextApt == null)
        {
            throw new KeyNotFoundException("No patients waiting in queue for this session.");
        }

        nextApt.QueueStatus = QueueStatus.Called;
        nextApt.CalledAt = DateTime.UtcNow;

        var session = await _context.DoctorSessions
            .Include(s => s.Doctor)
            .FirstOrDefaultAsync(s => s.Id == sessionId);

        if (session != null)
        {
            session.CurrentlyServingQueueNumber = nextApt.QueueNumber;
            if (session.SessionStatus == SessionStatus.Scheduled || session.SessionStatus == SessionStatus.Delayed)
            {
                session.SessionStatus = SessionStatus.Active;
                session.ActualStartTime ??= DateTime.UtcNow;
            }
        }

        // Section 5: Get-ready email for upcoming waiting patients
        var threshold = int.TryParse(_configuration?["Queue:GetReadyThreshold"], out var rTh) ? rTh : 4;
        var currentServing = nextApt.QueueNumber;
        var sessionType = session?.SessionType ?? nextApt.DoctorSession?.SessionType ?? SessionType.Morning;

        var readyAppointments = await _context.DoctorAppointments
            .Include(a => a.Doctor)
            .Include(a => a.DoctorSession)
            .Where(a => a.DoctorSessionId == sessionId &&
                        a.QueueStatus == QueueStatus.Waiting &&
                        a.QueueNumber > currentServing &&
                        (a.QueueNumber - currentServing) <= threshold &&
                        a.ReadyAlertSentAt == null &&
                        a.Status != AppointmentStatus.Cancelled &&
                        a.Status != AppointmentStatus.Completed)
            .ToListAsync();

        var nowUtc = DateTime.UtcNow;
        foreach (var rApt in readyAppointments)
        {
            rApt.ReadyAlertSentAt = nowUtc;
        }

        await _context.SaveChangesAsync();
        _logger.LogInformation("Calling next patient for session {SessionId}: Queue #{QueueNo} (Apt {AptNo})",
            sessionId, nextApt.QueueNumber, nextApt.AppointmentNumber);

        if (readyAppointments.Count > 0)
        {
            var docName = session?.Doctor?.FullName ?? nextApt.Doctor?.FullName ?? "Doctor";
            var roomNumber = session?.Doctor?.RoomNumber ?? nextApt.Doctor?.RoomNumber ?? "Consultation Suite";
            var servingLabel = FormatQueueLabel(sessionType, currentServing);

            var itemsToSend = readyAppointments.Select(r => new {
                r.PatientEmail,
                r.PatientName,
                YourToken = FormatQueueLabel(sessionType, r.QueueNumber),
                PatientsAway = r.QueueNumber - currentServing
            }).ToList();

            var capturedScopeFactory = _scopeFactory;
            var capturedLogger = _logger;

            _ = Task.Run(async () =>
            {
                try
                {
                    using var scope = capturedScopeFactory.CreateScope();
                    var emailSvc = scope.ServiceProvider.GetRequiredService<IDoctorEmailService>();
                    foreach (var item in itemsToSend)
                    {
                        if (string.IsNullOrWhiteSpace(item.PatientEmail)) continue;
                        try
                        {
                            await emailSvc.SendDoctorReadyAlertAsync(
                                item.PatientEmail,
                                item.PatientName,
                                docName,
                                roomNumber,
                                servingLabel,
                                item.PatientsAway,
                                item.YourToken);
                        }
                        catch (Exception ex)
                        {
                            capturedLogger.LogWarning(ex, "[Email] Failed to send DoctorReadyAlert to {Email}", item.PatientEmail);
                        }
                    }
                }
                catch (Exception ex)
                {
                    capturedLogger.LogError(ex, "[Email] Batch ready alert dispatch failed for session {SessionId}", sessionId);
                }
            });
        }

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

            _ = _emailSender.SendEmailAsync(
                apt.PatientEmail,
                apt.PatientName,
                $"Session Cancelled - Ref: {apt.AppointmentNumber} - Health Bridge Hospital",
                $"<h2>Doctor Session Cancelled</h2><p>Dear {apt.PatientName},</p><p>We regret to inform you that the consultation session for <strong>{session.Doctor?.FullName}</strong> on {session.SessionDate:yyyy-MM-dd} at {FormatTimeSlot(session.SessionTime)} has been cancelled.</p><p>Your appointment <strong>{apt.AppointmentNumber}</strong> has been cancelled. Please log in to your portal to reschedule.</p>");
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

    public async Task<List<DoctorScheduleDto>> GetDoctorSchedulesAsync(int doctorId)
    {
        var schedules = await _context.DoctorSchedules
            .Where(s => s.DoctorId == doctorId)
            .OrderBy(s => s.DayOfWeek)
            .ThenBy(s => s.StartTime)
            .ToListAsync();

        if (!schedules.Any())
        {
            var doctor = await _context.Doctors.FindAsync(doctorId);
            if (doctor != null)
            {
                schedules = DbInitializer.GetDefaultSchedulesForDoctor(doctor);
                _context.DoctorSchedules.AddRange(schedules);
                await _context.SaveChangesAsync();
            }
        }

        return schedules.Select(s => new DoctorScheduleDto
        {
            Id = s.Id,
            DoctorId = s.DoctorId,
            DayOfWeek = s.DayOfWeek,
            DayName = s.DayOfWeek.ToString(),
            StartTime = s.StartTime.ToString("HH:mm"),
            EndTime = s.EndTime.ToString("HH:mm"),
            SlotDurationMinutes = s.SlotDurationMinutes,
            MaxPatientsPerSlot = s.MaxPatientsPerSlot,
            IsActive = s.IsActive
        }).ToList();
    }

    public async Task<List<DoctorScheduleDto>> UpdateDoctorSchedulesAsync(int doctorId, List<DoctorScheduleDto> scheduleDtos)
    {
        var existing = await _context.DoctorSchedules
            .Where(s => s.DoctorId == doctorId)
            .ToListAsync();

        _context.DoctorSchedules.RemoveRange(existing);

        var newEntities = scheduleDtos.Select(dto =>
        {
            var st = TimeOnly.TryParse(dto.StartTime, out var sVal) ? sVal : new TimeOnly(8, 0);
            var et = TimeOnly.TryParse(dto.EndTime, out var eVal) ? eVal : new TimeOnly(16, 0);

            return new DoctorSchedule
            {
                DoctorId = doctorId,
                DayOfWeek = dto.DayOfWeek,
                StartTime = st,
                EndTime = et,
                SlotDurationMinutes = dto.SlotDurationMinutes > 0 ? dto.SlotDurationMinutes : 60,
                MaxPatientsPerSlot = dto.MaxPatientsPerSlot > 0 ? dto.MaxPatientsPerSlot : 3,
                IsActive = dto.IsActive
            };
        }).ToList();

        _context.DoctorSchedules.AddRange(newEntities);
        await _context.SaveChangesAsync();

        return await GetDoctorSchedulesAsync(doctorId);
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

        var session = apt.DoctorSession;
        var sessionType = session?.SessionType ?? SessionType.Morning;
        var queueLabel = FormatQueueLabel(sessionType, apt.QueueNumber);

        var localToday = DateOnly.FromDateTime(GetLocalNow());
        var aptDate = DateOnly.FromDateTime(apt.AppointmentDate);
        var isToday = aptDate == localToday;

        var sessionDuration = GetSessionDurationMinutes(sessionType);
        var maxCap = session?.MaxCapacity ?? 25;
        DateTime sessionStart;
        if (session != null)
        {
            sessionStart = session.ExpectedStartTime ?? session.SessionDate.ToDateTime(session.SessionTime);
        }
        else
        {
            sessionStart = apt.AppointmentDate;
        }

        var (estimatedConsult, recommendedArrival) = EstimateConsultationTime(sessionStart, apt.QueueNumber, sessionDuration, maxCap);
        var estConsultStr = $"~{estimatedConsult:h:mm tt}";
        var recArrivalStr = recommendedArrival.ToString("h:mm tt");

        string? servingLabel = null;
        if (session?.CurrentlyServingQueueNumber != null && session.CurrentlyServingQueueNumber.Value > 0)
        {
            servingLabel = FormatQueueLabel(sessionType, session.CurrentlyServingQueueNumber.Value);
        }
        else if (session?.SessionStatus == SessionStatus.Active)
        {
            servingLabel = "the first patient";
        }

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
            QueueLabel = queueLabel,
            SessionType = sessionType.ToString(),
            EstimatedConsultationTime = estConsultStr,
            RecommendedArrivalTime = recArrivalStr,
            CurrentlyServingQueueNumber = session?.CurrentlyServingQueueNumber,
            CurrentlyServingLabel = servingLabel,
            SessionStatus = session?.SessionStatus.ToString() ?? "Scheduled",
            ExpectedStartTime = session?.ExpectedStartTime,
            DelayReason = session?.DelayReason,
            RoomNumber = session?.Doctor?.RoomNumber ?? apt.Doctor?.RoomNumber ?? "Consultation Suite",
            IsToday = isToday,
            ConsultationFee = apt.ConsultationFee,
            ServiceCharge = apt.ServiceCharge,
            TotalAmount = apt.TotalAmount,
            Status = apt.Status.ToString(),
            BookingType = apt.BookingType.ToString(),
            QrToken = apt.QrToken,
            CheckedInAt = apt.CheckedInAt,
            CheckedInByUserId = apt.CheckedInByUserId,
            ArrivalStatus = apt.ArrivalStatus.ToString(),
            QueueStatus = apt.QueueStatus.ToString(),
            CalledAt = apt.CalledAt,
            PaymentMethod = apt.PaymentMethod,
            PaymentStatus = apt.PaymentStatus,
            PaymentReference = apt.PaymentReference,
            Notes = apt.Notes,
            StatusChangeReason = apt.StatusChangeReason,
            CreatedAt = apt.CreatedAt,
            QrCodeText = qrPayload,
            DisplaySummary = summary
        };
    }

    // Returns raw PNG bytes — used for CID inline embedding
    private static byte[] GenerateQrCodeBytes(string payload)
    {
        try
        {
            using var qrGenerator = new QRCodeGenerator();
            using var qrCodeData  = qrGenerator.CreateQrCode(payload, QRCodeGenerator.ECCLevel.Q);
            using var qrCode      = new PngByteQRCode(qrCodeData);
            return qrCode.GetGraphic(6);   // pixel size 6 = ~180px @ standard density
        }
        catch
        {
            return Array.Empty<byte>();
        }
    }

    // Base64 string — used as fallback src in HTML when CID embedding is not possible
    private static string GenerateQrCodeBase64(string payload)
    {
        var bytes = GenerateQrCodeBytes(payload);
        return bytes.Length > 0 ? Convert.ToBase64String(bytes) : string.Empty;
    }

    // Build the structured JSON QR payload per spec
    private static string BuildQrPayload(
        string appointmentRef, string patientName, string nic,
        string doctorName, int queueNo, string sessionDateTime,
        string hospital, string paymentStatus)
    {
        return JsonSerializer.Serialize(new
        {
            appointmentRef,
            patientName,
            nic,
            doctor        = doctorName,
            queueNo,
            sessionDateTime,
            hospital,
            paymentStatus
        }, new JsonSerializerOptions { WriteIndented = false });
    }

    private static string BuildAppointmentEmailHtml(
        string patientName,
        string appointmentNumber,
        string doctorName,
        string specialization,
        string dateAndTime,
        int queueNumber,
        decimal totalAmount,
        string patientNic,
        string hospitalBranch,
        string paymentMethod,
        string paymentReference,
        bool isReservation = false,
        string? qrPayload = null,
        string? queueLabel = null,
        string? sessionWindow = null,
        string? sessionStartStr = null,
        string? estimatedConsultStr = null,
        string? recommendedArrivalStr = null)
    {
        // QR image is rendered via public CDN (api.qrserver.com) so Gmail and all mobile clients load it reliably
        var rawPayload = !string.IsNullOrWhiteSpace(qrPayload) ? qrPayload : appointmentNumber;
        var encodedData = Uri.EscapeDataString(rawPayload);
        var qrUrl = $"https://api.qrserver.com/v1/create-qr-code/?size=220x220&format=png&data={encodedData}";

        var qrImgTag = $"""
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;text-align:center;">
          <tr>
            <td align="center" style="background:#ffffff;padding:12px;border:3px solid #006652;border-radius:12px;">
              <img src="{qrUrl}" alt="Hospital Check-in QR Code" width="180" height="180" style="display:block;margin:0 auto;border:0;" />
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-top:8px;">
              <span style="font-size:11px;font-weight:700;color:#006652;letter-spacing:0.06em;text-transform:uppercase;">
                &#x26A1; Scan at reception desk for instant check-in
              </span>
            </td>
          </tr>
        </table>
        """;

        // ---- Reservation vs Paid visual variants ----
        var topBadgeText    = isReservation ? "RESERVATION PASS — PAYMENT DUE AT DESK"  : "&#x2714; PAYMENT CONFIRMED &amp; VERIFIED";
        var topBadgeBg      = isReservation ? "rgba(251,191,36,0.22)"                    : "rgba(255,255,255,0.18)";
        var topBadgeBorder  = isReservation ? "1px solid rgba(251,191,36,0.6)"           : "1px solid rgba(255,255,255,0.3)";
        var topBadgeColor   = isReservation ? "#fef3c7"                                  : "#ffffff";
        var headingText     = isReservation ? "Place Reserved Successfully!"             : "Appointment &amp; Payment Confirmed!";
        var queueBadgeBg    = isReservation ? "#fef9c3"                                  : "#e0fdf4";
        var queueBadgeBdr   = isReservation ? "#fde047"                                  : "#6ee7b7";
        var queueLabelColor = isReservation ? "#92400e"                                  : "#047857";
        var queueNumColor   = isReservation ? "#78350f"                                  : "#004D40";

        var tokenDisplay = !string.IsNullOrWhiteSpace(queueLabel) ? queueLabel : $"#{queueNumber:D2}";
        var sessionWindowDisplay = sessionWindow ?? dateAndTime;
        var startDisplay = sessionStartStr ?? dateAndTime;
        var estDisplay = estimatedConsultStr ?? dateAndTime;
        var arrDisplay = recommendedArrivalStr ?? "20 minutes before session";

        // Schedule banner
        var scheduleBanner = $"""
        <tr>
          <td style="background:#ffffff;padding:16px 32px 0;">
            <div style="background:#f0f9ff;border:1px solid #bae6fd;border-left:5px solid #0284c7;border-radius:10px;padding:14px 18px;text-align:left;">
              <div style="font-size:13px;color:#0369a1;font-weight:700;margin-bottom:4px;">
                &#x1F4C5; {sessionWindowDisplay}
              </div>
              <div style="font-size:13px;color:#0f172a;line-height:1.5;">
                Session begins at <strong>{startDisplay}</strong>. Based on Token <strong>{tokenDisplay}</strong>, your estimated consultation time is <strong>~{estDisplay}</strong> (approximate).
              </div>
              <div style="font-size:13px;color:#0284c7;font-weight:700;margin-top:6px;">
                &#x23F0; Please arrive by {arrDisplay}.
              </div>
            </div>
          </td>
        </tr>
        """;

        // Payment row — amber for reservation, green for paid
        string paymentRow;
        if (isReservation)
        {
            paymentRow = $"""
            <tr>
              <td style="padding:9px 6px;color:#b45309;font-weight:700;">Payment Due</td>
              <td style="padding:9px 6px;color:#b45309;font-weight:700;">Amount Due on Arrival: LKR {totalAmount:N2} (Cash / Card at Hospital Desk)</td>
            </tr>
""";
        }
        else
        {
            var payMethodDisplay = paymentMethod switch
            {
                "CreditCard" or "OnlineCard" => "Credit / Debit Card",
                "BankTransfer"               => "Bank Transfer / CEFTS",
                "PayOnArrival" or "Counter" or "Pay at Hospital Counter" => "Cash / Card at Hospital Counter",
                _                            => paymentMethod
            };
            paymentRow = $"""
            <tr>
              <td style="padding:9px 6px;color:#15803d;font-weight:700;">Payment</td>
              <td style="padding:9px 6px;color:#15803d;font-weight:700;">LKR {totalAmount:N2} Paid ({payMethodDisplay} &bull; Ref: {paymentReference})</td>
            </tr>
""";
        }

        return $"""
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:20px;background:#f0f4f8;font-family:'Segoe UI',Arial,Helvetica,sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;margin:0 auto;">
    <!-- HEADER -->
    <tr>
      <td style="background:#006652;padding:0;border-radius:14px 14px 0 0;overflow:hidden;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:28px 32px 20px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="font-size:22px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;">&#x1F3E5; Health Bridge</span><br>
                    <span style="font-size:12px;color:rgba(255,255,255,0.75);font-weight:400;">Private Hospital Group &bull; Colombo &amp; Kandy</span>
                  </td>
                  <td align="right" style="vertical-align:top;">
                    <span style="background:{topBadgeBg};color:{topBadgeColor};font-size:10px;font-weight:700;padding:4px 12px;border-radius:20px;border:{topBadgeBorder};letter-spacing:0.07em;">
                      {topBadgeText}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 28px;">
              <h1 style="margin:0 0 6px;color:#ffffff;font-size:24px;font-weight:900;">{headingText}</h1>
              <table cellpadding="0" cellspacing="0"><tr>
                <td style="background:rgba(255,255,255,0.15);color:#ffffff;font-size:12px;font-weight:700;padding:4px 14px;border-radius:20px;border:1px solid rgba(255,255,255,0.25);">
                  Ref: {appointmentNumber}
                </td>
              </tr></table>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- QUEUE BADGE -->
    <tr>
      <td style="background:#ffffff;padding:0;">
        <div style="margin:0;padding:20px 32px 0;text-align:center;">
          <div style="display:inline-block;background:{queueBadgeBg};border:2px solid {queueBadgeBdr};border-radius:12px;padding:14px 36px;">
            <div style="font-size:11px;color:{queueLabelColor};font-weight:800;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;">ASSIGNED QUEUE TOKEN</div>
            <div style="font-size:36px;font-weight:900;color:{queueNumColor};line-height:1;">Token {tokenDisplay}</div>
            <div style="font-size:12px;color:{queueLabelColor};margin-top:6px;font-weight:600;">Queue #{queueNumber:D2}</div>
          </div>
        </div>
      </td>
    </tr>

    <!-- SCHEDULE & ARRIVAL BANNER -->
    {scheduleBanner}

    <!-- DETAILS CARD -->
    <tr>
      <td style="background:#ffffff;padding:20px 32px 24px;">
        <div style="background:#f8fafc;border-radius:12px;padding:20px;border:1px solid #e2e8f0;">
          <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;color:#1e293b;border-collapse:collapse;">
            <tr style="border-bottom:1px solid #f1f5f9;">
              <td style="padding:9px 6px;color:#64748b;width:42%;font-weight:600;">Doctor</td>
              <td style="padding:9px 6px;font-weight:700;">Dr. {doctorName} ({specialization})</td>
            </tr>
            <tr style="border-bottom:1px solid #f1f5f9;">
              <td style="padding:9px 6px;color:#64748b;font-weight:600;">Session Window</td>
              <td style="padding:9px 6px;font-weight:700;">{sessionWindowDisplay}</td>
            </tr>
            <tr style="border-bottom:1px solid #f1f5f9;">
              <td style="padding:9px 6px;color:#64748b;font-weight:600;">Estimated Consultation</td>
              <td style="padding:9px 6px;font-weight:700;color:#006652;">~{estDisplay} (approximate) &bull; Arrive by {arrDisplay}</td>
            </tr>
            <tr style="border-bottom:1px solid #f1f5f9;">
              <td style="padding:9px 6px;color:#64748b;font-weight:600;">Hospital</td>
              <td style="padding:9px 6px;">{hospitalBranch}</td>
            </tr>
            <tr style="border-bottom:1px solid #f1f5f9;">
              <td style="padding:9px 6px;color:#64748b;font-weight:600;">Patient</td>
              <td style="padding:9px 6px;">{patientName} (NIC: {patientNic})</td>
            </tr>
            {paymentRow}
          </table>
        </div>
      </td>
    </tr>

    <!-- QR CODE SECTION -->
    <tr>
      <td style="background:#ffffff;padding:0 32px 28px;">
        <div style="background:#f0fdf4;border:2px dashed #86efac;border-radius:14px;padding:24px;text-align:center;">
          <p style="margin:0 0 14px;font-size:13px;color:#15803d;font-weight:800;text-transform:uppercase;letter-spacing:0.06em;">&#x1F4F1; Hospital Check-in QR Code</p>
          {qrImgTag}
          <p style="margin:12px 0 0;font-size:12px;color:#475569;line-height:1.6;">
            Present this QR code at the Channeling Desk on arrival for expedited check-in.<br>
            <span style="color:#94a3b8;font-size:11px;">QR code contains your encrypted appointment reference for fast verification.</span>
          </p>
        </div>
      </td>
    </tr>

    <!-- ARRIVAL NOTICE -->
    <tr>
      <td style="background:#ffffff;padding:0 32px 28px;">
        <div style="background:#fff7ed;border-left:4px solid #f97316;border-radius:8px;padding:14px 18px;">
          <p style="margin:0;font-size:13px;color:#7c2d12;line-height:1.5;">
            &#x26A0; <strong>Important:</strong> Please arrive by <strong>{arrDisplay}</strong> (at least 20 minutes before your estimated consultation time).
            Bring a valid government-issued ID (NIC/Passport) and this email or QR code for verification at the front desk.
          </p>
        </div>
      </td>
    </tr>

    <!-- FOOTER -->
    <tr>
      <td style="background:#f1f5f9;border-radius:0 0 14px 14px;padding:20px 32px;border-top:1px solid #e2e8f0;text-align:center;">
        <p style="margin:0 0 6px;font-size:12px;color:#64748b;font-weight:600;">Health Bridge Private Hospital Group</p>
        <p style="margin:0;font-size:11px;color:#94a3b8;">
          Colombo &bull; Kandy, Sri Lanka &bull; +94 76 447 7999<br>
          This is an automated message — please do not reply to this email.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
""";
    }
}

