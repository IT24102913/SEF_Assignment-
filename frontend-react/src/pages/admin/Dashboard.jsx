import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import heroImage from '../../assets/z.png';
import logoImage from '../../assets/mediz.png';
import {
    Stethoscope,
    Pill,
    FileText,
    FlaskConical,
    Users,
    Activity,
    LogOut,
    Sparkles,
    ArrowRight,
    ShieldCheck,
    Award,
    HeartPulse,
    Phone,
    ChevronRight,
    Search
} from 'lucide-react';

const Dashboard = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [hoveredCard, setHoveredCard] = useState(null);

    const modules = [
        {
            id: 'doctor',
            title: 'Doctor Appointments',
            description: 'Schedule, review and manage specialist doctor consultations.',
            icon: Stethoscope,
            color: '#2563EB',
            badge: 'Online Booking',
            path: '/admin/doctor',
        },
        {
            id: 'pharmacy',
            title: 'Pharmacy & Inventory',
            description: 'Medication catalog, inventory levels, AI demand predictions & sales.',
            icon: Pill,
            color: '#10B981',
            badge: 'AI Stock Sync',
            path: '/admin/pharmacy',
        },
        {
            id: 'records',
            title: 'Electronic Medical Records',
            description: 'Encrypted patient history, health summaries and electronic charts.',
            icon: FileText,
            color: '#7C3AED',
            badge: '256-Bit Vault',
            path: '/admin/records',
        },
        {
            id: 'lab',
            title: 'Laboratory & Diagnostics',
            description: 'Pathology test catalogue, AI prescription verification & result delivery.',
            icon: FlaskConical,
            color: '#F59E0B',
            badge: 'Gemini Vision AI',
            path: '/laboratory/dashboard',
        },
        {
            id: 'customers',
            title: 'Registered Customers',
            description: 'Patient directory, mobile app accounts, customer contact details & prescription history.',
            icon: Users,
            color: '#059669',
            badge: 'Live Sync',
            path: '/admin/patients',
        },
        {
            id: 'staff',
            title: 'Staff Management',
            description: 'Control role-based permissions, doctor rosters and staff access.',
            icon: Users,
            color: '#DC2626',
            badge: 'Role Access',
            path: '/admin/staff',
        },
    ];

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div style={styles.container}>
            {/* Top Navigation Header */}
            <header style={styles.header}>
                <div style={styles.headerTop}>
                    <div style={styles.logo} onClick={() => navigate('/admin/dashboard')}>
                        <img src={logoImage} alt="Health Bridge Logo" style={styles.logoImg} />
                        <div>
                            <h1 style={styles.logoTitle}>HEALTH BRIDGE</h1>
                            <p style={styles.logoSubtitle}>Clinical & Enterprise Medical Suite</p>
                        </div>
                    </div>

                    <div style={styles.headerActions}>
                        <div style={styles.statusPill}>
                            <span className="pulsing-dot" />
                            <span>System Operational</span>
                        </div>

                        <div style={styles.userSection}>
                            <div style={styles.userAvatar}>
                                {user?.fullName ? user.fullName[0].toUpperCase() : 'A'}
                            </div>
                            <div>
                                <span style={styles.userName}>{user?.fullName || 'Administrator'}</span>
                                <span style={styles.userRole}>{user?.role || 'Admin'}</span>
                            </div>
                            <button onClick={handleLogout} style={styles.logoutBtn} title="Sign Out">
                                <LogOut size={16} />
                                <span>Logout</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Sub Navigation */}
                <div style={styles.nav}>
                    <button style={styles.navLinkActive} onClick={() => navigate('/admin/dashboard')}>
                        Overview
                    </button>
                    <button style={styles.navLink} onClick={() => navigate('/admin/pharmacy')}>
                        Pharmacy Suite
                    </button>
                    <button style={styles.navLink} onClick={() => navigate('/admin/patients')}>
                        Registered Customers
                    </button>
                    <button style={styles.navLink} onClick={() => navigate('/laboratory/dashboard')}>
                        Clinical Lab
                    </button>
                    <button style={styles.navLink} onClick={() => navigate('/laboratory/results')}>
                        Diagnostic Reports
                    </button>
                    <button style={styles.navLink} onClick={() => navigate('/admin/staff')}>
                        Staff Access
                    </button>
                </div>
            </header>

            {/* Hero Section */}
            <div style={styles.heroWrapper} className="animate-slide-up">
                <img
                    src={heroImage}
                    alt="Health Bridge Sanctuary"
                    style={styles.heroBackground}
                />
                <div style={styles.heroOverlay}>
                    <div style={styles.heroContent}>
                        <div style={styles.heroTag}>
                            <Sparkles size={14} color="#A7F3D0" />
                            <span>Welcome to Health Bridge Healthcare Sanctuary</span>
                        </div>
                        <h1 style={styles.heroTitle}>Integrated Health & Diagnostic Center</h1>
                        <p style={styles.heroSubtitle}>
                            Seamlessly coordinate laboratory orders, pharmacy prescriptions, specialist appointments, and encrypted medical records with AI-accelerated workflows.
                        </p>

                        <div style={styles.quickActionsRow}>
                            <button
                                onClick={() => navigate('/laboratory/dashboard')}
                                style={styles.primaryActionBtn}
                            >
                                <FlaskConical size={16} />
                                Lab Diagnostics Hub
                            </button>
                            <button
                                onClick={() => navigate('/admin/pharmacy')}
                                style={styles.secondaryActionBtn}
                            >
                                <Pill size={16} />
                                Pharmacy Dispensary
                            </button>
                            <button
                                onClick={() => navigate('/admin/staff')}
                                style={styles.ghostActionBtn}
                            >
                                <Users size={16} />
                                Staff Permissions
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Access Modules Grid */}
            <div style={styles.modulesSection}>
                <div style={styles.sectionHeader}>
                    <div>
                        <h2 style={styles.sectionTitle}>Medical & Management Portals</h2>
                        <p style={styles.sectionSubtitle}>Select an enterprise module to manage workflows</p>
                    </div>
                    <span style={styles.activePill}>5 Modules Active</span>
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
                                    borderColor: isHovered ? module.color : '#E2E8F0',
                                    transform: isHovered ? 'translateY(-5px) scale(1.015)' : 'translateY(0) scale(1)',
                                    transition: 'transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease, border-color 0.2s ease',
                                    boxShadow: isHovered
                                        ? `0 12px 24px -8px ${module.color}40`
                                        : '0 4px 14px rgba(16, 185, 129, 0.05)',
                                    animationDelay: `${i * 80}ms`,
                                }}
                                className="animate-scale-up"
                                onMouseEnter={() => setHoveredCard(module.id)}
                                onMouseLeave={() => setHoveredCard(null)}
                                onClick={() => navigate(module.path)}
                            >
                                <div style={{ ...styles.cardAccentStrip, backgroundColor: module.color }} />
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
                                        Open Portal
                                        <ArrowRight size={16} />
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Performance Stats Banner */}
            <div style={styles.statsBanner}>
                <div style={styles.statItem}>
                    <div style={styles.statIconWrap}><Award size={24} color="#059669" /></div>
                    <div>
                        <h3 style={styles.statNumber}>40+</h3>
                        <p style={styles.statLabel}>Years of Clinical Excellence</p>
                    </div>
                </div>
                <div style={styles.statItem}>
                    <div style={styles.statIconWrap}><Stethoscope size={24} color="#10B981" /></div>
                    <div>
                        <h3 style={styles.statNumber}>500+</h3>
                        <p style={styles.statLabel}>Certified Doctors & Specialists</p>
                    </div>
                </div>
                <div style={styles.statItem}>
                    <div style={styles.statIconWrap}><HeartPulse size={24} color="#0D9488" /></div>
                    <div>
                        <h3 style={styles.statNumber}>24 / 7</h3>
                        <p style={styles.statLabel}>Continuous Emergency Services</p>
                    </div>
                </div>
                <div style={styles.statItem}>
                    <div style={styles.statIconWrap}><ShieldCheck size={24} color="#047857" /></div>
                    <div>
                        <h3 style={styles.statNumber}>100K+</h3>
                        <p style={styles.statLabel}>Verified Health Records</p>
                    </div>
                </div>
            </div>

            {/* Modern Clean Footer */}
            <footer style={styles.footer}>
                <div style={styles.footerContent}>
                    <div style={styles.footerBrand}>
                        <div style={styles.footerLogo}>
                            <img src={logoImage} alt="Health Bridge" style={{ height: '36px' }} />
                            <div>
                                <h4 style={styles.footerTitle}>HEALTH BRIDGE</h4>
                                <p style={styles.footerSubtitle}>Clinical Sanctuary & Hospital Management</p>
                            </div>
                        </div>
                        <p style={styles.footerBio}>
                            Pioneering healthcare delivery, automated diagnostics, and smart pharmacy distribution with high clinical standards.
                        </p>
                    </div>

                    <div style={styles.footerCol}>
                        <h5 style={styles.colTitle}>Enterprise Modules</h5>
                        <button onClick={() => navigate('/admin/pharmacy')} style={styles.footerLink}>Pharmacy System</button>
                        <button onClick={() => navigate('/laboratory/dashboard')} style={styles.footerLink}>Clinical Laboratory</button>
                        <button onClick={() => navigate('/laboratory/results')} style={styles.footerLink}>Diagnostic Reports</button>
                        <button onClick={() => navigate('/admin/staff')} style={styles.footerLink}>Staff Roster</button>
                    </div>

                    <div style={styles.footerCol}>
                        <h5 style={styles.colTitle}>Security & Support</h5>
                        <span style={styles.footerText}>256-Bit SSL Enforced</span>
                        <span style={styles.footerText}>HIPAA / GDPR Aligned</span>
                        <span style={styles.footerText}>Emergency: +94 76 447 7999</span>
                        <span style={styles.footerText}>Support: help@healthbridge.com</span>
                    </div>
                </div>

                <div style={styles.footerBottom}>
                    <p>© 2026 Health Bridge (Pvt) Ltd. All rights reserved.</p>
                    <div style={styles.footerBadges}>
                        <span style={styles.footerTag}>ISO 9001:2015</span>
                        <span style={styles.footerTag}>AI Vision Active</span>
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
        padding: '16px 36px',
        maxWidth: '1440px',
        margin: '0 auto',
    },
    logo: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        cursor: 'pointer',
    },
    logoImg: {
        height: '42px',
        width: 'auto',
    },
    logoTitle: {
        fontSize: '18px',
        fontWeight: 800,
        color: '#064E3B',
        margin: 0,
        letterSpacing: '0.5px',
    },
    logoSubtitle: {
        fontSize: '11.5px',
        color: '#64748B',
        margin: 0,
        fontWeight: 500,
    },
    headerActions: {
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
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
        gap: '12px',
        paddingLeft: '16px',
        borderLeft: '1px solid #E2E8F0',
    },
    userAvatar: {
        width: '38px',
        height: '38px',
        borderRadius: '10px',
        background: 'linear-gradient(135deg, #10B981, #059669)',
        color: '#FFFFFF',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 800,
        fontSize: '15px',
    },
    userName: {
        display: 'block',
        fontSize: '13.5px',
        fontWeight: 700,
        color: '#0F172A',
    },
    userRole: {
        display: 'block',
        fontSize: '11px',
        fontWeight: 600,
        color: '#059669',
        textTransform: 'uppercase',
    },
    logoutBtn: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '8px 14px',
        borderRadius: '8px',
        background: '#FEE2E2',
        border: '1px solid #FECACA',
        color: '#B91C1C',
        fontSize: '12.5px',
        fontWeight: 700,
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    nav: {
        display: 'flex',
        gap: '6px',
        padding: '0 36px 12px',
        maxWidth: '1440px',
        margin: '0 auto',
        overflowX: 'auto',
    },
    navLinkActive: {
        background: '#ECFDF5',
        border: '1px solid #A7F3D0',
        color: '#065F46',
        padding: '7px 16px',
        borderRadius: '8px',
        fontSize: '13px',
        fontWeight: 700,
        cursor: 'pointer',
    },
    navLink: {
        background: 'transparent',
        border: 'none',
        color: '#64748B',
        padding: '7px 16px',
        borderRadius: '8px',
        fontSize: '13px',
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    heroWrapper: {
        position: 'relative',
        height: '340px',
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
        background: 'linear-gradient(90deg, rgba(0, 0, 0, 0.72) 0%, rgba(0, 0, 0, 0.5) 42%, rgba(0, 0, 0, 0.18) 70%, rgba(0, 0, 0, 0) 100%)',
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
        textShadow: '0 2px 10px rgba(0, 0, 0, 0.6)',
    },
    heroTag: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        background: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255, 255, 255, 0.25)',
        padding: '5px 14px',
        borderRadius: '999px',
        fontSize: '12px',
        fontWeight: 700,
        letterSpacing: '0.4px',
        marginBottom: '12px',
    },
    heroTitle: {
        fontSize: '34px',
        fontWeight: 800,
        margin: '0 0 10px 0',
        letterSpacing: '-0.5px',
        textShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
    },
    heroSubtitle: {
        fontSize: '15px',
        lineHeight: 1.6,
        color: '#E6FFFA',
        maxWidth: '680px',
        margin: '0 0 24px 0',
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
        padding: '11px 22px',
        borderRadius: '10px',
        background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
        color: '#FFFFFF',
        border: 'none',
        fontSize: '13.5px',
        fontWeight: 700,
        cursor: 'pointer',
        boxShadow: '0 4px 14px rgba(0, 0, 0, 0.25)',
        transition: 'all 0.2s',
    },
    secondaryActionBtn: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '11px 22px',
        borderRadius: '10px',
        background: 'rgba(255, 255, 255, 0.2)',
        backdropFilter: 'blur(10px)',
        color: '#FFFFFF',
        border: '1px solid rgba(255, 255, 255, 0.4)',
        fontSize: '13.5px',
        fontWeight: 700,
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    ghostActionBtn: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '11px 22px',
        borderRadius: '10px',
        background: 'rgba(0, 0, 0, 0.25)',
        backdropFilter: 'blur(10px)',
        color: '#E2E8F0',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        fontSize: '13.5px',
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'all 0.2s',
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
        position: 'relative',
        backgroundColor: '#FFFFFF',
        border: '1.5px solid #E2E8F0',
        borderRadius: '18px',
        padding: '30px 26px 26px',
        cursor: 'pointer',
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: '220px',
        overflow: 'hidden',
    },
    cardAccentStrip: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '5px',
        borderRadius: '18px 18px 0 0',
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
    statsBanner: {
        maxWidth: '1440px',
        margin: '40px auto',
        padding: '0 36px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '20px',
    },
    statItem: {
        backgroundColor: '#FFFFFF',
        border: '1px solid #D1FAE5',
        borderRadius: '16px',
        padding: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.05)',
    },
    statIconWrap: {
        width: '48px',
        height: '48px',
        borderRadius: '12px',
        background: '#ECFDF5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    statNumber: {
        fontSize: '24px',
        fontWeight: 800,
        color: '#064E3B',
        margin: 0,
    },
    statLabel: {
        fontSize: '12px',
        color: '#64748B',
        fontWeight: 600,
        margin: '2px 0 0 0',
    },
    footer: {
        backgroundColor: '#0D9488',
        color: '#F0FDFA',
        padding: '50px 36px 30px',
        marginTop: '60px',
    },
    footerContent: {
        maxWidth: '1440px',
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: '2fr 1fr 1fr',
        gap: '40px',
        paddingBottom: '36px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    },
    footerBrand: {
        maxWidth: '420px',
    },
    footerLogo: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '14px',
    },
    footerTitle: {
        fontSize: '16px',
        fontWeight: 800,
        color: '#FFFFFF',
        margin: 0,
        letterSpacing: '0.5px',
    },
    footerSubtitle: {
        fontSize: '11px',
        color: '#CCFBF1',
        margin: 0,
    },
    footerBio: {
        fontSize: '13px',
        color: '#E6FFFA',
        lineHeight: 1.6,
        margin: 0,
    },
    footerCol: {
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
    },
    colTitle: {
        fontSize: '14px',
        fontWeight: 700,
        color: '#FFFFFF',
        marginBottom: '6px',
        letterSpacing: '0.3px',
    },
    footerLink: {
        background: 'none',
        border: 'none',
        color: '#CCFBF1',
        textAlign: 'left',
        padding: 0,
        fontSize: '13px',
        cursor: 'pointer',
        transition: 'color 0.2s',
    },
    footerText: {
        fontSize: '13px',
        color: '#E6FFFA',
    },
    footerBottom: {
        maxWidth: '1440px',
        margin: '24px auto 0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '12px',
        color: '#CCFBF1',
        flexWrap: 'wrap',
        gap: '12px',
    },
    footerBadges: {
        display: 'flex',
        gap: '8px',
    },
    footerTag: {
        background: 'rgba(255, 255, 255, 0.14)',
        padding: '3px 10px',
        borderRadius: '6px',
        fontSize: '11px',
        color: '#F0FDFA',
    },
};

export default Dashboard;