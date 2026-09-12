import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Eye, EyeOff, Mail, Lock, User, Phone, Hash, AlertCircle, CheckCircle } from 'lucide-react';

const API_BASE = 'http://localhost:5238/api';

// ── Health Bridge teal palette (matches sidebar)
const T = {
  primary:    '#095e51',
  accent:     '#0d7c6b',
  light:      '#e6f5f2',
  lighter:    '#f2faf8',
  border:     '#cce8e3',
  text:       '#0d2b27',
  muted:      '#4d7a73',
  white:      '#ffffff',
};

export default function AuthPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('login');           // 'login' | 'signup'
  const [showPass, setShowPass]         = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');
  const [success, setSuccess]           = useState('');

  // Form fields
  const [form, setForm] = useState({ name: '', age: '', phoneNumber: '', email: '', password: '', confirm: '' });

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setError('');
    setSuccess('');
  };

  // ── Login ────────────────────────────────────────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) { setError('Please fill in all fields.'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, password: form.password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || 'Login failed. Please try again.'); return; }
      // Persist session
      localStorage.setItem('hb_token',  data.token);
      localStorage.setItem('hb_user',   JSON.stringify({
        id: data.userId,
        name: data.name,
        email: data.email,
        role: data.role,
        picture: data.profilePicture,
        patientCode: data.patientCode || 'PAT-1001',
        age: data.age,
        phoneNumber: data.phoneNumber
      }));
      navigate('/emr/overview', { replace: true });
    } catch {
      setError('Cannot reach server. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  // ── Sign Up ──────────────────────────────────────────────────────────────────
  const handleSignup = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password || !form.confirm) { setError('Please fill in all required fields.'); return; }
    if (form.password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (form.password !== form.confirm) { setError('Passwords do not match.'); return; }
    setLoading(true);
    setError('');
    try {
      const parsedAge = form.age ? parseInt(form.age, 10) : null;
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          age: parsedAge,
          phoneNumber: form.phoneNumber
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || 'Registration failed. Please try again.'); return; }
      // Auto-login after signup
      localStorage.setItem('hb_token', data.token);
      localStorage.setItem('hb_user',  JSON.stringify({
        id: data.userId,
        name: data.name,
        email: data.email,
        role: data.role,
        picture: data.profilePicture,
        patientCode: data.patientCode,
        age: data.age || parsedAge,
        phoneNumber: data.phoneNumber || form.phoneNumber
      }));
      setSuccess(`Welcome, ${data.name}! Redirecting to your medical overview…`);
      setTimeout(() => navigate('/emr/overview', { replace: true }), 1200);
    } catch {
      setError('Cannot reach server. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  // ── Shared field style ───────────────────────────────────────────────────────
  const inputWrap = { position: 'relative', marginBottom: '16px' };
  const iconStyle = { position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: T.muted, pointerEvents: 'none' };
  const inputStyle = {
    width: '100%', padding: '12px 14px 12px 42px',
    border: `1.5px solid ${T.border}`, borderRadius: '10px',
    fontSize: '0.92rem', color: T.text, background: T.lighter,
    outline: 'none', transition: 'border 0.2s',
    boxSizing: 'border-box',
  };
  const eyeStyle = { position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: T.muted, padding: 0, display: 'flex', alignItems: 'center' };

  return (
    <div style={{
      minHeight: '100vh',
      background: `linear-gradient(135deg, ${T.primary} 0%, ${T.accent} 50%, #0a9e87 100%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Inter', sans-serif", padding: '24px',
    }}>
      {/* ── Decorative circles */}
      <div style={{ position: 'fixed', top: '-80px', right: '-80px', width: '320px', height: '320px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: '-60px', left: '-60px', width: '240px', height: '240px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: '420px' }}>

        {/* ── Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '58px', height: '58px', borderRadius: '16px',
            background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 14px', border: '1.5px solid rgba(255,255,255,0.25)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
          }}>
            <Activity size={30} color="#ffffff" />
          </div>
          <h1 style={{ color: '#ffffff', fontSize: '1.8rem', fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>Health Bridge</h1>
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.88rem', margin: '6px 0 0', fontWeight: 500 }}>
            Patient EMR Portal
          </p>
        </div>

        {/* ── Card */}
        <div style={{
          background: T.white, borderRadius: '20px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)', overflow: 'hidden',
        }}>
          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: `1.5px solid ${T.border}` }}>
            {['login', 'signup'].map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setError(''); setSuccess(''); }}
                style={{
                  flex: 1, padding: '16px',
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: '0.92rem', fontWeight: 700,
                  color: tab === t ? T.accent : T.muted,
                  borderBottom: tab === t ? `3px solid ${T.accent}` : '3px solid transparent',
                  marginBottom: '-1.5px',
                  transition: 'all 0.2s',
                  textTransform: 'capitalize',
                }}
              >
                {t === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          <div style={{ padding: '28px 28px 24px' }}>

            {/* Error / Success banners */}
            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '12px 14px', marginBottom: '18px', color: '#dc2626', fontSize: '0.87rem' }}>
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                {error}
              </div>
            )}
            {success && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '12px 14px', marginBottom: '18px', color: '#16a34a', fontSize: '0.87rem' }}>
                <CheckCircle size={16} style={{ flexShrink: 0 }} />
                {success}
              </div>
            )}

            {/* ── LOGIN FORM */}
            {tab === 'login' && (
              <form onSubmit={handleLogin} autoComplete="on">
                <div style={inputWrap}>
                  <Mail size={17} style={iconStyle} />
                  <input type="email" placeholder="Email address" value={form.email} onChange={set('email')} style={inputStyle} autoComplete="email" required />
                </div>
                <div style={inputWrap}>
                  <Lock size={17} style={iconStyle} />
                  <input type={showPass ? 'text' : 'password'} placeholder="Password" value={form.password} onChange={set('password')} style={{ ...inputStyle, paddingRight: '44px' }} autoComplete="current-password" required />
                  <button type="button" style={eyeStyle} onClick={() => setShowPass(!showPass)} tabIndex={-1}>
                    {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%', padding: '13px',
                    background: loading ? T.muted : T.accent,
                    color: T.white, border: 'none', borderRadius: '10px',
                    fontSize: '0.95rem', fontWeight: 700,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    transition: 'background 0.2s', marginTop: '4px',
                  }}
                >
                  {loading ? 'Signing in…' : 'Sign In'}
                </button>

                <p style={{ textAlign: 'center', fontSize: '0.83rem', color: T.muted, marginTop: '18px' }}>
                  Don't have an account?{' '}
                  <button type="button" onClick={() => setTab('signup')} style={{ background: 'none', border: 'none', color: T.accent, fontWeight: 700, cursor: 'pointer', fontSize: '0.83rem' }}>
                    Create one
                  </button>
                </p>
              </form>
            )}

            {/* ── SIGNUP FORM */}
            {tab === 'signup' && (
              <form onSubmit={handleSignup} autoComplete="on">
                <div style={inputWrap}>
                  <User size={17} style={iconStyle} />
                  <input type="text" placeholder="Full name" value={form.name} onChange={set('name')} style={inputStyle} autoComplete="name" required />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
                  <div style={inputWrap}>
                    <Hash size={17} style={iconStyle} />
                    <input type="number" placeholder="Age" min="1" max="120" value={form.age} onChange={set('age')} style={inputStyle} required />
                  </div>
                  <div style={inputWrap}>
                    <Phone size={17} style={iconStyle} />
                    <input type="tel" placeholder="Phone number" value={form.phoneNumber} onChange={set('phoneNumber')} style={inputStyle} required />
                  </div>
                </div>
                <div style={inputWrap}>
                  <Mail size={17} style={iconStyle} />
                  <input type="email" placeholder="Email address" value={form.email} onChange={set('email')} style={inputStyle} autoComplete="email" required />
                </div>
                <div style={inputWrap}>
                  <Lock size={17} style={iconStyle} />
                  <input type={showPass ? 'text' : 'password'} placeholder="Password (min 6 chars)" value={form.password} onChange={set('password')} style={{ ...inputStyle, paddingRight: '44px' }} autoComplete="new-password" required />
                  <button type="button" style={eyeStyle} onClick={() => setShowPass(!showPass)} tabIndex={-1}>
                    {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
                <div style={{ ...inputWrap, marginBottom: '6px' }}>
                  <Lock size={17} style={iconStyle} />
                  <input type={showConfirm ? 'text' : 'password'} placeholder="Confirm password" value={form.confirm} onChange={set('confirm')} style={{ ...inputStyle, paddingRight: '44px' }} autoComplete="new-password" required />
                  <button type="button" style={eyeStyle} onClick={() => setShowConfirm(!showConfirm)} tabIndex={-1}>
                    {showConfirm ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%', padding: '13px',
                    background: loading ? T.muted : T.accent,
                    color: T.white, border: 'none', borderRadius: '10px',
                    fontSize: '0.95rem', fontWeight: 700,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    transition: 'background 0.2s', marginTop: '12px',
                  }}
                >
                  {loading ? 'Creating account…' : 'Create Account'}
                </button>

                <p style={{ textAlign: 'center', fontSize: '0.83rem', color: T.muted, marginTop: '18px' }}>
                  Already have an account?{' '}
                  <button type="button" onClick={() => setTab('login')} style={{ background: 'none', border: 'none', color: T.accent, fontWeight: 700, cursor: 'pointer', fontSize: '0.83rem' }}>
                    Sign in
                  </button>
                </p>
              </form>
            )}
          </div>
        </div>

        {/* ── Footer note */}
        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.55)', fontSize: '0.78rem', marginTop: '24px' }}>
          © 2026 Health Bridge · Secure Patient Portal
        </p>
      </div>
    </div>
  );
}
