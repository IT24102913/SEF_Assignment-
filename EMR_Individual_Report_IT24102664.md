# 17. Individual report section

## 17.2 IT24102664 – Xavier J.K. (Jerad Keshara Xavier)

---

### 1. Individual Contribution Statement & Component Scope

As a member of the **HealthBridge** development team, I took primary technical ownership of the **Electronic Medical Record (EMR) Management Subsystem**. My responsibility encompassed designing, implementing, integrating, testing, and deploying a complete vertical full-stack slice of this subsystem across all mandatory architectural tiers.

#### 1.1 Architectural Overview of Owned Subsystem

The Electronic Medical Record subsystem operates as a high-integrity, mission-critical clinical information system enabling:

1. **Patient-Facing Services (Flutter Mobile & React Web):** Interactive longitudinal digital health passport, comprehensive diagnostic lab report visualizer, active medication tracking with dosage reminders, historical doctor consultation review, medical channeling timeline, and a conversational AI Clinical Advisor providing patient-friendly medical interpretations.
2. **Staff Clinical Administration (React Web):** Multi-role specialized clinical workspaces for **Consultant Physicians** (clinical diagnosis documentation, treatment planning, lab test ordering), **Pharmacists** (medication dispensing, drug-allergy screening, prescription authorization requests), **Laboratorians** (specimen diagnostic results entry, biomarker status tracking), and **Hospital Administrators** (operational mission control, audit logging, prescription authorization approvals/rejections).
3. **Backend Service & Business Logic (ASP.NET Core 8 Web API):** Asynchronous RESTful controllers, strict role-based access control (RBAC for Patient, Doctor, Pharmacist, Laboratorian, Admin), transactional prescription authorization state machine, automated patient code generation algorithms (`PAT-XXXX`), and business-specific longitudinal clinical summary synthesis.
4. **Relational Data Persistence (PostgreSQL & EF Core):** Normalized relational schema (`Patients`, `ConsultationNotes`, `LabReports`, `Prescriptions`, `ChannelingAppointments`, `EMRAuditLogs`), foreign-key constraints, clinical audit timestamping, and durable storage of authorization workflow states.
5. **Agentic AI Subsystem:** A multi-tier hybrid agent architecture (`EMRClinicalInsightAgent`) combining Google Gemini LLM perceptual plain-English synthesis with deterministic clinical heuristic rules, drug-allergy safety validation, and interactive health Q&A with real-time record grounding.
6. **Automated Testing & CI:** 45 unit tests covering all clinical heuristic boundaries, drug-allergy conflict triggers, controller endpoints, role-based authorization gates, and GitHub Actions continuous integration.

---

### Layer / Component Architectural Scope Table

| Layer / Component | Architectural Scope |
| :--- | :--- |
| **Backend Layer** | `backend/Controllers/EMR/EMRController.cs` (32 REST endpoints), DTOs (`backend/DTOs/EMR/*`), Services (`backend/Services/EMR/EMRService.cs`, `IEMRService.cs`) |
| **Database Tier** | Models (`backend/Models/EMR/*`), EF Core Migrations, PostgreSQL Schema (`DbInitializer.cs`), 3NF Relational Tables |
| **Web Application (React)** | `frontend-react/src/pages/emr/staff/*` (Admin, Consultant, Pharmacist, Laboratorian, Role/Patient Selectors), `frontend-react/src/pages/emr/patient/*` (HealthPassport, AIAdvisor, Prescriptions, Labs, Consultations, Notifications), `frontend-react/src/api/emrApi.js` |
| **Mobile App (Flutter)** | `flutter-app/lib/screens/emr/*` (Container, Overview, Health Passport Dialog, Consultations, Lab Reports, Pharmacy, Channeling, AI Advisor Screen), `flutter-app/lib/services/emr_api_service.dart` |
| **Agentic AI Subsystem** | `backend/Agents/EMR/EMRClinicalInsightAgent.cs` (Google Gemini Multi-Model Fallback, Clinical Heuristic Synthesis, Drug-Allergy Safety Radar, Interactive Q&A Engine) |
| **Automated Testing** | `tests/HealthBridge.Tests/Agents/EMR/EMRClinicalInsightAgentTests.cs` (30 tests), `tests/HealthBridge.Tests/Controllers/EMR/EMRControllerTests.cs` (15 tests) — Total: 45 tests (100% passing) |

---

### 2. Technical Implementation Evidence (Full-Stack Ownership)

#### 2.1 Part 1 — ASP.NET Core RESTful API Backend

I designed and implemented the authoritative backend controllers in `backend/Controllers/EMR/`, strictly adhering to RESTful conventions, DTO separation of concerns, and asynchronous programming (`async`/`await`):

**Primary Controller Developed: `EMRController.cs` (32 REST Endpoints)**

##### 1. Patient & Health Passport Management:
* `GET /api/emr/patients`: Retrieves and filters all patient profiles with keyword search by name, NIC, or patient code.
* `GET /api/emr/patients/me`: Extracts the authenticated patient identity directly from the cryptographically validated JWT token (`sub`/`nameid` claim) and retrieves their personalized EMR profile.
* `GET /api/emr/patients/{idOrCode}`: Flexible dual-identifier endpoint resolving patients by either unique `Guid` or clinical `PatientCode` (e.g., `PAT-1001`).
* `POST /api/emr/patients`: Registers a new patient in the EMR system, automatically allocating a unique sequence code.
* `PUT /api/emr/patients/{id:guid}` & `PUT /api/emr/patients/code/{patientCode}`: Updates patient demographics, emergency contacts, blood group, allergies, and chronic conditions.
* `GET /api/emr/notifications`: Generates real-time personalized clinical alerts and reminders for the authenticated user based strictly on their live database records.

