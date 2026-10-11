using HealthBridge.Api.Controllers;
using HealthBridge.Api.DTOs.Category;
using HealthBridge.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Moq;
using Xunit;

namespace HealthBridge.Tests.Controllers.Pharmacy;

public class CategoriesControllerTests
{
    private readonly Mock<ICategoryService> _mockService;
    private readonly CategoriesController _controller;

    public CategoriesControllerTests()
    {
        _mockService = new Mock<ICategoryService>();
        _controller = new CategoriesController(_mockService.Object);
    }

    [Fact]
    public async Task GetAll_ReturnsOkWithCategories()
    {
        // Arrange
        var list = new List<CategoryResponse>
        {
            new() { Id = 1, Name = "Antibiotics", Description = "Antibiotic meds" },
            new() { Id = 2, Name = "Analgesics", Description = "Pain relief meds" }
        };
        _mockService.Setup(s => s.GetAllCategoriesAsync()).ReturnsAsync(list);

        // Act
        var result = await _controller.GetAll();

        // Assert
        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var categories = Assert.IsAssignableFrom<IEnumerable<CategoryResponse>>(ok.Value);
        Assert.Equal(2, categories.Count());
    }

    [Fact]
    public async Task GetById_ExistingId_ReturnsOkWithCategory()
    {
        // Arrange
        var cat = new CategoryResponse { Id = 1, Name = "Vitamins" };
        _mockService.Setup(s => s.GetCategoryByIdAsync(1)).ReturnsAsync(cat);

        // Act
        var result = await _controller.GetById(1);

        // Assert
        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var returned = Assert.IsType<CategoryResponse>(ok.Value);
        Assert.Equal(1, returned.Id);
        Assert.Equal("Vitamins", returned.Name);
    }

    [Fact]
    public async Task GetById_NonExistentId_ReturnsNotFound()
    {
        // Arrange
        _mockService.Setup(s => s.GetCategoryByIdAsync(999)).ReturnsAsync((CategoryResponse?)null);

        // Act
        var result = await _controller.GetById(999);

        // Assert
        Assert.IsType<NotFoundObjectResult>(result.Result);
    }

    [Fact]
    public async Task Create_ValidRequest_ReturnsCreatedAtAction()
    {
        // Arrange
        var req = new CreateCategoryRequest { Name = "First Aid", Description = "Bandages and antiseptics" };
        var created = new CategoryResponse { Id = 10, Name = req.Name, Description = req.Description };
        _mockService.Setup(s => s.CreateCategoryAsync(req)).ReturnsAsync(created);

        // Act
        var result = await _controller.Create(req);

        // Assert
        var action = Assert.IsType<CreatedAtActionResult>(result.Result);
        Assert.Equal(nameof(_controller.GetById), action.ActionName);
        var val = Assert.IsType<CategoryResponse>(action.Value);
        Assert.Equal(10, val.Id);
    }

    [Fact]
    public async Task Create_InvalidModelState_ReturnsBadRequest()
    {
        // Arrange
        var req = new CreateCategoryRequest { Name = "" };
        _controller.ModelState.AddModelError("Name", "Name is required");

        // Act
        var result = await _controller.Create(req);

        // Assert
        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task Update_ValidRequest_ReturnsOkWithUpdatedCategory()
    {
        // Arrange
        var req = new UpdateCategoryRequest { Name = "Updated Category", Description = "Updated desc" };
        var updated = new CategoryResponse { Id = 2, Name = req.Name, Description = req.Description };
        _mockService.Setup(s => s.UpdateCategoryAsync(2, req)).ReturnsAsync(updated);

        // Act
        var result = await _controller.Update(2, req);

        // Assert
        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var val = Assert.IsType<CategoryResponse>(ok.Value);
        Assert.Equal("Updated Category", val.Name);
    }

    [Fact]
    public async Task Update_NonExistentId_ReturnsNotFound()
    {
        // Arrange
        var req = new UpdateCategoryRequest { Name = "Category" };
        _mockService.Setup(s => s.UpdateCategoryAsync(999, req)).ReturnsAsync((CategoryResponse?)null);

        // Act
        var result = await _controller.Update(999, req);

        // Assert
        Assert.IsType<NotFoundObjectResult>(result.Result);
    }

    [Fact]
    public async Task Update_InvalidModelState_ReturnsBadRequest()
    {
        // Arrange
        var req = new UpdateCategoryRequest { Name = "" };
        _controller.ModelState.AddModelError("Name", "Name is required");

        // Act
        var result = await _controller.Update(1, req);

        // Assert
        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task Delete_ExistingId_ReturnsNoContent()
    {
        // Arrange
        _mockService.Setup(s => s.DeleteCategoryAsync(1)).ReturnsAsync(true);

        // Act
        var result = await _controller.Delete(1);

        // Assert
        Assert.IsType<NoContentResult>(result);
    }

    [Fact]
    public async Task Delete_NonExistentId_ReturnsNotFound()
    {
        // Arrange
        _mockService.Setup(s => s.DeleteCategoryAsync(999)).ReturnsAsync(false);

        // Act
        var result = await _controller.Delete(999);

        // Assert
        Assert.IsType<NotFoundObjectResult>(result);
    }

    [Fact]
    public async Task Delete_CategoryWithMedicines_ReturnsConflict()
    {
        // Arrange
        _mockService.Setup(s => s.DeleteCategoryAsync(1))
            .ThrowsAsync(new InvalidOperationException("Cannot delete category with associated medicines."));

        // Act
        var result = await _controller.Delete(1);

        // Assert
        var conflict = Assert.IsType<ConflictObjectResult>(result);
        Assert.NotNull(conflict.Value);
    }
}
