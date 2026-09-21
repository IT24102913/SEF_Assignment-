using System.Text.Json;
using HealthBridge.Api.Agents.Lab.Tools;
using HealthBridge.Api.Data;
using HealthBridge.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace HealthBridge.Api.Agents.Lab;

public class AgentWorkflowStepLog
{
    public string StepName { get; set; } = string.Empty;
    public string ToolName { get; set; } = string.Empty;
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

public class LabAgentOrchestrator
{
    private readonly PrescriptionVisionTool _visionTool;
    private readonly LabSafetyRulesTool _safetyTool;
    private readonly SmartQueueOptimizerTool _queueTool;
    private readonly PatientPrepGeneratorTool _prepTool;
    private readonly ILogger<LabAgentOrchestrator> _logger;

    public LabAgentOrchestrator(
        PrescriptionVisionTool visionTool,
        LabSafetyRulesTool safetyTool,
        SmartQueueOptimizerTool queueTool,
        PatientPrepGeneratorTool prepTool,
        ILogger<LabAgentOrchestrator> logger)
    {
        _visionTool = visionTool;
        _safetyTool = safetyTool;
        _queueTool = queueTool;
        _prepTool = prepTool;
        _logger = logger;
    }

    public async Task ProcessBookingWorkflowAsync(ApplicationDbContext db, Guid bookingId)
    {
        var booking = await db.LabBookings.Include(b => b.LabTest).FirstOrDefaultAsync(b => b.Id == bookingId);
        if (booking == null) return;

        _logger.LogInformation("[LabAgentOrchestrator] Starting multi-agent diagnostic & queue workflow for Booking ID {Id}", bookingId);

        // Fetch recent patient test history for duplicate check
        var recentTests = await db.LabBookings
            .Where(b => b.PatientId == booking.PatientId && b.Id != bookingId && b.CreatedAt >= DateTime.UtcNow.AddDays(-30))
            .Include(b => b.LabTest)
            .Select(b => b.LabTest.Name)
            .ToListAsync();

        // Calculate sequence number for slot
        var existingCount = await db.LabBookings
            .CountAsync(b => b.BookingDate == booking.BookingDate && b.TimeSlot == booking.TimeSlot);

        var dailySeqCount = await db.LabBookings
            .CountAsync(b => b.BookingDate == booking.BookingDate);

        var input = new ToolInput
        {
            BookingId = booking.Id,
            PatientName = booking.PatientName,
            PatientAge = 35, // Default patient age
            TestName = booking.LabTest.Name,
            TestCategory = booking.LabTest.Category,
            TestIsRestricted = booking.LabTest.IsRestricted,
            PrescriptionImageUrl = booking.PrescriptionImageUrl,
            BookingDate = booking.BookingDate,
            TimeSlot = booking.TimeSlot,
            ExistingBookingsInSlot = existingCount,
            DailySequenceNo = dailySeqCount + 1,
            RecentPatientTests = recentTests
        };

        var state = new AgentWorkflowState
        {
            Objective = $"Validate prescription, evaluate medical safety, and optimize phlebotomy queue for '{booking.LabTest.Name}'",
            ExecutionPlan = new List<string>
            {
                "1. Prescription OCR & Document Verification",
                "2. Deterministic Safety & Fasting Check",
                "3. Smart Queue & Phlebotomy Chair Load Balancing",
                "4. Patient Preparation Guidelines Generation"
            }
        };

        // Step 1: Prescription OCR Scan (If restricted or image attached)
        ToolResult ocrResult;
        if (!string.IsNullOrEmpty(booking.PrescriptionImageUrl) || booking.LabTest.IsRestricted)
        {
            ocrResult = await _visionTool.ExecuteAsync(input);
            state.StepLogs.Add(new AgentWorkflowStepLog
            {
                StepName = "Prescription OCR Verification",
                ToolName = _visionTool.Name,
                Success = ocrResult.Success,
                Confidence = ocrResult.Confidence,
                Message = ocrResult.StatusMessage,
                Details = ocrResult.Data
            });

            if (ocrResult.Data is JsonElement element)
            {
                if (element.TryGetProperty("doctorName", out var doc)) booking.AIExtractedDoctorName = doc.GetString();
                if (element.TryGetProperty("prescriptionDate", out var pd) && DateOnly.TryParse(pd.GetString(), out var parsedPd))
                    booking.AIPrescriptionDate = parsedPd;
            }
        }
        else
        {
            ocrResult = new ToolResult { Success = true, Confidence = 1.0, StatusMessage = "Prescription upload not required." };
            state.StepLogs.Add(new AgentWorkflowStepLog
            {
                StepName = "Prescription OCR Verification",
                ToolName = "Bypass",
                Success = true,
                Confidence = 1.0,
                Message = "Standard unrestricted test. Prescription OCR skipped."
            });
        }

        // Step 2: Safety & Fasting Rules Tool
        var safetyResult = await _safetyTool.ExecuteAsync(input);
        state.StepLogs.Add(new AgentWorkflowStepLog
        {
            StepName = "Medical Safety & Fasting Check",
            ToolName = _safetyTool.Name,
            Success = safetyResult.Success,
            Confidence = safetyResult.Confidence,
            Message = safetyResult.StatusMessage,
            Details = safetyResult.Data
        });

        // Step 3: Smart Queue & Chair Optimizer Tool
        var queueResult = await _queueTool.ExecuteAsync(input);
        state.StepLogs.Add(new AgentWorkflowStepLog
        {
            StepName = "Smart Queue & Chair Optimization",
            ToolName = _queueTool.Name,
            Success = queueResult.Success,
            Confidence = queueResult.Confidence,
            Message = queueResult.StatusMessage,
            Details = queueResult.Data
        });

        if (queueResult.Data is not null)
        {
            var json = JsonSerializer.Serialize(queueResult.Data);
            var queueDoc = JsonSerializer.Deserialize<JsonElement>(json);
            booking.QueueToken = queueDoc.GetProperty("queueToken").GetString();
            booking.PriorityTier = queueDoc.GetProperty("priorityTier").GetString();
            booking.EstimatedServiceDurationMinutes = queueDoc.GetProperty("estimatedServiceDurationMinutes").GetInt32();
            booking.EstimatedWaitMinutes = queueDoc.GetProperty("estimatedWaitMinutes").GetInt32();
            booking.AssignedChairNo = queueDoc.GetProperty("assignedChairNo").GetInt32();
        }

        // Step 4: Patient Prep Guidelines Tool
        var prepResult = await _prepTool.ExecuteAsync(input);
        state.StepLogs.Add(new AgentWorkflowStepLog
        {
            StepName = "Patient Prep Generation",
            ToolName = _prepTool.Name,
            Success = prepResult.Success,
            Confidence = prepResult.Confidence,
            Message = prepResult.StatusMessage,
            Details = prepResult.Data
        });

        // Synthesize Overall Recommendation
        var isOcrValid = ocrResult.Success && ocrResult.Confidence >= 0.7;
        state.OverallConfidence = Math.Min(ocrResult.Confidence, safetyResult.Confidence);

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
        booking.AIVerificationNotes = $"[Token {booking.QueueToken}] {safetyResult.StatusMessage} | {prepResult.StatusMessage}";
        booking.Status = booking.LabTest.IsRestricted ? BookingStatus.PendingLabApproval : BookingStatus.Confirmed;
        booking.AgentWorkflowStateJson = JsonSerializer.Serialize(state);
        booking.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();
        _logger.LogInformation("[LabAgentOrchestrator] Completed workflow for Booking {Id}. Token: {Token}, Status: {Status}", bookingId, booking.QueueToken, booking.AIVerification);
    }
}
