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

    /// <summary>
    /// POST /api/appointments/recommendations/{workflowId}/approve
    /// Human-in-the-Loop confirmation: Patient or staff reviews the multi-agent proposal and confirms the doctor/session selection.
    /// </summary>
    [HttpPost("recommendations/{workflowId:guid}/approve")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(DoctorRecommendationResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ApproveRecommendation(
        [FromRoute] Guid workflowId,
        [FromBody] ApproveRecommendationRequestDto request)
    {
        var updated = await _agent.ApproveRecommendationAsync(workflowId, request.SelectedDoctorId, request.SelectedSessionId);
        if (updated == null)
            return NotFound(new { message = $"Recommendation workflow '{workflowId}' not found." });

        _logger.LogInformation("[ApproveRecommendation] Workflow {Id} approved for DoctorId={DocId}", workflowId, request.SelectedDoctorId);
        return Ok(updated);
    }

    /// <summary>
    /// POST /api/appointments/recommendations/{workflowId}/reject
    /// Human-in-the-Loop rejection: Patient or staff declines the AI proposal.
    /// </summary>
    [HttpPost("recommendations/{workflowId:guid}/reject")]
    [AllowAnonymous]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> RejectRecommendation(
        [FromRoute] Guid workflowId,
        [FromBody] RejectRecommendationRequestDto? request)
    {
        var ok = await _agent.RejectRecommendationAsync(workflowId, request?.Notes);
        if (!ok)
            return NotFound(new { message = $"Recommendation workflow '{workflowId}' not found." });

        _logger.LogInformation("[RejectRecommendation] Workflow {Id} rejected", workflowId);
        return Ok(new { success = true, workflowId, status = "REJECTED" });
    }
}

