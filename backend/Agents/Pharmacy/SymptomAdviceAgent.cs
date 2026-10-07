using System.Text;
using System.Text.Json;
using HealthBridge.Api.Data;
using HealthBridge.Api.DTOs.Pharmacy;
using HealthBridge.Api.Models;
using HealthBridge.Api.Models.Pharmacy;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace HealthBridge.Api.Agents.Pharmacy;

public class SymptomAdviceAgent
{
    private readonly IConfiguration _config;
    private readonly ILogger<SymptomAdviceAgent> _logger;
    private readonly HttpClient _httpClient;
    private readonly ApplicationDbContext _context;
    private readonly IMemoryCache _cache;

    private static readonly string[] PillKeywords = new[]
    {
        "tablet", "tab.", "tab ", "capsule", "cap.", "cap ",
        "pill", "caplet", "softgel", "chewable", "lozenge"
    };

    public SymptomAdviceAgent(
        IConfiguration config,
        ILogger<SymptomAdviceAgent> logger,
        IHttpClientFactory httpClientFactory,
        ApplicationDbContext context,
        IMemoryCache cache)
    {
        _config = config;
        _logger = logger;
        _httpClient = httpClientFactory.CreateClient("GeminiClient");
        _context = context;
        _cache = cache;
    }

    private string? GetGeminiApiKey()
    {
        return _config["Gemini:ApiKey"]
            ?? _config["GeminiApiKey"]
            ?? _config["Google:ApiKey"]
            ?? Environment.GetEnvironmentVariable("GEMINI_API_KEY")
            ?? Environment.GetEnvironmentVariable("GOOGLE_API_KEY");
    }

    public async Task<SymptomAdviceResponse> GetAdviceAsync(string symptom, string? patientEmail)
    {
        symptom = symptom?.Trim() ?? "";
        if (string.IsNullOrWhiteSpace(symptom))
            return BuildFallbackResponse(symptom);

        var symptomLower = symptom.ToLowerInvariant();
        var cacheKey = $"symptom_v1_{symptomLower}";
        
        SymptomAdviceResponse? result = null;
        bool fromCache = false;

        // Check cache
        if (_cache.TryGetValue(cacheKey, out SymptomAdviceResponse? cached) && cached != null)
        {
            _logger.LogInformation("[Pharmacy AI] Cache HIT for {Symptom}", symptom);
            result = cached;
            fromCache = true;
        }
        else
        {
            _logger.LogInformation("[Pharmacy AI] Cache MISS for {Symptom}", symptom);

            var allMedicines = await _context.Medicines
                .Include(m => m.Category)
                .Where(m => m.StockQuantity > 0)
                .Where(m => !m.RequiresPrescription)
                .AsNoTracking()
                .ToListAsync();

            var recommendedPool = allMedicines
                .Where(m => !IsPillForm(m.Name, m.SellingUnit, m.Description))
                .Take(30)
                .ToList();

            _logger.LogInformation("[Pharmacy AI] Pool size: {Count}", recommendedPool.Count);

            var productList = string.Join("\n", recommendedPool.Select(m =>
                $"- ID:{m.Id} | {m.Name} | {m.Category?.Name ?? "General"} | Rs.{m.Price} | Stock:{m.StockQuantity}"));

            var apiKey = GetGeminiApiKey();
            if (!string.IsNullOrWhiteSpace(apiKey))
            {
                try
                {
                    var aiResponse = await CallGeminiAsync(apiKey, symptom, productList);
                    if (aiResponse != null)
                    {
                        MapRecommendedProducts(aiResponse, recommendedPool);
                        aiResponse.EngineUsed = "Google Gemini LLM (Pharmacy Wellness AI)";
                        _cache.Set(cacheKey, aiResponse, TimeSpan.FromHours(6));
                        result = aiResponse;
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "[Pharmacy AI] Gemini failed");
                }
            }

            if (result == null)
                result = BuildFallbackResponse(symptom);
        }

        result.FromCache = fromCache;

        // Save to history (always — even cached responses create a new history entry)
        await SaveHistoryAsync(symptom, result, patientEmail);

        return result;
    }

