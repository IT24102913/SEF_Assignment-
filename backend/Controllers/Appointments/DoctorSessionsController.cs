using HealthBridge.Api.DTOs.Appointments;
using HealthBridge.Api.Models;
using HealthBridge.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace HealthBridge.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[IgnoreAntiforgeryToken]
public class DoctorSessionsController : ControllerBase
{
    private readonly IAppointmentService _appointmentService;
    private readonly ILogger<DoctorSessionsController> _logger;

    public DoctorSessionsController(
        IAppointmentService appointmentService,
        ILogger<DoctorSessionsController> logger)
    {
        _appointmentService = appointmentService;
        _logger = logger;
    }

    /// <summary>
    /// Gets the queue of patients booked for this doctor session.
    /// </summary>
    [HttpGet("{id}/queue")]
    public async Task<IActionResult> GetSessionQueue(int id)
    {
        try
        {
            var queue = await _appointmentService.GetSessionQueueAsync(id);
            return Ok(queue);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get session queue for session {Id}", id);
            return StatusCode(500, new { message = "Failed to load session queue." });
        }
    }

    /// <summary>
    /// Starts a doctor consultation session (moves status to Active).
    /// </summary>
    [HttpPost("{id}/start")]
    public async Task<IActionResult> StartSession(int id)
    {
        try
        {
            var session = await _appointmentService.StartSessionAsync(id);
            return Ok(session);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to start session {Id}", id);
            return StatusCode(500, new { message = "Failed to start session." });
        }
    }

    /// <summary>
    /// Marks a doctor session as delayed and updates expected start time.
    /// </summary>
    [HttpPost("{id}/delay")]
    public async Task<IActionResult> DelaySession(int id, [FromBody] DelaySessionRequest? request)
    {
        try
        {
            DateTime parsedDateTime = DateTime.UtcNow.AddMinutes(30);
            if (!string.IsNullOrWhiteSpace(request?.ExpectedStartTime))
            {
                var input = request.ExpectedStartTime.Trim().Replace('.', ':');
                if (DateTime.TryParse(input, System.Globalization.CultureInfo.InvariantCulture, out var dtInv) || DateTime.TryParse(input, out dtInv))
                {
                    parsedDateTime = DateTime.SpecifyKind(dtInv, DateTimeKind.Utc);
                }
                else if (TimeOnly.TryParse(input, System.Globalization.CultureInfo.InvariantCulture, out var tInv) || TimeOnly.TryParse(input, out tInv))
                {
                    var today = DateTime.UtcNow.Date;
                    parsedDateTime = DateTime.SpecifyKind(today.Add(tInv.ToTimeSpan()), DateTimeKind.Utc);
                }
            }

            var session = await _appointmentService.DelaySessionAsync(id, parsedDateTime, request?.Reason);
            return Ok(session);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to delay session {Id}: {Message}", id, ex.Message);
            return StatusCode(500, new { message = ex.InnerException?.Message ?? ex.Message });
        }
    }

    /// <summary>
    /// Calls the next waiting patient in the session queue.
    /// </summary>
    [HttpPost("{id}/callnext")]
    public async Task<IActionResult> CallNext(int id)
    {
        try
        {
            var nextPatient = await _appointmentService.CallNextPatientAsync(id);
            return Ok(nextPatient);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to call next patient for session {Id}", id);
            return StatusCode(500, new { message = "Failed to call next patient." });
        }
    }

    /// <summary>
    /// Cancels a doctor consultation session and notifies all booked patients.
    /// </summary>
    [HttpPost("{id}/cancel")]
    public async Task<IActionResult> CancelSession(int id, [FromBody] CancelSessionRequest? request)
    {
        try
        {
            var session = await _appointmentService.CancelSessionAsync(id);
            return Ok(session);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to cancel session {Id}", id);
            return StatusCode(500, new { message = "Failed to cancel session." });
        }
    }
}
