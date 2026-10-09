using HealthBridge.Api.Agents.Appointments;
using HealthBridge.Api.Controllers.Appointments;
using HealthBridge.Api.Data;
using HealthBridge.Api.DTOs.Appointments;
using HealthBridge.Api.Models;
using HealthBridge.Api.Models.Appointments;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using System.Security.Claims;
using Xunit;

namespace HealthBridge.Tests.Controllers.Appointments;

public class DoctorRecommendationControllerTests
{
    private ApplicationDbContext CreateInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        var context = new ApplicationDbContext(options);

        // Seed a verified consultant with open session so recommendation pipeline succeeds
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var doc = new Doctor
        {
            Id = 501,
            FullName = "Dr. Test Ortho Consultant",
            Specialization = "Orthopaedics",
            Hospital = "Health Bridge Colombo",
            HospitalBranch = "Colombo",
            IsAvailable = true,
            IsVerifiedConsultant = true,
            Rating = 4.9,
            ExperienceYears = 15,
            ConsultationFee = 3500m
        };
        context.Doctors.Add(doc);

        var session = new DoctorSession
        {
            Id = 601,
            DoctorId = doc.Id,
            SessionDate = today.AddDays(1),
            SessionTime = new TimeOnly(10, 0),
            MaxCapacity = 15,
            CurrentBookings = 1,
            SessionStatus = SessionStatus.Scheduled
        };
        context.DoctorSessions.Add(session);
        context.SaveChanges();

