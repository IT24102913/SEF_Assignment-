using HealthBridge.Api.Data;
using HealthBridge.Api.DTOs.Staff;
using HealthBridge.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HealthBridge.Api.Controllers.Admin;

[ApiController]
[Route("api/[controller]")]
[IgnoreAntiforgeryToken]
public class StaffController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<StaffController> _logger;

    public StaffController(ApplicationDbContext context, ILogger<StaffController> logger)
    {
        _context = context;
        _logger = logger;
    }

    /// <summary>
    /// Get all hospital staff members (Doctors, Pharmacists, Lab Officers, Admins)
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<IEnumerable<StaffResponseDto>>> GetAllStaff()
    {
        var staffUsers = await _context.Users
            .Where(u => u.Role != UserRole.Patient)
            .OrderByDescending(u => u.CreatedAt)
            .ToListAsync();

        var doctors = await _context.Doctors.ToListAsync();

        var response = staffUsers.Select(u =>
        {
            var doctor = doctors.FirstOrDefault(d => 
                (d.UserId.HasValue && d.UserId.Value == u.Id) || 
                (!string.IsNullOrEmpty(d.Email) && d.Email.ToLower() == u.Email.ToLower()) ||
                d.FullName.ToLower() == u.FullName.ToLower());

            string? dept = null;
            if (u.Role == UserRole.Doctor) dept = doctor?.Specialization ?? "Consultation Department";
            else if (u.Role == UserRole.Pharmacist) dept = "Pharmacy & Dispensing";
            else if (u.Role == UserRole.Laboratory) dept = "Pathology & Diagnostics";
            else if (u.Role == UserRole.Admin) dept = "Hospital Administration";

            return new StaffResponseDto
            {
                Id = u.Id,
                FullName = u.FullName,
                Email = u.Email,
                Role = u.Role,
                IsActive = u.IsActive,
                CreatedAt = u.CreatedAt,
                Department = dept,
                Specialization = doctor?.Specialization,
                AvailableDays = doctor?.AvailableDays ?? "Mon - Fri",
                AvailableTime = doctor?.AvailableTime ?? "08:00 AM - 04:00 PM",
                PhoneNumber = doctor?.PhoneNumber,
                RoomNumber = doctor?.RoomNumber ?? "Main Facility"
            };
        }).ToList();

        return Ok(response);
    }

    /// <summary>
    /// Register a new staff member with role and schedule permissions
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<StaffResponseDto>> CreateStaff([FromBody] CreateStaffRequestDto dto)
    {
        if (await _context.Users.AnyAsync(u => u.Email.ToLower() == dto.Email.ToLower()))
        {
            return BadRequest(new { message = "A user with this email address already exists." });
        }

        var user = new User
        {
            FullName = dto.FullName.Trim(),
            Email = dto.Email.Trim().ToLower(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
            Role = dto.Role,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        Doctor? doctor = null;
        if (dto.Role == UserRole.Doctor)
        {
            doctor = new Doctor
            {
                FullName = dto.FullName.Trim(),
                Email = dto.Email.Trim().ToLower(),
                UserId = user.Id,
                Specialization = !string.IsNullOrWhiteSpace(dto.Specialization) ? dto.Specialization.Trim() : "General Medicine",
                Hospital = "Health Bridge Hospital - Colombo",
                HospitalBranch = "Colombo Main",
                RoomNumber = "Suite " + (100 + user.Id),
                ConsultationFee = 2500m,
                AvailableDays = !string.IsNullOrWhiteSpace(dto.AvailableDays) ? dto.AvailableDays.Trim() : "Mon, Wed, Fri",
                AvailableTime = !string.IsNullOrWhiteSpace(dto.AvailableTime) ? dto.AvailableTime.Trim() : "09:00 AM - 03:00 PM",
                PhoneNumber = dto.PhoneNumber ?? "+94 77 000 0000",
                IsVerifiedConsultant = true,
                ExperienceYears = 5
            };
            _context.Doctors.Add(doctor);
            await _context.SaveChangesAsync();
        }

        return Ok(new StaffResponseDto
        {
            Id = user.Id,
            FullName = user.FullName,
            Email = user.Email,
            Role = user.Role,
            IsActive = user.IsActive,
            CreatedAt = user.CreatedAt,
            Department = dto.Department ?? (dto.Role == UserRole.Doctor ? doctor?.Specialization : dto.Role),
            Specialization = doctor?.Specialization,
            AvailableDays = doctor?.AvailableDays ?? dto.AvailableDays ?? "Mon - Fri",
            AvailableTime = doctor?.AvailableTime ?? dto.AvailableTime ?? "08:00 AM - 04:00 PM",
            PhoneNumber = dto.PhoneNumber,
            RoomNumber = doctor?.RoomNumber ?? "Main Facility"
        });
    }

    /// <summary>
    /// Update staff member details, role, or roster schedule
    /// </summary>
    [HttpPut("{id:int}")]
    public async Task<ActionResult<StaffResponseDto>> UpdateStaff(int id, [FromBody] UpdateStaffRequestDto dto)
    {
        var user = await _context.Users.FindAsync(id);
        if (user == null)
        {
            return NotFound(new { message = $"Staff member with ID {id} not found." });
        }

        user.FullName = dto.FullName.Trim();
        user.Role = dto.Role;
        if (dto.IsActive.HasValue) user.IsActive = dto.IsActive.Value;

        var doctor = await _context.Doctors.FirstOrDefaultAsync(d => 
            (d.UserId.HasValue && d.UserId.Value == user.Id) || 
            (!string.IsNullOrEmpty(d.Email) && d.Email.ToLower() == user.Email.ToLower()));

        if (user.Role == UserRole.Doctor)
        {
            if (doctor == null)
            {
                doctor = new Doctor
                {
                    FullName = user.FullName,
                    Email = user.Email,
                    UserId = user.Id,
                    Specialization = dto.Specialization ?? "General Medicine",
                    AvailableDays = dto.AvailableDays ?? "Mon - Fri",
                    AvailableTime = dto.AvailableTime ?? "08:00 AM - 04:00 PM",
                    PhoneNumber = dto.PhoneNumber ?? "+94 77 000 0000"
                };
                _context.Doctors.Add(doctor);
            }
            else
            {
                doctor.FullName = user.FullName;
                if (!string.IsNullOrWhiteSpace(dto.Specialization)) doctor.Specialization = dto.Specialization;
                if (!string.IsNullOrWhiteSpace(dto.AvailableDays)) doctor.AvailableDays = dto.AvailableDays;
                if (!string.IsNullOrWhiteSpace(dto.AvailableTime)) doctor.AvailableTime = dto.AvailableTime;
                if (!string.IsNullOrWhiteSpace(dto.PhoneNumber)) doctor.PhoneNumber = dto.PhoneNumber;
            }
        }

        await _context.SaveChangesAsync();

        return Ok(new StaffResponseDto
        {
            Id = user.Id,
            FullName = user.FullName,
            Email = user.Email,
            Role = user.Role,
            IsActive = user.IsActive,
            CreatedAt = user.CreatedAt,
            Department = dto.Department ?? (user.Role == UserRole.Doctor ? doctor?.Specialization : user.Role),
            Specialization = doctor?.Specialization,
            AvailableDays = doctor?.AvailableDays ?? dto.AvailableDays ?? "Mon - Fri",
            AvailableTime = doctor?.AvailableTime ?? dto.AvailableTime ?? "08:00 AM - 04:00 PM",
            PhoneNumber = dto.PhoneNumber ?? doctor?.PhoneNumber,
            RoomNumber = doctor?.RoomNumber ?? "Main Facility"
        });
    }

    /// <summary>
    /// Toggle active / suspended status for staff member
    /// </summary>
    [HttpPatch("{id:int}/toggle-status")]
    public async Task<IActionResult> ToggleStatus(int id)
    {
        var user = await _context.Users.FindAsync(id);
        if (user == null)
        {
            return NotFound(new { message = $"Staff member with ID {id} not found." });
        }

        user.IsActive = !user.IsActive;
        await _context.SaveChangesAsync();

        return Ok(new { message = $"Staff member access is now {(user.IsActive ? "Active" : "Suspended")}.", isActive = user.IsActive });
    }

    /// <summary>
    /// Delete a staff member account
    /// </summary>
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteStaff(int id)
    {
        var user = await _context.Users.FindAsync(id);
        if (user == null)
        {
            return NotFound(new { message = $"Staff member with ID {id} not found." });
        }

        var doctor = await _context.Doctors.FirstOrDefaultAsync(d => 
            (d.UserId.HasValue && d.UserId.Value == user.Id) || 
            (!string.IsNullOrEmpty(d.Email) && d.Email.ToLower() == user.Email.ToLower()));

        if (doctor != null)
        {
            _context.Doctors.Remove(doctor);
        }

        _context.Users.Remove(user);
        await _context.SaveChangesAsync();

        return NoContent();
    }
}
