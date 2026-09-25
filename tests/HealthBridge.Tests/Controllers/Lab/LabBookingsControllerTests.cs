using HealthBridge.Api.Controllers;
using HealthBridge.Api.Data;
using HealthBridge.Api.DTOs.Lab;
using HealthBridge.Api.Models;
using HealthBridge.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Xunit;

namespace HealthBridge.Tests.Controllers.Lab;

public class LabBookingsControllerTests
{
    private ApplicationDbContext CreateInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        return new ApplicationDbContext(options);
    }

    [Fact]
    public async Task GetSlots_ReturnsAvailableSlotsForSpecificDate()
    {
        // Arrange
        using var db = CreateInMemoryDbContext();
        var date = new DateOnly(2026, 10, 15);
        db.LabTimeSlots.AddRange(
            new LabTimeSlot { Date = date, Time = new TimeOnly(8, 0), MaxCapacity = 5, CurrentBookings = 1 },
            new LabTimeSlot { Date = date, Time = new TimeOnly(9, 0), MaxCapacity = 5, CurrentBookings = 5 }
        );
        await db.SaveChangesAsync();

        var mockEmail = new Mock<IEmailService>();
        var mockScopeFactory = new Mock<IServiceScopeFactory>();

        var controller = new LabBookingsController(
            db,
            mockEmail.Object,
            null!,
            mockScopeFactory.Object,
            NullLogger<LabBookingsController>.Instance
        );

        // Act
        var result = await controller.GetSlots(date);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var slots = Assert.IsAssignableFrom<IEnumerable<LabTimeSlotResponse>>(okResult.Value).ToList();
        Assert.Equal(2, slots.Count);
        Assert.Equal(new TimeOnly(8, 0), slots[0].Time);
        Assert.True(slots[0].IsAvailable);
        Assert.False(slots[1].IsAvailable); // 5/5 full
    }

    [Fact]
    public async Task Cancel_ConfirmedBooking_SuccessfullyCancelsAndFreesSlot()
    {
        // Arrange
        using var db = CreateInMemoryDbContext();
        var bookingId = Guid.NewGuid();
        var date = new DateOnly(2026, 10, 20);
        var time = new TimeOnly(10, 0);

        var slot = new LabTimeSlot { Date = date, Time = time, MaxCapacity = 5, CurrentBookings = 2 };
        db.LabTimeSlots.Add(slot);

        var test = new LabTest { Id = Guid.NewGuid(), Name = "Fasting Blood Sugar", Category = "Biochemistry", Price = 1200 };
        db.LabTests.Add(test);

        var booking = new LabBooking
        {
            Id = bookingId,
            PatientId = 42,
            PatientName = "Jane Doe",
            PatientEmail = "jane@example.com",
            LabTestId = test.Id,
            BookingDate = date,
            TimeSlot = time,
            Status = BookingStatus.Confirmed
        };
        db.LabBookings.Add(booking);
        await db.SaveChangesAsync();

        var mockEmail = new Mock<IEmailService>();
        var mockScopeFactory = new Mock<IServiceScopeFactory>();

        var controller = new LabBookingsController(
            db,
            mockEmail.Object,
            null!,
            mockScopeFactory.Object,
            NullLogger<LabBookingsController>.Instance
        );

        // Act
        var result = await controller.Cancel(bookingId, 42);

        // Assert
        Assert.IsType<NoContentResult>(result);

        var updatedBooking = await db.LabBookings.FindAsync(bookingId);
        Assert.NotNull(updatedBooking);
        Assert.Equal(BookingStatus.Cancelled, updatedBooking.Status);

        var updatedSlot = await db.LabTimeSlots.FirstOrDefaultAsync(s => s.Date == date && s.Time == time);
        Assert.NotNull(updatedSlot);
        Assert.Equal(1, updatedSlot.CurrentBookings); // Decremented from 2 to 1

        mockEmail.Verify(e => e.SendBookingCancelledAsync(
            "jane@example.com",
            "Jane Doe",
            It.IsAny<string>(),
            date,
            time,
            It.IsAny<string>()
        ), Times.Once);
    }

    [Fact]
    public async Task Cancel_NonExistentBooking_ReturnsNotFound()
    {
        // Arrange
        using var db = CreateInMemoryDbContext();
        var mockEmail = new Mock<IEmailService>();
        var mockScopeFactory = new Mock<IServiceScopeFactory>();

        var controller = new LabBookingsController(
            db,
            mockEmail.Object,
            null!,
            mockScopeFactory.Object,
            NullLogger<LabBookingsController>.Instance
        );

        // Act
        var result = await controller.Cancel(Guid.NewGuid(), 1);

        // Assert
        Assert.IsType<NotFoundObjectResult>(result);
    }

    [Fact]
    public async Task Cancel_MismatchedPatientId_ReturnsForbid()
    {
        // Arrange
        using var db = CreateInMemoryDbContext();
        var bookingId = Guid.NewGuid();
        var test = new LabTest { Id = Guid.NewGuid(), Name = "Lipid Profile", Category = "Biochemistry", Price = 1500 };
        db.LabTests.Add(test);

        var booking = new LabBooking
        {
            Id = bookingId,
            PatientId = 99,
            PatientName = "Restricted User",
            PatientEmail = "restricted@example.com",
            LabTestId = test.Id,
            BookingDate = new DateOnly(2026, 11, 1),
            TimeSlot = new TimeOnly(14, 0),
            Status = BookingStatus.Confirmed
        };
        db.LabBookings.Add(booking);
        await db.SaveChangesAsync();

        var mockEmail = new Mock<IEmailService>();
        var mockScopeFactory = new Mock<IServiceScopeFactory>();

        var controller = new LabBookingsController(
            db,
            mockEmail.Object,
            null!,
            mockScopeFactory.Object,
            NullLogger<LabBookingsController>.Instance
        );

        // Act (Patient 55 trying to cancel Patient 99's booking)
        var result = await controller.Cancel(bookingId, 55);

        // Assert
        Assert.IsType<ForbidResult>(result);
    }

    [Fact]
    public async Task Create_RestrictedLabTest_SetsStatusToPendingPrescriptionUpload()
    {
        // Arrange
        using var db = CreateInMemoryDbContext();
        var date = new DateOnly(2026, 11, 10);
        var time = new TimeOnly(9, 30);

        var test = new LabTest
        {
            Id = Guid.NewGuid(),
            Name = "HbA1c Blood Test",
            Category = "Diabetes",
            Price = 2500,
            IsRestricted = true,
            IsActive = true
        };
        db.LabTests.Add(test);
        await db.SaveChangesAsync();

        var mockEmail = new Mock<IEmailService>();
        var mockScopeFactory = new Mock<IServiceScopeFactory>();

        var controller = new LabBookingsController(
            db,
            mockEmail.Object,
            null!,
            mockScopeFactory.Object,
            NullLogger<LabBookingsController>.Instance
        );

        var request = new CreateBookingRequest
        {
            LabTestId = test.Id,
            PatientId = 7,
            PatientName = "Kasun Perera",
            PatientEmail = "kasun@example.com",
            BookingDate = date,
            TimeSlot = time
        };

        // Act
        var result = await controller.Create(request);

        // Assert
        var createdResult = Assert.IsType<CreatedAtActionResult>(result.Result);
        var response = Assert.IsType<LabBookingResponse>(createdResult.Value);
        Assert.Equal("PendingPrescriptionUpload", response.Status);
        Assert.Equal("Pending", response.AIVerification);

        var slot = await db.LabTimeSlots.FirstOrDefaultAsync(s => s.Date == date && s.Time == time);
        Assert.NotNull(slot);
        Assert.Equal(1, slot.CurrentBookings);

        mockEmail.Verify(e => e.SendBookingReceivedAsync(
            "kasun@example.com",
            "Kasun Perera",
            "HbA1c Blood Test",
            date,
            time,
            true
        ), Times.Once);
    }

    [Fact]
    public async Task Create_SlotFullyBooked_ReturnsBadRequest()
    {
        // Arrange
        using var db = CreateInMemoryDbContext();
        var date = new DateOnly(2026, 11, 10);
        var time = new TimeOnly(10, 0);

        var test = new LabTest
        {
            Id = Guid.NewGuid(),
            Name = "Full Blood Count",
            Category = "Hematology",
            Price = 1000,
            IsRestricted = false,
            IsActive = true
        };
        db.LabTests.Add(test);

        // Slot with 5/5 capacity
        var slot = new LabTimeSlot
        {
            Date = date,
            Time = time,
            MaxCapacity = 5,
            CurrentBookings = 5
        };
        db.LabTimeSlots.Add(slot);
        await db.SaveChangesAsync();

        var mockEmail = new Mock<IEmailService>();
        var mockScopeFactory = new Mock<IServiceScopeFactory>();

        var controller = new LabBookingsController(
            db,
            mockEmail.Object,
            null!,
            mockScopeFactory.Object,
            NullLogger<LabBookingsController>.Instance
        );

        var request = new CreateBookingRequest
        {
            LabTestId = test.Id,
            PatientId = 12,
            PatientName = "Nimal Silva",
            PatientEmail = "nimal@example.com",
            BookingDate = date,
            TimeSlot = time
        };

        // Act
        var result = await controller.Create(request);

        // Assert
        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task Create_InactiveOrMissingLabTest_ReturnsBadRequest()
    {
        // Arrange
        using var db = CreateInMemoryDbContext();
        var mockEmail = new Mock<IEmailService>();
        var mockScopeFactory = new Mock<IServiceScopeFactory>();

        var controller = new LabBookingsController(
            db,
            mockEmail.Object,
            null!,
            mockScopeFactory.Object,
            NullLogger<LabBookingsController>.Instance
        );

        var request = new CreateBookingRequest
        {
            LabTestId = Guid.NewGuid(), // Non-existent
            PatientId = 12,
            PatientName = "Nimal Silva",
            PatientEmail = "nimal@example.com",
            BookingDate = new DateOnly(2026, 11, 10),
            TimeSlot = new TimeOnly(11, 0)
        };

        // Act
        var result = await controller.Create(request);

        // Assert
        Assert.IsType<BadRequestObjectResult>(result.Result);
    }
}
