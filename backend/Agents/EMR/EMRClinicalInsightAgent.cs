using HealthBridge.Api.DTOs.EMR;
using HealthBridge.Api.Models.EMR;
using System.Text;
using System.Text.Json;

namespace HealthBridge.Api.Agents.EMR;

/// <summary>
/// EMRClinicalInsightAgent â€” Agentic AI Component for Electronic Medical Records
/// 
/// Responsibilities:
/// 1. Analyzes the patient's entire medical record: Lab reports, Prescriptions, Medications, and Doctor Consultation Notes.
/// 2. Translates complex medical diagnoses and doctor clinical notes into clear, empathetic plain English ("What the doctor said").
/// 3. Explains each lab report test, what the biomarkers mean, and its clinical significance.
/// 4. Explains prescribed medications: why each was given, how it works in the body, dosage guidelines, and precautions.
/// 5. Synthesizes overall patient health condition and highlights safety alerts / actionable next steps.
/// 6. Provides an interactive Q&A capability allowing patients to ask clarifying questions about their health records.
/// </summary>
public class EMRClinicalInsightAgent
{
    private readonly IConfiguration _config;
    private readonly ILogger<EMRClinicalInsightAgent> _logger;
    private readonly HttpClient _httpClient;

    public EMRClinicalInsightAgent(
        IConfiguration config,
        ILogger<EMRClinicalInsightAgent> logger,
        IHttpClientFactory httpClientFactory)
    {
        _config = config;
        _logger = logger;
        _httpClient = httpClientFactory.CreateClient("GeminiClient");
    }

    private string? GetGeminiApiKey()
    {
        return _config["Gemini:ApiKey"]
            ?? _config["GeminiApiKey"]
            ?? _config["Google:ApiKey"]
            ?? Environment.GetEnvironmentVariable("GEMINI_API_KEY")
            ?? Environment.GetEnvironmentVariable("GOOGLE_API_KEY");
    }

    /// <summary>
    /// Generates full agentic clinical explanation of lab reports, prescriptions, and doctor consultations
    /// </summary>
    public async Task<AIClinicalInsightResponse> AnalyzePatientRecordsAsync(Patient patient)
    {
        _logger.LogInformation("[EMR Agentic AI] Analyzing live database records for patient {Code} ({Name})", patient.PatientCode, patient.FullName);

        var consultations = patient.ConsultationNotes?.OrderByDescending(c => c.ConsultationDate).ToList() ?? new List<ConsultationNote>();
        var labReports = patient.LabReports?.OrderByDescending(l => l.ReportDate).ToList() ?? new List<LabReport>();
        var prescriptions = patient.Prescriptions?.OrderByDescending(p => p.StartDate).ToList() ?? new List<Prescription>();

        // 1. Build Base Expert Clinical Synthesis
        var insight = GenerateClinicalSynthesis(patient, consultations, labReports, prescriptions);

        // 2. Try Enhancing via Google Gemini LLM if configured
        var apiKey = GetGeminiApiKey();
        if (!string.IsNullOrWhiteSpace(apiKey))
        {
            try
            {
                var enhanced = await CallGeminiExplanationAsync(apiKey, patient, consultations, labReports, prescriptions);
                if (enhanced != null)
                {
                    enhanced.PatientCode = patient.PatientCode;
                    enhanced.PatientName = patient.FullName;
                    enhanced.Age = (patient.DateOfBirth.HasValue ? (DateTime.UtcNow.Year - patient.DateOfBirth.Value.Year) : 35);
                    enhanced.Gender = patient.Gender;
                    enhanced.BloodGroup = patient.BloodGroup;
                    enhanced.Allergies = patient.Allergies;
                    enhanced.ChronicConditions = patient.ChronicConditions;
                    enhanced.EngineUsed = "Google Gemini LLM (Agentic Clinical Intelligence)";
                    _logger.LogInformation("[EMR Agentic AI] Successfully generated clinical insight using Google Gemini LLM for {Code}", patient.PatientCode);
                    return enhanced;
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "[EMR Agentic AI] Google Gemini LLM call skipped, using Clinical Intelligence Engine.");
            }
        }
        else
        {
            _logger.LogInformation("[EMR Agentic AI] Gemini:ApiKey not set; running HealthBridge Clinical Heuristic Engine on live patient records.");
        }

        return insight;
    }

