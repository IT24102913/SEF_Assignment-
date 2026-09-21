using System.ComponentModel.DataAnnotations;

namespace HealthBridge.Api.DTOs.Lab;

public class CreateLabTestRequest
{
    [Required, MaxLength(200)] public string Name { get; set; } = string.Empty;
    [Required] public string Description { get; set; } = string.Empty;
    [Required, Range(0.01, 1000000)] public decimal Price { get; set; }
    public bool IsRestricted { get; set; } = false;
    [Range(1, 30)] public int TurnaroundDays { get; set; } = 1;
    [Required, MaxLength(100)] public string Category { get; set; } = string.Empty;
}
