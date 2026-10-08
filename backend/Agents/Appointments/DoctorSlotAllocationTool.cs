using HealthBridge.Api.Data;
using HealthBridge.Api.DTOs.Appointments;
using HealthBridge.Api.Models.Appointments;
using Microsoft.EntityFrameworkCore;
using System.Diagnostics;

namespace HealthBridge.Api.Agents.Appointments;

/// <summary>
/// Allow-listed Tool for Doctor & Slot Allocation Agent.
/// Complies with SE3090 Section 9.1: "Agents may use only allow-listed tools. Validate every tool input, return structured outputs".
/// 
/// Interacts directly with PostgreSQL via Entity Framework Core to query active consultants,
/// their specializations, hospital branches, ratings, and upcoming available session slots.
/// </summary>
public interface IDoctorSlotAllocationTool
{
    string ToolName { get; }
    Task<List<MatchedDoctorDto>> QueryAvailableDoctorsAndSlotsAsync(string specialty, string? preferredBranch = null, int maxResults = 3);
}

public class DoctorSlotAllocationTool : IDoctorSlotAllocationTool
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<DoctorSlotAllocationTool> _logger;

    public string ToolName => "DoctorSlotAllocationTool.QueryAvailableDoctorsAndSlots";

    public DoctorSlotAllocationTool(ApplicationDbContext context, ILogger<DoctorSlotAllocationTool> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<List<MatchedDoctorDto>> QueryAvailableDoctorsAndSlotsAsync(string specialty, string? preferredBranch = null, int maxResults = 3)
    {
        var sw = Stopwatch.StartNew();
        _logger.LogInformation("[ToolCall: {ToolName}] Executing for Specialty='{Specialty}', Branch='{Branch}', Max={Max}",
            ToolName, specialty, preferredBranch ?? "ANY", maxResults);

        if (string.IsNullOrWhiteSpace(specialty))
        {
            throw new ArgumentException("Specialty parameter cannot be empty for DoctorSlotAllocationTool.");
        }

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var normSpecialty = specialty.Trim().ToLowerInvariant();

        // 1. Fetch matching doctors in this specialty
        var query = _context.Doctors.AsNoTracking()
            .Where(d => d.Specialization.ToLower() == normSpecialty || d.Specialization.ToLower().Contains(normSpecialty));

        if (!string.IsNullOrWhiteSpace(preferredBranch))
        {
            var branchNorm = preferredBranch.Trim().ToLowerInvariant();
            query = query.Where(d => d.HospitalBranch != null && d.HospitalBranch.ToLower().Contains(branchNorm));
        }

        var doctors = await query
            .OrderByDescending(d => d.Rating)
            .ThenByDescending(d => d.ExperienceYears)
            .Take(10)
            .ToListAsync();

        if (doctors.Count == 0)
        {
            // Fallback: match any doctor with relaxed specialization
            doctors = await _context.Doctors.AsNoTracking()
                .OrderByDescending(d => d.Rating)
                .Take(maxResults)
                .ToListAsync();
        }

        var matchedResults = new List<MatchedDoctorDto>();

        foreach (var doc in doctors)
        {
            // Query nearest upcoming session with available capacity
            var session = await _context.DoctorSessions.AsNoTracking()
                .Where(s => s.DoctorId == doc.Id &&
                            s.SessionDate >= today &&
                            s.SessionStatus != SessionStatus.Cancelled &&
                            s.SessionStatus != SessionStatus.Completed &&
                            s.CurrentBookings < s.MaxCapacity)
                .OrderBy(s => s.SessionDate)
                .ThenBy(s => s.SessionTime)
                .FirstOrDefaultAsync();

            var availableSlots = session != null ? (session.MaxCapacity - session.CurrentBookings) : 0;
            var sessionTimeFormatted = session != null
                ? DateTime.Today.Add(session.SessionTime.ToTimeSpan()).ToString("hh:mm tt")
                : null;

            var matchReason = session != null
                ? $"Top-rated consultant ({doc.Rating:0.0}★, {doc.ExperienceYears} yrs exp). Earliest slot on {session.SessionDate:yyyy-MM-dd} at {sessionTimeFormatted} ({availableSlots} slots left)."
                : $"Consultant in {doc.Specialization} ({doc.Rating:0.0}★, {doc.ExperienceYears} yrs exp) at {doc.HospitalBranch ?? "Health Bridge Hospital"}.";

            matchedResults.Add(new MatchedDoctorDto
            {
                DoctorId = doc.Id,
                FullName = doc.FullName,
                Specialization = doc.Specialization,
                Qualifications = doc.Qualifications ?? "MBBS, MD",
                HospitalBranch = doc.HospitalBranch ?? "Health Bridge Colombo Main",
                RoomNumber = doc.RoomNumber ?? "Consultation Suite 201",
                ConsultationFee = doc.ConsultationFee,
                ExperienceYears = doc.ExperienceYears,
                Rating = doc.Rating,
                MatchReason = matchReason,
                NextSessionId = session?.Id,
                NextSessionDate = session?.SessionDate.ToString("yyyy-MM-dd"),
                NextSessionTime = sessionTimeFormatted,
                AvailableSlots = availableSlots
            });

            if (matchedResults.Count >= maxResults)
                break;
        }

        _logger.LogInformation("[ToolCall: {ToolName}] Completed in {Ms}ms. Found {Count} matching doctor slots.",
            ToolName, sw.ElapsedMilliseconds, matchedResults.Count);

        return matchedResults;
    }
}
