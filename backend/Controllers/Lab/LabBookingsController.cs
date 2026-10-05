using System.Text.Json;
using HealthBridge.Api.Agents;
using HealthBridge.Api.Agents.Lab;
using HealthBridge.Api.Data;
using HealthBridge.Api.DTOs.Lab;
using HealthBridge.Api.Models;
using HealthBridge.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HealthBridge.Api.Controllers;

[ApiController]
[Route("api/lab/bookings")]
public class LabBookingsController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly IEmailService _emailService;
    private readonly LabAgentOrchestrator _agentOrchestrator;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<LabBookingsController> _logger;

    public LabBookingsController(ApplicationDbContext db, IEmailService emailService, LabAgentOrchestrator agentOrchestrator, IServiceScopeFactory scopeFactory, ILogger<LabBookingsController> logger)
    {
        _db = db;
        _emailService = emailService;
        _agentOrchestrator = agentOrchestrator;
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    // GET /api/lab/bookings/my?patientId={id}&email={email} — Patient's own bookings
    [HttpGet("my")]
    public async Task<ActionResult<IEnumerable<LabBookingResponse>>> GetMyBookings([FromQuery] int? patientId, [FromQuery] string? email)
    {
        var query = _db.LabBookings
            .Include(b => b.LabTest)
            .AsQueryable();

        var hasEmail = !string.IsNullOrWhiteSpace(email);
        var hasPatientId = patientId.HasValue && patientId.Value > 0;

        if (hasEmail && hasPatientId)
        {
            var lowerEmail = email!.Trim().ToLower();
            query = query.Where(b => b.PatientEmail.ToLower() == lowerEmail || b.PatientId == patientId!.Value);
        }
        else if (hasEmail)
        {
            var lowerEmail = email!.Trim().ToLower();
            query = query.Where(b => b.PatientEmail.ToLower() == lowerEmail);
        }
        else if (hasPatientId)
        {
            query = query.Where(b => b.PatientId == patientId!.Value);
        }

        var bookings = await query
            .OrderByDescending(b => b.CreatedAt)
            .ToListAsync();

        return Ok(bookings.Select(MapToDto));
    }

    // GET /api/lab/bookings/{id} — Get single booking
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<LabBookingResponse>> GetById(Guid id)
    {
        var booking = await _db.LabBookings.Include(b => b.LabTest).FirstOrDefaultAsync(b => b.Id == id);
        if (booking == null) return NotFound();
        return Ok(MapToDto(booking));
    }

    // POST /api/lab/bookings — Create a new booking
    [HttpPost]
    public async Task<ActionResult<LabBookingResponse>> Create([FromBody] CreateBookingRequest dto)
    {
        var test = await _db.LabTests.FindAsync(dto.LabTestId);
        if (test == null || !test.IsActive)
            return BadRequest(new { message = "Lab test not found or unavailable." });

        // Check slot availability
        var slot = await _db.LabTimeSlots
            .FirstOrDefaultAsync(s => s.Date == dto.BookingDate && s.Time == dto.TimeSlot);

        if (slot != null && !slot.IsAvailable)
            return BadRequest(new { message = "This time slot is fully booked. Please choose another." });

        if (slot == null)
        {
            slot = new LabTimeSlot { Date = dto.BookingDate, Time = dto.TimeSlot, MaxCapacity = 5, CurrentBookings = 0 };
            _db.LabTimeSlots.Add(slot);
        }

        var booking = new LabBooking
        {
            PatientId = dto.PatientId,
            PatientName = dto.PatientName,
            PatientEmail = dto.PatientEmail,
            LabTestId = dto.LabTestId,
            BookingDate = dto.BookingDate,
            TimeSlot = dto.TimeSlot,
            Status = test.IsRestricted
                ? BookingStatus.PendingPrescriptionUpload
                : BookingStatus.Confirmed,
            AIVerification = test.IsRestricted
                ? AIVerificationResult.Pending
                : AIVerificationResult.NotRequired
        };

        _db.LabBookings.Add(booking);

        // Update slot count
        slot.CurrentBookings++;

        await _db.SaveChangesAsync();

        // Run multi-agent orchestrator for non-restricted bookings right away
        if (!test.IsRestricted)
        {
            try
            {
                await _agentOrchestrator.ProcessBookingWorkflowAsync(_db, booking.Id);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Could not run agent orchestrator for booking {BookingId}", booking.Id);
            }
        }

        // Send immediate "booking received" acknowledgement email (background / resilient)
        try
        {
            await _emailService.SendBookingReceivedAsync(
                dto.PatientEmail,
                dto.PatientName,
                test.Name,
                dto.BookingDate,
                dto.TimeSlot,
                test.IsRestricted);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Could not send booking confirmation email to {Email}", dto.PatientEmail);
        }

        return CreatedAtAction(nameof(GetById), new { id = booking.Id }, MapToDto(booking));
    }

    // POST /api/lab/bookings/{id}/prescription — Upload prescription and trigger AI Multi-Agent Workflow
    [HttpPost("{id:guid}/prescription")]
    public async Task<ActionResult<LabBookingResponse>> UploadPrescription(Guid id, [FromBody] UploadPrescriptionRequest dto)
    {
        var booking = await _db.LabBookings.Include(b => b.LabTest).FirstOrDefaultAsync(b => b.Id == id);
        if (booking == null) return NotFound();

        if (booking.Status != BookingStatus.PendingPrescriptionUpload)
            return BadRequest(new { message = "Prescription upload not required for this booking." });

        // Save image URL
        booking.PrescriptionImageUrl = dto.PrescriptionImageUrl;
        booking.Status = BookingStatus.PendingAIVerification;
        booking.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        // Trigger AI Multi-Agent Orchestrator asynchronously with scoped DbContext
        var bookingId = booking.Id;

        _ = Task.Run(async () =>
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var scopedDb = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
                var scopedOrchestrator = scope.ServiceProvider.GetRequiredService<LabAgentOrchestrator>();

                await scopedOrchestrator.ProcessBookingWorkflowAsync(scopedDb, bookingId);
                _logger.LogInformation("[LabAgentOrchestrator] Multi-agent processing complete for booking {BookingId}", bookingId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[LabAgentOrchestrator] Multi-agent processing failed for booking {BookingId}", bookingId);
            }
        });

        return Ok(MapToDto(booking));
    }

    // DELETE /api/lab/bookings/{id} — Cancel booking (patient)
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Cancel(Guid id, [FromQuery] int patientId)
    {
        var booking = await _db.LabBookings.FindAsync(id);
        if (booking == null) return NotFound(new { message = "Booking not found." });
        if (booking.PatientId != patientId) return Forbid();

        var cancellableStatuses = new[]
        {
            BookingStatus.PendingPrescriptionUpload,
            BookingStatus.PendingAIVerification,
            BookingStatus.PendingLabApproval,
            BookingStatus.Confirmed
        };

        if (!cancellableStatuses.Contains(booking.Status))
            return BadRequest(new { message = "This booking can no longer be cancelled." });

        booking.Status = BookingStatus.Cancelled;
        booking.UpdatedAt = DateTime.UtcNow;

        var slot = await _db.LabTimeSlots.FirstOrDefaultAsync(s => s.Date == booking.BookingDate && s.Time == booking.TimeSlot);
        if (slot != null && slot.CurrentBookings > 0)
        {
            slot.CurrentBookings--;
        }

        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPut("/api/lab/admin/bookings/{id}/status")]
    public async Task<IActionResult> UpdateBookingStatus(Guid id, [FromQuery] BookingStatus newStatus)
    {
        var booking = await _db.LabBookings
            .Include(b => b.LabTest)
            .FirstOrDefaultAsync(b => b.Id == id);
        if (booking == null) return NotFound();

        // If transitioning to Rejected or Cancelled from an active status, free up the slot
        if ((newStatus == BookingStatus.Rejected || newStatus == BookingStatus.Cancelled) && 
            booking.Status != BookingStatus.Rejected && booking.Status != BookingStatus.Cancelled)
        {
            var slot = await _db.LabTimeSlots.FirstOrDefaultAsync(s => s.Date == booking.BookingDate && s.Time == booking.TimeSlot);
            if (slot != null && slot.CurrentBookings > 0)
            {
                slot.CurrentBookings--;
            }
        }

        booking.Status = newStatus;
        booking.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        if (newStatus == BookingStatus.ReportDelivered)
        {
            try
            {
                await _emailService.SendResultsReadyAsync(
                    booking.PatientEmail, 
                    booking.PatientName, 
                    booking.LabTest?.Name ?? "Laboratory Diagnostic Test");
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Could not send report delivered email to {Email}", booking.PatientEmail);
            }
        }
        else if (newStatus == BookingStatus.Completed)
        {
            try
            {
                await _emailService.SendOrderCompletedAsync(
                    booking.PatientEmail, 
                    booking.PatientName, 
                    booking.LabTest?.Name ?? "Laboratory Diagnostic Test",
                    booking.ResultFileUrl);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Could not send order completed email to {Email}", booking.PatientEmail);
            }
        }
        else
        {
            try
            {
                await _emailService.SendStatusUpdateAsync(
                    booking.PatientEmail, 
                    booking.PatientName, 
                    booking.LabTest?.Name ?? "Lab Test", 
                    newStatus.ToString());
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Could not send status update email to {Email}", booking.PatientEmail);
            }
        }

        return Ok(MapToDto(booking));
    }

    // GET /api/lab/slots — Get available time slots for a date
    [HttpGet("/api/lab/slots")]
    public async Task<ActionResult<IEnumerable<LabTimeSlotResponse>>> GetSlots([FromQuery] DateOnly date)
    {
        var slots = await _db.LabTimeSlots
            .Where(s => s.Date == date)
            .OrderBy(s => s.Time)
            .ToListAsync();

        return Ok(slots.Select(s => new LabTimeSlotResponse
        {
            Id = s.Id,
            Date = s.Date,
            Time = s.Time,
            MaxCapacity = s.MaxCapacity,
            CurrentBookings = s.CurrentBookings,
            IsAvailable = s.IsAvailable
        }));
    }

    // POST /api/lab/bookings/{id}/save-to-emr — Save delivered report to permanent patient EMR profile
    [HttpPost("{id:guid}/save-to-emr")]
    public async Task<IActionResult> SaveToEmr(Guid id)
    {
        var booking = await _db.LabBookings
            .Include(b => b.LabTest)
            .FirstOrDefaultAsync(b => b.Id == id);

        if (booking == null)
            return NotFound(new { message = "Lab booking not found." });

        if (booking.Status != BookingStatus.ReportDelivered && booking.Status != BookingStatus.Completed)
            return BadRequest(new { message = "Report is not yet delivered or completed for this booking." });

        if (string.IsNullOrWhiteSpace(booking.ResultFileUrl))
            return BadRequest(new { message = "No valid report file URL found for this booking." });

        // If already saved to EMR, verify and return existing record
        if (booking.IsSavedToEmr && booking.EmrLabReportId.HasValue)
        {
            var existingReport = await _db.LabReports.FindAsync(booking.EmrLabReportId.Value);
            if (existingReport != null)
            {
                return Ok(new
                {
                    message = "This lab report is already permanently archived in your EMR profile.",
                    isAlreadySaved = true,
                    emrReportId = existingReport.Id,
                    patientCode = existingReport.PatientCode,
                    testTitle = existingReport.TestTitle,
                    booking = MapToDto(booking)
                });
            }
        }

        // Find or create EMR patient profile
        HealthBridge.Api.Models.EMR.Patient? patient = null;
        if (booking.PatientId > 0)
        {
            patient = await _db.Patients.FirstOrDefaultAsync(p => p.UserId == booking.PatientId);
        }

        if (patient == null && !string.IsNullOrWhiteSpace(booking.PatientEmail))
        {
            var lowerEmail = booking.PatientEmail.Trim().ToLower();
            patient = await _db.Patients.FirstOrDefaultAsync(p => p.Email.ToLower() == lowerEmail);
        }

        if (patient == null)
        {
            var patientCount = await _db.Patients.CountAsync();
            var newCode = $"PAT-{patientCount + 1001}";
            patient = new HealthBridge.Api.Models.EMR.Patient
            {
                Id = Guid.NewGuid(),
                UserId = booking.PatientId > 0 ? booking.PatientId : null,
                PatientCode = newCode,
                FullName = string.IsNullOrWhiteSpace(booking.PatientName) ? "Patient" : booking.PatientName,
                Email = booking.PatientEmail,
                Gender = "Other",
                BloodGroup = "Unknown",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _db.Patients.Add(patient);
            await _db.SaveChangesAsync();
        }

        // Create permanent EMR Lab Report entry
        var testName = booking.LabTest?.Name ?? "Laboratory Diagnostic Test";
        var emrLabReport = new HealthBridge.Api.Models.EMR.LabReport
        {
            Id = Guid.NewGuid(),
            PatientId = patient.Id,
            PatientCode = patient.PatientCode,
            TestTitle = testName,
            Category = booking.LabTest?.Category ?? "Laboratory Investigation",
            OrderedDoctor = !string.IsNullOrWhiteSpace(booking.AIExtractedDoctorName)
                ? booking.AIExtractedDoctorName
                : "Central Laboratory Consultant",
            ReportDate = booking.ResultsUploadedAt ?? DateTime.UtcNow,
            Status = "Completed",
            FileName = $"{booking.QueueToken ?? "LAB"}_{testName.Replace(" ", "_")}.pdf",
            FileUrl = booking.ResultFileUrl,
            ResultsSummary = !string.IsNullOrWhiteSpace(booking.TechnicianNotes)
                ? booking.TechnicianNotes
                : $"Verified laboratory diagnostic report for {testName}. Preserved from 30-day purge into permanent HealthBridge EMR profile.",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _db.LabReports.Add(emrLabReport);

        booking.IsSavedToEmr = true;
        booking.EmrLabReportId = emrLabReport.Id;
        booking.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        _logger.LogInformation("[Lab->EMR] Saved report {ReportId} for booking {BookingId} to patient {PatientCode}", emrLabReport.Id, booking.Id, patient.PatientCode);

        return Ok(new
        {
            message = "Lab report successfully archived to your permanent EMR health profile! It is now protected from automatic deletion.",
            isAlreadySaved = false,
            emrReportId = emrLabReport.Id,
            patientCode = patient.PatientCode,
            testTitle = emrLabReport.TestTitle,
            booking = MapToDto(booking)
        });
    }

    // POST /api/lab/bookings/purge-expired — Enforce 30-day retention policy on unarchived lab reports
    [HttpPost("purge-expired")]
    public async Task<IActionResult> PurgeExpiredReports()
    {
        var cutoff = DateTime.UtcNow.AddDays(-30);
        var expiredBookings = await _db.LabBookings
            .Where(b => (b.Status == BookingStatus.ReportDelivered || b.Status == BookingStatus.Completed)
                     && !b.IsSavedToEmr
                     && !string.IsNullOrEmpty(b.ResultFileUrl)
                     && (b.ResultsUploadedAt ?? b.UpdatedAt) < cutoff)
            .ToListAsync();

        int purgedCount = 0;
        foreach (var b in expiredBookings)
        {
            b.ResultFileUrl = null;
            b.TechnicianNotes = (b.TechnicianNotes ?? "") + " [System Notice: Temporary report purged after 30-day retention expiration. File was not archived to EMR.]";
            b.UpdatedAt = DateTime.UtcNow;
            purgedCount++;
        }

        if (purgedCount > 0)
        {
            await _db.SaveChangesAsync();
        }

        return Ok(new
        {
            purgedCount,
            message = $"Processed retention policy: purged {purgedCount} expired report(s) older than 30 days."
        });
    }

    private static LabBookingResponse MapToDto(LabBooking b)
    {
        int? retentionDays = null;
        bool isExpired = false;
        DateTime? expiryDate = null;
        if (b.Status == BookingStatus.ReportDelivered || b.Status == BookingStatus.Completed)
        {
            var issuedAt = b.ResultsUploadedAt ?? b.UpdatedAt;
            expiryDate = issuedAt.AddDays(30);
            var remaining = (int)Math.Ceiling((expiryDate.Value - DateTime.UtcNow).TotalDays);
            retentionDays = Math.Max(0, remaining);
            isExpired = remaining <= 0;
        }

        string? accessibleResultUrl = null;
        if (b.Status == BookingStatus.ReportDelivered || b.Status == BookingStatus.Completed)
        {
            // If report is past 30 days and NOT saved to EMR, the download link expires
            if (!isExpired || b.IsSavedToEmr)
            {
                accessibleResultUrl = b.ResultFileUrl;
            }
        }

        var dto = new LabBookingResponse
        {
            Id = b.Id,
            PatientId = b.PatientId,
            PatientName = b.PatientName,
            PatientEmail = b.PatientEmail,
            LabTest = b.LabTest == null ? null : new LabTestResponse
            {
                Id = b.LabTest.Id,
                Name = b.LabTest.Name,
                Description = b.LabTest.Description,
                Price = b.LabTest.Price,
                IsRestricted = b.LabTest.IsRestricted,
                TurnaroundDays = b.LabTest.TurnaroundDays,
                Category = b.LabTest.Category,
                IsActive = b.LabTest.IsActive
            },
            BookingDate = b.BookingDate,
            TimeSlot = b.TimeSlot,
            Status = b.Status.ToString(),
            PrescriptionImageUrl = b.PrescriptionImageUrl,
            AIVerification = b.AIVerification.ToString(),
            AIVerificationNotes = b.AIVerificationNotes,
            AIConfidenceScore = b.AIConfidenceScore,
            AIExtractedDoctorName = b.AIExtractedDoctorName,
            AIPrescriptionDate = b.AIPrescriptionDate,
            TechnicianNotes = b.TechnicianNotes,
            ResultFileUrl = accessibleResultUrl,
            ResultsUploadedAt = b.ResultsUploadedAt,
            IsSavedToEmr = b.IsSavedToEmr,
            EmrLabReportId = b.EmrLabReportId,
            RetentionDaysRemaining = retentionDays,
            IsReportExpired = isExpired && !b.IsSavedToEmr,
            ReportExpiryDate = expiryDate,
            QueueToken = b.QueueToken,
            PriorityTier = b.PriorityTier,
            EstimatedServiceDurationMinutes = b.EstimatedServiceDurationMinutes,
            EstimatedWaitMinutes = b.EstimatedWaitMinutes,
            AssignedChairNo = b.AssignedChairNo,
            AgentWorkflowStateJson = b.AgentWorkflowStateJson,
            PaymentStatus = b.PaymentStatus.ToString(),
            PaymentMethod = b.PaymentMethod,
            ReceiptNumber = b.ReceiptNumber,
            AmountPaid = b.AmountPaid,
            PaidAt = b.PaidAt,
            CreatedAt = b.CreatedAt,
            UpdatedAt = b.UpdatedAt
        };

        PopulateAIFieldsFromWorkflow(b, dto);
        return dto;
    }

    private static void PopulateAIFieldsFromWorkflow(LabBooking b, LabBookingResponse dto)
    {
        if (string.IsNullOrWhiteSpace(b.AgentWorkflowStateJson)) return;
        try
        {
            using var doc = JsonDocument.Parse(b.AgentWorkflowStateJson);
            var root = doc.RootElement;
            if (root.TryGetProperty("stepLogs", out var logs) && logs.ValueKind == JsonValueKind.Array)
            {
                foreach (var step in logs.EnumerateArray())
                {
                    var agent = step.TryGetProperty("agentName", out var ag) ? ag.GetString() : "";
                    if (agent == "PrescriptionVerificationAgent" && step.TryGetProperty("details", out var det))
                    {
                        if (det.TryGetProperty("detectedPatientName", out var dpn))
                            dto.AIExtractedPatientName = dpn.GetString();

                        if (det.TryGetProperty("patientNameMatch", out var pnm))
                        {
                            dto.AIPatientNameMismatch = !pnm.GetBoolean();
                        }
                        if (det.TryGetProperty("patientNameMismatchReason", out var pnmr))
                            dto.AIPatientNameMismatchReason = pnmr.GetString();

                        if (det.TryGetProperty("matchFound", out var mf))
                        {
                            dto.AITestMismatch = !mf.GetBoolean();
                        }

                        if (det.TryGetProperty("extractedInvestigations", out var invArr) && invArr.ValueKind == JsonValueKind.Array)
                        {
                            dto.AIExtractedInvestigations = invArr.EnumerateArray()
                                .Select(x => x.GetString() ?? "")
                                .Where(x => !string.IsNullOrWhiteSpace(x))
                                .ToList();
                        }

                        if (det.TryGetProperty("isPrescriptionExpired", out var ipe))
                            dto.AIPrescriptionExpired = ipe.GetBoolean();

                        if (det.TryGetProperty("prescriptionDateValid", out var pdv))
                            dto.AIPrescriptionDateValid = pdv.GetBoolean();

                        if (det.TryGetProperty("prescriptionDateReason", out var pdr))
                            dto.AIPrescriptionDateReason = pdr.GetString();

                        if (det.TryGetProperty("documentClassification", out var dc))
                            dto.AIDocumentClassification = dc.GetString();

                        if (det.TryGetProperty("documentTypeDescription", out var dtd))
                            dto.AIDocumentTypeDescription = dtd.GetString();

                        if (det.TryGetProperty("isValidMedicalPrescription", out var ivmp))
                            dto.AIIsValidPrescription = ivmp.GetBoolean();

                        if (det.TryGetProperty("flagReasons", out var frArr) && frArr.ValueKind == JsonValueKind.Array)
                        {
                            dto.AIFlagReasons = frArr.EnumerateArray()
                                .Select(x => x.GetString() ?? "")
                                .Where(x => !string.IsNullOrWhiteSpace(x))
                                .ToList();
                        }
                        break;
                    }
                }
            }
        }
        catch { /* ignore parsing errors */ }
    }
}

