using HealthBridge.Api.Models;

namespace HealthBridge.Api.Agents;

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

    public InventoryForecastingAgent(ILogger<InventoryForecastingAgent> logger)
    {
        _logger = logger;
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

            // 1. Stockout Predictions
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
                    ForecastNote = note
                });
            }

            // 2. Expiry Risks
            var now = DateTime.UtcNow;
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
}
