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
    private readonly IEmailSender _emailSender;

    public AuthService(ApplicationDbContext context, IJwtTokenGenerator jwtTokenGenerator, IConfiguration configuration, IEmailSender emailSender)
    {
        _context = context;
        _jwtTokenGenerator = jwtTokenGenerator;
        _configuration = configuration;
        _emailSender = emailSender;
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

        var verificationToken = Guid.NewGuid().ToString("N") + Guid.NewGuid().ToString("N");
        var user = new User
        {
            FullName = request.FullName.Trim(),
            Email = normalizedEmail,
            PasswordHash = passwordHash,
            Role = UserRole.Patient,
            IsActive = true,
            IsEmailVerified = false,
            EmailVerificationToken = verificationToken,
            EmailVerificationTokenExpiresAt = DateTime.UtcNow.AddHours(24),
            NicNumber = normalizedNic,
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

        // Auto-create EMR Patient record linked to this user safely
        int codeNum = 1001;
        var existingPatientCodes = await _context.Patients.Select(p => p.PatientCode).ToListAsync();
        while (existingPatientCodes.Contains($"PAT-{codeNum}"))
        {
            codeNum++;
        }
        var nextCode = $"PAT-{codeNum}";

        var emrPatient = new Patient
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            PatientCode = nextCode,
            FullName = user.FullName,
            Email = normalizedEmail,
            ContactPhone = request.PhoneNumber.Trim(),
            Gender = request.Gender ?? "Other",
            DateOfBirth = DateTime.UtcNow, // Set default until updated by patient profile
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _context.Patients.Add(emrPatient);
        await _context.SaveChangesAsync();

        // Send verification email asynchronously (fire-and-forget — don't block registration)
        var baseUrl = _configuration["AppUrl"] ?? "http://localhost:5173";
        var verificationUrl = $"{baseUrl}/verify-email?token={user.EmailVerificationToken}";
        _ = _emailSender.SendVerificationEmailAsync(user.Email, user.FullName, user.EmailVerificationToken!, verificationUrl);

        return await MapToUserResponseAsync(user);
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

        if (!user.IsEmailVerified)
        {
            throw new InvalidOperationException("EMAIL_NOT_VERIFIED: Please verify your email address before signing in. Check your inbox for the verification link.");
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

            var profile = new PatientProfile
            {
                UserId = user.Id,
                CreatedAt = DateTime.UtcNow
            };
            _context.PatientProfiles.Add(profile);
            await _context.SaveChangesAsync();

            // Auto-create EMR Patient record for Google-registered users
            var patientCount = await _context.Patients.CountAsync();
            var emrPatient = new Patient
            {
                Id = Guid.NewGuid(),
                UserId = user.Id,
                PatientCode = $"PAT-{1000 + patientCount + 1}",
                FullName = user.FullName,
                Email = normalizedEmail,
                DateOfBirth = null, // Empty until chosen by customer
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _context.Patients.Add(emrPatient);
            await _context.SaveChangesAsync();
        }
        else if (string.IsNullOrWhiteSpace(user.ProfileImage) && !string.IsNullOrWhiteSpace(payload.Picture))
        {
            user.ProfileImage = payload.Picture;
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

    public async Task<bool> VerifyEmailAsync(string token)
    {
        if (string.IsNullOrWhiteSpace(token)) return false;

        var user = await _context.Users.FirstOrDefaultAsync(u => u.EmailVerificationToken == token.Trim());
        if (user == null) return false;

        if (user.EmailVerificationTokenExpiresAt.HasValue && user.EmailVerificationTokenExpiresAt.Value < DateTime.UtcNow)
        {
            throw new InvalidOperationException("Verification token has expired. Please request a new verification link.");
        }

        user.IsEmailVerified = true;
        user.EmailVerificationToken = null;
        user.EmailVerificationTokenExpiresAt = null;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> ResendVerificationEmailAsync(string email)
    {
        if (string.IsNullOrWhiteSpace(email)) return false;

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == email.Trim().ToLower());
        if (user == null) return false;

        if (user.IsEmailVerified) return true;

        user.EmailVerificationToken = Guid.NewGuid().ToString("N") + Guid.NewGuid().ToString("N");
        user.EmailVerificationTokenExpiresAt = DateTime.UtcNow.AddHours(24);
        await _context.SaveChangesAsync();

        var baseUrl = _configuration["AppUrl"] ?? "http://localhost:5173";
        var verificationUrl = $"{baseUrl}/verify-email?token={user.EmailVerificationToken}";

        var sent = await _emailSender.SendVerificationEmailAsync(user.Email, user.FullName, user.EmailVerificationToken, verificationUrl);
        if (!sent)
        {
            throw new System.Net.Mail.SmtpException("Failed to send verification email. Please verify SMTP settings.");
        }
        return true;
    }

    private async Task<UserResponse> MapToUserResponseAsync(User user)
    {
        string? patientCode = null;
        PatientProfile? profile = null;

        if (user.Role == UserRole.Patient)
        {
            var p = await _context.Patients.FirstOrDefaultAsync(x => x.UserId == user.Id || x.Email.ToLower() == user.Email.ToLower());
            patientCode = p?.PatientCode;
            profile = await _context.PatientProfiles.FirstOrDefaultAsync(x => x.UserId == user.Id);
        }

        return new UserResponse
        {
            Id = user.Id,
            FullName = user.FullName,
            Email = user.Email,
            Role = user.Role,
            PatientCode = patientCode,
            IsPharmacyBlocked = user.IsPharmacyBlocked,
            BlockReason = user.BlockReason,
            ProfileImage = user.ProfileImage,
            NicNumber = profile?.NicNumber ?? user.NicNumber,
            PhoneNumber = profile?.PhoneNumber,
            IsEmailVerified = user.IsEmailVerified
        };
    }
}
