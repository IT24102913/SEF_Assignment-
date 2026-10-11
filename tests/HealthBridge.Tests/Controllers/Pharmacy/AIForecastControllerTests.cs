using HealthBridge.Api.Agents;
using HealthBridge.Api.Controllers.Pharmacy;
using HealthBridge.Api.Data;
using HealthBridge.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Xunit;

namespace HealthBridge.Tests.Controllers.Pharmacy;

public class AIForecastControllerTests
{
    private ApplicationDbContext CreateInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        return new ApplicationDbContext(options);
    }

    private AIForecastController CreateController(ApplicationDbContext context)
    {
        var mockConfig = new Mock<IConfiguration>();
        mockConfig.Setup(c => c["Gemini:ApiKey"]).Returns(string.Empty);

        var mockHttpFactory = new Mock<IHttpClientFactory>();
        mockHttpFactory.Setup(f => f.CreateClient(It.IsAny<string>())).Returns(new HttpClient());

        var agent = new InventoryForecastingAgent(
            NullLogger<InventoryForecastingAgent>.Instance,
            mockConfig.Object,
            mockHttpFactory.Object,
            new MemoryCache(new MemoryCacheOptions())
        );

        return new AIForecastController(context, agent, NullLogger<AIForecastController>.Instance);
    }

    [Fact]
    public async Task GetForecast_EmptyDatabase_ReturnsOkWithEmptyPredictions()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var controller = CreateController(context);

        // Act
        var result = await controller.GetForecast();

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var forecast = Assert.IsType<AIForecastResponse>(okResult.Value);
        Assert.NotNull(forecast);
        Assert.Empty(forecast.StockoutPredictions);
        Assert.Equal(0, forecast.CriticalStockCount);
    }

    [Fact]
    public async Task GetForecast_WithMedicinesAndOrders_ReturnsOkWithPopulatedPredictions()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var cat = new Category { Id = 1, Name = "Pain Relief" };
        var med = new Medicine
        {
            Id = 1,
            Name = "Paracetamol 500mg",
            StockQuantity = 10,
            Price = 15m,
            Category = cat,
            ExpiryDate = DateTime.UtcNow.AddMonths(6)
        };
        context.Categories.Add(cat);
        context.Medicines.Add(med);

        var order = new PharmacyOrder
        {
            Id = 1,
            OrderNumber = "ORD-TEST-01",
            Status = "Confirmed",
            TotalAmount = 450m,
            CreatedAt = DateTime.UtcNow.AddDays(-5),
            Items = new List<PharmacyOrderItem>
            {
                new() { MedicineId = 1, Medicine = med, Quantity = 30, Subtotal = 450m }
            }
        };
        context.PharmacyOrders.Add(order);
        await context.SaveChangesAsync();

        var controller = CreateController(context);

        // Act
        var result = await controller.GetForecast();

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var forecast = Assert.IsType<AIForecastResponse>(okResult.Value);
        Assert.NotNull(forecast);
        Assert.Single(forecast.StockoutPredictions);
        Assert.Equal(1, forecast.StockoutPredictions[0].MedicineId);
        Assert.Equal("Pain Relief", forecast.TopCategory);
    }

    [Fact]
    public async Task GetForecast_CriticalInventoryItem_GeneratesCriticalRiskStatus()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var cat = new Category { Id = 2, Name = "Cardiovascular" };
        var med = new Medicine
        {
            Id = 2,
            Name = "Amlodipine 5mg",
            StockQuantity = 2, // Very low stock
            Price = 20m,
            Category = cat
        };
        context.Categories.Add(cat);
        context.Medicines.Add(med);

        var order = new PharmacyOrder
        {
            Id = 2,
            OrderNumber = "ORD-TEST-02",
            Status = "Confirmed",
            TotalAmount = 400m,
            CreatedAt = DateTime.UtcNow.AddDays(-2),
            Items = new List<PharmacyOrderItem>
            {
                new() { MedicineId = 2, Medicine = med, Quantity = 20, Subtotal = 400m }
            }
        };
        context.PharmacyOrders.Add(order);
        await context.SaveChangesAsync();

        var controller = CreateController(context);

        // Act
        var result = await controller.GetForecast();

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var forecast = Assert.IsType<AIForecastResponse>(okResult.Value);
        Assert.True(forecast.CriticalStockCount >= 1);
        Assert.Equal("CRITICAL", forecast.StockoutPredictions[0].Status);
    }
}