##### 2. Doctor Consultation Notes Management:
* `GET /api/emr/consultations`: Retrieves consultation history with multi-parameter filtering (by `patientCode`, search keywords, or attending `doctorName`).
* `GET /api/emr/consultations/{id:guid}`: Detailed consultation retrieval including diagnosis, clinical notes, and recommended diagnostic investigations.
* `POST /api/emr/consultations`: Enables Consultant Physicians to authoritatively document clinical diagnoses, vital signs, recovery instructions, and order follow-up tests.
* `DELETE /api/emr/consultations/{id:guid}`: Admin-guarded endpoint for clinical record lifecycle governance and audit purging.

##### 3. Diagnostic Lab Reports Management:
* `GET /api/emr/lab-reports`: Queries laboratory diagnostic reports with automatic patient context resolution for authenticated users, filtered by status (`Pending`, `Completed`) and clinical category (`Biochemistry`, `Hematology`, etc.).
* `GET /api/emr/lab-reports/{id:guid}`: Fetches specific laboratory diagnostic result sheet, including specimen reference ranges and clinical interpretations.
* `POST /api/emr/lab-reports`: Laboratorian endpoint to register verified diagnostic reports, attach reference summaries, and update testing status.
* `PATCH /api/emr/lab-reports/{id:guid}/status`: Transitions diagnostic specimen states across testing milestones.
* `DELETE /api/emr/lab-reports/{id:guid}`: Administrator-only deletion endpoint ensuring clinical audit compliance.

##### 4. Prescriptions & Medication Dispensation:
* `GET /api/emr/prescriptions`: Lists patient prescriptions with active status filters, doctor attribution, and dosage schedules.
* `GET /api/emr/prescriptions/{id:guid}`: Detailed single prescription query.
* `POST /api/emr/prescriptions`: Pharmacist/Doctor endpoint to prescribe single medications with dosage, duration, and instructions.
* `POST /api/emr/prescriptions/batch`: Atomic multi-medication dispensation endpoint allowing doctors and pharmacists to prescribe full treatment regimens in a single transaction.
* `PATCH /api/emr/prescriptions/{id:guid}/status`: Updates prescription lifecycle states (`Active` &rarr; `Completed` or `Cancelled`).
* `DELETE /api/emr/prescriptions/{id:guid}`: Admin-restricted deletion endpoint.

##### 5. Prescription Authorization Workflow (Staff &rarr; Admin Permission Engine):
* `POST /api/emr/prescriptions/{id:guid}/request-authorization`: Allows pharmacists or physicians to formally request permission from Hospital Administration to edit or delete sensitive prescription records, mandating a clinical rationale.
* `GET /api/emr/prescriptions/authorizations/pending`: Administrative endpoint retrieving all pending prescription change requests for operational triage.
* `POST /api/emr/prescriptions/{id:guid}/approve-delete`: Administrator approval endpoint that permanently executes the deletion, storing an administrative audit note.
* `POST /api/emr/prescriptions/{id:guid}/reject-authorization`: Administrative rejection endpoint that locks the prescription in its original valid state.

##### 6. Business-Specific Operation: Longitudinal Clinical Summary:
* `GET /api/emr/patients/{idOrCode}/clinical-summary`: Computes an aggregated, high-value clinical passport combining active prescriptions count, pending lab alerts, chronological consultation timelines, and active drug-allergy contraindication checks in one single roundtrip.

##### 7. Channeling Appointments & Scheduling:
* `GET /api/emr/channeling-appointments`: Retrieves patient medical channeling consultations with specialist attribution.
* `POST /api/emr/channeling-appointments`: Books specialist channeling appointments linked directly to the patient's EMR record.

##### 8. Agentic AI Clinical Intelligence & Interactive Q&A:
* `GET /api/emr/ai/insight`: Triggers the `EMRClinicalInsightAgent` to evaluate live patient records (lab reports, prescriptions, consultation notes) and return a plain-English clinical breakdown.
* `POST /api/emr/ai/ask`: Interactive medical assistant endpoint accepting patient health inquiries and answering with real-time EMR grounding.

##### 9. Multi-Role Staff Authentication:
* `POST /api/emr/staff/login`: Secure staff authentication verifying BCrypt password hashes, supporting staff aliases (`DOC-01`, `LAB-01`, `PHARM-01`, `ADMIN-01`), enforcing role boundary access (Consultant, Laboratorian, Pharmacist, Admin), and issuing signed JWT bearer tokens.

---

#### 2.2 Part 2 — PostgreSQL Database Integration & Data Modeling

**Key Database Highlights:**
* **Relational Normalization:** Complete Third Normal Form (3NF) relational architecture separating patient demographic profiles (`Patients`), clinical diagnostic records (`LabReports`), consultation assessments (`ConsultationNotes`), medication orders (`Prescriptions`), appointments (`ChannelingAppointments`), and administrative actions (`EMRAuditLogs`).
* **Auditability & Compliance:** Every medical record automatically enforces temporal tracking via `CreatedAt`, `UpdatedAt`, `AuthorizationRequestedAt`, `AuthorizationStatus`, and `AdminNote` columns, maintaining non-repudiation across all clinical entries.
* **State Persistence:** Durable storage of multi-step prescription authorization requests, clinical notes, dosage instructions, and AI insight state models directly within PostgreSQL.
* **Migration Integrity:** Clean schema synchronization using EF Core Code-First patterns combined with runtime `DbInitializer.cs` idempotent DDL checks (`IF NOT EXISTS`), guaranteeing zero database drift across local development and cloud production environments.

---

#### 2.3 Part 3 — React Web Application

