using HealthBridge.Api.Data;
using HealthBridge.Api.DTOs.Pharmacy;
using HealthBridge.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace HealthBridge.Api.Services;

public class PrescriptionService : IPrescriptionService
{
    private readonly ApplicationDbContext _context;

    public PrescriptionService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<PrescriptionResponse>> GetAllPrescriptionsAsync()
    {
        var items = await _context.PrescriptionSubmissions
            .AsNoTracking()
            .OrderByDescending(p => p.SubmittedAt)
            .ToListAsync();

        return items.Select(MapToPrescriptionResponse);
    }

    public async Task<PrescriptionResponse?> GetPrescriptionByIdAsync(int id)
    {
        var item = await _context.PrescriptionSubmissions
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == id);

        return item == null ? null : MapToPrescriptionResponse(item);
    }

    public async Task<IEnumerable<PrescriptionResponse>> GetPrescriptionsByPatientIdAsync(int patientId)
    {
        var items = await _context.PrescriptionSubmissions
            .Where(p => p.PatientId == patientId)
            .AsNoTracking()
            .OrderByDescending(p => p.SubmittedAt)
            .ToListAsync();

        return items.Select(MapToPrescriptionResponse);
    }

    public async Task<PrescriptionResponse> CreatePrescriptionAsync(CreatePrescriptionRequest request)
    {
        int? patientId = request.PatientId;
        if (!patientId.HasValue && !string.IsNullOrWhiteSpace(request.PatientEmail))
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == request.PatientEmail.Trim().ToLower());
            if (user != null)
            {
                patientId = user.Id;
            }
        }

        var rxCode = $"RX-{Random.Shared.Next(1000, 9999)}";

        var submission = new PrescriptionSubmission
        {
            PrescriptionCode = rxCode,
            PatientId = patientId,
            PatientName = request.PatientName.Trim(),
            PatientEmail = request.PatientEmail.Trim().ToLowerInvariant(),
            DoctorName = string.IsNullOrWhiteSpace(request.DoctorName) ? "Consultant Doctor" : request.DoctorName.Trim(),
            Notes = request.Notes?.Trim(),
            ImageUrl = request.ImageUrl,
            Status = "Pending",
            SubmittedAt = DateTime.UtcNow
        };

        _context.PrescriptionSubmissions.Add(submission);
        await _context.SaveChangesAsync();

        return MapToPrescriptionResponse(submission);
    }

    public async Task<PrescriptionResponse?> UpdatePrescriptionStatusAsync(int id, UpdatePrescriptionStatusRequest request)
    {
        var item = await _context.PrescriptionSubmissions.FindAsync(id);
        if (item == null) return null;

        item.Status = request.Status.Trim();
        item.ProcessedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return MapToPrescriptionResponse(item);
    }

    public async Task<bool> DeletePrescriptionAsync(int id)
    {
        var item = await _context.PrescriptionSubmissions.FindAsync(id);
        if (item == null) return false;

        _context.PrescriptionSubmissions.Remove(item);
        await _context.SaveChangesAsync();
        return true;
    }

    private static PrescriptionResponse MapToPrescriptionResponse(PrescriptionSubmission item)
    {
        return new PrescriptionResponse
        {
            Id = item.Id,
            PrescriptionCode = item.PrescriptionCode,
            PatientId = item.PatientId,
            PatientName = item.PatientName,
            PatientEmail = item.PatientEmail,
            DoctorName = item.DoctorName,
            Notes = item.Notes,
            ImageUrl = item.ImageUrl,
            Status = item.Status,
            SubmittedAt = item.SubmittedAt,
            ProcessedAt = item.ProcessedAt
        };
    }
}
