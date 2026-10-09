using HealthBridge.Api.DTOs.Appointments;
using Microsoft.Extensions.Logging;
using System.Text.RegularExpressions;

namespace HealthBridge.Api.Agents.Appointments;

/// <summary>
/// Specialized agent for allocating channeling doctors and available session slots.
/// Complies with SE3090 Section 9.1: "Delegation to distinct agent roles. Validates inputs before tool invocation."
/// </summary>
public interface IDoctorSlotAllocationAgent : IWorkflowAgent
{
    Task<ToolResult<List<MatchedDoctorDto>>> AllocateSlotsAsync(string specialty, string? preferredBranch = null, int maxResults = 3);
}

public class DoctorSlotAllocationAgent : IDoctorSlotAllocationAgent
{
    public string AgentName => "DoctorSlotAllocationAgent";
    public string Responsibility => "Queries verified consultants and open clinic slots via allow-listed tool with sanitized inputs.";
    public string InputContract => "(string specialty, string? preferredBranch, int maxResults)";
    public string OutputContract => "Task<ToolResult<List<MatchedDoctorDto>>> (Success, IsAllowed, Status, Error, Data)";
    public IReadOnlyList<string> AllowedTools => new[] { "DoctorSlotAllocationTool.QueryAvailableDoctorsAndSlots" };

    private readonly IDoctorSlotAllocationTool _tool;
    private readonly IAgentToolRegistry _toolRegistry;
    private readonly ILogger<DoctorSlotAllocationAgent> _logger;

    public DoctorSlotAllocationAgent(
        IDoctorSlotAllocationTool tool,
        IAgentToolRegistry toolRegistry,
        ILogger<DoctorSlotAllocationAgent> logger)
    {
        _tool = tool;
        _toolRegistry = toolRegistry;
        _logger = logger;
    }

    public async Task<ToolResult<List<MatchedDoctorDto>>> AllocateSlotsAsync(string specialty, string? preferredBranch = null, int maxResults = 3)
    {
        // 1. Tool input validation: specialty against canonical clinical allow-list
        if (!CanonicalSpecialties.IsValid(specialty))
        {
            _logger.LogWarning("[{Agent}] Invalid specialty rejected by input validation: '{Specialty}'", AgentName, specialty);
            return new ToolResult<List<MatchedDoctorDto>>
            {
                Success = false,
                Status = "VALIDATION_FAILED",
                Error = $"Specialty '{specialty}' is not recognized in canonical clinical roster."
            };
        }

        var normalizedSpecialty = CanonicalSpecialties.Normalize(specialty)!;

        // 2. Clamp maxResults to [1..5]
        var clampedMaxResults = Math.Clamp(maxResults, 1, 5);

        // 3. Sanitize branch: trimmed, max 80 chars, safe characters only
        string? sanitizedBranch = null;
        if (!string.IsNullOrWhiteSpace(preferredBranch))
        {
            var trimmedBranch = preferredBranch.Trim();
            if (trimmedBranch.Length > 80) trimmedBranch = trimmedBranch[..80];
            sanitizedBranch = Regex.Replace(trimmedBranch, @"[^a-zA-Z0-9\s\-]", "");
        }

        // 4. Delegate to allow-listed tool through central security registry
        return await _toolRegistry.ExecuteToolAsync(
            "DoctorSlotAllocationTool",
            AgentName,
            () => _tool.QueryAvailableDoctorsAndSlotsAsync(normalizedSpecialty, sanitizedBranch, clampedMaxResults));
    }
}
