using System.ComponentModel.DataAnnotations;

namespace HealthBridge.Api.DTOs.Pharmacy;

public class CreatePharmacyOrderItemRequest
{
    [Required]
    public int MedicineId { get; set; }

    [Required]
    public int Quantity { get; set; }
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

public class PrescriptionSafetyResponse
{
    public int RiskScore { get; set; }
    public List<string> Flags { get; set; } = new();
    public string RecommendedAction { get; set; } = "APPROVE";
    public string? AdminNote { get; set; }
}

public class UpdatePharmacyOrderStatusRequest
{
    [Required]
    public string Status { get; set; } = string.Empty;
    public string? AdminNote { get; set; }
    public bool? PatientConfirmed { get; set; }
    public decimal? TotalAmount { get; set; }
}
