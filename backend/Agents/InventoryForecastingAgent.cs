using System.Text;
using System.Text.Json;
using HealthBridge.Api.Models;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;

namespace HealthBridge.Api.Agents;

public class HistoricalSalesPoint
{
    public string Date { get; set; } = "";
    public int QuantitySold { get; set; }
}

public class StockoutPredictionResult
{
    public int MedicineId { get; set; }
    public string MedicineName { get; set; } = string.Empty;
    public string CategoryName { get; set; } = string.Empty;
    public int CurrentStock { get; set; }
    public int TotalSoldPast30Days { get; set; }
    public double AverageDailySales { get; set; }
    public int? DaysUntilEmpty { get; set; }
    public string Status { get; set; } = "HEALTHY"; // CRITICAL, LOW, HEALTHY, WARNING, OVERSTOCK, OUT OF STOCK
    public string ForecastNote { get; set; } = string.Empty;

    // AI & Advanced Forecast fields
    public string? AIInsight { get; set; }
    public string Trend { get; set; } = "STABLE"; // INCREASING, DECREASING, STABLE
    public int ReorderPoint { get; set; }
    public int SuggestedOrderQty { get; set; }
    public decimal UnitPrice { get; set; }
    public int PredictedDemand7Days { get; set; }
    public int PredictedDemand30Days { get; set; }
    public int PredictedDemand60Days { get; set; }
    public int PredictedDemand90Days { get; set; }
    public double TrendMultiplier { get; set; } = 1.0;
    public double SeasonalMultiplier { get; set; } = 1.0;
    public string? SeasonalFactor { get; set; }
    public DateTime? OrderByDate { get; set; }
    public string OrderUrgency { get; set; } = "NORMAL";
    public decimal ProjectedRevenue30Days { get; set; }
    public decimal ProjectedRevenue30DaysLower { get; set; }
    public decimal ProjectedRevenue30DaysUpper { get; set; }
    public decimal AtRiskRevenue { get; set; }
    public decimal AtRiskRevenueLower { get; set; }
    public decimal AtRiskRevenueUpper { get; set; }
    public List<HistoricalSalesPoint> HistoricalSales { get; set; } = new();
}

public class ExpiryRiskResult
{
    public int MedicineId { get; set; }
    public string MedicineName { get; set; } = string.Empty;
    public string CategoryName { get; set; } = string.Empty;
    public int StockQuantity { get; set; }
    public string? ExpiryDate { get; set; }
    public int DaysRemaining { get; set; }
    public string RiskLevel { get; set; } = "Normal"; // Critical, Warning, Normal
}

public class HighDemandCategoryResult
{
    public string CategoryName { get; set; } = string.Empty;
    public int UnitsSold { get; set; }
    public decimal Revenue { get; set; }
}

public class AISeasonalInsight
{
    public string MedicineName { get; set; } = "";
    public string Insight { get; set; } = "";
    public string Urgency { get; set; } = "LOW";
    public string Recommendation { get; set; } = "";
    public double Confidence { get; set; }
    public double SeasonalMultiplier { get; set; } = 1.0;
    public string? SeasonalFactor { get; set; }
}

public class AIForecastResponse
{
    public decimal ProjectedMonthlyRevenue { get; set; }
    public string ProjectedMonthlyRevenueLabel { get; set; } = "Rs. 0";
    public int CriticalStockCount { get; set; }
    public int ExpiryRiskCount { get; set; }
    public string TopCategory { get; set; } = "General";
    public bool HasSufficientData { get; set; }
    public List<StockoutPredictionResult> StockoutPredictions { get; set; } = new();
    public List<ExpiryRiskResult> ExpiryRisks { get; set; } = new();
    public List<HighDemandCategoryResult> HighDemandCategories { get; set; } = new();
    public List<AISeasonalInsight> SeasonalInsights { get; set; } = new();
    public List<string> AIRecommendations { get; set; } = new();
    public bool AIInsightsAvailable { get; set; }
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
}

public class AIEnhancedForecastResponse : AIForecastResponse
{
}

/// <summary>
/// AGENT 2 — AI Inventory & Sales Forecasting Agent
/// </summary>
public class InventoryForecastingAgent
{
    private static int _cacheVersion = 1;
    private readonly ILogger<InventoryForecastingAgent> _logger;
    private readonly IConfiguration _config;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly HttpClient _httpClient;
    private readonly IMemoryCache _cache;

