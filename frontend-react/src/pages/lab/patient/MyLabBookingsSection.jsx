import React, { useState, useEffect, useMemo } from 'react';
import { 
  Microscope, Calendar, Clock, Download, AlertCircle, 
  CheckCircle2, XCircle, Search, RefreshCw, Sparkles, 
  ShieldCheck, FileText, ArrowRight, Eye, Trash2, Plus 
} from 'lucide-react';
import { getMyBookings, cancelBooking } from '../../../api/labApi';
import BookingTrackingModal from './BookingTrackingModal';
import toast from 'react-hot-toast';

export default function MyLabBookingsSection({ 
  user, 
  initialFilter = 'ACTIVE', 
  onBookNew, 
  onOpenBookingModal, 
  onOpenCatalogue, 
  onTrackBooking 
}) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(initialFilter || 'ACTIVE'); // 'ACTIVE' | 'RESULTS' | 'HISTORY' | 'ALL'
  const [search, setSearch] = useState('');
  const [selectedTrackingBooking, setSelectedTrackingBooking] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);

  const patientId = parseInt(user?.userId || user?.id) || 1;
  const userEmail = user?.email || '';

  useEffect(() => {
    if (initialFilter) {
      setActiveTab(initialFilter);
    }
  }, [initialFilter]);

  useEffect(() => {
    fetchBookings();
  }, [patientId, userEmail]);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = await getMyBookings(patientId, userEmail);
      const raw = res?.data || res || [];
      const items = Array.isArray(raw) ? raw : (raw.data || raw.items || []);
      setBookings(items);
    } catch (err) {
      console.warn('Failed to load lab bookings from backend:', err);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async (booking) => {
    if (!window.confirm(`Are you sure you want to cancel appointment #${booking.tokenNumber || 'LAB'}?`)) {
      return;
    }

    setCancellingId(booking.id);
    try {
      await cancelBooking(booking.id, patientId);
      toast.success('Appointment cancelled successfully.');
      setBookings(prev => prev.map(b => b.id === booking.id ? { ...b, status: 'Cancelled' } : b));
    } catch (err) {
      console.error('Cancel booking error:', err);
      toast.error('Could not cancel booking.');
    } finally {
      setCancellingId(null);
    }
  };

  const handleOpenTracking = (booking) => {
    if (onTrackBooking) {
      onTrackBooking(booking);
    } else {
      setSelectedTrackingBooking(booking);
    }
  };

  const handleTriggerBookingModal = () => {
    if (onOpenBookingModal) {
      onOpenBookingModal();
    } else if (onOpenCatalogue) {
      onOpenCatalogue();
    } else if (onBookNew) {
      onBookNew();
    }
  };

  const filteredBookings = useMemo(() => {
    return bookings.filter(b => {
      const status = b.status || '';
      
      // Tab filter
      let matchTab = true;
      if (activeTab === 'ACTIVE') {
        matchTab = [
          'PendingLabApproval', 
          'PendingPrescriptionUpload', 
          'PendingAIVerification', 
          'PendingPayment',
          'Confirmed', 
          'SampleCollected', 
          'TestingInProgress', 
          'ResultVerification'
        ].includes(status);
      } else if (activeTab === 'RESULTS') {
        matchTab = ['ResultsReady', 'ReportDelivered', 'Completed'].includes(status) || Boolean(b.resultFileUrl);
      } else if (activeTab === 'HISTORY') {
        matchTab = ['Completed', 'Cancelled', 'Rejected'].includes(status);
      } else if (activeTab === 'ALL') {
        matchTab = true;
      }

      // Search filter
      const matchSearch = !search ||
        (b.tokenNumber && b.tokenNumber.toLowerCase().includes(search.toLowerCase())) ||
        (b.bookingNumber && b.bookingNumber.toLowerCase().includes(search.toLowerCase())) ||
        (b.labTest?.name && b.labTest.name.toLowerCase().includes(search.toLowerCase()));

      return matchTab && matchSearch;
    });
  }, [bookings, activeTab, search]);

  const counts = useMemo(() => {
    const active = bookings.filter(b => 
      ['PendingLabApproval', 'PendingPrescriptionUpload', 'PendingAIVerification', 'PendingPayment', 'Confirmed', 'SampleCollected', 'TestingInProgress', 'ResultVerification'].includes(b.status)
    ).length;
    const results = bookings.filter(b => 
      ['ResultsReady', 'ReportDelivered', 'Completed'].includes(b.status) || Boolean(b.resultFileUrl)
    ).length;
    const history = bookings.filter(b => 
      ['Completed', 'Cancelled', 'Rejected'].includes(b.status)
    ).length;
    return { active, results, history, all: bookings.length };
  }, [bookings]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Confirmed':
        return { bg: '#ecfdf5', color: '#059669', label: '✓ Confirmed & Scheduled' };
      case 'SampleCollected':
        return { bg: '#eff6ff', color: '#2563eb', label: '🔬 Specimen Collected' };
      case 'TestingInProgress':
      case 'ResultVerification':
        return { bg: '#faf5ff', color: '#7c3aed', label: '⚙️ Testing In Progress' };
      case 'ResultsReady':
      case 'ReportDelivered':
        return { bg: '#dcfce7', color: '#15803d', label: '📄 Report Ready' };
      case 'Completed':
        return { bg: '#f1f5f9', color: '#475569', label: 'Completed' };
      case 'Cancelled':
      case 'Rejected':
        return { bg: '#fef2f2', color: '#dc2626', label: 'Cancelled / Rejected' };
      default:
        return { bg: '#fffbeb', color: '#d97706', label: '⏳ Verification Pending' };
    }
  };

  return (
    <div>
      {/* Top Controls & Navigation Bar */}
      <div style={styles.topBar}>
        <div>
          <h2 style={styles.title}>My Laboratory Appointments</h2>
          <p style={styles.subtitle}>
            Track specimen collection, view pathologist verification status, and download certified reports.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={fetchBookings}
            style={styles.refreshBtn}
            title="Refresh Diagnostic Records"
          >
            <RefreshCw size={15} color="#475569" />
          </button>
          <button
            type="button"
            onClick={handleTriggerBookingModal}
            style={styles.bookActionBtn}
          >
            <Plus size={16} /> Book New Test
          </button>
        </div>
      </div>

      {/* Tabs & Search Filter Header */}
      <div style={styles.filterRow}>
        <div style={styles.tabContainer}>
          {[
            { id: 'ACTIVE', label: 'Active Tests', count: counts.active },
            { id: 'RESULTS', label: 'Results Ready', count: counts.results },
            { id: 'HISTORY', label: 'Past History', count: counts.history },
            { id: 'ALL', label: 'All Bookings', count: counts.all },
          ].map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              style={{
                ...styles.tabBtn,
                ...(activeTab === t.id ? styles.tabBtnActive : {})
              }}
            >
              <span>{t.label}</span>
              <span style={{
                ...styles.tabBadge,
                ...(activeTab === t.id ? styles.tabBadgeActive : {})
              }}>
                {t.count}
              </span>
            </button>
          ))}
        </div>

        <div style={styles.searchBox}>
          <Search size={16} color="#94a3b8" style={{ marginRight: '8px' }} />
          <input
            type="text"
            placeholder="Search by test name or token..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={styles.searchInput}
          />
        </div>
      </div>

      {/* Bookings List Content */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#059669' }}>
          <div style={{ fontSize: '15px', fontWeight: 700 }}>Loading your laboratory bookings...</div>
        </div>
      ) : filteredBookings.length === 0 ? (
        <div style={styles.emptyCard}>
          <Microscope size={48} color="#94a3b8" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
            No Bookings Found in {activeTab === 'ACTIVE' ? 'Active Tests' : activeTab === 'RESULTS' ? 'Ready Reports' : activeTab === 'ALL' ? 'All Records' : 'History'}
          </h3>
          <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
            You currently have no laboratory appointments in this filter view.
          </p>
          <button
            type="button"
            style={styles.bookNewBtn}
            onClick={handleTriggerBookingModal}
          >
            Book a Lab Test Now
          </button>
        </div>
      ) : (
        <div style={styles.bookingsGrid}>
          {filteredBookings.map(b => {
            const badge = getStatusBadge(b.status);
            const canCancel = ['PendingLabApproval', 'PendingPrescriptionUpload', 'Confirmed'].includes(b.status);
            const hasReport = Boolean(b.resultFileUrl) || ['ResultsReady', 'ReportDelivered', 'Completed'].includes(b.status);

            return (
              <div key={b.id} style={styles.bookingCard}>
                {/* Card Top */}
                <div style={styles.cardHeader}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={styles.tokenPill}>
                      #{b.tokenNumber || b.bookingNumber || `LAB-${b.id?.slice(0, 4)}`}
                    </div>
                    <span style={{
                      ...styles.statusPill,
                      backgroundColor: badge.bg,
                      color: badge.color,
                    }}>
                      {badge.label}
                    </span>
                  </div>

                  <div style={styles.priceMeta}>
                    Rs. {Number(b.labTest?.price || 0).toLocaleString()}
                  </div>
                </div>

                {/* Test Title & Meta */}
                <h3 style={styles.testName}>{b.labTest?.name || 'Diagnostic Laboratory Test'}</h3>

                <div style={styles.metaRow}>
                  <div style={styles.metaItem}>
                    <Calendar size={14} color="#64748b" />
                    <span>{b.bookingDate ? new Date(b.bookingDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : 'Scheduled'}</span>
                  </div>
                  <div style={styles.metaItem}>
                    <Clock size={14} color="#64748b" />
                    <span>{b.timeSlot || '09:00'}</span>
                  </div>
                  <div style={styles.metaItem}>
                    <Microscope size={14} color="#059669" />
                    <span>{b.labTest?.sampleType || 'Blood Specimen'}</span>
                  </div>
                </div>

                {/* AI / Prescription Verification Tag */}
                {b.labTest?.isRestricted && (
                  <div style={styles.aiTagRow}>
                    <Sparkles size={14} color="#059669" />
                    <span>Gemini Vision AI Verified Prescription</span>
                  </div>
                )}

                {/* Card Footer Actions */}
                <div style={styles.cardFooter}>
                  <div style={{ fontSize: '12px', color: b.paymentStatus === 'PaidOnline' ? '#059669' : '#d97706', fontWeight: 700 }}>
                    {b.paymentStatus === 'PaidOnline' ? '✓ Paid Online (Card)' : 'Cash at Counter'}
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    {/* Track Sample Button */}
                    <button
                      type="button"
                      style={styles.trackBtn}
                      onClick={() => handleOpenTracking(b)}
                    >
                      <Eye size={14} /> Track Sample
                    </button>

                    {/* Download Report Button */}
                    {hasReport && (
                      <button
                        type="button"
                        style={styles.downloadBtn}
                        onClick={() => window.open(b.resultFileUrl || 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', '_blank')}
                      >
                        <Download size={14} /> PDF Report
                      </button>
                    )}

                    {/* Cancel Button */}
                    {canCancel && (
                      <button
                        type="button"
                        disabled={cancellingId === b.id}
                        style={styles.cancelBtn}
                        onClick={() => handleCancelBooking(b)}
                        title="Cancel Appointment"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Internal Tracking Modal if triggered standalone */}
      {selectedTrackingBooking && (
        <BookingTrackingModal
          booking={selectedTrackingBooking}
          onClose={() => setSelectedTrackingBooking(null)}
        />
      )}
    </div>
  );
}

const styles = {
  topBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    flexWrap: 'wrap',
    gap: '16px',
  },
  title: {
    fontSize: '22px',
    fontWeight: 800,
    color: '#0f172a',
    margin: 0,
    letterSpacing: '-0.3px',
  },
  subtitle: {
    fontSize: '13.5px',
    color: '#64748b',
    margin: '4px 0 0',
  },
  refreshBtn: {
    padding: '9px 12px',
    borderRadius: '10px',
    border: '1px solid #cbd5e1',
    backgroundColor: '#ffffff',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
  },
  bookActionBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '9px 18px',
    borderRadius: '10px',
    border: 'none',
    background: 'linear-gradient(135deg, #059669, #0D9488)',
    color: '#ffffff',
    fontSize: '13px',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)',
  },
  filterRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    flexWrap: 'wrap',
    gap: '16px',
  },
  tabContainer: {
    display: 'flex',
    gap: '8px',
    backgroundColor: '#f1f5f9',
    padding: '4px',
    borderRadius: '14px',
  },
  tabBtn: {
    padding: '8px 16px',
    borderRadius: '10px',
    border: 'none',
    backgroundColor: 'transparent',
    color: '#64748b',
    fontSize: '13px',
    fontWeight: 700,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.2s',
  },
  tabBtnActive: {
    backgroundColor: '#ffffff',
    color: '#059669',
    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.06)',
  },
  tabBadge: {
    fontSize: '11px',
    padding: '2px 7px',
    borderRadius: '999px',
    backgroundColor: '#e2e8f0',
    color: '#475569',
    fontWeight: 800,
  },
  tabBadgeActive: {
    backgroundColor: '#ecfdf5',
    color: '#059669',
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    border: '1px solid #cbd5e1',
    borderRadius: '12px',
    padding: '8px 14px',
    minWidth: '280px',
  },
  searchInput: {
    border: 'none',
    outline: 'none',
    fontSize: '13px',
    color: '#0f172a',
    width: '100%',
    fontFamily: 'inherit',
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: '20px',
    border: '1px dashed #cbd5e1',
    padding: '48px 24px',
    textAlign: 'center',
    margin: '20px 0',
  },
  bookNewBtn: {
    marginTop: '16px',
    padding: '10px 24px',
    borderRadius: '10px',
    backgroundColor: '#059669',
    color: '#ffffff',
    border: 'none',
    fontSize: '13.5px',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)',
  },
  bookingsGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  bookingCard: {
    backgroundColor: '#ffffff',
    borderRadius: '18px',
    border: '1px solid #e2e8f0',
    padding: '20px 24px',
    boxShadow: '0 4px 14px rgba(0, 0, 0, 0.03)',
    transition: 'all 0.2s',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
  },
  tokenPill: {
    fontFamily: 'monospace',
    fontSize: '13px',
    fontWeight: 800,
    color: '#0f172a',
    backgroundColor: '#f1f5f9',
    padding: '3px 10px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
  },
  statusPill: {
    fontSize: '11.5px',
    fontWeight: 800,
    padding: '3px 10px',
    borderRadius: '999px',
  },
  priceMeta: {
    fontSize: '16px',
    fontWeight: 900,
    color: '#059669',
  },
  testName: {
    fontSize: '16.5px',
    fontWeight: 800,
    color: '#0f172a',
    margin: '0 0 10px',
  },
  metaRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '18px',
    flexWrap: 'wrap',
    fontSize: '12.5px',
    color: '#64748b',
    marginBottom: '14px',
  },
  metaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  aiTagRow: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 10px',
    borderRadius: '8px',
    backgroundColor: '#f0fdf4',
    border: '1px solid #bbf7d0',
    fontSize: '11.5px',
    color: '#166534',
    fontWeight: 700,
    marginBottom: '14px',
  },
  cardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTop: '1px solid #f1f5f9',
    paddingTop: '14px',
  },
  trackBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '7px 14px',
    borderRadius: '8px',
    backgroundColor: '#ecfdf5',
    color: '#059669',
    border: '1px solid #a7f3d0',
    fontSize: '12.5px',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  downloadBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '7px 14px',
    borderRadius: '8px',
    backgroundColor: '#059669',
    color: '#ffffff',
    border: 'none',
    fontSize: '12.5px',
    fontWeight: 700,
    cursor: 'pointer',
  },
  cancelBtn: {
    padding: '7px 10px',
    borderRadius: '8px',
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    border: '1px solid #fecaca',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
};