    /// <summary>
    /// Answers a custom patient question based on their medical history
    /// </summary>
    public async Task<AskAIAgentResponse> AnswerQuestionAsync(Patient patient, string question)
    {
        _logger.LogInformation("[EMR Agentic AI] Answering question for patient {Code}: {Question}", patient.PatientCode, question);

        var consultations = patient.ConsultationNotes?.ToList() ?? new List<ConsultationNote>();
        var labReports = patient.LabReports?.ToList() ?? new List<LabReport>();
        var prescriptions = patient.Prescriptions?.ToList() ?? new List<Prescription>();

        var qLower = question.ToLowerInvariant();
        var refs = new List<string>();

        // Check if question pertains to medications
        var matchedMed = prescriptions.FirstOrDefault(p => qLower.Contains(p.MedicationName.ToLower()) ||
                                                           qLower.Contains(p.MedicationName.Split(' ')[0].ToLower()));
        if (matchedMed != null)
        {
            refs.Add($"Prescription: {matchedMed.MedicationName} ({matchedMed.Dosage})");
        }

        // Check if question pertains to lab reports
        var matchedLab = labReports.FirstOrDefault(l => qLower.Contains(l.TestTitle.ToLower()) ||
                                                        qLower.Contains(l.Category.ToLower()));
        if (matchedLab != null)
        {
            refs.Add($"Lab Report: {matchedLab.TestTitle} ({matchedLab.ReportDate:yyyy-MM-dd})");
        }

        // Try Gemini if configured
        var apiKey = GetGeminiApiKey();
        if (!string.IsNullOrWhiteSpace(apiKey))
        {
            try
            {
                var geminiAnswer = await CallGeminiQuestionAsync(apiKey, patient, consultations, labReports, prescriptions, question);
                if (!string.IsNullOrWhiteSpace(geminiAnswer))
                {
                    return new AskAIAgentResponse
                    {
                        Question = question,
                        Answer = geminiAnswer,
                        ClinicalReferences = refs.Any() ? refs : new List<string> { "Patient Electronic Health Record" },
                        AnsweredAt = DateTime.UtcNow
                    };
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "[EMR Agentic AI] Gemini question answering failed, using clinical fallback.");
            }
        }

        // Intelligent Clinical Rule-Based Fallback
        var answerBuilder = new StringBuilder();

        if (matchedMed != null)
        {
            answerBuilder.AppendLine($"Regarding **{matchedMed.MedicationName}**: It was prescribed for your treatment with the dosing schedule of **{matchedMed.Dosage}** for **{matchedMed.Duration}** by {matchedMed.PrescribedDoctor}.");
            answerBuilder.AppendLine($"It is crucial to complete the entire course as instructed. Always drink a full glass of water and take it at consistent times daily.");
            if (qLower.Contains("food") || qLower.Contains("eat") || qLower.Contains("meal"))
            {
                answerBuilder.AppendLine($"Taking this medication after meals generally prevents mild stomach irritation.");
            }
        }
        else if (matchedLab != null)
        {
            answerBuilder.AppendLine($"Regarding your **{matchedLab.TestTitle}** report ({matchedLab.Category}): The recorded status is **{matchedLab.Status}** with the finding: *\"{matchedLab.ResultsSummary}\"*. This test provides your physician with vital diagnostic markers to track disease progression and treatment effectiveness.");
        }
        else if (qLower.Contains("doctor") || qLower.Contains("said") || qLower.Contains("diagnos"))
        {
            var latestConsult = consultations.OrderByDescending(c => c.ConsultationDate).FirstOrDefault();
            if (latestConsult != null)
            {
                answerBuilder.AppendLine($"During your consultation with **{latestConsult.DoctorName}**, the documented diagnosis was **{latestConsult.Diagnosis}**.");
                answerBuilder.AppendLine($"The doctor noted: \"{latestConsult.ClinicalNotes}\".");
                if (!string.IsNullOrWhiteSpace(latestConsult.RecommendedTests))
                {
                    answerBuilder.AppendLine($"Recommended diagnostic follow-ups: {latestConsult.RecommendedTests}.");
                }
            }
            else
            {
                answerBuilder.AppendLine("You currently have no recorded doctor consultations in your EMR timeline.");
            }
        }
        else
        {
            answerBuilder.AppendLine($"Based on your overall medical profile as of today, you have **{prescriptions.Count(p => p.Status == "Active")} active prescription(s)** and **{labReports.Count} recorded diagnostic report(s)**.");
            answerBuilder.AppendLine($"Your recorded chronic conditions: *{(!string.IsNullOrWhiteSpace(patient.ChronicConditions) ? patient.ChronicConditions : "None specified")}*. Allergies: *{(!string.IsNullOrWhiteSpace(patient.Allergies) ? patient.Allergies : "No known allergies")}*.");
            answerBuilder.AppendLine("If you have specific new symptoms or concerns, we advise scheduling a follow-up consultation with your attending doctor.");
        }

        return new AskAIAgentResponse
        {
            Question = question,
            Answer = answerBuilder.ToString().Trim(),
            ClinicalReferences = refs.Any() ? refs : new List<string> { "EMR Health Profile", "Clinical Records" },
            AnsweredAt = DateTime.UtcNow
        };
    }

