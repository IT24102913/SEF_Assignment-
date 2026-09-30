using HealthBridge.Api.DTOs.Appointments;
using HealthBridge.Api.Services;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace HealthBridge.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[IgnoreAntiforgeryToken]
public class DoctorAppointmentsController : ControllerBase
{
    private readonly IAppointmentService _appointmentService;
    private readonly ILogger<DoctorAppointmentsController> _logger;

    public DoctorAppointmentsController(IAppointmentService appointmentService, ILogger<DoctorAppointmentsController> logger)
    {
        _appointmentService = appointmentService;
        _logger = logger;
    }

    /// <summary>
    /// Search and list appointments for Staff / Admin / Pharmacist overview.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetAppointments(
        [FromQuery] string? search,
        [FromQuery] string? status,
        [FromQuery] int? doctorId)
    {
        var list = await _appointmentService.GetAllAppointmentsAsync(search, status, doctorId);
        return Ok(list);
    }

    /// <summary>
    /// Gets appointments belonging to the current patient for the "My Appointments" screen.
    /// </summary>
    [HttpGet("mine")]
    public async Task<IActionResult> GetMyAppointments(
        [FromQuery] int? patientId,
        [FromQuery] string? email,
        [FromQuery] string? status)
    {
        var userEmail = email ?? (User != null ? User.FindFirstValue(ClaimTypes.Email) : null);
        int? userId = patientId;

        if (!userId.HasValue && User != null && int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var uid))
        {
            userId = uid;
        }

        var list = await _appointmentService.GetMyAppointmentsAsync(userId, userEmail, status);
        return Ok(list);
    }

    /// <summary>
    /// Gets the patient queue for a specific doctor (powers the Doctor Dashboard).
    /// </summary>
    [HttpGet("doctor/{doctorId}")]
    public async Task<IActionResult> GetDoctorQueue(int doctorId, [FromQuery] string? status)
    {
        var list = await _appointmentService.GetAllAppointmentsAsync(null, status, doctorId);
        return Ok(list);
    }

    /// <summary>
    /// Dashboard statistics for admin and channeling desk.
    /// </summary>
    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        var stats = await _appointmentService.GetStatsAsync();
        return Ok(stats);
    }

    /// <summary>
    /// Book an appointment for a chosen doctor session slot.
    /// Validates session availability, allocates sequential queue number, and marks as PendingPayment.
    /// </summary>
    [HttpPost("book")]
    public async Task<IActionResult> BookAppointment([FromBody] BookAppointmentRequest request)
    {
        if (request == null)
            return BadRequest(new { message = "Booking data is required." });

        if (string.IsNullOrWhiteSpace(request.PatientName) || string.IsNullOrWhiteSpace(request.PatientPhone) || string.IsNullOrWhiteSpace(request.PatientNic))
        {
            return BadRequest(new { message = "Full Name, Contact Number, and NIC/Passport are required." });
        }

        int? patientId = null;
        if (User != null && int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var uid))
        {
            patientId = uid;
        }

        try
        {
            var appointment = await _appointmentService.BookAppointmentAsync(request, patientId);
            return Ok(appointment);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to book appointment");
            return StatusCode(500, new { message = "An error occurred while booking the appointment." });
        }
    }

    /// <summary>
    /// Simulated payment processing. Marks appointment Confirmed and PaymentStatus Paid.
    /// Never stores raw credit card details.
    /// </summary>
    [HttpPost("{id}/pay")]
    public async Task<IActionResult> ProcessPayment(int id, [FromBody] PaymentRequest request)
    {
        try
        {
            var result = await _appointmentService.ProcessPaymentAsync(id, request ?? new PaymentRequest());
            return Ok(result);
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { message = "Appointment not found." });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing payment for appointment {Id}", id);
            return StatusCode(500, new { message = "Payment processing failed." });
        }
    }

    /// <summary>
    /// Updates appointment status (e.g., InProgress, Completed, NoShow, Cancelled).
    /// </summary>
    [HttpPut("{id}/status")]
    public async Task<IActionResult> UpdateStatus(int id, [FromBody] StatusUpdateDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto?.Status))
            return BadRequest(new { message = "Status is required." });

        try
        {
            var updated = await _appointmentService.UpdateStatusAsync(id, dto.Status, dto.Notes);
            return Ok(updated);
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { message = "Appointment not found." });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Reschedule appointment to a new available session slot.
    /// </summary>
    [HttpPost("{id}/reschedule")]
    public async Task<IActionResult> Reschedule(int id, [FromBody] RescheduleAppointmentRequest request)
    {
        int? patientId = null;
        if (int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var uid))
        {
            patientId = uid;
        }

        try
        {
            var result = await _appointmentService.RescheduleAppointmentAsync(id, request.NewSessionId, patientId);
            return Ok(result);
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { message = "Appointment not found." });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Cancel appointment and restore session capacity.
    /// </summary>
    [HttpPost("{id}/cancel")]
    public async Task<IActionResult> Cancel(int id)
    {
        int? patientId = null;
        if (int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var uid))
        {
            patientId = uid;
        }

        try
        {
            var result = await _appointmentService.CancelAppointmentAsync(id, patientId);
            return Ok(result);
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { message = "Appointment not found." });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Delete appointment record (Admin only).
    /// </summary>
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteAppointment(int id)
    {
        var deleted = await _appointmentService.DeleteAppointmentAsync(id);
        if (!deleted) return NotFound(new { message = "Appointment not found." });
        return Ok(new { message = "Appointment deleted successfully" });
    }
}
