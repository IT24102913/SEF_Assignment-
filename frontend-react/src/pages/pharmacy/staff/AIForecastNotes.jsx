import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { getDashboardPath } from '../../../utils/navigation';
import { api } from '../../../api/authApi';
import logoImage from '../../../assets/mediz.png';
import {
    ArrowLeft, Download, Trash2, CheckCircle2, XCircle, LogOut,
    FileText, RefreshCw, Calendar, AlertTriangle, ShieldCheck, Zap
} from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const formatNumber = (n) => Math.round(n || 0).toLocaleString('en-LK');

const getUrgencyBadge = (urgency) => {
    const u = (urgency || 'LOW').toUpperCase();
    if (u.includes('CRITICAL') || u === 'HIGH URGENCY')
        return { color: '#DC2626', bg: '#FEE2E2', border: '#FCA5A5', label: u };
    if (u.includes('MEDIUM'))
        return { color: '#EA580C', bg: '#FFEDD5', border: '#FDBA74', label: u };
    if (u.includes('LOW'))
        return { color: '#CA8A04', bg: '#FEF3C7', border: '#FDE047', label: u };
    return { color: '#059669', bg: '#D1FAE5', border: '#6EE7B7', label: u };
};

const getStatusBadge = (status) => {
    const s = (status || 'PENDING').toUpperCase();
    if (s === 'RESTOCKED') return { color: '#047857', bg: '#D1FAE5', label: 'RESTOCKED' };
    if (s === 'DISMISSED') return { color: '#4B5563', bg: '#F3F4F6', label: 'DISMISSED' };
    return { color: '#1D4ED8', bg: '#DBEAFE', label: 'PENDING REVIEW' };
};

