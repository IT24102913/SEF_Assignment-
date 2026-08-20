using HealthBridge.Api.Agents;
using HealthBridge.Api.Data;
using HealthBridge.Api.DTOs.Lab;
using HealthBridge.Api.Models;
using HealthBridge.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HealthBridge.Api.Controllers;

[ApiController]
[Route("api/lab/bookings")]
public class LabBookingsController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly IEmailService _emailService;
    private readonly PrescriptionValidatorAgent _aiAgent;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<LabBookingsController> _logger;

    public LabBookingsController(ApplicationDbContext db, IEmailService emailService, PrescriptionValidatorAgent aiAgent, IServiceScopeFactory scopeFactory, ILogger<LabBookingsController> logger)
    {
        _db = db;
        _emailService = emailService;
        _aiAgent = aiAgent;
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    // GET /api/lab/bookings/my?patientId={id} — Patient's own bookings
    [HttpGet("my")]
    public async Task<ActionResult<IEnumerable<LabBookingResponse>>> GetMyBookings([FromQuery] int patientId)
    {
        var bookings = await _db.LabBookings
            .Include(b => b.LabTest)
            .Where(b => b.PatientId == patientId)
            .OrderByDescending(b => b.CreatedAt)
            .ToListAsync();

        return Ok(bookings.Select(MapToDto));
    }

    // GET /api/lab/bookings/{id} — Get single booking
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<LabBookingResponse>> GetById(Guid id)
    {
        var booking = await _db.LabBookings.Include(b => b.LabTest).FirstOrDefaultAsync(b => b.Id == id);
        if (booking == null) return NotFound();
        return Ok(MapToDto(booking));
    }

    // POST /api/lab/bookings — Create a new booking
    [HttpPost]
    public async Task<ActionResult<LabBookingResponse>> Create([FromBody] CreateBookingRequest dto)
    {
        var test = await _db.LabTests.FindAsync(dto.LabTestId);
        if (test == null || !test.IsActive)
            return BadRequest(new { message = "Lab test not found or unavailable." });

        // Check slot availability
        var slot = await _db.LabTimeSlots
            .FirstOrDefaultAsync(s => s.Date == dto.BookingDate && s.Time == dto.TimeSlot);

        if (slot != null && !slot.IsAvailable)
            return BadRequest(new { message = "This time slot is fully booked. Please choose another." });

        if (slot == null)
        {
            slot = new LabTimeSlot { Date = dto.BookingDate, Time = dto.TimeSlot, MaxCapacity = 5, CurrentBookings = 0 };
            _db.LabTimeSlots.Add(slot);
        }

        var booking = new LabBooking
        {
            PatientId = dto.PatientId,
            PatientName = dto.PatientName,
            PatientEmail = dto.PatientEmail,
            LabTestId = dto.LabTestId,
            BookingDate = dto.BookingDate,
            TimeSlot = dto.TimeSlot,
            Status = test.IsRestricted
                ? BookingStatus.PendingPrescriptionUpload
                : BookingStatus.PendingLabApproval,
            AIVerification = test.IsRestricted
                ? AIVerificationResult.Pending
                : AIVerificationResult.NotRequired
        };

        _db.LabBookings.Add(booking);

        // Update slot count
        slot.CurrentBookings++;

        await _db.SaveChangesAsync();

        // Send immediate "booking received" acknowledgement email (background / resilient)
        try
        {
            await _emailService.SendBookingReceivedAsync(
                dto.PatientEmail,
                dto.PatientName,
                test.Name,
                dto.BookingDate,
                dto.TimeSlot,
                test.IsRestricted);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Could not send booking confirmation email to {Email}", dto.PatientEmail);
        }

        return CreatedAtAction(nameof(GetById), new { id = booking.Id }, MapToDto(booking));
    }

    // POST /api/lab/bookings/{id}/prescription — Upload prescription and trigger AI
    [HttpPost("{id:guid}/prescription")]
    public async Task<ActionResult<LabBookingResponse>> UploadPrescription(Guid id, [FromBody] UploadPrescriptionRequest dto)
    {
        var booking = await _db.LabBookings.Include(b => b.LabTest).FirstOrDefaultAsync(b => b.Id == id);
        if (booking == null) return NotFound();

        if (booking.Status != BookingStatus.PendingPrescriptionUpload)
            return BadRequest(new { message = "Prescription upload not required for this booking." });

        // Save image URL
        booking.PrescriptionImageUrl = dto.PrescriptionImageUrl;
        booking.Status = BookingStatus.PendingAIVerification;
        booking.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        // Trigger AI Validation Agent asynchronously with its own scope
        // (the request-scoped DbContext will be disposed after this endpoint returns)
        var bookingId = booking.Id;
        var testName = booking.LabTest.Name;
        var imageUrl = dto.PrescriptionImageUrl;

        _ = Task.Run(async () =>
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var scopedDb = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
                var scopedAgent = scope.ServiceProvider.GetRequiredService<PrescriptionValidatorAgent>();

                var result = await scopedAgent.ValidatePrescriptionAsync(imageUrl, testName);

                var bgBooking = await scopedDb.LabBookings.FindAsync(bookingId);
                if (bgBooking == null) return;

                bgBooking.AIVerification = result.Status == "PRE_APPROVED"
                    ? AIVerificationResult.PreApproved
                    : AIVerificationResult.Flagged;
                bgBooking.AIVerificationNotes = $"{result.Notes} | Extracted: {string.Join(", ", result.ExtractedTests)}";
                bgBooking.AIConfidenceScore = result.Confidence;
                bgBooking.AIExtractedDoctorName = result.DoctorName;
                if (DateOnly.TryParse(result.PrescriptionDate, out var pd))
                    bgBooking.AIPrescriptionDate = pd;

                bgBooking.Status = BookingStatus.PendingLabApproval;
                bgBooking.UpdatedAt = DateTime.UtcNow;
                await scopedDb.SaveChangesAsync();

                _logger.LogInformation("[AI Agent] Background validation complete for booking {BookingId}. Status: {Status}", bookingId, result.Status);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[AI Agent] Background validation failed for booking {BookingId}", bookingId);
            }
        });

        return Ok(MapToDto(booking));
    }

    // DELETE /api/lab/bookings/{id} — Cancel booking (patient)
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Cancel(Guid id, [FromQuery] int patientId)
    {
        var booking = await _db.LabBookings.FindAsync(id);
        if (booking == null) return NotFound();
        if (booking.PatientId != patientId) return Forbid();

        var cancellableStatuses = new[]
        {
            BookingStatus.PendingPrescriptionUpload,
            BookingStatus.PendingAIVerification,
            BookingStatus.PendingLabApproval
        };

        if (!cancellableStatuses.Contains(booking.Status))
            return BadRequest(new { message = "This booking can no longer be cancelled." });

        booking.Status = BookingStatus.Cancelled;
        booking.UpdatedAt = DateTime.UtcNow;

        var slot = await _db.LabTimeSlots.FirstOrDefaultAsync(s => s.Date == booking.BookingDate && s.Time == booking.TimeSlot);
        if (slot != null && slot.CurrentBookings > 0)
        {
            slot.CurrentBookings--;
        }

        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPut("/api/lab/admin/bookings/{id}/status")]
    public async Task<IActionResult> UpdateBookingStatus(Guid id, [FromQuery] BookingStatus newStatus)
    {
        var booking = await _db.LabBookings.FindAsync(id);
        if (booking == null) return NotFound();

        // If transitioning to Rejected or Cancelled from an active status, free up the slot
        if ((newStatus == BookingStatus.Rejected || newStatus == BookingStatus.Cancelled) && 
            booking.Status != BookingStatus.Rejected && booking.Status != BookingStatus.Cancelled)
        {
            var slot = await _db.LabTimeSlots.FirstOrDefaultAsync(s => s.Date == booking.BookingDate && s.Time == booking.TimeSlot);
            if (slot != null && slot.CurrentBookings > 0)
            {
                slot.CurrentBookings--;
            }
        }

        booking.Status = newStatus;
        booking.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        // Send generic status update email
        await _emailService.SendStatusUpdateAsync(
            booking.PatientEmail, 
            booking.PatientName, 
            booking.LabTest?.Name ?? "Lab Test", 
            newStatus.ToString());

        return Ok(MapToDto(booking));
    }

    // GET /api/lab/slots — Get available time slots for a date
    [HttpGet("/api/lab/slots")]
    public async Task<ActionResult<IEnumerable<LabTimeSlotResponse>>> GetSlots([FromQuery] DateOnly date)
    {
        var slots = await _db.LabTimeSlots
            .Where(s => s.Date == date)
            .OrderBy(s => s.Time)
            .ToListAsync();

        return Ok(slots.Select(s => new LabTimeSlotResponse
        {
            Id = s.Id,
            Date = s.Date,
            Time = s.Time,
            MaxCapacity = s.MaxCapacity,
            CurrentBookings = s.CurrentBookings,
            IsAvailable = s.IsAvailable
        }));
    }

    private static LabBookingResponse MapToDto(LabBooking b) => new()
    {
        Id = b.Id,
        PatientId = b.PatientId,
        PatientName = b.PatientName,
        PatientEmail = b.PatientEmail,
        LabTest = b.LabTest == null ? null : new LabTestResponse
        {
            Id = b.LabTest.Id,
            Name = b.LabTest.Name,
            Description = b.LabTest.Description,
            Price = b.LabTest.Price,
            IsRestricted = b.LabTest.IsRestricted,
            TurnaroundDays = b.LabTest.TurnaroundDays,
            Category = b.LabTest.Category,
            IsActive = b.LabTest.IsActive
        },
        BookingDate = b.BookingDate,
        TimeSlot = b.TimeSlot,
        Status = b.Status.ToString(),
        PrescriptionImageUrl = b.PrescriptionImageUrl,
        AIVerification = b.AIVerification.ToString(),
        AIVerificationNotes = b.AIVerificationNotes,
        AIConfidenceScore = b.AIConfidenceScore,
        AIExtractedDoctorName = b.AIExtractedDoctorName,
        AIPrescriptionDate = b.AIPrescriptionDate,
        TechnicianNotes = b.TechnicianNotes,
        ResultFileUrl = b.ResultFileUrl,
        ResultsUploadedAt = b.ResultsUploadedAt,
        CreatedAt = b.CreatedAt,
        UpdatedAt = b.UpdatedAt
    };
}

