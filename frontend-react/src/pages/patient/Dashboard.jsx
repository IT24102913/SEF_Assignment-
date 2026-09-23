import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/authApi';
import logoImage from '../../assets/mediz.png';
import loginBg from '../../assets/hut.png';

import doctorImg from '../../assets/doctor.jpg';
import mediImg from '../../assets/medi.jpg';
import reImg from '../../assets/re.avif';
import testImg from '../../assets/test.jpeg';

import CustomerPharmacyStore from '../pharmacy/patient/CustomerPharmacyStore';
import DoctorChannelingSection from '../appointments/patient/DoctorChannelingSection';
import CustomerLabHub from '../lab/patient/CustomerLabHub';
import PatientProfileSection from './PatientProfileSection';
import PatientFeedbackSection from './PatientFeedbackSection';

import {
    HeartPulse, Pill, FlaskConical, FileText,
    CalendarDays, Bell, User, LogOut, ShieldCheck,
    Activity, ClipboardList, Phone, ChevronRight, ChevronLeft,
    Clock, CheckCircle2, Sparkles, Settings,
    Home, ArrowRight, AlertCircle,
    Stethoscope, Microscope, ScrollText,
    Bookmark, RefreshCw, MapPin, Mail, Shield,
    Truck, FileCheck, MessageSquare, Trash2,
    Star, Lock, MessageCircle
} from 'lucide-react';

const SERVICE_BG = {
    channeling: doctorImg,
    pharmacy: mediImg,
    labs: reImg,
    reports: testImg,
};

