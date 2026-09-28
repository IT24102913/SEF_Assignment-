using HealthBridge.Api.DTOs.EMR;
using HealthBridge.Api.Services.EMR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace HealthBridge.Api.Controllers.EMR;

[ApiController]
[Route("api/emr")]
[Produces("application/json")]
public class EMRController : ControllerBase
{
    private readonly IEMRService _emrService;
    private readonly ILogger<EMRController> _logger;

    public EMRController(IEMRService emrService, ILogger<EMRController> logger)
    {
        _emrService = emrService;
        _logger = logger;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // PATIENTS
    // ═══════════════════════════════════════════════════════════════════════════

    /// <summary>
    /// Search and retrieve all patients
    /// </summary>
    [HttpGet("patients")]
    public async Task<ActionResult<IEnumerable<PatientDto>>> GetPatients([FromQuery] string? search)
    {
        var patients = await _emrService.GetAllPatientsAsync(search);
        return Ok(patients);
    }

    /// <summary>
    /// Get the current logged-in patient's own EMR record (from JWT token or fallback identifiers)
    /// </summary>
    [HttpGet("patients/me")]
    public async Task<ActionResult<PatientDto>> GetMyPatient(
        [FromQuery] string? patientCode, 
        [FromQuery] string? email)
    {
        int? userId = null;
        string? userEmail = email;

        if (User.Identity?.IsAuthenticated == true)
        {
            var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier)
                           ?? User.FindFirstValue("sub")
                           ?? User.FindFirstValue("nameid");

            if (int.TryParse(userIdClaim, out var parsedId))
            {
                userId = parsedId;
            }

            userEmail ??= User.FindFirstValue(ClaimTypes.Email) ?? User.FindFirstValue("email");
        }

        PatientDto? patient = null;

        // 1. Try finding by userId
        if (userId.HasValue)
        {
            patient = await _emrService.GetPatientByUserIdAsync(userId.Value);
        }

        // 2. Try finding by patientCode
        if (patient == null && !string.IsNullOrWhiteSpace(patientCode))
        {
            patient = await _emrService.GetPatientByCodeAsync(patientCode.Trim());
        }

        // 3. Try finding by email
        if (patient == null && !string.IsNullOrWhiteSpace(userEmail))
        {
            var list = await _emrService.GetAllPatientsAsync(userEmail.Trim());
            patient = list.FirstOrDefault(p => string.Equals(p.Email, userEmail.Trim(), StringComparison.OrdinalIgnoreCase));
        }

        if (patient == null)
            return NotFound(new { message = "No EMR patient record found for your account." });

        return Ok(patient);
    }

