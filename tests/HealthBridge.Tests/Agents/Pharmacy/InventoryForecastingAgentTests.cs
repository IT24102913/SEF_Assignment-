using HealthBridge.Api.Agents;
using HealthBridge.Api.Models;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Xunit;

namespace HealthBridge.Tests.Agents.Pharmacy;

public class InventoryForecastingAgentTests
{
    private readonly InventoryForecastingAgent _agent;
    private readonly IMemoryCache _memoryCache;

    public InventoryForecastingAgentTests()
    {
        var mockConfig = new Mock<IConfiguration>();
        var mockHttpFactory = new Mock<IHttpClientFactory>();
        _memoryCache = new MemoryCache(new MemoryCacheOptions());

        _agent = new InventoryForecastingAgent(
            NullLogger<InventoryForecastingAgent>.Instance,
            mockConfig.Object,
            mockHttpFactory.Object,
            _memoryCache
        );
    }

    [Fact]
    public void GenerateForecast_EmptyInputs_ReturnsSafeEmptyForecast()
    {
        // Act
        var result = _agent.GenerateForecast(new List<Medicine>(), new List<PharmacyOrder>());

        // Assert
        Assert.NotNull(result);
        Assert.False(result.HasSufficientData);
        Assert.Empty(result.StockoutPredictions);
        Assert.Empty(result.ExpiryRisks);
        Assert.Equal(0, result.ProjectedMonthlyRevenue);
    }

    [Fact]
    public void GenerateForecast_ZeroSales_MarksHealthyWithInsufficientData()
    {
        // Arrange
        var medicines = new List<Medicine>
        {
            new() { Id = 1, Name = "Paracetamol 500mg", StockQuantity = 100, Price = 10m, ExpiryDate = DateTime.UtcNow.AddMonths(6) }
        };

        // Act
        var result = _agent.GenerateForecast(medicines, new List<PharmacyOrder>());

        // Assert
        Assert.Single(result.StockoutPredictions);
        var pred = result.StockoutPredictions[0];
        Assert.Equal("HEALTHY", pred.Status);
        Assert.Null(pred.DaysUntilEmpty);
        Assert.Equal(0, pred.TotalSoldPast30Days);
        Assert.Equal(0, pred.AverageDailySales);
        Assert.Contains("Insufficient data", pred.ForecastNote);
    }

    [Fact]
    public void GenerateForecast_CriticalStockRate_CalculatesCriticalStatusAndUrgency()
    {
        // Arrange: 10 units in stock, 30 sold in 30 days -> 1/day -> 10 days stock (<= 30 => LOW)
        // Let's do 5 units in stock, 30 sold in 30 days -> 1/day -> 5 days stock (<= 7 => CRITICAL)
        var med = new Medicine { Id = 2, Name = "Amoxicillin 500mg", StockQuantity = 5, Price = 25m, ExpiryDate = DateTime.UtcNow.AddMonths(12) };
        var order = new PharmacyOrder
        {
            Id = 1,
            Status = "Confirmed",
            TotalAmount = 750m,
            CreatedAt = DateTime.UtcNow.AddDays(-10),
            Items = new List<PharmacyOrderItem>
            {
                new() { MedicineId = 2, Quantity = 30, Subtotal = 750m }
            }
        };

        // Act
        var result = _agent.GenerateForecast(new[] { med }, new[] { order }, periodDays: 30);

        // Assert
        Assert.Single(result.StockoutPredictions);
        var pred = result.StockoutPredictions[0];
        Assert.Equal("CRITICAL", pred.Status);
        Assert.Equal(5, pred.DaysUntilEmpty);
        Assert.Equal(1, pred.AverageDailySales);
        Assert.Equal(1, result.CriticalStockCount);
        Assert.Equal("SOON", pred.OrderUrgency); // 4..7 days is SOON
    }

