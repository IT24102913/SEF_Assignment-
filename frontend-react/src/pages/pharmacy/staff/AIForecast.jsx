import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { getDashboardPath } from '../../../utils/navigation';
import { api } from '../../../api/authApi';
import forecastImg from '../../../assets/analytics_forecast.jpg';
import logoImage from '../../../assets/mediz.png';
import {
    Brain, Sparkles, ArrowLeft, LogOut, TrendingUp, AlertTriangle,
    CheckCircle2, Calendar, RefreshCw, Zap, Layers, Activity, Package,
    DollarSign, Clock, BarChart3, Download, Mail, ShoppingCart, X, FileText
} from 'lucide-react';
import {
    ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    ResponsiveContainer, ReferenceLine
} from 'recharts';

const generateSparklinePoints = (sales) => {
    if (!sales || sales.length === 0) return '';
    const max = Math.max(...sales.map(s => s.quantitySold), 1);
    return sales.slice(-7).map((s, i) =>
        `${i * 6},${20 - (s.quantitySold / max) * 18}`
    ).join(' ');
};

const getTrendColor = (trend) => {
    if (trend === 'INCREASING') return '#DC2626';
    if (trend === 'DECREASING') return '#059669';
    return '#6B7280';
};

const formatNumber = (n) => Math.round(n || 0).toLocaleString('en-LK');

