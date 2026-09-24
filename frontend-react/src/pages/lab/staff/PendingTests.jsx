import React, { useEffect, useState, useRef, useMemo } from 'react';
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
  const [bundlePayAll, setBundlePayAll] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState('CounterCash');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);

  const load = (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    getAllBookings('')
      .then(r => {
        const all = r.data || [];
        // Only active tests that are confirmed/approved or progressing through the laboratory pipeline
        const pendingQueue = all.filter(b => 
          b.status === 'Confirmed' ||
          b.status === 'SampleCollected' ||
          b.status === 'TestingInProgress' ||
          b.status === 'ResultVerification' ||
          b.status === 'ResultsReady' ||
          b.status === 'ReportDelivered'
        );
        setBookings(pendingQueue);
      })
      .catch(() => {})
      .finally(() => { if (showSpinner) setLoading(false); });
  };

  useEffect(() => { 
    load(true);
    const interval = setInterval(() => load(false), 4000);
    const handleUpdate = () => load(false);
    window.addEventListener('lab-booking-updated', handleUpdate);
    return () => {
      clearInterval(interval);
      window.removeEventListener('lab-booking-updated', handleUpdate);
    };
  }, []);

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

  const handleMarkAllCollected = async (items, patientName) => {
    try {
      for (const item of items) {
        await markCollected(item.id, TECHNICIAN_ID);
      }
      toast.success(`Specimen(s) marked as collected for ${patientName}!`);
      window.dispatchEvent(new Event('lab-booking-updated'));
      load();
    } catch {
      toast.error('Failed to update sample status for some tests');
    }
  };

  const handleAdvanceStatusForGroup = async (items, newStatus, message) => {
    try {
      for (const item of items) {
        await updateBookingStatus(item.id, newStatus);
      }
      toast.success(message || `Status updated to ${newStatus}`);
      window.dispatchEvent(new Event('lab-booking-updated'));
      load();
    } catch {
      toast.error('Failed to update status for some tests');
    }
  };

  const handleRecordCounterPayment = async (andMarkCollected = true) => {
    if (!paymentModalBooking) return;
    setPaymentSubmitting(true);
    try {
      const siblingsToPay = (bundlePayAll && paymentModalBooking._siblings) ? paymentModalBooking._siblings : [];
      const allToPay = [paymentModalBooking, ...siblingsToPay];

      for (const item of allToPay) {
        const itemPrice = item.labTest?.price || item.amountPaid || 0;
        await collectCounterPayment({
          bookingId: item.id,
          amount: itemPrice,
          paymentMethod,
          notes: paymentNotes.trim() || `Collected at Phlebotomy Counter (${paymentMethod === 'CounterCash' ? 'Cash' : 'POS Card'})`,
          collectedBy: 'Staff Phlebotomist'
        });

        if (andMarkCollected) {
          try {
            await markCollected(item.id, TECHNICIAN_ID);
          } catch (_) {}
        }
      }

      const totalCollected = allToPay.reduce((s, it) => s + Number(it.labTest?.price || it.amountPaid || 0), 0);
      if (andMarkCollected) {
        toast.success(`Payment of LKR ${totalCollected.toLocaleString()} recorded for ${allToPay.length} test(s) & specimen marked collected!`);
      } else {
        toast.success(`Payment of LKR ${totalCollected.toLocaleString()} recorded for ${allToPay.length} test(s)!`);
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

  const handleDelete = async (items, patientName) => {
    const list = Array.isArray(items) ? items : [{ id: items, patientName }];
    const confirmMsg = list.length > 1
      ? `Are you sure you want to permanently delete all ${list.length} bookings for ${patientName} in this appointment?`
      : `Are you sure you want to permanently delete the booking for ${patientName}?`;
    if (!window.confirm(confirmMsg)) return;
    try {
      for (const it of list) {
        await deleteBookingAdmin(it.id);
      }
      toast.success('Booking(s) deleted successfully');
      window.dispatchEvent(new Event('lab-booking-updated'));
      load();
    } catch {
      toast.error('Failed to delete booking');
    }
  };

  const handleFileSelect = (bookingId, file) => {
    if (file) {
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      if (!isPdf) {
        toast.error('Only PDF documents (.pdf) can be uploaded as test results.');
        return;
      }
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
    if (isManual) {
      const cleanUrl = manualUrl.trim().split('?')[0].toLowerCase();
      if (!cleanUrl.endsWith('.pdf')) {
        return toast.error('Report URL link must be a direct PDF document (.pdf)');
      }
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

  // Consolidated Multi-Test Appointments (Grouped during Intake/Payment, separated once sample collected)
  const consolidatedTests = useMemo(() => {
    const groups = new Map();
    const list = [];

    for (const b of filtered) {
      // Only group during intake / awaiting payment & sample collection stage
      const isIntake = getStageRank(b.status) === 1;

      if (isIntake) {
        const patientKey = b.patientEmail || b.patientId || b.patientName || 'patient';
        const groupKey = `intake_${b.bookingDate || 'no_date'}_${b.timeSlot || 'no_time'}_${patientKey}`;
        
        if (!groups.has(groupKey)) {
          const item = { primary: b, siblings: [b] };
          groups.set(groupKey, item);
          list.push(item);
        } else {
          groups.get(groupKey).siblings.push(b);
        }
      } else {
        // Once specimen is collected, each test separates into its own independent workflow card!
        list.push({ primary: b, siblings: [b] });
      }
    }

    return list.map(g => {
      const apptSiblings = bookings.filter(sb =>
        sb.id !== g.primary.id &&
        sb.bookingDate === g.primary.bookingDate &&
        sb.timeSlot === g.primary.timeSlot &&
        (sb.patientEmail === g.primary.patientEmail || (sb.patientId && sb.patientId === g.primary.patientId))
      );

      return {
        ...g.primary,
        _allBookings: g.siblings,
        _siblingBookings: g.siblings.filter(s => s.id !== g.primary.id),
        _isMultiTest: g.siblings.length > 1,
        _appointmentSiblings: apptSiblings,
      };
    });
  }, [filtered, bookings]);

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
      ) : consolidatedTests.length === 0 ? (
        <div className="card">
          <div className="empty-state animate-fade-in" style={{ padding: '40px 20px' }}>
            <img src={emptyImg} alt="No Pending Tests" style={{ width: 180, height: 180, objectFit: 'cover', borderRadius: 20, boxShadow: 'var(--shadow)' }} />
            <p style={{ fontSize: 18, fontWeight: 700, marginTop: 24, color: 'var(--primary-dark)' }}>No active tests in this stage</p>
            <p className="text-muted">All active diagnostic tests and specimen processing queues are clear.</p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {consolidatedTests.map((b, i) => {
            const allBookings = b._allBookings || [b];
            const isMultiTest = b._isMultiTest;
            const siblings = b._siblingBookings || [];

            const totalAppointmentPrice = allBookings.reduce((sum, item) => sum + Number(item.labTest?.price || item.amountPaid || 0), 0);
            const isPaid = allBookings.every(item => item.paymentStatus === 'PaidOnline' || item.paymentStatus === 'PaidAtCounter');
            const isPartiallyPaid = !isPaid && allBookings.some(item => item.paymentStatus === 'PaidOnline' || item.paymentStatus === 'PaidAtCounter');
            const isCounterChosen = allBookings.some(item => item.paymentMethod === 'CashOnArrival');
            const rank = Math.min(...allBookings.map(t => getStageRank(t.status)));

            let stageBadge = <span className="badge badge-confirmed">Confirmed &bull; Awaiting Sample</span>;
            if (rank === 2) stageBadge = <span className="badge badge-collected">🧪 Specimen Collected</span>;
            if (rank === 3) stageBadge = <span className="badge badge-pending">🔬 Testing Underway</span>;
            if (rank === 4) stageBadge = <span className="badge badge-pending">🔎 Result Verification</span>;
            if (rank === 5) stageBadge = <span className="badge badge-results">📄 Results Ready</span>;
            if (rank === 6) stageBadge = <span className="badge badge-approved">📬 Report Delivered</span>;
            if (rank === 7) stageBadge = <span className="badge badge-approved">✓ Completed</span>;
            if (allBookings.some(t => t.status.startsWith('Pending'))) stageBadge = <span className="badge badge-pending">⏳ Pending Approval</span>;

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
                  borderLeft: allBookings.every(t => t.status === 'ResultsReady' || t.status === 'Completed') 
                    ? '5px solid #10B981' 
                    : rank >= 2 ? '5px solid #F59E0B' : '5px solid #0D9488'
                }}
              >
                {/* Left Side: Test & Patient Info */}
                <div>
                  {isMultiTest ? (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '4px 10px',
                        borderRadius: 8,
                        background: '#F3E8FF',
                        border: '1px solid #D8B4FE',
                        color: '#6B21A8',
                        fontSize: 12,
                        fontWeight: 800,
                        marginBottom: 8
                      }}>
                        <Sparkles size={13} color="#7E22CE" />
                        <span>Combined Appointment ({allBookings.length} Diagnostic Tests)</span>
                      </div>

                      <div style={{ fontWeight: 800, fontSize: 16.5, color: '#064E3B', marginBottom: 10 }}>
                        {allBookings.map(t => t.labTest?.name).filter(Boolean).join(' + ')}
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {allBookings.map(t => (
                          <div key={t.id} style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px 12px',
                            backgroundColor: '#F8FAF9',
                            borderRadius: 8,
                            border: '1px solid #E2E8F0',
                            fontSize: 12.5
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#059669', flexShrink: 0 }} />
                              <div>
                                <strong style={{ color: '#064E3B' }}>{t.labTest?.name}</strong>
                                <div style={{ fontSize: 11, color: '#64748B' }}>
                                  {t.labTest?.sampleType || 'Specimen'} &bull; #{t.tokenNumber || t.queueToken || t.id.substring(0, 4)}
                                </div>
                              </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontWeight: 800, color: '#059669', fontSize: 12.5 }}>
                                LKR {Number(t.labTest?.price || 0).toLocaleString()}
                              </div>
                              <div style={{ fontSize: 10.5, color: '#64748B' }}>
                                {t.status}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div>
                      {b._appointmentSiblings && b._appointmentSiblings.length > 0 && (
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          padding: '3px 8px',
                          borderRadius: 6,
                          background: '#F3E8FF',
                          border: '1px solid #D8B4FE',
                          color: '#6B21A8',
                          fontSize: 11,
                          fontWeight: 700,
                          marginBottom: 6
                        }}>
                          <Sparkles size={11} color="#7E22CE" />
                          <span>Part of Appointment (with {b._appointmentSiblings.map(s => s.labTest?.name).filter(Boolean).join(', ')})</span>
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                        <div style={{ fontWeight: 800, fontSize: 17, color: '#064E3B' }}>
                          {b.labTest?.name}
                        </div>
                      </div>
                    </div>
                  )}

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
                    {isPaid ? (
                      <span className="badge" style={{ background: '#ECFDF5', color: '#065F46', border: '1px solid #A7F3D0', fontWeight: 700, fontSize: 11.5 }}>
                        💳 Paid (LKR {totalAppointmentPrice.toLocaleString()})
                      </span>
                    ) : isPartiallyPaid ? (
                      <span className="badge" style={{ background: '#FFFBEB', color: '#B45309', border: '1px solid #FDE68A', fontWeight: 700, fontSize: 11.5 }}>
                        ⚠️ Partial Payment (Total: LKR {totalAppointmentPrice.toLocaleString()})
                      </span>
                    ) : (
                      <span className="badge" style={{ background: '#FFFBEB', color: '#B45309', border: '1px solid #FDE68A', fontWeight: 700, fontSize: 11.5 }}>
                        ⚠️ Payment Due: LKR {totalAppointmentPrice.toLocaleString()} {isCounterChosen ? '• Counter Intent' : ''}
                      </span>
                    )}
                  </div>

                  {/* Document links */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {allBookings.filter(t => t.prescriptionImageUrl).map(t => (
                      <button 
                        key={t.id}
                        className="btn btn-ghost btn-sm"
                        style={{ justifyContent: 'flex-start', padding: 0, color: '#2563EB', fontSize: 12.5 }}
                        onClick={() => setPreviewDoc({ title: `Prescription: ${t.patientName} (${t.labTest?.name})`, url: t.prescriptionImageUrl, type: 'image' })}
                      >
                        <Eye size={13} /> View Prescription {isMultiTest ? `(${t.labTest?.name})` : ''}
                      </button>
                    ))}

                    {allBookings.filter(t => t.resultFileUrl).map(t => (
                      <button 
                        key={t.id}
                        className="btn btn-ghost btn-sm"
                        style={{ justifyContent: 'flex-start', padding: 0, color: '#059669', fontWeight: 700, fontSize: 12.5 }}
                        onClick={() => setPreviewDoc({ title: `Official Report: ${t.labTest?.name}`, url: t.resultFileUrl, type: 'pdf' })}
                      >
                        <FileText size={13} /> View Official Report {isMultiTest ? `(${t.labTest?.name})` : ''}
                      </button>
                    ))}
                  </div>

                  {/* Record Actions Toolbar */}
                  <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 11.5, color: '#64748B', fontWeight: 600 }}>
                      {isMultiTest ? `Bundle: ${allBookings.length} Tests Synchronized` : 'Diagnostic Stepper Enforced'}
                    </span>
                    <button 
                      className="btn btn-ghost btn-sm" 
                      style={{ color: '#EF4444', padding: '4px 8px', fontSize: 11.5, display: 'flex', alignItems: 'center', gap: 4 }}
                      onClick={() => handleDelete(allBookings, b.patientName)}
                      title="Permanently Delete Booking(s)"
                    >
                      <Trash2 size={13} /> Delete {isMultiTest ? 'Appointment' : ''}
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
                          <CheckCircle2 size={16} color="#059669" /> Clinical Workflow Checklist {isMultiTest ? `(${allBookings.length} Tests)` : ''}
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
                          <span>1. Specimen Collected & Barcode Accessioned {isMultiTest ? `(${allBookings.length} Tests)` : ''}</span>
                          <span style={{ marginLeft: 'auto', fontSize: 11, color: '#047857', fontWeight: 600 }}>✓ Done</span>
                        </div>
                      ) : rank === 1 ? (
                        <div style={{ background: '#FFFFFF', padding: '14px 16px', borderRadius: 10, border: '1.5px solid #059669', boxShadow: '0 2px 6px rgba(5,150,105,0.08)' }}>
                          <div style={{ fontWeight: 800, color: '#064E3B', fontSize: 13.5, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <FlaskConical size={15} color="#059669" /> Step 1: Patient Specimen Collection {isMultiTest ? `(${allBookings.length} Tests)` : ''}
                          </div>
                          <p style={{ fontSize: 12, color: '#64748B', margin: '0 0 10px 0' }}>
                            Patient is at phlebotomy counter. Verify identity, label specimen tube(s), and confirm payment settlement.
                          </p>

                          {isPaid ? (
                            <div>
                              <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', padding: '8px 12px', borderRadius: 8, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <CheckCircle size={14} color="#059669" />
                                <span style={{ fontSize: 11.5, color: '#065F46', fontWeight: 700 }}>
                                  Payment Cleared: LKR {totalAppointmentPrice.toLocaleString()} {isMultiTest ? `(${allBookings.length} Tests Settled)` : (b.receiptNumber ? `(${b.receiptNumber})` : '')}
                                </span>
                              </div>
                              <button 
                                className="btn btn-primary" 
                                style={{ width: '100%', background: '#059669', color: '#fff', padding: '10px 14px', fontWeight: 800 }}
                                onClick={() => handleMarkAllCollected(allBookings, b.patientName)}
                              >
                                <FlaskConical size={15} /> Tick: Mark {isMultiTest ? `All Specimens (${allBookings.length} Tests)` : 'Specimen'} as Collected
                              </button>
                            </div>
                          ) : (
                            <div>
                              <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', padding: '8px 12px', borderRadius: 8, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <AlertCircle size={14} color="#D97706" />
                                <span style={{ fontSize: 11.5, color: '#92400E', fontWeight: 700 }}>
                                  Payment Due: LKR {totalAppointmentPrice.toLocaleString()} {isCounterChosen ? '(Counter Pay Selected)' : ''}
                                </span>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <button 
                                  className="btn btn-primary" 
                                  style={{ width: '100%', background: '#2563EB', color: '#fff', padding: '9px 12px', fontWeight: 800 }}
                                  onClick={() => { 
                                    setPaymentModalBooking({
                                      ...b,
                                      _siblings: siblings
                                    }); 
                                    setBundlePayAll(true);
                                    setPaymentMethod('CounterCash'); 
                                    setPaymentNotes(''); 
                                  }}
                                >
                                  <CreditCard size={15} /> Collect Payment at Counter (Cash / POS) {isMultiTest ? `(All ${allBookings.length} Tests)` : ''}
                                </button>
                                <button 
                                  className="btn btn-outline btn-sm" 
                                  style={{ width: '100%', color: '#059669', borderColor: '#059669' }}
                                  onClick={() => handleMarkAllCollected(allBookings, b.patientName)}
                                  title="Bypass payment and collect samples"
                                >
                                  <FlaskConical size={13} /> Bypass & Mark {isMultiTest ? `All Specimens (${allBookings.length} Tests)` : 'Specimen'} Collected
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

                    {/* ─── STEP 2: Laboratory Analysis ─── */}
                    <div style={{ marginBottom: 10 }}>
                      {rank > 2 ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#ECFDF5', borderRadius: 8, border: '1px solid #A7F3D0', color: '#065F46', fontSize: 12.5, fontWeight: 700 }}>
                          <CheckCircle2 size={15} color="#059669" />
                          <span>2. Specimen In Analyzer & Diagnostic Assay Started {isMultiTest ? `(${allBookings.length} Tests)` : ''}</span>
                          <span style={{ marginLeft: 'auto', fontSize: 11, color: '#047857', fontWeight: 600 }}>✓ Done</span>
                        </div>
                      ) : rank === 2 ? (
                        <div style={{ background: '#FFFFFF', padding: '14px 16px', borderRadius: 10, border: '1.5px solid #0D9488', boxShadow: '0 2px 6px rgba(13,148,136,0.08)' }}>
                          <div style={{ fontWeight: 800, color: '#0F766E', fontSize: 13.5, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Microscope size={15} color="#0D9488" /> Step 2: Laboratory Analysis & Assay Run {isMultiTest ? `(${allBookings.length} Tests)` : ''}
                          </div>
                          <p style={{ fontSize: 12, color: '#64748B', margin: '0 0 12px 0' }}>
                            Specimens accessioned into laboratory. Place tubes into analyzer and tick to initiate diagnostic assays.
                          </p>
                          <button 
                            className="btn btn-primary" 
                            style={{ width: '100%', background: '#0D9488', color: '#fff', padding: '10px 14px', fontWeight: 800, fontSize: 13 }}
                            onClick={() => handleAdvanceStatusForGroup(allBookings, 'TestingInProgress', `Assays started for ${isMultiTest ? `all ${allBookings.length} tests` : b.patientName}!`)}
                          >
                            <Microscope size={15} /> Tick: Specimens in Analyzer & Start Assay {isMultiTest ? `(${allBookings.length} Tests)` : ''}
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#F8FAFC', borderRadius: 8, border: '1px solid #E2E8F0', color: '#94A3B8', fontSize: 12 }}>
                          <Lock size={13} /> 2. Laboratory Analysis (Awaiting Specimen)
                        </div>
                      )}
                    </div>

                    {/* ─── STEP 3: Result Verification ─── */}
                    <div style={{ marginBottom: 10 }}>
                      {rank > 3 ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#ECFDF5', borderRadius: 8, border: '1px solid #A7F3D0', color: '#065F46', fontSize: 12.5, fontWeight: 700 }}>
                          <CheckCircle2 size={15} color="#059669" />
                          <span>3. Diagnostic Assays Completed & Parameters Verified {isMultiTest ? `(${allBookings.length} Tests)` : ''}</span>
                          <span style={{ marginLeft: 'auto', fontSize: 11, color: '#047857', fontWeight: 600 }}>✓ Done</span>
                        </div>
                      ) : rank === 3 ? (
                        <div style={{ background: '#FFFFFF', padding: '14px 16px', borderRadius: 10, border: '1.5px solid #D97706', boxShadow: '0 2px 6px rgba(217,119,6,0.08)' }}>
                          <div style={{ fontWeight: 800, color: '#B45309', fontSize: 13.5, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <CheckSquare size={15} color="#D97706" /> Step 3: Clinical Assay Completion {isMultiTest ? `(${allBookings.length} Tests)` : ''}
                          </div>
                          <p style={{ fontSize: 12, color: '#64748B', margin: '0 0 12px 0' }}>
                            Analyzer diagnostic assays are running. Once physical runs finish and values are verified, tick to unlock official report upload.
                          </p>
                          <button 
                            className="btn btn-primary" 
                            style={{ width: '100%', background: '#D97706', color: '#fff', padding: '10px 14px', fontWeight: 800, fontSize: 13 }}
                            onClick={() => handleAdvanceStatusForGroup(allBookings, 'ResultVerification', `Assays completed for ${isMultiTest ? `all ${allBookings.length} tests` : b.patientName}! Ready for PDF report upload.`)}
                          >
                            <CheckSquare size={15} /> Tick: Assays Complete • Test Results Ready {isMultiTest ? `(${allBookings.length} Tests)` : ''}
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#F8FAFC', borderRadius: 8, border: '1px solid #E2E8F0', color: '#94A3B8', fontSize: 12 }}>
                          <Lock size={13} /> 3. Result Verification (Assays In Progress)
                        </div>
                      )}
                    </div>

                    {/* ─── STEP 4: Official PDF Report ─── */}
                    <div style={{ marginBottom: 10 }}>
                      {allBookings.every(t => getStageRank(t.status) > 5) ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#ECFDF5', borderRadius: 8, border: '1px solid #A7F3D0', color: '#065F46', fontSize: 12.5, fontWeight: 700 }}>
                          <CheckCircle2 size={15} color="#059669" />
                          <span>4. Official Diagnostic PDF Report(s) Uploaded ({allBookings.length} Tests)</span>
                          <span style={{ marginLeft: 'auto', fontSize: 11, color: '#047857', fontWeight: 600 }}>✓ Done</span>
                        </div>
                      ) : (rank === 4 || rank === 5) ? (
                        <div style={{ background: '#FFFFFF', padding: '14px 16px', borderRadius: 10, border: '1.5px solid #10B981', boxShadow: '0 2px 6px rgba(16,185,129,0.1)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                            <div style={{ fontWeight: 800, color: '#065F46', fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 6 }}>
                              <FileText size={15} color="#059669" /> Step 4: Upload Official Reports {isMultiTest ? `(${allBookings.length} Tests)` : ''}
                            </div>
                          </div>
                          <p style={{ fontSize: 12, color: '#64748B', margin: '0 0 10px 0' }}>
                            Attach and upload the official pathologist-signed diagnostic PDF report for each test in this appointment.
                          </p>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {allBookings.map(item => {
                              const itemFile = selectedFiles[item.id];
                              const itemManual = useLinkMode[item.id];
                              const itemManualUrl = manualUrls[item.id] !== undefined ? manualUrls[item.id] : (item.resultFileUrl || '');
                              const hasUploaded = Boolean(item.resultFileUrl);

                              return (
                                <div key={item.id} style={{
                                  padding: '10px 12px',
                                  borderRadius: 8,
                                  border: hasUploaded ? '1.5px solid #10B981' : '1px solid #CBD5E1',
                                  background: hasUploaded ? '#F0FDF4' : '#F8FAFC'
                                }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                    <strong style={{ fontSize: 13, color: '#064E3B' }}>{item.labTest?.name}</strong>
                                    {hasUploaded ? (
                                      <span className="badge badge-approved" style={{ fontSize: 10.5 }}>✓ Report Attached</span>
                                    ) : (
                                      <span className="badge badge-pending" style={{ fontSize: 10.5 }}>Pending PDF</span>
                                    )}
                                  </div>

                                  {!itemManual ? (
                                    <div>
                                      <input 
                                        type="file" 
                                        id={`file-pending-${item.id}`} 
                                        accept=".pdf,application/pdf" 
                                        style={{ display: 'none' }}
                                        onChange={(e) => handleFileSelect(item.id, e.target.files?.[0])}
                                      />
                                      <div 
                                        onClick={() => document.getElementById(`file-pending-${item.id}`)?.click()}
                                        style={{
                                          border: '1.5px dashed #10B981',
                                          borderRadius: 8,
                                          padding: '8px 12px',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: 10,
                                          background: itemFile ? '#ECFDF5' : '#FFFFFF',
                                          cursor: 'pointer',
                                          marginBottom: 6,
                                        }}
                                      >
                                        <FileUp size={15} color="#059669" />
                                        <span style={{ fontSize: 12, fontWeight: 600, color: itemFile ? '#064E3B' : '#64748B' }}>
                                          {itemFile ? itemFile.name : `Select PDF report for ${item.labTest?.name}`}
                                        </span>
                                      </div>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                        <span style={{ fontSize: 10.5, color: '#64748B' }}>Signed PDF format</span>
                                        <button 
                                          type="button" 
                                          className="btn btn-ghost btn-sm" 
                                          style={{ fontSize: 10.5, color: '#059669', padding: '1px 4px' }}
                                          onClick={() => setUseLinkMode(prev => ({ ...prev, [item.id]: true }))}
                                        >
                                          <LinkIcon size={10} /> Enter URL instead
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div style={{ marginBottom: 6 }}>
                                      <input 
                                        className="input" 
                                        style={{ fontSize: 12, padding: '6px 10px' }}
                                        placeholder="https://.../report.pdf"
                                        value={itemManualUrl}
                                        onChange={e => setManualUrls({ ...manualUrls, [item.id]: e.target.value })}
                                      />
                                      <div style={{ textAlign: 'right', marginTop: 4 }}>
                                        <button 
                                          type="button" 
                                          className="btn btn-ghost btn-sm" 
                                          style={{ fontSize: 10.5, color: '#059669', padding: '1px 4px' }}
                                          onClick={() => setUseLinkMode(prev => ({ ...prev, [item.id]: false }))}
                                        >
                                          <FileUp size={10} /> Upload file instead
                                        </button>
                                      </div>
                                    </div>
                                  )}

                                  <div style={{ display: 'flex', gap: 6 }}>
                                    <button 
                                      className="btn btn-primary btn-sm" 
                                      style={{ flex: 1, background: '#059669', color: '#fff', fontWeight: 700 }}
                                      onClick={() => handleUploadReport(item)}
                                      disabled={uploadingId === item.id}
                                    >
                                      <Upload size={13} /> {uploadingId === item.id ? 'Uploading...' : hasUploaded ? 'Replace PDF' : 'Upload Report PDF'}
                                    </button>
                                    {hasUploaded && (
                                      <button 
                                        type="button" 
                                        className="btn btn-ghost btn-sm" 
                                        style={{ color: '#059669', fontSize: 11.5 }}
                                        onClick={() => setPreviewDoc({ title: `Report: ${item.labTest?.name}`, url: item.resultFileUrl, type: 'pdf' })}
                                      >
                                        <Eye size={12} /> Preview
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {allBookings.some(t => t.resultFileUrl) && (
                            <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid #E2E8F0' }}>
                              <button 
                                className="btn btn-primary" 
                                style={{ width: '100%', background: '#2563EB', color: '#fff', padding: '10px 14px', fontWeight: 800 }}
                                onClick={() => handleAdvanceStatusForGroup(allBookings.filter(t => t.resultFileUrl), 'ReportDelivered', `Report(s) delivered to ${b.patientEmail} and digital portal!`)}
                              >
                                <Send size={15} /> Tick: Deliver Uploaded Report(s) to Patient
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
                          <span>5. Diagnostic Order Completed & Archived {isMultiTest ? `(${allBookings.length} Tests)` : ''}</span>
                          <span style={{ marginLeft: 'auto', fontSize: 11, color: '#047857', fontWeight: 600 }}>✓ Complete</span>
                        </div>
                      ) : rank === 6 ? (
                        <div style={{ background: '#FFFFFF', padding: '14px 16px', borderRadius: 10, border: '1.5px solid #047857', boxShadow: '0 2px 6px rgba(4,120,87,0.08)' }}>
                          <div style={{ fontWeight: 800, color: '#064E3B', fontSize: 13.5, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Check size={16} color="#047857" /> Step 5: Finalize Diagnostic Order {isMultiTest ? `(${allBookings.length} Tests)` : ''}
                          </div>
                          <p style={{ fontSize: 12, color: '#64748B', margin: '0 0 12px 0' }}>
                            Report(s) have been delivered to patient digital portal and emailed. Tick to finalize and close order.
                          </p>
                          <button 
                            className="btn btn-primary" 
                            style={{ width: '100%', background: '#047857', color: '#fff', padding: '11px 16px', fontWeight: 800, fontSize: 13 }}
                            onClick={() => handleAdvanceStatusForGroup(allBookings, 'Completed', `Diagnostic order completed for ${isMultiTest ? `all ${allBookings.length} tests` : b.patientName}!`)}
                          >
                            <Check size={16} /> Tick: Mark Order as Completed {isMultiTest ? `(${allBookings.length} Tests)` : ''}
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
            {(() => {
              const siblingTests = paymentModalBooking._siblings || [];
              const allTests = [paymentModalBooking, ...siblingTests];
              const combinedTotal = allTests.reduce((s, it) => s + Number(it.labTest?.price || it.amountPaid || 0), 0);
              const feeDue = bundlePayAll ? combinedTotal : Number(paymentModalBooking.labTest?.price || 0);

              return (
                <>
                  <div style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)', color: '#fff', padding: '16px 18px', borderRadius: 12, marginBottom: 18 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 15 }}>
                          {siblingTests.length > 0 && bundlePayAll
                            ? `Combined Appointment (${allTests.length} Tests)`
                            : paymentModalBooking.labTest?.name}
                        </div>
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
                          LKR {feeDue.toFixed(2)}
                        </div>
                      </div>
                    </div>

                    {siblingTests.length > 0 && (
                      <div style={{
                        marginTop: 12,
                        paddingTop: 10,
                        borderTop: '1px solid rgba(255,255,255,0.25)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 6
                      }}>
                        <div style={{ fontSize: 11.5, fontWeight: 700, opacity: 0.95 }}>
                          Diagnostic Tests in this Appointment:
                        </div>
                        {allTests.map((t, idx) => (
                          <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, opacity: 0.9 }}>
                            <span>&bull; {t.labTest?.name}</span>
                            <span style={{ fontWeight: 700 }}>LKR {Number(t.labTest?.price || 0).toFixed(2)}</span>
                          </div>
                        ))}

                        <label style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          marginTop: 6,
                          padding: '8px 10px',
                          background: 'rgba(255,255,255,0.15)',
                          borderRadius: 8,
                          cursor: 'pointer',
                          fontSize: 12,
                          fontWeight: 700
                        }}>
                          <input
                            type="checkbox"
                            checked={bundlePayAll}
                            onChange={e => setBundlePayAll(e.target.checked)}
                            style={{ cursor: 'pointer' }}
                          />
                          <span>Settle payment for all {allTests.length} tests together at counter</span>
                        </label>
                      </div>
                    )}
                  </div>

                  {/* Payment Method Selector */}
                  <div className="form-group" style={{ marginBottom: 20 }}>
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
                        <span>✓ Collect LKR {feeDue.toFixed(2)} & Mark Specimen Collected {bundlePayAll && siblingTests.length > 0 ? `(${allTests.length} Tests)` : ''}</span>
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
                </>
              );
            })()}
          </div>
        </div>
      )}
    </LabLayout>
  );
}

