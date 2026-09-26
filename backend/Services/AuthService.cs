using Google.Apis.Auth;
using HealthBridge.Api.Authentication;
using HealthBridge.Api.Data;
using HealthBridge.Api.DTOs;
using HealthBridge.Api.DTOs.Auth;
using HealthBridge.Api.Models;
using HealthBridge.Api.Models.EMR;
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

        var strategy = _context.Database.CreateExecutionStrategy();
        return await strategy.ExecuteAsync(async () =>
        {
            using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
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

                // Derive valid non-null DateOfBirth from NIC or safe default
                var dob = ParseDateOfBirthFromNic(normalizedNic) ?? new DateTime(1995, 1, 1, 0, 0, 0, DateTimeKind.Utc);

                // Create PatientProfile with the registration details
                var safeGender = string.IsNullOrWhiteSpace(request.Gender) ? "Other" : (request.Gender.Length > 10 ? "Other" : request.Gender);
                var profile = new PatientProfile
                {
                    UserId = user.Id,
                    PhoneNumber = request.PhoneNumber.Trim(),
                    NicNumber = normalizedNic,
                    Gender = safeGender,
                    DateOfBirth = dob,
                    CreatedAt = DateTime.UtcNow
                };
                _context.PatientProfiles.Add(profile);
                await _context.SaveChangesAsync();

                // Generate unique PatientCode for EMR Patient record
                var patientCount = await _context.Patients.CountAsync();
                var patientCode = $"PAT-{1000 + patientCount + 1}";
                while (await _context.Patients.AnyAsync(p => p.PatientCode == patientCode))
                {
                    patientCount++;
                    patientCode = $"PAT-{1000 + patientCount + 1}";
                }

                var emrPatient = new Patient
                {
                    Id = Guid.NewGuid(),
                    UserId = user.Id,
                    PatientCode = patientCode,
                    FullName = user.FullName,
                    Email = normalizedEmail,
                    ContactPhone = request.PhoneNumber.Trim(),
                    Gender = safeGender,
                    DateOfBirth = dob,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                _context.Patients.Add(emrPatient);
                await _context.SaveChangesAsync();

                await transaction.CommitAsync();

                return await MapToUserResponseAsync(user);
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        });
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
            User = await MapToUserResponseAsync(user)
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

            var defaultDob = new DateTime(1995, 1, 1, 0, 0, 0, DateTimeKind.Utc);
            var profile = new PatientProfile
            {
                UserId = user.Id,
                DateOfBirth = defaultDob,
                Gender = "Other",
                CreatedAt = DateTime.UtcNow
            };
            _context.PatientProfiles.Add(profile);
            await _context.SaveChangesAsync();

            // Auto-create EMR Patient record for Google-registered users
            var patientCount = await _context.Patients.CountAsync();
            var patientCode = $"PAT-{1000 + patientCount + 1}";
            while (await _context.Patients.AnyAsync(p => p.PatientCode == patientCode))
            {
                patientCount++;
                patientCode = $"PAT-{1000 + patientCount + 1}";
            }

            var emrPatient = new Patient
            {
                Id = Guid.NewGuid(),
                UserId = user.Id,
                PatientCode = patientCode,
                FullName = user.FullName,
                Email = normalizedEmail,
                DateOfBirth = defaultDob,
                Gender = "Other",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _context.Patients.Add(emrPatient);
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
            User = await MapToUserResponseAsync(user)
        };
    }

    private async Task<UserResponse> MapToUserResponseAsync(User user)
    {
        string? patientCode = null;
        if (user.Role == UserRole.Patient)
        {
            var p = await _context.Patients.FirstOrDefaultAsync(x => x.UserId == user.Id || x.Email.ToLower() == user.Email.ToLower());
            patientCode = p?.PatientCode;
        }

        return new UserResponse
        {
            Id = user.Id,
            FullName = user.FullName,
            Email = user.Email,
            Role = user.Role,
            PatientCode = patientCode
        };
    }

    private static DateTime? ParseDateOfBirthFromNic(string nic)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(nic)) return null;
            nic = nic.Trim();

            int year = 0;
            int dayOfYear = 0;

            if (nic.Length == 10 && (nic.EndsWith("V", StringComparison.OrdinalIgnoreCase) || nic.EndsWith("X", StringComparison.OrdinalIgnoreCase)))
            {
                if (int.TryParse(nic.Substring(0, 2), out var y) && int.TryParse(nic.Substring(2, 3), out var d))
                {
                    year = 1900 + y;
                    dayOfYear = d > 500 ? d - 500 : d;
                }
            }
            else if (nic.Length == 12 && long.TryParse(nic, out _))
            {
                if (int.TryParse(nic.Substring(0, 4), out var y) && int.TryParse(nic.Substring(4, 3), out var d))
                {
                    year = y;
                    dayOfYear = d > 500 ? d - 500 : d;
                }
            }

            if (year > 1900 && dayOfYear >= 1 && dayOfYear <= 366)
            {
                return new DateTime(year, 1, 1, 0, 0, 0, DateTimeKind.Utc).AddDays(dayOfYear - 1);
            }
        }
        catch { }
        return null;
    }
}
