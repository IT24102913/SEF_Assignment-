using HealthBridge.Api.Agents.EMR;
using HealthBridge.Api.Authentication;
using HealthBridge.Api.Controllers.EMR;
using HealthBridge.Api.Data;
using HealthBridge.Api.DTOs.EMR;
using HealthBridge.Api.Models;
using HealthBridge.Api.Models.EMR;
using HealthBridge.Api.Services.EMR;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using System.Security.Claims;
using Xunit;

namespace HealthBridge.Tests.Controllers.EMR;

public class EMRControllerTests
{
    private ApplicationDbContext CreateInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        return new ApplicationDbContext(options);
    }

    private (EMRController Controller, Mock<IEMRService> MockService, ApplicationDbContext DbContext) CreateTestSetup()
    {
        var db = CreateInMemoryDbContext();
        var mockService = new Mock<IEMRService>();

        var mockConfig = new Mock<IConfiguration>();
        var mockHttpClientFactory = new Mock<IHttpClientFactory>();
        mockHttpClientFactory.Setup(f => f.CreateClient(It.IsAny<string>())).Returns(new HttpClient());

        var agent = new EMRClinicalInsightAgent(
            mockConfig.Object,
            NullLogger<EMRClinicalInsightAgent>.Instance,
            mockHttpClientFactory.Object
        );

        var mockJwt = new Mock<IJwtTokenGenerator>();
        mockJwt.Setup(j => j.GenerateToken(It.IsAny<User>())).Returns("mock_valid_jwt_token_for_testing");

        var controller = new EMRController(
            mockService.Object,
            NullLogger<EMRController>.Instance,
            agent,
            db,
            mockJwt.Object
        );

        return (controller, mockService, db);
    }

    [Fact]
    public async Task GetPatients_ReturnsOkResultWithListOfPatients()
    {
        // Arrange
        var (controller, mockService, _) = CreateTestSetup();
        var patientList = new List<PatientDto>
        {
            new() { Id = Guid.NewGuid(), PatientCode = "PAT-1001", FullName = "Kamal Perera" },
            new() { Id = Guid.NewGuid(), PatientCode = "PAT-1002", FullName = "Sunil Silva" }
        };
        mockService.Setup(s => s.GetAllPatientsAsync(null)).ReturnsAsync(patientList);

        // Act
        var result = await controller.GetPatients(null);

        // Assert
        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var returned = Assert.IsAssignableFrom<IEnumerable<PatientDto>>(ok.Value);
        Assert.Equal(2, returned.Count());
    }

    [Fact]
    public async Task GetPatient_ExistingCode_ReturnsOkResult()
    {
        // Arrange
        var (controller, mockService, _) = CreateTestSetup();
        var expected = new PatientDto { Id = Guid.NewGuid(), PatientCode = "PAT-1001", FullName = "Kamal Perera" };
        mockService.Setup(s => s.GetPatientByCodeAsync("PAT-1001")).ReturnsAsync(expected);

        // Act
        var result = await controller.GetPatient("PAT-1001");

        // Assert
        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var patient = Assert.IsType<PatientDto>(ok.Value);
        Assert.Equal("PAT-1001", patient.PatientCode);
    }

    [Fact]
    public async Task GetPatient_NonExistent_ReturnsNotFound()
    {
        // Arrange
        var (controller, mockService, _) = CreateTestSetup();
        mockService.Setup(s => s.GetPatientByCodeAsync("PAT-9999")).ReturnsAsync((PatientDto?)null);

        // Act
        var result = await controller.GetPatient("PAT-9999");

        // Assert
        Assert.IsType<NotFoundObjectResult>(result.Result);
    }

    [Fact]
    public async Task CreatePatient_MissingFullName_ReturnsBadRequest()
    {
        // Arrange
        var (controller, _, _) = CreateTestSetup();
        var dto = new CreatePatientDto { FullName = "" };

        // Act
        var result = await controller.CreatePatient(dto);

        // Assert
        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task CreatePatient_ValidDto_ReturnsCreatedAtAction()
    {
        // Arrange
        var (controller, mockService, _) = CreateTestSetup();
        var dto = new CreatePatientDto { FullName = "Jerad Xavier", Gender = "Male" };
        var created = new PatientDto { Id = Guid.NewGuid(), PatientCode = "PAT-1003", FullName = "Jerad Xavier" };
        mockService.Setup(s => s.CreatePatientAsync(dto)).ReturnsAsync(created);

        // Act
        var result = await controller.CreatePatient(dto);

        // Assert
        var createdResult = Assert.IsType<CreatedAtActionResult>(result.Result);
        Assert.Equal("GetPatient", createdResult.ActionName);
    }

    [Fact]
    public async Task CreateConsultation_MissingDiagnosis_ReturnsBadRequest()
    {
        // Arrange
        var (controller, _, _) = CreateTestSetup();
        var dto = new CreateConsultationNoteDto { PatientCode = "PAT-1001", Diagnosis = "" };

        // Act
        var result = await controller.CreateConsultation(dto);

        // Assert
        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task CreatePrescription_ValidDto_ReturnsCreatedAtAction()
    {
        // Arrange
        var (controller, mockService, _) = CreateTestSetup();
        var dto = new CreatePrescriptionDto
        {
            PatientCode = "PAT-1001",
            MedicationName = "Amoxicillin 500mg",
            Dosage = "1 capsule tid",
            Duration = "7 days"
        };
        var created = new PrescriptionDto
        {
            Id = Guid.NewGuid(),
            PatientCode = "PAT-1001",
            MedicationName = "Amoxicillin 500mg",
            Status = "Active"
        };
        mockService.Setup(s => s.CreatePrescriptionAsync(dto)).ReturnsAsync(created);

        // Act
        var result = await controller.CreatePrescription(dto);

        // Assert
        var createdResult = Assert.IsType<CreatedAtActionResult>(result.Result);
        var rx = Assert.IsType<PrescriptionDto>(createdResult.Value);
        Assert.Equal("Amoxicillin 500mg", rx.MedicationName);
    }

    [Fact]
    public async Task RequestPrescriptionAuthorization_ValidRequest_ReturnsOkWithUpdatedStatus()
    {
        // Arrange
        var (controller, mockService, _) = CreateTestSetup();
        var rxId = Guid.NewGuid();
        var dto = new RequestPrescriptionAuthorizationDto
        {
            Action = "Delete",
            Reason = "Duplicate order entered by mistake",
            RequestedBy = "pharmacist@hospital.com"
        };
        var updated = new PrescriptionDto
        {
            Id = rxId,
            AuthorizationAction = "Delete",
            AuthorizationStatus = "Pending"
        };
        mockService.Setup(s => s.RequestPrescriptionAuthorizationAsync(rxId, dto)).ReturnsAsync(updated);

        // Act
        var result = await controller.RequestPrescriptionAuthorization(rxId, dto);

        // Assert
        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var res = Assert.IsType<PrescriptionDto>(ok.Value);
        Assert.Equal("Pending", res.AuthorizationStatus);
    }

    [Fact]
    public async Task ApproveAndDeletePrescription_ApprovedByAdmin_ReturnsSuccessMessage()
    {
        // Arrange
        var (controller, mockService, _) = CreateTestSetup();
        var rxId = Guid.NewGuid();
        var dto = new ApprovePrescriptionDeleteDto { AdminNote = "Approved deletion" };
        mockService.Setup(s => s.ApproveAndDeletePrescriptionAsync(rxId, "Approved deletion")).ReturnsAsync(true);

        // Act
        var result = await controller.ApproveAndDeletePrescription(rxId, dto);

        // Assert
        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(ok.Value);
    }

    [Fact]
    public async Task GetClinicalSummary_ValidCode_ReturnsComprehensiveSummary()
    {
        // Arrange
        var (controller, mockService, _) = CreateTestSetup();
        var summary = new ClinicalSummaryDto
        {
            PatientCode = "PAT-1001",
            FullName = "Jerad Xavier",
            ActivePrescriptionsCount = 2,
            CompletedLabReportsCount = 3
        };
        mockService.Setup(s => s.GenerateClinicalSummaryAsync("PAT-1001")).ReturnsAsync(summary);

        // Act
        var result = await controller.GetClinicalSummary("PAT-1001");

        // Assert
        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var data = Assert.IsType<ClinicalSummaryDto>(ok.Value);
        Assert.Equal("PAT-1001", data.PatientCode);
    }

    [Fact]
    public async Task StaffLogin_ValidDoctorCredentials_ReturnsTokenAndRole()
    {
        // Arrange
        var (controller, _, db) = CreateTestSetup();
        var doctorUser = new User
        {
            FullName = "Dr. Jerad",
            Email = "doctor@healthbridge.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Doctor@123"),
            Role = UserRole.Doctor,
            IsActive = true
        };
        db.Users.Add(doctorUser);
        await db.SaveChangesAsync();

        var loginDto = new EmrStaffLoginDto
        {
            StaffIdOrEmail = "doctor@healthbridge.com",
            Password = "Doctor@123",
            TargetRole = "Doctor"
        };

        // Act
        var result = await controller.StaffLogin(loginDto);

        // Assert
        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var response = Assert.IsType<StaffLoginResponseDto>(ok.Value);
        Assert.Equal("mock_valid_jwt_token_for_testing", response.Token);
        Assert.Equal(UserRole.Doctor, response.Role);
    }

    [Fact]
    public async Task StaffLogin_RoleMismatch_ReturnsForbidden403()
    {
        // Arrange
        var (controller, _, db) = CreateTestSetup();
        var pharmUser = new User
        {
            FullName = "Pharmacist Alice",
            Email = "pharm@healthbridge.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Pharm@123"),
            Role = UserRole.Pharmacist,
            IsActive = true
        };
        db.Users.Add(pharmUser);
        await db.SaveChangesAsync();

        var loginDto = new EmrStaffLoginDto
        {
            StaffIdOrEmail = "pharm@healthbridge.com",
            Password = "Pharm@123",
            TargetRole = "Doctor" // Pharmacist attempting to log into Doctor portal!
        };

        // Act
        var result = await controller.StaffLogin(loginDto);

        // Assert
        var statusResult = Assert.IsType<ObjectResult>(result.Result);
        Assert.Equal(StatusCodes.Status403Forbidden, statusResult.StatusCode);
    }
}