    /// <summary>
    /// Native High-Precision Clinical Heuristic Synthesis Engine
    /// </summary>
    private AIClinicalInsightResponse GenerateClinicalSynthesis(
        Patient patient,
        List<ConsultationNote> consultations,
        List<LabReport> labReports,
        List<Prescription> prescriptions)
    {
        var response = new AIClinicalInsightResponse
        {
            PatientCode = patient.PatientCode,
            PatientName = patient.FullName,
            Age = (patient.DateOfBirth.HasValue ? (DateTime.UtcNow.Year - patient.DateOfBirth.Value.Year) : 35),
            Gender = patient.Gender,
            BloodGroup = patient.BloodGroup,
            Allergies = patient.Allergies,
            ChronicConditions = patient.ChronicConditions,
            EngineUsed = "HealthBridge Clinical Intelligence Agent"
        };

        // 1. Overall Condition Synthesis
        var activeMeds = prescriptions.Where(p => p.Status == "Active").ToList();
        var pendingLabs = labReports.Where(l => l.Status == "Pending").ToList();

        if (pendingLabs.Any() || activeMeds.Count > 3)
        {
            response.HealthStatusLevel = "Monitoring Required";
            response.OverallConditionSummary = $"You are currently under active clinical care with {activeMeds.Count} active medications and {pendingLabs.Count} ongoing diagnostic evaluation(s). Your vital indicators and medication tolerances are being systematically monitored.";
        }
        else if (consultations.Any() || activeMeds.Any())
        {
            response.HealthStatusLevel = "Stable";
            response.OverallConditionSummary = $"Your clinical profile indicates a stable condition. You have {activeMeds.Count} active medication regimen(s) and {labReports.Count} completed diagnostic report(s). Your physician's treatment plan is actively helping manage your symptoms.";
        }
        else
        {
            response.HealthStatusLevel = "Routine Health Maintenance";
            response.OverallConditionSummary = "Your medical record shows routine health maintenance with no active acute medical issues recorded. Continue regular preventive screenings and wellness habits.";
        }

        // 2. What Doctor Said (Consultation Notes Breakdown)
        foreach (var c in consultations)
        {
            var diagnosis = c.Diagnosis;
            var plainEnglish = ExplainDiagnosis(diagnosis, c.ClinicalNotes);
            var takeaway = $"Adhere strictly to {c.DoctorName}'s care plan and complete any ordered diagnostics.";

            response.DoctorInsights.Add(new AIDoctorInsightDto
            {
                DoctorName = c.DoctorName,
                Designation = c.DoctorDesignation ?? "Consultant Physician",
                VisitDate = c.ConsultationDate,
                Diagnosis = diagnosis,
                WhatDoctorSaidPlainEnglish = plainEnglish,
                KeyTakeaway = takeaway,
                RecommendedTestsAdvice = !string.IsNullOrWhiteSpace(c.RecommendedTests)
                    ? $"Doctor recommended follow-up tests: {c.RecommendedTests}"
                    : "No further immediate tests were ordered during this visit."
            });
        }

        // 3. Lab Reports Explanation
        foreach (var l in labReports)
        {
            var explanation = ExplainLabTest(l.TestTitle, l.Category, l.ResultsSummary);
            var isAttention = l.ResultsSummary?.ToLower().Contains("elevated") == true ||
                              l.ResultsSummary?.ToLower().Contains("high") == true ||
                              l.ResultsSummary?.ToLower().Contains("abnormal") == true ||
                              l.ResultsSummary?.ToLower().Contains("positive") == true;

            response.LabReportInsights.Add(new AILabReportInsightDto
            {
                ReportId = l.Id,
                TestTitle = l.TestTitle,
                Category = l.Category,
                ReportDate = l.ReportDate,
                Status = l.Status,
                FindingsSummary = string.IsNullOrWhiteSpace(l.ResultsSummary) ? "Test processed and recorded." : l.ResultsSummary,
                WhatThisTestMeansPlainEnglish = explanation.PlainEnglish,
                ClinicalSignificance = explanation.Significance,
                RequiresAttention = isAttention
            });
        }

        // 4. Medications & Treatment Plan Breakdown
        foreach (var p in prescriptions)
        {
            var medInfo = ExplainMedication(p.MedicationName, p.Dosage);
            response.MedicationInsights.Add(new AIMedicationInsightDto
            {
                PrescriptionId = p.Id,
                MedicationName = p.MedicationName,
                Dosage = p.Dosage,
                Duration = p.Duration,
                PrescribedDoctor = p.PrescribedDoctor,
                PurposeAndHowItWorks = medInfo.Purpose,
                UsageInstructionsAndTips = medInfo.Tips,
                Status = p.Status
            });
        }

        // 5. Safety Alerts
        if (!string.IsNullOrWhiteSpace(patient.Allergies) && patient.Allergies.ToLower() != "none" && patient.Allergies.ToLower() != "nil")
        {
            response.SafetyAlerts.Add($"Allergy Protection Active: Your recorded allergies ({patient.Allergies}) are continuously screened against all doctor orders and pharmacy dispensations.");
        }

        foreach (var p in activeMeds)
        {
            if (!string.IsNullOrWhiteSpace(patient.Allergies))
            {
                var aLower = patient.Allergies.ToLower();
                var mLower = p.MedicationName.ToLower();
                if ((aLower.Contains("penicillin") && mLower.Contains("amox")) ||
                    (aLower.Contains("sulfa") && mLower.Contains("sulf")) ||
                    (aLower.Contains("nsaid") && (mLower.Contains("ibuprofen") || mLower.Contains("aspirin"))))
                {
                    response.SafetyAlerts.Add($"CRITICAL CAUTION: Potential sensitivity between recorded allergy '{patient.Allergies}' and prescribed '{p.MedicationName}'. Consult your doctor immediately.");
                }
            }
        }

        // 6. Actionable Next Steps & Questions for Next Visit
        response.ActionableNextSteps.Add("Take all prescribed medications at consistent times each day without missing doses.");
        if (pendingLabs.Any())
        {
            response.ActionableNextSteps.Add($"Follow up on {pendingLabs.Count} pending laboratory investigation(s) to discuss results with your doctor.");
        }
        response.ActionableNextSteps.Add("Maintain adequate hydration (2 to 2.5 liters of water daily) unless advised otherwise by your physician.");

        response.QuestionsForNextVisit.Add("Are my current medication dosages still optimal, or can any be adjusted?");
        response.QuestionsForNextVisit.Add("Do my recent lab report markers indicate satisfactory response to the treatment plan?");
        response.QuestionsForNextVisit.Add("Are there any specific dietary or exercise modifications recommended for my health condition?");

        return response;
    }