/* ─── Sidebar ─────────────────────────────────────────── */
const Sidebar = ({ active, onNavigate, user, onLogout }) => {
    const navItems = [
        { id: 'home', label: 'Overview', icon: Home },
        { id: 'services', label: 'Health Services', icon: HeartPulse },
        { id: 'emr', label: 'EMR Medical Records', icon: ScrollText },
        { id: 'channeling', label: 'Doctor Channeling', icon: Stethoscope },
        { id: 'pharmacy', label: 'Pharmacy Store', icon: Pill },
        { id: 'labs', label: 'Lab Tests & Reports', icon: FlaskConical },
        { id: 'orders', label: 'My Orders', icon: ClipboardList },
        { id: 'profile', label: 'My Profile', icon: User },
        { id: 'feedback', label: 'Feedback & Reviews', icon: MessageSquare },
    ];
    return (
        <aside style={ps.sidebar}>
            <div style={ps.sidebarLogo}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <img src={logoImage} alt="Health Bridge Private" style={ps.logoImg} />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '13.5px', fontWeight: 900, color: '#059669', letterSpacing: '-0.3px', lineHeight: 1.1 }}>HEALTH BRIDGE</span>
                        <span style={{ fontSize: '10px', fontWeight: 800, color: '#0D9488', letterSpacing: '1px', textTransform: 'uppercase' }}>PRIVATE</span>
                    </div>
                </div>
            </div>
            <nav style={ps.sidebarNav}>
                {navItems.map(({ id, label, icon: Icon }) => {
                    const isActive = active === id;
                    return (
                        <button key={id} onClick={() => onNavigate(id)}
                            style={{ ...ps.navBtn, ...(isActive ? ps.navBtnActive : {}) }}>
                            <Icon size={19} color={isActive ? '#059669' : '#64748B'} />
                            <span>{label}</span>
                            {isActive && <div style={ps.activeIndicator} />}
                        </button>
                    );
                })}
            </nav>

            {/* Quick Contact Action Pills under Left Navigation Bar */}
            <div style={{ padding: '0 14px 16px', display: 'flex', flexDirection: 'column', gap: '10px', marginTop: 'auto' }}>
                <a
                    href={`https://wa.me/94764887396?text=${encodeURIComponent('Hello Medix Healthcare Team, I need assistance with my portal.')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justify: 'center',
                        gap: '10px',
                        backgroundColor: '#25D366',
                        color: '#FFFFFF',
                        padding: '11px 16px',
                        borderRadius: '50px',
                        textDecoration: 'none',
                        fontWeight: 800,
                        fontSize: '13px',
                        boxShadow: '0 6px 16px rgba(37, 211, 102, 0.35)',
                        transition: 'all 0.2s ease',
                        cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(37, 211, 102, 0.45)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(37, 211, 102, 0.35)'; }}
                >
                    <MessageCircle size={18} fill="#FFFFFF" color="#25D366" />
                    <span>WhatsApp Support</span>
                </a>

                <a
                    href="tel:0764887396"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justify: 'center',
                        gap: '10px',
                        backgroundColor: '#0284C7',
                        color: '#FFFFFF',
                        padding: '11px 16px',
                        borderRadius: '50px',
                        textDecoration: 'none',
                        fontWeight: 800,
                        fontSize: '13px',
                        boxShadow: '0 6px 16px rgba(2, 132, 199, 0.35)',
                        transition: 'all 0.2s ease',
                        cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(2, 132, 199, 0.45)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(2, 132, 199, 0.35)'; }}
                >
                    <Phone size={17} color="#FFFFFF" />
                    <span>Call: 0764887396</span>
                </a>
            </div>

            <div style={ps.sidebarUserCard}>
                <div style={ps.avatarCircle}>{user?.fullName?.charAt(0) || 'P'}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={ps.userNameText}>{user?.fullName || 'Patient User'}</div>
                    <div style={ps.userRoleTag}>{user?.role || 'Patient Portal'}</div>
                </div>
                <button onClick={onLogout} style={ps.logoutBtn} title="Sign Out">
                    <LogOut size={16} color="#94A3B8" />
                </button>
            </div>
        </aside>
    );
};

/* ─── Top Header ─────────────────────────────────────── */
const DashboardHeader = ({ title, subtitle, user, onNavigate }) => {
    const [showNotifs, setShowNotifs] = useState(false);
    const [notifs, setNotifs] = useState([]);

    useEffect(() => {
        try {
            const list = JSON.parse(localStorage.getItem('medix_notifications') || '[]');
            setNotifs(list);
        } catch (e) { }
    }, [showNotifs]);

    const handleNotifClick = (targetOrder) => {
        setShowNotifs(false);
        onNavigate('orders');
    };

    return (
        <header style={ps.topHeader}>
            <div>
                <h1 style={ps.headerTitle}>{title}</h1>
                {subtitle && <p style={ps.headerSubtitle}>{subtitle}</p>}
            </div>
            <div style={ps.headerActions}>
                <div style={{ position: 'relative' }}>
                    <button style={ps.headerIconBtn} onClick={() => setShowNotifs(!showNotifs)} title="View Notifications">
                        <Bell size={18} color="#475569" />
                        {notifs.some(n => !n.read) && <span style={ps.notifDot} />}
                    </button>

                    {showNotifs && (
                        <div style={{
                            position: 'absolute', right: 0, top: '48px', width: '320px',
                            background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0',
                            boxShadow: '0 10px 25px rgba(0,0,0,0.15)', zIndex: 1000, padding: '14px'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', borderBottom: '1px solid #F1F5F9', paddingBottom: '8px' }}>
                                <strong style={{ fontSize: '14px', color: '#0F172A' }}>Notifications</strong>
                                <span style={{ fontSize: '11px', color: '#0D9488', fontWeight: 700 }}>{notifs.length} New</span>
                            </div>

                            {notifs.length === 0 ? (
                                <p style={{ fontSize: '12.5px', color: '#64748B', margin: '12px 0', textAlign: 'center' }}>No new notifications</p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '240px', overflowY: 'auto' }}>
                                    {notifs.map((n) => (
                                        <div
                                            key={n.id}
                                            onClick={() => handleNotifClick(n.targetOrderNumber)}
                                            style={{
                                                padding: '10px', borderRadius: '10px', background: '#F8FAFC',
                                                border: '1px solid #E2E8F0', cursor: 'pointer', transition: 'background 0.2s'
                                            }}
                                        >
                                            <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#0F172A' }}>{n.title}</div>
                                            <div style={{ fontSize: '11.5px', color: '#475569', marginTop: '2px' }}>{n.message}</div>
                                            <span style={{ fontSize: '10px', color: '#94A3B8', marginTop: '4px', display: 'block' }}>
                                                {new Date(n.createdAt).toLocaleTimeString()} &bull; Click to View Order
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div style={ps.headerProfilePill} onClick={() => onNavigate('profile')}>
                    <div style={ps.headerAvatar}>{user?.fullName?.charAt(0) || 'P'}</div>
                    <span style={ps.headerUserName}>{user?.fullName?.split(' ')[0] || 'Patient'}</span>
                </div>
            </div>
        </header>
    );
};

/* ─── 2×2 Service Widget Cards (Dark Premium Theme) ──── */
const ServiceWidgetCards = ({ onNavigate }) => {
    const [hovered, setHovered] = useState(null);
    const services = [
        { id: 'channeling', title: 'Doctor Appointments', shortDesc: 'Consult top-rated specialists with real-time slot booking.', img: SERVICE_BG.channeling, action: () => onNavigate('channeling') },
        { id: 'pharmacy', title: 'Prescriptions & Pharmacy', shortDesc: 'Order medicines, upload prescriptions, fast home delivery.', img: SERVICE_BG.pharmacy, action: () => onNavigate('pharmacy') },
        { id: 'medical_records', title: 'Medical Records', shortDesc: 'Complete medical history, doctor notes & prescriptions.', img: SERVICE_BG.reports, action: () => onNavigate('emr') },
        { id: 'lab_tests', title: 'Lab Tests & Reports', shortDesc: 'Book pathology tests and download certified lab reports.', img: SERVICE_BG.labs, action: () => onNavigate('labs') },
    ];
    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '22px', width: '100%', marginTop: '14px' }}>
            {services.map((svc) => {
                const isH = hovered === svc.id;
                return (
                    <div key={svc.id}
                        style={{
                            background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
                            borderRadius: '24px',
                            border: isH ? '1.5px solid #2DD4BF' : '1.5px solid rgba(255,255,255,0.12)',
                            overflow: 'hidden',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            boxShadow: isH ? '0 16px 36px rgba(45,212,191,0.22)' : '0 10px 28px rgba(0,0,0,0.2)',
                            transform: isH ? 'translateY(-5px)' : 'none',
                            display: 'flex',
                            flexDirection: 'column'
                        }}
                        onMouseEnter={() => setHovered(svc.id)}
                        onMouseLeave={() => setHovered(null)}
                        onClick={svc.action}
                    >
                        <div style={{ height: '195px', overflow: 'hidden', position: 'relative' }}>
                            <img src={svc.img} alt={svc.title} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.4s ease', transform: isH ? 'scale(1.06)' : 'scale(1)' }} />
                            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, #0F172A 0%, transparent 65%)' }} />
                        </div>
                        <div style={{ padding: '22px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: 1 }}>
                            <div>
                                <div style={{ fontSize: '18px', fontWeight: 800, color: '#F8FAFC', letterSpacing: '-0.3px' }}>{svc.title}</div>
                                <div style={{ fontSize: '13px', color: '#94A3B8', marginTop: '5px', fontWeight: 500, lineHeight: 1.45 }}>{svc.shortDesc}</div>
                            </div>
                            <div style={{
                                width: '46px',
                                height: '46px',
                                borderRadius: '50%',
                                background: isH ? 'linear-gradient(135deg,#0D9488,#059669)' : 'rgba(255,255,255,0.08)',
                                border: '1px solid rgba(255,255,255,0.2)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                                transition: 'all 0.25s ease',
                                transform: isH ? 'scale(1.1) translateX(3px)' : 'scale(1)'
                            }}>
                                <ArrowRight size={20} color={isH ? '#FFFFFF' : '#2DD4BF'} />
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

/* ─── Hospital Hero Banner ─────────────────────────────── */
const HospitalHeroBanner = ({ onNavigate }) => (
    <div style={{
        background: '#FFFFFF',
        borderRadius: '28px',
        border: '1px solid #E2E8F0',
        boxShadow: '0 12px 36px rgba(0, 0, 0, 0.05)',
        overflow: 'hidden',
        marginBottom: '28px',
    }}>
        {/* Prominent Hero Showcase Banner with Health Bridge Building photo clearly visible */}
        <div style={{
            position: 'relative',
            backgroundImage: `url(${loginBg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center right',
            minHeight: '440px',
            display: 'flex',
            alignItems: 'center',
            padding: '56px 48px',
        }}>
            {/* Soft gradient overlay on left for text contrast while keeping building photo clearly visible on right */}
            <div style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(to right, rgba(15, 23, 42, 0.90) 0%, rgba(15, 23, 42, 0.70) 45%, rgba(15, 23, 42, 0.25) 80%, rgba(15, 23, 42, 0.05) 100%)',
                zIndex: 1,
            }} />

            <div style={{ position: 'relative', zIndex: 2, maxWidth: '720px' }}>
                <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '7px 18px',
                    borderRadius: '999px',
                    background: 'rgba(255, 255, 255, 0.2)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    color: '#5EEAD4',
                    fontSize: '12px',
                    fontWeight: 800,
                    letterSpacing: '0.6px',
                    textTransform: 'uppercase',
                    marginBottom: '18px',
                }}>
                    <Sparkles size={14} color="#5EEAD4" /> HEALTH BRIDGE HOSPITAL & CARE
                </div>

                <h1 style={{
                    fontSize: '42px',
                    fontWeight: 900,
                    color: '#FFFFFF',
                    margin: '0 0 16px',
                    lineHeight: 1.18,
                    letterSpacing: '-0.8px',
                    textShadow: '0 2px 14px rgba(0,0,0,0.5)',
                }}>
                    PROVIDING TOTAL CARE FOR YOU
                </h1>

                <p style={{
                    fontSize: '16px',
                    color: 'rgba(255, 255, 255, 0.95)',
                    lineHeight: 1.65,
                    margin: '0 0 32px',
                    maxWidth: '640px',
                    textShadow: '0 1px 6px rgba(0,0,0,0.4)',
                }}>
                    World-class medical care through board-certified doctors, 24/7 emergency response, advanced diagnostic labs, and a smart pharmacy vault — all in one platform.
                </p>

                <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                    <button
                        onClick={() => onNavigate('services')}
                        style={{
                            padding: '14px 30px',
                            borderRadius: '12px',
                            background: 'linear-gradient(135deg, #0D9488 0%, #059669 100%)',
                            color: '#FFFFFF',
                            border: 'none',
                            fontWeight: 800,
                            fontSize: '15px',
                            cursor: 'pointer',
                            boxShadow: '0 8px 22px rgba(13, 148, 136, 0.45)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                        }}
                    >
                        Book Appointment <ArrowRight size={16} />
                    </button>
                    <button
                        onClick={() => onNavigate('pharmacy')}
                        style={{
                            padding: '14px 28px',
                            borderRadius: '12px',
                            background: 'rgba(255, 255, 255, 0.18)',
                            backdropFilter: 'blur(10px)',
                            color: '#FFFFFF',
                            border: '1.5px solid rgba(255, 255, 255, 0.4)',
                            fontWeight: 700,
                            fontSize: '15px',
                            cursor: 'pointer',
                        }}
                    >
                        View Details
                    </button>
                </div>
            </div>
        </div>
    </div>
);

/* ─── Our Services Grid ────────────────────────────────── */
const OurServicesGrid = () => {
    const [hov, setHov] = useState(null);

    const services = [
        { title: '24/7 Emergency Service', desc: 'Round-the-clock emergency medical response with dedicated ambulance standby.', icon: Phone, color: '#0284C7' },
        { title: 'Blood Bank & Plasma', desc: 'Safe, screened blood products and 24/7 emergency blood donor registry.', icon: HeartPulse, color: '#E11D48' },
        { title: 'Operation Theater', desc: 'State-of-the-art sterile surgical suites with advanced laminar airflow.', icon: ShieldCheck, color: '#059669' },
        { title: 'General Checkup', desc: 'Comprehensive routine health screenings and specialist consultations.', icon: Stethoscope, color: '#D97706' },
        { title: 'Indoor & Online Pharmacy', desc: '100% genuine medications, vault storage, and rapid home delivery.', icon: Pill, color: '#7C3AED' },
        { title: 'ICU & Critical Care', desc: 'Continuous multi-parameter cardiac and vital monitoring in the ICU.', icon: Activity, color: '#2563EB' },
    ];

    return (
        <div style={{
            background: '#FFFFFF',
            borderRadius: '28px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 12px 36px rgba(0, 0, 0, 0.05)',
            overflow: 'hidden',
            marginBottom: '36px',
            padding: '40px 32px 36px',
        }}>
            {/* OUR SERVICES grid */}
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                <h2 style={{ fontSize: '24px', fontWeight: 900, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 8px' }}>OUR SERVICES</h2>
                <div style={{ width: '48px', height: '3.5px', background: '#0D9488', margin: '0 auto 12px', borderRadius: '999px' }} />
                <p style={{ fontSize: '14.5px', color: '#64748B', margin: 0 }}>Comprehensive healthcare solutions for your complete well-being</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '22px' }}>
                {services.map((s, i) => {
                    const Icon = s.icon;
                    const isH = hov === `s${i}`;
                    return (
                        <div
                            key={s.title}
                            style={{
                                background: '#F8FAFC',
                                borderRadius: '18px',
                                border: '1px solid #E2E8F0',
                                padding: '24px 22px',
                                boxShadow: isH ? '0 14px 28px rgba(0,0,0,0.07)' : '0 2px 8px rgba(0,0,0,0.02)',
                                transition: 'all 0.22s ease',
                                transform: isH ? 'translateY(-4px)' : 'none',
                            }}
                            onMouseEnter={() => setHov(`s${i}`)}
                            onMouseLeave={() => setHov(null)}
                        >
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                                <div style={{
                                    width: '44px',
                                    height: '44px',
                                    borderRadius: '12px',
                                    background: `${s.color}18`,
                                    border: `1px solid ${s.color}30`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                }}>
                                    <Icon size={22} color={s.color} />
                                </div>
                                <div>
                                    <h4 style={{ fontSize: '15.5px', fontWeight: 800, color: '#0F172A', margin: '0 0 5px' }}>{s.title}</h4>
                                    <p style={{ fontSize: '13px', color: '#64748B', lineHeight: 1.5, margin: 0 }}>{s.desc}</p>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

/* ─── Dark Theme Health Tips ──────────────────────────── */
const AnimatedDailyTips = () => {
    const [tipIdx, setTipIdx] = useState(0);
    const [bookmarked, setBookmarked] = useState(false);
    const [progress, setProgress] = useState(0);
    const [paused, setPaused] = useState(false);

    const tips = [
        { id: 'mind', emoji: '🧠', category: 'Mental Clarity', title: '5-Minute Breathing & Mind Reset', text: 'Deep diaphragmatic breathing lowers cortisol, reduces blood pressure, and sharpens focus in just 5 minutes.', fact: 'The 4-7-8 pattern instantly calms your central nervous system.', accent: '#F472B6', bg: 'linear-gradient(135deg,#1E1028,#0F172A)', border: 'rgba(244,114,182,0.35)' },
        { id: 'hydra', emoji: '💧', category: 'Hydration & Vitality', title: 'Optimal Daily Water Intake', text: 'Drinking 8–10 glasses of water daily boosts cell hydration, cognitive focus, and kidney filtration by 25%.', fact: 'Drink 1 glass immediately after waking up for best results.', accent: '#38BDF8', bg: 'linear-gradient(135deg,#0C1E38,#0F172A)', border: 'rgba(56,189,248,0.35)' },
        { id: 'exer', emoji: '🏃‍♂️', category: 'Cardiovascular Health', title: '30-Minute Daily Exercise', text: '30 minutes of aerobic activity 5 days a week lowers blood pressure and strengthens the heart muscle.', fact: 'Consistent cardio cuts heart disease risk by 35%.', accent: '#34D399', bg: 'linear-gradient(135deg,#062F24,#0F172A)', border: 'rgba(52,211,153,0.35)' },
        { id: 'sleep', emoji: '😴', category: 'Rest & Immunity', title: '7–9 Hours Restorative Sleep', text: 'Deep sleep activates immune cells, repairs muscle tissues, and clears neural metabolic waste.', fact: 'Avoid screens 45 minutes before bed for optimal melatonin.', accent: '#A78BFA', bg: 'linear-gradient(135deg,#1E1B4B,#0F172A)', border: 'rgba(167,139,250,0.35)' },
        { id: 'nutr', emoji: '🥗', category: 'Nutrient Rich Diet', title: 'Antioxidants & Fiber for Gut Health', text: 'Leafy greens, omega-3s and colorful berries reduce inflammation and support digestive flora.', fact: 'Make half your daily meals consist of fresh vegetables & fruits.', accent: '#FBBF24', bg: 'linear-gradient(135deg,#2D1A04,#0F172A)', border: 'rgba(251,191,36,0.35)' },
        { id: 'prev', emoji: '🛡️', category: 'Preventive Health', title: 'Regular Diagnostic Screenings', text: 'Annual blood tests, cholesterol checks, and sugar monitoring catch problems before symptoms appear.', fact: 'Early diagnostic testing saves lives and reduces medical costs.', accent: '#2DD4BF', bg: 'linear-gradient(135deg,#062C2A,#0F172A)', border: 'rgba(45,212,191,0.35)' },
    ];

    useEffect(() => {
        if (paused) return;
        const t = setInterval(() => {
            setProgress(p => {
                if (p >= 100) { setTipIdx(i => (i + 1) % tips.length); return 0; }
                return p + 2.5;
            });
        }, 100);
        return () => clearInterval(t);
    }, [paused]);

    const cur = tips[tipIdx];
    const go = (fn) => { setProgress(0); fn(); };

    return (
        <div style={{ ...dt.wrap, background: cur.bg, borderColor: cur.border }}
            onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'rgba(255,255,255,0.08)' }}>
                <div style={{ height: '100%', width: `${progress}%`, background: cur.accent, boxShadow: `0 0 10px ${cur.accent}`, transition: 'width 0.1s linear' }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '5px 14px', borderRadius: '999px', background: cur.accent, boxShadow: `0 4px 14px ${cur.accent}50`, color: '#fff', fontSize: '11px', fontWeight: 800, letterSpacing: '0.4px' }}>
                        <Sparkles size={12} color="#fff" /> AI Daily Health Tip
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: 800, color: cur.accent, textTransform: 'uppercase', letterSpacing: '0.6px', textShadow: `0 0 12px ${cur.accent}60` }}>{cur.category}</span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => go(() => { let r = Math.floor(Math.random() * tips.length); if (r === tipIdx) r = (r + 1) % tips.length; setTipIdx(r); })} style={dt.iconBtn}>
                        <RefreshCw size={14} color="#E2E8F0" />
                    </button>
                    <button onClick={() => setBookmarked(b => !b)} style={{ ...dt.iconBtn, background: bookmarked ? 'rgba(245,158,11,0.25)' : 'rgba(255,255,255,0.08)', borderColor: bookmarked ? '#F59E0B' : 'rgba(255,255,255,0.15)' }}>
                        <Bookmark size={14} color={bookmarked ? '#F59E0B' : '#E2E8F0'} fill={bookmarked ? '#F59E0B' : 'none'} />
                    </button>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '22px', marginBottom: '18px' }}>
                <div style={{ width: '72px', height: '72px', borderRadius: '20px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 0 35px ${cur.accent}50` }}>
                    <span style={{ fontSize: '36px' }}>{cur.emoji}</span>
                </div>
                <div style={{ flex: 1 }}>
                    <h4 style={{ fontSize: '19px', fontWeight: 800, color: '#F8FAFC', margin: '0 0 6px', letterSpacing: '-0.4px' }}>{cur.title}</h4>
                    <p style={{ fontSize: '13.5px', color: '#94A3B8', lineHeight: 1.6, margin: '0 0 12px' }}>{cur.text}</p>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', padding: '9px 14px', borderRadius: '11px', border: `1px solid ${cur.accent}50`, background: 'rgba(255,255,255,0.06)' }}>
                        <CheckCircle2 size={14} color={cur.accent} style={{ flexShrink: 0 }} />
                        <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#E2E8F0' }}>{cur.fact}</span>
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '14px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ display: 'flex', gap: '6px' }}>
                    {tips.map((t, i) => (
                        <button key={t.id} onClick={() => go(() => setTipIdx(i))}
                            style={{ height: '8px', width: tipIdx === i ? '26px' : '8px', border: 'none', borderRadius: '999px', background: tipIdx === i ? cur.accent : 'rgba(255,255,255,0.2)', boxShadow: tipIdx === i ? `0 0 10px ${cur.accent}` : 'none', cursor: 'pointer', transition: 'all 0.3s ease' }} />
                    ))}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => go(() => setTipIdx(p => (p - 1 + tips.length) % tips.length))} style={dt.arrowBtn}><ChevronLeft size={15} color="#E2E8F0" /></button>
                    <button onClick={() => go(() => setTipIdx(p => (p + 1) % tips.length))} style={dt.arrowBtn}><ChevronRight size={15} color="#E2E8F0" /></button>
                </div>
            </div>
        </div>
    );
};

