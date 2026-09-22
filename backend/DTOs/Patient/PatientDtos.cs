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
    public DateTime RegisteredAt { get; set; }
    public int TotalPrescriptions { get; set; }
    public int TotalOrders { get; set; }
}

public class UpdatePatientProfileRequest
{
    public string? PhoneNumber { get; set; }
    public string? Address { get; set; }
    public string? City { get; set; }
    public string? NicNumber { get; set; }
    public DateTime? DateOfBirth { get; set; }
    public string? Gender { get; set; }
    public string? EmergencyContact { get; set; }
}
