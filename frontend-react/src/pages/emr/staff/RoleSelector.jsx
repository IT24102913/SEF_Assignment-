import React, { useState } from 'react';
import { Stethoscope, Microscope, Pill, ShieldAlert, KeyRound, ArrowRight, Lock, CheckCircle2, AlertTriangle } from 'lucide-react';
import { emrApi } from '../../../api/emrApi';

export default function RoleSelector({ onLogin }) {
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
      authorizedNote: 'Authorized: Doctor or Admin only'
    },
    {
      id: 'Laboratorian',
      title: 'Laboratorian (Lab Staff)',
      icon: Microscope,
      accentColor: '#16a34a',
      bgColor: '#f0fdf4',
      authorizedNote: 'Authorized: Laboratorian or Admin only'
    },
    {
      id: 'Pharmacist',
      title: 'Pharmacist',
      icon: Pill,
      accentColor: '#9333ea',
      bgColor: '#faf5ff',
      authorizedNote: 'Authorized: Pharmacist or Admin only'
    },
    {
      id: 'Admin',
      title: 'Admin',
      icon: ShieldAlert,
      accentColor: '#ea580c',
      bgColor: '#fff7ed',
      authorizedNote: 'Authorized: Admin only'
    }
  ];

  const activeRoleConfig = roles.find(r => r.id === selectedRole) || roles[0];

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

    try {
      // Authenticate against backend staff login with strict role enforcement
      const res = await emrApi.staffLogin({
        staffIdOrEmail: staffId.trim(),
        password: password.trim(),
        targetRole: selectedRole
      });

      if (res.token) {
        sessionStorage.setItem('token', res.token);
      }
      if (res.user) {
        sessionStorage.setItem('user', JSON.stringify(res.user));
      }

      onLogin({
        role: selectedRole,
        staffId: res.staffId || res.user?.fullName || staffId.trim(),
        roleTitle: activeRoleConfig.title,
        accentColor: activeRoleConfig.accentColor,
        user: res.user
      });
    } catch (err) {
      setError(err.message || 'Invalid credentials. Please verify your Staff ID/Email and password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '860px', margin: '40px auto', padding: '0 20px' }}>
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#0d2b27', marginBottom: '8px' }}>
          Health Bridge Staff & Admin Portal
        </h1>
        <p style={{ color: '#4d7a73', fontSize: '1rem', maxWidth: '600px', margin: '0 auto' }}>
          Role-protected access: Staff can only log into portals matching their designated role or hospital administrator credentials.
        </p>
      </div>

      {/* 4 Role Selector Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '18px',
        marginBottom: '28px'
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
                flexDirection: 'column',
                gap: '8px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{
                    width: '42px',
                    height: '42px',
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
                    SELECTED
                  </span>
                )}
              </div>

              <div style={{ fontSize: '0.8rem', color: isSelected ? r.accentColor : '#64748b', fontWeight: 600, paddingLeft: '56px' }}>
                {r.authorizedNote}
              </div>
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <KeyRound size={20} color={activeRoleConfig.accentColor} />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
              Sign In as {selectedRole}
            </h2>
          </div>

          <span style={{
            fontSize: '0.78rem',
            backgroundColor: activeRoleConfig.bgColor,
            color: activeRoleConfig.accentColor,
            fontWeight: 700,
            padding: '4px 12px',
            borderRadius: '20px',
            border: `1px solid ${activeRoleConfig.accentColor}33`
          }}>
            {activeRoleConfig.authorizedNote}
          </span>
        </div>

        {error && (
          <div style={{ 
            backgroundColor: '#fef2f2', 
            border: '1.5px solid #fecaca', 
            color: '#dc2626', 
            padding: '14px 18px', 
            borderRadius: '12px', 
            fontSize: '0.92rem', 
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontWeight: 600
          }}>
            <AlertTriangle size={20} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="form-group">
            <label style={{ fontSize: '0.88rem', fontWeight: 600, color: '#334155', marginBottom: '6px', display: 'block' }}>
              {selectedRole} ID or Registered Staff Email
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
                backgroundColor: '#f8fafc',
                boxSizing: 'border-box'
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
              placeholder="Enter your account password"
              required
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '10px',
                border: '1.5px solid #cbd5e1',
                fontSize: '0.95rem',
                outline: 'none',
                backgroundColor: '#f8fafc',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: '4px',
              padding: '14px',
              backgroundColor: activeRoleConfig.accentColor,
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
            {loading ? 'Verifying Authorized Role...' : `Sign In to ${selectedRole} Portal`} <ArrowRight size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}
