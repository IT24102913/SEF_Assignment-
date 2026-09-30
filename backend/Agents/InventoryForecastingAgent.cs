using HealthBridge.Api.Models;
using Microsoft.Extensions.Caching.Memory;

namespace HealthBridge.Api.Agents;

public class HistoricalSalesPoint
{
    public string Date { get; set; } = "";  // YYYY-MM-DD
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
    public string Status { get; set; } = "HEALTHY"; // CRITICAL, LOW, HEALTHY
    public string ForecastNote { get; set; } = string.Empty;
    public string? AIInsight { get; set; }
    public string Trend { get; set; } = "STABLE";  // INCREASING/DECREASING/STABLE
    public int ReorderPoint { get; set; }
    public int SuggestedOrderQty { get; set; }

    // Multi-Period Demand Predictions & Financial Impact
    public int PredictedDemand7Days { get; set; }
    public int PredictedDemand30Days { get; set; }
    public int PredictedDemand60Days { get; set; }
    public int PredictedDemand90Days { get; set; }
    public double TrendMultiplier { get; set; } = 1.0;
    public double SeasonalMultiplier { get; set; } = 1.0;
    public string? SeasonalFactor { get; set; }
    public DateTime? OrderByDate { get; set; }
    public decimal ProjectedRevenue30Days { get; set; }
    public decimal AtRiskRevenue { get; set; }
    public decimal UnitPrice { get; set; }
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

public class AIEnhancedForecastResponse : AIForecastResponse
{
    public List<AISeasonalInsight> SeasonalInsights { get; set; } = new();
    public List<string> AIRecommendations { get; set; } = new();
    public bool AIInsightsAvailable { get; set; }
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
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
}

/// <summary>
/// AGENT 2 — AI Inventory & Sales Forecasting Agent
/// </summary>
public class InventoryForecastingAgent
{
    private readonly ILogger<InventoryForecastingAgent> _logger;
    private readonly IConfiguration _config;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly HttpClient _httpClient;
    private readonly IMemoryCache _cache;

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

            // 1. Sales Trends & Velocity
            var cutoff7Days = DateTime.UtcNow.AddDays(-7);
            var cutoff30Days = DateTime.UtcNow.AddDays(-30);

            var unitsSold30Days = new Dictionary<int, int>();
            var unitsSold7Days = new Dictionary<int, int>();
            var categorySales = new Dictionary<string, (int Units, decimal Rev)>();
            decimal totalRevenue = 0;

            foreach (var order in fulfilledOrders)
            {
                totalRevenue += order.TotalAmount;

                foreach (var item in order.Items)
                {
                    int medId = item.MedicineId;
                    int qty = item.Quantity;
                    decimal lineTotal = item.Subtotal > 0 ? item.Subtotal : (item.UnitPrice * qty);

                    if (order.CreatedAt >= cutoff30Days)
                    {
                        unitsSold30Days[medId] = unitsSold30Days.GetValueOrDefault(medId) + qty;
                    }

                    if (order.CreatedAt >= cutoff7Days)
                    {
                        unitsSold7Days[medId] = unitsSold7Days.GetValueOrDefault(medId) + qty;
                    }

                    string catName = item.Medicine?.Category?.Name ?? "General Pharmacy";
                    if (!categorySales.ContainsKey(catName))
                    {
                        categorySales[catName] = (0, 0m);
                    }
                    var current = categorySales[catName];
                    categorySales[catName] = (current.Units + qty, current.Rev + lineTotal);
                }
            }

