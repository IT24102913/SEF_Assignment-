using System.Diagnostics;
using System.Net;
using System.Text;
using System.Text.Json;
using HealthBridge.Api.DTOs.Pharmacy;

namespace HealthBridge.Api.Agents;

/// <summary>
/// PrescriptionValidatorAgent — Hybrid 3-Stage Pharmacy Prescription Analyzer
///
/// Uses Google Gemini Flash fallback cascade for vision and reasoning.
///
/// ARCHITECTURE:
///   Stage 1 — Extraction: Image → Facts (JSON)
///   Stage 2 — Verdict: Facts → AI suggestion (advisory only)
///   Stage 3 — C# Safety: Hard rules override / add flags
///
/// DESIGN PRINCIPLE:
///   AI = ADVISORY ONLY. Pharmacist = FINAL DECISION MAKER.
///
/// Verdict values:
///   looks_valid | has_concerns | unclear | not_a_prescription
/// </summary>
public class PrescriptionValidatorAgent
{
    private readonly IConfiguration _config;
    private readonly ILogger<PrescriptionValidatorAgent> _logger;
    private readonly HttpClient _httpClient;

    // Multimodal Vision AI Model Cascade — tries each model in order
    private static readonly string[] ModelFallbackCascade = new[]
    {
        "gemini-3.8-flash",
        "gemini-3.5-flash",
        "gemini-3.5-flash-lite",
        "gemini-flash-lite-latest"
    };
    private const string GeminiBaseUrl =
        "https://generativelanguage.googleapis.com/v1beta/models";

    // Old-prescription threshold (months)
    private const int OldPrescriptionThresholdMonths = 6;

    // ═══════════════════════════════════════════════════════════════════
    //  CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════
    public PrescriptionValidatorAgent(
        IConfiguration config,
        ILogger<PrescriptionValidatorAgent> logger,
        IHttpClientFactory httpClientFactory)
    {
        _config = config;
        _logger = logger;
        _httpClient = httpClientFactory.CreateClient("GeminiClient");
    }

