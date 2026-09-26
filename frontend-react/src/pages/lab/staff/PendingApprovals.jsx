import { useEffect, useState, useMemo } from 'react';
import { getAllBookings, approveBooking, rejectBooking } from '../../../api/labApi';
import LabLayout from '../../../components/layout/LabLayout';
import toast from 'react-hot-toast';
import { CheckCircle, XCircle, Eye, Brain, X, AlertTriangle, Clock, Layers } from 'lucide-react';
import emptyImg from '../../../assets/lab_empty_microscope.jpg';

const TECHNICIAN_ID = '00000000-0000-0000-0000-000000000001';

function StatusBadge({ status }) {
  const map = {
    PendingLabApproval: ['badge-pending', 'Pending Approval'],
    PendingAIVerification: ['badge-warning', 'AI Verifying...'],
    PendingPrescriptionUpload: ['badge-pending', 'Awaiting Upload'],
    Confirmed: ['badge-confirmed', 'Confirmed'],
    Rejected: ['badge-rejected', 'Rejected'],
    SampleCollected: ['badge-collected', 'Sample Collected'],
    ResultsReady: ['badge-results', 'Results Ready'],
  };
  const [cls, label] = map[status] || ['badge-pending', status];
  return <span className={`badge ${cls}`}>{label}</span>;
}

function AIBadge({ ai, score, status, nameMismatch, dateExpired, dateInvalid, testMismatch }) {
  if (status === 'PendingAIVerification') return <span className="badge badge-warning">⚡ AI Verifying...</span>;
  if (status === 'PendingPrescriptionUpload') return <span className="badge badge-pending">⏳ Awaiting Rx Upload</span>;
  if (nameMismatch) return <span className="badge" style={{ background: '#fef2f2', color: '#b91c1c', border: '1.5px solid #f87171', fontWeight: 700 }}>⚠️ Name Mismatch Flagged</span>;
  if (testMismatch) return <span className="badge" style={{ background: '#fef2f2', color: '#b91c1c', border: '1.5px solid #f87171', fontWeight: 700 }}>⚠️ Test Mismatch Flagged</span>;
  if (dateExpired) return <span className="badge" style={{ background: '#fef2f2', color: '#b91c1c', border: '1.5px solid #f87171', fontWeight: 700 }}>⚠️ Expired Rx Flagged</span>;
  if (dateInvalid) return <span className="badge" style={{ background: '#fffbeb', color: '#b45309', border: '1.5px solid #fcd34d', fontWeight: 700 }}>⚠️ Invalid Rx Date Flagged</span>;
  if (ai === 'NotRequired') return <span className="badge badge-open">Not Required</span>;
  if (ai === 'PreApproved') return <span className="badge badge-ai-approved">✓ AI Pre-Approved {score ? `(${(score * 100).toFixed(0)}%)` : ''}</span>;
  if (ai === 'Flagged') return <span className="badge badge-ai-flagged">⚠ AI Flagged</span>;
  return <span className="badge badge-pending">Pending AI</span>;
}

