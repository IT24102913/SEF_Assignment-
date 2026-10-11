using HealthBridge.Api.Agents.Pharmacy;
using HealthBridge.Api.Controllers.Pharmacy;
using HealthBridge.Api.Data;
using HealthBridge.Api.DTOs.Pharmacy;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Xunit;

namespace HealthBridge.Tests.Controllers.Pharmacy;

public class SymptomAdviceControllerTests
{
    private ApplicationDbContext CreateInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        return new ApplicationDbContext(options);
    }

    private SymptomAdviceController CreateController(ApplicationDbContext context)
    {
        var mockConfig = new Mock<IConfiguration>();
        mockConfig.Setup(c => c["Gemini:ApiKey"]).Returns(string.Empty);

        var mockHttpFactory = new Mock<IHttpClientFactory>();
        mockHttpFactory.Setup(f => f.CreateClient(It.IsAny<string>())).Returns(new HttpClient());

        var agent = new SymptomAdviceAgent(
            mockConfig.Object,
            NullLogger<SymptomAdviceAgent>.Instance,
            mockHttpFactory.Object,
            context,
            new MemoryCache(new MemoryCacheOptions())
        );

        return new SymptomAdviceController(agent, NullLogger<SymptomAdviceController>.Instance);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public async Task GetAdvice_NullOrEmptySymptom_ReturnsBadRequest(string? symptom)
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var controller = CreateController(context);

        // Act
        var result = await controller.GetAdvice(new SymptomAdviceRequest { Symptom = symptom! });

        // Assert
        var badRequest = Assert.IsType<BadRequestObjectResult>(result.Result);
        Assert.NotNull(badRequest.Value);
    }

    [Fact]
    public async Task GetAdvice_ValidSymptom_ReturnsOkWithSymptomAdviceResponse()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var controller = CreateController(context);

        // Act
        var result = await controller.GetAdvice(new SymptomAdviceRequest
        {
            Symptom = "mild stomach ache and nausea",
            PatientEmail = "patient1@example.com"
        });

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var response = Assert.IsType<SymptomAdviceResponse>(okResult.Value);
        Assert.NotNull(response.SymptomCategory);
        Assert.NotEmpty(response.HomeRemedies);
    }

    [Fact]
    public async Task GetHistory_ReturnsOkWithListOfHistoryItems()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var controller = CreateController(context);

        await controller.GetAdvice(new SymptomAdviceRequest { Symptom = "symptom 1", PatientEmail = "user@test.com" });
        await controller.GetAdvice(new SymptomAdviceRequest { Symptom = "symptom 2", PatientEmail = "user@test.com" });

        // Act
        var result = await controller.GetHistory(patientEmail: "user@test.com", limit: 10);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var items = Assert.IsType<List<SymptomHistoryItemDto>>(okResult.Value);
        Assert.Equal(2, items.Count);
    }

    [Fact]
    public async Task GetHistoryDetail_ExistingId_ReturnsOkWithDetail()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var controller = CreateController(context);

        var adviceResult = await controller.GetAdvice(new SymptomAdviceRequest { Symptom = "headache", PatientEmail = "user@test.com" });
        var okAdvice = Assert.IsType<OkObjectResult>(adviceResult.Result);
        var advice = Assert.IsType<SymptomAdviceResponse>(okAdvice.Value);

        // Act
        var result = await controller.GetHistoryDetail(advice.Id!.Value);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var detail = Assert.IsType<SymptomAdviceResponse>(okResult.Value);
        Assert.Equal(advice.Id, detail.Id);
    }

    [Fact]
    public async Task GetHistoryDetail_NonExistentId_ReturnsNotFound()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var controller = CreateController(context);

        // Act
        var result = await controller.GetHistoryDetail(99999);

        // Assert
        Assert.IsType<NotFoundObjectResult>(result.Result);
    }

    [Fact]
    public async Task DeleteHistory_ExistingId_ReturnsNoContent()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var controller = CreateController(context);

        var adviceResult = await controller.GetAdvice(new SymptomAdviceRequest { Symptom = "back pain", PatientEmail = "user@test.com" });
        var okAdvice = Assert.IsType<OkObjectResult>(adviceResult.Result);
        var advice = Assert.IsType<SymptomAdviceResponse>(okAdvice.Value);

        // Act
        var result = await controller.DeleteHistory(advice.Id!.Value);

        // Assert
        Assert.IsType<NoContentResult>(result);
    }

    [Fact]
    public async Task DeleteHistory_NonExistentId_ReturnsNotFound()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var controller = CreateController(context);

        // Act
        var result = await controller.DeleteHistory(99999);

        // Assert
        Assert.IsType<NotFoundObjectResult>(result);
    }
}
