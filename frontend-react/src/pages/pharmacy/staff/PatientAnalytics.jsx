import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { getDashboardPath } from '../../../utils/navigation';
import { api } from '../../../api/authApi';
import logoImage from '../../../assets/mediz.png';
import {
    ArrowLeft,
    Search,
    ShieldAlert,
    User,
    Mail,
    Phone,
    MapPin,
    Calendar,
    Clock,
    AlertTriangle,
    CheckCircle2,
    TrendingUp,
    FileText,
    Pill,
    Lock,
    Send,
    Download,
    RefreshCw
} from 'lucide-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    LineChart,
    Line
} from 'recharts';

const PatientAnalytics = () => {
    const { user } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const initialEmail = searchParams.get('email') || '';

    const [inputEmail, setInputEmail] = useState(initialEmail);
    const [email, setEmail] = useState(initialEmail);
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
    const [actionNote, setActionNote] = useState('');

    useEffect(() => {
        if (email) {
            fetchAnalytics(email);
        }
    }, [email]);

    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3500);
    };

    const fetchAnalytics = async (patientEmail) => {
        if (!patientEmail) return;
        setLoading(true);
        setError(null);
        try {
            const res = await api.get(`/PharmacyOrders/patients/${encodeURIComponent(patientEmail)}/analytics`);
            setAnalytics(res.data);
        } catch (err) {
            console.warn('Analytics fetch error:', err);
            setError(err.response?.data?.message || 'No orders or analytics found for this patient email.');
            setAnalytics(null);
        } finally {
            setLoading(false);
        }
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        if (!inputEmail.trim()) return;
        setSearchParams({ email: inputEmail.trim() });
        setEmail(inputEmail.trim());
    };

    const handleSendWarning = () => {
        if (!analytics?.patient?.email) return;
        try {
            const notifications = JSON.parse(localStorage.getItem('medix_notifications') || '[]');
            notifications.unshift({
                id: Date.now(),
                title: `⚠️ PATIENT ABUSE & PRESCRIPTION SAFETY WARNING`,
                message: actionNote || `Our automated pharmacy monitoring system detected suspicious prescription ordering patterns on your account. Continued violations will lead to permanent account suspension.`,
                targetOrderNumber: 'ACCOUNT_NOTICE',
                createdAt: new Date().toISOString(),
                read: false,
                isViolationWarning: true
            });
            localStorage.setItem('medix_notifications', JSON.stringify(notifications));
            showToast(`Violation warning pushed to patient (${analytics.patient.email})`, 'success');
            setActionNote('');
        } catch (e) {
            showToast('Warning sent to patient notifications', 'success');
        }
    };

    const handleBlockUser = () => {
        if (!analytics?.patient?.email) return;
        try {
            const blocked = JSON.parse(localStorage.getItem('medix_blocked_users') || '[]');
            if (!blocked.includes(analytics.patient.email)) {
                blocked.push(analytics.patient.email);
                localStorage.setItem('medix_blocked_users', JSON.stringify(blocked));
                showToast(`Patient ${analytics.patient.email} has been BLOCKED 🚫`, 'error');
            } else {
                showToast(`Patient ${analytics.patient.email} is already blocked`, 'info');
            }
        } catch (e) {
            showToast('User block updated', 'success');
        }
    };

    const handleExportReport = () => {
        if (!analytics) return;
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(analytics, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", `patient_abuse_analytics_${analytics.patient.email}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
        showToast('Analytics report exported as JSON', 'success');
    };

    const getRiskColor = (level) => {
        switch (level) {
            case 'CRITICAL': return { bg: '#FEE2E2', text: '#991B1B', border: '#EF4444' };
            case 'HIGH': return { bg: '#FFEDD5', text: '#9A3412', border: '#F97316' };
            case 'MEDIUM': return { bg: '#FEF3C7', text: '#92400E', border: '#F59E0B' };
            case 'LOW':
            default: return { bg: '#D1FAE5', text: '#065F46', border: '#10B981' };
        }
    };

    const getSeverityBadge = (severity) => {
        switch (severity) {
            case 'HIGH': return { bg: '#FEE2E2', color: '#DC2626' };
            case 'MEDIUM': return { bg: '#FEF3C7', color: '#D97706' };
            default: return { bg: '#E0F2FE', color: '#0284C7' };
        }
    };

    return (
        <div style={styles.container}>
            {/* Header */}
            <header style={styles.header}>
                <div style={styles.headerContent}>
                    <div style={styles.leftNav}>
                        <button onClick={() => navigate('/pharmacist/orders')} style={styles.backBtn}>
                            <ArrowLeft size={16} /> Back to Orders Audit
                        </button>
                        <Link
                            to={getDashboardPath(user)}
                            style={{
                                ...styles.logo,
                                textDecoration: 'none',
                                color: 'inherit',
                                transition: 'opacity 0.2s ease'
                            }}
                            className="cursor-pointer"
                            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
                            title="Return to Dashboard"
                        >
                            <img src={logoImage} alt="Health Bridge" style={styles.logoImg} />
                            <div>
                                <h1 style={styles.logoTitle}>🚨 PATIENT ABUSE ANALYTICS & AUDIT DESK</h1>
                                <p style={styles.logoSubtitle}>Automated Anti-Abuse Tracking, Quantity Trends & Prescription Forensics</p>
                            </div>
                        </Link>
                    </div>
                </div>
            </header>

            {/* Toast */}
            {toast.show && (
                <div style={{
                    ...styles.toast,
                    backgroundColor: toast.type === 'error' ? '#EF4444' : '#10B981'
                }}>
                    {toast.message}
                </div>
            )}

            <main style={styles.main}>
                {/* Search Bar */}
                <form onSubmit={handleSearchSubmit} style={styles.searchCard}>
                    <div style={styles.searchBox}>
                        <Search size={20} color="#64748B" />
                        <input
                            type="email"
                            placeholder="Enter patient email address (e.g. john@example.com)..."
                            value={inputEmail}
                            onChange={(e) => setInputEmail(e.target.value)}
                            style={styles.searchInput}
                        />
                    </div>
                    <button type="submit" style={styles.searchBtn} disabled={loading}>
                        {loading ? <RefreshCw size={16} className="spin" /> : <Search size={16} />} Load Analytics
                    </button>
                </form>

                {error && (
                    <div style={styles.errorBox}>
                        <AlertTriangle size={24} color="#DC2626" />
                        <div>
                            <h4 style={{ margin: '0 0 4px', color: '#991B1B' }}>Analytics Request Failed</h4>
                            <p style={{ margin: 0, fontSize: '13px', color: '#7F1D1D' }}>{error}</p>
                        </div>
                    </div>
                )}

                {loading && (
                    <div style={styles.loadingBox}>
                        <div className="spinner" />
                        <p style={{ marginTop: '12px', color: '#475569', fontWeight: 600 }}>Analyzing patient order history & prescription hash logs...</p>
                    </div>
                )}

                {analytics && !loading && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                        {/* Patient Profile Card */}
                        <div style={styles.profileCard}>
                            <div style={styles.profileHeader}>
                                <div style={styles.avatar}>
                                    <User size={28} color="#7C3AED" />
                                </div>
                                <div>
                                    <h2 style={styles.profileName}>{analytics.patient.name || 'Anonymous Patient'}</h2>
                                    <div style={styles.profileMeta}>
                                        <span><Mail size={14} color="#64748B" /> {analytics.patient.email}</span>
                                        {analytics.patient.phone && <span><Phone size={14} color="#64748B" /> {analytics.patient.phone}</span>}
                                        {analytics.patient.address && <span><MapPin size={14} color="#64748B" /> {analytics.patient.address}</span>}
                                    </div>
                                </div>
                            </div>
                            <div style={styles.profileStatsRow}>
                                <div style={styles.pStat}>
                                    <span style={styles.pStatLbl}>Account Age</span>
                                    <span style={styles.pStatVal}>{analytics.patient.accountAgeDays} Days</span>
                                </div>
                                <div style={styles.pStat}>
                                    <span style={styles.pStatLbl}>First Order Date</span>
                                    <span style={styles.pStatVal}>{new Date(analytics.patient.firstOrderAt).toLocaleDateString()}</span>
                                </div>
                                <div style={styles.pStat}>
                                    <span style={styles.pStatLbl}>Last Order Date</span>
                                    <span style={styles.pStatVal}>{new Date(analytics.patient.lastOrderAt).toLocaleDateString()}</span>
                                </div>
                            </div>
                        </div>

                        {/* Risk Summary (4 Cards) */}
                        <div style={styles.riskGrid}>
                            <div style={styles.riskCard}>
                                <div style={styles.riskCardHeader}>
                                    <FileText size={20} color="#0284C7" />
                                    <span style={styles.riskCardLbl}>Total Orders</span>
                                </div>
                                <div style={styles.riskCardVal}>{analytics.riskSummary.totalOrders}</div>
                                <div style={styles.riskSubText}>{analytics.riskSummary.ordersLast30Days} placed in last 30 days</div>
                            </div>

                            <div style={styles.riskCard}>
                                <div style={styles.riskCardHeader}>
                                    <ShieldAlert size={20} color="#DC2626" />
                                    <span style={styles.riskCardLbl}>Flagged Orders</span>
                                </div>
                                <div style={{ ...styles.riskCardVal, color: analytics.riskSummary.flaggedOrders > 0 ? '#DC2626' : '#059669' }}>
                                    {analytics.riskSummary.flaggedOrders}
                                </div>
                                <div style={styles.riskSubText}>Orders with Risk Score ≥ 70</div>
                            </div>

                            <div style={styles.riskCard}>
                                <div style={styles.riskCardHeader}>
                                    <AlertTriangle size={20} color="#D97706" />
                                    <span style={styles.riskCardLbl}>Suspicious Rate</span>
                                </div>
                                <div style={{ ...styles.riskCardVal, color: analytics.riskSummary.suspiciousRate >= 20 ? '#DC2626' : '#D97706' }}>
                                    {analytics.riskSummary.suspiciousRate}%
                                </div>
                                <div style={styles.riskSubText}>Max {analytics.riskSummary.maxOrdersInOneDay} orders in a single day</div>
                            </div>

                            {(() => {
                                const rc = getRiskColor(analytics.riskSummary.riskLevel);
                                return (
                                    <div style={{ ...styles.riskCard, backgroundColor: rc.bg, borderColor: rc.border }}>
                                        <div style={styles.riskCardHeader}>
                                            <ShieldAlert size={20} color={rc.text} />
                                            <span style={{ ...styles.riskCardLbl, color: rc.text }}>Risk Classification</span>
                                        </div>
                                        <div style={{ ...styles.riskCardVal, color: rc.text }}>{analytics.riskSummary.riskLevel}</div>
                                        <div style={{ ...styles.riskSubText, color: rc.text }}>Account Status: {analytics.riskSummary.accountStatus}</div>
                                    </div>
                                );
                            })()}
                        </div>

                        {/* Order Timeline Chart */}
                        <div style={styles.chartCard}>
                            <h3 style={styles.chartTitle}>📅 Order Timeline & Flag Frequency (Last 90 Days)</h3>
                            {analytics.orderTimeline?.length > 0 ? (
                                <div style={{ width: '100%', height: 250 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={analytics.orderTimeline} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                                            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                                            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                                            <Tooltip />
                                            <Legend />
                                            <Bar dataKey="orderCount" name="Normal Orders" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                                            <Bar dataKey="flaggedCount" name="Flagged / High Risk Orders" fill="#EF4444" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <p style={styles.noDataMsg}>No order timeline data in the last 90 days.</p>
                            )}
                        </div>

                        {/* Repeated Medications List */}
                        <div style={styles.sectionCard}>
                            <h3 style={styles.sectionTitle}>💊 Repeated Medication Order Analysis (Last 30 Days)</h3>
                            {analytics.repeatedMedicines?.length > 0 ? (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
                                    {analytics.repeatedMedicines.map((med, idx) => {
                                        const sev = getSeverityBadge(med.severity);
                                        return (
                                            <div key={idx} style={{
                                                ...styles.medCard,
                                                borderColor: med.isViolation ? '#EF4444' : '#E2E8F0',
                                                backgroundColor: med.isViolation ? '#FEF2F2' : '#FFFFFF'
                                            }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                                    <span style={{ fontWeight: 700, fontSize: '14px', color: '#0F172A' }}>{med.medicineName}</span>
                                                    <span style={{
                                                        padding: '2px 8px',
                                                        borderRadius: '12px',
                                                        fontSize: '11px',
                                                        fontWeight: 800,
                                                        backgroundColor: sev.bg,
                                                        color: sev.color
                                                    }}>
                                                        {med.severity} SEVERITY
                                                    </span>
                                                </div>
                                                <div style={styles.medStatLine}>Order Frequency: <strong>{med.orderCount} times in 30 days</strong></div>
                                                <div style={styles.medStatLine}>Total Units Claimed: <strong>{med.totalQuantity} items</strong></div>
                                                <div style={styles.medStatLine}>Days Since Last Order: <strong>{med.daysSinceLastOrder} days</strong></div>
                                                <div style={styles.medStatLine}>Expected Interval: <strong>{med.expectedIntervalDays} days</strong></div>
                                                {med.isViolation && (
                                                    <div style={styles.medViolationAlert}>
                                                        ⚠️ EARLY REFILL VIOLATION: Refill requested before expected {med.expectedIntervalDays}-day interval.
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p style={styles.noDataMsg}>No repeated medication order triggers found in the last 30 days.</p>
                            )}
                        </div>

                        {/* Quantity Trends Chart */}
                        <div style={styles.chartCard}>
                            <h3 style={styles.chartTitle}>📈 Quantity Trends Over Time (Top 5 Medicines)</h3>
                            {analytics.quantityTrends?.length > 0 ? (
                                <div style={{ width: '100%', height: 300 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                                            <XAxis dataKey="date" allowDuplicatedCategory={false} tick={{ fontSize: 11 }} />
                                            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                                            <Tooltip />
                                            <Legend />
                                            {analytics.quantityTrends.map((trend, idx) => {
                                                const colors = ['#7C3AED', '#0284C7', '#059669', '#D97706', '#DC2626'];
                                                return (
                                                    <Line
                                                        key={trend.medicineName}
                                                        data={trend.points}
                                                        dataKey="quantity"
                                                        name={trend.medicineName}
                                                        stroke={colors[idx % colors.length]}
                                                        strokeWidth={2.5}
                                                        dot={{ r: 4 }}
                                                    />
                                                );
                                            })}
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <p style={styles.noDataMsg}>No multi-order quantity trend data available.</p>
                            )}
                        </div>

                        {/* Prescription Usage Info */}
                        <div style={styles.sectionCard}>
                            <h3 style={styles.sectionTitle}>🔍 Doctor Prescription Image Forensic Audit</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '16px' }}>
                                <div style={styles.pUsageBox}>
                                    <span style={styles.pUsageVal}>{analytics.prescriptionUsage.totalPrescriptions}</span>
                                    <span style={styles.pUsageLbl}>Total Prescriptions</span>
                                </div>
                                <div style={styles.pUsageBox}>
                                    <span style={styles.pUsageVal}>{analytics.prescriptionUsage.uniquePrescriptionHashes}</span>
                                    <span style={styles.pUsageLbl}>Unique Hashes</span>
                                </div>
                                <div style={{
                                    ...styles.pUsageBox,
                                    backgroundColor: analytics.prescriptionUsage.duplicatePrescriptionCount > 0 ? '#FEF2F2' : '#F0FDF4',
                                    borderColor: analytics.prescriptionUsage.duplicatePrescriptionCount > 0 ? '#FCA5A5' : '#86EFAC'
                                }}>
                                    <span style={{
                                        ...styles.pUsageVal,
                                        color: analytics.prescriptionUsage.duplicatePrescriptionCount > 0 ? '#DC2626' : '#059669'
                                    }}>
                                        {analytics.prescriptionUsage.duplicatePrescriptionCount}
                                    </span>
                                    <span style={styles.pUsageLbl}>Duplicate Reuse Attempts</span>
                                </div>
                            </div>

                            {analytics.prescriptionUsage.duplicateHashes?.length > 0 && (
                                <div>
                                    <h4 style={{ margin: '0 0 8px', fontSize: '13px', color: '#991B1B' }}>Flagged Reused Prescription Image Hashes:</h4>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        {analytics.prescriptionUsage.duplicateHashes.map((h, i) => (
                                            <div key={i} style={styles.hashRow}>
                                                <code style={{ fontSize: '12px', fontWeight: 700, color: '#DC2626' }}>{h.hash}</code>
                                                <span style={{ fontSize: '12px', color: '#475569' }}>Used <strong>{h.timesUsed} times</strong> (First: {new Date(h.firstUsed).toLocaleDateString()}, Last: {new Date(h.lastUsed).toLocaleDateString()})</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Violation History */}
                        <div style={styles.sectionCard}>
                            <h3 style={styles.sectionTitle}>⚠️ High-Risk Violation History</h3>
                            {analytics.violationHistory?.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {analytics.violationHistory.map((v, i) => (
                                        <div key={i} style={styles.violationRow}>
                                            <div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span style={styles.vTypeBadge}>{v.type}</span>
                                                    <strong style={{ fontSize: '13px' }}>Order #{v.orderNumber}</strong>
                                                    <span style={{ fontSize: '12px', color: '#64748B' }}>({new Date(v.date).toLocaleString()})</span>
                                                </div>
                                                <div style={{ fontSize: '13px', color: '#334155', marginTop: '4px' }}>{v.message}</div>
                                            </div>
                                            <div style={styles.vRiskBadge}>Risk Score: {v.riskScore}</div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p style={styles.noDataMsg}>✅ No high-risk safety violations logged for this patient.</p>
                            )}
                        </div>

                        {/* Recent Orders Table */}
                        <div style={styles.sectionCard}>
                            <h3 style={styles.sectionTitle}>📋 Recent Orders (Last 10)</h3>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={styles.table}>
                                    <thead>
                                        <tr>
                                            <th style={styles.th}>Order #</th>
                                            <th style={styles.th}>Date</th>
                                            <th style={styles.th}>Items</th>
                                            <th style={styles.th}>Total</th>
                                            <th style={styles.th}>Status</th>
                                            <th style={styles.th}>Risk Score</th>
                                            <th style={styles.th}>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {analytics.recentOrders.map(o => (
                                            <tr key={o.id}>
                                                <td style={styles.td}><strong>{o.orderNumber}</strong></td>
                                                <td style={styles.td}>{new Date(o.createdAt).toLocaleDateString()}</td>
                                                <td style={styles.td}>{o.itemCount} items</td>
                                                <td style={styles.td}>Rs. {o.totalAmount.toFixed(2)}</td>
                                                <td style={styles.td}>{o.status}</td>
                                                <td style={{
                                                    ...styles.td,
                                                    fontWeight: 700,
                                                    color: (o.riskScore ?? 0) >= 70 ? '#DC2626' : (o.riskScore ?? 0) >= 30 ? '#D97706' : '#059669'
                                                }}>
                                                    {o.riskScore ?? 'N/A'}
                                                </td>
                                                <td style={styles.td}>
                                                    <button
                                                        onClick={() => navigate(`/pharmacist/orders`)}
                                                        style={styles.tblBtn}
                                                    >
                                                        Inspect
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Recommendations */}
                        <div style={styles.recCard}>
                            <h3 style={{ margin: '0 0 10px', fontSize: '15px', color: '#1E1B4B', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                💡 Auto-Generated Anti-Abuse Recommendations
                            </h3>
                            <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {analytics.recommendations.map((rec, i) => (
                                    <li key={i} style={{ fontSize: '13.5px', color: rec.startsWith('✅') ? '#065F46' : '#991B1B', fontWeight: 600 }}>
                                        {rec}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Admin Action Desk */}
                        <div style={styles.actionCard}>
                            <h3 style={{ margin: '0 0 12px', fontSize: '15px', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                ⚡ Pharmacist Administrative Actions
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <textarea
                                    placeholder="Enter custom warning note or audit reason for this patient..."
                                    value={actionNote}
                                    onChange={(e) => setActionNote(e.target.value)}
                                    style={styles.textarea}
                                />
                                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                    <button onClick={handleSendWarning} style={styles.actBtnWarn}>
                                        <Send size={15} /> Send Warning Notice
                                    </button>
                                    <button onClick={handleBlockUser} style={styles.actBtnBlock}>
                                        <Lock size={15} /> Block Patient Account
                                    </button>
                                    <button onClick={handleExportReport} style={styles.actBtnExport}>
                                        <Download size={15} /> Export Report (JSON)
                                    </button>
                                </div>
                            </div>
                        </div>

                    </div>
                )}
            </main>
        </div>
    );
};

const styles = {
    container: { backgroundColor: '#F8FAFC', minHeight: '100vh', paddingBottom: '60px', fontFamily: 'system-ui, -apple-system, sans-serif' },
    header: { backgroundColor: '#FFFFFF', borderBottom: '1px solid #E2E8F0', padding: '16px 24px', sticky: 'top', zIndex: 10 },
    headerContent: { maxWidth: '1280px', margin: '0 auto' },
    leftNav: { display: 'flex', alignItems: 'center', gap: '16px' },
    backBtn: { background: '#F1F5F9', border: '1px solid #CBD5E1', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '13px', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' },
    logo: { display: 'flex', alignItems: 'center', gap: '12px' },
    logoImg: { height: '36px', objectFit: 'contain' },
    logoTitle: { margin: 0, fontSize: '18px', fontWeight: 800, color: '#7C3AED' },
    logoSubtitle: { margin: 0, fontSize: '12px', color: '#64748B' },
    toast: { position: 'fixed', top: '20px', right: '20px', color: '#FFFFFF', padding: '12px 20px', borderRadius: '8px', fontWeight: 700, fontSize: '13.5px', zIndex: 9999, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' },
    main: { maxWidth: '1280px', margin: '24px auto 0', padding: '0 24px' },
    searchCard: { backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', padding: '16px', borderRadius: '12px', display: 'flex', gap: '12px', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
    searchBox: { flex: 1, display: 'flex', alignItems: 'center', gap: '10px', background: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: '8px', padding: '0 14px' },
    searchInput: { flex: 1, border: 'none', background: 'transparent', padding: '12px 0', fontSize: '14px', outline: 'none' },
    searchBtn: { backgroundColor: '#7C3AED', color: '#FFFFFF', border: 'none', padding: '12px 24px', borderRadius: '8px', fontWeight: 700, fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' },
    errorBox: { backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', padding: '16px', borderRadius: '10px', display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '24px' },
    loadingBox: { backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', padding: '40px', borderRadius: '12px', textAlign: 'center' },
    profileCard: { backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
    profileHeader: { display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '16px' },
    avatar: { width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#F3E8FF', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    profileName: { margin: '0 0 4px', fontSize: '20px', fontWeight: 800, color: '#0F172A' },
    profileMeta: { display: 'flex', gap: '16px', fontSize: '13px', color: '#475569', flexWrap: 'wrap' },
    profileStatsRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', paddingTop: '16px', borderTop: '1px solid #F1F5F9' },
    pStat: { display: 'flex', flexDirection: 'column' },
    pStatLbl: { fontSize: '11px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' },
    pStatVal: { fontSize: '14px', fontWeight: 700, color: '#0F172A', marginTop: '2px' },
    riskGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '16px' },
    riskCard: { backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
    riskCardHeader: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' },
    riskCardLbl: { fontSize: '12px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' },
    riskCardVal: { fontSize: '26px', fontWeight: 900, color: '#0F172A' },
    riskSubText: { fontSize: '11.5px', color: '#64748B', marginTop: '4px' },
    chartCard: { backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
    chartTitle: { margin: '0 0 16px', fontSize: '15px', fontWeight: 800, color: '#0F172A' },
    sectionCard: { backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
    sectionTitle: { margin: '0 0 16px', fontSize: '15px', fontWeight: 800, color: '#0F172A' },
    noDataMsg: { color: '#64748B', fontSize: '13px', margin: 0, fontStyle: 'italic' },
    medCard: { border: '1px solid #E2E8F0', borderRadius: '10px', padding: '14px', display: 'flex', flexDirection: 'column' },
    medStatLine: { fontSize: '12.5px', color: '#334155', marginTop: '4px' },
    medViolationAlert: { marginTop: '8px', padding: '8px', backgroundColor: '#FEE2E2', color: '#991B1B', borderRadius: '6px', fontSize: '11px', fontWeight: 700 },
    pUsageBox: { border: '1px solid #E2E8F0', borderRadius: '10px', padding: '12px', textAlign: 'center', backgroundColor: '#F8FAFC' },
    pUsageVal: { display: 'block', fontSize: '22px', fontWeight: 900, color: '#0F172A' },
    pUsageLbl: { fontSize: '11px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' },
    hashRow: { backgroundColor: '#FEF2F2', padding: '8px 12px', borderRadius: '6px', border: '1px solid #FECACA', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' },
    violationRow: { backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    vTypeBadge: { backgroundColor: '#DC2626', color: '#FFFFFF', padding: '2px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: 800 },
    vRiskBadge: { backgroundColor: '#991B1B', color: '#FFFFFF', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 800 },
    table: { width: '100%', borderCollapse: 'collapse', marginTop: '8px' },
    th: { textAlign: 'left', padding: '10px 12px', fontSize: '12px', color: '#475569', borderBottom: '2px solid #E2E8F0', textTransform: 'uppercase', fontWeight: 700 },
    td: { padding: '10px 12px', fontSize: '13px', color: '#334155', borderBottom: '1px solid #F1F5F9' },
    tblBtn: { background: '#F1F5F9', border: '1px solid #CBD5E1', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' },
    recCard: { backgroundColor: '#EEF2FF', border: '1px solid #C7D2FE', borderRadius: '12px', padding: '18px' },
    actionCard: { backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '20px' },
    textarea: { width: '100%', height: '70px', borderRadius: '8px', border: '1px solid #CBD5E1', padding: '10px', fontSize: '13px', outline: 'none' },
    actBtnWarn: { backgroundColor: '#D97706', color: '#FFFFFF', border: 'none', padding: '10px 18px', borderRadius: '8px', fontWeight: 700, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' },
    actBtnBlock: { backgroundColor: '#DC2626', color: '#FFFFFF', border: 'none', padding: '10px 18px', borderRadius: '8px', fontWeight: 700, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' },
    actBtnExport: { backgroundColor: '#475569', color: '#FFFFFF', border: 'none', padding: '10px 18px', borderRadius: '8px', fontWeight: 700, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }
};

export default PatientAnalytics;