    public void InvalidateForecastCache()
    {
        _cacheVersion++;
        _logger.LogInformation("[AIForecast] Cache invalidated — new version: {Version}", _cacheVersion);
    }

    public InventoryForecastingAgent(
        ILogger<InventoryForecastingAgent> logger,
        IConfiguration config,
        IHttpClientFactory httpClientFactory,
        IMemoryCache cache)
    {
        _logger = logger;
        _config = config;
        _httpClientFactory = httpClientFactory;
        _httpClient = httpClientFactory.CreateClient("GeminiClient");
        _cache = cache;
    }

    public AIForecastResponse GenerateForecast(IEnumerable<Medicine> medicinesList, IEnumerable<PharmacyOrder> ordersList, int periodDays = 30)
    {
        try
        {
            var medicines = medicinesList?.ToList() ?? new List<Medicine>();
            var orders = ordersList?.ToList() ?? new List<PharmacyOrder>();

            var fulfilledOrders = orders.Where(o =>
                o.Status == "Confirmed" || o.Status == "Dispatched" || o.Status == "Delivered" || o.Status == "Approved" || o.PatientConfirmed
            ).ToList();

            var unitsSoldMap = new Dictionary<int, int>();
            decimal totalRevenue = 0;
            var categorySales = new Dictionary<string, (int Units, decimal Rev)>();

            foreach (var order in fulfilledOrders)
            {
                totalRevenue += order.TotalAmount;
                if (order.Items != null)
                {
                    foreach (var item in order.Items)
                    {
                        if (!unitsSoldMap.ContainsKey(item.MedicineId))
                            unitsSoldMap[item.MedicineId] = 0;
                        unitsSoldMap[item.MedicineId] += item.Quantity;

                        var catName = item.Medicine?.Category?.Name ?? "General Pharmacy";
                        if (!categorySales.ContainsKey(catName))
                            categorySales[catName] = (0, 0m);

                        var current = categorySales[catName];
                        categorySales[catName] = (current.Units + item.Quantity, current.Rev + item.Subtotal);
                    }
                }
            }

            var now = DateTime.UtcNow;
            var stockoutPredictions = new List<StockoutPredictionResult>();

            foreach (var med in medicines)
            {
                int totalSold = unitsSoldMap.ContainsKey(med.Id) ? unitsSoldMap[med.Id] : 0;
                double avgDaily = periodDays > 0 ? Math.Round((double)totalSold / periodDays, 2) : 0;

                int? daysUntilEmpty = null;
                string status = "HEALTHY";
                string note = "";

                if (totalSold == 0 || avgDaily == 0)
                {
                    daysUntilEmpty = null;
                    status = "HEALTHY";
                    note = "Insufficient data for reliable forecast";
                }
                else
                {
                    daysUntilEmpty = (int)Math.Floor(med.StockQuantity / avgDaily);
                    if (daysUntilEmpty <= 7) status = "CRITICAL";
                    else if (daysUntilEmpty <= 30) status = "LOW";
                    else status = "HEALTHY";
                    note = $"{daysUntilEmpty} days of stock remaining at current burn rate";
                }

                // Trend computation
                var recent7 = fulfilledOrders
                    .Where(o => o.CreatedAt >= now.AddDays(-7))
                    .SelectMany(o => o.Items ?? new List<PharmacyOrderItem>())
                    .Where(i => i.MedicineId == med.Id)
                    .Sum(i => i.Quantity);

                var older23 = fulfilledOrders
                    .Where(o => o.CreatedAt >= now.AddDays(-30) && o.CreatedAt < now.AddDays(-7))
                    .SelectMany(o => o.Items ?? new List<PharmacyOrderItem>())
                    .Where(i => i.MedicineId == med.Id)
                    .Sum(i => i.Quantity);

                string trend = "STABLE";
                if (older23 > 0)
                {
                    double recentRate = recent7 / 7.0;
                    double olderRate = older23 / 23.0;
                    if (recentRate > olderRate * 1.15) trend = "INCREASING";
                    else if (recentRate < olderRate * 0.85) trend = "DECREASING";
                }

                double trendMultiplier = trend switch
                {
                    "INCREASING" => 1.20,
                    "DECREASING" => 0.85,
                    _ => 1.00
                };

                // Multi-period predictions
                int predicted7 = (int)Math.Ceiling(avgDaily * 7 * trendMultiplier);
                int predicted30 = (int)Math.Ceiling(avgDaily * 30 * trendMultiplier);
                int predicted60 = (int)Math.Ceiling(avgDaily * 60 * trendMultiplier);
                int predicted90 = (int)Math.Ceiling(avgDaily * 90 * trendMultiplier);

                // Reorder point & suggested qty
                int reorderPoint = (int)Math.Ceiling(avgDaily * 7);
                int suggestedQty = Math.Max(0, (int)Math.Ceiling(avgDaily * 30 - med.StockQuantity));
                suggestedQty = (int)Math.Ceiling(suggestedQty / 10.0) * 10;

                // Order by date & OrderUrgency logic (3-day lead time)
                DateTime? orderByDate = null;
                string orderUrgency = "NORMAL";
                if (daysUntilEmpty.HasValue)
                {
                    if (daysUntilEmpty.Value <= 3)
                    {
                        // Urgent — order TODAY
                        orderByDate = DateTime.UtcNow;
                    }
                    else
                    {
                        orderByDate = DateTime.UtcNow.AddDays(daysUntilEmpty.Value - 3);
                    }

                    if (daysUntilEmpty.Value == 0) orderUrgency = "EMERGENCY";
                    else if (daysUntilEmpty.Value <= 3) orderUrgency = "URGENT";
                    else if (daysUntilEmpty.Value <= 7) orderUrgency = "SOON";
                    else if (daysUntilEmpty.Value <= 30) orderUrgency = "PLANNED";
                    else orderUrgency = "NORMAL";
                }
                else
                {
                    orderUrgency = "UNKNOWN";
                }

                // Historical sales (last 30 days)
                var histSales = new List<HistoricalSalesPoint>();
                for (int i = 29; i >= 0; i--)
                {
                    var date = now.Date.AddDays(-i);
                    int qty = fulfilledOrders
                        .Where(o => o.CreatedAt.Date == date)
                        .SelectMany(o => o.Items ?? new List<PharmacyOrderItem>())
                        .Where(it => it.MedicineId == med.Id)
                        .Sum(it => it.Quantity);
                    histSales.Add(new HistoricalSalesPoint
                    {
                        Date = date.ToString("yyyy-MM-dd"),
                        QuantitySold = qty
                    });
                }

                // Confidence-based range (±%)
                double rangePercent = 0.20; // default ±20%
                int activeDaysCount = histSales.Count(h => h.QuantitySold > 0);
                if (activeDaysCount >= 20) rangePercent = 0.10; // ±10% if lots of data
                else if (activeDaysCount >= 10) rangePercent = 0.15; // ±15%
                else rangePercent = 0.25; // ±25% if sparse data

                decimal medPrice = med.Price;
                decimal projectedRev30 = (decimal)(predicted30 * (double)medPrice);
                decimal projLower = projectedRev30 * (decimal)(1 - rangePercent);
                decimal projUpper = projectedRev30 * (decimal)(1 + rangePercent);

                decimal atRiskRevenue = 0;
                decimal atRiskLower = 0;
                decimal atRiskUpper = 0;

                if (daysUntilEmpty.HasValue && daysUntilEmpty.Value <= 30)
                {
                    int daysLost = 30 - daysUntilEmpty.Value;
                    atRiskRevenue = (decimal)(avgDaily * daysLost * (double)medPrice);
                    atRiskLower = atRiskRevenue * (decimal)(1 - rangePercent);
                    atRiskUpper = atRiskRevenue * (decimal)(1 + rangePercent);
                }

                stockoutPredictions.Add(new StockoutPredictionResult
                {
                    MedicineId = med.Id,
                    MedicineName = med.Name,
                    CategoryName = med.Category?.Name ?? "General",
                    CurrentStock = med.StockQuantity,
                    TotalSoldPast30Days = totalSold,
                    AverageDailySales = avgDaily,
                    DaysUntilEmpty = daysUntilEmpty,
                    Status = status,
                    ForecastNote = note,
                    AIInsight = null,
                    Trend = trend,
                    ReorderPoint = reorderPoint,
                    SuggestedOrderQty = suggestedQty,
                    UnitPrice = med.Price,
                    PredictedDemand7Days = predicted7,
                    PredictedDemand30Days = predicted30,
                    PredictedDemand60Days = predicted60,
                    PredictedDemand90Days = predicted90,
                    TrendMultiplier = trendMultiplier,
                    SeasonalMultiplier = 1.0,
                    SeasonalFactor = null,
                    OrderByDate = orderByDate,
                    OrderUrgency = orderUrgency,
                    ProjectedRevenue30Days = projectedRev30,
                    ProjectedRevenue30DaysLower = projLower,
                    ProjectedRevenue30DaysUpper = projUpper,
                    AtRiskRevenue = atRiskRevenue,
                    AtRiskRevenueLower = atRiskLower,
                    AtRiskRevenueUpper = atRiskUpper,
                    HistoricalSales = histSales
                });
            }

            // Expiry Risks
            var expiryRisks = medicines.Select(med =>
            {
                var daysRemaining = (int)(med.ExpiryDate - now).TotalDays;
                string riskLevel = "Normal";
                int riskWeight = 1;

                if (daysRemaining <= 30) { riskLevel = "Critical"; riskWeight = 3; }
                else if (daysRemaining <= 60) { riskLevel = "Warning"; riskWeight = 2; }

                return new ExpiryRiskResult
                {
                    MedicineId = med.Id,
                    MedicineName = med.Name,
                    CategoryName = med.Category?.Name ?? "General",
                    StockQuantity = med.StockQuantity,
                    ExpiryDate = med.ExpiryDate.ToString("yyyy-MM-dd"),
                    DaysRemaining = Math.Max(0, daysRemaining),
                    RiskLevel = riskLevel
                };
            })
            .OrderByDescending(r => r.RiskLevel == "Critical" ? 3 : r.RiskLevel == "Warning" ? 2 : 1)
            .ThenBy(r => r.DaysRemaining)
            .ThenByDescending(r => r.StockQuantity)
            .ToList();

            // Sales Projections & Categories
            decimal dailyRevenue = periodDays > 0 ? totalRevenue / periodDays : 0;
            decimal projectedMonthlyRevenue = Math.Round(dailyRevenue * 30);

            var highDemandCategories = categorySales.Select(kv => new HighDemandCategoryResult
            {
                CategoryName = kv.Key,
                UnitsSold = kv.Value.Units,
                Revenue = kv.Value.Rev
            })
            .OrderByDescending(c => c.UnitsSold)
            .ToList();

            return new AIForecastResponse
            {
                ProjectedMonthlyRevenue = projectedMonthlyRevenue,
                ProjectedMonthlyRevenueLabel = $"Rs. {projectedMonthlyRevenue:N0}",
                CriticalStockCount = stockoutPredictions.Count(s => s.Status == "CRITICAL"),
                ExpiryRiskCount = expiryRisks.Count(e => e.RiskLevel == "Critical"),
                TopCategory = highDemandCategories.FirstOrDefault()?.CategoryName ?? "General Pharmacy",
                HasSufficientData = fulfilledOrders.Any() || totalRevenue > 0,
                StockoutPredictions = stockoutPredictions,
                ExpiryRisks = expiryRisks,
                HighDemandCategories = highDemandCategories
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[InventoryForecastingAgent] Error generating AI forecast");
            return new AIForecastResponse
            {
                HasSufficientData = false
            };
        }
    }

    public async Task<List<AISeasonalInsight>> GetSeasonalInsightsAsync(List<StockoutPredictionResult> criticalItems)
    {
        var insights = new List<AISeasonalInsight>();
        if (criticalItems == null || !criticalItems.Any()) return insights;

        var cacheKey = $"forecast_insights_v7_{_cacheVersion}_{DateTime.UtcNow:yyyyMMdd_HH}";
        if (_cache.TryGetValue(cacheKey, out List<AISeasonalInsight>? cached) && cached != null)
        {
            _logger.LogInformation("[AIForecast] Cache HIT for insights");
            return cached;
        }

        var top3 = criticalItems.Take(3).ToList();
        var apiKey = _config["Gemini:ApiKey"];
        var model = _config["Gemini:TextModel"] ?? "gemini-flash-lite-latest";

        foreach (var item in top3)
        {
            try
            {
                var prompt = $@"YOU ARE: A clinical inventory analyst for a Sri Lankan pharmacy.

TASK: Analyze this medicine and provide a professional assessment.

MEDICINE DATA:
- Name: {item.MedicineName}
- Category: {item.CategoryName}
- Current stock: {item.CurrentStock} units
- Total sold (last 30 days): {item.TotalSoldPast30Days}
- Average daily sales: {item.AverageDailySales} units/day
- Days until empty: {item.DaysUntilEmpty ?? 0}
- Trend: {item.Trend}
- Current date: {DateTime.UtcNow:yyyy-MM-dd}

REQUIRED OUTPUT:
1. Demand analysis (state the facts)
2. Seasonal factors (monsoon, disease patterns)
3. Specific reorder recommendation with quantity + timing
4. Confidence level (0.0-1.0)

MANDATORY: In your insight text, you MUST reference at least ONE of these Sri Lanka seasonal factors if relevant to the medicine:
- Southwest monsoon (May-Sep)
- Northeast monsoon (Oct-Jan)
- Dengue season (peaks Nov-Dec)
- Flu/respiratory season
- Water-borne disease season

If the medicine is not seasonally affected, state 'no significant seasonal factor' explicitly.

IMPORTANT CONSISTENCY RULE:
- If daysUntilEmpty > 30, do NOT recommend immediate reorder
- Recommendation should match status:
  * Days > 30: 'Monitor stock levels. No immediate action required.'
  * Days 15-30: 'Plan reorder in next 2 weeks.'
  * Days 8-14: 'Reorder within 1 week to maintain safety stock.'
  * Days <= 7: 'Immediate reorder required.'
  * Stock = 0: 'Emergency reorder required.'

STYLE: Professional, clinical, third-person, data-driven.
No greetings, no casual phrases, no first-person.

Return STRICT JSON:
{{
  ""insight"": ""Professional 2-3 sentence analysis"",
  ""urgency"": ""HIGH"" | ""MEDIUM"" | ""LOW"",
  ""recommendation"": ""Specific action with quantity and timing"",
  ""confidence"": 0.85,
  ""seasonal_multiplier"": 1.0,
  ""seasonal_factor"": ""Monsoon season"" or null
}}";

                var requestBody = new
                {
                    contents = new[] { new { parts = new[] { new { text = prompt } } } },
                    generationConfig = new { temperature = 0.2, maxOutputTokens = 1024 }
                };

                var json = JsonSerializer.Serialize(requestBody);
                var endpoint = $"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={apiKey}";
                var content = new StringContent(json, Encoding.UTF8, "application/json");

                var response = await _httpClient.PostAsync(endpoint, content);
                var responseBody = await response.Content.ReadAsStringAsync();

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning("[AIForecast] Gemini error {Status}", response.StatusCode);
                    insights.Add(BuildFallbackInsight(item));
                    continue;
                }

                var geminiResponse = JsonSerializer.Deserialize<JsonElement>(responseBody);
                var textContent = ExtractTextFromGeminiResponse(geminiResponse);
                var cleaned = CleanJson(textContent);
                using var doc = JsonDocument.Parse(cleaned);
                var root = doc.RootElement;

                insights.Add(new AISeasonalInsight
                {
                    MedicineName = item.MedicineName,
                    Insight = root.TryGetProperty("insight", out var ins) ? ins.GetString() ?? "" : "",
                    Urgency = root.TryGetProperty("urgency", out var urg) ? urg.GetString() ?? "LOW" : "LOW",
                    Recommendation = root.TryGetProperty("recommendation", out var rec) ? rec.GetString() ?? "" : "",
                    Confidence = root.TryGetProperty("confidence", out var conf) && conf.ValueKind == JsonValueKind.Number ? conf.GetDouble() : 0.85,
                    SeasonalMultiplier = root.TryGetProperty("seasonal_multiplier", out var sm) && sm.ValueKind == JsonValueKind.Number ? sm.GetDouble() : 1.0,
                    SeasonalFactor = root.TryGetProperty("seasonal_factor", out var sf) ? sf.GetString() : null
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[AIForecast] Failed for {Medicine}", item.MedicineName);
                insights.Add(BuildFallbackInsight(item));
            }
        }

        _cache.Set(cacheKey, insights, TimeSpan.FromHours(1));
        return insights;
    }

    public async Task<List<string>> GetOverallRecommendationsAsync(int criticalCount, int warningCount, string topCategory)
    {
        var cacheKey = $"forecast_recommendations_v7_{_cacheVersion}_{DateTime.UtcNow:yyyyMMdd_HH}";
        if (_cache.TryGetValue(cacheKey, out List<string>? cached) && cached != null)
            return cached;

        var recommendations = new List<string>();
        var apiKey = _config["Gemini:ApiKey"];
        var model = _config["Gemini:TextModel"] ?? "gemini-flash-lite-latest";

        try
        {
            var prompt = $@"YOU ARE: A clinical inventory advisor.

CONTEXT:
- {criticalCount} items CRITICAL (≤7 days stock)
- {warningCount} items WARNING (8-14 days stock)
- Top category: {topCategory}
- Date: {DateTime.UtcNow:yyyy-MM-dd}

TASK: Provide 3-5 professional inventory recommendations.

STYLE: Professional, clinical, third-person. No greetings. No casual phrases.

Return STRICT JSON:
{{ ""recommendations"": [""..."", ""..."", ""...""] }}";

            var requestBody = new
            {
                contents = new[] { new { parts = new[] { new { text = prompt } } } },
                generationConfig = new { temperature = 0.3, maxOutputTokens = 512 }
            };

            var json = JsonSerializer.Serialize(requestBody);
            var endpoint = $"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={apiKey}";
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            var response = await _httpClient.PostAsync(endpoint, content);
            var responseBody = await response.Content.ReadAsStringAsync();
            if (!response.IsSuccessStatusCode) return recommendations;

            var geminiResponse = JsonSerializer.Deserialize<JsonElement>(responseBody);
            var textContent = ExtractTextFromGeminiResponse(geminiResponse);
            var cleaned = CleanJson(textContent);
            using var doc = JsonDocument.Parse(cleaned);
            if (doc.RootElement.TryGetProperty("recommendations", out var recs) && recs.ValueKind == JsonValueKind.Array)
            {
                foreach (var rec in recs.EnumerateArray())
                    if (rec.GetString() is string r && !string.IsNullOrWhiteSpace(r))
                        recommendations.Add(r);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "[AIForecast] Recommendations failed");
        }

        _cache.Set(cacheKey, recommendations, TimeSpan.FromHours(1));
        return recommendations;
    }

    private static string ExtractTextFromGeminiResponse(JsonElement geminiResponse)
    {
        try
        {
            var candidates = geminiResponse.GetProperty("candidates");
            if (candidates.GetArrayLength() == 0) return "";
            var content = candidates[0].GetProperty("content");
            var parts = content.GetProperty("parts");
            foreach (var part in parts.EnumerateArray())
            {
                if (part.TryGetProperty("text", out var textProp) && textProp.ValueKind == JsonValueKind.String)
                    return textProp.GetString() ?? "";
            }
        }
        catch { }
        return "";
    }

    private static string CleanJson(string text)
    {
        var trimmed = text.Trim();
        if (trimmed.StartsWith("```json")) trimmed = trimmed.Substring(7);
        else if (trimmed.StartsWith("```")) trimmed = trimmed.Substring(3);
        if (trimmed.EndsWith("```")) trimmed = trimmed.Substring(0, trimmed.Length - 3);
        trimmed = trimmed.Trim();
        int first = trimmed.IndexOf('{');
        int last = trimmed.LastIndexOf('}');
        if (first >= 0 && last > first)
            return trimmed.Substring(first, last - first + 1);
        return trimmed;
    }

    private AISeasonalInsight BuildFallbackInsight(StockoutPredictionResult item)
    {
        return new AISeasonalInsight
        {
            MedicineName = item.MedicineName,
            Insight = $"{item.MedicineName} demand is {item.AverageDailySales} units/day with {item.DaysUntilEmpty ?? 0} days of stock remaining. Trend is {item.Trend.ToLower()}.",
            Urgency = item.Status == "CRITICAL" ? "HIGH" : item.Status == "WARNING" ? "MEDIUM" : "LOW",
            Recommendation = item.SuggestedOrderQty > 0
                ? $"Recommend reorder of {item.SuggestedOrderQty} units to prevent stockout."
                : "Stock levels are adequate. No immediate reorder required.",
            Confidence = 0.6,
            SeasonalMultiplier = 1.0,
            SeasonalFactor = null
        };
    }
}
