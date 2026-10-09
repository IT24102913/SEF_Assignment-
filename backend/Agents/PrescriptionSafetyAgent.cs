using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using HealthBridge.Api.DTOs.Pharmacy;
using HealthBridge.Api.Models;

namespace HealthBridge.Api.Agents;

/// <summary>
/// AGENT 1 — Prescription Safety & Anti-Abuse Agent
/// 
/// Produces categorized flags for pharmacist UI:
///   - AiVisionFlags   : AI vision findings (watermark, UI chrome, fake phone, etc.)
///   - SafetyFlags     : Anti-abuse & pattern detection (duplicate, refill, history)
///   - VerifiedSignals : Positive signals (handwriting verified, signature present)
///   - SystemFlags     : AI processing issues (Stage 1 fail, timeouts)
///   - Flags           : Legacy combined list (kept for backward compatibility)
/// </summary>
public class PrescriptionSafetyAgent
{
    private readonly ILogger<PrescriptionSafetyAgent> _logger;
    private readonly PrescriptionValidatorAgent? _validatorAgent;

    public PrescriptionSafetyAgent(ILogger<PrescriptionSafetyAgent> logger, PrescriptionValidatorAgent? validatorAgent = null)
    {
        _logger = logger;
        _validatorAgent = validatorAgent;
    }

    /// <summary>
    /// Computes SHA-256 hash from prescription image URL, base64 data, or raw string content.
    /// </summary>
    public string? GeneratePrescriptionHash(string? fileContentOrUrl)
    {
        if (string.IsNullOrWhiteSpace(fileContentOrUrl)) return null;

        try
        {
            byte[] bytes;
            if (fileContentOrUrl.StartsWith("data:", StringComparison.OrdinalIgnoreCase))
            {
                var base64 = fileContentOrUrl.Substring(fileContentOrUrl.IndexOf(",") + 1);
                bytes = Convert.FromBase64String(base64);
            }
            else
            {
                bytes = Encoding.UTF8.GetBytes(fileContentOrUrl.Trim());
            }

            if (bytes.Length == 0) return null;

            using var sha256 = SHA256.Create();
            var hashBytes = sha256.ComputeHash(bytes);
            return Convert.ToHexString(hashBytes).ToLowerInvariant();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[PrescriptionSafetyAgent] Error generating SHA-256 hash");
            return null;
        }
    }

