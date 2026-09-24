import React, { useState, useEffect } from 'react';
import { 
  Heart, ShieldAlert, Save, CheckCircle, AlertCircle, Loader, UserCheck
} from 'lucide-react';
import { emrApi } from '../../../api/emrApi';

const T = {
  primary: '#095e51',
  accent:  '#0d7c6b',
  light:   '#e6f5f2',
  border:  '#cce8e3',
  text:    '#0d2b27',
  muted:   '#4d7a73',
};

const inputStyle = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: '10px',
  border: '1.5px solid #cbd5e1',
  fontSize: '0.92rem',
  color: '#0f172a',
  outline: 'none',
  boxSizing: 'border-box',
  background: '#fff',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

export default function HealthPassport() {
  const rawUser = sessionStorage.getItem('user') || localStorage.getItem('hb_user') || localStorage.getItem('user') || '{}';
  const storedUser = JSON.parse(rawUser);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [patientCode, setPatientCode] = useState('');

  const [profile, setProfile] = useState({
    fullName: storedUser.fullName || storedUser.name || '',
    email: storedUser.email || '',
    contactPhone: '',
    dateOfBirth: '',
    gender: 'Other',
    bloodGroup: 'Unknown',
    address: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    allergies: '',
    chronicConditions: '',
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      // Use /me endpoint — gets the logged-in user's patient record
      const data = await emrApi.getMyPatient();
      setPatientCode(data.patientCode || '');
      setProfile({
        fullName: data.fullName || storedUser.fullName || '',
        email: data.email || storedUser.email || '',
        contactPhone: data.contactPhone || '',
        dateOfBirth: data.dateOfBirth ? data.dateOfBirth.split('T')[0] : '',
        gender: data.gender || 'Other',
        bloodGroup: data.bloodGroup || 'Unknown',
        address: data.address || '',
        emergencyContactName: data.emergencyContactName || '',
        emergencyContactPhone: data.emergencyContactPhone || '',
        allergies: data.allergies || '',
        chronicConditions: data.chronicConditions || '',
      });
    } catch (err) {
      // fallback: use stored user info
      setProfile(p => ({
        ...p,
        fullName: storedUser.fullName || storedUser.name || '',
        email: storedUser.email || '',
      }));
      setError('Could not load your medical profile from server. You can still fill in your details below.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field) => (e) => {
    setProfile(p => ({ ...p, [field]: e.target.value }));
    setError('');
    setSuccess('');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!patientCode) {
      setError('Patient record not loaded. Please refresh and try again.');
      return;
    }
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        fullName: profile.fullName,
        contactPhone: profile.contactPhone,
        email: profile.email,
        dateOfBirth: profile.dateOfBirth ? new Date(profile.dateOfBirth).toISOString() : null,
        gender: profile.gender,
        bloodGroup: profile.bloodGroup,
        address: profile.address,
        emergencyContactName: profile.emergencyContactName,
        emergencyContactPhone: profile.emergencyContactPhone,
        allergies: profile.allergies,
        chronicConditions: profile.chronicConditions,
      };

      await emrApi.updatePatientByCode(patientCode, payload);
      setSuccess('Medical profile updated successfully!');

      // Sync local storage
      const updatedUser = { ...storedUser, fullName: profile.fullName, name: profile.fullName };
      sessionStorage.setItem('user', JSON.stringify(updatedUser));
      localStorage.setItem('hb_user', JSON.stringify(updatedUser));
    } catch (err) {
      setError(err.message || 'Error saving profile. Please check server.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', color: T.muted }}>
        <Loader size={36} className="animate-spin" style={{ margin: '0 auto 12px' }} />
        <p>Loading your medical profile...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '880px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a', marginBottom: '4px', letterSpacing: '-0.3px' }}>
            Patient Medical Profile
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.95rem' }}>
            Manage your personal healthcare records, demographics, and emergency information.
          </p>
        </div>
        {patientCode && (
          <div style={{
            backgroundColor: T.light,
            border: `1.5px solid ${T.border}`,
            borderRadius: '12px',
            padding: '8px 16px',
            textAlign: 'right',
            flexShrink: 0,
          }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: T.muted, textTransform: 'uppercase' }}>Patient ID</div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: T.primary }}>{patientCode}</div>
          </div>
        )}
      </div>

      {/* Status Messages */}
      {success && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '14px 18px', marginBottom: '20px', color: '#16a34a', fontWeight: 600 }}>
          <CheckCircle size={18} />
          {success}
        </div>
      )}
      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '14px 18px', marginBottom: '20px', color: '#dc2626', fontWeight: 600 }}>
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {/* Account Info Card (Read-only) */}
      <div style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '18px',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
      }}>
        <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <UserCheck size={20} color={T.accent} /> Account Registration Details
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          <div style={{ padding: '14px 18px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', minWidth: 0 }}>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, marginBottom: '4px' }}>FULL NAME</div>
            <div style={{ fontSize: '0.98rem', fontWeight: 700, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={profile.fullName}>
              {profile.fullName || '—'}
            </div>
          </div>
          <div style={{ padding: '14px 18px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', minWidth: 0, gridColumn: 'span 1' }}>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, marginBottom: '4px' }}>EMAIL ADDRESS</div>
            <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0f172a', wordBreak: 'break-word', overflowWrap: 'break-word', whiteSpace: 'normal', lineHeight: '1.3' }} title={profile.email}>
              {profile.email || '—'}
            </div>
          </div>
          <div style={{ padding: '12px 16px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, marginBottom: '4px' }}>PHONE NUMBER</div>
            <div style={{ fontSize: '0.98rem', fontWeight: 700, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {profile.contactPhone || '—'}
            </div>
          </div>
          <div style={{ padding: '12px 16px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, marginBottom: '4px' }}>GENDER</div>
            <div style={{ fontSize: '0.98rem', fontWeight: 700, color: '#0f172a' }}>
              {profile.gender || '—'}
            </div>
          </div>
        </div>
      </div>

      {/* Editable Medical Details Form */}
      <form onSubmit={handleSave} style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '18px',
        padding: '28px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
      }}>
        <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Heart size={20} color={T.accent} /> Medical &amp; Emergency Information
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '20px' }}>
          {/* Date of Birth */}
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Date of Birth {!profile.dateOfBirth && <span style={{ fontWeight: 400, color: '#94a3b8' }}>(Not set — choose below)</span>}
            </label>
            <input type="date" value={profile.dateOfBirth} onChange={handleChange('dateOfBirth')} style={inputStyle} />
          </div>

          {/* Gender */}
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Gender</label>
            <select value={profile.gender} onChange={handleChange('gender')} style={inputStyle}>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Blood Group */}
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Blood Group</label>
            <select value={profile.bloodGroup} onChange={handleChange('bloodGroup')} style={inputStyle}>
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
        </div>

        {/* Address */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Residential Address</label>
          <input
            type="text"
            placeholder="e.g. 42 Main Street, Colombo 03"
            value={profile.address}
            onChange={handleChange('address')}
            style={inputStyle}
          />
        </div>

        {/* Emergency Contact */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Emergency Contact Name</label>
            <input
              type="text"
              placeholder="e.g. Amara Perera (Mother)"
              value={profile.emergencyContactName}
              onChange={handleChange('emergencyContactName')}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>Emergency Contact Phone</label>
            <input
              type="tel"
              placeholder="e.g. +94 77 123 4567"
              value={profile.emergencyContactPhone}
              onChange={handleChange('emergencyContactPhone')}
              style={inputStyle}
            />
          </div>
        </div>

        {/* Known Allergies */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
            Known Allergies <span style={{ fontWeight: 400, color: '#94a3b8' }}>(comma separated)</span>
          </label>
          <input
            type="text"
            placeholder="e.g. Penicillin, Peanuts, Sulfa antibiotics"
            value={profile.allergies}
            onChange={handleChange('allergies')}
            style={inputStyle}
          />
          <span style={{ fontSize: '0.76rem', color: '#94a3b8', marginTop: '4px', display: 'block' }}>
            These are cross-checked by the clinical safety engine against your prescribed medications.
          </span>
        </div>

        {/* Chronic Conditions */}
        <div style={{ marginBottom: '28px' }}>
          <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
            Chronic Conditions <span style={{ fontWeight: 400, color: '#94a3b8' }}>(comma separated)</span>
          </label>
          <input
            type="text"
            placeholder="e.g. Hypertension, Type 2 Diabetes"
            value={profile.chronicConditions}
            onChange={handleChange('chronicConditions')}
            style={inputStyle}
          />
        </div>

        {/* Save Button */}
        <button
          type="submit"
          disabled={saving}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            backgroundColor: saving ? T.muted : T.accent,
            color: '#ffffff',
            padding: '12px 28px',
            borderRadius: '12px',
            border: 'none',
            fontSize: '0.95rem',
            fontWeight: 700,
            cursor: saving ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.2s',
          }}
        >
          {saving ? (
            <><Loader size={18} className="animate-spin" /> Saving Changes...</>
          ) : (
            <><Save size={18} /> Save Medical Profile</>
          )}
        </button>
      </form>
    </div>
  );
}
