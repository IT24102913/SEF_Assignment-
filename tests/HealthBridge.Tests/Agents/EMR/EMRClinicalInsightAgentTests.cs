using HealthBridge.Api.Agents.EMR;
using HealthBridge.Api.Models.EMR;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Xunit;

namespace HealthBridge.Tests.Agents.EMR;

public class EMRClinicalInsightAgentTests
{
    private EMRClinicalInsightAgent CreateAgent()
    {
        var mockConfig = new Mock<IConfiguration>();
        // Empty API key triggers deterministic heuristic clinical engine
        mockConfig.Setup(c => c["Gemini:ApiKey"]).Returns((string?)null);
        mockConfig.Setup(c => c["GeminiApiKey"]).Returns((string?)null);
        mockConfig.Setup(c => c["Google:ApiKey"]).Returns((string?)null);

        var mockHttpClientFactory = new Mock<IHttpClientFactory>();
        mockHttpClientFactory.Setup(f => f.CreateClient(It.IsAny<string>()))
            .Returns(new HttpClient());

        return new EMRClinicalInsightAgent(
            mockConfig.Object,
            NullLogger<EMRClinicalInsightAgent>.Instance,
            mockHttpClientFactory.Object
        );
    }

    [Fact]
    public async Task AnalyzePatientRecords_RoutinePatient_ReturnsRoutineHealthMaintenance()
    {
        // Arrange
        var agent = CreateAgent();
        var patient = new Patient
        {
            Id = Guid.NewGuid(),
            PatientCode = "PAT-1001",
            FullName = "Jerad Xavier",
            Gender = "Male",
            DateOfBirth = new DateTime(1998, 5, 20),
            BloodGroup = "O+",
            Allergies = "None",
            ChronicConditions = "None",
            Prescriptions = new List<Prescription>(),
            LabReports = new List<LabReport>(),
            ConsultationNotes = new List<ConsultationNote>()
        };

        // Act
        var result = await agent.AnalyzePatientRecordsAsync(patient);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("PAT-1001", result.PatientCode);
        Assert.Equal("Jerad Xavier", result.PatientName);
        Assert.Equal("Routine Health Maintenance", result.HealthStatusLevel);
        Assert.Contains("routine health maintenance", result.OverallConditionSummary, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task AnalyzePatientRecords_ManyActiveMedsOrPendingLabs_ReturnsMonitoringRequired()
    {
        // Arrange
        var agent = CreateAgent();
        var patient = new Patient
        {
            Id = Guid.NewGuid(),
            PatientCode = "PAT-1002",
            FullName = "Kamal Perera",
            Gender = "Male",
            DateOfBirth = new DateTime(1975, 3, 10),
            BloodGroup = "A+",
            Allergies = "None",
            Prescriptions = new List<Prescription>
            {
                new() { MedicationName = "Metformin 500mg", Status = "Active" },
                new() { MedicationName = "Amlodipine 5mg", Status = "Active" },
                new() { MedicationName = "Atorvastatin 20mg", Status = "Active" },
                new() { MedicationName = "Omeprazole 20mg", Status = "Active" }
            },
            LabReports = new List<LabReport>
            {
                new() { TestTitle = "Fasting Blood Sugar", Category = "Biochemistry", Status = "Pending" }
            }
        };

        // Act
        var result = await agent.AnalyzePatientRecordsAsync(patient);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("Monitoring Required", result.HealthStatusLevel);
        Assert.Contains("active clinical care", result.OverallConditionSummary, StringComparison.OrdinalIgnoreCase);
        Assert.NotEmpty(result.ActionableNextSteps);
    }

    [Fact]
    public async Task AnalyzePatientRecords_PenicillinAllergyWithAmoxicillin_TriggersCriticalSafetyAlert()
    {
        // Arrange
        var agent = CreateAgent();
        var patient = new Patient
        {
            Id = Guid.NewGuid(),
            PatientCode = "PAT-1003",
            FullName = "Sunil Silva",
            Allergies = "Penicillin",
            Prescriptions = new List<Prescription>
            {
                new() { MedicationName = "Amoxicillin 500mg", Status = "Active" }
            }
        };

        // Act
        var result = await agent.AnalyzePatientRecordsAsync(patient);

        // Assert
        Assert.NotNull(result);
        var allergyAlert = result.SafetyAlerts.FirstOrDefault(a => a.Contains("CRITICAL CAUTION"));
        Assert.NotNull(allergyAlert);
        Assert.Contains("Penicillin", allergyAlert);
        Assert.Contains("Amoxicillin 500mg", allergyAlert);
    }

    [Fact]
    public async Task AnalyzePatientRecords_NSAIDAllergyWithIbuprofen_TriggersCriticalSafetyAlert()
    {
        // Arrange
        var agent = CreateAgent();
        var patient = new Patient
        {
            Id = Guid.NewGuid(),
            PatientCode = "PAT-1004",
            FullName = "Nimal Fernando",
            Allergies = "NSAIDs, Aspirin",
            Prescriptions = new List<Prescription>
            {
                new() { MedicationName = "Ibuprofen 400mg", Status = "Active" }
            }
        };

        // Act
        var result = await agent.AnalyzePatientRecordsAsync(patient);

        // Assert
        Assert.NotNull(result);
        var alert = result.SafetyAlerts.FirstOrDefault(a => a.Contains("CRITICAL CAUTION"));
        Assert.NotNull(alert);
        Assert.Contains("Ibuprofen", alert);
    }

    [Theory]
    [InlineData("Hypertension", "elevated blood pressure")]
    [InlineData("Type 2 Diabetes Mellitus", "blood sugar regulation")]
    [InlineData("Acute Respiratory Infection", "bacterial or inflammatory")]
    [InlineData("Chronic Gastritis", "stomach acid irritation")]
    public async Task AnalyzePatientRecords_ExplainsDiagnosisInPlainEnglish(string diagnosis, string expectedConcept)
    {
        // Arrange
        var agent = CreateAgent();
        var patient = new Patient
        {
            PatientCode = "PAT-1005",
            FullName = "Test Patient",
            ConsultationNotes = new List<ConsultationNote>
            {
                new()
                {
                    DoctorName = "Dr. Silva",
                    Diagnosis = diagnosis,
                    ClinicalNotes = "Routine check",
                    ConsultationDate = DateTime.UtcNow
                }
            }
        };

        // Act
        var result = await agent.AnalyzePatientRecordsAsync(patient);

        // Assert
        Assert.Single(result.DoctorInsights);
        var insight = result.DoctorInsights[0];
        Assert.Contains(expectedConcept, insight.WhatDoctorSaidPlainEnglish, StringComparison.OrdinalIgnoreCase);
    }

    [Theory]
    [InlineData("Complete Blood Count (CBC)", "red blood cells")]
    [InlineData("Lipid Profile", "cholesterol fractions")]
    [InlineData("Fasting Blood Glucose", "concentration of sugar in your blood")]
    [InlineData("Liver Function Test (LFT)", "liver enzymes")]
    [InlineData("Renal Function Test (KFT)", "filtration rate")]
    [InlineData("Routine Urinalysis", "microscopic markers")]
    public async Task AnalyzePatientRecords_ExplainsLabTestsInPlainEnglish(string testTitle, string expectedMeaning)
    {
        // Arrange
        var agent = CreateAgent();
        var patient = new Patient
        {
            PatientCode = "PAT-1006",
            FullName = "Test Patient",
            LabReports = new List<LabReport>
            {
                new()
                {
                    TestTitle = testTitle,
                    Category = "Hematology",
                    ReportDate = DateTime.UtcNow,
                    ResultsSummary = "All parameters normal."
                }
            }
        };

        // Act
        var result = await agent.AnalyzePatientRecordsAsync(patient);

        // Assert
        Assert.Single(result.LabReportInsights);
        var lab = result.LabReportInsights[0];
        Assert.Contains(expectedMeaning, lab.WhatThisTestMeansPlainEnglish, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task AnalyzePatientRecords_AbnormalLabResult_MarksRequiresAttention()
    {
        // Arrange
        var agent = CreateAgent();
        var patient = new Patient
        {
            PatientCode = "PAT-1007",
            FullName = "Test Patient",
            LabReports = new List<LabReport>
            {
                new()
                {
                    TestTitle = "Fasting Blood Glucose",
                    Category = "Biochemistry",
                    ReportDate = DateTime.UtcNow,
                    ResultsSummary = "Significantly elevated fasting blood sugar (165 mg/dL)."
                }
            }
        };

        // Act
        var result = await agent.AnalyzePatientRecordsAsync(patient);

        // Assert
        Assert.Single(result.LabReportInsights);
        Assert.True(result.LabReportInsights[0].RequiresAttention);
    }

    [Fact]
    public async Task AnswerQuestionAsync_RegardingPrescribedMedication_ReturnsMedicationGuidance()
    {
        // Arrange
        var agent = CreateAgent();
        var patient = new Patient
        {
            PatientCode = "PAT-1008",
            FullName = "Jerad Xavier",
            Prescriptions = new List<Prescription>
            {
                new()
                {
                    MedicationName = "Amoxicillin 500mg",
                    Dosage = "1 capsule tid",
                    Duration = "7 days",
                    PrescribedDoctor = "Dr. Perera",
                    Status = "Active"
                }
            }
        };

        // Act
        var response = await agent.AnswerQuestionAsync(patient, "How should I take Amoxicillin with food?");

        // Assert
        Assert.NotNull(response);
        Assert.Contains("Amoxicillin", response.Answer);
        Assert.Contains("meals", response.Answer, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("Prescription: Amoxicillin 500mg (1 capsule tid)", response.ClinicalReferences[0]);
    }

    [Fact]
    public async Task AnswerQuestionAsync_RegardingLabReport_ReturnsDiagnosticContext()
    {
        // Arrange
        var agent = CreateAgent();
        var patient = new Patient
        {
            PatientCode = "PAT-1009",
            FullName = "Jerad Xavier",
            LabReports = new List<LabReport>
            {
                new()
                {
                    TestTitle = "Lipid Panel",
                    Category = "Biochemistry",
                    ReportDate = new DateTime(2026, 9, 20),
                    Status = "Completed",
                    ResultsSummary = "Triglycerides slightly high."
                }
            }
        };

        // Act
        var response = await agent.AnswerQuestionAsync(patient, "What does my Lipid Panel mean?");

        // Assert
        Assert.NotNull(response);
        Assert.Contains("Lipid Panel", response.Answer);
        Assert.Contains("Triglycerides slightly high", response.Answer);
        Assert.Contains("Lab Report: Lipid Panel", response.ClinicalReferences[0]);
    }

    [Fact]
    public async Task AnswerQuestionAsync_GeneralHealthOverview_SummarizesActiveRecords()
    {
        // Arrange
        var agent = CreateAgent();
        var patient = new Patient
        {
            PatientCode = "PAT-1010",
            FullName = "Jerad Xavier",
            ChronicConditions = "Hypertension",
            Allergies = "Dust",
            Prescriptions = new List<Prescription>
            {
                new() { MedicationName = "Amlodipine 5mg", Status = "Active" }
            },
            LabReports = new List<LabReport>
            {
                new() { TestTitle = "Blood Pressure Profile", Status = "Completed" }
            }
        };

        // Act
        var response = await agent.AnswerQuestionAsync(patient, "Can you summarize my health condition today?");

        // Assert
        Assert.NotNull(response);
        Assert.Contains("1 active prescription", response.Answer);
        Assert.Contains("Hypertension", response.Answer);
        Assert.Contains("Dust", response.Answer);
    }

    [Fact]
    public async Task AnalyzePatientRecords_SulfaAllergyWithSulfamethoxazole_TriggersCriticalSafetyAlert()
    {
        // Arrange
        var agent = CreateAgent();
        var patient = new Patient
        {
            PatientCode = "PAT-1011",
            FullName = "Jerad Xavier",
            Allergies = "Sulfa drugs",
            Prescriptions = new List<Prescription>
            {
                new() { MedicationName = "Sulfamethoxazole 400mg", Status = "Active" }
            }
        };

        // Act
        var result = await agent.AnalyzePatientRecordsAsync(patient);

        // Assert
        var alert = result.SafetyAlerts.FirstOrDefault(a => a.Contains("CRITICAL CAUTION"));
        Assert.NotNull(alert);
        Assert.Contains("Sulfamethoxazole", alert);
    }

    [Fact]
    public async Task AnalyzePatientRecords_OmeprazolePrescription_ProvidesGastricAcidReductionAndTips()
    {
        // Arrange
        var agent = CreateAgent();
        var patient = new Patient
        {
            PatientCode = "PAT-1012",
            FullName = "Jerad Xavier",
            Prescriptions = new List<Prescription>
            {
                new() { MedicationName = "Omeprazole 20mg", Dosage = "1 capsule daily", Status = "Active" }
            }
        };

        // Act
        var result = await agent.AnalyzePatientRecordsAsync(patient);

        // Assert
        Assert.Single(result.MedicationInsights);
        var med = result.MedicationInsights[0];
        Assert.Contains("Proton Pump Inhibitor", med.PurposeAndHowItWorks);
        Assert.Contains("before breakfast", med.UsageInstructionsAndTips, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task AnalyzePatientRecords_MetforminPrescription_ProvidesAntidiabeticGuidance()
    {
        // Arrange
        var agent = CreateAgent();
        var patient = new Patient
        {
            PatientCode = "PAT-1013",
            FullName = "Jerad Xavier",
            Prescriptions = new List<Prescription>
            {
                new() { MedicationName = "Metformin 500mg", Dosage = "1 tab bid", Status = "Active" }
            }
        };

        // Act
        var result = await agent.AnalyzePatientRecordsAsync(patient);

        // Assert
        Assert.Single(result.MedicationInsights);
        var med = result.MedicationInsights[0];
        Assert.Contains("Antidiabetic", med.PurposeAndHowItWorks);
        Assert.Contains("meals", med.UsageInstructionsAndTips, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task AnalyzePatientRecords_AtorvastatinPrescription_AdvisesEveningDosing()
    {
        // Arrange
        var agent = CreateAgent();
        var patient = new Patient
        {
            PatientCode = "PAT-1014",
            FullName = "Jerad Xavier",
            Prescriptions = new List<Prescription>
            {
                new() { MedicationName = "Atorvastatin 20mg", Dosage = "1 tab nocte", Status = "Active" }
            }
        };

        // Act
        var result = await agent.AnalyzePatientRecordsAsync(patient);

        // Assert
        Assert.Single(result.MedicationInsights);
        var med = result.MedicationInsights[0];
        Assert.Contains("Statin", med.PurposeAndHowItWorks);
        Assert.Contains("evening", med.UsageInstructionsAndTips, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task AnalyzePatientRecords_ParacetamolPrescription_WarnsAgainstMaxDosage()
    {
        // Arrange
        var agent = CreateAgent();
        var patient = new Patient
        {
            PatientCode = "PAT-1015",
            FullName = "Jerad Xavier",
            Prescriptions = new List<Prescription>
            {
                new() { MedicationName = "Paracetamol 500mg", Dosage = "2 tabs qds", Status = "Active" }
            }
        };

        // Act
        var result = await agent.AnalyzePatientRecordsAsync(patient);

        // Assert
        Assert.Single(result.MedicationInsights);
        var med = result.MedicationInsights[0];
        Assert.Contains("Analgesic", med.PurposeAndHowItWorks);
        Assert.Contains("4000mg", med.UsageInstructionsAndTips);
    }

    [Fact]
    public async Task AnalyzePatientRecords_AntihypertensivePrescription_AdvisesConsistentMorningDosing()
    {
        // Arrange
        var agent = CreateAgent();
        var patient = new Patient
        {
            PatientCode = "PAT-1016",
            FullName = "Jerad Xavier",
            Prescriptions = new List<Prescription>
            {
                new() { MedicationName = "Amlodipine 5mg", Dosage = "1 tab mane", Status = "Active" }
            }
        };

        // Act
        var result = await agent.AnalyzePatientRecordsAsync(patient);

        // Assert
        Assert.Single(result.MedicationInsights);
        var med = result.MedicationInsights[0];
        Assert.Contains("Antihypertensive", med.PurposeAndHowItWorks);
        Assert.Contains("morning", med.UsageInstructionsAndTips, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task AnswerQuestionAsync_DoctorConsultationInquiry_ReturnsDoctorDiagnosisAndNotes()
    {
        // Arrange
        var agent = CreateAgent();
        var patient = new Patient
        {
            PatientCode = "PAT-1017",
            FullName = "Jerad Xavier",
            ConsultationNotes = new List<ConsultationNote>
            {
                new()
                {
                    DoctorName = "Dr. Jerad Xavier",
                    Diagnosis = "Mild Bronchitis",
                    ClinicalNotes = "Rest and warm steam inhalation advised.",
                    RecommendedTests = "Chest X-Ray"
                }
            }
        };

        // Act
        var response = await agent.AnswerQuestionAsync(patient, "What did the doctor say about my diagnosis?");

        // Assert
        Assert.NotNull(response);
        Assert.Contains("Dr. Jerad Xavier", response.Answer);
        Assert.Contains("Mild Bronchitis", response.Answer);
        Assert.Contains("warm steam inhalation", response.Answer);
        Assert.Contains("Chest X-Ray", response.Answer);
    }

    [Fact]
    public async Task AnswerQuestionAsync_NoRecordedConsultations_ReturnsNoConsultationMessage()
    {
        // Arrange
        var agent = CreateAgent();
        var patient = new Patient
        {
            PatientCode = "PAT-1018",
            FullName = "Jerad Xavier",
            ConsultationNotes = new List<ConsultationNote>()
        };

        // Act
        var response = await agent.AnswerQuestionAsync(patient, "What did the doctor diagnose?");

        // Assert
        Assert.NotNull(response);
        Assert.Contains("no recorded doctor consultations", response.Answer, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task AnalyzePatientRecords_CalculatesPatientAgeAccurately()
    {
        // Arrange
        var agent = CreateAgent();
        var birthYear = DateTime.UtcNow.Year - 28;
        var patient = new Patient
        {
            PatientCode = "PAT-1019",
            FullName = "Jerad Xavier",
            DateOfBirth = new DateTime(birthYear, 1, 15)
        };

        // Act
        var result = await agent.AnalyzePatientRecordsAsync(patient);

        // Assert
        Assert.Equal(28, result.Age);
    }

    [Fact]
    public async Task AnalyzePatientRecords_PopulatesQuestionsForNextVisit()
    {
        // Arrange
        var agent = CreateAgent();
        var patient = new Patient { PatientCode = "PAT-1020", FullName = "Jerad Xavier" };

        // Act
        var result = await agent.AnalyzePatientRecordsAsync(patient);

        // Assert
        Assert.NotEmpty(result.QuestionsForNextVisit);
        Assert.Contains(result.QuestionsForNextVisit, q => q.Contains("medication dosages"));
    }

    [Fact]
    public async Task AnalyzePatientRecords_PopulatesActionableNextSteps()
    {
        // Arrange
        var agent = CreateAgent();
        var patient = new Patient { PatientCode = "PAT-1021", FullName = "Jerad Xavier" };

        // Act
        var result = await agent.AnalyzePatientRecordsAsync(patient);

        // Assert
        Assert.NotEmpty(result.ActionableNextSteps);
        Assert.Contains(result.ActionableNextSteps, s => s.Contains("hydration"));
    }

    [Fact]
    public async Task AnalyzePatientRecords_AllergyProtectionNotice_PresentWhenAllergiesRecorded()
    {
        // Arrange
        var agent = CreateAgent();
        var patient = new Patient
        {
            PatientCode = "PAT-1022",
            FullName = "Jerad Xavier",
            Allergies = "Latex, Peanut"
        };

        // Act
        var result = await agent.AnalyzePatientRecordsAsync(patient);

        // Assert
        Assert.Contains(result.SafetyAlerts, a => a.Contains("Allergy Protection Active") && a.Contains("Latex, Peanut"));
    }
}

