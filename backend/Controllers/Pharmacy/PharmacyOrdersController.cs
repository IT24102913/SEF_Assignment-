using HealthBridge.Api.DTOs.Pharmacy;
using HealthBridge.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Linq;

namespace HealthBridge.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[IgnoreAntiforgeryToken]
public class PharmacyOrdersController : ControllerBase
{
    private readonly IPharmacyOrderService _orderService;
    private readonly IPatientAnalyticsService _analyticsService;
    private readonly IEmailService _emailService;

    public PharmacyOrdersController(IPharmacyOrderService orderService, IPatientAnalyticsService analyticsService, IEmailService emailService)
    {
        _orderService = orderService;
        _analyticsService = analyticsService;
        _emailService = emailService;
    }

    /// <summary>
    /// Gets all pharmacy orders.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<PharmacyOrderResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IEnumerable<PharmacyOrderResponse>>> GetAll()
    {
        var orders = await _orderService.GetAllOrdersAsync();
        return Ok(orders);
    }

    /// <summary>
    /// Gets an order by ID.
    /// </summary>
    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(PharmacyOrderResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PharmacyOrderResponse>> GetById(int id)
    {
        var order = await _orderService.GetOrderByIdAsync(id);
        if (order == null)
        {
            return NotFound(new { message = $"Pharmacy Order with ID {id} was not found." });
        }
        return Ok(order);
    }

    /// <summary>
    /// Places a new pharmacy order.
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(PharmacyOrderResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PharmacyOrderResponse>> Create([FromBody] CreatePharmacyOrderRequest request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        try
        {
            var created = await _orderService.CreateOrderAsync(request);
            return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Updates order status (Confirmed, Dispatched, Delivered, Cancelled).
    /// </summary>
    [HttpPut("{id:int}/status")]
    [ProducesResponseType(typeof(PharmacyOrderResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PharmacyOrderResponse>> UpdateStatus(int id, [FromBody] UpdatePharmacyOrderStatusRequest request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var updated = await _orderService.UpdateOrderStatusAsync(id, request);
        if (updated == null)
        {
            return NotFound(new { message = $"Pharmacy Order with ID {id} was not found." });
        }

        return Ok(updated);
    }

    /// <summary>
    /// Validates prescription safety using PrescriptionSafetyAgent.
    /// </summary>
    [HttpPost("{id:int}/validate-safety")]
    [ProducesResponseType(typeof(PrescriptionSafetyResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PrescriptionSafetyResponse>> ValidateSafety(int id)
    {
        var result = await _orderService.ValidateOrderSafetyAsync(id);
        if (result == null)
        {
            return NotFound(new { message = $"Pharmacy Order with ID {id} was not found." });
        }
        return Ok(result);
    }

    /// <summary>
    /// Deletes an order by ID.
    /// </summary>
    [HttpDelete("{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(int id)
    {
        var deleted = await _orderService.DeleteOrderAsync(id);
        if (!deleted)
        {
            return NotFound(new { message = $"Pharmacy Order with ID {id} was not found." });
        }

        return NoContent();
    }

    /// <summary>
    /// Gets full abuse analytics for a patient by email.
    /// </summary>
    [HttpGet("patients/{email}/analytics")]
    [ProducesResponseType(typeof(PatientAnalyticsResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PatientAnalyticsResponse>> GetPatientAnalytics(string email)
    {
        var result = await _analyticsService.GetPatientAnalyticsAsync(email);
        if (result == null)
            return NotFound(new { message = $"No orders found for patient: {email}" });
        return Ok(result);
    }

    /// <summary>
    /// Gets a summary list of all patients who have violated orders.
    /// </summary>
    [HttpGet("violated-patients")]
    [ProducesResponseType(typeof(List<ViolatedPatientSummaryDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<List<ViolatedPatientSummaryDto>>> GetViolatedPatients()
    {
        var result = await _analyticsService.GetViolatedPatientsAsync();
        return Ok(result);
    }

    /// <summary>
    /// Sends a POS sales report to a management recipient email.
    /// </summary>
    [HttpPost("send-email-report")]
    public async Task<IActionResult> SendEmailReport([FromBody] SendSalesReportRequest request)
    {
        if (!ModelState.IsValid || string.IsNullOrWhiteSpace(request.RecipientEmail))
        {
            return BadRequest(new { message = "Recipient email address is required." });
        }

        await _emailService.SendSalesReportAsync(
            request.RecipientEmail,
            request.Note ?? "",
            request.TotalRevenue,
            request.TotalOrders,
            request.ReportDate,
            request.Items
        );

        return Ok(new { message = $"Sales report sent successfully to {request.RecipientEmail}" });
    }

    /// <summary>
    /// Blocks or unblocks a patient's access to pharmacy and prescription services.
    /// </summary>
    [HttpPost("block-user")]
    public async Task<IActionResult> ToggleBlockUser([FromBody] BlockUserRequest request, [FromServices] HealthBridge.Api.Data.ApplicationDbContext context)
    {
        if (string.IsNullOrWhiteSpace(request.Email))
            return BadRequest(new { message = "Patient email is required." });

        var normEmail = request.Email.Trim().ToLowerInvariant();
        var user = await context.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == normEmail);
        if (user == null)
        {
            return NotFound(new { message = $"Patient with email {request.Email} not found." });
        }

        user.IsPharmacyBlocked = request.Block;
        user.BlockReason = request.Reason ?? "Prescription anti-abuse policy violation";
        await context.SaveChangesAsync();

        return Ok(new
        {
            email = user.Email,
            isPharmacyBlocked = user.IsPharmacyBlocked,
            blockReason = user.BlockReason,
            message = user.IsPharmacyBlocked
                ? $"Patient account {user.Email} pharmacy & prescription access has been BLOCKED."
                : $"Patient account {user.Email} pharmacy & prescription access has been UNBLOCKED."
        });
    }

    /// <summary>
    /// Returns a list of emails of all patients currently blocked from pharmacy services.
    /// </summary>
    [HttpGet("blocked-users")]
    public async Task<ActionResult<List<string>>> GetBlockedUsers([FromServices] HealthBridge.Api.Data.ApplicationDbContext context)
    {
        var blockedEmails = await context.Users
            .Where(u => u.IsPharmacyBlocked)
            .Select(u => u.Email)
            .ToListAsync();
        return Ok(blockedEmails);
    }

    /// <summary>
    /// Checks if a specific patient is blocked from pharmacy & prescription access.
    /// </summary>
    [HttpGet("check-blocked/{email}")]
    public async Task<IActionResult> CheckBlockedStatus(string email, [FromServices] HealthBridge.Api.Data.ApplicationDbContext context)
    {
        if (string.IsNullOrWhiteSpace(email))
            return BadRequest(new { message = "Email is required." });

        var normEmail = email.Trim().ToLowerInvariant();
        var user = await context.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == normEmail);
        if (user == null)
        {
            return Ok(new { isPharmacyBlocked = false, reason = (string?)null });
        }

        return Ok(new
        {
            isPharmacyBlocked = user.IsPharmacyBlocked,
            reason = user.BlockReason
        });
    }
}

public class BlockUserRequest
{
    public string Email { get; set; } = string.Empty;
    public bool Block { get; set; } = true;
    public string? Reason { get; set; }
}