const groupPendingBookings = (rawList) => {
  const groups = [];
  for (const b of rawList) {
    const bCreated = new Date(b.createdAt || Date.now()).getTime();
    let matched = null;
    for (const g of groups) {
      const gCreated = new Date(g.createdAt || Date.now()).getTime();
      const samePatient = (g.patientEmail && b.patientEmail && g.patientEmail.toLowerCase() === b.patientEmail.toLowerCase()) ||
                          (g.patientId && b.patientId && g.patientId === b.patientId);
      const sameSlot = g.bookingDate === b.bookingDate && g.timeSlot === b.timeSlot;
      const withinWindow = Math.abs(bCreated - gCreated) <= 90000;
      if (samePatient && sameSlot && withinWindow) {
        matched = g;
        break;
      }
    }
    if (matched) {
      matched.bookings.push(b);
      if (b.aiPatientNameMismatch) matched.aiPatientNameMismatch = true;
      if (b.aiTestMismatch) matched.aiTestMismatch = true;
      if (b.aiPrescriptionExpired) matched.aiPrescriptionExpired = true;
      if (b.aiPrescriptionDateValid === false) matched.aiPrescriptionDateValid = false;
      if (!matched.prescriptionImageUrl && b.prescriptionImageUrl) {
        matched.prescriptionImageUrl = b.prescriptionImageUrl;
      }
      if (!matched.queueToken && b.queueToken) {
        matched.queueToken = b.queueToken;
        matched.assignedChairNo = b.assignedChairNo;
      }
      if (b.status === 'PendingLabApproval') matched.status = 'PendingLabApproval';
    } else {
      groups.push({
        id: b.id,
        createdAt: b.createdAt,
        patientName: b.patientName,
        patientEmail: b.patientEmail,
        patientId: b.patientId,
        bookingDate: b.bookingDate,
        timeSlot: b.timeSlot,
        prescriptionImageUrl: b.prescriptionImageUrl,
        queueToken: b.queueToken,
        assignedChairNo: b.assignedChairNo,
        priorityTier: b.priorityTier,
        aiVerification: b.aiVerification,
        aiConfidenceScore: b.aiConfidenceScore,
        aiPatientNameMismatch: b.aiPatientNameMismatch,
        aiPatientNameMismatchReason: b.aiPatientNameMismatchReason,
        aiExtractedPatientName: b.aiExtractedPatientName,
        aiTestMismatch: b.aiTestMismatch,
        aiTestMismatchReason: b.aiTestMismatchReason,
        aiExtractedInvestigations: b.aiExtractedInvestigations,
        aiPrescriptionExpired: b.aiPrescriptionExpired,
        aiPrescriptionDateValid: b.aiPrescriptionDateValid,
        aiPrescriptionDateReason: b.aiPrescriptionDateReason,
        aiPrescriptionDate: b.aiPrescriptionDate,
        aiVerificationNotes: b.aiVerificationNotes,
        aiExtractedDoctorName: b.aiExtractedDoctorName,
        agentWorkflowStateJson: b.agentWorkflowStateJson,
        status: b.status,
        labTest: b.labTest,
        bookings: [b]
      });
    }
  }
  return groups;
};

