using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;
using HealthBridge.Api.Models.Appointments;

namespace HealthBridge.Api.Models;

public class DoctorAppointment
{
    public int Id { get; set; }

    [Required]
    [MaxLength(50)]
    public string AppointmentNumber { get; set; } = string.Empty;

    [Required]
    public int DoctorId { get; set; }

    public Doctor? Doctor { get; set; }

    [Required]
    [MaxLength(150)]
    public string DoctorName { get; set; } = string.Empty;

    [MaxLength(100)]
    public string Specialization { get; set; } = string.Empty;

    public int? PatientId { get; set; }

    [Required]
    [MaxLength(150)]
    public string PatientName { get; set; } = string.Empty;

    [Required]
    [MaxLength(30)]
    public string PatientPhone { get; set; } = string.Empty;

    [MaxLength(150)]
    public string PatientEmail { get; set; } = string.Empty;

    [MaxLength(50)]
    public string PatientNic { get; set; } = string.Empty;

    [MaxLength(250)]
    public string? PatientAddress { get; set; }

    public DateTime AppointmentDate { get; set; }

    [MaxLength(50)]
    public string TimeSlot { get; set; } = "08:00 AM";

    public int? DoctorSessionId { get; set; }

    public DoctorSession? DoctorSession { get; set; }

    public int QueueNumber { get; set; } = 1;

    [Column(TypeName = "decimal(18,2)")]
    public decimal ConsultationFee { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal ServiceCharge { get; set; } = 300.00m;

    [Column(TypeName = "decimal(18,2)")]
    public decimal TotalAmount { get; set; }

    public AppointmentStatus Status { get; set; } = AppointmentStatus.PendingPayment;

    [MaxLength(50)]
    public string PaymentMethod { get; set; } = "CreditCard"; // CreditCard, MobileWallet, BankTransfer

    [MaxLength(50)]
    public string PaymentStatus { get; set; } = "Pending"; // Pending, Paid, Failed

    [MaxLength(100)]
    public string? PaymentReference { get; set; } // Masked card e.g. **** 3456 or Bank slip ref

    public string? Notes { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
