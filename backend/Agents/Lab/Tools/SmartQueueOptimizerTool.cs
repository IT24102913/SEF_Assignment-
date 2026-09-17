namespace HealthBridge.Api.Agents.Lab.Tools;

public class SmartQueueOptimizerTool : IAgentTool
{
    public string Name => "SmartQueueAndSlotOptimizer";
    public string Description => "Calculates collection service duration, load-balances phlebotomy chairs, assigns queue priority tiers, and generates token numbers.";

    public Task<ToolResult> ExecuteAsync(ToolInput input)
    {
        var testLower = input.TestName.ToLowerInvariant();
        var isFasting = testLower.Contains("lipid") || testLower.Contains("fasting") || testLower.Contains("fbs");
        var isElderly = input.PatientAge >= 65;

        // 1. Service Duration Math
        int durationMinutes = 8; // Base blood draw
        if (input.TestIsRestricted) durationMinutes += 5;
        if (isFasting) durationMinutes += 4;

        // 2. Priority Tier & Token Prefix
        string priorityTier = "ROUTINE";
        string tokenPrefix = "R";

        if (isFasting)
        {
            priorityTier = "FASTING_PRIORITY";
            tokenPrefix = "F";
        }
        else if (isElderly)
        {
            priorityTier = "GERIATRIC_PRIORITY";
            tokenPrefix = "G";
        }
        else if (input.TestIsRestricted)
        {
            priorityTier = "SPECIALIZED_PRIORITY";
            tokenPrefix = "S";
        }

        int seqNo = input.DailySequenceNo > 0 ? input.DailySequenceNo : (input.ExistingBookingsInSlot + 1);
        string queueToken = $"{tokenPrefix}-{seqNo:D3}";

        // 3. Phlebotomy Chair Load Balancing (3 chairs available)
        int assignedChairNo = (seqNo % 3) + 1;

        // 4. Estimated Wait Time Math
        int estWaitMinutes = Math.Max(0, (input.ExistingBookingsInSlot * durationMinutes) / 3);

        return Task.FromResult(new ToolResult
        {
            Success = true,
            ToolName = Name,
            StatusMessage = $"Assigned Queue Token {queueToken} ({priorityTier}). Est. Wait: {estWaitMinutes} mins at Chair #{assignedChairNo}.",
            Confidence = 1.0,
            Data = new
            {
                queueToken,
                priorityTier,
                estimatedServiceDurationMinutes = durationMinutes,
                estimatedWaitMinutes = estWaitMinutes,
                assignedChairNo,
                chairCapacityNotice = input.ExistingBookingsInSlot >= 4 ? "High slot occupancy. Priority queuing engaged." : "Normal slot flow."
            }
        });
    }
}
