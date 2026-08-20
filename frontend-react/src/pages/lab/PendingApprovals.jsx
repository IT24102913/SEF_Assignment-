import { useEffect, useState } from 'react';
import { getPendingBookings, approveBooking, rejectBooking } from '../../api/labApi';
import LabLayout from '../../components/LabLayout';
import toast from 'react-hot-toast';
import { CheckCircle, XCircle, Eye, Brain, X } from 'lucide-react';
import emptyImg from '../../assets/lab_empty_microscope.jpg';

const TECHNICIAN_ID = '00000000-0000-0000-0000-000000000001';

function StatusBadge({ status }) {
  const map = {
    PendingLabApproval: ['badge-pending', 'Pending Approval'],
    Confirmed: ['badge-confirmed', 'Confirmed'],
    Rejected: ['badge-rejected', 'Rejected'],
    SampleCollected: ['badge-collected', 'Sample Collected'],
    ResultsReady: ['badge-results', 'Results Ready'],
  };
  const [cls, label] = map[status] || ['badge-pending', status];
  return <span className={`badge ${cls}`}>{label}</span>;
}

function AIBadge({ ai, score }) {
  if (ai === 'NotRequired') return <span className="badge badge-open">Not Required</span>;
  if (ai === 'PreApproved') return <span className="badge badge-ai-approved">✓ AI Pre-Approved {score ? `(${(score * 100).toFixed(0)}%)` : ''}</span>;
  if (ai === 'Flagged') return <span className="badge badge-ai-flagged">⚠ AI Flagged</span>;
  return <span className="badge badge-pending">Pending AI</span>;
}

export default function PendingApprovals() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [modal, setModal] = useState(null); // 'view' | 'reject' | 'image'

  const load = () => {
    setLoading(true);
    getPendingBookings()
      .then(r => { setBookings(r.data || []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleApprove = async (booking) => {
    try {
      await approveBooking(booking.id, TECHNICIAN_ID, '');
      toast.success(`Booking approved! Confirmation email sent to ${booking.patientEmail}`);
      load();
    } catch { toast.error('Failed to approve booking'); }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) return toast.error('Please enter a rejection reason');
    try {
      await rejectBooking(selected.id, TECHNICIAN_ID, rejectReason);
      toast.success('Booking rejected. Patient has been notified.');
      setModal(null); setRejectReason('');
      load();
    } catch { toast.error('Failed to reject booking'); }
  };

  return (
    <LabLayout>
      <div className="page-header">
        <h1 className="page-title">Pending Approvals</h1>
        <p className="page-subtitle">Review and approve lab test booking requests</p>
      </div>

      <div className="card animate-slide-up">
        {loading ? <div className="spinner" /> : bookings.length === 0 ? (
          <div className="empty-state animate-fade-in" style={{ padding: '40px 20px' }}>
            <img src={emptyImg} alt="All Clear" style={{ width: 180, height: 180, objectFit: 'cover', borderRadius: 20, boxShadow: 'var(--shadow)' }} />
            <p style={{ fontSize: 18, fontWeight: 600, marginTop: 24, color: 'var(--primary-dark)' }}>All clear!</p>
            <p className="text-muted">No pending bookings to review.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Test</th>
                  <th>Date & Time</th>
                  <th>AI Verification</th>
                  <th>Prescription</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b, i) => (
                  <tr key={b.id} className="hover-lift animate-fade-in" style={{ animationDelay: `${i * 50}ms`, animationFillMode: 'both' }}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{b.patientName}</div>
                      <div className="text-muted">{b.patientEmail}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{b.labTest?.name}</div>
                      <span className={`badge ${b.labTest?.isRestricted ? 'badge-restricted' : 'badge-open'}`}>
                        {b.labTest?.isRestricted ? '🔒 Restricted' : '✓ Open'}
                      </span>
                    </td>
                    <td>
                      <div>{b.bookingDate}</div>
                      <div className="text-muted">{b.timeSlot}</div>
                    </td>
                    <td><AIBadge ai={b.aiVerification} score={b.aiConfidenceScore} /></td>
                    <td>
                      {b.prescriptionImageUrl ? (
                        <button className="btn btn-ghost btn-sm" onClick={() => { setSelected(b); setModal('image'); }}>
                          <Eye size={14} /> View
                        </button>
                      ) : <span className="text-muted">N/A</span>}
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button className="btn btn-ghost btn-sm" onClick={() => { setSelected(b); setModal('view'); }}>
                          <Eye size={14} /> Details
                        </button>
                        <button className="btn btn-success btn-sm" onClick={() => handleApprove(b)}>
                          <CheckCircle size={14} /> Approve
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => { setSelected(b); setModal('reject'); }}>
                          <XCircle size={14} /> Reject
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

      {/* Detail Modal */}
      {modal === 'view' && selected && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Booking Details</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setModal(null)}><X size={16} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[['Patient', selected.patientName], ['Email', selected.patientEmail],
                ['Test', selected.labTest?.name], ['Price', `LKR ${selected.labTest?.price}`],
                ['Date', selected.bookingDate], ['Time', selected.timeSlot]].map(([k, v]) => (
                  <div key={k}>
                    <div className="form-label">{k}</div>
                    <div style={{ fontWeight: 500 }}>{v}</div>
                  </div>
                ))}
            </div>
            {selected.aiVerificationNotes && (
              <div className="ai-result-card" style={{ marginTop: 16 }}>
                <h4><Brain size={12} style={{ display: 'inline' }} /> AI Analysis</h4>
                <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                  <AIBadge ai={selected.aiVerification} score={selected.aiConfidenceScore} />
                </div>
                <p className="text-sm text-muted">{selected.aiVerificationNotes}</p>
                {selected.aiExtractedDoctorName && <p className="text-sm" style={{ marginTop: 4 }}>Doctor: <strong>{selected.aiExtractedDoctorName}</strong></p>}
              </div>
            )}
            <div className="flex gap-2 mt-4">
              <button className="btn btn-success" style={{ flex: 1 }} onClick={() => { handleApprove(selected); setModal(null); }}>
                <CheckCircle size={16} /> Approve
              </button>
              <button className="btn btn-danger" style={{ flex: 1 }} onClick={() => setModal('reject')}>
                <XCircle size={16} /> Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {modal === 'reject' && selected && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Reject Booking</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setModal(null)}><X size={16} /></button>
            </div>
            <p className="text-muted" style={{ marginBottom: 16 }}>Rejecting <strong>{selected.patientName}</strong>'s booking for <strong>{selected.labTest?.name}</strong>. A rejection email will be sent automatically.</p>
            <div className="form-group">
              <label className="form-label">Reason for Rejection *</label>
              <textarea className="textarea" rows={4} placeholder="e.g. Prescription is expired, test name does not match..." value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-danger" style={{ flex: 1 }} onClick={handleReject}><XCircle size={16} /> Confirm Reject</button>
            </div>
          </div>
        </div>
      )}

      {/* Image Modal */}
      {modal === 'image' && selected && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" style={{ maxWidth: 800 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Prescription Image</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setModal(null)}><X size={16} /></button>
            </div>
            <div style={{ textAlign: 'center', background: '#000', borderRadius: 8, overflow: 'hidden', padding: 8 }}>
              <img src={selected.prescriptionImageUrl} alt="Prescription" style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain' }} />
            </div>
          </div>
        </div>
      )}
    </LabLayout>
  );
}
