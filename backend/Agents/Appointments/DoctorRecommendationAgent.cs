using System.Diagnostics;
using System.Text.Json;
using HealthBridge.Api.Data;
using HealthBridge.Api.DTOs.Appointments;
using HealthBridge.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace HealthBridge.Api.Agents.Appointments;

/// <summary>
/// DoctorRecommendationAgent — Multi-Agent Coordinator & Execution Planner.
/// 
/// Complies with SE3090 Section 9.1 & 10 (Individual Agentic AI Contribution):
///   1. Multi-Agent Architecture (Distinct roles):
///      - Coordinator: DoctorRecommendationAgent (Orchestration, WorkflowPlan, HITL state machine)
///      - Safety Gate: ClinicalSafetyAgent (Deterministic red-flag audit & 1990/119/1926 emergency escalation)
///      - Clinical Triage: ClinicalTriageAgent (Gemini LLM specialty routing with weighted fallback)
///      - Slot Allocation: DoctorSlotAllocationAgent (Allow-listed DoctorSlotAllocationTool execution)
///      - Validation: RecommendationValidationAgent (Deterministic post-tool clinical & slot integrity validation)
///   2. Strict Tool Calling: Only DoctorSlotAllocationAgent is permitted to invoke DoctorSlotAllocationTool via IAgentToolRegistry.
///   3. Human-in-the-Loop (HITL): Proposals pause in PENDING_APPROVAL status until the patient confirms consultant selection.
///   4. Complete Observability: Returns ExecutionPlan, StepLogs (agent names, tool calls, timings, outputs), and audit record.
/// 
/// NEVER diagnoses, NEVER recommends medication, NEVER books appointments automatically without human approval.
/// </summary>
public class DoctorRecommendationAgent : IWorkflowAgent
{
    public string AgentName => "DoctorRecommendationAgent";
    public string Responsibility => "Coordinator agent orchestrating multi-agent clinical workflow, plan generation, and human-in-the-loop state transitions.";
    public string InputContract => "(string rawSymptoms, int? patientId)";
    public string OutputContract => "Task<DoctorRecommendationResponseDto> (WorkflowId, Status, Specialty, MatchedDoctors, ExecutionPlan, StepLogs, ApprovalStatus)";
    public IReadOnlyList<string> AllowedTools => Array.Empty<string>(); // Delegates tool calls to specialized agents

    private readonly ApplicationDbContext _context;
    private readonly IClinicalSafetyAgent _safetyAgent;
    private readonly IClinicalTriageAgent _triageAgent;
    private readonly IDoctorSlotAllocationAgent _slotAllocationAgent;
    private readonly IRecommendationValidationAgent _validationAgent;
    private readonly IAgentToolRegistry _toolRegistry;
    private readonly ILogger<DoctorRecommendationAgent> _logger;

