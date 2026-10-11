using HealthBridge.Api.Agents.Pharmacy;
using HealthBridge.Api.DTOs.Pharmacy;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HealthBridge.Api.Controllers.Pharmacy;

[ApiController]
[Route("api/pharmacy/symptom")]
[Produces("application/json")]
public class SymptomAdviceController : ControllerBase
{
    private readonly SymptomAdviceAgent _agent;
    private readonly ILogger<SymptomAdviceController> _logger;

    public SymptomAdviceController(SymptomAdviceAgent agent, ILogger<SymptomAdviceController> logger)
    {
        _agent = agent;
        _logger = logger;
    }

    // POST /api/pharmacy/symptom/advice
    [HttpPost("advice")]
    [AllowAnonymous]
    public async Task<ActionResult<SymptomAdviceResponse>> GetAdvice([FromBody] SymptomAdviceRequest request)
    {
        if (string.IsNullOrWhiteSpace(request?.Symptom))
            return BadRequest(new { message = "Please describe your symptom." });

        try
        {
            var result = await _agent.GetAdviceAsync(request.Symptom, request.PatientEmail, request.ClarifyingAnswers);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[SymptomAdviceController] Error");
            return StatusCode(500, new { message = "Unable to process. Please try again." });
        }
    }

    // GET /api/pharmacy/symptom/history?patientEmail=xxx&limit=20
    [HttpGet("history")]
    [AllowAnonymous]
    public async Task<ActionResult<List<SymptomHistoryItemDto>>> GetHistory(
        [FromQuery] string? patientEmail = null,
        [FromQuery] int limit = 20)
    {
        var history = await _agent.GetHistoryAsync(patientEmail, limit);
        return Ok(history);
    }

    // GET /api/pharmacy/symptom/history/{id}
    [HttpGet("history/{id:int}")]
    [AllowAnonymous]
    public async Task<ActionResult<SymptomAdviceResponse>> GetHistoryDetail(int id)
    {
        var detail = await _agent.GetHistoryDetailAsync(id);
        if (detail == null) return NotFound(new { message = "History not found" });
        return Ok(detail);
    }

    // DELETE /api/pharmacy/symptom/history/{id}
    [HttpDelete("history/{id:int}")]
    [AllowAnonymous]
    public async Task<ActionResult> DeleteHistory(int id)
    {
        var deleted = await _agent.DeleteHistoryAsync(id);
        if (!deleted) return NotFound(new { message = "History not found" });
        return NoContent();
    }
}
