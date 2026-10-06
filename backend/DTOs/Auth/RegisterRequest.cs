using System.ComponentModel.DataAnnotations;

namespace HealthBridge.Api.DTOs.Auth;

public class RegisterRequest
{
    [Required(ErrorMessage = "Full Name is required.")]
    [StringLength(100, MinimumLength = 2, ErrorMessage = "Full Name must be between 2 and 100 characters.")]
    public string FullName { get; set; } = string.Empty;

    [Required(ErrorMessage = "Email address is required.")]
    [EmailAddress(ErrorMessage = "Invalid email address format.")]
    [RegularExpression(@"^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$", ErrorMessage = "Please enter a valid email address with a valid domain (e.g. name@domain.com).")]
    public string Email { get; set; } = string.Empty;

    [Required(ErrorMessage = "Phone number is required.")]
    [RegularExpression(@"^(?:\+94|0)?[\s\-]*7(?:[\s\-]*[0-9]){8}$", ErrorMessage = "Please enter a valid Sri Lankan phone number, e.g., +94771234567 or 0771234567.")]
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
