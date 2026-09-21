using System.ComponentModel.DataAnnotations;

namespace HealthBridge.Api.Models;

public enum PaymentStatus
{
    Unpaid,
    PaidOnline,
    PaidAtCounter,
    Refunded
}

public enum PaymentModule
{
    Laboratory,
    Pharmacy,
    DoctorAppointment,
    HospitalBilling
}

public static class PaymentMethodTypes
{
    public const string OnlineCard = "OnlineCard";
    public const string Cash = "Cash";
    public const string POSCard = "POSCard";
    public const string CashOnArrival = "CashOnArrival";
}

public class Payment
{
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    public PaymentModule Module { get; set; } = PaymentModule.Laboratory;

    [Required]
    public string ReferenceId { get; set; } = string.Empty;

    public int PatientId { get; set; }
    public string PatientName { get; set; } = string.Empty;
    public string PatientEmail { get; set; } = string.Empty;

    public decimal Amount { get; set; }
    public string Currency { get; set; } = "LKR";

    public PaymentStatus Status { get; set; } = PaymentStatus.Unpaid;
    public string PaymentMethod { get; set; } = string.Empty;

    public string? TransactionReference { get; set; }
    public string? ReceiptNumber { get; set; }
    public string? CollectedByStaffId { get; set; }
    public string? Notes { get; set; }

    public DateTime? PaidAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
