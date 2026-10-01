namespace HealthBridge.Api.DTOs.EMR;

public class ChannelingAppointmentDto
{
    public Guid Id { get; set; }
    public string AppointmentCode { get; set; } = string.Empty;
    public string PatientCode { get; set; } = string.Empty;
    public string DoctorName { get; set; } = string.Empty;
    public string Specialty { get; set; } = string.Empty;
    public DateTime AppointmentDate { get; set; }
    public string FormattedDate => AppointmentDate.ToString("MMM dd, yyyy");
    public string FormattedTime => !string.IsNullOrEmpty(TimeSlot) ? TimeSlot : AppointmentDate.ToString("hh:mm tt");
    public string Room { get; set; } = string.Empty;
    public string Status { get; set; } = "Upcoming";
    public int? QueueNumber { get; set; }
    public string? TimeSlot { get; set; }
    public decimal? TotalAmount { get; set; }
    public string? PaymentStatus { get; set; }
    public string? HospitalBranch { get; set; } = "Health Bridge Hospital";
}

public class CreateChannelingAppointmentDto
{
    public string PatientCode { get; set; } = string.Empty;
    public string DoctorName { get; set; } = string.Empty;
    public string Specialty { get; set; } = string.Empty;
    public DateTime AppointmentDate { get; set; }
    public string Room { get; set; } = string.Empty;
    public string Status { get; set; } = "Upcoming";
}
