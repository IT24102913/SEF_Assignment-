namespace HealthBridge.Api.Agents.Appointments;

/// <summary>
/// Common contract implemented by all specialized agents in the Doctor Recommendation multi-agent subsystem.
/// Identifies agent name, role, and responsibility.
/// </summary>
public interface IWorkflowAgent
{
    string AgentName { get; }
    string Role { get; }
}

/// <summary>
/// Structured execution plan created by the Coordinator Agent before delegation.
/// Complies with SE3090 Section 9.1: "Domain objective -> structured multi-step plan -> delegation to distinct agent roles".
/// </summary>
public class WorkflowPlan
{
    public Guid PlanId { get; set; } = Guid.NewGuid();
    public string Objective { get; set; } = string.Empty;
    public List<PlanStep> Steps { get; set; } = new();
}

public class PlanStep
{
    public int StepNumber { get; set; }
    public string StepName { get; set; } = string.Empty;
    public string AssignedAgent { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Status { get; set; } = "PENDING"; // PENDING | RUNNING | COMPLETED | BLOCKED | SKIPPED | FAILED
    public long DurationMs { get; set; }
    public string? OutputSummary { get; set; }
}
