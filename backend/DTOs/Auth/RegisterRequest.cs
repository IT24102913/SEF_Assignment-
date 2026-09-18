using System.ComponentModel.DataAnnotations;

namespace HealthBridge.Api.DTOs.Auth;

public class RegisterRequest
{
    [Required(ErrorMessage = "Full Name is required.")]
    [StringLength(100, MinimumLength = 2, ErrorMessage = "Full Name must be between 2 and 100 characters.")]
    public string FullName { get; set; } = string.Empty;

    [Required(ErrorMessage = "Email address is required.")]
    [EmailAddress(ErrorMessage = "Invalid email address format.")]
    public string Email { get; set; } = string.Empty;

    [Required(ErrorMessage = "Phone number is required.")]
    [RegularExpression(@"^\d{10}$", ErrorMessage = "Phone number must be exactly 10 digits.")]
    public string PhoneNumber { get; set; } = string.Empty;

    [Required(ErrorMessage = "NIC number is required.")]
    [RegularExpression(@"^(\d{9}[VvXx]|\d{12})$", ErrorMessage = "NIC must be a valid Sri Lankan NIC (9 digits + V/X or 12 digits).")]
    public string NicNumber { get; set; } = string.Empty;

    [Required(ErrorMessage = "Gender is required.")]
    [RegularExpression(@"^(Male|Female|Prefer not to say)$", ErrorMessage = "Gender must be Male, Female, or Prefer not to say.")]
    public string Gender { get; set; } = string.Empty;

    [Required(ErrorMessage = "Password is required.")]
    [MinLength(6, ErrorMessage = "Password must be at least 6 characters.")]
    public string Password { get; set; } = string.Empty;
}
