using HealthBridge.Api.Data;
using HealthBridge.Api.DTOs.Patient;
using HealthBridge.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace HealthBridge.Api.Services;

public class PatientService : IPatientService
{
    private readonly ApplicationDbContext _context;

    public PatientService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<PatientResponse>> GetAllPatientsAsync()
    {
        var users = await _context.Users
            .Where(u => u.Role == UserRole.Patient)
            .OrderByDescending(u => u.CreatedAt)
            .AsNoTracking()
            .ToListAsync();

        var userIds = users.Select(u => u.Id).ToList();

        var profiles = await _context.PatientProfiles
            .Where(p => userIds.Contains(p.UserId))
            .AsNoTracking()
            .ToDictionaryAsync(p => p.UserId);

        var prescriptionCounts = await _context.PrescriptionSubmissions
            .Where(p => p.PatientId.HasValue && userIds.Contains(p.PatientId.Value))
            .GroupBy(p => p.PatientId!.Value)
            .Select(g => new { UserId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.UserId, x => x.Count);

        var orderCounts = await _context.PharmacyOrders
            .Where(o => o.PatientId.HasValue && userIds.Contains(o.PatientId.Value))
            .GroupBy(o => o.PatientId!.Value)
            .Select(g => new { UserId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.UserId, x => x.Count);

        return users.Select(u => MapToPatientResponse(
            u,
            profiles.GetValueOrDefault(u.Id),
            prescriptionCounts.GetValueOrDefault(u.Id, 0),
            orderCounts.GetValueOrDefault(u.Id, 0)
        ));
    }

    public async Task<PatientResponse?> GetPatientByIdAsync(int id)
    {
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Id == id && u.Role == UserRole.Patient);

        if (user == null) return null;

        var profile = await _context.PatientProfiles
            .FirstOrDefaultAsync(p => p.UserId == user.Id);

        var rxCount = await _context.PrescriptionSubmissions
            .CountAsync(p => p.PatientId == user.Id);

        var orderCount = await _context.PharmacyOrders
            .CountAsync(o => o.PatientId == user.Id);

        return MapToPatientResponse(user, profile, rxCount, orderCount);
    }

    public async Task<PatientResponse?> GetPatientByUserIdAsync(int userId)
    {
        return await GetPatientByIdAsync(userId);
    }

    public async Task<PatientResponse?> UpdatePatientProfileAsync(int id, UpdatePatientProfileRequest request)
    {
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Id == id && u.Role == UserRole.Patient);

        if (user == null) return null;

        var profile = await _context.PatientProfiles
            .FirstOrDefaultAsync(p => p.UserId == user.Id);

        if (profile == null)
        {
            profile = new PatientProfile { UserId = user.Id, CreatedAt = DateTime.UtcNow };
            _context.PatientProfiles.Add(profile);
        }

        if (request.PhoneNumber != null) profile.PhoneNumber = request.PhoneNumber.Trim();
        if (request.Address != null) profile.Address = request.Address.Trim();
        if (request.City != null) profile.City = request.City.Trim();
        if (request.NicNumber != null) profile.NicNumber = request.NicNumber.Trim();
        if (request.DateOfBirth.HasValue) profile.DateOfBirth = DateTime.SpecifyKind(request.DateOfBirth.Value, DateTimeKind.Utc);
        if (request.Gender != null) profile.Gender = request.Gender.Trim();
        if (request.EmergencyContact != null) profile.EmergencyContact = request.EmergencyContact.Trim();
        profile.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        var rxCount = await _context.PrescriptionSubmissions.CountAsync(p => p.PatientId == user.Id);
        var orderCount = await _context.PharmacyOrders.CountAsync(o => o.PatientId == user.Id);

        return MapToPatientResponse(user, profile, rxCount, orderCount);
    }

    public async Task<bool> TogglePatientStatusAsync(int id)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == id && u.Role == UserRole.Patient);
        if (user == null) return false;

        user.IsActive = !user.IsActive;
        await _context.SaveChangesAsync();
        return true;
    }

    private static PatientResponse MapToPatientResponse(User user, PatientProfile? profile, int rxCount, int orderCount)
    {
        return new PatientResponse
        {
            Id = profile?.Id ?? user.Id,
            UserId = user.Id,
            FullName = user.FullName,
            Email = user.Email,
            PhoneNumber = profile?.PhoneNumber,
            Address = profile?.Address,
            City = profile?.City,
            NicNumber = profile?.NicNumber,
            DateOfBirth = profile?.DateOfBirth,
            Gender = profile?.Gender,
            EmergencyContact = profile?.EmergencyContact,
            IsActive = user.IsActive,
            RegisteredAt = user.CreatedAt,
            TotalPrescriptions = rxCount,
            TotalOrders = orderCount
        };
    }
}