const AIForecastNotes = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const [notes, setNotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterTab, setFilterTab] = useState('ALL');

    useEffect(() => {
        loadNotes();
    }, []);

    const loadNotes = async () => {
        setLoading(true);
        try {
            const res = await api.get('/AIForecastNotes');
            setNotes(res.data || []);
        } catch (err) {
            console.error('[AIForecastNotes] Load error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (id, newStatus) => {
        try {
            await api.put(`/AIForecastNotes/${id}`, { noteStatus: newStatus });
            setNotes(prev => prev.map(n => n.id === id ? { ...n, noteStatus: newStatus } : n));
        } catch (err) {
            console.error('Failed to update note status:', err);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this forecast note?')) return;
        try {
            await api.delete(`/AIForecastNotes/${id}`);
            setNotes(prev => prev.filter(n => n.id !== id));
        } catch (err) {
            console.error('Failed to delete note:', err);
        }
    };

    const handleClearAll = async () => {
        if (!window.confirm('Clear all AI forecasting notes?')) return;
        try {
            await api.delete('/AIForecastNotes/clear-all');
            setNotes([]);
        } catch (err) {
            console.error('Failed to clear notes:', err);
        }
    };

    const downloadPDF = () => {
        if (!notes.length) return;
        const doc = new jsPDF();

        // Header Title & Branding
        doc.setFillColor(6, 95, 70);
        doc.rect(0, 0, 210, 28, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.setFont(undefined, 'bold');
        doc.text('HEALTHBRIDGE PHARMACY — AI FORECAST REPORT', 14, 18);

        doc.setTextColor(15, 23, 42);
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text(`Generated On: ${new Date().toLocaleString()}`, 14, 36);
        doc.text(`Total Captured Notes: ${notes.length}`, 14, 42);
        doc.text(`Prepared By: ${user?.fullName || user?.email || 'Pharmacy Staff'}`, 14, 48);

        doc.setDrawColor(226, 232, 240);
        doc.line(14, 52, 196, 52);

        let y = 60;

        filteredNotes.forEach((note, i) => {
            if (y > 240) {
                doc.addPage();
                y = 20;
            }

            // Note title & category
            doc.setFontSize(12);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(15, 23, 42);
            doc.text(`${i + 1}. ${note.medicineName}`, 14, y);
            y += 6;

            doc.setFontSize(9);
            doc.setFont(undefined, 'normal');
            doc.setTextColor(100, 116, 139);
            doc.text(`Category: ${note.category || 'General'}  |  Unit Price: Rs. ${formatNumber(note.unitPrice)}  |  Priority: ${note.urgency}`, 14, y);
            y += 6;

            doc.setTextColor(30, 41, 59);
            doc.text(`Stock: ${note.currentStock} units  |  Days Left: ${note.daysUntilEmpty ?? 'N/A'}  |  Velocity: ${note.averageDailySales}/day  |  Trend: ${note.trend}`, 14, y);
            y += 6;

            doc.text(`Demand Projections: 7d: ${note.predictedDemand7Days} u  |  30d: ${note.predictedDemand30Days} u  |  60d: ${note.predictedDemand60Days} u  |  90d: ${note.predictedDemand90Days} u`, 14, y);
            y += 6;

            const projLower = Math.round((note.projectedRevenue30Days || 0) * 0.85);
            const projUpper = Math.round((note.projectedRevenue30Days || 0) * 1.15);
            const riskLower = Math.round((note.atRiskRevenue || 0) * 0.85);
            const riskUpper = Math.round((note.atRiskRevenue || 0) * 1.15);

            doc.text(`Financial Impact (30d): Projected Revenue Rs. ${formatNumber(projLower)} – ${formatNumber(projUpper)}`, 14, y);
            y += 5;

            if (note.atRiskRevenue > 0) {
                doc.setTextColor(220, 38, 38);
                doc.text(`At-Risk Stockout Loss: Rs. ${formatNumber(riskLower)} – ${formatNumber(riskUpper)}`, 14, y);
                doc.setTextColor(30, 41, 59);
                y += 5;
            }

            if (note.aiInsight) {
                const splitInsight = doc.splitTextToSize(`AI Insight: "${note.aiInsight}"`, 180);
                doc.setFont(undefined, 'italic');
                doc.text(splitInsight, 14, y);
                doc.setFont(undefined, 'normal');
                y += splitInsight.length * 4.5 + 2;
            }

            if (note.aiRecommendation) {
                doc.setFont(undefined, 'bold');
                doc.text(`Recommended Action: ${note.aiRecommendation}`, 14, y);
                doc.setFont(undefined, 'normal');
                y += 6;
            }

            doc.setFontSize(8);
            doc.setTextColor(148, 163, 184);
            doc.text(`Noted by ${note.takenBy || 'Staff'} on ${new Date(note.takenAt).toLocaleString()}  [Status: ${note.noteStatus}]`, 14, y);
            y += 6;

            doc.setDrawColor(226, 232, 240);
            doc.line(14, y, 196, y);
            y += 8;
        });

        doc.save(`AI_Forecast_Notes_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    const filteredNotes = notes.filter(n => {
        if (filterTab === 'PENDING') return (n.noteStatus || 'PENDING') === 'PENDING';
        if (filterTab === 'RESTOCKED') return n.noteStatus === 'RESTOCKED';
        if (filterTab === 'DISMISSED') return n.noteStatus === 'DISMISSED';
        return true;
    });

    const pendingCount = notes.filter(n => (n.noteStatus || 'PENDING') === 'PENDING').length;
    const restockedCount = notes.filter(n => n.noteStatus === 'RESTOCKED').length;
    const dismissedCount = notes.filter(n => n.noteStatus === 'DISMISSED').length;

    return (
        <div style={styles.container}>
            {/* Header */}
            <header style={styles.header}>
                <div style={styles.headerTop}>
                    <div style={styles.leftNav}>
                        <button onClick={() => navigate('/admin/pharmacy/ai-forecast')} style={styles.backBtn}>
                            <ArrowLeft size={16} /> Back to AI Forecast
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
                                <h1 style={styles.logoTitle}>AI FORECASTING NOTES</h1>
                                <p style={styles.logoSubtitle}>Captured AI analysis & restock recommendations</p>
                            </div>
                        </Link>
                    </div>
                    <div style={styles.headerActions}>
                        <button onClick={downloadPDF} disabled={!notes.length} style={styles.downloadPdfBtn}>
                            <Download size={15} /> Download PDF Report
                        </button>
                        <button onClick={handleClearAll} disabled={!notes.length} style={styles.clearAllBtn}>
                            <Trash2 size={15} /> Clear All
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Body */}
            <main style={styles.mainContent}>
                {/* Filter Tabs */}
                <div style={styles.tabNav}>
                    <button
                        onClick={() => setFilterTab('ALL')}
                        style={{ ...styles.tabBtn, ...(filterTab === 'ALL' ? styles.tabBtnActive : {}) }}
                    >
                        All Notes ({notes.length})
                    </button>
                    <button
                        onClick={() => setFilterTab('PENDING')}
                        style={{ ...styles.tabBtn, ...(filterTab === 'PENDING' ? styles.tabBtnActive : {}) }}
                    >
                        Pending Review ({pendingCount})
                    </button>
                    <button
                        onClick={() => setFilterTab('RESTOCKED')}
                        style={{ ...styles.tabBtn, ...(filterTab === 'RESTOCKED' ? styles.tabBtnActive : {}) }}
                    >
                        Restocked ({restockedCount})
                    </button>
                    <button
                        onClick={() => setFilterTab('DISMISSED')}
                        style={{ ...styles.tabBtn, ...(filterTab === 'DISMISSED' ? styles.tabBtnActive : {}) }}
                    >
                        Dismissed ({dismissedCount})
                    </button>
                </div>

                {loading ? (
                    <div style={styles.loadingBox}>
                        <RefreshCw size={24} className="animate-spin" color="#059669" />
                        <span style={{ marginTop: '10px', color: '#64748B', fontWeight: 600 }}>Loading forecast notes...</span>
                    </div>
                ) : filteredNotes.length === 0 ? (
                    <div style={styles.emptyBox}>
                        <FileText size={40} color="#94A3B8" />
                        <h3 style={{ margin: '12px 0 4px 0', color: '#1E293B', fontWeight: 700 }}>No Forecast Notes Found</h3>
                        <p style={{ margin: 0, color: '#64748B', fontSize: '13px' }}>
                            {filterTab === 'ALL'
                                ? 'Review critical items in the AI Forecast dashboard and click "Take a Note" to capture snapshot data.'
                                : `No notes found under "${filterTab}" status.`}
                        </p>
                    </div>
                ) : (
                    <div style={styles.notesGrid}>
                        {filteredNotes.map(note => {
                            const urg = getUrgencyBadge(note.urgency);
                            const status = getStatusBadge(note.noteStatus);
                            const projLower = Math.round((note.projectedRevenue30Days || 0) * 0.85);
                            const projUpper = Math.round((note.projectedRevenue30Days || 0) * 1.15);
                            const riskLower = Math.round((note.atRiskRevenue || 0) * 0.85);
                            const riskUpper = Math.round((note.atRiskRevenue || 0) * 1.15);

                            return (
                                <div key={note.id} style={styles.noteCard}>
                                    {/* Top Card Header */}
                                    <div style={styles.cardHeader}>
                                        <div>
                                            <div style={styles.cardMeta}>
                                                <span style={{ ...styles.urgBadge, color: urg.color, background: urg.bg, border: `1px solid ${urg.border}` }}>
                                                    {urg.label}
                                                </span>
                                                <span style={styles.confBadge}>
                                                    AI Confidence: {Math.round((note.confidence || 0.88) * 100)}%
                                                </span>
                                                <span style={{ ...styles.statusBadge, color: status.color, background: status.bg }}>
                                                    {status.label}
                                                </span>
                                            </div>
                                            <h3 style={styles.medicineTitle}>{note.medicineName}</h3>
                                            <p style={styles.medicineSub}>
                                                Category: {note.category || 'General'} • Unit Price: Rs. {formatNumber(note.unitPrice)}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Current State Row */}
                                    <div style={styles.sectionBlock}>
                                        <div style={styles.blockTitle}>CURRENT STATE</div>
                                        <div style={styles.statsRow}>
                                            <div>Stock: <strong>{note.currentStock} units</strong></div>
                                            <div>Days Left: <strong>{note.daysUntilEmpty ?? 'N/A'}</strong></div>
                                            <div>Velocity: <strong>{note.averageDailySales}/day</strong></div>
                                            <div>Status: <strong>{note.stockStatus}</strong></div>
                                            <div>Trend: <strong>{note.trend}</strong></div>
                                        </div>
                                    </div>

                                    {/* Multi-Period Predictions */}
                                    <div style={styles.sectionBlock}>
                                        <div style={styles.blockTitle}>MULTI-PERIOD PREDICTION</div>
                                        <div style={styles.periodRow}>
                                            <div style={styles.pBox}><span>Next 7d</span><strong>{note.predictedDemand7Days} u</strong></div>
                                            <div style={styles.pBox}><span>Next 30d</span><strong>{note.predictedDemand30Days} u</strong></div>
                                            <div style={styles.pBox}><span>Next 60d</span><strong>{note.predictedDemand60Days} u</strong></div>
                                            <div style={styles.pBox}><span>Next 90d</span><strong>{note.predictedDemand90Days} u</strong></div>
                                        </div>
                                    </div>

                                    {/* Seasonal Factor */}
                                    {note.seasonalFactor && (
                                        <div style={styles.seasonalBox}>
                                            <div style={styles.blockTitleGold}>SEASONAL FACTOR & MULTIPLIER</div>
                                            <div style={{ fontSize: '13px', fontWeight: 700, color: '#92400E', marginTop: '2px' }}>
                                                {note.seasonalFactor} • Demand Multiplier: ×{note.seasonalMultiplier}
                                            </div>
                                        </div>
                                    )}

                                    {/* Financial Impact */}
                                    <div style={styles.financialBox}>
                                        <div style={styles.blockTitleBlue}>FINANCIAL IMPACT (30-DAY)</div>
                                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#1E40AF', marginTop: '2px' }}>
                                            Projected Revenue: Rs. {formatNumber(projLower)} – {formatNumber(projUpper)}
                                        </div>
                                        {note.atRiskRevenue > 0 && (
                                            <div style={{ fontSize: '12px', fontWeight: 700, color: '#DC2626', marginTop: '2px' }}>
                                                At-Risk Stockout Loss: Rs. {formatNumber(riskLower)} – {formatNumber(riskUpper)}
                                            </div>
                                        )}
                                    </div>

                                    {/* Supplier Deadline */}
                                    <div style={styles.deadlineBox}>
                                        <div style={styles.blockTitleOrange}>SUPPLIER LEAD-TIME ORDER DEADLINE</div>
                                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#C2410C', marginTop: '2px' }}>
                                            Order Now By: {note.orderByDate ? new Date(note.orderByDate).toLocaleDateString() : 'No Immediate Order Required'}
                                        </div>
                                    </div>

                                    {/* AI Insight */}
                                    <div style={styles.aiBox}>
                                        {note.aiInsight && (
                                            <p style={styles.aiText}>"{note.aiInsight}"</p>
                                        )}
                                        <div style={{ fontSize: '13px', color: '#0F172A', marginTop: '4px' }}>
                                            <strong>Recommended Action:</strong> {note.aiRecommendation || (note.suggestedOrderQty > 0 ? `Reorder ${note.suggestedOrderQty} units now.` : 'No immediate order needed.')}
                                        </div>
                                    </div>

                                    {/* Noted Footer Metadata */}
                                    <div style={styles.cardFooter}>
                                        <span style={{ fontSize: '12px', color: '#64748B' }}>
                                            Noted by {note.takenBy || 'Pharmacist'} on {new Date(note.takenAt).toLocaleString()}
                                        </span>
                                        <div style={styles.cardActionGroup}>
                                            {note.noteStatus !== 'RESTOCKED' && (
                                                <button onClick={() => handleUpdateStatus(note.id, 'RESTOCKED')} style={styles.markRestockedBtn}>
                                                    <CheckCircle2 size={14} /> Mark Restocked
                                                </button>
                                            )}
                                            {note.noteStatus !== 'DISMISSED' && (
                                                <button onClick={() => handleUpdateStatus(note.id, 'DISMISSED')} style={styles.dismissNoteBtn}>
                                                    <XCircle size={14} /> Dismiss
                                                </button>
                                            )}
                                            <button onClick={() => handleDelete(note.id)} style={styles.deleteNoteBtn} title="Delete Note">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>
        </div>
    );
};

const styles = {
    container: { minHeight: '100vh', backgroundColor: '#F8FAFC', fontFamily: "'Inter', sans-serif" },
    header: { backgroundColor: '#FFFFFF', borderBottom: '1px solid #E2E8F0', position: 'sticky', top: 0, zIndex: 50 },
    headerTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 32px', maxWidth: '1440px', margin: '0 auto' },
    leftNav: { display: 'flex', alignItems: 'center', gap: '16px' },
    backBtn: { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '20px', background: '#F1F5F9', border: 'none', color: '#475569', fontSize: '12px', fontWeight: 700, cursor: 'pointer' },
    logo: { display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' },
    logoImg: { height: '32px', width: 'auto' },
    logoTitle: { fontSize: '15px', fontWeight: 800, color: '#065F46', margin: 0 },
    logoSubtitle: { fontSize: '11px', color: '#64748B', margin: 0 },
    headerActions: { display: 'flex', alignItems: 'center', gap: '12px' },
    downloadPdfBtn: { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 16px', borderRadius: '8px', background: '#059669', border: 'none', color: '#FFFFFF', fontWeight: 700, fontSize: '13px', cursor: 'pointer' },
    clearAllBtn: { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 14px', borderRadius: '8px', background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#DC2626', fontWeight: 700, fontSize: '13px', cursor: 'pointer' },
    mainContent: { maxWidth: '1440px', margin: '0 auto', padding: '24px 32px' },
    tabNav: { display: 'flex', gap: '10px', marginBottom: '20px' },
    tabBtn: { padding: '10px 18px', borderRadius: '10px', background: '#FFFFFF', border: '1px solid #E2E8F0', color: '#64748B', fontWeight: 700, fontSize: '13px', cursor: 'pointer' },
    tabBtnActive: { background: '#7C3AED', color: '#FFFFFF', borderColor: '#7C3AED' },
    loadingBox: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px', background: '#FFFFFF', borderRadius: '14px', border: '1px solid #E2E8F0' },
    emptyBox: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px', background: '#FFFFFF', borderRadius: '14px', border: '1px solid #E2E8F0', textAlign: 'center' },
    notesGrid: { display: 'flex', flexDirection: 'column', gap: '18px' },
    noteCard: { backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '22px', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' },
    cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' },
    cardMeta: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' },
    urgBadge: { padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 800 },
    confBadge: { padding: '3px 10px', borderRadius: '12px', background: '#EFF6FF', color: '#1E40AF', fontSize: '11px', fontWeight: 700 },
    statusBadge: { padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 800 },
    medicineTitle: { fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: 0 },
    medicineSub: { fontSize: '13px', color: '#64748B', margin: '2px 0 0 0' },
    sectionBlock: { background: '#F8FAFC', borderRadius: '10px', border: '1px solid #E2E8F0', padding: '12px 14px', marginBottom: '10px' },
    blockTitle: { fontSize: '10px', fontWeight: 800, color: '#64748B', letterSpacing: '0.5px' },
    statsRow: { display: 'flex', gap: '20px', fontSize: '13px', color: '#334155', marginTop: '4px' },
    periodRow: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginTop: '4px' },
    pBox: { display: 'flex', flexDirection: 'column', fontSize: '12px', color: '#475569' },
    seasonalBox: { background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: '10px', padding: '12px', marginBottom: '10px' },
    blockTitleGold: { fontSize: '10px', fontWeight: 800, color: '#92400E', letterSpacing: '0.5px' },
    financialBox: { background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '10px', padding: '12px', marginBottom: '10px' },
    blockTitleBlue: { fontSize: '10px', fontWeight: 800, color: '#1E40AF', letterSpacing: '0.5px' },
    deadlineBox: { background: '#FFEDD5', border: '1px solid #FED7AA', borderRadius: '10px', padding: '12px', marginBottom: '10px' },
    blockTitleOrange: { fontSize: '10px', fontWeight: 800, color: '#C2410C', letterSpacing: '0.5px' },
    aiBox: { background: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: '12px', padding: '14px', marginBottom: '14px' },
    aiText: { fontStyle: 'italic', fontSize: '13px', color: '#334155', margin: '0 0 6px 0' },
    cardFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #F1F5F9', paddingTop: '12px', marginTop: '10px' },
    cardActionGroup: { display: 'flex', alignItems: 'center', gap: '8px' },
    markRestockedBtn: { display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 12px', borderRadius: '6px', background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#047857', fontSize: '12px', fontWeight: 700, cursor: 'pointer' },
    dismissNoteBtn: { display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 12px', borderRadius: '6px', background: '#F3F4F6', border: '1px solid #E5E7EB', color: '#4B5563', fontSize: '12px', fontWeight: 700, cursor: 'pointer' },
    deleteNoteBtn: { display: 'inline-flex', alignItems: 'center', padding: '6px 10px', borderRadius: '6px', background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#DC2626', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }
};

export default AIForecastNotes;
