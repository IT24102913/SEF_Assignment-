import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/authApi';
import logoImage from '../../assets/mediz.png';
import {
    Users,
    Search,
    UserCheck,
    UserX,
    FileText,
    ShoppingBag,
    ArrowLeft,
    LogOut,
    CheckCircle2,
    AlertTriangle,
    X,
    Phone,
    Mail,
    MapPin,
    Calendar,
    Shield,
    Edit3,
    Sparkles
} from 'lucide-react';

const Patients = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [editFormData, setEditFormData] = useState({
        phoneNumber: '',
        address: '',
        city: '',
        nicNumber: '',
        gender: '',
        emergencyContact: ''
    });
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

    useEffect(() => {
        fetchPatients();
    }, []);

    const showToastMessage = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => {
            setToast({ show: false, message: '', type: 'success' });
        }, 3500);
    };

    const fetchPatients = async () => {
        try {
            const res = await api.get('/Patients');
            setPatients(res.data || []);
        } catch (error) {
            console.error('Error fetching patients:', error);
            if (error.response?.status === 401) {
                logout();
                navigate('/login');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleToggleStatus = async (id, currentStatus) => {
        try {
            await api.patch(`/Patients/${id}/toggle-status`);
            showToastMessage(`Patient account ${currentStatus ? 'deactivated' : 'activated'} successfully!`, 'success');
            fetchPatients();
        } catch (error) {
            console.error('Error updating patient status:', error);
            showToastMessage('Failed to update patient status', 'error');
        }
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        if (!selectedPatient) return;
        setSubmitting(true);
        try {
            await api.put(`/Patients/${selectedPatient.userId}`, editFormData);
            showToastMessage('Patient profile updated successfully!', 'success');
            setShowEditModal(false);
            fetchPatients();
        } catch (error) {
            console.error('Error updating patient profile:', error);
            showToastMessage('Error updating patient profile', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleOpenEdit = (patient) => {
        setSelectedPatient(patient);
        setEditFormData({
            phoneNumber: patient.phoneNumber || '',
            address: patient.address || '',
            city: patient.city || '',
            nicNumber: patient.nicNumber || '',
            gender: patient.gender || '',
            emergencyContact: patient.emergencyContact || ''
        });
        setShowEditModal(true);
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const filteredPatients = useMemo(() => {
        return patients.filter((p) => {
            const matchesSearch =
                p.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (p.phoneNumber && p.phoneNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (p.city && p.city.toLowerCase().includes(searchTerm.toLowerCase()));

            const matchesStatus =
                statusFilter === 'ALL' ||
                (statusFilter === 'ACTIVE' && p.isActive) ||
                (statusFilter === 'INACTIVE' && !p.isActive);

            return matchesSearch && matchesStatus;
        });
    }, [patients, searchTerm, statusFilter]);

    const stats = useMemo(() => {
        const total = patients.length;
        const active = patients.filter(p => p.isActive).length;
        const totalRx = patients.reduce((acc, curr) => acc + (curr.totalPrescriptions || 0), 0);
        const totalOrders = patients.reduce((acc, curr) => acc + (curr.totalOrders || 0), 0);
        return { total, active, totalRx, totalOrders };
    }, [patients]);

    return (
        <div style={styles.container}>
            {/* Toast Notification */}
            {toast.show && (
                <div style={{
                    ...styles.toast,
                    backgroundColor: toast.type === 'success' ? '#059669' : '#DC2626',
                }}>
                    {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
                    <span>{toast.message}</span>
                </div>
            )}

            {/* Header */}
            <header style={styles.header}>
                <div style={styles.headerTop}>
                    <div style={styles.leftNav}>
                        <button onClick={() => navigate('/admin/dashboard')} style={styles.backBtn}>
                            <ArrowLeft size={16} /> Admin Portal
                        </button>
                        <div style={styles.logo} onClick={() => navigate('/admin/dashboard')}>
                            <img src={logoImage} alt="Health Bridge" style={styles.logoImg} />
                            <div>
                                <h1 style={styles.logoTitle}>REGISTERED CUSTOMERS</h1>
                                <p style={styles.logoSubtitle}>Patient & Client Account Directory</p>
                            </div>
                        </div>
                    </div>

                    <div style={styles.headerActions}>
                        <div style={styles.userSection}>
                            <span style={styles.userName}>{user?.fullName || 'Administrator'}</span>
                            <button onClick={handleLogout} style={styles.logoutBtn} title="Sign Out">
                                <LogOut size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main style={styles.mainContent}>
                {/* Banner & Stats */}
                <div style={styles.bannerGrid}>
                    <div style={styles.heroCard}>
                        <div>
                            <span style={styles.heroTag}><Sparkles size={13} /> Active Customer Base</span>
                            <h2 style={styles.heroTitle}>Patient Directory & Account Management</h2>
                            <p style={styles.heroSub}>
                                Real-time repository of all patients who registered via the mobile app or clinic portal. View prescription records, manage account security, and audit customer history.
                            </p>
                        </div>
                    </div>

                    <div style={styles.statsCardGrid}>
                        <div style={styles.statMiniCard}>
                            <div style={{ ...styles.statIconCircle, background: '#ECFDF5', color: '#059669' }}>
                                <Users size={20} />
                            </div>
                            <div>
                                <div style={styles.statMiniNum}>{stats.total}</div>
                                <div style={styles.statMiniLabel}>Total Patients</div>
                            </div>
                        </div>

                        <div style={styles.statMiniCard}>
                            <div style={{ ...styles.statIconCircle, background: '#EFF6FF', color: '#2563EB' }}>
                                <UserCheck size={20} />
                            </div>
                            <div>
                                <div style={styles.statMiniNum}>{stats.active}</div>
                                <div style={styles.statMiniLabel}>Active Accounts</div>
                            </div>
                        </div>

                        <div style={styles.statMiniCard}>
                            <div style={{ ...styles.statIconCircle, background: '#FEF3C7', color: '#D97706' }}>
                                <FileText size={20} />
                            </div>
                            <div>
                                <div style={styles.statMiniNum}>{stats.totalRx}</div>
                                <div style={styles.statMiniLabel}>Total Prescriptions</div>
                            </div>
                        </div>

                        <div style={styles.statMiniCard}>
                            <div style={{ ...styles.statIconCircle, background: '#F3E8FF', color: '#9333EA' }}>
                                <ShoppingBag size={20} />
                            </div>
                            <div>
                                <div style={styles.statMiniNum}>{stats.totalOrders}</div>
                                <div style={styles.statMiniLabel}>Pharmacy Orders</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Toolbar */}
                <div style={styles.toolbarCard}>
                    <div style={styles.searchWrapper}>
                        <Search size={18} style={styles.searchIcon} />
                        <input
                            type="text"
                            placeholder="Search by patient name, email, phone, or city..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={styles.searchInput}
                        />
                    </div>

                    <div style={styles.filterGroup}>
                        <button
                            onClick={() => setStatusFilter('ALL')}
                            style={{
                                ...styles.filterBtn,
                                ...(statusFilter === 'ALL' ? styles.filterBtnActive : {}),
                            }}
                        >
                            All ({patients.length})
                        </button>
                        <button
                            onClick={() => setStatusFilter('ACTIVE')}
                            style={{
                                ...styles.filterBtn,
                                ...(statusFilter === 'ACTIVE' ? styles.filterBtnActive : {}),
                            }}
                        >
                            Active ({stats.active})
                        </button>
                        <button
                            onClick={() => setStatusFilter('INACTIVE')}
                            style={{
                                ...styles.filterBtn,
                                ...(statusFilter === 'INACTIVE' ? styles.filterBtnActive : {}),
                            }}
                        >
                            Inactive ({stats.total - stats.active})
                        </button>
                    </div>
                </div>

                {/* Edit Profile Modal */}
                {showEditModal && selectedPatient && (
                    <div style={styles.modalOverlay}>
                        <div style={styles.modalCard}>
                            <div style={styles.modalHeader}>
                                <div style={styles.modalTitleWrap}>
                                    <div style={styles.modalIcon}>
                                        <Shield size={20} color="#059669" />
                                    </div>
                                    <h3 style={styles.modalTitle}>Update Patient Profile</h3>
                                </div>
                                <button onClick={() => setShowEditModal(false)} style={styles.closeBtn}><X size={18} /></button>
                            </div>

                            <div style={styles.modalPatientHeader}>
                                <div style={styles.avatarLarge}>
                                    {selectedPatient.fullName.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <div style={styles.modalPatientName}>{selectedPatient.fullName}</div>
                                    <div style={styles.modalPatientEmail}>{selectedPatient.email}</div>
                                </div>
                            </div>

                            <form onSubmit={handleEditSubmit}>
                                <div style={styles.formGrid}>
                                    <div style={styles.formGroup}>
                                        <label style={styles.formLabel}>Phone Number</label>
                                        <input
                                            type="text"
                                            placeholder="+94 77 123 4567"
                                            value={editFormData.phoneNumber}
                                            onChange={(e) => setEditFormData({ ...editFormData, phoneNumber: e.target.value })}
                                            style={styles.input}
                                        />
                                    </div>

                                    <div style={styles.formGroup}>
                                        <label style={styles.formLabel}>NIC / Identification No.</label>
                                        <input
                                            type="text"
                                            placeholder="199512345678"
                                            value={editFormData.nicNumber}
                                            onChange={(e) => setEditFormData({ ...editFormData, nicNumber: e.target.value })}
                                            style={styles.input}
                                        />
                                    </div>

                                    <div style={styles.formGroup}>
                                        <label style={styles.formLabel}>City / Region</label>
                                        <input
                                            type="text"
                                            placeholder="Colombo"
                                            value={editFormData.city}
                                            onChange={(e) => setEditFormData({ ...editFormData, city: e.target.value })}
                                            style={styles.input}
                                        />
                                    </div>

                                    <div style={styles.formGroup}>
                                        <label style={styles.formLabel}>Gender</label>
                                        <select
                                            value={editFormData.gender}
                                            onChange={(e) => setEditFormData({ ...editFormData, gender: e.target.value })}
                                            style={styles.input}
                                        >
                                            <option value="">Select gender</option>
                                            <option value="Male">Male</option>
                                            <option value="Female">Female</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>

                                    <div style={styles.formGroupFull}>
                                        <label style={styles.formLabel}>Residential Address</label>
                                        <input
                                            type="text"
                                            placeholder="123 Main Street, Suite A"
                                            value={editFormData.address}
                                            onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                                            style={styles.input}
                                        />
                                    </div>

                                    <div style={styles.formGroupFull}>
                                        <label style={styles.formLabel}>Emergency Contact Number</label>
                                        <input
                                            type="text"
                                            placeholder="+94 71 987 6543"
                                            value={editFormData.emergencyContact}
                                            onChange={(e) => setEditFormData({ ...editFormData, emergencyContact: e.target.value })}
                                            style={styles.input}
                                        />
                                    </div>
                                </div>

                                <div style={styles.formActions}>
                                    <button type="button" style={styles.cancelBtn} onClick={() => setShowEditModal(false)} disabled={submitting}>
                                        Cancel
                                    </button>
                                    <button type="submit" style={styles.submitBtn} disabled={submitting}>
                                        {submitting ? 'Saving...' : 'Save Profile Changes'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Patients Table */}
                <div style={styles.tableCard}>
                    <div style={styles.tableWrapper}>
                        <table style={styles.table}>
                            <thead>
                                <tr>
                                    <th>Customer / Patient</th>
                                    <th>Contact Info</th>
                                    <th>Location & NIC</th>
                                    <th>Registered Date</th>
                                    <th>Prescriptions</th>
                                    <th>Pharmacy Orders</th>
                                    <th>Account Status</th>
                                    <th style={{ textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan="8" style={styles.emptyState}>
                                            <div className="spinner" />
                                            <p>Loading patient directory...</p>
                                        </td>
                                    </tr>
                                ) : filteredPatients.length === 0 ? (
                                    <tr>
                                        <td colSpan="8" style={styles.emptyState}>
                                            <Users size={40} color="#94A3B8" />
                                            <p style={{ fontWeight: 700, margin: '10px 0 4px' }}>No patients found</p>
                                            <span style={{ fontSize: '13px', color: '#64748B' }}>
                                                {searchTerm ? `No customer matching "${searchTerm}"` : 'New mobile app registrations will appear here.'}
                                            </span>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredPatients.map((p) => {
                                        const regDate = p.registeredAt ? new Date(p.registeredAt).toLocaleDateString() : 'N/A';
                                        return (
                                            <tr key={p.userId} style={styles.tr}>
                                                <td>
                                                    <div style={styles.patientNameWrap}>
                                                        <div style={styles.avatarCircle}>
                                                            {p.fullName.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <div style={styles.patientNameText}>{p.fullName}</div>
                                                            <div style={styles.patientIdText}>ID: #{p.userId}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div style={styles.contactWrap}>
                                                        <div style={styles.contactItem}><Mail size={13} /> {p.email}</div>
                                                        {p.phoneNumber && <div style={styles.contactItem}><Phone size={13} /> {p.phoneNumber}</div>}
                                                    </div>
                                                </td>
                                                <td>
                                                    <div style={styles.locationWrap}>
                                                        <span style={styles.cityText}>
                                                            <MapPin size={13} color="#059669" /> {p.city || p.address || 'Unspecified'}
                                                        </span>
                                                        {p.nicNumber && <span style={styles.nicText}>NIC: {p.nicNumber}</span>}
                                                    </div>
                                                </td>
                                                <td>
                                                    <span style={styles.dateText}>
                                                        <Calendar size={13} color="#64748B" /> {regDate}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span style={styles.countBadge}>
                                                        <FileText size={13} color="#D97706" /> {p.totalPrescriptions} Rx
                                                    </span>
                                                </td>
                                                <td>
                                                    <span style={styles.orderBadge}>
                                                        <ShoppingBag size={13} color="#2563EB" /> {p.totalOrders} Orders
                                                    </span>
                                                </td>
                                                <td>
                                                    {p.isActive ? (
                                                        <span style={styles.activeStatusBadge}>Active</span>
                                                    ) : (
                                                        <span style={styles.inactiveStatusBadge}>Deactivated</span>
                                                    )}
                                                </td>
                                                <td style={{ textAlign: 'right' }}>
                                                    <div style={styles.actionBtnsWrap}>
                                                        <button
                                                            style={styles.editActionBtn}
                                                            title="Edit Patient Profile"
                                                            onClick={() => handleOpenEdit(p)}
                                                        >
                                                            <Edit3 size={15} />
                                                        </button>
                                                        <button
                                                            style={{
                                                                ...styles.statusToggleBtn,
                                                                backgroundColor: p.isActive ? '#FEE2E2' : '#ECFDF5',
                                                                color: p.isActive ? '#DC2626' : '#059669',
                                                            }}
                                                            title={p.isActive ? 'Deactivate Account' : 'Activate Account'}
                                                            onClick={() => handleToggleStatus(p.userId, p.isActive)}
                                                        >
                                                            {p.isActive ? <UserX size={15} /> : <UserCheck size={15} />}
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
        </div>
    );
};

const styles = {
    container: {
        minHeight: '100vh',
        backgroundColor: '#F6FAF7',
        fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
    },
    toast: {
        position: 'fixed',
        top: '20px',
        right: '24px',
        color: '#FFFFFF',
        padding: '12px 20px',
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        fontWeight: 600,
        fontSize: '13.5px',
        zIndex: 2000,
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
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
    bannerGrid: {
        display: 'grid',
        gridTemplateColumns: '1.4fr 1fr',
        gap: '20px',
        marginBottom: '26px',
    },
    heroCard: {
        background: 'linear-gradient(135deg, #064E3B 0%, #065F46 60%, #059669 100%)',
        borderRadius: '20px',
        color: '#FFFFFF',
        padding: '28px 32px',
        display: 'flex',
        alignItems: 'center',
        boxShadow: '0 8px 24px rgba(6, 78, 59, 0.15)',
    },
    heroTag: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        background: 'rgba(255, 255, 255, 0.2)',
        padding: '4px 10px',
        borderRadius: '999px',
        fontSize: '11px',
        fontWeight: 700,
        marginBottom: '8px',
    },
    heroTitle: {
        fontSize: '22px',
        fontWeight: 800,
        margin: '0 0 6px 0',
    },
    heroSub: {
        fontSize: '13px',
        color: '#E6FFFA',
        lineHeight: 1.5,
        margin: 0,
    },
    statsCardGrid: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '12px',
    },
    statMiniCard: {
        background: '#FFFFFF',
        border: '1px solid #D1FAE5',
        borderRadius: '14px',
        padding: '14px 18px',
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        boxShadow: '0 2px 8px rgba(16, 185, 129, 0.04)',
    },
    statIconCircle: {
        width: '40px',
        height: '40px',
        borderRadius: '10px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    statMiniNum: {
        fontSize: '18px',
        fontWeight: 800,
        color: '#064E3B',
    },
    statMiniLabel: {
        fontSize: '11.5px',
        color: '#64748B',
        fontWeight: 600,
    },
    toolbarCard: {
        background: '#FFFFFF',
        border: '1px solid #D1FAE5',
        borderRadius: '16px',
        padding: '16px 20px',
        marginBottom: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        gap: '14px',
        boxShadow: '0 2px 8px rgba(16, 185, 129, 0.04)',
    },
    searchWrapper: {
        position: 'relative',
        flex: 1,
        maxWidth: '480px',
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
    filterGroup: {
        display: 'flex',
        gap: '6px',
    },
    filterBtn: {
        padding: '8px 16px',
        borderRadius: '8px',
        border: '1px solid #D1FAE5',
        background: '#FFFFFF',
        color: '#64748B',
        fontWeight: 600,
        fontSize: '13px',
        cursor: 'pointer',
    },
    filterBtnActive: {
        background: '#ECFDF5',
        borderColor: '#A7F3D0',
        color: '#047857',
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
        borderBottom: '1px solid #F1F5F9',
    },
    patientNameWrap: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '14px 18px',
    },
    avatarCircle: {
        width: '38px',
        height: '38px',
        borderRadius: '10px',
        background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
        color: '#FFFFFF',
        fontWeight: 800,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '15px',
    },
    patientNameText: {
        fontWeight: 700,
        color: '#0F172A',
        fontSize: '14px',
    },
    patientIdText: {
        fontSize: '11px',
        color: '#64748B',
    },
    contactWrap: {
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
    },
    contactItem: {
        fontSize: '12.5px',
        color: '#475569',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
    },
    locationWrap: {
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
    },
    cityText: {
        fontSize: '13px',
        fontWeight: 600,
        color: '#0F172A',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
    },
    nicText: {
        fontSize: '11px',
        color: '#64748B',
    },
    dateText: {
        fontSize: '12.5px',
        color: '#475569',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
    },
    countBadge: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 10px',
        borderRadius: '999px',
        background: '#FEF3C7',
        color: '#D97706',
        fontSize: '12px',
        fontWeight: 700,
    },
    orderBadge: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 10px',
        borderRadius: '999px',
        background: '#EFF6FF',
        color: '#2563EB',
        fontSize: '12px',
        fontWeight: 700,
    },
    activeStatusBadge: {
        padding: '4px 10px',
        borderRadius: '999px',
        background: '#ECFDF5',
        color: '#047857',
        fontSize: '12px',
        fontWeight: 700,
    },
    inactiveStatusBadge: {
        padding: '4px 10px',
        borderRadius: '999px',
        background: '#FEE2E2',
        color: '#B91C1C',
        fontSize: '12px',
        fontWeight: 700,
    },
    actionBtnsWrap: {
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '6px',
        paddingRight: '18px',
    },
    editActionBtn: {
        width: '32px',
        height: '32px',
        borderRadius: '8px',
        border: '1px solid #D1FAE5',
        background: '#ECFDF5',
        color: '#059669',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
    },
    statusToggleBtn: {
        width: '32px',
        height: '32px',
        borderRadius: '8px',
        border: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
    },
    emptyState: {
        textAlign: 'center',
        padding: '60px 20px',
        color: '#64748B',
    },
    modalOverlay: {
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(6, 78, 59, 0.45)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px',
    },
    modalCard: {
        background: '#FFFFFF',
        borderRadius: '20px',
        padding: '28px 32px',
        width: '100%',
        maxWidth: '540px',
        boxShadow: '0 24px 60px rgba(6, 78, 59, 0.25)',
        border: '1px solid #D1FAE5',
    },
    modalHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
    },
    modalTitleWrap: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
    },
    modalIcon: {
        width: '36px',
        height: '36px',
        borderRadius: '10px',
        background: '#ECFDF5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalTitle: {
        fontSize: '18px',
        fontWeight: 800,
        color: '#064E3B',
        margin: 0,
    },
    closeBtn: {
        background: 'none',
        border: 'none',
        color: '#64748B',
        cursor: 'pointer',
    },
    modalPatientHeader: {
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        padding: '12px 16px',
        background: '#F6FAF7',
        borderRadius: '12px',
        border: '1px solid #D1FAE5',
        marginBottom: '20px',
    },
    avatarLarge: {
        width: '44px',
        height: '44px',
        borderRadius: '12px',
        background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
        color: '#FFFFFF',
        fontWeight: 800,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '18px',
    },
    modalPatientName: {
        fontWeight: 800,
        color: '#064E3B',
        fontSize: '15px',
    },
    modalPatientEmail: {
        fontSize: '12.5px',
        color: '#64748B',
    },
    formGrid: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '14px',
    },
    formGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
    },
    formGroupFull: {
        gridColumn: 'span 2',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
    },
    formLabel: {
        fontSize: '11.5px',
        fontWeight: 700,
        color: '#064E3B',
        textTransform: 'uppercase',
    },
    input: {
        padding: '10px 14px',
        borderRadius: '8px',
        border: '1px solid #D1FAE5',
        fontSize: '13.5px',
        outline: 'none',
        fontFamily: 'inherit',
    },
    formActions: {
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '10px',
        marginTop: '22px',
    },
    cancelBtn: {
        padding: '10px 18px',
        borderRadius: '8px',
        border: '1px solid #E2E8F0',
        background: '#FFFFFF',
        color: '#64748B',
        fontWeight: 600,
        fontSize: '13px',
        cursor: 'pointer',
    },
    submitBtn: {
        padding: '10px 20px',
        borderRadius: '8px',
        border: 'none',
        background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
        color: '#FFFFFF',
        fontWeight: 700,
        fontSize: '13px',
        cursor: 'pointer',
    },
};

export default Patients;
