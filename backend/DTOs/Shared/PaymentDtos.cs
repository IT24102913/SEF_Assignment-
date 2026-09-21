using System.ComponentModel.DataAnnotations;

namespace HealthBridge.Api.DTOs.Shared;

public class OnlineCheckoutRequest
{
    [Required]
    public string Module { get; set; } = "Laboratory"; // "Laboratory", "Pharmacy", "DoctorAppointment", "HospitalBilling"

    [Required]
    public string ReferenceId { get; set; } = string.Empty; // e.g. LabBooking Id

    [Required]
    public decimal Amount { get; set; }

    [Required]
    public string CardHolderName { get; set; } = string.Empty;

    [Required]
    public string CardNumber { get; set; } = string.Empty;

    [Required]
    public string ExpiryDate { get; set; } = string.Empty;

    [Required]
    public string Cvv { get; set; } = string.Empty;
}

public class CounterPaymentRequest
{
    [Required]
    public string Module { get; set; } = "Laboratory";

    [Required]
    public string ReferenceId { get; set; } = string.Empty;

    [Required]
    public decimal Amount { get; set; }

    [Required]
    public string PaymentMethod { get; set; } = "Cash"; // "Cash", "POSCard"

    public string? StaffId { get; set; }

    public string? Notes { get; set; }
}

public class SelectCounterPaymentIntentRequest
{
    [Required]
    public string ReferenceId { get; set; } = string.Empty;
}

public class PaymentReceiptResponse
{
    public Guid PaymentId { get; set; }
    public string ReceiptNumber { get; set; } = string.Empty;
    public string Module { get; set; } = string.Empty;
    public string ReferenceId { get; set; } = string.Empty;
    public string PatientName { get; set; } = string.Empty;
    public string PatientEmail { get; set; } = string.Empty;
    public string ItemName { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "LKR";
    public string PaymentStatus { get; set; } = string.Empty;
    public string PaymentMethod { get; set; } = string.Empty;
    public string? TransactionReference { get; set; }
    public DateTime PaidAt { get; set; }
    public string HospitalName { get; set; } = "Health Bridge Pvt (Ltd) Hospitals";
    public string HospitalAddress { get; set; } = "No 120, Clinical Way, Colombo 05, Sri Lanka";
}
