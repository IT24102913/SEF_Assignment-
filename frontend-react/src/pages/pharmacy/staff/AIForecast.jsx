import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { api } from '../../../api/authApi';
import forecastImg from '../../../assets/analytics_forecast.jpg';
import logoImage from '../../../assets/mediz.png';
import {
    Brain,
    Sparkles,
    ArrowLeft,
    LogOut,
    TrendingUp,
    AlertTriangle,
    CheckCircle2,
    Calendar,
    RefreshCw,
    Zap,
    Layers,
    Activity,
    Package,
    DollarSign,
    Clock,
    BarChart3
} from 'lucide-react';

const AIForecast = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState('stockout'); // 'stockout' | 'expiry' | 'sales'
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // AI Forecast state populated with system data
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
        highDemandCategories: []
    });

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    useEffect(() => {
        loadForecastData();
    }, []);

    const loadForecastData = async () => {
        setLoading(true);
        try {
            // 1. Try server API endpoint
            let serverData = null;
            try {
                const res = await api.get('/AIForecast');
                if (res.data) serverData = res.data;
            } catch (err) {
                console.warn('[AIForecast] Server endpoint unavailable, calculating locally:', err);
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
                    highDemandCategories: serverData.highDemandCategories || []
                });
                setLoading(false);
                return;
            }

            // 2. Client-side fallback computation using actual medicines & orders
            let medicines = [];
            try {
                const medRes = await api.get('/Medicines');
                medicines = medRes.data || [];
            } catch (e) { }

            if (!medicines.length) {
                try {
                    medicines = JSON.parse(localStorage.getItem('medix_medicines') || '[]');
                } catch (e) { }
            }

            let orders = [];
            try {
                const ordRes = await api.get('/PharmacyOrders');
                orders = ordRes.data || [];
            } catch (e) { }

            if (!orders.length) {
                try {
                    orders = JSON.parse(localStorage.getItem('medix_pharmacy_orders') || '[]');
                } catch (e) { }
            }

            computeClientForecast(medicines, orders);
        } catch (err) {
            console.error('[AIForecast] Error loading forecast:', err);
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

        // Calculate Units Sold and Category Sales
        const unitsSoldMap = {};
        const categorySalesMap = {};
        let totalRevenue = 0;

        for (const order of fulfilledOrders) {
            const orderAmount = Number(order.totalAmount) || 0;
            totalRevenue += orderAmount;

            const items = order.items || [];
            for (const item of items) {
                const medName = (item.medicineName || item.name || '').trim().toLowerCase();
                const medId = item.medicineId || item.id;
                const qty = Number(item.quantity) || 1;
                const subtotal = Number(item.subtotal || (item.unitPrice ? item.unitPrice * qty : 0)) || 0;

                if (medId) unitsSoldMap[medId] = (unitsSoldMap[medId] || 0) + qty;
                if (medName) unitsSoldMap[medName] = (unitsSoldMap[medName] || 0) + qty;

                const cat = (item.categoryName || item.category || 'General Pharmacy').trim();
                if (!categorySalesMap[cat]) {
                    categorySalesMap[cat] = { categoryName: cat, unitsSold: 0, revenue: 0 };
                }
                categorySalesMap[cat].unitsSold += qty;
                categorySalesMap[cat].revenue += subtotal;
            }
        }

        // A. Stockout Predictions
        const stockoutPredictions = medicinesList.map(med => {
            const medName = med.name || med.medicineName || 'Unknown Medicine';
            const medId = med.id;
            const currentStock = typeof med.stockQuantity === 'number' ? Math.max(0, med.stockQuantity) : (med.stock || 0);

            const totalSold = (unitsSoldMap[medId] || unitsSoldMap[medName.trim().toLowerCase()] || 0);
            const averageDailySales = periodDays > 0 ? parseFloat((totalSold / periodDays).toFixed(2)) : 0;

            let daysUntilEmpty = null;
            let status = 'HEALTHY';
            let forecastNote = '';

            if (totalSold === 0 || averageDailySales === 0) {
                daysUntilEmpty = null;
                status = 'HEALTHY';
                forecastNote = 'Insufficient data for reliable forecast';
            } else {
                daysUntilEmpty = Math.floor(currentStock / averageDailySales);
                if (daysUntilEmpty <= 7) status = 'CRITICAL';
                else if (daysUntilEmpty <= 30) status = 'LOW';
                else status = 'HEALTHY';
                forecastNote = `${daysUntilEmpty} days of stock remaining`;
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

        // B. Expiry Risks
        const expiryRisks = medicinesList.map(med => {
            const stockQuantity = typeof med.stockQuantity === 'number' ? med.stockQuantity : (med.stock || 0);
            const expStr = med.expiryDate || med.expiry;

            if (!expStr) {
                return {
                    medicineId: med.id,
                    medicineName: med.name || 'Unknown Medicine',
                    stockQuantity,
                    expiryDate: 'N/A',
                    daysRemaining: 999,
                    riskLevel: 'Normal'
                };
            }

            const expDate = new Date(expStr);
            const diffTime = expDate.getTime() - now.getTime();
            const daysRemaining = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));

            let riskLevel = 'Normal';
            if (daysRemaining <= 30) riskLevel = 'Critical';
            else if (daysRemaining <= 60) riskLevel = 'Warning';

            return {
                medicineId: med.id,
                medicineName: med.name || 'Unknown Medicine',
                categoryName: med.categoryName || med.category?.name || 'General',
                stockQuantity,
                expiryDate: expDate.toISOString().split('T')[0],
                daysRemaining,
                riskLevel
            };
        })
            .sort((a, b) => {
                const weightA = a.riskLevel === 'Critical' ? 3 : a.riskLevel === 'Warning' ? 2 : 1;
                const weightB = b.riskLevel === 'Critical' ? 3 : b.riskLevel === 'Warning' ? 2 : 1;
                if (weightB !== weightA) return weightB - weightA;
                if (a.daysRemaining !== b.daysRemaining) return a.daysRemaining - b.daysRemaining;
                return b.stockQuantity - a.stockQuantity;
            });

        // C. Sales Forecast & High Demand Categories
        const dailyRevenue = totalRevenue / periodDays;
        const projectedMonthlyRevenue = Math.round(dailyRevenue * 30);

        const highDemandCategories = Object.values(categorySalesMap)
            .sort((a, b) => b.unitsSold - a.unitsSold);

        const criticalStockCount = stockoutPredictions.filter(s => s.status === 'CRITICAL').length;
        const expiryRiskCount = expiryRisks.filter(e => e.riskLevel === 'Critical').length;

        setForecastData({
            summary: {
                projectedMonthlyRevenue,
                projectedMonthlyRevenueLabel: `Rs. ${projectedMonthlyRevenue.toLocaleString()}`,
                criticalStockCount,
                expiryRiskCount,
                topCategory: highDemandCategories[0]?.categoryName || 'General Pharmacy',
                hasSufficientData: fulfilledOrders.length > 0 || totalRevenue > 0
            },
            stockoutPredictions,
            expiryRisks,
            highDemandCategories
        });
    };

    const handleRunAnalysis = () => {
        setIsRefreshing(true);
        loadForecastData();
    };

    return (
        <div style={styles.container}>
            {/* Header */}
            <header style={styles.header}>
                <div style={styles.headerTop}>
                    <div style={styles.leftNav}>
                        <button onClick={() => navigate('/admin/pharmacy')} style={styles.backBtn}>
                            <ArrowLeft size={16} /> Pharmacy Suite
                        </button>
                        <div style={styles.logo} onClick={() => navigate('/admin/pharmacy')}>
                            <img src={logoImage} alt="Health Bridge" style={styles.logoImg} />
                            <div>
                                <h1 style={styles.logoTitle}>AI DEMAND FORECASTING</h1>
                                <p style={styles.logoSubtitle}>Predictive Inventory & Sales Forecasting Agent</p>
                            </div>
                        </div>
                    </div>

                    <div style={styles.headerActions}>
                        <div style={styles.statusPill}>
                            <span className="pulsing-dot" />
                            <span>AI Forecasting Agent Active</span>
                        </div>
                        <div style={styles.userSection}>
                            <span style={styles.userName}>{user?.fullName || 'Pharmacist'}</span>
                            <button onClick={handleLogout} style={styles.logoutBtn} title="Sign Out">
                                <LogOut size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main style={styles.mainContent}>
                {/* Hero Card */}
                <div style={styles.heroCard} className="animate-slide-up">
                    <div style={styles.heroTextSide}>
                        <div style={styles.heroTag}>
                            <Sparkles size={13} color="#A7F3D0" />
                            <span>Inventory &amp; Sales Forecasting Engine</span>
                        </div>
                        <h2 style={styles.heroTitle}>AI Inventory &amp; Sales Forecasting Agent</h2>
                        <p style={styles.heroSub}>
                            Real-time stockout risk predictions, expiry date alerts, and projected revenue analysis calculated using active inventory and sales history.
                        </p>
                        <div style={styles.heroActions}>
                            <button
                                onClick={handleRunAnalysis}
                                style={styles.runAnalysisBtn}
                                disabled={isRefreshing || loading}
                            >
                                <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
                                {isRefreshing ? 'Re-calculating Forecasts...' : 'Recalculate AI Predictions'}
                            </button>
                            <span style={styles.accuracyPill}>
                                <Zap size={14} color="#10B981" />
                                Real-Time Data Forecast
                            </span>
                        </div>
                    </div>

                    <div style={styles.heroImgWrap}>
                        <img src={forecastImg} alt="AI Forecast Visualization" style={styles.forecastImg} />
                    </div>
                </div>

                {/* Top Summary Metrics Grid */}
                <div style={styles.metricsGrid}>
                    <div style={styles.metricCard}>
                        <div style={{ ...styles.metricIconWrap, background: '#ECFDF5', color: '#059669' }}>
                            <DollarSign size={22} />
                        </div>
                        <div>
                            <div style={{ ...styles.metricVal, color: '#059669' }}>
                                {forecastData.summary.hasSufficientData ? forecastData.summary.projectedMonthlyRevenueLabel : 'Rs. 0'}
                            </div>
                            <div style={styles.metricLbl}>Projected Revenue (Monthly)</div>
                        </div>
                    </div>

                    <div style={styles.metricCard}>
                        <div style={{ ...styles.metricIconWrap, background: '#FEF3C7', color: '#D97706' }}>
                            <AlertTriangle size={22} />
                        </div>
                        <div>
                            <div style={{ ...styles.metricVal, color: '#D97706' }}>
                                {forecastData.summary.criticalStockCount} Items
                            </div>
                            <div style={styles.metricLbl}>Critical Stock Alerts (&le;7 days)</div>
                        </div>
                    </div>

                    <div style={styles.metricCard}>
                        <div style={{ ...styles.metricIconWrap, background: '#FEE2E2', color: '#DC2626' }}>
                            <Clock size={22} />
                        </div>
                        <div>
                            <div style={{ ...styles.metricVal, color: '#DC2626' }}>
                                {forecastData.summary.expiryRiskCount} Items
                            </div>
                            <div style={styles.metricLbl}>Expiry Risk (&le;30 days)</div>
                        </div>
                    </div>

                    <div style={styles.metricCard}>
                        <div style={{ ...styles.metricIconWrap, background: '#CCFBF1', color: '#0D9488' }}>
                            <BarChart3 size={22} />
                        </div>
                        <div>
                            <div style={{ ...styles.metricVal, color: '#0D9488' }}>
                                {forecastData.summary.topCategory}
                            </div>
                            <div style={styles.metricLbl}>Highest Demand Category</div>
                        </div>
                    </div>
                </div>

                {/* Dashboard Navigation Tabs */}
                <div style={styles.tabNav}>
                    <button
                        onClick={() => setActiveTab('stockout')}
                        style={{ ...styles.tabBtn, ...(activeTab === 'stockout' ? styles.tabBtnActive : {}) }}
                    >
                        <AlertTriangle size={15} /> Stockout Predictions &amp; Low Stock Alerts
                    </button>
                    <button
                        onClick={() => setActiveTab('expiry')}
                        style={{ ...styles.tabBtn, ...(activeTab === 'expiry' ? styles.tabBtnActive : {}) }}
                    >
                        <Clock size={15} /> Expiry Risk Analysis
                    </button>
                    <button
                        onClick={() => setActiveTab('sales')}
                        style={{ ...styles.tabBtn, ...(activeTab === 'sales' ? styles.tabBtnActive : {}) }}
                    >
                        <TrendingUp size={15} /> Sales Forecast &amp; Demand Trends
                    </button>
                </div>

                {/* SECTION 1: Stockout Predictions */}
                {activeTab === 'stockout' && (
                    <div style={styles.recsCard}>
                        <div style={styles.recsHeader}>
                            <div>
                                <h3 style={styles.recsTitle}>Stockout Risk &amp; Low Stock Predictions</h3>
                                <p style={styles.recsSub}>Predicted days until depletion based on average daily sales burn rate</p>
                            </div>
                            <span style={styles.activeTag}>Stockout Radar</span>
                        </div>

                        {loading ? (
                            <div style={{ padding: '30px', textAlign: 'center', color: '#64748B' }}>Loading stockout predictions...</div>
                        ) : forecastData.stockoutPredictions.length === 0 ? (
                            <div style={{ padding: '30px', textAlign: 'center', color: '#64748B' }}>No medicine stock data available.</div>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={styles.table}>
                                    <thead>
                                        <tr style={styles.tableHeadRow}>
                                            <th style={styles.th}>Medicine Name</th>
                                            <th style={styles.th}>Category</th>
                                            <th style={styles.th}>Current Stock</th>
                                            <th style={styles.th}>Avg. Daily Sales</th>
                                            <th style={styles.th}>Days Until Empty</th>
                                            <th style={styles.th}>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {forecastData.stockoutPredictions.map((pred, i) => {
                                            let badgeBg = '#ECFDF5';
                                            let badgeColor = '#047857';
                                            if (pred.status === 'CRITICAL') {
                                                badgeBg = '#FEE2E2';
                                                badgeColor = '#B91C1C';
                                            } else if (pred.status === 'LOW') {
                                                badgeBg = '#FEF3C7';
                                                badgeColor = '#B45309';
                                            }

                                            return (
                                                <tr key={i} style={styles.tableRow}>
                                                    <td style={{ ...styles.td, fontWeight: 700, color: '#0F172A' }}>{pred.medicineName}</td>
                                                    <td style={styles.td}>{pred.categoryName}</td>
                                                    <td style={{ ...styles.td, fontWeight: 700 }}>{pred.currentStock} units</td>
                                                    <td style={styles.td}>{pred.averageDailySales} units/day</td>
                                                    <td style={{ ...styles.td, fontWeight: 700 }}>
                                                        {pred.daysUntilEmpty !== null ? `${pred.daysUntilEmpty} Days` : <span style={{ color: '#94A3B8', fontStyle: 'italic' }}>Insufficient data for reliable forecast</span>}
                                                    </td>
                                                    <td style={styles.td}>
                                                        <span style={{ ...styles.urgencyBadge, backgroundColor: badgeBg, color: badgeColor }}>
                                                            {pred.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* SECTION 2: Expiry Risk Analysis */}
                {activeTab === 'expiry' && (
                    <div style={styles.recsCard}>
                        <div style={styles.recsHeader}>
                            <div>
                                <h3 style={styles.recsTitle}>Medicine Expiry Risk Analysis</h3>
                                <p style={styles.recsSub}>Identifies medications near expiration date to prevent waste and ensure safety</p>
                            </div>
                            <span style={styles.activeTag}>Expiry Monitor</span>
                        </div>

                        {loading ? (
                            <div style={{ padding: '30px', textAlign: 'center', color: '#64748B' }}>Loading expiry risks...</div>
                        ) : forecastData.expiryRisks.length === 0 ? (
                            <div style={{ padding: '30px', textAlign: 'center', color: '#64748B' }}>No expiry records found.</div>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={styles.table}>
                                    <thead>
                                        <tr style={styles.tableHeadRow}>
                                            <th style={styles.th}>Medicine Name</th>
                                            <th style={styles.th}>Category</th>
                                            <th style={styles.th}>Stock Quantity</th>
                                            <th style={styles.th}>Expiry Date</th>
                                            <th style={styles.th}>Days Remaining</th>
                                            <th style={styles.th}>Risk Level</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {forecastData.expiryRisks.map((item, i) => {
                                            let badgeBg = '#ECFDF5';
                                            let badgeColor = '#047857';
                                            if (item.riskLevel === 'Critical') {
                                                badgeBg = '#FEE2E2';
                                                badgeColor = '#B91C1C';
                                            } else if (item.riskLevel === 'Warning') {
                                                badgeBg = '#FEF3C7';
                                                badgeColor = '#B45309';
                                            }

                                            return (
                                                <tr key={i} style={styles.tableRow}>
                                                    <td style={{ ...styles.td, fontWeight: 700, color: '#0F172A' }}>{item.medicineName}</td>
                                                    <td style={styles.td}>{item.categoryName}</td>
                                                    <td style={{ ...styles.td, fontWeight: 700 }}>{item.stockQuantity} units</td>
                                                    <td style={styles.td}>{item.expiryDate}</td>
                                                    <td style={{ ...styles.td, fontWeight: 700 }}>
                                                        {item.daysRemaining < 900 ? `${item.daysRemaining} Days` : 'N/A'}
                                                    </td>
                                                    <td style={styles.td}>
                                                        <span style={{ ...styles.urgencyBadge, backgroundColor: badgeBg, color: badgeColor }}>
                                                            {item.riskLevel}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* SECTION 3: Sales Forecast & High-Demand Categories */}
                {activeTab === 'sales' && (
                    <div style={styles.recsCard}>
                        <div style={styles.recsHeader}>
                            <div>
                                <h3 style={styles.recsTitle}>Sales Forecast &amp; Demand Projections</h3>
                                <p style={styles.recsSub}>Projected monthly revenue and highest-demand category breakdown</p>
                            </div>
                            <span style={styles.activeTag}>Sales Projections</span>
                        </div>

                        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', padding: '18px 24px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#065F46' }}>Projected Revenue</div>
                                    <div style={{ fontSize: '24px', fontWeight: 900, color: '#047857', marginTop: '4px' }}>
                                        {forecastData.summary.hasSufficientData ? forecastData.summary.projectedMonthlyRevenueLabel : 'Rs. 0'}
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#047857', marginTop: '2px' }}>
                                        Calculated based on active sales velocity over the past 30 days
                                    </div>
                                </div>
                                <TrendingUp size={40} color="#059669" />
                            </div>

                            <div style={{ marginTop: '10px' }}>
                                <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', marginBottom: '12px' }}>High-Demand Categories</h4>
                                {forecastData.highDemandCategories.length === 0 ? (
                                    <div style={{ fontSize: '13px', color: '#64748B' }}>Insufficient sales data for category analysis.</div>
                                ) : (
                                    <table style={styles.table}>
                                        <thead>
                                            <tr style={styles.tableHeadRow}>
                                                <th style={styles.th}>Category Name</th>
                                                <th style={styles.th}>Total Units Sold</th>
                                                <th style={styles.th}>Generated Revenue</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {forecastData.highDemandCategories.map((cat, idx) => (
                                                <tr key={idx} style={styles.tableRow}>
                                                    <td style={{ ...styles.td, fontWeight: 700, color: '#0F172A' }}>{cat.categoryName}</td>
                                                    <td style={{ ...styles.td, fontWeight: 700, color: '#059669' }}>{cat.unitsSold} units</td>
                                                    <td style={{ ...styles.td, fontWeight: 700 }}>Rs. {cat.revenue.toLocaleString()}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

const styles = {
    container: {
        minHeight: '100vh',
        backgroundColor: '#F6FAF7',
        fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
    },
    header: {
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #D1FAE5',
        boxShadow: '0 2px 8px rgba(16, 185, 129, 0.05)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
    },
    headerTop: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '14px 36px',
        maxWidth: '1440px',
        margin: '0 auto',
    },
    leftNav: {
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
    },
    backBtn: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '8px 14px',
        borderRadius: '8px',
        background: '#ECFDF5',
        border: '1px solid #A7F3D0',
        color: '#065F46',
        fontSize: '12.5px',
        fontWeight: 700,
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    logo: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        cursor: 'pointer',
    },
    logoImg: {
        height: '36px',
        width: 'auto',
    },
    logoTitle: {
        fontSize: '15px',
        fontWeight: 800,
        color: '#065F46',
        letterSpacing: '0.5px',
        margin: 0,
    },
    logoSubtitle: {
        fontSize: '11px',
        color: '#10B981',
        margin: 0,
        fontWeight: 600,
    },
    headerActions: {
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
    },
    statusPill: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '6px 12px',
        borderRadius: '20px',
        background: '#ECFDF5',
        border: '1px solid #A7F3D0',
        color: '#065F46',
        fontSize: '12px',
        fontWeight: 700,
    },
    userSection: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        borderLeft: '1px solid #E2E8F0',
        paddingLeft: '16px',
    },
    userName: {
        fontSize: '13px',
        fontWeight: 700,
        color: '#1E293B',
    },
    logoutBtn: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '8px',
        borderRadius: '8px',
        border: 'none',
        background: '#FEF2F2',
        color: '#EF4444',
        cursor: 'pointer',
    },
    mainContent: {
        maxWidth: '1440px',
        margin: '0 auto',
        padding: '24px 36px',
    },
    heroCard: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #064E3B 0%, #047857 100%)',
        borderRadius: '16px',
        padding: '32px 40px',
        color: '#FFFFFF',
        marginBottom: '24px',
        boxShadow: '0 10px 25px -5px rgba(4, 120, 87, 0.25)',
    },
    heroTextSide: {
        maxWidth: '640px',
    },
    heroTag: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 12px',
        borderRadius: '20px',
        background: 'rgba(255, 255, 255, 0.15)',
        backdropFilter: 'blur(4px)',
        fontSize: '12px',
        fontWeight: 700,
        color: '#A7F3D0',
        marginBottom: '12px',
    },
    heroTitle: {
        fontSize: '26px',
        fontWeight: 800,
        margin: '0 0 10px 0',
        lineHeight: 1.2,
    },
    heroSub: {
        fontSize: '14px',
        color: '#D1FAE5',
        margin: '0 0 20px 0',
        lineHeight: 1.5,
    },
    heroActions: {
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
    },
    runAnalysisBtn: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 18px',
        borderRadius: '10px',
        background: '#10B981',
        border: 'none',
        color: '#FFFFFF',
        fontWeight: 700,
        fontSize: '13.5px',
        cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
    },
    accuracyPill: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '8px 14px',
        borderRadius: '8px',
        background: 'rgba(255, 255, 255, 0.1)',
        fontSize: '13px',
        fontWeight: 700,
        color: '#FFFFFF',
    },
    heroImgWrap: {
        width: '260px',
        height: '160px',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 8px 20px rgba(0,0,0,0.2)',
    },
    forecastImg: {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
    },
    metricsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '20px',
        marginBottom: '24px',
    },
    metricCard: {
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        backgroundColor: '#FFFFFF',
        padding: '20px',
        borderRadius: '12px',
        border: '1px solid #E2E8F0',
        boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
    },
    metricIconWrap: {
        width: '48px',
        height: '48px',
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    metricVal: {
        fontSize: '20px',
        fontWeight: 800,
        color: '#0F172A',
    },
    metricLbl: {
        fontSize: '12px',
        color: '#64748B',
        marginTop: '2px',
        fontWeight: 600,
    },
    tabNav: {
        display: 'flex',
        gap: '12px',
        marginBottom: '20px',
    },
    tabBtn: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 18px',
        borderRadius: '10px',
        background: '#FFFFFF',
        border: '1px solid #CBD5E1',
        color: '#475569',
        fontWeight: 700,
        fontSize: '13px',
        cursor: 'pointer',
    },
    tabBtnActive: {
        background: '#059669',
        borderColor: '#059669',
        color: '#FFFFFF',
    },
    recsCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: '14px',
        border: '1px solid #E2E8F0',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
        overflow: 'hidden',
    },
    recsHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '20px 24px',
        borderBottom: '1px solid #E2E8F0',
    },
    recsTitle: {
        fontSize: '16px',
        fontWeight: 800,
        color: '#0F172A',
        margin: 0,
    },
    recsSub: {
        fontSize: '12.5px',
        color: '#64748B',
        margin: '2px 0 0 0',
    },
    activeTag: {
        padding: '4px 10px',
        borderRadius: '6px',
        background: '#ECFDF5',
        color: '#047857',
        fontSize: '11.5px',
        fontWeight: 700,
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse',
    },
    tableHeadRow: {
        background: '#F8FAFC',
        borderBottom: '1px solid #E2E8F0',
    },
    th: {
        padding: '12px 18px',
        textAlign: 'left',
        fontSize: '12px',
        fontWeight: 800,
        color: '#475569',
        textTransform: 'uppercase',
    },
    tableRow: {
        borderBottom: '1px solid #F1F5F9',
    },
    td: {
        padding: '14px 18px',
        fontSize: '13px',
        color: '#334155',
    },
    urgencyBadge: {
        display: 'inline-block',
        padding: '3px 10px',
        borderRadius: '6px',
        fontWeight: 800,
        fontSize: '11.5px',
    },
};

export default AIForecast;