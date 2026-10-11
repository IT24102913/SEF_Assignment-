using HealthBridge.Api.Data;
using HealthBridge.Api.DTOs.Category;
using HealthBridge.Api.Models;
using HealthBridge.Api.Services;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace HealthBridge.Tests.Services.Pharmacy;

public class CategoryServiceTests
{
    private ApplicationDbContext CreateInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        return new ApplicationDbContext(options);
    }

    [Fact]
    public async Task GetAllCategoriesAsync_ReturnsAlphabeticallyOrderedCategories()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        context.Categories.AddRange(
            new Category { Id = 1, Name = "Vitamins" },
            new Category { Id = 2, Name = "Antibiotics" },
            new Category { Id = 3, Name = "Pain Relief" }
        );
        await context.SaveChangesAsync();

        var service = new CategoryService(context);

        // Act
        var result = (await service.GetAllCategoriesAsync()).ToList();

        // Assert
        Assert.Equal(3, result.Count);
        Assert.Equal("Antibiotics", result[0].Name);
        Assert.Equal("Pain Relief", result[1].Name);
        Assert.Equal("Vitamins", result[2].Name);
    }

    [Fact]
    public async Task GetCategoryByIdAsync_ExistingId_ReturnsCategoryResponse()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        context.Categories.Add(new Category { Id = 10, Name = "Cardiac Care", Description = "Heart medications" });
        await context.SaveChangesAsync();

        var service = new CategoryService(context);

        // Act
        var result = await service.GetCategoryByIdAsync(10);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(10, result!.Id);
        Assert.Equal("Cardiac Care", result.Name);
        Assert.Equal("Heart medications", result.Description);
    }

    [Fact]
    public async Task GetCategoryByIdAsync_NonExistentId_ReturnsNull()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var service = new CategoryService(context);

        // Act
        var result = await service.GetCategoryByIdAsync(999);

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public async Task CreateCategoryAsync_ValidRequest_CreatesAndReturnsCategory()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var service = new CategoryService(context);

        var request = new CreateCategoryRequest
        {
            Name = "  Dermatology  ",
            Description = " Skin creams and lotions "
        };

        // Act
        var result = await service.CreateCategoryAsync(request);

        // Assert
        Assert.NotNull(result);
        Assert.True(result.Id > 0);
        Assert.Equal("Dermatology", result.Name); // Trimmed
        Assert.Equal("Skin creams and lotions", result.Description); // Trimmed
    }

    [Fact]
    public async Task UpdateCategoryAsync_ExistingId_UpdatesFieldsAndTimestamp()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        context.Categories.Add(new Category { Id = 5, Name = "Old Name", Description = "Old Desc" });
        await context.SaveChangesAsync();

        var service = new CategoryService(context);
        var request = new UpdateCategoryRequest
        {
            Name = "New Name",
            Description = "New Desc"
        };

        // Act
        var result = await service.UpdateCategoryAsync(5, request);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("New Name", result!.Name);
        Assert.NotNull(result.UpdatedAt);
    }

    [Fact]
    public async Task UpdateCategoryAsync_NonExistentId_ReturnsNull()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var service = new CategoryService(context);

        // Act
        var result = await service.UpdateCategoryAsync(999, new UpdateCategoryRequest { Name = "Test" });

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public async Task DeleteCategoryAsync_WithoutMedicines_DeletesSuccessfully()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        context.Categories.Add(new Category { Id = 7, Name = "Empty Category" });
        await context.SaveChangesAsync();

        var service = new CategoryService(context);

        // Act
        var result = await service.DeleteCategoryAsync(7);

        // Assert
        Assert.True(result);
        var inDb = await context.Categories.FindAsync(7);
        Assert.Null(inDb);
    }

    [Fact]
    public async Task DeleteCategoryAsync_NonExistentId_ReturnsFalse()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var service = new CategoryService(context);

        // Act
        var result = await service.DeleteCategoryAsync(999);

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task DeleteCategoryAsync_WithAssociatedMedicines_ThrowsInvalidOperationException()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var cat = new Category { Id = 8, Name = "Category With Meds" };
        context.Categories.Add(cat);
        context.Medicines.Add(new Medicine { Id = 1, Name = "Test Med", Price = 10, CategoryId = 8, Category = cat });
        await context.SaveChangesAsync();

        var service = new CategoryService(context);

        // Act & Assert
        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => service.DeleteCategoryAsync(8));
        Assert.Contains("associated", ex.Message);
    }
}
