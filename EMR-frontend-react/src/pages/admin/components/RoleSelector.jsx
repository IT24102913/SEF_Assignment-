import React, { useState } from 'react';
import { Stethoscope, Microscope, Pill, ShieldAlert, KeyRound, UserCheck, ArrowRight } from 'lucide-react';

export default function RoleSelector({ onLogin }) {
  const [selectedRole, setSelectedRole] = useState('Consultant');
  const [staffId, setStaffId] = useState('DOC-101');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');

  const roles = [
    {
      id: 'Consultant',
      title: 'Consultant (Doctor)',
      description: 'Diagnosis, consultation notes, test ordering & prescription authoring.',
      icon: Stethoscope,
      accentColor: '#2563eb',
      bgColor: '#eff6ff',
      defaultId: 'DOC-101'
    },
    {
      id: 'Laboratorian',
      title: 'Laboratorian (Lab Tech)',
      description: 'Upload lab report results, titles, dates & status updates.',
      icon: Microscope,
      accentColor: '#16a34a',
      bgColor: '#f0fdf4',
      defaultId: 'LAB-202'
    },
    {
      id: 'Pharmacist',
      title: 'Pharmacist',
      description: 'Dispense medications, pricing, dosage instructions & auto-status.',
      icon: Pill,
      accentColor: '#9333ea',
      bgColor: '#faf5ff',
      defaultId: 'PHARM-303'
    },
    {
      id: 'Admin',
      title: 'Super Admin',
      description: 'Full CRUD management over all medical records, lab reports & staff data.',
      icon: ShieldAlert,
      accentColor: '#ea580c',
      bgColor: '#fff7ed',
      defaultId: 'ADMIN-001'
    }
  ];

  const handleRoleChange = (role) => {
    setSelectedRole(role.id);
    setStaffId(role.defaultId);
    setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!staffId.trim() || !password.trim()) {
      setError('Please enter your Staff ID and Password.');
      return;
    }
    setError('');
    const activeRoleConfig = roles.find(r => r.id === selectedRole);
    onLogin({
      role: selectedRole,
      staffId: staffId.trim(),
      roleTitle: activeRoleConfig.title,
      accentColor: activeRoleConfig.accentColor
    });
  };

  return (
    <div style={{ maxWidth: '840px', margin: '40px auto', padding: '0 20px' }}>
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
          Hospital Staff & Admin Portal
        </h1>
        <p style={{ color: '#64748b', fontSize: '1rem' }}>
          Select your authorized staff role and sign in with your credentials.
        </p>
      </div>

      {/* 4 Role Selector Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '20px',
        marginBottom: '36px'
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
                padding: '24px',
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: isSelected ? `0 8px 20px -4px ${r.accentColor}25` : '0 4px 6px -1px rgba(0,0,0,0.03)',
                display: 'flex',
                gap: '16px',
                alignItems: 'flex-start'
              }}
            >
              <div style={{
                width: '46px',
                height: '46px',
                borderRadius: '12px',
                backgroundColor: isSelected ? r.accentColor : r.bgColor,
                color: isSelected ? '#ffffff' : r.accentColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Icon size={24} />
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>{r.title}</h3>
                  {isSelected && (
                    <span style={{ fontSize: '0.72rem', backgroundColor: r.accentColor, color: '#fff', fontWeight: 600, padding: '2px 8px', borderRadius: '10px' }}>
                      ACTIVE
                    </span>
                  )}
                </div>
                <p style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: 1.45 }}>{r.description}</p>
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
              {selectedRole} ID Number
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={staffId}
                onChange={(e) => setStaffId(e.target.value)}
                placeholder={`Enter your ${selectedRole} ID`}
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
            <span style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '4px', display: 'block' }}>
              Demo ID: <code>{roles.find(r => r.id === selectedRole)?.defaultId}</code>
            </span>
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
            style={{
              marginTop: '8px',
              padding: '14px',
              backgroundColor: roles.find(r => r.id === selectedRole)?.accentColor,
              color: '#ffffff',
              border: 'none',
              borderRadius: '12px',
              fontWeight: 700,
              fontSize: '1rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
              transition: 'transform 0.2s'
            }}
          >
            Access {selectedRole} Portal <ArrowRight size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}
