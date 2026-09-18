import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    FlaskConical, Activity, Clock, CheckCircle2, AlertCircle,
    Calendar, ArrowRight, ShieldCheck, Sparkles, RefreshCw,
    Search, FileText, ChevronRight, Eye, Download, Info,
    Microscope, Stethoscope, Award, Zap, Check, HelpCircle,
    Lock, LogIn
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { getMyBookings, getAllTests } from '../../../api/labApi';
import TestCatalogueSection from './TestCatalogueSection';
import MyLabBookingsSection from './MyLabBookingsSection';
import BookLabTestModal from './BookLabTestModal';
import BookingTrackingModal from './BookingTrackingModal';

const CustomerLabHub = ({ user: propUser, onNavigate, showToast, initialTab = 'hub' }) => {
    const authContext = useAuth();
    const navigate = useNavigate();
    const user = propUser || authContext?.user;
    const isLoggedIn = Boolean(user && (user.id || user.userId || user.email));

    const [activeTab, setActiveTab] = useState(initialTab); // 'hub' | 'catalogue' | 'bookings'
    const [initialBookingFilter, setInitialBookingFilter] = useState('ALL');
    const [loginPromptAction, setLoginPromptAction] = useState(null);

    // Data state
    const [loading, setLoading] = useState(true);
    const [bookings, setBookings] = useState([]);
    const [featuredTests, setFeaturedTests] = useState([]);
    const [stats, setStats] = useState({
        total: 0,
        pending: 0,
        active: 0,
        reportsReady: 0
    });

    // Modals
    const [bookingTest, setBookingTest] = useState(null);
    const [trackingBooking, setTrackingBooking] = useState(null);

    const requireAuth = (featureName, callback) => {
        if (isLoggedIn) {
            callback();
        } else {
            setLoginPromptAction(featureName);
        }
    };

    const loadHubData = useCallback(async () => {
        setLoading(true);
        try {
            if (!isLoggedIn) {
                // For non-logged-in guest patients: only fetch public lab tests catalogue
                const allTestsRes = await getAllTests();
                const rawTests = allTestsRes?.data || allTestsRes || [];
                const list = Array.isArray(rawTests) ? rawTests : (rawTests.data || rawTests.items || []);
                setFeaturedTests(list.slice(0, 4));
                setBookings([]);
                setStats({ total: 0, pending: 0, active: 0, reportsReady: 0 });
                setLoading(false);
                return;
            }

            const resolvedPatientId = parseInt(user?.id || user?.userId) || 1;
            const resolvedEmail = user?.email || '';

            const [myBookingsRes, allTestsRes] = await Promise.allSettled([
                getMyBookings(resolvedPatientId, resolvedEmail),
                getAllTests()
            ]);

            let myBookings = [];
            if (myBookingsRes.status === 'fulfilled') {
                const raw = myBookingsRes.value?.data || myBookingsRes.value || [];
                myBookings = Array.isArray(raw) ? raw : (raw.data || raw.items || []);
                setBookings(myBookings);

                const total = myBookings.length;
                const pending = myBookings.filter(b =>
                    b.status === 'PendingLabApproval' ||
                    b.status === 'PendingPrescriptionUpload' ||
                    b.status === 'PendingAIVerification' ||
                    b.status === 'PendingPayment'
                ).length;
                const active = myBookings.filter(b =>
                    b.status === 'Confirmed' ||
                    b.status === 'SampleCollected' ||
                    b.status === 'TestingInProgress'
                ).length;
                const reportsReady = myBookings.filter(b =>
                    b.status === 'ResultsReady' ||
                    b.status === 'ReportDelivered' ||
                    b.status === 'Completed' ||
                    (b.resultFileUrl && b.resultFileUrl.length > 0)
                ).length;

                setStats({ total, pending, active, reportsReady });
            }

            if (allTestsRes.status === 'fulfilled') {
                const rawTests = allTestsRes.value?.data || allTestsRes.value || [];
                const list = Array.isArray(rawTests) ? rawTests : (rawTests.data || rawTests.items || []);
                // Pick 4 popular/common tests for quick booking
                setFeaturedTests(list.slice(0, 4));
            }
        } catch (err) {
            console.error('Failed to load lab hub data:', err);
        } finally {
            setLoading(false);
        }
    }, [isLoggedIn, user]);

    useEffect(() => {
        loadHubData();
    }, [loadHubData]);

    const handleOpenBookingsWithFilter = (filter) => {
        requireAuth('access your laboratory bookings and reports', () => {
            setInitialBookingFilter(filter);
            setActiveTab('bookings');
        });
    };

    const latestActive = bookings.find(b =>
        b.status !== 'Completed' &&
        b.status !== 'Cancelled' &&
        b.status !== 'Rejected'
    );

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            {/* Top Hub Navigation Pills */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '16px',
                marginBottom: '28px',
                paddingBottom: '16px',
                borderBottom: '1px solid #E2E8F0'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                        onClick={() => setActiveTab('hub')}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 20px',
                            borderRadius: '12px',
                            fontSize: '14px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            border: 'none',
                            background: activeTab === 'hub' ? '#059669' : '#F1F5F9',
                            color: activeTab === 'hub' ? '#FFFFFF' : '#475569',
                            boxShadow: activeTab === 'hub' ? '0 4px 14px rgba(5, 150, 105, 0.3)' : 'none'
                        }}
                    >
                        <Activity size={16} /> Laboratory Overview
                    </button>
                    <button
                        onClick={() => setActiveTab('catalogue')}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 20px',
                            borderRadius: '12px',
                            fontSize: '14px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            border: 'none',
                            background: activeTab === 'catalogue' ? '#059669' : '#F1F5F9',
                            color: activeTab === 'catalogue' ? '#FFFFFF' : '#475569',
                            boxShadow: activeTab === 'catalogue' ? '0 4px 14px rgba(5, 150, 105, 0.3)' : 'none'
                        }}
                    >
                        <FlaskConical size={16} /> Explore Lab Tests
                    </button>
                    <button
                        onClick={() => {
                            if (!isLoggedIn) {
                                requireAuth('access your laboratory bookings and reports', () => {});
                                return;
                            }
                            setInitialBookingFilter('ALL');
                            setActiveTab('bookings');
                        }}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 20px',
                            borderRadius: '12px',
                            fontSize: '14px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            border: 'none',
                            background: activeTab === 'bookings' ? '#059669' : '#F1F5F9',
                            color: activeTab === 'bookings' ? '#FFFFFF' : '#475569',
                            boxShadow: activeTab === 'bookings' ? '0 4px 14px rgba(5, 150, 105, 0.3)' : 'none'
                        }}
                    >
                        <FileText size={16} /> My Bookings & Reports
                        {isLoggedIn && stats.reportsReady > 0 && (
                            <span style={{
                                padding: '2px 8px',
                                borderRadius: '999px',
                                background: activeTab === 'bookings' ? '#FFFFFF' : '#10B981',
                                color: activeTab === 'bookings' ? '#059669' : '#FFFFFF',
                                fontSize: '11px',
                                fontWeight: 800
                            }}>
                                {stats.reportsReady}
                            </span>
                        )}
                    </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button
                        onClick={loadHubData}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '9px 16px',
                            borderRadius: '10px',
                            border: '1px solid #E2E8F0',
                            background: '#FFFFFF',
                            color: '#475569',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer'
                        }}
                        title="Refresh Diagnostic Data"
                    >
                        <RefreshCw size={14} /> Refresh
                    </button>
                    <button
                        onClick={() => {
                            requireAuth('book a laboratory test', () => setBookingTest({}));
                        }}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '9px 18px',
                            borderRadius: '10px',
                            border: 'none',
                            background: 'linear-gradient(135deg, #059669, #0D9488)',
                            color: '#FFFFFF',
                            fontSize: '13px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)'
                        }}
                    >
                        <FlaskConical size={15} /> Book a Test
                    </button>
                </div>
            </div>

            {/* TAB: CATALOGUE (EXPLORE LAB TESTS) */}
            {activeTab === 'catalogue' && (
                <TestCatalogueSection
                    onBookTest={(test) => {
                        requireAuth('book a laboratory test', () => setBookingTest(test));
                    }}
                    onViewBookings={() => {
                        requireAuth('view your bookings', () => setActiveTab('bookings'));
                    }}
                />
            )}

            {/* TAB: MY BOOKINGS */}
            {activeTab === 'bookings' && (
                <MyLabBookingsSection
                    user={user}
                    initialFilter={initialBookingFilter}
                    onOpenBookingModal={() => setBookingTest({})}
                    onOpenCatalogue={() => setActiveTab('catalogue')}
                    onTrackBooking={(b) => setTrackingBooking(b)}
                />
            )}

            {/* TAB: HUB OVERVIEW */}
            {activeTab === 'hub' && (
                <div>
                    {/* Hero Laboratory Showcase Banner */}
                    <div style={{
                        background: 'linear-gradient(135deg, #004D40 0%, #00796B 50%, #0D9488 100%)',
                        borderRadius: '24px',
                        padding: '36px 40px',
                        color: '#FFFFFF',
                        marginBottom: '32px',
                        boxShadow: '0 16px 36px rgba(0, 77, 64, 0.28)',
                        position: 'relative',
                        overflow: 'hidden'
                    }}>
                        <div style={{ position: 'relative', zIndex: 2, maxWidth: '720px' }}>
                            <div style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '6px 16px',
                                borderRadius: '999px',
                                background: 'rgba(255, 255, 255, 0.16)',
                                backdropFilter: 'blur(8px)',
                                border: '1px solid rgba(255, 255, 255, 0.3)',
                                fontSize: '12px',
                                fontWeight: 800,
                                letterSpacing: '0.4px',
                                marginBottom: '16px'
                            }}>
                                <span style={{
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '50%',
                                    background: '#34D399',
                                    boxShadow: '0 0 10px #34D399'
                                }} />
                                AI Clinical Diagnostics &amp; Pathology
                            </div>

                            <h1 style={{
                                fontSize: '32px',
                                fontWeight: 900,
                                margin: '0 0 10px',
                                letterSpacing: '-0.6px',
                                lineHeight: 1.2
                            }}>
                                {isLoggedIn
                                    ? `Hello, ${user?.fullName?.split(' ')[0] || user?.name?.split(' ')[0] || 'Patient'} 👋`
                                    : 'Clinical Diagnostics & Laboratory 🔬'}
                            </h1>
                            <p style={{
                                fontSize: '15px',
                                color: 'rgba(255, 255, 255, 0.9)',
                                margin: '0 0 24px',
                                lineHeight: 1.6
                            }}>
                                {isLoggedIn
                                    ? 'Book certified diagnostic tests, track specimen processing in real-time with automated Gemini Vision AI verification, and download accredited medical reports.'
                                    : 'Explore 50+ certified pathology & clinical diagnostic tests with transparent pricing. Sign in to your patient account to reserve slots, upload prescriptions, and download official medical reports.'}
                            </p>

                            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                <button
                                    onClick={() => setActiveTab('catalogue')}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '12px 24px',
                                        borderRadius: '12px',
                                        background: '#FFFFFF',
                                        color: '#004D40',
                                        fontWeight: 800,
                                        fontSize: '14px',
                                        border: 'none',
                                        cursor: 'pointer',
                                        boxShadow: '0 6px 18px rgba(0,0,0,0.15)'
                                    }}
                                >
                                    <FlaskConical size={16} color="#004D40" /> Explore Lab Tests
                                </button>
                                {isLoggedIn ? (
                                    <button
                                        onClick={() => handleOpenBookingsWithFilter('RESULTS')}
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            padding: '12px 24px',
                                            borderRadius: '12px',
                                            background: 'rgba(255, 255, 255, 0.18)',
                                            color: '#FFFFFF',
                                            fontWeight: 700,
                                            fontSize: '14px',
                                            border: '1px solid rgba(255, 255, 255, 0.35)',
                                            backdropFilter: 'blur(8px)',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <Download size={16} /> Download Reports ({stats.reportsReady})
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => navigate('/login')}
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            padding: '12px 24px',
                                            borderRadius: '12px',
                                            background: 'rgba(255, 255, 255, 0.18)',
                                            color: '#FFFFFF',
                                            fontWeight: 700,
                                            fontSize: '14px',
                                            border: '1px solid rgba(255, 255, 255, 0.35)',
                                            backdropFilter: 'blur(8px)',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <LogIn size={16} /> Sign In / Register
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Background subtle watermark icon */}
                        <Microscope
                            size={260}
                            color="rgba(255, 255, 255, 0.05)"
                            style={{
                                position: 'absolute',
                                right: '-20px',
                                bottom: '-30px',
                                pointerEvents: 'none'
                            }}
                        />
                    </div>

                    {/* Diagnostic Summary Stats Counters (4 Cards) - ONLY VISIBLE FOR LOGGED IN PATIENTS */}
                    {isLoggedIn && (
                        <div style={{ marginBottom: '32px' }}>
                            <h3 style={{
                                fontSize: '18px',
                                fontWeight: 800,
                                color: '#0F172A',
                                margin: '0 0 16px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}>
                                <Activity size={18} color="#0D9488" /> Diagnostic Overview
                            </h3>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                            {[
                                {
                                    count: stats.total,
                                    label: 'Total Bookings',
                                    sub: 'All scheduled & historical tests',
                                    color: '#0D9488',
                                    bg: 'rgba(13, 148, 136, 0.08)',
                                    border: 'rgba(13, 148, 136, 0.25)',
                                    filter: 'ALL'
                                },
                                {
                                    count: stats.pending,
                                    label: 'Pending Approvals',
                                    sub: 'Awaiting review or prescription OCR',
                                    color: '#F59E0B',
                                    bg: 'rgba(245, 158, 11, 0.08)',
                                    border: 'rgba(245, 158, 11, 0.25)',
                                    filter: 'ACTIVE'
                                },
                                {
                                    count: stats.active,
                                    label: 'In Progress',
                                    sub: 'Sample collected or testing underway',
                                    color: '#2563EB',
                                    bg: 'rgba(37, 99, 235, 0.08)',
                                    border: 'rgba(37, 99, 235, 0.25)',
                                    filter: 'ACTIVE'
                                },
                                {
                                    count: stats.reportsReady,
                                    label: 'Results Ready',
                                    sub: 'Certified PDFs ready for download',
                                    color: '#10B981',
                                    bg: 'rgba(16, 185, 129, 0.08)',
                                    border: 'rgba(16, 185, 129, 0.25)',
                                    filter: 'RESULTS'
                                },
                            ].map((st) => (
                                <div
                                    key={st.label}
                                    onClick={() => handleOpenBookingsWithFilter(st.filter)}
                                    style={{
                                        background: '#FFFFFF',
                                        borderRadius: '18px',
                                        padding: '22px 20px',
                                        border: `1.5px solid ${st.border}`,
                                        boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'space-between'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = 'translateY(-3px)';
                                        e.currentTarget.style.boxShadow = '0 10px 24px rgba(0,0,0,0.08)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.03)';
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                                        <div style={{
                                            width: '42px',
                                            height: '42px',
                                            borderRadius: '12px',
                                            background: st.bg,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}>
                                            <FlaskConical size={20} color={st.color} />
                                        </div>
                                        <div style={{ fontSize: '28px', fontWeight: 900, color: st.color }}>
                                            {loading ? '-' : st.count}
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', marginBottom: '3px' }}>
                                            {st.label}
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#64748B', lineHeight: 1.4 }}>
                                            {st.sub}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    )}

                    {/* Active Booking Live Tracker Card (if active booking exists) - ONLY FOR LOGGED IN USERS */}
                    {isLoggedIn && latestActive && (
                        <div style={{
                            background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
                            borderRadius: '20px',
                            padding: '24px 28px',
                            color: '#FFFFFF',
                            marginBottom: '32px',
                            border: '1.5px solid rgba(45, 212, 191, 0.35)',
                            boxShadow: '0 12px 30px rgba(0,0,0,0.25)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '20px'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                                <div style={{
                                    width: '54px',
                                    height: '54px',
                                    borderRadius: '16px',
                                    background: 'linear-gradient(135deg, #0D9488, #059669)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: '0 0 20px rgba(13, 148, 136, 0.45)',
                                    flexShrink: 0
                                }}>
                                    <Activity size={26} color="#FFFFFF" />
                                </div>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                                        <span style={{
                                            fontSize: '11px',
                                            fontWeight: 800,
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.6px',
                                            color: '#2DD4BF',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '5px'
                                        }}>
                                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#2DD4BF' }} />
                                            Active Specimen Processing
                                        </span>
                                        <span style={{
                                            padding: '2px 8px',
                                            borderRadius: '6px',
                                            background: 'rgba(255,255,255,0.12)',
                                            fontSize: '11px',
                                            fontFamily: 'monospace',
                                            fontWeight: 700,
                                            color: '#F1F5F9'
                                        }}>
                                            #{latestActive.tokenNumber || latestActive.bookingNumber || `LB-${latestActive.id}`}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: '18px', fontWeight: 800, color: '#F8FAFC', marginBottom: '4px' }}>
                                        {latestActive.labTest?.name || 'Diagnostic Laboratory Test'}
                                    </div>
                                    <div style={{ fontSize: '13px', color: '#94A3B8', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                                        <span>Status: <strong style={{ color: '#E2E8F0' }}>{latestActive.status}</strong></span>
                                        <span>Scheduled: {latestActive.bookingDate ? new Date(latestActive.bookingDate).toLocaleDateString() : 'Today'} ({latestActive.timeSlot || 'Morning'})</span>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => setTrackingBooking(latestActive)}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '12px 24px',
                                    borderRadius: '12px',
                                    background: 'linear-gradient(135deg, #0D9488, #059669)',
                                    color: '#FFFFFF',
                                    fontWeight: 800,
                                    fontSize: '14px',
                                    border: 'none',
                                    cursor: 'pointer',
                                    boxShadow: '0 6px 18px rgba(13, 148, 136, 0.45)'
                                }}
                            >
                                <Eye size={16} /> Open Live Visual Tracker <ArrowRight size={15} />
                            </button>
                        </div>
                    )}

                    {/* Quick Laboratory Action Cards (Matching Flutter Mobile) */}
                    <div style={{ marginBottom: '36px' }}>
                        <h3 style={{
                            fontSize: '18px',
                            fontWeight: 800,
                            color: '#0F172A',
                            margin: '0 0 16px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            <FlaskConical size={18} color="#0D9488" /> Laboratory Core Services
                        </h3>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
                            {[
                                {
                                    title: 'Explore Lab Tests & Pricing',
                                    desc: 'Browse 50+ clinical diagnostics, sample requirements, fasting guidelines, and transparent fees without an account.',
                                    icon: Search,
                                    badge: 'Open to All',
                                    gradient: 'linear-gradient(135deg, #00897B, #26A69A)',
                                    action: () => setActiveTab('catalogue')
                                },
                                {
                                    title: 'Book Laboratory Test',
                                    desc: 'Browse 50+ clinical tests with transparent pricing, instant slot reservation, and Gemini AI prescription upload.',
                                    icon: FlaskConical,
                                    badge: 'Instant Booking',
                                    gradient: 'linear-gradient(135deg, #0F766E, #14B8A6)',
                                    action: () => requireAuth('book a laboratory test', () => setActiveTab('catalogue'))
                                },
                                {
                                    title: 'Track Specimen & Status',
                                    desc: 'Follow live sample collection, pathologist microscopic testing, and estimated report completion in real-time.',
                                    icon: Activity,
                                    badge: (isLoggedIn && stats.active > 0) ? `${stats.active} In Progress` : null,
                                    gradient: 'linear-gradient(135deg, #1565C0, #3B82F6)',
                                    action: () => handleOpenBookingsWithFilter('ACTIVE')
                                },
                                {
                                    title: 'Download Certified Reports',
                                    desc: 'View, verify, and securely download physician-signed PDF pathology reports anytime with 1-click access.',
                                    icon: Download,
                                    badge: (isLoggedIn && stats.reportsReady > 0) ? `${stats.reportsReady} Ready` : null,
                                    gradient: 'linear-gradient(135deg, #059669, #10B981)',
                                    action: () => handleOpenBookingsWithFilter('RESULTS')
                                },
                                {
                                    title: 'Full Booking History',
                                    desc: 'Review past test results, digital prescriptions, payment receipts, and easily reorder recurring diagnostic packages.',
                                    icon: FileText,
                                    badge: isLoggedIn ? `${stats.total} Total` : null,
                                    gradient: 'linear-gradient(135deg, #D97706, #F59E0B)',
                                    action: () => handleOpenBookingsWithFilter('ALL')
                                }
                            ].map((card) => {
                                const Icon = card.icon;
                                return (
                                    <div
                                        key={card.title}
                                        onClick={card.action}
                                        style={{
                                            background: '#FFFFFF',
                                            borderRadius: '20px',
                                            border: '1px solid #E2E8F0',
                                            padding: '26px 28px',
                                            cursor: 'pointer',
                                            transition: 'all 0.25s ease',
                                            boxShadow: '0 4px 18px rgba(0,0,0,0.04)',
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            gap: '20px',
                                            position: 'relative'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.transform = 'translateY(-4px)';
                                            e.currentTarget.style.boxShadow = '0 12px 28px rgba(0,0,0,0.08)';
                                            e.currentTarget.style.borderColor = '#0D9488';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.transform = 'translateY(0)';
                                            e.currentTarget.style.boxShadow = '0 4px 18px rgba(0,0,0,0.04)';
                                            e.currentTarget.style.borderColor = '#E2E8F0';
                                        }}
                                    >
                                        <div style={{
                                            width: '56px',
                                            height: '56px',
                                            borderRadius: '16px',
                                            background: card.gradient,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0,
                                            boxShadow: '0 6px 16px rgba(0,0,0,0.12)'
                                        }}>
                                            <Icon size={26} color="#FFFFFF" />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                                                <h4 style={{ fontSize: '17px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                                                    {card.title}
                                                </h4>
                                                {card.badge && (
                                                    <span style={{
                                                        padding: '3px 10px',
                                                        borderRadius: '999px',
                                                        background: '#ECFDF5',
                                                        color: '#059669',
                                                        fontSize: '11px',
                                                        fontWeight: 800,
                                                        border: '1px solid #A7F3D0'
                                                    }}>
                                                        {card.badge}
                                                    </span>
                                                )}
                                            </div>
                                            <p style={{ fontSize: '13.5px', color: '#64748B', lineHeight: 1.5, margin: 0 }}>
                                                {card.desc}
                                            </p>
                                        </div>
                                        <ChevronRight size={18} color="#94A3B8" style={{ alignSelf: 'center', flexShrink: 0 }} />
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Featured / Popular Tests Showcase */}
                    {featuredTests.length > 0 && (
                        <div style={{
                            background: '#FFFFFF',
                            borderRadius: '24px',
                            border: '1px solid #E2E8F0',
                            padding: '32px',
                            boxShadow: '0 6px 20px rgba(0,0,0,0.03)',
                            marginBottom: '32px'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px' }}>
                                <div>
                                    <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: '0 0 4px' }}>
                                        Popular Clinical Tests
                                    </h3>
                                    <p style={{ fontSize: '13.5px', color: '#64748B', margin: 0 }}>
                                        Frequently ordered screening packages with rapid 4-12 hour report turnaround.
                                    </p>
                                </div>
                                <button
                                    onClick={() => setActiveTab('catalogue')}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '8px 16px',
                                        borderRadius: '10px',
                                        border: '1px solid #CBD5E1',
                                        background: '#F8FAFC',
                                        color: '#0F172A',
                                        fontSize: '13px',
                                        fontWeight: 700,
                                        cursor: 'pointer'
                                    }}
                                >
                                    View All Tests <ArrowRight size={14} />
                                </button>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '18px' }}>
                                {featuredTests.map((t) => (
                                    <div
                                        key={t.id}
                                        style={{
                                            borderRadius: '16px',
                                            border: '1px solid #E2E8F0',
                                            padding: '20px',
                                            background: '#F8FAFC',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'space-between',
                                            transition: 'all 0.2s ease'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.borderColor = '#0D9488';
                                            e.currentTarget.style.background = '#FFFFFF';
                                            e.currentTarget.style.boxShadow = '0 6px 18px rgba(0,0,0,0.06)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.borderColor = '#E2E8F0';
                                            e.currentTarget.style.background = '#F8FAFC';
                                            e.currentTarget.style.boxShadow = 'none';
                                        }}
                                    >
                                        <div>
                                            <div style={{
                                                display: 'inline-block',
                                                padding: '3px 8px',
                                                borderRadius: '6px',
                                                background: '#E0F2FE',
                                                color: '#0284C7',
                                                fontSize: '11px',
                                                fontWeight: 800,
                                                marginBottom: '10px'
                                            }}>
                                                {t.category || 'General'}
                                            </div>
                                            <h5 style={{ fontSize: '15.5px', fontWeight: 800, color: '#0F172A', margin: '0 0 6px' }}>
                                                {t.name}
                                            </h5>
                                            <p style={{
                                                fontSize: '12.5px',
                                                color: '#64748B',
                                                lineHeight: 1.45,
                                                margin: '0 0 14px',
                                                display: '-webkit-box',
                                                WebkitLineClamp: 2,
                                                WebkitBoxOrient: 'vertical',
                                                overflow: 'hidden'
                                            }}>
                                                {t.description || 'Clinical diagnostic assessment.'}
                                            </p>
                                        </div>

                                        <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600 }}>PRICE</div>
                                                <div style={{ fontSize: '16px', fontWeight: 900, color: '#059669' }}>
                                                    Rs. {Number(t.price || 0).toLocaleString()}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => requireAuth('book this laboratory test', () => setBookingTest(t))}
                                                style={{
                                                    padding: '7px 14px',
                                                    borderRadius: '8px',
                                                    background: 'linear-gradient(135deg, #059669, #0D9488)',
                                                    color: '#FFFFFF',
                                                    fontSize: '12.5px',
                                                    fontWeight: 700,
                                                    border: 'none',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                Book
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Diagnostic Quality Assurance Bar */}
                    <div style={{
                        background: 'linear-gradient(135deg, #F0FDF4 0%, #ECFDF5 100%)',
                        borderRadius: '20px',
                        border: '1px solid #A7F3D0',
                        padding: '24px 32px',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: '24px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                            <div style={{
                                width: '46px',
                                height: '46px',
                                borderRadius: '14px',
                                background: '#FFFFFF',
                                border: '1px solid #A7F3D0',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                            }}>
                                <Award size={22} color="#059669" />
                            </div>
                            <div>
                                <div style={{ fontSize: '14.5px', fontWeight: 800, color: '#065F46' }}>ISO 15189 Certified</div>
                                <div style={{ fontSize: '12.5px', color: '#047857' }}>International clinical laboratory standards compliance.</div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                            <div style={{
                                width: '46px',
                                height: '46px',
                                borderRadius: '14px',
                                background: '#FFFFFF',
                                border: '1px solid #A7F3D0',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                            }}>
                                <Sparkles size={22} color="#059669" />
                            </div>
                            <div>
                                <div style={{ fontSize: '14.5px', fontWeight: 800, color: '#065F46' }}>Gemini Vision AI OCR</div>
                                <div style={{ fontSize: '12.5px', color: '#047857' }}>Instant prescription text recognition and slot prefill.</div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                            <div style={{
                                width: '46px',
                                height: '46px',
                                borderRadius: '14px',
                                background: '#FFFFFF',
                                border: '1px solid #A7F3D0',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                            }}>
                                <Clock size={22} color="#059669" />
                            </div>
                            <div>
                                <div style={{ fontSize: '14.5px', fontWeight: 800, color: '#065F46' }}>Rapid 4-12 Hr Delivery</div>
                                <div style={{ fontSize: '12.5px', color: '#047857' }}>Direct SMS and PDF download once approved by pathologist.</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modals */}
            {bookingTest && (
                <BookLabTestModal
                    test={bookingTest?.id ? bookingTest : null}
                    initialTest={bookingTest?.id ? bookingTest : null}
                    user={user}
                    onClose={() => setBookingTest(null)}
                    onSuccess={(newBooking) => {
                        setBookingTest(null);
                        loadHubData();
                        setInitialBookingFilter('ALL');
                        setActiveTab('bookings');
                        if (showToast) {
                            showToast('Lab test booking submitted successfully!', 'success');
                        }
                    }}
                />
            )}

            {trackingBooking && (
                <BookingTrackingModal
                    booking={trackingBooking}
                    onClose={() => setTrackingBooking(null)}
                />
            )}

            {/* Login Prompt Modal for Non-Logged-in Patients */}
            {loginPromptAction && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        backgroundColor: 'rgba(15, 23, 42, 0.65)',
                        backdropFilter: 'blur(6px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 9999,
                        padding: '20px'
                    }}
                    onClick={() => setLoginPromptAction(null)}
                >
                    <div
                        style={{
                            background: '#FFFFFF',
                            borderRadius: '24px',
                            padding: '32px',
                            maxWidth: '460px',
                            width: '100%',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                            border: '1px solid #E2E8F0',
                            position: 'relative'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{
                            width: '56px',
                            height: '56px',
                            borderRadius: '16px',
                            background: 'rgba(13, 148, 136, 0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: '20px',
                            color: '#0D9488'
                        }}>
                            <Lock size={28} />
                        </div>

                        <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: '0 0 10px' }}>
                            Login Required
                        </h3>

                        <p style={{ fontSize: '14px', color: '#64748B', lineHeight: 1.6, margin: '0 0 24px' }}>
                            You need to be signed in with a patient account to <strong>{loginPromptAction}</strong>. Please log in or register to continue.
                        </p>

                        <div style={{
                            background: '#F8FAFC',
                            borderRadius: '14px',
                            padding: '14px 16px',
                            marginBottom: '24px',
                            border: '1px solid #E2E8F0',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px'
                        }}>
                            <Sparkles size={20} color="#0D9488" style={{ flexShrink: 0 }} />
                            <span style={{ fontSize: '12.5px', color: '#475569', lineHeight: 1.4 }}>
                                You can browse all 50+ lab tests, prices, fasting hours, and preparation guidelines freely without signing in!
                            </span>
                        </div>

                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => {
                                    setLoginPromptAction(null);
                                    setActiveTab('catalogue');
                                }}
                                style={{
                                    padding: '10px 18px',
                                    borderRadius: '10px',
                                    border: '1px solid #CBD5E1',
                                    background: '#FFFFFF',
                                    color: '#475569',
                                    fontSize: '13px',
                                    fontWeight: 700,
                                    cursor: 'pointer'
                                }}
                            >
                                Explore Tests
                            </button>
                            <button
                                onClick={() => {
                                    setLoginPromptAction(null);
                                    navigate('/login');
                                }}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '10px 20px',
                                    borderRadius: '10px',
                                    border: 'none',
                                    background: 'linear-gradient(135deg, #059669, #0D9488)',
                                    color: '#FFFFFF',
                                    fontSize: '13px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)'
                                }}
                            >
                                <LogIn size={15} /> Sign In / Register
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomerLabHub;
