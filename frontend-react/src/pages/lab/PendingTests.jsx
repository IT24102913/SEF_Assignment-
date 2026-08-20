import React, { useEffect, useState, useRef } from 'react';
import { 
  getAllBookings, 
  markCollected, 
  updateBookingStatus, 
  uploadResult, 
  uploadFile, 
  approveBooking, 
  rejectBooking, 
  deleteBookingAdmin 
} from '../../api/labApi';
import LabLayout from '../../components/LabLayout';
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
  Edit3
} from 'lucide-react';
import emptyImg from '../../assets/lab_empty_microscope.jpg';

const TECHNICIAN_ID = '00000000-0000-0000-0000-000000000001';

const ALL_STATUSES = [
  'PendingLabApproval',
  'Confirmed',
  'SampleCollected',
  'TestingInProgress',
  'ResultVerification',
  'ResultsReady',
  'ReportDelivered',
  'Completed',
  'Rejected',
  'Cancelled'
];

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
  
  // Reject Modal
  const [rejectModalBooking, setRejectModalBooking] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

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

  const handleApprove = async (b) => {
    try {
      await approveBooking(b.id, TECHNICIAN_ID, 'Approved by Laboratory Technician');
      toast.success(`Booking approved! Confirmation email sent to ${b.patientEmail}`);
      load();
    } catch {
      toast.error('Failed to approve booking');
    }
  };

  const handleRejectSubmit = async () => {
    if (!rejectReason.trim()) return toast.error('Please enter a rejection reason');
    try {
      await rejectBooking(rejectModalBooking.id, TECHNICIAN_ID, rejectReason.trim());
      toast.success(`Booking rejected & notification sent to ${rejectModalBooking.patientEmail}`);
      setRejectModalBooking(null);
      setRejectReason('');
      load();
    } catch {
      toast.error('Failed to reject booking');
    }
  };

  const handleMarkCollected = async (id, patientName) => {
    try {
      await markCollected(id, TECHNICIAN_ID);
      toast.success(`Specimen marked as collected for ${patientName}!`);
      load();
    } catch {
      toast.error('Failed to update sample status');
    }
  };

  const handleStatusChange = async (id, newStatus, message) => {
    try {
      await updateBookingStatus(id, newStatus);
      toast.success(message || `Status updated to ${newStatus}`);
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

                  {/* Manual Status Override & Delete Toolbar */}
                  <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11.5, color: '#64748B', fontWeight: 600 }}>Override Status:</span>
                    <select 
                      className="select" 
                      style={{ fontSize: 11.5, padding: '3px 8px', height: 28, width: 140 }}
                      value={b.status}
                      onChange={(e) => handleStatusChange(b.id, e.target.value, `Status overridden to ${e.target.value}`)}
                    >
                      {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>

                    <button 
                      className="btn btn-ghost btn-sm" 
                      style={{ color: '#EF4444', padding: '4px 6px', marginLeft: 'auto' }}
                      onClick={() => handleDelete(b.id, b.patientName)}
                      title="Permanently Delete Booking"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Right Side: Step Action & PDF Upload Controls */}
                <div style={{ background: '#F8FAF9', padding: '18px 20px', borderRadius: 14, border: '1px solid #E2E8F0', width: '100%' }}>
                  
                  {/* Action Case 0: Pending Approval -> Accept / Reject */}
                  {b.status.startsWith('Pending') && (
                    <div>
                      <div style={{ fontWeight: 700, color: '#064E3B', marginBottom: 6, fontSize: 14 }}>
                        Action: Prescription & Booking Verification
                      </div>
                      <p className="text-muted text-sm" style={{ margin: '0 0 14px 0' }}>
                        Patient requested this test. Verify prescription and approve slot.
                      </p>
                      <div className="flex gap-2">
                        <button 
                          className="btn btn-primary" 
                          style={{ flex: 2, background: '#059669', color: '#fff' }}
                          onClick={() => handleApprove(b)}
                        >
                          <CheckCircle size={15} /> Accept & Confirm Booking
                        </button>
                        <button 
                          className="btn btn-ghost" 
                          style={{ flex: 1, color: '#EF4444' }}
                          onClick={() => { setRejectModalBooking(b); setRejectReason(''); }}
                        >
                          <XCircle size={15} /> Reject
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Action Case 1: Confirmed -> Mark Sample Collected */}
                  {b.status === 'Confirmed' && (
                    <div>
                      <div style={{ fontWeight: 700, color: '#064E3B', marginBottom: 6, fontSize: 14 }}>
                        Step 1: Patient Specimen Collection
                      </div>
                      <p className="text-muted text-sm" style={{ margin: '0 0 14px 0' }}>
                        Patient is at the clinic. Verify identity, label the specimen tube, and mark as collected.
                      </p>
                      <button 
                        className="btn btn-primary" 
                        style={{ width: '100%', background: '#059669', color: '#fff' }}
                        onClick={() => handleMarkCollected(b.id, b.patientName)}
                      >
                        <FlaskConical size={16} /> Mark Specimen as Collected
                      </button>
                    </div>
                  )}

                  {/* Action Case 2: SampleCollected -> Start Testing or Upload PDF */}
                  {b.status === 'SampleCollected' && (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <div style={{ fontWeight: 700, color: '#064E3B', fontSize: 14 }}>
                          Step 2: Laboratory Analysis
                        </div>
                        <button 
                          className="btn btn-outline btn-sm"
                          onClick={() => handleStatusChange(b.id, 'TestingInProgress', 'Laboratory analysis underway!')}
                        >
                          <Microscope size={14} /> Start Analysis
                        </button>
                      </div>
                      
                      <div style={{ marginTop: 12, borderTop: '1px solid #E2E8F0', paddingTop: 12 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, color: '#0F172A', marginBottom: 8 }}>
                          Or upload completed PDF report directly:
                        </div>
                        
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
                            background: currentFile ? '#ECFDF5' : '#FFFFFF',
                            cursor: 'pointer',
                            marginBottom: 10,
                          }}
                        >
                          <FileUp size={20} color="#059669" />
                          <div style={{ overflow: 'hidden' }}>
                            <div style={{ fontWeight: 700, fontSize: 13, color: currentFile ? '#064E3B' : '#0F172A', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                              {currentFile ? currentFile.name : 'Select / Drag PDF Test Report'}
                            </div>
                            <div style={{ fontSize: 11, color: '#64748B' }}>
                              {currentFile ? `${(currentFile.size / 1024).toFixed(1)} KB (Ready to upload)` : 'PDF document format'}
                            </div>
                          </div>
                        </div>

                        {currentFile && (
                          <button 
                            className="btn btn-primary btn-sm" 
                            style={{ width: '100%', background: '#059669', color: '#fff' }}
                            onClick={() => handleUploadReport(b)}
                            disabled={uploadingId === b.id}
                          >
                            <Upload size={14} /> {uploadingId === b.id ? 'Uploading...' : 'Upload PDF & Mark Results Ready'}
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Action Case 3: TestingInProgress / ResultVerification / ResultsReady / ReportDelivered */}
                  {(b.status === 'TestingInProgress' || b.status === 'ResultVerification' || b.status === 'ResultsReady' || b.status === 'ReportDelivered') && (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <div style={{ fontWeight: 700, color: '#064E3B', fontSize: 14 }}>
                          {b.status === 'ResultsReady' 
                            ? 'Step 4: Report Delivery' 
                            : b.status === 'ReportDelivered'
                            ? 'Step 5: Completion'
                            : 'Step 3: Upload Official PDF Report'}
                        </div>
                        {b.status === 'ResultsReady' && (
                          <span className="badge badge-approved">✓ Report Attached</span>
                        )}
                      </div>

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
                              padding: '14px 16px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 12,
                              background: currentFile ? '#ECFDF5' : '#FFFFFF',
                              cursor: 'pointer',
                              marginBottom: 10,
                            }}
                          >
                            <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              {currentFile ? <CheckCircle2 size={18} color="#059669" /> : <FileUp size={18} color="#059669" />}
                            </div>
                            <div style={{ overflow: 'hidden' }}>
                              <div style={{ fontWeight: 700, fontSize: 13.5, color: currentFile ? '#064E3B' : '#0F172A', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                {currentFile ? currentFile.name : 'Click to choose PDF report file'}
                              </div>
                              <div style={{ fontSize: 11.5, color: '#64748B' }}>
                                {currentFile ? `${(currentFile.size / 1024).toFixed(1)} KB (Ready)` : 'PDF, JPG, PNG format'}
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                            <span className="text-muted text-sm">Uploads to server & emails patient</span>
                            <button 
                              type="button" 
                              className="btn btn-ghost btn-sm" 
                              style={{ fontSize: 11, color: '#059669', padding: '2px 4px' }}
                              onClick={() => setUseLinkMode(prev => ({ ...prev, [b.id]: true }))}
                            >
                              <LinkIcon size={11} /> Enter link
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ marginBottom: 10 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                            <label className="form-label" style={{ fontWeight: 700, margin: 0, fontSize: 12 }}>
                              PDF Report URL Link:
                            </label>
                            <button 
                              type="button" 
                              className="btn btn-ghost btn-sm" 
                              style={{ fontSize: 11, color: '#059669', padding: '2px 4px' }}
                              onClick={() => setUseLinkMode(prev => ({ ...prev, [b.id]: false }))}
                            >
                              <FileUp size={11} /> Upload PDF instead
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

                      <div className="flex gap-2">
                        <button 
                          className="btn btn-primary" 
                          style={{ flex: 1.5, background: '#059669', color: '#fff' }}
                          onClick={() => handleUploadReport(b)}
                          disabled={uploadingId === b.id}
                        >
                          <Upload size={15} /> 
                          {uploadingId === b.id ? 'Uploading PDF...' : b.status === 'ResultsReady' ? 'Update & Re-send PDF' : 'Upload PDF & Notify Patient'}
                        </button>

                        {b.status === 'ResultsReady' && (
                          <button 
                            className="btn btn-outline" 
                            style={{ flex: 1 }}
                            onClick={() => handleStatusChange(b.id, 'ReportDelivered', `Report delivered to ${b.patientEmail}`)}
                          >
                            <Send size={14} /> Deliver
                          </button>
                        )}

                        {b.status === 'ReportDelivered' && (
                          <button 
                            className="btn btn-primary" 
                            style={{ flex: 1, background: '#047857', color: '#fff' }}
                            onClick={() => handleStatusChange(b.id, 'Completed', `Booking marked as Completed!`)}
                          >
                            <Check size={14} /> Complete
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reject Booking Modal */}
      {rejectModalBooking && (
        <div className="modal-overlay" onClick={() => setRejectModalBooking(null)}>
          <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Reject Lab Booking</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setRejectModalBooking(null)}>
                <X size={18} />
              </button>
            </div>

            <div style={{ marginBottom: 16 }}>
              <p className="text-muted" style={{ margin: '0 0 6px 0' }}>
                Test: <strong style={{ color: '#064E3B' }}>{rejectModalBooking.labTest?.name}</strong>
              </p>
              <p className="text-muted" style={{ margin: 0 }}>
                Patient: <strong>{rejectModalBooking.patientName}</strong> ({rejectModalBooking.patientEmail})
              </p>
            </div>

            <div className="form-group">
              <label className="form-label">Reason for Rejection *</label>
              <textarea 
                className="input" 
                rows={3} 
                placeholder="e.g. Prescription illegible, test not clinically indicated, or patient ineligible."
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                autoFocus
              />
            </div>

            <div className="flex gap-2" style={{ marginTop: 20 }}>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setRejectModalBooking(null)}>
                Cancel
              </button>
              <button className="btn btn-danger" style={{ flex: 1 }} onClick={handleRejectSubmit}>
                Confirm Rejection
              </button>
            </div>
          </div>
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
    </LabLayout>
  );
}
