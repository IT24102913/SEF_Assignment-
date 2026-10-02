using HealthBridge.Api.Agents.EMR;
using HealthBridge.Api.Authentication;
using HealthBridge.Api.Data;
using HealthBridge.Api.DTOs.Auth;
using HealthBridge.Api.DTOs.EMR;
using HealthBridge.Api.Models;
using HealthBridge.Api.Services.EMR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace HealthBridge.Api.Controllers.EMR;

[ApiController]
[Route("api/emr")]
[Produces("application/json")]
public class EMRController : ControllerBase
{
    private readonly IEMRService _emrService;
    private readonly ILogger<EMRController> _logger;
    private readonly EMRClinicalInsightAgent _aiAgent;
    private readonly ApplicationDbContext _context;
    private readonly IJwtTokenGenerator _jwtTokenGenerator;

    public EMRController(
        IEMRService emrService, 
        ILogger<EMRController> logger, 
        EMRClinicalInsightAgent aiAgent,
        ApplicationDbContext context,
        IJwtTokenGenerator jwtTokenGenerator)
    {
        _emrService = emrService;
        _logger = logger;
        _aiAgent = aiAgent;
        _context = context;
        _jwtTokenGenerator = jwtTokenGenerator;
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
    /// Get the current logged-in patient's own EMR record (from JWT token)
    /// </summary>
    [HttpGet("patients/me")]
    [Authorize]
    public async Task<ActionResult<PatientDto>> GetMyPatient()
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier)
                       ?? User.FindFirstValue("sub")
                       ?? User.FindFirstValue("nameid");

        if (!int.TryParse(userIdClaim, out var userId))
            return Unauthorized(new { message = "Invalid token: cannot identify user." });

        var patient = await _emrService.GetPatientByUserIdAsync(userId);
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

    // ═══════════════════════════════════════════════════════════════════════════
    // PRESCRIPTION AUTHORIZATION WORKFLOW (Staff → Admin Edit/Delete Requests)
    // ═══════════════════════════════════════════════════════════════════════════

    /// <summary>
    /// Staff member requests edit/delete permission from Admin for a specific prescription.
    /// Pharmacist, Doctor, or Laboratorian submits this before performing sensitive operations.
    /// </summary>
    [HttpPost("prescriptions/{id:guid}/request-authorization")]
    public async Task<ActionResult<PrescriptionDto>> RequestPrescriptionAuthorization(Guid id, [FromBody] RequestPrescriptionAuthorizationDto dto)
    {
        if (dto == null || string.IsNullOrWhiteSpace(dto.Action))
            return BadRequest(new { message = "Action (Edit or Delete) and Reason are required." });

        var updated = await _emrService.RequestPrescriptionAuthorizationAsync(id, dto);
        if (updated == null)
            return NotFound(new { message = $"Prescription {id} not found." });

        return Ok(updated);
    }

    /// <summary>
    /// Admin retrieves all prescriptions with pending edit/delete authorization requests.
    /// Used by the Admin Notification Panel to list incoming staff permission requests.
    /// </summary>
    [HttpGet("prescriptions/authorizations/pending")]
    public async Task<ActionResult<IEnumerable<PrescriptionAuthorizationSummaryDto>>> GetPendingPrescriptionAuthorizations()
    {
        var pending = await _emrService.GetPendingPrescriptionAuthorizationsAsync();
        return Ok(pending);
    }

    /// <summary>
    /// Admin approves a pending delete request and permanently removes the prescription.
    /// </summary>
    [HttpPost("prescriptions/{id:guid}/approve-delete")]
    public async Task<IActionResult> ApproveAndDeletePrescription(Guid id, [FromBody] ApprovePrescriptionDeleteDto dto)
    {
        var deleted = await _emrService.ApproveAndDeletePrescriptionAsync(id, dto?.AdminNote ?? string.Empty);
        if (!deleted)
            return NotFound(new { message = $"Prescription {id} not found." });

        return Ok(new { message = "Prescription approved and deleted successfully.", prescriptionId = id });
    }

