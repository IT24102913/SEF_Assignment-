using HealthBridge.Api.Data;
using HealthBridge.Api.DTOs.Shared;
using HealthBridge.Api.Models;
using HealthBridge.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HealthBridge.Api.Controllers;

[ApiController]
[Route("api/payments")]
public class PaymentsController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly IEmailService _emailService;
    private readonly ILogger<PaymentsController> _logger;

    public PaymentsController(ApplicationDbContext db, IEmailService emailService, ILogger<PaymentsController> logger)
    {
        _db = db;
        _emailService = emailService;
        _logger = logger;
    }

    // POST /api/payments/checkout — Process online card payment for any module
    [HttpPost("checkout")]
    public async Task<ActionResult<PaymentReceiptResponse>> OnlineCheckout([FromBody] OnlineCheckoutRequest dto)
    {
        if (dto.Amount <= 0)
        {
            return BadRequest(new { message = "Payment amount must be greater than zero." });
        }

        if (string.IsNullOrWhiteSpace(dto.CardNumber) || dto.CardNumber.Length < 12)
        {
            return BadRequest(new { message = "Invalid card details provided." });
        }

        var randomCode = Random.Shared.Next(100000, 999999);
        var receiptNum = $"RCPT-{dto.Module.ToUpper().Substring(0, 3)}-{randomCode}";
        var txnRef = $"TXN-CARD-{DateTime.UtcNow:yyyyMMddHHmmss}-{Random.Shared.Next(1000, 9999)}";

        // If Module is Laboratory, link and update LabBooking
        string patientName = "Patient";
        string patientEmail = "patient@medix.lk";
        int patientId = 1;
        string itemName = "Diagnostic Laboratory Investigation";

        if (dto.Module.Equals("Laboratory", StringComparison.OrdinalIgnoreCase))
        {
            if (!Guid.TryParse(dto.ReferenceId, out var bookingId))
            {
                return BadRequest(new { message = "Invalid Laboratory booking ID format." });
            }

            var booking = await _db.LabBookings.Include(b => b.LabTest).FirstOrDefaultAsync(b => b.Id == bookingId);
            if (booking == null)
            {
                return NotFound(new { message = "Laboratory booking not found." });
            }

            patientId = booking.PatientId;
            patientName = booking.PatientName;
            patientEmail = booking.PatientEmail;

            // Find all unpaid bookings for this patient, date & time slot created in the same booking batch to settle together
            var candidateBookings = await _db.LabBookings
                .Include(b => b.LabTest)
                .Where(b => (b.PatientId == booking.PatientId || b.PatientEmail == booking.PatientEmail)
                         && b.BookingDate == booking.BookingDate
                         && b.TimeSlot == booking.TimeSlot
                         && b.PaymentStatus == PaymentStatus.Unpaid
                         && b.Status != BookingStatus.Cancelled
                         && b.Status != BookingStatus.Rejected)
                .ToListAsync();

            var appointmentBookings = candidateBookings
                .Where(b => Math.Abs((b.CreatedAt - booking.CreatedAt).TotalSeconds) <= 90)
                .ToList();

            if (!appointmentBookings.Any(b => b.Id == booking.Id))
            {
                appointmentBookings.Add(booking);
            }

            var testNames = appointmentBookings
                .Select(b => b.LabTest?.Name)
                .Where(n => !string.IsNullOrWhiteSpace(n))
                .Distinct()
                .ToList();

            itemName = testNames.Count > 1
                ? $"{string.Join(" + ", testNames)} ({testNames.Count} Tests)"
                : (booking.LabTest?.Name ?? "Laboratory Test");

            foreach (var b in appointmentBookings)
            {
                b.PaymentStatus = PaymentStatus.PaidOnline;
                b.PaymentMethod = "OnlineCard";
                b.ReceiptNumber = receiptNum;
                b.AmountPaid = b.LabTest?.Price ?? 0;
                b.PaidAt = DateTime.UtcNow;
                if (b.Status == BookingStatus.PendingLabApproval)
                {
                    b.Status = BookingStatus.Confirmed;
                }
                b.UpdatedAt = DateTime.UtcNow;
            }
        }

        var payment = new Payment
        {
            Module = Enum.TryParse<PaymentModule>(dto.Module, true, out var parsedModule) ? parsedModule : PaymentModule.Laboratory,
            ReferenceId = dto.ReferenceId,
            PatientId = patientId,
            PatientName = patientName,
            PatientEmail = patientEmail,
            Amount = dto.Amount,
            Currency = "LKR",
            Status = PaymentStatus.PaidOnline,
            PaymentMethod = PaymentMethodTypes.OnlineCard,
            TransactionReference = txnRef,
            ReceiptNumber = receiptNum,
            PaidAt = DateTime.UtcNow,
            Notes = $"Card payment by {dto.CardHolderName} (ends with {dto.CardNumber.Substring(dto.CardNumber.Length - 4)})",
            CreatedAt = DateTime.UtcNow
        };

        _db.Payments.Add(payment);
        await _db.SaveChangesAsync();

        _logger.LogInformation("[Payment] Successfully processed online payment {Receipt} of LKR {Amount} for {Module} ref {Ref}",
            receiptNum, dto.Amount, dto.Module, dto.ReferenceId);

        // Send payment receipt notification email asynchronously
        try
        {
            await _emailService.SendStatusUpdateAsync(
                patientEmail,
                patientName,
                $"Payment Receipt #{receiptNum} — {itemName}",
                $"We have received your online payment of LKR {dto.Amount:N2} via Credit/Debit Card. Your official receipt number is {receiptNum}. Thank you for choosing Health Bridge Hospitals."
            );
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Could not send payment email to {Email}", patientEmail);
        }

        return Ok(new PaymentReceiptResponse
        {
            PaymentId = payment.Id,
            ReceiptNumber = receiptNum,
            Module = dto.Module,
            ReferenceId = dto.ReferenceId,
            PatientName = patientName,
            PatientEmail = patientEmail,
            ItemName = itemName,
            Amount = dto.Amount,
            Currency = "LKR",
            PaymentStatus = "PaidOnline",
            PaymentMethod = "Credit / Debit Card",
            TransactionReference = txnRef,
            PaidAt = payment.PaidAt ?? DateTime.UtcNow
        });
    }

    // POST /api/payments/counter — Mark payment collected at hospital reception / counter
    [HttpPost("counter")]
    public async Task<ActionResult<PaymentReceiptResponse>> CounterPayment([FromBody] CounterPaymentRequest dto)
    {
        if (dto.Amount <= 0)
        {
            return BadRequest(new { message = "Payment amount must be greater than zero." });
        }

        var randomCode = Random.Shared.Next(100000, 999999);
        var receiptNum = $"RCPT-CTR-{randomCode}";
        var txnRef = $"TXN-CTR-{DateTime.UtcNow:yyyyMMddHHmmss}-{Random.Shared.Next(1000, 9999)}";

        string patientName = "Patient";
        string patientEmail = "patient@medix.lk";
        int patientId = 1;
        string itemName = "Hospital Clinical Investigation";

        if (dto.Module.Equals("Laboratory", StringComparison.OrdinalIgnoreCase))
        {
            if (!Guid.TryParse(dto.ReferenceId, out var bookingId))
            {
                return BadRequest(new { message = "Invalid booking ID format." });
            }

            var booking = await _db.LabBookings.Include(b => b.LabTest).FirstOrDefaultAsync(b => b.Id == bookingId);
            if (booking == null)
            {
                return NotFound(new { message = "Laboratory booking not found." });
            }

            patientId = booking.PatientId;
            patientName = booking.PatientName;
            patientEmail = booking.PatientEmail;
            itemName = booking.LabTest?.Name ?? "Laboratory Test";

            booking.PaymentStatus = PaymentStatus.PaidAtCounter;
            booking.PaymentMethod = dto.PaymentMethod; // "Cash" or "POSCard"
            booking.ReceiptNumber = receiptNum;
            booking.AmountPaid = dto.Amount;
            booking.PaidAt = DateTime.UtcNow;
            booking.UpdatedAt = DateTime.UtcNow;
        }

        var payment = new Payment
        {
            Module = Enum.TryParse<PaymentModule>(dto.Module, true, out var parsedModule) ? parsedModule : PaymentModule.Laboratory,
            ReferenceId = dto.ReferenceId,
            PatientId = patientId,
            PatientName = patientName,
            PatientEmail = patientEmail,
            Amount = dto.Amount,
            Currency = "LKR",
            Status = PaymentStatus.PaidAtCounter,
            PaymentMethod = dto.PaymentMethod,
            TransactionReference = txnRef,
            ReceiptNumber = receiptNum,
            PaidAt = DateTime.UtcNow,
            CollectedByStaffId = dto.StaffId,
            Notes = dto.Notes ?? "Payment collected at hospital laboratory counter",
            CreatedAt = DateTime.UtcNow
        };

        _db.Payments.Add(payment);
        await _db.SaveChangesAsync();

        _logger.LogInformation("[Payment] Recorded counter payment {Receipt} of LKR {Amount} via {Method}",
            receiptNum, dto.Amount, dto.PaymentMethod);

        return Ok(new PaymentReceiptResponse
        {
            PaymentId = payment.Id,
            ReceiptNumber = receiptNum,
            Module = dto.Module,
            ReferenceId = dto.ReferenceId,
            PatientName = patientName,
            PatientEmail = patientEmail,
            ItemName = itemName,
            Amount = dto.Amount,
            Currency = "LKR",
            PaymentStatus = "PaidAtCounter",
            PaymentMethod = dto.PaymentMethod == "POSCard" ? "POS Card Machine (Counter)" : "Cash (Counter)",
            TransactionReference = txnRef,
            PaidAt = payment.PaidAt ?? DateTime.UtcNow
        });
    }

    // POST /api/payments/intent/counter — Patient selects intention to pay at counter
    [HttpPost("intent/counter")]
    public async Task<IActionResult> SetPayAtCounterIntent([FromBody] SelectCounterPaymentIntentRequest dto)
    {
        if (Guid.TryParse(dto.ReferenceId, out var bookingId))
        {
            var booking = await _db.LabBookings.FindAsync(bookingId);
            if (booking != null && booking.PaymentStatus == PaymentStatus.Unpaid)
            {
                var candidateBookings = await _db.LabBookings
                    .Where(b => (b.PatientId == booking.PatientId || b.PatientEmail == booking.PatientEmail)
                             && b.BookingDate == booking.BookingDate
                             && b.TimeSlot == booking.TimeSlot
                             && b.PaymentStatus == PaymentStatus.Unpaid
                             && b.Status != BookingStatus.Cancelled
                             && b.Status != BookingStatus.Rejected)
                    .ToListAsync();

                var appointmentBookings = candidateBookings
                    .Where(b => Math.Abs((b.CreatedAt - booking.CreatedAt).TotalSeconds) <= 90)
                    .ToList();

                if (!appointmentBookings.Any(b => b.Id == booking.Id))
                {
                    appointmentBookings.Add(booking);
                }

                foreach (var b in appointmentBookings)
                {
                    b.PaymentMethod = "CashOnArrival";
                    if (b.Status == BookingStatus.PendingLabApproval)
                    {
                        b.Status = BookingStatus.Confirmed;
                    }
                    b.UpdatedAt = DateTime.UtcNow;
                }

                await _db.SaveChangesAsync();
                return Ok(new { message = "Payment method updated: Pay on arrival at laboratory counter." });
            }
        }
        return Ok(new { message = "Updated." });
    }

    // GET /api/payments/receipt/{referenceId} — Fetch receipt
    [HttpGet("receipt/{referenceId}")]
    public async Task<ActionResult<PaymentReceiptResponse>> GetReceipt(string referenceId)
    {
        var payment = await _db.Payments.OrderByDescending(p => p.CreatedAt).FirstOrDefaultAsync(p => p.ReferenceId == referenceId);
        if (payment != null)
        {
            return Ok(new PaymentReceiptResponse
            {
                PaymentId = payment.Id,
                ReceiptNumber = payment.ReceiptNumber ?? "RCPT-OFFICIAL",
                Module = payment.Module.ToString(),
                ReferenceId = payment.ReferenceId,
                PatientName = payment.PatientName,
                PatientEmail = payment.PatientEmail,
                ItemName = "Diagnostic Investigation",
                Amount = payment.Amount,
                Currency = payment.Currency,
                PaymentStatus = payment.Status.ToString(),
                PaymentMethod = payment.PaymentMethod,
                TransactionReference = payment.TransactionReference,
                PaidAt = payment.PaidAt ?? payment.CreatedAt
            });
        }

        // Fallback: lookup LabBooking directly
        if (Guid.TryParse(referenceId, out var bId))
        {
            var b = await _db.LabBookings.Include(x => x.LabTest).FirstOrDefaultAsync(x => x.Id == bId);
            if (b != null && b.PaymentStatus != PaymentStatus.Unpaid)
            {
                return Ok(new PaymentReceiptResponse
                {
                    ReceiptNumber = b.ReceiptNumber ?? $"RCPT-{b.Id.ToString().Substring(0, 8).ToUpper()}",
                    Module = "Laboratory",
                    ReferenceId = b.Id.ToString(),
                    PatientName = b.PatientName,
                    PatientEmail = b.PatientEmail,
                    ItemName = b.LabTest?.Name ?? "Laboratory Investigation",
                    Amount = b.AmountPaid > 0 ? b.AmountPaid : (b.LabTest?.Price ?? 0),
                    Currency = "LKR",
                    PaymentStatus = b.PaymentStatus.ToString(),
                    PaymentMethod = b.PaymentMethod ?? "Settled",
                    PaidAt = b.PaidAt ?? b.UpdatedAt
                });
            }
        }

        return NotFound(new { message = "No receipt found for this reference ID." });
    }
}
