import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import logoImage from '../../../assets/mediz.png';
import { 
    TrendingUp, 
    ArrowLeft, 
    LogOut, 
    DollarSign, 
    ShoppingBag, 
    Award, 
    Sparkles, 
    Pill,
    Calendar,
    BarChart3
} from 'lucide-react';

const Sales = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [viewMode, setViewMode] = useState('weekly');

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const getData = () => {
        const data = {
            daily: [
                { date: 'Mon', revenue: 14500, orders: 12 },
                { date: 'Tue', revenue: 19800, orders: 15 },
                { date: 'Wed', revenue: 16200, orders: 14 },
                { date: 'Thu', revenue: 24500, orders: 22 },
                { date: 'Fri', revenue: 31000, orders: 28 },
                { date: 'Sat', revenue: 26500, orders: 20 },
                { date: 'Sun', revenue: 15000, orders: 10 },
            ],
            weekly: [
                { date: 'Mon', revenue: 14500, orders: 12 },
                { date: 'Tue', revenue: 19800, orders: 15 },
                { date: 'Wed', revenue: 16200, orders: 14 },
                { date: 'Thu', revenue: 24500, orders: 22 },
                { date: 'Fri', revenue: 31000, orders: 28 },
                { date: 'Sat', revenue: 26500, orders: 20 },
                { date: 'Sun', revenue: 15000, orders: 10 },
            ],
            monthly: [
                { date: 'Week 1', revenue: 92000, orders: 68 },
                { date: 'Week 2', revenue: 105000, orders: 74 },
                { date: 'Week 3', revenue: 128000, orders: 89 },
                { date: 'Week 4', revenue: 98000, orders: 70 },
            ],
        };
        return data[viewMode] || data.weekly;
    };

    const currentData = getData();
    const totalRevenue = currentData.reduce((sum, d) => sum + d.revenue, 0);
    const totalOrders = currentData.reduce((sum, d) => sum + d.orders, 0);
    const averageOrder = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

    const formatCurrency = (amount) => `Rs. ${amount.toLocaleString()}`;

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
                                <h1 style={styles.logoTitle}>SALES & REVENUE ANALYTICS</h1>
                                <p style={styles.logoSubtitle}>Dispensary Turnover & POS Billing Metrics</p>
                            </div>
                        </div>
                    </div>

                    <div style={styles.headerActions}>
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
                {/* Stats Cards */}
                <div style={styles.statsGrid} className="animate-slide-up">
                    <div style={styles.statCard}>
                        <div style={{ ...styles.statIconWrap, background: '#ECFDF5', color: '#059669' }}>
                            <DollarSign size={24} />
                        </div>
                        <div>
                            <div style={styles.statNumber}>{formatCurrency(totalRevenue)}</div>
                            <div style={styles.statLabel}>Total Period Revenue</div>
                        </div>
                    </div>

                    <div style={styles.statCard}>
                        <div style={{ ...styles.statIconWrap, background: '#D1FAE5', color: '#047857' }}>
                            <ShoppingBag size={24} />
                        </div>
                        <div>
                            <div style={{ ...styles.statNumber, color: '#047857' }}>{totalOrders}</div>
                            <div style={styles.statLabel}>Completed Orders</div>
                        </div>
                    </div>

                    <div style={styles.statCard}>
                        <div style={{ ...styles.statIconWrap, background: '#CCFBF1', color: '#0D9488' }}>
                            <TrendingUp size={24} />
                        </div>
                        <div>
                            <div style={{ ...styles.statNumber, color: '#0D9488' }}>{formatCurrency(averageOrder)}</div>
                            <div style={styles.statLabel}>Average Order Value</div>
                        </div>
                    </div>
                </div>

                {/* View Mode Tabs */}
                <div style={styles.viewTabsCard}>
                    <div style={styles.tabsHeader}>
                        <div style={styles.tabsTitleWrap}>
                            <BarChart3 size={18} color="#059669" />
                            <span style={styles.tabsTitle}>Revenue Timeline</span>
                        </div>
                        <div style={styles.viewTabs}>
                            {['daily', 'weekly', 'monthly'].map((mode) => (
                                <button
                                    key={mode}
                                    style={{
                                        ...styles.viewBtn,
                                        ...(viewMode === mode ? styles.viewBtnActive : {}),
                                    }}
                                    onClick={() => setViewMode(mode)}
                                >
                                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Interactive Light-Green Bar Chart */}
                    <div style={styles.chartArea}>
                        <div style={styles.barChart}>
                            {currentData.map((item, index) => {
                                const maxRevenue = Math.max(...currentData.map(d => d.revenue), 1);
                                const heightPercent = (item.revenue / maxRevenue) * 100;
                                return (
                                    <div key={index} style={styles.barCol} className="hover-lift">
                                        <div style={styles.barValuePill}>{formatCurrency(item.revenue)}</div>
                                        <div style={styles.barTrack}>
                                            <div 
                                                style={{
                                                    ...styles.barFill,
                                                    height: `${Math.max(heightPercent, 8)}%`,
                                                }}
                                            />
                                        </div>
                                        <div style={styles.barDate}>{item.date}</div>
                                        <div style={styles.barOrders}>{item.orders} rx</div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Top Selling Medicines */}
                <div style={styles.topSellingCard}>
                    <div style={styles.topSellingHeader}>
                        <div style={styles.topSellingTitleWrap}>
                            <Award size={20} color="#059669" />
                            <h3 style={styles.topSellingTitle}>Top Dispensed Pharmaceuticals</h3>
                        </div>
                        <span style={styles.topSellingBadge}>High Velocity Items</span>
                    </div>

                    <div style={styles.topSellingGrid}>
                        {[
                            { name: 'Paracetamol 500mg', category: 'Analgesics', sales: 245, revenue: 13475 },
                            { name: 'Amoxicillin 250mg', category: 'Antibiotics', sales: 189, revenue: 22680 },
                            { name: 'Vitamin C 1000mg', category: 'Supplements', sales: 156, revenue: 23400 },
                            { name: 'Aspirin 75mg', category: 'Cardiovascular', sales: 134, revenue: 10720 },
                            { name: 'Ibuprofen 400mg', category: 'Anti-Inflammatory', sales: 112, revenue: 7840 },
                        ].map((item, index) => (
                            <div key={index} style={styles.medRankCard} className="hover-lift">
                                <div style={{
                                    ...styles.rankCircle,
                                    background: index === 0 ? '#10B981' : index === 1 ? '#059669' : '#047857',
                                }}>
                                    #{index + 1}
                                </div>
                                <div style={styles.rankInfo}>
                                    <h4 style={styles.rankMedName}>{item.name}</h4>
                                    <span style={styles.rankCat}>{item.category}</span>
                                    <div style={styles.rankStats}>
                                        <span style={styles.unitsSold}>{item.sales} units</span>
                                        <span style={styles.rankRev}>{formatCurrency(item.revenue)}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
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
        height: '38px',
        width: 'auto',
    },
    logoTitle: {
        fontSize: '16px',
        fontWeight: 800,
        color: '#064E3B',
        margin: 0,
        letterSpacing: '0.4px',
    },
    logoSubtitle: {
        fontSize: '11px',
        color: '#64748B',
        margin: 0,
    },
    headerActions: {
        display: 'flex',
        alignItems: 'center',
    },
    userSection: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
    },
    userName: {
        fontSize: '13px',
        fontWeight: 700,
        color: '#0F172A',
    },
    logoutBtn: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '8px',
        borderRadius: '8px',
        background: '#FEE2E2',
        border: '1px solid #FECACA',
        color: '#B91C1C',
        cursor: 'pointer',
    },
    mainContent: {
        maxWidth: '1440px',
        margin: '0 auto',
        padding: '30px 36px 60px',
    },
    statsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '20px',
        marginBottom: '26px',
    },
    statCard: {
        backgroundColor: '#FFFFFF',
        border: '1px solid #D1FAE5',
        borderRadius: '16px',
        padding: '22px',
        display: 'flex',
        alignItems: 'center',
        gap: '18px',
        boxShadow: '0 4px 14px rgba(16, 185, 129, 0.05)',
    },
    statIconWrap: {
        width: '52px',
        height: '52px',
        borderRadius: '14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    statNumber: {
        fontSize: '26px',
        fontWeight: 800,
        color: '#064E3B',
        margin: 0,
    },
    statLabel: {
        fontSize: '12.5px',
        color: '#64748B',
        fontWeight: 600,
        marginTop: '3px',
    },
    viewTabsCard: {
        backgroundColor: '#FFFFFF',
        border: '1px solid #D1FAE5',
        borderRadius: '20px',
        padding: '26px 30px',
        marginBottom: '26px',
        boxShadow: '0 4px 16px rgba(16, 185, 129, 0.05)',
    },
    tabsHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '12px',
    },
    tabsTitleWrap: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
    },
    tabsTitle: {
        fontSize: '17px',
        fontWeight: 800,
        color: '#064E3B',
    },
    viewTabs: {
        display: 'flex',
        gap: '6px',
        background: '#F1F8F5',
        padding: '4px',
        borderRadius: '10px',
    },
    viewBtn: {
        padding: '6px 16px',
        borderRadius: '8px',
        border: 'none',
        background: 'transparent',
        color: '#64748B',
        fontSize: '13px',
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    viewBtnActive: {
        background: '#FFFFFF',
        color: '#065F46',
        fontWeight: 700,
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.08)',
    },
    chartArea: {
        paddingTop: '20px',
    },
    barChart: {
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'flex-end',
        height: '240px',
        gap: '16px',
        borderBottom: '1.5px solid #E2E8F0',
        paddingBottom: '8px',
    },
    barCol: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        flex: 1,
        height: '100%',
        justifyContent: 'flex-end',
    },
    barValuePill: {
        fontSize: '11px',
        color: '#065F46',
        fontWeight: 700,
        marginBottom: '6px',
        whiteSpace: 'nowrap',
    },
    barTrack: {
        height: '160px',
        width: '100%',
        maxWidth: '48px',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        backgroundColor: '#F0FDF4',
        borderRadius: '8px 8px 0 0',
    },
    barFill: {
        width: '100%',
        borderRadius: '8px 8px 0 0',
        background: 'linear-gradient(180deg, #34D399 0%, #059669 100%)',
        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
        transition: 'height 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
    },
    barDate: {
        fontSize: '12px',
        fontWeight: 700,
        color: '#0F172A',
        marginTop: '8px',
    },
    barOrders: {
        fontSize: '11px',
        color: '#64748B',
        fontWeight: 500,
    },
    topSellingCard: {
        backgroundColor: '#FFFFFF',
        border: '1px solid #D1FAE5',
        borderRadius: '20px',
        padding: '26px 30px',
        boxShadow: '0 4px 16px rgba(16, 185, 129, 0.05)',
    },
    topSellingHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
    },
    topSellingTitleWrap: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
    },
    topSellingTitle: {
        fontSize: '17px',
        fontWeight: 800,
        color: '#064E3B',
        margin: 0,
    },
    topSellingBadge: {
        background: '#ECFDF5',
        color: '#065F46',
        padding: '4px 12px',
        borderRadius: '999px',
        fontSize: '11.5px',
        fontWeight: 700,
        border: '1px solid #A7F3D0',
    },
    topSellingGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '16px',
    },
    medRankCard: {
        background: '#F6FAF7',
        border: '1px solid #D1FAE5',
        borderRadius: '14px',
        padding: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
    },
    rankCircle: {
        width: '36px',
        height: '36px',
        borderRadius: '10px',
        color: '#FFFFFF',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 800,
        fontSize: '14px',
        flexShrink: 0,
    },
    rankInfo: {
        flex: 1,
    },
    rankMedName: {
        fontSize: '13.5px',
        fontWeight: 700,
        color: '#0F172A',
        margin: '0 0 2px 0',
    },
    rankCat: {
        fontSize: '11.5px',
        color: '#64748B',
        display: 'block',
        marginBottom: '6px',
    },
    rankStats: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    unitsSold: {
        fontSize: '11.5px',
        color: '#64748B',
        fontWeight: 600,
    },
    rankRev: {
        fontSize: '13px',
        fontWeight: 800,
        color: '#059669',
    },
};

export default Sales;