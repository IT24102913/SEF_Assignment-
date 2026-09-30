using HealthBridge.Api.Agents.Appointments;
using HealthBridge.Api.Data;
using HealthBridge.Api.DTOs.Appointments;
using HealthBridge.Api.Models;
using HealthBridge.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HealthBridge.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[IgnoreAntiforgeryToken]
public class DoctorsController : ControllerBase
{
    private readonly IAppointmentService _appointmentService;
    private readonly DoctorRecommendationAgent _recommendationAgent;
    private readonly ApplicationDbContext _context;
    private readonly ILogger<DoctorsController> _logger;

    public DoctorsController(
        IAppointmentService appointmentService,
        DoctorRecommendationAgent recommendationAgent,
        ApplicationDbContext context,
        ILogger<DoctorsController> logger)
    {
        _appointmentService = appointmentService;
        _recommendationAgent = recommendationAgent;
        _context = context;
        _logger = logger;
    }

    /// <summary>
    /// Search and filter doctors by name, specialization, hospital branch, date, and sorting.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetDoctors(
        [FromQuery] string? search,
        [FromQuery] string? specialization,
        [FromQuery] string? hospital,
        [FromQuery] string? date,
        [FromQuery] string? sortBy)
    {
        var doctors = await _appointmentService.GetDoctorsAsync(search, specialization, hospital, date, sortBy);
        return Ok(doctors);
    }

    /// <summary>
    /// Returns the 8 fixed specialties with live counts of available consultants.
    /// Powers the "Browse by Specialty" cards on Screen 1.
    /// </summary>
    [HttpGet("specialties")]
    public async Task<IActionResult> GetSpecialties()
    {
        var specialties = await _appointmentService.GetSpecialtiesAsync();
        return Ok(specialties);
    }

    /// <summary>
    /// Gets full profile details for a doctor.
    /// </summary>
    [HttpGet("{id}")]
    public async Task<IActionResult> GetDoctorById(int id)
    {
        var doctor = await _appointmentService.GetDoctorByIdAsync(id);
        if (doctor == null) return NotFound(new { message = "Doctor not found" });
        return Ok(doctor);
    }

    /// <summary>
    /// Business-specific operation beyond basic CRUD:
    /// Returns 5-day session availability and time slots for the interactive session picker.
    /// </summary>
    [HttpGet("{id}/sessions")]
    public async Task<IActionResult> GetDoctorSessions(int id, [FromQuery] string? date)
    {
        DateOnly? parsedDate = null;
        if (!string.IsNullOrWhiteSpace(date) && DateOnly.TryParse(date, out var d))
        {
            parsedDate = d;
        }

        var sessions = await _appointmentService.GetDoctorSessionsAsync(id, parsedDate);
        return Ok(sessions);
    }

    /// <summary>
    /// Agentic AI triage: Accepts patient symptoms and returns ranked medical specialties.
    /// Pre-fills the specialty filter chip without automated transaction booking (Human-in-the-loop).
    /// </summary>
    [HttpPost("recommend-specialty")]
    public async Task<IActionResult> RecommendSpecialty([FromBody] AIRecommendationRequest request)
    {
        if (string.IsNullOrWhiteSpace(request?.Symptoms))
        {
            return BadRequest(new { message = "Please provide symptom description for analysis." });
        }

        var recommendation = await _recommendationAgent.RecommendSpecialtiesAsync(request.Symptoms);

        // Enrich with live consultant counts
        var allSpecialties = await _appointmentService.GetSpecialtiesAsync();
        foreach (var rec in recommendation.Recommendations)
        {
            var match = allSpecialties.FirstOrDefault(s => s.Name.Equals(rec.Specialty, StringComparison.OrdinalIgnoreCase));
            if (match != null)
            {
                rec.AvailableConsultants = match.ConsultantCount;
            }
        }

        return Ok(recommendation);
    }

    /// <summary>
    /// Administrative creation of a doctor.
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> CreateDoctor([FromBody] Doctor doctor)
    {
        doctor.CreatedAt = DateTime.UtcNow;
        _context.Doctors.Add(doctor);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetDoctorById), new { id = doctor.Id }, doctor);
    }

    /// <summary>
    /// Administrative update of a doctor.
    /// </summary>
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateDoctor(int id, [FromBody] Doctor doctor)
    {
        if (id != doctor.Id) return BadRequest(new { message = "ID mismatch" });

        var existing = await _context.Doctors.FindAsync(id);
        if (existing == null) return NotFound(new { message = "Doctor not found" });

        existing.FullName = doctor.FullName;
        existing.Specialization = doctor.Specialization;
        existing.Qualifications = doctor.Qualifications;
        existing.Hospital = doctor.Hospital;
        existing.HospitalBranch = doctor.HospitalBranch;
        existing.RoomNumber = doctor.RoomNumber;
        existing.ConsultationFee = doctor.ConsultationFee;
        existing.AvailableDays = doctor.AvailableDays;
        existing.AvailableTime = doctor.AvailableTime;
        existing.ImageUrl = doctor.ImageUrl;
        existing.PhoneNumber = doctor.PhoneNumber;
        existing.Rating = doctor.Rating;
        existing.ReviewCount = doctor.ReviewCount;
        existing.ExperienceYears = doctor.ExperienceYears;
        existing.IsVerifiedConsultant = doctor.IsVerifiedConsultant;
        existing.Bio = doctor.Bio;
        existing.IsAvailable = doctor.IsAvailable;
        existing.Email = doctor.Email;

        await _context.SaveChangesAsync();
        return Ok(existing);
    }

    /// <summary>
    /// Administrative deletion of a doctor.
    /// </summary>
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteDoctor(int id)
    {
        var doc = await _context.Doctors.FindAsync(id);
        if (doc == null) return NotFound(new { message = "Doctor not found" });

        _context.Doctors.Remove(doc);
        await _context.SaveChangesAsync();
        return Ok(new { message = "Doctor deleted successfully" });
    }
}
