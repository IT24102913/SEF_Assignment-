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
    UserPlus,
    ArrowLeft,
    LogOut,
    CheckCircle2,
    AlertTriangle,
    X,
    Phone,
    Mail,
    Calendar,
    Clock,
    Shield,
    Edit3,
    Trash2,
    Stethoscope,
    Pill,
    FlaskConical,
    ShieldCheck,
    Building2,
    Check,
    RefreshCw
} from 'lucide-react';

const StaffManagement = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const [staffList, setStaffList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('ALL');
    const [statusFilter, setStatusFilter] = useState('ALL');

    // Modals
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedStaff, setSelectedStaff] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    // Toast
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

    // Forms
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        password: '',
        role: 'Doctor',
        department: '',
        specialization: '',
        availableDays: 'Mon, Wed, Fri',
        availableTime: '08:00 AM - 04:00 PM',
        phoneNumber: ''
    });

    const showToastMessage = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => {
            setToast({ show: false, message: '', type: 'success' });
        }, 3500);
    };

    const fetchStaff = async () => {
        setLoading(true);
        try {
            const res = await api.get('/Staff');
            setStaffList(res.data || []);
        } catch (err) {
            console.error('Failed to fetch staff members:', err);
            showToastMessage('Could not load staff records from server.', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStaff();
    }, []);

    // Filtered staff list
    const filteredStaff = useMemo(() => {
        return staffList.filter(s => {
            const term = searchTerm.toLowerCase();
            const matchesSearch =
                (s.fullName && s.fullName.toLowerCase().includes(term)) ||
                (s.email && s.email.toLowerCase().includes(term)) ||
                (s.department && s.department.toLowerCase().includes(term)) ||
                (s.specialization && s.specialization.toLowerCase().includes(term));

            const matchesRole = roleFilter === 'ALL' || s.role === roleFilter;
            const matchesStatus =
                statusFilter === 'ALL' ||
                (statusFilter === 'ACTIVE' && s.isActive) ||
                (statusFilter === 'SUSPENDED' && !s.isActive);

            return matchesSearch && matchesRole && matchesStatus;
        });
    }, [staffList, searchTerm, roleFilter, statusFilter]);

    // Statistics
    const stats = useMemo(() => {
        const total = staffList.length;
        const doctors = staffList.filter(s => s.role === 'Doctor').length;
        const pharmacists = staffList.filter(s => s.role === 'Pharmacist').length;
        const labOfficers = staffList.filter(s => s.role === 'Laboratory').length;
        const admins = staffList.filter(s => s.role === 'Admin').length;
        return { total, doctors, pharmacists, labOfficers, admins };
    }, [staffList]);

    // Handle Toggle Status
    const handleToggleStatus = async (staffMember) => {
        try {
            const res = await api.patch(`/Staff/${staffMember.id}/toggle-status`);
            showToastMessage(res.data.message || 'Staff status updated.');
            setStaffList(prev => prev.map(s => s.id === staffMember.id ? { ...s, isActive: !s.isActive } : s));
        } catch (err) {
            console.error('Failed to toggle status:', err);
            showToastMessage('Failed to update staff access.', 'error');
        }
    };

    // Handle Delete Staff
    const handleDeleteStaff = async (staffMember) => {
        if (!window.confirm(`Are you sure you want to permanently delete staff member "${staffMember.fullName}"?`)) {
            return;
        }

        try {
            await api.delete(`/Staff/${staffMember.id}`);
            showToastMessage(`Staff member ${staffMember.fullName} deleted.`);
            setStaffList(prev => prev.filter(s => s.id !== staffMember.id));
        } catch (err) {
            console.error('Failed to delete staff:', err);
            showToastMessage('Failed to delete staff member.', 'error');
        }
    };

    // Open Add Modal
    const handleOpenAddModal = () => {
        setFormData({
            fullName: '',
            email: '',
            password: '',
            role: 'Doctor',
            department: '',
            specialization: 'Cardiology',
            availableDays: 'Mon, Wed, Fri',
            availableTime: '08:00 AM - 04:00 PM',
            phoneNumber: '+94 77 '
        });
        setShowAddModal(true);
    };

    // Handle Add Submit
    const handleAddSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const payload = {
                fullName: formData.fullName.trim(),
                email: formData.email.trim(),
                password: formData.password,
                role: formData.role,
                department: formData.department.trim() || undefined,
                specialization: formData.role === 'Doctor' ? formData.specialization.trim() : undefined,
                availableDays: formData.role === 'Doctor' ? formData.availableDays : undefined,
                availableTime: formData.role === 'Doctor' ? formData.availableTime : undefined,
                phoneNumber: formData.phoneNumber.trim() || undefined
            };

            const res = await api.post('/Staff', payload);
            showToastMessage(`Staff member "${res.data.fullName}" added successfully!`);
            setShowAddModal(false);
            fetchStaff();
        } catch (err) {
            console.error('Failed to add staff:', err);
            const msg = err.response?.data?.message || 'Failed to create staff account.';
            showToastMessage(msg, 'error');
        } finally {
            setSubmitting(false);
        }
    };

    // Open Edit Modal
    const handleOpenEditModal = (staff) => {
        setSelectedStaff(staff);
        setFormData({
            fullName: staff.fullName || '',
            email: staff.email || '',
            role: staff.role || 'Doctor',
            department: staff.department || '',
            specialization: staff.specialization || '',
            availableDays: staff.availableDays || 'Mon, Wed, Fri',
            availableTime: staff.availableTime || '08:00 AM - 04:00 PM',
            phoneNumber: staff.phoneNumber || '',
            isActive: staff.isActive
        });
        setShowEditModal(true);
    };

    // Handle Edit Submit
    const handleEditSubmit = async (e) => {
        e.preventDefault();
        if (!selectedStaff) return;
        setSubmitting(true);
        try {
            const payload = {
                fullName: formData.fullName.trim(),
                role: formData.role,
                department: formData.department.trim() || undefined,
                specialization: formData.role === 'Doctor' ? formData.specialization.trim() : undefined,
                availableDays: formData.availableDays || undefined,
                availableTime: formData.availableTime || undefined,
                phoneNumber: formData.phoneNumber.trim() || undefined,
                isActive: formData.isActive
            };

            const res = await api.put(`/Staff/${selectedStaff.id}`, payload);
            showToastMessage(`Updated ${res.data.fullName}'s profile and roster!`);
            setShowEditModal(false);
            fetchStaff();
        } catch (err) {
            console.error('Failed to update staff:', err);
            const msg = err.response?.data?.message || 'Failed to update staff member.';
            showToastMessage(msg, 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const getRoleBadge = (role) => {
        switch (role) {
            case 'Doctor':
                return { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe', icon: Stethoscope };
            case 'Pharmacist':
                return { bg: '#faf5ff', color: '#7e22ce', border: '#e9d5ff', icon: Pill };
            case 'Laboratory':
                return { bg: '#fffbeb', color: '#b45309', border: '#fde68a', icon: FlaskConical };
            case 'Admin':
                return { bg: '#fef2f2', color: '#b91c1c', border: '#fecaca', icon: ShieldCheck };
            default:
                return { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1', icon: Users };
        }
    };

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', color: '#0f172a' }}>
            {/* Toast Notification */}
            {toast.show && (
                <div style={{
                    position: 'fixed',
                    top: '24px',
                    right: '24px',
                    zIndex: 9999,
                    backgroundColor: toast.type === 'error' ? '#ef4444' : '#10b981',
                    color: '#ffffff',
                    padding: '14px 20px',
                    borderRadius: '12px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    fontWeight: 600,
                    fontSize: '0.92rem'
                }}>
                    {toast.type === 'error' ? <AlertTriangle size={20} /> : <CheckCircle2 size={20} />}
                    {toast.message}
                </div>
            )}

            {/* Top Navigation Bar */}
            <header style={{
                backgroundColor: '#ffffff',
                borderBottom: '1px solid #e2e8f0',
                padding: '14px 32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                position: 'sticky',
                top: 0,
                zIndex: 40
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <button
                        onClick={() => navigate('/admin/dashboard')}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            backgroundColor: '#f1f5f9',
                            border: 'none',
                            padding: '8px 14px',
                            borderRadius: '10px',
                            color: '#475569',
                            fontWeight: 600,
                            fontSize: '0.88rem',
                            cursor: 'pointer'
                        }}
                    >
                        <ArrowLeft size={16} /> Back to Dashboard
                    </button>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <img src={logoImage} alt="HealthBridge" style={{ height: '32px' }} />
                        <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#095e51' }}>
                            HealthBridge <span style={{ color: '#dc2626', fontWeight: 600, fontSize: '0.9rem' }}>| Staff & Doctor Roster Management</span>
                        </span>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{user?.fullName || 'Administrator'}</div>
                        <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Super Admin Access</div>
                    </div>
                    <button
                        onClick={() => { logout(); navigate('/login'); }}
                        style={{
                            padding: '8px',
                            borderRadius: '10px',
                            border: '1px solid #e2e8f0',
                            backgroundColor: '#ffffff',
                            color: '#dc2626',
                            cursor: 'pointer'
                        }}
                        title="Logout"
                    >
                        <LogOut size={18} />
                    </button>
                </div>
            </header>

            {/* Main Content Container */}
            <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '32px 24px' }}>
                {/* Page Title & Add Button */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
                    <div>
                        <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0' }}>
                            Hospital Staff & Roster Management
                        </h1>
                        <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem' }}>
                            Control role-based permissions, doctor roster schedules, departments, and staff account security.
                        </p>
                    </div>

                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button
                            onClick={fetchStaff}
                            disabled={loading}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                backgroundColor: '#ffffff',
                                border: '1px solid #cbd5e1',
                                padding: '12px 18px',
                                borderRadius: '12px',
                                fontWeight: 600,
                                fontSize: '0.9rem',
                                color: '#334155',
                                cursor: 'pointer'
                            }}
                        >
                            <RefreshCw size={16} className={loading ? 'spin' : ''} /> Refresh
                        </button>

                        <button
                            onClick={handleOpenAddModal}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                backgroundColor: '#dc2626',
                                border: 'none',
                                color: '#ffffff',
                                padding: '12px 22px',
                                borderRadius: '12px',
                                fontWeight: 700,
                                fontSize: '0.92rem',
                                cursor: 'pointer',
                                boxShadow: '0 4px 12px rgba(220, 38, 38, 0.25)'
                            }}
                        >
                            <UserPlus size={18} /> Add New Staff Member
                        </button>
                    </div>
                </div>

                {/* 4 Stat Overview Cards */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                    gap: '20px',
                    marginBottom: '32px'
                }}>
                    <div style={{ backgroundColor: '#ffffff', padding: '20px 24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>TOTAL STAFF</span>
                            <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569' }}>
                                <Users size={20} />
                            </div>
                        </div>
                        <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a' }}>{stats.total}</div>
                        <span style={{ fontSize: '0.78rem', color: '#16a34a', fontWeight: 600 }}>Active Personnel</span>
                    </div>

                    <div style={{ backgroundColor: '#ffffff', padding: '20px 24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>DOCTORS / CONSULTANTS</span>
                            <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
                                <Stethoscope size={20} />
                            </div>
                        </div>
                        <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#2563eb' }}>{stats.doctors}</div>
                        <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Channeling Specialists</span>
                    </div>

                    <div style={{ backgroundColor: '#ffffff', padding: '20px 24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>PHARMACY & LAB</span>
                            <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: '#faf5ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9333ea' }}>
                                <Pill size={20} />
                            </div>
                        </div>
                        <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#9333ea' }}>{stats.pharmacists + stats.labOfficers}</div>
                        <span style={{ fontSize: '0.78rem', color: '#64748b' }}>{stats.pharmacists} Pharmacists • {stats.labOfficers} Lab Staff</span>
                    </div>

                    <div style={{ backgroundColor: '#ffffff', padding: '20px 24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>ADMINISTRATORS</span>
                            <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626' }}>
                                <ShieldCheck size={20} />
                            </div>
                        </div>
                        <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#dc2626' }}>{stats.admins}</div>
                        <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Full System Access</span>
                    </div>
                </div>

                {/* Filters & Search Bar */}
                <div style={{
                    backgroundColor: '#ffffff',
                    padding: '18px 24px',
                    borderRadius: '16px',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px',
                    marginBottom: '24px'
                }}>
                    {/* Search Field */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        backgroundColor: '#f8fafc',
                        border: '1.5px solid #cbd5e1',
                        borderRadius: '10px',
                        padding: '10px 14px',
                        minWidth: '320px',
                        flex: '1 1 320px'
                    }}>
                        <Search size={18} color="#64748b" />
                        <input
                            type="text"
                            placeholder="Search by staff name, email, department..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                border: 'none',
                                background: 'transparent',
                                outline: 'none',
                                width: '100%',
                                fontSize: '0.92rem',
                                color: '#0f172a'
                            }}
                        />
                        {searchTerm && (
                            <button onClick={() => setSearchTerm('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                                <X size={16} />
                            </button>
                        )}
                    </div>

                    {/* Filter Pills */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b', marginRight: '4px' }}>Role:</span>
                        {['ALL', 'Doctor', 'Pharmacist', 'Laboratory', 'Admin'].map(r => (
                            <button
                                key={r}
                                onClick={() => setRoleFilter(r)}
                                style={{
                                    padding: '6px 14px',
                                    borderRadius: '20px',
                                    border: roleFilter === r ? '1.5px solid #dc2626' : '1px solid #cbd5e1',
                                    backgroundColor: roleFilter === r ? '#fef2f2' : '#ffffff',
                                    color: roleFilter === r ? '#dc2626' : '#475569',
                                    fontWeight: 700,
                                    fontSize: '0.82rem',
                                    cursor: 'pointer'
                                }}
                            >
                                {r === 'ALL' ? 'All Roles' : r}
                            </button>
                        ))}

                        <div style={{ height: '24px', width: '1px', backgroundColor: '#e2e8f0', margin: '0 8px' }} />

                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            style={{
                                padding: '8px 12px',
                                borderRadius: '10px',
                                border: '1px solid #cbd5e1',
                                backgroundColor: '#ffffff',
                                fontSize: '0.85rem',
                                fontWeight: 600,
                                color: '#334155',
                                cursor: 'pointer'
                            }}
                        >
                            <option value="ALL">All Statuses</option>
                            <option value="ACTIVE">Active Only</option>
                            <option value="SUSPENDED">Suspended Only</option>
                        </select>
                    </div>
                </div>

                {/* Staff Directory Table */}
                <div style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '16px',
                    border: '1px solid #e2e8f0',
                    overflow: 'hidden',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.02)'
                }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1.5px solid #e2e8f0' }}>
                                <th style={{ padding: '16px 20px', fontSize: '0.82rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Staff Member</th>
                                <th style={{ padding: '16px 20px', fontSize: '0.82rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Role & Permissions</th>
                                <th style={{ padding: '16px 20px', fontSize: '0.82rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Department / Specialty</th>
                                <th style={{ padding: '16px 20px', fontSize: '0.82rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Roster / Available Schedule</th>
                                <th style={{ padding: '16px 20px', fontSize: '0.82rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Access Status</th>
                                <th style={{ padding: '16px 20px', fontSize: '0.82rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>

                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                                        Loading staff directory...
                                    </td>
                                </tr>
                            ) : filteredStaff.length === 0 ? (
                                <tr>
                                    <td colSpan="6" style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}>
                                        No staff members match the selected criteria.
                                    </td>
                                </tr>
                            ) : (
                                filteredStaff.map((staff) => {
                                    const badge = getRoleBadge(staff.role);
                                    const BadgeIcon = badge.icon;
                                    return (
                                        <tr key={staff.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s' }}>
                                            {/* Staff Name & Contact */}
                                            <td style={{ padding: '18px 20px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                                    <div style={{
                                                        width: '42px',
                                                        height: '42px',
                                                        borderRadius: '12px',
                                                        backgroundColor: badge.bg,
                                                        color: badge.color,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        fontWeight: 800,
                                                        fontSize: '1rem',
                                                        border: `1.5px solid ${badge.border}`
                                                    }}>
                                                        {staff.fullName.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div style={{ fontWeight: 700, fontSize: '0.98rem', color: '#0f172a' }}>
                                                            {staff.fullName}
                                                        </div>
                                                        <div style={{ fontSize: '0.82rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                                                            <Mail size={13} /> {staff.email}
                                                        </div>
                                                        {staff.phoneNumber && (
                                                            <div style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                <Phone size={12} /> {staff.phoneNumber}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Role Badge */}
                                            <td style={{ padding: '18px 20px' }}>
                                                <span style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    backgroundColor: badge.bg,
                                                    color: badge.color,
                                                    border: `1px solid ${badge.border}`,
                                                    padding: '4px 12px',
                                                    borderRadius: '20px',
                                                    fontSize: '0.82rem',
                                                    fontWeight: 700
                                                }}>
                                                    <BadgeIcon size={14} />
                                                    {staff.role}
                                                </span>
                                            </td>

                                            {/* Department / Specialty */}
                                            <td style={{ padding: '18px 20px' }}>
                                                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#334155' }}>
                                                    {staff.specialization || staff.department || 'General Staff'}
                                                </div>
                                                <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                                                    {staff.roomNumber || 'Main Facility'}
                                                </div>
                                            </td>

                                            {/* Roster Schedule */}
                                            <td style={{ padding: '18px 20px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: '#0f172a', fontWeight: 600 }}>
                                                    <Calendar size={14} color="#64748b" />
                                                    {staff.availableDays || 'Mon - Fri'}
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
                                                    <Clock size={13} />
                                                    {staff.availableTime || '08:00 AM - 04:00 PM'}
                                                </div>
                                            </td>

                                            {/* Status Badge */}
                                            <td style={{ padding: '18px 20px' }}>
                                                <button
                                                    onClick={() => handleToggleStatus(staff)}
                                                    style={{
                                                        backgroundColor: staff.isActive ? '#ecfdf5' : '#fef2f2',
                                                        color: staff.isActive ? '#059669' : '#dc2626',
                                                        border: staff.isActive ? '1px solid #a7f3d0' : '1px solid #fecaca',
                                                        padding: '4px 12px',
                                                        borderRadius: '20px',
                                                        fontSize: '0.8rem',
                                                        fontWeight: 700,
                                                        cursor: 'pointer',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '6px'
                                                    }}
                                                    title="Click to toggle status"
                                                >
                                                    {staff.isActive ? <UserCheck size={13} /> : <UserX size={13} />}
                                                    {staff.isActive ? 'Active' : 'Suspended'}
                                                </button>
                                            </td>

                                            {/* Actions */}
                                            <td style={{ padding: '18px 20px', textAlign: 'right' }}>
                                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                                    <button
                                                        onClick={() => handleOpenEditModal(staff)}
                                                        style={{
                                                            padding: '6px 12px',
                                                            backgroundColor: '#eff6ff',
                                                            border: '1px solid #bfdbfe',
                                                            color: '#2563eb',
                                                            borderRadius: '8px',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '6px',
                                                            fontSize: '0.82rem',
                                                            fontWeight: 600
                                                        }}
                                                    >
                                                        <Edit3 size={14} /> Edit Roster
                                                    </button>

                                                    <button
                                                        onClick={() => handleDeleteStaff(staff)}
                                                        style={{
                                                            padding: '6px 10px',
                                                            backgroundColor: '#fef2f2',
                                                            border: '1px solid #fecaca',
                                                            color: '#dc2626',
                                                            borderRadius: '8px',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center'
                                                        }}
                                                        title="Delete Staff Account"
                                                    >
                                                        <Trash2 size={14} />
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
            </main>

            {/* ADD STAFF MODAL */}
            {showAddModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.65)',
                    backdropFilter: 'blur(4px)',
                    zIndex: 999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px'
                }}>
                    <div style={{
                        backgroundColor: '#ffffff',
                        borderRadius: '20px',
                        width: '100%',
                        maxWidth: '560px',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                        overflow: 'hidden'
                    }}>
                        <div style={{
                            padding: '20px 24px',
                            borderBottom: '1px solid #e2e8f0',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            backgroundColor: '#f8fafc'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#dc2626', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <UserPlus size={18} />
                                </div>
                                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                                    Register New Staff Member
                                </h3>
                            </div>
                            <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleAddSubmit} style={{ padding: '24px', maxHeight: '80vh', overflowY: 'auto' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                                <div>
                                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>Full Name *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Dr. Maya Perera"
                                        value={formData.fullName}
                                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                        className="input-field"
                                        style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1.5px solid #cbd5e1' }}
                                    />
                                </div>

                                <div>
                                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>Role / Permission *</label>
                                    <select
                                        value={formData.role}
                                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                        style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1.5px solid #cbd5e1', backgroundColor: '#fff' }}
                                    >
                                        <option value="Doctor">Doctor (Consultant)</option>
                                        <option value="Pharmacist">Pharmacist</option>
                                        <option value="Laboratory">Laboratory Officer</option>
                                        <option value="Admin">Administrator</option>
                                    </select>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                                <div>
                                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>Login Email *</label>
                                    <input
                                        type="email"
                                        required
                                        placeholder="e.g. doctor.maya@medix.com"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1.5px solid #cbd5e1' }}
                                    />
                                </div>

                                <div>
                                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>Initial Password *</label>
                                    <input
                                        type="password"
                                        required
                                        placeholder="Min 6 characters"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1.5px solid #cbd5e1' }}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                                <div>
                                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>Department / Specialty</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Cardiology, In-House Pharmacy"
                                        value={formData.specialization || formData.department}
                                        onChange={(e) => setFormData({ ...formData, specialization: e.target.value, department: e.target.value })}
                                        style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1.5px solid #cbd5e1' }}
                                    />
                                </div>

                                <div>
                                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>Phone Contact</label>
                                    <input
                                        type="text"
                                        placeholder="+94 77 123 4567"
                                        value={formData.phoneNumber}
                                        onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                                        style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1.5px solid #cbd5e1' }}
                                    />
                                </div>
                            </div>

                            {/* Roster & Schedule Section */}
                            <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
                                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0f172a', marginBottom: '12px' }}>
                                    Roster Schedule & Availability
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                                    <div>
                                        <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>Available Days</label>
                                        <input
                                            type="text"
                                            value={formData.availableDays}
                                            onChange={(e) => setFormData({ ...formData, availableDays: e.target.value })}
                                            placeholder="e.g. Mon, Wed, Fri"
                                            style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>Shift Time Slots</label>
                                        <input
                                            type="text"
                                            value={formData.availableTime}
                                            onChange={(e) => setFormData({ ...formData, availableTime: e.target.value })}
                                            placeholder="e.g. 08:00 AM - 04:00 PM"
                                            style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    style={{ padding: '10px 18px', backgroundColor: '#f1f5f9', border: 'none', borderRadius: '10px', fontWeight: 600, cursor: 'pointer' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    style={{
                                        padding: '10px 22px',
                                        backgroundColor: '#dc2626',
                                        color: '#ffffff',
                                        border: 'none',
                                        borderRadius: '10px',
                                        fontWeight: 700,
                                        cursor: submitting ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    {submitting ? 'Creating Account...' : 'Register Staff Account'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* EDIT STAFF & ROSTER MODAL */}
            {showEditModal && selectedStaff && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.65)',
                    backdropFilter: 'blur(4px)',
                    zIndex: 999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px'
                }}>
                    <div style={{
                        backgroundColor: '#ffffff',
                        borderRadius: '20px',
                        width: '100%',
                        maxWidth: '560px',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                        overflow: 'hidden'
                    }}>
                        <div style={{
                            padding: '20px 24px',
                            borderBottom: '1px solid #e2e8f0',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            backgroundColor: '#f8fafc'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#2563eb', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Edit3 size={18} />
                                </div>
                                <div>
                                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                                        Edit Staff & Roster Schedule
                                    </h3>
                                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{selectedStaff.email}</span>
                                </div>
                            </div>
                            <button onClick={() => setShowEditModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleEditSubmit} style={{ padding: '24px', maxHeight: '80vh', overflowY: 'auto' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                                <div>
                                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>Full Name *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.fullName}
                                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                        style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1.5px solid #cbd5e1' }}
                                    />
                                </div>

                                <div>
                                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>Role / Permission *</label>
                                    <select
                                        value={formData.role}
                                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                        style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1.5px solid #cbd5e1', backgroundColor: '#fff' }}
                                    >
                                        <option value="Doctor">Doctor (Consultant)</option>
                                        <option value="Pharmacist">Pharmacist</option>
                                        <option value="Laboratory">Laboratory Officer</option>
                                        <option value="Admin">Administrator</option>
                                    </select>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                                <div>
                                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>Department / Specialty</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Cardiology, Pharmacy"
                                        value={formData.specialization || formData.department}
                                        onChange={(e) => setFormData({ ...formData, specialization: e.target.value, department: e.target.value })}
                                        style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1.5px solid #cbd5e1' }}
                                    />
                                </div>

                                <div>
                                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>Phone Contact</label>
                                    <input
                                        type="text"
                                        placeholder="+94 77 123 4567"
                                        value={formData.phoneNumber}
                                        onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                                        style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1.5px solid #cbd5e1' }}
                                    />
                                </div>
                            </div>

                            {/* Roster & Schedule Section */}
                            <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
                                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0f172a', marginBottom: '12px' }}>
                                    Roster Schedule & Availability
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                                    <div>
                                        <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>Available Days</label>
                                        <input
                                            type="text"
                                            value={formData.availableDays}
                                            onChange={(e) => setFormData({ ...formData, availableDays: e.target.value })}
                                            placeholder="e.g. Mon, Wed, Fri"
                                            style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>Shift Time Slots</label>
                                        <input
                                            type="text"
                                            value={formData.availableTime}
                                            onChange={(e) => setFormData({ ...formData, availableTime: e.target.value })}
                                            placeholder="e.g. 08:00 AM - 04:00 PM"
                                            style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                                <button
                                    type="button"
                                    onClick={() => setShowEditModal(false)}
                                    style={{ padding: '10px 18px', backgroundColor: '#f1f5f9', border: 'none', borderRadius: '10px', fontWeight: 600, cursor: 'pointer' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    style={{
                                        padding: '10px 22px',
                                        backgroundColor: '#2563eb',
                                        color: '#ffffff',
                                        border: 'none',
                                        borderRadius: '10px',
                                        fontWeight: 700,
                                        cursor: submitting ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    {submitting ? 'Saving Changes...' : 'Save Roster & Details'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StaffManagement;
