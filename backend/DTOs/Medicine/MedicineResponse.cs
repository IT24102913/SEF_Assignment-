namespace HealthBridge.Api.DTOs.Medicine;

public class MedicineResponse
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public int CategoryId { get; set; }
    public string CategoryName { get; set; } = string.Empty;
    public string? Description { get; set; }
    public decimal Price { get; set; }
    public int StockQuantity { get; set; }
    public DateTime ExpiryDate { get; set; }
    public bool RequiresPrescription { get; set; }
    public string? ImageUrl { get; set; }
    public string? BrandName { get; set; }
    public string? StorageCondition { get; set; }
    public int PillsPerCard { get; set; }
    public decimal CardPrice { get; set; }
    public string? AdditionalImagesJson { get; set; }
    public string? SellingUnit { get; set; } = "PILLS";
    public int? BottleSize { get; set; }
    public int? VolumeMl { get; set; }
    public int? TubeWeight { get; set; }
    public int? SachetsPerBox { get; set; }
    public int? VialsPerBox { get; set; }
    public int? PuffsPerInhaler { get; set; }
    public decimal? PricePerBottle { get; set; }
    public decimal? PricePerTube { get; set; }
    public decimal? PricePerSachet { get; set; }
    public decimal? PricePerVial { get; set; }
    public decimal? BoxPrice { get; set; }
    public decimal? PricePerInhaler { get; set; }
    public string? UnitName { get; set; }
    public decimal? PricePerUnit { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}