    /// <summary>
    /// Admin rejects a pending edit/delete permission request. The prescription remains unchanged.
    /// </summary>
    [HttpPost("prescriptions/{id:guid}/reject-authorization")]
    public async Task<ActionResult<PrescriptionDto>> RejectPrescriptionAuthorization(Guid id, [FromBody] RejectPrescriptionAuthorizationDto dto)
    {
        var updated = await _emrService.RejectPrescriptionAuthorizationAsync(id, dto?.AdminNote ?? string.Empty);
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

    // ═══════════════════════════════════════════════════════════════════════════
    // AGENTIC AI - CLINICAL INSIGHTS
    // ═══════════════════════════════════════════════════════════════════════════

    /// <summary>
    /// Get AI-powered clinical insights and analysis for a patient.
    /// Analyzes lab reports, prescriptions, and consultation notes using Gemini AI.
    /// </summary>
    [HttpGet("ai/insight")]
    [AllowAnonymous]
    public async Task<ActionResult<AIClinicalInsightResponse>> GetAIClinicalInsight([FromQuery] string? patientCode)
    {
        try
        {
            // Resolve patient code from query param or authenticated user
            string code = patientCode ?? string.Empty;
            if (string.IsNullOrWhiteSpace(code))
            {
                var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
                if (!string.IsNullOrWhiteSpace(userIdClaim) && int.TryParse(userIdClaim, out var userId))
                {
                    var myPatient = await _emrService.GetPatientByUserIdAsync(userId);
                    code = myPatient?.PatientCode ?? string.Empty;
                }
            }

            if (string.IsNullOrWhiteSpace(code))
                return BadRequest(new { message = "Patient code is required. Please log in or provide patientCode query parameter." });

            // Fetch full patient with related data
            var patient = await _emrService.GetPatientWithRecordsAsync(code);
            if (patient == null)
                return NotFound(new { message = $"Patient '{code}' not found." });

            var insight = await _aiAgent.AnalyzePatientRecordsAsync(patient);
            return Ok(insight);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[EMR AI] Failed to generate clinical insight");
            return StatusCode(500, new { message = "AI analysis failed. Please try again later.", detail = ex.Message });
        }
    }

    /// <summary>
    /// Ask the AI agent a health question about a specific patient.
    /// The AI has access to the patient's full medical record.
    /// </summary>
    [HttpPost("ai/ask")]
    [AllowAnonymous]
    public async Task<ActionResult<AskAIAgentResponse>> AskAIAgent([FromBody] AskAIAgentRequest request)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(request.Question))
                return BadRequest(new { message = "Question is required." });

            string code = request.PatientCode ?? string.Empty;
            if (string.IsNullOrWhiteSpace(code))
            {
                var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
                if (!string.IsNullOrWhiteSpace(userIdClaim) && int.TryParse(userIdClaim, out var userId))
                {
                    var myPatient = await _emrService.GetPatientByUserIdAsync(userId);
                    code = myPatient?.PatientCode ?? string.Empty;
                }
            }

            if (string.IsNullOrWhiteSpace(code))
                return BadRequest(new { message = "Patient code is required." });

            var patient = await _emrService.GetPatientWithRecordsAsync(code);
            if (patient == null)
                return NotFound(new { message = $"Patient '{code}' not found." });

