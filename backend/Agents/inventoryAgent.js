/**
 * AI Inventory & Sales Forecasting Agent
 * Health Bridge Pharmacy System
 *
 * Responsibility:
 * 1. Stockout Risk Prediction (average daily sales, stock, days until empty)
 * 2. Low Stock Alerts (CRITICAL: 0-7 days, LOW: 8-30 days, HEALTHY: 31+ days)
 * 3. Expiry Risk Analysis (Critical: 0-30 days, Warning: 31-60 days, Normal: 61+ days)
 * 4. Sales Forecasting & High-Demand Category Analysis
 *
 * Edge cases:
 * Handles zero sales history, new medicines, missing stock values, and insufficient data gracefully.
 */

/**
 * Calculates stockout predictions for medicines based on past completed sales/orders.
 * @param {Array} medicines 
 * @param {Array} orders 
 * @param {number} periodDays 
 * @returns {Array} List of stockout predictions
 */
function calculateStockoutPredictions(medicines = [], orders = [], periodDays = 30) {
    if (!Array.isArray(medicines) || medicines.length === 0) {
        return [];
    }

    const fulfilledOrders = (orders || []).filter(o =>
        o.status === 'Confirmed' || o.status === 'Dispatched' || o.status === 'Delivered' || o.status === 'Approved' || o.patientConfirmed
    );

    // Map units sold per medicine
    const unitsSoldMap = {};
    let totalFulfilledUnits = 0;

    for (const order of fulfilledOrders) {
        const items = order.items || [];
        for (const item of items) {
            const medId = item.medicineId || item.id;
            const medName = (item.medicineName || item.name || '').trim().toLowerCase();
            const qty = Number(item.quantity) || 0;

            if (medId) {
                unitsSoldMap[medId] = (unitsSoldMap[medId] || 0) + qty;
            }
            if (medName) {
                unitsSoldMap[medName] = (unitsSoldMap[medName] || 0) + qty;
            }
            totalFulfilledUnits += qty;
        }
    }

    return medicines.map(med => {
        const medName = med.name || 'Unknown Medicine';
        const medId = med.id;
        const currentStock = typeof med.stockQuantity === 'number' ? Math.max(0, med.stockQuantity) : 0;

        const totalSold = (unitsSoldMap[medId] || unitsSoldMap[medName.trim().toLowerCase()] || 0);
        const averageDailySales = periodDays > 0 ? parseFloat((totalSold / periodDays).toFixed(2)) : 0;

        let daysUntilEmpty = null;
        let status = 'HEALTHY';
        let forecastNote = '';

        if (totalSold === 0 || averageDailySales === 0) {
            daysUntilEmpty = null; // No sales history
            status = 'HEALTHY';
            forecastNote = 'Insufficient data for reliable forecast';
        } else {
            daysUntilEmpty = Math.floor(currentStock / averageDailySales);
            if (daysUntilEmpty <= 7) {
                status = 'CRITICAL';
            } else if (daysUntilEmpty <= 30) {
                status = 'LOW';
            } else {
                status = 'HEALTHY';
            }
            forecastNote = `${daysUntilEmpty} days of stock remaining at current burn rate`;
        }

        return {
            medicineId: medId,
            medicineName: medName,
            categoryName: med.categoryName || med.category?.name || 'General',
            currentStock,
            totalSoldPast30Days: totalSold,
            averageDailySales,
            daysUntilEmpty,
            status,
            forecastNote
        };
    });
}

/**
 * Calculates expiry risks for medicines based on current date.
 * @param {Array} medicines 
 * @returns {Array} List of expiry risk items sorted by urgency and quantity
 */