    /// <summary>
    /// Get personalized, real notifications for the logged-in user based strictly on their actual records
    /// </summary>
    [HttpGet("notifications")]
    [Authorize]
    public async Task<ActionResult<IEnumerable<EMRNotificationDto>>> GetMyNotifications()
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier)
                       ?? User.FindFirstValue("sub")
                       ?? User.FindFirstValue("nameid");

        if (!int.TryParse(userIdClaim, out var userId))
            return Unauthorized(new { message = "Invalid token: cannot identify user." });

        var role = User.FindFirstValue(ClaimTypes.Role) ?? "Patient";
        var notifications = await _emrService.GetUserNotificationsAsync(userId, role);
        return Ok(notifications);
    }

    /// <summary>
    /// Retrieve a patient by unique ID or PatientCode (e.g. PAT-1001)
    /// </summary>
    [HttpGet("patients/{idOrCode}")]
    public async Task<ActionResult<PatientDto>> GetPatient(string idOrCode)
    {
        PatientDto? patient;
        if (Guid.TryParse(idOrCode, out var guid))
        {
            patient = await _emrService.GetPatientByIdAsync(guid);
        }
        else
        {
            patient = await _emrService.GetPatientByCodeAsync(idOrCode);
        }

        if (patient == null)
            return NotFound(new { message = $"Patient '{idOrCode}' not found." });

        return Ok(patient);
    }

    /// <summary>
    /// Register a new patient in the EMR
    /// </summary>
    [HttpPost("patients")]
    public async Task<ActionResult<PatientDto>> CreatePatient([FromBody] CreatePatientDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.FullName))
            return BadRequest(new { message = "Patient full name is required." });

        var created = await _emrService.CreatePatientAsync(dto);
        return CreatedAtAction(nameof(GetPatient), new { idOrCode = created.PatientCode }, created);
    }

    /// <summary>
    /// Update existing patient record
    /// </summary>
    [HttpPut("patients/{id:guid}")]
    public async Task<ActionResult<PatientDto>> UpdatePatient(Guid id, [FromBody] UpdatePatientDto dto)
    {
        var updated = await _emrService.UpdatePatientAsync(id, dto);
        if (updated == null)
            return NotFound(new { message = $"Patient with ID {id} not found." });

        return Ok(updated);
    }

    /// <summary>
    /// Update existing patient record by PatientCode
    /// </summary>
    [HttpPut("patients/code/{patientCode}")]
    public async Task<ActionResult<PatientDto>> UpdatePatientByCode(string patientCode, [FromBody] UpdatePatientDto dto)
    {
        var updated = await _emrService.UpdatePatientByCodeAsync(patientCode, dto);
        if (updated == null)
            return NotFound(new { message = $"Patient with code '{patientCode}' not found." });

        return Ok(updated);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // CONSULTATION NOTES
    // ═══════════════════════════════════════════════════════════════════════════

    /// <summary>
    /// Get consultation notes, optionally filtered by patient code, search keyword, or doctor
    /// </summary>
    [HttpGet("consultations")]
    public async Task<ActionResult<IEnumerable<ConsultationNoteDto>>> GetConsultations(
        [FromQuery] string? patientCode,
        [FromQuery] string? search,
        [FromQuery] string? doctorName)
    {
        var notes = await _emrService.GetConsultationsAsync(patientCode, search, doctorName);
        return Ok(notes);
    }

    /// <summary>
    /// Get consultation note by ID
    /// </summary>
    [HttpGet("consultations/{id:guid}")]
    public async Task<ActionResult<ConsultationNoteDto>> GetConsultation(Guid id)
    {
        var note = await _emrService.GetConsultationByIdAsync(id);
        if (note == null)
            return NotFound(new { message = $"Consultation note {id} not found." });

        return Ok(note);
    }

    /// <summary>
    /// Create new consultation note (Consultant / Doctor)
    /// </summary>
    [HttpPost("consultations")]
    public async Task<ActionResult<ConsultationNoteDto>> CreateConsultation([FromBody] CreateConsultationNoteDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.PatientCode) || string.IsNullOrWhiteSpace(dto.Diagnosis))
            return BadRequest(new { message = "PatientCode and Diagnosis are required." });

        try
        {
            var note = await _emrService.CreateConsultationAsync(dto);
            return CreatedAtAction(nameof(GetConsultation), new { id = note.Id }, note);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Delete a consultation note (Admin only)
    /// </summary>
    [HttpDelete("consultations/{id:guid}")]
    public async Task<IActionResult> DeleteConsultation(Guid id)
    {
        var deleted = await _emrService.DeleteConsultationAsync(id);
        if (!deleted)
            return NotFound(new { message = $"Consultation note {id} not found." });

        return NoContent();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // LAB REPORTS
    // ═══════════════════════════════════════════════════════════════════════════

    /// <summary>
    /// Get lab reports, optionally filtered by patient code, search keyword, category, or status
    /// </summary>
    [HttpGet("lab-reports")]
    public async Task<ActionResult<IEnumerable<LabReportDto>>> GetLabReports(
        [FromQuery] string? patientCode,
        [FromQuery] string? search,
        [FromQuery] string? category,
        [FromQuery] string? status)
    {
        var reports = await _emrService.GetLabReportsAsync(patientCode, search, category, status);
        return Ok(reports);
    }

    /// <summary>
    /// Get lab report by ID
    /// </summary>
    [HttpGet("lab-reports/{id:guid}")]
    public async Task<ActionResult<LabReportDto>> GetLabReport(Guid id)
    {
        var report = await _emrService.GetLabReportByIdAsync(id);
        if (report == null)
            return NotFound(new { message = $"Lab report {id} not found." });

        return Ok(report);
    }

    /// <summary>
    /// Create new lab report (Laboratorian)
    /// </summary>
    [HttpPost("lab-reports")]
    public async Task<ActionResult<LabReportDto>> CreateLabReport([FromBody] CreateLabReportDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.PatientCode) || string.IsNullOrWhiteSpace(dto.TestTitle))
            return BadRequest(new { message = "PatientCode and TestTitle are required." });

        try
        {
            var report = await _emrService.CreateLabReportAsync(dto);
            return CreatedAtAction(nameof(GetLabReport), new { id = report.Id }, report);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Update lab report status (Laboratorian / Admin)
    /// </summary>
    [HttpPatch("lab-reports/{id:guid}/status")]
    public async Task<ActionResult<LabReportDto>> UpdateLabReportStatus(Guid id, [FromBody] UpdateLabReportStatusDto dto)
    {
        var updated = await _emrService.UpdateLabReportStatusAsync(id, dto);
        if (updated == null)
            return NotFound(new { message = $"Lab report {id} not found." });

        return Ok(updated);
    }

    /// <summary>
    /// Delete a lab report (Admin only)
    /// </summary>
    [HttpDelete("lab-reports/{id:guid}")]
    public async Task<IActionResult> DeleteLabReport(Guid id)
    {
        var deleted = await _emrService.DeleteLabReportAsync(id);
        if (!deleted)
            return NotFound(new { message = $"Lab report {id} not found." });

        return NoContent();
    }

    /// <summary>
    /// Open or view the exact lab report file inline (PDF or image) in the browser
    /// </summary>
    [HttpGet("lab-reports/{id:guid}/view")]
    public async Task<IActionResult> ViewLabReportFile(Guid id)
    {
        var report = await _emrService.GetLabReportByIdAsync(id);
        if (report == null)
            return NotFound(new { message = $"Lab report {id} not found." });

        if (!string.IsNullOrEmpty(report.FileUrl) && report.FileUrl.StartsWith("data:"))
        {
            var match = System.Text.RegularExpressions.Regex.Match(report.FileUrl, @"^data:(?<type>.*?);base64,(?<data>.*)$");
            if (match.Success)
            {
                var contentType = match.Groups["type"].Value;
                var base64Data = match.Groups["data"].Value;
                var bytes = Convert.FromBase64String(base64Data);
                return File(bytes, contentType);
            }
        }

        if (!string.IsNullOrEmpty(report.FileUrl))
        {
            return Redirect(report.FileUrl);
        }

        return NotFound(new { message = "No file attached to this lab report." });
    }

    /// <summary>
    /// Download or export lab report file
    /// </summary>
    [HttpGet("lab-reports/{id:guid}/download")]
    public async Task<IActionResult> DownloadLabReport(Guid id)
    {
        var report = await _emrService.GetLabReportByIdAsync(id);
        if (report == null)
            return NotFound(new { message = $"Lab report {id} not found." });

        if (!string.IsNullOrEmpty(report.FileUrl) && report.FileUrl.StartsWith("data:"))
        {
            var match = System.Text.RegularExpressions.Regex.Match(report.FileUrl, @"^data:(?<type>.*?);base64,(?<data>.*)$");
            if (match.Success)
            {
                var contentType = match.Groups["type"].Value;
                var base64Data = match.Groups["data"].Value;
                var bytes = Convert.FromBase64String(base64Data);
                var fileName = string.IsNullOrWhiteSpace(report.FileName) ? "LabReport.pdf" : report.FileName;
                return File(bytes, contentType, fileName);
            }
        }

        if (!string.IsNullOrEmpty(report.FileUrl))
        {
            return Redirect(report.FileUrl);
        }

        return NotFound(new { message = "No file attached to this lab report." });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // PRESCRIPTIONS
    // ═══════════════════════════════════════════════════════════════════════════

    /// <summary>
    /// Get prescriptions, optionally filtered by patient code, search keyword, status, or doctor
    /// </summary>
    [HttpGet("prescriptions")]
    public async Task<ActionResult<IEnumerable<PrescriptionDto>>> GetPrescriptions(
        [FromQuery] string? patientCode,
        [FromQuery] string? search,
        [FromQuery] string? status,
        [FromQuery] string? doctorName)
    {
        var prescriptions = await _emrService.GetPrescriptionsAsync(patientCode, search, status, doctorName);
        return Ok(prescriptions);
    }

    /// <summary>
    /// Get prescription by ID
    /// </summary>
    [HttpGet("prescriptions/{id:guid}")]
    public async Task<ActionResult<PrescriptionDto>> GetPrescription(Guid id)
    {
        var rx = await _emrService.GetPrescriptionByIdAsync(id);
        if (rx == null)
            return NotFound(new { message = $"Prescription {id} not found." });

        return Ok(rx);
    }

    /// <summary>
    /// Prescribe / dispense medication (Pharmacist / Doctor)
    /// </summary>
    [HttpPost("prescriptions")]
    public async Task<ActionResult<PrescriptionDto>> CreatePrescription([FromBody] CreatePrescriptionDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.PatientCode) || string.IsNullOrWhiteSpace(dto.MedicationName))
            return BadRequest(new { message = "PatientCode and MedicationName are required." });

        try
        {
            var rx = await _emrService.CreatePrescriptionAsync(dto);
            return CreatedAtAction(nameof(GetPrescription), new { id = rx.Id }, rx);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Prescribe / dispense multiple medications in a single batch (Pharmacist / Doctor)
    /// </summary>
    [HttpPost("prescriptions/batch")]
    public async Task<ActionResult<IEnumerable<PrescriptionDto>>> CreatePrescriptionsBatch([FromBody] BatchCreatePrescriptionsDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.PatientCode) || dto.Items == null || !dto.Items.Any())
            return BadRequest(new { message = "PatientCode and at least one medication item are required." });

        try
        {
            var rxs = await _emrService.CreatePrescriptionsBatchAsync(dto);
            return Ok(rxs);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Update prescription status (Active -> Completed / Cancelled)
    /// </summary>
    [HttpPatch("prescriptions/{id:guid}/status")]
    public async Task<ActionResult<PrescriptionDto>> UpdatePrescriptionStatus(Guid id, [FromBody] UpdatePrescriptionStatusDto dto)
    {
        var updated = await _emrService.UpdatePrescriptionStatusAsync(id, dto);
        if (updated == null)
            return NotFound(new { message = $"Prescription {id} not found." });

        return Ok(updated);
    }

    /// <summary>
    /// Delete a prescription (Admin only)
    /// </summary>
    [HttpDelete("prescriptions/{id:guid}")]
    public async Task<IActionResult> DeletePrescription(Guid id)
    {
        var deleted = await _emrService.DeletePrescriptionAsync(id);
        if (!deleted)
            return NotFound(new { message = $"Prescription {id} not found." });

        return NoContent();
    }

    /// <summary>
    /// Request authorization to Edit or Delete a dispensed medication (Pharmacist / Staff)
    /// </summary>
    [HttpPost("prescriptions/{id:guid}/request-authorization")]
    public async Task<ActionResult<PrescriptionDto>> RequestPrescriptionAuthorization(Guid id, [FromBody] RequestPrescriptionAuthorizationDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Reason))
            return BadRequest(new { message = "A reason must be provided for the authorization request." });

        var updated = await _emrService.RequestPrescriptionAuthorizationAsync(id, dto);
        if (updated == null)
            return NotFound(new { message = $"Prescription {id} not found." });

        return Ok(updated);
    }

    /// <summary>
    /// Get all pending pharmacist prescription authorization requests (Admin only)
    /// </summary>
    [HttpGet("prescriptions/authorizations/pending")]
    public async Task<ActionResult<IEnumerable<PrescriptionDto>>> GetPendingPrescriptionAuthorizations()
    {
        var list = await _emrService.GetPendingPrescriptionAuthorizationsAsync();
        return Ok(list);
    }

    /// <summary>
    /// Admin approves deletion request and permanently removes the prescription based on pharmacist request
    /// </summary>
    [HttpPost("prescriptions/{id:guid}/approve-delete")]
    public async Task<IActionResult> ApproveAndDeletePrescription(Guid id, [FromBody] ResolvePrescriptionAuthorizationDto? dto)
    {
        var deleted = await _emrService.ApproveAndDeletePrescriptionAsync(id, dto?.AdminNote);
        if (!deleted)
            return NotFound(new { message = $"Prescription {id} not found." });

        return Ok(new { message = "Prescription deleted based on pharmacist authorization request.", id });
    }

    /// <summary>
    /// Admin rejects or dismisses the authorization request
    /// </summary>
    [HttpPost("prescriptions/{id:guid}/reject-authorization")]
    public async Task<ActionResult<PrescriptionDto>> RejectPrescriptionAuthorization(Guid id, [FromBody] ResolvePrescriptionAuthorizationDto? dto)
    {
        var updated = await _emrService.RejectPrescriptionAuthorizationAsync(id, dto?.AdminNote);
        if (updated == null)
            return NotFound(new { message = $"Prescription {id} not found." });

        return Ok(updated);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // BUSINESS-SPECIFIC OPERATION: CLINICAL SUMMARY & HEALTH PASSPORT
    // ═══════════════════════════════════════════════════════════════════════════

    /// <summary>
    /// Business-Specific Operation: Generates comprehensive clinical health passport,
    /// evaluates drug-allergy interactions, active treatment plans, and diagnostic timeline.
    /// </summary>
    [HttpGet("patients/{idOrCode}/clinical-summary")]
    public async Task<ActionResult<ClinicalSummaryDto>> GetClinicalSummary(string idOrCode)
    {
        var summary = await _emrService.GenerateClinicalSummaryAsync(idOrCode);
        if (summary == null)
            return NotFound(new { message = $"Patient '{idOrCode}' not found." });

        return Ok(summary);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // CHANNELING APPOINTMENTS
    // ═══════════════════════════════════════════════════════════════════════════

    /// <summary>
    /// Get channeling appointments, optionally filtered by patient code
    /// </summary>
    [HttpGet("channeling-appointments")]
    public async Task<ActionResult<IEnumerable<ChannelingAppointmentDto>>> GetChannelingAppointments([FromQuery] string? patientCode)
    {
        if (string.IsNullOrWhiteSpace(patientCode) && User.Identity?.IsAuthenticated == true)
        {
            var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier)
                           ?? User.FindFirstValue("sub")
                           ?? User.FindFirstValue("nameid");
            if (int.TryParse(userIdClaim, out var parsedId))
            {
                var p = await _emrService.GetPatientByUserIdAsync(parsedId);
                if (p != null) patientCode = p.PatientCode;
                else patientCode = userIdClaim;
            }

            if (string.IsNullOrWhiteSpace(patientCode))
            {
                var emailClaim = User.FindFirstValue(ClaimTypes.Email) ?? User.FindFirstValue("email");
                if (!string.IsNullOrWhiteSpace(emailClaim))
                {
                    var allPatients = await _emrService.GetAllPatientsAsync(emailClaim.Trim());
                    var p = allPatients.FirstOrDefault(x => string.Equals(x.Email, emailClaim.Trim(), StringComparison.OrdinalIgnoreCase));
                    if (p != null) patientCode = p.PatientCode;
                    else patientCode = emailClaim;
                }
            }
        }

        var list = await _emrService.GetChannelingAppointmentsAsync(patientCode);
        return Ok(list);
    }

    /// <summary>
    /// Book a new channeling appointment
    /// </summary>
    [HttpPost("channeling-appointments")]
    public async Task<ActionResult<ChannelingAppointmentDto>> CreateChannelingAppointment([FromBody] CreateChannelingAppointmentDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.PatientCode))
            return BadRequest(new { message = "PatientCode is required." });

        var created = await _emrService.CreateChannelingAppointmentAsync(dto);
        return Ok(created);
    }

    /// <summary>
    /// Authenticate a staff member for the EMR Staff Portal with strict role verification
    /// </summary>
    [HttpPost("staff/login")]
    [AllowAnonymous]
    public async Task<ActionResult<StaffLoginResponseDto>> StaffLogin([FromBody] EmrStaffLoginDto dto)
    {
        try
        {
            var res = await _emrService.StaffLoginAsync(dto);
            return Ok(res);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message });
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // AGENTIC AI CLINICAL HEALTH ADVISOR
    // ═══════════════════════════════════════════════════════════════════════════

    /// <summary>
    /// Agentic AI: Evaluates patient lab reports, prescriptions, medications, and doctor consultation notes
    /// to explain what the doctor said, explain diagnostics, and summarize patient health condition.
    /// </summary>
    [HttpGet("ai/insight")]
    public async Task<ActionResult<AIClinicalInsightResponse>> GetAIClinicalInsight([FromQuery] string? patientCode)
    {
        if (string.IsNullOrWhiteSpace(patientCode) && User.Identity?.IsAuthenticated == true)
        {
            var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier)
                           ?? User.FindFirstValue("sub")
                           ?? User.FindFirstValue("nameid");
            if (int.TryParse(userIdClaim, out var parsedId))
            {
                var p = await _emrService.GetPatientByUserIdAsync(parsedId);
                if (p != null) patientCode = p.PatientCode;
                else patientCode = userIdClaim;
            }

            if (string.IsNullOrWhiteSpace(patientCode))
            {
                var emailClaim = User.FindFirstValue(ClaimTypes.Email) ?? User.FindFirstValue("email");
                if (!string.IsNullOrWhiteSpace(emailClaim))
                {
                    var allPatients = await _emrService.GetAllPatientsAsync(emailClaim.Trim());
                    var p = allPatients.FirstOrDefault(x => string.Equals(x.Email, emailClaim.Trim(), StringComparison.OrdinalIgnoreCase));
                    if (p != null) patientCode = p.PatientCode;
                    else patientCode = emailClaim;
                }
            }
        }

        if (string.IsNullOrWhiteSpace(patientCode))
        {
            var all = await _emrService.GetAllPatientsAsync();
            var first = all.FirstOrDefault();
            if (first != null) patientCode = first.PatientCode;
        }

        if (string.IsNullOrWhiteSpace(patientCode))
        {
            return BadRequest(new { message = "Patient code could not be resolved. Please specify patientCode." });
        }

        var insight = await _emrService.GetPatientClinicalAIInsightAsync(patientCode);
        if (insight == null)
        {
            return NotFound(new { message = $"Patient with identifier '{patientCode}' not found." });
        }

        return Ok(insight);
    }

    /// <summary>
    /// Agentic AI: Allows patients to ask questions about their health records, reports, or medications
    /// and receive intelligent, personalized clinical explanations.
    /// </summary>
    [HttpPost("ai/ask")]
    public async Task<ActionResult<AskAIAgentResponse>> AskAIClinicalAgent([FromBody] AskAIAgentRequest dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Question))
        {
            return BadRequest(new { message = "Question is required." });
        }

        var patientCode = dto.PatientCode;
        if (string.IsNullOrWhiteSpace(patientCode) && User.Identity?.IsAuthenticated == true)
        {
            var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier)
                           ?? User.FindFirstValue("sub")
                           ?? User.FindFirstValue("nameid");
            if (int.TryParse(userIdClaim, out var parsedId))
            {
                var p = await _emrService.GetPatientByUserIdAsync(parsedId);
                if (p != null) patientCode = p.PatientCode;
                else patientCode = userIdClaim;
            }

            if (string.IsNullOrWhiteSpace(patientCode))
            {
                var emailClaim = User.FindFirstValue(ClaimTypes.Email) ?? User.FindFirstValue("email");
                if (!string.IsNullOrWhiteSpace(emailClaim))
                {
                    var allPatients = await _emrService.GetAllPatientsAsync(emailClaim.Trim());
                    var p = allPatients.FirstOrDefault(x => string.Equals(x.Email, emailClaim.Trim(), StringComparison.OrdinalIgnoreCase));
                    if (p != null) patientCode = p.PatientCode;
                    else patientCode = emailClaim;
                }
            }
        }

        if (string.IsNullOrWhiteSpace(patientCode))
        {
            var all = await _emrService.GetAllPatientsAsync();
            var first = all.FirstOrDefault();
            if (first != null) patientCode = first.PatientCode;
        }

        if (string.IsNullOrWhiteSpace(patientCode))
        {
            return BadRequest(new { message = "Patient code could not be resolved." });
        }

        var answer = await _emrService.AskPatientClinicalAIAgentAsync(patientCode, dto.Question);
        return Ok(answer);
    }
}
