namespace HealthBridge.Api.Agents.Lab.Tools;

public class PatientPrepGeneratorTool : IAgentTool
{
    public string Name => "PatientPrepGenerator";
    public string Description => "Generates personalized pre-diagnostic patient guidelines and collection protocols.";

    public Task<ToolResult> ExecuteAsync(ToolInput input)
    {
        var testLower = input.TestName.ToLowerInvariant();
        var guidelines = new List<string>();

        if (testLower.Contains("lipid") || testLower.Contains("cholesterol"))
        {
            guidelines.Add("Fast for 10-12 hours prior to collection. Plain water is permitted.");
            guidelines.Add("Avoid alcohol consumption for 24 hours prior to blood sample collection.");
        }
        else if (testLower.Contains("fasting") || testLower.Contains("fbs") || testLower.Contains("glucose"))
        {
            guidelines.Add("Do not eat or drink anything except plain water for 8-10 hours prior to morning collection.");
        }
        else if (testLower.Contains("creatinine") || testLower.Contains("kidney") || testLower.Contains("renal"))
        {
            guidelines.Add("Ensure adequate hydration before sample collection.");
            guidelines.Add("Avoid heavy strenuous physical exercise 24 hours prior.");
        }
        else
        {
            guidelines.Add("Routine specimen collection. No fasting required.");
            guidelines.Add("Please arrive 10 minutes prior to your allocated time slot with valid photo ID.");
        }

        if (input.TestIsRestricted)
        {
            guidelines.Add("Bring physical doctor prescription document or doctor's digital referral form for technician verification.");
        }

        return Task.FromResult(new ToolResult
        {
            Success = true,
            ToolName = Name,
            StatusMessage = "Personalized patient preparation guidelines generated.",
            Confidence = 1.0,
            Data = new
            {
                instructions = guidelines,
                formattedText = string.Join(" • ", guidelines)
            }
        });
    }
}
