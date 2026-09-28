using HealthBridge.Api.Data;
using HealthBridge.Api.DTOs.Appointments;
using HealthBridge.Api.Models;
using HealthBridge.Api.Models.Appointments;
using HealthBridge.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace HealthBridge.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[IgnoreAntiforgeryToken]
public class DoctorAppointmentsController : ControllerBase
{
    private readonly IAppointmentService _appointmentService;
    private readonly ApplicationDbContext _context;
    private readonly ILogger<DoctorAppointmentsController> _logger;

    public DoctorAppointmentsController(
        IAppointmentService appointmentService,
        ApplicationDbContext context,
        ILogger<DoctorAppointmentsController> logger)
    {
        _appointmentService = appointmentService;
        _context = context;
        _logger = logger;
    }

    /// <summary>
    /// Search and list appointments for Staff / Admin overview. (Admin only)
    /// </summary>
    [HttpGet]
    [Authorize(Roles = UserRole.Admin)]
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
    /// Derive patient identity strictly from JWT claims to prevent IDOR vulnerabilities.
    /// </summary>
    [HttpGet("mine")]
    [HttpGet("my-appointments")]
    [Authorize(Roles = UserRole.Patient)]
    public async Task<IActionResult> GetMyAppointments([FromQuery] string? status)
    {
        var userId = GetCurrentPatientId();
        var userEmail = GetCurrentUserEmail();

        var list = await _appointmentService.GetMyAppointmentsAsync(userId, userEmail, status);
        return Ok(list);
    }

    /// <summary>
    /// Gets the patient queue for a specific doctor (powers the Doctor Dashboard).
    /// </summary>
    [HttpGet("doctor/{doctorId}")]
    [Authorize(Roles = $"{UserRole.Doctor},{UserRole.Admin}")]
    public async Task<IActionResult> GetDoctorQueue(int doctorId, [FromQuery] string? status)
    {
        var role = GetCurrentUserRole();
        if (role == UserRole.Doctor)
        {
            var currentDoctorId = await GetCurrentDoctorIdAsync();
            if (currentDoctorId != doctorId)
            {
                return Forbid();
            }
        }

        var list = await _appointmentService.GetAllAppointmentsAsync(null, status, doctorId);
        return Ok(list);
    }

    /// <summary>
    /// Dashboard statistics for admin and channeling desk. (Admin only)
    /// </summary>
    [HttpGet("stats")]
    [Authorize(Roles = UserRole.Admin)]
    public async Task<IActionResult> GetStats()
    {
        var stats = await _appointmentService.GetStatsAsync();
        return Ok(stats);
    }