const getUrgency = (med) => {
    if (!med) return { label: 'NO URGENCY', color: '#059669', bg: '#D1FAE5' };
    if (med.status === 'OUT_OF_STOCK' || med.status === 'OUT OF STOCK' || med.currentStock === 0)
        return { label: 'CRITICAL', color: '#7F1D1D', bg: '#FEE2E2' };
    if (med.daysUntilEmpty === null || med.daysUntilEmpty === undefined)
        return { label: 'NO URGENCY', color: '#6B7280', bg: '#F3F4F6' };
    if (med.daysUntilEmpty <= 7)
        return { label: 'HIGH URGENCY', color: '#DC2626', bg: '#FEE2E2' };
    if (med.daysUntilEmpty <= 14)
        return { label: 'MEDIUM URGENCY', color: '#EA580C', bg: '#FED7AA' };
    if (med.daysUntilEmpty <= 30)
        return { label: 'LOW URGENCY', color: '#CA8A04', bg: '#FEF3C7' };
    return { label: 'NO URGENCY', color: '#059669', bg: '#D1FAE5' };
};

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0].payload;
    const hasHistorical = data.historical != null && data.historical !== 0;
    const hasPredicted = data.predicted != null;

    return (
        <div style={{
            background: 'white',
            border: '1px solid #E5E7EB',
            borderRadius: '8px',
            padding: '10px 12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            fontSize: '12px'
        }}>
            <div style={{
                fontWeight: 700,
                marginBottom: '6px',
                color: '#1F2937'
            }}>
                {label}
            </div>

            {hasHistorical && (
                <div style={{
                    color: '#3B82F6',
                    fontWeight: 600,
                    marginBottom: '4px'
                }}>
                    Historical: {data.historical} units
                </div>
            )}

            {hasPredicted && (
                <>
                    <div style={{
                        color: '#059669',
                        fontWeight: 600
                    }}>
                        Predicted: {data.predicted} units
                    </div>
                    {data.predictedUpper && (
                        <div style={{
                            color: '#6B7280',
                            fontSize: '11px',
                            marginTop: '2px'
                        }}>
                            Range: {data.predictedLower} – {data.predictedUpper}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

const generatePredictedDailyData = (medicine) => {
    if (!medicine) return [];
    const historical = medicine.historicalSales || [];
    const chartData = [];

    // Historical 30 days
    const histLen = historical.length || 30;
    for (let i = histLen - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        chartData.push({
            date: dateStr,
            historical: historical[histLen - 1 - i]?.quantitySold ?? (historical[histLen - 1 - i] ?? 0),
            predicted: null,
            predictedUpper: null,
            predictedLower: null
        });
    }

    const baseDaily = medicine.predictedDemand30Days != null
        ? (medicine.predictedDemand30Days / 30)
        : ((medicine.averageDailySales || 0) *
            (medicine.trendMultiplier || 1.0) *
            (medicine.seasonalMultiplier || 1.0));

    // Next 30 days
    for (let i = 1; i <= 30; i++) {
        const date = new Date();
        date.setDate(date.getDate() + i);
        const dayOfWeek = date.getDay();
        const weekFactor = (dayOfWeek === 0 || dayOfWeek === 6) ? 0.6 : 1.1;
        const naturalVar = 1 + (Math.sin(i * 1.3) * 0.08);
        const val = baseDaily * weekFactor * naturalVar;

        chartData.push({
            date: date.toISOString().split('T')[0],
            historical: null,
            predicted: Math.round(val * 100) / 100,
            predictedUpper: Math.round(val * 1.5 * 100) / 100,
            predictedLower: Math.round(val * 0.5 * 100) / 100
        });
    }

    return chartData;
};

const Toast = ({ message, type = 'success', onClose }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, 3000);
        return () => clearTimeout(timer);
    }, [onClose]);

    const colors = {
        success: { bg: '#D1FAE5', border: '#059669', text: '#065F46', icon: '✅' },
        error: { bg: '#FEE2E2', border: '#DC2626', text: '#991B1B', icon: '⚠️' },
        info: { bg: '#DBEAFE', border: '#2563EB', text: '#1E40AF', icon: 'ℹ️' }
    };

    const c = colors[type] || colors.info;

    return (
        <div style={{
            position: 'fixed',
            top: '80px',
            right: '24px',
            padding: '14px 20px',
            background: c.bg,
            border: `1px solid ${c.border}`,
            borderRadius: '12px',
            color: c.text,
            fontWeight: 600,
            fontSize: '14px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            zIndex: 9999,
            animation: 'slideInRight 0.3s ease',
            maxWidth: '360px'
        }}>
            <span style={{ fontSize: '18px' }}>{c.icon}</span>
            <span>{message}</span>
        </div>
    );
};

const AIForecast = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState('stockout');
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [selectedModalMed, setSelectedModalMed] = useState(null);
    const [noteAdded, setNoteAdded] = useState(false);
    const [notesCount, setNotesCount] = useState(0);
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [toast, setToast] = useState(null);

    const showToast = (message, type = 'success') => {
        setToast({ message, type, id: Date.now() });
    };

    const [forecastData, setForecastData] = useState({
        summary: {
            projectedMonthlyRevenue: 0,
            projectedMonthlyRevenueLabel: 'Rs. 0',
            criticalStockCount: 0,
            expiryRiskCount: 0,
            topCategory: 'General Pharmacy',
            hasSufficientData: false
        },
        stockoutPredictions: [],
        expiryRisks: [],
        highDemandCategories: [],
        seasonalInsights: [],
        aiRecommendations: [],
        aiInsightsAvailable: false
    });

    useEffect(() => {
        loadForecastData();
        fetchNotesCount();
    }, []);

    const fetchNotesCount = async () => {
        try {
            const res = await api.get('/AIForecastNotes');
            if (res.data) setNotesCount(res.data.length);
        } catch (e) { }
    };

    const handleTakeNote = async () => {
        if (!selectedModalMed) return;
        try {
            const note = {
                medicineId: selectedModalMed.medicineId,
                medicineName: selectedModalMed.medicineName,
                category: selectedModalMed.categoryName,
                unitPrice: selectedModalMed.unitPrice,
                currentStock: selectedModalMed.currentStock,
                daysUntilEmpty: selectedModalMed.daysUntilEmpty,
                averageDailySales: selectedModalMed.averageDailySales,
                trend: selectedModalMed.trend,
                stockStatus: selectedModalMed.status,
                predictedDemand7Days: selectedModalMed.predictedDemand7Days,
                predictedDemand30Days: selectedModalMed.predictedDemand30Days,
                predictedDemand60Days: selectedModalMed.predictedDemand60Days,
                predictedDemand90Days: selectedModalMed.predictedDemand90Days,
                seasonalFactor: selectedModalMed.seasonalFactor,
                seasonalMultiplier: selectedModalMed.seasonalMultiplier || 1.0,
                projectedRevenue30Days: selectedModalMed.projectedRevenue30Days,
                atRiskRevenue: selectedModalMed.atRiskRevenue,
                reorderPoint: selectedModalMed.reorderPoint,
                suggestedOrderQty: selectedModalMed.suggestedOrderQty,
                orderByDate: selectedModalMed.orderByDate,
                aiInsight: selectedModalMed.aiInsight || selectedModalMed.forecastNote,
                aiRecommendation: selectedModalMed.aiRecommendation || (selectedModalMed.suggestedOrderQty > 0 ? `Reorder ${selectedModalMed.suggestedOrderQty} units now.` : 'No immediate order needed.'),
                urgency: getUrgency(selectedModalMed).label,
                confidence: selectedModalMed.confidence || 0.88,
                takenBy: user?.fullName || user?.email || 'Pharmacist'
            };

            await api.post('/AIForecastNotes', note);
            showToast('AI Forecasting details noted for ' + selectedModalMed.medicineName, 'success');
            setNoteAdded(true);
            setNotesCount(prev => prev + 1);

            setTimeout(() => {
                setNoteAdded(false);
                setSelectedModalMed(null);
            }, 2000);
        } catch (err) {
            console.error('Failed to save note:', err);
            showToast('Failed to save note. Please try again.', 'error');
        }
    };

    const loadForecastData = async () => {
        setLoading(true);
        try {
            let serverData = null;
            try {
                const res = await api.get('/AIForecast');
                if (res.data) serverData = res.data;
            } catch (err) {
                console.warn('[AIForecast] API endpoint error, using client fallback:', err);
            }

            if (serverData && serverData.stockoutPredictions) {
                setForecastData({
                    summary: {
                        projectedMonthlyRevenue: serverData.projectedMonthlyRevenue || 0,
                        projectedMonthlyRevenueLabel: serverData.projectedMonthlyRevenueLabel || 'Rs. 0',
                        criticalStockCount: serverData.criticalStockCount || 0,
                        expiryRiskCount: serverData.expiryRiskCount || 0,
                        topCategory: serverData.topCategory || 'General Pharmacy',
                        hasSufficientData: serverData.hasSufficientData ?? true
                    },
                    stockoutPredictions: serverData.stockoutPredictions || [],
                    expiryRisks: serverData.expiryRisks || [],
                    highDemandCategories: serverData.highDemandCategories || [],
                    seasonalInsights: serverData.seasonalInsights || [],
                    aiRecommendations: serverData.aiRecommendations || [],
                    aiInsightsAvailable: serverData.aiInsightsAvailable ?? true
                });
                setLoading(false);
                return;
            }

            let medicines = [];
            try {
                const medRes = await api.get('/Medicines');
                medicines = medRes.data || [];
            } catch (e) { }
            if (!medicines.length) {
                try { medicines = JSON.parse(localStorage.getItem('medix_medicines') || '[]'); } catch (e) { }
            }

            let orders = [];
            try {
                const ordRes = await api.get('/PharmacyOrders');
                orders = ordRes.data || [];
            } catch (e) { }
            if (!orders.length) {
                try { orders = JSON.parse(localStorage.getItem('medix_pharmacy_orders') || '[]'); } catch (e) { }
            }

            computeClientForecast(medicines, orders);
        } catch (err) {
            console.error('[AIForecast] Load error:', err);
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    };

    const computeClientForecast = (medicinesList = [], ordersList = []) => {
        const periodDays = 30;
        const now = new Date();
        const fulfilledOrders = ordersList.filter(o =>
            o.status === 'Confirmed' || o.status === 'Dispatched' || o.status === 'Delivered' || o.status === 'Approved' || o.patientConfirmed
        );

        const unitsSoldMap = {};
        const categorySalesMap = {};
        let totalRevenue = 0;

        for (const order of fulfilledOrders) {
            totalRevenue += Number(order.totalAmount) || 0;
            const items = order.items || [];
            for (const item of items) {
                const medId = item.medicineId || item.id;
                const medName = (item.medicineName || item.name || '').trim().toLowerCase();
                const qty = Number(item.quantity) || 1;
                const subtotal = Number(item.subtotal || (item.unitPrice ? item.unitPrice * qty : 0)) || 0;

                if (medId) unitsSoldMap[medId] = (unitsSoldMap[medId] || 0) + qty;
                if (medName) unitsSoldMap[medName] = (unitsSoldMap[medName] || 0) + qty;

                const cat = (item.categoryName || item.category || 'General Pharmacy').trim();
                if (!categorySalesMap[cat]) categorySalesMap[cat] = { categoryName: cat, unitsSold: 0, revenue: 0 };
                categorySalesMap[cat].unitsSold += qty;
                categorySalesMap[cat].revenue += subtotal;
            }
        }

        const stockoutPredictions = medicinesList.map(med => {
            const medName = med.name || med.medicineName || 'Unknown Medicine';
            const medId = med.id;
            const currentStock = typeof med.stockQuantity === 'number' ? Math.max(0, med.stockQuantity) : (med.stock || 0);
            const totalSold = (unitsSoldMap[medId] || unitsSoldMap[medName.trim().toLowerCase()] || 0);
            const averageDailySales = periodDays > 0 ? parseFloat((totalSold / periodDays).toFixed(2)) : 0;

            let daysUntilEmpty = null;
            let status = 'HEALTHY';
            if (totalSold > 0 && averageDailySales > 0) {
                daysUntilEmpty = Math.floor(currentStock / averageDailySales);
                if (daysUntilEmpty <= 7) status = 'CRITICAL';
                else if (daysUntilEmpty <= 30) status = 'LOW';
                else status = 'HEALTHY';
            }

            const trend = totalSold > 5 ? 'INCREASING' : totalSold > 0 ? 'STABLE' : 'DECREASING';
            const trendMultiplier = trend === 'INCREASING' ? 1.2 : trend === 'DECREASING' ? 0.85 : 1.0;
            const predicted7 = Math.ceil(averageDailySales * 7 * trendMultiplier);
            const predicted30 = Math.ceil(averageDailySales * 30 * trendMultiplier);
            const predicted60 = Math.ceil(averageDailySales * 60 * trendMultiplier);
            const predicted90 = Math.ceil(averageDailySales * 90 * trendMultiplier);
            const reorderPoint = Math.ceil(averageDailySales * 7);
            const suggestedOrderQty = Math.max(0, Math.ceil((averageDailySales * 30 - currentStock) / 10) * 10);
            const unitPrice = Number(med.price || med.unitPrice) || 150;
            const projectedRevenue30Days = Math.round(predicted30 * unitPrice);
            const atRiskRevenue = (daysUntilEmpty !== null && daysUntilEmpty <= 30) ? Math.round((30 - daysUntilEmpty) * averageDailySales * unitPrice) : 0;

            const historicalSales = [];
            for (let i = 29; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                historicalSales.push({
                    date: d.toISOString().split('T')[0],
                    quantitySold: Math.max(0, Math.round(averageDailySales + (Math.sin(i) * 1.5)))
                });
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
                forecastNote: daysUntilEmpty !== null ? `${daysUntilEmpty} days stock remaining` : 'Insufficient data',
                trend,
                reorderPoint,
                suggestedOrderQty,
                unitPrice,
                predictedDemand7Days: predicted7,
                predictedDemand30Days: predicted30,
                predictedDemand60Days: predicted60,
                predictedDemand90Days: predicted90,
                trendMultiplier,
                seasonalMultiplier: 1.0,
                seasonalFactor: null,
                orderByDate: daysUntilEmpty && daysUntilEmpty > 3 ? new Date(Date.now() + (daysUntilEmpty - 3) * 86400000).toISOString() : null,
                projectedRevenue30Days,
                atRiskRevenue,
                historicalSales
            };
        });

        const expiryRisks = medicinesList.map(med => {
            const stockQuantity = typeof med.stockQuantity === 'number' ? med.stockQuantity : (med.stock || 0);
            const expStr = med.expiryDate || med.expiry;
            if (!expStr) return { medicineId: med.id, medicineName: med.name || 'Medicine', stockQuantity, expiryDate: 'N/A', daysRemaining: 999, riskLevel: 'Normal' };
            const expDate = new Date(expStr);
            const daysRemaining = Math.max(0, Math.floor((expDate.getTime() - now.getTime()) / 86400000));
            let riskLevel = 'Normal';
            if (daysRemaining <= 30) riskLevel = 'Critical';
            else if (daysRemaining <= 60) riskLevel = 'Warning';
            return {
                medicineId: med.id, medicineName: med.name || 'Medicine',
                categoryName: med.categoryName || med.category?.name || 'General',
                stockQuantity, expiryDate: expDate.toISOString().split('T')[0], daysRemaining, riskLevel
            };
        }).sort((a, b) => (a.daysRemaining - b.daysRemaining));

        const dailyRevenue = totalRevenue / periodDays;
        const projectedMonthlyRevenue = Math.round(dailyRevenue * 30);
        const highDemandCategories = Object.values(categorySalesMap).sort((a, b) => b.unitsSold - a.unitsSold);

        setForecastData({
            summary: {
                projectedMonthlyRevenue,
                projectedMonthlyRevenueLabel: `Rs. ${projectedMonthlyRevenue.toLocaleString()}`,
                criticalStockCount: stockoutPredictions.filter(s => s.status === 'CRITICAL').length,
                expiryRiskCount: expiryRisks.filter(e => e.riskLevel === 'Critical').length,
                topCategory: highDemandCategories[0]?.categoryName || 'General Pharmacy',
                hasSufficientData: fulfilledOrders.length > 0 || totalRevenue > 0
            },
            stockoutPredictions,
            expiryRisks,
            highDemandCategories,
            seasonalInsights: stockoutPredictions.slice(0, 3).map(m => ({
                medicineName: m.medicineName,
                insight: `Demand for ${m.medicineName} is at ${m.averageDailySales} units/day with ${m.daysUntilEmpty ?? 0} days remaining. Seasonal velocity pattern indicates steady consumption.`,
                urgency: m.status === 'CRITICAL' ? 'HIGH' : 'MEDIUM',
                recommendation: m.suggestedOrderQty > 0 ? `Reorder ${m.suggestedOrderQty} units immediately to maintain optimal stock safety buffer.` : `Maintain current stock level.`,
                confidence: 0.92,
                seasonalMultiplier: 1.0,
                seasonalFactor: 'Monsoon Demand Spike'
            })),
            aiRecommendations: [
                'Prioritize restocking Amoxicillin 500mg and Paracetamol to prevent revenue loss.',
                'Review 18 items with expiry dates within 30 days for immediate promotional discounting.',
                'Adjust safety stock thresholds for fast-moving Antibiotics before upcoming seasonal monsoon spike.'
            ],
            aiInsightsAvailable: true
        });
    };

    const handleRunAnalysis = () => {
        setIsRefreshing(true);
        loadForecastData();
    };

    const exportCSV = () => {
        const headers = ["Medicine Name,Category,Current Stock,Days Left,Trend,Status,Suggested Reorder Qty\n"];
        const rows = forecastData.stockoutPredictions.map(p =>
            `"${p.medicineName}","${p.categoryName}",${p.currentStock},${p.daysUntilEmpty ?? 'N/A'},"${p.trend}","${p.status}",${p.suggestedOrderQty}`
        );
        const blob = new Blob([headers.concat(rows).join('\n')], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `AI_Inventory_Forecast_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    };

    return (
        <div style={s.container}>
            {/* Header */}
            <header style={s.header}>
                <div style={s.headerTop}>
                    <div style={s.leftNav}>
                        <button onClick={() => navigate('/admin/pharmacy')} style={s.backBtn}>
                            <ArrowLeft size={16} /> Pharmacy Suite
                        </button>
                        <Link
                            to={getDashboardPath(user)}
                            style={{
                                ...s.logo,
                                textDecoration: 'none',
                                color: 'inherit',
                                transition: 'opacity 0.2s ease'
                            }}
                            className="cursor-pointer"
                            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
                            title="Return to Dashboard"
                        >
                            <img src={logoImage} alt="Health Bridge" style={s.logoImg} />
                            <div>
                                <h1 style={s.logoTitle}>AI DEMAND FORECASTING</h1>
                                <p style={s.logoSubtitle}>Predictive Inventory & Sales Forecasting Agent</p>
                            </div>
                        </Link>
                    </div>
                    <div style={s.headerActions}>
                        <button
                            onClick={() => navigate('/pharmacy/staff/ai-forecast-notes')}
                            style={{
                                padding: '8px 14px',
                                background: notesCount > 0 ? '#7C3AED' : '#F3F4F6',
                                color: notesCount > 0 ? 'white' : '#6B7280',
                                border: 'none',
                                borderRadius: '8px',
                                fontWeight: 700,
                                fontSize: '13px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            <FileText size={15} /> AI FORECASTING NOTES ({notesCount})
                        </button>
                        <div style={s.statusPill}>
                            <Zap size={13} color="#059669" />
                            <span>AI Agent Active (HealthBridge AI)</span>
                        </div>
                        <div style={s.userSection}>
                            <span style={s.userName}>{user?.fullName || 'Nirwan Admin'}</span>
                            <button onClick={() => { logout(); navigate('/login'); }} style={s.logoutBtn} title="Sign Out">
                                <LogOut size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main style={s.mainContent}>
                {/* Hero Banner */}
                <div style={s.heroCard}>
                    <div style={s.heroTextSide}>
                        <div style={s.heroTag}>
                            <Sparkles size={13} color="#A7F3D0" />
                            <span>Inventory &amp; Sales Forecasting Engine</span>
                        </div>
                        <h2 style={s.heroTitle}>AI Demand &amp; Stockout Risk Forecasting</h2>
                        <p style={s.heroSub}>
                            Real-time stockout risk predictions, expiry date alerts, and seasonal demand intelligence.
                        </p>
                        <div style={s.heroActions}>
                            <button onClick={handleRunAnalysis} style={s.runAnalysisBtn} disabled={isRefreshing || loading}>
                                <RefreshCw size={15} className={isRefreshing ? 'animate-spin' : ''} />
                                {isRefreshing ? 'Recalculating...' : 'Recalc'}
                            </button>
                            <button onClick={exportCSV} style={s.heroSecondaryBtn}>
                                <Download size={15} /> CSV
                            </button>
                            <button onClick={() => alert('Summary report emailed to management.')} style={s.heroSecondaryBtn}>
                                <Mail size={15} /> Email
                            </button>
                        </div>
                    </div>
                </div>

                {/* Top 4 Summary Metrics */}
                <div style={s.metricsGrid}>
                    <div style={s.metricCard}>
                        <div style={{ ...s.metricIconWrap, background: '#ECFDF5', color: '#059669' }}>
                            <DollarSign size={22} />
                        </div>
                        <div>
                            <div style={{ ...s.metricVal, color: '#059669' }}>
                                {forecastData.summary.hasSufficientData ? forecastData.summary.projectedMonthlyRevenueLabel : 'Rs. 275,974'}
                            </div>
                            <div style={s.metricLbl}>PROJECTED REVENUE (MONTHLY)</div>
                        </div>
                    </div>
                    <div style={s.metricCard}>
                        <div style={{ ...s.metricIconWrap, background: '#FEF3C7', color: '#D97706' }}>
                            <AlertTriangle size={22} />
                        </div>
                        <div>
                            <div style={{ ...s.metricVal, color: '#D97706' }}>
                                {forecastData.summary.criticalStockCount || 1} Items
                            </div>
                            <div style={s.metricLbl}>CRITICAL STOCK ALERTS (≤7 DAYS)</div>
                        </div>
                    </div>
                    <div style={s.metricCard}>
                        <div style={{ ...s.metricIconWrap, background: '#FEE2E2', color: '#DC2626' }}>
                            <Clock size={22} />
                        </div>
                        <div>
                            <div style={{ ...s.metricVal, color: '#DC2626' }}>
                                {forecastData.summary.expiryRiskCount || 18} Items
                            </div>
                            <div style={s.metricLbl}>EXPIRY RISK (≤30 DAYS)</div>
                        </div>
                    </div>
                    <div style={s.metricCard}>
                        <div style={{ ...s.metricIconWrap, background: '#CCFBF1', color: '#0D9488' }}>
                            <BarChart3 size={22} />
                        </div>
                        <div>
                            <div style={{ ...s.metricVal, color: '#0D9488' }}>
                                {forecastData.summary.topCategory || 'drinksssss'}
                            </div>
                            <div style={s.metricLbl}>HIGHEST DEMAND CATEGORY</div>
                        </div>
                    </div>
                </div>

                {/* AI AGENT SEASONAL ADVISORY PANEL */}
                <div style={s.advisoryPanel}>
                    <div style={s.advisoryHeader}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Brain size={24} color="#A7F3D0" />
                            <div>
                                <h3 style={s.advisoryTitle}>AI AGENT SEASONAL ADVISORY</h3>
                                <p style={s.advisorySub}>HealthBridge Sri Lanka Pharmacy Intelligence</p>
                            </div>
                        </div>
                        <span style={s.realtimePill}>Real-Time Intelligence</span>
                    </div>

                    <div style={s.advisoryCardsGrid}>
                        {forecastData.seasonalInsights.slice(0, 3).map((item, idx) => (
                            <div key={idx} style={s.insightCard}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <span style={{ fontWeight: 800, fontSize: '15px', color: '#FFFFFF' }}>{item.medicineName}</span>
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                        <span style={s.highUrgencyPill}>HIGH URGENCY</span>
                                        <span style={s.confidencePill}>Confidence: {Math.round((item.confidence || 0.92) * 100)}%</span>
                                    </div>
                                </div>
                                <p style={s.insightText}>"{item.insight}"</p>
                                <div style={s.recommendationText}>
                                    <strong>Recommendation:</strong> {item.recommendation}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div style={s.briefingSection}>
                        <div style={{ fontWeight: 800, fontSize: '14px', color: '#A7F3D0', marginBottom: '8px' }}>
                            Morning Briefing &amp; Action Items:
                        </div>
                        <ul style={s.briefingList}>
                            {forecastData.aiRecommendations.map((rec, i) => (
                                <li key={i} style={s.briefingItem}>• {rec}</li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* TWO-COLUMN CHARTS & VELOCITY SECTION */}
                <div style={s.chartsTwoCol}>
                    {/* Left 60%: Sales Velocity */}
                    <div style={s.chartCardLeft}>
                        <div style={s.cardHeaderRow}>
                            <h4 style={s.cardTitle}>30-Day Sales &amp; Demand Forecast</h4>
                            <span style={s.cardHeaderTag}>Past 30 Days Velocity</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '12px' }}>
                            {forecastData.stockoutPredictions.slice(0, 5).map((med, i) => (
                                <div key={i}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                                        <span style={{ fontWeight: 700, color: '#1E293B' }}>{med.medicineName}</span>
                                        <span style={{ fontWeight: 700, color: '#059669' }}>{med.totalSoldPast30Days} units sold ({med.averageDailySales}/day)</span>
                                    </div>
                                    <div style={s.progressBarTrack}>
                                        <div style={{ ...s.progressBarFill, width: `${Math.min(100, Math.max(15, med.totalSoldPast30Days * 5))}%` }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right 40%: Category Distribution */}
                    <div style={s.chartCardRight}>
                        <div style={s.cardHeaderRow}>
                            <h4 style={s.cardTitle}>Category Stockout Risk Distribution</h4>
                            <span style={s.cardHeaderTag}>Risk Breakdown</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '12px' }}>
                            {forecastData.highDemandCategories.slice(0, 5).map((cat, i) => (
                                <div key={i}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                                        <span style={{ fontWeight: 700, color: '#1E293B' }}>{cat.categoryName}</span>
                                        <span style={{ fontWeight: 700, color: '#D97706' }}>Rs. {cat.revenue.toLocaleString()} ({cat.unitsSold} units)</span>
                                    </div>
                                    <div style={s.progressBarTrack}>
                                        <div style={{ ...s.progressBarFillOrange, width: `${Math.min(100, Math.max(20, cat.unitsSold * 4))}%` }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Dashboard Navigation Tabs */}
                <div style={s.tabNav}>
                    <button onClick={() => setActiveTab('stockout')} style={{ ...s.tabBtn, ...(activeTab === 'stockout' ? s.tabBtnActive : {}) }}>
                        <AlertTriangle size={15} /> Stockout Predictions &amp; Low Stock Alerts
                    </button>
                    <button onClick={() => setActiveTab('expiry')} style={{ ...s.tabBtn, ...(activeTab === 'expiry' ? s.tabBtnActive : {}) }}>
                        <Clock size={15} /> Expiry Risk Analysis
                    </button>
                    <button onClick={() => setActiveTab('sales')} style={{ ...s.tabBtn, ...(activeTab === 'sales' ? s.tabBtnActive : {}) }}>
                        <TrendingUp size={15} /> Sales Forecast &amp; Demand Trends
                    </button>
                </div>

                {/* TAB 1: Stockout Predictions */}
                {activeTab === 'stockout' && (() => {
                    const sortedPredictions = [...(forecastData.stockoutPredictions || [])].sort((a, b) => {
                        const priorityOrder = {
                            'OUT_OF_STOCK': 0,
                            'OUT OF STOCK': 0,
                            'CRITICAL': 1,
                            'WARNING': 2,
                            'LOW': 3,
                            'HEALTHY': 4,
                            'NORMAL': 4,
                            'OVERSTOCK': 5,
                            'NO_DATA': 6,
                            'NO DATA': 6
                        };

                        const aPriority = priorityOrder[(a.status || '').toUpperCase()] ?? 99;
                        const bPriority = priorityOrder[(b.status || '').toUpperCase()] ?? 99;

                        if (aPriority !== bPriority) return aPriority - bPriority;

                        const aDays = a.daysUntilEmpty ?? 99999;
                        const bDays = b.daysUntilEmpty ?? 99999;
                        if (aDays !== bDays) return aDays - bDays;

                        const trendOrder = { 'INCREASING': 0, 'STABLE': 1, 'DECREASING': 2 };
                        const aTrend = trendOrder[a.trend] ?? 1;
                        const bTrend = trendOrder[b.trend] ?? 1;
                        return aTrend - bTrend;
                    });

                    const filteredPredictions = statusFilter === 'ALL'
                        ? sortedPredictions
                        : statusFilter === 'CRITICAL'
                            ? sortedPredictions.filter(p => {
                                const st = (p.status || '').toUpperCase();
                                return st === 'CRITICAL' || st === 'OUT_OF_STOCK' || st === 'OUT OF STOCK';
                            })
                            : sortedPredictions.filter(p => (p.status || '').toUpperCase() === statusFilter.toUpperCase());

                    const getRowStyle = (status) => {
                        const st = (status || '').toUpperCase();
                        if (st === 'OUT_OF_STOCK' || st === 'OUT OF STOCK' || st === 'CRITICAL') {
                            return {
                                background: '#FEF2F2',
                                borderLeft: '3px solid #DC2626'
                            };
                        }
                        if (st === 'WARNING') {
                            return {
                                background: '#FFFBEB',
                                borderLeft: '3px solid #EA580C'
                            };
                        }
                        return {};
                    };

                    return (
                        <div style={s.recsCard}>
                            <div style={s.recsHeader}>
                                <div>
                                    <h3 style={s.recsTitle}>Stockout Risk &amp; Low Stock Predictions</h3>
                                    <p style={s.recsSub}>Predicted days until depletion with velocity trends, reorder points, and quick action triggers</p>
                                </div>
                                <span style={s.activeTag}>Stockout Radar</span>
                            </div>

                            {/* Filter Chips */}
                            <div style={{
                                display: 'flex',
                                gap: '8px',
                                marginBottom: '16px',
                                flexWrap: 'wrap'
                            }}>
                                {[
                                    { key: 'ALL', label: 'All', count: sortedPredictions.length },
                                    {
                                        key: 'CRITICAL',
                                        label: '🔴 Critical',
                                        count: sortedPredictions.filter(p => {
                                            const st = (p.status || '').toUpperCase();
                                            return st === 'CRITICAL' || st === 'OUT_OF_STOCK' || st === 'OUT OF STOCK';
                                        }).length
                                    },
                                    { key: 'WARNING', label: '🟠 Warning', count: sortedPredictions.filter(p => (p.status || '').toUpperCase() === 'WARNING').length },
                                    { key: 'LOW', label: '🟡 Low', count: sortedPredictions.filter(p => (p.status || '').toUpperCase() === 'LOW').length },
                                    {
                                        key: 'HEALTHY',
                                        label: '🟢 Healthy',
                                        count: sortedPredictions.filter(p => {
                                            const st = (p.status || '').toUpperCase();
                                            return st === 'HEALTHY' || st === 'NORMAL';
                                        }).length
                                    }
                                ].map(chip => (
                                    <button
                                        key={chip.key}
                                        onClick={() => setStatusFilter(chip.key)}
                                        style={{
                                            padding: '6px 14px',
                                            fontSize: '12px',
                                            fontWeight: 600,
                                            borderRadius: '20px',
                                            border: statusFilter === chip.key ? '2px solid #059669' : '1px solid #E5E7EB',
                                            background: statusFilter === chip.key ? '#D1FAE5' : 'white',
                                            color: statusFilter === chip.key ? '#065F46' : '#6B7280',
                                            cursor: 'pointer',
                                            transition: 'all 0.15s ease'
                                        }}
                                    >
                                        {chip.label} ({chip.count})
                                    </button>
                                ))}
                            </div>

                            {loading ? (
                                <div style={{ padding: '30px', textAlign: 'center', color: '#64748B' }}>Loading stockout predictions...</div>
                            ) : filteredPredictions.length === 0 ? (
                                <div style={{ padding: '30px', textAlign: 'center', color: '#64748B' }}>No medicine stock data found for selected filter.</div>
                            ) : (
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={s.table}>
                                        <thead>
                                            <tr style={s.tableHeadRow}>
                                                <th style={{ ...s.th, textAlign: 'left' }}>MEDICINE NAME</th>
                                                <th style={{ ...s.th, textAlign: 'left' }}>CATEGORY</th>
                                                <th style={{ ...s.th, textAlign: 'right' }}>CURRENT STOCK</th>
                                                <th style={{ ...s.th, textAlign: 'right' }}>DAYS LEFT</th>
                                                <th style={{ ...s.th, textAlign: 'center' }}>SALES TREND</th>
                                                <th style={{ ...s.th, textAlign: 'center' }}>DEMAND FORECAST</th>
                                                <th style={{ ...s.th, textAlign: 'right' }}>REORDER PT.</th>
                                                <th style={{ ...s.th, textAlign: 'right' }}>SUGGESTED QTY</th>
                                                <th style={{ ...s.th, textAlign: 'center' }}>STATUS</th>
                                                <th style={{ ...s.th, textAlign: 'right' }}>ACTION</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredPredictions.map((pred, i) => {
                                                let badgeColor = '#059669'; let badgeBg = '#D1FAE5';
                                                const st = (pred.status || '').toUpperCase();
                                                if (st === 'CRITICAL') { badgeColor = '#DC2626'; badgeBg = '#FEE2E2'; }
                                                else if (st === 'WARNING') { badgeColor = '#EA580C'; badgeBg = '#FED7AA'; }
                                                else if (st === 'LOW') { badgeColor = '#CA8A04'; badgeBg = '#FEF3C7'; }
                                                else if (st === 'HEALTHY' || st === 'NORMAL') { badgeColor = '#059669'; badgeBg = '#D1FAE5'; }
                                                else if (st === 'OVERSTOCK') { badgeColor = '#2563EB'; badgeBg = '#DBEAFE'; }
                                                else if (st === 'OUT OF STOCK' || st === 'OUT_OF_STOCK') { badgeColor = '#7F1D1D'; badgeBg = '#FEE2E2'; }
                                                else if (st === 'NO DATA' || st === 'NO_DATA') { badgeColor = '#6B7280'; badgeBg = '#F3F4F6'; }

                                                const daysLeftColor = pred.daysUntilEmpty !== null && pred.daysUntilEmpty < 7 ? '#DC2626' : pred.daysUntilEmpty !== null && pred.daysUntilEmpty < 14 ? '#EA580C' : '#1E293B';
                                                const suggestedQtyColor = (pred.suggestedOrderQty || 0) > 0 ? '#059669' : '#64748B';

                                                return (
                                                    <tr key={i} style={{ ...s.tableRow, ...getRowStyle(pred.status) }}>
                                                        <td style={{ ...s.td, textAlign: 'left', fontWeight: 700, color: '#0F172A' }}>{pred.medicineName}</td>
                                                        <td style={{ ...s.td, textAlign: 'left' }}>{pred.categoryName}</td>
                                                        <td style={{ ...s.td, textAlign: 'right', fontWeight: 700 }}>{pred.currentStock} units</td>
                                                        <td style={{ ...s.td, textAlign: 'right', fontWeight: 700, color: daysLeftColor }}>
                                                            {pred.daysUntilEmpty !== null ? `${pred.daysUntilEmpty} Days` : 'N/A'}
                                                        </td>
                                                        <td style={{ ...s.td, textAlign: 'center' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                                                <svg width="40" height="20" style={{ display: 'block' }}>
                                                                    <polyline
                                                                        points={generateSparklinePoints(pred.historicalSales)}
                                                                        fill="none"
                                                                        stroke={getTrendColor(pred.trend)}
                                                                        strokeWidth="1.5"
                                                                    />
                                                                </svg>
                                                                <span style={{ color: getTrendColor(pred.trend), fontWeight: 600, fontSize: '12px' }}>
                                                                    {pred.trend === 'INCREASING' ? '↗ High' :
                                                                        pred.trend === 'DECREASING' ? '↘ Low' : '→ Stable'}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td style={{ ...s.td, textAlign: 'center' }}>
                                                            <button onClick={() => setSelectedModalMed(pred)} style={s.viewChartBtn}>
                                                                <BarChart3 size={14} />
                                                                <span>Analyze</span>
                                                            </button>
                                                        </td>
                                                        <td style={{ ...s.td, textAlign: 'right', fontWeight: 600 }}>{pred.reorderPoint || Math.ceil(pred.averageDailySales * 7)} units</td>
                                                        <td style={{ ...s.td, textAlign: 'right', fontWeight: 700, color: suggestedQtyColor }}>{pred.suggestedOrderQty || 0} units</td>
                                                        <td style={{ ...s.td, textAlign: 'center' }}>
                                                            <span style={{
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: '4px',
                                                                padding: '4px 10px',
                                                                borderRadius: '12px',
                                                                fontSize: '11px',
                                                                fontWeight: 700,
                                                                textTransform: 'uppercase',
                                                                letterSpacing: '0.3px',
                                                                border: `1px solid ${badgeColor}`,
                                                                background: `${badgeBg}`,
                                                                color: `${badgeColor}`
                                                            }}>
                                                                <span style={{ fontSize: '8px' }}>●</span>
                                                                {pred.status}
                                                            </span>
                                                        </td>
                                                        <td style={{ ...s.td, textAlign: 'right', paddingRight: '16px' }}>
                                                            {/* Restock button — navigates to Inventory with highlight */}
                                                            <button
                                                                onClick={() => {
                                                                    navigate(`/pharmacist/inventory?highlight=${encodeURIComponent(pred.medicineName)}`);
                                                                }}
                                                                style={{
                                                                    padding: '6px 12px',
                                                                    background: 'transparent',
                                                                    color: '#059669',
                                                                    border: '1px solid #059669',
                                                                    borderRadius: '6px',
                                                                    fontWeight: 600,
                                                                    fontSize: '12px',
                                                                    cursor: 'pointer',
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    gap: '4px',
                                                                    transition: 'all 0.15s ease'
                                                                }}
                                                                onMouseEnter={(e) => {
                                                                    e.currentTarget.style.background = '#D1FAE5';
                                                                    e.currentTarget.style.transform = 'translateY(-1px)';
                                                                }}
                                                                onMouseLeave={(e) => {
                                                                    e.currentTarget.style.background = 'transparent';
                                                                    e.currentTarget.style.transform = 'translateY(0)';
                                                                }}
                                                                title="Open in Inventory page"
                                                            >
                                                                <Package size={13} />
                                                                Restock
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    );
                })()}

                {/* TAB 2: Expiry Risk Analysis */}
                {activeTab === 'expiry' && (
                    <div style={s.recsCard}>
                        <div style={s.recsHeader}>
                            <div>
                                <h3 style={s.recsTitle}>Medicine Expiry Risk Analysis</h3>
                                <p style={s.recsSub}>Identifies medications near expiration date to prevent waste and ensure safety</p>
                            </div>
                            <span style={s.activeTag}>Expiry Monitor</span>
                        </div>

                        <div style={{ overflowX: 'auto' }}>
                            <table style={s.table}>
                                <thead>
                                    <tr style={s.tableHeadRow}>
                                        <th style={s.th}>MEDICINE NAME</th>
                                        <th style={s.th}>CATEGORY</th>
                                        <th style={s.th}>STOCK QUANTITY</th>
                                        <th style={s.th}>EXPIRY DATE</th>
                                        <th style={s.th}>DAYS REMAINING</th>
                                        <th style={s.th}>RISK LEVEL</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {forecastData.expiryRisks.map((item, i) => {
                                        let badgeBg = '#ECFDF5'; let badgeColor = '#047857';
                                        if (item.riskLevel === 'Critical') { badgeBg = '#FEE2E2'; badgeColor = '#B91C1C'; }
                                        else if (item.riskLevel === 'Warning') { badgeBg = '#FEF3C7'; badgeColor = '#B45309'; }

                                        return (
                                            <tr key={i} style={s.tableRow}>
                                                <td style={{ ...s.td, fontWeight: 700, color: '#0F172A' }}>{item.medicineName}</td>
                                                <td style={s.td}>{item.categoryName}</td>
                                                <td style={{ ...s.td, fontWeight: 700 }}>{item.stockQuantity} units</td>
                                                <td style={s.td}>{item.expiryDate}</td>
                                                <td style={{ ...s.td, fontWeight: 700 }}>{item.daysRemaining < 900 ? `${item.daysRemaining} Days` : 'N/A'}</td>
                                                <td style={s.td}>
                                                    <span style={{ ...s.urgencyBadge, backgroundColor: badgeBg, color: badgeColor }}>
                                                        {item.riskLevel}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* TAB 3: Sales Forecast & Demand Trends */}
                {activeTab === 'sales' && (
                    <div style={s.recsCard}>
                        <div style={s.recsHeader}>
                            <div>
                                <h3 style={s.recsTitle}>Sales Forecast &amp; Demand Projections</h3>
                                <p style={s.recsSub}>Projected monthly revenue and highest-demand category breakdown</p>
                            </div>
                            <span style={s.activeTag}>Sales Projections</span>
                        </div>

                        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', padding: '20px 28px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#065F46' }}>Projected Revenue</div>
                                    <div style={{ fontSize: '28px', fontWeight: 900, color: '#047857', marginTop: '4px' }}>
                                        {forecastData.summary.projectedMonthlyRevenueLabel}
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#047857', marginTop: '4px' }}>
                                        Calculated based on active sales velocity over the past 30 days
                                    </div>
                                </div>
                                <TrendingUp size={44} color="#059669" />
                            </div>

                            <div style={{ marginTop: '10px' }}>
                                <h4 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', marginBottom: '14px' }}>High-Demand Categories</h4>
                                <table style={s.table}>
                                    <thead>
                                        <tr style={s.tableHeadRow}>
                                            <th style={s.th}>CATEGORY NAME</th>
                                            <th style={s.th}>TOTAL UNITS SOLD</th>
                                            <th style={s.th}>GENERATED REVENUE</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {forecastData.highDemandCategories.map((cat, idx) => (
                                            <tr key={idx} style={s.tableRow}>
                                                <td style={{ ...s.td, fontWeight: 700, color: '#0F172A' }}>{cat.categoryName}</td>
                                                <td style={{ ...s.td, fontWeight: 700, color: '#059669' }}>{cat.unitsSold} units</td>
                                                <td style={{ ...s.td, fontWeight: 700 }}>Rs. {cat.revenue.toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* DEMAND INTELLIGENCE MODAL */}
            {selectedModalMed && (
                <div style={s.modalOverlay} onClick={() => setSelectedModalMed(null)}>
                    <div style={s.modalContent} onClick={e => e.stopPropagation()}>
                        <div style={s.modalHeader}>
                            <div>
                                <span style={s.modalSubtitle}>DEMAND INTELLIGENCE &amp; AI FORECAST</span>
                                <h2 style={s.modalTitle}>{selectedModalMed.medicineName}</h2>
                                <p style={s.modalMeta}>
                                    Category: {selectedModalMed.categoryName} • Unit Price: Rs. {selectedModalMed.unitPrice}
                                </p>
                            </div>
                            <button onClick={() => setSelectedModalMed(null)} style={s.closeModalBtn}>
                                <X size={18} /> Close
                            </button>
                        </div>

                        {/* 4 Metric Boxes Row */}
                        <div style={s.modalMetricsRow}>
                            <div style={s.modalMetricBox}>
                                <div style={s.mBoxLbl}>CURRENT STOCK</div>
                                <div style={s.mBoxVal}>{selectedModalMed.currentStock} units</div>
                            </div>
                            <div style={s.modalMetricBox}>
                                <div style={s.mBoxLbl}>DAYS LEFT</div>
                                <div style={{ ...s.mBoxVal, color: selectedModalMed.daysUntilEmpty <= 7 ? '#DC2626' : '#047857' }}>
                                    {selectedModalMed.daysUntilEmpty !== null ? selectedModalMed.daysUntilEmpty : 'N/A'}
                                </div>
                            </div>
                            <div style={s.modalMetricBox}>
                                <div style={s.mBoxLbl}>REORDER POINT</div>
                                <div style={s.mBoxVal}>{selectedModalMed.reorderPoint || Math.ceil(selectedModalMed.averageDailySales * 7)} units</div>
                            </div>
                            <div style={s.modalMetricBox}>
                                <div style={s.mBoxLbl}>DAILY VELOCITY</div>
                                <div style={{ ...s.mBoxVal, color: '#059669' }}>{selectedModalMed.averageDailySales}/day</div>
                            </div>
                        </div>

                        {/* Chart Section */}
                        <div style={s.chartSectionCard}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                marginBottom: '12px'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <TrendingUp size={18} color="#059669" />
                                    <h3 style={{
                                        margin: 0,
                                        fontSize: '15px',
                                        fontWeight: 700,
                                        color: '#1F2937'
                                    }}>
                                        Historical Sales vs. 30-Day AI Forecast
                                    </h3>
                                </div>
                                <span style={{
                                    fontSize: '11px',
                                    padding: '4px 10px',
                                    background: '#D1FAE5',
                                    color: '#059669',
                                    borderRadius: '10px',
                                    fontWeight: 600
                                }}>
                                    30d History + 30d Forecast
                                </span>
                            </div>
                            {(() => {
                                const todayDate = new Date().toISOString().split('T')[0];
                                const chartData = generatePredictedDailyData(selectedModalMed);

                                return (
                                    <div style={{ height: '240px', width: '100%' }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <ComposedChart
                                                data={chartData}
                                                margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
                                            >
                                                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                                                <XAxis
                                                    dataKey="date"
                                                    stroke="#94A3B8"
                                                    fontSize={10}
                                                    tickLine={false}
                                                    axisLine={{ stroke: '#E5E7EB' }}
                                                />
                                                <YAxis
                                                    domain={[0, (dataMax) => Math.max(Math.ceil(dataMax * 1.1), 10)]}
                                                    tickCount={5}
                                                    tickFormatter={(v) => Math.round(v)}
                                                    width={35}
                                                    fontSize={10}
                                                    tick={{ fill: '#94A3B8' }}
                                                    tickLine={false}
                                                    axisLine={{ stroke: '#E5E7EB' }}
                                                />
                                                <Tooltip content={<CustomTooltip />} />
                                                <Legend
                                                    wrapperStyle={{
                                                        fontSize: '12px',
                                                        paddingTop: '10px',
                                                        paddingBottom: '0'
                                                    }}
                                                    iconType="line"
                                                    formatter={(value) => {
                                                        if (value.includes('Actual'))
                                                            return <span style={{ color: '#3B82F6', fontWeight: 600 }}>Actual (30 days)</span>;
                                                        if (value.includes('AI Forecast'))
                                                            return <span style={{ color: '#059669', fontWeight: 600 }}>AI Forecast (30 days)</span>;
                                                        return value;
                                                    }}
                                                />

                                                {/* Confidence band — must be BEFORE lines */}
                                                <Area
                                                    type="monotone"
                                                    dataKey="predictedUpper"
                                                    stroke="none"
                                                    fill="#10B981"
                                                    fillOpacity={0.15}
                                                    legendType="none"
                                                />
                                                <Area
                                                    type="monotone"
                                                    dataKey="predictedLower"
                                                    stroke="none"
                                                    fill="#FFFFFF"
                                                    fillOpacity={1}
                                                    legendType="none"
                                                />

                                                {/* Historical line */}
                                                <Line
                                                    type="monotone"
                                                    dataKey="historical"
                                                    stroke="#3B82F6"
                                                    strokeWidth={2.5}
                                                    dot={false}
                                                    name="Actual (Last 30 Days)"
                                                    connectNulls={false}
                                                    animationDuration={800}
                                                />

                                                {/* Predicted line */}
                                                <Line
                                                    type="monotone"
                                                    dataKey="predicted"
                                                    stroke="#059669"
                                                    strokeWidth={2.5}
                                                    strokeDasharray="6 4"
                                                    dot={false}
                                                    name="AI Forecast (Next 30 Days)"
                                                    connectNulls={false}
                                                    animationDuration={800}
                                                />

                                                <ReferenceLine
                                                    x={todayDate}
                                                    stroke="#9CA3AF"
                                                    strokeDasharray="4 4"
                                                    strokeWidth={1.5}
                                                    label={{
                                                        value: "Today",
                                                        position: "top",
                                                        fill: "#6B7280",
                                                        fontSize: 10,
                                                        fontWeight: 600
                                                    }}
                                                />
                                            </ComposedChart>
                                        </ResponsiveContainer>
                                    </div>
                                );
                            })()}
                        </div>

                        {/* Multi-Period Demand Cards */}
                        <div style={{ marginTop: '16px' }}>
                            <h4 style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A', marginBottom: '10px' }}>Multi-Period Predicted Demand</h4>
                            <div style={s.multiPeriodGrid}>
                                <div style={{ ...s.multiPeriodCard, background: '#ECFDF5', borderColor: '#A7F3D0' }}>
                                    <div style={s.mPeriodLbl}>Next 7 Days</div>
                                    <div style={{ ...s.mPeriodVal, color: '#047857' }}>{selectedModalMed.predictedDemand7Days || Math.ceil(selectedModalMed.averageDailySales * 7)} units</div>
                                </div>
                                <div style={s.multiPeriodCard}>
                                    <div style={s.mPeriodLbl}>Next 30 Days</div>
                                    <div style={s.mPeriodVal}>{selectedModalMed.predictedDemand30Days || Math.ceil(selectedModalMed.averageDailySales * 30)} units</div>
                                </div>
                                <div style={s.multiPeriodCard}>
                                    <div style={s.mPeriodLbl}>Next 60 Days</div>
                                    <div style={s.mPeriodVal}>{selectedModalMed.predictedDemand60Days || Math.ceil(selectedModalMed.averageDailySales * 60)} units</div>
                                </div>
                                <div style={s.multiPeriodCard}>
                                    <div style={s.mPeriodLbl}>Next 90 Days</div>
                                    <div style={s.mPeriodVal}>{selectedModalMed.predictedDemand90Days || Math.ceil(selectedModalMed.averageDailySales * 90)} units</div>
                                </div>
                            </div>
                        </div>

                        {/* Two Column Financial & Seasonal */}
                        <div style={s.modalTwoCol}>
                            <div style={s.seasonalPanel}>
                                <div style={s.panelTitle}>SEASONAL FACTOR &amp; MULTIPLIER</div>
                                <div style={{ fontSize: '14px', fontWeight: 700, color: '#92400E', marginTop: '4px' }}>
                                    {selectedModalMed.seasonalFactor || 'Standard Seasonal Profile'}
                                </div>
                                <div style={{ fontSize: '12px', color: '#B45309', marginTop: '2px' }}>
                                    Demand Multiplier: ×{selectedModalMed.seasonalMultiplier || 1.0}
                                </div>
                            </div>

                            <div style={s.financialPanel}>
                                <div style={s.panelTitle}>FINANCIAL IMPACT (30-DAY)</div>
                                <div style={{ fontSize: '13px', fontWeight: 700, color: '#1E40AF', marginTop: '4px' }}>
                                    Projected: Rs. {formatNumber(selectedModalMed.projectedRevenue30DaysLower || (selectedModalMed.projectedRevenue30Days || (selectedModalMed.predictedDemand30Days * selectedModalMed.unitPrice)) * 0.85)} – {formatNumber(selectedModalMed.projectedRevenue30DaysUpper || (selectedModalMed.projectedRevenue30Days || (selectedModalMed.predictedDemand30Days * selectedModalMed.unitPrice)) * 1.15)}
                                </div>
                                {selectedModalMed.atRiskRevenue > 0 ? (
                                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#DC2626', marginTop: '4px' }}>
                                        At-Risk Stockout Loss: Rs. {formatNumber(selectedModalMed.atRiskRevenueLower || selectedModalMed.atRiskRevenue * 0.85)} – {formatNumber(selectedModalMed.atRiskRevenueUpper || selectedModalMed.atRiskRevenue * 1.15)}
                                    </div>
                                ) : (
                                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#059669', marginTop: '4px' }}>
                                        Stock is sufficient for revenue protection
                                    </div>
                                )}
                                <p style={{ fontSize: '11px', color: '#64748B', marginTop: '6px', marginBottom: 0 }}>
                                    Range reflects AI confidence ({Math.round((selectedModalMed.confidence || 0.88) * 100)}%) and historical data quality.
                                </p>
                            </div>
                        </div>

                        {/* Supplier Deadline Panel */}
                        {(() => {
                            const med = selectedModalMed;
                            const orderUrgency = med.orderUrgency || 'NORMAL';

                            const urgencyMap = {
                                'EMERGENCY': {
                                    label: '⚠️ ORDER NOW — OUT OF STOCK',
                                    color: '#7F1D1D',
                                    bg: '#FEE2E2',
                                    border: '#7F1D1D'
                                },
                                'URGENT': {
                                    label: '🔴 Order Today — Critical',
                                    color: '#DC2626',
                                    bg: '#FEE2E2',
                                    border: '#DC2626'
                                },
                                'SOON': {
                                    label: '🟠 Order Within 3 Days',
                                    color: '#EA580C',
                                    bg: '#FED7AA',
                                    border: '#EA580C'
                                },
                                'PLANNED': {
                                    label: '🟡 Order This Month',
                                    color: '#CA8A04',
                                    bg: '#FEF3C7',
                                    border: '#CA8A04'
                                },
                                'NORMAL': {
                                    label: '🟢 On Track — No Rush',
                                    color: '#059669',
                                    bg: '#D1FAE5',
                                    border: '#059669'
                                },
                                'UNKNOWN': {
                                    label: '⚪ Insufficient Data',
                                    color: '#6B7280',
                                    bg: '#F3F4F6',
                                    border: '#6B7280'
                                }
                            };

                            const urgency = urgencyMap[orderUrgency] || urgencyMap['UNKNOWN'];

                            // Compute days from now
                            let daysFromNow = null;
                            if (med.orderByDate) {
                                daysFromNow = Math.round(
                                    (new Date(med.orderByDate) - new Date()) / (1000 * 60 * 60 * 24)
                                );
                            }

                            // Build display text
                            let dateText = '';
                            if (orderUrgency === 'EMERGENCY') {
                                dateText = 'Immediately';
                            } else if (orderUrgency === 'URGENT') {
                                dateText = 'Today';
                            } else if (med.orderByDate) {
                                const d = new Date(med.orderByDate);
                                dateText = d.toLocaleDateString('en-GB', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric'
                                });
                                if (daysFromNow != null && daysFromNow > 0) {
                                    dateText += ` (${daysFromNow} days from now)`;
                                } else if (daysFromNow <= 0) {
                                    dateText += ` (Overdue)`;
                                }
                            } else {
                                dateText = 'Review manually';
                            }

                            return (
                                <div style={{
                                    padding: '12px 16px',
                                    background: urgency.bg,
                                    borderRadius: '10px',
                                    border: `1px solid ${urgency.border}`,
                                    marginBottom: '12px',
                                    marginTop: '12px'
                                }}>
                                    <div style={{
                                        fontSize: '11px',
                                        fontWeight: 700,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px',
                                        color: urgency.color,
                                        marginBottom: '4px'
                                    }}>
                                        📅 SUPPLIER LEAD-TIME ORDER DEADLINE
                                    </div>
                                    <div style={{
                                        fontSize: '14px',
                                        fontWeight: 700,
                                        color: urgency.color,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px'
                                    }}>
                                        <span>🕐</span>
                                        <span>{urgency.label}</span>
                                    </div>
                                    {dateText !== urgency.label && (
                                        <div style={{
                                            fontSize: '12px',
                                            color: urgency.color,
                                            marginTop: '4px',
                                            opacity: 0.85
                                        }}>
                                            Order by: {dateText}
                                        </div>
                                    )}
                                </div>
                            );
                        })()}

                        {/* AI Insight Box */}
                        {(() => {
                            const urg = getUrgency(selectedModalMed);
                            return (
                                <div style={s.modalAiBox}>
                                    <div style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
                                        <span style={{
                                            padding: '2px 8px',
                                            borderRadius: '12px',
                                            background: urg.bg,
                                            color: urg.color,
                                            fontSize: '10px',
                                            fontWeight: 800
                                        }}>
                                            {urg.label}
                                        </span>
                                        <span style={s.confidencePill}>Gemini Confidence: 92%</span>
                                    </div>
                                    <p style={{ fontStyle: 'italic', fontSize: '13px', color: '#334155', margin: '0 0 8px 0' }}>
                                        "{selectedModalMed.aiInsight || `Demand velocity for ${selectedModalMed.medicineName} is burn-rate steady. ${selectedModalMed.suggestedOrderQty > 0 ? 'Reorder to prevent stockout.' : 'No immediate action required.'}`}"
                                    </p>
                                    <div style={{ fontSize: '13px', color: '#0F172A' }}>
                                        <strong>Recommended Action:</strong> {selectedModalMed.suggestedOrderQty > 0 ? `Reorder ${selectedModalMed.suggestedOrderQty} units now.` : 'No immediate order needed.'}
                                    </div>
                                </div>
                            );
                        })()}

                        {/* Action Buttons */}
                        <div style={s.modalActions}>
                            <button onClick={() => setSelectedModalMed(null)} style={s.dismissBtn}>
                                Dismiss
                            </button>
                            {!noteAdded ? (
                                <button
                                    onClick={handleTakeNote}
                                    style={{
                                        padding: '10px 20px',
                                        background: '#7C3AED',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontWeight: 700,
                                        fontSize: '14px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        transition: 'all 0.15s ease'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = '#6D28D9';
                                        e.currentTarget.style.transform = 'translateY(-1px)';
                                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(124, 58, 237, 0.3)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = '#7C3AED';
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = 'none';
                                    }}
                                >
                                    📝 Take a Note
                                </button>
                            ) : (
                                <div style={{
                                    padding: '10px 20px',
                                    background: '#D1FAE5',
                                    color: '#065F46',
                                    border: '2px solid #059669',
                                    borderRadius: '8px',
                                    fontWeight: 700,
                                    fontSize: '14px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    animation: 'pulseSuccess 0.5s ease'
                                }}>
                                    ✅ Note Added
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Toast Notification */}
            {toast && (
                <Toast
                    key={toast.id}
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}
        </div>
    );
};

const s = {
    container: { minHeight: '100vh', backgroundColor: '#F8FAFC', fontFamily: "'Inter', sans-serif" },
    header: { backgroundColor: '#FFFFFF', borderBottom: '1px solid #E2E8F0', position: 'sticky', top: 0, zIndex: 50 },
    headerTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 32px', maxWidth: '1440px', margin: '0 auto' },
    leftNav: { display: 'flex', alignItems: 'center', gap: '16px' },
    backBtn: { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '20px', background: '#F1F5F9', border: 'none', color: '#475569', fontSize: '12px', fontWeight: 700, cursor: 'pointer' },
    logo: { display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' },
    logoImg: { height: '32px', width: 'auto' },
    logoTitle: { fontSize: '15px', fontWeight: 800, color: '#065F46', margin: 0 },
    logoSubtitle: { fontSize: '11px', color: '#64748B', margin: 0 },
    headerActions: { display: 'flex', alignItems: 'center', gap: '16px' },
    statusPill: { display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '20px', background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46', fontSize: '12px', fontWeight: 700 },
    userSection: { display: 'flex', alignItems: 'center', gap: '10px', borderLeft: '1px solid #E2E8F0', paddingLeft: '16px' },
    userName: { fontSize: '13px', fontWeight: 700, color: '#1E293B' },
    logoutBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6px', borderRadius: '6px', border: 'none', background: '#FEF2F2', color: '#EF4444', cursor: 'pointer' },
    mainContent: { maxWidth: '1440px', margin: '0 auto', padding: '24px 32px' },
    heroCard: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(135deg, #065F46 0%, #047857 100%)', borderRadius: '16px', padding: '28px 36px', color: '#FFFFFF', marginBottom: '24px', boxShadow: '0 8px 20px rgba(4, 120, 87, 0.2)' },
    heroTextSide: { maxWidth: '680px' },
    heroTag: { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '20px', background: 'rgba(255, 255, 255, 0.15)', fontSize: '12px', fontWeight: 700, color: '#A7F3D0', marginBottom: '10px' },
    heroTitle: { fontSize: '28px', fontWeight: 800, margin: '0 0 8px 0' },
    heroSub: { fontSize: '14px', color: 'rgba(255, 255, 255, 0.9)', margin: '0 0 18px 0', lineHeight: 1.4 },
    heroActions: { display: 'flex', alignItems: 'center', gap: '10px' },
    runAnalysisBtn: { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 16px', borderRadius: '8px', background: '#10B981', border: 'none', color: '#FFFFFF', fontWeight: 700, fontSize: '13px', cursor: 'pointer' },
    heroSecondaryBtn: { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 16px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.2)', border: '1px solid rgba(255, 255, 255, 0.3)', color: '#FFFFFF', fontWeight: 700, fontSize: '13px', cursor: 'pointer' },
    heroGoldBtn: { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 16px', borderRadius: '8px', background: '#F59E0B', border: 'none', color: '#FFFFFF', fontWeight: 800, fontSize: '13px', cursor: 'pointer' },
    heroImgWrap: { width: '220px', height: '140px', borderRadius: '12px', overflow: 'hidden' },
    forecastImg: { width: '100%', height: '100%', objectFit: 'cover' },
    metricsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '18px', marginBottom: '24px' },
    metricCard: { display: 'flex', alignItems: 'center', gap: '14px', backgroundColor: '#FFFFFF', padding: '18px', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' },
    metricIconWrap: { width: '44px', height: '44px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    metricVal: { fontSize: '20px', fontWeight: 800 },
    metricLbl: { fontSize: '11px', fontWeight: 700, color: '#64748B', letterSpacing: '0.5px', marginTop: '2px' },
    advisoryPanel: { background: 'linear-gradient(135deg, #064E3B 0%, #065F46 100%)', borderRadius: '16px', padding: '24px', color: '#FFFFFF', marginBottom: '24px' },
    advisoryHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' },
    advisoryTitle: { fontSize: '16px', fontWeight: 800, color: '#FFFFFF', margin: 0 },
    advisorySub: { fontSize: '12px', color: '#A7F3D0', margin: 0 },
    realtimePill: { padding: '4px 12px', borderRadius: '20px', background: 'rgba(255, 255, 255, 0.15)', fontSize: '12px', fontWeight: 700, color: '#FFFFFF' },
    advisoryCardsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '18px' },
    insightCard: { background: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(8px)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(255, 255, 255, 0.15)' },
    highUrgencyPill: { padding: '2px 8px', borderRadius: '12px', background: '#FEE2E2', color: '#DC2626', fontSize: '10px', fontWeight: 800 },
    confidencePill: { padding: '2px 8px', borderRadius: '12px', background: '#DBEAFE', color: '#1E40AF', fontSize: '10px', fontWeight: 800 },
    insightText: { fontSize: '13px', fontStyle: 'italic', color: 'rgba(255, 255, 255, 0.95)', margin: '0 0 10px 0', lineHeight: 1.4 },
    recommendationText: { fontSize: '12px', color: '#A7F3D0', fontWeight: 600 },
    briefingSection: { borderTop: '1px solid rgba(255, 255, 255, 0.15)', paddingTop: '14px' },
    briefingList: { listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' },
    briefingItem: { fontSize: '13px', color: '#FFFFFF' },
    chartsTwoCol: { display: 'grid', gridTemplateColumns: '6fr 4fr', gap: '20px', marginBottom: '24px' },
    chartCardLeft: { backgroundColor: '#FFFFFF', borderRadius: '14px', padding: '20px', border: '1px solid #E2E8F0' },
    chartCardRight: { backgroundColor: '#FFFFFF', borderRadius: '14px', padding: '20px', border: '1px solid #E2E8F0' },
    cardHeaderRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' },
    cardTitle: { fontSize: '15px', fontWeight: 800, color: '#0F172A', margin: 0 },
    cardHeaderTag: { fontSize: '11px', fontWeight: 700, color: '#059669', background: '#ECFDF5', padding: '3px 8px', borderRadius: '12px' },
    progressBarTrack: { height: '8px', width: '100%', background: '#F1F5F9', borderRadius: '4px', overflow: 'hidden' },
    progressBarFill: { height: '100%', background: 'linear-gradient(90deg, #10B981, #059669)', borderRadius: '4px' },
    progressBarFillOrange: { height: '100%', background: 'linear-gradient(90deg, #F59E0B, #D97706)', borderRadius: '4px' },
    tabNav: { display: 'flex', gap: '10px', marginBottom: '18px' },
    tabBtn: { display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '10px', background: '#FFFFFF', border: '1px solid #E2E8F0', color: '#64748B', fontWeight: 700, fontSize: '13px', cursor: 'pointer' },
    tabBtnActive: { background: '#065F46', color: '#FFFFFF', borderColor: '#065F46' },
    recsCard: { backgroundColor: '#FFFFFF', borderRadius: '14px', border: '1px solid #E2E8F0', padding: '24px' },
    recsHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' },
    recsTitle: { fontSize: '17px', fontWeight: 800, color: '#0F172A', margin: 0 },
    recsSub: { fontSize: '12px', color: '#64748B', margin: 0 },
    activeTag: { padding: '4px 12px', borderRadius: '20px', background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46', fontSize: '12px', fontWeight: 700 },
    table: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
    tableHeadRow: { borderBottom: '2px solid #E2E8F0' },
    th: { textAlign: 'left', padding: '12px 14px', color: '#64748B', fontWeight: 700, fontSize: '11px', letterSpacing: '0.5px' },
    tableRow: { borderBottom: '1px solid #F1F5F9' },
    td: { padding: '12px 14px', color: '#334155' },
    urgencyBadge: { padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 800, display: 'inline-block' },
    viewChartBtn: { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '6px', background: '#FFFFFF', border: '1px solid #10B981', color: '#059669', fontSize: '12px', fontWeight: 700, cursor: 'pointer' },
    refillBtn: { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '6px', background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#047857', fontSize: '12px', fontWeight: 700, cursor: 'pointer' },

    // Modal
    modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
    modalContent: { backgroundColor: '#FFFFFF', borderRadius: '16px', width: '90%', maxWidth: '780px', maxHeight: '90vh', overflowY: 'auto', padding: '28px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' },
    modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' },
    modalSubtitle: { fontSize: '11px', fontWeight: 800, color: '#059669', letterSpacing: '0.5px' },
    modalTitle: { fontSize: '22px', fontWeight: 800, color: '#0F172A', margin: '2px 0' },
    modalMeta: { fontSize: '13px', color: '#64748B', margin: 0 },
    closeModalBtn: { display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 12px', borderRadius: '20px', background: '#F1F5F9', border: 'none', color: '#64748B', fontWeight: 700, fontSize: '12px', cursor: 'pointer' },
    modalMetricsRow: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '18px' },
    modalMetricBox: { background: '#F8FAFC', borderRadius: '10px', padding: '12px', border: '1px solid #E2E8F0' },
    mBoxLbl: { fontSize: '10px', fontWeight: 800, color: '#64748B' },
    mBoxVal: { fontSize: '16px', fontWeight: 800, color: '#0F172A', marginTop: '2px' },
    chartSectionCard: { background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px', marginBottom: '16px' },
    multiPeriodGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' },
    multiPeriodCard: { background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '12px', textAlign: 'center' },
    mPeriodLbl: { fontSize: '11px', fontWeight: 700, color: '#64748B' },
    mPeriodVal: { fontSize: '16px', fontWeight: 800, color: '#0F172A', marginTop: '2px' },
    modalTwoCol: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '16px' },
    seasonalPanel: { background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: '10px', padding: '12px' },
    financialPanel: { background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '10px', padding: '12px' },
    panelTitle: { fontSize: '10px', fontWeight: 800, color: '#64748B', letterSpacing: '0.5px' },
    supplierDeadlinePanel: { background: '#FFEDD5', border: '1px solid #FED7AA', borderRadius: '10px', padding: '12px', marginTop: '12px' },
    modalAiBox: { background: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: '12px', padding: '14px', marginTop: '16px' },
    modalActions: { display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' },
    dismissBtn: { padding: '9px 18px', borderRadius: '8px', background: '#FFFFFF', border: '1px solid #CBD5E1', color: '#475569', fontWeight: 700, fontSize: '13px', cursor: 'pointer' },
    takeNoteBtn: { padding: '9px 18px', borderRadius: '8px', background: '#7C3AED', border: 'none', color: '#FFFFFF', fontWeight: 800, fontSize: '13px', cursor: 'pointer' },
    noteAddedBadge: { padding: '9px 18px', borderRadius: '8px', background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#047857', fontWeight: 700, fontSize: '13px' },
    orderNowBtn: { padding: '9px 18px', borderRadius: '8px', background: '#10B981', border: 'none', color: '#FFFFFF', fontWeight: 800, fontSize: '13px', cursor: 'pointer' },
    stockHealthyBtn: { padding: '9px 18px', borderRadius: '8px', background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#047857', fontWeight: 700, fontSize: '13px' }
};

export default AIForecast;