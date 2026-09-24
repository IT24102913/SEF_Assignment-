import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import pharmacyBanner from '../../../assets/phar.jpg';
import logoImage from '../../../assets/mediz.png';
import {
    Pill,
    FolderTree,
    Package,
    TrendingUp,
    Brain,
    ArrowRight,
    ArrowLeft,
    LogOut,
    Sparkles,
    CheckCircle2
} from 'lucide-react';

const PharmacyDashboard = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [hoveredCard, setHoveredCard] = useState(null);

    const modules = [
        {
            id: 'medicines',
            icon: Pill,
            title: 'Medicine Catalog',
            description: 'Manage pharmaceuticals, active ingredients, dosages, and prescription prerequisites.',
            color: '#10B981',
            badge: 'Active Formulary',
            path: '/pharmacist/medicines',
        },
        {
            id: 'categories',
            icon: FolderTree,
            title: 'Category Taxonomy',
            description: 'Group medication by therapeutic classes, antibiotics, analgesics, and dietary supplements.',
            color: '#059669',
            badge: 'Class Management',
            path: '/pharmacist/categories',
        },
        {
            id: 'stock',
            icon: Package,
            title: 'Inventory & Stock Control',
            description: 'Real-time warehouse stock tracking, batch expiry auditing, and replenishment workflows.',
            color: '#0D9488',
            badge: 'Live Stock Levels',
            path: '/pharmacist/inventory',
        },
        {
            id: 'sales',
            icon: TrendingUp,
            title: 'Sales & Dispensing POS',
            description: 'Point of sale transactions, revenue reports, daily pharmacy turnover, and billing logs.',
            color: '#14B8A6',
            badge: 'Revenue Tracker',
            path: '/pharmacist/sales',
        },
        {
            id: 'orders',
            icon: CheckCircle2,
            title: 'Prescription & Orders Audit',
            description: 'Verify patient uploaded prescriptions, quote prices, write pharmacist notes, and approve orders.',
            color: '#0284C7',
            badge: 'Prescription Approvals',
            path: '/pharmacist/orders',
        },
        {
            id: 'ai',
            icon: Brain,
            title: 'AI Demand Forecast',
            description: 'Predict seasonal demand surges, stockout risks, and intelligent order recommendations.',
            color: '#047857',
            badge: 'Predictive Neural Model',
            path: '/pharmacist/ai-forecast',
        },
    ];

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div style={styles.container}>
            {/* Header */}
            <header style={styles.header}>
                <div style={styles.headerTop}>
                    <div style={styles.leftNav}>
                        <button
                            onClick={() => navigate('/admin/dashboard')}
                            style={styles.backBtn}
                            title="Return to Main Admin Dashboard"
                        >
                            <ArrowLeft size={16} /> Main Dashboard
                        </button>
                        <div style={styles.logo} onClick={() => navigate('/admin/pharmacy')}>
                            <img src={logoImage} alt="Health Bridge" style={styles.logoImg} />
                            <div>
                                <h1 style={styles.logoTitle}>HEALTH BRIDGE PHARMACY</h1>
                                <p style={styles.logoSubtitle}>Dispensary & Inventory Management</p>
                            </div>
                        </div>
                    </div>

                    <div style={styles.headerActions}>
                        <div style={styles.statusPill}>
                            <Sparkles size={13} color="#10B981" />
                            <span>AI Stock Prediction Active</span>
                        </div>
                        <div style={styles.userSection}>
                            <div style={styles.userAvatar}>
                                {user?.fullName ? user.fullName[0].toUpperCase() : 'P'}
                            </div>
                            <div>
                                <span style={styles.userName}>{user?.fullName || 'Pharmacist'}</span>
                                <span style={styles.userRole}>{user?.role || 'Staff'}</span>
                            </div>
                            <button onClick={handleLogout} style={styles.logoutBtn} title="Sign Out">
                                <LogOut size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <div style={styles.heroWrapper} className="animate-slide-up">
                <img
                    src={pharmacyBanner}
                    alt="Pharmacy Dispensary"
                    style={styles.heroBackground}
                />
                <div style={styles.heroOverlay}>
                    <div style={styles.heroContent}>
                        <div style={styles.heroTag}>
                            <Pill size={14} color="#A7F3D0" />
                            <span>Pharmacy Enterprise Suite</span>
                        </div>
                        <h1 style={styles.heroTitle}>Smart Dispensary & Medication Hub</h1>
                        <p style={styles.heroSubtitle}>
                            Track inventory stock, manage medicine categories, process rapid point-of-sale dispensing, and leverage AI forecasting to prevent drug shortages.
                        </p>

                        <div style={styles.quickActionsRow}>
                            <button
                                onClick={() => navigate('/pharmacist/medicines')}
                                style={styles.primaryActionBtn}
                            >
                                <Pill size={16} />
                                View Medicines
                            </button>
                            <button
                                onClick={() => navigate('/pharmacist/ai-forecast')}
                                style={styles.secondaryActionBtn}
                            >
                                <Brain size={16} />
                                AI Demand Forecast
                            </button>
                            <button
                                onClick={() => navigate('/pharmacist/sales')}
                                style={styles.ghostActionBtn}
                            >
                                <TrendingUp size={16} />
                                Sales Records
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modules Grid */}
            <div style={styles.modulesSection}>
                <div style={styles.sectionHeader}>
                    <div>
                        <h2 style={styles.sectionTitle}>Pharmacy Operation Modules</h2>
                        <p style={styles.sectionSubtitle}>Select a workflow to oversee clinical distribution</p>
                    </div>
                    <span style={styles.activePill}>{modules.length} Workspaces Ready</span>
                </div>

                <div style={styles.grid}>
                    {modules.map((module, i) => {
                        const Icon = module.icon;
                        const isHovered = hoveredCard === module.id;
                        return (
                            <div
                                key={module.id}
                                style={{
                                    ...styles.card,
                                    borderColor: isHovered ? '#10B981' : '#E2E8F0',
                                    transform: isHovered ? 'translateY(-6px)' : 'translateY(0)',
                                    boxShadow: isHovered
                                        ? '0 16px 36px -8px rgba(16, 185, 129, 0.22)'
                                        : '0 4px 14px rgba(16, 185, 129, 0.05)',
                                    animationDelay: `${i * 80}ms`,
                                }}
                                className="animate-scale-up"
                                onMouseEnter={() => setHoveredCard(module.id)}
                                onMouseLeave={() => setHoveredCard(null)}
                                onClick={() => navigate(module.path)}
                            >
                                <div style={styles.cardHeader}>
                                    <div
                                        style={{
                                            ...styles.iconContainer,
                                            backgroundColor: `${module.color}15`,
                                            color: module.color,
                                        }}
                                    >
                                        <Icon size={24} />
                                    </div>
                                    <span style={{ ...styles.cardBadge, color: module.color, borderColor: `${module.color}35` }}>
                                        {module.badge}
                                    </span>
                                </div>

                                <div>
                                    <h3 style={styles.cardTitle}>{module.title}</h3>
                                    <p style={styles.cardDescription}>{module.description}</p>
                                </div>

                                <div style={styles.cardFooter}>
                                    <span style={{ ...styles.accessLink, color: module.color }}>
                                        Manage Module
                                        <ArrowRight size={16} />
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Footer */}
            <footer style={styles.footer}>
                <div style={styles.footerInner}>
                    <p style={styles.footerText}>© 2026 Health Bridge (Pvt) Ltd. Pharmacy Dispensary System.</p>
                    <div style={styles.footerBadges}>
                        <span style={styles.footerTag}>Automated AI Inventory</span>
                        <span style={styles.footerTag}>Good Pharmacy Practice (GPP)</span>
                    </div>
                </div>
            </footer>
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
        boxShadow: '0 2px 10px rgba(16, 185, 129, 0.05)',
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
        gap: '18px',
    },
    statusPill: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        background: '#ECFDF5',
        border: '1px solid #A7F3D0',
        padding: '6px 14px',
        borderRadius: '999px',
        fontSize: '12px',
        fontWeight: 700,
        color: '#065F46',
    },
    userSection: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        paddingLeft: '14px',
        borderLeft: '1px solid #E2E8F0',
    },
    userAvatar: {
        width: '36px',
        height: '36px',
        borderRadius: '10px',
        background: 'linear-gradient(135deg, #10B981, #059669)',
        color: '#FFFFFF',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 800,
        fontSize: '14px',
    },
    userName: {
        display: 'block',
        fontSize: '13px',
        fontWeight: 700,
        color: '#0F172A',
    },
    userRole: {
        display: 'block',
        fontSize: '11px',
        fontWeight: 600,
        color: '#059669',
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
    heroWrapper: {
        position: 'relative',
        height: '320px',
        width: '100%',
        overflow: 'hidden',
        boxShadow: '0 8px 24px rgba(16, 185, 129, 0.1)',
    },
    heroBackground: {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        position: 'absolute',
        top: 0,
        left: 0,
    },
    heroOverlay: {
        position: 'absolute',
        inset: 0,
        /* Dark gradient scrim (no green tint) for text legibility against the
           busy pharmacy photo — strongest on the left where the text sits,
           fading out toward the right so the photo still reads through. */
        background: 'linear-gradient(90deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.5) 40%, rgba(0,0,0,0.2) 70%, rgba(0,0,0,0.05) 100%)',
        display: 'flex',
        alignItems: 'center',
        zIndex: 2,
    },
    heroContent: {
        maxWidth: '1440px',
        margin: '0 auto',
        padding: '0 36px',
        color: '#FFFFFF',
        width: '100%',
        textShadow: '0 2px 10px rgba(0, 0, 0, 0.7)',
    },
    heroTag: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        background: 'rgba(0, 0, 0, 0.35)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255, 255, 255, 0.25)',
        padding: '5px 14px',
        borderRadius: '999px',
        fontSize: '12px',
        fontWeight: 700,
        letterSpacing: '0.4px',
        marginBottom: '10px',
    },
    heroTitle: {
        fontSize: '32px',
        fontWeight: 800,
        margin: '0 0 10px 0',
        letterSpacing: '-0.5px',
    },
    heroSubtitle: {
        fontSize: '14.5px',
        lineHeight: 1.6,
        color: '#E6FFFA',
        maxWidth: '650px',
        margin: '0 0 22px 0',
    },
    quickActionsRow: {
        display: 'flex',
        gap: '12px',
        flexWrap: 'wrap',
    },
    primaryActionBtn: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 20px',
        borderRadius: '10px',
        background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
        color: '#FFFFFF',
        border: 'none',
        fontSize: '13.5px',
        fontWeight: 700,
        cursor: 'pointer',
        boxShadow: '0 4px 14px rgba(0, 0, 0, 0.25)',
    },
    secondaryActionBtn: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 20px',
        borderRadius: '10px',
        background: 'rgba(255, 255, 255, 0.2)',
        backdropFilter: 'blur(10px)',
        color: '#FFFFFF',
        border: '1px solid rgba(255, 255, 255, 0.4)',
        fontSize: '13.5px',
        fontWeight: 700,
        cursor: 'pointer',
    },
    ghostActionBtn: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 20px',
        borderRadius: '10px',
        background: 'rgba(0, 0, 0, 0.25)',
        backdropFilter: 'blur(10px)',
        color: '#E2E8F0',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        fontSize: '13.5px',
        fontWeight: 600,
        cursor: 'pointer',
    },
    modulesSection: {
        maxWidth: '1440px',
        margin: '36px auto',
        padding: '0 36px',
    },
    sectionHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginBottom: '24px',
    },
    sectionTitle: {
        fontSize: '22px',
        fontWeight: 800,
        color: '#064E3B',
        margin: 0,
        letterSpacing: '-0.3px',
    },
    sectionSubtitle: {
        fontSize: '13.5px',
        color: '#64748B',
        margin: '4px 0 0 0',
    },
    activePill: {
        background: '#ECFDF5',
        border: '1px solid #A7F3D0',
        color: '#065F46',
        padding: '5px 12px',
        borderRadius: '999px',
        fontSize: '12px',
        fontWeight: 700,
    },
    grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '20px',
    },
    card: {
        backgroundColor: '#FFFFFF',
        border: '1.5px solid #E2E8F0',
        borderRadius: '18px',
        padding: '26px',
        cursor: 'pointer',
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: '220px',
    },
    cardHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
    },
    iconContainer: {
        width: '52px',
        height: '52px',
        borderRadius: '14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardBadge: {
        fontSize: '11px',
        fontWeight: 700,
        padding: '4px 10px',
        borderRadius: '999px',
        border: '1px solid',
        background: '#FFFFFF',
    },
    cardTitle: {
        fontSize: '17px',
        fontWeight: 700,
        color: '#0F172A',
        margin: '0 0 8px 0',
    },
    cardDescription: {
        fontSize: '13px',
        color: '#64748B',
        lineHeight: 1.5,
        margin: 0,
    },
    cardFooter: {
        marginTop: '20px',
        paddingTop: '14px',
        borderTop: '1px solid #F1F5F9',
    },
    accessLink: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '13px',
        fontWeight: 700,
    },
    footer: {
        backgroundColor: '#0D9488',
        borderTop: '1px solid #0F766E',
        padding: '24px 36px',
        marginTop: '60px',
    },
    footerInner: {
        maxWidth: '1440px',
        margin: '0 auto',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '13px',
        flexWrap: 'wrap',
        gap: '12px',
    },
    footerText: {
        color: '#CCFBF1',
        margin: 0,
        fontWeight: 500,
    },
    footerBadges: {
        display: 'flex',
        gap: '8px',
    },
    footerTag: {
        background: 'rgba(255, 255, 255, 0.12)',
        border: '1px solid rgba(204, 251, 241, 0.35)',
        color: '#F0FDFA',
        padding: '4px 10px',
        borderRadius: '6px',
        fontSize: '11.5px',
        fontWeight: 600,
    },
};

export default PharmacyDashboard;