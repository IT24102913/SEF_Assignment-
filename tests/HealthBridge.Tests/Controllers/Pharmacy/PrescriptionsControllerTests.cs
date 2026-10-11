using HealthBridge.Api.Controllers;
using HealthBridge.Api.DTOs.Pharmacy;
using HealthBridge.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Moq;
using Xunit;

namespace HealthBridge.Tests.Controllers.Pharmacy;

public class PrescriptionsControllerTests
{
    private readonly Mock<IPrescriptionService> _mockService;
    private readonly PrescriptionsController _controller;

    public PrescriptionsControllerTests()
    {
        _mockService = new Mock<IPrescriptionService>();
        _controller = new PrescriptionsController(_mockService.Object);
    }

    [Fact]
    public async Task GetAll_ReturnsAllPrescriptions()
    {
        // Arrange
        var list = new List<PrescriptionResponse>
        {
            new() { Id = 1, PatientName = "Kasun Perera", DoctorName = "Dr. Silva", Status = "Approved" },
            new() { Id = 2, PatientName = "Nimali Wickrama", DoctorName = "Dr. Fernando", Status = "Pending" }
        };

        _mockService.Setup(s => s.GetAllPrescriptionsAsync()).ReturnsAsync(list);

        // Act
        var result = await _controller.GetAll();

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var items = Assert.IsAssignableFrom<IEnumerable<PrescriptionResponse>>(okResult.Value).ToList();
        Assert.Equal(2, items.Count);
    }

    [Fact]
    public async Task GetById_ExistingId_ReturnsPrescription()
    {
        // Arrange
        var prescription = new PrescriptionResponse
        {
            Id = 5,
            PatientName = "Sunil Jayasinghe",
            DoctorName = "Dr. Perera",
            Status = "Approved"
        };

        _mockService.Setup(s => s.GetPrescriptionByIdAsync(5)).ReturnsAsync(prescription);

        // Act
        var result = await _controller.GetById(5);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var item = Assert.IsType<PrescriptionResponse>(okResult.Value);
        Assert.Equal("Sunil Jayasinghe", item.PatientName);
    }

    [Fact]
    public async Task GetById_NonExistent_ReturnsNotFound()
    {
        // Arrange
        _mockService.Setup(s => s.GetPrescriptionByIdAsync(99)).ReturnsAsync((PrescriptionResponse?)null);

        // Act
        var result = await _controller.GetById(99);

        // Assert
        Assert.IsType<NotFoundObjectResult>(result.Result);
    }

    [Fact]
    public async Task Create_ValidPrescriptionRequest_ReturnsCreatedAtAction()
    {
        // Arrange
        var request = new CreatePrescriptionRequest
        {
            PatientId = 12,
            PatientName = "Dinuka Samarasinghe",
            PatientEmail = "dinuka@example.com",
            DoctorName = "Dr. Bandara",
            ImageUrl = "https://example.com/uploads/rx.jpg"
        };

        var created = new PrescriptionResponse
        {
            Id = 20,
            PatientId = 12,
            PatientName = "Dinuka Samarasinghe",
            PatientEmail = "dinuka@example.com",
            DoctorName = "Dr. Bandara",
            ImageUrl = "https://example.com/uploads/rx.jpg",
            Status = "Pending"
        };

        _mockService.Setup(s => s.CreatePrescriptionAsync(request)).ReturnsAsync(created);

        // Act
        var result = await _controller.Create(request);

        // Assert
        var createdResult = Assert.IsType<CreatedAtActionResult>(result.Result);
        var item = Assert.IsType<PrescriptionResponse>(createdResult.Value);
        Assert.Equal(20, item.Id);
        Assert.Equal("Pending", item.Status);
    }

    [Fact]
    public async Task UpdateStatus_Approved_ReturnsUpdatedPrescription()
    {
        // Arrange
        var request = new UpdatePrescriptionStatusRequest
        {
            Status = "Approved"
        };

        var updated = new PrescriptionResponse
        {
            Id = 15,
            PatientName = "Priyantha Cooray",
            Status = "Approved"
        };

        _mockService.Setup(s => s.UpdatePrescriptionStatusAsync(15, request)).ReturnsAsync(updated);

        // Act
        var result = await _controller.UpdateStatus(15, request);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var item = Assert.IsType<PrescriptionResponse>(okResult.Value);
        Assert.Equal("Approved", item.Status);
    }

    [Fact]
    public async Task Delete_Existing_ReturnsNoContent()
    {
        // Arrange
        _mockService.Setup(s => s.DeletePrescriptionAsync(10)).ReturnsAsync(true);

        // Act
        var result = await _controller.Delete(10);

        // Assert
        Assert.IsType<NoContentResult>(result);
    }
}
