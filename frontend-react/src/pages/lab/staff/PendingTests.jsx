import React, { useEffect, useState, useRef } from 'react';
import { 
  getAllBookings, 
  markCollected, 
  updateBookingStatus, 
  uploadResult, 
  uploadFile, 
  deleteBookingAdmin,
  collectCounterPayment
} from '../../../api/labApi';
import LabLayout from '../../../components/layout/LabLayout';
import toast from 'react-hot-toast';
import { 
  FlaskConical, 
  Search, 
  Microscope, 
  FileText, 
  Send, 
  Check, 
  Upload, 
  FileUp, 
  CheckCircle2, 
  Clock, 
  Sparkles,
  Link as LinkIcon,
  CheckCircle,
  Eye,
  Trash2,
  XCircle,
  X,
  FileCheck,
  Download,
  AlertCircle,
  Calendar,
  User,
  Mail,
  Edit3,
  CreditCard,
  DollarSign,
  Receipt,
  Lock,
  CheckSquare
} from 'lucide-react';
import emptyImg from '../../../assets/lab_empty_microscope.jpg';

const TECHNICIAN_ID = '00000000-0000-0000-0000-000000000001';

const getStageRank = (status) => {
  switch (status) {
    case 'PendingPrescriptionUpload':
    case 'PendingAIVerification':
    case 'PendingLabApproval':
    case 'Confirmed':
      return 1;
    case 'SampleCollected':
      return 2;
    case 'TestingInProgress':
      return 3;
    case 'ResultVerification':
      return 4;
    case 'ResultsReady':
      return 5;
    case 'ReportDelivered':
      return 6;
    case 'Completed':
      return 7;
    default:
      return 1;
  }
};

