import React, { useState, useEffect } from 'react';
import { 
  Heart, ShieldAlert, Save, CheckCircle, AlertCircle, Loader, UserCheck, CreditCard
} from 'lucide-react';
import { emrApi } from '../../../api/emrApi';
import api from '../../../api/authApi';

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
    contactPhone: storedUser.phoneNumber || storedUser.contactPhone || '',
    nicNumber: storedUser.nicNumber || '',
    dateOfBirth: '',
    gender: storedUser.gender || 'Other',
    bloodGroup: 'Unknown',
    address: storedUser.address || '',
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
    setError('');
    try {
      // 1. Fetch EMR patient record using getMyPatient (with fallback patientCode & email)
      const data = await emrApi.getMyPatient(storedUser.patientCode, storedUser.email);
      const code = data.patientCode || storedUser.patientCode || '';
      setPatientCode(code);

      let nic = data.nicNumber || storedUser.nicNumber || '';
      let phone = data.contactPhone || storedUser.phoneNumber || storedUser.contactPhone || '';
      let addr = data.address || storedUser.address || '';
      let dob = data.dateOfBirth ? data.dateOfBirth.split('T')[0] : '';
      let gen = (data.gender && data.gender !== 'Other') ? data.gender : (storedUser.gender || 'Other');

      // 2. Cross-reference normal profile if any primary demographic is missing
      if (!nic || !phone || !addr || !dob) {
        try {
          const res = await api.get('/Patients');
          const list = res.data?.value || res.data || [];
          const match = list.find(p => 
            (p.email && p.email.toLowerCase() === (data.email || storedUser.email || '').toLowerCase()) ||
            p.userId === storedUser.id ||
            p.id === storedUser.id
          );
          if (match) {
            if (!nic && match.nicNumber) nic = match.nicNumber;
            if (!phone && match.phoneNumber) phone = match.phoneNumber;
            if ((!gen || gen === 'Other') && match.gender) gen = match.gender;
            if (!addr && (match.address || match.city)) {
              addr = [match.address, match.city].filter(Boolean).join(', ');
            }
            if (!dob && match.dateOfBirth) {
              dob = match.dateOfBirth.split('T')[0];
            }
          }
        } catch (normErr) {
          console.warn('Could not sync with supplementary profile:', normErr);
        }
      }

      setProfile({
        fullName: data.fullName || storedUser.fullName || storedUser.name || '',
        email: data.email || storedUser.email || '',
        contactPhone: phone,
        nicNumber: nic,
        dateOfBirth: dob,
        gender: gen,
        bloodGroup: data.bloodGroup || 'Unknown',
        address: addr,
        emergencyContactName: data.emergencyContactName || '',
        emergencyContactPhone: data.emergencyContactPhone || '',
        allergies: data.allergies || '',
        chronicConditions: data.chronicConditions || '',
      });
    } catch (err) {
      // Direct fallback to normal profile
      try {
        const res = await api.get('/Patients');
        const list = res.data?.value || res.data || [];
        const match = list.find(p => 
          (p.email && p.email.toLowerCase() === (storedUser.email || '').toLowerCase()) ||
          p.userId === storedUser.id
        );
        if (match) {
          setProfile({
            fullName: match.fullName || storedUser.fullName || storedUser.name || '',
            email: match.email || storedUser.email || '',
            contactPhone: match.phoneNumber || '',
            nicNumber: match.nicNumber || '',
            dateOfBirth: match.dateOfBirth ? match.dateOfBirth.split('T')[0] : '',
            gender: match.gender || 'Other',
            bloodGroup: 'Unknown',
            address: [match.address, match.city].filter(Boolean).join(', '),
            emergencyContactName: match.emergencyContact || '',
            emergencyContactPhone: '',
            allergies: '',
            chronicConditions: '',
          });
          if (storedUser.patientCode) setPatientCode(storedUser.patientCode);
          return;
        }
      } catch {}

      setProfile(p => ({
        ...p,
        fullName: storedUser.fullName || storedUser.name || '',
        email: storedUser.email || '',
        contactPhone: storedUser.phoneNumber || '',
        nicNumber: storedUser.nicNumber || '',
      }));
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
        nicNumber: profile.nicNumber,
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

      // Sync local session user
      const updatedUser = { 
        ...storedUser, 
        fullName: profile.fullName, 
        name: profile.fullName,
        phoneNumber: profile.contactPhone,
        contactPhone: profile.contactPhone,
        nicNumber: profile.nicNumber,
        gender: profile.gender,
        address: profile.address
      };
      sessionStorage.setItem('user', JSON.stringify(updatedUser));
      // Keep sessionStorage in sync — this is the only key the auth system reads

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
        border: '1.5px solid #cbd5e1',
        borderRadius: '18px',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 4px 16px -2px rgba(15, 23, 42, 0.08), 0 2px 4px -1px rgba(15, 23, 42, 0.04)',
      }}>
        <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <UserCheck size={20} color={T.accent} /> Account Registration Details
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div style={{ padding: '14px 18px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1.5px solid #cbd5e1', minWidth: 0 }}>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, marginBottom: '4px' }}>FULL NAME</div>
            <div style={{ fontSize: '0.98rem', fontWeight: 800, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={profile.fullName}>
              {profile.fullName || '—'}
            </div>
          </div>
          <div style={{ padding: '14px 18px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1.5px solid #cbd5e1', minWidth: 0 }}>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, marginBottom: '4px' }}>EMAIL ADDRESS</div>
            <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a', wordBreak: 'break-word', overflowWrap: 'break-word', whiteSpace: 'normal', lineHeight: '1.3' }} title={profile.email}>
              {profile.email || '—'}
            </div>
          </div>
          <div style={{ padding: '14px 18px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1.5px solid #cbd5e1' }}>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, marginBottom: '4px' }}>PHONE NUMBER</div>
            <div style={{ fontSize: '0.98rem', fontWeight: 800, color: profile.contactPhone ? '#0f172a' : '#94a3b8' }}>
              {profile.contactPhone || '—'}
            </div>
          </div>
          <div style={{ padding: '14px 18px', backgroundColor: '#f0fdf9', borderRadius: '12px', border: '1.5px solid #6ee7b7' }}>
            <div style={{ fontSize: '0.75rem', color: '#0d7c6b', fontWeight: 800, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CreditCard size={14} color="#0d7c6b" /> NATIONAL ID (NIC)
            </div>
            <div style={{ fontSize: '0.98rem', fontWeight: 900, color: profile.nicNumber ? '#095e51' : '#94a3b8', letterSpacing: profile.nicNumber ? '0.5px' : 'normal' }}>
              {profile.nicNumber || '—'}
            </div>
          </div>
          <div style={{ padding: '14px 18px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1.5px solid #cbd5e1' }}>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, marginBottom: '4px' }}>GENDER</div>
            <div style={{ fontSize: '0.98rem', fontWeight: 800, color: '#0f172a' }}>
              {profile.gender || '—'}
            </div>
          </div>
        </div>
      </div>

      {/* Editable Medical Details Form */}
      <form onSubmit={handleSave} style={{
        backgroundColor: '#ffffff',
        border: '1.5px solid #cbd5e1',
        borderRadius: '18px',
        padding: '28px',
        boxShadow: '0 4px 16px -2px rgba(15, 23, 42, 0.08), 0 2px 4px -1px rgba(15, 23, 42, 0.04)',
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