    private static List<string> BuildExtractionInfoFlags(AIPpVerificationResponse ai)
    {
        var flags = new List<string>();
        if (ai == null) return flags;

        // 1. Extraction quality
        if (ai.ExtractionQuality != null)
        {
            var tier = ai.ExtractionQuality.Tier;
            var icon = tier switch
            {
                "HIGH" => "✅",
                "MEDIUM" => "🟡",
                "LOW" => "🔴",
                _ => "ℹ️"
            };
            flags.Add($"{icon} Extraction Quality: {tier}");
        }

        // 2. Patient
        if (ai.Patient != null 
            && !string.IsNullOrWhiteSpace(ai.Patient.Name))
        {
            var details = new List<string>();
            if (!string.IsNullOrWhiteSpace(ai.Patient.Age))
                details.Add(ai.Patient.Age);
            if (!string.IsNullOrWhiteSpace(ai.Patient.Gender))
                details.Add(ai.Patient.Gender);

            var suffix = details.Count > 0 
                ? $" ({string.Join(", ", details)})" : "";

            flags.Add($"👤 Patient: {ai.Patient.Name}{suffix}");
        }

        // 3. Hospital
        if (ai.Hospital != null 
            && !string.IsNullOrWhiteSpace(ai.Hospital.Name))
        {
            flags.Add($"🏥 Hospital: {ai.Hospital.Name}");
        }

        // 4. Doctor
        if (ai.Doctor != null 
            && !string.IsNullOrWhiteSpace(ai.Doctor.Name))
        {
            var lic = !string.IsNullOrWhiteSpace(ai.Doctor.LicenseNumber)
                ? $" ({ai.Doctor.LicenseNumber})" : "";
            flags.Add($"👨‍⚕️ Doctor: {ai.Doctor.Name}{lic}");
        }

        // 5. Prescription date range
        if (ai.PrescriptionMeta != null 
            && !string.IsNullOrWhiteSpace(ai.PrescriptionMeta.DateWritten))
        {
            var dateInfo = ai.PrescriptionMeta.DateWritten;
            if (!string.IsNullOrWhiteSpace(ai.PrescriptionMeta.ValidUntil))
                dateInfo += $" → {ai.PrescriptionMeta.ValidUntil}";
            flags.Add($"📅 Prescription Date: {dateInfo}");
        }

        // 6. Medicines with dosages
        if (ai.Medicines != null && ai.Medicines.Count > 0)
        {
            flags.Add($"💊 Extracted Medicines ({ai.Medicines.Count}):");
            foreach (var med in ai.Medicines)
            {
                var medName = string.IsNullOrWhiteSpace(med.OriginalName)
                    ? "Unknown" : med.OriginalName;

                var normalizedSuffix = "";
                if (!string.IsNullOrWhiteSpace(med.NormalizedName)
                    && !med.NormalizedName.Equals(
                        medName, StringComparison.OrdinalIgnoreCase))
                {
                    normalizedSuffix = $" [{med.NormalizedName}]";
                }

                var details = new List<string>();
                if (!string.IsNullOrWhiteSpace(med.Dosage))
                    details.Add(med.Dosage);
                if (!string.IsNullOrWhiteSpace(med.Frequency))
                    details.Add(med.Frequency);
                if (!string.IsNullOrWhiteSpace(med.Duration))
                    details.Add(med.Duration);
                if (!string.IsNullOrWhiteSpace(med.Quantity))
                    details.Add(med.Quantity);
                if (!string.IsNullOrWhiteSpace(med.Instructions))
                    details.Add(med.Instructions);

                var detailStr = details.Count > 0
                    ? " — " + string.Join(" | ", details) : "";

                flags.Add($"   • {medName}{normalizedSuffix}{detailStr}");
            }
        }

        // 7. Rx mismatch
        if (ai.HasPrescriptionItemMismatch
            && ai.PrescriptionItemMismatches != null
            && ai.PrescriptionItemMismatches.Count > 0)
        {
            flags.Add(
                "🚫 PRESCRIPTION MISMATCH — Ordered Rx medicines not in prescription:");
            foreach (var m in ai.PrescriptionItemMismatches)
            {
                var reason = string.IsNullOrWhiteSpace(m.Reason)
                    ? "not found in prescription" : m.Reason;
                flags.Add($"   • {m.OrderedDrugName} — {reason}");
            }
        }

        return flags;
    }

    /// <summary>
    /// Validates an order for prescription safety & anti-abuse concerns.
    /// </summary>
    /// <summary>
    /// Async version for background tasks. Wraps the sync method so it doesn't block the HTTP request thread.
    /// </summary>
    public Task<PrescriptionSafetyResponse> EvaluateOrderSafetyAsync(PharmacyOrder currentOrder, IEnumerable<PharmacyOrder> patientHistory)
    {
        return Task.Run(() => EvaluateOrderSafety(currentOrder, patientHistory));
    }

