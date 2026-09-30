namespace HealthBridge.Api.Agents.Lab;

/// <summary>
/// Input contract for the LabQueueAndSafetyAgent.
/// </summary>
public class LabQueueSafetyInput
{
    public Guid BookingId { get; set; }
    public string PatientName { get; set; } = string.Empty;
    public int PatientAge { get; set; } = 35;
    public string TestName { get; set; } = string.Empty;
    public string TestCategory { get; set; } = string.Empty;
    public bool TestIsRestricted { get; set; }
    public DateOnly BookingDate { get; set; }
    public TimeOnly TimeSlot { get; set; }
    public int ExistingBookingsInSlot { get; set; }
    public int DailySequenceNo { get; set; }
    public List<string> RecentPatientTests { get; set; } = new();
}

/// <summary>
/// Output contract for the LabQueueAndSafetyAgent.
/// </summary>
public class LabQueueSafetyOutput
{
    public bool Success { get; set; } = true;
    public double Confidence { get; set; } = 1.0;
    public string QueueToken { get; set; } = string.Empty;
    public string PriorityTier { get; set; } = "ROUTINE";
    public int AssignedChairNo { get; set; } = 1;
    public int EstimatedServiceDurationMinutes { get; set; } = 10;
    public int EstimatedWaitMinutes { get; set; } = 0;
    public bool RequiresFasting { get; set; }
    public int RequiredFastingHours { get; set; }
    public bool IsDuplicateRecentTest { get; set; }
    public List<string> SafetyFlags { get; set; } = new();
    public List<string> PatientPrepGuidelines { get; set; } = new();
    public string StatusMessage { get; set; } = string.Empty;
    public string AuditLog { get; set; } = string.Empty;
}

/// <summary>
/// LabQueueAndSafetyAgent — Specialized Clinical Operations & Patient Safety AI (Agent 2 of 2 in Lab Management).
/// 
/// Core Responsibilities:
/// 1. Deterministic safety evaluation: Fasting requirements (8-12 hrs), duplicate booking detection within 30 days, pediatric & geriatric flags.
/// 2. Phlebotomy operations optimization: Multi-chair load balancing (Chairs 1–3), slot contention resolution, and wait time calculation.
/// 3. Intelligent priority tiering: Generates token numbers based on triage urgency (F=Fasting, G=Geriatric, S=Specialized, R=Routine).
/// 4. Patient diagnostic preparation: Generates clear, test-specific preparation protocols (fasting, hydration, medication notices).
/// </summary>
public class LabQueueAndSafetyAgent
{
    public string AgentName => "LabQueueAndSafetyAgent";
    public string Role => "Phlebotomy Operations & Patient Safety AI";

    private readonly ILogger<LabQueueAndSafetyAgent> _logger;

    public LabQueueAndSafetyAgent(ILogger<LabQueueAndSafetyAgent> logger)
    {
        _logger = logger;
    }

