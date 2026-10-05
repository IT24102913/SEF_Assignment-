using HealthBridge.Api.Data;
using HealthBridge.Api.DTOs.Pharmacy;
using HealthBridge.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace HealthBridge.Api.Services;

public class PatientAnalyticsService : IPatientAnalyticsService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<PatientAnalyticsService> _logger;

    public PatientAnalyticsService(ApplicationDbContext context, ILogger<PatientAnalyticsService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<PatientAnalyticsResponse?> GetPatientAnalyticsAsync(string patientEmail)
    {
        if (string.IsNullOrWhiteSpace(patientEmail)) return null;

        var emailLower = patientEmail.Trim().ToLowerInvariant();

        var allOrders = await _context.PharmacyOrders
            .Include(o => o.Items)
            .Where(o => o.CustomerEmail.ToLower() == emailLower)
            .OrderByDescending(o => o.CreatedAt)
            .AsNoTracking()
            .ToListAsync();

        if (!allOrders.Any()) return null;

        var now = DateTime.UtcNow;
        var firstOrder = allOrders.Min(o => o.CreatedAt);
        var lastOrder = allOrders.Max(o => o.CreatedAt);
        var sample = allOrders.First();

        // ── 1. Patient Profile ────────────────────────────────────────────────
        var profile = new PatientProfileDto
        {
            Name = sample.CustomerName ?? "",
            Email = sample.CustomerEmail ?? "",
            Phone = sample.CustomerPhone,
            Address = sample.DeliveryAddress,
            FirstOrderAt = firstOrder,
            LastOrderAt = lastOrder,
            AccountAgeDays = (int)(now - firstOrder).TotalDays
        };

        // ── 2. Risk Summary ───────────────────────────────────────────────────
        int totalOrders = allOrders.Count;
        int flaggedOrders = allOrders.Count(o => (o.SafetyRiskScore ?? 0) >= 70);
        double suspiciousRate = totalOrders > 0 ? Math.Round((double)flaggedOrders / totalOrders * 100, 1) : 0;
        int ordersLast30 = allOrders.Count(o => o.CreatedAt >= now.AddDays(-30));

        var byDay = allOrders
            .GroupBy(o => o.CreatedAt.Date)
            .Select(g => g.Count())
            .ToList();
        int maxInOneDay = byDay.Any() ? byDay.Max() : 0;

        string riskLevel = "LOW";
        if (suspiciousRate >= 40 || flaggedOrders >= 10) riskLevel = "CRITICAL";
        else if (suspiciousRate >= 20 || flaggedOrders >= 5) riskLevel = "HIGH";
        else if (suspiciousRate >= 10 || flaggedOrders >= 3) riskLevel = "MEDIUM";

        var riskSummary = new RiskSummaryDto
        {
            TotalOrders = totalOrders,
            FlaggedOrders = flaggedOrders,
            SuspiciousRate = suspiciousRate,
            RiskLevel = riskLevel,
            OrdersLast30Days = ordersLast30,
            MaxOrdersInOneDay = maxInOneDay,
            AccountStatus = "ACTIVE"
        };

        // ── 3. Order Timeline (last 90 days) ──────────────────────────────────
        var cutoff90 = now.AddDays(-90);
        var timeline = allOrders
            .Where(o => o.CreatedAt >= cutoff90)
            .GroupBy(o => o.CreatedAt.Date)
            .Select(g => new OrderTimelineDto
            {
                Date = g.Key.ToString("yyyy-MM-dd"),
                OrderCount = g.Count(),
                FlaggedCount = g.Count(o => (o.SafetyRiskScore ?? 0) >= 70)
            })
            .OrderBy(x => x.Date)
            .ToList();

        // ── 4. Repeated Medicines (last 30 days, count >= 2) ──────────────────
        var cutoff30 = now.AddDays(-30);
        var recentOrders30 = allOrders.Where(o => o.CreatedAt >= cutoff30).ToList();

        var allItems30 = recentOrders30
            .SelectMany(o => (o.Items ?? new List<PharmacyOrderItem>())
                .Select(i => new { Order = o, Item = i }))
            .ToList();

        var repeatedMeds = allItems30
            .GroupBy(x => (x.Item.MedicineName ?? "").Trim().ToLowerInvariant())
            .Where(g => !string.IsNullOrWhiteSpace(g.Key) && g.Select(x => x.Order.Id).Distinct().Count() >= 2)
            .Select(g =>
            {
                var lastOrderedAt = g.Max(x => x.Order.CreatedAt);
                var daysSince = (int)(now - lastOrderedAt).TotalDays;
                int expectedInterval = 30;
                bool isViolation = daysSince < expectedInterval;
                int orderCount = g.Select(x => x.Order.Id).Distinct().Count();
                int totalQty = g.Sum(x => x.Item.Quantity);
                string severity = (orderCount >= 5 || isViolation) ? "HIGH" : orderCount >= 3 ? "MEDIUM" : "LOW";

                return new RepeatedMedicineDto
                {
                    MedicineName = g.First().Item.MedicineName ?? g.Key,
                    OrderCount = orderCount,
                    TotalQuantity = totalQty,
                    LastOrderedAt = lastOrderedAt,
                    DaysSinceLastOrder = daysSince,
                    ExpectedIntervalDays = expectedInterval,
                    IsViolation = isViolation,
                    Severity = severity
                };
            })
            .OrderByDescending(m => m.OrderCount)
            .ToList();

        // ── 5. Quantity Trends (top 5 medicines) ──────────────────────────────
        var allItemsAll = allOrders
            .SelectMany(o => (o.Items ?? new List<PharmacyOrderItem>())
                .Select(i => new { Order = o, Item = i }))
            .ToList();

        var top5Meds = allItemsAll
            .GroupBy(x => (x.Item.MedicineName ?? "").Trim().ToLowerInvariant())
            .Where(g => !string.IsNullOrWhiteSpace(g.Key))
            .OrderByDescending(g => g.Count())
            .Take(5)
            .Select(g => g.Key)
            .ToList();

        var quantityTrends = top5Meds.Select(medKey =>
        {
            var displayName = allItemsAll
                .First(x => (x.Item.MedicineName ?? "").Trim().ToLowerInvariant() == medKey)
                .Item.MedicineName ?? medKey;

            var points = allItemsAll
                .Where(x => (x.Item.MedicineName ?? "").Trim().ToLowerInvariant() == medKey)
                .GroupBy(x => x.Order.CreatedAt.Date)
                .Select(g => new QuantityPointDto
                {
                    Date = g.Key.ToString("yyyy-MM-dd"),
                    Quantity = g.Sum(x => x.Item.Quantity),
                    OrderCount = g.Select(x => x.Order.Id).Distinct().Count()
                })
                .OrderBy(p => p.Date)
                .ToList();

            return new MedicineQuantityTrendDto
            {
                MedicineName = displayName,
                Points = points
            };
        }).ToList();

        // ── 6. Violation History ──────────────────────────────────────────────
        var violationHistory = allOrders
            .Where(o => (o.SafetyRiskScore ?? 0) >= 70)
            .Select(o =>
            {
                var flags = ParseFlags(o.SafetyFlags);
                string firstFlag = flags.FirstOrDefault() ?? "";
                string type = DetermineViolationType(firstFlag, flags);

                return new ViolationDto
                {
                    Date = o.CreatedAt,
                    OrderNumber = o.OrderNumber ?? "",
                    Type = type,
                    Message = firstFlag.Length > 0 ? firstFlag : "High risk order flagged for review",
                    RiskScore = o.SafetyRiskScore ?? 0
                };
            })
            .OrderByDescending(v => v.Date)
            .ToList();

        // ── 7. Recent Orders (last 10) ────────────────────────────────────────
        var recentOrders = allOrders
            .Take(10)
            .Select(o => new RecentOrderDto
            {
                Id = o.Id,
                OrderNumber = o.OrderNumber ?? "",
                CreatedAt = o.CreatedAt,
                ItemCount = o.Items?.Count ?? 0,
                TotalAmount = o.TotalAmount,
                Status = o.Status ?? "",
                RiskScore = o.SafetyRiskScore,
                RecommendedAction = o.SafetyRecommendedAction
            })
            .ToList();

        // ── 8. Prescription Usage ─────────────────────────────────────────────
        var withHash = allOrders.Where(o => !string.IsNullOrWhiteSpace(o.PrescriptionHash)).ToList();
        int totalPrescriptions = withHash.Count;
        var hashGroups = withHash
            .GroupBy(o => o.PrescriptionHash!)
            .ToList();
        int uniqueHashes = hashGroups.Count;
        var duplicateGroups = hashGroups.Where(g => g.Count() > 1).ToList();
        int duplicateCount = duplicateGroups.Sum(g => g.Count() - 1);

        var duplicateHashDtos = duplicateGroups.Select(g => new PrescriptionHashDto
        {
            Hash = g.Key.Length > 16 ? g.Key[..16] + "..." : g.Key,
            TimesUsed = g.Count(),
            FirstUsed = g.Min(o => o.CreatedAt),
            LastUsed = g.Max(o => o.CreatedAt)
        }).ToList();

        var prescriptionUsage = new PrescriptionUsageDto
        {
            TotalPrescriptions = totalPrescriptions,
            UniquePrescriptionHashes = uniqueHashes,
            DuplicatePrescriptionCount = duplicateCount,
            DuplicateHashes = duplicateHashDtos
        };

        // ── 9. Recommendations ────────────────────────────────────────────────
        var recommendations = new List<string>();

        if (suspiciousRate >= 20)
            recommendations.Add($"⚠️ Suspicious order rate is {suspiciousRate}% — consider manual review of this patient");

        if (maxInOneDay >= 3)
            recommendations.Add($"⚠️ {maxInOneDay} orders placed in a single day — possible stockpiling behaviour");

        foreach (var med in repeatedMeds.Where(m => m.IsViolation))
            recommendations.Add($"⚠️ {med.MedicineName} ordered {med.OrderCount} times in 30 days (expected interval: {med.ExpectedIntervalDays} days)");

        if (duplicateCount > 0)
            recommendations.Add($"⚠️ {duplicateCount} duplicate prescription image(s) detected across order history");

        if (!recommendations.Any())
            recommendations.Add("✅ No significant abuse patterns detected for this patient");

        return new PatientAnalyticsResponse
        {
            Patient = profile,
            RiskSummary = riskSummary,
            OrderTimeline = timeline,
            RepeatedMedicines = repeatedMeds,
            QuantityTrends = quantityTrends,
            ViolationHistory = violationHistory,
            RecentOrders = recentOrders,
            PrescriptionUsage = prescriptionUsage,
            Recommendations = recommendations
        };
    }

    public async Task<List<ViolatedPatientSummaryDto>> GetViolatedPatientsAsync()
    {
        var allOrders = await _context.PharmacyOrders
            .Where(o => o.SafetyRiskScore != null && o.SafetyRiskScore >= 70)
            .AsNoTracking()
            .ToListAsync();

        if (!allOrders.Any()) return new List<ViolatedPatientSummaryDto>();

        // Get all orders per patient to compute totals
        var allEmails = allOrders.Select(o => o.CustomerEmail.ToLower()).Distinct().ToList();
        var allPatientOrders = await _context.PharmacyOrders
            .Where(o => allEmails.Contains(o.CustomerEmail.ToLower()))
            .AsNoTracking()
            .ToListAsync();

        var result = allPatientOrders
            .GroupBy(o => o.CustomerEmail.ToLower())
            .Select(g =>
            {
                var flagged = g.Where(o => (o.SafetyRiskScore ?? 0) >= 70).ToList();
                int total = g.Count();
                int flaggedCount = flagged.Count;
                double rate = total > 0 ? Math.Round((double)flaggedCount / total * 100, 1) : 0;

                string lvl = "LOW";
                if (rate >= 40 || flaggedCount >= 10) lvl = "CRITICAL";
                else if (rate >= 20 || flaggedCount >= 5) lvl = "HIGH";
                else if (rate >= 10 || flaggedCount >= 3) lvl = "MEDIUM";

                var sample = g.OrderByDescending(o => o.CreatedAt).First();

                return new ViolatedPatientSummaryDto
                {
                    CustomerEmail = sample.CustomerEmail,
                    CustomerName = sample.CustomerName ?? "",
                    CustomerPhone = sample.CustomerPhone,
                    TotalOrders = total,
                    FlaggedOrders = flaggedCount,
                    SuspiciousRate = rate,
                    RiskLevel = lvl,
                    LastFlaggedAt = flagged.Max(o => o.CreatedAt)
                };
            })
            .Where(p => p.FlaggedOrders > 0)
            .OrderByDescending(p => p.FlaggedOrders)
            .Take(50)
            .ToList();

        return result;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    private static List<string> ParseFlags(string? flagsJson)
    {
        if (string.IsNullOrWhiteSpace(flagsJson)) return new List<string>();
        try
        {
            return System.Text.Json.JsonSerializer.Deserialize<List<string>>(flagsJson) ?? new List<string>();
        }
        catch
        {
            return flagsJson.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).ToList();
        }
    }

    private static string DetermineViolationType(string flag, List<string> allFlags)
    {
        var combined = string.Join(" ", allFlags).ToLowerInvariant();
        if (combined.Contains("duplicate")) return "DUPLICATE_PRESCRIPTION";
        if (combined.Contains("refill")) return "EARLY_REFILL";
        if (combined.Contains("forgery")) return "FORGERY";
        if (combined.Contains("watermark")) return "WATERMARK";
        if (combined.Contains("non-medical") || combined.Contains("non_medical")) return "NON_MEDICAL";
        return "OTHER";
    }
}