function calculateExpiryRisks(medicines = []) {
    if (!Array.isArray(medicines) || medicines.length === 0) {
        return [];
    }

    const now = new Date();

    const items = medicines.map(med => {
        const expiryDateStr = med.expiryDate;
        const stockQuantity = typeof med.stockQuantity === 'number' ? med.stockQuantity : 0;

        if (!expiryDateStr) {
            return {
                medicineId: med.id,
                medicineName: med.name || 'Unknown Medicine',
                stockQuantity,
                expiryDate: null,
                daysRemaining: null,
                riskLevel: 'Normal',
                riskScore: 0
            };
        }

        const expDate = new Date(expiryDateStr);
        const diffTime = expDate.getTime() - now.getTime();
        const daysRemaining = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        let riskLevel = 'Normal';
        let riskWeight = 1;

        if (daysRemaining <= 30) {
            riskLevel = 'Critical';
            riskWeight = 3;
        } else if (daysRemaining <= 60) {
            riskLevel = 'Warning';
            riskWeight = 2;
        } else {
            riskLevel = 'Normal';
            riskWeight = 1;
        }

        return {
            medicineId: med.id,
            medicineName: med.name || 'Unknown Medicine',
            categoryName: med.categoryName || med.category?.name || 'General',
            stockQuantity,
            expiryDate: expDate.toISOString().split('T')[0],
            daysRemaining: Math.max(0, daysRemaining),
            riskLevel,
            riskWeight
        };
    });

    // Prioritize high quantity items close to expiry
    items.sort((a, b) => {
        if (b.riskWeight !== a.riskWeight) return b.riskWeight - a.riskWeight;
        if (a.daysRemaining !== b.daysRemaining) return a.daysRemaining - b.daysRemaining;
        return b.stockQuantity - a.stockQuantity;
    });

    return items;
}

/**
 * Calculates sales projections, trends, and category demand.
 * @param {Array} orders 
 * @param {Array} medicines 
 * @param {number} pastDays 
 * @returns {Object} Forecast & trend metrics
 */
function calculateSalesForecast(orders = [], medicines = [], pastDays = 30) {
    const fulfilledOrders = (orders || []).filter(o =>
        o.status === 'Confirmed' || o.status === 'Dispatched' || o.status === 'Delivered' || o.status === 'Approved' || o.patientConfirmed
    );

    let totalRevenue = 0;
    let totalItemsSold = 0;
    const categorySales = {};

    for (const order of fulfilledOrders) {
        const orderAmount = Number(order.totalAmount) || 0;
        totalRevenue += orderAmount;

        const items = order.items || [];
        for (const item of items) {
            const qty = Number(item.quantity) || 1;
            const itemPrice = Number(item.subtotal || item.unitPrice * qty) || 0;
            totalItemsSold += qty;

            const category = (item.categoryName || item.category || 'General Pharmacy').trim();
            if (!categorySales[category]) {
                categorySales[category] = { categoryName: category, unitsSold: 0, revenue: 0 };
            }
            categorySales[category].unitsSold += qty;
            categorySales[category].revenue += itemPrice;
        }
    }

    const averageDailyRevenue = pastDays > 0 ? totalRevenue / pastDays : 0;
    const projectedMonthlyRevenue = Math.round(averageDailyRevenue * 30);

    const highDemandCategories = Object.values(categorySales)
        .sort((a, b) => b.unitsSold - a.unitsSold);

    return {
        totalHistoricalRevenue: totalRevenue,
        totalItemsSold,
        averageDailyRevenue,
        projectedMonthlyRevenue,
        projectedMonthlyRevenueLabel: `Rs. ${projectedMonthlyRevenue.toLocaleString()}`,
        highDemandCategories,
        topCategory: highDemandCategories[0]?.categoryName || 'General Pharmacy',
        hasSufficientData: fulfilledOrders.length > 0 || totalRevenue > 0
    };
}

/**
 * Generate full AI Inventory & Sales Forecast object
 */
function generateInventoryForecast(medicines = [], orders = []) {
    const stockoutPredictions = calculateStockoutPredictions(medicines, orders);
    const expiryRisks = calculateExpiryRisks(medicines);
    const salesForecast = calculateSalesForecast(orders, medicines);

    const criticalStockCount = stockoutPredictions.filter(s => s.status === 'CRITICAL').length;
    const expiryRiskCount = expiryRisks.filter(e => e.riskLevel === 'Critical').length;

    return {
        summary: {
            projectedMonthlyRevenue: salesForecast.projectedMonthlyRevenue,
            projectedMonthlyRevenueLabel: salesForecast.projectedMonthlyRevenueLabel,
            criticalStockCount,
            expiryRiskCount,
            topCategory: salesForecast.topCategory,
            hasSufficientData: salesForecast.hasSufficientData
        },
        stockoutPredictions,
        expiryRisks,
        salesForecast
    };
}

module.exports = {
    calculateStockoutPredictions,
    calculateExpiryRisks,
    calculateSalesForecast,
    generateInventoryForecast
};