        public PrescriptionSafetyResponse EvaluateOrderSafety(PharmacyOrder currentOrder, IEnumerable<PharmacyOrder> patientHistory)
    {
        try
        {
            if (currentOrder == null)
            {
                return new PrescriptionSafetyResponse
                {
                    RiskScore = 50,
                    Flags = new List<string> { "Missing or ambiguous prescription information" },
                    SystemFlags = new List<string> { "Missing or ambiguous prescription information" },
                    RecommendedAction = "REQUIRE_MANUAL_REVIEW"
                };
            }

            int riskScore = 0;

            // ═══════════════════════════════════════════════════════
            // CATEGORIZED FLAG LISTS
            // ═══════════════════════════════════════════════════════
            var aiVisionFlags = new List<string>();      // 🤖 AI findings
            var safetyFlags = new List<string>();         // 🚨 Anti-abuse
            var verifiedSignals = new List<string>();     // ✅ Positive
            var systemFlags = new List<string>();         // ⚙️ System issues

            // 1. Prescription Fingerprinting & Image Duplication Check (SHA-256 + Content URL)
            var currentRx = currentOrder.PrescriptionImageUrl;
            string? currentHash = currentOrder.PrescriptionHash ?? GeneratePrescriptionHash(currentRx);

            if (!string.IsNullOrWhiteSpace(currentRx))
            {
                if (!string.IsNullOrWhiteSpace(currentHash))
                {
                    bool isDuplicate = patientHistory.Any(pastOrder =>
                    {
                        if (pastOrder.Id == currentOrder.Id || pastOrder.OrderNumber == currentOrder.OrderNumber) return false;
                        var pastRx = pastOrder.PrescriptionImageUrl;
                        if (string.IsNullOrWhiteSpace(pastRx)) return false;
                        var pastHash = pastOrder.PrescriptionHash ?? GeneratePrescriptionHash(pastRx);
                        return (!string.IsNullOrWhiteSpace(pastHash) && pastHash == currentHash) || pastRx.Equals(currentRx, StringComparison.OrdinalIgnoreCase);
                    });

                    if (isDuplicate)
                    {
                        safetyFlags.Add("⚠️ PRESCRIPTION VIOLATION: Duplicate prescription image upload reuse attempt detected across order history");
                        riskScore += 75;
                    }
                }

                // 2. Multimodal AI Vision Analysis
                bool isNonMedicalDoc = false;

                if (_validatorAgent != null && !string.IsNullOrWhiteSpace(currentRx))
                {
                    try
                    {
                        var visionValidation = _validatorAgent.ValidatePrescriptionAsync(currentRx, "Order Safety Analysis").GetAwaiter().GetResult();
                        if (visionValidation != null)
                        {
                            // Enrich with extracted prescription data
                            var extractionInfoFlags = BuildExtractionInfoFlags(visionValidation);
                            foreach (var flag in extractionInfoFlags)
                            {
                                if (!verifiedSignals.Contains(flag))
                                    verifiedSignals.Add(flag);
                            }
                            // ─────────────────────────────────────────────
                            // SYSTEM FLAGS: Stage 1 failure detection
                            // ─────────────────────────────────────────────
                            if (visionValidation.Verdict == "unclear"
                                && visionValidation.VerdictReasoning?.Contains("Stage 1 extraction failed") == true)
                            {
                                systemFlags.Add("⚠️ AI could not analyze the image — manual review required");
                                riskScore += 30;
                            }

                            // ─────────────────────────────────────────────
                            // AI VISION FLAGS: Document type issues
                            // ─────────────────────────────────────────────
                            if (visionValidation.DocumentClassification == "NON_MEDICAL_IMAGE")
                            {
                                isNonMedicalDoc = true;
                                aiVisionFlags.Add($"⚠️ Non-Medical Image Detected ({visionValidation.DocumentTypeDescription ?? visionValidation.Notes})");
                            }
                            else if (visionValidation.DocumentClassification == "NON_PRESCRIPTION_DOCUMENT")
                            {
                                isNonMedicalDoc = true;
                                aiVisionFlags.Add($"⚠️ Non-Prescription Document ({visionValidation.DocumentTypeDescription ?? visionValidation.Notes})");
                            }
                            else if (visionValidation.DocumentClassification == "SUSPICIOUS_FORGERY" || visionValidation.IsForgeryOrTrainingSample)
                            {
                                isNonMedicalDoc = true;
                                aiVisionFlags.Add($"⚠️ Forgery / Tampered Document Detected");
                            }

                            // ─────────────────────────────────────────────
                            // VERIFIED SIGNALS: Positive findings
                            // ─────────────────────────────────────────────
                            if (visionValidation.IsValidMedicalPrescription
                                && visionValidation.DocumentClassification != "NON_MEDICAL_IMAGE"
                                && visionValidation.DocumentClassification != "NON_PRESCRIPTION_DOCUMENT")
                            {
                                verifiedSignals.Add($"✅ Printed Prescription OCR Verified ({visionValidation.DocumentClassification})");
                            }

                            // ─────────────────────────────────────────────
                            // AI VISION FLAGS: Security flags from validator
                            // (watermark, UI chrome, fake phone/email, etc.)
                            // ─────────────────────────────────────────────
                            if (visionValidation.SecurityFlags != null && visionValidation.SecurityFlags.Any())
                            {
                                foreach (var flag in visionValidation.SecurityFlags)
                                {
                                    // INFO flags never count as violations
                                    if (flag.StartsWith("INFO:"))
                                    {
                                        if (!verifiedSignals.Contains(flag))
                                            verifiedSignals.Add(flag);
                                        continue;
                                    }

                                    // Skip the generic "Stage 1 extraction failed" (already handled above)
                                    if (flag.Contains("Stage 1 extraction failed")) continue;

                                    // Skip "Verified" flags (they go to VerifiedSignals)
                                    if (flag.Contains("Verified", StringComparison.OrdinalIgnoreCase)) continue;

                                    // Categorize: positive signals to verified, others to AI vision
                                    if (flag.StartsWith("✅") || flag.Contains("Handwriting OCR"))
                                    {
                                        if (!verifiedSignals.Contains(flag))
                                            verifiedSignals.Add(flag);
                                    }
                                    else
                                    {
                                        if (!aiVisionFlags.Contains(flag))
                                            aiVisionFlags.Add(flag);
                                    }
                                }
                            }
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "[PrescriptionSafetyAgent] Multimodal AI vision analysis call failed.");
                        systemFlags.Add("⚠️ AI vision service unavailable — manual review required");
                        riskScore += 25;
                    }
                }

                if (isNonMedicalDoc)
                {
                    riskScore += 95;
                }
            }
            else if (currentOrder.Items != null && currentOrder.Items.Any(i => i.Medicine != null && i.Medicine.RequiresPrescription))
            {
                safetyFlags.Add("Missing prescription receipt image for prescription-required medication");
                riskScore += 40;
            }

            // 3. Duplicate Medicine Items within same order check
            if (currentOrder.Items != null && currentOrder.Items.Count > 1)
            {
                var duplicateMeds = currentOrder.Items
                    .GroupBy(i => i.MedicineName?.Trim().ToLowerInvariant())
                    .Where(g => g.Count() > 1 && !string.IsNullOrWhiteSpace(g.Key))
                    .Select(g => g.Key)
                    .ToList();

                if (duplicateMeds.Any())
                {
                    safetyFlags.Add($"Duplicate medicine entries detected in single order: {string.Join(", ", duplicateMeds)}");
                    riskScore += 20;
                }
            }

            // 4. Order Frequency & Weekly Repeat Purchase Check (Anti-Abuse Scan for ALL Orders)
            var nowUtc = currentOrder.CreatedAt != default ? currentOrder.CreatedAt : DateTime.UtcNow;
            var past7DaysOrders = patientHistory.Where(o =>
                (nowUtc - o.CreatedAt).TotalDays <= 7 && o.Status != "Cancelled"
            ).ToList();

            if (past7DaysOrders.Count >= 3)
            {
                safetyFlags.Add($"⚠️ High Velocity Order History: Patient placed {past7DaysOrders.Count + 1} orders within 7 days");
                riskScore += 35;
            }

            if (currentOrder.Items != null && currentOrder.Items.Any())
            {
                foreach (var item in currentOrder.Items)
                {
                    var medName = item.MedicineName?.Trim().ToLowerInvariant();
                    if (string.IsNullOrWhiteSpace(medName)) continue;

                    var repeatOrdersThisWeek = past7DaysOrders.Where(o =>
                        o.Items != null && o.Items.Any(pi => pi.MedicineName?.Trim().ToLowerInvariant() == medName)
                    ).ToList();

                    if (repeatOrdersThisWeek.Count >= 2)
                    {
                        safetyFlags.Add($"⚠️ Repeat Medication Purchase: Patient ordered \"{item.MedicineName}\" {repeatOrdersThisWeek.Count + 1} times within 7 days");
                        riskScore += 30;
                        break;
                    }
                }
            }

            // 4. Refill Schedule Validation
            if (currentOrder.Items != null && currentOrder.Items.Any())
            {
                var pastFulfilledOrders = patientHistory.Where(o =>
                    o.Id != currentOrder.Id &&
                    o.OrderNumber != currentOrder.OrderNumber &&
                    (o.Status == "Confirmed" || o.Status == "Dispatched" || o.Status == "Delivered" || o.PatientConfirmed)
                ).ToList();

                foreach (var item in currentOrder.Items)
                {
                    var medName = item.MedicineName?.Trim().ToLowerInvariant();
                    if (string.IsNullOrWhiteSpace(medName)) continue;

                    var latestPastOrder = pastFulfilledOrders
                        .Where(o => o.Items.Any(pi => pi.MedicineName.Trim().ToLowerInvariant() == medName))
                        .OrderByDescending(o => o.CreatedAt)
                        .FirstOrDefault();

                    if (latestPastOrder != null)
                    {
                        var daysSinceLastFulfillment = (int)(DateTime.UtcNow - latestPastOrder.CreatedAt).TotalDays;
                        int requiredInterval = 30;

                        int daysSupply = currentOrder.DaysSupply ?? latestPastOrder.DaysSupply ?? 30;
                        if (daysSupply >= 180) requiredInterval = 180;
                        else if (daysSupply >= 90) requiredInterval = 90;
                        else requiredInterval = daysSupply;

                        if (daysSinceLastFulfillment < requiredInterval)
                        {
                            safetyFlags.Add($"⚠️ Early refill attempt detected ({daysSinceLastFulfillment} days since last, {requiredInterval} required)");
                            riskScore += 50;
                            break;
                        }
                    }
                }
            }

            // Only count orders with explicit AI safety flags (>= 70 risk score).
            // Cancelled orders are NOT suspicious — patients cancel for legitimate reasons.
            int previousFlaggedCount = patientHistory.Count(o => o.SafetyRiskScore.HasValue && o.SafetyRiskScore.Value >= 70);
            if (previousFlaggedCount > 1)
            {
                safetyFlags.Add($"⚠️ {previousFlaggedCount} previous suspicious attempt(s) detected in patient history");
                riskScore += 25;
            }

            riskScore = Math.Clamp(riskScore, 0, 100);

            // ═══════════════════════════════════════════════════════
            // COMBINED FLAGS (backward compatibility)
            // ═══════════════════════════════════════════════════════
            var allFlags = aiVisionFlags
                .Concat(safetyFlags)
                .Concat(verifiedSignals)
                .Concat(systemFlags)
                .Distinct()
                .ToList();

            // ═══════════════════════════════════════════════════════
            // RECOMMENDED ACTION
            // ═══════════════════════════════════════════════════════
            string recommendedAction = "APPROVE";
            if (riskScore >= 70 || safetyFlags.Any(f => f.Contains("VIOLATION") || f.Contains("Duplicate prescription image")))
            {
                recommendedAction = "BLOCK_AND_FLAG_FOR_REVIEW";
            }
            else if (riskScore >= 30 || aiVisionFlags.Any() || systemFlags.Any())
            {
                recommendedAction = "REQUIRE_MANUAL_REVIEW";
            }

            return new PrescriptionSafetyResponse
            {
                RiskScore = riskScore,
                RecommendedAction = recommendedAction,

                // Legacy combined
                Flags = allFlags,

                // Categorized
                AiVisionFlags = aiVisionFlags.Distinct().ToList(),
                SafetyFlags = safetyFlags.Distinct().ToList(),
                VerifiedSignals = verifiedSignals.Distinct().ToList(),
                SystemFlags = systemFlags.Distinct().ToList()
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[PrescriptionSafetyAgent] Error evaluating prescription safety");
            return new PrescriptionSafetyResponse
            {
                RiskScore = 50,
                Flags = new List<string> { "Missing or ambiguous prescription information" },
                SystemFlags = new List<string> { "⚠️ Error during safety evaluation — manual review required" },
                RecommendedAction = "REQUIRE_MANUAL_REVIEW"
            };
        }
    }
}