    [Fact]
    public void GenerateForecast_EmergencyStockRate_AssignsEmergencyUrgencyWhenZeroDaysLeft()
    {
        // Arrange: 0 units in stock, 60 sold in 30 days -> 2/day -> 0 days left
        var med = new Medicine { Id = 3, Name = "Insulin Glargine", StockQuantity = 0, Price = 1200m, ExpiryDate = DateTime.UtcNow.AddMonths(6) };
        var order = new PharmacyOrder
        {
            Id = 2,
            Status = "Delivered",
            TotalAmount = 72000m,
            CreatedAt = DateTime.UtcNow.AddDays(-5),
            Items = new List<PharmacyOrderItem>
            {
                new() { MedicineId = 3, Quantity = 60, Subtotal = 72000m }
            }
        };

        // Act
        var result = _agent.GenerateForecast(new[] { med }, new[] { order }, periodDays: 30);

        // Assert
        var pred = result.StockoutPredictions[0];
        Assert.Equal(0, pred.DaysUntilEmpty);
        Assert.Equal("EMERGENCY", pred.OrderUrgency);
    }

    [Fact]
    public void GenerateForecast_LowStockRate_CalculatesLowStatus()
    {
        // Arrange: 20 units in stock, 30 sold in 30 days -> 1/day -> 20 days left (8..30 => LOW)
        var med = new Medicine { Id = 4, Name = "Metformin 500mg", StockQuantity = 20, Price = 15m, ExpiryDate = DateTime.UtcNow.AddMonths(12) };
        var order = new PharmacyOrder
        {
            Id = 3,
            Status = "Confirmed",
            TotalAmount = 450m,
            CreatedAt = DateTime.UtcNow.AddDays(-15),
            Items = new List<PharmacyOrderItem>
            {
                new() { MedicineId = 4, Quantity = 30, Subtotal = 450m }
            }
        };

        // Act
        var result = _agent.GenerateForecast(new[] { med }, new[] { order }, periodDays: 30);

        // Assert
        var pred = result.StockoutPredictions[0];
        Assert.Equal("LOW", pred.Status);
        Assert.Equal(20, pred.DaysUntilEmpty);
        Assert.Equal("PLANNED", pred.OrderUrgency);
    }

    [Fact]
    public void GenerateForecast_HealthyStockRate_CalculatesHealthyStatus()
    {
        // Arrange: 100 units in stock, 30 sold in 30 days -> 1/day -> 100 days left (> 30 => HEALTHY)
        var med = new Medicine { Id = 5, Name = "Cetirizine 10mg", StockQuantity = 100, Price = 8m, ExpiryDate = DateTime.UtcNow.AddMonths(24) };
        var order = new PharmacyOrder
        {
            Id = 4,
            Status = "Confirmed",
            TotalAmount = 240m,
            CreatedAt = DateTime.UtcNow.AddDays(-12),
            Items = new List<PharmacyOrderItem>
            {
                new() { MedicineId = 5, Quantity = 30, Subtotal = 240m }
            }
        };

        // Act
        var result = _agent.GenerateForecast(new[] { med }, new[] { order }, periodDays: 30);

        // Assert
        var pred = result.StockoutPredictions[0];
        Assert.Equal("HEALTHY", pred.Status);
        Assert.Equal(100, pred.DaysUntilEmpty);
        Assert.Equal("NORMAL", pred.OrderUrgency);
    }

    [Fact]
    public void GenerateForecast_ExpiryDates_CategorizesCriticalAndWarningExpiries()
    {
        // Arrange
        var now = DateTime.UtcNow;
        var medicines = new List<Medicine>
        {
            new() { Id = 10, Name = "Eye Drops A", StockQuantity = 15, ExpiryDate = now.AddDays(15) },  // <= 30 => Critical
            new() { Id = 11, Name = "Cough Syrup B", StockQuantity = 20, ExpiryDate = now.AddDays(45) }, // <= 60 => Warning
            new() { Id = 12, Name = "Vitamins C", StockQuantity = 50, ExpiryDate = now.AddDays(180) }   // > 60 => Normal
        };

        // Act
        var result = _agent.GenerateForecast(medicines, new List<PharmacyOrder>());

        // Assert
        Assert.Equal(3, result.ExpiryRisks.Count);
        Assert.Equal(1, result.ExpiryRiskCount); // 1 Critical
        var crit = result.ExpiryRisks.First(e => e.MedicineId == 10);
        Assert.Equal("Critical", crit.RiskLevel);

        var warn = result.ExpiryRisks.First(e => e.MedicineId == 11);
        Assert.Equal("Warning", warn.RiskLevel);

        var norm = result.ExpiryRisks.First(e => e.MedicineId == 12);
        Assert.Equal("Normal", norm.RiskLevel);
    }

