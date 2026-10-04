using System.ComponentModel.DataAnnotations;

namespace HealthBridge.Api.Models;

public class User
{
    public int Id { get; set; }

    [Required]
    [MaxLength(100)]
    public string FullName { get; set; } = string.Empty;

    [Required]
    [EmailAddress]
    [MaxLength(150)]
    public string Email { get; set; } = string.Empty;

    [Required]
    public string PasswordHash { get; set; } = string.Empty;

    [Required]
    [MaxLength(50)]
    public string Role { get; set; } = UserRole.Patient;

    public bool IsActive { get; set; } = true;

    public bool IsPharmacyBlocked { get; set; } = false;

    public string? BlockReason { get; set; }

    public string? ProfileImage { get; set; }

    public string? NicNumber { get; set; }

    public bool IsEmailVerified { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
