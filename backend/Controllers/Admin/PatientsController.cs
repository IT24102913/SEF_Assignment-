using HealthBridge.Api.DTOs.Patient;
using HealthBridge.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace HealthBridge.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[IgnoreAntiforgeryToken]
public class PatientsController : ControllerBase
{
    private readonly IPatientService _patientService;

    public PatientsController(IPatientService patientService)
    {
        _patientService = patientService;
    }

    /// <summary>
    /// Gets all registered patients/customers.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<PatientResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<PatientResponse>>> GetAll()
    {
        var patients = await _patientService.GetAllPatientsAsync();
        return Ok(patients);
    }

    /// <summary>
    /// Gets a patient by ID.
    /// </summary>
    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(PatientResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PatientResponse>> GetById(int id)
    {
        var patient = await _patientService.GetPatientByIdAsync(id);
        if (patient == null)
        {
            return NotFound(new { message = $"Patient with ID {id} was not found." });
        }
        return Ok(patient);
    }

    /// <summary>
    /// Updates patient profile details.
    /// </summary>
    [HttpPut("{id:int}")]
    [ProducesResponseType(typeof(PatientResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PatientResponse>> UpdateProfile(int id, [FromBody] UpdatePatientProfileRequest request)
    {
        var updated = await _patientService.UpdatePatientProfileAsync(id, request);
        if (updated == null)
        {
            return NotFound(new { message = $"Patient with ID {id} was not found." });
        }
        return Ok(updated);
    }

    /// <summary>
    /// Toggles active status of a patient account.
    /// </summary>
    [HttpPatch("{id:int}/toggle-status")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ToggleStatus(int id)
    {
        var success = await _patientService.TogglePatientStatusAsync(id);
        if (!success)
        {
            return NotFound(new { message = $"Patient with ID {id} was not found." });
        }
        return Ok(new { message = "Patient account status updated successfully." });
    }
}
