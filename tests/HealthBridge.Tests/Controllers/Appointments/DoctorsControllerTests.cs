using HealthBridge.Api.Agents.Appointments;
using HealthBridge.Api.Controllers;
using HealthBridge.Api.Data;
using HealthBridge.Api.DTOs.Appointments;
using HealthBridge.Api.Models;
using HealthBridge.Api.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using System.Security.Claims;
using Xunit;

namespace HealthBridge.Tests.Controllers.Appointments;

public class DoctorsControllerTests
{
    private ApplicationDbContext CreateInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        return new ApplicationDbContext(options);
    }

    private DoctorsController CreateController(
        ApplicationDbContext context,
        Mock<IAppointmentService>? mockService = null,
        ClaimsPrincipal? user = null)
    {
        var service = mockService ?? new Mock<IAppointmentService>();

        var mockConfig = new Mock<IConfiguration>();
        var mockHttpFactory = new Mock<IHttpClientFactory>();
        mockHttpFactory.Setup(f => f.CreateClient(It.IsAny<string>())).Returns(new HttpClient());

        var agent = new DoctorRecommendationAgent(
            mockConfig.Object,
            NullLogger<DoctorRecommendationAgent>.Instance,
            mockHttpFactory.Object,
            context);

        var controller = new DoctorsController(
            service.Object,
            agent,
            context,
            NullLogger<DoctorsController>.Instance);

        var httpContext = new DefaultHttpContext();
        if (user != null)
        {
            httpContext.User = user;
        }
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = httpContext
        };

        return controller;
    }

    [Fact]
    public async Task GetMyDoctorProfile_WhenAuthenticatedDoctorExistsByUserId_ReturnsOkWithDoctor()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var doctor = new Doctor
        {
            FullName = "Dr. Anjali Perera",
            Specialization = "Cardiology",
            Email = "anjali.cardio@healthbridge.com",
            UserId = 42,
            HospitalBranch = "Colombo"
        };
        context.Doctors.Add(doctor);
        await context.SaveChangesAsync();

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, "42"),
            new Claim(ClaimTypes.Email, "anjali.cardio@healthbridge.com"),
            new Claim(ClaimTypes.Role, "Doctor")
        };
        var principal = new ClaimsPrincipal(new ClaimsIdentity(claims, "TestAuth"));
        var controller = CreateController(context, user: principal);

        // Act
        var result = await controller.GetMyDoctorProfile();

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        var returnedDoctor = Assert.IsType<Doctor>(okResult.Value);
        Assert.Equal(doctor.Id, returnedDoctor.Id);
        Assert.Equal("Dr. Anjali Perera", returnedDoctor.FullName);
        Assert.Equal("Cardiology", returnedDoctor.Specialization);
    }

    [Fact]
    public async Task GetMyDoctorProfile_WhenAuthenticatedDoctorMatchesByEmail_ReturnsOkWithDoctor()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var doctor = new Doctor
        {
            FullName = "Dr. M.T.D Lakshan",
            Specialization = "ENT",
            Email = "lakshan.ent@healthbridge.com",
            UserId = null // Unlinked UserId, should match by Email
        };
        context.Doctors.Add(doctor);
        await context.SaveChangesAsync();

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, "99"),
            new Claim(ClaimTypes.Email, "lakshan.ent@healthbridge.com"),
            new Claim(ClaimTypes.Role, "Doctor")
        };
        var principal = new ClaimsPrincipal(new ClaimsIdentity(claims, "TestAuth"));
        var controller = CreateController(context, user: principal);

        // Act
        var result = await controller.GetMyDoctorProfile();

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        var returnedDoctor = Assert.IsType<Doctor>(okResult.Value);
        Assert.Equal(doctor.Id, returnedDoctor.Id);
        Assert.Equal("Dr. M.T.D Lakshan", returnedDoctor.FullName);
    }

    [Fact]
    public async Task GetMyDoctorProfile_WhenDoctorNotFound_ReturnsNotFound()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, "999"),
            new Claim(ClaimTypes.Email, "unknown.doc@healthbridge.com"),
            new Claim(ClaimTypes.Role, "Doctor")
        };
        var principal = new ClaimsPrincipal(new ClaimsIdentity(claims, "TestAuth"));
        var controller = CreateController(context, user: principal);

        // Act
        var result = await controller.GetMyDoctorProfile();

        // Assert
        Assert.IsType<NotFoundObjectResult>(result);
    }

    [Fact]
    public async Task GetDoctors_DelegatesToAppointmentService()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var mockService = new Mock<IAppointmentService>();
        var expectedDoctors = new List<DoctorDto>
        {
            new DoctorDto { Id = 1, FullName = "Dr. Perera", Specialization = "Cardiology" }
        };
        mockService.Setup(s => s.GetDoctorsAsync("Perera", "Cardiology", null, null, null))
            .ReturnsAsync(expectedDoctors);

        var controller = CreateController(context, mockService);

        // Act
        var result = await controller.GetDoctors("Perera", "Cardiology", null, null, null);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        var returned = Assert.IsType<List<DoctorDto>>(okResult.Value);
        Assert.Single(returned);
        Assert.Equal("Dr. Perera", returned[0].FullName);
    }

    [Fact]
    public async Task GetSpecialties_ReturnsSpecialtiesList()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var mockService = new Mock<IAppointmentService>();
        var expected = new List<SpecialtyCountDto>
        {
            new SpecialtyCountDto { Name = "Cardiology", ConsultantCount = 2 }
        };
        mockService.Setup(s => s.GetSpecialtiesAsync()).ReturnsAsync(expected);

        var controller = CreateController(context, mockService);

        // Act
        var result = await controller.GetSpecialties();

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        var returned = Assert.IsType<List<SpecialtyCountDto>>(okResult.Value);
        Assert.Single(returned);
    }

    [Fact]
    public async Task GetDoctorById_WhenDoctorExists_ReturnsOk()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var mockService = new Mock<IAppointmentService>();
        mockService.Setup(s => s.GetDoctorByIdAsync(1))
            .ReturnsAsync(new DoctorDto { Id = 1, FullName = "Dr. Silva" });

        var controller = CreateController(context, mockService);

        // Act
        var result = await controller.GetDoctorById(1);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        var doc = Assert.IsType<DoctorDto>(okResult.Value);
        Assert.Equal(1, doc.Id);
    }

    [Fact]
    public async Task GetDoctorById_WhenNotFound_ReturnsNotFound()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var mockService = new Mock<IAppointmentService>();
        mockService.Setup(s => s.GetDoctorByIdAsync(99)).ReturnsAsync((DoctorDto?)null);

        var controller = CreateController(context, mockService);

        // Act
        var result = await controller.GetDoctorById(99);

        // Assert
        Assert.IsType<NotFoundObjectResult>(result);
    }

    [Fact]
    public async Task CreateDoctor_PersistsRecordAndReturnsCreatedAtAction()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var controller = CreateController(context);

        var newDoctor = new Doctor
        {
            FullName = "Dr. New Doctor",
            Specialization = "Neurology",
            Hospital = "Colombo Hospital",
            HospitalBranch = "Colombo",
            ConsultationFee = 3000m
        };

        // Act
        var result = await controller.CreateDoctor(newDoctor);

        // Assert
        var createdResult = Assert.IsType<CreatedAtActionResult>(result);
        var created = Assert.IsType<Doctor>(createdResult.Value);
        Assert.True(created.Id > 0);
        Assert.Equal("Dr. New Doctor", created.FullName);

        var inDb = await context.Doctors.FindAsync(created.Id);
        Assert.NotNull(inDb);
    }

    [Fact]
    public async Task UpdateDoctor_WhenIdMismatch_ReturnsBadRequest()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var controller = CreateController(context);
        var doc = new Doctor { Id = 2, FullName = "Dr. Test" };

        // Act
        var result = await controller.UpdateDoctor(1, doc);

        // Assert
        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task DeleteDoctor_WhenExists_RemovesFromDatabase()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var doc = new Doctor { FullName = "Dr. To Delete", Specialization = "ENT" };
        context.Doctors.Add(doc);
        await context.SaveChangesAsync();

        var controller = CreateController(context);

        // Act
        var result = await controller.DeleteDoctor(doc.Id);

        // Assert
        Assert.IsType<OkObjectResult>(result);
        var deleted = await context.Doctors.FindAsync(doc.Id);
        Assert.Null(deleted);
    }

    // ─── RecommendSpecialty Authorization Tests ───────────────────────────────

    [Fact]
    public async Task RecommendSpecialty_WhenAnonymous_ReturnsUnauthorized()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var controller = CreateController(context, user: null);
        var request = new AIRecommendationRequest { Symptoms = "persistent cough" };

        // Act
        var result = await controller.RecommendSpecialty(request);

        // Assert
        Assert.IsType<UnauthorizedObjectResult>(result);
    }

    [Fact]
    public async Task RecommendSpecialty_WhenWrongRole_ReturnsForbid()
    {
        // Arrange: Doctor attempting to call recommendation
        using var context = CreateInMemoryDbContext();
        var doctorUser = new ClaimsPrincipal(new ClaimsIdentity(
            new[] { new Claim(ClaimTypes.NameIdentifier, "10"), new Claim(ClaimTypes.Role, UserRole.Doctor) }, "TestAuth"));
        var controller = CreateController(context, user: doctorUser);
        var request = new AIRecommendationRequest { Symptoms = "persistent cough" };

        // Act
        var result = await controller.RecommendSpecialty(request);

        // Assert
        Assert.IsType<ForbidResult>(result);
    }

    [Fact]
    public async Task RecommendSpecialty_WhenPatientRole_ReturnsOk()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var patientUser = new ClaimsPrincipal(new ClaimsIdentity(
            new[] { new Claim(ClaimTypes.NameIdentifier, "10"), new Claim(ClaimTypes.Role, UserRole.Patient) }, "TestAuth"));
        var controller = CreateController(context, user: patientUser);
        var request = new AIRecommendationRequest { Symptoms = "persistent knee ache after jogging" };

        // Act
        var result = await controller.RecommendSpecialty(request);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(okResult.Value);
    }
}
