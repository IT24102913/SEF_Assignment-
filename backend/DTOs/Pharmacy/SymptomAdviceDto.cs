using System;
using System.Collections.Generic;

namespace HealthBridge.Api.DTOs.Pharmacy;

public class SymptomAdviceRequest
{
    public string Symptom { get; set; } = "";
    public string? PatientEmail { get; set; }
}

public class RecommendedProductDto
{
    public int MedicineId { get; set; }
    public string Name { get; set; } = "";
    public string Category { get; set; } = "";
    public decimal Price { get; set; }
    public int StockQuantity { get; set; }
    public string? BrandName { get; set; }
    public string ProductType { get; set; } = "";
    public string WhyRecommended { get; set; } = "";
    public string HowToUse { get; set; } = "";
    public string Duration { get; set; } = "";
}

public class SymptomAdviceResponse
{
    public int? Id { get; set; }  // ← History ID (if saved)
    public string Symptom { get; set; } = "";
    public string SymptomCategory { get; set; } = "";
    public string Summary { get; set; } = "";
    public List<string> HomeRemedies { get; set; } = new();
    public List<string> WarningSigns { get; set; } = new();
    public List<RecommendedProductDto> RecommendedProducts { get; set; } = new();
    public List<string> ConsultDoctorIf { get; set; } = new();
    public string Disclaimer { get; set; } = "";
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
    public string EngineUsed { get; set; } = "";
    public bool FromCache { get; set; }
}

public class SymptomHistoryItemDto
{
    public int Id { get; set; }
    public string Symptom { get; set; } = "";
    public string SymptomCategory { get; set; } = "";
    public string Summary { get; set; } = "";
    public DateTime CreatedAt { get; set; }
    public string EngineUsed { get; set; } = "";
}
