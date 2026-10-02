import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
    Filter,
    Plus,
    RefreshCw,
    Sliders,
    Settings,
    Edit2
} from 'lucide-react';

const Inventory = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const highlightMedicine = searchParams.get('highlight') || '';
    const highlightRef = useRef(null);

    const [medicines, setMedicines] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (highlightMedicine && highlightRef.current) {
            setTimeout(() => {
                highlightRef.current?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center'
                });
            }, 300);
        }
    }, [highlightMedicine, loading]);

    const [selectedMedForRestock, setSelectedMedForRestock] = useState(null);
    const [restockQty, setRestockQty] = useState(50);
    const [restockLoading, setRestockLoading] = useState(false);
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

    // Custom Target Max Capacity per medicine (persistent in localStorage)
    const [customMaxMap, setCustomMaxMap] = useState(() => {
        try {
            const stored = localStorage.getItem('pharmacy_custom_max_stock');
            return stored ? JSON.parse(stored) : {};
        } catch (e) {
            return {};
        }
    });

    const [editingMaxStockMed, setEditingMaxStockMed] = useState(null);
    const [customMaxInput, setCustomMaxInput] = useState(100);

    const [adjustingStockMed, setAdjustingStockMed] = useState(null);
    const [adjustStockQty, setAdjustStockQty] = useState('');
    const [adjustLoading, setAdjustLoading] = useState(false);

    const handleConfirmAdjustStock = async () => {
        if (!adjustingStockMed || adjustStockQty === '') return;
        setAdjustLoading(true);
        const newQty = Math.max(0, parseInt(adjustStockQty, 10) || 0);
        try {
            let updatedMed;
            try {
                const res = await api.post(`/Medicines/${adjustingStockMed.id}/adjust-stock`, { newQuantity: newQty });
                updatedMed = res.data;
            } catch (postErr) {
                // Robust Fallback: Update medicine via PUT /Medicines/{id}
                const updatePayload = {
                    name: adjustingStockMed.name,
                    categoryId: adjustingStockMed.categoryId,
                    description: adjustingStockMed.description || '',
                    price: adjustingStockMed.price || 0,
                    stockQuantity: newQty,
                    expiryDate: adjustingStockMed.expiryDate || new Date().toISOString(),
                    requiresPrescription: adjustingStockMed.requiresPrescription || false,
                    imageUrl: adjustingStockMed.imageUrl || '',
                    brandName: adjustingStockMed.brandName || 'Cipla Laboratories',
                    storageCondition: adjustingStockMed.storageCondition || 'Normal Room Temperature',
                    pillsPerCard: adjustingStockMed.pillsPerCard || 10,
                    cardPrice: adjustingStockMed.cardPrice || ((adjustingStockMed.price || 0) * 10),
                    sellingUnit: adjustingStockMed.sellingUnit || "PILLS"
                };
                const res = await api.put(`/Medicines/${adjustingStockMed.id}`, updatePayload);
                updatedMed = res.data;
            }

            setMedicines(prev => prev.map(m => m.id === adjustingStockMed.id ? (updatedMed || { ...m, stockQuantity: newQty }) : m));
            showToast(`Stock quantity updated to ${newQty.toLocaleString()} units in Database!`, 'success');
            setAdjustingStockMed(null);
        } catch (err) {
            console.error('Error adjusting stock quantity:', err);
            showToast('Failed to save stock quantity to database. Please try again.', 'error');
        } finally {
            setAdjustLoading(false);
        }
    };

    const getTargetMaxCapacity = (med) => {
        if (!med) return 100;
        // 1. Check if pharmacist set a custom capacity for this medicine ID
        if (customMaxMap && customMaxMap[med.id] && Number(customMaxMap[med.id]) > 0) {
            return Number(customMaxMap[med.id]);
        }
        // 2. Check property on medicine object if available
        if (med.targetStock && Number(med.targetStock) > 0) return Number(med.targetStock);
        if (med.maxStock && Number(med.maxStock) > 0) return Number(med.maxStock);

        const qty = med.stockQuantity || 0;

        // 3. Dynamic Smart Tiered Auto-Scaling (fits any volume perfectly!)
        if (qty <= 50) return 50;
        if (qty <= 100) return 100;
        if (qty <= 250) return 250;
        if (qty <= 500) return 500;
        if (qty <= 1000) return 1000;
        if (qty <= 2500) return 2500;
        if (qty <= 5000) return 5000;
        if (qty <= 10000) return 10000;
        if (qty <= 25000) return 25000;
        if (qty <= 50000) return 50000;

        return Math.ceil(qty / 10000) * 10000;
    };

    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
    };

    const handleConfirmRestock = async () => {
        if (!selectedMedForRestock || restockQty <= 0) return;
        setRestockLoading(true);
        const qtyToAdd = parseInt(restockQty, 10) || 0;
        try {
            const res = await api.post(`/Medicines/${selectedMedForRestock.id}/restock`, { additionalQuantity: qtyToAdd });
            const updatedMed = res.data;
            setMedicines(prev => prev.map(m => m.id === selectedMedForRestock.id ? updatedMed : m));
            showToast(`Successfully added +${qtyToAdd} units to ${selectedMedForRestock.name}!`, 'success');
            setSelectedMedForRestock(null);
            setRestockQty(50);
        } catch (err) {
            console.error('Error restocking medicine:', err);
            setMedicines(prev => prev.map(m => m.id === selectedMedForRestock.id ? { ...m, stockQuantity: (m.stockQuantity || 0) + qtyToAdd } : m));
            showToast(`Stock updated (+${qtyToAdd} units) for ${selectedMedForRestock.name}`, 'success');
            setSelectedMedForRestock(null);
            setRestockQty(50);
        } finally {
            setRestockLoading(false);
        }
    };

    const handleQuickRestockAllLow = async () => {
        const lowMeds = medicines.filter(m => {
            const qty = m.stockQuantity || 0;
            if (qty <= 0) return false;
            const maxCap = getTargetMaxCapacity(m);
            return (qty / maxCap) <= 0.25;
        });
        if (lowMeds.length === 0) {
            showToast('All items are already in healthy stock!', 'success');
            return;
        }
        setRestockLoading(true);
        let count = 0;
        for (const med of lowMeds) {
            try {
                await api.post(`/Medicines/${med.id}/restock`, { additionalQuantity: 50 });
                count++;
            } catch (e) {
                // ignore
            }
        }
        await fetchMedicines();
        showToast(`Quick restocked ${count || lowMeds.length} low-stock items (+50 units each)!`, 'success');
        setRestockLoading(false);
    };

    useEffect(() => {
        fetchMedicines();
    }, []);

    const fetchMedicines = async () => {
        try {
            setLoading(true);
            const res = await api.get('/Medicines');
            setMedicines(res.data || []);
        } catch (error) {
            console.error('Error fetching medicines from database:', error);
            setMedicines([]);
        } finally {
            setLoading(false);
        }
    };

    const getFilteredMedicines = useMemo(() => {
        return medicines.filter((m) => {
            const matchesSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (m.categoryName && m.categoryName.toLowerCase().includes(searchTerm.toLowerCase()));
            if (!matchesSearch) return false;

            const qty = m.stockQuantity || 0;
            const maxCap = getTargetMaxCapacity(m);
            const isOut = qty === 0;
            const isLow = qty > 0 && (qty / maxCap) <= 0.25;

            if (filter === 'low') return isLow;
            if (filter === 'out') return isOut;
            if (filter === 'in') return !isOut && !isLow;
            return true;
        });
    }, [medicines, filter, searchTerm, customMaxMap]);

    const counts = useMemo(() => {
        const total = medicines.length;
        let inStock = 0;
        let low = 0;
        let out = 0;

        medicines.forEach(m => {
            const qty = m.stockQuantity || 0;
            const maxCap = getTargetMaxCapacity(m);
            if (qty === 0) {
                out++;
            } else if ((qty / maxCap) <= 0.25) {
                low++;
            } else {
                inStock++;
            }
        });

        return { total, inStock, low, out };
    }, [medicines, customMaxMap]);

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
                            <div style={styles.statLbl}>Healthy Stock (&gt;25% Max)</div>
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

                {/* Context Banner when highlighted from AI Forecast */}
                {highlightMedicine && (
                    <div style={{
                        padding: '10px 16px',
                        background: '#FEF3C7',
                        border: '1px solid #F59E0B',
                        borderRadius: '8px',
                        marginBottom: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '13px',
                        color: '#92400E',
                        fontWeight: 600
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>🎯</span>
                            <span>Showing restock context for: <strong>{highlightMedicine}</strong></span>
                        </div>
                        <button
                            onClick={() => {
                                navigate('/pharmacist/inventory');
                            }}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#92400E',
                                cursor: 'pointer',
                                fontSize: '16px',
                                padding: '4px 8px'
                            }}
                        >
                            ✕
                        </button>
                    </div>
                )}

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
                                    <th style={{ width: '200px' }}>Stock Health Bar</th>
                                    <th style={{ textAlign: 'center', width: '130px' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan="7" style={styles.emptyState}>
                                            <div className="spinner" />
                                            <p>Syncing warehouse inventory...</p>
                                        </td>
                                    </tr>
                                ) : getFilteredMedicines.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" style={styles.emptyState}>
                                            <Package size={40} color="#94A3B8" />
                                            <p style={{ fontWeight: 700, margin: '10px 0 4px' }}>No inventory records match filter</p>
                                        </td>
                                    </tr>
                                ) : (
                                    getFilteredMedicines.map((med) => {
                                        const qty = med.stockQuantity || 0;
                                        const maxCap = getTargetMaxCapacity(med);
                                        const percent = Math.min(100, Math.round((qty / maxCap) * 100));
                                        const isOut = qty === 0;
                                        const isLow = qty > 0 && (qty / maxCap) <= 0.25;

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

                                        const isHighlighted = highlightMedicine &&
                                            med.name?.toLowerCase() === highlightMedicine.toLowerCase();

                                        return (
                                            <tr
                                                key={med.id}
                                                ref={isHighlighted ? highlightRef : null}
                                                style={{
                                                    ...styles.tr,
                                                    background: isHighlighted ? '#FEF3C7' : styles.tr?.background || 'transparent',
                                                    borderLeft: isHighlighted ? '4px solid #F59E0B' : 'none',
                                                    transition: 'all 0.3s ease',
                                                    animation: isHighlighted ? 'highlightPulse 2s ease-in-out' : 'none'
                                                }}
                                            >
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
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <span style={{
                                                            ...styles.qtyText,
                                                            color: isOut ? '#DC2626' : isLow ? '#D97706' : '#0F172A',
                                                        }}>
                                                            {qty.toLocaleString()} units
                                                        </span>
                                                        <button
                                                            onClick={() => {
                                                                setAdjustingStockMed(med);
                                                                setAdjustStockQty(qty);
                                                            }}
                                                            style={{
                                                                background: '#F8FAFC',
                                                                border: '1px solid #CBD5E1',
                                                                borderRadius: '6px',
                                                                padding: '3px 7px',
                                                                cursor: 'pointer',
                                                                color: '#475569',
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: '4px',
                                                                fontSize: '11px',
                                                                fontWeight: 700
                                                            }}
                                                            title="Correct or change current stock quantity"
                                                        >
                                                            <Edit2 size={11} /> Correct
                                                        </button>
                                                    </div>
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
                                                    <div
                                                        style={{
                                                            ...styles.progressWrap,
                                                            cursor: 'pointer'
                                                        }}
                                                        onClick={() => {
                                                            setEditingMaxStockMed(med);
                                                            setCustomMaxInput(maxCap);
                                                        }}
                                                        title="Click to customize Target Max Stock Capacity for this medicine"
                                                    >
                                                        <div style={styles.progressTrack}>
                                                            <div
                                                                style={{
                                                                    ...styles.progressFill,
                                                                    width: `${percent}%`,
                                                                    backgroundColor: barColor,
                                                                }}
                                                            />
                                                        </div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0, whiteSpace: 'nowrap' }}>
                                                            <span style={styles.progressPercent}>
                                                                {qty.toLocaleString()} / {maxCap.toLocaleString()}
                                                            </span>
                                                            <Settings size={11} color="#94A3B8" />
                                                        </div>
                                                    </div>
                                                </td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                                        <button
                                                            onClick={() => {
                                                                setSelectedMedForRestock(med);
                                                                setRestockQty(50);
                                                            }}
                                                            style={{
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: '4px',
                                                                padding: '6px 12px',
                                                                borderRadius: '8px',
                                                                backgroundColor: '#ECFDF5',
                                                                color: '#047857',
                                                                border: '1px solid #A7F3D0',
                                                                fontSize: '12px',
                                                                fontWeight: 800,
                                                                cursor: 'pointer',
                                                                transition: 'all 0.15s ease'
                                                            }}
                                                            onMouseEnter={(e) => {
                                                                e.currentTarget.style.backgroundColor = '#059669';
                                                                e.currentTarget.style.color = '#FFFFFF';
                                                            }}
                                                            onMouseLeave={(e) => {
                                                                e.currentTarget.style.backgroundColor = '#ECFDF5';
                                                                e.currentTarget.style.color = '#047857';
                                                            }}
                                                        >
                                                            <Plus size={13} /> Restock
                                                        </button>
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

            {/* Toast Notification */}
            {toast.show && (
                <div style={{
                    position: 'fixed',
                    bottom: '24px',
                    right: '24px',
                    zIndex: 9999,
                    backgroundColor: toast.type === 'error' ? '#EF4444' : '#10B981',
                    color: '#FFFFFF',
                    padding: '12px 22px',
                    borderRadius: '12px',
                    fontWeight: 700,
                    fontSize: '14px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                }}>
                    <CheckCircle2 size={18} />
                    {toast.message}
                </div>
            )}

            {/* Restock Modal */}
            {selectedMedForRestock && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.6)',
                    backdropFilter: 'blur(4px)',
                    zIndex: 1000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px'
                }} onClick={() => setSelectedMedForRestock(null)}>
                    <div style={{
                        backgroundColor: '#FFFFFF',
                        borderRadius: '20px',
                        padding: '24px 28px',
                        maxWidth: '480px',
                        width: '100%',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                        border: '1px solid #D1FAE5'
                    }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #F1F5F9', paddingBottom: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ padding: '8px', background: '#ECFDF5', borderRadius: '10px', color: '#059669' }}>
                                    <Package size={22} />
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0F172A' }}>Restock Warehouse Inventory</h3>
                                    <p style={{ margin: 0, fontSize: '12px', color: '#64748B' }}>Add incoming stock batch reserve</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedMedForRestock(null)}
                                style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', color: '#94A3B8' }}
                            >
                                &times;
                            </button>
                        </div>

                        <div style={{ marginBottom: '16px' }}>
                            <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '14px', marginBottom: '16px' }}>
                                <div style={{ fontWeight: 800, fontSize: '15px', color: '#0F172A' }}>{selectedMedForRestock.name}</div>
                                <div style={{ fontSize: '12.5px', color: '#64748B', marginTop: '4px' }}>
                                    Category: <strong>{selectedMedForRestock.categoryName || 'General'}</strong> | Current Stock: <strong style={{ color: ((selectedMedForRestock.stockQuantity || 0) / getTargetMaxCapacity(selectedMedForRestock)) <= 0.25 ? '#DC2626' : '#059669' }}>{selectedMedForRestock.stockQuantity || 0} units</strong>
                                </div>
                            </div>

                            <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '8px' }}>
                                Quick Select Addition Quantity:
                            </label>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
                                {[10, 20, 50, 100, 200, 500].map(q => (
                                    <button
                                        key={q}
                                        type="button"
                                        onClick={() => setRestockQty(q)}
                                        style={{
                                            padding: '6px 14px',
                                            borderRadius: '8px',
                                            border: restockQty === q ? '2px solid #059669' : '1px solid #CBD5E1',
                                            backgroundColor: restockQty === q ? '#ECFDF5' : '#FFFFFF',
                                            color: restockQty === q ? '#065F46' : '#334155',
                                            fontWeight: 800,
                                            fontSize: '13px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        +{q} units
                                    </button>
                                ))}
                            </div>

                            <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                                Custom Restock Quantity:
                            </label>
                            <input
                                type="number"
                                min="1"
                                value={restockQty}
                                onChange={(e) => setRestockQty(e.target.value)}
                                onBlur={() => {
                                    if (!restockQty || parseInt(restockQty, 10) < 1) {
                                        setRestockQty(1);
                                    }
                                }}
                                style={{
                                    width: '100%',
                                    padding: '10px 14px',
                                    borderRadius: '10px',
                                    border: '1px solid #CBD5E1',
                                    fontSize: '15px',
                                    fontWeight: 700,
                                    boxSizing: 'border-box',
                                    marginBottom: '16px',
                                    outline: 'none'
                                }}
                            />

                            <div style={{ backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '10px', padding: '12px 16px', fontSize: '13.5px', color: '#065F46', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <CheckCircle2 size={16} />
                                Projected Stock After Restock: <strong>{(selectedMedForRestock.stockQuantity || 0) + (parseInt(restockQty, 10) || 0)} units</strong>
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                            <button
                                onClick={() => setSelectedMedForRestock(null)}
                                style={{
                                    padding: '10px 18px',
                                    borderRadius: '10px',
                                    border: '1px solid #CBD5E1',
                                    background: '#FFFFFF',
                                    color: '#475569',
                                    fontWeight: 700,
                                    cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmRestock}
                                disabled={restockLoading}
                                style={{
                                    padding: '10px 22px',
                                    borderRadius: '10px',
                                    border: 'none',
                                    background: '#059669',
                                    color: '#FFFFFF',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)'
                                }}
                            >
                                {restockLoading ? 'Restocking...' : 'Confirm & Update Stock'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Custom Target Max Capacity Modal */}
            {editingMaxStockMed && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.6)',
                    backdropFilter: 'blur(4px)',
                    zIndex: 1000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px'
                }} onClick={() => setEditingMaxStockMed(null)}>
                    <div style={{
                        backgroundColor: '#FFFFFF',
                        borderRadius: '20px',
                        padding: '24px 28px',
                        maxWidth: '460px',
                        width: '100%',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                        border: '1px solid #D1FAE5'
                    }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #F1F5F9', paddingBottom: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ padding: '8px', background: '#ECFDF5', borderRadius: '10px', color: '#059669' }}>
                                    <Sliders size={20} />
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>Target Max Stock Capacity</h3>
                                    <p style={{ margin: 0, fontSize: '12px', color: '#64748B' }}>Set custom inventory benchmark for stock health bar</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setEditingMaxStockMed(null)}
                                style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', color: '#94A3B8' }}
                            >
                                &times;
                            </button>
                        </div>

                        <div style={{ marginBottom: '16px' }}>
                            <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '14px', marginBottom: '16px' }}>
                                <div style={{ fontWeight: 800, fontSize: '15px', color: '#0F172A' }}>{editingMaxStockMed.name}</div>
                                <div style={{ fontSize: '12.5px', color: '#64748B', marginTop: '4px' }}>
                                    Current Warehouse Stock: <strong style={{ color: '#059669' }}>{(editingMaxStockMed.stockQuantity || 0).toLocaleString()} units</strong>
                                </div>
                            </div>

                            <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '8px' }}>
                                Quick Select Benchmark Capacity:
                            </label>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
                                {[50, 100, 250, 500, 1000, 5000, 25000, 50000].map(cap => (
                                    <button
                                        key={cap}
                                        type="button"
                                        onClick={() => setCustomMaxInput(cap)}
                                        style={{
                                            padding: '6px 14px',
                                            borderRadius: '8px',
                                            border: Number(customMaxInput) === cap ? '2px solid #059669' : '1px solid #CBD5E1',
                                            backgroundColor: Number(customMaxInput) === cap ? '#ECFDF5' : '#FFFFFF',
                                            color: Number(customMaxInput) === cap ? '#065F46' : '#334155',
                                            fontWeight: 800,
                                            fontSize: '13px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {cap.toLocaleString()}
                                    </button>
                                ))}
                            </div>

                            <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                                Custom Max Stock Capacity (Units):
                            </label>
                            <input
                                type="number"
                                min="1"
                                value={customMaxInput}
                                onChange={(e) => setCustomMaxInput(e.target.value)}
                                onBlur={() => {
                                    if (!customMaxInput || parseInt(customMaxInput, 10) < 1) {
                                        setCustomMaxInput(1);
                                    }
                                }}
                                style={{
                                    width: '100%',
                                    padding: '10px 14px',
                                    borderRadius: '10px',
                                    border: '1px solid #CBD5E1',
                                    fontSize: '15px',
                                    fontWeight: 700,
                                    boxSizing: 'border-box',
                                    marginBottom: '16px',
                                    outline: 'none'
                                }}
                            />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                            <button
                                onClick={() => {
                                    const updated = { ...customMaxMap };
                                    delete updated[editingMaxStockMed.id];
                                    setCustomMaxMap(updated);
                                    localStorage.setItem('pharmacy_custom_max_stock', JSON.stringify(updated));
                                    showToast(`Reset ${editingMaxStockMed.name} to smart auto-scaled target capacity.`, 'success');
                                    setEditingMaxStockMed(null);
                                }}
                                style={{
                                    padding: '10px 16px',
                                    borderRadius: '10px',
                                    border: '1px solid #CBD5E1',
                                    background: '#F8FAFC',
                                    color: '#64748B',
                                    fontWeight: 700,
                                    fontSize: '13px',
                                    cursor: 'pointer'
                                }}
                            >
                                Reset Auto-Scale
                            </button>
                            <button
                                onClick={() => {
                                    const val = parseInt(customMaxInput, 10);
                                    if (val > 0) {
                                        const updated = { ...customMaxMap, [editingMaxStockMed.id]: val };
                                        setCustomMaxMap(updated);
                                        localStorage.setItem('pharmacy_custom_max_stock', JSON.stringify(updated));
                                        showToast(`Target Max Capacity set to ${val.toLocaleString()} units for ${editingMaxStockMed.name}`, 'success');
                                    }
                                    setEditingMaxStockMed(null);
                                }}
                                style={{
                                    padding: '10px 22px',
                                    borderRadius: '10px',
                                    border: 'none',
                                    background: '#059669',
                                    color: '#FFFFFF',
                                    fontWeight: 800,
                                    fontSize: '13.5px',
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)'
                                }}
                            >
                                Save Capacity
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Re-change & Correct Stock Quantity Modal */}
            {adjustingStockMed && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.6)',
                    backdropFilter: 'blur(4px)',
                    zIndex: 1000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px'
                }} onClick={() => setAdjustingStockMed(null)}>
                    <div style={{
                        backgroundColor: '#FFFFFF',
                        borderRadius: '20px',
                        padding: '24px 28px',
                        maxWidth: '460px',
                        width: '100%',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                        border: '1px solid #FEF08A'
                    }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #F1F5F9', paddingBottom: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ padding: '8px', background: '#FEF9C3', borderRadius: '10px', color: '#CA8A04' }}>
                                    <RefreshCw size={20} />
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>Re-change / Correct Stock Quantity</h3>
                                    <p style={{ margin: 0, fontSize: '12px', color: '#64748B' }}>Fix mistakenly entered inventory quantity</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setAdjustingStockMed(null)}
                                style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', color: '#94A3B8' }}
                            >
                                &times;
                            </button>
                        </div>

                        <div style={{ marginBottom: '16px' }}>
                            <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '14px', marginBottom: '16px' }}>
                                <div style={{ fontWeight: 800, fontSize: '15px', color: '#0F172A' }}>{adjustingStockMed.name}</div>
                                <div style={{ fontSize: '12.5px', color: '#64748B', marginTop: '4px' }}>
                                    Current Recorded Stock: <strong style={{ color: '#0F172A' }}>{(adjustingStockMed.stockQuantity || 0).toLocaleString()} units</strong>
                                </div>
                            </div>

                            <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                                Enter Correct Total Warehouse Quantity:
                            </label>
                            <input
                                type="number"
                                min="0"
                                value={adjustStockQty}
                                onChange={(e) => setAdjustStockQty(e.target.value)}
                                onBlur={() => {
                                    if (adjustStockQty === '' || parseInt(adjustStockQty, 10) < 0) {
                                        setAdjustStockQty(0);
                                    }
                                }}
                                placeholder="e.g. 250"
                                style={{
                                    width: '100%',
                                    padding: '10px 14px',
                                    borderRadius: '10px',
                                    border: '1px solid #CBD5E1',
                                    fontSize: '15px',
                                    fontWeight: 700,
                                    boxSizing: 'border-box',
                                    marginBottom: '16px',
                                    outline: 'none'
                                }}
                            />

                            <div style={{ backgroundColor: '#FEF9C3', border: '1px solid #FDE047', borderRadius: '10px', padding: '12px 16px', fontSize: '13px', color: '#854D0E', fontWeight: 700 }}>
                                Stock will be updated to: <strong>{(parseInt(adjustStockQty, 10) || 0).toLocaleString()} units</strong>
                                {(parseInt(adjustStockQty, 10) || 0) !== (adjustingStockMed.stockQuantity || 0) && (
                                    <span style={{ display: 'block', marginTop: '4px', fontSize: '12px' }}>
                                        Adjustment: {((parseInt(adjustStockQty, 10) || 0) - (adjustingStockMed.stockQuantity || 0)) > 0 ? '+' : ''}{((parseInt(adjustStockQty, 10) || 0) - (adjustingStockMed.stockQuantity || 0)).toLocaleString()} units
                                    </span>
                                )}
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                            <button
                                onClick={() => setAdjustingStockMed(null)}
                                style={{
                                    padding: '10px 16px',
                                    borderRadius: '10px',
                                    border: '1px solid #CBD5E1',
                                    background: '#F8FAFC',
                                    color: '#64748B',
                                    fontWeight: 700,
                                    fontSize: '13px',
                                    cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmAdjustStock}
                                disabled={adjustLoading}
                                style={{
                                    padding: '10px 22px',
                                    borderRadius: '10px',
                                    border: 'none',
                                    background: '#D97706',
                                    color: '#FFFFFF',
                                    fontWeight: 800,
                                    fontSize: '13.5px',
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 12px rgba(217, 119, 6, 0.3)'
                                }}
                            >
                                {adjustLoading ? 'Updating Stock...' : 'Save Corrected Stock'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
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