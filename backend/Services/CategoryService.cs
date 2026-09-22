using HealthBridge.Api.Data;
using HealthBridge.Api.DTOs.Category;
using HealthBridge.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace HealthBridge.Api.Services;

public class CategoryService : ICategoryService
{
    private readonly ApplicationDbContext _context;

    public CategoryService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<CategoryResponse>> GetAllCategoriesAsync()
    {
        return await _context.Categories
            .AsNoTracking()
            .OrderBy(c => c.Name)
            .Select(c => MapToCategoryResponse(c))
            .ToListAsync();
    }

    public async Task<CategoryResponse?> GetCategoryByIdAsync(int id)
    {
        var category = await _context.Categories
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == id);

        return category == null ? null : MapToCategoryResponse(category);
    }

    public async Task<CategoryResponse> CreateCategoryAsync(CreateCategoryRequest request)
    {
        var category = new Category
        {
            Name = request.Name.Trim(),
            Description = request.Description?.Trim(),
            CreatedAt = DateTime.UtcNow
        };

        _context.Categories.Add(category);
        await _context.SaveChangesAsync();

        return MapToCategoryResponse(category);
    }

    public async Task<CategoryResponse?> UpdateCategoryAsync(int id, UpdateCategoryRequest request)
    {
        var category = await _context.Categories.FindAsync(id);
        if (category == null) return null;

        category.Name = request.Name.Trim();
        category.Description = request.Description?.Trim();
        category.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return MapToCategoryResponse(category);
    }

    public async Task<bool> DeleteCategoryAsync(int id)
    {
        var category = await _context.Categories
            .Include(c => c.Medicines)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (category == null) return false;

        if (category.Medicines.Any())
        {
            throw new InvalidOperationException("Cannot delete category because medicines are currently associated with it.");
        }

        _context.Categories.Remove(category);
        await _context.SaveChangesAsync();
        return true;
    }

    private static CategoryResponse MapToCategoryResponse(Category category)
    {
        return new CategoryResponse
        {
            Id = category.Id,
            Name = category.Name,
            Description = category.Description,
            CreatedAt = category.CreatedAt,
            UpdatedAt = category.UpdatedAt
        };
    }
}
