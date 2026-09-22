/**
 * Prescription Safety & Anti-Abuse Agent
 * Health Bridge Pharmacy System
 *
 * Responsibility:
 * 1. SHA-256 Prescription Fingerprinting & Exact Duplicate Detection
 * 2. Refill Schedule Validation (30-day, 3-month, 6-month support)
 * 3. Dynamic Risk Scoring (0-100)
 * 4. Action Recommendation: APPROVE | REQUIRE_MANUAL_REVIEW | BLOCK_AND_FLAG_FOR_REVIEW
 *
 * Human-in-the-Loop:
 * The agent ONLY validates, scores, flags, and recommends.
 * Final approval remains under pharmacist workflow in Orders.jsx.
 */

const crypto = require('crypto');

/**
 * Generate SHA-256 hash from prescription file content or base64 data.
 * @param {Buffer|string} fileContent 
 * @returns {string|null} SHA-256 hex string
 */
function generatePrescriptionHash(fileContent) {
    if (!fileContent) return null;
    try {
        let buffer;
        if (typeof fileContent === 'string') {
            if (fileContent.startsWith('data:')) {
                const base64Data = fileContent.split(',')[1] || '';
                buffer = Buffer.from(base64Data, 'base64');
            } else if (fileContent.startsWith('http://') || fileContent.startsWith('https://')) {
                // If it's a URL or path string, hash the string representation or identifier
                return crypto.createHash('sha256').update(fileContent).digest('hex');
            } else {
                buffer = Buffer.from(fileContent, 'utf-8');
            }
        } else if (Buffer.isBuffer(fileContent)) {
            buffer = fileContent;
        } else {
            return null;
        }

        if (!buffer || buffer.length === 0) return null;
        return crypto.createHash('sha256').update(buffer).digest('hex');
    } catch (err) {
        console.error('[PrescriptionAgent] Error generating hash:', err);
        return null;
    }
}

/**
 * Validate refill schedule against patient's order history.
 * @param {Object} currentOrder 
 * @param {Array} patientHistory 
 * @returns {Object} { isEarlyRefill: boolean, daysSinceLastFulfillment: number|null, requiredInterval: number, medicineName: string|null }
 */
function validateRefillSchedule(currentOrder, patientHistory = []) {
    if (!currentOrder || !Array.isArray(patientHistory) || patientHistory.length === 0) {
        return { isEarlyRefill: false, details: [] };
    }

    const currentItems = currentOrder.items || [];
    const currentOrderDate = currentOrder.createdAt ? new Date(currentOrder.createdAt) : new Date();
    const refillFlags = [];

    // Filter fulfilled / active previous orders
    const pastFulfilledOrders = patientHistory.filter(o => 
        o.id !== currentOrder.id && 
        o.orderNumber !== currentOrder.orderNumber &&
        (o.status === 'Confirmed' || o.status === 'Dispatched' || o.status === 'Delivered' || o.patientConfirmed)
    );

    for (const item of currentItems) {
        const medName = (item.medicineName || item.name || '').trim().toLowerCase();
        if (!medName) continue;

        // Find most recent fulfilled order containing the same medicine
        let mostRecentPastOrder = null;
        let mostRecentDate = 0;

        for (const pastOrder of pastFulfilledOrders) {
            const pastItems = pastOrder.items || [];
            const hasSameMed = pastItems.some(pi => (pi.medicineName || pi.name || '').trim().toLowerCase() === medName);
            
            if (hasSameMed) {
                const pastDate = new Date(pastOrder.createdAt || pastOrder.submittedAt || 0).getTime();
                if (pastDate > mostRecentDate) {
                    mostRecentDate = pastDate;
                    mostRecentPastOrder = pastOrder;
                }
            }
        }

        if (mostRecentPastOrder && mostRecentDate > 0) {
            const diffTime = currentOrderDate.getTime() - mostRecentDate;
            const daysSinceLastFulfillment = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));

            // Determine required refill interval (30-day, 90-day / 3-month, 180-day / 6-month)
            let requiredInterval = 30;
            const daysSupply = currentOrder.daysSupply || mostRecentPastOrder.daysSupply;
            if (daysSupply) {
                if (daysSupply >= 180 || daysSupply === '6-month' || daysSupply === 180) requiredInterval = 180;
                else if (daysSupply >= 90 || daysSupply === '3-month' || daysSupply === 90) requiredInterval = 90;
                else if (typeof daysSupply === 'number') requiredInterval = daysSupply;
            }

            if (daysSinceLastFulfillment < requiredInterval) {
                refillFlags.push({
                    medicineName: item.medicineName || item.name,
                    daysSinceLastFulfillment,
                    requiredInterval
                });
            }
        }
    }

    return {
        isEarlyRefill: refillFlags.length > 0,
        refillFlags
    };
}