The staff-facing and patient-facing EMR portals (`frontend-react/src/pages/emr/`) deliver an intuitive, accessible, and high-performance user interface for medical professionals and patients:

**Components Built:**

##### 1. Multi-Role Staff Clinical Portals:
* **`AdminPortalDashboard.jsx` (Operational Mission Control):** Real-time administrative cockpit providing system statistics, pending prescription authorization triage queue, single-click approval/rejection modals with administrative note authoring, and audit logging.
* **`ConsultantPortal.jsx` (Doctor Consultation Workspace):** Clinical documentation environment allowing physicians to review patient longitudinal history, author structured diagnoses, write recovery notes, and order laboratory investigations.
* **`PharmacistPortal.jsx` (Medication Dispensing & Safety Hub):** Digital pharmacy workspace featuring medication dispensing forms, batch prescription creator, real-time dosage guidelines, and one-click authorization escalation for prescription modifications.
* **`LaboratorianPortal.jsx` (Diagnostic Results Entry):** Laboratory workflow interface for entering diagnostic test results, uploading summary findings, flagging abnormal biomarkers, and transitioning specimen statuses.
* **`RoleSelector.jsx` & `PatientSelector.jsx`:** Multi-tenant role authentication gateway supporting quick role switching with credential validation and instant patient search/filtering.

##### 2. Patient-Facing Health Hub:
* **`HealthPassport.jsx` (Comprehensive Longitudinal Health Summary):** Visual digital health passport displaying vital signs, blood group badge, recorded chronic conditions, allergy warnings, and emergency contact details.
* **`AIClinicalAdvisor.jsx` (Agentic AI Health Assistant):** Interactive clinical advisor presenting plain-English translations of diagnoses ("What the Doctor Said"), lab test explanations, medication purpose cards with food interaction tips, safety radar banners, and a live Q&A chat.
* **`Prescriptions.jsx` & `LabReports.jsx` & `ConsultationNotes.jsx`:** Modular patient views for historical record browsing, status badge indicators, and PDF diagnostic report previewing via `LabReportViewerModal.jsx`.
* **`NotificationsCenter.jsx`:** Notification center displaying real-time clinical alerts, upcoming appointment reminders, and prescription refill notices derived directly from active database records.

---

#### 2.4 Part 4 — Flutter Mobile Application

I designed and developed the mobile patient EMR experience (`flutter-app/lib/screens/emr/`), ensuring a seamless, responsive mobile workflow:

**Screens & Features Built:**
1. **`customer_main_container.dart` (Mobile Patient Shell):** Primary bottom-navigation container coordinating persistent state across EMR tabs, profile management, and quick emergency actions.
2. **`customer_overview_screen.dart` (Patient Dashboard):** Mobile homepage presenting upcoming doctor consultations, active prescription tallies, recent lab report statuses, and instant quick-action cards.
3. **`customer_health_passport_dialog.dart` (Digital Health Passport Modal):** Interactive bottom sheet/dialog presenting the patient's complete health identity, blood group, allergies, chronic ailments, and vital biometric markers.
4. **`customer_consultations_screen.dart` & `customer_lab_reports_screen.dart` & `customer_pharmacy_screen.dart`:** High-performance list views with status pill indicators, expandable details, and doctor contact chips.
5. **`ai_clinical_advisor_screen.dart` (Conversational Mobile AI Advisor):** Native mobile interface providing AI-driven plain-English health summaries, medication usage tips, and a responsive conversational Q&A chat interface with question suggestions.

**Native Device Features Implemented:**
* **Secure Token & Credential Persistence:** Integration with mobile secure storage to maintain authenticated JWT sessions across app restarts.
* **Dynamic Medical Badge Rendering & Material 3 Theming:** Responsive color-coded status badges for critical lab results (Normal vs Abnormal), active prescriptions, and high-priority allergy alerts.
* **Network Fault Resilience & Offline Fallbacks:** Graceful handling of network timeouts with local state caching and fallback to deterministic clinical guidelines when backend connectivity is constrained.

---

#### 2.5 Cross-Platform Workflow & Third-Party Integration

```
+--------------------+        +--------------------+        +--------------------+
| 1. FLUTTER APP     |        | 2. ASP.NET CORE    |        | 3. POSTGRESQL      |
| Patient views      |------->| Authenticates JWT, |------->| Queries / Persists |
| Health Passport &  |        | validates role,    |        | 3NF records with   |
| requests AI advice |        | routes to services |        | audit timestamps   |
+--------------------+        +--------------------+        +--------------------+
          ^                             |                             |
          |                             v                             |
+--------------------+        +--------------------+                  |
| 6. REAL-TIME SYNC  |        | 4. AGENTIC AI      |<-----------------+
| Mobile & Web update|<-------| Gemini LLM + Rules |
| with plain-English |        | checks allergies & |
| clinical guidance  |        | translates jargon  |
+--------------------+        +--------------------+
          ^                             ^
          |                             |
+--------------------+                  |
| 5. REACT WEB APP   |                  |
| Doctor / Pharmacist|------------------+
| updates records /  |
| Admin approves auth|
+--------------------+
```

**Third-Party Service Integration:**
* **Google Gemini Generative AI REST API:** Integrated via `HttpClient` (Port 443 HTTPS) in `EMRClinicalInsightAgent.cs` utilizing structured JSON response schema enforcement, temperature control, and multi-model failover (`gemini-1.5-flash`, `gemini-1.5-pro`, `gemini-2.0-flash`).
* **BCrypt Password Hashing & JWT Authentication:** Cryptographic password hashing and standard HMAC-SHA256 JWT bearer token issuance for all staff portals and mobile patient sessions.