    /// <summary>
    /// Book an appointment for a chosen doctor session slot. (Patient)
    /// Supports Reservation and OnlinePayment booking types.
    /// </summary>
    [HttpPost("book")]
    [Authorize(Roles = $"{UserRole.Patient},{UserRole.Admin}")]
    public async Task<IActionResult> BookAppointment([FromBody] BookAppointmentRequest request)
    {
        if (request == null)
            return BadRequest(new { message = "Booking data is required." });

        if (string.IsNullOrWhiteSpace(request.PatientName) || string.IsNullOrWhiteSpace(request.PatientPhone) || string.IsNullOrWhiteSpace(request.PatientNic))
        {
            return BadRequest(new { message = "Full Name, Contact Number, and NIC/Passport are required." });
        }

        var patientId = GetCurrentPatientId();
        var userEmail = GetCurrentUserEmail();
        if (string.IsNullOrWhiteSpace(request.PatientEmail) && !string.IsNullOrWhiteSpace(userEmail))
        {
            request.PatientEmail = userEmail;
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
    /// Simulated payment processing. Marks appointment Confirmed and PaymentStatus Paid. (Patient)
    /// Caller's JWT identity must match the appointment's PatientId or PatientEmail.
    /// </summary>
    [HttpPost("{id}/pay")]
    [Authorize(Roles = $"{UserRole.Patient},{UserRole.Admin}")]
    public async Task<IActionResult> ProcessPayment(int id, [FromBody] PaymentRequest request)
    {
        var apt = await _context.DoctorAppointments.FindAsync(id);
        if (apt == null) return NotFound(new { message = "Appointment not found." });

        var role = GetCurrentUserRole();
        if (role == UserRole.Patient)
        {
            var patientId = GetCurrentPatientId();
            var userEmail = GetCurrentUserEmail();
            var isOwner = (patientId.HasValue && apt.PatientId == patientId.Value) ||
                          (!string.IsNullOrEmpty(userEmail) && string.Equals(apt.PatientEmail, userEmail, StringComparison.OrdinalIgnoreCase));
            if (!isOwner) return Forbid();
        }

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
    /// Patient check-in at channeling desk via QR token. (Admin only)
    /// </summary>
    [HttpPost("{id}/checkin")]
    [Authorize(Roles = UserRole.Admin)]
    public async Task<IActionResult> CheckIn(int id, [FromBody] CheckInRequest request)
    {
        if (request == null || string.IsNullOrWhiteSpace(request.QrToken))
        {
            return BadRequest(new { message = "QR check-in token is required." });
        }

        try
        {
            var result = await _appointmentService.CheckInAsync(id, request.QrToken.Trim());
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
            _logger.LogError(ex, "Error checking in appointment {Id}", id);
            return StatusCode(500, new { message = "Check-in failed." });
        }
    }

    /// <summary>
    /// Updates appointment status (e.g., InProgress, Completed, NoShow, Cancelled). (Doctor or Admin)
    /// If Doctor: DoctorId must match linked caller record.
    /// </summary>
    [HttpPut("{id}/status")]
    [Authorize(Roles = $"{UserRole.Doctor},{UserRole.Admin}")]
    public async Task<IActionResult> UpdateStatus(int id, [FromBody] StatusUpdateDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto?.Status))
            return BadRequest(new { message = "Status is required." });

        var role = GetCurrentUserRole();
        if (role == UserRole.Doctor)
        {
            var apt = await _context.DoctorAppointments.FindAsync(id);
            if (apt == null) return NotFound(new { message = "Appointment not found." });

            var currentDoctorId = await GetCurrentDoctorIdAsync();
            if (currentDoctorId != apt.DoctorId)
            {
                return Forbid();
            }
        }

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
    /// Reschedule appointment to a new available session slot. (Patient)
    /// Caller must own the appointment.
    /// </summary>
    [HttpPost("{id}/reschedule")]
    [Authorize(Roles = $"{UserRole.Patient},{UserRole.Admin}")]
    public async Task<IActionResult> Reschedule(int id, [FromBody] RescheduleAppointmentRequest request)
    {
        var apt = await _context.DoctorAppointments.FindAsync(id);
        if (apt == null) return NotFound(new { message = "Appointment not found." });

        var role = GetCurrentUserRole();
        if (role == UserRole.Patient)
        {
            var patientId = GetCurrentPatientId();
            var userEmail = GetCurrentUserEmail();
            var isOwner = (patientId.HasValue && apt.PatientId == patientId.Value) ||
                          (!string.IsNullOrEmpty(userEmail) && string.Equals(apt.PatientEmail, userEmail, StringComparison.OrdinalIgnoreCase));
            if (!isOwner) return Forbid();
        }

        try
        {
            var patientId = GetCurrentPatientId();
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
    /// Cancel appointment and restore session capacity. (Patient or Admin)
    /// </summary>
    [HttpPost("{id}/cancel")]
    [Authorize(Roles = $"{UserRole.Patient},{UserRole.Admin}")]
    public async Task<IActionResult> Cancel(int id)
    {
        var apt = await _context.DoctorAppointments.FindAsync(id);
        if (apt == null) return NotFound(new { message = "Appointment not found." });

        var role = GetCurrentUserRole();
        var isAdmin = role == UserRole.Admin;

        if (!isAdmin)
        {
            var patientId = GetCurrentPatientId();
            var userEmail = GetCurrentUserEmail();
            var isOwner = (patientId.HasValue && apt.PatientId == patientId.Value) ||
                          (!string.IsNullOrEmpty(userEmail) && string.Equals(apt.PatientEmail, userEmail, StringComparison.OrdinalIgnoreCase));
            if (!isOwner) return Forbid();
        }

        try
        {
            var patientId = GetCurrentPatientId();
            var result = await _appointmentService.CancelAppointmentAsync(id, patientId, isAdmin);
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
    /// Delete appointment record (Admin only).
    /// </summary>
    [HttpDelete("{id}")]
    [Authorize(Roles = UserRole.Admin)]
    public async Task<IActionResult> DeleteAppointment(int id)
    {
        var deleted = await _appointmentService.DeleteAppointmentAsync(id);
        if (!deleted) return NotFound(new { message = "Appointment not found." });
        return Ok(new { message = "Appointment deleted successfully" });
    }

    // ── Helper methods ─────────────────────────────────────────────────────────────

    private int? GetCurrentPatientId()
    {
        return int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var uid) ? uid : null;
    }

    private string? GetCurrentUserEmail()
    {
        return User.FindFirstValue(ClaimTypes.Email);
    }

    private string? GetCurrentUserRole()
    {
        return User.FindFirstValue(ClaimTypes.Role);
    }

    private async Task<int?> GetCurrentDoctorIdAsync()
    {
        var email = GetCurrentUserEmail();
        var uid = GetCurrentPatientId();

        var doctor = await _context.Doctors.FirstOrDefaultAsync(d =>
            (uid.HasValue && d.UserId == uid.Value) ||
            (!string.IsNullOrEmpty(email) && d.Email != null && d.Email.ToLower() == email.ToLower()));

        return doctor?.Id;
    }
}
