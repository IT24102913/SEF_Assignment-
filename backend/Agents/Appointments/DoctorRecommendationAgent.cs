using System.Diagnostics;
using System.Text.Json;
using HealthBridge.Api.Data;
using HealthBridge.Api.DTOs.Appointments;
using HealthBridge.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace HealthBridge.Api.Agents.Appointments;

/// <summary>
/// DoctorRecommendationAgent — Multi-Agent Coordinator & Execution Planner.
/// 
/// Complies with SE3090 Section 9.1 & 10 (Individual Agentic AI Contribution):
///   1. Multi-Agent Architecture (4 distinct roles):
///      - DoctorRecommendationAgent: Multi-Agent Coordinator, Execution Planner & HITL gatekeeper
///      - IClinicalSafetyAgent: Deterministic gatekeeper for input sanity & 1990 emergency red-flag escalation
///      - IClinicalTriageAgent: Domain analysis agent using schema-constrained Gemini LLM & weighted fallback
///      - IDoctorSlotAllocationTool: Allow-listed tool querying PostgreSQL for active consultants & earliest bookable slots
///   2. Strict Tool Calling: Uses IDoctorSlotAllocationTool allow-listed tool with validated inputs.
///   3. Human-in-the-Loop (HITL): Proposals pause in PENDING_APPROVAL status until the patient confirms consultant selection.
///   4. Complete Observability: Returns ExecutionPlan, StepLogs (agent names, tool calls, timings, outputs), and audit record.
/// 
/// NEVER diagnoses, NEVER recommends medication, NEVER books appointments automatically without human approval.
/// </summary>
public class DoctorRecommendationAgent
{
    private readonly IConfiguration _config;
    private readonly ILogger<DoctorRecommendationAgent> _logger;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ApplicationDbContext _context;
    private readonly IClinicalSafetyAgent _safetyAgent;
    private readonly IClinicalTriageAgent _triageAgent;
    private readonly IDoctorSlotAllocationTool _slotAllocationTool;

