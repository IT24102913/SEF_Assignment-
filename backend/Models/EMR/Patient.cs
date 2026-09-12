using System.Text.Json.Serialization;

namespace LabManagement.API.Models.EMR;

public class Patient
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string PatientCode { get; set; } = string.Empty; // e.g. PAT-1001
    public string FullName { get; set; } = string.Empty;
    public DateTime DateOfBirth { get; set; }
    public string Gender { get; set; } = "Other"; // Male, Female, Other
    public string BloodGroup { get; set; } = "Unknown"; // A+, B+, O+, AB+, etc.
    public string ContactPhone { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public string EmergencyContactName { get; set; } = string.Empty;
    public string EmergencyContactPhone { get; set; } = string.Empty;
    public string Allergies { get; set; } = string.Empty; // Comma-separated or JSON list
    public string ChronicConditions { get; set; } = string.Empty; // e.g. Hypertension, Type 2 Diabetes
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    [JsonIgnore]
    public ICollection<ConsultationNote> ConsultationNotes { get; set; } = new List<ConsultationNote>();
    
    [JsonIgnore]
    public ICollection<LabReport> LabReports { get; set; } = new List<LabReport>();
    
    [JsonIgnore]
    public ICollection<Prescription> Prescriptions { get; set; } = new List<Prescription>();

    [JsonIgnore]
    public ICollection<ChannelingAppointment> ChannelingAppointments { get; set; } = new List<ChannelingAppointment>();
}
