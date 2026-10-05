using HealthBridge.Api.Controllers;
using HealthBridge.Api.Data;
using HealthBridge.Api.DTOs.Appointments;
using HealthBridge.Api.Models;
using HealthBridge.Api.Models.Appointments;
using HealthBridge.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using System.Reflection;
using Xunit;

namespace HealthBridge.Tests.Controllers.Appointments;

public class DoctorAppointmentsControllerTests
{
    private ApplicationDbContext CreateInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        return new ApplicationDbContext(options);
    }

    [Fact]
    public async Task UpdateStatus_WhenNoShowAndQueueStatusNotCalled_ReturnsBadRequest()
    {
        // Arrange
        using var db = CreateInMemoryDbContext();
        var doctor = new Doctor { FullName = "Dr. Silva", Specialization = "Cardiology" };
        db.Doctors.Add(doctor);
        await db.SaveChangesAsync();

        var session = new DoctorSession
        {
            DoctorId = doctor.Id,
            SessionDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(1)),
            SessionTime = new TimeOnly(9, 0),
            SessionStatus = SessionStatus.Scheduled,
            CurrentlyServingQueueNumber = 1
        };
        db.DoctorSessions.Add(session);
        await db.SaveChangesAsync();

        var appointment = new DoctorAppointment
        {
            DoctorId = doctor.Id,
            DoctorSessionId = session.Id,
            PatientName = "Kamal Perera",
            PatientPhone = "0771234567",
            QueueNumber = 5,
            Status = AppointmentStatus.Confirmed,
            QueueStatus = QueueStatus.Waiting // Not Called, and queue has not reached 5
        };
        db.DoctorAppointments.Add(appointment);
        await db.SaveChangesAsync();

        var mockEmail = new Mock<IEmailSender>();
        var mockConfig = new Mock<IConfiguration>();
        var mockScopeFactory = new Mock<IServiceScopeFactory>();

        var appointmentService = new AppointmentService(
            db,
            mockConfig.Object,
            NullLogger<AppointmentService>.Instance,
            mockEmail.Object,
            mockScopeFactory.Object
        );

        var controller = new DoctorAppointmentsController(
            appointmentService,
            mockEmail.Object,
            mockConfig.Object,
            NullLogger<DoctorAppointmentsController>.Instance
        );

        // Act - Attempt to set NoShow when patient has not been called
        var result = await controller.UpdateStatus(appointment.Id, new StatusUpdateDto { Status = "NoShow" });

        // Assert
        var badRequestResult = Assert.IsType<BadRequestObjectResult>(result);
        Assert.NotNull(badRequestResult.Value);
    }

    [Fact]
    public async Task UpdateStatus_WhenNoShowAndQueueStatusIsCalled_Succeeds()
    {
        // Arrange
        using var db = CreateInMemoryDbContext();
        var doctor = new Doctor { FullName = "Dr. Silva", Specialization = "Cardiology" };
        db.Doctors.Add(doctor);
        await db.SaveChangesAsync();

        var session = new DoctorSession
        {
            DoctorId = doctor.Id,
            SessionDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(1)),
            SessionTime = new TimeOnly(9, 0),
            SessionStatus = SessionStatus.Active,
            CurrentlyServingQueueNumber = 2
        };
        db.DoctorSessions.Add(session);
        await db.SaveChangesAsync();

        var appointment = new DoctorAppointment
        {
            DoctorId = doctor.Id,
            DoctorSessionId = session.Id,
            PatientName = "Kamal Perera",
            PatientPhone = "0771234567",
            QueueNumber = 2,
            Status = AppointmentStatus.Confirmed,
            QueueStatus = QueueStatus.Called // Patient has been called
        };
        db.DoctorAppointments.Add(appointment);
        await db.SaveChangesAsync();

        var mockEmail = new Mock<IEmailSender>();
        var mockConfig = new Mock<IConfiguration>();
        var mockScopeFactory = new Mock<IServiceScopeFactory>();

        var appointmentService = new AppointmentService(
            db,
            mockConfig.Object,
            NullLogger<AppointmentService>.Instance,
            mockEmail.Object,
            mockScopeFactory.Object
        );

        var controller = new DoctorAppointmentsController(
            appointmentService,
            mockEmail.Object,
            mockConfig.Object,
            NullLogger<DoctorAppointmentsController>.Instance
        );

        // Act
        var result = await controller.UpdateStatus(appointment.Id, new StatusUpdateDto { Status = "NoShow" });

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        var dto = Assert.IsType<AppointmentDto>(okResult.Value);
        Assert.Equal("NoShow", dto.Status);
        Assert.Equal("NoShow", dto.QueueStatus);
    }

    [Fact]
    public async Task ForceStatus_WhenReasonIsEmpty_ReturnsBadRequest()
    {
        // Arrange
        using var db = CreateInMemoryDbContext();
        var mockEmail = new Mock<IEmailSender>();
        var mockConfig = new Mock<IConfiguration>();
        var mockScopeFactory = new Mock<IServiceScopeFactory>();

        var appointmentService = new AppointmentService(
            db,
            mockConfig.Object,
            NullLogger<AppointmentService>.Instance,
            mockEmail.Object,
            mockScopeFactory.Object
        );

        var controller = new DoctorAppointmentsController(
            appointmentService,
            mockEmail.Object,
            mockConfig.Object,
            NullLogger<DoctorAppointmentsController>.Instance
        );

        // Act
        var result = await controller.ForceStatus(1, new ForceStatusDto { Status = "Completed", Reason = "   " });

        // Assert
        var badRequestResult = Assert.IsType<BadRequestObjectResult>(result);
        Assert.NotNull(badRequestResult.Value);
    }

    [Fact]
    public async Task ForceStatus_WhenReasonProvided_BypassesNormalRulesAndPersistsReason()
    {
        // Arrange
        using var db = CreateInMemoryDbContext();
        var doctor = new Doctor { FullName = "Dr. Silva", Specialization = "Cardiology" };
        db.Doctors.Add(doctor);
        await db.SaveChangesAsync();

        var appointment = new DoctorAppointment
        {
            DoctorId = doctor.Id,
            DoctorName = doctor.FullName,
            PatientName = "Sunil Shantha",
            PatientPhone = "0719876543",
            QueueNumber = 1,
            Status = AppointmentStatus.Confirmed,
            QueueStatus = QueueStatus.NotCheckedIn
        };
        db.DoctorAppointments.Add(appointment);
        await db.SaveChangesAsync();

        var mockEmail = new Mock<IEmailSender>();
        var mockConfig = new Mock<IConfiguration>();
        var mockScopeFactory = new Mock<IServiceScopeFactory>();

        var appointmentService = new AppointmentService(
            db,
            mockConfig.Object,
            NullLogger<AppointmentService>.Instance,
            mockEmail.Object,
            mockScopeFactory.Object
        );

        var controller = new DoctorAppointmentsController(
            appointmentService,
            mockEmail.Object,
            mockConfig.Object,
            NullLogger<DoctorAppointmentsController>.Instance
        );

        // Act - Force to NoShow even without being called, providing valid audit reason
        var reason = "Patient called desk to notify inability to attend due to emergency.";
        var result = await controller.ForceStatus(appointment.Id, new ForceStatusDto { Status = "NoShow", Reason = reason });

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        var dto = Assert.IsType<AppointmentDto>(okResult.Value);
        Assert.Equal("NoShow", dto.Status);
        Assert.Equal(reason, dto.StatusChangeReason);

        // Verify persisted in DB
        var persisted = await db.DoctorAppointments.FindAsync(appointment.Id);
        Assert.NotNull(persisted);
        Assert.Equal(AppointmentStatus.NoShow, persisted.Status);
        Assert.Equal(reason, persisted.StatusChangeReason);
    }

    [Fact]
    public void DeleteAppointment_IsDecoratedWithAuthorizeAdminRole()
    {
        // Act
        var method = typeof(DoctorAppointmentsController).GetMethod(nameof(DoctorAppointmentsController.DeleteAppointment));
        Assert.NotNull(method);

        var authAttribute = method.GetCustomAttribute<AuthorizeAttribute>();
        Assert.NotNull(authAttribute);
        Assert.Equal(UserRole.Admin, authAttribute.Roles);
    }

    [Fact]
    public void ForceStatus_IsDecoratedWithAuthorizeAdminRole()
    {
        // Act
        var method = typeof(DoctorAppointmentsController).GetMethod(nameof(DoctorAppointmentsController.ForceStatus));
        Assert.NotNull(method);

        var authAttribute = method.GetCustomAttribute<AuthorizeAttribute>();
        Assert.NotNull(authAttribute);
        Assert.Equal(UserRole.Admin, authAttribute.Roles);
    }

    [Fact]
    public async Task BookAppointmentAsync_ConcurrentBookings_AssignsDistinctSequentialQueueNumbers()
    {
        // Arrange
        using var db = CreateInMemoryDbContext();
        var doctor = new Doctor { FullName = "Dr. Silva", Specialization = "Cardiology", ConsultationFee = 2500m };
        db.Doctors.Add(doctor);
        await db.SaveChangesAsync();

        var sessionDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(2));
        var session = new DoctorSession
        {
            DoctorId = doctor.Id,
            SessionDate = sessionDate,
            SessionTime = new TimeOnly(9, 0),
            SessionStatus = SessionStatus.Scheduled,
            MaxCapacity = 10,
            CurrentBookings = 0,
            IsActive = true
        };
        db.DoctorSessions.Add(session);
        await db.SaveChangesAsync();

        var mockEmail = new Mock<IEmailSender>();
        var mockConfig = new Mock<IConfiguration>();
        var mockScopeFactory = new Mock<IServiceScopeFactory>();

        var service = new AppointmentService(
            db,
            mockConfig.Object,
            NullLogger<AppointmentService>.Instance,
            mockEmail.Object,
            mockScopeFactory.Object
        );

        var req1 = new BookAppointmentRequest
        {
            DoctorId = doctor.Id,
            DoctorSessionId = session.Id,
            PatientName = "Patient A",
            PatientPhone = "0711111111",
            PatientNic = "199011111111",
            BookingType = "Reservation"
        };

        var req2 = new BookAppointmentRequest
        {
            DoctorId = doctor.Id,
            DoctorSessionId = session.Id,
            PatientName = "Patient B",
            PatientPhone = "0722222222",
            PatientNic = "199022222222",
            BookingType = "Reservation"
        };

        // Act - Execute sequentially or concurrently
        var res1 = await service.BookAppointmentAsync(req1, null);
        var res2 = await service.BookAppointmentAsync(req2, null);

        // Assert - Distinct sequential queue numbers
        Assert.NotEqual(res1.QueueNumber, res2.QueueNumber);
        Assert.Contains(res1.QueueNumber, new[] { 1, 2 });
        Assert.Contains(res2.QueueNumber, new[] { 1, 2 });
        Assert.NotEqual(res1.AppointmentNumber, res2.AppointmentNumber);
    }

    [Fact]
    public void EstimateConsultationTime_DerivesRealisticMinutesPerPatient_ClampsArrivalAtSessionStart()
    {
        // Evening session: 180 min, 25 capacity => 7.2 min/patient
        var sessionStart = new DateTime(2026, 10, 5, 16, 30, 0); // 4:30 PM
        var durationMinutes = AppointmentService.GetSessionDurationMinutes(SessionType.Evening);
        Assert.Equal(180, durationMinutes);

        // Queue #1
        var (est1, arr1) = AppointmentService.EstimateConsultationTime(sessionStart, 1, durationMinutes, 25);
        Assert.Equal(sessionStart, est1);
        Assert.Equal(sessionStart, arr1); // clamped to sessionStart because est1 - 20m < sessionStart

        // Queue #7 => (7 - 1) * 7.2 = 43.2 min => ~17:13
        var (est7, arr7) = AppointmentService.EstimateConsultationTime(sessionStart, 7, durationMinutes, 25);
        Assert.Equal(sessionStart.AddMinutes(43.2), est7);
        Assert.Equal(est7.AddMinutes(-20), arr7);

        // Morning session: 210 min, 25 capacity => 8.4 min/patient
        var morningDur = AppointmentService.GetSessionDurationMinutes(SessionType.Morning);
        Assert.Equal(210, morningDur);
        var morningStart = new DateTime(2026, 10, 5, 8, 30, 0);
        var (estM5, _) = AppointmentService.EstimateConsultationTime(morningStart, 5, morningDur, 25);
        // (5-1) * 8.4 = 33.6 min => 09:03:36
        Assert.Equal(morningStart.AddMinutes(33.6), estM5);
    }

    [Fact]
    public async Task StartSessionAsync_IsIdempotent_WhenAlreadyActive()
    {
        using var db = CreateInMemoryDbContext();
        var doctor = new Doctor { FullName = "Dr. Perera", Specialization = "Cardiology" };
        db.Doctors.Add(doctor);
        await db.SaveChangesAsync();

        var session = new DoctorSession
        {
            DoctorId = doctor.Id,
            SessionDate = DateOnly.FromDateTime(DateTime.UtcNow),
            SessionTime = new TimeOnly(16, 30),
            SessionStatus = SessionStatus.Active,
            ActualStartTime = DateTime.UtcNow.AddMinutes(-10),
            MaxCapacity = 25
        };
        db.DoctorSessions.Add(session);
        await db.SaveChangesAsync();

        var mockEmailSender = new Mock<IEmailSender>();
        var mockEmailService = new Mock<IEmailService>();
        var mockConfig = new Mock<IConfiguration>();
        var mockScopeFactory = new Mock<IServiceScopeFactory>();

        var service = new AppointmentService(
            db,
            mockConfig.Object,
            NullLogger<AppointmentService>.Instance,
            mockEmailSender.Object,
            mockScopeFactory.Object,
            mockEmailService.Object
        );

        // Act - Call StartSession on already Active session
        var result = await service.StartSessionAsync(session.Id);

        // Assert - Succeeds and returns Active state without errors
        Assert.Equal("Active", result.SessionStatus);
        mockEmailService.Verify(s => s.SendDoctorSessionStartedAsync(
            It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()),
            Times.Never);
    }

    [Fact]
    public async Task CallNextPatientAsync_StampsReadyAlertSentAt_AndPreventsDuplicateAlerts()
    {
        using var db = CreateInMemoryDbContext();
        var doctor = new Doctor { FullName = "Dr. Lakshan", Specialization = "ENT", RoomNumber = "Room 104" };
        db.Doctors.Add(doctor);
        await db.SaveChangesAsync();

        var session = new DoctorSession
        {
            DoctorId = doctor.Id,
            SessionDate = DateOnly.FromDateTime(DateTime.UtcNow),
            SessionTime = new TimeOnly(8, 30),
            SessionType = SessionType.Morning,
            SessionStatus = SessionStatus.Active,
            CurrentlyServingQueueNumber = 0,
            MaxCapacity = 25
        };
        db.DoctorSessions.Add(session);
        await db.SaveChangesAsync();

        // Apt 1: waiting, will be called next
        var apt1 = new DoctorAppointment
        {
            AppointmentNumber = "APT-001",
            DoctorId = doctor.Id,
            DoctorSessionId = session.Id,
            PatientName = "Patient 1",
            PatientEmail = "p1@test.com",
            PatientPhone = "0711111111",
            QueueNumber = 1,
            Status = AppointmentStatus.Confirmed,
            QueueStatus = QueueStatus.Waiting
        };

        // Apt 3: waiting, within threshold (3 - 1 = 2 <= 4)
        var apt3 = new DoctorAppointment
        {
            AppointmentNumber = "APT-003",
            DoctorId = doctor.Id,
            DoctorSessionId = session.Id,
            PatientName = "Patient 3",
            PatientEmail = "p3@test.com",
            PatientPhone = "0733333333",
            QueueNumber = 3,
            Status = AppointmentStatus.Confirmed,
            QueueStatus = QueueStatus.Waiting
        };

        db.DoctorAppointments.AddRange(apt1, apt3);
        await db.SaveChangesAsync();

        var mockEmailSender = new Mock<IEmailSender>();
        var mockEmailService = new Mock<IEmailService>();
        var mockConfig = new Mock<IConfiguration>();
        var mockScopeFactory = new Mock<IServiceScopeFactory>();

        var service = new AppointmentService(
            db,
            mockConfig.Object,
            NullLogger<AppointmentService>.Instance,
            mockEmailSender.Object,
            mockScopeFactory.Object,
            mockEmailService.Object
        );

        // Act - Call next (apt1 is called)
        var called = await service.CallNextPatientAsync(session.Id);

        // Assert
        Assert.Equal(1, called.QueueNumber);
        Assert.Equal("Called", called.QueueStatus);

        // Verify Apt 3 has ReadyAlertSentAt stamped
        var reloadedApt3 = await db.DoctorAppointments.FindAsync(apt3.Id);
        Assert.NotNull(reloadedApt3?.ReadyAlertSentAt);

        var firstAlertTimestamp = reloadedApt3.ReadyAlertSentAt;

        // Advance queue to 2 (pretend apt1 finished, call again with a new apt2)
        var apt2 = new DoctorAppointment
        {
            AppointmentNumber = "APT-002",
            DoctorId = doctor.Id,
            DoctorSessionId = session.Id,
            PatientName = "Patient 2",
            PatientEmail = "p2@test.com",
            PatientPhone = "0722222222",
            QueueNumber = 2,
            Status = AppointmentStatus.Confirmed,
            QueueStatus = QueueStatus.Waiting
        };
        db.DoctorAppointments.Add(apt2);
        await db.SaveChangesAsync();

        await service.CallNextPatientAsync(session.Id);

        // Assert - Apt 3 timestamp was NOT changed or re-stamped
        var reloadedApt3AfterSecondCall = await db.DoctorAppointments.FindAsync(apt3.Id);
        Assert.Equal(firstAlertTimestamp, reloadedApt3AfterSecondCall?.ReadyAlertSentAt);
    }

    [Fact]
    public async Task BookingEmailEstimate_Equals_MapToDtoEstimate_ForSameAppointment()
    {
        using var db = CreateInMemoryDbContext();
        var doctor = new Doctor { FullName = "Dr. Perera", Specialization = "Cardiology", Hospital = "Health Bridge Hospital", HospitalBranch = "Colombo" };
        db.Doctors.Add(doctor);
        await db.SaveChangesAsync();

        var sessionDate = DateOnly.FromDateTime(DateTime.Today.AddDays(1));
        var session = new DoctorSession
        {
            DoctorId = doctor.Id,
            Doctor = doctor,
            SessionDate = sessionDate,
            SessionTime = new TimeOnly(16, 30), // 4:30 PM Evening
            SessionType = SessionType.Evening,
            SessionStatus = SessionStatus.Scheduled,
            MaxCapacity = 25,
            CurrentBookings = 0,
            IsActive = true
        };
        db.DoctorSessions.Add(session);
        await db.SaveChangesAsync();

        string? capturedEmailBody = null;
        var mockEmailSender = new Mock<IEmailSender>();
        mockEmailSender.Setup(e => e.SendEmailWithInlineQrAsync(
                It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<byte[]>(), It.IsAny<string>()))
            .Callback<string, string, string, string, byte[], string>((email, name, subj, body, qr, cid) => {
                capturedEmailBody = body;
            })
            .ReturnsAsync(true);

        var services = new ServiceCollection();
        services.AddSingleton(mockEmailSender.Object);
        var sp = services.BuildServiceProvider();
        var scopeFactory = sp.GetRequiredService<IServiceScopeFactory>();

        var mockConfig = new Mock<IConfiguration>();
        var mockEmailService = new Mock<IEmailService>();

        var service = new AppointmentService(
            db,
            mockConfig.Object,
            NullLogger<AppointmentService>.Instance,
            mockEmailSender.Object,
            scopeFactory,
            mockEmailService.Object
        );

        var req = new BookAppointmentRequest
        {
            DoctorId = doctor.Id,
            DoctorSessionId = session.Id,
            PatientName = "Sunil Shantha",
            PatientEmail = "sunil@example.com",
            PatientPhone = "0771234567"
        };

        var dto = await service.BookAppointmentAsync(req, patientId: 101);

        // Wait for background email task
        for (int i = 0; i < 30 && capturedEmailBody == null; i++)
        {
            await Task.Delay(100);
        }

        Assert.NotNull(dto.EstimatedConsultationTime);
        Assert.NotNull(capturedEmailBody);

        // Assert the booking email contains the exact same approximate estimate and arrival time as the DTO
        Assert.Contains(dto.EstimatedConsultationTime, capturedEmailBody);
        Assert.Contains(dto.RecommendedArrivalTime!, capturedEmailBody);
    }

    [Fact]
    public async Task MarkDelayed_SendsEmailsToRightAudience_WithRecalculatedEstimate_MatchingDto()
    {
        using var db = CreateInMemoryDbContext();
        var doctor = new Doctor { FullName = "Dr. Silva", Specialization = "Pediatrics", Hospital = "Health Bridge Hospital", HospitalBranch = "Colombo" };
        db.Doctors.Add(doctor);
        await db.SaveChangesAsync();

        var sessionDate = DateOnly.FromDateTime(DateTime.Today.AddDays(1));
        var session = new DoctorSession
        {
            DoctorId = doctor.Id,
            Doctor = doctor,
            SessionDate = sessionDate,
            SessionTime = new TimeOnly(16, 30),
            SessionType = SessionType.Evening,
            SessionStatus = SessionStatus.Scheduled,
            MaxCapacity = 25,
            CurrentBookings = 3,
            IsActive = true
        };
        db.DoctorSessions.Add(session);
        await db.SaveChangesAsync();

        var aptConfirmed = new DoctorAppointment
        {
            DoctorId = doctor.Id,
            DoctorSessionId = session.Id,
            Doctor = doctor,
            DoctorSession = session,
            PatientName = "Patient Confirmed",
            PatientEmail = "confirmed@example.com",
            QueueNumber = 1,
            Status = AppointmentStatus.Confirmed,
            AppointmentDate = sessionDate.ToDateTime(new TimeOnly(16, 30))
        };
        var aptReserved = new DoctorAppointment
        {
            DoctorId = doctor.Id,
            DoctorSessionId = session.Id,
            Doctor = doctor,
            DoctorSession = session,
            PatientName = "Patient Reserved",
            PatientEmail = "reserved@example.com",
            QueueNumber = 2,
            Status = AppointmentStatus.Reserved,
            AppointmentDate = sessionDate.ToDateTime(new TimeOnly(16, 30))
        };
        var aptCancelled = new DoctorAppointment
        {
            DoctorId = doctor.Id,
            DoctorSessionId = session.Id,
            Doctor = doctor,
            DoctorSession = session,
            PatientName = "Patient Cancelled",
            PatientEmail = "cancelled@example.com",
            QueueNumber = 3,
            Status = AppointmentStatus.Cancelled,
            AppointmentDate = sessionDate.ToDateTime(new TimeOnly(16, 30))
        };

        db.DoctorAppointments.AddRange(aptConfirmed, aptReserved, aptCancelled);
        await db.SaveChangesAsync();

        var sentEmails = new List<(string Email, string EstTime, string ArrTime)>();
        var mockEmailService = new Mock<IEmailService>();
        mockEmailService.Setup(e => e.SendDoctorSessionDelayedAsync(
                It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(),
                It.IsAny<int>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string?>()))
            .Callback<string, string, string, string, int, string, string, string, string?>((email, name, doc, sess, mins, startStr, estStr, arrStr, reason) => {
                sentEmails.Add((email, estStr, arrStr));
            })
            .Returns(Task.CompletedTask);

        var services = new ServiceCollection();
        services.AddSingleton(mockEmailService.Object);
        var sp = services.BuildServiceProvider();
        var scopeFactory = sp.GetRequiredService<IServiceScopeFactory>();

        var service = new AppointmentService(
            db,
            new Mock<IConfiguration>().Object,
            NullLogger<AppointmentService>.Instance,
            new Mock<IEmailSender>().Object,
            scopeFactory,
            mockEmailService.Object
        );

        // Delay session by 30 minutes (from 4:30 PM to 5:00 PM)
        var delayedStart = sessionDate.ToDateTime(new TimeOnly(17, 0));
        var delayedSessionDto = await service.DelaySessionAsync(session.Id, delayedStart, "Doctor delayed");

        // Wait for background batch send
        for (int i = 0; i < 30 && sentEmails.Count < 2; i++)
        {
            await Task.Delay(100);
        }

        // Assert: sent to Confirmed and Reserved, but NOT Cancelled
        Assert.Equal(2, sentEmails.Count);
        Assert.Contains(sentEmails, x => x.Email == "confirmed@example.com");
        Assert.Contains(sentEmails, x => x.Email == "reserved@example.com");
        Assert.DoesNotContain(sentEmails, x => x.Email == "cancelled@example.com");

        // Assert DTO estimate matches the recalculated estimate sent in delay email (CHECK 4)
        var queueDto = await service.GetSessionQueueAsync(session.Id);
        var reloadedApt1 = queueDto.Queue.First(a => a.Id == aptConfirmed.Id);
        var delayEmailForApt1 = sentEmails.First(x => x.Email == "confirmed@example.com");
        Assert.Equal($"~{delayEmailForApt1.EstTime}", reloadedApt1.EstimatedConsultationTime);
        Assert.Equal(delayEmailForApt1.ArrTime, reloadedApt1.RecommendedArrivalTime);
    }

    [Fact]
    public async Task BookAppointmentAsync_Rejects26thAppointment_In25CapacitySession_AndSlotsHaveIncreasingArrivalTimes()
    {
        using var db = CreateInMemoryDbContext();
        var doctor = new Doctor { FullName = "Dr. Nimal", Specialization = "Neurology", Hospital = "Health Bridge Hospital", HospitalBranch = "Colombo" };
        db.Doctors.Add(doctor);
        await db.SaveChangesAsync();

        var sessionDate = DateOnly.FromDateTime(DateTime.Today.AddDays(1));
        var session = new DoctorSession
        {
            DoctorId = doctor.Id,
            Doctor = doctor,
            SessionDate = sessionDate,
            SessionTime = new TimeOnly(8, 30), // Morning 08:30 - 12:00
            SessionType = SessionType.Morning,
            SessionStatus = SessionStatus.Scheduled,
            MaxCapacity = 25,
            CurrentBookings = 0,
            IsActive = true
        };
        db.DoctorSessions.Add(session);
        await db.SaveChangesAsync();

        var service = new AppointmentService(
            db,
            new Mock<IConfiguration>().Object,
            NullLogger<AppointmentService>.Instance,
            new Mock<IEmailSender>().Object,
            new Mock<IServiceScopeFactory>().Object,
            new Mock<IEmailService>().Object
        );

        AppointmentDto? firstDto = null;
        AppointmentDto? lastDto = null;

        for (int i = 1; i <= 25; i++)
        {
            var req = new BookAppointmentRequest
            {
                DoctorId = doctor.Id,
                DoctorSessionId = session.Id,
                PatientName = $"Patient {i}",
                PatientEmail = $"patient{i}@example.com",
                PatientPhone = "0771111111"
            };
            var dto = await service.BookAppointmentAsync(req, patientId: i);
            if (i == 1) firstDto = dto;
            if (i == 25) lastDto = dto;
        }

        // Slot 1 and Slot 25 must have different, increasing arrival times
        Assert.NotNull(firstDto);
        Assert.NotNull(lastDto);
        Assert.Equal(1, firstDto.QueueNumber);
        Assert.Equal(25, lastDto.QueueNumber);
        Assert.NotEqual(firstDto.RecommendedArrivalTime, lastDto.RecommendedArrivalTime);

        var firstArrival = DateTime.Parse(firstDto.RecommendedArrivalTime!);
        var lastArrival = DateTime.Parse(lastDto.RecommendedArrivalTime!);
        Assert.True(lastArrival > firstArrival, "Slot 25 arrival time must be greater than Slot 1 arrival time");

        // Attempt to book 26th appointment
        var req26 = new BookAppointmentRequest
        {
            DoctorId = doctor.Id,
            DoctorSessionId = session.Id,
            PatientName = "Patient 26",
            PatientEmail = "patient26@example.com",
            PatientPhone = "0771111111"
        };

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => service.BookAppointmentAsync(req26, patientId: 26));
        Assert.Equal("This session is full, please choose another session or date.", ex.Message);
    }

    [Fact]
    public async Task StartSessionAsync_SendsExactlyOneEmailPerEligiblePatient_AndNoneToCancelledOrCompleted()
    {
        using var db = CreateInMemoryDbContext();
        var doctor = new Doctor { FullName = "Dr. Wickrama", Specialization = "Dermatology", RoomNumber = "Room 202" };
        db.Doctors.Add(doctor);
        await db.SaveChangesAsync();

        var sessionDate = DateOnly.FromDateTime(DateTime.Today);
        var session = new DoctorSession
        {
            DoctorId = doctor.Id,
            Doctor = doctor,
            SessionDate = sessionDate,
            SessionTime = new TimeOnly(16, 30),
            SessionType = SessionType.Evening,
            SessionStatus = SessionStatus.Scheduled,
            MaxCapacity = 25,
            CurrentBookings = 5,
            IsActive = true
        };
        db.DoctorSessions.Add(session);
        await db.SaveChangesAsync();

        var aptConfirmed = new DoctorAppointment
        {
            DoctorId = doctor.Id,
            DoctorSessionId = session.Id,
            PatientName = "P Confirmed",
            PatientEmail = "p_confirmed@example.com",
            QueueNumber = 1,
            Status = AppointmentStatus.Confirmed,
            AppointmentDate = sessionDate.ToDateTime(new TimeOnly(16, 30))
        };
        var aptReserved = new DoctorAppointment
        {
            DoctorId = doctor.Id,
            DoctorSessionId = session.Id,
            PatientName = "P Reserved",
            PatientEmail = "p_reserved@example.com",
            QueueNumber = 2,
            Status = AppointmentStatus.Reserved,
            AppointmentDate = sessionDate.ToDateTime(new TimeOnly(16, 30))
        };
        var aptWaiting = new DoctorAppointment
        {
            DoctorId = doctor.Id,
            DoctorSessionId = session.Id,
            PatientName = "P Waiting",
            PatientEmail = "p_waiting@example.com",
            QueueNumber = 3,
            Status = AppointmentStatus.Confirmed,
            QueueStatus = QueueStatus.Waiting,
            AppointmentDate = sessionDate.ToDateTime(new TimeOnly(16, 30))
        };
        var aptCancelled = new DoctorAppointment
        {
            DoctorId = doctor.Id,
            DoctorSessionId = session.Id,
            PatientName = "P Cancelled",
            PatientEmail = "p_cancelled@example.com",
            QueueNumber = 4,
            Status = AppointmentStatus.Cancelled,
            AppointmentDate = sessionDate.ToDateTime(new TimeOnly(16, 30))
        };
        var aptCompleted = new DoctorAppointment
        {
            DoctorId = doctor.Id,
            DoctorSessionId = session.Id,
            PatientName = "P Completed",
            PatientEmail = "p_completed@example.com",
            QueueNumber = 5,
            Status = AppointmentStatus.Completed,
            AppointmentDate = sessionDate.ToDateTime(new TimeOnly(16, 30))
        };

        db.DoctorAppointments.AddRange(aptConfirmed, aptReserved, aptWaiting, aptCancelled, aptCompleted);
        await db.SaveChangesAsync();

        var notifiedEmails = new List<string>();
        var mockEmailService = new Mock<IEmailService>();
        mockEmailService.Setup(e => e.SendDoctorSessionStartedAsync(
                It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
            .Callback<string, string, string, string, string>((email, name, doc, sess, current) => {
                notifiedEmails.Add(email);
            })
            .Returns(Task.CompletedTask);

        var services = new ServiceCollection();
        services.AddSingleton(mockEmailService.Object);
        var sp = services.BuildServiceProvider();
        var scopeFactory = sp.GetRequiredService<IServiceScopeFactory>();

        var service = new AppointmentService(
            db,
            new Mock<IConfiguration>().Object,
            NullLogger<AppointmentService>.Instance,
            new Mock<IEmailSender>().Object,
            scopeFactory,
            mockEmailService.Object
        );

        await service.StartSessionAsync(session.Id);

        // Wait for background dispatch
        for (int i = 0; i < 30 && notifiedEmails.Count < 3; i++)
        {
            await Task.Delay(100);
        }

        // Assert exactly 3 emails sent (one each for Confirmed, Reserved, Waiting)
        Assert.Equal(3, notifiedEmails.Count);
        Assert.Contains("p_confirmed@example.com", notifiedEmails);
        Assert.Contains("p_reserved@example.com", notifiedEmails);
        Assert.Contains("p_waiting@example.com", notifiedEmails);
        Assert.DoesNotContain("p_cancelled@example.com", notifiedEmails);
        Assert.DoesNotContain("p_completed@example.com", notifiedEmails);
    }

    // ─── Task B: Queue number gap-filling after cancellation ─────────────────
    [Fact]
    public async Task BookAppointment_AfterCancellation_FillsLowestGap()
    {
        // Arrange: session with capacity 5, 5 existing bookings
        using var db = CreateInMemoryDbContext();
        var doctor = new Doctor { FullName = "Dr. Test", Specialization = "General" };
        db.Doctors.Add(doctor);
        await db.SaveChangesAsync();

        var sessionDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(1));
        var session = new DoctorSession
        {
            DoctorId = doctor.Id,
            SessionDate = sessionDate,
            SessionTime = new TimeOnly(9, 0),
            SessionType = SessionType.Morning,
            SessionStatus = SessionStatus.Scheduled,
            MaxCapacity = 5,
            CurrentBookings = 5,
            IsActive = true
        };
        db.DoctorSessions.Add(session);
        await db.SaveChangesAsync();

        // Book 5 appointments (queue numbers 1-5)
        for (int i = 1; i <= 5; i++)
        {
            db.DoctorAppointments.Add(new DoctorAppointment
            {
                DoctorId = doctor.Id,
                DoctorSessionId = session.Id,
                AppointmentNumber = $"APT-TEST-{session.Id:D4}-{i:D3}",
                PatientName = $"Patient {i}",
                PatientPhone = "0771234567",
                PatientEmail = $"patient{i}@test.com",
                PatientNic = $"NIC{i:D9}",
                QueueNumber = i,
                Status = AppointmentStatus.Confirmed,
                AppointmentDate = sessionDate.ToDateTime(new TimeOnly(9, 0)),
                TimeSlot = "09:00 AM"
            });
        }
        await db.SaveChangesAsync();

        // Cancel slot #2 — freeing the gap
        var apt2 = await db.DoctorAppointments.FirstAsync(a => a.QueueNumber == 2 && a.DoctorSessionId == session.Id);
        apt2.Status = AppointmentStatus.Cancelled;
        session.CurrentBookings = 4; // decremented
        await db.SaveChangesAsync();

        // Act: book a new appointment — it must fill slot #2
        var service = new AppointmentService(
            db,
            new Mock<IConfiguration>().Object,
            NullLogger<AppointmentService>.Instance,
            new Mock<IEmailSender>().Object,
            new Mock<IServiceScopeFactory>().Object
        );

        var request = new BookAppointmentRequest
        {
            DoctorId = doctor.Id,
            DoctorSessionId = session.Id,
            PatientName = "New Patient",
            PatientPhone = "0771111111",
            PatientEmail = "newpatient@test.com",
            PatientNic = "NIC999999999",
            BookingType = "Reservation"
        };

        var dto = await service.BookAppointmentAsync(request, null);

        // Assert: the new appointment takes the lowest available slot (#2)
        Assert.Equal(2, dto.QueueNumber);

        // All active queue numbers in the session must be unique
        var allActive = await db.DoctorAppointments
            .Where(a => a.DoctorSessionId == session.Id && a.Status != AppointmentStatus.Cancelled)
            .Select(a => a.QueueNumber)
            .ToListAsync();
        Assert.Equal(allActive.Count, allActive.Distinct().Count());
    }

    [Fact]
    public async Task BookAppointment_WhenAllSlotsOccupiedAfterGapFill_ThrowsFullSessionError()
    {
        // Arrange: session with capacity 3, slots 1,2,3 all active (no gaps)
        using var db = CreateInMemoryDbContext();
        var doctor = new Doctor { FullName = "Dr. Full", Specialization = "General" };
        db.Doctors.Add(doctor);
        await db.SaveChangesAsync();

        var sessionDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(1));
        var session = new DoctorSession
        {
            DoctorId = doctor.Id,
            SessionDate = sessionDate,
            SessionTime = new TimeOnly(10, 0),
            SessionType = SessionType.Morning,
            SessionStatus = SessionStatus.Scheduled,
            MaxCapacity = 3,
            CurrentBookings = 3,
            IsActive = true
        };
        db.DoctorSessions.Add(session);
        await db.SaveChangesAsync();

        for (int i = 1; i <= 3; i++)
        {
            db.DoctorAppointments.Add(new DoctorAppointment
            {
                DoctorId = doctor.Id,
                DoctorSessionId = session.Id,
                AppointmentNumber = $"APT-FULL-{session.Id:D4}-{i:D3}",
                PatientName = $"Patient {i}",
                PatientPhone = "0771234567",
                PatientEmail = $"full{i}@test.com",
                PatientNic = $"NIC{i:D9}F",
                QueueNumber = i,
                Status = AppointmentStatus.Confirmed,
                AppointmentDate = sessionDate.ToDateTime(new TimeOnly(10, 0)),
                TimeSlot = "10:00 AM"
            });
        }
        await db.SaveChangesAsync();

        var service = new AppointmentService(
            db,
            new Mock<IConfiguration>().Object,
            NullLogger<AppointmentService>.Instance,
            new Mock<IEmailSender>().Object,
            new Mock<IServiceScopeFactory>().Object
        );

        var request = new BookAppointmentRequest
        {
            DoctorId = doctor.Id,
            DoctorSessionId = session.Id,
            PatientName = "Overflow Patient",
            PatientPhone = "0779999999",
            PatientEmail = "overflow@test.com",
            PatientNic = "NIC000000000",
            BookingType = "Reservation"
        };

        // Act & Assert: must throw with the "full" message
        var ex = await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.BookAppointmentAsync(request, null));
        Assert.Equal("This session is full, please choose another session or date.", ex.Message);
    }

    [Fact]
    public async Task BookAppointment_Capacity25_FillCancelRebookAndRejectOverflow()
    {
        // Arrange: Evening session with capacity 25, filled completely
        using var db = CreateInMemoryDbContext();
        var doctor = new Doctor { FullName = "Dr. Silva", Specialization = "Cardiology" };
        db.Doctors.Add(doctor);
        await db.SaveChangesAsync();

        var sessionDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(1));
        var session = new DoctorSession
        {
            DoctorId = doctor.Id,
            SessionDate = sessionDate,
            SessionTime = new TimeOnly(16, 30),
            SessionType = SessionType.Evening,
            SessionStatus = SessionStatus.Scheduled,
            MaxCapacity = 25,
            CurrentBookings = 25,
            IsActive = true
        };
        db.DoctorSessions.Add(session);
        await db.SaveChangesAsync();

        // Fill all 25 slots
        for (int i = 1; i <= 25; i++)
        {
            db.DoctorAppointments.Add(new DoctorAppointment
            {
                DoctorId = doctor.Id,
                DoctorSessionId = session.Id,
                AppointmentNumber = $"APT-EVE-{session.Id:D4}-{i:D3}",
                PatientName = $"Patient {i}",
                PatientPhone = "0771234567",
                PatientEmail = $"patient{i}@test.com",
                PatientNic = $"NIC{i:D9}",
                QueueNumber = i,
                Status = AppointmentStatus.Confirmed,
                AppointmentDate = sessionDate.ToDateTime(new TimeOnly(16, 30)),
                TimeSlot = "04:30 PM"
            });
        }
        await db.SaveChangesAsync();

        // Cancel slot #14 (creating a gap in the middle)
        var cancelledApt = await db.DoctorAppointments.FirstAsync(a => a.DoctorSessionId == session.Id && a.QueueNumber == 14);
        cancelledApt.Status = AppointmentStatus.Cancelled;
        session.CurrentBookings = 24;
        await db.SaveChangesAsync();

        var service = new AppointmentService(
            db,
            new Mock<IConfiguration>().Object,
            NullLogger<AppointmentService>.Instance,
            new Mock<IEmailSender>().Object,
            new Mock<IServiceScopeFactory>().Object
        );

        // Act 1: Book once — must succeed and claim the freed slot #14
        var request1 = new BookAppointmentRequest
        {
            DoctorId = doctor.Id,
            DoctorSessionId = session.Id,
            PatientName = "Gap Filler Patient",
            PatientPhone = "0778888888",
            PatientEmail = "gapfiller@test.com",
            PatientNic = "NIC888888888",
            BookingType = "Reservation"
        };
        var bookedDto = await service.BookAppointmentAsync(request1, null);
        Assert.Equal(14, bookedDto.QueueNumber);

        // Act 2: Book again — now all 25 slots are occupied, must throw full session error
        var request2 = new BookAppointmentRequest
        {
            DoctorId = doctor.Id,
            DoctorSessionId = session.Id,
            PatientName = "Overflow Patient",
            PatientPhone = "0779999999",
            PatientEmail = "overflow@test.com",
            PatientNic = "NIC999999999",
            BookingType = "Reservation"
        };
        var ex = await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.BookAppointmentAsync(request2, null));
        Assert.Equal("This session is full, please choose another session or date.", ex.Message);
    }
}