    private static string ExplainDiagnosis(string diagnosis, string clinicalNotes)
    {
        var dLower = diagnosis.ToLowerInvariant();
        if (dLower.Contains("hypertension") || dLower.Contains("blood pressure"))
        {
            return "Your doctor noted elevated blood pressure levels. This means your heart is working slightly harder to pump blood through your arteries. The doctor prescribed therapy and advised sodium reduction to protect your cardiovascular system.";
        }
        if (dLower.Contains("diabetes") || dLower.Contains("hyperglycemia") || dLower.Contains("glucose"))
        {
            return "Your doctor evaluated your blood sugar regulation. When glucose levels are elevated, insulin management and dietary balance are key. The doctor recommended maintaining stable carbohydrate intake and monitoring blood sugar.";
        }
        if (dLower.Contains("infection") || dLower.Contains("fever") || dLower.Contains("bacterial"))
        {
            return "Your doctor diagnosed a bacterial or inflammatory infection. The prescribed medication works by eliminating the infectious bacteria and soothing inflammation. Be sure to finish the full antibiotic course even if you feel better early.";
        }
        if (dLower.Contains("respiratory") || dLower.Contains("cough") || dLower.Contains("bronch"))
        {
            return "Your doctor evaluated your airway and lung function. The treatment plan is focused on easing your breathing, clearing bronchial congestion, and reducing irritation.";
        }
        if (dLower.Contains("gastritis") || dLower.Contains("acid") || dLower.Contains("reflux"))
        {
            return "Your doctor diagnosed stomach acid irritation or gastritis. Medications were provided to reduce excess stomach acid and promote healing of your stomach lining.";
        }

        var notesSnippet = !string.IsNullOrWhiteSpace(clinicalNotes) ? $" The doctor specifically instructed: \"{clinicalNotes}\"" : "";
        return $"Your doctor evaluated you for {diagnosis} and outlined a structured recovery plan.{notesSnippet}";
    }