/* ─── Trust & Facilities ──────────────────────────────── */
const CompanyTrustAndFacilities = () => {
    const [hovered, setHovered] = useState(null);
    const cards = [
        {
            id: 'clinical',
            title: 'Clinical Excellence',
            icon: Stethoscope,
            points: [
                { icon: Star, label: 'Expert Doctors', desc: 'Top-tier board-certified specialists across all major medical fields.' },
                { icon: Microscope, label: 'Advanced Diagnostics', desc: 'ISO-certified AI-assisted pathology reports ensuring rapid accuracy.' },
                { icon: HeartPulse, label: 'Personalized Care', desc: 'Tailored treatment plans designed around individual patient history.' },
            ],
        },
        {
            id: 'safety',
            title: 'Patient Safety & Speed',
            icon: ShieldCheck,
            points: [
                { icon: Phone, label: '24/7 Emergency', desc: 'Round-the-clock medical response with dedicated ambulance dispatch.' },
                { icon: Lock, label: 'Secure Health Vault', desc: '100% encrypted medical records accessible anytime, anywhere.' },
                { icon: Pill, label: 'In-Store & Online Pharmacy', desc: 'Genuine vault storage and rapid home delivery options.' },
            ],
        },
        {
            id: 'convenience',
            title: 'Convenience & Trust',
            icon: CalendarDays,
            points: [
                { icon: CalendarDays, label: 'Instant Slot Booking', desc: 'Real-time doctor appointments with zero waiting hassle.' },
                { icon: Activity, label: 'Transparent Tracking', desc: 'Live monitoring for all lab tests, prescriptions, and orders.' },
                { icon: MessageCircle, label: 'Dedicated Support', desc: 'Direct priority assistance via phone and integrated chat lines.' },
            ],
        },
    ];
    return (
        <div style={{ background: '#fff', borderRadius: '20px', border: '1px solid #E2E8F0', padding: '32px 36px', marginBottom: '28px', boxShadow: '0 4px 18px rgba(0,0,0,0.03)' }}>
            <div style={{ textAlign: 'center', marginBottom: '36px' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0', padding: '4px 14px', borderRadius: '999px', fontSize: '11.5px', fontWeight: 800, marginBottom: '10px' }}>
                    <Sparkles size={12} /> WHY PATIENTS TRUST US
                </div>
                <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: '0 0 6px' }}>Built for Precision &amp; Compassionate Care</h3>
                <p style={{ fontSize: '13.5px', color: '#64748B', margin: 0 }}>Our network delivers seamless healthcare with the highest safety standards.</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '22px' }}>
                {cards.map((card) => {
                    const CardIcon = card.icon;
                    const isH = hovered === card.id;
                    return (
                        <div
                            key={card.id}
                            onMouseEnter={() => setHovered(card.id)}
                            onMouseLeave={() => setHovered(null)}
                            style={{
                                background: 'linear-gradient(160deg, #059669 0%, #0D9488 100%)',
                                borderRadius: '20px',
                                padding: '36px 28px 36px',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'flex-start',
                                boxShadow: isH
                                    ? '0 20px 48px rgba(5, 150, 105, 0.45), 0 6px 18px rgba(0,0,0,0.12)'
                                    : '0 10px 32px rgba(5, 150, 105, 0.28), 0 3px 10px rgba(0,0,0,0.08)',
                                transform: isH ? 'translateY(-6px)' : 'translateY(0)',
                                transition: 'all 0.28s ease',
                                cursor: 'default',
                            }}
                        >
                            {/* Card header icon */}
                            <div style={{
                                width: '58px',
                                height: '58px',
                                borderRadius: '16px',
                                background: 'rgba(255,255,255,0.18)',
                                border: '1.5px solid rgba(255,255,255,0.35)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginBottom: '18px',
                                backdropFilter: 'blur(8px)',
                                boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
                                flexShrink: 0,
                            }}>
                                <CardIcon size={26} color="#FFFFFF" strokeWidth={1.8} />
                            </div>

                            {/* Card title */}
                            <h4 style={{ fontSize: '17px', fontWeight: 800, color: '#FFFFFF', margin: '0 0 20px', letterSpacing: '-0.3px' }}>{card.title}</h4>

                            {/* Divider */}
                            <div style={{ width: '40px', height: '2.5px', background: 'rgba(255,255,255,0.4)', borderRadius: '999px', marginBottom: '22px' }} />

                            {/* Bullet points */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
                                {card.points.map((pt) => {
                                    const PtIcon = pt.icon;
                                    return (
                                        <div key={pt.label} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                                            <div style={{
                                                width: '32px',
                                                height: '32px',
                                                borderRadius: '9px',
                                                background: 'rgba(255,255,255,0.15)',
                                                border: '1px solid rgba(255,255,255,0.28)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                flexShrink: 0,
                                                marginTop: '1px',
                                            }}>
                                                <PtIcon size={15} color="#FFFFFF" strokeWidth={2} />
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '13px', fontWeight: 800, color: '#FFFFFF', marginBottom: '3px', letterSpacing: '-0.1px' }}>{pt.label}</div>
                                                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.82)', lineHeight: 1.55, fontWeight: 500 }}>{pt.desc}</div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

/* ─── Dashboard Home ─────────────────────────────────── */
const DashboardHome = ({ user, onNavigate }) => (
    <div style={{ maxWidth: '1180px', margin: '0 auto' }}>
        {/* 1. Welcome Banner - Mint Green with Crisp White Text */}
        <div style={{
            background: 'linear-gradient(135deg, #059669 0%, #0D9488 100%)',
            borderRadius: '22px',
            padding: '30px 36px',
            boxShadow: '0 12px 30px rgba(5, 150, 105, 0.28)',
            marginBottom: '28px',
            color: '#FFFFFF'
        }}>
            <div style={{ fontSize: '26px', fontWeight: 900, color: '#FFFFFF', marginBottom: '8px', letterSpacing: '-0.4px' }}>
                Welcome back, {user?.fullName || 'Brock'}! 👋
            </div>
            <p style={{ fontSize: '14.5px', color: 'rgba(255, 255, 255, 0.95)', lineHeight: 1.6, margin: '0 0 18px', maxWidth: '650px' }}>
                Access channeling, pharmacy delivery, and lab reports all in one secured portal.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)', padding: '5px 14px', borderRadius: '999px', fontSize: '12px', fontWeight: 800, color: '#FFFFFF', border: '1px solid rgba(255,255,255,0.35)' }}>
                    <ShieldCheck size={14} color="#FFFFFF" /> HIPAA Secured
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)', padding: '5px 14px', borderRadius: '999px', fontSize: '12px', fontWeight: 800, color: '#FFFFFF', border: '1px solid rgba(255,255,255,0.35)' }}>
                    <Activity size={14} color="#FFFFFF" /> Health Active
                </span>
            </div>
        </div>

        {/* 2. Hospital Building Hero Banner */}
        <HospitalHeroBanner onNavigate={onNavigate} />

        {/* 3. Dark Modern Quick Stats Widgets */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '18px', marginBottom: '36px' }}>
            {[
                { label: 'Active Prescriptions', value: '2', icon: Pill, color: '#A78BFA', bg: 'rgba(167,139,250,0.15)', border: 'rgba(167,139,250,0.3)', tab: 'orders' },
                { label: 'Lab Tests Booked', value: '1', icon: FlaskConical, color: '#FBBF24', bg: 'rgba(251,191,36,0.15)', border: 'rgba(251,191,36,0.3)', tab: 'labs' },
                { label: 'Pending Orders', value: '1', icon: ClipboardList, color: '#2DD4BF', bg: 'rgba(45,212,191,0.15)', border: 'rgba(45,212,191,0.3)', tab: 'orders' },
                { label: 'Appointments', value: '0', icon: CalendarDays, color: '#60A5FA', bg: 'rgba(96,165,250,0.15)', border: 'rgba(96,165,250,0.3)', tab: 'channeling' },
            ].map(({ label, value, icon: Icon, color, bg, border, tab }) => (
                <div key={label}
                    onClick={() => tab && onNavigate(tab)}
                    style={{
                    background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
                    borderRadius: '20px',
                    padding: '20px 22px',
                    border: `1.5px solid ${border}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '18px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                    transition: 'all 0.25s ease',
                    cursor: tab ? 'pointer' : 'default',
                }}>
                    <div style={{
                        width: '50px',
                        height: '50px',
                        borderRadius: '15px',
                        background: bg,
                        border: `1px solid ${border}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: `0 0 15px ${bg}`,
                    }}>
                        <Icon size={24} color={color} />
                    </div>
                    <div>
                        <div style={{ fontSize: '26px', fontWeight: 900, color: '#F8FAFC', letterSpacing: '-0.5px' }}>{value}</div>
                        <div style={{ fontSize: '12.5px', color: '#94A3B8', fontWeight: 600, marginTop: '2px' }}>{label}</div>
                    </div>
                </div>
            ))}
        </div>

        {/* 4. Core Service Widget Cards (Dark Glassmorphic Theme) */}
        <div style={{ marginBottom: '36px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '10px', margin: '0 0 16px' }}>
                <HeartPulse size={20} color="#0D9488" /> Core Healthcare Portal Services
            </h2>
            <ServiceWidgetCards onNavigate={onNavigate} />
        </div>

        {/* 5. OUR SERVICES informational grid */}
        <OurServicesGrid />

        {/* 6. Dark Health Tips */}
        <AnimatedDailyTips />

        {/* 7. Trust & Facilities */}
        <CompanyTrustAndFacilities />

        {/* 8. Emergency Notice */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '16px', padding: '18px 22px', marginTop: '8px' }}>
            <AlertCircle size={20} color="#2563EB" />
            <div>
                <strong style={{ fontSize: '14px' }}>Emergency Contacts</strong>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#475569' }}>
                    Health Bridge Emergency: <strong>+94 76 447 7999</strong> &nbsp;|&nbsp; Support: <strong>help@healthbridge.com</strong>
                </p>
            </div>
        </div>
    </div>
);

/* ─── Footer (Mint Green Theme with Clear White Letters) ─────── */
const CorporateFooter = () => (
    <footer style={{ background: 'linear-gradient(135deg, #047857 0%, #065F46 100%)', color: '#FFFFFF', padding: '44px 36px 24px', marginTop: 'auto', borderTop: '1px solid #059669' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1.5fr', gap: '40px', paddingBottom: '32px', borderBottom: '1px solid rgba(255,255,255,0.15)' }}>
            <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                    <div style={{ background: '#FFFFFF', padding: '3px 6px', borderRadius: '10px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                        <img src={logoImage} alt="Health Bridge Private" style={{ height: '34px', objectFit: 'contain' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '16px', fontWeight: 900, color: '#FFFFFF', letterSpacing: '-0.3px', lineHeight: 1.1 }}>HEALTH BRIDGE</span>
                        <span style={{ fontSize: '10px', fontWeight: 800, color: '#A7F3D0', letterSpacing: '1.2px', textTransform: 'uppercase' }}>PRIVATE</span>
                    </div>
                </div>
                <p style={{ fontSize: '13.5px', color: '#ECFDF5', lineHeight: 1.6, margin: '0 0 16px', maxWidth: '340px' }}>
                    Empowering patients with trusted digital healthcare, smart pharmacy fulfillment, and certified laboratory services.
                </p>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255, 255, 255, 0.15)', border: '1px solid rgba(255, 255, 255, 0.3)', padding: '4px 12px', borderRadius: '8px', fontSize: '11.5px', fontWeight: 800, color: '#FFFFFF' }}>
                        <Shield size={13} color="#A7F3D0" /> ISO 27001
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255, 255, 255, 0.15)', border: '1px solid rgba(255, 255, 255, 0.3)', padding: '4px 12px', borderRadius: '8px', fontSize: '11.5px', fontWeight: 800, color: '#FFFFFF' }}>
                        <CheckCircle2 size={13} color="#A7F3D0" /> SLMC Approved
                    </span>
                </div>
            </div>
            <div>
                <h4 style={{ fontSize: '14px', fontWeight: 900, color: '#FFFFFF', margin: '0 0 16px', letterSpacing: '0.3px', textTransform: 'uppercase' }}>Patient Services</h4>
                {['Doctor Appointments', 'Prescription Fulfillment', 'Diagnostic Pathology', 'Medical Vault Access'].map(l => (
                    <div key={l} style={{ fontSize: '13.5px', color: '#ECFDF5', marginBottom: '10px', fontWeight: 500 }}>{l}</div>
                ))}
            </div>
            <div>
                <h4 style={{ fontSize: '14px', fontWeight: 900, color: '#FFFFFF', margin: '0 0 16px', letterSpacing: '0.3px', textTransform: 'uppercase' }}>Patient Care</h4>
                {['Help & Support Center', 'Frequently Asked Questions', 'Privacy & HIPAA Notice', 'Terms of Service'].map(l => (
                    <div key={l} style={{ fontSize: '13.5px', color: '#ECFDF5', marginBottom: '10px', fontWeight: 500 }}>{l}</div>
                ))}
            </div>
            <div>
                <h4 style={{ fontSize: '14px', fontWeight: 900, color: '#FFFFFF', margin: '0 0 16px', letterSpacing: '0.3px', textTransform: 'uppercase' }}>Emergency & Location</h4>
                {[
                    { icon: Phone, text: '24/7 Hotline: +94 76 447 7999' },
                    { icon: Mail, text: 'care@healthbridge.lk' },
                    { icon: MapPin, text: 'No 45, Hospital Road, Colombo 03' },
                ].map(({ icon: Icon, text }) => (
                    <div key={text} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13.5px', color: '#ECFDF5', marginBottom: '12px', fontWeight: 500 }}>
                        <Icon size={16} color="#A7F3D0" /> {text}
                    </div>
                ))}
            </div>
        </div>
        <div style={{ paddingTop: '22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12.5px', color: '#D1FAE5', fontWeight: 500 }}>
            <span>© {new Date().getFullYear()} Health Bridge Private Medical Portal. All rights reserved.</span>
            <span>Privacy Policy &nbsp;·&nbsp; Terms of Service</span>
        </div>
    </footer>
);

/* ─── Patient Orders Component ─────────────────────────────────── */
const PatientOrders = ({ user, onNavigate }) => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [paymentMethod, setPaymentMethod] = useState('CashOnDelivery');
    const [confirmingPayment, setConfirmingPayment] = useState(false);
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
    const [viewRxModal, setViewRxModal] = useState(null);
    const [cancelConfirmOrder, setCancelConfirmOrder] = useState(null);
    const [cancellingOrder, setCancellingOrder] = useState(false);
    const [now, setNow] = useState(Date.now());

    // Tick every second for live countdown
    useEffect(() => {
        const interval = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        fetchOrders();
    }, [user]);

    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3500);
    };

    const fetchOrders = async () => {
        setLoading(true);
        try {
            let apiOrders = [];
            try {
                const res = await api.get('/PharmacyOrders');
                apiOrders = res.data || [];
            } catch (err) {
                console.warn('Backend orders fetch failed, reading local cache:', err);
            }

            let localOrders = [];
            try {
                localOrders = JSON.parse(localStorage.getItem('medix_pharmacy_orders') || '[]');
            } catch (e) { }

            // Merge local and API orders
            const map = new Map();
            [...apiOrders, ...localOrders].forEach(o => {
                if (o && (o.id || o.orderNumber)) {
                    map.set(o.id || o.orderNumber, o);
                }
            });

            const merged = Array.from(map.values());
            const userEmail = user?.email || user?.username;
            const filtered = merged.filter(o => {
                if (!userEmail) return true;
                return o.customerEmail?.toLowerCase() === userEmail.toLowerCase() || o.patientId === user?.id;
            });

            filtered.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
            setOrders(filtered);
        } catch (err) {
            console.error('Failed to load patient orders:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmOrderPayment = async (e) => {
        e.preventDefault();
        if (!selectedOrder) return;

        setConfirmingPayment(true);
        try {
            const updatedStatus = 'Confirmed';
            try {
                await api.put(`/PharmacyOrders/${selectedOrder.id}/status`, {
                    status: updatedStatus,
                    paymentMethod: paymentMethod,
                    patientConfirmed: true
                });
            } catch (err) {
                console.warn('API update failed, updating local state:', err);
            }

            const updated = orders.map(o => o.id === selectedOrder.id ? {
                ...o,
                status: updatedStatus,
                paymentMethod: paymentMethod,
                patientConfirmed: true
            } : o);

            setOrders(updated);
            try {
                localStorage.setItem('medix_pharmacy_orders', JSON.stringify(updated));
            } catch (e) { }

            showToast('Order payment confirmed! Processing for home delivery dispatch.', 'success');
            setSelectedOrder(null);
        } catch (err) {
            showToast('Failed to confirm payment.', 'error');
        } finally {
            setConfirmingPayment(false);
        }
    };

    const getCancelSecondsLeft = (order) => {
        const placed = new Date(order.createdAt || 0).getTime();
        const elapsed = (now - placed) / 1000;
        return 21600 - elapsed;
    };

    const formatCountdown = (secs) => {
        if (secs <= 0) return null;
        const h = Math.floor(secs / 3600);
        const m = Math.floor((secs % 3600) / 60);
        const s = Math.floor(secs % 60);
        return `${h}h ${m}m ${s}s`;
    };

    const canCancel = (order) => {
        if (['Dispatched', 'Delivered', 'Cancelled'].includes(order.status)) return false;
        return getCancelSecondsLeft(order) > 0;
    };

    const handleCancelOrder = async () => {
        if (!cancelConfirmOrder) return;
        setCancellingOrder(true);
        try {
            try { await api.put(`/PharmacyOrders/${cancelConfirmOrder.id}/status`, { status: 'Cancelled', adminNote: 'Cancelled by patient.' }); } catch (e) { console.warn('Cancel API fallback:', e); }
            const updated = orders.map(o => o.id === cancelConfirmOrder.id ? { ...o, status: 'Cancelled' } : o);
            setOrders(updated);
            try { localStorage.setItem('medix_pharmacy_orders', JSON.stringify(updated)); } catch (e) { }
            showToast('Your order has been cancelled successfully.', 'success');
        } catch (e) { showToast('Failed to cancel order.', 'error'); }
        finally { setCancellingOrder(false); setCancelConfirmOrder(null); }
    };

    const handleDeletePatientOrder = async (orderId) => {
        if (!window.confirm('Are you sure you want to delete this order from your order history?')) return;
        try {
            try { await api.delete(`/PharmacyOrders/${orderId}`); } catch (e) { console.warn('Delete API fallback:', e); }
            const updated = orders.filter(o => o.id !== orderId);
            setOrders(updated);
            try { localStorage.setItem('medix_pharmacy_orders', JSON.stringify(updated)); } catch (e) { }
            showToast('Order removed from your order history.', 'success');
        } catch (e) { showToast('Failed to delete order.', 'error'); }
    };

    const getStatusStyle = (status) => {
        switch (status) {
            case 'PendingVerification': case 'Pending':
                return { bg: '#FEF3C7', color: '#D97706', border: '#FDE68A', label: 'Pending Pharmacist Review', icon: Clock };
            case 'Approved':
                return { bg: '#E0F2FE', color: '#0284C7', border: '#BAE6FD', label: 'Quoted — Ready for Payment', icon: CheckCircle2 };
            case 'Confirmed':
                return { bg: '#ECFDF5', color: '#059669', border: '#A7F3D0', label: 'Order Confirmed', icon: CheckCircle2 };
            case 'Dispatched':
                return { bg: '#F0FDFA', color: '#0D9488', border: '#99F6E4', label: 'Out for Delivery', icon: Truck };
            case 'Delivered':
                return { bg: '#D1FAE5', color: '#047857', border: '#6EE7B7', label: 'Delivered', icon: CheckCircle2 };
            case 'Cancelled':
                return { bg: '#FEE2E2', color: '#DC2626', border: '#FCA5A5', label: 'Cancelled', icon: AlertCircle };
            default:
                return { bg: '#F1F5F9', color: '#475569', border: '#E2E8F0', label: status || 'Processing', icon: Clock };
        }
    };

    // Stage tracker helpers
    const getStages = (order) => {
        const isRx = !!(order.prescriptionImageUrl || order.daysSupply);
        return isRx
            ? [{ key: 'placed', label: 'Order Placed' }, { key: 'confirmed', label: 'Order Confirmed' }, { key: 'shipped', label: 'Order Shipped' }, { key: 'delivered', label: 'Order Delivered' }]
            : [{ key: 'confirmed', label: 'Order Confirmed' }, { key: 'shipped', label: 'Order Shipped' }, { key: 'delivered', label: 'Order Delivered' }];
    };

    const getActiveStageIndex = (order) => {
        const isRx = !!(order.prescriptionImageUrl || order.daysSupply);
        const s = order.status;
        if (s === 'Cancelled') return -1;
        if (isRx) {
            if (s === 'PendingVerification' || s === 'Pending' || s === 'Approved') return 0;
            if (s === 'Confirmed') return 1;
            if (s === 'Dispatched') return 2;
            if (s === 'Delivered') return 3;
            return 0;
        } else {
            if (s === 'Confirmed') return 0;
            if (s === 'Dispatched') return 1;
            if (s === 'Delivered') return 2;
            return 0;
        }
    };

    const OrderStageTracker = ({ order }) => {
        if (order.status === 'Cancelled') {
            return (
                <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '12px', padding: '11px 14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertCircle size={16} color="#DC2626" />
                    <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#991B1B' }}>This order has been cancelled.</span>
                </div>
            );
        }
        const stages = getStages(order);
        const activeIdx = getActiveStageIndex(order);
        return (
            <div style={{ padding: '14px 16px', background: '#F0FDF4', borderRadius: '14px', border: '1px solid #BBF7D0' }}>
                <div style={{ fontSize: '10.5px', fontWeight: 800, color: '#15803D', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '14px' }}>Order Progress</div>
                <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                    {stages.map((stage, idx) => {
                        const done = idx <= activeIdx;
                        const active = idx === activeIdx;
                        return (
                            <React.Fragment key={stage.key}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: '0 0 auto' }}>
                                    <div style={{
                                        width: active ? '28px' : '22px', height: active ? '28px' : '22px',
                                        borderRadius: '50%',
                                        background: done ? '#059669' : '#D1FAE5',
                                        border: active ? '3px solid #059669' : done ? '2.5px solid #047857' : '2px solid #A7F3D0',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        boxShadow: active ? '0 0 0 5px rgba(5,150,105,0.15)' : 'none',
                                        transition: 'all 0.3s',
                                        flexShrink: 0,
                                    }}>
                                        {done && <CheckCircle2 size={12} color="#FFFFFF" />}
                                    </div>
                                    <div style={{ fontSize: '10.5px', fontWeight: active ? 800 : 600, color: done ? '#047857' : '#94A3B8', marginTop: '7px', textAlign: 'center', lineHeight: 1.3, maxWidth: '60px', whiteSpace: 'pre-wrap' }}>
                                        {stage.label}
                                    </div>
                                </div>
                                {idx < stages.length - 1 && (
                                    <div style={{ flex: 1, height: '3px', background: idx < activeIdx ? '#059669' : '#D1FAE5', marginTop: '11px', borderRadius: '2px', transition: 'background 0.4s' }} />
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div style={{ maxWidth: '1180px', margin: '0 auto' }}>
            {/* Toast */}
            {toast.show && (
                <div style={{
                    position: 'fixed', top: '24px', right: '24px', zIndex: 9999,
                    background: toast.type === 'error' ? '#EF4444' : '#10B981', color: '#FFF',
                    padding: '12px 24px', borderRadius: '10px', fontWeight: 700, boxShadow: '0 10px 25px rgba(0,0,0,0.15)'
                }}>
                    {toast.message}
                </div>
            )}

            {/* Header Banner */}
            <div style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)', borderRadius: '22px', padding: '28px 36px', color: '#FFF', marginBottom: '28px', border: '1.5px solid rgba(255,255,255,0.1)', boxShadow: '0 12px 30px rgba(0,0,0,0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(20,184,166,0.2)', border: '1px solid rgba(20,184,166,0.4)', color: '#2DD4BF', padding: '4px 12px', borderRadius: '999px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', marginBottom: '10px' }}>
                        <ClipboardList size={13} /> PRESCRIPTION & PHARMACY ORDERS
                    </div>
                    <h2 style={{ fontSize: '24px', fontWeight: 900, margin: '0 0 6px', color: '#F8FAFC' }}>My Order History & Verification Quotes</h2>
                    <p style={{ fontSize: '13.5px', color: '#94A3B8', margin: 0, maxWidth: '600px' }}>
                        Track prescription verification quotes from licensed pharmacists and manage home delivery payments.
                    </p>
                </div>
                <button
                    onClick={() => onNavigate('pharmacy')}
                    style={{ background: '#059669', color: '#FFF', border: 'none', padding: '12px 22px', borderRadius: '12px', fontWeight: 800, fontSize: '13.5px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 6px 16px rgba(5,150,105,0.35)' }}
                >
                    <Pill size={16} /> Browse Pharmacy Store
                </button>
            </div>

            {/* Orders Content */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748B' }}>
                    <div className="spinner" />
                    <p style={{ marginTop: '12px', fontWeight: 600 }}>Loading your prescription orders...</p>
                </div>
            ) : orders.length === 0 ? (
                <div style={{ background: '#FFF', borderRadius: '20px', padding: '60px 24px', textAlign: 'center', border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                    <ClipboardList size={54} color="#CBD5E1" style={{ margin: '0 auto 16px' }} />
                    <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: '0 0 8px' }}>No Orders Found</h3>
                    <p style={{ fontSize: '14px', color: '#64748B', margin: '0 0 20px', maxWidth: '420px', marginInline: 'auto' }}>
                        You haven't submitted any pharmacy orders or uploaded prescription receipts yet.
                    </p>
                    <button
                        onClick={() => onNavigate('pharmacy')}
                        style={{ background: '#059669', color: '#FFF', border: 'none', padding: '12px 24px', borderRadius: '12px', fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}
                    >
                        Visit Pharmacy Store
                    </button>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '22px' }}>
                    {orders.map(order => {
                        const badge = getStatusStyle(order.status);
                        const StatusIcon = badge.icon;
                        const secsLeft = getCancelSecondsLeft(order);
                        const cdStr = formatCountdown(secsLeft);
                        return (
                            <div key={order.id} style={{ background: '#FFF', borderRadius: '22px', padding: '24px', border: '1px solid #E2E8F0', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {/* Header */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <div style={{ fontSize: '15px', fontWeight: 900, color: '#0F172A' }}>{order.orderNumber}</div>
                                        <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <CalendarDays size={11} /> {new Date(order.createdAt || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`, padding: '5px 11px', borderRadius: '999px', fontSize: '11px', fontWeight: 800 }}>
                                        <StatusIcon size={12} /> {badge.label}
                                    </div>
                                </div>

                                {/* Stage Tracker */}
                                <OrderStageTracker order={order} />

                                {/* Items Summary */}
                                <div style={{ background: '#F8FAFC', borderRadius: '14px', padding: '14px', border: '1px solid #F1F5F9' }}>
                                    <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>Order Summary</div>
                                    {order.items && order.items.length > 0 ? order.items.map((item, idx) => {
                                        const isPendingRx = order.status === 'PendingVerification' || order.status === 'Pending' || item.requiresPrescription || item.unitType === 'RxQuote' || (order.totalAmount === 0 && !order.patientConfirmed);
                                        return (
                                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#334155', marginBottom: '6px' }}>
                                                <span>{item.medicineName || item.name} (x{item.quantity})</span>
                                                <span style={{ fontWeight: 700, color: isPendingRx ? '#D97706' : '#059669' }}>
                                                    {isPendingRx ? 'Quote Pending' : `Rs. ${(item.subtotal || (item.unitPrice || item.price || 0) * item.quantity || 0).toFixed(2)}`}
                                                </span>
                                            </div>
                                        );
                                    }) : <div style={{ fontSize: '12.5px', color: '#475569', fontStyle: 'italic' }}>Doctor Prescription Verification Request</div>}

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed #CBD5E1' }}>
                                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#475569' }}>Total Quoted Price:</span>
                                        <span style={{ fontSize: '17px', fontWeight: 900, color: (order.status !== 'PendingVerification' && order.totalAmount > 0) ? '#059669' : '#D97706' }}>
                                            {(order.status !== 'PendingVerification' && order.totalAmount > 0) ? `Rs. ${order.totalAmount.toFixed(2)}` : 'Awaiting Pharmacist Quote'}
                                        </span>
                                    </div>
                                </div>

                                {/* Pending Pharmacist Verification Notice Banner */}
                                {(order.status === 'PendingVerification' || order.status === 'Pending' || (order.totalAmount === 0 && !order.patientConfirmed)) && (
                                    <div style={{ background: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: '12px', padding: '12px 14px', color: '#92400E', fontSize: '12px', lineHeight: 1.45 }}>
                                        <div style={{ fontWeight: 800, color: '#B45309', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                            <Clock size={15} color="#D97706" /> Pharmacist Quote Pending
                                        </div>
                                        Our Pharmacist is inspecting your prescription photo and calculating dosage &amp; total cost. Once approved, the final price will be sent here for your confirmation and payment.
                                    </div>
                                )}

                                {/* Prescription Attached */}
                                {order.prescriptionImageUrl && (
                                    <div style={{ background: '#FFFBEB', borderRadius: '12px', padding: '12px', border: '1px solid #FDE68A', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <FileCheck size={16} color="#D97706" />
                                            <div>
                                                <div style={{ fontSize: '12px', fontWeight: 800, color: '#92400E' }}>Doctor Prescription Attached</div>
                                                <div style={{ fontSize: '11px', color: '#B45309' }}>Supply: {order.daysSupply ? `${order.daysSupply} Days` : 'Standard'}</div>
                                            </div>
                                        </div>
                                        <button onClick={() => setViewRxModal(order.prescriptionImageUrl)} style={{ background: '#FFF', border: '1px solid #F59E0B', color: '#B45309', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>View Photo</button>
                                    </div>
                                )}

                                {/* Pharmacist Note */}
                                {order.adminNote && (
                                    <div style={{ background: '#F0F9FF', borderRadius: '12px', padding: '12px', border: '1px solid #BAE6FD', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                                        <Sparkles size={14} color="#0284C7" style={{ marginTop: '2px', flexShrink: 0 }} />
                                        <div>
                                            <div style={{ fontSize: '11.5px', fontWeight: 800, color: '#0369A1' }}>Pharmacist Note:</div>
                                            <div style={{ fontSize: '12px', color: '#1E293B', marginTop: '2px', lineHeight: 1.4 }}>{order.adminNote}</div>
                                        </div>
                                    </div>
                                )}

                                {/* Cancellation Countdown */}
                                {!['Dispatched', 'Delivered', 'Cancelled'].includes(order.status) && (
                                    cdStr ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '10px', padding: '7px 12px' }}>
                                            <Clock size={13} color="#D97706" />
                                            <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#92400E' }}>Free cancel window: <span style={{ color: '#D97706' }}>{cdStr}</span> remaining</span>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', background: '#F1F5F9', border: '1px solid #CBD5E1', borderRadius: '10px', padding: '7px 12px' }}>
                                            <AlertCircle size={13} color="#64748B" />
                                            <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#64748B' }}>Cancellation window expired (6h limit passed)</span>
                                        </div>
                                    )
                                )}

                                {/* Action Row */}
                                <div style={{ display: 'flex', gap: '10px', marginTop: 'auto', flexWrap: 'wrap' }}>
                                    {order.status === 'Approved' && (
                                        <button onClick={() => setSelectedOrder(order)} style={{ flex: 1, background: 'linear-gradient(135deg, #059669 0%, #0D9488 100%)', color: '#FFF', border: 'none', padding: '11px', borderRadius: '12px', fontWeight: 800, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', boxShadow: '0 6px 16px rgba(5,150,105,0.25)' }}>
                                            <CheckCircle2 size={15} /> Confirm & Pay
                                        </button>
                                    )}
                                    {canCancel(order) && (
                                        <button onClick={() => setCancelConfirmOrder(order)} style={{ flex: order.status === 'Approved' ? '0 0 auto' : 1, background: '#FFF', color: '#DC2626', border: '1.5px solid #FCA5A5', padding: '11px 16px', borderRadius: '12px', fontWeight: 700, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                            ✕ Cancel Order
                                        </button>
                                    )}
                                    <button onClick={() => handleDeletePatientOrder(order.id)} style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', padding: '11px 14px', borderRadius: '12px', fontWeight: 700, fontSize: '12.5px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }} title="Delete Order from History">
                                        <Trash2 size={15} /> Delete
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Payment Modal */}
            {selectedOrder && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div style={{ background: '#FFF', borderRadius: '20px', width: '100%', maxWidth: '520px', padding: '28px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', borderBottom: '1px solid #E2E8F0', paddingBottom: '14px' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: 900, color: '#0F172A', margin: 0 }}>Confirm Order #{selectedOrder.orderNumber}</h3>
                            <button onClick={() => setSelectedOrder(null)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748B' }}>&times;</button>
                        </div>

                        <form onSubmit={handleConfirmOrderPayment}>
                            <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '14px', padding: '16px', marginBottom: '20px' }}>
                                <div style={{ fontSize: '12px', fontWeight: 800, color: '#047857', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Verified Pharmacist Quote</div>
                                <div style={{ fontSize: '24px', fontWeight: 900, color: '#059669', marginTop: '4px' }}>Rs. {selectedOrder.totalAmount?.toFixed(2)}</div>
                                <div style={{ fontSize: '12.5px', color: '#065F46', marginTop: '4px' }}>Delivery Address: {selectedOrder.deliveryAddress}</div>
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 800, color: '#0F172A', marginBottom: '10px' }}>Select Payment Method:</label>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {[
                                        { id: 'CashOnDelivery', label: '💵 Cash on Home Delivery (COD)', desc: 'Pay cash to dispatch rider when items arrive' },
                                        { id: 'Card', label: '💳 Credit / Debit Card', desc: 'Instant online card checkout' },
                                        { id: 'BankTransfer', label: '🏦 Direct Bank Transfer', desc: 'Health Bridge Commercial Bank Acc #8001239942' },
                                    ].map(m => (
                                        <label key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', borderRadius: '12px', border: paymentMethod === m.id ? '2px solid #059669' : '1px solid #CBD5E1', background: paymentMethod === m.id ? '#ECFDF5' : '#FFF', cursor: 'pointer' }}>
                                            <input type="radio" name="payMethod" checked={paymentMethod === m.id} onChange={() => setPaymentMethod(m.id)} style={{ accentColor: '#059669' }} />
                                            <div>
                                                <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A' }}>{m.label}</div>
                                                <div style={{ fontSize: '12px', color: '#64748B' }}>{m.desc}</div>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                                <button type="button" onClick={() => setSelectedOrder(null)} style={{ padding: '10px 18px', borderRadius: '10px', border: '1px solid #CBD5E1', background: '#FFF', color: '#475569', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                                <button type="submit" disabled={confirmingPayment} style={{ padding: '10px 22px', borderRadius: '10px', border: 'none', background: '#059669', color: '#FFF', fontWeight: 800, cursor: 'pointer' }}>
                                    {confirmingPayment ? 'Confirming...' : 'Confirm & Place Order'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Cancel Confirmation Modal */}
            {cancelConfirmOrder && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(5px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div style={{ background: '#FFF', borderRadius: '22px', width: '100%', maxWidth: '440px', padding: '32px', boxShadow: '0 25px 50px rgba(0,0,0,0.25)', textAlign: 'center' }}>
                        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
                            <AlertCircle size={30} color="#DC2626" />
                        </div>
                        <h3 style={{ fontSize: '20px', fontWeight: 900, color: '#0F172A', margin: '0 0 8px' }}>Cancel This Order?</h3>
                        <p style={{ fontSize: '14px', color: '#64748B', margin: '0 0 10px', lineHeight: 1.5 }}>
                            Are you sure you want to cancel order <strong style={{ color: '#0F172A' }}>{cancelConfirmOrder.orderNumber}</strong>? This action cannot be undone.
                        </p>
                        {formatCountdown(getCancelSecondsLeft(cancelConfirmOrder)) && (
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '8px', padding: '6px 14px', marginBottom: '22px', fontSize: '13px', fontWeight: 700, color: '#92400E' }}>
                                <Clock size={14} color="#D97706" />
                                Time left to cancel: <span style={{ color: '#D97706' }}>{formatCountdown(getCancelSecondsLeft(cancelConfirmOrder))}</span>
                            </div>
                        )}
                        <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                            <button onClick={() => setCancelConfirmOrder(null)} style={{ flex: 1, padding: '13px', borderRadius: '12px', border: '1.5px solid #CBD5E1', background: '#FFF', color: '#334155', fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}>
                                No, Keep Order
                            </button>
                            <button onClick={handleCancelOrder} disabled={cancellingOrder} style={{ flex: 1, padding: '13px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #DC2626, #B91C1C)', color: '#FFF', fontWeight: 800, fontSize: '14px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(220,38,38,0.3)' }}>
                                {cancellingOrder ? 'Cancelling...' : 'Yes, Cancel Order'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Rx Photo Modal */}
            {viewRxModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={() => setViewRxModal(null)}>
                    <div style={{ background: '#FFF', padding: '20px', borderRadius: '16px', maxWidth: '560px', width: '100%', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                        <h4 style={{ margin: '0 0 14px', fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>Doctor Prescription Receipt Photo</h4>
                        <img src={viewRxModal} alt="Prescription" style={{ width: '100%', maxHeight: '450px', objectFit: 'contain', borderRadius: '10px', border: '1px solid #CBD5E1' }} />
                        <button onClick={() => setViewRxModal(null)} style={{ marginTop: '16px', padding: '8px 24px', background: '#059669', color: '#FFF', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>Close Preview</button>
                    </div>
                </div>
            )}
        </div>
    );
};

/* ─── Main Patient Dashboard ─────────────────────────── */
const PatientDashboard = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { user, logout } = useAuth();

    // Read active tab directly from URL query param `?tab=...` (defaults to 'home')
    const activeTab = searchParams.get('tab') || 'home';
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

    const handleNavigate = (tab) => {
        if (tab === 'emr') {
            navigate('/emr/overview');
            return;
        }
        if (tab === activeTab) return;

        if (tab === 'home') {
            navigate('/patient/dashboard');
        } else {
            navigate(`/patient/dashboard?tab=${tab}`);
        }
    };

    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3500);
    };

    const renderContent = () => {
        if (activeTab === 'orders') return <PatientOrders user={user} onNavigate={handleNavigate} />;
        if (activeTab === 'pharmacy') return <CustomerPharmacyStore user={user} onNavigate={handleNavigate} />;
        if (activeTab === 'labs') return <CustomerLabHub user={user} onNavigate={handleNavigate} showToast={showToast} />;
        if (activeTab === 'channeling') return <DoctorChannelingSection user={user} showToast={showToast} />;
        if (activeTab === 'profile') return <PatientProfileSection user={user} showToast={showToast} />;
        if (activeTab === 'feedback') return <PatientFeedbackSection user={user} showToast={showToast} />;
        return <DashboardHome user={user} onNavigate={handleNavigate} />;
    };

    const title = activeTab === 'orders'
        ? 'My Pharmacy & Prescription Orders'
        : activeTab === 'pharmacy'
            ? 'Pharmacy Store'
            : activeTab === 'labs'
                ? 'Laboratory Diagnostic Hub & Reports'
                : activeTab === 'channeling'
                    ? 'Doctor Channeling'
                    : activeTab === 'profile'
                        ? 'Patient Profile & Security'
                        : activeTab === 'feedback'
                            ? 'Patient Reviews & Feedback'
                            : activeTab === 'services'
                                ? 'Core Health Services'
                                : 'Patient Portal';

    return (
        <div style={ps.container}>
            {toast.show && (
                <div style={{
                    position: 'fixed', top: '24px', right: '24px', zIndex: 9999,
                    background: toast.type === 'error' ? '#EF4444' : '#10B981', color: '#FFF',
                    padding: '12px 24px', borderRadius: '10px', fontWeight: 700, boxShadow: '0 10px 25px rgba(0,0,0,0.15)'
                }}>
                    {toast.message}
                </div>
            )}
            <Sidebar active={activeTab} onNavigate={handleNavigate} user={user} onLogout={logout} />
            <div style={ps.mainWrapper}>
                <DashboardHeader title={title} subtitle="Manage health records, channeling, pharmacy & lab reports." user={user} onNavigate={handleNavigate} />
                <main style={ps.contentArea}>{renderContent()}</main>
                <CorporateFooter />
            </div>
        </div>
    );
};

export default PatientDashboard;

/* ─── Styles ─────────────────────────────────────────── */
const ps = {
    container: { display: 'flex', minHeight: '100vh', background: '#F8FAFC', fontFamily: "'Inter', system-ui, sans-serif" },
    sidebar: { width: '260px', background: '#fff', borderRight: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, bottom: 0, left: 0, zIndex: 100 },
    sidebarLogo: { padding: '24px 24px 20px', borderBottom: '1px solid #F1F5F9' },
    logoImg: { height: '42px', objectFit: 'contain' },
    sidebarNav: { padding: '20px 14px', display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 },
    navBtn: { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '12px', border: 'none', background: 'transparent', color: '#64748B', fontSize: '14px', fontWeight: 600, cursor: 'pointer', position: 'relative', transition: 'all 0.2s ease', textAlign: 'left' },
    navBtnActive: { background: '#ECFDF5', color: '#059669', fontWeight: 700 },
    activeIndicator: { position: 'absolute', right: 0, top: '20%', bottom: '20%', width: '4px', borderRadius: '4px 0 0 4px', background: '#059669' },
    sidebarUserCard: { padding: '16px', margin: '14px', background: '#F8FAFC', borderRadius: '14px', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: '12px' },
    avatarCircle: { width: '36px', height: '36px', borderRadius: '50%', background: '#059669', color: '#fff', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' },
    userNameText: { fontSize: '13px', fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
    userRoleTag: { fontSize: '11px', color: '#64748B' },
    logoutBtn: { background: 'transparent', border: 'none', cursor: 'pointer', padding: '6px', borderRadius: '8px' },
    mainWrapper: { marginLeft: '260px', flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 },
    topHeader: { height: '76px', background: '#fff', borderBottom: '1px solid #E2E8F0', padding: '0 36px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 90 },
    headerTitle: { fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: 0 },
    headerSubtitle: { fontSize: '12.5px', color: '#64748B', margin: '2px 0 0' },
    headerActions: { display: 'flex', alignItems: 'center', gap: '16px' },
    headerIconBtn: { position: 'relative', width: '40px', height: '40px', borderRadius: '12px', border: '1px solid #E2E8F0', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
    notifDot: { position: 'absolute', top: '9px', right: '9px', width: '8px', height: '8px', borderRadius: '50%', background: '#EF4444' },
    headerProfilePill: { display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 14px 6px 6px', borderRadius: '999px', border: '1px solid #E2E8F0', background: '#F8FAFC', cursor: 'pointer' },
    headerAvatar: { width: '28px', height: '28px', borderRadius: '50%', background: '#059669', color: '#fff', fontSize: '12px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' },
    headerUserName: { fontSize: '13px', fontWeight: 700, color: '#1E293B' },
    contentArea: { padding: '32px 36px', flex: 1 },
};

const dt = {
    wrap: { position: 'relative', borderRadius: '24px', border: '1.5px solid', padding: '26px 30px', marginBottom: '28px', boxShadow: '0 20px 45px rgba(0,0,0,0.35)', overflow: 'hidden', transition: 'all 0.4s ease', color: '#F8FAFC' },
    iconBtn: { width: '34px', height: '34px', borderRadius: '11px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s ease' },
    arrowBtn: { width: '32px', height: '32px', borderRadius: '10px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
};
