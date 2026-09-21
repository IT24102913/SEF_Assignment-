namespace HealthBridge.Api.DTOs.Auth;

public class LoginResponse
{
    public string Token { get; set; } = string.Empty;
    public UserResponse User { get; set; } = null!;

    public string UserId => User?.Id.ToString() ?? string.Empty;
    public string Name => User?.FullName ?? string.Empty;
    public string Email => User?.Email ?? string.Empty;
    public string Role => User?.Role ?? "Patient";
}