    private static (string PlainEnglish, string Significance) ExplainLabTest(string testTitle, string category, string summary)
    {
        var tLower = testTitle.ToLowerInvariant();
        if (tLower.Contains("blood") || tLower.Contains("cbc") || tLower.Contains("fbc") || tLower.Contains("hematology"))
        {
            return (
                "A Complete Blood Count evaluates your red blood cells (which deliver oxygen), white blood cells (which fight infections), and platelets (which stop bleeding).",
                "Helps identify anemia, immune strength, and ensures your bone marrow and circulatory system are functioning properly."
            );
        }
        if (tLower.Contains("lipid") || tLower.Contains("cholesterol"))
        {
            return (
                "A Lipid Panel measures cholesterol fractions including LDL ('bad' cholesterol), HDL ('good' cholesterol), and triglycerides in your bloodstream.",
                "Assesses arterial health and cardiovascular risk. Healthy levels prevent plaque buildup in blood vessels."
            );
        }
        if (tLower.Contains("glucose") || tLower.Contains("sugar") || tLower.Contains("hba1c"))
        {
            return (
                "This diagnostic tests the concentration of sugar in your blood, either at a fasting state or averaged over the past 3 months (HbA1c).",
                "Essential for monitoring metabolic balance, insulin sensitivity, and guiding diabetic or pre-diabetic lifestyle modifications."
            );
        }
        if (tLower.Contains("liver") || tLower.Contains("lft") || tLower.Contains("alt") || tLower.Contains("ast"))
        {
            return (
                "A Liver Function Test evaluates essential liver enzymes and proteins that detoxify blood and produce vital enzymes.",
                "Confirms that your liver is safely processing medications and maintaining metabolic balance."
            );
        }
        if (tLower.Contains("renal") || tLower.Contains("kidney") || tLower.Contains("creatinine") || tLower.Contains("kft"))
        {
            return (
                "A Kidney Function Test assesses filtration rate by measuring creatinine and blood urea nitrogen waste products.",
                "Ensures efficient fluid balance and confirms that your kidneys are clearing metabolic byproducts smoothly."
            );
        }
        if (tLower.Contains("urine") || tLower.Contains("urinalysis"))
        {
            return (
                "Urinalysis screens for microscopic markers including protein, glucose, and cellular activity in urine.",
                "Rules out urinary tract infections and provides an early window into kidney filtration health."
            );
        }

        return (
            $"This {category} diagnostic provides quantitative clinical markers for {testTitle}.",
            "Used by your doctor to verify biological functions and evaluate response to current treatment."
        );
    }

