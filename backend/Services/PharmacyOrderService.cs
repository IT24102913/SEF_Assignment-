using HealthBridge.Api.Agents;
using HealthBridge.Api.Data;
using HealthBridge.Api.DTOs.Pharmacy;
using HealthBridge.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace HealthBridge.Api.Services;

public class PharmacyOrderService : IPharmacyOrderService
{
    private readonly ApplicationDbContext _context;
    private readonly PrescriptionSafetyAgent _safetyAgent;

    public PharmacyOrderService(ApplicationDbContext context, PrescriptionSafetyAgent safetyAgent)
    {
        _context = context;
        _safetyAgent = safetyAgent;
    }

    public async Task<IEnumerable<PharmacyOrderResponse>> GetAllOrdersAsync()
    {
        var orders = await _context.PharmacyOrders
            .Include(o => o.Items)
            .AsNoTracking()
            .OrderByDescending(o => o.CreatedAt)
            .ToListAsync();

        return orders.Select(MapToPharmacyOrderResponse);
    }

    public async Task<PharmacyOrderResponse?> GetOrderByIdAsync(int id)
    {
        var order = await _context.PharmacyOrders
            .Include(o => o.Items)
            .AsNoTracking()
            .FirstOrDefaultAsync(o => o.Id == id);

        return order == null ? null : MapToPharmacyOrderResponse(order);
    }

    public async Task<IEnumerable<PharmacyOrderResponse>> GetOrdersByPatientIdAsync(int patientId)
    {
        var orders = await _context.PharmacyOrders
            .Include(o => o.Items)
            .Where(o => o.PatientId == patientId)
            .AsNoTracking()
            .OrderByDescending(o => o.CreatedAt)
            .ToListAsync();

        return orders.Select(MapToPharmacyOrderResponse);
    }

