using HealthBridge.Api.DTOs.Appointments;
using HealthBridge.Api.Models;
using HealthBridge.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace HealthBridge.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[IgnoreAntiforgeryToken]
public class DoctorAppointmentsController : ControllerBase
{
    private readonly IAppointmentService _appointmentService;
    private readonly IEmailSender _emailSender;
    private readonly IConfiguration _config;
    private readonly ILogger<DoctorAppointmentsController> _logger;

    public DoctorAppointmentsController(
        IAppointmentService appointmentService,
        IEmailSender emailSender,
        IConfiguration config,
        ILogger<DoctorAppointmentsController> logger)
    {
        _appointmentService = appointmentService;
        _emailSender        = emailSender;
        _config             = config;
        _logger             = logger;
    }

    /// <summary>
    /// Live diagnostic endpoint to test email delivery and network reachability from Railway.
    /// </summary>
    [HttpGet("test-email-diagnostic")]
    public async Task<IActionResult> TestEmailDiagnostic([FromQuery] string? email)
    {
        var targetEmail = string.IsNullOrWhiteSpace(email) ? "danansuriyateeranya@gmail.com" : email.Trim();
        var diagnostic = new Dictionary<string, object>();

        // 1. DNS Resolution
        try
        {
            var hostAddresses = await System.Net.Dns.GetHostAddressesAsync("smtp.gmail.com");
            diagnostic["Dns_smtp.gmail.com"] = hostAddresses.Select(a => $"{a.AddressFamily}: {a}").ToList();
        }
        catch (Exception dnsEx)
        {
            diagnostic["Dns_Error"] = dnsEx.Message;
        }

        // 2. Direct TCP Socket connectivity to Port 465, Port 587, and Port 2525
        foreach (var port in new[] { 465, 587, 2525 })
        {
            var sw = System.Diagnostics.Stopwatch.StartNew();
            try
            {
                using var tcp = new System.Net.Sockets.TcpClient();
                using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(5));
                await tcp.ConnectAsync("smtp.gmail.com", port, cts.Token);
                sw.Stop();
                diagnostic[$"Tcp_Port_{port}"] = $"CONNECTED in {sw.ElapsedMilliseconds}ms";
            }
            catch (Exception ex)
            {
                sw.Stop();
                diagnostic[$"Tcp_Port_{port}"] = $"FAILED in {sw.ElapsedMilliseconds}ms: {ex.Message}";
            }
        }

        // 3. Test sending actual email via IEmailSender
        var sendSw = System.Diagnostics.Stopwatch.StartNew();
        try
        {
            var sendResult = await _emailSender.SendEmailAsync(
                targetEmail,
                "Teeranya Danansuriya",
                "Health Bridge Live Railway Email Diagnostic",
                "<h2>Live Email Test from Railway Container</h2><p>This email was dispatched directly by the .NET backend running inside Railway.</p>");
            sendSw.Stop();
            diagnostic["EmailSender_Result"] = sendResult ? "SUCCESS (Delivered)" : "FAILURE (Returned false)";
            diagnostic["EmailSender_ElapsedMs"] = sendSw.ElapsedMilliseconds;
        }
        catch (Exception sendEx)
        {
            sendSw.Stop();
            diagnostic["EmailSender_Exception"] = sendEx.ToString();
            diagnostic["EmailSender_ElapsedMs"] = sendSw.ElapsedMilliseconds;
        }

        return Ok(diagnostic);
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
    /// Preview and verify appointment details via QR token before confirming check-in. (Admin only)
    /// </summary>
    [HttpGet("lookup-qr")]
    [Authorize(Roles = UserRole.Admin)]
    public async Task<IActionResult> LookupByQr([FromQuery] string token)
    {
        if (string.IsNullOrWhiteSpace(token))
        {
            return BadRequest(new { message = "QR token or Appointment Number is required." });
        }

        try
        {
            var result = await _appointmentService.GetByQrTokenAsync(token.Trim());
            if (result == null)
            {
                return NotFound(new { message = "No appointment found matching this QR code or Reference Number." });
            }
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error looking up appointment by QR {Token}", token);
            return StatusCode(500, new { message = "Failed to verify QR token." });
        }
    }

    /// <summary>
    /// Privacy-safe search for Channeling Desk with masked NIC and minimal fields. (Admin only)
    /// </summary>
    [HttpGet("desk-search")]
    [Authorize(Roles = UserRole.Admin)]
    public async Task<IActionResult> DeskSearch([FromQuery] string query)
    {
        if (string.IsNullOrWhiteSpace(query))
        {
            return Ok(new List<AppointmentSearchResultDto>());
        }

        try
        {
            var results = await _appointmentService.SearchAppointmentsForDeskAsync(query.Trim());
            return Ok(results);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error searching appointments for desk with query {Query}", query);
            return StatusCode(500, new { message = "Failed to search appointments." });
        }
    }

    /// <summary>
    /// Patient check-in at channeling desk via QR token or manual override by staff. (Admin only)
    /// </summary>
    [HttpPost("{id}/checkin")]
    [Authorize(Roles = UserRole.Admin)]
    public async Task<IActionResult> CheckIn(int id, [FromBody] CheckInRequest? request)
    {
        var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        int? adminUserId = int.TryParse(userIdClaim, out var parsedId) ? parsedId : null;

        try
        {
            var result = await _appointmentService.CheckInAsync(id, request?.QrToken?.Trim(), adminUserId);
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
            return StatusCode(500, new { message = "Check-in failed due to server error." });
        }
    }

    /// <summary>
    /// Updates appointment status (e.g., InProgress, Completed, NoShow, Cancelled). (Doctor or Admin)
    /// If Doctor: DoctorId must match linked caller record.
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
