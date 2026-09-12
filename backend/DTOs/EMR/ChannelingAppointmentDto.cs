namespace LabManagement.API.DTOs.EMR;

public class ChannelingAppointmentDto
{
    public Guid Id { get; set; }
    public string AppointmentCode { get; set; } = string.Empty;
    public string PatientCode { get; set; } = string.Empty;
    public string DoctorName { get; set; } = string.Empty;
    public string Specialty { get; set; } = string.Empty;
    public DateTime AppointmentDate { get; set; }
    public string FormattedDate => AppointmentDate.ToString("MMM dd, yyyy");
    public string FormattedTime => AppointmentDate.ToString("hh:mm tt");
    public string Room { get; set; } = string.Empty;
    public string Status { get; set; } = "Upcoming";
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
