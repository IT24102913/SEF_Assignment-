import { useEffect, useState, useRef } from 'react';
import { getAllBookings, uploadResult, updateBookingStatus, uploadFile } from '../../api/labApi';
import LabLayout from '../../components/LabLayout';
import toast from 'react-hot-toast';
import { Upload, TestTube, FileText, CheckCircle2, Search, Microscope, Send, FileUp, Link as LinkIcon, Check } from 'lucide-react';
import emptyImg from '../../assets/lab_empty_microscope.jpg';

const TECHNICIAN_ID = '00000000-0000-0000-0000-000000000001';

export default function UploadResults() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFiles, setSelectedFiles] = useState({}); // bookingId -> File
  const [manualUrls, setManualUrls] = useState({}); // bookingId -> string
  const [useLinkMode, setUseLinkMode] = useState({}); // bookingId -> boolean
  const [tabFilter, setTabFilter] = useState('ALL'); // 'ALL' | 'SampleCollected' | 'TestingInProgress' | 'ResultsReady'
  const [search, setSearch] = useState('');
  const [uploadingId, setUploadingId] = useState(null);

  const load = () => {
    setLoading(true);
    getAllBookings('')
      .then(r => { 
        const all = r.data || [];
        const relevant = all.filter(b => 
          b.status === 'SampleCollected' || 
          b.status === 'TestingInProgress' || 
          b.status === 'ResultsReady'
        );
        setBookings(relevant); 
        setLoading(false); 
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleFileSelect = (bookingId, file) => {
    if (file) {
      setSelectedFiles(prev => ({ ...prev, [bookingId]: file }));
    }
  };

  const handleUploadSubmit = async (b) => {
    const isManual = useLinkMode[b.id];
    const file = selectedFiles[b.id];
    const url = manualUrls[b.id] || b.resultFileUrl || '';

    if (!isManual && !file && !url) {
      return toast.error('Please choose a PDF report file to upload');
    }
    if (isManual && !url.trim()) {
      return toast.error('Please enter a result file URL link');
    }

    setUploadingId(b.id);
    try {
      let finalFileUrl = url.trim();

      if (!isManual && file) {
        toast.loading('Uploading PDF file...', { id: `upload-${b.id}` });
        const uploadRes = await uploadFile(file);
        finalFileUrl = uploadRes.data.fileUrl;
        toast.dismiss(`upload-${b.id}`);
      }

      await uploadResult(b.id, TECHNICIAN_ID, finalFileUrl);
      toast.success(`Results uploaded & email sent to ${b.patientEmail}!`);
      setSelectedFiles(prev => { const n = { ...prev }; delete n[b.id]; return n; });
      load();
    } catch (err) { 
      toast.dismiss(`upload-${b.id}`);
      toast.error('Failed to upload result: ' + (err.response?.data?.message || err.message)); 
    } finally {
      setUploadingId(null);
    }
  };

  const handleDeliverReport = async (id, patientEmail) => {
    try {
      await updateBookingStatus(id, 'ReportDelivered');
      toast.success(`Report marked as Delivered to ${patientEmail}`);
      load();
    } catch {
      toast.error('Failed to update status');
    }
  };

  const filtered = bookings.filter(b => {
    const matchesTab = tabFilter === 'ALL' || b.status === tabFilter;
    const matchesSearch = 
      b.patientName?.toLowerCase().includes(search.toLowerCase()) ||
      b.labTest?.name?.toLowerCase().includes(search.toLowerCase()) ||
      b.patientEmail?.toLowerCase().includes(search.toLowerCase());
    return matchesTab && matchesSearch;
  });

  return (
    <LabLayout>
      <div className="page-header">
        <h1 className="page-title">Diagnostic Results & PDF Reports</h1>
        <p className="page-subtitle">Upload official lab outcome documents (PDF) and deliver notifications to patients</p>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="card animate-slide-up" style={{ marginBottom: 20, padding: '16px 22px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
          <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
            {[
              { key: 'ALL', label: 'All In-Progress' },
              { key: 'SampleCollected', label: '🧪 Sample Collected' },
              { key: 'TestingInProgress', label: '🔬 Testing in Progress' },
              { key: 'ResultsReady', label: '📄 Results Ready' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setTabFilter(tab.key)}
                style={{
                  padding: '7px 14px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: tabFilter === tab.key ? 700 : 500,
                  background: tabFilter === tab.key ? '#059669' : '#F1F5F9',
                  color: tabFilter === tab.key ? '#FFFFFF' : '#475569',
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
              placeholder="Filter by patient or test..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="spinner" />
      ) : filtered.length === 0 ? (
        <div className="card">
          <div className="empty-state animate-fade-in" style={{ padding: '40px 20px' }}>
            <img src={emptyImg} alt="No samples" style={{ width: 180, height: 180, objectFit: 'cover', borderRadius: 20, boxShadow: 'var(--shadow)' }} />
            <p style={{ fontSize: 18, fontWeight: 700, marginTop: 24, color: 'var(--primary-dark)' }}>No active tests in this stage</p>
            <p className="text-muted">Collected samples and in-progress laboratory tests will appear here ready for result upload.</p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {filtered.map((b, i) => {
            const currentFile = selectedFiles[b.id];
            const isManual = useLinkMode[b.id];
            const currentManualUrl = manualUrls[b.id] !== undefined ? manualUrls[b.id] : (b.resultFileUrl || '');

            return (
              <div 
                className="card hover-lift animate-fade-in" 
                key={b.id} 
                style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '1.2fr 1.8fr', 
                  gap: 24, 
                  alignItems: 'center', 
                  animationDelay: `${i * 50}ms`, 
                  animationFillMode: 'both',
                  padding: '24px 28px',
                  borderLeft: b.status === 'ResultsReady' ? '4px solid #10B981' : '4px solid #0D9488'
                }}
              >
                <div>
                  <div style={{ fontWeight: 800, fontSize: 16.5, color: '#064E3B', marginBottom: 4 }}>
                    {b.labTest?.name}
                  </div>
                  <div style={{ color: '#64748B', fontSize: 13, marginBottom: 2 }}>
                    Patient: <strong style={{ color: '#0F172A' }}>{b.patientName}</strong>
                  </div>
                  <div style={{ color: '#64748B', fontSize: 13, marginBottom: 2 }}>Email: {b.patientEmail}</div>
                  <div style={{ color: '#64748B', fontSize: 13, marginBottom: 8 }}>Test Date: {b.bookingDate} ({b.timeSlot})</div>
                  
                  <div>
                    {b.status === 'SampleCollected' && <span className="badge badge-collected">🧪 Sample Collected</span>}
                    {b.status === 'TestingInProgress' && <span className="badge badge-pending">🔬 Testing in Progress</span>}
                    {b.status === 'ResultsReady' && <span className="badge badge-results">📄 Results Ready</span>}
                  </div>

                  {b.resultFileUrl && (
                    <div style={{ marginTop: 10 }}>
                      <a 
                        href={b.resultFileUrl} 
                        target="_blank" 
                        rel="noreferrer" 
                        style={{ fontSize: 12.5, color: '#059669', fontWeight: 700, textDecoration: 'underline' }}
                      >
                        📄 View Current Uploaded Document
                      </a>
                    </div>
                  )}
                </div>

                <div>
                  {!isManual ? (
                    <div>
                      <label className="form-label" style={{ fontWeight: 700, marginBottom: 6 }}>
                        Upload PDF / Image Diagnostic Report *
                      </label>

                      <input 
                        type="file"
                        id={`file-input-${b.id}`}
                        accept=".pdf,.jpg,.jpeg,.png,.docx"
                        style={{ display: 'none' }}
                        onChange={(e) => handleFileSelect(b.id, e.target.files?.[0])}
                      />

                      <div 
                        onClick={() => document.getElementById(`file-input-${b.id}`)?.click()}
                        style={{
                          border: '2px dashed #10B981',
                          borderRadius: 10,
                          padding: '14px 16px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          background: currentFile ? '#ECFDF5' : '#F6FAF7',
                          cursor: 'pointer',
                          marginBottom: 10,
                        }}
                      >
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {currentFile ? <CheckCircle2 size={20} color="#059669" /> : <FileUp size={18} color="#059669" />}
                        </div>
                        <div style={{ overflow: 'hidden' }}>
                          <div style={{ fontWeight: 700, fontSize: 13.5, color: currentFile ? '#064E3B' : '#0F172A', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                            {currentFile ? currentFile.name : 'Click to select PDF document'}
                          </div>
                          <div style={{ fontSize: 11.5, color: '#64748B' }}>
                            {currentFile ? `${(currentFile.size / 1024).toFixed(1)} KB (Ready to upload)` : 'PDF, PNG, JPG up to 25MB'}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <span className="text-muted text-sm">Emails report to patient</span>
                        <button 
                          type="button" 
                          className="btn btn-ghost btn-sm" 
                          style={{ fontSize: 11.5, color: '#059669', padding: '2px 6px' }}
                          onClick={() => setUseLinkMode(prev => ({ ...prev, [b.id]: true }))}
                        >
                          <LinkIcon size={11} /> Enter URL link instead
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <label className="form-label" style={{ fontWeight: 700, margin: 0 }}>
                          Result Document URL *
                        </label>
                        <button 
                          type="button" 
                          className="btn btn-ghost btn-sm" 
                          style={{ fontSize: 11.5, color: '#059669', padding: '2px 6px' }}
                          onClick={() => setUseLinkMode(prev => ({ ...prev, [b.id]: false }))}
                        >
                          <FileUp size={11} /> Upload PDF file instead
                        </button>
                      </div>
                      <input
                        className="input"
                        placeholder="https://res.cloudinary.com/healthbridge/reports/result.pdf"
                        value={currentManualUrl}
                        onChange={e => setManualUrls({ ...manualUrls, [b.id]: e.target.value })}
                      />
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button 
                      className="btn btn-primary" 
                      style={{ flex: 1.5, background: '#059669', color: '#FFFFFF' }} 
                      onClick={() => handleUploadSubmit(b)}
                      disabled={uploadingId === b.id}
                    >
                      <Upload size={16} /> 
                      {uploadingId === b.id ? 'Uploading PDF...' : b.status === 'ResultsReady' ? 'Upload & Update Report' : 'Upload PDF & Notify Patient'}
                    </button>

                    {b.status === 'ResultsReady' && (
                      <button 
                        className="btn btn-outline" 
                        style={{ flex: 1 }} 
                        onClick={() => handleDeliverReport(b.id, b.patientEmail)}
                        title="Mark as Delivered to patient"
                      >
                        <Send size={14} /> Deliver
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </LabLayout>
  );
}
