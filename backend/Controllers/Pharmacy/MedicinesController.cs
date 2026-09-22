using HealthBridge.Api.DTOs.Medicine;
using HealthBridge.Api.Models;
using HealthBridge.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HealthBridge.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[IgnoreAntiforgeryToken]
[AllowAnonymous]
public class MedicinesController : ControllerBase
{
    private readonly IMedicineService _medicineService;

    public MedicinesController(IMedicineService medicineService)
    {
        _medicineService = medicineService;
    }

    /// <summary>
    /// Gets all medicines.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<MedicineResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<MedicineResponse>>> GetAll()
    {
        var medicines = await _medicineService.GetAllMedicinesAsync();
        return Ok(medicines);
    }

    /// <summary>
    /// Gets a medicine by ID.
    /// </summary>
    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(MedicineResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<MedicineResponse>> GetById(int id)
    {
        var medicine = await _medicineService.GetMedicineByIdAsync(id);
        if (medicine == null)
        {
            return NotFound(new { message = $"Medicine with ID {id} was not found." });
        }
        return Ok(medicine);
    }

    /// <summary>
    /// Creates a new medicine.
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(MedicineResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<MedicineResponse>> Create([FromBody] CreateMedicineRequest request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        try
        {
            var medicine = await _medicineService.CreateMedicineAsync(request);
            return CreatedAtAction(nameof(GetById), new { id = medicine.Id }, medicine);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Updates an existing medicine.
    /// </summary>
    [HttpPut("{id:int}")]
    [ProducesResponseType(typeof(MedicineResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<MedicineResponse>> Update(int id, [FromBody] UpdateMedicineRequest request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        try
        {
            var updatedMedicine = await _medicineService.UpdateMedicineAsync(id, request);
            if (updatedMedicine == null)
            {
                return NotFound(new { message = $"Medicine with ID {id} was not found." });
            }

            return Ok(updatedMedicine);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Deletes a medicine.
    /// </summary>
    [HttpDelete("{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(int id)
    {
        var deleted = await _medicineService.DeleteMedicineAsync(id);
        if (!deleted)
        {
            return NotFound(new { message = $"Medicine with ID {id} was not found." });
        }

        return NoContent();
    }
}
