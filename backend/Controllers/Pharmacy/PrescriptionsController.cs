using HealthBridge.Api.DTOs.Pharmacy;
using HealthBridge.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace HealthBridge.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[IgnoreAntiforgeryToken]
public class PrescriptionsController : ControllerBase
{
    private readonly IPrescriptionService _prescriptionService;

    public PrescriptionsController(IPrescriptionService prescriptionService)
    {
        _prescriptionService = prescriptionService;
    }

    /// <summary>
    /// Gets all submitted prescriptions.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<PrescriptionResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<PrescriptionResponse>>> GetAll()
    {
        var prescriptions = await _prescriptionService.GetAllPrescriptionsAsync();
        return Ok(prescriptions);
    }

    /// <summary>
    /// Gets a prescription by ID.
    /// </summary>
    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(PrescriptionResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PrescriptionResponse>> GetById(int id)
    {
        var item = await _prescriptionService.GetPrescriptionByIdAsync(id);
        if (item == null)
        {
            return NotFound(new { message = $"Prescription with ID {id} was not found." });
        }
        return Ok(item);
    }

    /// <summary>
    /// Submits a new prescription.
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(PrescriptionResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<PrescriptionResponse>> Create([FromBody] CreatePrescriptionRequest request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var created = await _prescriptionService.CreatePrescriptionAsync(request);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    /// <summary>
    /// Updates prescription status (Approved, Rejected, Fulfilled, etc.).
    /// </summary>
    [HttpPut("{id:int}/status")]
    [ProducesResponseType(typeof(PrescriptionResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PrescriptionResponse>> UpdateStatus(int id, [FromBody] UpdatePrescriptionStatusRequest request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var updated = await _prescriptionService.UpdatePrescriptionStatusAsync(id, request);
        if (updated == null)
        {
            return NotFound(new { message = $"Prescription with ID {id} was not found." });
        }

        return Ok(updated);
    }

    /// <summary>
    /// Deletes a prescription.
    /// </summary>
    [HttpDelete("{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(int id)
    {
        var deleted = await _prescriptionService.DeletePrescriptionAsync(id);
        if (!deleted)
        {
            return NotFound(new { message = $"Prescription with ID {id} was not found." });
        }

        return NoContent();
    }
}
