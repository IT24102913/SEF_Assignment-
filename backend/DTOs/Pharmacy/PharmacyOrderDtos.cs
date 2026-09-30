using System.ComponentModel.DataAnnotations;

namespace HealthBridge.Api.DTOs.Pharmacy;

public class CreatePharmacyOrderItemRequest
{
    [Required]
    public int MedicineId { get; set; }

    [Required]
    public int Quantity { get; set; }

    public string? UnitType { get; set; }
    public string? MedicineName { get; set; }
    public decimal? Price { get; set; }
    public decimal? UnitPrice { get; set; }
}

public class CreatePharmacyOrderRequest
{
    public int? PatientId { get; set; }

    [Required]
    public string CustomerName { get; set; } = string.Empty;

    [Required]
    public string CustomerEmail { get; set; } = string.Empty;

    public string? CustomerPhone { get; set; }
    public string? DeliveryAddress { get; set; }
    public string PaymentMethod { get; set; } = "CashOnDelivery";

    public string? PrescriptionImageUrl { get; set; }
    public int? DaysSupply { get; set; }

    public List<CreatePharmacyOrderItemRequest> Items { get; set; } = new();
}

public class PharmacyOrderItemResponse
{
    public int Id { get; set; }
    public int MedicineId { get; set; }
    public string MedicineName { get; set; } = string.Empty;
    public decimal UnitPrice { get; set; }
    public int Quantity { get; set; }
    public decimal Subtotal { get; set; }
    public string UnitType { get; set; } = "Pill";
}

public class PharmacyOrderResponse
{
    public int Id { get; set; }
    public string OrderNumber { get; set; } = string.Empty;
    public int? PatientId { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public string CustomerEmail { get; set; } = string.Empty;
    public string? CustomerPhone { get; set; }
    public string? DeliveryAddress { get; set; }
    public decimal TotalAmount { get; set; }
    public string PaymentMethod { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string? PrescriptionImageUrl { get; set; }
    public int? DaysSupply { get; set; }
    public string? AdminNote { get; set; }
    public bool PatientConfirmed { get; set; }
    public DateTime CreatedAt { get; set; }
    public string? PrescriptionHash { get; set; }
    public int? SafetyRiskScore { get; set; }
    public List<string> SafetyFlags { get; set; } = new();
    public string? SafetyRecommendedAction { get; set; }
    public DateTime? SafetyValidatedAt { get; set; }
    public List<PharmacyOrderItemResponse> Items { get; set; } = new();
}

/// <summary>
/// Prescription safety evaluation response.
///
/// Flags are categorized into 4 groups for pharmacist UI:
///   - AiVisionFlags   : AI vision findings (watermark, UI chrome, fake phone, etc.)
///   - SafetyFlags     : Anti-abuse & pattern detection (duplicate, refill, history)
///   - VerifiedSignals : Positive signals (handwriting verified, signature present)
///   - SystemFlags     : AI processing issues (Stage 1 fail, timeouts)
///
/// The legacy "Flags" list is kept for backward compatibility and contains all flags combined.
/// </summary>
public class PrescriptionSafetyResponse
{
    // ─────────────────────────────────────────────
    // Primary risk indicators
    // ─────────────────────────────────────────────
    public int RiskScore { get; set; }
    public string RecommendedAction { get; set; } = "APPROVE";
    public string? AdminNote { get; set; }

    // ─────────────────────────────────────────────
    // Legacy combined flags list (kept for backward compat)
    // ─────────────────────────────────────────────
    public List<string> Flags { get; set; } = new();

    // ─────────────────────────────────────────────
    // 🆕 Categorized flags for pharmacist UI
    // ─────────────────────────────────────────────

    /// <summary>
    /// AI Vision findings — detected from the prescription image.
    /// Examples: watermark detected, UI chrome, fake phone/email, forged template.
    /// UI: Display in RED section.
    /// </summary>
    public List<string> AiVisionFlags { get; set; } = new();

    /// <summary>
    /// Safety & anti-abuse signals — pattern-based detection.
    /// Examples: duplicate prescription, early refill, suspicious patient history.
    /// UI: Display in YELLOW/ORANGE section.
    /// </summary>
    public List<string> SafetyFlags { get; set; } = new();

    /// <summary>
    /// Positive/verified signals — good signs detected.
    /// Examples: handwriting verified, signature present, valid contact info.
    /// UI: Display in GREEN section.
    /// </summary>
    public List<string> VerifiedSignals { get; set; } = new();

    /// <summary>
    /// System/processing issues — AI could not complete analysis.
    /// Examples: Stage 1 extraction failed, API timeout.
    /// UI: Display in GRAY section with warning icon.
    /// </summary>
    public List<string> SystemFlags { get; set; } = new();
}

public class UpdatePharmacyOrderStatusRequest
{
    [Required]
    public string Status { get; set; } = string.Empty;
    public string? AdminNote { get; set; }
    public bool? PatientConfirmed { get; set; }
    public decimal? TotalAmount { get; set; }
}

public class PharmacyOrderReportItemDto
{
    public string OrderNumber { get; set; } = string.Empty;
    public string Date { get; set; } = string.Empty;
    public string CustomerName { get; set; } = string.Empty;
    public decimal TotalAmount { get; set; }
    public string Status { get; set; } = string.Empty;
}

public class SendSalesReportRequest
{
    [Required]
    public string RecipientEmail { get; set; } = string.Empty;
    public string? Note { get; set; }
    public decimal TotalRevenue { get; set; }
    public int TotalOrders { get; set; }
    public string ReportDate { get; set; } = string.Empty;
    public List<PharmacyOrderReportItemDto>? Items { get; set; }
}