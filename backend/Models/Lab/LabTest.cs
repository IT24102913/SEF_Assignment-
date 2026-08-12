using System.ComponentModel.DataAnnotations;

namespace LabManagement.API.Models;

public class LabTest
{
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required, MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    [Required]
    public decimal Price { get; set; }

    public bool IsRestricted { get; set; } = false;

    public int TurnaroundDays { get; set; } = 1;

    [MaxLength(100)]
    public string Category { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public ICollection<LabBooking> Bookings { get; set; } = new List<LabBooking>();
}
