using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HealthBridge.Api.Models;

public class PharmacyOrderItem
{
    public int Id { get; set; }

    public int PharmacyOrderId { get; set; }

    [ForeignKey(nameof(PharmacyOrderId))]
    public PharmacyOrder? PharmacyOrder { get; set; }

    public int MedicineId { get; set; }

    [ForeignKey(nameof(MedicineId))]
    public Medicine? Medicine { get; set; }

    [Required]
    [MaxLength(150)]
    public string MedicineName { get; set; } = string.Empty;

    [Column(TypeName = "decimal(18,2)")]
    public decimal UnitPrice { get; set; }

    public int Quantity { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal Subtotal { get; set; }

    public string UnitType { get; set; } = "Pill";
}
