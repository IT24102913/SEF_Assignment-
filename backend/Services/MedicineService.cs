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

        medicine.Name = request.Name.Trim();
        medicine.CategoryId = request.CategoryId;
        medicine.Category = category;
        medicine.Description = request.Description?.Trim();
        medicine.Price = request.Price;
        medicine.StockQuantity = request.StockQuantity;
        medicine.ExpiryDate = DateTime.SpecifyKind(request.ExpiryDate, DateTimeKind.Utc);
        medicine.RequiresPrescription = request.RequiresPrescription;
        medicine.ImageUrl = request.ImageUrl?.Trim();
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
            CreatedAt = medicine.CreatedAt,
            UpdatedAt = medicine.UpdatedAt
        };
    }
}
