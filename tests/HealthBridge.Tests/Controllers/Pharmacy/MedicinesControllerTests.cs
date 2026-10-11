using HealthBridge.Api.Agents;
using HealthBridge.Api.Controllers;
using HealthBridge.Api.DTOs.Medicine;
using HealthBridge.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Xunit;

namespace HealthBridge.Tests.Controllers.Pharmacy;

public class MedicinesControllerTests
{
    private readonly Mock<IMedicineService> _mockService;
    private readonly InventoryForecastingAgent _forecastAgent;
    private readonly MedicinesController _controller;

    public MedicinesControllerTests()
    {
        _mockService = new Mock<IMedicineService>();

        _forecastAgent = new InventoryForecastingAgent(
            NullLogger<InventoryForecastingAgent>.Instance,
            new Mock<IConfiguration>().Object,
            new Mock<IHttpClientFactory>().Object,
            new MemoryCache(new MemoryCacheOptions())
        );

        _controller = new MedicinesController(_mockService.Object, _forecastAgent);
    }

    [Fact]
    public async Task GetAll_ReturnsOkResultWithListOfMedicines()
    {
        // Arrange
        var sampleList = new List<MedicineResponse>
        {
            new() { Id = 1, Name = "Paracetamol 500mg", Price = 10m },
            new() { Id = 2, Name = "Amoxicillin 250mg", Price = 25m }
        };
        _mockService.Setup(s => s.GetAllMedicinesAsync()).ReturnsAsync(sampleList);

        // Act
        var result = await _controller.GetAll();

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var returned = Assert.IsAssignableFrom<IEnumerable<MedicineResponse>>(okResult.Value);
        Assert.Equal(2, returned.Count());
    }

    [Fact]
    public async Task GetById_ExistingId_ReturnsOkResultWithMedicine()
    {
        // Arrange
        var sample = new MedicineResponse { Id = 5, Name = "Ibuprofen 400mg", Price = 15m };
        _mockService.Setup(s => s.GetMedicineByIdAsync(5)).ReturnsAsync(sample);

        // Act
        var result = await _controller.GetById(5);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var returned = Assert.IsType<MedicineResponse>(okResult.Value);
        Assert.Equal(5, returned.Id);
        Assert.Equal("Ibuprofen 400mg", returned.Name);
    }

    [Fact]
    public async Task GetById_NonExistentId_ReturnsNotFound()
    {
        // Arrange
        _mockService.Setup(s => s.GetMedicineByIdAsync(999)).ReturnsAsync((MedicineResponse?)null);

        // Act
        var result = await _controller.GetById(999);

        // Assert
        Assert.IsType<NotFoundObjectResult>(result.Result);
    }

    [Fact]
    public async Task Create_ValidRequest_ReturnsCreatedAtAction()
    {
        // Arrange
        var request = new CreateMedicineRequest { Name = "Cough Syrup", Price = 120m, CategoryId = 1, StockQuantity = 50 };
        var created = new MedicineResponse { Id = 10, Name = request.Name, Price = request.Price, CategoryId = 1 };
        _mockService.Setup(s => s.CreateMedicineAsync(request)).ReturnsAsync(created);

        // Act
        var result = await _controller.Create(request);

        // Assert
        var createdResult = Assert.IsType<CreatedAtActionResult>(result.Result);
        Assert.Equal(nameof(_controller.GetById), createdResult.ActionName);
        var returned = Assert.IsType<MedicineResponse>(createdResult.Value);
        Assert.Equal(10, returned.Id);
    }