    // ═══════════════════════════════════════════════════════════════════
    //  PUBLIC ENTRY POINT
    // ═══════════════════════════════════════════════════════════════════
    public async Task<AIPpVerificationResponse> ValidatePrescriptionAsync(
        string prescriptionImageUrl,
        string requestedTestName)
    {
        var sw = Stopwatch.StartNew();
        _logger.LogInformation(
            "[PrescriptionValidatorAgent] Starting 3-stage validation for: {TestName}",
            requestedTestName);

        try
        {
            // ─────────────────────────────────────────────────────────
            // Load image as base64
            // ─────────────────────────────────────────────────────────
            var base64Data = await GetBase64ImageAsync(prescriptionImageUrl);
            if (string.IsNullOrEmpty(base64Data))
            {
                return BuildFallbackResponse(
                    requestedTestName,
                    "Unable to load prescription image file.",
                    sw.ElapsedMilliseconds);
            }

            // ─────────────────────────────────────────────────────────
            // STAGE 1 — Extract facts from image
            // ─────────────────────────────────────────────────────────
            var extractionJson = await RunStage1ExtractionAsync(
                base64Data, requestedTestName, sw);

            if (extractionJson == null)
            {
                return BuildFallbackResponse(
                    requestedTestName,
                    "Stage 1 extraction failed. Manual review required.",
                    sw.ElapsedMilliseconds);
            }

            _logger.LogInformation("[Stage 1] Extraction succeeded.");

            // ─────────────────────────────────────────────────────────
            // STAGE 2 — AI Verdict Reasoning (text-only Gemini call)
            // ─────────────────────────────────────────────────────────
            var stage2Result = await RunStage2VerdictAsync(
                extractionJson.Value, requestedTestName, sw);

            _logger.LogInformation(
                "[Stage 2] AI suggested verdict: {Verdict}",
                stage2Result?.Verdict ?? "unknown");

            // ─────────────────────────────────────────────────────────
            // STAGE 3 — C# Safety Rules (hard overrides + flag injection)
            // ─────────────────────────────────────────────────────────
            var safetyResult = ApplyStage3SafetyRules(
                extractionJson.Value, stage2Result, requestedTestName);

            _logger.LogInformation(
                "[Stage 3] Final verdict after safety rules: {Verdict}",
                safetyResult.Verdict);

            // ─────────────────────────────────────────────────────────
            // ASSEMBLE — Populate AIPpVerificationResponse
            // ─────────────────────────────────────────────────────────
            var finalResponse = AssembleFinalResponse(
                extractionJson.Value,
                stage2Result,
                safetyResult,
                requestedTestName,
                sw.ElapsedMilliseconds);

            _logger.LogInformation(
                "[PrescriptionValidatorAgent] Completed in {ElapsedMs}ms — Verdict: {Verdict}",
                sw.ElapsedMilliseconds, finalResponse.Verdict);

            return finalResponse;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex,
                "[PrescriptionValidatorAgent] Fatal error during validation");
            return BuildFallbackResponse(
                requestedTestName,
                $"AI processing error: {ex.Message}. Manual review required.",
                sw.ElapsedMilliseconds);
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    //  STAGE 1 — EXTRACTION (image → facts, no verdict)
    // ═══════════════════════════════════════════════════════════════════
    private async Task<JsonElement?> RunStage1ExtractionAsync(
        string base64Data,
        string requestedTestName,
        Stopwatch sw)
    {
        var prompt = BuildStage1Prompt(requestedTestName);

        var requestBody = new
        {
            contents = new[]
            {
                new
                {
                    parts = new object[]
                    {
                        new { text = prompt },
                        new
                        {
                            inline_data = new
                            {
                                mime_type = "image/jpeg",
                                data = base64Data
                            }
                        }
                    }
                }
            },
            generationConfig = new
            {
                temperature = 0.0,
                maxOutputTokens = 4096
            }
        };

        var result = await CallGeminiAsync(requestBody, "Stage 1", sw);
        // Note: CallGeminiAsync already tries all fallback models internally.
        // If it returns null, all models failed — no point retrying the same cascade.
        return result;
    }

    // ═══════════════════════════════════════════════════════════════════
    //  STAGE 1 PROMPT — pure extraction, no verdict
    // ═══════════════════════════════════════════════════════════════════
    private static string BuildStage1Prompt(string requestedTestName) => $@"
You are an OCR + visual extraction system for a pharmacy prescription verification pipeline.

YOUR ONLY JOB: extract facts from this image.
DO NOT judge authenticity. DO NOT give verdicts. DO NOT classify as fake/real.

Return STRICT JSON matching the schema below. No markdown. No commentary.

═══════════════════════════════════════════════════════════════════
1. DOCUMENT CATEGORY (classification only — no judgment)
═══════════════════════════════════════════════════════════════════
document_category: exactly one of:
  - ""handwritten_prescription""  (doctor handwritten on real paper)
  - ""printed_prescription""      (computer-printed prescription form)
  - ""unrelated_document""        (forms, exercises, receipts, non-medical text)
  - ""random_photo""              (people, objects, anime, art, screenshots)

═══════════════════════════════════════════════════════════════════
2. WATERMARK / OVERLAY TEXT (exact strings only)
═══════════════════════════════════════════════════════════════════
Look for ANY overlaid / stamped / watermark text, e.g.:
  ""SAMPLE"", ""SPECIMEN"", ""VOID"", ""DRAFT"", ""TRAINING DATA"",
  ""DO NOT USE"", ""MOCKUP"", ""TEMPLATE"".
Return EXACT strings. If none, return [].

═══════════════════════════════════════════════════════════════════
3. ANNOTATION ERROR LABELS (exact strings only)
═══════════════════════════════════════════════════════════════════
Look for colored annotation labels overlaid on fields, e.g.:
  ""ERROR"", ""FORGERY"", ""MISMATCH"", ""DUPLICATE"", ""TYPO"",
  ""DOSAGE ERROR"", ""SIG MISMATCH"".
Return EXACT strings. If none, return [].

═══════════════════════════════════════════════════════════════════
4. DOCUMENT FIELDS (extract if present, else null)
═══════════════════════════════════════════════════════════════════
- doctor_name
- doctor_license_number
- clinic_name
- clinic_phone           (as written, e.g. ""077-1234567"")
- clinic_email
- clinic_address
- patient_name
- date_written           (YYYY-MM-DD if possible)
- drug_names             (array of strings)

                          FOR EACH MEDICINE, output ONE string
                          in this exact format:
                          ""DRUGNAME STRENGTH - DOSAGE | FREQUENCY | DURATION""

                          Rules:
                          • Preserve the drug name and strength
                            exactly as written
                          • Expand ALL medical abbreviations with
                            meaning in parentheses
                          • Use "" | "" as separator
                          • If a field is missing, omit that part

                          ABBREVIATION EXPANSION:
                            OD / qd     = once daily
                            BD / BID    = twice daily
                            TDS / TID   = three times daily
                            QID         = four times daily
                            QHS         = at bedtime
                            nocte       = at bedtime
                            mane        = in the morning
                            PRN         = as needed
                            STAT        = immediately
                            AC          = before meals
                            PC          = after meals
                            PO          = by mouth
                            SL          = sublingual
                            TOP         = topical
                            INH         = inhalation
                            q4h/q6h/q8h = every 4/6/8 hours
                            x N days    = for N days

                          EXAMPLES:
                            ""Amoxil 250mg - 1 capsule | TDS (three times daily) | 7 days""
                            ""Panadol 500mg - 1 tablet | BD (twice daily) | 5 days | Before meals""
                            ""Cetirizine 10mg - 1 tablet | nocte (at bedtime) | 5 days""

                          WRONG (do NOT do this):
                            ""Amoxil 250mg""  ← missing dosage
                            ""Amoxil 250mg - 1 cap TDS x 7 days""  ← unexpanded
- has_signature          (boolean)
- has_stamp_or_seal      (boolean)

═══════════════════════════════════════════════════════════════════
5. RENDERING STYLE (visual evidence only)
═══════════════════════════════════════════════════════════════════
rendering_style: exactly one of:
  - ""photographed_paper""    (real photo: shadows, paper texture, lighting)
  - ""scanned_document""      (flat scan: uniform lighting, no camera angle)
  - ""flat_vector_graphic""   (computer graphic: no texture, clean edges)
  - ""screenshot""            (software UI: window chrome, taskbar, buttons)

rendering_reasoning: describe the specific visual cues you used.

═══════════════════════════════════════════════════════════════════
6. UI CHROME CHECK
═══════════════════════════════════════════════════════════════════
shows_ui_chrome: TRUE only if the DOCUMENT ITSELF is a screenshot of
software (visible app window, browser tab, taskbar INSIDE the image frame).
FALSE if the photo was taken with a phone/camera — even if camera UI
is visible AROUND the document edges.

ui_chrome_reasoning: describe what you saw.

═══════════════════════════════════════════════════════════════════
7. AUTHENTICITY SIGNALS
═══════════════════════════════════════════════════════════════════
- phone_looks_like_placeholder   (e.g. 555-XXXX, 000-0000, 123-4567)
- phone_reasoning                (name the exact phone + reason)
- email_looks_valid              (false if domain is garbled/nonsense)
- email_reasoning
- address_looks_plausible        (false if malformed)
- address_reasoning

═══════════════════════════════════════════════════════════════════
OUTPUT SCHEMA (strict JSON)
═══════════════════════════════════════════════════════════════════
{{
  ""document_category"": ""..."",
  ""document_type_description"": ""brief description"",
  ""visible_watermark_or_overlay_text"": [],
  ""annotation_error_labels_present"": [],
  ""doctor_name"": null,
  ""doctor_license_number"": null,
  ""clinic_name"": null,
  ""clinic_phone"": null,
  ""clinic_email"": null,
  ""clinic_address"": null,
  ""patient_name"": null,
  ""date_written"": null,
  ""drug_names"": [],
  ""has_signature"": false,
  ""has_stamp_or_seal"": false,
  ""rendering_style"": ""..."",
  ""rendering_reasoning"": ""..."",
  ""shows_ui_chrome"": false,
  ""ui_chrome_reasoning"": ""..."",
  ""phone_looks_like_placeholder"": false,
  ""phone_reasoning"": ""..."",
  ""email_looks_valid"": true,
  ""email_reasoning"": ""..."",
  ""address_looks_plausible"": true,
  ""address_reasoning"": ""..."",
  ""extraction_confidence"": 0.0
}}

REQUESTED ITEM (for reference only): ""{requestedTestName}""";

    // ═══════════════════════════════════════════════════════════════════
    //  STAGE 2 — AI VERDICT REASONING (text-only)
    // ═══════════════════════════════════════════════════════════════════
    private async Task<Stage2VerdictResult?> RunStage2VerdictAsync(
        JsonElement extraction,
        string requestedTestName,
        Stopwatch sw)
    {
        try
        {
            var factsJson = JsonSerializer.Serialize(extraction, new JsonSerializerOptions
            {
                WriteIndented = false
            });

            var prompt = $@"You are an AI verdict advisor for a pharmacy prescription verification pipeline.

The pharmacist is the FINAL DECISION MAKER. You only provide an advisory suggestion.

You will receive EXTRACTED FACTS from a prescription image (not the image itself).

Your task: Analyze the facts and suggest ONE of these verdicts:
  - ""looks_valid""         : No major concerns found
  - ""has_concerns""        : Suspicious signals detected
  - ""unclear""             : Cannot determine; needs human review
  - ""not_a_prescription""  : Not a medical document at all

═══════════════════════════════════════════════════════════════════
EXTRACTED FACTS
═══════════════════════════════════════════════════════════════════
{factsJson}

═══════════════════════════════════════════════════════════════════
DECISION GUIDANCE (use judgment — not strict rules)
═══════════════════════════════════════════════════════════════════
- If document_category = ""random_photo"" or ""unrelated_document"" → not_a_prescription
- If watermarks contain SAMPLE/VOID/TRAINING/DO NOT USE → has_concerns
- If annotation error labels present (FORGERY/TYPO/ERROR) → has_concerns
- If shows_ui_chrome = true → not_a_prescription
- If rendering_style = flat_vector_graphic → has_concerns
- If phone_looks_like_placeholder = true → has_concerns
- If email_looks_valid = false → has_concerns
- If has_signature = false AND has_stamp_or_seal = false → unclear
- If doctor_name missing AND clinic_name missing → unclear
- If everything looks reasonable → looks_valid
- NOTE: Missing phone number alone is NOT a concern.

═══════════════════════════════════════════════════════════════════
OUTPUT SCHEMA (strict JSON)
═══════════════════════════════════════════════════════════════════
{{
  ""verdict"": ""looks_valid"" | ""has_concerns"" | ""unclear"" | ""not_a_prescription"",
  ""reasoning"": ""1-3 sentences explaining your verdict"",
  ""confidence"": 0.0,
  ""concerns"": [""specific concern 1"", ""specific concern 2""]
}}

REQUESTED ITEM: ""{requestedTestName}""";

            var requestBody = new
            {
                contents = new[]
                {
                    new
                    {
                        parts = new object[]
                        {
                            new { text = prompt }
                        }
                    }
                },
                generationConfig = new
                {
                    temperature = 0.0,
                    maxOutputTokens = 2048,
                    responseMimeType = "application/json"
                }
            };

            var result = await CallGeminiAsync(requestBody, "Stage 2", sw);
            if (result == null) return null;

            var root = result.Value;
            var stage2 = new Stage2VerdictResult
            {
                Verdict = root.TryGetProperty("verdict", out var v)
                    ? v.GetString() ?? "unclear" : "unclear",
                Reasoning = root.TryGetProperty("reasoning", out var r)
                    ? r.GetString() ?? "" : "",
                Confidence = root.TryGetProperty("confidence", out var c)
                    && c.ValueKind == JsonValueKind.Number ? c.GetDouble() : 0.7,
                Concerns = new List<string>()
            };

            if (root.TryGetProperty("concerns", out var concerns)
                && concerns.ValueKind == JsonValueKind.Array)
            {
                foreach (var item in concerns.EnumerateArray())
                {
                    if (item.GetString() is string s && !string.IsNullOrWhiteSpace(s))
                        stage2.Concerns.Add(s);
                }
            }

            return stage2;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[Stage 2] Exception during verdict reasoning");
            return null;
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    //  STAGE 3 — C# SAFETY RULES (hard overrides)
    // ═══════════════════════════════════════════════════════════════════
    private Stage3SafetyResult ApplyStage3SafetyRules(
        JsonElement extraction,
        Stage2VerdictResult? stage2,
        string requestedTestName)
    {
        var result = new Stage3SafetyResult();

        // Start from Stage 2's suggestion, or default to unclear
        result.Verdict = stage2?.Verdict ?? "unclear";
        result.Reasoning = stage2?.Reasoning ?? "AI could not determine verdict.";
        result.Confidence = stage2?.Confidence ?? 0.5;
        result.Flags = new List<string>(stage2?.Concerns ?? new List<string>());

        // ─────────────────────────────────────────────────────────────
        // Read extraction facts
        // ─────────────────────────────────────────────────────────────
        string docCategory = GetString(extraction, "document_category");
        string renderingStyle = GetString(extraction, "rendering_style");
        bool showsUiChrome = GetBool(extraction, "shows_ui_chrome");
        bool phoneFake = GetBool(extraction, "phone_looks_like_placeholder");
        bool emailInvalid = !GetBool(extraction, "email_looks_valid", true);
        bool hasSignature = GetBool(extraction, "has_signature");
        bool hasStamp = GetBool(extraction, "has_stamp_or_seal");
        string? doctorName = GetStringOrNull(extraction, "doctor_name");
        string? clinicName = GetStringOrNull(extraction, "clinic_name");
        string? dateWritten = GetStringOrNull(extraction, "date_written");

        var watermarks = GetStringList(extraction, "visible_watermark_or_overlay_text");
        var annotationLabels = GetStringList(extraction, "annotation_error_labels_present");

        // ─────────────────────────────────────────────────────────────
        // RULE 1: Watermark detected → force has_concerns
        // ─────────────────────────────────────────────────────────────
        if (watermarks.Count > 0)
        {
            foreach (var wm in watermarks)
                result.Flags.Add($"⚠️ Watermark/Stamp detected: \"{wm}\" — this prescription is marked as a SAMPLE, VOID, or training document and is NOT valid for dispensing.");
            result.Verdict = "has_concerns";
            result.Reasoning = "Watermark/overlay text detected on the prescription.";
        }

        // ─────────────────────────────────────────────────────────────
        // RULE 2: Annotation error labels → force has_concerns
        // ─────────────────────────────────────────────────────────────
        if (annotationLabels.Count > 0)
        {
            foreach (var lbl in annotationLabels)
                result.Flags.Add($"⚠️ Annotation error label found: \"{lbl}\" — label suggests this document was tampered with or annotated as an example/training file.");
            result.Verdict = "has_concerns";
            result.Reasoning = "Annotation error labels detected — likely a training/tampered document.";
        }

        // ─────────────────────────────────────────────────────────────
        // RULE 3: UI chrome → not_a_prescription
        // ─────────────────────────────────────────────────────────────
        if (showsUiChrome)
        {
            result.Flags.Add("⚠️ Screenshot detected — image shows browser/app window chrome (taskbar, tabs, UI buttons). This is a screenshot of software, not a photo of a real physical prescription paper.");
            result.Verdict = "not_a_prescription";
            result.Reasoning = "Image appears to be a screenshot of software, not a real prescription.";
        }

        // ─────────────────────────────────────────────────────────────
        // RULE 4: Random photo / unrelated document → not_a_prescription
        // ─────────────────────────────────────────────────────────────
        if (docCategory == "random_photo" || docCategory == "unrelated_document")
        {
            result.Flags.Add($"⚠️ Document type: {docCategory} — not a prescription.");
            result.Verdict = "not_a_prescription";
            result.Reasoning = "Document is not a medical prescription.";
        }

        // ─────────────────────────────────────────────────────────────
        // RULE 5: Flat vector graphic → has_concerns
        // ─────────────────────────────────────────────────────────────
        if (renderingStyle == "flat_vector_graphic")
        {
            result.Flags.Add("⚠️ Flat vector graphic rendering detected — prescription appears to be a computer-generated digital template with clean, uniform edges and no paper texture, shadows, or camera angle. Real prescriptions are photographed paper documents.");
            result.Verdict = "has_concerns";
            result.Reasoning = "Rendering style suggests a computer graphic, not a physical prescription.";
        }

        // ─────────────────────────────────────────────────────────────
        // RULE 6: Fake phone → add flag + bump risk
        // ─────────────────────────────────────────────────────────────
        if (phoneFake)
        {
            var phoneVal = GetStringOrNull(extraction, "clinic_phone") ?? "unknown";
            var phoneReason = GetString(extraction, "phone_reasoning");
            result.Flags.Add($"⚠️ Fake/placeholder phone number detected: \"{phoneVal}\" — {(string.IsNullOrWhiteSpace(phoneReason) ? "number matches known placeholder patterns (e.g. 555-XXXX, 000-0000, 123-4567)" : phoneReason)}.");
            if (result.Verdict == "looks_valid")
                result.Verdict = "has_concerns";
        }

        // ─────────────────────────────────────────────────────────────
        // RULE 7: Invalid email → add flag
        // ─────────────────────────────────────────────────────────────
        if (emailInvalid && !string.IsNullOrWhiteSpace(GetStringOrNull(extraction, "clinic_email")))
        {
            var emailVal = GetStringOrNull(extraction, "clinic_email") ?? "unknown";
            var emailReason = GetString(extraction, "email_reasoning");
            result.Flags.Add($"⚠️ Invalid clinic email domain: \"{emailVal}\" — {(string.IsNullOrWhiteSpace(emailReason) ? "email domain appears garbled or nonsensical, suggesting dummy/generated data" : emailReason)}.");
            if (result.Verdict == "looks_valid")
                result.Verdict = "has_concerns";
        }

        // ─────────────────────────────────────────────────────────────
        // RULE 8: Blank paper fake handwriting
        // (no doctor + no clinic + no signature + no stamp)
        // ─────────────────────────────────────────────────────────────
        bool noDoctor = string.IsNullOrWhiteSpace(doctorName);
        bool noClinic = string.IsNullOrWhiteSpace(clinicName);

        if (noDoctor && noClinic && !hasSignature && !hasStamp)
        {
            result.Flags.Add("⚠️ Missing all authentication markers: no doctor name, no clinic name, no signature, and no stamp/seal found. A legally valid prescription must have at least a doctor name and signature.");
            result.Verdict = "has_concerns";
            result.Reasoning = "Prescription lacks any identifying physician information or authentication marks.";
        }
        // Missing doctor name alone (but has signature/stamp) → needs review
        else if (noDoctor && noClinic && (hasSignature || hasStamp))
        {
            result.Flags.Add("ℹ️ Doctor name and clinic name are not clearly visible, though a signature or stamp is present. Manual review by pharmacist is recommended.");
            if (result.Verdict == "looks_valid")
                result.Verdict = "unclear";
        }

        // ─────────────────────────────────────────────────────────────
        // RULE 9: Old prescription (> 6 months) → unclear
        // ─────────────────────────────────────────────────────────────
        if (!string.IsNullOrWhiteSpace(dateWritten)
            && DateTime.TryParse(dateWritten, out var parsedDate))
        {
            var monthsOld = (DateTime.UtcNow - parsedDate).TotalDays / 30.0;
            if (monthsOld > OldPrescriptionThresholdMonths)
            {
                result.Flags.Add(
                    $"ℹ️ Prescription date is {(int)monthsOld} months old (written: {dateWritten}, threshold: {OldPrescriptionThresholdMonths} months). Prescriptions expire after {OldPrescriptionThresholdMonths} months and cannot be used for dispensing.");
                if (result.Verdict == "looks_valid")
                    result.Verdict = "unclear";
            }
        }

        // ─────────────────────────────────────────────────────────────
        // Missing phone alone is NOT fake — respect the rule
        // (intentionally no rule for missing phone)
        // ─────────────────────────────────────────────────────────────

        // Deduplicate flags
        result.Flags = result.Flags.Distinct().ToList();

        return result;
    }

    // ═══════════════════════════════════════════════════════════════════
    //  ASSEMBLE — build final response
    // ═══════════════════════════════════════════════════════════════════
    private AIPpVerificationResponse AssembleFinalResponse(
        JsonElement extraction,
        Stage2VerdictResult? stage2,
        Stage3SafetyResult safety,
        string requestedTestName,
        long elapsedMs)
    {
        // ─────────────────────────────────────────────────────────────
        // Extract fields
        // ─────────────────────────────────────────────────────────────
        string docCategory = GetString(extraction, "document_category");
        string docClass = MapCategoryToClass(docCategory);
        string docDesc = GetString(extraction, "document_type_description");

        var watermarks = GetStringList(extraction, "visible_watermark_or_overlay_text");
        var annotationLabels = GetStringList(extraction, "annotation_error_labels_present");
        var drugNames = GetStringList(extraction, "drug_names");

        string? doctorName = GetStringOrNull(extraction, "doctor_name");
        string? doctorLicense = GetStringOrNull(extraction, "doctor_license_number");
        string? clinicName = GetStringOrNull(extraction, "clinic_name");
        string? clinicPhone = GetStringOrNull(extraction, "clinic_phone");
        string? clinicEmail = GetStringOrNull(extraction, "clinic_email");
        string? clinicAddress = GetStringOrNull(extraction, "clinic_address");
        string? patientName = GetStringOrNull(extraction, "patient_name");
        string? dateWritten = GetStringOrNull(extraction, "date_written");

        bool hasSignature = GetBool(extraction, "has_signature");
        bool hasStamp = GetBool(extraction, "has_stamp_or_seal");

        string renderingStyle = GetString(extraction, "rendering_style");
        string renderingReasoning = GetString(extraction, "rendering_reasoning");
        bool showsUiChrome = GetBool(extraction, "shows_ui_chrome");
        string uiChromeReasoning = GetString(extraction, "ui_chrome_reasoning");

        bool phoneFake = GetBool(extraction, "phone_looks_like_placeholder");
        string phoneReasoning = GetString(extraction, "phone_reasoning");
        bool emailValid = GetBool(extraction, "email_looks_valid", true);
        string emailReasoning = GetString(extraction, "email_reasoning");
        bool addressPlausible = GetBool(extraction, "address_looks_plausible", true);
        string addressReasoning = GetString(extraction, "address_reasoning");

        double confidence = GetDouble(extraction, "extraction_confidence", 0.75);

        // ─────────────────────────────────────────────────────────────
        // Derive status from verdict
        // ─────────────────────────────────────────────────────────────
        string status = safety.Verdict switch
        {
            "looks_valid" => "PRE_APPROVED",
            "has_concerns" => "FLAGGED",
            "not_a_prescription" => "REJECTED",
            _ => "FLAGGED"
        };

        // ─────────────────────────────────────────────────────────────
        // Derive risk score (0-100)
        // ─────────────────────────────────────────────────────────────
        int riskScore = safety.Verdict switch
        {
            "looks_valid" => 15,
            "unclear" => 50,
            "has_concerns" => 75,
            "not_a_prescription" => 95,
            _ => 50
        };
        riskScore += Math.Min(safety.Flags.Count * 3, 15);
        riskScore = Math.Clamp(riskScore, 0, 100);

        string riskLevel = riskScore switch
        {
            <= 25 => "LOW",
            <= 60 => "MEDIUM",
            _ => "HIGH"
        };

        // ─────────────────────────────────────────────────────────────
        // Violation notice (only for REJECTED / high concern)
        // ─────────────────────────────────────────────────────────────
        string violationNotice = "";
        if (safety.Verdict == "not_a_prescription" || safety.Verdict == "has_concerns")
        {
            violationNotice =
                $"We detected that you uploaded an image that may not be a valid medical prescription " +
                $"for order verification. If this is a mistake, please re-upload a clear photo of your " +
                $"prescription or contact support at healthbridgeyourpharmacy@gmail.com.";
        }

        // ─────────────────────────────────────────────────────────────
        // Build authenticity signals DTO
        // ─────────────────────────────────────────────────────────────
        var authSignals = new AuthenticitySignalsPpDto
        {
            PhoneLooksLikePlaceholder = phoneFake,
            PhoneReasoning = phoneReasoning,
            EmailLooksValid = emailValid,
            EmailReasoning = emailReasoning,
            AddressLooksPlausible = addressPlausible,
            AddressReasoning = addressReasoning,
            ShowsUiChrome = showsUiChrome,
            UiChromeReasoning = uiChromeReasoning,
            RenderingStyle = renderingStyle,
            RenderingReasoning = renderingReasoning
        };

        // ─────────────────────────────────────────────────────────────
        // Build final response
        // ─────────────────────────────────────────────────────────────
        var response = new AIPpVerificationResponse
        {
            // Primary status
            Status = status,
            Confidence = confidence,

            // Classification
            DocumentClassification = docClass,
            DocumentCategory = docCategory,
            DocumentTypeDescription = string.IsNullOrWhiteSpace(docDesc)
                ? docClass.Replace('_', ' ')
                : docDesc,
            IsValidMedicalPrescription = safety.Verdict == "looks_valid",
            IsForgeryOrTrainingSample =
                watermarks.Count > 0 || annotationLabels.Count > 0,

            // Overlay detection
            VisibleWatermarkOrOverlayText = watermarks,
            AnnotationErrorLabelsPresent = annotationLabels,

            // Clinical data
            ExtractedTests = drugNames,
            DrugNames = drugNames,
            Medicines = drugNames.Select(d => new ExtractedMedicineInfoDto { Name = d }).ToList(),

            // Document fields
            RequestedTest = requestedTestName,
            MatchFound = false,
            DoctorName = doctorName,
            DoctorLicenseNumber = doctorLicense,
            ClinicName = clinicName,
            ClinicPhone = clinicPhone,
            ClinicEmail = clinicEmail,
            ClinicAddress = clinicAddress,
            PatientName = patientName,
            DateWritten = dateWritten,
            PrescriptionDate = dateWritten,
            HasSignature = hasSignature,
            HasStampOrSeal = hasStamp,

            // Authenticity signals
            AuthenticitySignals = authSignals,

            // AI verdict (advisory)
            Verdict = safety.Verdict,
            VerdictReasoning = safety.Reasoning,
            AiRiskScore = riskScore,
            AiRiskLevel = riskLevel,
            SecurityFlags = safety.Flags,
            AiViolationNotice = violationNotice,

            // Metadata
            ProcessingStage = "stage3_complete",
            ProcessingTimeMs = elapsedMs,
            AiModelUsed = ModelFallbackCascade[0],

            // Developer-facing
            Notes = $"AI SUGGESTION [{safety.Verdict}]: {safety.Reasoning}",
            AuditLog = $"Processed at {DateTime.UtcNow:O} — Verdict: {safety.Verdict}, Risk: {riskScore}/100"
        };

        var quality = AssessExtractionQuality(response);
        response.ExtractionQuality = quality;

        if (response.ExtractionQuality.RequiresManualReview)
        {
            foreach (var reason in response.ExtractionQuality.Reasons)
                response.SecurityFlags.Add($"⚠️ {reason}");
            if (response.Status == "PRE_APPROVED")
                response.Status = "FLAGGED";
        }
        else
        {
            // Warnings are INFO-only, never blocking
            foreach (var warning in response.ExtractionQuality.Warnings)
                response.SecurityFlags.Add($"INFO: {warning}");
        }

        return response;
    }

    private static ExtractionQuality AssessExtractionQuality(
        AIPpVerificationResponse response)
    {
        var quality = new ExtractionQuality();

        double conf = response.ExtractionConfidence;
        bool hasMedicines = response.Medicines != null 
            && response.Medicines.Count > 0;
        bool hasPatientName = !string.IsNullOrWhiteSpace(
            response.Patient?.Name);

        // ═══════════════════════════════════════════════════
        // RULE 1 — If nothing was extracted, we cannot trust
        // anything. This is LOW quality.
        // ═══════════════════════════════════════════════════
        if (conf < 0.5 || !hasMedicines)
        {
            quality.Tier = "LOW";
            quality.RequiresManualReview = true;
            if (!hasMedicines)
                quality.Reasons.Add(
                    "No medicines detected on prescription");
            if (conf < 0.5)
                quality.Reasons.Add(
                    $"Extraction confidence too low ({conf:F2})");
            return quality;
        }

        // ═══════════════════════════════════════════════════
        // RULE 2 — Patient name missing means we cannot verify
        // the prescription belongs to the ordering customer.
        // This is MEDIUM quality — flag for review.
        // ═══════════════════════════════════════════════════
        if (!hasPatientName)
        {
            quality.Tier = "MEDIUM";
            quality.RequiresManualReview = true;
            quality.Reasons.Add(
                "Patient name missing — cannot verify prescription " +
                "belongs to order customer");
            return quality;
        }

        // ═══════════════════════════════════════════════════
        // RULE 3 — Patient name + medicines + reasonable
        // confidence = HIGH quality. Everything else is
        // optional. Do NOT flag for missing gender, phone,
        // email, address, age, diagnosis, doctor specialty,
        // registration number.
        // ═══════════════════════════════════════════════════
        if (conf >= 0.7)
        {
            quality.Tier = "HIGH";
            quality.RequiresManualReview = false;
        }
        else
        {
            // Confidence between 0.5 and 0.7 = medium concern
            quality.Tier = "MEDIUM";
            quality.RequiresManualReview = true;
            quality.Reasons.Add(
                $"Moderate extraction confidence ({conf:F2})");
        }

        // ═══════════════════════════════════════════════════
        // OPTIONAL: Info-level warnings — do NOT block, just
        // inform the pharmacist in the audit trail.
        // ═══════════════════════════════════════════════════
        
        int medsMissingDosage = response.Medicines
            .Count(m => string.IsNullOrWhiteSpace(m.Dosage));
        if (medsMissingDosage > 0)
        {
            quality.Warnings.Add(
                $"{medsMissingDosage} medicine(s) missing dosage info — " +
                "pharmacist should verify");
        }

        int medsMissingFrequency = response.Medicines
            .Count(m => string.IsNullOrWhiteSpace(m.Frequency));
        if (medsMissingFrequency > 0)
        {
            quality.Warnings.Add(
                $"{medsMissingFrequency} medicine(s) missing frequency info");
        }

        // Info about missing optional fields — informational only
        if (string.IsNullOrWhiteSpace(response.Hospital?.Name))
            quality.Warnings.Add("Hospital/clinic name not detected");

        if (string.IsNullOrWhiteSpace(response.Doctor?.Name))
            quality.Warnings.Add("Doctor name not detected");

        if (string.IsNullOrWhiteSpace(response.PrescriptionMeta?.DateWritten))
            quality.Warnings.Add("Prescription date not detected");

        return quality;
    }

    // ═══════════════════════════════════════════════════════════════════
    //  SHARED GEMINI CALL HELPER
    // ═══════════════════════════════════════════════════════════════════
    private async Task<JsonElement?> CallGeminiAsync(
        object requestBody,
        string stage,
        Stopwatch sw)
    {
        var apiKey = _config["Gemini:ApiKey"];
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            _logger.LogError("[{Stage}] Gemini API key is missing.", stage);
            return null;
        }

        var json = JsonSerializer.Serialize(requestBody);

        foreach (var model in ModelFallbackCascade)
        {
            var endpoint = $"{GeminiBaseUrl}/{model}:generateContent?key={apiKey}";
            var content = new StringContent(json, Encoding.UTF8, "application/json");
            string responseBody = "";

            try
            {
                using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(45));
                var response = await _httpClient.PostAsync(endpoint, content, cts.Token);
                responseBody = await response.Content.ReadAsStringAsync(cts.Token);

                // Retryable failures — try next model
                if (response.StatusCode == HttpStatusCode.ServiceUnavailable ||
                    response.StatusCode == HttpStatusCode.TooManyRequests)
                {
                    _logger.LogWarning(
                        "[{Stage}] Model {Model} returned {Status}, trying next model",
                        stage, model, (int)response.StatusCode);
                    continue;
                }

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning(
                        "[{Stage}] Model {Model} returned {Status}: {Body}",
                        stage, model, response.StatusCode,
                        responseBody.Length > 200
                            ? responseBody.Substring(0, 200) : responseBody);
                    continue;
                }

                // Success — parse
                var geminiResponse = JsonSerializer.Deserialize<JsonElement>(responseBody);
                var textContent = geminiResponse
                    .GetProperty("candidates")[0]
                    .GetProperty("content")
                    .GetProperty("parts")[0]
                    .GetProperty("text")
                    .GetString() ?? "";

                var cleaned = CleanJsonText(textContent);
                if (string.IsNullOrWhiteSpace(cleaned))
                {
                    _logger.LogWarning(
                        "[{Stage}] Model {Model} returned empty text, trying next",
                        stage, model);
                    continue;
                }

                using var doc = JsonDocument.Parse(cleaned);
                _logger.LogInformation(
                    "[{Stage}] Model {Model} succeeded in {ElapsedMs}ms",
                    stage, model, sw.ElapsedMilliseconds);
                return doc.RootElement.Clone();
            }
            catch (JsonException jex)
            {
                var preview = responseBody.Length > 500
                    ? responseBody.Substring(0, 500) + "..." : responseBody;
                _logger.LogError(jex,
                    "[{Stage}] Model {Model} JSON parsing exception. Preview: {Preview}",
                    stage, model, preview);
                continue;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex,
                    "[{Stage}] Model {Model} failed: {Message}, trying next",
                    stage, model, ex.Message);
                continue;
            }
        }

        _logger.LogError(
            "[{Stage}] All fallback models failed. Manual review required.", stage);
        return null;
    }

    // ═══════════════════════════════════════════════════════════════════
    //  HELPERS
    // ═══════════════════════════════════════════════════════════════════
    private async Task<string?> GetBase64ImageAsync(string imageUrl)
    {
        if (string.IsNullOrWhiteSpace(imageUrl)) return null;

        // Data URI: data:image/jpeg;base64,XXXX
        if (imageUrl.StartsWith("data:image", StringComparison.OrdinalIgnoreCase))
        {
            var comma = imageUrl.IndexOf(",");
            return comma >= 0 ? imageUrl.Substring(comma + 1) : null;
        }

        // HTTP / HTTPS URL
        if (Uri.TryCreate(imageUrl, UriKind.Absolute, out var uri)
            && (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps))
        {
            try
            {
                var bytes = await _httpClient.GetByteArrayAsync(imageUrl);
                return Convert.ToBase64String(bytes);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex,
                    "[GetBase64ImageAsync] Failed to download: {Url}", imageUrl);
                return null;
            }
        }

        return null;
    }

    private static string CleanJsonText(string text)
    {
        if (string.IsNullOrWhiteSpace(text)) return string.Empty;

        var trimmed = text.Trim();

        if (trimmed.StartsWith("```json", StringComparison.OrdinalIgnoreCase))
            trimmed = trimmed.Substring(7);
        else if (trimmed.StartsWith("```"))
            trimmed = trimmed.Substring(3);

        if (trimmed.EndsWith("```"))
            trimmed = trimmed.Substring(0, trimmed.Length - 3);

        trimmed = trimmed.Trim();

        int firstBrace = trimmed.IndexOf('{');
        if (firstBrace >= 0)
        {
            int braceCount = 0;
            int lastBrace = -1;
            bool inString = false;
            bool isEscaped = false;

            for (int i = firstBrace; i < trimmed.Length; i++)
            {
                char c = trimmed[i];

                if (isEscaped)
                {
                    isEscaped = false;
                    continue;
                }

                if (c == '\\')
                {
                    isEscaped = true;
                    continue;
                }

                if (c == '"')
                {
                    inString = !inString;
                    continue;
                }

                if (!inString)
                {
                    if (c == '{')
                    {
                        braceCount++;
                    }
                    else if (c == '}')
                    {
                        braceCount--;
                        if (braceCount == 0)
                        {
                            lastBrace = i;
                            break;
                        }
                    }
                }
            }

            if (lastBrace > firstBrace)
            {
                return trimmed.Substring(firstBrace, lastBrace - firstBrace + 1);
            }
        }

        return trimmed;
    }

    private static AIPpVerificationResponse BuildFallbackResponse(
        string requestedTestName,
        string notes,
        long elapsedMs)
    {
        return new AIPpVerificationResponse
        {
            Status = "FLAGGED",
            Confidence = 0.40,
            DocumentClassification = "PENDING_INSPECTION",
            DocumentTypeDescription = "Manual Review Required",
            IsValidMedicalPrescription = false,
            IsForgeryOrTrainingSample = false,
            ExtractedTests = new List<string>(),
            DrugNames = new List<string>(),
            RequestedTest = requestedTestName,
            MatchFound = false,
            Verdict = "unclear",
            VerdictReasoning = notes,
            AiRiskScore = 50,
            AiRiskLevel = "MEDIUM",
            SecurityFlags = new List<string> { notes },
            Notes = notes,
            ProcessingStage = "fallback",
            ProcessingTimeMs = elapsedMs,
            AiModelUsed = ModelFallbackCascade[0],
            AuditLog = $"Fallback at {DateTime.UtcNow:O} by PrescriptionValidatorAgent"
        };
    }

    // ═══════════════════════════════════════════════════════════════════
    //  INTERNAL HELPER METHODS
    // ═══════════════════════════════════════════════════════════════════
    private static string MapCategoryToClass(string category) => category switch
    {
        "handwritten_prescription" => "HANDWRITTEN_PRESCRIPTION",
        "printed_prescription" => "COMPUTER_PRINTED_PRESCRIPTION",
        "unrelated_document" => "NON_PRESCRIPTION_DOCUMENT",
        "random_photo" => "NON_MEDICAL_IMAGE",
        _ => "UNKNOWN"
    };

    private static string GetString(JsonElement el, string name)
    {
        return el.TryGetProperty(name, out var p) && p.ValueKind == JsonValueKind.String
            ? p.GetString() ?? "" : "";
    }

    private static string? GetStringOrNull(JsonElement el, string name)
    {
        if (el.TryGetProperty(name, out var p) && p.ValueKind == JsonValueKind.String)
        {
            var s = p.GetString();
            return string.IsNullOrWhiteSpace(s) ? null : s;
        }
        return null;
    }

    private static bool GetBool(JsonElement el, string name, bool defaultValue = false)
    {
        return el.TryGetProperty(name, out var p)
            && (p.ValueKind == JsonValueKind.True || p.ValueKind == JsonValueKind.False)
            ? p.GetBoolean()
            : defaultValue;
    }

    private static double GetDouble(JsonElement el, string name, double defaultValue)
    {
        return el.TryGetProperty(name, out var p) && p.ValueKind == JsonValueKind.Number
            ? p.GetDouble() : defaultValue;
    }

    private static List<string> GetStringList(JsonElement el, string name)
    {
        var list = new List<string>();
        if (el.TryGetProperty(name, out var arr) && arr.ValueKind == JsonValueKind.Array)
        {
            foreach (var item in arr.EnumerateArray())
            {
                if (item.GetString() is string s && !string.IsNullOrWhiteSpace(s))
                    list.Add(s);
            }
        }
        return list;
    }

    // ═══════════════════════════════════════════════════════════════════
    //  INTERNAL RESULT CLASSES
    // ═══════════════════════════════════════════════════════════════════
    private class Stage2VerdictResult
    {
        public string Verdict { get; set; } = "unclear";
        public string Reasoning { get; set; } = "";
        public double Confidence { get; set; } = 0.5;
        public List<string> Concerns { get; set; } = new();
    }

    private class Stage3SafetyResult
    {
        public string Verdict { get; set; } = "unclear";
        public string Reasoning { get; set; } = "";
        public double Confidence { get; set; } = 0.5;
        public List<string> Flags { get; set; } = new();
    }
}