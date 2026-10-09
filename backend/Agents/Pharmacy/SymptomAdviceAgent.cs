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

    private static bool ShouldAskClarifyingQuestions(
        string symptom,
        Dictionary<string, string>? priorAnswers)
    {
        // If user already answered → do NOT ask again
        if (priorAnswers != null && priorAnswers.Count > 0)
            return false;
        
        if (string.IsNullOrWhiteSpace(symptom)) return false;
        var s = symptom.ToLowerInvariant();
        
        // NEVER ask for emergencies — respond directly with 1990
        if (s.Contains("chest pain") ||
            s.Contains("can't breathe") ||
            s.Contains("cannot breathe") ||
            s.Contains("unconscious") ||
            s.Contains("severe bleeding") ||
            s.Contains("heart attack") ||
            s.Contains("stroke") ||
            s.Contains("suicidal") ||
            s.Contains("not breathing") ||
            s.Contains("choking"))
            return false;
        
        // NEVER ask for simple symptoms — respond directly
        if (s.Contains("headache") ||
            s.Contains("fever") ||
            s.Contains("cough") ||
            s.Contains("cold") ||
            s.Contains("skin rash") ||
            s.Contains("stomach ache") ||
            s.Contains("sore throat") ||
            s.Contains("nausea") ||
            s.Contains("vomiting"))
            return false;
        
        // ASK for accidents
        if (s.Contains("hit me") ||
            s.Contains("hit by") ||
            s.Contains("accident") ||
            s.Contains("fell") ||
            s.Contains("slip") ||
            s.Contains("bicycle") ||
            s.Contains("car hit") ||
            s.Contains("bike hit") ||
            s.Contains("crash") ||
            s.Contains("collision") ||
            s.Contains("injured"))
            return true;
        
        // ASK for bites/stings
        if (s.Contains("bite") ||
            s.Contains("bitten") ||
            s.Contains("sting") ||
            s.Contains("stab") ||
            s.Contains("wound"))
            return true;
        
        // ASK for burns / shock / poisoning
        if (s.Contains("burn") ||
            s.Contains("electric shock") ||
            s.Contains("electrocuted") ||
            s.Contains("poison") ||
            s.Contains("swallowed") ||
            s.Contains("drowning"))
            return true;
        
        return false;
    }

    public async Task<SymptomAdviceResponse> GetAdviceAsync(
        string symptom, 
        string? patientEmail,
        Dictionary<string, string>? clarifyingAnswers = null)
    {
        symptom = symptom?.Trim() ?? "";
        if (string.IsNullOrWhiteSpace(symptom))
            return BuildFallbackResponse(symptom);

        var askClarifying = ShouldAskClarifyingQuestions(symptom, clarifyingAnswers);
        var symptomLower = symptom.ToLowerInvariant();
        var cacheKey = $"symptom_v4_{symptomLower}";
        
        SymptomAdviceResponse? result = null;
        bool fromCache = false;

        // Check cache (only if not asking clarifying questions AND no prior answers were supplied)
        if (!askClarifying && clarifyingAnswers == null && _cache.TryGetValue(cacheKey, out SymptomAdviceResponse? cached) && cached != null)
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
                $"- ID:{m.Id} | Name: {m.Name} | Category: {m.Category?.Name ?? "General"} | Price: Rs.{m.Price} | Stock: {m.StockQuantity} | Description: {m.Description ?? "(no description)"}"));

            var apiKey = GetGeminiApiKey();
            if (!string.IsNullOrWhiteSpace(apiKey))
            {
                try
                {
                    var aiResponse = await CallGeminiAsync(apiKey, symptom, productList, askClarifying, clarifyingAnswers);
                    if (aiResponse != null)
                    {
                        if (askClarifying)
                        {
                            aiResponse.NeedsClarification = true;
                            aiResponse.EngineUsed = "Google Gemini LLM (Pharmacy Wellness AI)";
                            return aiResponse;
                        }

                        MapRecommendedProducts(aiResponse, recommendedPool, symptom);
                        aiResponse.EngineUsed = "Google Gemini LLM (Pharmacy Wellness AI)";
                        
                        if (clarifyingAnswers == null)
                        {
                            _cache.Set(cacheKey, aiResponse, TimeSpan.FromHours(6));
                        }

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

    private async Task<SymptomAdviceResponse?> CallGeminiAsync(
        string apiKey, 
        string symptom, 
        string productList,
        bool askClarifying = false,
        Dictionary<string, string>? clarifyingAnswers = null)
    {
        var configuredModel = _config["Gemini:Model"];
        var modelsToTry = new List<string>();
        if (!string.IsNullOrWhiteSpace(configuredModel)) modelsToTry.Add(configuredModel.Trim());
        foreach (var m in new[] { "gemini-flash-lite-latest", "gemini-3.5-flash", "gemini-3.5-flash-lite" })
        {
            if (!modelsToTry.Contains(m)) modelsToTry.Add(m);
        }

        var answersText = clarifyingAnswers != null && clarifyingAnswers.Count > 0
            ? string.Join("\n", clarifyingAnswers.Select(kv => $"- {kv.Key}: {kv.Value}"))
            : "";

        var prompt = $@"You are a warm, caring Pharmacy Wellness Assistant in Sri Lanka.

PATIENT SYMPTOM: ""{symptom}""

AVAILABLE OTC NON-PILL PRODUCTS:
{(string.IsNullOrWhiteSpace(productList) ? "(None available)" : productList)}

{(askClarifying ? $@"
━━━ CLARIFYING QUESTIONS MODE — ACTIVE ━━━

The user's input describes an accident, injury, bite, burn,
shock, or poisoning. Critical details are missing.

You MUST ask 2-3 clarifying questions SPECIFIC to this
incident type BEFORE giving final advice.

EXAMPLES (illustrative, NOT templates — do NOT copy these):

- Bicycle/car accident → head hit? bleeding? limb movement?
- Electric shock → still in contact with source? conscious?
                    burns visible? heart rhythm issues?
- Snake bite → what snake? how long ago? swelling? 
              drooping eyelids? difficulty breathing?
- Dog bite → pet or stray? skin broken? vaccinated?
- Burn → what caused it? what size? which body part? 
         blisters?
- Poisoning → what substance? how much? when? vomiting?
- Stab wound → where? bleeding? object still inside?
- Fall → head hit? can stand? which limb hurts?
- Drowning → how long underwater? conscious now? 
             breathing normally?

RULES:
1. Ask 2-3 questions ONLY.
2. Questions must be SPECIFIC to the incident.
3. Do NOT reuse the example questions above.
4. Write NEW questions that fit THIS incident.
5. Each question must have 2-4 tappable options.
6. Do NOT ask generic questions like ""are you okay?""
7. The answers must materially change your final advice.
8. Ask in the user's language (Sinhala/Singlish/English).

Return JSON with:

{{
  ""needsClarification"": true,
  ""clarifyingQuestions"": [
    {{
      ""id"": ""unique_snake_case_id"",
      ""question"": ""Your specific question"",
      ""options"": [""Option A"", ""Option B"", ""Option C""]
    }}
  ],
  ""symptomCategory"": ""Injury — Pending Assessment"",
  ""summary"": ""Let me ask a few quick questions to guide you."",
  ""homeRemedies"": [],
  ""recommendedProducts"": [],
  ""warningSigns"": [],
  ""consultDoctorIf"": [],
  ""disclaimer"": """"
}}
" : "")}

{(!askClarifying && !string.IsNullOrEmpty(answersText) ? $@"
━━━ FINAL ADVICE MODE — ANSWERS PROVIDED ━━━

Original symptom: {symptom}

The user answered your clarifying questions:
{answersText}

Now provide FINAL advice based on these answers.

If the answers indicate an emergency (head hit, can't move, heavy bleeding, breathing issues):
- Set symptomCategory to include ""Emergency""
- Summary must urge 1990 / nearest hospital IMMEDIATELY
- recommendedProducts = []
- Focus on first aid steps

Otherwise, provide normal structured advice.

Return the FULL JSON structure (all fields populated).
" : "")}

{(!askClarifying && string.IsNullOrEmpty(answersText) ? $@"
━━━ NORMAL MODE — DIRECT ADVICE ━━━

TASK:
1. Symptom category
2. 4-6 home remedies (priority)
3. 3-4 warning signs
4. 2-4 OTC non-pill products from list (ONLY relevant ones)
5. 3-4 ""consult doctor if"" conditions
6. Warm summary

PRODUCT RECOMMENDATION RULES:

Each product has a DESCRIPTION that tells you what it
treats. You MUST use the description to match the user's
symptom.

HOW TO MATCH:
1. Read the user's symptom carefully.
2. Read each product's DESCRIPTION in the list above.
3. Recommend ONLY products whose description mentions
   the user's symptom (or a close synonym).

PREFER ORAL OVER TOPICAL:

When the symptom is INTERNAL (headache, fever, body ache,
stomach, cough, cold, sore throat):
→ PREFER oral medicines (tablets, syrups, lozenges)
→ Only recommend topical balms/creams if NO oral option
  exists in the inventory

When the symptom is EXTERNAL (skin rash, cut, wound,
insect bite, muscle/joint injury, sprain):
→ PREFER topical products (balms, creams, lotions,
  antiseptics, bandages)

EXAMPLES:
- ""headache"" → Paracetamol (oral) — NOT Tiger Balm
- ""fever"" → Paracetamol — NOT Vicks VapoRub
- ""sore throat"" → Strepsils Lozenges — NOT Vicks
- ""cough"" → Ascoril Cough Syrup — NOT Vicks
- ""sprained ankle"" → Volini Gel or Bam Balm + Crepe Bandage
- ""skin rash"" → Calamine Lotion
- ""cut on my hand"" → Dettol + Adhesive Plasters
- ""muscle pain"" → Bam Balm or Tiger Balm
- ""acidity"" → Omeprazole
- ""allergy"" → Cetirizine

STRICT RULES:
1. Only recommend products whose description matches
   the user's symptom.
2. Maximum 3 products.
3. Prefer ORAL for internal symptoms.
4. For headache/fever/body ache, always prefer Paracetamol
   over topical balms.
5. For emergencies (bite, sting, chest pain, stroke,
   severe bleeding, poisoning, mental health):
   → Return recommendedProducts = []
6. Never recommend supplements (Whey Protein, Vitamin C)
   unless the user is asking about nutrition/fitness.
7. Use only medicineId values from the inventory list above.

RULES:
- HOME REMEDIES FIRST
- NO tablets/capsules/pills
- Sri Lanka context
- Warm, human tone
- Always mention ""if symptoms worsen, see a doctor""
" : "")}

RETURN STRICT JSON ONLY:
{{
  ""symptomCategory"": ""..."",
  ""summary"": ""..."",
  ""homeRemedies"": [""..."", ""...""],
  ""warningSigns"": [""..."", ""...""],
  ""recommendedProducts"": [
    {{""medicineId"": 123, ""whyRecommended"": ""..."", 
      ""howToUse"": ""..."", ""duration"": ""..."", 
      ""productType"": ""Lotion""}}
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

    private static void MapRecommendedProducts(
        SymptomAdviceResponse response, 
        List<Medicine> availableProducts,
        string symptom)
    {
        // Emergency category → clear all products
        var cat = (response.SymptomCategory ?? "").ToLowerInvariant();
        if (cat.Contains("emergency") ||
            cat.Contains("trauma") ||
            cat.Contains("bite") ||
            cat.Contains("sting") ||
            cat.Contains("wound") ||
            cat.Contains("mental") ||
            cat.Contains("attack") ||
            cat.Contains("accident"))
        {
            response.RecommendedProducts.Clear();
            return;
        }

        // Determine if user actually asked about supplements
        var s = (symptom ?? "").ToLowerInvariant();
        bool userAskedSupplements =
            s.Contains("protein") ||
            s.Contains("gym") ||
            s.Contains("fitness") ||
            s.Contains("vitamin") ||
            s.Contains("supplement") ||
            s.Contains("immunity") ||
            s.Contains("energy");

        var enriched = new List<RecommendedProductDto>();

        foreach (var rec in response.RecommendedProducts)
        {
            var med = availableProducts.FirstOrDefault(m => m.Id == rec.MedicineId);
            if (med == null) continue;

            var medCat = (med.Category?.Name ?? "").ToLowerInvariant();
            bool isSupplement = medCat.Contains("vitamin") || medCat.Contains("supplement");

            // Skip supplements unless user asked about them
            if (isSupplement && !userAskedSupplements) continue;

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
