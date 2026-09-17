import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../api/authApi';
import logoImage from '../../../assets/mediz.png';
import { 
    Package, 
    Search, 
    ArrowLeft, 
    LogOut, 
    AlertTriangle, 
    CheckCircle2, 
    XCircle, 
    Sparkles, 
    Pill,
    ArrowUpDown,
    Filter
} from 'lucide-react';

const Inventory = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [medicines, setMedicines] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchMedicines();
    }, []);

    const fetchMedicines = async () => {
        try {
            const res = await api.get('/Medicines');
            setMedicines(res.data || []);
        } catch (error) {
            console.error('Error fetching medicines:', error);
            setMedicines([
                { id: 1, name: 'Paracetamol 500mg', categoryName: 'Pain Relief', price: 5.50, stockQuantity: 120 },
                { id: 2, name: 'Amoxicillin 250mg', categoryName: 'Antibiotics', price: 12.00, stockQuantity: 8 },
                { id: 3, name: 'Omeprazole 20mg', categoryName: 'Gastrointestinal', price: 18.00, stockQuantity: 0 },
            ]);
        } finally {
            setLoading(false);
        }
    };

    const getFilteredMedicines = useMemo(() => {
        return medicines.filter((m) => {
            const matchesSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (m.categoryName && m.categoryName.toLowerCase().includes(searchTerm.toLowerCase()));
            if (!matchesSearch) return false;

            if (filter === 'low') return m.stockQuantity < 20 && m.stockQuantity > 0;
            if (filter === 'out') return m.stockQuantity === 0;
            if (filter === 'in') return m.stockQuantity >= 20;
            return true;
        });
    }, [medicines, filter, searchTerm]);

    const counts = useMemo(() => {
        const total = medicines.length;
        const inStock = medicines.filter(m => m.stockQuantity >= 20).length;
        const low = medicines.filter(m => m.stockQuantity < 20 && m.stockQuantity > 0).length;
        const out = medicines.filter(m => m.stockQuantity === 0).length;
        return { total, inStock, low, out };
    }, [medicines]);

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
                        <button onClick={() => navigate('/admin/pharmacy')} style={styles.backBtn}>
                            <ArrowLeft size={16} /> Pharmacy Suite
                        </button>
                        <div style={styles.logo} onClick={() => navigate('/admin/pharmacy')}>
                            <img src={logoImage} alt="Health Bridge" style={styles.logoImg} />
                            <div>
                                <h1 style={styles.logoTitle}>STOCK INVENTORY CONTROL</h1>
                                <p style={styles.logoSubtitle}>Warehouse Levels & Replenishment Monitor</p>
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
                {/* Stats Bar */}
                <div style={styles.statsGrid} className="animate-slide-up">
                    <div style={styles.statCard}>
                        <div style={{ ...styles.statIcon, background: '#ECFDF5', color: '#059669' }}>
                            <Package size={22} />
                        </div>
                        <div>
                            <div style={styles.statVal}>{counts.total}</div>
                            <div style={styles.statLbl}>Total Tracked Items</div>
                        </div>
                    </div>

                    <div style={styles.statCard}>
                        <div style={{ ...styles.statIcon, background: '#D1FAE5', color: '#047857' }}>
                            <CheckCircle2 size={22} />
                        </div>
                        <div>
                            <div style={{ ...styles.statVal, color: '#047857' }}>{counts.inStock}</div>
                            <div style={styles.statLbl}>Healthy Stock (&ge;20)</div>
                        </div>
                    </div>

                    <div style={styles.statCard}>
                        <div style={{ ...styles.statIcon, background: '#FEF3C7', color: '#D97706' }}>
                            <AlertTriangle size={22} />
                        </div>
                        <div>
                            <div style={{ ...styles.statVal, color: '#D97706' }}>{counts.low}</div>
                            <div style={styles.statLbl}>Low Stock Warning</div>
                        </div>
                    </div>

                    <div style={styles.statCard}>
                        <div style={{ ...styles.statIcon, background: '#FEE2E2', color: '#DC2626' }}>
                            <XCircle size={22} />
                        </div>
                        <div>
                            <div style={{ ...styles.statVal, color: '#DC2626' }}>{counts.out}</div>
                            <div style={styles.statLbl}>Depleted / Out of Stock</div>
                        </div>
                    </div>
                </div>

                {/* Toolbar Card */}
                <div style={styles.toolbarCard}>
                    <div style={styles.searchWrapper}>
                        <Search size={18} style={styles.searchIcon} />
                        <input
                            type="text"
                            placeholder="Filter inventory by medicine name or category..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={styles.searchInput}
                        />
                    </div>

                    <div style={styles.filterTabs}>
                        <button
                            style={{ ...styles.tabBtn, ...(filter === 'all' ? styles.tabBtnActive : {}) }}
                            onClick={() => setFilter('all')}
                        >
                            All ({counts.total})
                        </button>
                        <button
                            style={{ ...styles.tabBtn, ...(filter === 'in' ? styles.tabBtnActive : {}) }}
                            onClick={() => setFilter('in')}
                        >
                            In Stock ({counts.inStock})
                        </button>
                        <button
                            style={{ 
                                ...styles.tabBtn, 
                                ...(filter === 'low' ? styles.tabBtnWarning : {}),
                            }}
                            onClick={() => setFilter('low')}
                        >
                            ⚠️ Low Stock ({counts.low})
                        </button>
                        <button
                            style={{ 
                                ...styles.tabBtn, 
                                ...(filter === 'out' ? styles.tabBtnDanger : {}),
                            }}
                            onClick={() => setFilter('out')}
                        >
                            🚫 Out of Stock ({counts.out})
                        </button>
                    </div>
                </div>

                {/* Inventory Table */}
                <div style={styles.tableCard}>
                    <div style={styles.tableWrapper}>
                        <table style={styles.table}>
                            <thead>
                                <tr>
                                    <th>Medicine Name</th>
                                    <th>Category</th>
                                    <th>Unit Price</th>
                                    <th>Quantity in Warehouse</th>
                                    <th>Inventory Status</th>
                                    <th style={{ width: '220px' }}>Stock Health Bar</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan="6" style={styles.emptyState}>
                                            <div className="spinner" />
                                            <p>Syncing warehouse inventory...</p>
                                        </td>
                                    </tr>
                                ) : getFilteredMedicines.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" style={styles.emptyState}>
                                            <Package size={40} color="#94A3B8" />
                                            <p style={{ fontWeight: 700, margin: '10px 0 4px' }}>No inventory records match filter</p>
                                        </td>
                                    </tr>
                                ) : (
                                    getFilteredMedicines.map((med) => {
                                        const qty = med.stockQuantity || 0;
                                        const maxCap = 100;
                                        const percent = Math.min(100, Math.round((qty / maxCap) * 100));
                                        const isOut = qty === 0;
                                        const isLow = qty > 0 && qty < 20;

                                        let barColor = '#10B981';
                                        let statusBg = '#ECFDF5';
                                        let statusColor = '#065F46';
                                        let statusText = 'In Stock';

                                        if (isOut) {
                                            barColor = '#EF4444';
                                            statusBg = '#FEE2E2';
                                            statusColor = '#B91C1C';
                                            statusText = 'Depleted';
                                        } else if (isLow) {
                                            barColor = '#F59E0B';
                                            statusBg = '#FEF3C7';
                                            statusColor = '#B45309';
                                            statusText = 'Low Reserve';
                                        }

                                        return (
                                            <tr key={med.id} style={styles.tr}>
                                                <td>
                                                    <div style={styles.medWrap}>
                                                        <div style={styles.pillBox}>
                                                            <Pill size={16} color="#059669" />
                                                        </div>
                                                        <div>
                                                            <div style={styles.medName}>{med.name}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span style={styles.catBadge}>{med.categoryName || 'General'}</span>
                                                </td>
                                                <td>
                                                    <span style={styles.priceVal}>Rs. {med.price?.toFixed(2)}</span>
                                                </td>
                                                <td>
                                                    <span style={{
                                                        ...styles.qtyText,
                                                        color: isOut ? '#DC2626' : isLow ? '#D97706' : '#0F172A',
                                                    }}>
                                                        {qty} units
                                                    </span>
                                                </td>
                                                <td>
                                                    <span style={{
                                                        ...styles.statusBadge,
                                                        backgroundColor: statusBg,
                                                        color: statusColor,
                                                    }}>
                                                        {statusText}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div style={styles.progressWrap}>
                                                        <div style={styles.progressTrack}>
                                                            <div 
                                                                style={{
                                                                    ...styles.progressFill,
                                                                    width: `${percent}%`,
                                                                    backgroundColor: barColor,
                                                                }} 
                                                            />
                                                        </div>
                                                        <span style={styles.progressPercent}>{qty} / 100</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
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
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '18px',
        marginBottom: '24px',
    },
    statCard: {
        background: '#FFFFFF',
        border: '1px solid #D1FAE5',
        borderRadius: '16px',
        padding: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.04)',
    },
    statIcon: {
        width: '46px',
        height: '46px',
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    statVal: {
        fontSize: '22px',
        fontWeight: 800,
        color: '#064E3B',
    },
    statLbl: {
        fontSize: '12px',
        color: '#64748B',
        fontWeight: 600,
        marginTop: '2px',
    },
    toolbarCard: {
        background: '#FFFFFF',
        border: '1px solid #D1FAE5',
        borderRadius: '16px',
        padding: '16px 20px',
        marginBottom: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '14px',
        boxShadow: '0 2px 8px rgba(16, 185, 129, 0.04)',
    },
    searchWrapper: {
        position: 'relative',
        flex: 1,
        minWidth: '280px',
        maxWidth: '440px',
        display: 'flex',
        alignItems: 'center',
    },
    searchIcon: {
        position: 'absolute',
        left: '14px',
        color: '#64748B',
    },
    searchInput: {
        width: '100%',
        padding: '11px 16px 11px 42px',
        borderRadius: '10px',
        border: '1px solid #D1FAE5',
        fontSize: '13.5px',
        outline: 'none',
        backgroundColor: '#F6FAF7',
        fontFamily: 'inherit',
    },
    filterTabs: {
        display: 'flex',
        gap: '8px',
        flexWrap: 'wrap',
    },
    tabBtn: {
        padding: '8px 16px',
        borderRadius: '8px',
        border: '1px solid #E2E8F0',
        background: '#FFFFFF',
        color: '#64748B',
        fontSize: '13px',
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    tabBtnActive: {
        background: '#ECFDF5',
        borderColor: '#10B981',
        color: '#065F46',
        fontWeight: 700,
    },
    tabBtnWarning: {
        background: '#FEF3C7',
        borderColor: '#F59E0B',
        color: '#B45309',
        fontWeight: 700,
    },
    tabBtnDanger: {
        background: '#FEE2E2',
        borderColor: '#EF4444',
        color: '#B91C1C',
        fontWeight: 700,
    },
    tableCard: {
        background: '#FFFFFF',
        border: '1px solid #D1FAE5',
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: '0 4px 16px rgba(16, 185, 129, 0.05)',
    },
    tableWrapper: {
        overflowX: 'auto',
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse',
    },
    tr: {
        transition: 'background-color 0.15s',
    },
    medWrap: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
    },
    pillBox: {
        width: '32px',
        height: '32px',
        borderRadius: '8px',
        background: '#ECFDF5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    medName: {
        fontWeight: 700,
        color: '#0F172A',
        fontSize: '14px',
    },
    catBadge: {
        background: '#F1F5F9',
        color: '#475569',
        padding: '4px 10px',
        borderRadius: '6px',
        fontSize: '12px',
        fontWeight: 600,
    },
    priceVal: {
        fontWeight: 700,
        color: '#064E3B',
        fontSize: '14px',
    },
    qtyText: {
        fontWeight: 800,
        fontSize: '14px',
    },
    statusBadge: {
        display: 'inline-block',
        padding: '4px 12px',
        borderRadius: '999px',
        fontSize: '12px',
        fontWeight: 700,
    },
    progressWrap: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
    },
    progressTrack: {
        flex: 1,
        height: '8px',
        borderRadius: '4px',
        backgroundColor: '#E2E8F0',
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: '4px',
        transition: 'width 0.4s ease',
    },
    progressPercent: {
        fontSize: '11.5px',
        color: '#64748B',
        fontWeight: 600,
        width: '55px',
        textAlign: 'right',
    },
    emptyState: {
        textAlign: 'center',
        padding: '60px 20px',
        color: '#64748B',
    },
};

export default Inventory;