export default function PendingTests() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stageFilter, setStageFilter] = useState('ALL'); 
  const [search, setSearch] = useState('');
  
  // Selected files per booking: bookingId -> File
  const [selectedFiles, setSelectedFiles] = useState({});
  const [manualUrls, setManualUrls] = useState({});
  const [useLinkMode, setUseLinkMode] = useState({});
  const [uploadingId, setUploadingId] = useState(null);

  // Document Preview Modal
  const [previewDoc, setPreviewDoc] = useState(null); // { title, url, type }

  // Counter Payment Modal
  const [paymentModalBooking, setPaymentModalBooking] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('CounterCash');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);

  const load = () => {
    setLoading(true);
    getAllBookings('')
      .then(r => {
        const all = r.data || [];
        // Active in-progress test stages
        const pendingQueue = all.filter(b => 
          b.status === 'PendingLabApproval' ||
          b.status === 'PendingPrescriptionUpload' ||
          b.status === 'PendingAIVerification' ||
          b.status === 'Confirmed' ||
          b.status === 'SampleCollected' ||
          b.status === 'TestingInProgress' ||
          b.status === 'ResultVerification' ||
          b.status === 'ResultsReady' ||
          b.status === 'ReportDelivered'
        );
        setBookings(pendingQueue);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  // --- ACTIONS ---

  const handleMarkCollected = async (id, patientName) => {
    try {
      await markCollected(id, TECHNICIAN_ID);
      toast.success(`Specimen marked as collected for ${patientName}!`);
      window.dispatchEvent(new Event('lab-booking-updated'));
      load();
    } catch {
      toast.error('Failed to update sample status');
    }
  };

  const handleRecordCounterPayment = async (andMarkCollected = true) => {
    if (!paymentModalBooking) return;
    setPaymentSubmitting(true);
    try {
      const price = paymentModalBooking.labTest?.price || 0;
      const res = await collectCounterPayment({
        bookingId: paymentModalBooking.id,
        amount: price,
        paymentMethod,
        notes: paymentNotes.trim() || `Collected at Phlebotomy Counter (${paymentMethod === 'CounterCash' ? 'Cash' : 'POS Card'})`,
        collectedBy: 'Staff Phlebotomist'
      });
      const receiptNo = res.data?.receiptNumber || 'RCP';

      if (andMarkCollected) {
        await markCollected(paymentModalBooking.id, TECHNICIAN_ID);
        toast.success(`Payment of LKR ${price} recorded (Receipt #${receiptNo}) and specimen marked as collected!`);
      } else {
        toast.success(`Payment of LKR ${price} recorded! Receipt #${receiptNo}`);
      }

      setPaymentModalBooking(null);
      setPaymentNotes('');
      window.dispatchEvent(new Event('lab-booking-updated'));
      load();
    } catch (err) {
      toast.error('Failed to record counter payment: ' + (err.response?.data?.message || err.message));
    } finally {
      setPaymentSubmitting(false);
    }
  };

  const handleStatusChange = async (id, newStatus, message) => {
    try {
      await updateBookingStatus(id, newStatus);
      toast.success(message || `Status updated to ${newStatus}`);
      window.dispatchEvent(new Event('lab-booking-updated'));
      load();
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async (id, patientName) => {
    if (!window.confirm(`Are you sure you want to permanently delete the booking for ${patientName}?`)) return;
    try {
      await deleteBookingAdmin(id);
      toast.success('Booking deleted successfully');
      window.dispatchEvent(new Event('lab-booking-updated'));
      load();
    } catch {
      toast.error('Failed to delete booking');
    }
  };

  const handleFileSelect = (bookingId, file) => {
    if (file) {
      setSelectedFiles(prev => ({ ...prev, [bookingId]: file }));
    }
  };

  const handleUploadReport = async (b) => {
    const isManual = useLinkMode[b.id];
    const file = selectedFiles[b.id];
    const manualUrl = manualUrls[b.id] || b.resultFileUrl || '';

    if (!isManual && !file && !manualUrl) {
      return toast.error('Please choose a PDF document file to upload');
    }
    if (isManual && !manualUrl.trim()) {
      return toast.error('Please enter a valid report URL link');
    }

    setUploadingId(b.id);
    try {
      let finalFileUrl = manualUrl.trim();

      if (!isManual && file) {
        toast.loading(`Uploading PDF report for ${b.patientName}...`, { id: `upload-${b.id}` });
        const res = await uploadFile(file);
        finalFileUrl = res.data.fileUrl;
        toast.dismiss(`upload-${b.id}`);
      }

      await uploadResult(b.id, TECHNICIAN_ID, finalFileUrl);
      toast.success(`Report uploaded & email notification delivered to ${b.patientEmail}!`);
      setSelectedFiles(prev => { const n = { ...prev }; delete n[b.id]; return n; });
      window.dispatchEvent(new Event('lab-booking-updated'));
      load();
    } catch (err) {
      toast.dismiss(`upload-${b.id}`);
      toast.error('Failed to upload report: ' + (err.response?.data?.message || err.message));
    } finally {
      setUploadingId(null);
    }
  };

  // Filter
  const filtered = bookings.filter(b => {
    const matchesStage = stageFilter === 'ALL' || b.status === stageFilter;
    const matchesSearch = 
      b.patientName?.toLowerCase().includes(search.toLowerCase()) ||
      b.labTest?.name?.toLowerCase().includes(search.toLowerCase()) ||
      b.patientEmail?.toLowerCase().includes(search.toLowerCase());
    return matchesStage && matchesSearch;
  });

  const countPendingApproval = bookings.filter(b => b.status.startsWith('Pending')).length;
  const countConfirmed = bookings.filter(b => b.status === 'Confirmed').length;
  const countCollected = bookings.filter(b => b.status === 'SampleCollected').length;
  const countTesting = bookings.filter(b => b.status === 'TestingInProgress' || b.status === 'ResultVerification').length;
  const countResults = bookings.filter(b => b.status === 'ResultsReady' || b.status === 'ReportDelivered').length;

  return (
    <LabLayout>
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 className="page-title">Pending Tests Work Queue</h1>
            <p className="page-subtitle">Full diagnostic workflow actions: sample collection, testing progression, PDF report uploading, and patient delivery</p>
          </div>
          <div className="badge badge-approved" style={{ padding: '6px 14px', fontSize: '13px', fontWeight: 700 }}>
            <Sparkles size={14} style={{ display: 'inline', marginRight: 5 }} />
            {bookings.length} Active Tests In Queue
          </div>
        </div>
      </div>

      {/* Stage Summary Cards */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', marginBottom: 20 }}>
        <div 
          className="stat-card hover-lift" 
          onClick={() => setStageFilter('Confirmed')}
          style={{ cursor: 'pointer', borderLeft: stageFilter === 'Confirmed' ? '4px solid #10B981' : undefined }}
        >
          <div className="stat-icon" style={{ background: '#ECFDF5', color: '#059669' }}>
            <Clock size={20} />
          </div>
          <div>
            <div className="stat-value" style={{ color: '#059669' }}>{countConfirmed}</div>
            <div className="stat-label">1. Awaiting Sample</div>
          </div>
        </div>

        <div 
          className="stat-card hover-lift" 
          onClick={() => setStageFilter('SampleCollected')}
          style={{ cursor: 'pointer', borderLeft: stageFilter === 'SampleCollected' ? '4px solid #0D9488' : undefined }}
        >
          <div className="stat-icon" style={{ background: '#CCFBF1', color: '#0D9488' }}>
            <FlaskConical size={20} />
          </div>
          <div>
            <div className="stat-value" style={{ color: '#0D9488' }}>{countCollected}</div>
            <div className="stat-label">2. Specimen Collected</div>
          </div>
        </div>

        <div 
          className="stat-card hover-lift" 
          onClick={() => setStageFilter('TestingInProgress')}
          style={{ cursor: 'pointer', borderLeft: stageFilter === 'TestingInProgress' ? '4px solid #D97706' : undefined }}
        >
          <div className="stat-icon" style={{ background: '#FEF3C7', color: '#D97706' }}>
            <Microscope size={20} />
          </div>
          <div>
            <div className="stat-value" style={{ color: '#D97706' }}>{countTesting}</div>
            <div className="stat-label">3. Analysis In Progress</div>
          </div>
        </div>

        <div 
          className="stat-card hover-lift" 
          onClick={() => setStageFilter('ResultsReady')}
          style={{ cursor: 'pointer', borderLeft: stageFilter === 'ResultsReady' ? '4px solid #047857' : undefined }}
        >
          <div className="stat-icon" style={{ background: '#D1FAE5', color: '#047857' }}>
            <FileText size={20} />
          </div>
          <div>
            <div className="stat-value" style={{ color: '#047857' }}>{countResults}</div>
            <div className="stat-label">4. PDF Reports Ready</div>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="card animate-slide-up" style={{ marginBottom: 20, padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
          <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
            {[
              { key: 'ALL', label: `All In-Progress (${bookings.length})` },
              { key: 'Confirmed', label: `Awaiting Sample (${countConfirmed})` },
              { key: 'SampleCollected', label: `Sample Collected (${countCollected})` },
              { key: 'TestingInProgress', label: `In Testing (${countTesting})` },
              { key: 'ResultsReady', label: `Results Ready (${countResults})` },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setStageFilter(tab.key)}
                style={{
                  padding: '7px 14px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: stageFilter === tab.key ? 700 : 500,
                  background: stageFilter === tab.key ? '#059669' : '#F1F5F9',
                  color: stageFilter === tab.key ? '#FFFFFF' : '#475569',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="search-bar" style={{ minWidth: 260 }}>
            <Search size={16} />
            <input
              className="input"
              placeholder="Search patient, test, email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Main Queue Content */}
      {loading ? (
        <div className="spinner" />
      ) : filtered.length === 0 ? (
        <div className="card">
          <div className="empty-state animate-fade-in" style={{ padding: '40px 20px' }}>
            <img src={emptyImg} alt="No Pending Tests" style={{ width: 180, height: 180, objectFit: 'cover', borderRadius: 20, boxShadow: 'var(--shadow)' }} />
            <p style={{ fontSize: 18, fontWeight: 700, marginTop: 24, color: 'var(--primary-dark)' }}>No active tests in this stage</p>
            <p className="text-muted">All active diagnostic tests and specimen processing queues are clear.</p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {filtered.map((b, i) => {
            const currentFile = selectedFiles[b.id];
            const isManual = useLinkMode[b.id];
            const currentManualUrl = manualUrls[b.id] !== undefined ? manualUrls[b.id] : (b.resultFileUrl || '');
            const rank = getStageRank(b.status);
            const isPaid = b.paymentStatus === 'PaidOnline' || b.paymentStatus === 'PaidAtCounter';
            const price = b.labTest?.price || b.amountPaid || 0;

            let stageBadge = <span className="badge badge-confirmed">Confirmed &bull; Awaiting Sample</span>;
            if (b.status === 'SampleCollected') stageBadge = <span className="badge badge-collected">🧪 Specimen Collected</span>;
            if (b.status === 'TestingInProgress') stageBadge = <span className="badge badge-pending">🔬 Testing Underway</span>;
            if (b.status === 'ResultVerification') stageBadge = <span className="badge badge-pending">🔎 Result Verification</span>;
            if (b.status === 'ResultsReady') stageBadge = <span className="badge badge-results">📄 Results Ready</span>;
            if (b.status === 'ReportDelivered') stageBadge = <span className="badge badge-approved">📬 Report Delivered</span>;
            if (b.status.startsWith('Pending')) stageBadge = <span className="badge badge-pending">⏳ Pending Approval</span>;

            return (
              <div 
                className="card hover-lift animate-fade-in" 
                key={b.id}
                style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '1.25fr 1.75fr', 
                  gap: 26, 
                  alignItems: 'flex-start', 
                  animationDelay: `${i * 40}ms`, 
                  animationFillMode: 'both',
                  padding: '24px 28px',
                  borderLeft: b.status === 'ResultsReady' ? '5px solid #10B981' : b.status === 'TestingInProgress' ? '5px solid #F59E0B' : '5px solid #0D9488'
                }}
              >
                {/* Left Side: Test & Patient Info */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                    <div style={{ fontWeight: 800, fontSize: 17, color: '#064E3B' }}>
                      {b.labTest?.name}
                    </div>
                  </div>

                  <div style={{ color: '#64748B', fontSize: 13, marginBottom: 3, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <User size={13} color="#059669" />
                    Patient: <strong style={{ color: '#0F172A' }}>{b.patientName}</strong>
                  </div>
                  <div style={{ color: '#64748B', fontSize: 13, marginBottom: 3, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Mail size={13} color="#059669" />
                    Email: {b.patientEmail}
                  </div>
                  <div style={{ color: '#64748B', fontSize: 13, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Calendar size={13} color="#059669" />
                    Scheduled: <strong>{b.bookingDate}</strong> &bull; {b.timeSlot}
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                    {stageBadge}
                    {b.paymentStatus === 'PaidOnline' ? (
                      <span className="badge" style={{ background: '#ECFDF5', color: '#065F46', border: '1px solid #A7F3D0', fontWeight: 700, fontSize: 11.5 }}>
                        💳 Paid Online (LKR {b.amountPaid || b.labTest?.price})
                      </span>
                    ) : b.paymentStatus === 'PaidAtCounter' ? (
                      <span className="badge" style={{ background: '#ECFDF5', color: '#065F46', border: '1px solid #A7F3D0', fontWeight: 700, fontSize: 11.5 }}>
                        🏥 Paid Counter (LKR {b.amountPaid || b.labTest?.price})
                      </span>
                    ) : (
                      <span className="badge" style={{ background: '#FFFBEB', color: '#B45309', border: '1px solid #FDE68A', fontWeight: 700, fontSize: 11.5 }}>
                        ⚠️ Payment Due: LKR {b.labTest?.price} {b.paymentMethod === 'CashOnArrival' ? '• Counter Intent' : ''}
                      </span>
                    )}
                    {b.labTest?.category && (
                      <span className="text-muted text-sm" style={{ background: '#F1F5F9', padding: '2px 8px', borderRadius: 4 }}>
                        {b.labTest.category}
                      </span>
                    )}
                  </div>

                  {/* Document links */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {b.prescriptionImageUrl && (
                      <button 
                        className="btn btn-ghost btn-sm"
                        style={{ justifyContent: 'flex-start', padding: 0, color: '#2563EB', fontSize: 12.5 }}
                        onClick={() => setPreviewDoc({ title: `Prescription: ${b.patientName}`, url: b.prescriptionImageUrl, type: 'image' })}
                      >
                        <Eye size={13} /> View Uploaded Prescription
                      </button>
                    )}

                    {b.resultFileUrl && (
                      <button 
                        className="btn btn-ghost btn-sm"
                        style={{ justifyContent: 'flex-start', padding: 0, color: '#059669', fontWeight: 700, fontSize: 12.5 }}
                        onClick={() => setPreviewDoc({ title: `Official Report: ${b.labTest?.name}`, url: b.resultFileUrl, type: 'pdf' })}
                      >
                        <FileText size={13} /> View Official Result Report
                      </button>
                    )}
                  </div>

                  {/* Record Actions Toolbar */}
                  <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 11.5, color: '#64748B', fontWeight: 600 }}>
                      Diagnostic Stepper Enforced
                    </span>
                    <button 
                      className="btn btn-ghost btn-sm" 
                      style={{ color: '#EF4444', padding: '4px 8px', fontSize: 11.5, display: 'flex', alignItems: 'center', gap: 4 }}
                      onClick={() => handleDelete(b.id, b.patientName)}
                      title="Permanently Delete Booking"
                    >
                      <Trash2 size={13} /> Delete
                    </button>
                  </div>
                </div>

                {/* Right Side: Sequential Clinical Stepper */}
                <div style={{ background: '#F8FAF9', padding: '18px 20px', borderRadius: 14, border: '1px solid #E2E8F0', width: '100%' }}>
                  
                  <div>
                      {/* Stepper Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <div>
                          <div style={{ fontWeight: 800, color: '#064E3B', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <CheckCircle2 size={16} color="#059669" /> Clinical Workflow Checklist
                          </div>
                          <div style={{ fontSize: 11.5, color: '#64748B', marginTop: 1 }}>
                            Tick and advance each diagnostic milestone in sequence
                          </div>
                        </div>
                        <span className="badge" style={{ background: '#ECFDF5', color: '#065F46', fontWeight: 700, fontSize: 11 }}>
                          {rank === 1 && 'Step 1: Sample Due'}
                          {rank === 2 && 'Step 2: Assay Due'}
                          {rank === 3 && 'Step 3: In Analyzer'}
                          {(rank === 4 || rank === 5) && 'Step 4: Results Ready'}
                          {(rank === 6 || rank === 7) && 'Step 5: Finalizing'}
                        </span>
                      </div>

                      {/* ─── STEP 1: Specimen Collection ─── */}
                      <div style={{ marginBottom: 10 }}>
                        {rank > 1 ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#ECFDF5', borderRadius: 8, border: '1px solid #A7F3D0', color: '#065F46', fontSize: 12.5, fontWeight: 700 }}>
                            <CheckCircle2 size={15} color="#059669" />
                            <span>1. Specimen Collected & Barcode Accessioned</span>
                            <span style={{ marginLeft: 'auto', fontSize: 11, color: '#047857', fontWeight: 600 }}>✓ Done</span>
                          </div>
                        ) : rank === 1 ? (
                          <div style={{ background: '#FFFFFF', padding: '14px 16px', borderRadius: 10, border: '1.5px solid #059669', boxShadow: '0 2px 6px rgba(5,150,105,0.08)' }}>
                            <div style={{ fontWeight: 800, color: '#064E3B', fontSize: 13.5, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                              <FlaskConical size={15} color="#059669" /> Step 1: Patient Specimen Collection
                            </div>
                            <p style={{ fontSize: 12, color: '#64748B', margin: '0 0 10px 0' }}>
                              Patient is at phlebotomy counter. Verify identity, label specimen tube, and confirm payment settlement.
                            </p>

                            {isPaid ? (
                              <div>
                                <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', padding: '8px 12px', borderRadius: 8, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <CheckCircle size={14} color="#059669" />
                                  <span style={{ fontSize: 11.5, color: '#065F46', fontWeight: 700 }}>
                                    Payment Cleared: LKR {price} ({b.receiptNumber || 'Verified'})
                                  </span>
                                </div>
                                <button 
                                  className="btn btn-primary" 
                                  style={{ width: '100%', background: '#059669', color: '#fff', padding: '10px 14px', fontWeight: 800 }}
                                  onClick={() => handleMarkCollected(b.id, b.patientName)}
                                >
                                  <FlaskConical size={15} /> Tick: Mark Specimen as Collected
                                </button>
                              </div>
                            ) : (
                              <div>
                                <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', padding: '8px 12px', borderRadius: 8, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <AlertCircle size={14} color="#D97706" />
                                  <span style={{ fontSize: 11.5, color: '#92400E', fontWeight: 700 }}>
                                    Payment Due: LKR {price} {b.paymentMethod === 'CashOnArrival' ? '(Counter Pay Selected)' : ''}
                                  </span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                  <button 
                                    className="btn btn-primary" 
                                    style={{ width: '100%', background: '#2563EB', color: '#fff', padding: '9px 12px', fontWeight: 800 }}
                                    onClick={() => { setPaymentModalBooking(b); setPaymentMethod('CounterCash'); setPaymentNotes(''); }}
                                  >
                                    <CreditCard size={15} /> Collect Payment at Counter (Cash / POS)
                                  </button>
                                  <button 
                                    className="btn btn-outline btn-sm" 
                                    style={{ width: '100%', color: '#059669', borderColor: '#059669' }}
                                    onClick={() => handleMarkCollected(b.id, b.patientName)}
                                    title="Bypass payment and collect sample"
                                  >
                                    <FlaskConical size={13} /> Bypass & Mark Specimen Collected
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#F8FAFC', borderRadius: 8, border: '1px solid #E2E8F0', color: '#94A3B8', fontSize: 12 }}>
                            <Lock size={13} /> 1. Specimen Collection (Pending Approval)
                          </div>
                        )}
                      </div>

                      {/* ─── STEP 2: Laboratory Analysis (NO PDF UPLOAD HERE) ─── */}
                      <div style={{ marginBottom: 10 }}>
                        {rank > 2 ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#ECFDF5', borderRadius: 8, border: '1px solid #A7F3D0', color: '#065F46', fontSize: 12.5, fontWeight: 700 }}>
                            <CheckCircle2 size={15} color="#059669" />
                            <span>2. Specimen In Analyzer & Diagnostic Assay Started</span>
                            <span style={{ marginLeft: 'auto', fontSize: 11, color: '#047857', fontWeight: 600 }}>✓ Done</span>
                          </div>
                        ) : rank === 2 ? (
                          <div style={{ background: '#FFFFFF', padding: '14px 16px', borderRadius: 10, border: '1.5px solid #0D9488', boxShadow: '0 2px 6px rgba(13,148,136,0.08)' }}>
                            <div style={{ fontWeight: 800, color: '#0F766E', fontSize: 13.5, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                              <Microscope size={15} color="#0D9488" /> Step 2: Laboratory Analysis & Assay Run
                            </div>
                            <p style={{ fontSize: 12, color: '#64748B', margin: '0 0 12px 0' }}>
                              Specimen accessioned into laboratory. Place tubes into chemistry/hematology analyzer and tick to initiate assay.
                            </p>
                            <button 
                              className="btn btn-primary" 
                              style={{ width: '100%', background: '#0D9488', color: '#fff', padding: '10px 14px', fontWeight: 800, fontSize: 13 }}
                              onClick={() => handleStatusChange(b.id, 'TestingInProgress', 'Laboratory analysis & assay started!')}
                            >
                              <Microscope size={15} /> Tick: Specimen in Analyzer & Start Assay
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#F8FAFC', borderRadius: 8, border: '1px solid #E2E8F0', color: '#94A3B8', fontSize: 12 }}>
                            <Lock size={13} /> 2. Laboratory Analysis (Awaiting Specimen)
                          </div>
                        )}
                      </div>

                      {/* ─── STEP 3: Result Verification (NO PDF UPLOAD HERE) ─── */}
                      <div style={{ marginBottom: 10 }}>
                        {rank > 3 ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#ECFDF5', borderRadius: 8, border: '1px solid #A7F3D0', color: '#065F46', fontSize: 12.5, fontWeight: 700 }}>
                            <CheckCircle2 size={15} color="#059669" />
                            <span>3. Diagnostic Assays Completed & Parameters Verified</span>
                            <span style={{ marginLeft: 'auto', fontSize: 11, color: '#047857', fontWeight: 600 }}>✓ Done</span>
                          </div>
                        ) : rank === 3 ? (
                          <div style={{ background: '#FFFFFF', padding: '14px 16px', borderRadius: 10, border: '1.5px solid #D97706', boxShadow: '0 2px 6px rgba(217,119,6,0.08)' }}>
                            <div style={{ fontWeight: 800, color: '#B45309', fontSize: 13.5, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                              <CheckSquare size={15} color="#D97706" /> Step 3: Clinical Assay Completion
                            </div>
                            <p style={{ fontSize: 12, color: '#64748B', margin: '0 0 12px 0' }}>
                              Analyzer diagnostic assay is running. Once the physical run finishes and values are verified, tick to unlock official report upload.
                            </p>
                            <button 
                              className="btn btn-primary" 
                              style={{ width: '100%', background: '#D97706', color: '#fff', padding: '10px 14px', fontWeight: 800, fontSize: 13 }}
                              onClick={() => handleStatusChange(b.id, 'ResultVerification', 'Assays completed! Test results ready for official report upload.')}
                            >
                              <CheckSquare size={15} /> Tick: Assays Complete • Test Results Ready
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#F8FAFC', borderRadius: 8, border: '1px solid #E2E8F0', color: '#94A3B8', fontSize: 12 }}>
                            <Lock size={13} /> 3. Result Verification (Assays In Progress)
                          </div>
                        )}
                      </div>

                      {/* ─── STEP 4: Official PDF Report (ONLY UNLOCKED WHEN RESULTS ARE READY) ─── */}
                      <div style={{ marginBottom: 10 }}>
                        {rank > 5 ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#ECFDF5', borderRadius: 8, border: '1px solid #A7F3D0', color: '#065F46', fontSize: 12.5, fontWeight: 700 }}>
                            <CheckCircle2 size={15} color="#059669" />
                            <span>4. Official Diagnostic PDF Report Uploaded</span>
                            {b.resultFileUrl && (
                              <button 
                                type="button" 
                                className="btn btn-ghost btn-sm" 
                                style={{ marginLeft: 'auto', padding: '2px 8px', fontSize: 11.5, color: '#059669', fontWeight: 700 }}
                                onClick={() => setPreviewDoc({ title: `Report: ${b.labTest?.name}`, url: b.resultFileUrl, type: 'pdf' })}
                              >
                                <Eye size={13} /> View PDF
                              </button>
                            )}
                          </div>
                        ) : (rank === 4 || rank === 5) ? (
                          <div style={{ background: '#FFFFFF', padding: '14px 16px', borderRadius: 10, border: '1.5px solid #10B981', boxShadow: '0 2px 6px rgba(16,185,129,0.1)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                              <div style={{ fontWeight: 800, color: '#065F46', fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 6 }}>
                                <FileText size={15} color="#059669" /> Step 4: Results Ready & Official Report PDF
                              </div>
                              {b.resultFileUrl && (
                                <span className="badge badge-approved" style={{ fontSize: 10.5 }}>✓ PDF Attached</span>
                              )}
                            </div>
                            <p style={{ fontSize: 12, color: '#64748B', margin: '0 0 10px 0' }}>
                              Test results are verified and ready. Attach and upload the official pathologist-signed diagnostic PDF report.
                            </p>

                            {/* PDF File Picker */}
                            {!isManual ? (
                              <div>
                                <input 
                                  type="file" 
                                  id={`file-pending-${b.id}`} 
                                  accept=".pdf,.jpg,.jpeg,.png,.docx" 
                                  style={{ display: 'none' }}
                                  onChange={(e) => handleFileSelect(b.id, e.target.files?.[0])}
                                />

                                <div 
                                  onClick={() => document.getElementById(`file-pending-${b.id}`)?.click()}
                                  style={{
                                    border: '2px dashed #10B981',
                                    borderRadius: 10,
                                    padding: '12px 14px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 12,
                                    background: currentFile ? '#ECFDF5' : '#F8FAF9',
                                    cursor: 'pointer',
                                    marginBottom: 8,
                                  }}
                                >
                                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    {currentFile ? <CheckCircle2 size={16} color="#059669" /> : <FileUp size={16} color="#059669" />}
                                  </div>
                                  <div style={{ overflow: 'hidden' }}>
                                    <div style={{ fontWeight: 700, fontSize: 13, color: currentFile ? '#064E3B' : '#0F172A', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                      {currentFile ? currentFile.name : 'Choose / Drag Official PDF Report'}
                                    </div>
                                    <div style={{ fontSize: 11, color: '#64748B' }}>
                                      {currentFile ? `${(currentFile.size / 1024).toFixed(1)} KB (Ready to upload)` : 'Pathologist-signed PDF format'}
                                    </div>
                                  </div>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                  <span style={{ fontSize: 11, color: '#64748B' }}>Uploads file & attaches to booking</span>
                                  <button 
                                    type="button" 
                                    className="btn btn-ghost btn-sm" 
                                    style={{ fontSize: 11, color: '#059669', padding: '2px 4px' }}
                                    onClick={() => setUseLinkMode(prev => ({ ...prev, [b.id]: true }))}
                                  >
                                    <LinkIcon size={11} /> Enter URL link instead
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div style={{ marginBottom: 10 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                  <label className="form-label" style={{ fontWeight: 700, margin: 0, fontSize: 11.5 }}>
                                    PDF Report URL Link:
                                  </label>
                                  <button 
                                    type="button" 
                                    className="btn btn-ghost btn-sm" 
                                    style={{ fontSize: 11, color: '#059669', padding: '2px 4px' }}
                                    onClick={() => setUseLinkMode(prev => ({ ...prev, [b.id]: false }))}
                                  >
                                    <FileUp size={11} /> Upload PDF file instead
                                  </button>
                                </div>
                                <input 
                                  className="input" 
                                  placeholder="https://res.cloudinary.com/healthbridge/report.pdf"
                                  value={currentManualUrl}
                                  onChange={e => setManualUrls({ ...manualUrls, [b.id]: e.target.value })}
                                />
                              </div>
                            )}

                            {/* Upload Action Button */}
                            <button 
                              className="btn btn-primary" 
                              style={{ width: '100%', background: '#059669', color: '#fff', padding: '10px 14px', fontWeight: 800 }}
                              onClick={() => handleUploadReport(b)}
                              disabled={uploadingId === b.id}
                            >
                              <Upload size={14} /> 
                              {uploadingId === b.id ? 'Uploading PDF Document...' : b.resultFileUrl ? 'Update & Replace Report PDF' : 'Upload PDF & Mark Results Ready'}
                            </button>

                            {/* If report is already uploaded, show Deliver to Patient button */}
                            {b.resultFileUrl && (
                              <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #E2E8F0' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                                  <span style={{ fontSize: 11.5, color: '#065F46', fontWeight: 600 }}>Report file attached successfully.</span>
                                  <button 
                                    type="button" 
                                    className="btn btn-ghost btn-sm" 
                                    style={{ color: '#059669', fontSize: 11.5, padding: '2px 6px' }}
                                    onClick={() => setPreviewDoc({ title: `Report: ${b.labTest?.name}`, url: b.resultFileUrl, type: 'pdf' })}
                                  >
                                    <Eye size={12} /> Preview PDF
                                  </button>
                                </div>
                                <button 
                                  className="btn btn-primary" 
                                  style={{ width: '100%', background: '#2563EB', color: '#fff', padding: '10px 14px', fontWeight: 800 }}
                                  onClick={() => handleStatusChange(b.id, 'ReportDelivered', `Report delivered to ${b.patientEmail} and mobile portal!`)}
                                >
                                  <Send size={15} /> Tick: Deliver Report to Patient (App & Email)
                                </button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#F8FAFC', borderRadius: 8, border: '1px solid #E2E8F0', color: '#94A3B8', fontSize: 12 }}>
                            <Lock size={13} /> 4. Official PDF Report (Unlocked when results are ready)
                          </div>
                        )}
                      </div>

                      {/* ─── STEP 5: Delivery & Order Completion ─── */}
                      <div>
                        {rank === 7 ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#ECFDF5', borderRadius: 8, border: '1px solid #A7F3D0', color: '#065F46', fontSize: 12.5, fontWeight: 700 }}>
                            <CheckCircle2 size={15} color="#059669" />
                            <span>5. Diagnostic Order Completed & Archived</span>
                            <span style={{ marginLeft: 'auto', fontSize: 11, color: '#047857', fontWeight: 600 }}>✓ Complete</span>
                          </div>
                        ) : rank === 6 ? (
                          <div style={{ background: '#FFFFFF', padding: '14px 16px', borderRadius: 10, border: '1.5px solid #047857', boxShadow: '0 2px 6px rgba(4,120,87,0.08)' }}>
                            <div style={{ fontWeight: 800, color: '#064E3B', fontSize: 13.5, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                              <Check size={16} color="#047857" /> Step 5: Finalize Diagnostic Order
                            </div>
                            <p style={{ fontSize: 12, color: '#64748B', margin: '0 0 12px 0' }}>
                              Report has been delivered to patient digital portal and emailed. Tick to finalize and close this test order.
                            </p>
                            <button 
                              className="btn btn-primary" 
                              style={{ width: '100%', background: '#047857', color: '#fff', padding: '11px 16px', fontWeight: 800, fontSize: 13 }}
                              onClick={() => handleStatusChange(b.id, 'Completed', 'Diagnostic order marked as Completed!')}
                            >
                              <Check size={16} /> Tick: Mark Order as Completed
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#F8FAFC', borderRadius: 8, border: '1px solid #E2E8F0', color: '#94A3B8', fontSize: 12 }}>
                            <Lock size={13} /> 5. Order Completion (Awaiting Report Delivery)
                          </div>
                        )}
                      </div>

                    </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Document Preview Modal */}
      {previewDoc && (
        <div className="modal-overlay" onClick={() => setPreviewDoc(null)}>
          <div className="modal" style={{ maxWidth: 750, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{previewDoc.title}</h3>
              <div className="flex gap-2 items-center">
                <a href={previewDoc.url} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">
                  <Download size={14} /> Open in New Tab
                </a>
                <button className="btn btn-ghost btn-sm" onClick={() => setPreviewDoc(null)}>
                  <X size={18} />
                </button>
              </div>
            </div>

            <div style={{ flex: 1, minHeight: 450, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC', borderRadius: 8, overflow: 'hidden' }}>
              {previewDoc.type === 'image' || previewDoc.url.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? (
                <img src={previewDoc.url} alt="Prescription" style={{ maxWidth: '100%', maxHeight: 500, objectFit: 'contain' }} />
              ) : (
                <iframe src={previewDoc.url} title="Document Preview" style={{ width: '100%', height: 500, border: 'none' }} />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Counter Payment Collection Modal */}
      {paymentModalBooking && (
        <div className="modal-overlay" onClick={() => !paymentSubmitting && setPaymentModalBooking(null)}>
          <div className="modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ background: '#EFF6FF', padding: 8, borderRadius: 10 }}>
                  <CreditCard size={20} color="#2563EB" />
                </div>
                <div>
                  <h3 className="modal-title" style={{ margin: 0, fontSize: 16 }}>Lab Counter Payment Collection</h3>
                  <div style={{ fontSize: 11.5, color: '#64748B' }}>Centralized Healthcare Payment Gateway &bull; On-Site Settlement</div>
                </div>
              </div>
              <button className="btn btn-ghost btn-sm" disabled={paymentSubmitting} onClick={() => setPaymentModalBooking(null)}>
                <X size={18} />
              </button>
            </div>

            {/* Test & Fee Summary */}
            <div style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)', color: '#fff', padding: '16px 18px', borderRadius: 12, marginBottom: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 15 }}>{paymentModalBooking.labTest?.name}</div>
                  <div style={{ fontSize: 12, opacity: 0.9, marginTop: 3 }}>
                    Patient: <strong>{paymentModalBooking.patientName}</strong> &bull; Token #{paymentModalBooking.queueToken || paymentModalBooking.id.substring(0, 6)}
                  </div>
                  <div style={{ fontSize: 11.5, opacity: 0.8, marginTop: 2 }}>
                    Scheduled: {paymentModalBooking.bookingDate} at {paymentModalBooking.timeSlot}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, opacity: 0.8, fontWeight: 600 }}>FEE DUE</div>
                  <div style={{ fontSize: 20, fontWeight: 900 }}>
                    LKR {(paymentModalBooking.labTest?.price || 0).toFixed(2)}
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="form-group" style={{ marginBottom: 14 }}>
              <label className="form-label" style={{ fontWeight: 700 }}>Select Payment Channel *</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <button
                  type="button"
                  className={`btn ${paymentMethod === 'CounterCash' ? 'btn-primary' : 'btn-outline'}`}
                  style={{ 
                    padding: '12px 14px', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    gap: 6,
                    background: paymentMethod === 'CounterCash' ? '#059669' : '#fff',
                    borderColor: paymentMethod === 'CounterCash' ? '#059669' : '#CBD5E1',
                    color: paymentMethod === 'CounterCash' ? '#fff' : '#0F172A'
                  }}
                  onClick={() => setPaymentMethod('CounterCash')}
                >
                  <DollarSign size={20} />
                  <span style={{ fontWeight: 700, fontSize: 13 }}>Cash at Desk</span>
                  <span style={{ fontSize: 10.5, opacity: 0.85 }}>Hospital Cash Register</span>
                </button>

                <button
                  type="button"
                  className={`btn ${paymentMethod === 'CounterPOS' ? 'btn-primary' : 'btn-outline'}`}
                  style={{ 
                    padding: '12px 14px', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    gap: 6,
                    background: paymentMethod === 'CounterPOS' ? '#2563EB' : '#fff',
                    borderColor: paymentMethod === 'CounterPOS' ? '#2563EB' : '#CBD5E1',
                    color: paymentMethod === 'CounterPOS' ? '#fff' : '#0F172A'
                  }}
                  onClick={() => setPaymentMethod('CounterPOS')}
                >
                  <CreditCard size={20} />
                  <span style={{ fontWeight: 700, fontSize: 13 }}>POS Terminal</span>
                  <span style={{ fontSize: 10.5, opacity: 0.85 }}>Swipe / Tap Debit / Credit</span>
                </button>
              </div>
            </div>

            {/* Notes / Reference */}
            <div className="form-group" style={{ marginBottom: 18 }}>
              <label className="form-label" style={{ fontWeight: 700 }}>Desk Reference / Notes (Optional)</label>
              <input
                className="input"
                placeholder={paymentMethod === 'CounterCash' ? 'e.g. Cash collected at Lab Phlebotomy Desk 1' : 'e.g. POS Transaction Slip / Terminal #'}
                value={paymentNotes}
                onChange={e => setPaymentNotes(e.target.value)}
              />
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button 
                className="btn btn-primary" 
                style={{ width: '100%', background: '#059669', padding: '12px 16px', fontWeight: 800, fontSize: 13.5 }}
                disabled={paymentSubmitting}
                onClick={() => handleRecordCounterPayment(true)}
              >
                {paymentSubmitting ? (
                  <span>Recording Settlement...</span>
                ) : (
                  <span>✓ Collect LKR {(paymentModalBooking.labTest?.price || 0).toFixed(2)} & Mark Specimen Collected</span>
                )}
              </button>

              <div style={{ display: 'flex', gap: 8 }}>
                <button 
                  className="btn btn-ghost" 
                  style={{ flex: 1 }} 
                  disabled={paymentSubmitting} 
                  onClick={() => setPaymentModalBooking(null)}
                >
                  Cancel
                </button>
                <button 
                  className="btn btn-outline" 
                  style={{ flex: 1.5, borderColor: '#2563EB', color: '#2563EB' }}
                  disabled={paymentSubmitting}
                  onClick={() => handleRecordCounterPayment(false)}
                >
                  Record Payment Only
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </LabLayout>
  );
}

