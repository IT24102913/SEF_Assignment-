namespace HealthBridge.Api.DTOs.EMR;

public class AIClinicalInsightResponse
{
    public string PatientCode { get; set; } = string.Empty;
    public string PatientName { get; set; } = string.Empty;
    public int Age { get; set; }
    public string Gender { get; set; } = string.Empty;
    public string BloodGroup { get; set; } = string.Empty;
    public string Allergies { get; set; } = string.Empty;
    public string ChronicConditions { get; set; } = string.Empty;

    // Condition Synthesis
    public string OverallConditionSummary { get; set; } = string.Empty;
    public string HealthStatusLevel { get; set; } = "Stable"; // "Stable", "Monitoring Required", "Attention Needed"

    // Doctor Consultation Insights ("What Doctor Said")
    public List<AIDoctorInsightDto> DoctorInsights { get; set; } = new();

    // Lab Reports Explanation
    public List<AILabReportInsightDto> LabReportInsights { get; set; } = new();

    // Medications & Prescriptions Explanation
    public List<AIMedicationInsightDto> MedicationInsights { get; set; } = new();

    // Safety and Contraindications
    public List<string> SafetyAlerts { get; set; } = new();

    // Recommended Actions & Next Steps
    public List<string> ActionableNextSteps { get; set; } = new();
    public List<string> QuestionsForNextVisit { get; set; } = new();

    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
    public string EngineUsed { get; set; } = "HealthBridge Agentic Clinical AI";
}

public class AIDoctorInsightDto
{
    public string DoctorName { get; set; } = string.Empty;
    public string Designation { get; set; } = string.Empty;
    public DateTime VisitDate { get; set; }
    public string Diagnosis { get; set; } = string.Empty;
    public string WhatDoctorSaidPlainEnglish { get; set; } = string.Empty;
    public string KeyTakeaway { get; set; } = string.Empty;
    public string RecommendedTestsAdvice { get; set; } = string.Empty;
}

public class AILabReportInsightDto
{
    public Guid ReportId { get; set; }
    public string TestTitle { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public DateTime ReportDate { get; set; }
    public string Status { get; set; } = "Completed";
    public string FindingsSummary { get; set; } = string.Empty;
    public string WhatThisTestMeansPlainEnglish { get; set; } = string.Empty;
    public string ClinicalSignificance { get; set; } = string.Empty;
    public bool RequiresAttention { get; set; } = false;
}

public class AIMedicationInsightDto
{
    public Guid PrescriptionId { get; set; }
    public string MedicationName { get; set; } = string.Empty;
    public string Dosage { get; set; } = string.Empty;
    public string Duration { get; set; } = string.Empty;
    public string PrescribedDoctor { get; set; } = string.Empty;
    public string PurposeAndHowItWorks { get; set; } = string.Empty;
    public string UsageInstructionsAndTips { get; set; } = string.Empty;
    public string Status { get; set; } = "Active";
}

public class AskAIAgentRequest
{
    public string? PatientCode { get; set; }
    public string Question { get; set; } = string.Empty;
}

public class AskAIAgentResponse
{
    public string Question { get; set; } = string.Empty;
    public string Answer { get; set; } = string.Empty;
    public List<string> ClinicalReferences { get; set; } = new();
    public DateTime AnsweredAt { get; set; } = DateTime.UtcNow;
}
