using LabManagement.API.Data;
using LabManagement.API.DTOs;
using LabManagement.API.Models;
using LabManagement.API.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LabManagement.API.Controllers;

[ApiController]
[Route("api/lab/bookings")]
public class LabBookingsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IEmailService _emailService;

    public LabBookingsController(
        AppDbContext db,
        IEmailService emailService)
    {
        _db = db;
        _emailService = emailService;
    }

    // GET /api/lab/bookings/my?patientId={id}
    [HttpGet("my")]
    public async Task<ActionResult<IEnumerable<LabBookingDto>>> GetMyBookings(
        [FromQuery] Guid patientId)
    {
        var bookings = await _db.LabBookings
            .Include(b => b.LabTest)
            .Where(b => b.PatientId == patientId)
            .OrderByDescending(b => b.CreatedAt)
            .ToListAsync();

        return Ok(bookings.Select(MapToDto));
    }

    // GET /api/lab/bookings/{id}
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<LabBookingDto>> GetById(Guid id)
    {
        var booking = await _db.LabBookings
            .Include(b => b.LabTest)
            .FirstOrDefaultAsync(b => b.Id == id);

        if (booking == null)
            return NotFound();

        return Ok(MapToDto(booking));
    }

    // POST /api/lab/bookings
    [HttpPost]
    public async Task<ActionResult<LabBookingDto>> Create(
        [FromBody] CreateBookingDto dto)
    {
        var test = await _db.LabTests.FindAsync(dto.LabTestId);

        if (test == null || !test.IsActive)
        {
            return BadRequest(new
            {
                message = "Lab test not found or unavailable."
            });
        }

        var slot = await _db.LabTimeSlots
            .FirstOrDefaultAsync(s =>
                s.Date == dto.BookingDate &&
                s.Time == dto.TimeSlot);

        if (slot != null && !slot.IsAvailable)
        {
            return BadRequest(new
            {
                message = "This time slot is fully booked. Please choose another."
            });
        }

        if (slot == null)
        {
            slot = new LabTimeSlot
            {
                Date = dto.BookingDate,
                Time = dto.TimeSlot,
                MaxCapacity = 5,
                CurrentBookings = 0
            };

            _db.LabTimeSlots.Add(slot);
        }

        var booking = new LabBooking
        {
            PatientId = dto.PatientId,
            PatientName = dto.PatientName,
            PatientEmail = dto.PatientEmail,
            LabTestId = dto.LabTestId,
            BookingDate = dto.BookingDate,
            TimeSlot = dto.TimeSlot
        };

        _db.LabBookings.Add(booking);

        slot.CurrentBookings++;

        await _db.SaveChangesAsync();

        await _emailService.SendBookingReceivedAsync(
            dto.PatientEmail,
            dto.PatientName,
            test.Name,
            dto.BookingDate,
            dto.TimeSlot,
            test.IsRestricted);

        return CreatedAtAction(
            nameof(GetById),
            new { id = booking.Id },
            MapToDto(booking));
    }

    // DELETE /api/lab/bookings/{id}
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Cancel(
        Guid id,
        [FromQuery] Guid patientId)
    {
        var booking = await _db.LabBookings.FindAsync(id);

        if (booking == null)
            return NotFound();

        if (booking.PatientId != patientId)
            return Forbid();

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

    // GET /api/lab/slots
    [HttpGet("/api/lab/slots")]
    public async Task<ActionResult<IEnumerable<LabTimeSlotDto>>> GetSlots(
        [FromQuery] DateOnly date)
    {
        var slots = await _db.LabTimeSlots
            .Where(s => s.Date == date)
            .OrderBy(s => s.Time)
            .ToListAsync();

        return Ok(slots.Select(s => new LabTimeSlotDto
        {
            Id = s.Id,
            Date = s.Date,
            Time = s.Time,
            MaxCapacity = s.MaxCapacity,
            CurrentBookings = s.CurrentBookings,
            IsAvailable = s.IsAvailable
        }));
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