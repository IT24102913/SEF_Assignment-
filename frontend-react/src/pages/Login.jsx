import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { register as apiRegister } from '../api/authApi';
import loginBg from '../assets/hut.png';
import logoImg from '../assets/mediz.png';
import {
    Mail, Lock, Eye, EyeOff, ShieldCheck, User,
    Phone, CreditCard, ChevronDown, CheckCircle,
    XCircle, AlertCircle, Loader2
} from 'lucide-react';

/* ─── Validation helpers ──────────────────────────────────────── */
const validate = {
    fullName: (v) => v.trim().length >= 2 ? '' : 'Full name must be at least 2 characters.',
    email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? '' : 'Enter a valid email address (must contain @).',
    phone: (v) => /^\d{10}$/.test(v.trim()) ? '' : 'Phone number must be exactly 10 digits.',
    nic: (v) => /^(\d{9}[VvXx]|\d{12})$/.test(v.trim()) ? '' : 'Enter a valid NIC (e.g. 199012345678 or 901234567V).',
    gender: (v) => ['Male', 'Female', 'Prefer not to say'].includes(v) ? '' : 'Please select a gender.',
    password: (v) => v.length >= 6 ? '' : 'Password must be at least 6 characters.',
    confirmPassword: (v, pw) => v === pw ? '' : 'Passwords do not match.',
};

