using System.ComponentModel.DataAnnotations;

namespace HealthBridge.Api.DTOs.Medicine;

public class UpdateMedicineRequest
{
    [Required(ErrorMessage = "Medicine name is required.")]
    [StringLength(150, MinimumLength = 2, ErrorMessage = "Medicine name must be between 2 and 150 characters.")]
    public string Name { get; set; } = string.Empty;

    [Required(ErrorMessage = "Category ID is required.")]
    [Range(1, int.MaxValue, ErrorMessage = "Valid Category ID is required.")]
    public int CategoryId { get; set; }

    [StringLength(1000, ErrorMessage = "Description cannot exceed 1000 characters.")]
    public string? Description { get; set; }

    [Required(ErrorMessage = "Price is required.")]
    [Range(0.00, 1000000.00, ErrorMessage = "Price must be greater than or equal to 0.")]
    public decimal Price { get; set; }

    [Required(ErrorMessage = "Stock quantity is required.")]
    [Range(0, int.MaxValue, ErrorMessage = "Stock quantity cannot be negative.")]
    public int StockQuantity { get; set; }

    [Required(ErrorMessage = "Expiry date is required.")]
    public DateTime ExpiryDate { get; set; }

    public bool RequiresPrescription { get; set; }

    public string? ImageUrl { get; set; }
}
