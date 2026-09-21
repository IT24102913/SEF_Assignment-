import React from 'react';
import { 
  X, CheckCircle2, Clock, AlertCircle, Microscope, 
  Sparkles, ShieldCheck, FileText, Download, Calendar, 
  User, Check, AlertTriangle, ArrowRight 
} from 'lucide-react';

const STATUS_RANKS = {
  'PendingPrescriptionUpload': 0,
  'PendingAIVerification': 1,
  'PendingLabApproval': 2,
  'Confirmed': 3,
  'SampleCollected': 4,
  'TestingInProgress': 5,
  'ResultVerification': 6,
  'ResultsReady': 7,
  'ReportDelivered': 8,
  'Completed': 9,
  'Rejected': -1,
  'Cancelled': -1,
};

export default function BookingTrackingModal({ booking, onClose, onDownloadReport }) {
  if (!booking) return null;

  const status = booking.status || 'PendingLabApproval';
  const currentRank = STATUS_RANKS[status] ?? 0;
  const isFailed = status === 'Rejected' || status === 'Cancelled';
  const isRestricted = booking.labTest?.isRestricted || booking.isRestricted;

  // Build timeline stages
  const stages = [];

  if (isRestricted) {
    stages.push(
      {
        title: 'Appointment & Rx Submitted',
        subtitle: 'Booking requested & prescription attached for clinical review',
        icon: Calendar,
        rank: 0,
      },
      {
        title: 'AI & Lab Clinical Verification',
        subtitle: 'Gemini Vision AI & certified laboratory staff review',
        icon: Sparkles,
        rank: 2,
      },
      {
        title: 'Prescription Approved • Payment Selection',
        subtitle: 'Prescription approved! Choose online card or counter cash payment',
        icon: CheckCircle2,
        rank: 3,
      }
    );
  } else {
    stages.push(
      {
        title: 'Appointment Requested',
        subtitle: 'Booking submitted and scheduled in laboratory system',
        icon: Calendar,
        rank: 0,
      },
      {
        title: 'Confirmed & Token Scheduled',
        subtitle: `Token #${booking.tokenNumber || 'LAB'} assigned for counter visit`,
        icon: CheckCircle2,
        rank: 3,
      }
    );
  }

  stages.push(
    {
      title: 'Sample Collected',
      subtitle: `Specimen (${booking.labTest?.sampleType || 'Specimen'}) collected at phlebotomy counter`,
      icon: Microscope,
      rank: 4,
    },
    {
      title: 'Testing & Analyzer In Progress',
      subtitle: 'Sample undergoing automated laboratory diagnostic processing',
      icon: Clock,
      rank: 5,
    },
    {
      title: 'Doctor Verified & Report Ready',
      subtitle: 'Results confirmed by pathologist and uploaded to your portal',
      icon: FileText,
      rank: 7,
    }
  );

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={styles.iconCircle}>
              <Microscope size={22} color="#059669" />
            </div>
            <div>
              <h2 style={styles.title}>Live Test Tracking</h2>
              <div style={styles.subtitle}>
                Token <span style={styles.tokenBadge}>#{booking.tokenNumber || 'LAB'}</span> • {booking.labTest?.name || 'Diagnostic Test'}
              </div>
            </div>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>
            <X size={20} color="#64748b" />
          </button>
        </div>

        {/* Failed Banner */}
        {isFailed && (
          <div style={styles.failedBanner}>
            <AlertTriangle size={20} color="#dc2626" />
            <div>
              <strong style={{ color: '#991b1b', fontSize: '14px' }}>Booking Cancelled</strong>
              <div style={{ fontSize: '12.5px', color: '#b91c1c', marginTop: '2px', lineHeight: 1.4 }}>
                {booking.technicianNotes
                  ? `Prescription rejected by laboratory staff: "${booking.technicianNotes}". No further actions can be taken for this request.`
                  : (booking.notes || 'This laboratory appointment was cancelled or rejected by clinical staff.')}
              </div>
            </div>
          </div>
        )}

        {/* Timeline */}
        <div style={styles.timeline}>
          {stages.map((stage, idx) => {
            const isCompleted = !isFailed && currentRank >= stage.rank;
            const isCurrent = !isFailed && (
              currentRank === stage.rank ||
              (currentRank > stage.rank && (idx === stages.length - 1 || currentRank < stages[idx + 1]?.rank))
            );
            const Icon = stage.icon;

            return (
              <div key={idx} style={styles.stageItem}>
                {/* Node Line & Dot */}
                <div style={styles.nodeColumn}>
                  <div style={{
                    ...styles.nodeDot,
                    backgroundColor: isCompleted ? '#059669' : '#e2e8f0',
                    color: isCompleted ? '#fff' : '#94a3b8',
                    border: isCurrent ? '3px solid #6ee7b7' : 'none',
                    boxShadow: isCurrent ? '0 0 0 4px rgba(5, 150, 105, 0.15)' : 'none'
                  }}>
                    {isCompleted ? <Check size={14} strokeWidth={3} /> : <Icon size={14} />}
                  </div>
                  {idx < stages.length - 1 && (
                    <div style={{
                      ...styles.nodeLine,
                      backgroundColor: isCompleted ? '#059669' : '#e2e8f0'
                    }} />
                  )}
                </div>

                {/* Content */}
                <div style={styles.stageContent}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h4 style={{
                      ...styles.stageTitle,
                      color: isCompleted ? '#0f172a' : '#94a3b8',
                      fontWeight: isCurrent ? 800 : 600
                    }}>
                      {stage.title}
                    </h4>
                    {isCurrent && (
                      <span style={styles.currentBadge}>Current Stage</span>
                    )}
                  </div>
                  <p style={{
                    ...styles.stageSubtitle,
                    color: isCompleted ? '#475569' : '#94a3b8'
                  }}>
                    {stage.subtitle}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Booking Summary Card */}
        <div style={styles.summaryCard}>
          <div style={styles.summaryRow}>
            <span style={styles.summaryLabel}>Scheduled Date:</span>
            <span style={styles.summaryValue}>{new Date(booking.bookingDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} at {booking.timeSlot}</span>
          </div>
          <div style={styles.summaryRow}>
            <span style={styles.summaryLabel}>Sample Specimen:</span>
            <span style={styles.summaryValue}>{booking.labTest?.sampleType || 'Blood Sample'}</span>
          </div>
          <div style={styles.summaryRow}>
            <span style={styles.summaryLabel}>Payment Status:</span>
            <span style={{ ...styles.summaryValue, color: booking.paymentStatus === 'PaidOnline' ? '#059669' : '#d97706', fontWeight: 700 }}>
              {booking.paymentStatus === 'PaidOnline' ? '✓ Paid Online (Card)' : 'Cash on Counter (Pending)'}
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div style={styles.footer}>
          {booking.resultFileUrl ? (
            <button 
              style={styles.downloadBtn}
              onClick={() => onDownloadReport ? onDownloadReport(booking) : window.open(booking.resultFileUrl, '_blank')}
            >
              <Download size={16} /> Download Official PDF Report
            </button>
          ) : (
            <div style={styles.pendingNote}>
              <Clock size={15} color="#059669" />
              <span>Report will be downloadable here once testing is completed.</span>
            </div>
          )}
          <button style={styles.closeActionBtn} onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
  },
  modal: {
    backgroundColor: '#ffffff',
    borderRadius: '24px',
    width: '100%',
    maxWidth: '560px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    display: 'flex',
    flexDirection: 'column',
    maxHeight: '90vh',
    overflow: 'hidden',
  },
  header: {
    padding: '24px 28px 18px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: '1px solid #f1f5f9',
  },
  iconCircle: {
    width: '44px',
    height: '44px',
    borderRadius: '12px',
    backgroundColor: '#ecfdf5',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: '18px',
    fontWeight: 800,
    color: '#0f172a',
    margin: 0,
  },
  subtitle: {
    fontSize: '13px',
    color: '#64748b',
    marginTop: '2px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  tokenBadge: {
    backgroundColor: '#ecfdf5',
    color: '#059669',
    fontWeight: 800,
    padding: '1px 8px',
    borderRadius: '6px',
    fontSize: '12px',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    padding: '8px',
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'flex',
  },
  failedBanner: {
    margin: '16px 28px 0',
    padding: '14px 16px',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
  },
  timeline: {
    padding: '24px 28px',
    overflowY: 'auto',
    flex: 1,
  },
  stageItem: {
    display: 'flex',
    gap: '16px',
    position: 'relative',
    minHeight: '62px',
  },
  nodeColumn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '24px',
  },
  nodeDot: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    transition: 'all 0.3s ease',
  },
  nodeLine: {
    width: '2px',
    flex: 1,
    margin: '4px 0',
    transition: 'all 0.3s ease',
  },
  stageContent: {
    flex: 1,
    paddingBottom: '20px',
  },
  stageTitle: {
    fontSize: '14px',
    margin: 0,
    letterSpacing: '-0.2px',
  },
  stageSubtitle: {
    fontSize: '12.5px',
    margin: '3px 0 0',
    lineHeight: 1.4,
  },
  currentBadge: {
    backgroundColor: '#ecfdf5',
    color: '#059669',
    fontSize: '11px',
    fontWeight: 700,
    padding: '2px 8px',
    borderRadius: '12px',
    border: '1px solid #a7f3d0',
  },
  summaryCard: {
    margin: '0 28px 20px',
    backgroundColor: '#f8fafc',
    borderRadius: '14px',
    border: '1px solid #e2e8f0',
    padding: '14px 18px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '12.5px',
  },
  summaryLabel: {
    color: '#64748b',
    fontWeight: 500,
  },
  summaryValue: {
    color: '#0f172a',
    fontWeight: 600,
  },
  footer: {
    padding: '16px 28px',
    backgroundColor: '#f8fafc',
    borderTop: '1px solid #f1f5f9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
  },
  downloadBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: '#059669',
    color: '#ffffff',
    border: 'none',
    padding: '10px 18px',
    borderRadius: '10px',
    fontWeight: 700,
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'background 0.2s ease',
  },
  pendingNote: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '12px',
    color: '#059669',
    fontWeight: 600,
  },
  closeActionBtn: {
    backgroundColor: '#ffffff',
    border: '1px solid #cbd5e1',
    color: '#334155',
    padding: '10px 18px',
    borderRadius: '10px',
    fontWeight: 600,
    fontSize: '13px',
    cursor: 'pointer',
  },
};
