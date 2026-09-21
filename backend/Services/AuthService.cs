using Google.Apis.Auth;
using HealthBridge.Api.Authentication;
using HealthBridge.Api.Data;
using HealthBridge.Api.DTOs;
using HealthBridge.Api.DTOs.Auth;
using HealthBridge.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace HealthBridge.Api.Services;

public class AuthService : IAuthService
{
    private readonly ApplicationDbContext _context;
    private readonly IJwtTokenGenerator _jwtTokenGenerator;
    private readonly IConfiguration _configuration;

    public AuthService(ApplicationDbContext context, IJwtTokenGenerator jwtTokenGenerator, IConfiguration configuration)
    {
        _context = context;
        _jwtTokenGenerator = jwtTokenGenerator;
        _configuration = configuration;
    }

    public async Task<UserResponse> RegisterPatientAsync(RegisterRequest request)
    {
        var normalizedEmail = request.Email.Trim().ToLowerInvariant();

        // Check email uniqueness
        var existingUser = await _context.Users
            .AnyAsync(u => u.Email.ToLower() == normalizedEmail);
        if (existingUser)
            throw new InvalidOperationException("A user with this email already exists.");

        // Check NIC uniqueness
        var normalizedNic = request.NicNumber.Trim().ToUpperInvariant();
        var existingNic = await _context.PatientProfiles
            .AnyAsync(p => p.NicNumber != null && p.NicNumber.ToUpper() == normalizedNic);
        if (existingNic)
            throw new InvalidOperationException("This NIC number is already registered.");

        // Check Phone uniqueness
        var existingPhone = await _context.PatientProfiles
            .AnyAsync(p => p.PhoneNumber != null && p.PhoneNumber == request.PhoneNumber.Trim());
        if (existingPhone)
            throw new InvalidOperationException("This telephone number is already registered.");

        var passwordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);

        var user = new User
        {
            FullName = request.FullName.Trim(),
            Email = normalizedEmail,
            PasswordHash = passwordHash,
            Role = UserRole.Patient,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        // Create PatientProfile with the registration details
        var profile = new PatientProfile
        {
            UserId = user.Id,
            PhoneNumber = request.PhoneNumber.Trim(),
            NicNumber = normalizedNic,
            Gender = request.Gender,
            CreatedAt = DateTime.UtcNow
        };
        _context.PatientProfiles.Add(profile);
        await _context.SaveChangesAsync();

        return MapToUserResponse(user);
    }

    public async Task<LoginResponse> LoginAsync(LoginRequest request)
    {
        var normalizedEmail = request.Email.Trim().ToLowerInvariant();

        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Email.ToLower() == normalizedEmail);

        if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        {
            throw new UnauthorizedAccessException("Invalid email or password.");
        }

        if (!user.IsActive)
        {
            throw new UnauthorizedAccessException("Account has been deactivated. Please contact support.");
        }

        var token = _jwtTokenGenerator.GenerateToken(user);

        return new LoginResponse
        {
            Token = token,
            User = MapToUserResponse(user)
        };
    }

    public async Task<LoginResponse> GoogleLoginAsync(string idToken)
    {
        GoogleJsonWebSignature.Payload payload;
        try
        {
            var clientId = _configuration["Google:ClientId"];
            var settings = new GoogleJsonWebSignature.ValidationSettings();
            if (!string.IsNullOrWhiteSpace(clientId))
            {
                settings.Audience = new[] { clientId };
            }
            payload = await GoogleJsonWebSignature.ValidateAsync(idToken, settings);
        }
        catch (Exception ex)
        {
            throw new UnauthorizedAccessException($"Invalid Google ID token: {ex.Message}");
        }

        var normalizedEmail = payload.Email.Trim().ToLowerInvariant();
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == normalizedEmail);

        if (user == null)
        {
            user = new User
            {
                FullName = string.IsNullOrWhiteSpace(payload.Name) ? payload.Email.Split('@')[0] : payload.Name,
                Email = normalizedEmail,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(Guid.NewGuid().ToString()),
                Role = UserRole.Patient,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            var profile = new PatientProfile
            {
                UserId = user.Id,
                CreatedAt = DateTime.UtcNow
            };
            _context.PatientProfiles.Add(profile);
            await _context.SaveChangesAsync();
        }

        if (!user.IsActive)
        {
            throw new UnauthorizedAccessException("Account has been deactivated. Please contact support.");
        }

        var token = _jwtTokenGenerator.GenerateToken(user);

        return new LoginResponse
        {
            Token = token,
            User = MapToUserResponse(user)
        };
    }

    private static UserResponse MapToUserResponse(User user)
    {
        return new UserResponse
        {
            Id = user.Id,
            FullName = user.FullName,
            Email = user.Email,
            Role = user.Role
        };
    }
}
