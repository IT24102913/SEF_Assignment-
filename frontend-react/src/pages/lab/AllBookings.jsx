import { useEffect, useState, useRef } from 'react';
import { getAllBookings, markCollected, updateBookingStatus, deleteBookingAdmin, approveBooking, uploadResult, uploadFile } from '../../api/labApi';
import LabLayout from '../../components/LabLayout';
import toast from 'react-hot-toast';
import { FlaskConical, Search, RefreshCw, Microscope, FileText, Send, Check, Trash2, CheckCircle, Upload, X, FileUp, CheckCircle2, Link as LinkIcon } from 'lucide-react';
import emptyImg from '../../assets/lab_empty_microscope.jpg';

const TECHNICIAN_ID = '00000000-0000-0000-0000-000000000001';

const STATUS_OPTIONS = ['', 'PendingPrescriptionUpload', 'PendingAIVerification', 'PendingLabApproval', 'Confirmed', 'SampleCollected', 'TestingInProgress', 'ResultVerification', 'ResultsReady', 'ReportDelivered', 'Completed', 'Rejected', 'Cancelled'];

function StatusBadge({ status }) {
  const map = {
    PendingPrescriptionUpload: ['badge-pending', '📎 Pending Prescription'],
    PendingAIVerification: ['badge-pending', '🤖 AI Verifying'],
    PendingLabApproval: ['badge-pending', '⏳ Pending Approval'],
    Confirmed: ['badge-confirmed', '✅ Confirmed'],
    Rejected: ['badge-rejected', '❌ Rejected'],
    SampleCollected: ['badge-collected', '🧪 Sample Collected'],
    TestingInProgress: ['badge-pending', '🔬 Testing in Progress'],
    ResultVerification: ['badge-pending', '🔎 Result Verification'],
    ResultsReady: ['badge-results', '📄 Results Ready'],
    ReportDelivered: ['badge-approved', '📬 Report Delivered'],
    Completed: ['badge-approved', '✓ Completed'],
    Cancelled: ['badge-rejected', '✗ Cancelled'],
  };
  const [cls, label] = map[status] || ['badge-pending', status];
  return <span className={`badge ${cls}`}>{label}</span>;
}

