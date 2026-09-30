using System.Collections.Generic;

namespace HealthBridge.Api.DTOs.Pharmacy;

/// <summary>
/// Authenticity Signals captured by Stage 1 extraction.
/// Pharmacy-specific variant (Pp = Pharmacy Prescription).
/// </summary>
public class AuthenticitySignalsPpDto
{
    // ─────────────────────────────────────────────
    // Contact info plausibility
    // ─────────────────────────────────────────────
    public bool PhoneLooksLikePlaceholder { get; set; }
    public string PhoneReasoning { get; set; } = string.Empty;

    public bool EmailLooksValid { get; set; }
    public string EmailReasoning { get; set; } = string.Empty;

    public bool AddressLooksPlausible { get; set; }
    public string AddressReasoning { get; set; } = string.Empty;

    // ─────────────────────────────────────────────
    // Visual rendering evidence
    // ─────────────────────────────────────────────
    public bool ShowsUiChrome { get; set; }
    public string UiChromeReasoning { get; set; } = string.Empty;

    /// <summary>
    /// photographed_paper | scanned_document | flat_vector_graphic | screenshot
    /// </summary>
    public string RenderingStyle { get; set; } = string.Empty;

    public string RenderingReasoning { get; set; } = string.Empty;
}

/// <summary>
/// Pharmacy Prescription AI Verification Response (Unique AI Feature — Pp variant).
///
/// ARCHITECTURE:
///   Stage 1 → Extracts facts (doctor, drugs, watermarks, rendering style)
///   Stage 2 → AI suggests verdict (advisory only, NOT auto-action)
///   Stage 3 → C# safety rules apply hard overrides
///
/// DESIGN PRINCIPLE:
///   AI = ADVISORY. Pharmacist = FINAL DECISION MAKER.
/// </summary>
public class AIPpVerificationResponse
{
    // ─────────────────────────────────────────────
    // Primary status (drives UI badge)
    // ─────────────────────────────────────────────
    /// <summary>
    /// PRE_APPROVED | FLAGGED | REJECTED
    /// NOTE: This is a UI hint only. Pharmacist still decides final action.
    /// </summary>
    public string Status { get; set; } = string.Empty;

    /// <summary>
    /// AI confidence in its own analysis (0.0 – 1.0).
    /// </summary>
    public double Confidence { get; set; }

    // ─────────────────────────────────────────────
    // Document classification
    // ─────────────────────────────────────────────
    /// <summary>
    /// HANDWRITTEN_PRESCRIPTION | COMPUTER_PRINTED_PRESCRIPTION |
    /// NON_MEDICAL_IMAGE | NON_PRESCRIPTION_DOCUMENT | SUSPICIOUS_FORGERY
    /// </summary>
    public string DocumentClassification { get; set; } = "UNKNOWN";

    /// <summary>
    /// handwritten_prescription | printed_prescription |
    /// unrelated_document | random_photo
    /// </summary>
    public string DocumentCategory { get; set; } = string.Empty;

    public string DocumentTypeDescription { get; set; } = string.Empty;

    public bool IsValidMedicalPrescription { get; set; }
    public bool IsForgeryOrTrainingSample { get; set; }

    // ─────────────────────────────────────────────
    // Overlay / annotation detection
    // ─────────────────────────────────────────────
    public List<string> VisibleWatermarkOrOverlayText { get; set; } = new();
    public List<string> AnnotationErrorLabelsPresent { get; set; } = new();

    // ─────────────────────────────────────────────
    // Extracted clinical data
    // ─────────────────────────────────────────────
    public List<string> ExtractedTests { get; set; } = new();
    public List<string> DrugNames { get; set; } = new();

    // ─────────────────────────────────────────────
    // Extracted document fields
    // ─────────────────────────────────────────────
    public string RequestedTest { get; set; } = string.Empty;
    public bool MatchFound { get; set; }

    public string? DoctorName { get; set; }
    public string? DoctorLicenseNumber { get; set; }
    public string? ClinicName { get; set; }
    public string? ClinicPhone { get; set; }
    public string? ClinicEmail { get; set; }
    public string? ClinicAddress { get; set; }
    public string? PatientName { get; set; }
    public string? DateWritten { get; set; }
    public string? PrescriptionDate { get; set; }

    public bool HasSignature { get; set; }
    public bool HasStampOrSeal { get; set; }

    // ─────────────────────────────────────────────
    // Authenticity signals (nested DTO)
    // ─────────────────────────────────────────────
    public AuthenticitySignalsPpDto AuthenticitySignals { get; set; } = new();

    // ═════════════════════════════════════════════
    // AI VERDICT — ADVISORY ONLY (unique to pharmacy)
    // ═════════════════════════════════════════════

    /// <summary>
    /// AI-suggested verdict. NOT an automated action.
    /// Values: looks_valid | has_concerns | unclear | not_a_prescription
    /// </summary>
    public string Verdict { get; set; } = string.Empty;

    /// <summary>
    /// Human-readable explanation of the AI's reasoning.
    /// Shown to the pharmacist for decision support.
    /// </summary>
    public string VerdictReasoning { get; set; } = string.Empty;

    /// <summary>
    /// Numeric risk score 0–100 (0 = safe, 100 = high risk).
    /// UI displays this as "Overall Risk Score: XX/100".
    /// </summary>
    public int AiRiskScore { get; set; }

    /// <summary>
    /// LOW | MEDIUM | HIGH — derived from AiRiskScore for quick UI display.
    /// </summary>
    public string AiRiskLevel { get; set; } = "LOW";

    /// <summary>
    /// Specific concerns the AI (or C# rules) detected.
    /// UI displays these as a bullet list of flags.
    /// </summary>
    public List<string> SecurityFlags { get; set; } = new();

    /// <summary>
    /// AI-generated violation notice message (for Admin Violation tab).
    /// Populated ONLY when a violation is detected (suspicious content, fake documents, etc).
    /// Empty for normal (non-violation) cases.
    /// Example: "We detected that you uploaded an invalid non-medical image..."
    /// </summary>
    public string AiViolationNotice { get; set; } = string.Empty;

    // ─────────────────────────────────────────────
    // Processing metadata (audit / debugging)
    // ─────────────────────────────────────────────
    /// <summary>
    /// stage1_complete | stage2_complete | stage3_complete
    /// </summary>
    public string ProcessingStage { get; set; } = string.Empty;

    public long ProcessingTimeMs { get; set; }

    /// <summary>
    /// Which AI model was used (e.g. "gemini-3.8-flash").
    /// </summary>
    public string AiModelUsed { get; set; } = string.Empty;

    // ─────────────────────────────────────────────
    // Developer-facing
    // ─────────────────────────────────────────────
    public string Notes { get; set; } = string.Empty;
    public string AuditLog { get; set; } = string.Empty;
}