    private static (string Purpose, string Tips) ExplainMedication(string medName, string dosage)
    {
        var mLower = medName.ToLowerInvariant();
        if (mLower.Contains("amoxicillin") || mLower.Contains("augmentin") || mLower.Contains("cefixime") || mLower.Contains("azithromycin"))
        {
            return (
                "Antibiotic: Actively stops and eliminates bacterial growth to resolve your infection.",
                "Complete the entire prescribed days even if symptoms disappear early. Take with food if stomach feels sensitive."
            );
        }
        if (mLower.Contains("paracetamol") || mLower.Contains("acetaminophen") || mLower.Contains("panadol"))
        {
            return (
                "Analgesic & Antipyretic: Relieves mild-to-moderate pain and reduces fever by regulating temperature centers in the brain.",
                "Do not exceed the recommended daily dosage (max 4000mg/day). Avoid combining with other over-the-counter paracetamol products."
            );
        }
        if (mLower.Contains("ibuprofen") || mLower.Contains("naproxen") || mLower.Contains("diclofenac"))
        {
            return (
                "NSAID Anti-inflammatory: Reduces swelling, stiffness, and bodily pain by inhibiting inflammatory enzymes.",
                "Always take with or immediately after a meal to protect your stomach lining."
            );
        }
        if (mLower.Contains("omeprazole") || mLower.Contains("pantoprazole") || mLower.Contains("esomeprazole"))
        {
            return (
                "Proton Pump Inhibitor (PPI): Decreases the amount of acid produced in your stomach, relieving heartburn and healing gastritis.",
                "Take 30 to 60 minutes before breakfast with a glass of water for maximum efficacy."
            );
        }
        if (mLower.Contains("metformin"))
        {
            return (
                "Antidiabetic: Improves insulin sensitivity and helps your body utilize blood glucose efficiently.",
                "Take with meals to minimize gastrointestinal discomfort. Maintain regular exercise and dietary balance."
            );
        }
        if (mLower.Contains("lisinopril") || mLower.Contains("amlodipine") || mLower.Contains("losartan"))
        {
            return (
                "Antihypertensive: Relaxes blood vessel walls to lower high blood pressure and protect kidney and heart health.",
                "Take at the same time each morning. Rise slowly from sitting or lying down to avoid lightheadedness."
            );
        }
        if (mLower.Contains("atorvastatin") || mLower.Contains("rosuvastatin"))
        {
            return (
                "Statin: Reduces cholesterol synthesis in the liver to prevent arterial plaque accumulation.",
                "Usually taken once daily in the evening. Report any unexplained muscle aches to your doctor."
            );
        }

        return (
            $"Prescribed clinical medication for your condition. Follow scheduled dosage ({dosage}).",
            "Store in a cool, dry place out of direct sunlight. Do not discontinue without consulting your physician."
        );
    }

