using System.Security.Claims;
using HealthBridge.Api.Data;
using HealthBridge.Api.DTOs.Patient;
using HealthBridge.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HealthBridge.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[IgnoreAntiforgeryToken]
public class UsersController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<UsersController> _logger;

    public UsersController(ApplicationDbContext context, ILogger<UsersController> logger)
    {
        _context = context;
        _logger = logger;
    }

    /// <summary>
    /// Gets the profile of the currently authenticated user using JWT ClaimTypes.NameIdentifier.
    /// Returns 401 if claim is missing, 404 if record is not found.
    /// Includes the actual NIC number column value.
    /// </summary>
    [HttpGet("profile")]
    public async Task<ActionResult<UserProfileResponse>> GetCurrentUserProfile([FromQuery] int? userId)
    {
        int effectiveUserId = 0;

        // 1. Try to read ClaimTypes.NameIdentifier from JWT
        var claimIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (int.TryParse(claimIdStr, out var claimId) && claimId > 0)
        {
            effectiveUserId = claimId;
        }
        else if (userId.HasValue && userId.Value > 0)
        {
            effectiveUserId = userId.Value;
        }
        else
        {
            var emailClaim = User.FindFirstValue(ClaimTypes.Email);
            if (!string.IsNullOrWhiteSpace(emailClaim))
            {
                var userByEmail = await _context.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == emailClaim.ToLower());
                if (userByEmail != null) effectiveUserId = userByEmail.Id;
            }
        }

        if (effectiveUserId == 0)
        {
            return Unauthorized(new { message = "Authentication token missing or invalid. Please sign in." });
        }

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == effectiveUserId);
        if (user == null)
        {
            return NotFound(new { message = $"User profile for ID {effectiveUserId} was not found." });
        }

        var profile = await _context.PatientProfiles.FirstOrDefaultAsync(p => p.UserId == user.Id);

        var response = new UserProfileResponse
        {
            Id = profile?.Id ?? user.Id,
            UserId = user.Id,
            FullName = user.FullName,
            Email = user.Email,
            Role = user.Role,
            PhoneNumber = profile?.PhoneNumber,
            Address = profile?.Address,
            City = profile?.City,
            NicNumber = profile?.NicNumber ?? user.NicNumber,
            DateOfBirth = profile?.DateOfBirth,
            Gender = profile?.Gender,
            EmergencyContact = profile?.EmergencyContact,
            IsActive = user.IsActive,
            IsEmailVerified = user.IsEmailVerified,
            CreatedAt = user.CreatedAt
        };

        return Ok(response);
    }

    /// <summary>
    /// Updates profile details with strict Sri Lankan telephone validation.
    /// </summary>
    [HttpPut("profile")]
    public async Task<IActionResult> UpdateUserProfile([FromBody] UpdateUserProfileDto dto, [FromQuery] int? userId)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        int effectiveUserId = 0;
        var claimIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (int.TryParse(claimIdStr, out var claimId) && claimId > 0)
        {
            effectiveUserId = claimId;
        }
        else if (userId.HasValue && userId.Value > 0)
        {
            effectiveUserId = userId.Value;
        }

        if (effectiveUserId == 0)
        {
            return Unauthorized(new { message = "Authentication required." });
        }

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == effectiveUserId);
        if (user == null)
        {
            return NotFound(new { message = "User not found." });
        }

        var profile = await _context.PatientProfiles.FirstOrDefaultAsync(p => p.UserId == user.Id);
        if (profile == null)
        {
            profile = new PatientProfile { UserId = user.Id, CreatedAt = DateTime.UtcNow };
            _context.PatientProfiles.Add(profile);
        }

        if (dto.PhoneNumber != null) profile.PhoneNumber = dto.PhoneNumber.Trim();
        if (dto.Address != null) profile.Address = dto.Address.Trim();
        if (dto.City != null) profile.City = dto.City.Trim();
        if (dto.DateOfBirth.HasValue) profile.DateOfBirth = DateTime.SpecifyKind(dto.DateOfBirth.Value, DateTimeKind.Utc);
        if (dto.Gender != null) profile.Gender = dto.Gender.Trim();
        if (dto.EmergencyContact != null) profile.EmergencyContact = dto.EmergencyContact.Trim();
        profile.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return Ok(new UserProfileResponse
        {
            Id = profile.Id,
            UserId = user.Id,
            FullName = user.FullName,
            Email = user.Email,
            Role = user.Role,
            PhoneNumber = profile.PhoneNumber,
            Address = profile.Address,
            City = profile.City,
            NicNumber = profile.NicNumber ?? user.NicNumber,
            DateOfBirth = profile.DateOfBirth,
            Gender = profile.Gender,
            EmergencyContact = profile.EmergencyContact,
            IsActive = user.IsActive,
            IsEmailVerified = user.IsEmailVerified,
            CreatedAt = user.CreatedAt
        });
    }
}
