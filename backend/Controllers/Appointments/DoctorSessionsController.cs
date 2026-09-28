using HealthBridge.Api.Data;
using HealthBridge.Api.DTOs.Appointments;
using HealthBridge.Api.Models;
using HealthBridge.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace HealthBridge.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[IgnoreAntiforgeryToken]
public class DoctorSessionsController : ControllerBase
{
    private readonly IAppointmentService _appointmentService;
    private readonly ApplicationDbContext _context;
    private readonly ILogger<DoctorSessionsController> _logger;

    public DoctorSessionsController(
        IAppointmentService appointmentService,
        ApplicationDbContext context,
        ILogger<DoctorSessionsController> logger)
    {
        _appointmentService = appointmentService;
        _context = context;
        _logger = logger;
    }

    /// <summary>
    /// Gets the queue for a doctor session. (Doctor or Admin)
    /// If Doctor: DoctorId must match caller.
    /// </summary>
    [HttpGet("{id}/queue")]
    [Authorize(Roles = $"{UserRole.Doctor},{UserRole.Admin}")]
    public async Task<IActionResult> GetSessionQueue(int id)
    {
        var session = await _context.DoctorSessions.FindAsync(id);
        if (session == null) return NotFound(new { message = "Session not found." });

        var role = GetCurrentUserRole();
        if (role == UserRole.Doctor)
        {
            var doctorId = await GetCurrentDoctorIdAsync();
            if (doctorId != session.DoctorId) return Forbid();
        }

        try
        {
            var queue = await _appointmentService.GetSessionQueueAsync(id);
            return Ok(queue);
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { message = "Session not found." });
        }
    }

    /// <summary>
    /// Starts a session (transitions to Active). (Doctor or Admin)
    /// </summary>
    [HttpPost("{id}/start")]
    [Authorize(Roles = $"{UserRole.Doctor},{UserRole.Admin}")]
    public async Task<IActionResult> StartSession(int id)
    {
        var session = await _context.DoctorSessions.FindAsync(id);
        if (session == null) return NotFound(new { message = "Session not found." });

        var role = GetCurrentUserRole();
        if (role == UserRole.Doctor)
        {
            var doctorId = await GetCurrentDoctorIdAsync();
            if (doctorId != session.DoctorId) return Forbid();
        }

        try
        {
            var result = await _appointmentService.StartSessionAsync(id);
            return Ok(result);
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { message = "Session not found." });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Delays a session with expected new start time and reason. (Admin only)
    /// </summary>
    [HttpPost("{id}/delay")]
    [Authorize(Roles = UserRole.Admin)]
    public async Task<IActionResult> DelaySession(int id, [FromBody] DelaySessionRequest request)
    {
        if (request == null || request.ExpectedStartTime == default)
        {
            return BadRequest(new { message = "Expected start time is required." });
        }

        try
        {
            var result = await _appointmentService.DelaySessionAsync(id, request.ExpectedStartTime, request.Reason);
            return Ok(result);
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { message = "Session not found." });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Doctor calls the next waiting patient in the queue. (Doctor only)
    /// </summary>
    [HttpPost("{id}/callnext")]
    [Authorize(Roles = UserRole.Doctor)]
    public async Task<IActionResult> CallNext(int id)
    {
        var session = await _context.DoctorSessions.FindAsync(id);
        if (session == null) return NotFound(new { message = "Session not found." });

        var doctorId = await GetCurrentDoctorIdAsync();
        if (doctorId != session.DoctorId) return Forbid();

        try
        {
            var nextApt = await _appointmentService.CallNextPatientAsync(id);
            return Ok(nextApt);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to call next patient for session {SessionId}", id);
            return StatusCode(500, new { message = "Failed to call next patient." });
        }
    }

    /// <summary>
    /// Cancels a session and cascades cancellation to all pending/confirmed appointments. (Admin only)
    /// </summary>
    [HttpPost("{id}/cancel")]
    [Authorize(Roles = UserRole.Admin)]
    public async Task<IActionResult> CancelSession(int id)
    {
        try
        {
            var result = await _appointmentService.CancelSessionAsync(id);
            return Ok(result);
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { message = "Session not found." });
        }
    }

    // ── Helper methods ─────────────────────────────────────────────────────────────

    private string? GetCurrentUserRole()
    {
        return User.FindFirstValue(ClaimTypes.Role);
    }

    private string? GetCurrentUserEmail()
    {
        return User.FindFirstValue(ClaimTypes.Email);
    }

    private int? GetCurrentUserId()
    {
        return int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var uid) ? uid : null;
    }

    private async Task<int?> GetCurrentDoctorIdAsync()
    {
        var email = GetCurrentUserEmail();
        var uid = GetCurrentUserId();

        var doctor = await _context.Doctors.FirstOrDefaultAsync(d =>
            (uid.HasValue && d.UserId == uid.Value) ||
            (!string.IsNullOrEmpty(email) && d.Email != null && d.Email.ToLower() == email.ToLower()));

        return doctor?.Id;
    }
}
