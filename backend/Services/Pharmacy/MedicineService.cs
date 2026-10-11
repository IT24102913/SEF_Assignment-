using HealthBridge.Api.Data;
using HealthBridge.Api.DTOs.Medicine;
using HealthBridge.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace HealthBridge.Api.Services;

public class MedicineService : IMedicineService
{
    private readonly ApplicationDbContext _context;

    public MedicineService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<MedicineResponse>> GetAllMedicinesAsync()
    {
        return await _context.Medicines
            .Include(m => m.Category)
            .AsNoTracking()
            .OrderBy(m => m.Name)
            .Select(m => MapToMedicineResponse(m))
            .ToListAsync();
    }

    public async Task<MedicineResponse?> GetMedicineByIdAsync(int id)
    {
        var medicine = await _context.Medicines
            .Include(m => m.Category)
            .AsNoTracking()
            .FirstOrDefaultAsync(m => m.Id == id);

        return medicine == null ? null : MapToMedicineResponse(medicine);
    }

    public async Task<MedicineResponse> CreateMedicineAsync(CreateMedicineRequest request)
    {
        var category = await _context.Categories.FindAsync(request.CategoryId);
        if (category == null)
        {
            throw new KeyNotFoundException($"Category with ID {request.CategoryId} does not exist.");
        }

        if (request.Price < 0)
        {
            throw new ArgumentException("Price must be greater than or equal to 0.");
        }

        if (request.StockQuantity < 0)
        {
            throw new ArgumentException("Stock quantity cannot be negative.");
        }

        if (!string.IsNullOrWhiteSpace(request.ImageUrl) &&
            (request.ImageUrl.Trim().StartsWith("http://localhost", StringComparison.OrdinalIgnoreCase) ||
             request.ImageUrl.Trim().StartsWith("https://localhost", StringComparison.OrdinalIgnoreCase)))
        {
            throw new ArgumentException("Please upload the image from device storage");
        }

        var medicine = new Medicine
        {
            Name = request.Name.Trim(),
            CategoryId = request.CategoryId,
            Description = request.Description?.Trim(),
            Price = request.Price,
            StockQuantity = request.StockQuantity,
            ExpiryDate = DateTime.SpecifyKind(request.ExpiryDate, DateTimeKind.Utc),
            RequiresPrescription = request.RequiresPrescription,
            ImageUrl = request.ImageUrl?.Trim(),
            BrandName = request.BrandName?.Trim() ?? "Cipla Laboratories",
            StorageCondition = request.StorageCondition?.Trim() ?? "Normal Room Temperature",
            PillsPerCard = request.PillsPerCard > 0 ? request.PillsPerCard : 10,
            CardPrice = request.CardPrice > 0 ? request.CardPrice : (request.Price * (request.PillsPerCard > 0 ? request.PillsPerCard : 10)),
            AdditionalImagesJson = request.AdditionalImagesJson?.Trim(),
            SellingUnit = request.SellingUnit ?? "PILLS",
            BottleSize = request.BottleSize,
            VolumeMl = request.VolumeMl,
            TubeWeight = request.TubeWeight,
            SachetsPerBox = request.SachetsPerBox,
            VialsPerBox = request.VialsPerBox,
            PuffsPerInhaler = request.PuffsPerInhaler,
            PricePerBottle = request.PricePerBottle,
            PricePerTube = request.PricePerTube,
            PricePerSachet = request.PricePerSachet,
            PricePerVial = request.PricePerVial,
            BoxPrice = request.BoxPrice,
            PricePerInhaler = request.PricePerInhaler,
            UnitName = request.UnitName,
            PricePerUnit = request.PricePerUnit,
            CreatedAt = DateTime.UtcNow
        };

        _context.Medicines.Add(medicine);
        await _context.SaveChangesAsync();

        // Load Category reference for response mapping
        await _context.Entry(medicine).Reference(m => m.Category).LoadAsync();

        return MapToMedicineResponse(medicine);
    }