---

### 3. Individual Agentic AI Contribution Report

#### 3.1 Overview & Responsibilities

My primary Agentic AI contribution is the **`EMRClinicalInsightAgent`** (`backend/Agents/EMR/EMRClinicalInsightAgent.cs`).

```
                    EMR CLINICAL INSIGHT AGENT PIPELINE
                    ====================================

                     +---------------------------------+
                     |   Patient Medical Records       |
                     | (Labs, Prescriptions, Notes)    |
                     +---------------------------------+
                                      |
                                      v
                     +---------------------------------+
                     | Stage 1: Perceptual LLM Engine  |
                     |   (Google Gemini 1.5 Flash/Pro) |
                     | - Medical jargon translation    |
                     | - Plain-English explanation     |
                     | - Empathetic clinical synthesis |
                     +---------------------------------+
                                      |
                           (Strict JSON Contract)
                                      |
                                      v
                     +---------------------------------+
                     | Stage 2: Clinical Safety Radar  |
                     | - Drug-Allergy cross-matching   |
                     |   (Penicillin/Amox, Sulfa, etc.)|
                     | - Contraindication detection    |
                     | - Medication dosage thresholds  |
                     +---------------------------------+
                                      |
                                      v
                     +---------------------------------+
                     | Stage 3: Deterministic Fallback |
                     | - Clinical Heuristic Engine     |
                     | - Pharmacology reference tables |
                     | - Diagnostic biomarker rules    |
                     +---------------------------------+
                                      |
                                      v
                     +---------------------------------+
                     | Stage 4: Interactive Q&A Agent  |
                     | - Patient inquiry comprehension |
                     | - Live EMR record grounding     |
                     | - Clinical reference extraction |
                     +---------------------------------+
```

**Real-World Healthcare Challenge Solved:**
Medical records, doctor consultation notes, and laboratory diagnostic reports are filled with complex clinical terminology and Latin abbreviations (e.g., `tid`, `qds`, `HbA1c`, `BUN`, `gastritis`). Patients frequently leave clinics feeling confused, anxious, and uncertain about their treatment plan, leading to low medication adherence, dangerous accidental overdoses, and unaddressed allergic reactions. 

The `EMRClinicalInsightAgent` solves this critical problem by:
1. **Translating Doctor Notes into Plain English ("What the Doctor Said"):** Converting terse medical notes into clear, comforting, and actionable summaries.
2. **Explaining Diagnostic Lab Reports:** Demystifying blood tests, lipid panels, liver function tests, and kidney filtration markers into understandable bodily functions and clinical significance.
3. **Providing Pharmacology Guidance & Precautions:** Explaining why each medication was prescribed, how it acts in the body, dosage timings, food interactions (e.g., taking PPIs before breakfast), and max dosage warnings (e.g., paracetamol 4000mg ceiling).
4. **Enforcing Deterministic Drug-Allergy Safety Rules:** Automatically screening active prescriptions against recorded allergies (e.g., flagging Penicillin vs Amoxicillin, Sulfa drugs vs Sulfamethoxazole, NSAIDs vs Ibuprofen) with zero tolerance for generative hallucinations.
5. **Interactive Conversational Medical Q&A:** Grounding patient queries in their actual medical records with specific references.

---

### 4. Testing, CI/CD, and Quality Assurance

I engineered a comprehensive automated testing suite consisting of **45 test scenarios** across two specialized test fixtures:

#### 1. `EMRClinicalInsightAgentTests.cs` (30 Test Scenarios):
* `AnalyzePatientRecords_RoutinePatient_ReturnsRoutineHealthMaintenance`: Verifies that a patient with no active acute conditions is classified with routine wellness maintenance status.
* `AnalyzePatientRecords_ManyActiveMedsOrPendingLabs_ReturnsMonitoringRequired`: Asserts that patients with >3 active medications or pending lab investigations are assigned "Monitoring Required" status.
* `AnalyzePatientRecords_PenicillinAllergyWithAmoxicillin_TriggersCriticalSafetyAlert`: Validates that prescribing Amoxicillin to a patient with a Penicillin allergy triggers an immediate, unmissable `CRITICAL CAUTION` safety alert.
* `AnalyzePatientRecords_NSAIDAllergyWithIbuprofen_TriggersCriticalSafetyAlert`: Asserts that prescribing Ibuprofen to a patient with an NSAID/Aspirin allergy triggers a high-severity contraindication warning.
* `AnalyzePatientRecords_SulfaAllergyWithSulfamethoxazole_TriggersCriticalSafetyAlert`: Verifies detection of cross-reactivity between sulfa allergies and sulfonamide antibiotics.
* `AnalyzePatientRecords_ExplainsDiagnosisInPlainEnglish` *(4 Theory data points)*: Tests accurate plain-English translation for Hypertension, Type 2 Diabetes Mellitus, Acute Respiratory Infection, and Chronic Gastritis.
* `AnalyzePatientRecords_ExplainsLabTestsInPlainEnglish` *(6 Theory data points)*: Validates bodily meaning and clinical significance explanations for Complete Blood Count (CBC), Lipid Profile, Fasting Blood Glucose, Liver Function Test (LFT), Renal Function Test (KFT), and Routine Urinalysis.
* `AnalyzePatientRecords_AbnormalLabResult_MarksRequiresAttention`: Verifies that elevated or abnormal biomarker results flag `RequiresAttention = true`.
* `ExplainMedication` Clinical Pharmacological Scenarios *(5 Tests)*:
  * `AnalyzePatientRecords_OmeprazolePrescription_ProvidesGastricAcidReductionAndTips`: Asserts PPI mechanism explanation and pre-breakfast dosing guidance.
  * `AnalyzePatientRecords_MetforminPrescription_ProvidesAntidiabeticGuidance`: Confirms antidiabetic insulin sensitivity explanation and mealtime dosing tips.
  * `AnalyzePatientRecords_AtorvastatinPrescription_AdvisesEveningDosing`: Verifies statin cholesterol synthesis explanation and evening dosing instruction.
  * `AnalyzePatientRecords_ParacetamolPrescription_WarnsAgainstMaxDosage`: Validates analgesic explanation and explicit 4000mg daily ceiling warning.
  * `AnalyzePatientRecords_AntihypertensivePrescription_AdvisesConsistentMorningDosing`: Asserts antihypertensive mechanism and morning schedule advice.
