namespace LabManagement.API.DTOs;

// ─── Request DTOs ────────────────────────────────────────────────────────────

public record RegisterRequestDto(string Name, string Email, string Password);

public record LoginRequestDto(string Email, string Password);

public record GoogleAuthRequestDto(string IdToken);

// ─── Response DTOs ────────────────────────────────────────────────────────────

public record AuthResponseDto(
    string Token,
    string UserId,
    string Name,
    string Email,
    string Role,
    string? ProfilePicture
);
