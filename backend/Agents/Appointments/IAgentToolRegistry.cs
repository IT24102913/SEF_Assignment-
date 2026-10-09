using Microsoft.Extensions.Logging;

namespace HealthBridge.Api.Agents.Appointments;

/// <summary>
/// Structured result returned from allow-listed tool execution.
/// </summary>
public class ToolResult<T>
{
    public bool Success { get; set; }
    public bool IsAllowed { get; set; } = true;
    public string Status { get; set; } = "SUCCESS"; // SUCCESS | TOOL_DENIED | VALIDATION_FAILED | EXECUTION_ERROR
    public T? Data { get; set; }
    public string? Error { get; set; }
}

/// <summary>
/// Central security registry enforcing allow-listed tool invocation across specialized agents.
/// Complies with SE3090 Section 9.1: "Agents may use only allow-listed tools. Denied calls must be logged as TOOL_DENIED".
/// </summary>
public interface IAgentToolRegistry
{
    void RegisterAgent(string agentName, IEnumerable<string> allowedTools);
    bool IsAgentRegistered(string agentName);
    IReadOnlyList<string> GetAllowedTools(string agentName);
    bool IsToolAllowed(string toolName, string callingAgentName);
    Task<ToolResult<T>> ExecuteToolAsync<T>(string toolName, string callingAgentName, Func<Task<T>> toolCall);
}

public class AgentToolRegistry : IAgentToolRegistry
{
    private readonly Dictionary<string, HashSet<string>> _agentAllowedTools = new(StringComparer.OrdinalIgnoreCase);
    private readonly ILogger<AgentToolRegistry> _logger;

    public AgentToolRegistry(ILogger<AgentToolRegistry> logger)
    {
        _logger = logger;

        // Explicit least-privilege tool allow-list registrations:
        // Safety: ZERO tools permitted (pure clinical safety logic)
        RegisterAgent("ClinicalSafetyAgent", Array.Empty<string>());

        // Triage: ZERO tools permitted (pure NLP & specialty routing)
        RegisterAgent("ClinicalTriageAgent", Array.Empty<string>());

        // Slot allocation: ONLY DoctorSlotAllocationTool queries permitted
        RegisterAgent("DoctorSlotAllocationAgent", new[]
        {
            "DoctorSlotAllocationTool",
            "DoctorSlotAllocationTool.QueryAvailableDoctorsAndSlots"
        });

        // Validation: ZERO tools permitted (pure deterministic gatekeeping)
        RegisterAgent("RecommendationValidationAgent", Array.Empty<string>());

        // Coordinator: ZERO tools directly permitted (delegates via specialized agents)
        RegisterAgent("DoctorRecommendationAgent", Array.Empty<string>());
    }

    public void RegisterAgent(string agentName, IEnumerable<string> allowedTools)
    {
        _agentAllowedTools[agentName] = new HashSet<string>(allowedTools, StringComparer.OrdinalIgnoreCase);
    }

    public bool IsAgentRegistered(string agentName) => _agentAllowedTools.ContainsKey(agentName);

    public IReadOnlyList<string> GetAllowedTools(string agentName)
    {
        return _agentAllowedTools.TryGetValue(agentName, out var tools)
            ? tools.ToList()
            : Array.Empty<string>();
    }

    public bool IsToolAllowed(string toolName, string callingAgentName)
    {
        if (_agentAllowedTools.TryGetValue(callingAgentName, out var allowedTools))
        {
            return allowedTools.Contains(toolName);
        }
        return false;
    }

    public async Task<ToolResult<T>> ExecuteToolAsync<T>(string toolName, string callingAgentName, Func<Task<T>> toolCall)
    {
        if (!IsToolAllowed(toolName, callingAgentName))
        {
            _logger.LogWarning("[ToolRegistry] TOOL_DENIED: Agent '{Agent}' attempted unauthorized invocation of tool '{Tool}'",
                callingAgentName, toolName);

            return new ToolResult<T>
            {
                Success = false,
                IsAllowed = false,
                Status = "TOOL_DENIED",
                Error = $"Security violation: Agent '{callingAgentName}' is not authorized to invoke allow-listed tool '{toolName}'."
            };
        }

        try
        {
            var data = await toolCall();
            return new ToolResult<T>
            {
                Success = true,
                IsAllowed = true,
                Status = "SUCCESS",
                Data = data
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[ToolRegistry] Error executing tool '{Tool}' by agent '{Agent}'", toolName, callingAgentName);
            return new ToolResult<T>
            {
                Success = false,
                IsAllowed = true,
                Status = "EXECUTION_ERROR",
                Error = ex.Message
            };
        }
    }
}