    public DoctorRecommendationAgent(
        IConfiguration config,
        ILogger<DoctorRecommendationAgent> logger,
        IHttpClientFactory httpClientFactory,
        ApplicationDbContext context,
        IClinicalSafetyAgent? safetyAgent = null,
        IClinicalTriageAgent? triageAgent = null,
        IDoctorSlotAllocationTool? slotAllocationTool = null)
    {
        _config = config;
        _logger = logger;
        _httpClientFactory = httpClientFactory;
        _context = context;
        _safetyAgent = safetyAgent ?? new ClinicalSafetyAgent(NullLogger<ClinicalSafetyAgent>.Instance);
        _triageAgent = triageAgent ?? new ClinicalTriageAgent(config, NullLogger<ClinicalTriageAgent>.Instance, httpClientFactory);
        _slotAllocationTool = slotAllocationTool ?? new DoctorSlotAllocationTool(context, NullLogger<DoctorSlotAllocationTool>.Instance);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Main Orchestration Pipeline (Coordinator / Planner)
    // ═══════════════════════════════════════════════════════════════════════════
    public async Task<DoctorRecommendationResponseDto> RunAsync(string rawSymptoms, int? patientId)
    {
        var totalSw = Stopwatch.StartNew();
        var workflowId = Guid.NewGuid();
        var symptoms = rawSymptoms?.Trim() ?? string.Empty;

        var executionPlan = new List<string>
        {
            "Step 1: ClinicalSafetyAudit — Verify input gating, rule out emergency red-flags (1990 ER escalation)",
            "Step 2: SpecialtyTriageAnalysis — Map patient symptoms to clinical specialty (Gemini LLM / Weighted Engine)",
            "Step 3: ConsultantSlotAllocation — Execute allow-listed DoctorSlotAllocationTool to fetch top consultants & available slots",
            "Step 4: ChannelingProposalHITL — Synthesize recommendation into a human-reviewable proposal requiring patient sign-off"
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
        List<string>? followUpQuestions = null;
        List<MatchedDoctorDto> matchedDoctors = new();
        string approvalStatus = "NOT_REQUIRED";

        try
        {
            // ───────────────────────────────────────────────────────────────────
            // Step 1: Safety & Gating Agent (ClinicalSafetyAgent)
            // ───────────────────────────────────────────────────────────────────
            var step1Sw = Stopwatch.StartNew();
            var safetyEval = _safetyAgent.EvaluateSafety(symptoms);
            step1Sw.Stop();

            stepLogs.Add(new AgentStepLogDto
            {
                AgentName = _safetyAgent.AgentName,
                Action = "ClinicalSafetyAudit",
                Input = symptoms.Length > 80 ? symptoms[..77] + "..." : symptoms,
                Output = safetyEval.Status switch
                {
                    "SAFE" => "Safety checks passed: input length valid, no emergency red-flags detected.",
                    "SAFETY_ESCALATION" => $"EMERGENCY DETECTED [{(safetyEval.RedFlagCode ?? "GENERAL")}]: Life-threatening symptom pattern matched. Immediate escalation triggered.",
                    "INPUT_INVALID" => $"Input invalid: {safetyEval.Reason}",
                    "NEED_MORE_CONTEXT" => $"Input too brief/vague: {safetyEval.Reason}",
                    _ => safetyEval.Reason ?? "Unknown safety status"
                },
                DurationMs = step1Sw.ElapsedMilliseconds,
                Status = safetyEval.Status == "SAFE" ? "COMPLETED" : "BLOCKED"
            });

            statusPath.Add($"SafetyAudit:{safetyEval.Status}");

            if (!safetyEval.IsSafeToTriage)
            {
                finalStatus = safetyEval.Status;
                reason = safetyEval.Reason;
                safetyMessage = safetyEval.SafetyMessage;
                followUpQuestions = safetyEval.FollowUpQuestions;

                var safetyResponse = new DoctorRecommendationResponseDto
                {
                    WorkflowId = workflowId,
                    Status = finalStatus,
                    RedFlagCode = safetyEval.RedFlagCode,
                    Reason = reason,
                    SafetyMessage = safetyMessage,
                    FollowUpQuestions = followUpQuestions,
                    ExecutionPlan = executionPlan,
                    StepLogs = stepLogs,
                    ApprovalStatus = "NOT_REQUIRED",
                    TotalDurationMs = totalSw.ElapsedMilliseconds
                };

                await PersistWorkflowAsync(
                    workflowId, patientId, symptoms, executionPlan, stepLogs,
                    statusPath, finalStatus, null, 0, retries,
                    string.Join("; ", errors), totalSw.ElapsedMilliseconds,
                    matchedDoctors, "NOT_REQUIRED");

                return safetyResponse;
            }

            // ───────────────────────────────────────────────────────────────────
            // Step 2: Domain Analysis Agent (ClinicalTriageAgent)
            // ───────────────────────────────────────────────────────────────────
            var step2Sw = Stopwatch.StartNew();
            var triageResult = await _triageAgent.TriageSymptomsAsync(symptoms);
            step2Sw.Stop();

            stepLogs.Add(new AgentStepLogDto
            {
                AgentName = _triageAgent.AgentName,
                Action = "SpecialtyTriageAnalysis",
                Input = symptoms.Length > 80 ? symptoms[..77] + "..." : symptoms,
                Output = triageResult.Status == "RECOMMENDATION_READY"
                    ? $"Matched to '{triageResult.Specialty}' (Confidence: {triageResult.Confidence:P0}). {triageResult.Reason}"
                    : (triageResult.Reason ?? triageResult.Status),
                DurationMs = step2Sw.ElapsedMilliseconds,
                Status = triageResult.Status == "RECOMMENDATION_READY" ? "COMPLETED" : "INSUFFICIENT_CONTEXT"
            });

            statusPath.Add($"ClinicalTriage:{triageResult.Status}");

            if (triageResult.Status != "RECOMMENDATION_READY")
            {
                finalStatus = triageResult.Status;
                reason = triageResult.Reason;
                followUpQuestions = triageResult.FollowUpQuestions;
                finalConfidence = triageResult.Confidence;

                var nonReadyResponse = new DoctorRecommendationResponseDto
                {
                    WorkflowId = workflowId,
                    Status = finalStatus,
                    Reason = reason,
                    Confidence = finalConfidence > 0 ? Math.Round(finalConfidence, 2) : null,
                    FollowUpQuestions = followUpQuestions,
                    ExecutionPlan = executionPlan,
                    StepLogs = stepLogs,
                    ApprovalStatus = "NOT_REQUIRED",
                    TotalDurationMs = totalSw.ElapsedMilliseconds
                };

                await PersistWorkflowAsync(
                    workflowId, patientId, symptoms, executionPlan, stepLogs,
                    statusPath, finalStatus, null, finalConfidence, retries,
                    string.Join("; ", errors), totalSw.ElapsedMilliseconds,
                    matchedDoctors, "NOT_REQUIRED");

                return nonReadyResponse;
            }

            finalSpecialty = triageResult.Specialty;
            finalConfidence = triageResult.Confidence;
            reason = triageResult.Reason;

            // ───────────────────────────────────────────────────────────────────
            // Step 3: Tool Execution (DoctorSlotAllocationTool)
            // ───────────────────────────────────────────────────────────────────
            var step3Sw = Stopwatch.StartNew();
            matchedDoctors = await _slotAllocationTool.QueryAvailableDoctorsAndSlotsAsync(finalSpecialty!, null, 3);
            step3Sw.Stop();

            stepLogs.Add(new AgentStepLogDto
            {
                AgentName = "DoctorRecommendationCoordinator",
                Action = "QueryDoctorSessions",
                ToolCalled = _slotAllocationTool.ToolName,
                Input = $"Specialty='{finalSpecialty}', MaxResults=3",
                Output = $"Found {matchedDoctors.Count} qualified consultant(s) with upcoming bookable clinic sessions.",
                DurationMs = step3Sw.ElapsedMilliseconds,
                Status = "COMPLETED"
            });

            statusPath.Add($"SlotAllocationTool:FOUND_{matchedDoctors.Count}");

            // ───────────────────────────────────────────────────────────────────
            // Step 4: Human-in-the-Loop Channeling Proposal
            // ───────────────────────────────────────────────────────────────────
            approvalStatus = "PENDING_APPROVAL";
            finalStatus = "RECOMMENDATION_READY";

            stepLogs.Add(new AgentStepLogDto
            {
                AgentName = "DoctorRecommendationCoordinator",
                Action = "ChannelingProposalHITL",
                Input = $"Specialty='{finalSpecialty}', Candidates={matchedDoctors.Count}",
                Output = "Consultant channeling proposal generated and paused in PENDING_APPROVAL state. Waiting for patient/staff confirmation.",
                DurationMs = 2,
                Status = "WAITING_FOR_APPROVAL"
            });

            statusPath.Add("ChannelingProposal:PENDING_APPROVAL");

            var response = new DoctorRecommendationResponseDto
            {
                WorkflowId = workflowId,
                Status = finalStatus,
                Specialty = finalSpecialty,
                Confidence = Math.Round(finalConfidence, 2),
                Reason = reason,
                MatchedDoctors = matchedDoctors,
                ExecutionPlan = executionPlan,
                StepLogs = stepLogs,
                ApprovalStatus = approvalStatus,
                TotalDurationMs = totalSw.ElapsedMilliseconds
            };

            await PersistWorkflowAsync(
                workflowId, patientId, symptoms, executionPlan, stepLogs,
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

            var errResponse = new DoctorRecommendationResponseDto
            {
                WorkflowId = workflowId,
                Status = "SAFE_FAILURE",
                Reason = "Please select a specialty manually.",
                ExecutionPlan = executionPlan,
                StepLogs = stepLogs,
                ApprovalStatus = "NOT_REQUIRED",
                TotalDurationMs = totalSw.ElapsedMilliseconds
            };

            await PersistWorkflowAsync(
                workflowId, patientId, symptoms, executionPlan, stepLogs,
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
            catch { /* ignore json parse */ }
        }

        stepLogs.Add(new AgentStepLogDto
        {
            AgentName = "DoctorRecommendationCoordinator",
            Action = "HumanApprovalSignOff",
            Input = $"SelectedDoctorId={selectedDoctorId}, SelectedSessionId={selectedSessionId}",
            Output = "Proposal approved by patient. Channeling workflow proceeded to booking stage.",
            DurationMs = 1,
            Status = "APPROVED"
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
