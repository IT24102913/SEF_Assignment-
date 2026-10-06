import React, { useState, useEffect } from 'react';
import api from '../../api/authApi';
import { useAuth } from '../../context/AuthContext';
import {
    User, Mail, Phone, MapPin, Shield, KeyRound,
    CheckCircle2, AlertTriangle, Lock, FileText, Calendar,
    Loader2
} from 'lucide-react';

const PatientProfileSection = ({ user: initialUser, showToast }) => {
    const { user } = useAuth();
    const currentUser = user || initialUser;

    const [profileData, setProfileData] = useState({
        fullName: currentUser?.fullName || '',
        email: currentUser?.email || '',
        phoneNumber: currentUser?.phoneNumber || '',
        address: currentUser?.address || '',
        city: currentUser?.city || '',
        nicNumber: currentUser?.nicNumber || currentUser?.nic || '',
        gender: currentUser?.gender || 'Male',
        dateOfBirth: currentUser?.dateOfBirth ? currentUser.dateOfBirth.split('T')[0] : '',
        bloodGroup: currentUser?.bloodGroup || 'Unknown',
        emergencyContactName: currentUser?.emergencyContactName || '',
        emergencyContactPhone: currentUser?.emergencyContactPhone || currentUser?.emergencyContact || '',
        allergies: currentUser?.allergies || '',
        patientCode: currentUser?.patientCode || ''
    });

    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    const [initialLoading, setInitialLoading] = useState(true);
    const [loading, setLoading] = useState(false);
    const [pwdLoading, setPwdLoading] = useState(false);
    const [phoneError, setPhoneError] = useState('');

    // Sri Lankan Telephone validation criteria:
    // Accept valid Sri Lankan phone number formats (e.g., +94 7X XXX XXXX, 07X XXX XXXX, or digits-only: 10 digits starting with 07, or 11/12 digits starting with +947 / 947).
    const validateSriLankanPhone = (val) => {
        if (!val || !val.trim()) {
            return 'Telephone number is required.';
        }
        const clean = val.replace(/[\s\-]/g, '');
        const sriLankanRegex = /^(?:\+94|0)?7[0-9]{8}$/;
        if (!sriLankanRegex.test(clean)) {
            return 'Please enter a valid Sri Lankan phone number, e.g., +94771234567 or 0771234567';
        }
        return '';
    };

    useEffect(() => {
        fetchProfile();
    }, [user?.id]);

    const fetchProfile = async () => {
        setInitialLoading(true);
        try {
            // First try authenticated /users/profile endpoint
            let data = null;
            try {
                const res = await api.get('/users/profile');
                if (res.data) data = res.data;
            } catch (err) {
                // Fallback to /Patients/{id} if needed
                if (user?.id) {
                    const fallbackRes = await api.get(`/Patients/${user.id}`);
                    if (fallbackRes.data) data = fallbackRes.data;
                }
            }

            if (data) {
                const resolvedPhone = data.phoneNumber || currentUser?.phoneNumber || '';
                setProfileData({
                    fullName: data.fullName || currentUser?.fullName || '',
                    email: data.email || currentUser?.email || '',
                    phoneNumber: resolvedPhone,
                    address: data.address || currentUser?.address || '',
                    city: data.city || currentUser?.city || '',
                    nicNumber: data.nicNumber || data.nic || currentUser?.nicNumber || currentUser?.nic || '',
                    gender: data.gender || currentUser?.gender || 'Male',
                    dateOfBirth: data.dateOfBirth ? data.dateOfBirth.split('T')[0] : '',
                    bloodGroup: data.bloodGroup || 'Unknown',
                    emergencyContactName: data.emergencyContactName || '',
                    emergencyContactPhone: data.emergencyContactPhone || data.emergencyContact || '',
                    allergies: data.allergies || '',
                    patientCode: data.patientCode || ''
                });

                if (resolvedPhone) {
                    setPhoneError(validateSriLankanPhone(resolvedPhone));
                }
            }
        } catch (err) {
            console.warn('Profile fetch warning:', err);
        } finally {
            setInitialLoading(false);
        }
    };

    const handlePhoneChange = (e) => {
        const val = e.target.value;
        setProfileData(prev => ({ ...prev, phoneNumber: val }));
        setPhoneError(validateSriLankanPhone(val));
    };

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        const err = validateSriLankanPhone(profileData.phoneNumber);
        if (err) {
            setPhoneError(err);
            showToast?.(err, 'error');
            return;
        }

        setLoading(true);
        try {
            await api.put('/users/profile', {
                phoneNumber: profileData.phoneNumber.trim(),
                address: profileData.address,
                city: profileData.city,
                gender: profileData.gender,
                dateOfBirth: profileData.dateOfBirth ? `${profileData.dateOfBirth}T00:00:00Z` : null,
                bloodGroup: profileData.bloodGroup,
                emergencyContact: profileData.emergencyContactPhone,
                emergencyContactName: profileData.emergencyContactName,
                emergencyContactPhone: profileData.emergencyContactPhone,
                allergies: profileData.allergies
            });

            // Update local session user
            const updatedUser = {
                ...user,
                phoneNumber: profileData.phoneNumber.trim(),
                address: profileData.address,
                city: profileData.city,
                nicNumber: profileData.nicNumber,
                gender: profileData.gender,
                dateOfBirth: profileData.dateOfBirth,
                bloodGroup: profileData.bloodGroup,
                emergencyContactName: profileData.emergencyContactName,
                emergencyContactPhone: profileData.emergencyContactPhone,
                allergies: profileData.allergies,
                patientCode: profileData.patientCode
            };
            localStorage.setItem('medix_user', JSON.stringify(updatedUser));

            showToast?.('Profile updated successfully!', 'success');
        } catch (err) {
            const msg = err.response?.data?.message ||
                (err.response?.data?.errors?.PhoneNumber?.[0]) ||
                'Failed to update profile details.';
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

    if (initialLoading) {
        return (
            <div style={{ padding: '40px 0', maxWidth: '850px', margin: '0 auto', textAlign: 'center' }}>
                <div style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '18px',
                    border: '1px solid #E2E8F0',
                    padding: '48px 24px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '16px'
                }}>
                    <Loader2 size={36} color="#0D9488" className="animate-spin" />
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>
                        Loading Verified Patient Profile...
                    </h3>
                    <p style={{ margin: 0, fontSize: '13px', color: '#64748B' }}>
                        Retrieving authenticated medical identity and secure contact records
                    </p>
                    {/* Skeleton UI blocks */}
                    <div style={{ width: '100%', maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
                        <div style={{ height: '42px', backgroundColor: '#F1F5F9', borderRadius: '8px' }} />
                        <div style={{ height: '42px', backgroundColor: '#F1F5F9', borderRadius: '8px' }} />
                        <div style={{ height: '42px', backgroundColor: '#F1F5F9', borderRadius: '8px' }} />
                    </div>
                </div>
            </div>
        );
    }

    const isSaveDisabled = loading || Boolean(phoneError) || !profileData.phoneNumber;

    return (
        <div style={{ padding: '24px 0', maxWidth: '850px', margin: '0 auto' }}>
            <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <h2 style={{ fontSize: '24px', fontWeight: 900, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
                        <User size={26} color="#0D9488" /> Patient Account & Profile Details
                    </h2>
                    <p style={{ fontSize: '14px', color: '#64748B', margin: '4px 0 0' }}>
                        Manage your verified medical profile, contact information & security credentials
                    </p>
                </div>
                {profileData.patientCode && (
                    <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '6px 16px',
                        backgroundColor: '#E6F5F2',
                        borderRadius: '20px',
                        border: '1.5px solid #CCE8E3',
                        color: '#095E51',
                        fontSize: '13.5px',
                        fontWeight: 800,
                        boxShadow: '0 2px 6px rgba(9,94,81,0.06)'
                    }}>
                        <span style={{ fontSize: '12px', color: '#0D7C6B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>EMR Record:</span>
                        <span>{profileData.patientCode}</span>
                    </div>
                )}
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
                                    value={profileData.nicNumber || 'Not Specified'}
                                    style={{
                                        width: '100%',
                                        padding: '10px 14px',
                                        borderRadius: '8px',
                                        border: '1.5px solid #E2E8F0',
                                        backgroundColor: profileData.nicNumber ? '#FEF3C7' : '#F8FAFC',
                                        color: profileData.nicNumber ? '#92400E' : '#94A3B8',
                                        fontSize: '14px',
                                        fontWeight: 800,
                                        cursor: 'not-allowed',
                                        letterSpacing: profileData.nicNumber ? '0.5px' : 'normal'
                                    }}
                                    title="NIC is tied to verified health records and cannot be altered"
                                />
                                <span style={{ fontSize: '11px', color: '#B45309', display: 'block', marginTop: '4px' }}>
                                    {profileData.nicNumber
                                        ? 'Identities are securely tied to medical history and cannot be altered.'
                                        : 'No NIC on file. Please contact hospital reception to verify.'}
                                </span>
                            </div>

                            <div>
                                <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#0F172A', display: 'block', marginBottom: '6px' }}>
                                    Telephone Number (Sri Lankan Format) *
                                </label>
                                <input
                                    type="tel"
                                    required
                                    value={profileData.phoneNumber}
                                    onChange={handlePhoneChange}
                                    placeholder="e.g. +94771234567 or 0771234567"
                                    style={{
                                        width: '100%',
                                        padding: '10px 14px',
                                        borderRadius: '8px',
                                        border: phoneError ? '1.5px solid #EF4444' : '1.5px solid #0D9488',
                                        fontSize: '14px',
                                        fontWeight: 600,
                                        outline: 'none',
                                        boxSizing: 'border-box'
                                    }}
                                />
                                {phoneError ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '5px', color: '#DC2626', fontSize: '11.5px', fontWeight: 600 }}>
                                        <AlertTriangle size={13} /> {phoneError}
                                    </div>
                                ) : (
                                    <span style={{ fontSize: '11px', color: '#64748B', display: 'block', marginTop: '4px' }}>
                                        Valid formats: 07XXXXXXXX or +947XXXXXXXX
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Medical Demographics: DOB & Gender */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '16px' }}>
                            <div>
                                <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#0F172A', display: 'block', marginBottom: '6px' }}>Date of Birth</label>
                                <input
                                    type="date"
                                    value={profileData.dateOfBirth}
                                    onChange={(e) => setProfileData({ ...profileData, dateOfBirth: e.target.value })}
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '14px', boxSizing: 'border-box' }}
                                />
                            </div>

                            <div>
                                <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#0F172A', display: 'block', marginBottom: '6px' }}>Gender</label>
                                <select
                                    value={profileData.gender}
                                    onChange={(e) => setProfileData({ ...profileData, gender: e.target.value })}
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '14px', backgroundColor: '#FFFFFF', boxSizing: 'border-box' }}
                                >
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                        </div>

                        {/* Blood Group & Allergies */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '16px' }}>
                            <div>
                                <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#0F172A', display: 'block', marginBottom: '6px' }}>Blood Group</label>
                                <select
                                    value={profileData.bloodGroup}
                                    onChange={(e) => setProfileData({ ...profileData, bloodGroup: e.target.value })}
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '14px', backgroundColor: '#FFFFFF', boxSizing: 'border-box' }}
                                >
                                    <option value="Unknown">Unknown</option>
                                    <option value="A+">A+</option>
                                    <option value="A-">A-</option>
                                    <option value="B+">B+</option>
                                    <option value="B-">B-</option>
                                    <option value="O+">O+</option>
                                    <option value="O-">O-</option>
                                    <option value="AB+">AB+</option>
                                    <option value="AB-">AB-</option>
                                </select>
                            </div>

                            <div>
                                <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#0F172A', display: 'block', marginBottom: '6px' }}>Known Allergies</label>
                                <input
                                    type="text"
                                    value={profileData.allergies}
                                    onChange={(e) => setProfileData({ ...profileData, allergies: e.target.value })}
                                    placeholder="e.g. Penicillin, Pollen (or None reported)"
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '14px', boxSizing: 'border-box' }}
                                />
                            </div>
                        </div>

                        {/* Address & City */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '16px' }}>
                            <div>
                                <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#0F172A', display: 'block', marginBottom: '6px' }}>Delivery / Residential Address *</label>
                                <input
                                    type="text"
                                    required
                                    value={profileData.address}
                                    onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
                                    placeholder="House No, Street Address..."
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '14px', boxSizing: 'border-box' }}
                                />
                            </div>

                            <div>
                                <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#0F172A', display: 'block', marginBottom: '6px' }}>City / Town</label>
                                <input
                                    type="text"
                                    value={profileData.city}
                                    onChange={(e) => setProfileData({ ...profileData, city: e.target.value })}
                                    placeholder="e.g. Colombo, Kandy"
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '14px', boxSizing: 'border-box' }}
                                />
                            </div>
                        </div>

                        {/* Emergency Contacts */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '20px' }}>
                            <div>
                                <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#0F172A', display: 'block', marginBottom: '6px' }}>Emergency Contact Name</label>
                                <input
                                    type="text"
                                    value={profileData.emergencyContactName}
                                    onChange={(e) => setProfileData({ ...profileData, emergencyContactName: e.target.value })}
                                    placeholder="e.g. Jane Doe"
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '14px', boxSizing: 'border-box' }}
                                />
                            </div>

                            <div>
                                <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#0F172A', display: 'block', marginBottom: '6px' }}>Emergency Contact Phone</label>
                                <input
                                    type="tel"
                                    value={profileData.emergencyContactPhone}
                                    onChange={(e) => setProfileData({ ...profileData, emergencyContactPhone: e.target.value })}
                                    placeholder="e.g. +94 71 987 6543"
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '14px', boxSizing: 'border-box' }}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <button
                                type="submit"
                                disabled={isSaveDisabled}
                                style={{
                                    backgroundColor: isSaveDisabled ? '#94A3B8' : '#0D9488',
                                    color: '#FFFFFF',
                                    padding: '12px 24px',
                                    borderRadius: '10px',
                                    border: 'none',
                                    fontWeight: 800,
                                    fontSize: '14px',
                                    cursor: isSaveDisabled ? 'not-allowed' : 'pointer',
                                    boxShadow: isSaveDisabled ? 'none' : '0 4px 14px rgba(13,148,136,0.35)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}
                            >
                                {loading && <Loader2 size={16} className="animate-spin" />}
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
                                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '14px', boxSizing: 'border-box' }}
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '20px' }}>
                            <div>
                                <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>New Password *</label>
                                <input
                                    type="password"
                                    required
                                    placeholder="Minimum 6 characters"
                                    value={passwordData.newPassword}
                                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '14px', boxSizing: 'border-box' }}
                                />
                            </div>

                            <div>
                                <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>Confirm New Password *</label>
                                <input
                                    type="password"
                                    required
                                    placeholder="Re-enter new password"
                                    value={passwordData.confirmPassword}
                                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '14px', boxSizing: 'border-box' }}
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
                                    boxShadow: '0 4px 14px rgba(2,132,199,0.35)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}
                            >
                                {pwdLoading && <Loader2 size={16} className="animate-spin" />}
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
