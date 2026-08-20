using HealthBridge.Api.Data;
using HealthBridge.Api.DTOs.Lab;
using HealthBridge.Api.Models;
using HealthBridge.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HealthBridge.Api.Controllers;

[ApiController]
[Route("api/lab/admin")]
public class LabAdminController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly IEmailService _emailService;
    private readonly ILogger<LabAdminController> _logger;

    public LabAdminController(ApplicationDbContext db, IEmailService emailService, ILogger<LabAdminController> logger)
    {
        _db = db;
        _emailService = emailService;
        _logger = logger;
    }

    // GET /api/lab/admin/bookings — Get all bookings (with optional status filter)
    [HttpGet("bookings")]
    public async Task<ActionResult<IEnumerable<LabBookingResponse>>> GetAllBookings([FromQuery] string? status)
    {
        var query = _db.LabBookings.Include(b => b.LabTest).AsQueryable();

        if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<BookingStatus>(status, out var parsedStatus))
            query = query.Where(b => b.Status == parsedStatus);

        var bookings = await query.OrderByDescending(b => b.CreatedAt).ToListAsync();
        return Ok(bookings.Select(MapToDto));
    }

    // GET /api/lab/admin/bookings/pending — Pending approval queue
    [HttpGet("bookings/pending")]
    public async Task<ActionResult<IEnumerable<LabBookingResponse>>> GetPending()
    {
        var bookings = await _db.LabBookings
            .Include(b => b.LabTest)
            .Where(b => b.Status == BookingStatus.PendingLabApproval)
            .OrderBy(b => b.CreatedAt)
            .ToListAsync();

        return Ok(bookings.Select(MapToDto));
    }

    // PUT /api/lab/admin/bookings/{id}/approve — Approve a booking
    [HttpPut("bookings/{id:guid}/approve")]
    public async Task<ActionResult<LabBookingResponse>> Approve(Guid id, [FromBody] ApproveBookingRequest dto, [FromQuery] Guid technicianId)
    {
        var booking = await _db.LabBookings.Include(b => b.LabTest).FirstOrDefaultAsync(b => b.Id == id);
        if (booking == null) return NotFound();

        if (booking.Status != BookingStatus.PendingLabApproval)
            return BadRequest(new { message = "This booking is not in a state that can be approved." });

        booking.Status = BookingStatus.Confirmed;
        booking.TechnicianId = technicianId;
        booking.TechnicianNotes = dto.Notes;
        booking.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        // Send confirmation email
        await _emailService.SendBookingConfirmationAsync(
            booking.PatientEmail,
            booking.PatientName,
            booking.LabTest.Name,
            booking.BookingDate,
            booking.TimeSlot);

        return Ok(MapToDto(booking));
    }

    // PUT /api/lab/admin/bookings/{id}/reject — Reject a booking
    [HttpPut("bookings/{id:guid}/reject")]
    public async Task<ActionResult<LabBookingResponse>> Reject(Guid id, [FromBody] RejectBookingRequest dto, [FromQuery] Guid technicianId)
    {
        var booking = await _db.LabBookings.Include(b => b.LabTest).FirstOrDefaultAsync(b => b.Id == id);
        if (booking == null) return NotFound();

        if (booking.Status != BookingStatus.PendingLabApproval)
            return BadRequest(new { message = "This booking cannot be rejected at this stage." });

        booking.Status = BookingStatus.Rejected;
        booking.TechnicianId = technicianId;
        booking.TechnicianNotes = dto.Reason;
        booking.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        // Send rejection email
        await _emailService.SendBookingRejectionAsync(
            booking.PatientEmail,
            booking.PatientName,
            booking.LabTest.Name,
            dto.Reason);

        return Ok(MapToDto(booking));
    }

    // PUT /api/lab/admin/bookings/{id}/collected — Mark sample as collected
    [HttpPut("bookings/{id:guid}/collected")]
    public async Task<ActionResult<LabBookingResponse>> MarkCollected(Guid id, [FromQuery] Guid technicianId)
    {
        var booking = await _db.LabBookings.Include(b => b.LabTest).FirstOrDefaultAsync(b => b.Id == id);
        if (booking == null) return NotFound();

        if (booking.Status != BookingStatus.Confirmed)
            return BadRequest(new { message = "Only confirmed bookings can have samples collected." });

        booking.Status = BookingStatus.SampleCollected;
        booking.TechnicianId = technicianId;
        booking.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(MapToDto(booking));
    }

    // POST /api/lab/admin/bookings/{id}/result — Upload result file
    [HttpPost("bookings/{id:guid}/result")]
    public async Task<ActionResult<LabBookingResponse>> UploadResult(Guid id, [FromBody] UploadResultRequest dto, [FromQuery] Guid technicianId)
    {
        var booking = await _db.LabBookings.Include(b => b.LabTest).FirstOrDefaultAsync(b => b.Id == id);
        if (booking == null) return NotFound();

        if (booking.Status != BookingStatus.SampleCollected &&
            booking.Status != BookingStatus.TestingInProgress &&
            booking.Status != BookingStatus.ResultsReady)
        {
            return BadRequest(new { message = "Results can only be uploaded for samples that have been collected or in testing." });
        }

        booking.ResultFileUrl = dto.ResultFileUrl;
        booking.Status = BookingStatus.ResultsReady;
        booking.ResultsUploadedAt = DateTime.UtcNow;
        booking.TechnicianId = technicianId;
        booking.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        // Notify patient results are ready
        try
        {
            await _emailService.SendResultsReadyAsync(
                booking.PatientEmail,
                booking.PatientName,
                booking.LabTest.Name);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Could not send results ready email to {Email}", booking.PatientEmail);
        }

        return Ok(MapToDto(booking));
    }

    // DELETE /api/lab/admin/bookings/{id} — Delete a booking entirely
    [HttpDelete("bookings/{id:guid}")]
    public async Task<IActionResult> DeleteBooking(Guid id)
    {
        var booking = await _db.LabBookings.FindAsync(id);
        if (booking == null) return NotFound();

        // If it was an active booking, free up the slot
        if (booking.Status != BookingStatus.Rejected && booking.Status != BookingStatus.Cancelled)
        {
            var slot = await _db.LabTimeSlots.FirstOrDefaultAsync(s => s.Date == booking.BookingDate && s.Time == booking.TimeSlot);
            if (slot != null && slot.CurrentBookings > 0)
            {
                slot.CurrentBookings--;
            }
        }

        _db.LabBookings.Remove(booking);
        await _db.SaveChangesAsync();

        return NoContent();
    }

    // GET /api/lab/admin/stats — Dashboard statistics
    [HttpGet("stats")]
    public async Task<ActionResult> GetStats()
    {
        var stats = new
        {
            TotalBookings = await _db.LabBookings.CountAsync(),
            PendingApproval = await _db.LabBookings.CountAsync(b => b.Status == BookingStatus.PendingLabApproval),
            Confirmed = await _db.LabBookings.CountAsync(b => b.Status == BookingStatus.Confirmed),
            SampleCollected = await _db.LabBookings.CountAsync(b => b.Status == BookingStatus.SampleCollected),
            ResultsReady = await _db.LabBookings.CountAsync(b => b.Status == BookingStatus.ResultsReady),
            Rejected = await _db.LabBookings.CountAsync(b => b.Status == BookingStatus.Rejected),
            TotalActiveTests = await _db.LabTests.CountAsync(t => t.IsActive),
            AIPreApproved = await _db.LabBookings.CountAsync(b => b.AIVerification == AIVerificationResult.PreApproved),
            AIFlagged = await _db.LabBookings.CountAsync(b => b.AIVerification == AIVerificationResult.Flagged),
        };
        return Ok(stats);
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