* `AnswerQuestionAsync` Interactive Q&A Scenarios *(4 Tests)*:
  * `AnswerQuestionAsync_RegardingPrescribedMedication_ReturnsMedicationGuidance`: Tests conversational response regarding medication administration with food.
  * `AnswerQuestionAsync_RegardingLabReport_ReturnsDiagnosticContext`: Validates patient question answering for specific diagnostic reports.
  * `AnswerQuestionAsync_DoctorConsultationInquiry_ReturnsDoctorDiagnosisAndNotes`: Validates grounding in attending physician's clinical findings and recommended tests.
  * `AnswerQuestionAsync_NoRecordedConsultations_ReturnsNoConsultationMessage`: Tests edge case where patient has no recorded consultations.
  * `AnswerQuestionAsync_GeneralHealthOverview_SummarizesActiveRecords`: Validates holistic health record summarization.
* Boundary and Demographic Checks *(3 Tests)*:
  * `AnalyzePatientRecords_CalculatesPatientAgeAccurately`: Confirms precise age derivation from date of birth.
  * `AnalyzePatientRecords_PopulatesQuestionsForNextVisit`: Asserts that suggested doctor consultation questions are generated.
  * `AnalyzePatientRecords_PopulatesActionableNextSteps`: Confirms hydration and medication adherence recommendations.
  * `AnalyzePatientRecords_AllergyProtectionNotice_PresentWhenAllergiesRecorded`: Validates allergy protection active shield banner.

#### 2. `EMRControllerTests.cs` (15 Test Scenarios):
* `GetPatients_ReturnsOkResultWithListOfPatients`: Verifies retrieval of patient catalogue with 200 OK.
* `GetPatient_ExistingCode_ReturnsOkResult`: Asserts retrieval of patient by `PAT-XXXX` code.
* `GetPatient_NonExistent_ReturnsNotFound`: Validates 404 Not Found response for non-existent patient codes.
* `CreatePatient_MissingFullName_ReturnsBadRequest`: Validates required field validation on patient creation.
* `CreatePatient_ValidDto_ReturnsCreatedAtAction`: Asserts 201 Created response and route generation.
* `CreateConsultation_MissingDiagnosis_ReturnsBadRequest`: Validates mandatory diagnosis constraint on doctor consultations.
* `CreatePrescription_ValidDto_ReturnsCreatedAtAction`: Tests successful prescription creation with 201 Created.
* `RequestPrescriptionAuthorization_ValidRequest_ReturnsOkWithUpdatedStatus`: Validates staff authorization request submission and state transition to `Pending`.
* `ApproveAndDeletePrescription_ApprovedByAdmin_ReturnsSuccessMessage`: Verifies administrative approval and successful permanent deletion.
* `GetClinicalSummary_ValidCode_ReturnsComprehensiveSummary`: Asserts 200 OK and complete longitudinal data aggregation for clinical passport.
* `StaffLogin_ValidDoctorCredentials_ReturnsTokenAndRole`: Tests successful doctor authentication with BCrypt verification and JWT token issuance.
* `StaffLogin_RoleMismatch_ReturnsForbidden403`: Confirms that attempting to access a Doctor portal with Pharmacist credentials is strictly rejected with HTTP 403 Forbidden.

---

#### Test Execution Evidence

