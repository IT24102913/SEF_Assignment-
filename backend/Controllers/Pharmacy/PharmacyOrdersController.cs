using HealthBridge.Api.DTOs.Pharmacy;
using HealthBridge.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace HealthBridge.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[IgnoreAntiforgeryToken]
public class PharmacyOrdersController : ControllerBase
{
    private readonly IPharmacyOrderService _orderService;

    public PharmacyOrdersController(IPharmacyOrderService orderService)
    {
        _orderService = orderService;
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
}
