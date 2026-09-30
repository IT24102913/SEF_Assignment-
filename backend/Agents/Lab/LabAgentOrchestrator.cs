using System.Text.Json;
using HealthBridge.Api.Data;
using HealthBridge.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace HealthBridge.Api.Agents.Lab;

public class AgentWorkflowStepLog
{
    public string StepName { get; set; } = string.Empty;
    public string AgentName { get; set; } = string.Empty;
    public bool Success { get; set; }
    public double Confidence { get; set; }
    public string Message { get; set; } = string.Empty;
    public object? Details { get; set; }
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}

public class AgentWorkflowState
{
    public string WorkflowId { get; set; } = Guid.NewGuid().ToString("N");
    public string Objective { get; set; } = string.Empty;
    public List<string> ExecutionPlan { get; set; } = new();
    public List<AgentWorkflowStepLog> StepLogs { get; set; } = new();
    public string Recommendation { get; set; } = "PRE_APPROVED";
    public double OverallConfidence { get; set; } = 1.0;
    public bool HumanApprovalRequired { get; set; } = true;
    public string AuditSummary { get; set; } = string.Empty;
    public DateTime ProcessedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// LabAgentOrchestrator — Multi-Agent Coordinator for Laboratory Management.
/// 
/// Coordinates:
/// 1. PrescriptionVerificationAgent (Clinical Document AI - Vision OCR & Test Matching)
/// 2. LabQueueAndSafetyAgent (Clinical Operations & Patient Safety AI - Queueing, Chair Balancing, Fasting)
/// 
/// Enforces:
/// - Human-in-the-Loop policy: Pauses bookings for pathologist sign-off if restricted.
/// - Structured audit trail logged to LabBooking.AgentWorkflowStateJson for frontend inspection.
/// </summary>
public class LabAgentOrchestrator
{
    private readonly PrescriptionVerificationAgent _prescriptionAgent;
    private readonly LabQueueAndSafetyAgent _queueSafetyAgent;
    private readonly ILogger<LabAgentOrchestrator> _logger;

    public LabAgentOrchestrator(
        PrescriptionVerificationAgent prescriptionAgent,
        LabQueueAndSafetyAgent queueSafetyAgent,
        ILogger<LabAgentOrchestrator> logger)
    {
        _prescriptionAgent = prescriptionAgent;
        _queueSafetyAgent = queueSafetyAgent;
        _logger = logger;
    }