    private async Task SaveHistoryAsync(string symptom, SymptomAdviceResponse response, string? patientEmail)
    {
        try
        {
            // Serialize a snapshot WITHOUT the Id field to avoid recursion
            var snapshot = new SymptomAdviceResponse
            {
                Symptom = response.Symptom,
                SymptomCategory = response.SymptomCategory,
                Summary = response.Summary,
                HomeRemedies = response.HomeRemedies,
                WarningSigns = response.WarningSigns,
                RecommendedProducts = response.RecommendedProducts,
                ConsultDoctorIf = response.ConsultDoctorIf,
                Disclaimer = response.Disclaimer,
                GeneratedAt = response.GeneratedAt,
                EngineUsed = response.EngineUsed
            };

            var history = new SymptomAdviceHistory
            {
                PatientEmail = patientEmail,
                Symptom = symptom,
                SymptomCategory = response.SymptomCategory,
                Summary = response.Summary,
                ResponseJson = JsonSerializer.Serialize(snapshot),
                EngineUsed = response.EngineUsed,
                CreatedAt = DateTime.UtcNow
            };

            _context.SymptomAdviceHistory.Add(history);
            await _context.SaveChangesAsync();
            
            // Attach ID to response
            response.Id = history.Id;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "[Pharmacy AI] Failed to save history");
        }
    }

    public async Task<List<SymptomHistoryItemDto>> GetHistoryAsync(string? patientEmail, int limit = 20)
    {
        var query = _context.SymptomAdviceHistory.AsQueryable();

        if (!string.IsNullOrWhiteSpace(patientEmail))
            query = query.Where(h => h.PatientEmail == patientEmail);

        return await query
            .OrderByDescending(h => h.CreatedAt)
            .Take(Math.Clamp(limit, 1, 100))
            .Select(h => new SymptomHistoryItemDto
            {
                Id = h.Id,
                Symptom = h.Symptom,
                SymptomCategory = h.SymptomCategory,
                Summary = h.Summary,
                CreatedAt = h.CreatedAt,
                EngineUsed = h.EngineUsed
            })
            .ToListAsync();
    }

    public async Task<SymptomAdviceResponse?> GetHistoryDetailAsync(int id)
    {
        var history = await _context.SymptomAdviceHistory.FindAsync(id);
        if (history == null) return null;

        try
        {
            var parsed = JsonSerializer.Deserialize<SymptomAdviceResponse>(history.ResponseJson);
            if (parsed != null)
            {
                parsed.Id = history.Id;
                return parsed;
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "[Pharmacy AI] Failed to parse history {Id}", id);
        }
        return null;
    }

    public async Task<bool> DeleteHistoryAsync(int id)
    {
        var history = await _context.SymptomAdviceHistory.FindAsync(id);
        if (history == null) return false;

        _context.SymptomAdviceHistory.Remove(history);
        await _context.SaveChangesAsync();
        return true;
    }

    private static bool IsPillForm(string? name, string? sellingUnit, string? description)
    {
        var checkText = $"{name} {sellingUnit} {description}".ToLowerInvariant();
        if (!string.IsNullOrWhiteSpace(sellingUnit))
        {
            var unit = sellingUnit.ToLowerInvariant();
            if (unit.Contains("pill") || unit.Contains("tablet") ||
                unit.Contains("capsule") || unit == "cap") return true;
        }
        return PillKeywords.Any(k => checkText.Contains(k));
    }

    private async Task<SymptomAdviceResponse?> CallGeminiAsync(string apiKey, string symptom, string productList)
    {
        var configuredModel = _config["Gemini:Model"];
        var modelsToTry = new List<string>();
        if (!string.IsNullOrWhiteSpace(configuredModel)) modelsToTry.Add(configuredModel.Trim());
        foreach (var m in new[] { "gemini-flash-lite-latest", "gemini-3.5-flash", "gemini-3.5-flash-lite" })
        {
            if (!modelsToTry.Contains(m)) modelsToTry.Add(m);
        }

        var prompt = $@"You are a warm, caring Pharmacy Wellness Assistant in Sri Lanka.

PATIENT SYMPTOM: ""{symptom}""

AVAILABLE OTC NON-PILL PRODUCTS:
{(string.IsNullOrWhiteSpace(productList) ? "(None available)" : productList)}

TASK:
1. Symptom category
2. 4-6 home remedies (priority)
3. 3-4 warning signs
4. 2-4 OTC non-pill products from list
5. 3-4 ""consult doctor if"" conditions
6. Warm summary

RULES:
- HOME REMEDIES FIRST
- NO tablets/capsules/pills
- Only from list above
- If needs prescription → say consult doctor
- Always mention ""if symptoms worsen, see a doctor""
- Sri Lanka context
- Warm, human tone

RETURN JSON:
{{
  ""symptomCategory"": ""..."",
  ""summary"": ""..."",
  ""homeRemedies"": [""..."", ""..."", ""..."", ""...""],
  ""warningSigns"": [""..."", ""..."", ""...""],
  ""recommendedProducts"": [
    {{""medicineId"": 123, ""whyRecommended"": ""..."", ""howToUse"": ""..."", ""duration"": ""..."", ""productType"": ""Lotion""}}
  ],
  ""consultDoctorIf"": [""..."", ""...""]
}}";

        var payload = new
        {
            contents = new[] { new { parts = new object[] { new { text = prompt } } } },
            generationConfig = new { responseMimeType = "application/json", temperature = 0.4, maxOutputTokens = 3072 }
        };

        foreach (var model in modelsToTry)
        {
            try
            {
                var endpoint = $"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={apiKey}";
                var response = await _httpClient.PostAsync(endpoint, new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json"));
                if (!response.IsSuccessStatusCode) continue;

                var json = await response.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(json);
                var text = doc.RootElement.GetProperty("candidates")[0].GetProperty("content").GetProperty("parts")[0].GetProperty("text").GetString();
                if (string.IsNullOrWhiteSpace(text)) continue;

                var cleanJson = SanitizeJson(text);
                var parsed = JsonSerializer.Deserialize<SymptomAdviceResponse>(cleanJson, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                if (parsed != null)
                {
                    parsed.Symptom = symptom;
                    parsed.Disclaimer = "⚠️ This is general wellness guidance only. If symptoms worsen, please see a doctor.";
                    return parsed;
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "[Pharmacy AI] Model {Model} failed", model);
            }
        }
        return null;
    }

    private static string SanitizeJson(string text)
    {
        var clean = text.Trim();
        if (clean.StartsWith("```json")) clean = clean.Substring(7);
        else if (clean.StartsWith("```")) clean = clean.Substring(3);
        if (clean.EndsWith("```")) clean = clean.Substring(0, clean.Length - 3);
        clean = clean.Trim();
        var first = clean.IndexOf('{');
        var last = clean.LastIndexOf('}');
        if (first >= 0 && last > first) clean = clean.Substring(first, last - first + 1);
        return clean;
    }

    private static void MapRecommendedProducts(SymptomAdviceResponse response, List<Medicine> availableProducts)
    {
        var enriched = new List<RecommendedProductDto>();
        foreach (var rec in response.RecommendedProducts)
        {
            var med = availableProducts.FirstOrDefault(m => m.Id == rec.MedicineId);
            if (med == null) continue;

            enriched.Add(new RecommendedProductDto
            {
                MedicineId = med.Id,
                Name = med.Name,
                Category = med.Category?.Name ?? "General",
                Price = med.Price,
                StockQuantity = med.StockQuantity,
                BrandName = med.BrandName,
                ProductType = rec.ProductType,
                WhyRecommended = rec.WhyRecommended,
                HowToUse = rec.HowToUse,
                Duration = rec.Duration
            });
        }
        response.RecommendedProducts = enriched;
    }

    private static SymptomAdviceResponse BuildFallbackResponse(string symptom)
    {
        return new SymptomAdviceResponse
        {
            Symptom = symptom,
            SymptomCategory = "General Wellness",
            Summary = "Here are some friendly tips. If you're not better soon, please consult our pharmacist.",
            HomeRemedies = new List<string>
            {
                "Rest in a comfortable, cool place",
                "Stay well hydrated",
                "Eat light meals",
                "Avoid strenuous activities",
                "Monitor symptoms"
            },
            WarningSigns = new List<string>
            {
                "Symptoms worsen rapidly",
                "High fever above 39°C",
                "Difficulty breathing"
            },
            ConsultDoctorIf = new List<string>
            {
                "Symptoms persist more than 2-3 days",
                "You feel worse over time",
                "New symptoms appear"
            },
            Disclaimer = "⚠️ This is general wellness guidance only.",
            EngineUsed = "HealthBridge Pharmacy Wellness AI (Fallback)",
            GeneratedAt = DateTime.UtcNow
        };
    }
}
