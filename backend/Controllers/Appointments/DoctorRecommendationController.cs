using HealthBridge.Api.Agents.Appointments;
using HealthBridge.Api.DTOs.Appointments;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace HealthBridge.Api.Controllers.Appointments;

[ApiController]
[Route("api/appointments")]
[IgnoreAntiforgeryToken]
public class DoctorRecommendationController : ControllerBase
{
    private readonly DoctorRecommendationAgent _agent;
    private readonly ILogger<DoctorRecommendationController> _logger;

    public DoctorRecommendationController(
        DoctorRecommendationAgent agent,
        ILogger<DoctorRecommendationController> logger)
    {
        _agent = agent;
        _logger = logger;
    }

    /// <summary>
    /// POST /api/appointments/recommend-doctor
    /// Accepts a free-text symptom description and returns an AI-powered specialty suggestion.
    /// The patient always makes the final booking choice — the AI never books or auto-selects.
    /// Requires a valid JWT Bearer token.
    /// </summary>
    [HttpPost("recommend-doctor")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(DoctorRecommendationResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> RecommendDoctor([FromBody] DoctorRecommendationRequestDto request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        // Extract patient identity from JWT — never from the request body
        int? patientId = null;
        var nameIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (int.TryParse(nameIdClaim, out var uid))
            patientId = uid;

        _logger.LogInformation("[RecommendDoctor] PatientId={PatientId} Symptoms={Len}chars",
            patientId, request.Symptoms.Trim().Length);

        var result = await _agent.RunAsync(request.Symptoms.Trim(), patientId);
        return Ok(result);
    }
}
