import React, { useState, useEffect } from 'react';
import api from '../../api/authApi';
import {
    User, Mail, Phone, MapPin, Shield, KeyRound,
    CheckCircle2, AlertTriangle, Lock, FileText, Calendar
} from 'lucide-react';

const PatientProfileSection = ({ user, showToast }) => {
    const [profileData, setProfileData] = useState({
        fullName: user?.fullName || '',
        email: user?.email || '',
        phoneNumber: user?.phoneNumber || '',
        address: user?.address || '',
        city: user?.city || '',
        nicNumber: user?.nicNumber || '200114589210',
        gender: user?.gender || 'Male',
        dateOfBirth: user?.dateOfBirth ? user.dateOfBirth.split('T')[0] : '1998-05-14'
    });

    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    const [loading, setLoading] = useState(false);
    const [pwdLoading, setPwdLoading] = useState(false);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        if (!user?.id) return;
        try {
            const res = await api.get(`/Patients/${user.id}`);
            if (res.data) {
                setProfileData({
                    fullName: res.data.fullName || user.fullName || '',
                    email: res.data.email || user.email || '',
                    phoneNumber: res.data.phoneNumber || '',
                    address: res.data.address || '',
                    city: res.data.city || '',
                    nicNumber: res.data.nicNumber || '200114589210',
                    gender: res.data.gender || 'Male',
                    dateOfBirth: res.data.dateOfBirth ? res.data.dateOfBirth.split('T')[0] : '1998-05-14'
                });
            }
        } catch (err) {
            console.warn('Profile fetch warning:', err);
        }
    };

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.put(`/Patients/${user?.id || 1}`, {
                phoneNumber: profileData.phoneNumber,
                address: profileData.address,
                city: profileData.city,
                nicNumber: profileData.nicNumber, // immutable check handled backend side
                gender: profileData.gender
            });

            // update local session user
            const updatedUser = { ...user, phoneNumber: profileData.phoneNumber, address: profileData.address, city: profileData.city };
            localStorage.setItem('medix_user', JSON.stringify(updatedUser));

            showToast?.('Profile updated successfully!', 'success');
        } catch (err) {
            const msg = err.response?.data?.message || 'Failed to update profile details.';
            showToast?.(msg, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            showToast?.('New passwords do not match.', 'error');
            return;
        }
        if (passwordData.newPassword.length < 6) {
            showToast?.('New password must be at least 6 characters.', 'error');
            return;
        }

        setPwdLoading(true);
        try {
            await api.post('/Auth/change-password', {
                email: profileData.email,
                currentPassword: passwordData.currentPassword,
                newPassword: passwordData.newPassword
            });

            showToast?.('Password changed successfully!', 'success');
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (err) {
            const msg = err.response?.data?.message || 'Failed to change password. Please check your current password.';
            showToast?.(msg, 'error');
        } finally {
            setPwdLoading(false);
        }
    };

    return (
        <div style={{ padding: '24px 0', maxWidth: '850px', margin: '0 auto' }}>
            <div style={{ marginBottom: '24px' }}>
                <h2 style={{ fontSize: '24px', fontWeight: 900, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
                    <User size={26} color="#0D9488" /> Patient Account & Profile Details
                </h2>
                <p style={{ fontSize: '14px', color: '#64748B', margin: '4px 0 0' }}>
                    Manage your verified medical profile, contact information & security credentials
                </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
                {/* General Profile Card */}
                <div style={{ backgroundColor: '#FFFFFF', borderRadius: '18px', border: '1px solid #E2E8F0', padding: '28px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                    <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#0F172A', margin: '0 0 20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Shield size={20} color="#0D9488" /> Verified Personal Identity
                    </h3>

                    <form onSubmit={handleUpdateProfile}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '16px' }}>
                            <div>
                                <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>Full Legal Name</label>
                                <input
                                    type="text"
                                    disabled
                                    value={profileData.fullName}
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1', backgroundColor: '#F8FAFC', color: '#64748B', fontSize: '14px', fontWeight: 600 }}
                                />
                            </div>

                            <div>
                                <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>Email Address</label>
                                <input
                                    type="email"
                                    disabled
                                    value={profileData.email}
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1', backgroundColor: '#F8FAFC', color: '#64748B', fontSize: '14px', fontWeight: 600 }}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '16px' }}>
                            <div>
                                <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#0F172A', display: 'block', marginBottom: '6px' }}>
                                    NIC Number (Immutable & Read-Only) 🔒
                                </label>
                                <input
                                    type="text"
                                    disabled
                                    value={profileData.nicNumber}
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1.5px solid #E2E8F0', backgroundColor: '#FEF3C7', color: '#92400E', fontSize: '14px', fontWeight: 800, cursor: 'not-allowed' }}
                                    title="NIC cannot be modified once verified"
                                />
                                <span style={{ fontSize: '11px', color: '#B45309', display: 'block', marginTop: '4px' }}>Identities are tied to health records and cannot be altered.</span>
                            </div>

                            <div>
                                <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#0F172A', display: 'block', marginBottom: '6px' }}>Telephone Number *</label>
                                <input
                                    type="tel"
                                    required
                                    value={profileData.phoneNumber}
                                    onChange={(e) => setProfileData({ ...profileData, phoneNumber: e.target.value })}
                                    placeholder="e.g. 0764887396"
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1.5px solid #0D9488', fontSize: '14px', fontWeight: 600 }}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '20px' }}>
                            <div>
                                <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#0F172A', display: 'block', marginBottom: '6px' }}>Delivery Address *</label>
                                <input
                                    type="text"
                                    required
                                    value={profileData.address}
                                    onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
                                    placeholder="House No, Street Address..."
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '14px' }}
                                />
                            </div>

                            <div>
                                <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#0F172A', display: 'block', marginBottom: '6px' }}>City / Town</label>
                                <input
                                    type="text"
                                    value={profileData.city}
                                    onChange={(e) => setProfileData({ ...profileData, city: e.target.value })}
                                    placeholder="e.g. Colombo, Kandy"
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '14px' }}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <button
                                type="submit"
                                disabled={loading}
                                style={{
                                    backgroundColor: '#0D9488',
                                    color: '#FFFFFF',
                                    padding: '12px 24px',
                                    borderRadius: '10px',
                                    border: 'none',
                                    fontWeight: 800,
                                    fontSize: '14px',
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 14px rgba(13,148,136,0.35)'
                                }}
                            >
                                {loading ? 'Saving Changes...' : 'Save Profile Changes'}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Password Change Card */}
                <div style={{ backgroundColor: '#FFFFFF', borderRadius: '18px', border: '1px solid #E2E8F0', padding: '28px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                    <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#0F172A', margin: '0 0 20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <KeyRound size={20} color="#0284C7" /> Security & Password Update
                    </h3>

                    <form onSubmit={handleChangePassword}>
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>Current Password *</label>
                            <input
                                type="password"
                                required
                                placeholder="Enter current password"
                                value={passwordData.currentPassword}
                                onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '14px' }}
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '20px' }}>
                            <div>
                                <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>New Password *</label>
                                <input
                                    type="password"
                                    required
                                    placeholder="At least 6 characters"
                                    value={passwordData.newPassword}
                                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '14px' }}
                                />
                            </div>

                            <div>
                                <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>Confirm New Password *</label>
                                <input
                                    type="password"
                                    required
                                    placeholder="Re-type new password"
                                    value={passwordData.confirmPassword}
                                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '14px' }}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <button
                                type="submit"
                                disabled={pwdLoading}
                                style={{
                                    backgroundColor: '#0284C7',
                                    color: '#FFFFFF',
                                    padding: '12px 24px',
                                    borderRadius: '10px',
                                    border: 'none',
                                    fontWeight: 800,
                                    fontSize: '14px',
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 14px rgba(2,132,199,0.35)'
                                }}
                            >
                                {pwdLoading ? 'Updating Password...' : 'Update Password'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default PatientProfileSection;
