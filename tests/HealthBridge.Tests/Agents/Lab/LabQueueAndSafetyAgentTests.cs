using HealthBridge.Api.Agents.Lab;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace HealthBridge.Tests.Agents.Lab;

public class LabQueueAndSafetyAgentTests
{
    private readonly LabQueueAndSafetyAgent _agent;

    public LabQueueAndSafetyAgentTests()
    {
        _agent = new LabQueueAndSafetyAgent(NullLogger<LabQueueAndSafetyAgent>.Instance);
    }

    [Fact]
    public async Task EvaluateAndOptimizeAsync_FastingTest_AssignsFastingPriorityAndTokenPrefixF()
    {
        // Arrange
        var input = new LabQueueSafetyInput
        {
            BookingId = Guid.NewGuid(),
            TestName = "Fasting Blood Sugar (FBS)",
            TestCategory = "Biochemistry",
            TestIsRestricted = false,
            DailySequenceNo = 1
        };

        // Act
        var result = await _agent.EvaluateAndOptimizeAsync(input);

        // Assert
        Assert.True(result.Success);
        Assert.True(result.RequiresFasting);
        Assert.Equal("FASTING_PRIORITY", result.PriorityTier);
        Assert.StartsWith("F-", result.QueueToken);
        Assert.Equal(8, result.RequiredFastingHours);
    }

    [Fact]
    public async Task EvaluateAndOptimizeAsync_LipidPanel_Requires12HoursFasting()
    {
        // Arrange
        var input = new LabQueueSafetyInput
        {
            BookingId = Guid.NewGuid(),
            TestName = "Lipid Profile Panel",
            TestCategory = "Biochemistry",
            TestIsRestricted = false,
            DailySequenceNo = 2
        };

        // Act
        var result = await _agent.EvaluateAndOptimizeAsync(input);

        // Assert
        Assert.True(result.RequiresFasting);
        Assert.Equal(12, result.RequiredFastingHours);
        Assert.Equal("FASTING_PRIORITY", result.PriorityTier);
        Assert.StartsWith("F-", result.QueueToken);
    }

    [Theory]
    [InlineData(1, 2)] // (1 % 3) + 1 = 2
    [InlineData(2, 3)] // (2 % 3) + 1 = 3
    [InlineData(3, 1)] // (3 % 3) + 1 = 1
    [InlineData(4, 2)] // (4 % 3) + 1 = 2
    [InlineData(5, 3)] // (5 % 3) + 1 = 3
    [InlineData(6, 1)] // (6 % 3) + 1 = 1
    public async Task EvaluateAndOptimizeAsync_PhlebotomyChairBalancing_RotatesAcrossThreeChairs(int sequenceNo, int expectedChair)
    {
        // Arrange
        var input = new LabQueueSafetyInput
        {
            BookingId = Guid.NewGuid(),
            TestName = "Full Blood Count (FBC)",
            TestCategory = "Hematology",
            TestIsRestricted = false,
            DailySequenceNo = sequenceNo
        };

        // Act
        var result = await _agent.EvaluateAndOptimizeAsync(input);

        // Assert
        Assert.Equal(expectedChair, result.AssignedChairNo);
    }

    [Fact]
    public async Task EvaluateAndOptimizeAsync_RestrictedNonFasting_AssignsSpecializedPriority()
    {
        // Arrange
        var input = new LabQueueSafetyInput
        {
            BookingId = Guid.NewGuid(),
            TestName = "Biopsy / Histopathology",
            TestCategory = "Histopathology",
            TestIsRestricted = true,
            DailySequenceNo = 5
        };

        // Act
        var result = await _agent.EvaluateAndOptimizeAsync(input);

        // Assert
        Assert.False(result.RequiresFasting);
        Assert.Equal("SPECIALIZED_PRIORITY", result.PriorityTier);
        Assert.StartsWith("S-", result.QueueToken);
    }

    [Fact]
    public async Task EvaluateAndOptimizeAsync_RoutineTest_AssignsRoutinePriority()
    {
        // Arrange
        var input = new LabQueueSafetyInput
        {
            BookingId = Guid.NewGuid(),
            TestName = "Urine Full Report (UFR)",
            TestCategory = "Clinical Pathology",
            TestIsRestricted = false,
            DailySequenceNo = 7
        };

        // Act
        var result = await _agent.EvaluateAndOptimizeAsync(input);

        // Assert
        Assert.False(result.RequiresFasting);
        Assert.Equal("ROUTINE", result.PriorityTier);
        Assert.StartsWith("R-", result.QueueToken);
    }
}