    public async Task ProcessBookingWorkflowAsync(ApplicationDbContext db, Guid bookingId)
    {
        var booking = await db.LabBookings.Include(b => b.LabTest).FirstOrDefaultAsync(b => b.Id == bookingId);
        if (booking == null) return;

        _logger.LogInformation("[LabAgentOrchestrator] Starting 2-Agent clinical workflow for Booking ID {Id}", bookingId);

        // 1. Fetch recent patient history for duplicate screening
        var recentTests = await db.LabBookings
            .Where(b => b.PatientId == booking.PatientId && b.Id != bookingId && b.CreatedAt >= DateTime.UtcNow.AddDays(-30))
            .Include(b => b.LabTest)
            .Select(b => b.LabTest.Name)
            .ToListAsync();

        // 2. Tally slot and daily counts for phlebotomy chair load balancing
        var existingCount = await db.LabBookings
            .CountAsync(b => b.BookingDate == booking.BookingDate && b.TimeSlot == booking.TimeSlot);

        var dailySeqCount = await db.LabBookings
            .CountAsync(b => b.BookingDate == booking.BookingDate);

        var state = new AgentWorkflowState
        {
            Objective = $"Verify prescription validity and optimize phlebotomy triage for '{booking.LabTest.Name}'",
            ExecutionPlan = new List<string>
            {
                "1. PrescriptionVerificationAgent: Clinical Document OCR & Investigation Validation",
                "2. LabQueueAndSafetyAgent: Phlebotomy Queue Triage, Chair Allocation & Safety Check"
            }
        };

        // =========================================================================
        // AGENT 1: PrescriptionVerificationAgent (Clinical Document AI)
        // =========================================================================
        PrescriptionVerificationOutput rxResult;
        if (!string.IsNullOrEmpty(booking.PrescriptionImageUrl) || booking.LabTest.IsRestricted)
        {
            var rxInput = new PrescriptionVerificationInput
            {
                BookingId = booking.Id,
                PatientName = booking.PatientName,
                TestName = booking.LabTest.Name,
                PrescriptionImageUrl = booking.PrescriptionImageUrl
            };

            rxResult = await _prescriptionAgent.VerifyPrescriptionAsync(rxInput);

            state.StepLogs.Add(new AgentWorkflowStepLog
            {
                StepName = "Prescription OCR & Document Verification",
                AgentName = _prescriptionAgent.AgentName,
                Success = rxResult.Success,
                Confidence = rxResult.Confidence,
                Message = rxResult.StatusMessage,
                Details = new
                {
                    rxResult.MatchFound,
                    rxResult.DoctorName,
                    rxResult.PrescriptionDate,
                    rxResult.ExtractedInvestigations,
                    rxResult.Notes
                }
            });

            if (!string.IsNullOrEmpty(rxResult.DoctorName) && rxResult.DoctorName != "Pending Inspection")
            {
                booking.AIExtractedDoctorName = rxResult.DoctorName;
            }

            if (rxResult.PrescriptionDate.HasValue)
            {
                booking.AIPrescriptionDate = rxResult.PrescriptionDate.Value;
            }
        }
        else
        {
            rxResult = new PrescriptionVerificationOutput
            {
                Success = true,
                Confidence = 1.0,
                MatchFound = true,
                StatusMessage = "Unrestricted routine test. Prescription document upload bypassed."
            };

            state.StepLogs.Add(new AgentWorkflowStepLog
            {
                StepName = "Prescription OCR Verification",
                AgentName = _prescriptionAgent.AgentName,
                Success = true,
                Confidence = 1.0,
                Message = "Standard unrestricted diagnostic test. Prescription check bypassed."
            });
        }

        // =========================================================================
        // AGENT 2: LabQueueAndSafetyAgent (Clinical Operations & Patient Safety AI)
        // =========================================================================
        var queueSafetyInput = new LabQueueSafetyInput
        {
            BookingId = booking.Id,
            PatientName = booking.PatientName,
            PatientAge = 35, // Default age
            TestName = booking.LabTest.Name,
            TestCategory = booking.LabTest.Category,
            TestIsRestricted = booking.LabTest.IsRestricted,
            BookingDate = booking.BookingDate,
            TimeSlot = booking.TimeSlot,
            ExistingBookingsInSlot = existingCount,
            DailySequenceNo = dailySeqCount + 1,
            RecentPatientTests = recentTests
        };

        var queueSafetyResult = await _queueSafetyAgent.EvaluateAndOptimizeAsync(queueSafetyInput);

        state.StepLogs.Add(new AgentWorkflowStepLog
        {
            StepName = "Phlebotomy Queue & Patient Safety Triage",
            AgentName = _queueSafetyAgent.AgentName,
            Success = queueSafetyResult.Success,
            Confidence = queueSafetyResult.Confidence,
            Message = queueSafetyResult.StatusMessage,
            Details = new
            {
                queueSafetyResult.QueueToken,
                queueSafetyResult.PriorityTier,
                queueSafetyResult.AssignedChairNo,
                queueSafetyResult.EstimatedWaitMinutes,
                queueSafetyResult.RequiresFasting,
                queueSafetyResult.RequiredFastingHours,
                queueSafetyResult.SafetyFlags,
                queueSafetyResult.PatientPrepGuidelines
            }
        });

        // Apply queueing and chair allocations to booking entity
        booking.QueueToken = queueSafetyResult.QueueToken;
        booking.PriorityTier = queueSafetyResult.PriorityTier;
        booking.EstimatedServiceDurationMinutes = queueSafetyResult.EstimatedServiceDurationMinutes;
        booking.EstimatedWaitMinutes = queueSafetyResult.EstimatedWaitMinutes;
        booking.AssignedChairNo = queueSafetyResult.AssignedChairNo;

        // =========================================================================
        // Multi-Agent State Synthesis & Human-in-the-Loop Decision
        // =========================================================================
        var isOcrValid = rxResult.Success && rxResult.Confidence >= 0.7 && rxResult.MatchFound;
        state.OverallConfidence = Math.Min(rxResult.Confidence, queueSafetyResult.Confidence);

        if (booking.LabTest.IsRestricted && !isOcrValid)
        {
            state.Recommendation = "FLAGGED";
            booking.AIVerification = AIVerificationResult.Flagged;
        }
        else
        {
            state.Recommendation = "PRE_APPROVED";
            booking.AIVerification = booking.LabTest.IsRestricted ? AIVerificationResult.PreApproved : AIVerificationResult.NotRequired;
        }

        booking.AIConfidenceScore = state.OverallConfidence;
        booking.AIVerificationNotes = $"[Token {booking.QueueToken}] Chair #{booking.AssignedChairNo} | {queueSafetyResult.StatusMessage}";
        booking.Status = booking.LabTest.IsRestricted ? BookingStatus.PendingLabApproval : BookingStatus.Confirmed;
        booking.AgentWorkflowStateJson = JsonSerializer.Serialize(state, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
        booking.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();
        _logger.LogInformation("[LabAgentOrchestrator] Completed 2-Agent workflow for Booking {Id}. Token: {Token}, Result: {Result}",
            bookingId, booking.QueueToken, booking.AIVerification);
    }
}
