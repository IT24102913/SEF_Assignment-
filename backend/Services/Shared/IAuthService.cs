using HealthBridge.Api.DTOs;
using HealthBridge.Api.DTOs.Auth;

namespace HealthBridge.Api.Services;

public interface IAuthService
{
    Task<UserResponse> RegisterPatientAsync(RegisterRequest request);
    Task<LoginResponse> LoginAsync(LoginRequest request);
    Task<LoginResponse> GoogleLoginAsync(string idToken);
}
