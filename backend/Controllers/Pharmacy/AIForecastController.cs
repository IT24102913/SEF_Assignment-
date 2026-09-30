using HealthBridge.Api.Agents;
using HealthBridge.Api.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HealthBridge.Api.Controllers.Pharmacy;

[ApiController]
[Route("api/[controller]")]
[IgnoreAntiforgeryToken]
public class AIForecastController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly InventoryForecastingAgent _agent;
    private readonly ILogger<AIForecastController> _logger;

    public AIForecastController(
        ApplicationDbContext context,
        InventoryForecastingAgent agent,
        ILogger<AIForecastController> logger)
    {
        _context = context;
        _agent = agent;
        _logger = logger;
    }

    [HttpGet]
    [ProducesResponseType(typeof(AIEnhancedForecastResponse), 200)]
    public async Task<ActionResult<AIEnhancedForecastResponse>> GetForecast()
    {
        try
        {
            var medicines = await _context.Medicines
                .Include(m => m.Category)
                .AsNoTracking()
                .ToListAsync();

            var orders = await _context.PharmacyOrders
                .Include(o => o.Items)
                    .ThenInclude(i => i.Medicine)
                        .ThenInclude(m => m.Category)
                .Where(o => o.CreatedAt >= DateTime.UtcNow.AddDays(-90))
                .AsNoTracking()
                .ToListAsync();

            // Base forecast (existing math)
            var baseForecast = _agent.GenerateForecast(medicines, orders, 30);

            // AI enhancement
            var criticalItems = baseForecast.StockoutPredictions
                .Where(p => p.Status == "CRITICAL")
                .Take(5)
                .ToList();

            var seasonalInsights = await _agent.GetSeasonalInsightsAsync(criticalItems);
            var aiRecommendations = await _agent.GetOverallRecommendationsAsync(
                baseForecast.CriticalStockCount,
                baseForecast.StockoutPredictions.Count(p => p.Status == "LOW"),
                baseForecast.TopCategory);

            // Apply AI Seasonal Multipliers to Multi-Period Demand Predictions
            foreach (var pred in baseForecast.StockoutPredictions)
            {
                var insight = seasonalInsights.FirstOrDefault(i => i.MedicineName == pred.MedicineName);
                if (insight != null && insight.SeasonalMultiplier > 1.0)
                {
                    pred.SeasonalMultiplier = insight.SeasonalMultiplier;
                    pred.SeasonalFactor = insight.SeasonalFactor;
                    pred.PredictedDemand30Days = (int)Math.Ceiling(pred.PredictedDemand30Days * insight.SeasonalMultiplier);
                    pred.PredictedDemand60Days = (int)Math.Ceiling(pred.PredictedDemand60Days * insight.SeasonalMultiplier);
                    pred.PredictedDemand90Days = (int)Math.Ceiling(pred.PredictedDemand90Days * insight.SeasonalMultiplier);
                }
            }

            // Merge into enhanced response
            var enhanced = new AIEnhancedForecastResponse
            {
                ProjectedMonthlyRevenue = baseForecast.ProjectedMonthlyRevenue,
                ProjectedMonthlyRevenueLabel = baseForecast.ProjectedMonthlyRevenueLabel,
                CriticalStockCount = baseForecast.CriticalStockCount,
                ExpiryRiskCount = baseForecast.ExpiryRiskCount,
                TopCategory = baseForecast.TopCategory,
                HasSufficientData = baseForecast.HasSufficientData,
                StockoutPredictions = baseForecast.StockoutPredictions,
                ExpiryRisks = baseForecast.ExpiryRisks,
                HighDemandCategories = baseForecast.HighDemandCategories,
                SeasonalInsights = seasonalInsights,
                AIRecommendations = aiRecommendations,
                AIInsightsAvailable = seasonalInsights.Any() || aiRecommendations.Any(),
                GeneratedAt = DateTime.UtcNow
            };

            return Ok(enhanced);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[AIForecastController] Forecast failed");
            return StatusCode(500, new { message = "Forecast failed", error = ex.Message });
        }
    }

    [HttpPost("bulk-order")]
    public ActionResult<object> BulkOrder([FromBody] List<int> medicineIds)
    {
        return Ok(new { message = "Bulk order not yet implemented", count = medicineIds?.Count ?? 0 });
    }
}