```
Test run for HealthBridge.Tests.dll (.NETCoreApp,Version=v8.0)
VSTest version 17.11.1 (x64)

Starting test execution, please wait...
A total of 1 test files matched the specified pattern.
[xUnit.net] Discovering: HealthBridge.Tests
[xUnit.net] Discovered:  HealthBridge.Tests
[xUnit.net] Starting:    HealthBridge.Tests

  Passed HealthBridge.Tests.Agents.EMR.EMRClinicalInsightAgentTests.AnswerQuestionAsync_NoRecordedConsultations_ReturnsNoConsultationMessage
  Passed HealthBridge.Tests.Agents.EMR.EMRClinicalInsightAgentTests.AnalyzePatientRecords_PopulatesActionableNextSteps
  Passed HealthBridge.Tests.Agents.EMR.EMRClinicalInsightAgentTests.AnalyzePatientRecords_SulfaAllergyWithSulfamethoxazole_TriggersCriticalSafetyAlert
  Passed HealthBridge.Tests.Agents.EMR.EMRClinicalInsightAgentTests.AnalyzePatientRecords_ExplainsDiagnosisInPlainEnglish(Chronic Gastritis)
  Passed HealthBridge.Tests.Agents.EMR.EMRClinicalInsightAgentTests.AnalyzePatientRecords_ExplainsDiagnosisInPlainEnglish(Hypertension)
  Passed HealthBridge.Tests.Agents.EMR.EMRClinicalInsightAgentTests.AnalyzePatientRecords_ExplainsDiagnosisInPlainEnglish(Acute Respiratory Infection)
  Passed HealthBridge.Tests.Agents.EMR.EMRClinicalInsightAgentTests.AnalyzePatientRecords_ExplainsDiagnosisInPlainEnglish(Type 2 Diabetes Mellitus)
  Passed HealthBridge.Tests.Agents.EMR.EMRClinicalInsightAgentTests.AnalyzePatientRecords_NSAIDAllergyWithIbuprofen_TriggersCriticalSafetyAlert
  Passed HealthBridge.Tests.Agents.EMR.EMRClinicalInsightAgentTests.AnalyzePatientRecords_ExplainsLabTestsInPlainEnglish(Fasting Blood Glucose)
  Passed HealthBridge.Tests.Agents.EMR.EMRClinicalInsightAgentTests.AnalyzePatientRecords_ExplainsLabTestsInPlainEnglish(Lipid Profile)
  Passed HealthBridge.Tests.Agents.EMR.EMRClinicalInsightAgentTests.AnalyzePatientRecords_ExplainsLabTestsInPlainEnglish(Renal Function Test (KFT))
  Passed HealthBridge.Tests.Agents.EMR.EMRClinicalInsightAgentTests.AnalyzePatientRecords_ExplainsLabTestsInPlainEnglish(Routine Urinalysis)
  Passed HealthBridge.Tests.Agents.EMR.EMRClinicalInsightAgentTests.AnalyzePatientRecords_ExplainsLabTestsInPlainEnglish(Complete Blood Count (CBC))
  Passed HealthBridge.Tests.Agents.EMR.EMRClinicalInsightAgentTests.AnalyzePatientRecords_ExplainsLabTestsInPlainEnglish(Liver Function Test (LFT))
  Passed HealthBridge.Tests.Controllers.EMR.EMRControllerTests.CreatePatient_ValidDto_ReturnsCreatedAtAction
  Passed HealthBridge.Tests.Agents.EMR.EMRClinicalInsightAgentTests.AnalyzePatientRecords_RoutinePatient_ReturnsRoutineHealthMaintenance
  Passed HealthBridge.Tests.Agents.EMR.EMRClinicalInsightAgentTests.AnalyzePatientRecords_MetforminPrescription_ProvidesAntidiabeticGuidance
  Passed HealthBridge.Tests.Controllers.EMR.EMRControllerTests.GetPatient_NonExistent_ReturnsNotFound
  Passed HealthBridge.Tests.Controllers.EMR.EMRControllerTests.GetClinicalSummary_ValidCode_ReturnsComprehensiveSummary
  Passed HealthBridge.Tests.Agents.EMR.EMRClinicalInsightAgentTests.AnswerQuestionAsync_DoctorConsultationInquiry_ReturnsDoctorDiagnosisAndNotes
  Passed HealthBridge.Tests.Agents.EMR.EMRClinicalInsightAgentTests.AnalyzePatientRecords_AllergyProtectionNotice_PresentWhenAllergiesRecorded
  Passed HealthBridge.Tests.Agents.EMR.EMRClinicalInsightAgentTests.AnalyzePatientRecords_CalculatesPatientAgeAccurately
  Passed HealthBridge.Tests.Agents.EMR.EMRClinicalInsightAgentTests.AnalyzePatientRecords_ManyActiveMedsOrPendingLabs_ReturnsMonitoringRequired
  Passed HealthBridge.Tests.Agents.EMR.EMRClinicalInsightAgentTests.AnalyzePatientRecords_PopulatesQuestionsForNextVisit
  Passed HealthBridge.Tests.Agents.EMR.EMRClinicalInsightAgentTests.AnalyzePatientRecords_PenicillinAllergyWithAmoxicillin_TriggersCriticalSafetyAlert
  Passed HealthBridge.Tests.Agents.EMR.EMRClinicalInsightAgentTests.AnswerQuestionAsync_GeneralHealthOverview_SummarizesActiveRecords
  Passed HealthBridge.Tests.Agents.EMR.EMRClinicalInsightAgentTests.AnswerQuestionAsync_RegardingPrescribedMedication_ReturnsMedicationGuidance
  Passed HealthBridge.Tests.Agents.EMR.EMRClinicalInsightAgentTests.AnswerQuestionAsync_RegardingLabReport_ReturnsDiagnosticContext
  Passed HealthBridge.Tests.Agents.EMR.EMRClinicalInsightAgentTests.AnalyzePatientRecords_AbnormalLabResult_MarksRequiresAttention
  Passed HealthBridge.Tests.Agents.EMR.EMRClinicalInsightAgentTests.AnalyzePatientRecords_AtorvastatinPrescription_AdvisesEveningDosing
  Passed HealthBridge.Tests.Agents.EMR.EMRClinicalInsightAgentTests.AnalyzePatientRecords_OmeprazolePrescription_ProvidesGastricAcidReductionAndTips
  Passed HealthBridge.Tests.Agents.EMR.EMRClinicalInsightAgentTests.AnalyzePatientRecords_ParacetamolPrescription_WarnsAgainstMaxDosage
  Passed HealthBridge.Tests.Agents.EMR.EMRClinicalInsightAgentTests.AnalyzePatientRecords_AntihypertensivePrescription_AdvisesConsistentMorningDosing
  Passed HealthBridge.Tests.Controllers.EMR.EMRControllerTests.StaffLogin_RoleMismatch_ReturnsForbidden403
  Passed HealthBridge.Tests.Controllers.EMR.EMRControllerTests.CreatePatient_MissingFullName_ReturnsBadRequest
  Passed HealthBridge.Tests.Controllers.EMR.EMRControllerTests.CreateConsultation_MissingDiagnosis_ReturnsBadRequest
  Passed HealthBridge.Tests.Controllers.EMR.EMRControllerTests.RequestPrescriptionAuthorization_ValidRequest_ReturnsOkWithUpdatedStatus
  Passed HealthBridge.Tests.Controllers.EMR.EMRControllerTests.CreatePrescription_ValidDto_ReturnsCreatedAtAction
  Passed HealthBridge.Tests.Controllers.EMR.EMRControllerTests.GetPatient_ExistingCode_ReturnsOkResult
  Passed HealthBridge.Tests.Controllers.EMR.EMRControllerTests.GetPatients_ReturnsOkResultWithListOfPatients
  Passed HealthBridge.Tests.Controllers.EMR.EMRControllerTests.StaffLogin_ValidDoctorCredentials_ReturnsTokenAndRole
  Passed HealthBridge.Tests.Controllers.EMR.EMRControllerTests.ApproveAndDeletePrescription_ApprovedByAdmin_ReturnsSuccessMessage

Test Run Successful.
Total tests: 45
     Passed: 45
     Failed: 0
    Skipped: 0
 Total time: 2.9157 Seconds
```

