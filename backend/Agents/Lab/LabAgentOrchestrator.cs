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

    // Specific Patient Name & Date Verification details for Human Approval UI
    public string? ExtractedPatientName { get; set; }
    public bool PatientNameMismatch { get; set; }
    public string? PatientNameMismatchReason { get; set; }
    public bool PrescriptionExpired { get; set; }
    public bool PrescriptionDateValid { get; set; } = true;
    public string? PrescriptionDateReason { get; set; }

    // Investigation / Lab Test Matching details for Human Approval UI
    public bool TestMismatch { get; set; }
    public List<string> ExtractedInvestigations { get; set; } = new();
    public string? TestMismatchReason { get; set; }
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

        // Tally daily counts for phlebotomy chair load balancing
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
                    rxResult.IsExpired,
                    rxResult.PrescriptionDateValid,
                    rxResult.PrescriptionDateMismatchReason,
                    rxResult.PrescriptionPatientName,
                    rxResult.PatientNameMatch,
                    rxResult.PatientNameMismatchReason,
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
        // Check if a sibling test in the same appointment batch already has an allocated queue token / chair
        var sibling = await db.LabBookings
            .Include(b => b.LabTest)
            .Where(b => b.Id != booking.Id
                     && (b.PatientId == booking.PatientId || b.PatientEmail.ToLower() == booking.PatientEmail.ToLower())
                     && b.BookingDate == booking.BookingDate
                     && b.TimeSlot == booking.TimeSlot
                     && b.Status != BookingStatus.Cancelled
                     && b.Status != BookingStatus.Rejected)
            .OrderBy(b => b.CreatedAt)
            .FirstOrDefaultAsync();

        LabQueueSafetyOutput queueSafetyResult;
        if (sibling != null && !string.IsNullOrEmpty(sibling.QueueToken) && sibling.AssignedChairNo > 0)
        {
            queueSafetyResult = new LabQueueSafetyOutput
            {
                Success = true,
                Confidence = 1.0,
                QueueToken = sibling.QueueToken,
                PriorityTier = sibling.PriorityTier ?? (booking.LabTest.IsRestricted ? "SPECIALIZED_PRIORITY" : "ROUTINE"),
                AssignedChairNo = sibling.AssignedChairNo,
                EstimatedServiceDurationMinutes = sibling.EstimatedServiceDurationMinutes,
                EstimatedWaitMinutes = sibling.EstimatedWaitMinutes,
                RequiresFasting = false,
                RequiredFastingHours = 0,
                SafetyFlags = new List<string>(),
                PatientPrepGuidelines = new List<string>(),
                StatusMessage = $"Unified Queue Token {sibling.QueueToken} and Chair #{sibling.AssignedChairNo} for co-booked appointment."
            };
        }
        else
        {
            // Calculate sequence number using DISTINCT patient appointments for the date
            var distinctAppointmentsBefore = await db.LabBookings
                .Where(b => b.BookingDate == booking.BookingDate 
                         && b.CreatedAt < booking.CreatedAt
                         && !(b.PatientEmail.ToLower() == booking.PatientEmail.ToLower() && b.TimeSlot == booking.TimeSlot))
                .Select(b => new { b.PatientEmail, b.TimeSlot })
                .Distinct()
                .CountAsync();

            var queueSafetyInput = new LabQueueSafetyInput
            {
                BookingId = booking.Id,
                PatientName = booking.PatientName,
                TestName = booking.LabTest.Name,
                TestCategory = booking.LabTest.Category,
                TestIsRestricted = booking.LabTest.IsRestricted,
                BookingDate = booking.BookingDate,
                TimeSlot = booking.TimeSlot,
                DailySequenceNo = distinctAppointmentsBefore + 1
            };

            queueSafetyResult = await _queueSafetyAgent.EvaluateAndOptimizeAsync(queueSafetyInput);
        }

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
                queueSafetyResult.RequiresFasting,
                queueSafetyResult.RequiredFastingHours,
                queueSafetyResult.SafetyFlags,
                queueSafetyResult.PatientPrepGuidelines
            }
        });

        // Apply queueing and chair allocations to booking entity
        booking.QueueToken = queueSafetyResult.QueueToken;
        booking.PriorityTier = queueSafetyResult.PriorityTier;
        booking.EstimatedServiceDurationMinutes = 0;
        booking.EstimatedWaitMinutes = 0;
        booking.AssignedChairNo = queueSafetyResult.AssignedChairNo;

        // Synchronize QueueToken and AssignedChairNo across all co-booked sibling tests in this batch
        var batchSiblings = await db.LabBookings
            .Where(b => b.Id != booking.Id
                     && (b.PatientId == booking.PatientId || b.PatientEmail.ToLower() == booking.PatientEmail.ToLower())
                     && b.BookingDate == booking.BookingDate
                     && b.TimeSlot == booking.TimeSlot
                     && b.Status != BookingStatus.Cancelled
                     && b.Status != BookingStatus.Rejected)
            .ToListAsync();

        foreach (var bs in batchSiblings)
        {
            if (bs.QueueToken != booking.QueueToken || bs.AssignedChairNo != booking.AssignedChairNo)
            {
                bs.QueueToken = booking.QueueToken;
                bs.PriorityTier = booking.PriorityTier;
                bs.AssignedChairNo = booking.AssignedChairNo;
            }
        }

        // =========================================================================
        // Multi-Agent State Synthesis & Human-in-the-Loop Decision
        // =========================================================================
        var isOcrValid = rxResult.Success && rxResult.Confidence >= 0.7 && rxResult.MatchFound;
        var isNameValid = rxResult.PatientNameMatch;
        var isDateValid = rxResult.PrescriptionDateValid;
        state.ExtractedPatientName = rxResult.PrescriptionPatientName;
        state.PatientNameMismatch = !isNameValid;
        state.PatientNameMismatchReason = rxResult.PatientNameMismatchReason;
        state.PrescriptionExpired = rxResult.IsExpired;
        state.PrescriptionDateValid = isDateValid;
        state.PrescriptionDateReason = rxResult.PrescriptionDateMismatchReason;
        state.TestMismatch = !rxResult.MatchFound;
        state.ExtractedInvestigations = rxResult.ExtractedInvestigations;
        state.TestMismatchReason = rxResult.TestMismatchReason;

        state.OverallConfidence = Math.Min(rxResult.Confidence, queueSafetyResult.Confidence);

        if (booking.LabTest.IsRestricted)
        {
            if (!isNameValid || !isOcrValid || !isDateValid)
            {
                state.Recommendation = "FLAGGED";
                booking.AIVerification = AIVerificationResult.Flagged;

                var flagIssues = new List<string>();
                if (!isNameValid)
                {
                    flagIssues.Add($"⚠️ NAME MISMATCH: {rxResult.PatientNameMismatchReason ?? $"Prescription name '{rxResult.PrescriptionPatientName}' differs from profile '{booking.PatientName}'"}");
                }
                if (!isDateValid)
                {
                    flagIssues.Add($"⚠️ EXPIRED / INVALID DATE: {rxResult.PrescriptionDateMismatchReason ?? "Prescription issue date is invalid or expired."}");
                }
                if (!isOcrValid || !rxResult.MatchFound)
                {
                    flagIssues.Add($"⚠️ TEST MISMATCH: {rxResult.TestMismatchReason ?? $"Requested '{booking.LabTest.Name}' not verified on prescription slip."}");
                }

                booking.AIVerificationNotes = string.Join(" | ", flagIssues) + $" | [Token {booking.QueueToken}] Chair #{booking.AssignedChairNo}";
            }
            else
            {
                state.Recommendation = "PRE_APPROVED";
                booking.AIVerification = AIVerificationResult.PreApproved;
                booking.AIVerificationNotes = $"✓ Verified: Patient name '{rxResult.PrescriptionPatientName}', date ({rxResult.PrescriptionDate:yyyy-MM-dd}) and test matched | [Token {booking.QueueToken}] Chair #{booking.AssignedChairNo}";
            }
        }
        else
        {
            state.Recommendation = "PRE_APPROVED";
            booking.AIVerification = AIVerificationResult.NotRequired;
            booking.AIVerificationNotes = $"[Token {booking.QueueToken}] Chair #{booking.AssignedChairNo} | {queueSafetyResult.StatusMessage}";
        }

        booking.AIConfidenceScore = state.OverallConfidence;
        booking.Status = booking.LabTest.IsRestricted ? BookingStatus.PendingLabApproval : BookingStatus.Confirmed;
        booking.AgentWorkflowStateJson = JsonSerializer.Serialize(state, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
        booking.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();
        _logger.LogInformation("[LabAgentOrchestrator] Completed 2-Agent workflow for Booking {Id}. Token: {Token}, Result: {Result}, NameMismatch: {Mismatch}, TestMismatch: {TestMismatch}",
            bookingId, booking.QueueToken, booking.AIVerification, state.PatientNameMismatch, state.TestMismatch);
    }
}
