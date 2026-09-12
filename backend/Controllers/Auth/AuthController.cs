using Google.Apis.Auth;
using LabManagement.API.Data;
using LabManagement.API.DTOs;
using LabManagement.API.Models;
using LabManagement.API.Models.EMR;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;

namespace LabManagement.API.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IConfiguration _config;
    private readonly ILogger<AuthController> _logger;

    public AuthController(AppDbContext db, IConfiguration config, ILogger<AuthController> logger)
    {
        _db = db;
        _config = config;
        _logger = logger;
    }

    // ─── Register (Email + Password) ─────────────────────────────────────────
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequestDto dto)
    {
        if (await _db.AppUsers.AnyAsync(u => u.Email == dto.Email.ToLower()))
            return BadRequest(new { message = "An account with this email already exists." });

        // Generate next PatientCode
        var count = await _db.Patients.CountAsync();
        var patientCode = $"PAT-{1000 + count + 1}";
        while (await _db.Patients.AnyAsync(p => p.PatientCode == patientCode))
        {
            count++;
            patientCode = $"PAT-{1000 + count + 1}";
        }

        var approxDob = dto.Age.HasValue && dto.Age.Value > 0
            ? DateTime.UtcNow.AddYears(-dto.Age.Value).Date
            : new DateTime(2000, 1, 1, 0, 0, 0, DateTimeKind.Utc);

        var patient = new Patient
        {
            PatientCode = patientCode,
            FullName = dto.Name.Trim(),
            Email = dto.Email.ToLower().Trim(),
            ContactPhone = dto.PhoneNumber?.Trim() ?? string.Empty,
            DateOfBirth = DateTime.SpecifyKind(approxDob, DateTimeKind.Utc),
            Gender = "Other",
            BloodGroup = "Unknown",
            Address = string.Empty,
            EmergencyContactName = string.Empty,
            EmergencyContactPhone = string.Empty,
            Allergies = string.Empty,
            ChronicConditions = string.Empty,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _db.Patients.Add(patient);

        var user = new AppUser
        {
            Name = dto.Name.Trim(),
            Email = dto.Email.ToLower().Trim(),
            PasswordHash = HashPassword(dto.Password),
            Role = "Patient",
            PhoneNumber = dto.PhoneNumber?.Trim(),
            Age = dto.Age,
            PatientCode = patientCode
        };

        _db.AppUsers.Add(user);
        await _db.SaveChangesAsync();

        _logger.LogInformation("[Auth] New patient registered: {Email} with PatientCode: {Code}", user.Email, patientCode);
        return Ok(BuildAuthResponse(user));
    }

    // ─── Login (Email + Password) ─────────────────────────────────────────────
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequestDto dto)
    {
        var user = await _db.AppUsers.FirstOrDefaultAsync(u => u.Email == dto.Email.ToLower());

        if (user == null || !VerifyPassword(dto.Password, user.PasswordHash))
            return Unauthorized(new { message = "Invalid email or password." });

        // Ensure user has a linked PatientCode
        if (string.IsNullOrWhiteSpace(user.PatientCode))
        {
            var existingPatient = await _db.Patients.FirstOrDefaultAsync(p => p.Email.ToLower() == user.Email.ToLower());
            if (existingPatient != null)
            {
                user.PatientCode = existingPatient.PatientCode;
                if (!user.Age.HasValue && existingPatient.DateOfBirth != default)
                {
                    user.Age = (int)((DateTime.UtcNow - existingPatient.DateOfBirth).TotalDays / 365.2425);
                }
                if (string.IsNullOrWhiteSpace(user.PhoneNumber))
                {
                    user.PhoneNumber = existingPatient.ContactPhone;
                }
            }
            else
            {
                var count = await _db.Patients.CountAsync();
                var patientCode = $"PAT-{1000 + count + 1}";
                while (await _db.Patients.AnyAsync(p => p.PatientCode == patientCode))
                {
                    count++;
                    patientCode = $"PAT-{1000 + count + 1}";
                }
                var newPatient = new Patient
                {
                    PatientCode = patientCode,
                    FullName = user.Name,
                    Email = user.Email,
                    ContactPhone = user.PhoneNumber ?? "",
                    DateOfBirth = user.Age.HasValue ? DateTime.UtcNow.AddYears(-user.Age.Value).Date : new DateTime(2000, 1, 1, 0, 0, 0, DateTimeKind.Utc),
                    Gender = "Other",
                    BloodGroup = "Unknown",
                    Address = "",
                    EmergencyContactName = "",
                    EmergencyContactPhone = "",
                    Allergies = "",
                    ChronicConditions = "",
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                _db.Patients.Add(newPatient);
                user.PatientCode = patientCode;
            }
            await _db.SaveChangesAsync();
        }

        _logger.LogInformation("[Auth] Login: {Email} (PatientCode: {PatientCode})", user.Email, user.PatientCode);
        return Ok(BuildAuthResponse(user));
    }

    // ─── Google Sign-In ───────────────────────────────────────────────────────
    [HttpPost("google")]
    public async Task<IActionResult> GoogleSignIn([FromBody] GoogleAuthRequestDto dto)
    {
        try
        {
            var googleClientId = _config["Google:ClientId"];

            // Verify the Google ID token
            var payload = await GoogleJsonWebSignature.ValidateAsync(dto.IdToken, new GoogleJsonWebSignature.ValidationSettings
            {
                Audience = new[] { googleClientId }
            });

            // Find existing user or create new one
            var user = await _db.AppUsers.FirstOrDefaultAsync(u => u.Email == payload.Email.ToLower());

            if (user == null)
            {
                user = new AppUser
                {
                    Name = payload.Name,
                    Email = payload.Email.ToLower(),
                    GoogleId = payload.Subject,
                    ProfilePicture = payload.Picture,
                    Role = "Patient",
                    PasswordHash = "" // Google users don't have a password
                };
                _db.AppUsers.Add(user);
                await _db.SaveChangesAsync();
                _logger.LogInformation("[Auth] New Google user registered: {Email}", user.Email);
            }
            else
            {
                // Update profile picture if changed
                user.GoogleId = payload.Subject;
                user.ProfilePicture = payload.Picture;
                await _db.SaveChangesAsync();
            }

            return Ok(BuildAuthResponse(user));
        }
        catch (InvalidJwtException ex)
        {
            _logger.LogWarning("[Auth] Invalid Google token: {Message}", ex.Message);
            return Unauthorized(new { message = "Invalid Google token." });
        }
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private AuthResponseDto BuildAuthResponse(AppUser user)
    {
        var token = GenerateJwtToken(user);
        return new AuthResponseDto(
            token,
            user.Id.ToString(),
            user.Name,
            user.Email,
            user.Role,
            user.ProfilePicture,
            user.PatientCode,
            user.Age,
            user.PhoneNumber
        );
    }

    private string GenerateJwtToken(AppUser user)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:Secret"]!));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim(ClaimTypes.Name, user.Name),
            new Claim(ClaimTypes.Role, user.Role),
            new Claim("patientCode", user.PatientCode ?? ""),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        var token = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"],
            audience: _config["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddDays(30),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private static string HashPassword(string password)
    {
        using var sha = SHA256.Create();
        var bytes = sha.ComputeHash(Encoding.UTF8.GetBytes(password + "LabSalt2024"));
        return Convert.ToBase64String(bytes);
    }

    private static bool VerifyPassword(string password, string hash)
        => HashPassword(password) == hash;
}
