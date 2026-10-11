using System.ComponentModel.DataAnnotations;

namespace HealthBridge.Api.DTOs.Patient;

public class PatientResponse
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? PhoneNumber { get; set; }
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? NicNumber { get; set; }
    public DateTime? DateOfBirth { get; set; }
    public string? Gender { get; set; }
    public string? EmergencyContact { get; set; }
    public bool IsActive { get; set; }
    public bool IsEmailVerified { get; set; }
    public DateTime RegisteredAt { get; set; }
    public int TotalPrescriptions { get; set; }
    public int TotalOrders { get; set; }
}

public class UpdatePatientProfileRequest
{
    [RegularExpression(@"^(?:\+94|0)?[\s\-]*7(?:[\s\-]*[0-9]){8}$", ErrorMessage = "Please enter a valid Sri Lankan phone number, e.g., +94771234567 or 0771234567.")]
    public string? PhoneNumber { get; set; }
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? NicNumber { get; set; }
    public DateTime? DateOfBirth { get; set; }
    public string? Gender { get; set; }
    public string? EmergencyContact { get; set; }
}

public class UpdateUserProfileDto
{
    [RegularExpression(@"^(?:\+94|0)?[\s\-]*7(?:[\s\-]*[0-9]){8}$", ErrorMessage = "Please enter a valid Sri Lankan phone number, e.g., +94771234567 or 0771234567.")]
    public string? PhoneNumber { get; set; }
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? NicNumber { get; set; }
    public DateTime? DateOfBirth { get; set; }
    public string? Gender { get; set; }
    public string? BloodGroup { get; set; }
    public string? EmergencyContact { get; set; }
    public string? EmergencyContactName { get; set; }
    public string? EmergencyContactPhone { get; set; }
    public string? Allergies { get; set; }
}

public class UserProfileResponse
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public string PatientCode { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string? PhoneNumber { get; set; }
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? NicNumber { get; set; }
    public DateTime? DateOfBirth { get; set; }
    public string? Gender { get; set; }
    public string? BloodGroup { get; set; }
    public string? EmergencyContact { get; set; }
    public string? EmergencyContactName { get; set; }
    public string? EmergencyContactPhone { get; set; }
    public string? Allergies { get; set; }
    public bool IsActive { get; set; }
    public bool IsEmailVerified { get; set; }
    public DateTime CreatedAt { get; set; }
}