/**
 * Main evaluation function for Prescription Safety & Anti-Abuse Agent
 * @param {Object} currentOrder 
 * @param {Array} allOrdersHistory 
 * @returns {Object} { riskScore, flags, recommendedAction }
 */
function evaluatePrescriptionSafety(currentOrder, allOrdersHistory = []) {
    try {
        if (!currentOrder) {
            return {
                riskScore: 50,
                flags: ["Missing or ambiguous prescription information"],
                recommendedAction: "REQUIRE_MANUAL_REVIEW"
            };
        }

        let riskScore = 0;
        const flags = [];

        // Patient history matching (by customerEmail or patientId)
        const customerEmail = (currentOrder.customerEmail || '').toLowerCase();
        const patientId = currentOrder.patientId;

        const patientHistory = allOrdersHistory.filter(o => {
            if (o.id === currentOrder.id || o.orderNumber === currentOrder.orderNumber) return false;
            if (patientId && o.patientId === patientId) return true;
            if (customerEmail && (o.customerEmail || '').toLowerCase() === customerEmail) return true;
            return false;
        });

        // A. Prescription Fingerprinting (SHA-256)
        const currentRxImage = currentOrder.prescriptionImageUrl || currentOrder.imageUrl;
        let currentHash = currentOrder.prescriptionHash;

        if (currentRxImage) {
            if (!currentHash) {
                currentHash = generatePrescriptionHash(currentRxImage);
            }

            if (currentHash) {
                // Compare with previous orders across patient history
                const isDuplicate = patientHistory.some(pastOrder => {
                    const pastRxImage = pastOrder.prescriptionImageUrl || pastOrder.imageUrl;
                    if (!pastRxImage) return false;
                    const pastHash = pastOrder.prescriptionHash || generatePrescriptionHash(pastRxImage);
                    return pastHash && pastHash === currentHash;
                });

                if (isDuplicate) {
                    flags.push("Duplicate prescription image detected");
                    riskScore += 60;
                }
            }
        } else if (currentOrder.requiresPrescription || (currentOrder.items && currentOrder.items.some(i => i.requiresPrescription))) {
            flags.push("Missing or ambiguous prescription information");
            riskScore += 40;
        }

        // B. Refill Schedule Validation
        const refillResult = validateRefillSchedule(currentOrder, patientHistory);
        if (refillResult.isEarlyRefill) {
            flags.push("Early refill attempt");
            riskScore += 50;
        }

        // Check for multiple suspicious / flagged attempts in history
        const flaggedPastOrders = patientHistory.filter(o => o.safetyRiskScore && o.safetyRiskScore >= 70);
        if (flaggedPastOrders.length > 0) {
            flags.push("Multiple suspicious attempts detected in patient history");
            riskScore += 25;
        }

        // Cap riskScore between 0 and 100
        riskScore = Math.min(100, Math.max(0, riskScore));

        // Determine recommendedAction (ONLY: APPROVE, REQUIRE_MANUAL_REVIEW, BLOCK_AND_FLAG_FOR_REVIEW)
        let recommendedAction = "APPROVE";
        if (riskScore >= 70 || flags.includes("Duplicate prescription image detected")) {
            recommendedAction = "BLOCK_AND_FLAG_FOR_REVIEW";
        } else if (riskScore >= 30 || flags.length > 0) {
            recommendedAction = "REQUIRE_MANUAL_REVIEW";
        }

        return {
            riskScore,
            flags,
            recommendedAction
        };
    } catch (err) {
        console.error('[PrescriptionAgent] Error during safety evaluation:', err);
        // Fallback for safety failure — ALWAYS require manual review
        return {
            riskScore: 50,
            flags: ["Missing or ambiguous prescription information"],
            recommendedAction: "REQUIRE_MANUAL_REVIEW"
        };
    }
}

/**
 * Validate a prescription request object
 */
function validatePrescriptionOrder(orderData, historyOrders = []) {
    return evaluatePrescriptionSafety(orderData, historyOrders);
}

module.exports = {
    generatePrescriptionHash,
    validateRefillSchedule,
    evaluatePrescriptionSafety,
    validatePrescriptionOrder
};
