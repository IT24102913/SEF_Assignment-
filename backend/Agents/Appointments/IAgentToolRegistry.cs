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
    void RegisterTool(string toolName, string allowedAgentName);
    bool IsToolAllowed(string toolName, string callingAgentName);
    Task<ToolResult<T>> ExecuteToolAsync<T>(string toolName, string callingAgentName, Func<Task<T>> toolCall);
}

public class AgentToolRegistry : IAgentToolRegistry
{
    private readonly Dictionary<string, HashSet<string>> _toolPermissions = new(StringComparer.OrdinalIgnoreCase);
    private readonly ILogger<AgentToolRegistry> _logger;

    public AgentToolRegistry(ILogger<AgentToolRegistry> logger)
    {
        _logger = logger;

        // Default allow-list: DoctorSlotAllocationAgent is the ONLY agent permitted to invoke DoctorSlotAllocationTool
        RegisterTool("DoctorSlotAllocationTool", "DoctorSlotAllocationAgent");
    }

    public void RegisterTool(string toolName, string allowedAgentName)
    {
        if (!_toolPermissions.TryGetValue(toolName, out var allowedSet))
        {
            allowedSet = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            _toolPermissions[toolName] = allowedSet;
        }
        allowedSet.Add(allowedAgentName);
    }

    public bool IsToolAllowed(string toolName, string callingAgentName)
    {
        if (_toolPermissions.TryGetValue(toolName, out var allowedAgents))
        {
            return allowedAgents.Contains(callingAgentName);
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
