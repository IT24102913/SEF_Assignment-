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

    public string ToolName => AppointmentToolNames.QueryAvailableDoctorsAndSlots;

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

        // 1. Fetch matching doctors in this exact specialty:
        // Filter strictly by: IsAvailable == true, IsVerifiedConsultant == true, exact case-insensitive specialization match
        var query = _context.Doctors.AsNoTracking()
            .Where(d => d.IsAvailable && d.IsVerifiedConsultant && d.Specialization.ToLower() == normSpecialty);

        if (!string.IsNullOrWhiteSpace(preferredBranch))
        {
            var branchNorm = preferredBranch.Trim().ToLowerInvariant();
            query = query.Where(d => d.HospitalBranch != null && d.HospitalBranch.ToLower() == branchNorm);
        }

        var candidateDoctors = await query
            .OrderByDescending(d => d.Rating)
            .ThenByDescending(d => d.ExperienceYears)
            .ToListAsync();

        var matchedResults = new List<MatchedDoctorDto>();

        foreach (var doc in candidateDoctors)
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

            // Exclude doctors with no bookable session (only bookable consultants are returned)
            if (session == null)
            {
                continue;
            }

            var availableSlots = session.MaxCapacity - session.CurrentBookings;
            var sessionTimeFormatted = DateTime.Today.Add(session.SessionTime.ToTimeSpan()).ToString("hh:mm tt");
            var matchReason = $"Verified consultant ({doc.Rating:0.0}★, {doc.ExperienceYears} yrs exp). Earliest bookable session on {session.SessionDate:yyyy-MM-dd} at {sessionTimeFormatted} ({availableSlots} slots left).";

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
                NextSessionId = session.Id,
                NextSessionDate = session.SessionDate.ToString("yyyy-MM-dd"),
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
