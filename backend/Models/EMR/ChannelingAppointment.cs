namespace LabManagement.API.Models.EMR;

public class ChannelingAppointment
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string AppointmentCode { get; set; } = string.Empty; // e.g. APT-3011
    public Guid PatientId { get; set; }
    public string PatientCode { get; set; } = string.Empty;
    public string DoctorName { get; set; } = string.Empty;
    public string Specialty { get; set; } = string.Empty;
    public DateTime AppointmentDate { get; set; }
    public string Room { get; set; } = string.Empty;
    public string Status { get; set; } = "Upcoming"; // Upcoming, Completed, Cancelled
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation property
    public Patient? Patient { get; set; }
}
