using HealthBridge.Api.Controllers;
using HealthBridge.Api.DTOs.Pharmacy;
using HealthBridge.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Moq;
using Xunit;

namespace HealthBridge.Tests.Controllers.Pharmacy;

public class PharmacyOrdersControllerTests
{
    private readonly Mock<IPharmacyOrderService> _mockOrderService;
    private readonly Mock<IPatientAnalyticsService> _mockAnalyticsService;
    private readonly Mock<IPharmacyEmailService> _mockEmailService;
    private readonly PharmacyOrdersController _controller;

    public PharmacyOrdersControllerTests()
    {
        _mockOrderService = new Mock<IPharmacyOrderService>();
        _mockAnalyticsService = new Mock<IPatientAnalyticsService>();
        _mockEmailService = new Mock<IPharmacyEmailService>();

        _controller = new PharmacyOrdersController(
            _mockOrderService.Object,
            _mockAnalyticsService.Object,
            _mockEmailService.Object
        );
    }

    [Fact]
    public async Task GetAll_ReturnsAllPharmacyOrders()
    {
        // Arrange
        var orders = new List<PharmacyOrderResponse>
        {
            new() { Id = 1, OrderNumber = "ORD-001", CustomerName = "Kasun Perera", TotalAmount = 1500, Status = "Confirmed" },
            new() { Id = 2, OrderNumber = "ORD-002", CustomerName = "Nimal Silva", TotalAmount = 2500, Status = "PendingVerification" }
        };

        _mockOrderService.Setup(s => s.GetAllOrdersAsync()).ReturnsAsync(orders);

        // Act
        var result = await _controller.GetAll();

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var returnedOrders = Assert.IsAssignableFrom<IEnumerable<PharmacyOrderResponse>>(okResult.Value).ToList();
        Assert.Equal(2, returnedOrders.Count);
        Assert.Equal("ORD-001", returnedOrders[0].OrderNumber);
    }

    [Fact]
    public async Task GetById_ExistingId_ReturnsOkResult()
    {
        // Arrange
        var order = new PharmacyOrderResponse
        {
            Id = 10,
            OrderNumber = "ORD-010",
            CustomerName = "Amara Fernando",
            TotalAmount = 3200,
            Status = "Confirmed"
        };

        _mockOrderService.Setup(s => s.GetOrderByIdAsync(10)).ReturnsAsync(order);

        // Act
        var result = await _controller.GetById(10);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var returned = Assert.IsType<PharmacyOrderResponse>(okResult.Value);
        Assert.Equal("ORD-010", returned.OrderNumber);
    }

    [Fact]
    public async Task GetById_NonExistentId_ReturnsNotFound()
    {
        // Arrange
        _mockOrderService.Setup(s => s.GetOrderByIdAsync(999)).ReturnsAsync((PharmacyOrderResponse?)null);

        // Act
        var result = await _controller.GetById(999);

        // Assert
        Assert.IsType<NotFoundObjectResult>(result.Result);
    }

    [Fact]
    public async Task Create_ValidRequest_ReturnsCreatedAtAction()
    {
        // Arrange
        var request = new CreatePharmacyOrderRequest
        {
            PatientId = 5,
            CustomerName = "Ruwan Bandara",
            CustomerEmail = "ruwan@example.com",
            DeliveryAddress = "Colombo 03",
            PaymentMethod = "CashOnDelivery",
            Items = new List<CreatePharmacyOrderItemRequest>
            {
                new() { MedicineId = 1, Quantity = 2 }
            }
        };

        var created = new PharmacyOrderResponse
        {
            Id = 100,
            OrderNumber = "ORD-100",
            CustomerName = "Ruwan Bandara",
            TotalAmount = 1200,
            Status = "PendingVerification"
        };

        _mockOrderService.Setup(s => s.CreateOrderAsync(request)).ReturnsAsync(created);

        // Act
        var result = await _controller.Create(request);

        // Assert
        var createdResult = Assert.IsType<CreatedAtActionResult>(result.Result);
        var response = Assert.IsType<PharmacyOrderResponse>(createdResult.Value);
        Assert.Equal(100, response.Id);
        Assert.Equal("ORD-100", response.OrderNumber);
    }

    [Fact]
    public async Task UpdateStatus_ExistingOrder_ReturnsUpdatedOrder()
    {
        // Arrange
        var request = new UpdatePharmacyOrderStatusRequest
        {
            Status = "Dispatched",
            AdminNote = "Handed over to courier"
        };

        var updated = new PharmacyOrderResponse
        {
            Id = 50,
            OrderNumber = "ORD-050",
            CustomerName = "Kamal Gunaratne",
            Status = "Dispatched"
        };

        _mockOrderService.Setup(s => s.UpdateOrderStatusAsync(50, request)).ReturnsAsync(updated);

        // Act
        var result = await _controller.UpdateStatus(50, request);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var response = Assert.IsType<PharmacyOrderResponse>(okResult.Value);
        Assert.Equal("Dispatched", response.Status);
    }

    [Fact]
    public async Task Delete_ExistingOrder_ReturnsNoContent()
    {
        // Arrange
        _mockOrderService.Setup(s => s.DeleteOrderAsync(25)).ReturnsAsync(true);

        // Act
        var result = await _controller.Delete(25);

        // Assert
        Assert.IsType<NoContentResult>(result);
    }
}
