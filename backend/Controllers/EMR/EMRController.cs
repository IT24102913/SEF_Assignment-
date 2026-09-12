using LabManagement.API.DTOs.EMR;
using LabManagement.API.Services.EMR;
using Microsoft.AspNetCore.Mvc;

namespace LabManagement.API.Controllers.EMR;

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
    /// Get consultation notes, optionally filtered by patient code
    /// </summary>
    [HttpGet("consultations")]
    public async Task<ActionResult<IEnumerable<ConsultationNoteDto>>> GetConsultations([FromQuery] string? patientCode)
    {
        var notes = await _emrService.GetConsultationsAsync(patientCode);
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
    /// Get lab reports, optionally filtered by patient code
    /// </summary>
    [HttpGet("lab-reports")]
    public async Task<ActionResult<IEnumerable<LabReportDto>>> GetLabReports([FromQuery] string? patientCode)
    {
        var reports = await _emrService.GetLabReportsAsync(patientCode);
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
    /// Get prescriptions, optionally filtered by patient code
    /// </summary>
    [HttpGet("prescriptions")]
    public async Task<ActionResult<IEnumerable<PrescriptionDto>>> GetPrescriptions([FromQuery] string? patientCode)
    {
        var prescriptions = await _emrService.GetPrescriptionsAsync(patientCode);
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
}

