using HealthBridge.Api.DTOs.Auth;

namespace HealthBridge.Api.DTOs.EMR;

public class EmrStaffLoginDto
{
    public string StaffIdOrEmail { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string TargetRole { get; set; } = string.Empty; // "Consultant", "Laboratorian", "Pharmacist", "Admin"
}

public class StaffLoginResponseDto
{
    public string Token { get; set; } = string.Empty;
    public UserResponse User { get; set; } = null!;
    public string Role { get; set; } = string.Empty;
    public string StaffId { get; set; } = string.Empty;
}
