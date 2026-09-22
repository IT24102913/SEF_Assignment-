using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HealthBridge.Api.Models;

public class PharmacyOrder
{
    public int Id { get; set; }

    [Required]
    [MaxLength(50)]
    public string OrderNumber { get; set; } = string.Empty;

    public int? PatientId { get; set; }

    [ForeignKey(nameof(PatientId))]
    public User? Patient { get; set; }

    [Required]
    [MaxLength(100)]
    public string CustomerName { get; set; } = string.Empty;

    [Required]
    [MaxLength(150)]
    public string CustomerEmail { get; set; } = string.Empty;

    [MaxLength(20)]
    public string? CustomerPhone { get; set; }

    [MaxLength(250)]
    public string? DeliveryAddress { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal TotalAmount { get; set; }

    [MaxLength(50)]
    public string PaymentMethod { get; set; } = "CashOnDelivery"; // CashOnDelivery, Card, Online

    [Required]
    [MaxLength(50)]
    public string Status { get; set; } = "Pending"; // Pending, PendingVerification, Approved, Confirmed, Dispatched, Delivered, Cancelled

    [Column(TypeName = "text")]
    public string? PrescriptionImageUrl { get; set; }

    public int? DaysSupply { get; set; }

    [MaxLength(1000)]
    public string? AdminNote { get; set; }

    public bool PatientConfirmed { get; set; } = false;

    [Column(TypeName = "text")]
    public string? PrescriptionHash { get; set; }

    public int? SafetyRiskScore { get; set; }

    [Column(TypeName = "text")]
    public string? SafetyFlags { get; set; }

    [MaxLength(50)]
    public string? SafetyRecommendedAction { get; set; }

    public DateTime? SafetyValidatedAt { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }

    public ICollection<PharmacyOrderItem> Items { get; set; } = new List<PharmacyOrderItem>();
}