        return context;
    }

    private DoctorRecommendationController CreateController(
        ApplicationDbContext context,
        ClaimsPrincipal? user = null)
    {
        var mockConfig = new Mock<IConfiguration>();
        mockConfig.Setup(c => c["Gemini:ApiKey"]).Returns(string.Empty);
        var mockHttpFactory = new Mock<IHttpClientFactory>();
        mockHttpFactory.Setup(f => f.CreateClient(It.IsAny<string>())).Returns(new HttpClient());

        var reg = new AgentToolRegistry(NullLogger<AgentToolRegistry>.Instance);
        var safety = new ClinicalSafetyAgent(NullLogger<ClinicalSafetyAgent>.Instance);
        var triage = new ClinicalTriageAgent(mockConfig.Object, NullLogger<ClinicalTriageAgent>.Instance, mockHttpFactory.Object);
        var slotTool = new DoctorSlotAllocationTool(context, NullLogger<DoctorSlotAllocationTool>.Instance);
        var slotAgent = new DoctorSlotAllocationAgent(slotTool, reg, NullLogger<DoctorSlotAllocationAgent>.Instance);
        var valAgent = new RecommendationValidationAgent();

        var agent = new DoctorRecommendationAgent(
            context,
            safety,
            triage,
            slotAgent,
            valAgent,
            reg,
            NullLogger<DoctorRecommendationAgent>.Instance);

        var controller = new DoctorRecommendationController(
            agent,
            NullLogger<DoctorRecommendationController>.Instance);

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

    private static ClaimsPrincipal CreateUserPrincipal(int userId, string role, bool isAuthenticated = true)
    {
        if (!isAuthenticated)
        {
            return new ClaimsPrincipal(new ClaimsIdentity());
        }

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
            new Claim(ClaimTypes.Role, role)
        };

        var identity = new ClaimsIdentity(claims, "TestAuth");
        return new ClaimsPrincipal(identity);
    }

    // ─── 1. RecommendDoctor Authorization Tests ───────────────────────────────

    [Fact]
    public async Task RecommendDoctor_WhenAnonymous_ReturnsUnauthorized()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var controller = CreateController(context, user: null);
        var request = new DoctorRecommendationRequestDto { Symptoms = "persistent knee ache" };

        // Act
        var result = await controller.RecommendDoctor(request);

        // Assert
        Assert.IsType<UnauthorizedObjectResult>(result);
    }

    [Fact]
    public async Task RecommendDoctor_WhenUserNotInPatientRole_ReturnsForbid()
    {
        // Arrange: Doctor or Admin attempting to call patient recommendation endpoint
        using var context = CreateInMemoryDbContext();
        var doctorUser = CreateUserPrincipal(userId: 42, role: UserRole.Doctor);
        var controller = CreateController(context, user: doctorUser);
        var request = new DoctorRecommendationRequestDto { Symptoms = "persistent knee ache" };

        // Act
        var result = await controller.RecommendDoctor(request);

        // Assert
        Assert.IsType<ForbidResult>(result);
    }

    [Fact]
    public async Task RecommendDoctor_WhenPatientRole_ReturnsOkWithRecommendation()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var patientUser = CreateUserPrincipal(userId: 7, role: UserRole.Patient);
        var controller = CreateController(context, user: patientUser);
        var request = new DoctorRecommendationRequestDto { Symptoms = "persistent knee ache after jogging" };

        // Act
        var result = await controller.RecommendDoctor(request);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        var response = Assert.IsType<DoctorRecommendationResponseDto>(okResult.Value);
        Assert.Equal("RECOMMENDATION_READY", response.Status);
    }

    // ─── 2. Approve Recommendation Authorization & Ownership Tests ────────────

    [Fact]
    public async Task ApproveRecommendation_WhenAnonymous_ReturnsUnauthorized()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var controller = CreateController(context, user: null);

        // Act
        var result = await controller.ApproveRecommendation(Guid.NewGuid(), new ApproveRecommendationRequestDto());

        // Assert
        Assert.IsType<UnauthorizedObjectResult>(result);
    }

    [Fact]
    public async Task ApproveRecommendation_WhenWorkflowNotFound_ReturnsNotFound()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var patientUser = CreateUserPrincipal(userId: 10, role: UserRole.Patient);
        var controller = CreateController(context, user: patientUser);

        // Act
        var result = await controller.ApproveRecommendation(Guid.NewGuid(), new ApproveRecommendationRequestDto());

        // Assert
        Assert.IsType<NotFoundObjectResult>(result);
    }

    [Fact]
    public async Task ApproveRecommendation_WhenOtherPatientWorkflow_ReturnsForbid()
    {
        // Arrange: Workflow belongs to Patient 10, but Patient 99 tries to approve it
        using var context = CreateInMemoryDbContext();
        var workflowId = Guid.NewGuid();
        context.RecommendationWorkflows.Add(new RecommendationWorkflow
        {
            Id = workflowId,
            PatientId = 10,
            ApprovalStatus = "PENDING_APPROVAL",
            FinalStatus = "RECOMMENDATION_READY"
        });
        await context.SaveChangesAsync();

        var attacker = CreateUserPrincipal(userId: 99, role: UserRole.Patient);
        var controller = CreateController(context, user: attacker);

        // Act
        var result = await controller.ApproveRecommendation(workflowId, new ApproveRecommendationRequestDto());

        // Assert
        Assert.IsType<ForbidResult>(result);
    }

    [Fact]
    public async Task ApproveRecommendation_WhenOwnerPatient_ReturnsOk()
    {
        // Arrange: Workflow belongs to Patient 10, and Patient 10 approves it
        using var context = CreateInMemoryDbContext();
        var workflowId = Guid.NewGuid();
        context.RecommendationWorkflows.Add(new RecommendationWorkflow
        {
            Id = workflowId,
            PatientId = 10,
            ApprovalStatus = "PENDING_APPROVAL",
            FinalStatus = "RECOMMENDATION_READY"
        });
        await context.SaveChangesAsync();

        var owner = CreateUserPrincipal(userId: 10, role: UserRole.Patient);
        var controller = CreateController(context, user: owner);

        // Act
        var result = await controller.ApproveRecommendation(workflowId, new ApproveRecommendationRequestDto());

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        var response = Assert.IsType<DoctorRecommendationResponseDto>(okResult.Value);
        Assert.Equal("APPROVED", response.ApprovalStatus);
    }

    // ─── 3. Reject Recommendation Authorization & Ownership Tests ────────────

    [Fact]
    public async Task RejectRecommendation_WhenAnonymous_ReturnsUnauthorized()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var controller = CreateController(context, user: null);

        // Act
        var result = await controller.RejectRecommendation(Guid.NewGuid(), new RejectRecommendationRequestDto());

        // Assert
        Assert.IsType<UnauthorizedObjectResult>(result);
    }

    [Fact]
    public async Task RejectRecommendation_WhenOtherPatientWorkflow_ReturnsForbid()
    {
        // Arrange: Workflow belongs to Patient 15, Patient 88 tries to reject it
        using var context = CreateInMemoryDbContext();
        var workflowId = Guid.NewGuid();
        context.RecommendationWorkflows.Add(new RecommendationWorkflow
        {
            Id = workflowId,
            PatientId = 15,
            ApprovalStatus = "PENDING_APPROVAL",
            FinalStatus = "RECOMMENDATION_READY"
        });
        await context.SaveChangesAsync();

        var attacker = CreateUserPrincipal(userId: 88, role: UserRole.Patient);
        var controller = CreateController(context, user: attacker);

        // Act
        var result = await controller.RejectRecommendation(workflowId, new RejectRecommendationRequestDto());

        // Assert
        Assert.IsType<ForbidResult>(result);
    }

    [Fact]
    public async Task RejectRecommendation_WhenOwnerPatient_ReturnsOk()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var workflowId = Guid.NewGuid();
        context.RecommendationWorkflows.Add(new RecommendationWorkflow
        {
            Id = workflowId,
            PatientId = 15,
            ApprovalStatus = "PENDING_APPROVAL",
            FinalStatus = "RECOMMENDATION_READY"
        });
        await context.SaveChangesAsync();

        var owner = CreateUserPrincipal(userId: 15, role: UserRole.Patient);
        var controller = CreateController(context, user: owner);

        // Act
        var result = await controller.RejectRecommendation(workflowId, new RejectRecommendationRequestDto());

        // Assert
        Assert.IsType<OkObjectResult>(result);
    }
}