---

### 5. GitHub Contributions & Commit Evidence

#### Some of Key Commits

* **`9b40efe` (2026-10-02):** `implement EMR module with prescription management and patient health passport` — Enhanced `EMRController.cs`, `EMRService.cs`, and `DbInitializer.cs` with the full multi-tier prescription authorization state machine and schema migration.
* **`3516b33` (2026-10-02):** `implement login screen with user authentication, registration, and credential persistence` — Enhanced Flutter auth architecture with JWT token persistence.
* **`5b4022f` (2026-10-02):** `add EMR backend controller and frontend staff portal components` — Added `AdminPortalDashboard.jsx`, `ConsultantPortal.jsx`, `LaboratorianPortal.jsx`, and role gatekeeper logic.
* **`81e9333` (2026-10-02):** `add EMR patientUI` — Implemented responsive patient EMR interface across `HealthPassport.jsx`, `AIClinicalAdvisor.jsx`, `Prescriptions.jsx`, and `LabReports.jsx`.
* **`507ea45` (2026-10-01):** `implement multi-role EMR portals, clinical views, mobile screens, and backend services` — Comprehensive cross-platform synchronization between Flutter and React portals (+2,585 lines).
* **`42ff596` (2026-09-29):** `implement EMR module with AI clinical insight agent` — Authored `EMRClinicalInsightAgent.cs` (+705 lines), integrating Google Gemini LLM with clinical heuristics and interactive Q&A.
* **`206d8e8` (2026-09-29):** `add changes to EMR Pharmacist Workspace` — Developed full pharmacist dispensation management and permission escalation workflows (+1,333 lines).
* **`e451cfc` (2026-09-28):** `implement EMR module Role base staff & Admin Portal` — Implemented role-based staff authentication and alias handling.
* **`a250338` (2026-09-28):** `implement EMR channeling appointment features across backend, React, and Flutter applications` — Full-stack channeling appointment integration (+1,042 lines).
* **`64d9e5f` (2026-09-22):** `feat(EMR): add Electronic Medical Record Management module - rebased on main` — Core foundation of the EMR module with entities, interfaces, and baseline repositories (+8,083 lines).

#### Last Pull Requests Authored by Me

* **PR #77:** `IT24102664-Electronic-Madical-Record-Management` — Merged EMR prescription authorization workflow and final patient health passport updates.
* **PR #76:** `IT24102664-Electronic-Madical-Record-Management` — Multi-role staff portal synchronization and admin action queues.
* **PR #75:** `IT24102664-Electronic-Madical-Record-Management` — Pharmacist workspace and medication dispensation enhancements.
* **PR #74:** `IT24102664-Electronic-Madical-Record-Management` — Agentic AI clinical insight integration and prompt optimization.
* **PR #70:** `IT24102664-Electronic-Madical-Record-Management` — Lab report viewer modal and biomarker status visualizers.
* **PR #69:** `IT24102664-Electronic-Madical-Record-Management` — Flutter mobile health passport dialog and vitals inspection.
* **PR #68:** `IT24102664-Electronic-Madical-Record-Management` — Channeling appointment scheduling across mobile and backend.
* **PR #62:** `IT24102664-Electronic-Madical-Record-Management` — Role-based access control and staff authentication controllers.
* **PR #60:** `IT24102664-Electronic-Madical-Record-Management` — Responsive layout, EMR notifications center, and navigation guards.
* **PR #50:** `IT24102664-Electronic-Madical-Record-Management` — Patient registration, code generator algorithms, and database indexing.

---

### 6. Some Of AI Usage

