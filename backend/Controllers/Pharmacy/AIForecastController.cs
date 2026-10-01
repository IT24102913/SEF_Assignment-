using HealthBridge.Api.Agents;
using HealthBridge.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HealthBridge.Api.Controllers.Pharmacy;

[ApiController]
[Route("api/[controller]")]
[IgnoreAntiforgeryToken]
[AllowAnonymous]
public class AIForecastController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly InventoryForecastingAgent _forecastingAgent;
    private readonly ILogger<AIForecastController> _logger;

    public AIForecastController(
        ApplicationDbContext context,
        InventoryForecastingAgent forecastingAgent,
        ILogger<AIForecastController> logger)
    {
        _context = context;
        _forecastingAgent = forecastingAgent;
        _logger = logger;
    }

    /// <summary>
    /// Gets AI-enhanced inventory demand forecasting, stockout risk alerts, and seasonal advisory.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(AIForecastResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<AIForecastResponse>> GetForecast()
    {
        try
        {
            var medicines = await _context.Medicines
                .Include(m => m.Category)
                .AsNoTracking()
                .ToListAsync();

            var orders = await _context.PharmacyOrders
                .Include(o => o.Items!)
                    .ThenInclude(i => i.Medicine!)
                        .ThenInclude(m => m.Category!)
                .AsNoTracking()
                .ToListAsync();

            var forecast = _forecastingAgent.GenerateForecast(medicines, orders);

            // Fetch Gemini AI Seasonal Insights and Action Item Recommendations
            try
            {
                var criticalItems = forecast.StockoutPredictions
                    .Where(s => s.Status == "CRITICAL" || s.Status == "LOW" || s.TotalSoldPast30Days > 0)
                    .OrderBy(s => s.DaysUntilEmpty ?? 999)
                    .ToList();

                var seasonalInsights = await _forecastingAgent.GetSeasonalInsightsAsync(criticalItems);
                var recommendations = await _forecastingAgent.GetOverallRecommendationsAsync(
                    forecast.CriticalStockCount,
                    forecast.StockoutPredictions.Count(s => s.Status == "LOW" || s.Status == "WARNING"),
                    forecast.TopCategory
                );

                forecast.SeasonalInsights = seasonalInsights;
                forecast.AIRecommendations = recommendations;
                forecast.AIInsightsAvailable = seasonalInsights != null && seasonalInsights.Any();
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "[AIForecastController] AI seasonal insight generation error; falling back to rule engine.");
                forecast.AIInsightsAvailable = false;
            }

            return Ok(forecast);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[AIForecastController] Error generating forecast");
            return StatusCode(500, new { message = "An error occurred while generating AI inventory forecast." });
        }
    }
}