    [Fact]
    public async Task Create_InvalidModelState_ReturnsBadRequest()
    {
        // Arrange
        var request = new CreateMedicineRequest { Name = "" };
        _controller.ModelState.AddModelError("Name", "Name is required");

        // Act
        var result = await _controller.Create(request);

        // Assert
        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task Create_CategoryNotFound_ReturnsNotFound()
    {
        // Arrange
        var request = new CreateMedicineRequest { Name = "Antibiotic", CategoryId = 999 };
        _mockService.Setup(s => s.CreateMedicineAsync(request))
            .ThrowsAsync(new KeyNotFoundException("Category not found"));

        // Act
        var result = await _controller.Create(request);

        // Assert
        Assert.IsType<NotFoundObjectResult>(result.Result);
    }

    [Fact]
    public async Task Create_ArgumentException_ReturnsBadRequest()
    {
        // Arrange
        var request = new CreateMedicineRequest { Name = "Bad Price", Price = -10 };
        _mockService.Setup(s => s.CreateMedicineAsync(request))
            .ThrowsAsync(new ArgumentException("Price must be >= 0"));

        // Act
        var result = await _controller.Create(request);

        // Assert
        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task Update_ValidRequest_ReturnsOkWithUpdatedMedicine()
    {
        // Arrange
        var request = new UpdateMedicineRequest { Name = "Updated Name", Price = 30m, CategoryId = 1 };
        var updated = new MedicineResponse { Id = 1, Name = "Updated Name", Price = 30m, CategoryId = 1 };
        _mockService.Setup(s => s.UpdateMedicineAsync(1, request)).ReturnsAsync(updated);

        // Act
        var result = await _controller.Update(1, request);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var returned = Assert.IsType<MedicineResponse>(okResult.Value);
        Assert.Equal("Updated Name", returned.Name);
    }

    [Fact]
    public async Task Update_NonExistentId_ReturnsNotFound()
    {
        // Arrange
        var request = new UpdateMedicineRequest { Name = "Updated Name", CategoryId = 1 };
        _mockService.Setup(s => s.UpdateMedicineAsync(999, request)).ReturnsAsync((MedicineResponse?)null);

        // Act
        var result = await _controller.Update(999, request);

        // Assert
        Assert.IsType<NotFoundObjectResult>(result.Result);
    }

    [Fact]
    public async Task Update_InvalidModelState_ReturnsBadRequest()
    {
        // Arrange
        var request = new UpdateMedicineRequest { Name = "" };
        _controller.ModelState.AddModelError("Name", "Name is required");

        // Act
        var result = await _controller.Update(1, request);

        // Assert
        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task Restock_ValidId_ReturnsOkWithUpdatedStock()
    {
        // Arrange
        var updated = new MedicineResponse { Id = 1, StockQuantity = 60 };
        _mockService.Setup(s => s.RestockMedicineAsync(1, 10)).ReturnsAsync(updated);

        // Act
        var result = await _controller.Restock(1, new RestockRequest { AdditionalQuantity = 10 });

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var returned = Assert.IsType<MedicineResponse>(okResult.Value);
        Assert.Equal(60, returned.StockQuantity);
    }

    [Fact]
    public async Task Restock_NonExistentId_ReturnsNotFound()
    {
        // Arrange
        _mockService.Setup(s => s.RestockMedicineAsync(999, 10)).ReturnsAsync((MedicineResponse?)null);

        // Act
        var result = await _controller.Restock(999, new RestockRequest { AdditionalQuantity = 10 });

        // Assert
        Assert.IsType<NotFoundObjectResult>(result.Result);
    }

    [Fact]
    public async Task AdjustStock_ValidId_ReturnsOkWithNewQuantity()
    {
        // Arrange
        var updated = new MedicineResponse { Id = 1, StockQuantity = 100 };
        _mockService.Setup(s => s.SetStockQuantityAsync(1, 100)).ReturnsAsync(updated);

        // Act
        var result = await _controller.AdjustStock(1, new AdjustStockRequest { NewQuantity = 100 });

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var returned = Assert.IsType<MedicineResponse>(okResult.Value);
        Assert.Equal(100, returned.StockQuantity);
    }

    [Fact]
    public async Task AdjustStock_NonExistentId_ReturnsNotFound()
    {
        // Arrange
        _mockService.Setup(s => s.SetStockQuantityAsync(999, 100)).ReturnsAsync((MedicineResponse?)null);

        // Act
        var result = await _controller.AdjustStock(999, new AdjustStockRequest { NewQuantity = 100 });

        // Assert
        Assert.IsType<NotFoundObjectResult>(result.Result);
    }

    [Fact]
    public async Task Delete_ExistingId_ReturnsNoContent()
    {
        // Arrange
        _mockService.Setup(s => s.DeleteMedicineAsync(1)).ReturnsAsync(true);

        // Act
        var result = await _controller.Delete(1);

        // Assert
        Assert.IsType<NoContentResult>(result);
    }

    [Fact]
    public async Task Delete_NonExistentId_ReturnsNotFound()
    {
        // Arrange
        _mockService.Setup(s => s.DeleteMedicineAsync(999)).ReturnsAsync(false);

        // Act
        var result = await _controller.Delete(999);

        // Assert
        Assert.IsType<NotFoundObjectResult>(result);
    }
}