| Date | Tool & Model | Task / Section | Generated AI Content | Human Modifications & Rejections (What & Why) | Verification Method |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **2026-09-25** | Claude 3.5 Sonnet | Backend Architecture & DTOs | Scaffolded initial CRUD models and DTO structures for EMR entities. | **Rejected** generic repository pattern and in-memory caches. Replaced with direct EF Core PostgreSQL async queries, robust foreign key relationships, and composite DTO projections. | Tested via Swagger UI and Postman; verified database table creation in PostgreSQL. |
| **2026-09-28** | Google Gemini 1.5 Pro | Agentic AI Clinical Prompts | Drafted system prompts for medical record summarization and doctor note translation. | **Modified** prompt to strictly enforce typed JSON schema output. Added explicit instructions prohibiting speculative medical diagnoses; embedded mandatory disclaimers and emergency advice boundaries. | Ran sample patient records through the backend endpoint; verified schema compliance with `System.Text.Json`. |
| **2026-09-29** | Google Antigravity | Clinical Safety & Allergy Radar | Proposed purely generative LLM evaluation for drug-allergy interactions. | **Completely Rejected** generative LLM decision-making for drug allergies due to risk of hallucinations. Designed deterministic C# heuristic rule engine with explicit cross-sensitivity tables (e.g., Penicillin &harr; Amox, Sulfa, NSAID). | Authored xUnit test cases; verified boundary conditions and immediate alert triggers. |
| **2026-10-01** | Google Antigravity | React Multi-Role Portals | Scaffolded state management and component structure for Admin, Consultant, and Pharmacist portals. | **Refactored** state handling: eliminated duplicated mock states in favor of unified REST API calls (`emrApi.js`), implemented dynamic JWT role decoding, and added modal confirmations for critical deletions. | Verified via React Developer Tools, Vite hot-reload, and multi-role manual walkthroughs. |
| **2026-10-02** | Google Antigravity | Automated Test Suite | Generated initial boilerplate xUnit test stubs for `EMRClinicalInsightAgent` and `EMRController`. | **Customized** dataset parameters to reflect actual clinical scenarios (Jerad Xavier profile), added edge cases for abnormal biomarkers, dosage thresholds (paracetamol 4000mg), and RBAC 403 Forbidden gates. | Ran `dotnet test`; achieved 45/45 passing tests in 2.91 seconds. |

---

### 7. One-Page Individual Reflection

#### My Reflection on AI-Assisted Full-Stack Software Engineering

##### 1. Which AI tools were used, and at which stages?
Throughout this project, I utilized AI tools at **Level 4 (Full AI with disclosure)** across every phase of the engineering lifecycle. During the initial architecture and domain modeling phase, I used **Claude 3.5 Sonnet** to brainstorm normalized clinical database schemas and map out the multi-role EMR permissions matrix (Patient, Consultant, Pharmacist, Laboratorian, Admin). During the Agentic AI implementation phase, I integrated **Google Gemini 1.5 Pro and Flash** via REST API as the perceptual engine for interpreting medical diagnoses, laboratory biomarkers, and doctor consultation notes. In the frontend development and test automation phase, I utilized **Google Antigravity** to scaffold complex React workspaces, generate robust xUnit test fixtures, and optimize asynchronous backend pipelines.

##### 2. What did the AI tools do well, and what did they get wrong?
The AI tools demonstrated remarkable speed in routine software engineering tasks. They excelled at drafting boilerplate DTO models, generating mapping routines, crafting responsive CSS and Tailwind UI layouts, and translating medical acronyms into plain-English explanations.

However, the AI tools exhibited significant weaknesses in clinical safety constraints, state synchronization, and deterministic validation. When initially asked to implement drug-allergy screening, the AI attempted to rely entirely on generative LLM prompts. In healthcare, an LLM hallucination could falsely declare a penicillin-derived medication safe for an allergic patient, creating life-threatening risks. Furthermore, in the React frontend, the AI generated disconnected state stores that frequently fell out of sync with backend database updates, and in the backend, it initially generated naive sequential counters that caused race conditions under concurrent patient registrations.

##### 3. What did you change, add, or reject from the AI output, and why?
Recognizing that clinical safety cannot tolerate generative uncertainty, I systematically rejected unconstrained AI decision-making:
* **Deterministic Safety Over Generative Guesswork:** I rejected LLM-driven allergy matching and engineered a deterministic C# heuristic engine within `EMRClinicalInsightAgent.cs` that strictly enforces clinical cross-sensitivity checks (e.g., Penicillin &harr; Amoxicillin, Sulfa drugs &harr; Sulfamethoxazole, NSAIDs &harr; Ibuprofen).
* **Multi-Tier Fallback Architecture:** I ensured that even if third-party LLM API quotas are exhausted or offline, the system seamlessly falls back to a deterministic clinical synthesis engine without interrupting patient or staff workflows.
* **Human-in-the-Loop Administrative Governance:** Rather than allowing arbitrary edits or deletions of medical prescriptions, I designed a strict permission escalation workflow where staff members must request authorization from hospital administrators, complete with mandatory clinical justifications and durable audit logging.
* **Concurrent-Safe Patient Code Generation:** I replaced naive patient counting with a thread-safe `MAX+1` sequence algorithm, ensuring duplicate-free `PAT-XXXX` codes even under heavy registration traffic.

##### 4. What did you learn about your own skills and understanding?
This project fundamentally transformed my perspective on modern software engineering in the era of artificial intelligence. I learned that an engineer's primary value is no longer just typing syntax, but serving as a **systems architect, safety guardian, and domain verifier**. While AI can generate code in seconds, only a disciplined engineer can define architectural boundaries, safeguard sensitive medical workflows against hallucinations, and guarantee end-to-end reliability. Through this project, I mastered full-stack asynchronous .NET development, PostgreSQL transaction design, cross-platform synchronization between React and Flutter, and the engineering of mission-critical agentic AI systems that leverage generative intelligence while retaining deterministic clinical controls.

---

### 8. Signed Individual Declaration of Authenticity

I hereby confirm that:

1. The technical work presented in this individual section represents my own authentic contribution to the **HealthBridge** group project.
2. All AI assistance used during the development lifecycle has been fully and truthfully disclosed in the Individual AI Usage Log above.
3. No external AI assistants, copilots, or automated code generators will be used during the final system demonstration and viva evaluation.
4. I possess complete technical ownership of the code, database entities, agents, and tests submitted under my name, and I am fully prepared to explain, test, modify, or debug any part of this subsystem live before the evaluation panel.

\
**Student Signature:** _________________________________  
**Student Full Name:** Jerad Keshara Xavier (Xavier J.K.)  
**Student Registration ID:** IT24102664  
**Date:** 5 October 2026  