/* ─── Styles (defined FIRST so Field component can reference them) ── */
const s = {
    // Fixed background — does NOT move when card grows taller
    bgFixed: {
        position: 'fixed',
        inset: 0,
        backgroundImage: `url(${loginBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        zIndex: 0,
    },
    // Scrollable overlay on top of fixed bg
    container: {
        position: 'relative',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        zIndex: 1,
    },
    ambientTop: {
        position: 'fixed', top: '-10%', right: '10%',
        width: '350px', height: '350px',
        background: 'radial-gradient(circle, rgba(0,150,136,0.25) 0%, transparent 70%)',
        borderRadius: '50%', pointerEvents: 'none', zIndex: 1,
    },
    ambientBottom: {
        position: 'fixed', bottom: '-10%', left: '10%',
        width: '350px', height: '350px',
        background: 'radial-gradient(circle, rgba(0,150,136,0.2) 0%, transparent 70%)',
        borderRadius: '50%', pointerEvents: 'none', zIndex: 1,
    },
    card: {
        backgroundColor: 'rgba(255,255,255,0.88)',
        backdropFilter: 'blur(22px)',
        WebkitBackdropFilter: 'blur(22px)',
        border: '1.5px solid rgba(0,150,136,0.25)',
        borderRadius: '24px',
        padding: '36px 34px',
        width: '100%',
        maxWidth: '500px',
        boxShadow: '0 24px 60px -10px rgba(0,0,0,0.2), 0 0 0 1px rgba(255,255,255,0.6) inset',
        position: 'relative',
        zIndex: 10,
    },
    logoSection: { textAlign: 'center', marginBottom: '20px' },
    logo: { height: '60px', objectFit: 'contain', display: 'block', margin: '0 auto 10px' },
    brand: { margin: '0 0 4px', fontSize: '22px', fontWeight: 800, color: '#004D40', letterSpacing: '-0.5px' },
    subtitle: {
        display: 'inline-block', padding: '3px 14px',
        background: 'rgba(0,150,136,0.08)', border: '1px solid #B2DFDB',
        borderRadius: '999px', fontSize: '12px', fontWeight: 600, color: '#00695C',
    },
    tabRow: {
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px',
        background: 'rgba(0,150,136,0.07)', border: '1px solid #B2DFDB',
        borderRadius: '14px', padding: '5px', marginBottom: '22px',
    },
    tab: {
        padding: '10px 0', borderRadius: '10px', border: 'none',
        background: 'transparent', fontSize: '14px', fontWeight: 600,
        color: '#64748B', cursor: 'pointer', transition: 'all 0.2s ease',
        fontFamily: 'inherit',
    },
    tabActive: {
        background: '#FFFFFF', color: '#004D40', fontWeight: 700,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    },
    form: { display: 'flex', flexDirection: 'column', gap: '14px' },
    twoCol: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' },
    inputGroup: { display: 'flex', flexDirection: 'column', gap: '5px' },
    label: {
        fontSize: '12px', fontWeight: 700, color: '#004D40',
        textTransform: 'uppercase', letterSpacing: '0.35px',
    },
    inputWrapper: { position: 'relative', display: 'flex', alignItems: 'center' },
    inputIcon: { position: 'absolute', left: '13px', color: '#009688', pointerEvents: 'none', flexShrink: 0 },
    input: {
        width: '100%', padding: '11px 14px',
        borderRadius: '11px', border: '1.5px solid #B2DFDB',
        fontSize: '13.5px', backgroundColor: 'rgba(255,255,255,0.9)',
        color: '#0F172A', outline: 'none',
        transition: 'border-color 0.2s, box-shadow 0.2s',
        fontFamily: 'inherit',
        boxSizing: 'border-box',
    },
    eyeBtn: {
        position: 'absolute', right: '11px', background: 'none',
        border: 'none', display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '3px',
    },
    fieldError: {
        display: 'flex', alignItems: 'center', gap: '5px',
        fontSize: '11px', color: '#DC2626', fontWeight: 600, marginTop: '2px',
    },
    fieldOk: {
        display: 'flex', alignItems: 'center', gap: '5px',
        fontSize: '11px', color: '#059669', fontWeight: 600, marginTop: '2px',
    },
    errorBox: {
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '10px 14px', background: '#FEE2E2', color: '#B91C1C',
        border: '1px solid #FECACA', borderRadius: '10px',
        fontSize: '13px', fontWeight: 600,
    },
    submitBtn: {
        width: '100%', padding: '13px',
        background: 'linear-gradient(135deg, #005A52 0%, #009688 100%)',
        color: '#FFFFFF', border: 'none', borderRadius: '12px',
        fontSize: '14.5px', fontWeight: 700, marginTop: '4px',
        boxShadow: '0 8px 20px -4px rgba(0,150,136,0.4)',
        transition: 'all 0.2s ease', cursor: 'pointer', fontFamily: 'inherit',
    },
    btnInner: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' },
    securityFooter: {
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
        fontSize: '12px', color: '#00695C', fontWeight: 600,
        marginTop: '20px', paddingTop: '14px', borderTop: '1px solid rgba(226,232,240,0.8)',
    },
};

const popupStyles = {
    overlay: {
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center',
        justifyContent: 'center', zIndex: 9999, padding: '20px',
    },
    box: {
        background: '#FFFFFF', borderRadius: '24px', padding: '44px 40px',
        maxWidth: '430px', width: '100%', textAlign: 'center',
        boxShadow: '0 30px 70px -10px rgba(0,0,0,0.35)', border: '1.5px solid #D1FAE5',
    },
    iconRing: {
        width: '88px', height: '88px', borderRadius: '50%',
        background: 'linear-gradient(135deg, #D1FAE5 0%, #A7F3D0 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 22px', boxShadow: '0 8px 24px rgba(16,185,129,0.25)',
    },
    title: { fontSize: '22px', fontWeight: 800, color: '#064E3B', margin: '0 0 12px' },
    message: { fontSize: '14px', color: '#475569', lineHeight: 1.6, margin: '0 0 28px' },
    btn: {
        display: 'inline-block', padding: '13px 32px',
        background: 'linear-gradient(135deg, #059669 0%, #10B981 100%)',
        color: '#FFFFFF', border: 'none', borderRadius: '12px',
        fontSize: '14.5px', fontWeight: 700, cursor: 'pointer',
        boxShadow: '0 6px 18px rgba(16,185,129,0.35)', fontFamily: 'inherit',
    },
};

/* ─── Field Component — TOP-LEVEL (never inside another component) ── */
const Field = ({ id, label, icon: Icon, type = 'text', value, onChange, onBlur, placeholder, error, touched: t }) => (
    <div style={s.inputGroup}>
        <label style={s.label} htmlFor={id}>{label}</label>
        <div style={s.inputWrapper}>
            {Icon && <Icon size={16} style={s.inputIcon} />}
            <input
                id={id}
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onBlur={onBlur}
                placeholder={placeholder}
                autoComplete="off"
                style={{
                    ...s.input,
                    paddingLeft: Icon ? '40px' : '14px',
                    borderColor: t && error ? '#EF4444' : t && !error && value ? '#10B981' : '#B2DFDB',
                    boxShadow: t && error ? '0 0 0 3px rgba(239,68,68,0.1)' : t && !error && value ? '0 0 0 3px rgba(16,185,129,0.1)' : 'none',
                }}
            />
        </div>
        {t && error && (
            <div style={s.fieldError}>
                <AlertCircle size={12} color="#EF4444" />
                <span>{error}</span>
            </div>
        )}
        {t && !error && value && (
            <div style={s.fieldOk}>
                <CheckCircle size={12} color="#10B981" />
                <span>Looks good</span>
            </div>
        )}
    </div>
);

/* ─── Success Popup ───────────────────────────────────────────── */
const SuccessPopup = ({ onClose }) => (
    <div style={popupStyles.overlay}>
        <div style={popupStyles.box} className="animate-scale-up">
            <div style={popupStyles.iconRing}>
                <CheckCircle size={44} color="#059669" strokeWidth={2} />
            </div>
            <h2 style={popupStyles.title}>Registration Successful! 🎉</h2>
            <p style={popupStyles.message}>
                Your account has been created successfully.<br />
                You can now sign in using your email and password.
            </p>
            <button style={popupStyles.btn} onClick={onClose}>
                Sign In Now →
            </button>
        </div>
    </div>
);

/* ─── Password field with toggle (also TOP-LEVEL) ───────────── */
const PasswordField = ({ id, label, value, onChange, onBlur, placeholder, error, touched: t, show, onToggle }) => (
    <div style={s.inputGroup}>
        <label style={s.label} htmlFor={id}>{label}</label>
        <div style={s.inputWrapper}>
            <Lock size={16} style={s.inputIcon} />
            <input
                id={id}
                type={show ? 'text' : 'password'}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onBlur={onBlur}
                placeholder={placeholder}
                autoComplete={id === 'reg-password' ? 'new-password' : 'off'}
                style={{
                    ...s.input,
                    paddingLeft: '40px',
                    paddingRight: '40px',
                    borderColor: t && error ? '#EF4444' : t && !error && value ? '#10B981' : '#B2DFDB',
                    boxShadow: t && error ? '0 0 0 3px rgba(239,68,68,0.1)' : t && !error && value ? '0 0 0 3px rgba(16,185,129,0.1)' : 'none',
                }}
            />
            <button type="button" style={s.eyeBtn} onClick={onToggle} aria-label="Toggle password visibility">
                {show ? <EyeOff size={16} color="#009688" /> : <Eye size={16} color="#64748B" />}
            </button>
        </div>
        {t && error && (
            <div style={s.fieldError}><AlertCircle size={12} color="#EF4444" /><span>{error}</span></div>
        )}
        {t && !error && value && (
            <div style={s.fieldOk}><CheckCircle size={12} color="#10B981" /><span>Looks good</span></div>
        )}
    </div>
);

/* ─── Main Login / Register Page ─────────────────────────────── */
const Login = () => {
    const [tab, setTab] = useState('signin');
    const navigate = useNavigate();
    const { login } = useAuth();

    // Sign-in state
    const [siEmail, setSiEmail] = useState('');
    const [siPass, setSiPass] = useState('');
    const [siShowPw, setSiShowPw] = useState(false);
    const [siLoading, setSiLoading] = useState(false);
    const [siError, setSiError] = useState('');

    // Register state
    const [form, setForm] = useState({
        fullName: '', email: '', phone: '', nic: '', gender: '', password: '', confirmPassword: ''
    });
    const [touched, setTouched] = useState({});
    const [showPw, setShowPw] = useState(false);
    const [showCPw, setShowCPw] = useState(false);
    const [regLoading, setRegLoading] = useState(false);
    const [regError, setRegError] = useState('');
    const [showSuccess, setShowSuccess] = useState(false);

    // Sign-in handler
    const handleSignIn = async (e) => {
        e.preventDefault();
        setSiError('');
        setSiLoading(true);
        try {
            const data = await login(siEmail, siPass);
            navigate(`/${data.user.role.toLowerCase()}/dashboard`);
        } catch (err) {
            setSiError(err.message || 'Invalid email or password.');
        } finally {
            setSiLoading(false);
        }
    };

    // Register handlers
    const setField = (key, val) => {
        setForm((prev) => ({ ...prev, [key]: val }));
        setTouched((prev) => ({ ...prev, [key]: true }));
    };
    const blurField = (key) => setTouched((prev) => ({ ...prev, [key]: true }));

    const errors = {
        fullName: validate.fullName(form.fullName),
        email: validate.email(form.email),
        phone: validate.phone(form.phone),
        nic: validate.nic(form.nic),
        gender: validate.gender(form.gender),
        password: validate.password(form.password),
        confirmPassword: validate.confirmPassword(form.confirmPassword, form.password),
    };
    const isFormValid = Object.values(errors).every((e) => e === '');

    const handleRegister = async (e) => {
        e.preventDefault();
        setTouched({ fullName: true, email: true, phone: true, nic: true, gender: true, password: true, confirmPassword: true });
        if (!isFormValid) return;

        setRegError('');
        setRegLoading(true);
        try {
            await apiRegister({
                fullName: form.fullName.trim(),
                email: form.email.trim().toLowerCase(),
                phoneNumber: form.phone.trim(),
                nicNumber: form.nic.trim().toUpperCase(),
                gender: form.gender,
                password: form.password,
            });
            setShowSuccess(true);
        } catch (err) {
            setRegError(err.message || 'Registration failed. Please try again.');
        } finally {
            setRegLoading(false);
        }
    };

    const handleSuccessClose = () => {
        setShowSuccess(false);
        setTab('signin');
        setSiEmail(form.email.trim().toLowerCase());
        setSiPass('');
        setForm({ fullName: '', email: '', phone: '', nic: '', gender: '', password: '', confirmPassword: '' });
        setTouched({});
    };

    return (
        <>
            <div style={s.bgFixed} />
            {showSuccess && <SuccessPopup onClose={handleSuccessClose} />}
            <div style={s.container}>
                <div style={s.ambientTop} />
                <div style={s.ambientBottom} />

                <div style={s.card} className="animate-slide-up">
                    {/* Logo */}
                    <div style={s.logoSection}>
                        <img src={logoImg} alt="Medi Bridge Logo" style={s.logo} />
                        <h1 style={s.brand}>{tab === 'signin' ? 'Welcome Back' : 'Create Account'}</h1>
                        <span style={s.subtitle}>Health Bridge Pharmacy Portal</span>
                    </div>

                    {/* Tabs */}
                    <div style={s.tabRow}>
                        <button
                            id="tab-signin"
                            type="button"
                            style={{ ...s.tab, ...(tab === 'signin' ? s.tabActive : {}) }}
                            onClick={() => { setTab('signin'); setSiError(''); }}
                        >
                            Sign In
                        </button>
                        <button
                            id="tab-register"
                            type="button"
                            style={{ ...s.tab, ...(tab === 'register' ? s.tabActive : {}) }}
                            onClick={() => { setTab('register'); setRegError(''); }}
                        >
                            Register
                        </button>
                    </div>

                    {/* ══ SIGN IN FORM ══ */}
                    {tab === 'signin' && (
                        <form onSubmit={handleSignIn} style={s.form} autoComplete="on">
                            <div style={s.inputGroup}>
                                <label style={s.label} htmlFor="si-email">Email Address</label>
                                <div style={s.inputWrapper}>
                                    <Mail size={16} style={s.inputIcon} />
                                    <input
                                        id="si-email"
                                        type="email"
                                        value={siEmail}
                                        onChange={(e) => setSiEmail(e.target.value)}
                                        placeholder="e.g. john@gmail.com"
                                        autoComplete="email"
                                        style={{ ...s.input, paddingLeft: '40px' }}
                                        required
                                    />
                                </div>
                            </div>

                            <div style={s.inputGroup}>
                                <label style={s.label} htmlFor="si-password">Password</label>
                                <div style={s.inputWrapper}>
                                    <Lock size={16} style={s.inputIcon} />
                                    <input
                                        id="si-password"
                                        type={siShowPw ? 'text' : 'password'}
                                        value={siPass}
                                        onChange={(e) => setSiPass(e.target.value)}
                                        placeholder="••••••••"
                                        autoComplete="current-password"
                                        style={{ ...s.input, paddingLeft: '40px', paddingRight: '40px' }}
                                        required
                                    />
                                    <button type="button" style={s.eyeBtn} onClick={() => setSiShowPw(!siShowPw)} aria-label="Toggle password">
                                        {siShowPw ? <EyeOff size={16} color="#009688" /> : <Eye size={16} color="#64748B" />}
                                    </button>
                                </div>
                            </div>

                            {siError && (
                                <div style={s.errorBox} className="animate-fade-in">
                                    <XCircle size={15} color="#B91C1C" />
                                    <span>{siError}</span>
                                </div>
                            )}

                            <button
                                id="btn-signin"
                                type="submit"
                                disabled={siLoading}
                                style={{ ...s.submitBtn, opacity: siLoading ? 0.75 : 1, cursor: siLoading ? 'not-allowed' : 'pointer' }}
                            >
                                <span style={s.btnInner}>
                                    {siLoading ? <><Loader2 size={16} className="animate-spin" /> Signing In...</> : 'Sign In'}
                                </span>
                            </button>
                        </form>
                    )}

                    {/* ══ REGISTER FORM ══ */}
                    {tab === 'register' && (
                        <form onSubmit={handleRegister} style={s.form} noValidate autoComplete="off">

                            <Field
                                id="reg-name"
                                label="Full Name *"
                                icon={User}
                                value={form.fullName}
                                onChange={(v) => setField('fullName', v)}
                                onBlur={() => blurField('fullName')}
                                placeholder="Enter your full name"
                                error={errors.fullName}
                                touched={touched.fullName}
                            />

                            <Field
                                id="reg-email"
                                label="Email Address * (Must contain @)"
                                icon={Mail}
                                type="email"
                                value={form.email}
                                onChange={(v) => setField('email', v)}
                                onBlur={() => blurField('email')}
                                placeholder="e.g. john@gmail.com"
                                error={errors.email}
                                touched={touched.email}
                            />

                            {/* Phone + Gender row */}
                            <div style={s.twoCol}>
                                {/* Phone */}
                                <div style={s.inputGroup}>
                                    <label style={s.label} htmlFor="reg-phone">Telephone (10 Digits) *</label>
                                    <div style={s.inputWrapper}>
                                        <Phone size={16} style={s.inputIcon} />
                                        <input
                                            id="reg-phone"
                                            type="tel"
                                            value={form.phone}
                                            maxLength={10}
                                            onChange={(e) => setField('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                                            onBlur={() => blurField('phone')}
                                            placeholder="e.g. 0771234567"
                                            style={{
                                                ...s.input,
                                                paddingLeft: '40px',
                                                borderColor: touched.phone && errors.phone ? '#EF4444' : touched.phone && !errors.phone && form.phone ? '#10B981' : '#B2DFDB',
                                                boxShadow: touched.phone && errors.phone ? '0 0 0 3px rgba(239,68,68,0.1)' : 'none',
                                            }}
                                        />
                                    </div>
                                    {touched.phone && errors.phone && (
                                        <div style={s.fieldError}><AlertCircle size={12} color="#EF4444" /><span>{errors.phone}</span></div>
                                    )}
                                    {touched.phone && !errors.phone && form.phone && (
                                        <div style={s.fieldOk}><CheckCircle size={12} color="#10B981" /><span>Looks good</span></div>
                                    )}
                                </div>

                                {/* Gender */}
                                <div style={s.inputGroup}>
                                    <label style={s.label} htmlFor="reg-gender">Gender *</label>
                                    <div style={{ position: 'relative' }}>
                                        <select
                                            id="reg-gender"
                                            value={form.gender}
                                            onChange={(e) => setField('gender', e.target.value)}
                                            onBlur={() => blurField('gender')}
                                            style={{
                                                ...s.input,
                                                paddingLeft: '14px',
                                                paddingRight: '36px',
                                                appearance: 'none',
                                                WebkitAppearance: 'none',
                                                cursor: 'pointer',
                                                borderColor: touched.gender && errors.gender ? '#EF4444' : touched.gender && !errors.gender ? '#10B981' : '#B2DFDB',
                                            }}
                                        >
                                            <option value="">Select Gender</option>
                                            <option value="Male">Male</option>
                                            <option value="Female">Female</option>
                                            <option value="Prefer not to say">Prefer not to say</option>
                                        </select>
                                        <ChevronDown size={15} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748B', pointerEvents: 'none' }} />
                                    </div>
                                    {touched.gender && errors.gender && (
                                        <div style={s.fieldError}><AlertCircle size={12} color="#EF4444" /><span>{errors.gender}</span></div>
                                    )}
                                </div>
                            </div>

                            <Field
                                id="reg-nic"
                                label="NIC Number * (Must be Unique)"
                                icon={CreditCard}
                                value={form.nic}
                                onChange={(v) => setField('nic', v)}
                                onBlur={() => blurField('nic')}
                                placeholder="e.g. 199012345678 or 901234567V"
                                error={errors.nic}
                                touched={touched.nic}
                            />

                            {/* Password row */}
                            <div style={s.twoCol}>
                                <PasswordField
                                    id="reg-password"
                                    label="Password *"
                                    value={form.password}
                                    onChange={(v) => setField('password', v)}
                                    onBlur={() => blurField('password')}
                                    placeholder="Min 6 characters"
                                    error={errors.password}
                                    touched={touched.password}
                                    show={showPw}
                                    onToggle={() => setShowPw((p) => !p)}
                                />
                                <PasswordField
                                    id="reg-confirm"
                                    label="Confirm Password *"
                                    value={form.confirmPassword}
                                    onChange={(v) => setField('confirmPassword', v)}
                                    onBlur={() => blurField('confirmPassword')}
                                    placeholder="Re-enter password"
                                    error={errors.confirmPassword}
                                    touched={touched.confirmPassword}
                                    show={showCPw}
                                    onToggle={() => setShowCPw((p) => !p)}
                                />
                            </div>

                            {regError && (
                                <div style={s.errorBox} className="animate-fade-in">
                                    <XCircle size={15} color="#B91C1C" />
                                    <span>{regError}</span>
                                </div>
                            )}

                            <button
                                id="btn-register"
                                type="submit"
                                disabled={regLoading}
                                style={{ ...s.submitBtn, opacity: regLoading ? 0.75 : 1, cursor: regLoading ? 'not-allowed' : 'pointer' }}
                            >
                                <span style={s.btnInner}>
                                    {regLoading ? <><Loader2 size={16} className="animate-spin" /> Registering...</> : 'Register Account'}
                                </span>
                            </button>
                        </form>
                    )}

                    {/* Footer */}
                    <div style={s.securityFooter}>
                        <ShieldCheck size={15} color="#009688" />
                        <span>Protected by Health Bridge Security System.</span>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Login;