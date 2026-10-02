namespace HealthBridge.Api.DTOs.Auth;

public class UserResponse
{
    public int Id { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string? PatientCode { get; set; }
    public bool IsPharmacyBlocked { get; set; }
    public string? BlockReason { get; set; }
    public string? ProfileImage { get; set; }
    public string? NicNumber { get; set; }
    public string? PhoneNumber { get; set; }
    public bool IsEmailVerified { get; set; }
}
