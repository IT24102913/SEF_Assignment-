using HealthBridge.Api.Data;
using HealthBridge.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HealthBridge.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[IgnoreAntiforgeryToken]
public class FeedbacksController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public FeedbacksController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetFeedbacks()
    {
        var list = await _context.PatientFeedbacks.OrderByDescending(f => f.CreatedAt).ToListAsync();
        return Ok(list);
    }

    [HttpPost]
    public async Task<IActionResult> CreateFeedback([FromBody] PatientFeedback feedback)
    {
        feedback.CreatedAt = DateTime.UtcNow;
        _context.PatientFeedbacks.Add(feedback);
        await _context.SaveChangesAsync();
        return Ok(feedback);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteFeedback(int id)
    {
        var fb = await _context.PatientFeedbacks.FindAsync(id);
        if (fb == null) return NotFound(new { message = "Feedback not found" });

        _context.PatientFeedbacks.Remove(fb);
        await _context.SaveChangesAsync();
        return Ok(new { message = "Feedback deleted" });
    }
}
