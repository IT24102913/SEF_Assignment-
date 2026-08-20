namespace HealthBridge.Api.DTOs.Lab;

public class UpdateLabTestRequest
{
    public string? Name { get; set; }
    public string? Description { get; set; }
    public decimal? Price { get; set; }
    public bool? IsRestricted { get; set; }
    public int? TurnaroundDays { get; set; }
    public string? Category { get; set; }
    public bool? IsActive { get; set; }
}
