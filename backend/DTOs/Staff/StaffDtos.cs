using System.ComponentModel.DataAnnotations;

namespace HealthBridge.Api.DTOs.Staff;

public class StaffResponseDto
{
    public int Id { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public string? Department { get; set; }
    public string? Specialization { get; set; }
    public string? AvailableDays { get; set; }
    public string? AvailableTime { get; set; }
    public string? PhoneNumber { get; set; }
    public string? RoomNumber { get; set; }
}

public class CreateStaffRequestDto
{
    [Required]
    [MaxLength(100)]
    public string FullName { get; set; } = string.Empty;

    [Required]
    [EmailAddress]
    [MaxLength(150)]
    public string Email { get; set; } = string.Empty;

    [Required]
    [MinLength(6)]
    public string Password { get; set; } = string.Empty;

    [Required]
    public string Role { get; set; } = string.Empty;

    public string? Department { get; set; }
    public string? Specialization { get; set; }
    public string? AvailableDays { get; set; }
    public string? AvailableTime { get; set; }
    public string? PhoneNumber { get; set; }
}

public class UpdateStaffRequestDto
{
    [Required]
    [MaxLength(100)]
    public string FullName { get; set; } = string.Empty;

    [Required]
    public string Role { get; set; } = string.Empty;

    public string? Department { get; set; }
    public string? Specialization { get; set; }
    public string? AvailableDays { get; set; }
    public string? AvailableTime { get; set; }
    public string? PhoneNumber { get; set; }
    public bool? IsActive { get; set; }
}
