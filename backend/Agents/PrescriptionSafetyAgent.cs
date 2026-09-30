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
                                verifiedSignals.Add($"✅ Handwriting OCR Verified ({visionValidation.DocumentClassification})");
                            }

                            // ─────────────────────────────────────────────
                            // AI VISION FLAGS: Security flags from validator
                            // (watermark, UI chrome, fake phone/email, etc.)
                            // ─────────────────────────────────────────────
                            if (visionValidation.SecurityFlags != null && visionValidation.SecurityFlags.Any())
                            {
                                foreach (var flag in visionValidation.SecurityFlags)
                                {
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

            if (past7DaysOrders.Count >= 2)
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

                    if (repeatOrdersThisWeek.Count >= 1)
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

            int previousFlaggedCount = patientHistory.Count(o => o.SafetyRiskScore.HasValue && o.SafetyRiskScore.Value >= 70);
            if (previousFlaggedCount > 0)
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