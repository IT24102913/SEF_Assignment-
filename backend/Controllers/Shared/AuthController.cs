using HealthBridge.Api.Data;
using HealthBridge.Api.DTOs;
using HealthBridge.Api.DTOs.Auth;
using HealthBridge.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HealthBridge.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[IgnoreAntiforgeryToken] // <--- THIS STOPS THE ANTIFORGERY ERROR
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    /// <summary>
    /// Registers a new Patient account. (Public endpoint)
    /// </summary>
    [HttpPost("register")]
    [ProducesResponseType(typeof(UserResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<UserResponse>> Register([FromBody] RegisterRequest request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        try
        {
            var user = await _authService.RegisterPatientAsync(request);
            return CreatedAtAction(nameof(Register), new { id = user.Id }, user);
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Authenticates a user and returns a JWT Bearer token.
    /// </summary>
    [HttpPost("login")]
    [ProducesResponseType(typeof(LoginResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<LoginResponse>> Login([FromBody] LoginRequest request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        try
        {
            var response = await _authService.LoginAsync(request);
            return Ok(response);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
    /// <summary>
    /// Authenticates or auto-registers a user using a Google ID token.
    /// </summary>
    [HttpPost("google")]
    [ProducesResponseType(typeof(LoginResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<LoginResponse>> GoogleLogin([FromBody] GoogleLoginRequest request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        try
        {
            var response = await _authService.GoogleLoginAsync(request.IdToken);
            return Ok(response);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request, [FromServices] ApplicationDbContext context)
    {
        var user = await context.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == request.Email.Trim().ToLower());
        if (user == null) return NotFound(new { message = "User account not found." });

        if (!BCrypt.Net.BCrypt.Verify(request.CurrentPassword, user.PasswordHash))
        {
            return BadRequest(new { message = "Current password does not match." });
        }

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
        await context.SaveChangesAsync();
        return Ok(new { message = "Password updated successfully." });
    }

    /// <summary>
    /// Verifies email address via security token.
    /// </summary>
    [HttpPost("verify-email")]
    public async Task<IActionResult> VerifyEmail([FromBody] VerifyEmailRequest request)
    {
        if (string.IsNullOrWhiteSpace(request?.Token))
        {
            return BadRequest(new { message = "Verification token is required." });
        }

        try
        {
            var verified = await _authService.VerifyEmailAsync(request.Token);
            if (!verified)
            {
                return BadRequest(new { message = "Invalid or expired verification token." });
            }
            return Ok(new { message = "Email verified successfully! You can now sign in to your account." });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// GET version for verification link clicks.
    /// </summary>
    [HttpGet("verify-email")]
    public async Task<IActionResult> VerifyEmailGet([FromQuery] string token)
    {
        if (string.IsNullOrWhiteSpace(token))
        {
            return BadRequest(new { message = "Verification token is required." });
        }

        try
        {
            var verified = await _authService.VerifyEmailAsync(token);
            if (!verified)
            {
                return BadRequest(new { message = "Invalid or expired verification token." });
            }
            return Ok(new { message = "Email verified successfully! You can now sign in to your account." });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Resends verification email to unverified user account.
    /// </summary>
    [HttpPost("resend-verification")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> ResendVerification([FromBody] ResendVerificationRequest request, [FromServices] ApplicationDbContext context)
    {
        if (string.IsNullOrWhiteSpace(request?.Email))
        {
            return BadRequest(new { message = "Email address is required." });
        }

        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        var user = await context.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == normalizedEmail);
        if (user == null)
        {
            return NotFound(new { message = "No account found matching this email address." });
        }

        if (user.IsEmailVerified)
        {
            return Ok(new { message = "Email address is already verified." });
        }

        try
        {
            var sent = await _authService.ResendVerificationEmailAsync(normalizedEmail);
            if (!sent)
            {
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Email delivery failed. Please verify server SMTP configuration." });
            }

            return Ok(new { message = "Verification link has been sent to your email address." });
        }
        catch (Exception)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Email delivery failed. Please verify server SMTP configuration." });
        }
    }
}

public class ChangePasswordRequest
{
    public string Email { get; set; } = string.Empty;
    public string CurrentPassword { get; set; } = string.Empty;
    public string NewPassword { get; set; } = string.Empty;
}

public class VerifyEmailRequest
{
    public string Token { get; set; } = string.Empty;
}

public class ResendVerificationRequest
{
    public string Email { get; set; } = string.Empty;
}