using HealthBridge.Api.Data;
using HealthBridge.Api.DTOs.Medicine;
using HealthBridge.Api.Models;
using HealthBridge.Api.Services;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace HealthBridge.Tests.Services.Pharmacy;

public class MedicineServiceTests
{
    private ApplicationDbContext CreateInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        return new ApplicationDbContext(options);
    }

    [Fact]
    public async Task GetAllMedicinesAsync_ReturnsOrderedListOfMedicines()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var cat = new Category { Id = 1, Name = "Analgesics" };
        context.Categories.Add(cat);
        context.Medicines.AddRange(
            new Medicine { Id = 1, Name = "Paracetamol", Price = 10, StockQuantity = 50, CategoryId = 1 },
            new Medicine { Id = 2, Name = "Aspirin", Price = 15, StockQuantity = 20, CategoryId = 1 }
        );
        await context.SaveChangesAsync();

        var service = new MedicineService(context);

        // Act
        var result = (await service.GetAllMedicinesAsync()).ToList();

        // Assert
        Assert.Equal(2, result.Count);
        Assert.Equal("Aspirin", result[0].Name); // Ordered by Name
        Assert.Equal("Paracetamol", result[1].Name);
    }

    [Fact]
    public async Task GetMedicineByIdAsync_ExistingId_ReturnsMedicine()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var cat = new Category { Id = 1, Name = "Antibiotics" };
        context.Categories.Add(cat);
        context.Medicines.Add(new Medicine { Id = 5, Name = "Amoxicillin", Price = 25, CategoryId = 1 });
        await context.SaveChangesAsync();

        var service = new MedicineService(context);

        // Act
        var result = await service.GetMedicineByIdAsync(5);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(5, result!.Id);
        Assert.Equal("Amoxicillin", result.Name);
    }

    [Fact]
    public async Task GetMedicineByIdAsync_NonExistentId_ReturnsNull()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var service = new MedicineService(context);

        // Act
        var result = await service.GetMedicineByIdAsync(999);

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public async Task CreateMedicineAsync_NonExistentCategory_ThrowsKeyNotFoundException()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var service = new MedicineService(context);

        var request = new CreateMedicineRequest
        {
            Name = "Vitamin C",
            CategoryId = 999,
            Price = 10m
        };

        // Act & Assert
        await Assert.ThrowsAsync<KeyNotFoundException>(() => service.CreateMedicineAsync(request));
    }

    [Fact]
    public async Task CreateMedicineAsync_NegativePrice_ThrowsArgumentException()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var cat = new Category { Id = 1, Name = "Supplements" };
        context.Categories.Add(cat);
        await context.SaveChangesAsync();

        var service = new MedicineService(context);
        var request = new CreateMedicineRequest
        {
            Name = "Vitamin C",
            CategoryId = 1,
            Price = -5m
        };

        // Act & Assert
        var ex = await Assert.ThrowsAsync<ArgumentException>(() => service.CreateMedicineAsync(request));
        Assert.Contains("Price", ex.Message);
    }

    [Fact]
    public async Task CreateMedicineAsync_LocalhostImageUrl_ThrowsArgumentException()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var cat = new Category { Id = 1, Name = "General" };
        context.Categories.Add(cat);
        await context.SaveChangesAsync();

        var service = new MedicineService(context);
        var request = new CreateMedicineRequest
        {
            Name = "Antiseptic Cream",
            CategoryId = 1,
            Price = 50m,
            ImageUrl = "http://localhost:5000/images/test.jpg"
        };

        // Act & Assert
        var ex = await Assert.ThrowsAsync<ArgumentException>(() => service.CreateMedicineAsync(request));
        Assert.Contains("device storage", ex.Message);
    }

    [Fact]
    public async Task CreateMedicineAsync_ValidRequest_CreatesAndReturnsMedicineResponse()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var cat = new Category { Id = 1, Name = "General" };
        context.Categories.Add(cat);
        await context.SaveChangesAsync();

        var service = new MedicineService(context);
        var request = new CreateMedicineRequest
        {
            Name = "Antiseptic Liquid",
            CategoryId = 1,
            Price = 75m,
            StockQuantity = 30
        };

        // Act
        var result = await service.CreateMedicineAsync(request);

        // Assert
        Assert.NotNull(result);
        Assert.True(result.Id > 0);
        Assert.Equal("Antiseptic Liquid", result.Name);
        Assert.Equal(30, result.StockQuantity);
    }

    [Fact]
    public async Task RestockMedicineAsync_ValidAdditionalQuantity_IncrementsStock()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var cat = new Category { Id = 1, Name = "Pain" };
        context.Categories.Add(cat);
        context.Medicines.Add(new Medicine { Id = 10, Name = "Ibuprofen", Price = 20, StockQuantity = 15, CategoryId = 1 });
        await context.SaveChangesAsync();

        var service = new MedicineService(context);

        // Act
        var result = await service.RestockMedicineAsync(10, 25);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(40, result!.StockQuantity); // 15 + 25
    }

    [Fact]
    public async Task SetStockQuantityAsync_ValidNewQuantity_UpdatesStockDirectly()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var cat = new Category { Id = 1, Name = "Pain" };
        context.Categories.Add(cat);
        context.Medicines.Add(new Medicine { Id = 20, Name = "Aspirin", Price = 10, StockQuantity = 100, CategoryId = 1 });
        await context.SaveChangesAsync();

        var service = new MedicineService(context);

        // Act
        var result = await service.SetStockQuantityAsync(20, 45);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(45, result!.StockQuantity);
    }

    [Fact]
    public async Task DeleteMedicineAsync_ExistingMedicine_DeletesAndReturnsTrue()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var cat = new Category { Id = 1, Name = "Supplements" };
        context.Categories.Add(cat);
        context.Medicines.Add(new Medicine { Id = 30, Name = "Zinc Tablets", Price = 30, CategoryId = 1 });
        await context.SaveChangesAsync();

        var service = new MedicineService(context);

        // Act
        var deleted = await service.DeleteMedicineAsync(30);

        // Assert
        Assert.True(deleted);
        var inDb = await context.Medicines.FindAsync(30);
        Assert.Null(inDb);
    }

    [Fact]
    public async Task DeleteMedicineAsync_NonExistentMedicine_ReturnsFalse()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var service = new MedicineService(context);

        // Act
        var deleted = await service.DeleteMedicineAsync(999);

        // Assert
        Assert.False(deleted);
    }
}
