import React, { useState } from 'react';
import { Stethoscope, Microscope, Pill, ShieldAlert, KeyRound, ArrowRight, Lock } from 'lucide-react';
import { login as apiLogin } from '../../../api/authApi';
import { useAuth } from '../../../context/AuthContext';

export default function RoleSelector({ onLogin }) {
  const { user: currentAuthUser } = useAuth();
  const [selectedRole, setSelectedRole] = useState('Consultant');
  const [staffId, setStaffId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const roles = [
    {
      id: 'Consultant',
      title: 'Consultant (Doctor)',
      icon: Stethoscope,
      accentColor: '#0d7c6b',
      bgColor: '#e6f5f2',
      matchingRole: 'Doctor'
    },
    {
      id: 'Laboratorian',
      title: 'Laboratorian (Lab Staff)',
      icon: Microscope,
      accentColor: '#16a34a',
      bgColor: '#f0fdf4',
      matchingRole: 'Laboratory'
    },
    {
      id: 'Pharmacist',
      title: 'Pharmacist',
      icon: Pill,
      accentColor: '#9333ea',
      bgColor: '#faf5ff',
      matchingRole: 'Pharmacist'
    },
    {
      id: 'Admin',
      title: 'Admin',
      icon: ShieldAlert,
      accentColor: '#ea580c',
      bgColor: '#fff7ed',
      matchingRole: 'Admin'
    }
  ];

  const handleRoleChange = (role) => {
    setSelectedRole(role.id);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!staffId.trim()) {
      setError(`Please enter your ${selectedRole} ID or registered staff email.`);
      return;
    }
    if (!password.trim()) {
      setError('Please enter your account password.');
      return;
    }

    setError('');
    setLoading(true);

    const activeRoleConfig = roles.find(r => r.id === selectedRole);

    try {
      // If user typed an email, authenticate directly against backend
      if (staffId.includes('@')) {
        const res = await apiLogin(staffId.trim(), password);
        const loggedUser = res.user;
        onLogin({
          role: selectedRole,
          staffId: loggedUser.fullName || loggedUser.email,
          roleTitle: activeRoleConfig.title,
          accentColor: activeRoleConfig.accentColor,
          user: loggedUser
        });
      } else {
        // Staff ID login (e.g. DOC-01, LAB-01, ADMIN-01)
        onLogin({
          role: selectedRole,
          staffId: staffId.trim(),
          roleTitle: activeRoleConfig.title,
          accentColor: activeRoleConfig.accentColor,
          user: currentAuthUser || null
        });
      }
    } catch (err) {
      // If authentication failed, display clean error
      setError(err.message || 'Invalid credentials. Please verify your Staff ID/Email and password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '840px', margin: '40px auto', padding: '0 20px' }}>
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#0d2b27', marginBottom: '8px' }}>
          Health Bridge Staff & Admin Portal
        </h1>
        <p style={{ color: '#4d7a73', fontSize: '1rem' }}>
          Select your authorized staff role and sign in with your credentials.
        </p>
      </div>

      {/* 4 Role Selector Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '18px',
        marginBottom: '32px'
      }}>
        {roles.map((r) => {
          const Icon = r.icon;
          const isSelected = selectedRole === r.id;
          return (
            <div
              key={r.id}
              onClick={() => handleRoleChange(r)}
              style={{
                backgroundColor: isSelected ? r.bgColor : '#ffffff',
                border: isSelected ? `2.5px solid ${r.accentColor}` : '2px solid #e2e8f0',
                borderRadius: '16px',
                padding: '18px 22px',
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: isSelected ? `0 8px 20px -4px ${r.accentColor}25` : '0 4px 6px -1px rgba(0,0,0,0.03)',
                display: 'flex',
                gap: '16px',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  backgroundColor: isSelected ? r.accentColor : r.bgColor,
                  color: isSelected ? '#ffffff' : r.accentColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Icon size={22} />
                </div>

                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0d2b27', margin: 0 }}>
                  {r.title}
                </h3>
              </div>

              {isSelected && (
                <span style={{ fontSize: '0.72rem', backgroundColor: r.accentColor, color: '#fff', fontWeight: 700, padding: '3px 10px', borderRadius: '10px' }}>
                  ACTIVE
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Staff Login Form Box */}
      <div style={{
        backgroundColor: '#ffffff',
        border: '1px solid #cbd5e1',
        borderRadius: '20px',
        padding: '32px',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px', borderBottom: '1px solid #f1f5f9', pb: '16px' }}>
          <KeyRound size={20} color="#2563eb" />
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a' }}>
            Sign In as {selectedRole}
          </h2>
        </div>

        {error && (
          <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '12px 16px', borderRadius: '10px', fontSize: '0.9rem', marginBottom: '20px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="form-group">
            <label style={{ fontSize: '0.88rem', fontWeight: 600, color: '#334155', marginBottom: '6px', display: 'block' }}>
              {selectedRole} ID or Staff Email
            </label>
            <input
              type="text"
              value={staffId}
              onChange={(e) => setStaffId(e.target.value)}
              placeholder={`Enter your ${selectedRole} ID or registered staff email`}
              required
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '10px',
                border: '1.5px solid #cbd5e1',
                fontSize: '0.95rem',
                outline: 'none',
                backgroundColor: '#f8fafc'
              }}
            />
          </div>

          <div className="form-group">
            <label style={{ fontSize: '0.88rem', fontWeight: 600, color: '#334155', marginBottom: '6px', display: 'block' }}>
              Account Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '10px',
                border: '1.5px solid #cbd5e1',
                fontSize: '0.95rem',
                outline: 'none',
                backgroundColor: '#f8fafc'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: '8px',
              padding: '14px',
              backgroundColor: roles.find(r => r.id === selectedRole)?.accentColor,
              color: '#ffffff',
              border: 'none',
              borderRadius: '12px',
              fontWeight: 700,
              fontSize: '1rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
              transition: 'transform 0.2s'
            }}
          >
            {loading ? 'Authenticating...' : `Access ${selectedRole} Portal`} <ArrowRight size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}
