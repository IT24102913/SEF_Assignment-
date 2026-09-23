import React, { useState, useEffect, useMemo } from 'react';
import { 
  Microscope, Calendar, Clock, Download, AlertCircle, 
  CheckCircle2, XCircle, Search, RefreshCw, Sparkles, 
  ShieldCheck, FileText, ArrowRight, Eye, Trash2, Plus,
  CreditCard, DollarSign, X
} from 'lucide-react';
import { getMyBookings, cancelBooking, payBookingOnline, selectPayAtCounter } from '../../../api/labApi';
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
  const [trackingRelatedBookings, setTrackingRelatedBookings] = useState([]);
  const [cancellingId, setCancellingId] = useState(null);
  const [paymentModalBooking, setPaymentModalBooking] = useState(null);
  const [payingCard, setPayingCard] = useState(false);

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

  const handleCancelBooking = async (booking, siblings = []) => {
    const isMulti = siblings && siblings.length > 0;
    const confirmMsg = isMulti
      ? `Are you sure you want to cancel this appointment containing ${siblings.length + 1} diagnostic tests?`
      : `Are you sure you want to cancel appointment #${booking.tokenNumber || 'LAB'}?`;

    if (!window.confirm(confirmMsg)) {
      return;
    }

    setCancellingId(booking.id);
    try {
      await cancelBooking(booking.id, patientId);
      if (isMulti) {
        for (const s of siblings) {
          try { await cancelBooking(s.id, patientId); } catch (_) {}
        }
      }
      toast.success('Appointment cancelled successfully.');
      fetchBookings();
    } catch (err) {
      console.error('Cancel booking error:', err);
      toast.error('Could not cancel booking.');
    } finally {
      setCancellingId(null);
    }
  };

  const handleSelectCounterPayment = async (booking, siblings = []) => {
    try {
      await selectPayAtCounter(booking.id);
      if (siblings && siblings.length > 0) {
        for (const s of siblings) {
          try { await selectPayAtCounter(s.id); } catch (_) {}
        }
      }
      toast.success('Payment method set to Pay at Counter for this appointment. Settle on arrival.');
      fetchBookings();
    } catch (err) {
      toast.error('Failed to set pay at counter: ' + (err.response?.data?.message || err.message));
    }
  };

  const handlePayOnlineSubmit = async (e) => {
    e.preventDefault();
    if (!paymentModalBooking) return;
    setPayingCard(true);
    try {
      const siblings = paymentModalBooking._siblings || [];
      const primaryAmount = Number(paymentModalBooking.labTest?.price || paymentModalBooking._combinedAmount || 0);

      await payBookingOnline({
        bookingId: paymentModalBooking.id,
        amount: primaryAmount,
        cardHolderName: user?.fullName || 'Patient Cardholder',
        cardNumber: '4242 •••• •••• 4242',
        expiryDate: '12/28',
        cvv: '123',
        patientEmail: user?.email || paymentModalBooking.patientEmail,
      });

      for (const sib of siblings) {
        try {
          await payBookingOnline({
            bookingId: sib.id,
            amount: Number(sib.labTest?.price || 0),
            cardHolderName: user?.fullName || 'Patient Cardholder',
            cardNumber: '4242 •••• •••• 4242',
            expiryDate: '12/28',
            cvv: '123',
            patientEmail: user?.email || sib.patientEmail,
          });
        } catch (err) {
          console.error('Failed paying sibling booking online', sib.id, err);
        }
      }

      toast.success('Payment settled successfully online for this appointment!');
      setPaymentModalBooking(null);
      fetchBookings();
    } catch (err) {
      toast.error('Payment failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setPayingCard(false);
    }
  };

  const handleOpenTracking = (booking, related = []) => {
    if (onTrackBooking) {
      onTrackBooking(booking, related);
    } else {
      setSelectedTrackingBooking(booking);
      setTrackingRelatedBookings(related);
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

  const consolidatedBookings = useMemo(() => {
    if (activeTab === 'RESULTS') {
      return filteredBookings.map(b => ({
        ...b,
        _siblingBookings: [b],
        _isMultiTest: false,
      }));
    }

    const groups = new Map();
    const list = [];

    for (const b of filteredBookings) {
      // Group tests during intake / awaiting payment stage.
      // Once payment is confirmed, separate into individual cards so patient can track each test independently!
      const isPaid = b.paymentStatus === 'PaidOnline' || b.paymentStatus === 'PaidAtCounter';
      const isAwaitingPayment = !isPaid && ['PendingLabApproval', 'PendingPrescriptionUpload', 'PendingAIVerification', 'PendingPayment', 'Confirmed'].includes(b.status);

      if (isAwaitingPayment) {
        const groupKey = `intake_${b.bookingDate || 'no_date'}_${b.timeSlot || 'no_time'}`;
        if (!groups.has(groupKey)) {
          const item = { primary: b, siblings: [b] };
          groups.set(groupKey, item);
          list.push(item);
        } else {
          groups.get(groupKey).siblings.push(b);
        }
      } else {
        // Individual test card once specimen collected or ready
        list.push({ primary: b, siblings: [b] });
      }
    }

    return list.map(g => {
      const slotSiblings = bookings.filter(sb =>
        sb.id !== g.primary.id &&
        sb.bookingDate === g.primary.bookingDate &&
        sb.timeSlot === g.primary.timeSlot
      );

      return {
        ...g.primary,
        _siblingBookings: g.siblings,
        _isMultiTest: g.siblings.length > 1,
        _slotSiblings: slotSiblings,
      };
    });
  }, [filteredBookings, activeTab, bookings]);

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

  const getStatusBadge = (status, technicianNotes) => {
    switch (status) {
      case 'Confirmed':
        return { bg: '#ecfdf5', color: '#059669', label: '✓ Confirmed' };
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
        return { 
          bg: '#fef2f2', 
          color: '#dc2626', 
          label: technicianNotes ? '✗ Cancelled (Prescription Rejected)' : '✗ Cancelled' 
        };
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
      ) : consolidatedBookings.length === 0 ? (
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
          {consolidatedBookings.map(b => {
            const siblingBookings = b._siblingBookings || [b];
            const isMultiTestAppointment = siblingBookings.length > 1;
            const otherSiblings = siblingBookings.filter(s => s.id !== b.id);

            const badge = getStatusBadge(b.status, b.technicianNotes);
            const isCancelledOrRejected = b.status === 'Cancelled' || b.status === 'Rejected';
            const isPending = ['PendingLabApproval', 'PendingPrescriptionUpload', 'PendingAIVerification'].includes(b.status);
            const isPaid = siblingBookings.every(sb => sb.paymentStatus === 'PaidOnline' || sb.paymentStatus === 'PaidAtCounter');
            const isPartiallyPaid = !isPaid && siblingBookings.some(sb => sb.paymentStatus === 'PaidOnline' || sb.paymentStatus === 'PaidAtCounter');
            const isConfirmedUnpaid = b.status === 'Confirmed' && !isPaid;
            const isCounterChosen = siblingBookings.some(sb => sb.paymentMethod === 'CashOnArrival');
            const canCancel = ['PendingLabApproval', 'PendingPrescriptionUpload', 'Confirmed'].includes(b.status) && !isPaid;
            
            const totalAppointmentPrice = siblingBookings.reduce((sum, sb) => 
              sum + Number(sb.labTest?.price || (sb.amountPaid > 0 ? sb.amountPaid : 0)), 0
            );
            const combinedTestNames = siblingBookings.map(sb => sb.labTest?.name || 'Lab Test').join(' + ');

            return (
              <div key={b.id} style={styles.bookingCard}>
                {/* Card Top */}
                <div style={styles.cardHeader}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
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
                    {isMultiTestAppointment && (
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        backgroundColor: '#f3e8ff',
                        color: '#7e22ce',
                        border: '1px solid #d8b4fe',
                        fontSize: '11px',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        <Sparkles size={11} color="#7e22ce" />
                        Combined ({siblingBookings.length} Tests)
                      </span>
                    )}
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={styles.priceMeta}>
                      Rs. {Number(totalAppointmentPrice).toLocaleString()}
                    </div>
                    {isMultiTestAppointment && (
                      <div style={{ fontSize: '10.5px', color: '#64748b', fontWeight: 600 }}>
                        Total for {siblingBookings.length} Tests
                      </div>
                    )}
                  </div>
                </div>

                {/* Test Title / Multi-Test Items */}
                {isMultiTestAppointment ? (
                  <div style={{ marginBottom: '14px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 800, color: '#475569', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Diagnostic Tests in Appointment ({siblingBookings.length})
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {siblingBookings.map(sb => (
                        <div key={sb.id} style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 12px',
                          backgroundColor: '#F8FAFC',
                          borderRadius: '8px',
                          border: '1px solid #E2E8F0'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#059669', flexShrink: 0 }} />
                            <div>
                              <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#0F172A' }}>
                                {sb.labTest?.name || 'Lab Test'}
                              </div>
                              <div style={{ fontSize: '11px', color: '#64748B' }}>
                                Sample: {sb.labTest?.sampleType || 'Specimen'}
                                {sb.labTest?.isRestricted && <span style={{ color: '#D97706', fontWeight: 700, marginLeft: '6px' }}>• Rx Required</span>}
                              </div>
                            </div>
                          </div>
                          <div style={{ fontSize: '13px', fontWeight: 800, color: '#059669' }}>
                            Rs. {Number(sb.labTest?.price || 0).toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div>
                    {b._slotSiblings && b._slotSiblings.length > 0 && (
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        backgroundColor: '#f3e8ff',
                        color: '#7e22ce',
                        border: '1px solid #d8b4fe',
                        fontSize: '11px',
                        fontWeight: 700,
                        marginBottom: '8px',
                      }}>
                        <Sparkles size={11} color="#7e22ce" />
                        <span>Part of Appointment (with {b._slotSiblings.map(s => s.labTest?.name).filter(Boolean).join(', ')})</span>
                      </div>
                    )}
                    <h3 style={styles.testName}>{b.labTest?.name || 'Diagnostic Laboratory Test'}</h3>
                  </div>
                )}

                <div style={styles.metaRow}>
                  <div style={styles.metaItem}>
                    <Calendar size={14} color="#64748b" />
                    <span>{b.bookingDate ? new Date(b.bookingDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : 'Scheduled'}</span>
                  </div>
                  <div style={styles.metaItem}>
                    <Clock size={14} color="#64748b" />
                    <span>{b.timeSlot || '09:00'}</span>
                  </div>
                  {!isMultiTestAppointment && (
                    <div style={styles.metaItem}>
                      <Microscope size={14} color="#059669" />
                      <span>{b.labTest?.sampleType || 'Blood Specimen'}</span>
                    </div>
                  )}
                </div>

                {/* Prescription Required & AI Monitored Tag for single test */}
                {!isMultiTestAppointment && b.labTest?.isRestricted && (
                  <div style={styles.aiTagRow}>
                    <Sparkles size={14} color="#059669" />
                    <span>Doctor Prescription Required & AI Monitored</span>
                  </div>
                )}

                {/* Pending Verification Banner */}
                {isPending && (
                  <div style={{
                    marginTop: '12px',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    backgroundColor: '#FFFBEB',
                    border: '1px solid #FDE68A',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px',
                    fontSize: '12px',
                    color: '#92400E'
                  }}>
                    <Sparkles size={16} color="#D97706" style={{ flexShrink: 0, marginTop: '1px' }} />
                    <div>
                      <strong style={{ fontWeight: 800 }}>Prescription Review in Progress</strong>
                      <div style={{ marginTop: '2px', color: '#78350F', lineHeight: 1.4 }}>
                        Payment options are locked while AI & laboratory staff review your prescription. You will receive an approval email notification once verified.
                      </div>
                    </div>
                  </div>
                )}

                {/* Rejection / Cancellation Reason Banner */}
                {isCancelledOrRejected && b.technicianNotes && (
                  <div style={{
                    marginTop: '12px',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    backgroundColor: '#FEF2F2',
                    border: '1px solid #FECACA',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px',
                    fontSize: '12px',
                    color: '#B91C1C'
                  }}>
                    <AlertCircle size={16} color="#DC2626" style={{ flexShrink: 0, marginTop: '1px' }} />
                    <div>
                      <strong style={{ color: '#991B1B', fontWeight: 800 }}>Reason for Cancellation / Rejection:</strong>
                      <div style={{ marginTop: '2px', color: '#B91C1C', fontWeight: 500 }}>"{b.technicianNotes}"</div>
                      <div style={{ marginTop: '3px', fontSize: '11px', color: '#EF4444' }}>
                        No payment is due and no further actions can be taken for this request.
                      </div>
                    </div>
                  </div>
                )}

                {/* Prescription Approved • Payment Callout */}
                {isConfirmedUnpaid && (
                  <div style={{
                    marginTop: '12px',
                    padding: '12px',
                    borderRadius: '10px',
                    backgroundColor: isCounterChosen ? '#FFFBEB' : '#F0FDF4',
                    border: `1px solid ${isCounterChosen ? '#FDE68A' : '#BBF7D0'}`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <CheckCircle2 size={16} color={isCounterChosen ? '#B45309' : '#059669'} />
                        <span style={{
                          fontSize: '12.5px',
                          fontWeight: 800,
                          color: isCounterChosen ? '#92400E' : '#065F46'
                        }}>
                          {isCounterChosen ? 'Pay at Counter Selected' : 'Prescription Approved • Action Required'}
                        </span>
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: 800, color: isCounterChosen ? '#92400E' : '#047857' }}>
                        Due: Rs. {Number(totalAppointmentPrice).toLocaleString()} {isMultiTestAppointment ? '(Combined)' : ''}
                      </span>
                    </div>

                    <div style={{ fontSize: '11.5px', color: isCounterChosen ? '#78350F' : '#065F46', lineHeight: 1.4 }}>
                      {isCounterChosen
                        ? `You can pay Rs. ${Number(totalAppointmentPrice).toLocaleString()} in cash or card POS at the laboratory counter for all ${siblingBookings.length} tests during sample collection.`
                        : `Your prescription has been approved by laboratory staff! Please choose a payment method below to settle the combined total of Rs. ${Number(totalAppointmentPrice).toLocaleString()} for all tests in this appointment.`}
                    </div>

                    <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                      <button
                        type="button"
                        onClick={() => setPaymentModalBooking({
                          ...b,
                          _combinedAmount: totalAppointmentPrice,
                          _combinedTestNames: combinedTestNames,
                          _siblingCount: siblingBookings.length,
                          _siblings: otherSiblings,
                        })}
                        style={{
                          flex: 1,
                          padding: '7px 12px',
                          borderRadius: '6px',
                          backgroundColor: '#2563EB',
                          color: '#fff',
                          border: 'none',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '5px'
                        }}
                      >
                        <CreditCard size={13} /> Pay Online Now
                      </button>

                      {!isCounterChosen && (
                        <button
                          type="button"
                          onClick={() => handleSelectCounterPayment(b, otherSiblings)}
                          style={{
                            flex: 1,
                            padding: '7px 12px',
                            borderRadius: '6px',
                            backgroundColor: '#fff',
                            color: '#1E40AF',
                            border: '1px solid #93C5FD',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '5px'
                          }}
                        >
                          <DollarSign size={13} /> Pay at Counter
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Card Footer Actions */}
                <div style={styles.cardFooter}>
                  <div style={{
                    fontSize: '12px',
                    color: isPaid ? '#059669' : (isCounterChosen ? '#b45309' : (isPending ? '#d97706' : (isCancelledOrRejected ? '#dc2626' : '#2563eb'))),
                    fontWeight: 700
                  }}>
                    {isPaid
                      ? '✓ Paid Online (Card)'
                      : (isCounterChosen
                          ? '💵 Pay at Counter'
                          : (isPending
                              ? '⏳ Payment Deferred'
                              : (isCancelledOrRejected ? '✗ Order Cancelled' : 'Payment Required')))}
                  </div>

                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {/* Track Sample Button */}
                    <button
                      type="button"
                      style={styles.trackBtn}
                      onClick={() => {
                        const allSlotBookings = (siblingBookings && siblingBookings.length > 1)
                          ? siblingBookings
                          : (b._slotSiblings && b._slotSiblings.length > 0)
                            ? [b, ...b._slotSiblings]
                            : siblingBookings;
                        handleOpenTracking(b, allSlotBookings);
                      }}
                    >
                      <Eye size={14} /> Track Sample
                    </button>

                    {/* Download Report Buttons */}
                    {siblingBookings.map(sb => {
                      const hasReport = Boolean(sb.resultFileUrl) || ['ResultsReady', 'ReportDelivered', 'Completed'].includes(sb.status);
                      if (!hasReport) return null;
                      return (
                        <button
                          key={sb.id}
                          type="button"
                          style={styles.downloadBtn}
                          onClick={() => window.open(sb.resultFileUrl || 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', '_blank')}
                          title={`Download Report for ${sb.labTest?.name}`}
                        >
                          <Download size={14} /> {isMultiTestAppointment ? `${(sb.labTest?.name || 'Test').split(' ')[0]} PDF` : 'PDF Report'}
                        </button>
                      );
                    })}

                    {/* Cancel Button */}
                    {canCancel && (
                      <button
                        type="button"
                        disabled={cancellingId === b.id}
                        style={styles.cancelBtn}
                        onClick={() => handleCancelBooking(b, otherSiblings)}
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
          relatedBookings={trackingRelatedBookings}
          onClose={() => {
            setSelectedTrackingBooking(null);
            setTrackingRelatedBookings([]);
          }}
        />
      )}

      {/* Online Card Payment Modal */}
      {paymentModalBooking && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }} onClick={() => setPaymentModalBooking(null)}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '20px',
            maxWidth: '480px',
            width: '100%',
            padding: '24px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CreditCard size={20} color="#2563EB" />
                <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#0F172A' }}>Online Card Checkout</h3>
              </div>
              <button
                type="button"
                onClick={() => setPaymentModalBooking(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <X size={18} color="#64748B" />
              </button>
            </div>

            <div style={{
              padding: '12px',
              borderRadius: '10px',
              backgroundColor: '#EFF6FF',
              border: '1px solid #BFDBFE',
              marginBottom: '16px'
            }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#1E40AF' }}>
                {paymentModalBooking._combinedTestNames || paymentModalBooking.labTest?.name || 'Laboratory Diagnostic Test'}
              </div>
              <div style={{ fontSize: '12px', color: '#1E3A8A', marginTop: '2px' }}>
                Appointment: {paymentModalBooking.bookingDate} at {paymentModalBooking.timeSlot}
              </div>
              <div style={{ fontSize: '15px', fontWeight: 900, color: '#1D4ED8', marginTop: '6px' }}>
                Amount Due: Rs. {Number(paymentModalBooking._combinedAmount || paymentModalBooking.labTest?.price || 0).toLocaleString()}
                {paymentModalBooking._siblingCount > 1 ? ' (Combined Total)' : ''}
              </div>
            </div>

            <form onSubmit={handlePayOnlineSubmit}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                  Cardholder Name
                </label>
                <input
                  type="text"
                  defaultValue={user?.fullName || 'Patient Cardholder'}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                  required
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                  Card Number
                </label>
                <input
                  type="text"
                  defaultValue="4242 •••• •••• 4242"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    Expires
                  </label>
                  <input
                    type="text"
                    defaultValue="12/28"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                    required
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    CVV
                  </label>
                  <input
                    type="password"
                    defaultValue="123"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setPaymentModalBooking(null)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#fff',
                    color: '#475569',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={payingCard}
                  style={{
                    flex: 2,
                    padding: '10px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#2563EB',
                    color: '#fff',
                    fontSize: '13px',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  {payingCard ? 'Processing...' : `Pay Rs. ${Number(paymentModalBooking._combinedAmount || paymentModalBooking.labTest?.price || 0).toLocaleString()} Now`}
                </button>
              </div>
            </form>
          </div>
        </div>
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
