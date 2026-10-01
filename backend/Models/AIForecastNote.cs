using System.ComponentModel.DataAnnotations;

namespace HealthBridge.Api.Models;

public class AIForecastNote
{
    [Key]
    public int Id { get; set; }
    
    public int MedicineId { get; set; }
    public string MedicineName { get; set; } = "";
    public string Category { get; set; } = "";
    public decimal UnitPrice { get; set; }
    
    // Snapshot data at time of noting
    public int CurrentStock { get; set; }
    public int? DaysUntilEmpty { get; set; }
    public double AverageDailySales { get; set; }
    public string Trend { get; set; } = "STABLE";
    public string StockStatus { get; set; } = "HEALTHY";
    
    // Predictions
    public int PredictedDemand7Days { get; set; }
    public int PredictedDemand30Days { get; set; }
    public int PredictedDemand60Days { get; set; }
    public int PredictedDemand90Days { get; set; }
    
    // Seasonal
    public string? SeasonalFactor { get; set; }
    public double SeasonalMultiplier { get; set; } = 1.0;
    
    // Financial
    public decimal ProjectedRevenue30Days { get; set; }
    public decimal AtRiskRevenue { get; set; }
    
    // Reorder
    public int ReorderPoint { get; set; }
    public int SuggestedOrderQty { get; set; }
    public DateTime? OrderByDate { get; set; }
    
    // AI insights
    public string? AIInsight { get; set; }
    public string? AIRecommendation { get; set; }
    public string Urgency { get; set; } = "LOW";
    public double Confidence { get; set; }
    
    // Metadata & Workflow Status
    public string TakenBy { get; set; } = "";
    public DateTime TakenAt { get; set; } = DateTime.UtcNow;
    public string NoteStatus { get; set; } = "PENDING";  // PENDING / RESTOCKED / DISMISSED
}