    public Task<LabQueueSafetyOutput> EvaluateAndOptimizeAsync(LabQueueSafetyInput input)
    {
        _logger.LogInformation("[{Agent}] Optimizing queue & evaluating clinical safety for booking {BookingId}, test: '{TestName}'",
            AgentName, input.BookingId, input.TestName);

        var testLower = input.TestName.ToLowerInvariant();
        var catLower = input.TestCategory.ToLowerInvariant();

        // 1. Clinical Safety & Fasting Analysis
        var requiresFasting = testLower.Contains("lipid") ||
                              testLower.Contains("fasting") ||
                              testLower.Contains("fbs") ||
                              testLower.Contains("glucose") ||
                              testLower.Contains("iron") ||
                              testLower.Contains("triglyceride");

        var fastingHours = requiresFasting ? (testLower.Contains("lipid") ? 12 : 8) : 0;
        var isDuplicate = input.RecentPatientTests.Any(t => t.Equals(input.TestName, StringComparison.OrdinalIgnoreCase));
        var isElderly = input.PatientAge >= 65;
        var isPediatric = input.PatientAge < 12;

        var safetyFlags = new List<string>();
        if (requiresFasting) safetyFlags.Add($"Fasting requirement: {fastingHours} hours prior to blood collection.");
        if (isDuplicate) safetyFlags.Add($"Duplicate order alert: Test '{input.TestName}' was booked by patient within the last 30 days.");
        if (isPediatric) safetyFlags.Add("Pediatric protocol: Guardian presence required during collection.");
        if (isElderly) safetyFlags.Add("Geriatric priority protocol applied.");

        // 2. Service Duration Math
        int durationMinutes = 8; // Base blood draw
        if (input.TestIsRestricted) durationMinutes += 5;
        if (requiresFasting) durationMinutes += 4;

        // 3. Priority Tier & Token Generation
        string priorityTier;
        string tokenPrefix;

        if (requiresFasting)
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
        else
        {
            priorityTier = "ROUTINE";
            tokenPrefix = "R";
        }

        int seqNo = input.DailySequenceNo > 0 ? input.DailySequenceNo : (input.ExistingBookingsInSlot + 1);
        string queueToken = $"{tokenPrefix}-{seqNo:D3}";

        // 4. Phlebotomy Chair Load Balancing (3 dedicated chairs)
        int assignedChairNo = (seqNo % 3) + 1;

        // 5. Estimated Wait Time
        int estWaitMinutes = Math.Max(0, (input.ExistingBookingsInSlot * durationMinutes) / 3);

        // 6. Patient Preparation Guidelines
        var prepGuidelines = new List<string>();
        if (testLower.Contains("lipid") || testLower.Contains("cholesterol"))
        {
            prepGuidelines.Add("Strict fasting for 10-12 hours prior to collection. Plain water is permitted.");
            prepGuidelines.Add("Avoid alcohol consumption for 24 hours prior to blood sample collection.");
        }
        else if (testLower.Contains("fasting") || testLower.Contains("fbs") || testLower.Contains("glucose"))
        {
            prepGuidelines.Add("Do not consume food or beverages except plain water for 8-10 hours prior to morning collection.");
        }
        else if (testLower.Contains("creatinine") || testLower.Contains("kidney") || testLower.Contains("renal"))
        {
            prepGuidelines.Add("Ensure adequate water hydration before sample collection.");
            prepGuidelines.Add("Avoid heavy strenuous physical exercise 24 hours prior.");
        }
        else
        {
            prepGuidelines.Add("Routine diagnostic collection. No dietary fasting required.");
            prepGuidelines.Add("Please arrive 10 minutes prior to your allocated time slot.");
        }

        if (input.TestIsRestricted)
        {
            prepGuidelines.Add("Please bring physical doctor referral / prescription for technician verification.");
        }

        var statusMessage = $"Queue Token {queueToken} ({priorityTier}) assigned to Chair #{assignedChairNo}. Est. wait {estWaitMinutes} mins.";
        if (safetyFlags.Count > 0)
        {
            statusMessage += $" | Flags: {string.Join("; ", safetyFlags)}";
        }

        return Task.FromResult(new LabQueueSafetyOutput
        {
            Success = true,
            Confidence = 1.0,
            QueueToken = queueToken,
            PriorityTier = priorityTier,
            AssignedChairNo = assignedChairNo,
            EstimatedServiceDurationMinutes = durationMinutes,
            EstimatedWaitMinutes = estWaitMinutes,
            RequiresFasting = requiresFasting,
            RequiredFastingHours = fastingHours,
            IsDuplicateRecentTest = isDuplicate,
            SafetyFlags = safetyFlags,
            PatientPrepGuidelines = prepGuidelines,
            StatusMessage = statusMessage,
            AuditLog = $"Executed at {DateTime.UtcNow:O} by {AgentName}"
        });
    }
}
