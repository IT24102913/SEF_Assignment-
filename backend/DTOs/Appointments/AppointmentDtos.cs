namespace HealthBridge.Api.DTOs.Appointments;

public class DoctorDto
{
    public int Id { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Specialization { get; set; } = string.Empty;
    public string Qualifications { get; set; } = string.Empty;
    public string Hospital { get; set; } = string.Empty;
    public string HospitalBranch { get; set; } = string.Empty;
    public string RoomNumber { get; set; } = string.Empty;
    public decimal ConsultationFee { get; set; }
    public string AvailableDays { get; set; } = string.Empty;
    public string AvailableTime { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    public string PhoneNumber { get; set; } = string.Empty;
    public double Rating { get; set; }
    public int ReviewCount { get; set; }
    public int ExperienceYears { get; set; }
    public bool IsVerifiedConsultant { get; set; }
    public string Bio { get; set; } = string.Empty;
    public string? Email { get; set; }
    public bool IsAvailable { get; set; }
    public bool AvailableToday { get; set; }
    public bool AvailableTomorrow { get; set; }
    public int SlotsLeft { get; set; }
}

public class SpecialtyCountDto
{
    public string Name { get; set; } = string.Empty;
    public int ConsultantCount { get; set; }
    public string IconName { get; set; } = string.Empty;
}

public class DoctorSessionDto
{
    public int Id { get; set; }
    public int DoctorId { get; set; }
    public string DoctorName { get; set; } = string.Empty;
    public string SessionDate { get; set; } = string.Empty; // YYYY-MM-DD
    public string SessionTime { get; set; } = string.Empty; // HH:mm
    public string TimeFormatted { get; set; } = string.Empty; // 08:00 AM
    public int MaxCapacity { get; set; }
    public int CurrentBookings { get; set; }
    public bool IsAvailable { get; set; }
    public int SlotsLeft { get; set; }
}

public class BookAppointmentRequest
{
    public int DoctorId { get; set; }
    public int DoctorSessionId { get; set; }
    public string PatientName { get; set; } = string.Empty;
    public string PatientPhone { get; set; } = string.Empty;
    public string PatientEmail { get; set; } = string.Empty;
    public string PatientNic { get; set; } = string.Empty;
    public string? PatientAddress { get; set; }
    public string? Notes { get; set; }
}

public class PaymentRequest
{
    public string PaymentMethod { get; set; } = "CreditCard"; // CreditCard, MobileWallet, BankTransfer
    public string? CardMaskedReference { get; set; } // e.g. **** **** **** 3456
    public string? BankReference { get; set; }
}

public class RescheduleAppointmentRequest
{
    public int NewSessionId { get; set; }
}

public class StatusUpdateDto
{
    public string Status { get; set; } = string.Empty;
    public string? Notes { get; set; }
}

public class AppointmentDto
{
    public int Id { get; set; }
    public string AppointmentNumber { get; set; } = string.Empty;
    public int DoctorId { get; set; }
    public string DoctorName { get; set; } = string.Empty;
    public string Specialization { get; set; } = string.Empty;
    public string Hospital { get; set; } = string.Empty;
    public string HospitalBranch { get; set; } = string.Empty;
    public int? PatientId { get; set; }
    public string PatientName { get; set; } = string.Empty;
    public string PatientPhone { get; set; } = string.Empty;
    public string PatientEmail { get; set; } = string.Empty;
    public string PatientNic { get; set; } = string.Empty;
    public string? PatientAddress { get; set; }
    public string AppointmentDate { get; set; } = string.Empty;
    public string TimeSlot { get; set; } = string.Empty;
    public int? DoctorSessionId { get; set; }
    public int QueueNumber { get; set; }
    public decimal ConsultationFee { get; set; }
    public decimal ServiceCharge { get; set; }
    public decimal TotalAmount { get; set; }
    public string Status { get; set; } = string.Empty;
    public string PaymentMethod { get; set; } = string.Empty;
    public string PaymentStatus { get; set; } = string.Empty;
    public string? PaymentReference { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
    public string QrCodeText { get; set; } = string.Empty;
}

public class DoctorStatsDto
{
    public int TotalAppointments { get; set; }
    public int TodayQueueCount { get; set; }
    public int ConfirmedCount { get; set; }
    public int InProgressCount { get; set; }
    public int CompletedCount { get; set; }
    public decimal TotalRevenue { get; set; }
}

public class AIRecommendationRequest
{
    public string Symptoms { get; set; } = string.Empty;
}

public class SpecialtyRecommendation
{
    public string Specialty { get; set; } = string.Empty;
    public double MatchScore { get; set; }
    public string Reasoning { get; set; } = string.Empty;
    public int AvailableConsultants { get; set; }
}

public class AIRecommendationResponse
{
    public string AnalyzedSymptoms { get; set; } = string.Empty;
    public List<SpecialtyRecommendation> Recommendations { get; set; } = new();
    public string ClinicalNotes { get; set; } = string.Empty;
}