export default function PendingApprovals() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [modal, setModal] = useState(null); // 'view' | 'reject' | 'image'

  const load = (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    getAllBookings('')
      .then(r => {
        const all = r.data || [];
        const pending = all.filter(b => 
          b.status === 'PendingLabApproval' ||
          b.status === 'PendingPrescriptionUpload' ||
          b.status === 'PendingAIVerification'
        );
        setBookings(pending);
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

  const groupedAppointments = useMemo(() => {
    return groupPendingBookings(bookings);
  }, [bookings]);

  const handleApprove = async (group) => {
    if (group.status === 'PendingPrescriptionUpload') {
      toast.error('Patient has not uploaded a prescription slip yet.');
      return;
    }
    if (group.aiPatientNameMismatch) {
      const confirmed = window.confirm(
        `⚠️ ATTENTION TECHNICIAN:\n\n` +
        `The AI Multi-Agent system detected a PATIENT NAME MISMATCH on this prescription slip!\n\n` +
        `• Registered Profile: ${group.patientName}\n` +
        `• Name on Prescription: ${group.aiExtractedPatientName || 'Unknown / Not Detected'}\n\n` +
        `Are you sure you want to override and approve this booking?`
      );
      if (!confirmed) return;
    }
    const testMismatchBookings = group.bookings.filter(b => b.aiTestMismatch);
    if (testMismatchBookings.length > 0) {
      const slipList = group.aiExtractedInvestigations?.length ? group.aiExtractedInvestigations.join(', ') : 'None / Not Detected';
      const testNames = testMismatchBookings.map(b => b.labTest?.name).join(', ');
      const confirmed = window.confirm(
        `⚠️ ATTENTION TECHNICIAN:\n\n` +
        `The AI Multi-Agent system detected an INVESTIGATION / TEST MISMATCH!\n\n` +
        `• Flagged Test(s): ${testNames}\n` +
        `• Prescribed on Prescription Slip: ${slipList}\n\n` +
        `Are you sure you want to override clinical safety policy and approve these ${group.bookings.length} test(s)?`
      );
      if (!confirmed) return;
    }
    if (group.aiPrescriptionExpired) {
      const confirmed = window.confirm(
        `⚠️ ATTENTION TECHNICIAN:\n\n` +
        `The AI Multi-Agent system detected an EXPIRED PRESCRIPTION!\n\n` +
        `• Detected Issue Date: ${group.aiPrescriptionDate || 'Old / Unknown'}\n` +
        `• Clinical Flag: ${group.aiPrescriptionDateReason || 'Exceeds 90-day clinical validity limit'}\n\n` +
        `Are you sure you want to override hospital freshness policy and approve this booking?`
      );
      if (!confirmed) return;
    }
    try {
      await approveBooking(group.id, TECHNICIAN_ID, '');
      const count = group.bookings.length;
      toast.success(
        count > 1
          ? `Appointment for ${count} tests approved! Single confirmation email sent to ${group.patientEmail}`
          : `Booking approved! Confirmation email sent to ${group.patientEmail}`
      );
      window.dispatchEvent(new Event('lab-booking-updated'));
      load();
    } catch { toast.error('Failed to approve booking'); }
  };

  const openRejectModal = (group) => {
    setSelected(group);
    const reasons = [];
    if (group.aiPatientNameMismatch) {
      reasons.push(`Prescription patient name ('${group.aiExtractedPatientName || 'on slip'}') does not match registered profile name ('${group.patientName}').`);
    }
    const testMismatchBookings = group.bookings.filter(b => b.aiTestMismatch);
    if (testMismatchBookings.length > 0) {
      const slipList = group.aiExtractedInvestigations?.length ? group.aiExtractedInvestigations.join(', ') : 'no matching investigations identified';
      const testNames = testMismatchBookings.map(b => b.labTest?.name).join(', ');
      reasons.push(`Prescribed tests on slip (${slipList}) do not include requested test(s) '${testNames}'.`);
    }
    if (group.aiPrescriptionExpired) {
      reasons.push(`Prescription has expired (${group.aiPrescriptionDateReason || `issued on ${group.aiPrescriptionDate}, exceeds 90-day validity window`}).`);
    } else if (group.aiPrescriptionDateValid === false) {
      reasons.push(`Invalid prescription date (${group.aiPrescriptionDateReason || 'issue date is missing or invalid'}).`);
    }
    setRejectReason(reasons.join(' '));
    setModal('reject');
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) return toast.error('Please enter a rejection reason');
    try {
      await rejectBooking(selected.id, TECHNICIAN_ID, rejectReason);
      const count = selected.bookings?.length || 1;
      toast.success(count > 1 ? `Appointment for ${count} tests rejected. Patient has been notified.` : 'Booking rejected. Patient has been notified.');
      window.dispatchEvent(new Event('lab-booking-updated'));
      setModal(null); setRejectReason('');
      load();
    } catch { toast.error('Failed to reject booking'); }
  };

  return (
    <LabLayout>
      <div className="page-header">
        <h1 className="page-title">Pending Approvals</h1>
        <p className="page-subtitle">Review and approve lab test booking requests with AI Vision Verification</p>
      </div>

      <div className="card animate-slide-up">
        {loading ? <div className="spinner" /> : groupedAppointments.length === 0 ? (
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
                  <th>Tests Requested</th>
                  <th>Date & Time</th>
                  <th>AI Verification</th>
                  <th>Prescription</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {groupedAppointments.map((group, i) => (
                  <tr key={group.id} className="hover-lift animate-fade-in" style={{ animationDelay: `${i * 50}ms`, animationFillMode: 'both' }}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{group.patientName}</div>
                      <div className="text-muted">{group.patientEmail}</div>
                      {group.aiPatientNameMismatch && (
                        <div style={{ marginTop: 4 }}>
                          <span className="badge" style={{ background: '#fee2e2', color: '#b91c1c', border: '1px solid #f87171', fontSize: 11, fontWeight: 700, padding: '2px 6px', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <AlertTriangle size={11} /> Slip: {group.aiExtractedPatientName || 'Mismatch'}
                          </span>
                        </div>
                      )}
                    </td>
                    <td>
                      {group.bookings.length > 1 ? (
                        <div>
                          <div style={{ marginBottom: 6 }}>
                            <span className="badge" style={{ background: '#e0f2fe', color: '#0369a1', border: '1px solid #7dd3fc', fontWeight: 800, fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <Layers size={12} /> {group.bookings.length} Co-Booked Tests (Single Appointment)
                            </span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                            {group.bookings.map(b => (
                              <div key={b.id} style={{ padding: '4px 8px', background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                                <div style={{ fontWeight: 600, fontSize: 12.5, color: '#0f172a' }}>{b.labTest?.name}</div>
                                <div className="flex gap-1" style={{ marginTop: 2 }}>
                                  <span className={`badge ${b.labTest?.isRestricted ? 'badge-restricted' : 'badge-open'}`} style={{ fontSize: 10, padding: '1px 5px' }}>
                                    {b.labTest?.isRestricted ? '🔒 Restricted' : '✓ Open'}
                                  </span>
                                  {b.aiTestMismatch ? (
                                    <span className="badge" style={{ background: '#fee2e2', color: '#b91c1c', border: '1px solid #f87171', fontSize: 10, fontWeight: 700, padding: '1px 5px' }}>
                                      ⚠️ Not on Slip
                                    </span>
                                  ) : (
                                    <span className="badge badge-ai-approved" style={{ fontSize: 10, padding: '1px 5px' }}>
                                      ✓ AI Verified
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div style={{ fontWeight: 500 }}>{group.labTest?.name}</div>
                          <div className="flex gap-1" style={{ marginTop: 4 }}>
                            <span className={`badge ${group.labTest?.isRestricted ? 'badge-restricted' : 'badge-open'}`}>
                              {group.labTest?.isRestricted ? '🔒 Restricted' : '✓ Open'}
                            </span>
                            <StatusBadge status={group.status} />
                          </div>
                          {group.aiTestMismatch && (
                            <div style={{ marginTop: 4 }}>
                              <span className="badge" style={{ background: '#fee2e2', color: '#b91c1c', border: '1px solid #f87171', fontSize: 11, fontWeight: 700, padding: '2px 6px', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                <AlertTriangle size={11} /> Slip: {group.aiExtractedInvestigations?.length ? group.aiExtractedInvestigations.join(', ') : 'Not Found'}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{group.bookingDate}</div>
                      <div className="text-muted">{group.timeSlot}</div>
                      {group.queueToken && (
                        <div style={{ marginTop: 4 }}>
                          <span className="badge" style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', fontSize: 11, fontWeight: 800 }}>
                            Token: {group.queueToken} • Chair #{group.assignedChairNo || 1}
                          </span>
                        </div>
                      )}
                      {group.aiPrescriptionExpired && (
                        <div style={{ marginTop: 4 }}>
                          <span className="badge" style={{ background: '#fee2e2', color: '#b91c1c', border: '1px solid #f87171', fontSize: 11, fontWeight: 700, padding: '2px 6px', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <Clock size={11} /> Expired Rx: {group.aiPrescriptionDate || 'Old'}
                          </span>
                        </div>
                      )}
                    </td>
                    <td><AIBadge ai={group.aiVerification} score={group.aiConfidenceScore} status={group.status} nameMismatch={group.aiPatientNameMismatch} testMismatch={group.aiTestMismatch} dateExpired={group.aiPrescriptionExpired} dateInvalid={group.aiPrescriptionDateValid === false} /></td>
                    <td>
                      {group.prescriptionImageUrl ? (
                        <button className="btn btn-ghost btn-sm" onClick={() => { setSelected(group); setModal('image'); }}>
                          <Eye size={14} /> View
                        </button>
                      ) : <span className="text-muted">N/A</span>}
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button className="btn btn-ghost btn-sm" onClick={() => { setSelected(group); setModal('view'); }}>
                          <Eye size={14} /> Details
                        </button>
                        <button className="btn btn-success btn-sm" onClick={() => handleApprove(group)}>
                          <CheckCircle size={14} /> {group.bookings.length > 1 ? `Approve All (${group.bookings.length})` : 'Approve'}
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => openRejectModal(group)}>
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
          <div className="modal" style={{ maxWidth: 640 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Booking Details</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setModal(null)}><X size={16} /></button>
            </div>

            {/* AI PATIENT NAME MISMATCH BANNER */}
            {selected.aiPatientNameMismatch && (
              <div style={{
                marginBottom: 16,
                padding: '12px 14px',
                background: '#fff1f2',
                border: '1.5px solid #f43f5e',
                borderRadius: 10,
                display: 'flex',
                gap: 12,
                alignItems: 'flex-start'
              }}>
                <AlertTriangle size={24} color="#e11d48" style={{ flexShrink: 0, marginTop: 2 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, color: '#9f1239', fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                    Human Review Warning: Patient Name Discrepancy
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 12px', marginTop: 8, fontSize: 12.5 }}>
                    <span style={{ color: '#475569', fontWeight: 600 }}>Profile Account Name:</span>
                    <span style={{ fontWeight: 700, color: '#0f172a' }}>{selected.patientName}</span>
                    <span style={{ color: '#475569', fontWeight: 600 }}>Prescription Slip Name:</span>
                    <span style={{ fontWeight: 800, color: '#be123c', background: '#ffe4e6', padding: '1px 6px', borderRadius: 4, display: 'inline-block' }}>
                      {selected.aiExtractedPatientName || 'Not Detected / Unidentified'}
                    </span>
                  </div>
                  {selected.aiPatientNameMismatchReason && (
                    <div style={{ fontSize: 11.5, color: '#881337', marginTop: 6, fontStyle: 'italic', background: 'rgba(255,255,255,0.7)', padding: '4px 8px', borderRadius: 6 }}>
                      🔍 AI Flag Note: {selected.aiPatientNameMismatchReason}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* AI EXPIRED PRESCRIPTION WARNING BANNER */}
            {(selected.aiPrescriptionExpired || selected.aiPrescriptionDateValid === false) && (
              <div style={{
                marginBottom: 16,
                padding: '12px 14px',
                background: '#fff7ed',
                border: '1.5px solid #f97316',
                borderRadius: 10,
                display: 'flex',
                gap: 12,
                alignItems: 'flex-start'
              }}>
                <Clock size={24} color="#ea580c" style={{ flexShrink: 0, marginTop: 2 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, color: '#9a3412', fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                    Human Review Warning: {selected.aiPrescriptionExpired ? 'Expired Prescription Document' : 'Prescription Date Flagged'}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 12px', marginTop: 8, fontSize: 12.5 }}>
                    <span style={{ color: '#475569', fontWeight: 600 }}>Detected Issue Date:</span>
                    <span style={{ fontWeight: 800, color: '#c2410c', background: '#ffedd5', padding: '1px 6px', borderRadius: 4, display: 'inline-block' }}>
                      {selected.aiPrescriptionDate || 'Undetected / Missing'}
                    </span>
                    <span style={{ color: '#475569', fontWeight: 600 }}>Clinical Freshness Limit:</span>
                    <span style={{ fontWeight: 600, color: '#0f172a' }}>Maximum 90 days from issue date</span>
                  </div>
                  {selected.aiPrescriptionDateReason && (
                    <div style={{ fontSize: 11.5, color: '#7c2d12', marginTop: 6, fontStyle: 'italic', background: 'rgba(255,255,255,0.7)', padding: '4px 8px', borderRadius: 6 }}>
                      🔍 AI Flag Note: {selected.aiPrescriptionDateReason}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* AI TEST MISMATCH WARNING BANNER */}
            {selected.aiTestMismatch && (
              <div style={{
                marginBottom: 16,
                padding: '12px 14px',
                background: '#fff1f2',
                border: '1.5px solid #f43f5e',
                borderRadius: 10,
                display: 'flex',
                gap: 12,
                alignItems: 'flex-start'
              }}>
                <AlertTriangle size={24} color="#e11d48" style={{ flexShrink: 0, marginTop: 2 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, color: '#9f1239', fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                    Human Review Warning: Test / Investigation Mismatch
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 12px', marginTop: 8, fontSize: 12.5 }}>
                    <span style={{ color: '#475569', fontWeight: 600 }}>Requested Test:</span>
                    <span style={{ fontWeight: 700, color: '#0f172a' }}>{selected.labTest?.name}</span>
                    <span style={{ color: '#475569', fontWeight: 600 }}>Prescribed on Slip:</span>
                    <span style={{ fontWeight: 800, color: '#be123c', background: '#ffe4e6', padding: '1px 6px', borderRadius: 4, display: 'inline-block' }}>
                      {selected.aiExtractedInvestigations?.length ? selected.aiExtractedInvestigations.join(', ') : 'No matching investigations identified'}
                    </span>
                  </div>
                  {selected.aiTestMismatchReason && (
                    <div style={{ fontSize: 11.5, color: '#881337', marginTop: 6, fontStyle: 'italic', background: 'rgba(255,255,255,0.7)', padding: '4px 8px', borderRadius: 6 }}>
                      🔍 AI Flag Note: {selected.aiTestMismatchReason}
                    </div>
                  )}
                </div>
              </div>
            )}

            {selected.bookings && selected.bookings.length > 1 ? (
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                  <div>
                    <div className="form-label">Patient Profile</div>
                    <div style={{ fontWeight: 600 }}>{selected.patientName}</div>
                  </div>
                  <div>
                    <div className="form-label">Email</div>
                    <div style={{ fontWeight: 500 }}>{selected.patientEmail}</div>
                  </div>
                  <div>
                    <div className="form-label">Booking Date</div>
                    <div style={{ fontWeight: 500 }}>{selected.bookingDate}</div>
                  </div>
                  <div>
                    <div className="form-label">Time Slot</div>
                    <div style={{ fontWeight: 500 }}>{selected.timeSlot}</div>
                  </div>
                </div>

                <div style={{ padding: '12px 14px', background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Layers size={14} /> Tests in this Appointment ({selected.bookings.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {selected.bookings.map(b => (
                      <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#fff', borderRadius: 8, border: '1px solid #cbd5e1' }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>{b.labTest?.name}</div>
                          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                            {b.labTest?.category} • <span className={`badge ${b.labTest?.isRestricted ? 'badge-restricted' : 'badge-open'}`} style={{ fontSize: 9.5, padding: '1px 5px' }}>{b.labTest?.isRestricted ? '🔒 Restricted' : '✓ Open'}</span>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 700, color: 'var(--primary-dark)', fontSize: 13 }}>LKR {b.labTest?.price}</div>
                          <div style={{ marginTop: 2 }}>
                            {b.aiTestMismatch ? (
                              <span style={{ fontSize: 10.5, color: '#b91c1c', fontWeight: 700 }}>⚠️ Not on slip</span>
                            ) : (
                              <span style={{ fontSize: 10.5, color: '#15803d', fontWeight: 700 }}>✓ Verified on slip</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, paddingTop: 8, borderTop: '1px solid #e2e8f0', fontWeight: 800, fontSize: 13 }}>
                    <span>Total Appointment Price:</span>
                    <span style={{ color: 'var(--primary-dark)' }}>LKR {selected.bookings.reduce((sum, b) => sum + (b.labTest?.price || 0), 0)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[['Patient Profile', selected.patientName], ['Email', selected.patientEmail],
                  ['Test Requested', selected.labTest?.name], ['Price', `LKR ${selected.labTest?.price}`],
                  ['Booking Date', selected.bookingDate], ['Time Slot', selected.timeSlot]].map(([k, v]) => (
                    <div key={k}>
                      <div className="form-label">{k}</div>
                      <div style={{ fontWeight: 500 }}>{v}</div>
                    </div>
                  ))}
              </div>
            )}

            {selected.prescriptionImageUrl && (
              <div style={{ marginTop: 14, padding: '10px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>Uploaded Prescription Slip</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>Click to view full image in high resolution</div>
                </div>
                <button className="btn btn-secondary btn-sm" onClick={() => setModal('image')}>
                  <Eye size={14} /> View Prescription Slip
                </button>
              </div>
            )}

            {selected.queueToken && (
              <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--primary-light)', borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--primary-dark)', fontWeight: 700 }}>AI Smart Queue Token & Station</div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--primary-dark)' }}>{selected.queueToken}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#059669', marginTop: 2 }}>Phlebotomy Chair #{selected.assignedChairNo || 1}</div>
                </div>
                <span className="badge badge-confirmed" style={{ fontSize: 12 }}>{selected.priorityTier || 'ROUTINE'}</span>
              </div>
            )}

            {selected.aiVerificationNotes && (
              <div className="ai-result-card" style={{ marginTop: 16 }}>
                <h4><Brain size={14} style={{ display: 'inline', marginRight: 6 }} /> AI Multi-Agent Audit Trail</h4>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8, marginTop: 4 }}>
                  <AIBadge ai={selected.aiVerification} score={selected.aiConfidenceScore} nameMismatch={selected.aiPatientNameMismatch} />
                </div>
                <p className="text-sm text-muted">{selected.aiVerificationNotes}</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
                  {selected.aiExtractedDoctorName && (
                    <div style={{ fontSize: 12 }}>
                      Doctor: <strong style={{ color: 'var(--primary-dark)' }}>{selected.aiExtractedDoctorName}</strong>
                    </div>
                  )}
                  {selected.aiExtractedPatientName && (
                    <div style={{ fontSize: 12 }}>
                      Slip Patient: <strong style={{ color: selected.aiPatientNameMismatch ? '#b91c1c' : '#15803d' }}>{selected.aiExtractedPatientName}</strong>
                    </div>
                  )}
                </div>
                {selected.agentWorkflowStateJson && (() => {
                  try {
                    const state = JSON.parse(selected.agentWorkflowStateJson);
                    const logs = state.stepLogs || state.StepLogs || [];
                    if (!logs.length) return null;
                    return (
                      <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(0,0,0,0.08)' }}>
                        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Workflow Execution Logs:</div>
                        {logs.map((log, idx) => {
                          const name = log.stepName || log.StepName || `Step #${idx + 1}`;
                          const conf = log.confidence ?? log.Confidence ?? 1.0;
                          const agent = log.agentName || log.AgentName || '';
                          const msg = log.message || log.Message || '';
                          return (
                            <div key={idx} style={{ fontSize: 11, padding: '6px 8px', background: '#fff', borderRadius: 6, marginBottom: 4, border: '1px solid rgba(0,0,0,0.05)' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontWeight: 600, color: '#0f172a' }}>✓ {name}</span>
                                <span style={{ color: 'var(--text-muted)', fontSize: 10.5 }}>{(conf * 100).toFixed(0)}% confidence</span>
                              </div>
                              {agent && <div style={{ fontSize: 10, color: 'var(--primary-dark)', marginTop: 2 }}>Agent: {agent}</div>}
                              {msg && <div style={{ fontSize: 10.5, color: '#64748b', marginTop: 2 }}>{msg}</div>}
                            </div>
                          );
                        })}
                      </div>
                    );
                  } catch { return null; }
                })()}
              </div>
            )}
            <div className="flex gap-2 mt-4">
              <button className="btn btn-success" style={{ flex: 1 }} onClick={() => { handleApprove(selected); setModal(null); }}>
                <CheckCircle size={16} /> {selected.bookings && selected.bookings.length > 1 ? `Approve All (${selected.bookings.length} Tests)` : 'Approve'}
              </button>
              <button className="btn btn-danger" style={{ flex: 1 }} onClick={() => openRejectModal(selected)}>
                <XCircle size={16} /> {selected.bookings && selected.bookings.length > 1 ? `Reject All (${selected.bookings.length} Tests)` : 'Reject'}
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
              <textarea className="textarea" rows={4} placeholder="e.g. Prescription is expired, patient name does not match..." value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
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
          <div className="modal" style={{ maxWidth: 840 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Prescription Slip Inspection</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setModal(null)}><X size={16} /></button>
            </div>

            {selected.aiPatientNameMismatch ? (
              <div style={{ marginBottom: 12, padding: '10px 14px', background: '#fee2e2', border: '1px solid #f87171', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <AlertTriangle size={18} color="#b91c1c" />
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#991b1b' }}>
                    Name Discrepancy Flagged: Profile "{selected.patientName}" ≠ Slip "{selected.aiExtractedPatientName || 'Unknown'}"
                  </span>
                </div>
                <button className="btn btn-danger btn-sm" onClick={() => openRejectModal(selected)}>
                  Reject with Reason
                </button>
              </div>
            ) : selected.aiTestMismatch ? (
              <div style={{ marginBottom: 12, padding: '10px 14px', background: '#fee2e2', border: '1px solid #f87171', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <AlertTriangle size={18} color="#b91c1c" />
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#991b1b' }}>
                    Test Mismatch: Requested "{selected.labTest?.name}" not found on slip ({selected.aiExtractedInvestigations?.length ? selected.aiExtractedInvestigations.join(', ') : 'None'})
                  </span>
                </div>
                <button className="btn btn-danger btn-sm" onClick={() => openRejectModal(selected)}>
                  Reject with Reason
                </button>
              </div>
            ) : selected.aiPrescriptionExpired ? (
              <div style={{ marginBottom: 12, padding: '10px 14px', background: '#fff7ed', border: '1px solid #f97316', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Clock size={18} color="#ea580c" />
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#9a3412' }}>
                    Expired Prescription: Issued on {selected.aiPrescriptionDate || 'Old'} (&gt; 90 days old)
                  </span>
                </div>
                <button className="btn btn-danger btn-sm" onClick={() => openRejectModal(selected)}>
                  Reject with Reason
                </button>
              </div>
            ) : (
              <div style={{ marginBottom: 12, padding: '8px 12px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle size={16} color="#15803d" />
                <span style={{ fontSize: 12.5, fontWeight: 600, color: '#166534' }}>
                  Patient Identity & Date Verified: Slip matches profile "{selected.patientName}"
                </span>
              </div>
            )}

            <div style={{ textAlign: 'center', background: '#0b0f19', borderRadius: 10, overflow: 'hidden', padding: 12, border: '1px solid #1e293b' }}>
              <img src={selected.prescriptionImageUrl} alt="Prescription" style={{ maxWidth: '100%', maxHeight: '68vh', objectFit: 'contain', borderRadius: 6 }} />
            </div>

            <div className="flex gap-2 mt-3" style={{ justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setModal('view')}>
                View Booking Details
              </button>
              <button className="btn btn-success" onClick={() => { handleApprove(selected); setModal(null); }}>
                Approve Booking
              </button>
            </div>
          </div>
        </div>
      )}
    </LabLayout>
  );
}