            var response = await _aiAgent.AnswerQuestionAsync(patient, request.Question);
            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[EMR AI] Failed to answer question");
            return StatusCode(500, new { message = "AI query failed. Please try again later.", detail = ex.Message });
        }
    }

    /// <summary>
    /// Staff authentication with role verification for EMR portals (Consultant, Laboratorian, Pharmacist, Admin)
    /// </summary>
    [HttpPost("staff/login")]
    [AllowAnonymous]
    public async Task<ActionResult<StaffLoginResponseDto>> StaffLogin([FromBody] EmrStaffLoginDto dto)
    {
        if (dto == null || string.IsNullOrWhiteSpace(dto.StaffIdOrEmail) || string.IsNullOrWhiteSpace(dto.Password))
        {
            return BadRequest(new { message = "Staff ID or Email and password are required." });
        }

        var identifier = dto.StaffIdOrEmail.Trim();
        var normalizedEmail = identifier.ToLowerInvariant();

        // 1. Try finding user directly by email
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == normalizedEmail);

        // 2. If not found by email, handle staff aliases (e.g. DOC-01, LAB-01, PHARM-01, ADMIN-01)
        if (user == null)
        {
            var upper = identifier.ToUpperInvariant();
            if (upper == "DOC-01" || upper == "DOC-1" || upper == "DOCTOR")
            {
                user = await _context.Users.FirstOrDefaultAsync(u => u.Email == "doctor@gmail.com" || u.Role == UserRole.Doctor);
            }
            else if (upper == "LAB-01" || upper == "LAB-1" || upper == "LAB")
            {
                user = await _context.Users.FirstOrDefaultAsync(u => u.Email == "lab@gmail.com" || u.Role == UserRole.Laboratory);
            }
            else if (upper == "PHARM-01" || upper == "PHARM-1" || upper == "PHARMACIST")
            {
                user = await _context.Users.FirstOrDefaultAsync(u => u.Email == "pharmacist@gmail.com" || u.Email == "pharmacist@medix.com" || u.Role == UserRole.Pharmacist);
            }
            else if (upper == "ADMIN-01" || upper == "ADMIN-1" || upper == "ADMIN")
            {
                user = await _context.Users.FirstOrDefaultAsync(u => u.Email == "admin@healthbridge.com" || u.Email == "nirwan@gmail.com" || u.Role == UserRole.Admin);
            }
        }

        if (user == null || !BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
        {
            return Unauthorized(new { message = "Invalid Staff ID/Email or password." });
        }

        if (!user.IsActive)
        {
            return Unauthorized(new { message = "Your staff account has been deactivated. Please contact hospital administration." });
        }

        // 3. Role verification against requested portal
        var target = (dto.TargetRole ?? string.Empty).Trim().ToLowerInvariant();
        bool isAuthorized = false;

        // Admin has universal staff clearance
        if (user.Role == UserRole.Admin)
        {
            isAuthorized = true;
        }
        else if (target == "consultant" || target == "doctor")
        {
            isAuthorized = (user.Role == UserRole.Doctor);
        }
        else if (target == "laboratorian" || target == "lab" || target == "laboratory")
        {
            isAuthorized = (user.Role == UserRole.Laboratory);
        }
        else if (target == "pharmacist" || target == "pharmacy")
        {
            isAuthorized = (user.Role == UserRole.Pharmacist);
        }
        else if (target == "admin")
        {
            isAuthorized = (user.Role == UserRole.Admin);
        }

        if (!isAuthorized)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new
            {
                message = $"Access Denied: Your account role is '{user.Role}', but '{dto.TargetRole}' portal requires {dto.TargetRole} or Admin authorization."
            });
        }

        var token = _jwtTokenGenerator.GenerateToken(user);

        // Derive clean display staffId
        string staffId = identifier;
        if (identifier.Contains("@"))
        {
            if (user.Role == UserRole.Doctor) staffId = "DOC-01";
            else if (user.Role == UserRole.Laboratory) staffId = "LAB-01";
            else if (user.Role == UserRole.Pharmacist) staffId = "PHARM-01";
            else if (user.Role == UserRole.Admin) staffId = "ADMIN-01";
            else staffId = user.FullName;
        }

        return Ok(new StaffLoginResponseDto
        {
            Token = token,
            Role = user.Role,
            StaffId = staffId,
            User = new UserResponse
            {
                Id = user.Id,
                FullName = user.FullName,
                Email = user.Email,
                Role = user.Role
            }
        });
    }
}
