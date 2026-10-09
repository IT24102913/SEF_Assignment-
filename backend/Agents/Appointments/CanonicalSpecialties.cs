namespace HealthBridge.Api.Agents.Appointments;

/// <summary>
/// Canonical clinical specialties recognized across Health Bridge appointment channeling.
/// Shared by ClinicalTriageAgent, DoctorSlotAllocationAgent, and RecommendationValidationAgent.
/// </summary>
public static class CanonicalSpecialties
{
    public static readonly string[] AllowedSpecialties =
    [
        "Cardiology",
        "Neurology",
        "Orthopaedics",
        "Paediatrics",
        "Gynaecology",
        "Dermatology",
        "ENT",
        "General Medicine"
    ];

    private static readonly HashSet<string> Set = new(AllowedSpecialties, StringComparer.OrdinalIgnoreCase);

    public static bool IsValid(string? specialty) =>
        !string.IsNullOrWhiteSpace(specialty) && Set.Contains(specialty.Trim());

    public static string? Normalize(string? specialty)
    {
        if (string.IsNullOrWhiteSpace(specialty)) return null;
        var trimmed = specialty.Trim();
        foreach (var s in AllowedSpecialties)
        {
            if (string.Equals(s, trimmed, StringComparison.OrdinalIgnoreCase))
                return s;
        }
        return null;
    }
}
