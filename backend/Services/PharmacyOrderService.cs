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
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<PharmacyOrderService> _logger;
    private readonly IEmailService _emailService;

    public PharmacyOrderService(
        ApplicationDbContext context,
        PrescriptionSafetyAgent safetyAgent,
        IServiceScopeFactory scopeFactory,
        ILogger<PharmacyOrderService> logger,
        IEmailService emailService)
    {
        _context = context;
        _safetyAgent = safetyAgent;
        _scopeFactory = scopeFactory;
        _logger = logger;
        _emailService = emailService;
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
                Medicine? medicine = null;
                if (itemReq.MedicineId > 0)
                {
                    medicine = await _context.Medicines.FindAsync(itemReq.MedicineId);
                }

                if (medicine == null && !string.IsNullOrWhiteSpace(itemReq.MedicineName))
                {
                    string cleanName = itemReq.MedicineName.Replace("(Card)", "", StringComparison.OrdinalIgnoreCase).Trim();
                    medicine = await _context.Medicines.FirstOrDefaultAsync(m => EF.Functions.ILike(m.Name, cleanName) || EF.Functions.ILike(m.Name, itemReq.MedicineName.Trim()));
                }

                string unitType = !string.IsNullOrWhiteSpace(itemReq.UnitType) ? itemReq.UnitType.Trim() : "Pill";
                bool isCard = unitType.Equals("Card", StringComparison.OrdinalIgnoreCase) ||
                              (!string.IsNullOrWhiteSpace(itemReq.MedicineName) && itemReq.MedicineName.Contains("(Card)", StringComparison.OrdinalIgnoreCase));

                if (isCard)
                {
                    unitType = "Card";
                }

                decimal basePrice = medicine != null ? medicine.Price : 0;
                decimal unitPrice = (itemReq.Price.HasValue && itemReq.Price.Value > 0)
                    ? itemReq.Price.Value
                    : (itemReq.UnitPrice.HasValue && itemReq.UnitPrice.Value > 0)
                        ? itemReq.UnitPrice.Value
                        : isCard
                            ? (basePrice * (medicine?.PillsPerCard > 0 ? medicine.PillsPerCard : 10))
                            : basePrice;

                if (medicine != null)
                {
                    if (medicine.RequiresPrescription)
                    {
                        hasRxItem = true;
                    }

                    int pillsPerCard = medicine.PillsPerCard > 0 ? medicine.PillsPerCard : 10;
                    int unitsToDeduct = isCard ? itemReq.Quantity * pillsPerCard : itemReq.Quantity;

                    medicine.StockQuantity = Math.Max(0, medicine.StockQuantity - unitsToDeduct);
                    medicine.UpdatedAt = DateTime.UtcNow;
                    _context.Entry(medicine).State = EntityState.Modified;
                }

                var subtotal = unitPrice * itemReq.Quantity;
                totalAmount += subtotal;

                string medicineName = !string.IsNullOrWhiteSpace(itemReq.MedicineName)
                    ? itemReq.MedicineName.Trim()
                    : medicine.Name;

                if (isCard && !medicineName.EndsWith("(Card)", StringComparison.OrdinalIgnoreCase))
                {
                    medicineName = $"{medicineName} (Card)";
                }

                orderItems.Add(new PharmacyOrderItem
                {
                    MedicineId = medicine.Id,
                    MedicineName = medicineName,
                    UnitPrice = unitPrice,
                    Quantity = itemReq.Quantity,
                    Subtotal = subtotal,
                    UnitType = unitType
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

        string effectiveEmail = request.CustomerEmail?.Trim().ToLowerInvariant() ?? "";
        bool isDummyEmail = string.IsNullOrWhiteSpace(effectiveEmail) || effectiveEmail.Contains("healthbridge.lk");

        if (!isDummyEmail)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == effectiveEmail);
            if (user != null)
            {
                if (!patientId.HasValue) patientId = user.Id;
                if (user.IsPharmacyBlocked)
                {
                    throw new InvalidOperationException("Your account has been suspended from Pharmacy & Prescription services by administration due to a violation.");
                }
            }
        }
        else if (patientId.HasValue)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == patientId.Value);
            if (user != null)
            {
                if (user.IsPharmacyBlocked)
                {
                    throw new InvalidOperationException("Your account has been suspended from Pharmacy & Prescription services by administration due to a violation.");
                }
                if (!string.IsNullOrWhiteSpace(user.Email) && !user.Email.Contains("healthbridge.lk"))
                {
                    effectiveEmail = user.Email.Trim().ToLowerInvariant();
                }
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
            CustomerEmail = effectiveEmail,
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

        // ── Save order immediately so patient gets instant response ──────────
        await _context.SaveChangesAsync();
        var savedOrderId = order.Id;
        var savedOrderResponse = MapToPharmacyOrderResponse(order);

        // ── Run AI safety scan in the background (non-blocking) ──────────────
        // The order is already saved; the AI will update the safety fields once done.
        _ = Task.Run(async () =>
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var ctx = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
                var agent = scope.ServiceProvider.GetRequiredService<PrescriptionSafetyAgent>();

                var bgOrder = await ctx.PharmacyOrders
                    .Include(o => o.Items)
                    .FirstOrDefaultAsync(o => o.Id == savedOrderId);

                if (bgOrder == null) return;

                var patientHistory = await ctx.PharmacyOrders
                    .Include(o => o.Items)
                    .Where(o => o.Id != savedOrderId &&
                        ((bgOrder.PatientId.HasValue && o.PatientId == bgOrder.PatientId) ||
                          o.CustomerEmail == bgOrder.CustomerEmail))
                    .ToListAsync();

                var safetyResult = await agent.EvaluateOrderSafetyAsync(bgOrder, patientHistory);
                bgOrder.PrescriptionHash = agent.GeneratePrescriptionHash(bgOrder.PrescriptionImageUrl);
                bgOrder.SafetyRiskScore = safetyResult.RiskScore;
                bgOrder.SafetyFlags = System.Text.Json.JsonSerializer.Serialize(safetyResult.Flags);
                bgOrder.SafetyRecommendedAction = safetyResult.RecommendedAction;
                bgOrder.SafetyValidatedAt = DateTime.UtcNow;

                await ctx.SaveChangesAsync();
                _logger.LogInformation("[PharmacyOrderService] Background AI safety scan complete for Order #{OrderId}", savedOrderId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[PharmacyOrderService] Background AI safety scan failed for Order #{OrderId}", savedOrderId);
            }
        });

        // ── Send instant order confirmation email notification to patient ─────
        try
        {
            _logger.LogInformation("[PharmacyOrderService] Sending order confirmation email to '{Email}' for Order #{OrderNumber}", savedOrderResponse.CustomerEmail, savedOrderResponse.OrderNumber);
            await _emailService.SendPharmacyOrderNotificationAsync(
                savedOrderResponse.CustomerEmail,
                savedOrderResponse.CustomerName,
                savedOrderResponse.OrderNumber,
                savedOrderResponse.Status,
                savedOrderResponse.TotalAmount,
                savedOrderResponse.PaymentMethod,
                savedOrderResponse.DeliveryAddress,
                savedOrderResponse.Items
            );
            _logger.LogInformation("[PharmacyOrderService] ✅ Order confirmation email sent successfully for Order #{OrderNumber}", savedOrderResponse.OrderNumber);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[PharmacyOrderService] ❌ Failed to send order placed email to '{Email}' for Order #{OrderNumber}", savedOrderResponse.CustomerEmail, savedOrderResponse.OrderNumber);
        }

        return savedOrderResponse;
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
        var response = MapToPharmacyOrderResponse(order);

        // ── Send order status update email notification to patient ───────────
        try
        {
            _logger.LogInformation("[PharmacyOrderService] Sending status update email to '{Email}' for Order #{OrderNumber} Status={Status}", response.CustomerEmail, response.OrderNumber, response.Status);
            await _emailService.SendPharmacyOrderNotificationAsync(
                response.CustomerEmail,
                response.CustomerName,
                response.OrderNumber,
                response.Status,
                response.TotalAmount,
                response.PaymentMethod,
                response.DeliveryAddress,
                response.Items,
                response.AdminNote
            );
            _logger.LogInformation("[PharmacyOrderService] ✅ Order status update email sent successfully for Order #{OrderNumber}", response.OrderNumber);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[PharmacyOrderService] ❌ Failed to send status update email to '{Email}' for Order #{OrderNumber}", response.CustomerEmail, response.OrderNumber);
        }

        return response;
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
                Subtotal = i.Subtotal,
                UnitType = !string.IsNullOrWhiteSpace(i.UnitType)
                    ? i.UnitType
                    : (i.MedicineName.Contains("(Card)", StringComparison.OrdinalIgnoreCase) ? "Card" : "Pill")
            }).ToList()
        };
    }
}
