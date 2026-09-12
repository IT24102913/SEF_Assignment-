namespace LabManagement.API.Models;

public class AppUser
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty; // Empty for Google users
    public string Role { get; set; } = "Patient"; // "Patient" or "Staff"
    public string? PhoneNumber { get; set; }
    public int? Age { get; set; }
    public string? PatientCode { get; set; }
    public string? GoogleId { get; set; }
    public string? ProfilePicture { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
