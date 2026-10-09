namespace HealthBridge.Api.Agents.Appointments;

/// <summary>
/// Formal contract implemented by all specialized agents in the Doctor Recommendation multi-agent pipeline.
/// Defines identity, clinical responsibility, input/output contracts, and allow-listed tools.
/// Complies with SE3090 Section 9.1: least privilege and role-specific contracts.
/// </summary>
public interface IWorkflowAgent
{
    string AgentName { get; }
    string Responsibility { get; }
    string InputContract { get; }
    string OutputContract { get; }
    IReadOnlyList<string> AllowedTools { get; }
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
    public string? ContractSummary { get; set; }
    public string Status { get; set; } = "PENDING"; // PENDING | RUNNING | COMPLETED | BLOCKED | SKIPPED | FAILED
    public long DurationMs { get; set; }
    public string? OutputSummary { get; set; }
}

