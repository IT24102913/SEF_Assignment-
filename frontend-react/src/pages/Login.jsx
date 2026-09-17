import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import hutBg from '../assets/hut.png';
import logoImg from '../assets/logo.png'; // Make sure to place your logo image here

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const navigate = useNavigate();
    const { login } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const data = await login(email, password);
            const role = data.user.role.toLowerCase();
            navigate(`/${role}/dashboard`);
        } catch (err) {
            setError(err.message || 'Invalid email or password');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <div style={styles.logoSection}>
                    <img src={logoImg} alt="Medi Bridge Logo" style={styles.logoImage} />
                    <div style={styles.welcomeContainer}>
                        <h2 style={styles.welcomeTitle}>Welcome Back, Admin</h2>
                        <span style={styles.portalLabel}>Staff Portal</span>
                    </div>
                </div>

                <form onSubmit={handleSubmit} style={styles.form}>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Email Address</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Enter your email"
                            style={styles.input}
                            required
                        />
                    </div>

                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Password</label>
                        <div style={styles.passwordWrapper}>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter your password"
                                style={styles.input}
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                style={styles.eyeButton}
                                aria-label="Toggle password visibility"
                            >
                                {showPassword ? (
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1e3a8a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                                        <line x1="1" y1="1" x2="23" y2="23"></line>
                                    </svg>
                                ) : (
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1e3a8a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                        <circle cx="12" cy="12" r="3"></circle>
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>

                    {error && <div style={styles.error}>{error}</div>}

                    <button
                        type="submit"
                        disabled={isLoading}
                        style={{
                            ...styles.button,
                            opacity: isLoading ? 0.7 : 1,
                            cursor: isLoading ? 'not-allowed' : 'pointer',
                        }}
                    >
                        {isLoading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>

                <p style={styles.footer}>Protected by Medi Bridge security.</p>
            </div>
        </div>
    );
};

const styles = {
    container: {
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundImage: `url(${hutBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        padding: '20px',
        fontFamily: 'Segoe UI, Arial, sans-serif',
    },
    card: {
        backgroundColor: 'rgba(255, 255, 255, 0.45)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.6)',
        borderRadius: '24px',
        padding: '48px 40px',
        width: '100%',
        maxWidth: '440px',
        boxShadow: '0 16px 40px rgba(0, 0, 0, 0.15)',
    },
    logoSection: {
        textAlign: 'center',
        marginBottom: '24px',
    },
    logoImage: {
        maxHeight: '65px',
        width: 'auto',
        objectFit: 'contain',
        marginBottom: '10px',
    },
    welcomeContainer: {
        marginTop: '12px',
    },
    welcomeTitle: {
        margin: '0 0 6px 0',
        fontSize: '20px',
        fontWeight: 700,
        color: '#1e3a8a',
    },
    portalLabel: {
        margin: 0,
        fontSize: '13px',
        fontWeight: 600,
        color: '#1e3a8a',
        background: 'rgba(30, 58, 138, 0.1)',
        display: 'inline-block',
        padding: '3px 16px',
        borderRadius: '20px',
        border: '1px solid rgba(30, 58, 138, 0.2)',
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
    },
    inputGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
    },
    label: {
        fontSize: '14px',
        fontWeight: 600,
        color: '#1e3a8a',
    },
    input: {
        padding: '12px 14px',
        borderRadius: '10px',
        border: '1px solid rgba(30, 58, 138, 0.25)',
        fontSize: '14px',
        width: '100%',
        boxSizing: 'border-box',
        outline: 'none',
        backgroundColor: 'rgba(255, 255, 255, 0.6)',
        color: '#1e3a8a',
    },
    passwordWrapper: {
        position: 'relative',
    },
    eyeButton: {
        position: 'absolute',
        right: '12px',
        top: '50%',
        transform: 'translateY(-50%)',
        background: 'none',
        border: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        padding: '4px',
    },
    error: {
        padding: '10px 14px',
        backgroundColor: 'rgba(211, 47, 47, 0.15)',
        color: '#b71c1c',
        border: '1px solid rgba(211, 47, 47, 0.3)',
        borderRadius: '8px',
        fontSize: '14px',
        textAlign: 'center',
        fontWeight: 500,
    },
    button: {
        padding: '12px',
        backgroundColor: '#1e3a8a',
        color: '#fff',
        border: 'none',
        borderRadius: '10px',
        fontSize: '16px',
        fontWeight: 600,
        marginTop: '4px',
        width: '100%',
        boxShadow: '0 4px 12px rgba(30, 58, 138, 0.3)',
        transition: 'background-color 0.2s',
    },
    footer: {
        textAlign: 'center',
        fontSize: '12px',
        color: '#1e3a8a',
        fontWeight: 500,
        marginTop: '20px',
    },
};

export default Login;