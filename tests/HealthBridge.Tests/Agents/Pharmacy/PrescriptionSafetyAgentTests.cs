using HealthBridge.Api.Agents;
using HealthBridge.Api.Models;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace HealthBridge.Tests.Agents.Pharmacy;

public class PrescriptionSafetyAgentTests
{
    private readonly PrescriptionSafetyAgent _agent;

    public PrescriptionSafetyAgentTests()
    {
        _agent = new PrescriptionSafetyAgent(NullLogger<PrescriptionSafetyAgent>.Instance);
    }

    [Fact]
    public void GeneratePrescriptionHash_DataUri_ReturnsValidSha256HexString()
    {
        // Arrange
        var base64Data = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

        // Act
        var hash = _agent.GeneratePrescriptionHash(base64Data);

        // Assert
        Assert.NotNull(hash);
        Assert.Equal(64, hash!.Length); // SHA-256 hex string length
    }

    [Fact]
    public void GeneratePrescriptionHash_SameContent_ReturnsIdenticalHash()
    {
        // Arrange
        var content = "https://example.com/uploads/prescriptions/rx_12345.jpg";

        // Act
        var hash1 = _agent.GeneratePrescriptionHash(content);
        var hash2 = _agent.GeneratePrescriptionHash(content);

        // Assert
        Assert.NotNull(hash1);
        Assert.Equal(hash1, hash2);
    }

    [Fact]
    public void EvaluateOrderSafety_DuplicatePrescriptionHash_FlagsDuplicateViolationAndHighRisk()
    {
        // Arrange
        var rxUrl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
        var rxHash = _agent.GeneratePrescriptionHash(rxUrl);

        var pastOrder = new PharmacyOrder
        {
            Id = 1,
            OrderNumber = "ORD-1001",
            PatientId = 42,
            PrescriptionImageUrl = rxUrl,
            PrescriptionHash = rxHash,
            CreatedAt = DateTime.UtcNow.AddDays(-2)
        };

        var currentOrder = new PharmacyOrder
        {
            Id = 2,
            OrderNumber = "ORD-1002",
            PatientId = 42,
            PrescriptionImageUrl = rxUrl,
            PrescriptionHash = rxHash,
            CreatedAt = DateTime.UtcNow
        };

        // Act
        var result = _agent.EvaluateOrderSafety(currentOrder, new[] { pastOrder });

        // Assert
        Assert.True(result.RiskScore >= 75);
        Assert.Equal("BLOCK_AND_FLAG_FOR_REVIEW", result.RecommendedAction);
        Assert.Contains(result.SafetyFlags, f => f.Contains("Duplicate prescription image upload reuse attempt"));
    }

    [Fact]
    public void EvaluateOrderSafety_HighVelocityOrderHistory_FlagsHighVelocity()
    {
        // Arrange
        var now = DateTime.UtcNow;
        var patientHistory = new List<PharmacyOrder>
        {
            new() { Id = 3, OrderNumber = "ORD-2001", PatientId = 10, CreatedAt = now.AddDays(-1), Status = "Confirmed" },
            new() { Id = 4, OrderNumber = "ORD-2002", PatientId = 10, CreatedAt = now.AddDays(-2), Status = "Confirmed" },
            new() { Id = 5, OrderNumber = "ORD-2003", PatientId = 10, CreatedAt = now.AddDays(-3), Status = "Confirmed" }
        };

        var currentOrder = new PharmacyOrder
        {
            Id = 6,
            OrderNumber = "ORD-2004",
            PatientId = 10,
            CreatedAt = now,
            Status = "PendingVerification"
        };

        // Act
        var result = _agent.EvaluateOrderSafety(currentOrder, patientHistory);

        // Assert
        Assert.Contains(result.SafetyFlags, f => f.Contains("High Velocity Order History"));
        Assert.True(result.RiskScore >= 35);
    }

    [Fact]
    public void EvaluateOrderSafety_RepeatMedicationPurchase_FlagsRepeatMedication()
    {
        // Arrange
        var now = DateTime.UtcNow;
        var pastOrders = new List<PharmacyOrder>
        {
            new()
            {
                Id = 7, OrderNumber = "ORD-3001", PatientId = 15, CreatedAt = now.AddDays(-1), Status = "Confirmed",
                Items = new List<PharmacyOrderItem> { new() { MedicineName = "Amoxicillin 500mg", Quantity = 10 } }
            },
            new()
            {
                Id = 8, OrderNumber = "ORD-3002", PatientId = 15, CreatedAt = now.AddDays(-3), Status = "Confirmed",
                Items = new List<PharmacyOrderItem> { new() { MedicineName = "Amoxicillin 500mg", Quantity = 10 } }
            }
        };

        var currentOrder = new PharmacyOrder
        {
            Id = 9,
            OrderNumber = "ORD-3003",
            PatientId = 15,
            CreatedAt = now,
            Items = new List<PharmacyOrderItem> { new() { MedicineName = "Amoxicillin 500mg", Quantity = 10 } }
        };

        // Act
        var result = _agent.EvaluateOrderSafety(currentOrder, pastOrders);

        // Assert
        Assert.Contains(result.SafetyFlags, f => f.Contains("Repeat Medication Purchase") && f.Contains("Amoxicillin 500mg"));
    }

    [Fact]
    public void EvaluateOrderSafety_EarlyRefillAttempt_FlagsEarlyRefill()
    {
        // Arrange
        var now = DateTime.UtcNow;
        var pastOrder = new PharmacyOrder
        {
            Id = 10,
            OrderNumber = "ORD-4001",
            PatientId = 20,
            CreatedAt = now.AddDays(-10),
            Status = "Confirmed",
            DaysSupply = 30,
            Items = new List<PharmacyOrderItem> { new() { MedicineName = "Metformin 500mg", Quantity = 60 } }
        };

        var currentOrder = new PharmacyOrder
        {
            Id = 11,
            OrderNumber = "ORD-4002",
            PatientId = 20,
            CreatedAt = now,
            DaysSupply = 30,
            Items = new List<PharmacyOrderItem> { new() { MedicineName = "Metformin 500mg", Quantity = 60 } }
        };

        // Act
        var result = _agent.EvaluateOrderSafety(currentOrder, new[] { pastOrder });

        // Assert
        Assert.Contains(result.SafetyFlags, f => f.Contains("Early refill attempt detected"));
        Assert.True(result.RiskScore >= 50);
    }

    [Fact]
    public void EvaluateOrderSafety_CleanOrder_ReturnsApproveAndLowRisk()
    {
        // Arrange
        var currentOrder = new PharmacyOrder
        {
            Id = 12,
            OrderNumber = "ORD-5001",
            PatientId = 30,
            CreatedAt = DateTime.UtcNow,
            Items = new List<PharmacyOrderItem> { new() { MedicineName = "Paracetamol 500mg", Quantity = 10 } }
        };

        // Act
        var result = _agent.EvaluateOrderSafety(currentOrder, Array.Empty<PharmacyOrder>());

        // Assert
        Assert.Equal(0, result.RiskScore);
        Assert.Equal("APPROVE", result.RecommendedAction);
        Assert.Empty(result.SafetyFlags);
    }
}
