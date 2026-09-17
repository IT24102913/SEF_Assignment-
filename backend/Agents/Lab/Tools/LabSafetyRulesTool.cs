namespace HealthBridge.Api.Agents.Lab.Tools;

public class LabSafetyRulesTool : IAgentTool
{
    public string Name => "LabSafetyAndPrepRules";
    public string Description => "Applies deterministic medical safety rules, fasting requirement detection, and duplicate booking checks.";

    public Task<ToolResult> ExecuteAsync(ToolInput input)
    {
        var testLower = input.TestName.ToLowerInvariant();
        var catLower = input.TestCategory.ToLowerInvariant();

        var requiresFasting = testLower.Contains("lipid") ||
                              testLower.Contains("fasting") ||
                              testLower.Contains("fbs") ||
                              testLower.Contains("glucose") ||
                              testLower.Contains("iron") ||
                              testLower.Contains("triglyceride");

        var requiredFastingHours = requiresFasting ? (testLower.Contains("lipid") ? 12 : 8) : 0;

        // Check for duplicate test in recent bookings
        var isDuplicate = input.RecentPatientTests.Any(t => t.Equals(input.TestName, StringComparison.OrdinalIgnoreCase));

        // Age considerations
        var requiresPediatricAttendant = input.PatientAge < 12;
        var isGeriatricPriority = input.PatientAge >= 65;

        var safetyFlags = new List<string>();
        if (requiresFasting) safetyFlags.Add($"Fasting required: {requiredFastingHours} hours prior to sample collection.");
        if (isDuplicate) safetyFlags.Add($"Warning: Similar test '{input.TestName}' was booked by patient recently.");
        if (requiresPediatricAttendant) safetyFlags.Add("Pediatric protocol: Guardian presence required during collection.");
        if (isGeriatricPriority) safetyFlags.Add("Geriatric priority queueing recommended.");

        return Task.FromResult(new ToolResult
        {
            Success = true,
            ToolName = Name,
            StatusMessage = safetyFlags.Count > 0 ? string.Join(" | ", safetyFlags) : "No special safety flags.",
            Confidence = 1.0,
            Data = new
            {
                requiresFasting,
                requiredFastingHours,
                isDuplicate,
                requiresPediatricAttendant,
                isGeriatricPriority,
                safetyFlags
            }
        });
    }
}
