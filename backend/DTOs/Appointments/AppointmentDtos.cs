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
    public string RoomNumber { get; set; } = "Suite 201";
    public string HospitalBranch { get; set; } = "Health Bridge Colombo";
    public string SessionDate { get; set; } = string.Empty; // YYYY-MM-DD
    public string SessionTime { get; set; } = string.Empty; // HH:mm
    public string TimeFormatted { get; set; } = string.Empty; // 08:30 AM
    public string SessionType { get; set; } = "Morning"; // Morning | Evening | Night
    public string TimeRange { get; set; } = "08:30 AM – 12:00 PM";
    public int MaxCapacity { get; set; }
    public int CurrentBookings { get; set; }
    public bool IsAvailable { get; set; }
    public bool IsExpired { get; set; }
    public int SlotsLeft { get; set; }
    public string SessionStatus { get; set; } = "Scheduled";
    public DateTime? ActualStartTime { get; set; }
    public DateTime? ExpectedStartTime { get; set; }
    public int? CurrentlyServingQueueNumber { get; set; }
    public string? DelayReason { get; set; }
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
    public string BookingType { get; set; } = "OnlinePayment"; // Reservation, OnlinePayment
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

public class ForceStatusDto
{
    public string Status { get; set; } = string.Empty;
    public string Reason { get; set; } = string.Empty;
}

public class CheckInRequest
{
    public string? QrToken { get; set; }
}

public class AppointmentSearchResultDto
{
    public int Id { get; set; }
    public string AppointmentNumber { get; set; } = string.Empty;
    public string PatientName { get; set; } = string.Empty;
    public string MaskedNic { get; set; } = string.Empty;
    public string DoctorName { get; set; } = string.Empty;
    public string Specialization { get; set; } = string.Empty;
    public string AppointmentDate { get; set; } = string.Empty;
    public string TimeSlot { get; set; } = string.Empty;
    public int QueueNumber { get; set; }
    public string Status { get; set; } = string.Empty;
}

public class DelaySessionRequest
{
    public string? ExpectedStartTime { get; set; }
    public string? Reason { get; set; }
}

public class CancelSessionRequest
{
    public string? Reason { get; set; }
}

public class DoctorSessionQueueDto
{
    public int SessionId { get; set; }
    public int DoctorId { get; set; }
    public string DoctorName { get; set; } = string.Empty;
    public string Specialization { get; set; } = string.Empty;
    public string RoomNumber { get; set; } = "Suite 201";
    public string HospitalBranch { get; set; } = "Health Bridge Colombo";
    public string SessionStatus { get; set; } = "Scheduled";
    public string SessionDate { get; set; } = string.Empty;
    public string SessionTime { get; set; } = string.Empty;
    public DateTime? ExpectedStartTime { get; set; }
    public DateTime? ActualStartTime { get; set; }
    public int? CurrentlyServingQueueNumber { get; set; }
    public string? DelayReason { get; set; }
    public List<AppointmentDto> Queue { get; set; } = new();
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
    public string BookingType { get; set; } = "OnlinePayment";
    public Guid QrToken { get; set; }
    public DateTime? CheckedInAt { get; set; }
    public int? CheckedInByUserId { get; set; }
    public string ArrivalStatus { get; set; } = "NotArrived";
    public string QueueStatus { get; set; } = "NotCheckedIn";
    public DateTime? CalledAt { get; set; }
    public string PaymentMethod { get; set; } = string.Empty;
    public string PaymentStatus { get; set; } = string.Empty;
    public string? PaymentReference { get; set; }
    public string? Notes { get; set; }
    public string? StatusChangeReason { get; set; }
    public DateTime CreatedAt { get; set; }
    public string QrCodeText { get; set; } = string.Empty;
    public string QueueLabel { get; set; } = string.Empty; // e.g. M-01, E-07, N-03
    public string SessionType { get; set; } = "Morning";
    public string? EstimatedConsultationTime { get; set; } // e.g. "~5:13 PM"
    public string? RecommendedArrivalTime { get; set; } // e.g. "4:53 PM"
    public int? CurrentlyServingQueueNumber { get; set; }
    public string? CurrentlyServingLabel { get; set; } // e.g. "E-04" or "First patient"
    public string? SessionStatus { get; set; } // "Scheduled", "Active", "Delayed", etc.
    public DateTime? ExpectedStartTime { get; set; }
    public string? DelayReason { get; set; }
    public string? RoomNumber { get; set; }
    public bool IsToday { get; set; }
    public string? DisplaySummary { get; set; }
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

public class DoctorScheduleDto
{
    public int Id { get; set; }
    public int DoctorId { get; set; }
    public DayOfWeek DayOfWeek { get; set; }
    public string DayName { get; set; } = string.Empty;
    public string StartTime { get; set; } = string.Empty;
    public string EndTime { get; set; } = string.Empty;
    public int SlotDurationMinutes { get; set; } = 60;
    public int MaxPatientsPerSlot { get; set; } = 3;
    public bool IsActive { get; set; } = true;
}