    [Fact]
    public void GenerateForecast_CalculatesHighDemandCategoriesAndMonthlyRevenue()
    {
        // Arrange
        var catAntibiotics = new Category { Id = 1, Name = "Antibiotics" };
        var catVitamins = new Category { Id = 2, Name = "Vitamins" };

        var med1 = new Medicine { Id = 20, Name = "Amoxicillin", Price = 50m, Category = catAntibiotics };
        var med2 = new Medicine { Id = 21, Name = "Vitamin C", Price = 20m, Category = catVitamins };

        var order1 = new PharmacyOrder
        {
            Id = 30,
            Status = "Confirmed",
            TotalAmount = 500m,
            CreatedAt = DateTime.UtcNow.AddDays(-2),
            Items = new List<PharmacyOrderItem>
            {
                new() { MedicineId = 20, Medicine = med1, Quantity = 10, Subtotal = 500m }
            }
        };

        var order2 = new PharmacyOrder
        {
            Id = 31,
            Status = "Confirmed",
            TotalAmount = 100m,
            CreatedAt = DateTime.UtcNow.AddDays(-4),
            Items = new List<PharmacyOrderItem>
            {
                new() { MedicineId = 21, Medicine = med2, Quantity = 5, Subtotal = 100m }
            }
        };

        // Act
        var result = _agent.GenerateForecast(new[] { med1, med2 }, new[] { order1, order2 }, periodDays: 30);

        // Assert
        Assert.Equal("Antibiotics", result.TopCategory);
        Assert.Equal(2, result.HighDemandCategories.Count);
        Assert.Equal(600m, result.ProjectedMonthlyRevenue);
        Assert.Equal("Rs. 600", result.ProjectedMonthlyRevenueLabel);
    }

    [Fact]
    public void GenerateForecast_OnlyCountsFulfilledOrders()
    {
        // Arrange
        var med = new Medicine { Id = 40, Name = "Aspirin 100mg", StockQuantity = 50, Price = 5m };
        var pendingOrder = new PharmacyOrder
        {
            Id = 41,
            Status = "PendingVerification", // NOT fulfilled
            TotalAmount = 500m,
            Items = new List<PharmacyOrderItem> { new() { MedicineId = 40, Quantity = 100, Subtotal = 500m } }
        };
        var confirmedOrder = new PharmacyOrder
        {
            Id = 42,
            Status = "Confirmed", // Fulfilled
            TotalAmount = 100m,
            Items = new List<PharmacyOrderItem> { new() { MedicineId = 40, Quantity = 20, Subtotal = 100m } }
        };

        // Act
        var result = _agent.GenerateForecast(new[] { med }, new[] { pendingOrder, confirmedOrder }, periodDays: 30);

        // Assert
        var pred = result.StockoutPredictions[0];
        Assert.Equal(20, pred.TotalSoldPast30Days); // only 20 from confirmed order, 100 ignored
    }

    [Fact]
    public void GenerateForecast_ReorderPointAndSuggestedQuantity_CalculatesExpectedFormulas()
    {
        // Arrange: 10 stock, 60 sold in 30 days -> avgDaily = 2.0
        // ReorderPoint = ceil(2.0 * 7) = 14
        // SuggestedQty = ceil((2.0 * 30 - 10) / 10.0) * 10 = ceil(50 / 10) * 10 = 50
        var med = new Medicine { Id = 50, Name = "Omeprazole 20mg", StockQuantity = 10, Price = 30m };
        var order = new PharmacyOrder
        {
            Id = 51,
            Status = "Confirmed",
            TotalAmount = 1800m,
            Items = new List<PharmacyOrderItem> { new() { MedicineId = 50, Quantity = 60, Subtotal = 1800m } }
        };

        // Act
        var result = _agent.GenerateForecast(new[] { med }, new[] { order }, periodDays: 30);

        // Assert
        var pred = result.StockoutPredictions[0];
        Assert.Equal(14, pred.ReorderPoint);
        Assert.Equal(50, pred.SuggestedOrderQty);
    }

    [Fact]
    public void InvalidateForecastCache_IncrementsCacheVersionWithoutError()
    {
        // Act & Assert (Should not throw)
        var exception = Record.Exception(() => _agent.InvalidateForecastCache());
        Assert.Null(exception);
    }
}