    public DoctorRecommendationAgent(
        ApplicationDbContext context,
        IClinicalSafetyAgent safetyAgent,
        IClinicalTriageAgent triageAgent,
        IDoctorSlotAllocationAgent slotAllocationAgent,
        IRecommendationValidationAgent validationAgent,
        IAgentToolRegistry toolRegistry,
        ILogger<DoctorRecommendationAgent> logger)
    {
        _context = context;
        _safetyAgent = safetyAgent;
        _triageAgent = triageAgent;
        _slotAllocationAgent = slotAllocationAgent;
        _validationAgent = validationAgent;
        _toolRegistry = toolRegistry;
        _logger = logger;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Main Orchestration Pipeline (Coordinator / Planner)
    // ═══════════════════════════════════════════════════════════════════════════
    public async Task<DoctorRecommendationResponseDto> RunAsync(string rawSymptoms, int? patientId)
    {
        var totalSw = Stopwatch.StartNew();
        var workflowId = Guid.NewGuid();
        var symptoms = rawSymptoms?.Trim() ?? string.Empty;

        // Structured multi-step plan built upfront before delegation
        var plan = new WorkflowPlan
        {
            Objective = "Triage patient symptoms, recommend clinical specialty, and allocate top verified consultants via allow-listed tool.",
            Steps = new List<PlanStep>
            {
                new()
                {
                    StepNumber = 1,
                    StepName = "ClinicalSafetyAudit",
                    AssignedAgent = _safetyAgent.AgentName,
                    Description = "Verify input gating, rule out emergency red-flags (1990/119/1926 escalation)",
                    ContractSummary = $"Responsibility: {_safetyAgent.Responsibility} | AllowedTools: [{string.Join(", ", _safetyAgent.AllowedTools)}]"
                },
                new()
                {
                    StepNumber = 2,
                    StepName = "ClinicalTriageAnalysis",
                    AssignedAgent = _triageAgent.AgentName,
                    Description = "Map patient symptoms to canonical clinical specialty (Gemini LLM / Weighted Engine)",
                    ContractSummary = $"Responsibility: {_triageAgent.Responsibility} | AllowedTools: [{string.Join(", ", _triageAgent.AllowedTools)}]"
                },
                new()
                {
                    StepNumber = 3,
                    StepName = "DoctorSlotAllocation",
                    AssignedAgent = _slotAllocationAgent.AgentName,
                    Description = "Execute allow-listed DoctorSlotAllocationTool to query verified consultants and open bookable slots",
                    ContractSummary = $"Responsibility: {_slotAllocationAgent.Responsibility} | AllowedTools: [{string.Join(", ", _slotAllocationAgent.AllowedTools)}]"
                },
                new()
                {
                    StepNumber = 4,
                    StepName = "RecommendationValidation",
                    AssignedAgent = _validationAgent.AgentName,
                    Description = "Perform deterministic schema, specialty alignment, and bookable slot validation before proposal",
                    ContractSummary = $"Responsibility: {_validationAgent.Responsibility} | AllowedTools: [{string.Join(", ", _validationAgent.AllowedTools)}]"
                }
            }
        };

        var stepLogs = new List<AgentStepLogDto>();
        var statusPath = new List<string>();
        var errors = new List<string>();
        int retries = 0;

        string finalStatus;
        string? finalSpecialty = null;
        double finalConfidence = 0.0;
        string? reason = null;
        string? safetyMessage = null;
        string? redFlagCode = null;
        List<string>? followUpQuestions = null;
        List<MatchedDoctorDto> matchedDoctors = new();
        string approvalStatus = "NOT_REQUIRED";

        void MarkRemainingStepsSkipped(int fromStepNumber, string skipReason)
        {
            foreach (var remaining in plan.Steps.Where(s => s.StepNumber >= fromStepNumber))
            {
                remaining.Status = "SKIPPED";
                remaining.OutputSummary = $"Skipped: {skipReason}";
                stepLogs.Add(new AgentStepLogDto
                {
                    AgentName = remaining.AssignedAgent,
                    Action = remaining.StepName,
                    StepName = remaining.StepName,
                    Status = "SKIPPED",
                    Success = true,
                    Output = $"Step skipped because earlier workflow step halted execution: {skipReason}",
                    DurationMs = 0
                });
            }
        }

        List<string> GetExecutionPlanSummary() => plan.Steps.Select(s =>
            s.Status == "SKIPPED" && !string.IsNullOrEmpty(s.OutputSummary)
                ? $"{s.StepName}: {s.OutputSummary} [{s.Status}]"
                : $"{s.StepName}: {s.Description} [{s.Status}]").ToList();

        try
        {
            // ───────────────────────────────────────────────────────────────────
            // Step 1: Safety & Gating Agent (ClinicalSafetyAgent)
            // ───────────────────────────────────────────────────────────────────
            var step1Plan = plan.Steps[0];
            step1Plan.Status = "RUNNING";
            var step1Sw = Stopwatch.StartNew();
            var safetyEval = _safetyAgent.EvaluateSafety(symptoms);
            step1Sw.Stop();
            step1Plan.DurationMs = step1Sw.ElapsedMilliseconds;

            stepLogs.Add(new AgentStepLogDto
            {
                AgentName = _safetyAgent.AgentName,
                Action = "ClinicalSafetyAudit",
                StepName = step1Plan.StepName,
                Input = symptoms.Length > 80 ? symptoms[..77] + "..." : symptoms,
                Output = safetyEval.Status switch
                {
                    "SAFE" => "Safety checks passed: input length valid, no emergency red-flags detected.",
                    "SAFETY_ESCALATION" => $"EMERGENCY DETECTED [{(safetyEval.RedFlagCode ?? "GENERAL")}]: Life-threatening symptom pattern matched. Immediate escalation triggered.",
                    "INPUT_INVALID" => $"Input invalid: {safetyEval.Reason}",
                    "NEED_MORE_CONTEXT" => $"Input too brief/vague: {safetyEval.Reason}",
                    _ => safetyEval.Reason ?? "Unknown safety status"
                },
                RedFlagCode = safetyEval.RedFlagCode,
                MatchedCategory = safetyEval.RedFlagCode,
                DurationMs = step1Sw.ElapsedMilliseconds,
                Status = safetyEval.Status == "SAFE" ? "COMPLETED" : "BLOCKED"
            });

            statusPath.Add($"SafetyAudit:{safetyEval.Status}");

            if (!safetyEval.IsSafeToTriage)
            {
                step1Plan.Status = "BLOCKED";
                step1Plan.OutputSummary = safetyEval.Reason ?? "Safety check blocked execution.";

                finalStatus = safetyEval.Status;
                reason = safetyEval.Reason;
                safetyMessage = safetyEval.SafetyMessage;
                redFlagCode = safetyEval.RedFlagCode;
                followUpQuestions = safetyEval.FollowUpQuestions;

                // Steps after a blocked step become SKIPPED and are persisted
                MarkRemainingStepsSkipped(2, $"Safety audit resulted in {safetyEval.Status}");

                var executionPlanSummary = GetExecutionPlanSummary();

                var safetyResponse = new DoctorRecommendationResponseDto
                {
                    WorkflowId = workflowId,
                    Status = finalStatus,
                    RedFlagCode = redFlagCode,
                    Reason = reason,
                    SafetyMessage = safetyMessage,
                    FollowUpQuestions = followUpQuestions,
                    ExecutionPlan = executionPlanSummary,
                    StepLogs = stepLogs,
                    ApprovalStatus = "NOT_REQUIRED",
                    Retries = retries,
                    TotalDurationMs = totalSw.ElapsedMilliseconds
                };

                await PersistWorkflowAsync(
                    workflowId, patientId, symptoms, executionPlanSummary, stepLogs,
                    statusPath, finalStatus, null, 0, retries,
                    string.Join("; ", errors), totalSw.ElapsedMilliseconds,
                    matchedDoctors, "NOT_REQUIRED");

                return safetyResponse;
            }

            step1Plan.Status = "COMPLETED";
            step1Plan.OutputSummary = "Safety audit passed.";

            // ───────────────────────────────────────────────────────────────────
            // Step 2: Clinical Triage Agent (ClinicalTriageAgent)
            // ───────────────────────────────────────────────────────────────────
            var step2Plan = plan.Steps[1];
            step2Plan.Status = "RUNNING";
            var step2Sw = Stopwatch.StartNew();
            var triageResult = await _triageAgent.TriageSymptomsAsync(symptoms);
            step2Sw.Stop();
            step2Plan.DurationMs = step2Sw.ElapsedMilliseconds;

            retries += triageResult.Retries;

            stepLogs.Add(new AgentStepLogDto
            {
                AgentName = _triageAgent.AgentName,
                Action = "ClinicalTriageAnalysis",
                StepName = step2Plan.StepName,
                ContractSummary = step2Plan.ContractSummary,
                TriageSource = triageResult.TriageSource,
                FallbackReason = triageResult.FallbackReason,
                Input = symptoms.Length > 80 ? symptoms[..77] + "..." : symptoms,
                Output = triageResult.Status switch
                {
                    "RECOMMENDATION_READY" => $"Suggested Specialty: {triageResult.Specialty} (Confidence: {triageResult.Confidence:P0}, Source: {triageResult.TriageSource})",
                    "NEED_MORE_CONTEXT" => $"Triage requires more context. Questions: {string.Join(" | ", triageResult.FollowUpQuestions)}",
                    "SAFE_FAILURE" => $"Triage safe failure: {triageResult.Reason}",
                    "INPUT_INVALID" => $"Input invalid: {triageResult.Reason}",
                    _ => triageResult.Reason ?? "Unknown triage status"
                },
                DurationMs = step2Sw.ElapsedMilliseconds,
                Status = triageResult.Status == "RECOMMENDATION_READY" ? "COMPLETED" : "BLOCKED"
            });

            statusPath.Add($"TriageAnalysis:{triageResult.TriageSource}_{triageResult.Status}{(triageResult.FallbackReason != null ? $"_{triageResult.FallbackReason}" : "")}");

            if (triageResult.Status != "RECOMMENDATION_READY")
            {
                step2Plan.Status = "BLOCKED";
                step2Plan.OutputSummary = triageResult.Reason ?? $"Triage halted with {triageResult.Status}";

                finalStatus = triageResult.Status;
                reason = triageResult.Reason;
                followUpQuestions = triageResult.FollowUpQuestions;

                MarkRemainingStepsSkipped(3, $"Triage analysis resulted in {triageResult.Status}");

                var executionPlanSummary = GetExecutionPlanSummary();

                var nonReadyResponse = new DoctorRecommendationResponseDto
                {
                    WorkflowId = workflowId,
                    Status = finalStatus,
                    Reason = reason,
                    FollowUpQuestions = followUpQuestions,
                    ExecutionPlan = executionPlanSummary,
                    StepLogs = stepLogs,
                    ApprovalStatus = "NOT_REQUIRED",
                    Retries = retries,
                    TotalDurationMs = totalSw.ElapsedMilliseconds
                };

                await PersistWorkflowAsync(
                    workflowId, patientId, symptoms, executionPlanSummary, stepLogs,
                    statusPath, finalStatus, null, 0, retries,
                    string.Join("; ", errors), totalSw.ElapsedMilliseconds,
                    matchedDoctors, "NOT_REQUIRED");

                return nonReadyResponse;
            }

            step2Plan.Status = "COMPLETED";
            step2Plan.OutputSummary = $"Triaged to {triageResult.Specialty} (Confidence: {triageResult.Confidence:0.00}).";
            finalSpecialty = triageResult.Specialty;
            finalConfidence = triageResult.Confidence;
            reason = triageResult.Reason;

            // ───────────────────────────────────────────────────────────────────
            // Step 3: Slot Allocation Agent (DoctorSlotAllocationAgent via Tool Registry)
            // ───────────────────────────────────────────────────────────────────
            var step3Plan = plan.Steps[2];
            step3Plan.Status = "RUNNING";
            var step3Sw = Stopwatch.StartNew();
            var slotResult = await _slotAllocationAgent.AllocateSlotsAsync(finalSpecialty!, null, 3);
            step3Sw.Stop();
            step3Plan.DurationMs = step3Sw.ElapsedMilliseconds;

            matchedDoctors = slotResult.Data ?? new List<MatchedDoctorDto>();

            stepLogs.Add(new AgentStepLogDto
            {
                AgentName = _slotAllocationAgent.AgentName,
                Action = "DoctorSlotAllocation",
                StepName = step3Plan.StepName,
                ToolCalled = "DoctorSlotAllocationTool.QueryAvailableDoctorsAndSlots",
                Input = $"Specialty='{finalSpecialty}', MaxResults=3",
                Output = slotResult.Success
                    ? $"Found {matchedDoctors.Count} qualified verified consultant(s) with upcoming bookable clinic sessions."
                    : $"Slot allocation tool call failed: {slotResult.Error} (Status: {slotResult.Status})",
                DurationMs = step3Sw.ElapsedMilliseconds,
                Status = slotResult.Success ? "COMPLETED" : (slotResult.Status == "TOOL_DENIED" ? "TOOL_DENIED" : "FAILED")
            });

            statusPath.Add($"SlotAllocationTool:{slotResult.Status}_{matchedDoctors.Count}");

            if (!slotResult.Success || matchedDoctors.Count == 0)
            {
                var isDenied = slotResult.Status == "TOOL_DENIED";
                step3Plan.Status = isDenied ? "FAILED" : "COMPLETED";
                step3Plan.OutputSummary = isDenied
                    ? $"Tool security policy denied execution: {slotResult.Error}"
                    : (slotResult.Success
                        ? "No available verified consultants found with open sessions."
                        : $"Tool failed: {slotResult.Error}");

                MarkRemainingStepsSkipped(4, isDenied ? "Tool access denied" : "No doctors available");

                if (isDenied)
                {
                    finalStatus = "SAFE_FAILURE";
                    reason = "Tool execution was denied by security policy. System transitioned safely to manual workflow.";
                }
                else
                {
                    finalStatus = "NO_DOCTORS_AVAILABLE";
                    reason = $"Currently no verified consultants with open channeling slots are available for {finalSpecialty}. Please contact our channeling desk or check back later.";
                }
                approvalStatus = "NOT_REQUIRED";

                var executionPlanSummary = GetExecutionPlanSummary();

                var noDocsResponse = new DoctorRecommendationResponseDto
                {
                    WorkflowId = workflowId,
                    Status = finalStatus,
                    Specialty = finalSpecialty,
                    Confidence = Math.Round(finalConfidence, 2),
                    Reason = reason,
                    MatchedDoctors = new(),
                    ExecutionPlan = executionPlanSummary,
                    StepLogs = stepLogs,
                    ApprovalStatus = approvalStatus,
                    Retries = retries,
                    TotalDurationMs = totalSw.ElapsedMilliseconds
                };

                await PersistWorkflowAsync(
                    workflowId, patientId, symptoms, executionPlanSummary, stepLogs,
                    statusPath, finalStatus, finalSpecialty, finalConfidence, retries,
                    string.Join("; ", errors), totalSw.ElapsedMilliseconds,
                    matchedDoctors, approvalStatus);

                return noDocsResponse;
            }

            step3Plan.Status = "COMPLETED";
            step3Plan.OutputSummary = $"Allocated {matchedDoctors.Count} consultant slots.";

            // ───────────────────────────────────────────────────────────────────
            // Step 4: Deterministic Validation Agent (RecommendationValidationAgent)
            // ───────────────────────────────────────────────────────────────────
            var step4Plan = plan.Steps[3];
            step4Plan.Status = "RUNNING";
            var step4Sw = Stopwatch.StartNew();
            var validation = _validationAgent.Validate(finalSpecialty, finalConfidence, matchedDoctors);
            step4Sw.Stop();
            step4Plan.DurationMs = step4Sw.ElapsedMilliseconds;

            stepLogs.Add(new AgentStepLogDto
            {
                AgentName = _validationAgent.AgentName,
                Action = "RecommendationValidation",
                StepName = step4Plan.StepName,
                Input = $"Specialty='{finalSpecialty}', Candidates={matchedDoctors.Count}",
                Output = validation.IsValid
                    ? "Validation successful: canonical specialty verified, active consultant eligibility confirmed, bookable slots validated."
                    : $"Validation rejected: {validation.Reason} (Status: {validation.Status})",
                DurationMs = step4Sw.ElapsedMilliseconds,
                Status = validation.IsValid ? "COMPLETED" : "BLOCKED"
            });

            statusPath.Add($"ValidationAgent:{validation.Status}");

            if (!validation.IsValid)
            {
                step4Plan.Status = "BLOCKED";
                step4Plan.OutputSummary = validation.Reason ?? "Validation failed.";

                finalStatus = validation.Status == "NO_DOCTORS" ? "NO_DOCTORS_AVAILABLE" : "SAFE_FAILURE";
                approvalStatus = "NOT_REQUIRED";
                reason = validation.Reason;

                var executionPlanSummary = GetExecutionPlanSummary();

                var invalidResponse = new DoctorRecommendationResponseDto
                {
                    WorkflowId = workflowId,
                    Status = finalStatus,
                    Specialty = finalSpecialty,
                    Reason = reason,
                    MatchedDoctors = new(),
                    ExecutionPlan = executionPlanSummary,
                    StepLogs = stepLogs,
                    ApprovalStatus = approvalStatus,
                    Retries = retries,
                    TotalDurationMs = totalSw.ElapsedMilliseconds
                };

                await PersistWorkflowAsync(
                    workflowId, patientId, symptoms, executionPlanSummary, stepLogs,
                    statusPath, finalStatus, finalSpecialty, 0, retries,
                    validation.Reason ?? "Validation failed", totalSw.ElapsedMilliseconds,
                    matchedDoctors, approvalStatus);

                return invalidResponse;
            }

            step4Plan.Status = "COMPLETED";
            step4Plan.OutputSummary = "Deterministic validation passed.";

            // ───────────────────────────────────────────────────────────────────
            // Step 5: Proposal Ready & Paused for Human Confirmation
            // ───────────────────────────────────────────────────────────────────
            approvalStatus = "PENDING_APPROVAL";
            finalStatus = "RECOMMENDATION_READY";
            statusPath.Add("ChannelingProposal:PENDING_APPROVAL");

            var finalPlanSummary = GetExecutionPlanSummary();

            var response = new DoctorRecommendationResponseDto
            {
                WorkflowId = workflowId,
                Status = finalStatus,
                Specialty = finalSpecialty,
                Confidence = Math.Round(finalConfidence, 2),
                Reason = reason,
                MatchedDoctors = matchedDoctors,
                ExecutionPlan = finalPlanSummary,
                StepLogs = stepLogs,
                ApprovalStatus = approvalStatus,
                Retries = retries,
                TotalDurationMs = totalSw.ElapsedMilliseconds
            };

            await PersistWorkflowAsync(
                workflowId, patientId, symptoms, finalPlanSummary, stepLogs,
                statusPath, finalStatus, finalSpecialty, finalConfidence, retries,
                string.Join("; ", errors), totalSw.ElapsedMilliseconds,
                matchedDoctors, approvalStatus);

            _logger.LogInformation("[DocRecAgent] Workflow {Id} finished in {Ms}ms. Status={Status}, Specialty={Specialty}, Approval={Appr}",
                workflowId, totalSw.ElapsedMilliseconds, finalStatus, finalSpecialty, approvalStatus);

            return response;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[DocRecAgent] Fatal coordinator error");
            errors.Add(ex.Message);
            finalStatus = "SAFE_FAILURE";

            var executionPlanSummary = GetExecutionPlanSummary();

            var errResponse = new DoctorRecommendationResponseDto
            {
                WorkflowId = workflowId,
                Status = "SAFE_FAILURE",
                Reason = "Please select a specialty manually.",
                ExecutionPlan = executionPlanSummary,
                StepLogs = stepLogs,
                ApprovalStatus = "NOT_REQUIRED",
                TotalDurationMs = totalSw.ElapsedMilliseconds
            };

            await PersistWorkflowAsync(
                workflowId, patientId, symptoms, executionPlanSummary, stepLogs,
                statusPath, finalStatus, null, 0, retries,
                string.Join("; ", errors), totalSw.ElapsedMilliseconds,
                matchedDoctors, "NOT_REQUIRED");

            return errResponse;
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Human-in-the-Loop Approval Action
    // ═══════════════════════════════════════════════════════════════════════════
    public async Task<DoctorRecommendationResponseDto?> ApproveRecommendationAsync(
        Guid workflowId, int? selectedDoctorId, int? selectedSessionId)
    {
        var wf = await _context.RecommendationWorkflows.FirstOrDefaultAsync(w => w.Id == workflowId);
        if (wf == null) return null;

        wf.ApprovalStatus = "APPROVED";
        wf.ApprovedAt = DateTime.UtcNow;

        var stepLogs = new List<AgentStepLogDto>();
        if (!string.IsNullOrWhiteSpace(wf.StepResultsJson))
        {
            try
            {
                stepLogs = JsonSerializer.Deserialize<List<AgentStepLogDto>>(wf.StepResultsJson) ?? new();
            }
            catch { }
        }

        stepLogs.Add(new AgentStepLogDto
        {
            AgentName = AgentName,
            Action = "ChannelingProposal:APPROVED",
            StepName = "ApprovalConfirmation",
            Input = $"SelectedDoctorId={selectedDoctorId}, SelectedSessionId={selectedSessionId}",
            Output = "Proposal approved by patient. Slot reserved for booking.",
            DurationMs = 1,
            Status = "COMPLETED"
        });

        wf.StepResultsJson = JsonSerializer.Serialize(stepLogs);
        wf.StatusPath += " → ChannelingProposal:APPROVED";
        await _context.SaveChangesAsync();

        var matchedDoctors = new List<MatchedDoctorDto>();
        if (!string.IsNullOrWhiteSpace(wf.MatchedDoctorsJson))
        {
            try
            {
                matchedDoctors = JsonSerializer.Deserialize<List<MatchedDoctorDto>>(wf.MatchedDoctorsJson) ?? new();
            }
            catch { }
        }

        List<string>? plan = null;
        if (!string.IsNullOrWhiteSpace(wf.PlanJson))
        {
            try { plan = JsonSerializer.Deserialize<List<string>>(wf.PlanJson); } catch { }
        }

        return new DoctorRecommendationResponseDto
        {
            WorkflowId = wf.Id,
            Status = wf.FinalStatus,
            Specialty = wf.Specialty,
            Confidence = wf.Confidence > 0 ? Math.Round(wf.Confidence, 2) : null,
            Reason = "Recommendation approved by patient. Proceed to confirm channeling slot.",
            MatchedDoctors = matchedDoctors,
            ExecutionPlan = plan,
            StepLogs = stepLogs,
            ApprovalStatus = "APPROVED",
            TotalDurationMs = wf.DurationMs
        };
    }

    public async Task<bool> RejectRecommendationAsync(Guid workflowId, string? notes)
    {
        var wf = await _context.RecommendationWorkflows.FirstOrDefaultAsync(w => w.Id == workflowId);
        if (wf == null) return false;

        wf.ApprovalStatus = "REJECTED";
        wf.StatusPath += $" → ChannelingProposal:REJECTED({notes ?? "by_patient"})";
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<RecommendationWorkflow?> GetWorkflowAsync(Guid workflowId)
    {
        return await _context.RecommendationWorkflows.AsNoTracking().FirstOrDefaultAsync(w => w.Id == workflowId);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Persistence
    // ═══════════════════════════════════════════════════════════════════════════
    private async Task PersistWorkflowAsync(
        Guid workflowId, int? patientId, string symptoms,
        List<string> plan, List<AgentStepLogDto> stepLogs,
        List<string> statusPath, string finalStatus, string? specialty,
        double confidence, int retries, string errors, long durationMs,
        List<MatchedDoctorDto> matchedDoctors, string approvalStatus)
    {
        try
        {
            var wf = new RecommendationWorkflow
            {
                Id = workflowId,
                PatientId = patientId,
                InputText = symptoms,
                Objective = "Triage patient symptoms, recommend clinical specialty, and allocate top consultants via allow-listed tool.",
                PlanJson = JsonSerializer.Serialize(plan),
                StepResultsJson = JsonSerializer.Serialize(stepLogs),
                StatusPath = string.Join(" → ", statusPath),
                FinalStatus = finalStatus,
                Specialty = specialty,
                Confidence = confidence,
                Retries = retries,
                Errors = errors.Length > 0 ? errors : null,
                DurationMs = durationMs,
                CreatedAt = DateTime.UtcNow,
                ApprovalStatus = approvalStatus,
                MatchedDoctorsJson = matchedDoctors.Count > 0 ? JsonSerializer.Serialize(matchedDoctors) : null
            };

            _context.RecommendationWorkflows.Add(wf);
            await _context.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[DocRecAgent] Failed to persist workflow record {Id}", workflowId);
        }
    }
}
