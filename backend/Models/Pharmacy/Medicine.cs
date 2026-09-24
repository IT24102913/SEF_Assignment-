using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HealthBridge.Api.Models;

public class Medicine
{
    public int Id { get; set; }

    [Required]
    [MaxLength(150)]
    public string Name { get; set; } = string.Empty;

    public int CategoryId { get; set; }

    public Category? Category { get; set; }

    [MaxLength(1000)]
    public string? Description { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal Price { get; set; }

    public int StockQuantity { get; set; }

    public DateTime ExpiryDate { get; set; }

    public bool RequiresPrescription { get; set; }

    [MaxLength(150)]
    public string? BrandName { get; set; }

    [MaxLength(100)]
    public string? StorageCondition { get; set; } = "Normal Room Temperature";

    public int PillsPerCard { get; set; } = 10;

    [Column(TypeName = "decimal(18,2)")]
    public decimal CardPrice { get; set; }

    [Column(TypeName = "text")]
    public string? AdditionalImagesJson { get; set; }

    [Column(TypeName = "text")]
    public string? ImageUrl { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }
}
