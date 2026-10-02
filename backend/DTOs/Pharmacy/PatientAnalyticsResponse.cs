namespace HealthBridge.Api.DTOs.Pharmacy;

public class PatientAnalyticsResponse
{
    public PatientProfileDto Patient { get; set; } = new();
    public RiskSummaryDto RiskSummary { get; set; } = new();
    public List<OrderTimelineDto> OrderTimeline { get; set; } = new();
    public List<RepeatedMedicineDto> RepeatedMedicines { get; set; } = new();
    public List<MedicineQuantityTrendDto> QuantityTrends { get; set; } = new();
    public List<ViolationDto> ViolationHistory { get; set; } = new();
    public List<RecentOrderDto> RecentOrders { get; set; } = new();
    public PrescriptionUsageDto PrescriptionUsage { get; set; } = new();
    public List<string> Recommendations { get; set; } = new();
}

public class PatientProfileDto
{
    public string Name { get; set; } = "";
    public string Email { get; set; } = "";
    public string? Phone { get; set; }
    public string? Address { get; set; }
    public DateTime FirstOrderAt { get; set; }
    public DateTime LastOrderAt { get; set; }
    public int AccountAgeDays { get; set; }
}

public class RiskSummaryDto
{
    public int TotalOrders { get; set; }
    public int FlaggedOrders { get; set; }
    public double SuspiciousRate { get; set; }
    public string RiskLevel { get; set; } = "LOW";
    public int OrdersLast30Days { get; set; }
    public int MaxOrdersInOneDay { get; set; }
    public string AccountStatus { get; set; } = "ACTIVE";
}

public class OrderTimelineDto
{
    public string Date { get; set; } = "";
    public int OrderCount { get; set; }
    public int FlaggedCount { get; set; }
}

public class RepeatedMedicineDto
{
    public string MedicineName { get; set; } = "";
    public int OrderCount { get; set; }
    public int TotalQuantity { get; set; }
    public DateTime LastOrderedAt { get; set; }
    public int DaysSinceLastOrder { get; set; }
    public int ExpectedIntervalDays { get; set; }
    public bool IsViolation { get; set; }
    public string Severity { get; set; } = "LOW";
}

public class MedicineQuantityTrendDto
{
    public string MedicineName { get; set; } = "";
    public List<QuantityPointDto> Points { get; set; } = new();
}

public class QuantityPointDto
{
    public string Date { get; set; } = "";
    public int Quantity { get; set; }
    public int OrderCount { get; set; }
}

public class ViolationDto
{
    public DateTime Date { get; set; }
    public string OrderNumber { get; set; } = "";
    public string Type { get; set; } = "OTHER";
    public string Message { get; set; } = "";
    public int RiskScore { get; set; }
}

public class RecentOrderDto
{
    public int Id { get; set; }
    public string OrderNumber { get; set; } = "";
    public DateTime CreatedAt { get; set; }
    public int ItemCount { get; set; }
    public decimal TotalAmount { get; set; }
    public string Status { get; set; } = "";
    public int? RiskScore { get; set; }
    public string? RecommendedAction { get; set; }
}

public class PrescriptionUsageDto
{
    public int TotalPrescriptions { get; set; }
    public int UniquePrescriptionHashes { get; set; }
    public int DuplicatePrescriptionCount { get; set; }
    public List<PrescriptionHashDto> DuplicateHashes { get; set; } = new();
}

public class PrescriptionHashDto
{
    public string Hash { get; set; } = "";
    public int TimesUsed { get; set; }
    public DateTime FirstUsed { get; set; }
    public DateTime LastUsed { get; set; }
}

public class ViolatedPatientSummaryDto
{
    public string CustomerEmail { get; set; } = "";
    public string CustomerName { get; set; } = "";
    public string? CustomerPhone { get; set; }
    public int TotalOrders { get; set; }
    public int FlaggedOrders { get; set; }
    public double SuspiciousRate { get; set; }
    public string RiskLevel { get; set; } = "";
    public DateTime LastFlaggedAt { get; set; }
}
