using System.Collections.Generic;

namespace HealthBridge.Api.DTOs.Lab;

public class AuthenticitySignalsDto
{
    public bool PhoneLooksLikePlaceholder { get; set; }
    public string PhoneReasoning { get; set; } = string.Empty;
    public bool EmailLooksValid { get; set; }
    public string EmailReasoning { get; set; } = string.Empty;
    public bool AddressLooksPlausible { get; set; }
    public string AddressReasoning { get; set; } = string.Empty;
    public bool ShowsUiChrome { get; set; }
    public string UiChromeReasoning { get; set; } = string.Empty;
    public string RenderingStyle { get; set; } = string.Empty; // photographed_paper | flat_vector_graphic | screenshot | scanned_document
    public string RenderingReasoning { get; set; } = string.Empty;
}

public class AIVerificationResponse
{
    public string Status { get; set; } = string.Empty; // PRE_APPROVED / FLAGGED / REJECTED
    public double Confidence { get; set; }
    public string DocumentClassification { get; set; } = "UNKNOWN"; // HANDWRITTEN_PRESCRIPTION | COMPUTER_PRINTED_PRESCRIPTION | NON_MEDICAL_IMAGE | NON_PRESCRIPTION_DOCUMENT | SUSPICIOUS_FORGERY
    public string DocumentCategory { get; set; } = string.Empty; // handwritten_prescription | printed_prescription | unrelated_document | random_photo
    public string DocumentTypeDescription { get; set; } = string.Empty;
    public bool IsValidMedicalPrescription { get; set; }
    public bool IsForgeryOrTrainingSample { get; set; }
    
    public List<string> VisibleWatermarkOrOverlayText { get; set; } = new();
    public List<string> AnnotationErrorLabelsPresent { get; set; } = new();
    public List<string> SecurityFlags { get; set; } = new();
    public List<string> ExtractedTests { get; set; } = new();
    public List<string> DrugNames { get; set; } = new();
    
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
    
    public AuthenticitySignalsDto AuthenticitySignals { get; set; } = new();
    public string Verdict { get; set; } = string.Empty; // real | likely_fake | not_a_prescription | needs_human_review
    public string VerdictReasoning { get; set; } = string.Empty;

    public string Notes { get; set; } = string.Empty;
    public string AuditLog { get; set; } = string.Empty;
}
