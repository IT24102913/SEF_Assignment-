using HealthBridge.Api.Agents;
using HealthBridge.Api.Models;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace HealthBridge.Tests.Agents.Pharmacy;

public class PrescriptionSafetyAgentEdgeCaseTests
{
    private readonly PrescriptionSafetyAgent _agent;

    public PrescriptionSafetyAgentEdgeCaseTests()
    {
        _agent = new PrescriptionSafetyAgent(NullLogger<PrescriptionSafetyAgent>.Instance);
    }

    [Fact]
    public void EvaluateOrderSafety_NullOrder_ReturnsManualReviewAndFiftyRisk()
    {
        // Act
        var result = _agent.EvaluateOrderSafety(null!, Array.Empty<PharmacyOrder>());

        // Assert
        Assert.NotNull(result);
        Assert.Equal(50, result.RiskScore);
        Assert.Equal("REQUIRE_MANUAL_REVIEW", result.RecommendedAction);
        Assert.Contains(result.Flags, f => f.Contains("Missing or ambiguous"));
    }

    [Fact]
    public void EvaluateOrderSafety_DuplicateMedicinesInSameOrder_AddsDuplicateMedicineFlag()
    {
        // Arrange
        var order = new PharmacyOrder
        {
            Id = 1,
            OrderNumber = "ORD-DUP-01",
            Items = new List<PharmacyOrderItem>
            {
                new() { MedicineName = "Paracetamol 500mg", Quantity = 10 },
                new() { MedicineName = "Paracetamol 500mg", Quantity = 20 }
            }
        };

        // Act
        var result = _agent.EvaluateOrderSafety(order, Array.Empty<PharmacyOrder>());

        // Assert
        Assert.Equal(20, result.RiskScore);
        Assert.Contains(result.SafetyFlags, f => f.Contains("Duplicate medicine entries"));
    }

    [Fact]
    public void EvaluateOrderSafety_MissingRxImageForPrescriptionRequiredMedicine_AddsMissingReceiptFlag()
    {
        // Arrange
        var rxMed = new Medicine
        {
            Id = 1,
            Name = "Atorvastatin 20mg",
            RequiresPrescription = true
        };

        var order = new PharmacyOrder
        {
            Id = 2,
            OrderNumber = "ORD-NO-RX-01",
            PrescriptionImageUrl = null, // No prescription image
            Items = new List<PharmacyOrderItem>
            {
                new() { MedicineId = 1, Medicine = rxMed, MedicineName = rxMed.Name, Quantity = 30 }
            }
        };

        // Act
        var result = _agent.EvaluateOrderSafety(order, Array.Empty<PharmacyOrder>());

        // Assert
        Assert.Equal(40, result.RiskScore);
        Assert.Equal("REQUIRE_MANUAL_REVIEW", result.RecommendedAction);
        Assert.Contains(result.SafetyFlags, f => f.Contains("Missing prescription receipt image"));
    }

    [Fact]
    public void EvaluateOrderSafety_MultipleSuspiciousAttemptsInHistory_IncreasesRiskScore()
    {
        // Arrange: 2 past orders with SafetyRiskScore >= 70
        var pastHistory = new List<PharmacyOrder>
        {
            new() { Id = 10, OrderNumber = "ORD-SUSP-1", SafetyRiskScore = 75, CreatedAt = DateTime.UtcNow.AddDays(-20) },
            new() { Id = 11, OrderNumber = "ORD-SUSP-2", SafetyRiskScore = 80, CreatedAt = DateTime.UtcNow.AddDays(-15) }
        };

        var currentOrder = new PharmacyOrder
        {
            Id = 12,
            OrderNumber = "ORD-CLEAN-01",
            CreatedAt = DateTime.UtcNow,
            Items = new List<PharmacyOrderItem>
            {
                new() { MedicineName = "Vitamin D3", Quantity = 1 }
            }
        };

        // Act
        var result = _agent.EvaluateOrderSafety(currentOrder, pastHistory);

        // Assert
        Assert.Equal(25, result.RiskScore);
        Assert.Contains(result.SafetyFlags, f => f.Contains("2 previous suspicious attempt(s)"));
    }

    [Fact]
    public void EvaluateOrderSafety_CancelledPastOrders_IgnoredInSuspiciousAttemptCount()
    {
        // Arrange: Past orders that were Cancelled without high risk score
        var pastHistory = new List<PharmacyOrder>
        {
            new() { Id = 20, OrderNumber = "ORD-CANC-1", Status = "Cancelled", SafetyRiskScore = 20, CreatedAt = DateTime.UtcNow.AddDays(-5) },
            new() { Id = 21, OrderNumber = "ORD-CANC-2", Status = "Cancelled", SafetyRiskScore = 10, CreatedAt = DateTime.UtcNow.AddDays(-3) }
        };

        var currentOrder = new PharmacyOrder
        {
            Id = 22,
            OrderNumber = "ORD-CLEAN-02",
            CreatedAt = DateTime.UtcNow,
            Items = new List<PharmacyOrderItem>
            {
                new() { MedicineName = "Paracetamol", Quantity = 10 }
            }
        };

        // Act
        var result = _agent.EvaluateOrderSafety(currentOrder, pastHistory);

        // Assert
        Assert.Equal(0, result.RiskScore);
        Assert.Equal("APPROVE", result.RecommendedAction);
    }

