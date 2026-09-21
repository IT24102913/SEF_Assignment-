using HealthBridge.Api.Data;
using HealthBridge.Api.DTOs.Lab;
using HealthBridge.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HealthBridge.Api.Controllers;

[ApiController]
[Route("api/lab/tests")]
public class LabTestsController : ControllerBase
{
    private readonly ApplicationDbContext _db;

    public LabTestsController(ApplicationDbContext db)
    {
        _db = db;
    }

    // GET /api/lab/tests — Get all active/inactive tests
    [HttpGet]
    public async Task<ActionResult<IEnumerable<LabTestResponse>>> GetAll([FromQuery] string? search, [FromQuery] string? category, [FromQuery] bool includeInactive = false)
    {
        var query = _db.LabTests.AsQueryable();

        if (!includeInactive)
            query = query.Where(t => t.IsActive);

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(t => t.Name.ToLower().Contains(search.ToLower()) ||
                                     t.Description.ToLower().Contains(search.ToLower()));

        if (!string.IsNullOrWhiteSpace(category))
            query = query.Where(t => t.Category == category);

        var tests = await query.OrderBy(t => t.Category).ThenBy(t => t.Name).ToListAsync();

        return Ok(tests.Select(MapToDto));
    }

    // GET /api/lab/tests/{id} — Get single test
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<LabTestResponse>> GetById(Guid id)
    {
        var test = await _db.LabTests.FindAsync(id);
        if (test == null || !test.IsActive) return NotFound();
        return Ok(MapToDto(test));
    }

    // GET /api/lab/tests/categories — Get all categories
    [HttpGet("categories")]
    public async Task<ActionResult<IEnumerable<string>>> GetCategories()
    {
        var categories = await _db.LabTests
            .Where(t => t.IsActive)
            .Select(t => t.Category)
            .Distinct()
            .OrderBy(c => c)
            .ToListAsync();
        return Ok(categories);
    }

    // POST /api/lab/tests — Create a new test (Lab Admin only)
    [HttpPost]
    public async Task<ActionResult<LabTestResponse>> Create([FromBody] CreateLabTestRequest dto)
    {
        var test = new LabTest
        {
            Name = dto.Name,
            Description = dto.Description,
            Price = dto.Price,
            IsRestricted = dto.IsRestricted,
            TurnaroundDays = dto.TurnaroundDays,
            Category = dto.Category
        };

        _db.LabTests.Add(test);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = test.Id }, MapToDto(test));
    }

    // PUT /api/lab/tests/{id} — Update test
    [HttpPut("{id:guid}")]
    public async Task<ActionResult<LabTestResponse>> Update(Guid id, [FromBody] UpdateLabTestRequest dto)
    {
        var test = await _db.LabTests.FindAsync(id);
        if (test == null) return NotFound();

        if (dto.Name != null) test.Name = dto.Name;
        if (dto.Description != null) test.Description = dto.Description;
        if (dto.Price.HasValue) test.Price = dto.Price.Value;
        if (dto.IsRestricted.HasValue) test.IsRestricted = dto.IsRestricted.Value;
        if (dto.TurnaroundDays.HasValue) test.TurnaroundDays = dto.TurnaroundDays.Value;
        if (dto.Category != null) test.Category = dto.Category;
        if (dto.IsActive.HasValue) test.IsActive = dto.IsActive.Value;

        await _db.SaveChangesAsync();
        return Ok(MapToDto(test));
    }

    // DELETE /api/lab/tests/{id} — Soft delete (deactivate)
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var test = await _db.LabTests.FindAsync(id);
        if (test == null) return NotFound();
        test.IsActive = false;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    private static LabTestResponse MapToDto(LabTest t) => new()
    {
        Id = t.Id,
        Name = t.Name,
        Description = t.Description,
        Price = t.Price,
        IsRestricted = t.IsRestricted,
        TurnaroundDays = t.TurnaroundDays,
        Category = t.Category,
        IsActive = t.IsActive
    };
}