    public async Task<PharmacyOrderResponse> CreateOrderAsync(CreatePharmacyOrderRequest request)
    {
        bool hasPrescription = !string.IsNullOrWhiteSpace(request.PrescriptionImageUrl);
        bool hasItems = request.Items != null && request.Items.Any();

        if (!hasItems && !hasPrescription)
        {
            throw new ArgumentException("Order must contain at least one medicine item or an uploaded prescription photo.");
        }

        var orderNumber = $"ORD-{DateTime.UtcNow:yyyyMMdd}-{Random.Shared.Next(1000, 9999)}";
        decimal totalAmount = 0;

        var orderItems = new List<PharmacyOrderItem>();
        bool hasRxItem = false;

        if (hasItems)
        {
            foreach (var itemReq in request.Items!)
            {
                var medicine = await _context.Medicines.FindAsync(itemReq.MedicineId);
                bool medicineFoundInDb = medicine != null;
                if (medicine == null)
                {
                    medicine = await _context.Medicines.FirstOrDefaultAsync();
                    if (medicine == null)
                    {
                        throw new KeyNotFoundException($"Medicine with ID {itemReq.MedicineId} was not found.");
                    }
                }

                if (medicineFoundInDb && medicine.RequiresPrescription)
                {
                    hasRxItem = true;
                }

                if (medicine.StockQuantity < itemReq.Quantity)
                {
                    throw new InvalidOperationException($"Insufficient stock for '{medicine.Name}'. Available: {medicine.StockQuantity}.");
                }

                medicine.StockQuantity -= itemReq.Quantity;

                var subtotal = medicine.Price * itemReq.Quantity;
                totalAmount += subtotal;

                orderItems.Add(new PharmacyOrderItem
                {
                    MedicineId = medicine.Id,
                    MedicineName = medicine.Name,
                    UnitPrice = medicine.Price,
                    Quantity = itemReq.Quantity,
                    Subtotal = subtotal
                });
            }
        }

        int? patientId = request.PatientId;
        if (patientId.HasValue)
        {
            var userExists = await _context.Users.AnyAsync(u => u.Id == patientId.Value);
            if (!userExists)
            {
                patientId = null;
            }
        }

        if (!patientId.HasValue && !string.IsNullOrWhiteSpace(request.CustomerEmail))
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == request.CustomerEmail.Trim().ToLower());
            if (user != null)
            {
                patientId = user.Id;
            }
        }

        var initialStatus = (hasRxItem || hasPrescription) 
            ? "PendingVerification" 
            : "Confirmed";

        var order = new PharmacyOrder
        {
            OrderNumber = orderNumber,
            PatientId = patientId,
            CustomerName = request.CustomerName.Trim(),
            CustomerEmail = request.CustomerEmail.Trim().ToLowerInvariant(),
            CustomerPhone = request.CustomerPhone?.Trim(),
            DeliveryAddress = request.DeliveryAddress?.Trim(),
            PaymentMethod = request.PaymentMethod,
            TotalAmount = totalAmount,
            Status = initialStatus,
            PrescriptionImageUrl = request.PrescriptionImageUrl?.Trim(),
            DaysSupply = request.DaysSupply,
            CreatedAt = DateTime.UtcNow,
            Items = orderItems
        };

        _context.PharmacyOrders.Add(order);

        // Run Prescription Safety Agent validation
        var patientHistory = await _context.PharmacyOrders
            .Include(o => o.Items)
            .Where(o => (order.PatientId.HasValue && o.PatientId == order.PatientId) || o.CustomerEmail == order.CustomerEmail)
            .ToListAsync();

        var safetyResult = _safetyAgent.EvaluateOrderSafety(order, patientHistory);
        order.PrescriptionHash = _safetyAgent.GeneratePrescriptionHash(order.PrescriptionImageUrl);
        order.SafetyRiskScore = safetyResult.RiskScore;
        order.SafetyFlags = System.Text.Json.JsonSerializer.Serialize(safetyResult.Flags);
        order.SafetyRecommendedAction = safetyResult.RecommendedAction;
        order.SafetyValidatedAt = DateTime.UtcNow;

        if (hasPrescription)
        {
            var rxSubmission = new PrescriptionSubmission
            {
                PrescriptionCode = "RX-" + orderNumber,
                PatientId = patientId,
                PatientName = order.CustomerName,
                PatientEmail = order.CustomerEmail,
                ImageUrl = order.PrescriptionImageUrl,
                Notes = $"Order #{orderNumber} - {request.DaysSupply ?? 7} Days Supply Requested",
                Status = "Pending",
                SubmittedAt = DateTime.UtcNow
            };
            _context.PrescriptionSubmissions.Add(rxSubmission);
        }

        await _context.SaveChangesAsync();

        return MapToPharmacyOrderResponse(order);
    }

    public async Task<PrescriptionSafetyResponse?> ValidateOrderSafetyAsync(int id)
    {
        var order = await _context.PharmacyOrders
            .Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.Id == id);

        if (order == null) return null;

        var patientHistory = await _context.PharmacyOrders
            .Include(o => o.Items)
            .Where(o => (order.PatientId.HasValue && o.PatientId == order.PatientId) || o.CustomerEmail == order.CustomerEmail)
            .ToListAsync();

        var result = _safetyAgent.EvaluateOrderSafety(order, patientHistory);

        order.PrescriptionHash = _safetyAgent.GeneratePrescriptionHash(order.PrescriptionImageUrl);
        order.SafetyRiskScore = result.RiskScore;
        order.SafetyFlags = System.Text.Json.JsonSerializer.Serialize(result.Flags);
        order.SafetyRecommendedAction = result.RecommendedAction;
        order.SafetyValidatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return result;
    }

    public async Task<PharmacyOrderResponse?> UpdateOrderStatusAsync(int id, UpdatePharmacyOrderStatusRequest request)
    {
        var order = await _context.PharmacyOrders
            .Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.Id == id);

        if (order == null) return null;

        order.Status = request.Status.Trim();
        if (!string.IsNullOrWhiteSpace(request.AdminNote))
        {
            order.AdminNote = request.AdminNote.Trim();
        }

        if (request.TotalAmount.HasValue && request.TotalAmount.Value >= 0)
        {
            order.TotalAmount = request.TotalAmount.Value;
        }

        if (request.PatientConfirmed.HasValue)
        {
            order.PatientConfirmed = request.PatientConfirmed.Value;
        }
        else if (request.Status.Trim().Equals("Confirmed", StringComparison.OrdinalIgnoreCase))
        {
            order.PatientConfirmed = true;
        }

        order.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return MapToPharmacyOrderResponse(order);
    }

    public async Task<bool> DeleteOrderAsync(int id)
    {
        var order = await _context.PharmacyOrders
            .Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.Id == id);
            
        if (order == null) return false;

        if (order.Items != null && order.Items.Any())
        {
            _context.PharmacyOrderItems.RemoveRange(order.Items);
        }

        _context.PharmacyOrders.Remove(order);
        await _context.SaveChangesAsync();
        return true;
    }

    private static PharmacyOrderResponse MapToPharmacyOrderResponse(PharmacyOrder order)
    {
        var flags = new List<string>();
        if (!string.IsNullOrWhiteSpace(order.SafetyFlags))
        {
            try
            {
                flags = System.Text.Json.JsonSerializer.Deserialize<List<string>>(order.SafetyFlags) ?? new List<string>();
            }
            catch
            {
                flags = order.SafetyFlags.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).ToList();
            }
        }

        return new PharmacyOrderResponse
        {
            Id = order.Id,
            OrderNumber = order.OrderNumber,
            PatientId = order.PatientId,
            CustomerName = order.CustomerName,
            CustomerEmail = order.CustomerEmail,
            CustomerPhone = order.CustomerPhone,
            DeliveryAddress = order.DeliveryAddress,
            TotalAmount = order.TotalAmount,
            PaymentMethod = order.PaymentMethod,
            Status = order.Status,
            PrescriptionImageUrl = order.PrescriptionImageUrl,
            DaysSupply = order.DaysSupply,
            AdminNote = order.AdminNote,
            PatientConfirmed = order.PatientConfirmed,
            CreatedAt = order.CreatedAt,
            PrescriptionHash = order.PrescriptionHash,
            SafetyRiskScore = order.SafetyRiskScore,
            SafetyFlags = flags,
            SafetyRecommendedAction = order.SafetyRecommendedAction,
            SafetyValidatedAt = order.SafetyValidatedAt,
            Items = order.Items.Select(i => new PharmacyOrderItemResponse
            {
                Id = i.Id,
                MedicineId = i.MedicineId,
                MedicineName = i.MedicineName,
                UnitPrice = i.UnitPrice,
                Quantity = i.Quantity,
                Subtotal = i.Subtotal
            }).ToList()
        };
    }
}