    [Fact]
    public void EvaluateOrderSafety_EarlyRefillLongSupply_RespectsNinetyAndOneEightyDaySupplies()
    {
        // Arrange: Past order fulfilled 45 days ago with 90-day supply
        var pastOrder = new PharmacyOrder
        {
            Id = 30,
            OrderNumber = "ORD-LONG-1",
            Status = "Delivered",
            CreatedAt = DateTime.UtcNow.AddDays(-45),
            DaysSupply = 90,
            Items = new List<PharmacyOrderItem>
            {
                new() { MedicineName = "Levothyroxine 50mcg", Quantity = 90 }
            }
        };

        var currentOrder = new PharmacyOrder
        {
            Id = 31,
            OrderNumber = "ORD-LONG-2",
            CreatedAt = DateTime.UtcNow,
            DaysSupply = 90,
            Items = new List<PharmacyOrderItem>
            {
                new() { MedicineName = "Levothyroxine 50mcg", Quantity = 90 }
            }
        };

        // Act
        var result = _agent.EvaluateOrderSafety(currentOrder, new[] { pastOrder });

        // Assert: 45 days is less than the 90-day required interval
        Assert.Contains(result.SafetyFlags, f => f.Contains("Early refill attempt detected"));
        Assert.True(result.RiskScore >= 50);
    }

    [Fact]
    public void EvaluateOrderSafety_CombinedRiskScore_ClampsAtOneHundred()
    {
        // Arrange: Multiple violations together that add up to > 100
        var rxData = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
        var rxHash = _agent.GeneratePrescriptionHash(rxData);

        var pastHistory = new List<PharmacyOrder>
        {
            new() { Id = 40, OrderNumber = "ORD-HIGH-1", CreatedAt = DateTime.UtcNow.AddDays(-1), Status = "Confirmed", PrescriptionImageUrl = rxData, PrescriptionHash = rxHash, SafetyRiskScore = 80 },
            new() { Id = 41, OrderNumber = "ORD-HIGH-2", CreatedAt = DateTime.UtcNow.AddDays(-2), Status = "Confirmed", SafetyRiskScore = 85 },
            new() { Id = 42, OrderNumber = "ORD-HIGH-3", CreatedAt = DateTime.UtcNow.AddDays(-3), Status = "Confirmed", SafetyRiskScore = 90 }
        };

        var currentOrder = new PharmacyOrder
        {
            Id = 43,
            OrderNumber = "ORD-HIGH-4",
            CreatedAt = DateTime.UtcNow,
            PrescriptionImageUrl = rxData,
            PrescriptionHash = rxHash, // Duplicate hash: +75
            Items = new List<PharmacyOrderItem>
            {
                new() { MedicineName = "Amoxicillin", Quantity = 10 },
                new() { MedicineName = "Amoxicillin", Quantity = 20 } // Duplicate item: +20
            }
            // High velocity: +35
            // Total would be 75 + 20 + 35 + 25 = 155 -> Clamped to 100
        };

        // Act
        var result = _agent.EvaluateOrderSafety(currentOrder, pastHistory);

        // Assert
        Assert.Equal(100, result.RiskScore);
        Assert.Equal("BLOCK_AND_FLAG_FOR_REVIEW", result.RecommendedAction);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void GeneratePrescriptionHash_NullOrWhitespace_ReturnsNull(string? input)
    {
        // Act
        var hash = _agent.GeneratePrescriptionHash(input);

        // Assert
        Assert.Null(hash);
    }

    [Fact]
    public void GeneratePrescriptionHash_CorruptedBase64_ReturnsNullSafely()
    {
        // Act
        var hash = _agent.GeneratePrescriptionHash("data:image/png;base64,NOT_VALID_BASE64_%%%!");

        // Assert
        Assert.Null(hash);
    }

    [Fact]
    public void GeneratePrescriptionHash_PlainUrl_ComputesDeterministicLowerHex()
    {
        // Arrange
        var url = "https://healthbridge.com/prescriptions/rx999.png";

        // Act
        var hash1 = _agent.GeneratePrescriptionHash(url);
        var hash2 = _agent.GeneratePrescriptionHash(url);

        // Assert
        Assert.NotNull(hash1);
        Assert.Equal(64, hash1!.Length);
        Assert.Equal(hash1, hash2);
        Assert.Equal(hash1.ToLowerInvariant(), hash1);
    }

    [Fact]
    public void EvaluateOrderSafety_IdenticalOrderNumberOrId_ExcludedFromSelfComparison()
    {
        // Arrange: Past order list contains the exact same current order (e.g. re-evaluating existing order)
        var rxData = "https://example.com/rx_self.jpg";
        var rxHash = _agent.GeneratePrescriptionHash(rxData);

        var currentOrder = new PharmacyOrder
        {
            Id = 50,
            OrderNumber = "ORD-SELF-01",
            PrescriptionImageUrl = rxData,
            PrescriptionHash = rxHash,
            CreatedAt = DateTime.UtcNow,
            Items = new List<PharmacyOrderItem> { new() { MedicineName = "Paracetamol", Quantity = 10 } }
        };

        // Act - pass history containing currentOrder itself
        var result = _agent.EvaluateOrderSafety(currentOrder, new[] { currentOrder });

        // Assert - must NOT flag itself as a duplicate
        Assert.DoesNotContain(result.SafetyFlags, f => f.Contains("Duplicate prescription"));
        Assert.Equal(0, result.RiskScore);
        Assert.Equal("APPROVE", result.RecommendedAction);
    }
}
