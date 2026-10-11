using HealthBridge.Api.Agents.Pharmacy;
using HealthBridge.Api.Data;
using HealthBridge.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Xunit;

namespace HealthBridge.Tests.Agents.Pharmacy;

public class SymptomAdviceAgentTests
{
    private ApplicationDbContext CreateInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        return new ApplicationDbContext(options);
    }

    private SymptomAdviceAgent CreateAgent(ApplicationDbContext context, IMemoryCache? cache = null)
    {
        var mockConfig = new Mock<IConfiguration>();
        // No Gemini key triggers safe rule/fallback behavior
        mockConfig.Setup(c => c["Gemini:ApiKey"]).Returns(string.Empty);

        var mockHttpFactory = new Mock<IHttpClientFactory>();
        mockHttpFactory.Setup(f => f.CreateClient(It.IsAny<string>())).Returns(new HttpClient());

        return new SymptomAdviceAgent(
            mockConfig.Object,
            NullLogger<SymptomAdviceAgent>.Instance,
            mockHttpFactory.Object,
            context,
            cache ?? new MemoryCache(new MemoryCacheOptions())
        );
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public async Task GetAdviceAsync_EmptyOrWhitespaceSymptom_ReturnsSafeFallbackResponse(string symptom)
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var agent = CreateAgent(context);

        // Act
        var result = await agent.GetAdviceAsync(symptom, patientEmail: "patient@example.com");

        // Assert
        Assert.NotNull(result);
        Assert.Equal("General Wellness", result.SymptomCategory);
        Assert.NotEmpty(result.HomeRemedies);
        Assert.NotEmpty(result.WarningSigns);
        Assert.Contains("Fallback", result.EngineUsed);
    }

    [Fact]
    public async Task GetAdviceAsync_ValidSymptom_PersistsHistoryRecordInDatabase()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var agent = CreateAgent(context);

        // Act
        var result = await agent.GetAdviceAsync("headache and slight fever", patientEmail: "user1@example.com");

        // Assert
        Assert.NotNull(result);
        Assert.True(result.Id > 0);

        var persisted = await context.SymptomAdviceHistory.FirstOrDefaultAsync(h => h.Id == result.Id);
        Assert.NotNull(persisted);
        Assert.Equal("user1@example.com", persisted.PatientEmail);
        Assert.Equal("headache and slight fever", persisted.Symptom);
        Assert.NotNull(persisted.ResponseJson);
    }

    [Fact]
    public async Task GetHistoryAsync_FilteredByPatientEmail_ReturnsOnlyMatchingPatientRecords()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var agent = CreateAgent(context);

        await agent.GetAdviceAsync("mild cough", patientEmail: "alice@example.com");
        await agent.GetAdviceAsync("stomach ache", patientEmail: "alice@example.com");
        await agent.GetAdviceAsync("sore throat", patientEmail: "bob@example.com");

        // Act
        var aliceHistory = await agent.GetHistoryAsync(patientEmail: "alice@example.com");
        var bobHistory = await agent.GetHistoryAsync(patientEmail: "bob@example.com");

        // Assert
        Assert.Equal(2, aliceHistory.Count);
        Assert.Single(bobHistory);
        Assert.All(aliceHistory, item => Assert.DoesNotContain("sore throat", item.Symptom));
    }

    [Fact]
    public async Task GetHistoryAsync_RespectsLimitConstraint()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var agent = CreateAgent(context);

        for (int i = 1; i <= 5; i++)
        {
            await agent.GetAdviceAsync($"Symptom {i}", patientEmail: "limit_test@example.com");
        }

        // Act
        var limited = await agent.GetHistoryAsync(patientEmail: "limit_test@example.com", limit: 3);

        // Assert
        Assert.Equal(3, limited.Count);
    }

    [Fact]
    public async Task GetHistoryDetailAsync_ExistingId_ReturnsFullParsedResponse()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var agent = CreateAgent(context);

        var advice = await agent.GetAdviceAsync("joint stiffness in morning", patientEmail: "patient@example.com");

        // Act
        var detail = await agent.GetHistoryDetailAsync(advice.Id!.Value);

        // Assert
        Assert.NotNull(detail);
        Assert.Equal(advice.Id, detail.Id);
        Assert.Equal(advice.SymptomCategory, detail.SymptomCategory);
        Assert.NotEmpty(detail.HomeRemedies);
    }

    [Fact]
    public async Task GetHistoryDetailAsync_NonExistentId_ReturnsNull()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var agent = CreateAgent(context);

        // Act
        var detail = await agent.GetHistoryDetailAsync(99999);

        // Assert
        Assert.Null(detail);
    }

    [Fact]
    public async Task DeleteHistoryAsync_ExistingId_RemovesRecordAndReturnsTrue()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var agent = CreateAgent(context);

        var advice = await agent.GetAdviceAsync("itchy skin", patientEmail: "delete_test@example.com");

        // Act
        var deleted = await agent.DeleteHistoryAsync(advice.Id!.Value);

        // Assert
        Assert.True(deleted);
        var inDb = await context.SymptomAdviceHistory.FindAsync(advice.Id);
        Assert.Null(inDb);
    }

    [Fact]
    public async Task DeleteHistoryAsync_NonExistentId_ReturnsFalse()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var agent = CreateAgent(context);

        // Act
        var deleted = await agent.DeleteHistoryAsync(88888);

        // Assert
        Assert.False(deleted);
    }

    [Fact]
    public async Task GetAdviceAsync_WithoutExternalApiKey_ReturnsDeterministicSafeRemedies()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var agent = CreateAgent(context);

        // Act
        var result = await agent.GetAdviceAsync("severe exhaustion and dehydration", patientEmail: null);

        // Assert
        Assert.NotNull(result);
        Assert.NotEmpty(result.HomeRemedies);
        Assert.Contains(result.HomeRemedies, r => r.Contains("hydrated", StringComparison.OrdinalIgnoreCase));
        Assert.NotEmpty(result.WarningSigns);
        Assert.NotEmpty(result.ConsultDoctorIf);
    }
}