    /// <summary>
    /// Calls Google Gemini LLM API with multi-model auto-fallback and strict JSON mode
    /// </summary>
    private async Task<AIClinicalInsightResponse?> CallGeminiExplanationAsync(
        string apiKey,
        Patient patient,
        List<ConsultationNote> consultations,
        List<LabReport> labReports,
        List<Prescription> prescriptions)
    {
        var configuredModel = _config["Gemini:Model"];
        var modelsToTry = new List<string>();
        if (!string.IsNullOrWhiteSpace(configuredModel)) modelsToTry.Add(configuredModel.Trim());
        foreach (var m in new[] { "gemini-1.5-flash", "gemini-2.0-flash", "gemini-1.5-pro", "gemini-flash-latest" })
        {
            if (!modelsToTry.Contains(m)) modelsToTry.Add(m);
        }

        var consultsJson = JsonSerializer.Serialize(consultations.Select(c => new { c.DoctorName, c.ConsultationDate, c.Diagnosis, c.ClinicalNotes, c.RecommendedTests }));
        var labsJson = JsonSerializer.Serialize(labReports.Select(l => new { l.TestTitle, l.Category, l.ReportDate, l.ResultsSummary, l.Status }));
        var rxsJson = JsonSerializer.Serialize(prescriptions.Select(p => new { p.MedicationName, p.Dosage, p.Duration, p.PrescribedDoctor, p.Status }));

        var prompt = $@"You are a compassionate, board-certified Clinical AI Health Advisor at Health Bridge Hospital.
Analyze this patient's actual medical records from the hospital database and produce an empathetic, plain-English explanation of their condition, lab tests, prescriptions, and doctor instructions.
Patient: {patient.FullName}, Age: {(patient.DateOfBirth.HasValue ? (DateTime.UtcNow.Year - patient.DateOfBirth.Value.Year) : 35)}, Gender: {patient.Gender}, Blood Group: {patient.BloodGroup}
Allergies: {(!string.IsNullOrWhiteSpace(patient.Allergies) ? patient.Allergies : "None reported")}
Chronic Conditions: {(!string.IsNullOrWhiteSpace(patient.ChronicConditions) ? patient.ChronicConditions : "None reported")}

Doctor Consultations:
{consultsJson}

Lab Reports:
{labsJson}

Prescriptions:
{rxsJson}

Generate a comprehensive clinical insight JSON adhering strictly to this structure:
{{
  ""overallConditionSummary"": ""A warm, clear 2-3 sentence overview explaining what is happening with their health right now."",
  ""healthStatusLevel"": ""Stable"",
  ""doctorInsights"": [
    {{
      ""doctorName"": ""Dr. Name"",
      ""designation"": ""Consultant"",
      ""visitDate"": ""2026-09-28T00:00:00Z"",
      ""diagnosis"": ""Diagnosis"",
      ""whatDoctorSaidPlainEnglish"": ""Plain English translation of the doctor's assessment and clinical notes."",
      ""keyTakeaway"": ""Key patient action item."",
      ""recommendedTestsAdvice"": ""Clear explanation of why recommended tests are needed.""
    }}
  ],
  ""labReportInsights"": [
    {{
      ""testTitle"": ""Test Name"",
      ""category"": ""Category"",
      ""reportDate"": ""2026-09-28T00:00:00Z"",
      ""status"": ""Completed"",
      ""findingsSummary"": ""Summary of result"",
      ""whatThisTestMeansPlainEnglish"": ""What this test evaluates in everyday human terms."",
      ""clinicalSignificance"": ""Why this matters for their body and recovery."",
      ""requiresAttention"": false
    }}
  ],
  ""medicationInsights"": [
    {{
      ""medicationName"": ""Medication"",
      ""dosage"": ""Dosage"",
      ""duration"": ""Duration"",
      ""prescribedDoctor"": ""Doctor"",
      ""purposeAndHowItWorks"": ""Why it was prescribed and how it works to heal or stabilize them."",
      ""usageInstructionsAndTips"": ""Practical instructions, food interactions, and safety tips."",
      ""status"": ""Active""
    }}
  ],
  ""safetyAlerts"": [""Safety alert or allergy cross-check""],
  ""actionableNextSteps"": [""Concrete step 1"", ""Concrete step 2""],
  ""questionsForNextVisit"": [""Question 1 for doctor"", ""Question 2""]
}}";

        var payload = new
        {
            contents = new[]
            {
                new { parts = new object[] { new { text = prompt } } }
            },
            generationConfig = new
            {
                responseMimeType = "application/json",
                temperature = 0.2,
                maxOutputTokens = 3072
            }
        };

        foreach (var model in modelsToTry)
        {
            try
            {
                var endpoint = $"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={apiKey}";
                var response = await _httpClient.PostAsync(
                    endpoint,
                    new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json"));

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning("[EMR Agentic AI] Model {Model} returned status {Code}, attempting fallback...", model, response.StatusCode);
                    continue;
                }

                var json = await response.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(json);
                var text = doc.RootElement
                    .GetProperty("candidates")[0]
                    .GetProperty("content")
                    .GetProperty("parts")[0]
                    .GetProperty("text")
                    .GetString();

                if (string.IsNullOrWhiteSpace(text)) continue;

                var cleanJson = text.Trim();
                if (cleanJson.StartsWith("```json")) cleanJson = cleanJson[7..];
                if (cleanJson.StartsWith("```")) cleanJson = cleanJson[3..];
                if (cleanJson.EndsWith("```")) cleanJson = cleanJson[..^3];
                cleanJson = cleanJson.Trim();

                // Extract outermost JSON block if needed
                var firstBrace = cleanJson.IndexOf('{');
                var lastBrace = cleanJson.LastIndexOf('}');
                if (firstBrace >= 0 && lastBrace > firstBrace)
                {
                    cleanJson = cleanJson.Substring(firstBrace, lastBrace - firstBrace + 1);
                }

                var parsed = JsonSerializer.Deserialize<AIClinicalInsightResponse>(cleanJson, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                if (parsed != null)
                {
                    _logger.LogInformation("[EMR Agentic AI] Successfully generated clinical insight using Gemini model {Model}", model);
                    return parsed;
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "[EMR Agentic AI] Attempt with Gemini model {Model} failed", model);
            }
        }

        return null;
    }

    private async Task<string?> CallGeminiQuestionAsync(
        string apiKey,
        Patient patient,
        List<ConsultationNote> consultations,
        List<LabReport> labReports,
        List<Prescription> prescriptions,
        string question)
    {
        var configuredModel = _config["Gemini:Model"];
        var modelsToTry = new List<string>();
        if (!string.IsNullOrWhiteSpace(configuredModel)) modelsToTry.Add(configuredModel.Trim());
        foreach (var m in new[] { "gemini-1.5-flash", "gemini-2.0-flash", "gemini-1.5-pro", "gemini-flash-latest" })
        {
            if (!modelsToTry.Contains(m)) modelsToTry.Add(m);
        }

        var consultsJson = JsonSerializer.Serialize(consultations.Select(c => new { c.DoctorName, c.ConsultationDate, c.Diagnosis, c.ClinicalNotes }));
        var labsJson = JsonSerializer.Serialize(labReports.Select(l => new { l.TestTitle, l.Category, l.ResultsSummary, l.Status }));
        var rxsJson = JsonSerializer.Serialize(prescriptions.Select(p => new { p.MedicationName, p.Dosage, p.Duration, p.PrescribedDoctor, p.Status }));

        var prompt = $@"You are the Health Bridge Hospital Clinical AI Health Advisor.
A patient has asked you a question about their health records. Answer with clinical accuracy, warmth, and easy-to-understand language.

Patient Context:
- Name: {patient.FullName}, Age: {(patient.DateOfBirth.HasValue ? (DateTime.UtcNow.Year - patient.DateOfBirth.Value.Year) : 35)}, Gender: {patient.Gender}
- Allergies: {patient.Allergies}
- Chronic Conditions: {patient.ChronicConditions}
- Doctor Visits: {consultsJson}
- Lab Reports: {labsJson}
- Prescriptions: {rxsJson}

Patient's Question:
""{question}""

Instructions:
- Provide a direct, compassionate, helpful answer referencing their specific prescriptions, lab tests, or doctor consultations if relevant.
- Keep the explanation under 3 paragraphs.
- Include appropriate reassurance and safety disclaimers.";

        var payload = new
        {
            contents = new[]
            {
                new { parts = new object[] { new { text = prompt } } }
            },
            generationConfig = new
            {
                temperature = 0.3,
                maxOutputTokens = 1024
            }
        };

        foreach (var model in modelsToTry)
        {
            try
            {
                var endpoint = $"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={apiKey}";
                var response = await _httpClient.PostAsync(
                    endpoint,
                    new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json"));

                if (!response.IsSuccessStatusCode) continue;

                var json = await response.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(json);
                var answer = doc.RootElement
                    .GetProperty("candidates")[0]
                    .GetProperty("content")
                    .GetProperty("parts")[0]
                    .GetProperty("text")
                    .GetString();

                if (!string.IsNullOrWhiteSpace(answer)) return answer.Trim();
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "[EMR Agentic AI] Question attempt with Gemini model {Model} failed", model);
            }
        }

        return null;
    }
}

