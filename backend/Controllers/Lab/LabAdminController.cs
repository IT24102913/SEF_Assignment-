using LabManagement.API.Data;
using LabManagement.API.DTOs;
using LabManagement.API.Models;
using LabManagement.API.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LabManagement.API.Controllers;

[ApiController]
[Route("api/lab/admin")]
public class LabAdminController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IEmailService _emailService;

    public LabAdminController(AppDbContext db, IEmailService emailService)
    {
        _db = db;
        _emailService = emailService;
    }

    // GET /api/lab/admin/bookings
    [HttpGet("bookings")]
    public async Task<ActionResult<IEnumerable<LabBookingDto>>> GetAllBookings()
    {
        var bookings = await _db.LabBookings
            .Include(b => b.LabTest)
            .OrderByDescending(b => b.CreatedAt)
            .ToListAsync();

        return Ok(bookings.Select(MapToDto));
    }

    // GET /api/lab/admin/bookings/{id}
    [HttpGet("bookings/{id:guid}")]
    public async Task<ActionResult<LabBookingDto>> GetBookingById(Guid id)
    {
        var booking = await _db.LabBookings
            .Include(b => b.LabTest)
            .FirstOrDefaultAsync(b => b.Id == id);

        if (booking == null)
            return NotFound();

        return Ok(MapToDto(booking));
    }

    // POST /api/lab/admin/bookings/{id}/result
    [HttpPost("bookings/{id:guid}/result")]
    public async Task<ActionResult<LabBookingDto>> UploadResult(
        Guid id,
        [FromBody] UploadResultDto dto,
        [FromQuery] Guid technicianId)
    {
        var booking = await _db.LabBookings
            .Include(b => b.LabTest)
            .FirstOrDefaultAsync(b => b.Id == id);

        if (booking == null)
            return NotFound();

        booking.ResultFileUrl = dto.ResultFileUrl;
        booking.ResultsUploadedAt = DateTime.UtcNow;
        booking.TechnicianId = technicianId;
        booking.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        await _emailService.SendResultsReadyAsync(
            booking.PatientEmail,
            booking.PatientName,
            booking.LabTest.Name);

        return Ok(MapToDto(booking));
    }

    // DELETE /api/lab/admin/bookings/{id}
    [HttpDelete("bookings/{id:guid}")]
    public async Task<IActionResult> DeleteBooking(Guid id)
    {
        var booking = await _db.LabBookings.FindAsync(id);

        if (booking == null)
            return NotFound();

        var slot = await _db.LabTimeSlots
            .FirstOrDefaultAsync(s =>
                s.Date == booking.BookingDate &&
                s.Time == booking.TimeSlot);

        if (slot != null && slot.CurrentBookings > 0)
        {
            slot.CurrentBookings--;
        }

        _db.LabBookings.Remove(booking);

        await _db.SaveChangesAsync();

        return NoContent();
    }

    // GET /api/lab/admin/stats
    [HttpGet("stats")]
    public async Task<ActionResult> GetStats()
    {
        var stats = new
        {
            TotalBookings = await _db.LabBookings.CountAsync(),

            TotalActiveTests = await _db.LabTests
                .CountAsync(t => t.IsActive)
        };

        return Ok(stats);
    }

    private static LabBookingDto MapToDto(LabBooking b) => new()
    {
        Id = b.Id,
        PatientId = b.PatientId,
        PatientName = b.PatientName,
        PatientEmail = b.PatientEmail,

        LabTest = b.LabTest == null
            ? null
            : new LabTestDto
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

        TechnicianNotes = b.TechnicianNotes,

        ResultFileUrl = b.ResultFileUrl,
        ResultsUploadedAt = b.ResultsUploadedAt,

        CreatedAt = b.CreatedAt,
        UpdatedAt = b.UpdatedAt
    };
}

public class UploadResultDto
{
    public string ResultFileUrl { get; set; } = string.Empty;
}