            var stockoutPredictions = medicines.Select(med =>
            {
                int totalSold30 = unitsSold30Days.GetValueOrDefault(med.Id, 0);
                int totalSold7 = unitsSold7Days.GetValueOrDefault(med.Id, 0);

                double avgDaily30 = Math.Round((double)totalSold30 / periodDays, 2);
                double avgDaily7 = Math.Round((double)totalSold7 / 7.0, 2);

                int? daysUntilEmpty = null;
                string status = "HEALTHY";
                string note = "";

                if (med.StockQuantity == 0)
                {
                    daysUntilEmpty = 0;
                    status = "OUT_OF_STOCK";
                    note = "Item is out of stock";
                }
                else if (totalSold30 == 0 || avgDaily30 == 0)
                {
                    daysUntilEmpty = null;
                    status = "HEALTHY";
                    note = "Insufficient sales data for reliable forecast";
                }
                else
                {
                    daysUntilEmpty = (int)Math.Floor(med.StockQuantity / avgDaily30);
                    if (daysUntilEmpty <= 7) status = "CRITICAL";
                    else if (daysUntilEmpty <= 30) status = "LOW";
                    else status = "HEALTHY";
                    note = $"{daysUntilEmpty} days of stock remaining at current burn rate";
                }

                // Trend Velocity
                string trend = "STABLE";
                if (avgDaily7 > avgDaily30 * 1.25) trend = "INCREASING";
                else if (avgDaily7 < avgDaily30 * 0.75) trend = "DECREASING";

                double trendMultiplier = trend switch
                {
                    "INCREASING" => 1.20,
                    "DECREASING" => 0.85,
                    _ => 1.00
                };

                // Multi-Period Demand Predictions
                int predicted7 = (int)Math.Ceiling(avgDaily30 * 7 * trendMultiplier);
                int predicted30 = (int)Math.Ceiling(avgDaily30 * 30 * trendMultiplier);
                int predicted60 = (int)Math.Ceiling(avgDaily30 * 60 * trendMultiplier);
                int predicted90 = (int)Math.Ceiling(avgDaily30 * 90 * trendMultiplier);

                // Supplier Lead-Time Order Deadline
                DateTime? orderByDate = null;
                if (daysUntilEmpty.HasValue && daysUntilEmpty.Value > 3)
                    orderByDate = DateTime.UtcNow.AddDays(daysUntilEmpty.Value - 3);

                // Financial Impact
                decimal medPrice = med.Price;
                decimal projectedRev30 = (decimal)(predicted30 * (double)medPrice);
                decimal atRiskRevenue = 0;
                if (daysUntilEmpty.HasValue && daysUntilEmpty.Value <= 30)
                {
                    int daysLost = 30 - daysUntilEmpty.Value;
                    atRiskRevenue = (decimal)(avgDaily30 * daysLost * (double)medPrice);
                }

                // 30-Day Daily Historical Sales Series
                var histSales = new List<HistoricalSalesPoint>();
                for (int i = 29; i >= 0; i--)
                {
                    var date = DateTime.UtcNow.Date.AddDays(-i);
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

                // Reorder Point & Suggested Qty
                int reorderPoint = (int)Math.Ceiling(avgDaily30 * 7);
                int target30Day = (int)Math.Ceiling(avgDaily30 * 30);
                int suggestedQty = Math.Max(0, target30Day - med.StockQuantity);
                suggestedQty = (int)Math.Ceiling((double)suggestedQty / 10) * 10;

                return new StockoutPredictionResult
                {
                    MedicineId = med.Id,
                    MedicineName = med.Name,
                    CategoryName = med.Category?.Name ?? "General",
                    CurrentStock = med.StockQuantity,
                    TotalSoldPast30Days = totalSold30,
                    AverageDailySales = avgDaily30,
                    DaysUntilEmpty = daysUntilEmpty,
                    Status = status,
                    ForecastNote = note,
                    Trend = trend,
                    ReorderPoint = reorderPoint,
                    SuggestedOrderQty = suggestedQty,
                    PredictedDemand7Days = predicted7,
                    PredictedDemand30Days = predicted30,
                    PredictedDemand60Days = predicted60,
                    PredictedDemand90Days = predicted90,
                    TrendMultiplier = trendMultiplier,
                    OrderByDate = orderByDate,
                    ProjectedRevenue30Days = projectedRev30,
                    AtRiskRevenue = atRiskRevenue,
                    UnitPrice = med.Price,
                    HistoricalSales = histSales
                };
            })
            .OrderBy(s => s.Status == "OUT_OF_STOCK" ? 0 : s.Status == "CRITICAL" ? 1 : s.Status == "LOW" ? 2 : 3)
            .ThenBy(s => s.DaysUntilEmpty ?? 999)
            .ToList();

            // 2. Expiry Risks
            DateTime nowUtc = DateTime.UtcNow;
            var expiryRisks = medicines.Select(med =>
            {
                var daysRemaining = (int)(med.ExpiryDate - nowUtc).TotalDays;
                string riskLevel = "Normal";

                if (daysRemaining <= 30) { riskLevel = "Critical"; }
                else if (daysRemaining <= 60) { riskLevel = "Warning"; }

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

            // 3. Sales Projections & Categories
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
                CriticalStockCount = stockoutPredictions.Count(s => s.Status == "CRITICAL" || s.Status == "OUT_OF_STOCK"),
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

        var cacheKey = $"forecast_insights_v4_{DateTime.UtcNow:yyyyMMdd_HH}";
        if (_cache.TryGetValue(cacheKey, out List<AISeasonalInsight>? cached) && cached != null)
        {
            _logger.LogInformation("[AIForecast] Cache HIT for insights");
            return cached;
        }

        _logger.LogInformation("[AIForecast] Cache MISS — calling Gemini");

        var top3 = criticalItems.Take(3).ToList();
        var apiKey = _config["Gemini:ApiKey"];
        var model = _config["Gemini:TextModel"] ?? "gemini-flash-lite-latest";

        foreach (var item in top3)
        {
            try
            {
                var prompt = $@"YOU ARE: A clinical inventory analyst for a Sri Lankan pharmacy.

TASK: Analyze the following medicine data and provide a professional inventory assessment.

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
1. Demand analysis — state the facts (not conversational)
2. Seasonal factors — reference context briefly (monsoon, disease patterns)
3. Specific reorder recommendation — with quantity and timing
4. Confidence level (0.0-1.0)

STYLE GUIDELINES:
- Professional, clinical, factual
- Third-person objective tone
- Data-driven statements
- No greetings, no casual phrases, no slang
- No first-person (""I"", ""we"", ""let's"")
- No emotional language
- Concise sentences
- Reference numbers precisely

EXAMPLE (CORRECT tone):
'Demand for Amoxicillin 500mg is 2.3 units per day. Monsoon season typically increases respiratory infection rates, indicating potential demand increase of 30-40%. Current stock of 10 units provides 4 days of coverage. Recommend reorder of 60 units to maintain adequate stock levels.'

Return STRICT JSON:
{{
  ""insight"": ""Professional 2-3 sentence analysis"",
  ""urgency"": ""HIGH"" | ""MEDIUM"" | ""LOW"",
  ""recommendation"": ""Specific action with quantity and timing"",
  ""confidence"": 0.85,
  ""seasonal_multiplier"": 1.3,
  ""seasonal_factor"": ""Monsoon season""
}}";

                var requestBody = new
                {
                    contents = new[]
                    {
                        new { parts = new[] { new { text = prompt } } }
                    },
                    generationConfig = new
                    {
                        temperature = 0.3,
                        maxOutputTokens = 1024
                    }
                };

                var json = System.Text.Json.JsonSerializer.Serialize(requestBody);
                var endpoint = $"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={apiKey}";
                var content = new StringContent(json, System.Text.Encoding.UTF8, "application/json");

                var response = await _httpClient.PostAsync(endpoint, content);
                var responseBody = await response.Content.ReadAsStringAsync();

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning("[AIForecast] Gemini error ({Status}): {Body}", response.StatusCode, responseBody);
                    insights.Add(BuildFallbackInsight(item));
                    continue;
                }

                var geminiResponse = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(responseBody);
                var textContent = ExtractTextFromGeminiResponse(geminiResponse);
                var cleaned = CleanJson(textContent);
                using var doc = System.Text.Json.JsonDocument.Parse(cleaned);
                var root = doc.RootElement;

                insights.Add(new AISeasonalInsight
                {
                    MedicineName = item.MedicineName,
                    Insight = root.TryGetProperty("insight", out var ins) ? ins.GetString() ?? "" : "",
                    Urgency = root.TryGetProperty("urgency", out var urg) ? urg.GetString() ?? "LOW" : "LOW",
                    Recommendation = root.TryGetProperty("recommendation", out var rec) ? rec.GetString() ?? "" : "",
                    Confidence = root.TryGetProperty("confidence", out var conf) && conf.ValueKind == System.Text.Json.JsonValueKind.Number ? conf.GetDouble() : 0.75,
                    SeasonalMultiplier = root.TryGetProperty("seasonal_multiplier", out var sm) && sm.ValueKind == System.Text.Json.JsonValueKind.Number ? sm.GetDouble() : 1.0,
                    SeasonalFactor = root.TryGetProperty("seasonal_factor", out var sf) ? sf.GetString() : null
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[AIForecast] Failed to get AI insight for {Medicine}", item.MedicineName);
                insights.Add(BuildFallbackInsight(item));
            }
        }

        _cache.Set(cacheKey, insights, TimeSpan.FromHours(1));
        return insights;
    }

    public async Task<List<string>> GetOverallRecommendationsAsync(int criticalCount, int warningCount, string topCategory)
    {
        var recommendations = new List<string>();

        var cacheKey = $"forecast_recommendations_v4_{DateTime.UtcNow:yyyyMMdd_HH}";
        if (_cache.TryGetValue(cacheKey, out List<string>? cachedRecs) && cachedRecs != null)
        {
            _logger.LogInformation("[AIForecast] Cache HIT for recommendations");
            return cachedRecs;
        }

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

STYLE:
- Professional, clinical language
- Third-person objective tone
- No greetings (""Good morning"", etc.)
- No casual phrases
- No first-person (""I"", ""we"", ""let's"")
- Each recommendation: action + reason + data reference
- 1-2 sentences each

EXAMPLE (CORRECT):
'Prioritize restocking of Amoxicillin 500mg — current stock of 10 units provides 4 days coverage at 2.3 units/day. Monsoon season indicates potential 30-40% demand increase.'

Return STRICT JSON:
{{ ""recommendations"": [""..."", ""..."", ""...""] }}";

            var requestBody = new
            {
                contents = new[] { new { parts = new[] { new { text = prompt } } } },
                generationConfig = new { temperature = 0.3, maxOutputTokens = 512 }
            };

            var json = System.Text.Json.JsonSerializer.Serialize(requestBody);
            var endpoint = $"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={apiKey}";
            var content = new StringContent(json, System.Text.Encoding.UTF8, "application/json");

            var response = await _httpClient.PostAsync(endpoint, content);
            var responseBody = await response.Content.ReadAsStringAsync();
            if (!response.IsSuccessStatusCode) return recommendations;

            var geminiResponse = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(responseBody);
            var textContent = ExtractTextFromGeminiResponse(geminiResponse);
            var cleaned = CleanJson(textContent);
            using var doc = System.Text.Json.JsonDocument.Parse(cleaned);
            if (doc.RootElement.TryGetProperty("recommendations", out var recs) && recs.ValueKind == System.Text.Json.JsonValueKind.Array)
            {
                foreach (var rec in recs.EnumerateArray())
                {
                    if (rec.GetString() is string r && !string.IsNullOrWhiteSpace(r))
                        recommendations.Add(r);
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "[AIForecast] Failed to get AI recommendations");
        }

        _cache.Set(cacheKey, recommendations, TimeSpan.FromHours(1));
        return recommendations;
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
            Confidence = 0.6
        };
    }

    private static string ExtractTextFromGeminiResponse(System.Text.Json.JsonElement geminiResponse)
    {
        try
        {
            var candidates = geminiResponse.GetProperty("candidates");
            if (candidates.GetArrayLength() == 0) return "";
            var content = candidates[0].GetProperty("content");
            var parts = content.GetProperty("parts");
            foreach (var part in parts.EnumerateArray())
            {
                if (part.TryGetProperty("text", out var textProp) && textProp.ValueKind == System.Text.Json.JsonValueKind.String)
                    return textProp.GetString() ?? "";
            }
        }
        catch { }
        return "";
    }

    private static string CleanJson(string text)
    {
        if (string.IsNullOrWhiteSpace(text)) return string.Empty;
        var trimmed = text.Trim();
        if (trimmed.StartsWith("```json", StringComparison.OrdinalIgnoreCase)) trimmed = trimmed.Substring(7);
        else if (trimmed.StartsWith("```")) trimmed = trimmed.Substring(3);
        if (trimmed.EndsWith("```")) trimmed = trimmed.Substring(0, trimmed.Length - 3);
        trimmed = trimmed.Trim();

        int first = trimmed.IndexOf('{');
        int last = trimmed.LastIndexOf('}');
        if (first >= 0 && last > first)
            return trimmed.Substring(first, last - first + 1);
        return trimmed;
    }
}