export default function AllBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  
  // Upload Result Modal state
  const [uploadModalBooking, setUploadModalBooking] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [manualUrl, setManualUrl] = useState('');
  const [useManualUrl, setUseManualUrl] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const load = (status = '') => {
    setLoading(true);
    getAllBookings(status)
      .then(r => { setBookings(r.data || []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(statusFilter); }, [statusFilter]);

  const handleApprove = async (b) => {
    try {
      await approveBooking(b.id, TECHNICIAN_ID, '');
      toast.success(`Booking approved! Confirmation email sent to ${b.patientEmail}`);
      load(statusFilter);
    } catch { 
      toast.error('Failed to approve booking'); 
    }
  };

  const handleCollected = async (id) => {
    try {
      await markCollected(id, TECHNICIAN_ID);
      toast.success('Sample marked as collected!');
      load(statusFilter);
    } catch { toast.error('Failed to update status'); }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await updateBookingStatus(id, newStatus);
      toast.success(`Status updated to ${newStatus}`);
      load(statusFilter);
    } catch { toast.error('Failed to update status'); }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUploadResultSubmit = async () => {
    if (!useManualUrl && !selectedFile && !manualUrl) {
      return toast.error('Please select a PDF report file to upload');
    }
    if (useManualUrl && !manualUrl.trim()) {
      return toast.error('Please enter a result file URL');
    }

    setIsUploading(true);
    try {
      let finalFileUrl = manualUrl.trim();

      if (!useManualUrl && selectedFile) {
        toast.loading('Uploading PDF document to server...', { id: 'uploading-pdf' });
        const res = await uploadFile(selectedFile);
        finalFileUrl = res.data.fileUrl;
        toast.dismiss('uploading-pdf');
      }

      await uploadResult(uploadModalBooking.id, TECHNICIAN_ID, finalFileUrl);
      toast.success(`Results uploaded & email notification delivered to ${uploadModalBooking.patientEmail}!`);
      setUploadModalBooking(null);
      setSelectedFile(null);
      setManualUrl('');
      load(statusFilter);
    } catch (err) {
      toast.dismiss('uploading-pdf');
      toast.error('Failed to upload report: ' + (err.response?.data?.message || err.message));
    } finally {
      setIsUploading(false);
    }
  };

  const filtered = bookings.filter(b =>
    b.patientName?.toLowerCase().includes(search.toLowerCase()) ||
    b.labTest?.name?.toLowerCase().includes(search.toLowerCase())
  );

  const renderNextActionButton = (b) => {
    switch (b.status) {
      case 'PendingLabApproval':
      case 'PendingAIVerification':
      case 'PendingPrescriptionUpload':
        return (
          <button className="btn btn-success btn-sm" onClick={() => handleApprove(b)} title="Approve & Confirm this Booking">
            <CheckCircle size={14} /> Accept & Confirm
          </button>
        );
      case 'Confirmed':
        return (
          <button className="btn btn-primary btn-sm" onClick={() => handleCollected(b.id)}>
            <FlaskConical size={14} /> Mark Collected
          </button>
        );
      case 'SampleCollected':
        return (
          <div className="flex gap-1">
            <button className="btn btn-primary btn-sm" onClick={() => handleStatusChange(b.id, 'TestingInProgress')}>
              <Microscope size={14} /> Testing
            </button>
            <button 
              className="btn btn-outline btn-sm" 
              onClick={() => { 
                setUploadModalBooking(b); 
                setSelectedFile(null); 
                setManualUrl(b.resultFileUrl || ''); 
                setUseManualUrl(false);
              }} 
              title="Upload test report PDF"
            >
              <Upload size={14} /> Upload PDF
            </button>
          </div>
        );
      case 'TestingInProgress':
        return (
          <div className="flex gap-1">
            <button 
              className="btn btn-primary btn-sm" 
              onClick={() => { 
                setUploadModalBooking(b); 
                setSelectedFile(null); 
                setManualUrl(b.resultFileUrl || ''); 
                setUseManualUrl(false);
              }} 
              style={{ background: '#059669', color: '#fff' }}
            >
              <Upload size={14} /> Upload PDF Report
            </button>
          </div>
        );
      case 'ResultsReady':
        return (
          <div className="flex gap-1">
            <button 
              className="btn btn-outline btn-sm" 
              onClick={() => { 
                setUploadModalBooking(b); 
                setSelectedFile(null); 
                setManualUrl(b.resultFileUrl || ''); 
                setUseManualUrl(false);
              }} 
              title="Update Result PDF"
            >
              <Upload size={13} /> Update PDF
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => handleStatusChange(b.id, 'ReportDelivered')}>
              <Send size={14} /> Deliver Report
            </button>
          </div>
        );
      case 'ReportDelivered':
        return (
          <button className="btn btn-primary btn-sm" onClick={() => handleStatusChange(b.id, 'Completed')}>
            <Check size={14} /> Complete
          </button>
        );
      default:
        return null;
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to completely delete this booking?')) return;
    try {
      await deleteBookingAdmin(id);
      toast.success('Booking deleted successfully');
      load(statusFilter);
    } catch { toast.error('Failed to delete booking'); }
  };

  return (
    <LabLayout>
      <div className="page-header">
        <h1 className="page-title">All Lab Bookings</h1>
        <p className="page-subtitle">Complete booking lifecycle, prescription verification, specimen collection, and report delivery</p>
      </div>

      <div className="card animate-slide-up">
        <div className="flex gap-3" style={{ marginBottom: 20 }}>
          <div className="search-bar">
            <Search size={16} />
            <input className="input" placeholder="Search by patient or test name..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="select" style={{ width: 220 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            {STATUS_OPTIONS.filter(Boolean).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {loading ? <div className="spinner" /> : filtered.length === 0 ? (
          <div className="empty-state animate-fade-in" style={{ padding: '40px 20px' }}>
            <img src={emptyImg} alt="No bookings" style={{ width: 180, height: 180, objectFit: 'cover', borderRadius: 20, boxShadow: 'var(--shadow)' }} />
            <p style={{ fontSize: 18, fontWeight: 600, marginTop: 24, color: 'var(--primary-dark)' }}>No bookings found.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Test</th>
                  <th>Date & Time</th>
                  <th>Status</th>
                  <th>Booked On</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((b, i) => (
                  <tr key={b.id} className="hover-lift animate-fade-in" style={{ animationDelay: `${i * 40}ms`, animationFillMode: 'both' }}>
                    <td>
                      <div style={{ fontWeight: 600, color: '#0F172A' }}>{b.patientName}</div>
                      <div className="text-muted text-sm">{b.patientEmail}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#064E3B' }}>{b.labTest?.name}</div>
                      <span className="text-muted" style={{ fontSize: 12 }}>{b.labTest?.category}</span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{b.bookingDate}</div>
                      <div className="text-muted text-sm">{b.timeSlot}</div>
                    </td>
                    <td><StatusBadge status={b.status} /></td>
                    <td className="text-muted text-sm">{new Date(b.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div className="flex gap-2 items-center">
                        {renderNextActionButton(b)}
                        <button className="btn btn-ghost btn-sm" style={{ color: '#ef4444' }} onClick={() => handleDelete(b.id)} title="Delete Booking">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* PDF Report Upload Modal */}
      {uploadModalBooking && (
        <div className="modal-overlay" onClick={() => setUploadModalBooking(null)}>
          <div className="modal" style={{ maxWidth: 540 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Upload Diagnostic Test Report</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setUploadModalBooking(null)}>
                <X size={18} />
              </button>
            </div>
            
            <div style={{ marginBottom: 18, background: '#F0FDF4', padding: '12px 16px', borderRadius: 10, border: '1px solid #D1FAE5' }}>
              <div style={{ fontWeight: 700, color: '#064E3B', fontSize: 15 }}>
                {uploadModalBooking.labTest?.name}
              </div>
              <div style={{ color: '#64748B', fontSize: 13, marginTop: 3 }}>
                Patient: <strong style={{ color: '#0F172A' }}>{uploadModalBooking.patientName}</strong> &bull; {uploadModalBooking.patientEmail}
              </div>
            </div>

            {!useManualUrl ? (
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>
                  Select PDF / Document Report File *
                </label>
                
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".pdf,.jpg,.jpeg,.png,.docx"
                  style={{ display: 'none' }}
                />

                <div 
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: '2px dashed #10B981',
                    borderRadius: 14,
                    padding: '28px 20px',
                    textAlign: 'center',
                    background: selectedFile ? '#ECFDF5' : '#F6FAF7',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  className="hover-lift"
                >
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#D1FAE5', margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {selectedFile ? <CheckCircle2 size={26} color="#059669" /> : <FileUp size={24} color="#059669" />}
                  </div>

                  {selectedFile ? (
                    <div>
                      <div style={{ fontWeight: 700, color: '#064E3B', fontSize: 15 }}>
                        {selectedFile.name}
                      </div>
                      <div style={{ color: '#059669', fontSize: 12.5, marginTop: 4 }}>
                        {(selectedFile.size / 1024).toFixed(1)} KB &bull; Ready to upload
                      </div>
                      <div style={{ color: '#64748B', fontSize: 12, marginTop: 6 }}>
                        Click to choose a different PDF file
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontWeight: 700, color: '#0F172A', fontSize: 14.5 }}>
                        Click or drag PDF report here
                      </div>
                      <div style={{ color: '#64748B', fontSize: 12.5, marginTop: 4 }}>
                        Supports PDF, PNG, JPG documents up to 25MB
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                  <span className="text-muted text-sm">
                    Submitting automatically emails the patient.
                  </span>
                  <button 
                    type="button"
                    className="btn btn-ghost btn-sm" 
                    onClick={() => setUseManualUrl(true)}
                    style={{ fontSize: 12, color: '#059669' }}
                  >
                    <LinkIcon size={12} /> Or enter URL link
                  </button>
                </div>
              </div>
            ) : (
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label className="form-label" style={{ fontWeight: 700, margin: 0 }}>
                    Report URL Link (e.g. Cloudinary / S3) *
                  </label>
                  <button 
                    type="button"
                    className="btn btn-ghost btn-sm" 
                    onClick={() => setUseManualUrl(false)}
                    style={{ fontSize: 12, color: '#059669' }}
                  >
                    <FileUp size={12} /> Upload PDF file instead
                  </button>
                </div>
                <input
                  className="input"
                  placeholder="https://res.cloudinary.com/healthbridge/report.pdf"
                  value={manualUrl}
                  onChange={e => setManualUrl(e.target.value)}
                  autoFocus
                />
              </div>
            )}

            <div className="flex gap-2" style={{ marginTop: 24 }}>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setUploadModalBooking(null)}>
                Cancel
              </button>
              <button 
                className="btn btn-primary" 
                style={{ flex: 1.5, background: '#059669', color: '#fff' }} 
                onClick={handleUploadResultSubmit}
                disabled={isUploading}
              >
                <Upload size={16} /> {isUploading ? 'Uploading PDF...' : 'Upload & Notify Patient'}
              </button>
            </div>
          </div>
        </div>
      )}
    </LabLayout>
  );
}