    public async Task<MedicineResponse?> UpdateMedicineAsync(int id, UpdateMedicineRequest request)
    {
        var medicine = await _context.Medicines
            .Include(m => m.Category)
            .FirstOrDefaultAsync(m => m.Id == id);

        if (medicine == null) return null;

        var category = await _context.Categories.FindAsync(request.CategoryId);
        if (category == null)
        {
            throw new KeyNotFoundException($"Category with ID {request.CategoryId} does not exist.");
        }

        if (request.Price < 0)
        {
            throw new ArgumentException("Price must be greater than or equal to 0.");
        }

        if (request.StockQuantity < 0)
        {
            throw new ArgumentException("Stock quantity cannot be negative.");
        }

        if (!string.IsNullOrWhiteSpace(request.ImageUrl) &&
            (request.ImageUrl.Trim().StartsWith("http://localhost", StringComparison.OrdinalIgnoreCase) ||
             request.ImageUrl.Trim().StartsWith("https://localhost", StringComparison.OrdinalIgnoreCase)))
        {
            if (medicine.ImageUrl == null || !medicine.ImageUrl.Equals(request.ImageUrl.Trim(), StringComparison.OrdinalIgnoreCase))
            {
                throw new ArgumentException("Please upload the image from device storage");
            }
        }

        medicine.Name = request.Name.Trim();
        medicine.CategoryId = request.CategoryId;
        medicine.Category = category;
        medicine.Description = request.Description?.Trim();
        medicine.Price = request.Price;
        medicine.StockQuantity = request.StockQuantity;
        medicine.ExpiryDate = DateTime.SpecifyKind(request.ExpiryDate, DateTimeKind.Utc);
        medicine.RequiresPrescription = request.RequiresPrescription;
        if (request.ClearImage)
        {
            medicine.ImageUrl = null;
        }
        else if (!string.IsNullOrWhiteSpace(request.ImageUrl))
        {
            medicine.ImageUrl = request.ImageUrl.Trim();
        }
        medicine.BrandName = request.BrandName?.Trim() ?? medicine.BrandName;
        medicine.StorageCondition = request.StorageCondition?.Trim() ?? medicine.StorageCondition;
        medicine.PillsPerCard = request.PillsPerCard > 0 ? request.PillsPerCard : medicine.PillsPerCard;
        medicine.CardPrice = request.CardPrice > 0 ? request.CardPrice : medicine.CardPrice;
        medicine.AdditionalImagesJson = request.AdditionalImagesJson?.Trim() ?? medicine.AdditionalImagesJson;
        medicine.SellingUnit = request.SellingUnit ?? medicine.SellingUnit;
        medicine.BottleSize = request.BottleSize ?? medicine.BottleSize;
        medicine.VolumeMl = request.VolumeMl ?? medicine.VolumeMl;
        medicine.TubeWeight = request.TubeWeight ?? medicine.TubeWeight;
        medicine.SachetsPerBox = request.SachetsPerBox ?? medicine.SachetsPerBox;
        medicine.VialsPerBox = request.VialsPerBox ?? medicine.VialsPerBox;
        medicine.PuffsPerInhaler = request.PuffsPerInhaler ?? medicine.PuffsPerInhaler;
        medicine.PricePerBottle = request.PricePerBottle ?? medicine.PricePerBottle;
        medicine.PricePerTube = request.PricePerTube ?? medicine.PricePerTube;
        medicine.PricePerSachet = request.PricePerSachet ?? medicine.PricePerSachet;
        medicine.PricePerVial = request.PricePerVial ?? medicine.PricePerVial;
        medicine.BoxPrice = request.BoxPrice ?? medicine.BoxPrice;
        medicine.PricePerInhaler = request.PricePerInhaler ?? medicine.PricePerInhaler;
        medicine.UnitName = request.UnitName ?? medicine.UnitName;
        medicine.PricePerUnit = request.PricePerUnit ?? medicine.PricePerUnit;
        medicine.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return MapToMedicineResponse(medicine);
    }

    public async Task<MedicineResponse?> RestockMedicineAsync(int id, int additionalQuantity)
    {
        var medicine = await _context.Medicines
            .Include(m => m.Category)
            .FirstOrDefaultAsync(m => m.Id == id);

        if (medicine == null) return null;

        medicine.StockQuantity = Math.Max(0, medicine.StockQuantity + additionalQuantity);
        medicine.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return MapToMedicineResponse(medicine);
    }

    public async Task<MedicineResponse?> SetStockQuantityAsync(int id, int newQuantity)
    {
        var medicine = await _context.Medicines
            .Include(m => m.Category)
            .FirstOrDefaultAsync(m => m.Id == id);

        if (medicine == null) return null;

        medicine.StockQuantity = Math.Max(0, newQuantity);
        medicine.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return MapToMedicineResponse(medicine);
    }

    public async Task<bool> DeleteMedicineAsync(int id)
    {
        var medicine = await _context.Medicines.FindAsync(id);
        if (medicine == null) return false;

        _context.Medicines.Remove(medicine);
        await _context.SaveChangesAsync();
        return true;
    }

    private static MedicineResponse MapToMedicineResponse(Medicine medicine)
    {
        return new MedicineResponse
        {
            Id = medicine.Id,
            Name = medicine.Name,
            CategoryId = medicine.CategoryId,
            CategoryName = medicine.Category?.Name ?? string.Empty,
            Description = medicine.Description,
            Price = medicine.Price,
            StockQuantity = medicine.StockQuantity,
            ExpiryDate = medicine.ExpiryDate,
            RequiresPrescription = medicine.RequiresPrescription,
            ImageUrl = medicine.ImageUrl,
            BrandName = medicine.BrandName ?? "Cipla Laboratories",
            StorageCondition = medicine.StorageCondition ?? "Normal Room Temperature",
            PillsPerCard = medicine.PillsPerCard > 0 ? medicine.PillsPerCard : 10,
            CardPrice = medicine.CardPrice > 0 ? medicine.CardPrice : (medicine.Price * (medicine.PillsPerCard > 0 ? medicine.PillsPerCard : 10)),
            AdditionalImagesJson = medicine.AdditionalImagesJson,
            SellingUnit = medicine.SellingUnit ?? "PILLS",
            BottleSize = medicine.BottleSize,
            VolumeMl = medicine.VolumeMl,
            TubeWeight = medicine.TubeWeight,
            SachetsPerBox = medicine.SachetsPerBox,
            VialsPerBox = medicine.VialsPerBox,
            PuffsPerInhaler = medicine.PuffsPerInhaler,
            PricePerBottle = medicine.PricePerBottle,
            PricePerTube = medicine.PricePerTube,
            PricePerSachet = medicine.PricePerSachet,
            PricePerVial = medicine.PricePerVial,
            BoxPrice = medicine.BoxPrice,
            PricePerInhaler = medicine.PricePerInhaler,
            UnitName = medicine.UnitName,
            PricePerUnit = medicine.PricePerUnit,
            CreatedAt = medicine.CreatedAt,
            UpdatedAt = medicine.UpdatedAt
        };
    }
}
