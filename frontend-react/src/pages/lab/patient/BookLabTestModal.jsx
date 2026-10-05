import React, { useState, useEffect } from 'react';
import { 
  X, Calendar, Clock, Microscope, ShieldCheck, 
  Sparkles, Upload, CreditCard, DollarSign, CheckCircle2, 
  AlertCircle, AlertTriangle, ArrowRight, ArrowLeft, Check, 
  Search, RefreshCw, Plus, Trash2, Lock, Wand2,
  ChevronRight, Receipt, Store, Filter, Info
} from 'lucide-react';
import { createBooking, getSlots, uploadFile, uploadPrescription, getAllTests, payBookingOnline, selectPayAtCounter } from '../../../api/labApi';
import toast from 'react-hot-toast';

const DEFAULT_SLOTS = ['08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00'];

const formatSlotTime = (time) => {
  try {
    const parts = time.split(':');
    const hour = parseInt(parts[0], 10);
    const minute = parts[1] || '00';
    const period = hour >= 12 ? 'PM' : 'AM';
    const formattedHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
    return `${String(formattedHour).padStart(2, '0')}:${minute} ${period}`;
  } catch {
    return time;
  }
};

export default function BookLabTestModal({ 
  test, 
  initialTest, 
  initialTests = [], 
  user, 
  onClose, 
  onSuccess,
  isEmbedded = false, // When used directly as a full tab inside CustomerLabHub
  onViewMyBookings
}) {
  // Step State: 1 = Test Catalogue Selection, 2 = Schedule & Payment, 3 = Confirmation (via confirmedBookings)
  const [currentStep, setCurrentStep] = useState(1);

  // Resolved initial test if passed from external card
  const resolvedInitialTest = (test && test.id) 
    ? test 
    : (initialTest && initialTest.id) 
      ? initialTest 
      : (initialTests.length > 0 && initialTests[0]?.id) 
        ? initialTests[0] 
        : null;

  const [selectedTests, setSelectedTests] = useState(() => {
    if (initialTests && initialTests.length > 0) return initialTests;
    if (resolvedInitialTest) return [resolvedInitialTest];
    return [];
  });

  const [availableTests, setAvailableTests] = useState([]);
  const [loadingTests, setLoadingTests] = useState(false);
  const [testSearch, setTestSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // Date selection (14 days ahead)
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i + 1);
    return d;
  });

  const defaultDateStr = days[0].toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(defaultDateStr);
  const [selectedSlot, setSelectedSlot] = useState('09:00');
  const [slotCapacities, setSlotCapacities] = useState({});
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Prescription Upload state
  const [prescriptionFile, setPrescriptionFile] = useState(null);
  const [prescriptionPreview, setPrescriptionPreview] = useState('');

  // Payment Selection state
  const [paymentOption, setPaymentOption] = useState('OnlineCard'); // 'OnlineCard' | 'CounterCash'
  const [cardHolder, setCardHolder] = useState(user?.fullName || user?.name || 'Dinith Gamage');
  const [cardNumber, setCardNumber] = useState('4242 4242 4242 4242');
  const [cardExpiry, setCardExpiry] = useState('08/29');
  const [cardCvv, setCardCvv] = useState('888');
  const [lastPaymentReceipt, setLastPaymentReceipt] = useState(null);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [confirmedBookings, setConfirmedBookings] = useState(null);

  // Sync prop changes
  useEffect(() => {
    if (test && test.id) {
      setSelectedTests([test]);
    } else if (initialTest && initialTest.id) {
      setSelectedTests([initialTest]);
    }
  }, [test, initialTest]);

  // Load available tests catalogue
  useEffect(() => {
    const fetchTests = async () => {
      setLoadingTests(true);
      try {
        const res = await getAllTests();
        const raw = res?.data || res || [];
        const items = Array.isArray(raw) ? raw : (raw.data || raw.items || []);
        setAvailableTests(items);
      } catch (err) {
        console.warn('Could not load test catalogue:', err);
      } finally {
        setLoadingTests(false);
      }
    };
    fetchTests();
  }, []);

  // Fetch slot capacities on date change
  useEffect(() => {
    if (selectedDate) {
      fetchSlotCapacities(selectedDate);
    }
  }, [selectedDate]);

  const fetchSlotCapacities = async (dateStr) => {
    setLoadingSlots(true);
    try {
      const res = await getSlots(dateStr);
      const data = res?.data || res || [];
      if (Array.isArray(data)) {
        const caps = {};
        data.forEach(s => {
          const t = s.time ? s.time.substring(0, 5) : s.slotTime;
          const max = Number(s.maxCapacity ?? 5);
          const current = Number(s.currentBookings ?? 0);
          if (t) caps[t] = Math.max(0, max - current);
        });
        setSlotCapacities(caps);
      }
    } catch {
      setSlotCapacities({
        '08:00': 5, '09:00': 4, '10:00': 5, '11:00': 5,
        '13:00': 5, '14:00': 4, '15:00': 5, '16:00': 5
      });
    } finally {
      setLoadingSlots(false);
    }
  };

  const getAvailableCount = (time) => {
    return slotCapacities[time] ?? 5;
  };

  const requiresPrescription = selectedTests.some(t => Boolean(t.isRestricted || t.prescriptionRequired));
  const totalPrice = selectedTests.reduce((sum, t) => sum + Number(t.price || 0), 0);

  // Toggle selection of a test in catalogue
  const handleToggleAddTest = (testItem) => {
    setSelectedTests(prev => {
      const exists = prev.some(t => t.id === testItem.id);
      if (exists) {
        return prev.filter(t => t.id !== testItem.id);
      } else {
        return [...prev, testItem];
      }
    });
  };

  const handleRemoveTest = (id) => {
    setSelectedTests(prev => prev.filter(t => t.id !== id));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPrescriptionFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPrescriptionPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFillDemoCard = () => {
    setCardHolder('Dinith Gamage');
    setCardNumber('4242 4242 4242 4242');
    setCardExpiry('08/29');
    setCardCvv('888');
    toast.success('Demo Visa Card Autofilled!');
  };

  const handleProceedToSchedule = () => {
    if (selectedTests.length === 0) {
      toast.error('Please select at least one laboratory diagnostic test.');
      return;
    }
    setCurrentStep(2);
    const bodyEl = document.getElementById('book-lab-scroll-body');
    if (bodyEl) bodyEl.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToCatalogue = () => {
    setCurrentStep(1);
    const bodyEl = document.getElementById('book-lab-scroll-body');
    if (bodyEl) bodyEl.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleConfirmBooking = async () => {
    if (selectedTests.length === 0) {
      toast.error('Please select at least one laboratory diagnostic test.');
      setCurrentStep(1);
      return;
    }
    if (!selectedDate) {
      toast.error('Please select an appointment date.');
      return;
    }
    if (!selectedSlot) {
      toast.error('Please select a time slot.');
      return;
    }

    if (requiresPrescription && !prescriptionPreview && !prescriptionFile) {
      toast.error('One or more restricted tests require a doctor prescription document.');
      return;
    }

    if (!requiresPrescription && paymentOption === 'OnlineCard') {
      const cleanCard = cardNumber.replace(/\s+/g, '');
      if (cleanCard.length < 12) {
        toast.error('Please enter a valid card number.');
        return;
      }
      if (!cardExpiry.trim()) {
        toast.error('Please enter card expiry date (MM/YY).');
        return;
      }
      if (cardCvv.trim().length < 3) {
        toast.error('Please enter a valid 3-digit CVV.');
        return;
      }
    }

    setSubmitting(true);
    try {
      const parsedPatientId = parseInt(user?.id || user?.userId) || 1;
      const patientName = user?.fullName || user?.name || 'Patient';
      const patientEmail = (user?.email && user.email.includes('@')) ? user.email : 'patient@healthbridge.lk';
      const formattedTime = selectedSlot.length === 5 ? `${selectedSlot}:00` : selectedSlot;

      let uploadedRxUrl = null;
      if (prescriptionFile) {
        try {
          const upRes = await uploadFile(prescriptionFile);
          uploadedRxUrl = upRes.data?.url || upRes.data?.fileUrl || null;
        } catch (err) {
          console.warn('Prescription file upload failed, using fallback base64 preview:', err);
          uploadedRxUrl = prescriptionPreview;
        }
      } else if (prescriptionPreview) {
        uploadedRxUrl = prescriptionPreview;
      }

      const createdBookings = [];
      let lastReceipt = null;

      for (const testItem of selectedTests) {
        const payload = {
          labTestId: testItem.id,
          patientId: parsedPatientId,
          patientName,
          patientEmail,
          bookingDate: selectedDate,
          timeSlot: formattedTime,
        };

        const res = await createBooking(payload);
        let booking = res.data;

        if (testItem.isRestricted && uploadedRxUrl) {
          try {
            const rxRes = await uploadPrescription(booking.id, uploadedRxUrl);
            booking = rxRes.data || booking;
          } catch (rxErr) {
            console.warn('Prescription upload to booking failed:', rxErr);
          }
        }

        if (!requiresPrescription) {
          if (paymentOption === 'OnlineCard') {
            try {
              const payRes = await payBookingOnline({
                bookingId: booking.id,
                amount: Number(testItem.price || 0),
                cardHolderName: cardHolder.trim() || 'Cardholder',
                cardNumber: cardNumber.replace(/\s+/g, ''),
                expiryDate: cardExpiry.trim(),
                cvv: cardCvv.trim(),
                patientEmail,
              });
              lastReceipt = payRes.data;
            } catch (payErr) {
              console.error('Online payment error:', payErr);
              toast.error(`Payment notice for ${testItem.name}: ${payErr.response?.data?.message || payErr.message}. Saved with counter payment.`);
            }
          } else {
            try {
              await selectPayAtCounter(booking.id);
            } catch (_) {}
          }
        }

        createdBookings.push(booking);
      }

      setLastPaymentReceipt(lastReceipt);
      setConfirmedBookings(createdBookings);
      toast.success(
        createdBookings.length > 1
          ? `Successfully scheduled ${createdBookings.length} laboratory tests!`
          : 'Laboratory appointment scheduled successfully!'
      );

      if (onSuccess) {
        onSuccess(createdBookings[0], createdBookings);
      }
    } catch (err) {
      console.error('Booking submission error:', err);
      toast.error(err.response?.data?.message || 'Could not schedule laboratory booking. Please check slot availability.');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter available tests by search and category
  const filteredAvailableTests = availableTests.filter(t => {
    const query = testSearch.trim().toLowerCase();
    const matchesSearch = !query || 
      (t.name && t.name.toLowerCase().includes(query)) ||
      (t.category && t.category.toLowerCase().includes(query)) ||
      (t.code && t.code.toLowerCase().includes(query)) ||
      (t.description && t.description.toLowerCase().includes(query));
    const matchesCat = selectedCategory === 'ALL' || t.category?.toUpperCase() === selectedCategory.toUpperCase();
    return matchesSearch && matchesCat;
  });

  const categories = ['ALL', ...Array.from(new Set(availableTests.map(t => t.category).filter(Boolean)))];

  // ─── RENDER: CONFIRMATION STATE ─────────────────────────────────────────────
  if (confirmedBookings && confirmedBookings.length > 0) {
    const firstBooking = confirmedBookings[0];
    const isMulti = confirmedBookings.length > 1;

    return (
      <div style={isEmbedded ? styles.embeddedContainer : styles.overlay}>
        <div style={isEmbedded ? styles.embeddedCard : styles.modalCard}>
          <div style={{ padding: '36px 32px', textAlign: 'center' }}>
            <div style={{
              width: '76px',
              height: '76px',
              borderRadius: '50%',
              backgroundColor: '#D1FAE5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 18px',
            }}>
              <CheckCircle2 size={42} color="#059669" />
            </div>

            <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A', marginBottom: '8px' }}>
              Appointments Scheduled!
            </h2>

            <p style={{ fontSize: '13.5px', color: '#64748B', maxWidth: '460px', margin: '0 auto 18px', lineHeight: 1.5 }}>
              {requiresPrescription
                ? 'Your doctor prescription has been submitted. Gemini Vision AI and certified laboratory pathologists are reviewing it now.'
                : 'Your laboratory appointment is confirmed! Please visit our clinical phlebotomy counter at your scheduled time.'}
            </p>

            {/* Token & Payment Badge */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '22px' }}>
              <div style={{
                padding: '8px 14px',
                borderRadius: '10px',
                backgroundColor: '#F1F5F9',
                border: '1px solid #E2E8F0',
                fontSize: '13px',
                fontWeight: 800,
                color: '#0F172A',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <Receipt size={16} color="#059669" />
                Token #{firstBooking.tokenNumber || firstBooking.bookingNumber || 'LAB-APPT'}
                {isMulti && ` (${confirmedBookings.length} Tests)`}
              </div>

              {paymentOption === 'OnlineCard' && lastPaymentReceipt && (
                <div style={{
                  padding: '8px 14px',
                  borderRadius: '10px',
                  backgroundColor: '#ECFDF5',
                  border: '1px solid #A7F3D0',
                  fontSize: '13px',
                  fontWeight: 800,
                  color: '#065F46',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <Check size={16} color="#059669" />
                  Paid Online: #{lastPaymentReceipt.receiptNumber || 'RCP'}
                </div>
              )}

              {paymentOption === 'CounterCash' && !requiresPrescription && (
                <div style={{
                  padding: '8px 14px',
                  borderRadius: '10px',
                  backgroundColor: '#FFFBEB',
                  border: '1px solid #FDE68A',
                  fontSize: '13px',
                  fontWeight: 800,
                  color: '#92400E',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <Store size={16} color="#D97706" />
                  Payment: Settle at Counter on Arrival
                </div>
              )}
            </div>

            {/* Buttons Row */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', maxWidth: '420px', margin: '0 auto' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  flex: 1,
                  padding: '12px 18px',
                  borderRadius: '12px',
                  border: '1px solid #CBD5E1',
                  backgroundColor: '#FFFFFF',
                  color: '#0F172A',
                  fontSize: '13.5px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Back to Lab
              </button>

              <button
                type="button"
                onClick={() => {
                  if (onViewMyBookings) {
                    onViewMyBookings();
                  } else if (onClose) {
                    onClose();
                  }
                }}
                style={{
                  flex: 1,
                  padding: '12px 18px',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #059669, #0D9488)',
                  color: '#FFFFFF',
                  fontSize: '13.5px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(5, 150, 105, 0.35)'
                }}
              >
                Track Booking
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── RENDER MAIN MODAL / EMBEDDED VIEW ──────────────────────────────────────
  return (
    <div style={isEmbedded ? styles.embeddedContainer : styles.overlay}>
      <div style={isEmbedded ? styles.embeddedCard : styles.modalCard}>
        
        {/* Header */}
        <div style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={styles.headerIcon}>
              <Microscope size={22} color="#059669" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={styles.headerTitle}>
                  {currentStep === 1 ? '1. Select Diagnostic Tests' : '2. Schedule & Payment'}
                </h2>
                <span style={styles.stepBadge}>
                  Step {currentStep} of 2
                </span>
              </div>
              <p style={styles.headerSubtitle}>
                {currentStep === 1
                  ? 'Choose diagnostic tests from our full clinical catalogue, then proceed to schedule'
                  : 'Choose appointment date, time window, upload prescription if required, and payment'}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {currentStep === 2 && (
              <button
                type="button"
                onClick={handleBackToCatalogue}
                style={styles.backToCatBtn}
              >
                <ArrowLeft size={14} /> Back to Catalogue
              </button>
            )}

            {!isEmbedded && (
              <button style={styles.closeBtn} onClick={onClose} aria-label="Close">
                <X size={20} color="#64748B" />
              </button>
            )}
          </div>
        </div>

        {/* Content Body Scrollable */}
        <div id="book-lab-scroll-body" style={styles.body}>

          {/* ═══════════════════════════════════════════════════════════════════
              STEP 1: FULL TEST CATALOGUE WITH SEARCH & CATEGORY FILTERS
          ═══════════════════════════════════════════════════════════════════ */}
          {currentStep === 1 && (
            <div>
              {/* Search Bar */}
              <div style={styles.searchBox}>
                <Search size={18} color="#059669" style={{ flexShrink: 0 }} />
                <input
                  type="text"
                  placeholder="Search diagnostic tests by name, category, or code (e.g., FBC, Lipid, Urine)..."
                  value={testSearch}
                  onChange={e => setTestSearch(e.target.value)}
                  style={styles.searchInput}
                />
                {testSearch && (
                  <button
                    type="button"
                    onClick={() => setTestSearch('')}
                    style={styles.searchClearBtn}
                  >
                    <X size={14} color="#64748B" />
                  </button>
                )}
              </div>

              {/* Category Filter Pills */}
              <div style={styles.categoryPillsRow}>
                {categories.map(cat => {
                  const isActive = selectedCategory.toUpperCase() === cat.toUpperCase();
                  const count = cat === 'ALL'
                    ? availableTests.length
                    : availableTests.filter(t => t.category?.toUpperCase() === cat.toUpperCase()).length;

                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      style={{
                        ...styles.catFilterPill,
                        backgroundColor: isActive ? '#059669' : '#FFFFFF',
                        color: isActive ? '#FFFFFF' : '#475569',
                        borderColor: isActive ? '#059669' : '#CBD5E1',
                        fontWeight: isActive ? 800 : 600,
                        boxShadow: isActive ? '0 2px 8px rgba(5, 150, 105, 0.28)' : 'none'
                      }}
                    >
                      {cat === 'ALL' ? 'All Tests' : cat} ({count})
                    </button>
                  );
                })}
              </div>

              {/* Quick Status / Info Bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#475569' }}>
                  Available Tests ({filteredAvailableTests.length})
                </span>
                <span style={{ fontSize: '12px', color: '#64748B' }}>
                  Click any test card or select button to add to your appointment
                </span>
              </div>

              {/* Tests Grid */}
              {loadingTests ? (
                <div style={{ padding: '60px 0', textAlign: 'center', color: '#64748B' }}>
                  <RefreshCw size={26} className="animate-spin" style={{ margin: '0 auto 12px', color: '#059669' }} />
                  <div style={{ fontSize: '14px', fontWeight: 600 }}>Loading laboratory tests catalogue...</div>
                </div>
              ) : filteredAvailableTests.length === 0 ? (
                <div style={styles.emptyTestsBox}>
                  <AlertCircle size={32} color="#94A3B8" style={{ marginBottom: '10px' }} />
                  <div style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', marginBottom: '4px' }}>
                    No Tests Found
                  </div>
                  <div style={{ fontSize: '13px', color: '#64748B' }}>
                    Try searching with another keyword or select "All Tests" category.
                  </div>
                </div>
              ) : (
                <div style={styles.catalogGrid}>
                  {filteredAvailableTests.map(testItem => {
                    const isSelected = selectedTests.some(t => t.id === testItem.id);
                    return (
                      <div
                        key={testItem.id}
                        onClick={() => handleToggleAddTest(testItem)}
                        style={{
                          ...styles.testCatalogueCard,
                          borderColor: isSelected ? '#059669' : '#E2E8F0',
                          backgroundColor: isSelected ? '#F0FDF4' : '#FFFFFF',
                          boxShadow: isSelected
                            ? '0 6px 18px rgba(5, 150, 105, 0.15)'
                            : '0 2px 6px rgba(0, 0, 0, 0.03)',
                        }}
                      >
                        {/* Top Badges Row */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '10px' }}>
                          <span style={styles.testCategoryTag}>
                            {testItem.category || 'Diagnostic'}
                          </span>

                          {testItem.isRestricted ? (
                            <span style={styles.rxBadge}>
                              <AlertTriangle size={11} /> Rx Required
                            </span>
                          ) : (
                            <span style={styles.directBadge}>
                              <ShieldCheck size={11} /> Direct Access
                            </span>
                          )}
                        </div>

                        {/* Title & Code */}
                        <h4 style={styles.testNameTitle}>
                          {testItem.name}
                        </h4>

                        {/* Description & Clinical Specs */}
                        <p style={styles.testDescSnippet}>
                          {testItem.description || 'Clinical diagnostic blood or specimen assessment.'}
                        </p>

                        <div style={styles.testSpecsRow}>
                          <span>Sample: <strong>{testItem.sampleType || 'Blood'}</strong></span>
                          <span>Turnaround: <strong>{testItem.turnaroundTime || '24h'}</strong></span>
                        </div>

                        {/* Price & Selection Button */}
                        <div style={styles.testCardBottomRow}>
                          <div>
                            <div style={{ fontSize: '10px', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase' }}>Price</div>
                            <div style={styles.testPriceText}>
                              LKR {Number(testItem.price || 0).toLocaleString()}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleAddTest(testItem);
                            }}
                            style={{
                              ...styles.selectToggleBtn,
                              backgroundColor: isSelected ? '#059669' : '#F1F5F9',
                              color: isSelected ? '#FFFFFF' : '#0F172A',
                              borderColor: isSelected ? '#059669' : '#CBD5E1',
                            }}
                          >
                            {isSelected ? (
                              <>
                                <Check size={14} strokeWidth={3} /> Selected
                              </>
                            ) : (
                              <>
                                <Plus size={14} /> Select Test
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              STEP 2: SCHEDULE, PRESCRIPTION, & PAYMENT (MOBILE-ALIGNED VIEW)
          ═══════════════════════════════════════════════════════════════════ */}
          {currentStep === 2 && (
            <div>
              {/* Selected Diagnostic Tests Summary Box */}
              <div style={styles.selectedReviewCard}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Microscope size={18} color="#059669" />
                    <span style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>
                      Selected Diagnostic Tests ({selectedTests.length})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleBackToCatalogue}
                    style={styles.addMoreTestsBtn}
                  >
                    <Plus size={13} /> Add / Change Tests
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selectedTests.map((t, idx) => (
                    <div key={t.id || idx} style={styles.selectedReviewItem}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#059669' }} />
                        <div>
                          <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A' }}>{t.name}</span>
                          <span style={{ fontSize: '11px', color: '#64748B', marginLeft: '8px' }}>({t.category})</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '13.5px', fontWeight: 800, color: '#059669' }}>
                          LKR {Number(t.price || 0).toLocaleString()}
                        </span>
                        {selectedTests.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveTest(t.id)}
                            style={styles.removeBtn}
                            title="Remove test"
                          >
                            <Trash2 size={14} color="#EF4444" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 1. SELECT APPOINTMENT DATE (Horizontal Carousel) */}
              <div style={{ marginBottom: '24px' }}>
                <div style={styles.sectionHeading}>1. Select Appointment Date</div>
                <div style={styles.dateCarousel}>
                  {days.map(d => {
                    const dateStr = d.toISOString().split('T')[0];
                    const isSelected = selectedDate === dateStr;
                    const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
                    const dayNum = d.getDate();

                    return (
                      <button
                        key={dateStr}
                        type="button"
                        onClick={() => {
                          setSelectedDate(dateStr);
                          setSelectedSlot('09:00');
                        }}
                        style={{
                          ...styles.datePill,
                          borderColor: isSelected ? '#059669' : '#E2E8F0',
                          backgroundColor: isSelected ? '#059669' : '#FFFFFF',
                          color: isSelected ? '#FFFFFF' : '#0F172A',
                          boxShadow: isSelected ? '0 4px 14px rgba(5, 150, 105, 0.35)' : 'none',
                        }}
                      >
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          color: isSelected ? '#D1FAE5' : '#64748B'
                        }}>
                          {weekday}
                        </span>
                        <span style={{
                          fontSize: '18px',
                          fontWeight: 800,
                          color: isSelected ? '#FFFFFF' : '#0F172A',
                          marginTop: '2px'
                        }}>
                          {dayNum}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. SELECT TIME SLOT & ACTIVE CAPACITY BANNER */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={styles.sectionHeading}>2. Select Time Window</div>
                  {loadingSlots && (
                    <span style={{ fontSize: '11.5px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <RefreshCw size={12} className="animate-spin" /> checking capacity...
                    </span>
                  )}
                </div>

                {/* Capacity Banner */}
                {selectedSlot && (
                  <div style={styles.capacityBanner}>
                    <Clock size={16} color="#059669" />
                    <span>
                      Window Capacity: <strong>{getAvailableCount(selectedSlot)}/5 slots available</strong> at {formatSlotTime(selectedSlot)}
                    </span>
                  </div>
                )}

                {/* Slots Grid */}
                <div style={styles.slotsGrid}>
                  {DEFAULT_SLOTS.map(time => {
                    const isSelected = selectedSlot === time;
                    const available = getAvailableCount(time);
                    const isFull = available <= 0;

                    return (
                      <button
                        key={time}
                        type="button"
                        disabled={isFull}
                        onClick={() => setSelectedSlot(time)}
                        style={{
                          ...styles.slotBtn,
                          borderColor: isSelected ? '#059669' : (isFull ? '#F1F5F9' : '#E2E8F0'),
                          backgroundColor: isSelected ? '#059669' : (isFull ? '#F8FAFC' : '#FFFFFF'),
                          color: isSelected ? '#FFFFFF' : (isFull ? '#94A3B8' : '#0F172A'),
                          boxShadow: isSelected ? '0 4px 12px rgba(5, 150, 105, 0.25)' : 'none',
                          cursor: isFull ? 'not-allowed' : 'pointer',
                          opacity: isFull ? 0.6 : 1
                        }}
                      >
                        <span style={{ fontSize: '13px', fontWeight: 800 }}>
                          {formatSlotTime(time)}
                        </span>
                        <span style={{
                          fontSize: '10.5px',
                          fontWeight: 700,
                          color: isSelected ? '#D1FAE5' : (isFull ? '#EF4444' : '#059669'),
                          marginTop: '2px'
                        }}>
                          {isFull ? 'Full' : `${available} left`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. DOCTOR'S PRESCRIPTION (Appears ONLY for Rx Required Tests) */}
              {requiresPrescription && (
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={styles.sectionHeading}>
                      3. Doctor's Prescription
                      <span style={{ color: '#EF4444', marginLeft: '4px' }}>* Required</span>
                    </div>
                    <span style={styles.aiTag}>
                      <Sparkles size={13} color="#059669" /> Gemini Vision AI
                    </span>
                  </div>

                  <div style={styles.rxWarningBanner}>
                    <AlertTriangle size={18} color="#D97706" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div style={{ fontSize: '12.5px', color: '#92400E', lineHeight: 1.45 }}>
                      <strong>Prescription Required:</strong> One or more selected diagnostic tests require a doctor referral. Our clinical AI and laboratory pathologists will verify your prescription prior to phlebotomy collection.
                    </div>
                  </div>

                  {/* Upload or Preview Box */}
                  {!prescriptionPreview ? (
                    <label style={styles.uploadDropzone}>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={handleFileChange}
                        style={{ display: 'none' }}
                      />
                      <div style={styles.uploadIconCircle}>
                        <Upload size={22} color="#059669" />
                      </div>
                      <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A', marginBottom: '4px' }}>
                        Click to browse or drag prescription image
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748B' }}>
                        Supports PNG, JPG, or PDF (Max 10MB)
                      </div>
                    </label>
                  ) : (
                    <div style={styles.previewContainer}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <img
                          src={prescriptionPreview}
                          alt="Prescription preview"
                          style={styles.previewImage}
                        />
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A' }}>
                            Prescription Attached
                          </div>
                          <div style={{ fontSize: '11.5px', color: '#059669', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '3px' }}>
                            <CheckCircle2 size={13} /> Ready for Gemini Vision Screening
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setPrescriptionFile(null);
                          setPrescriptionPreview('');
                        }}
                        style={styles.changeRxBtn}
                      >
                        Change
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* PAYMENT METHOD */}
              <div style={{ marginBottom: '24px' }}>
                <div style={styles.sectionHeading}>
                  {requiresPrescription ? '4. Choose Payment Method' : '3. Choose Payment Method'}
                </div>

                {requiresPrescription ? (
                  <div style={styles.paymentDeferralNotice}>
                    <AlertCircle size={18} color="#0D9488" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div style={{ fontSize: '12.5px', color: '#115E59', lineHeight: 1.45 }}>
                      <strong>Payment Deferred:</strong> Since your test requires prescription verification, no payment is required now. You can settle the fee online once verified or at our reception counter on appointment day.
                    </div>
                  </div>
                ) : (
                  <div style={styles.paymentOptionsRow}>
                    {/* Pay Online Tile */}
                    <div
                      onClick={() => setPaymentOption('OnlineCard')}
                      style={{
                        ...styles.paymentOptionTile,
                        borderColor: paymentOption === 'OnlineCard' ? '#059669' : '#E2E8F0',
                        backgroundColor: paymentOption === 'OnlineCard' ? '#ECFDF5' : '#FFFFFF',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          ...styles.paymentTileIcon,
                          backgroundColor: paymentOption === 'OnlineCard' ? '#059669' : '#F1F5F9',
                          color: paymentOption === 'OnlineCard' ? '#FFFFFF' : '#475569',
                        }}>
                          <CreditCard size={20} />
                        </div>
                        <div>
                          <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#0F172A' }}>Pay Online</div>
                          <div style={{ fontSize: '11.5px', color: '#64748B' }}>Credit / Debit Card</div>
                        </div>
                      </div>
                      <div style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        border: `2px solid ${paymentOption === 'OnlineCard' ? '#059669' : '#CBD5E1'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        {paymentOption === 'OnlineCard' && (
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#059669' }} />
                        )}
                      </div>
                    </div>

                    {/* Pay at Counter Tile */}
                    <div
                      onClick={() => setPaymentOption('CounterCash')}
                      style={{
                        ...styles.paymentOptionTile,
                        borderColor: paymentOption === 'CounterCash' ? '#059669' : '#E2E8F0',
                        backgroundColor: paymentOption === 'CounterCash' ? '#ECFDF5' : '#FFFFFF',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          ...styles.paymentTileIcon,
                          backgroundColor: paymentOption === 'CounterCash' ? '#059669' : '#F1F5F9',
                          color: paymentOption === 'CounterCash' ? '#FFFFFF' : '#475569',
                        }}>
                          <Store size={20} />
                        </div>
                        <div>
                          <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#0F172A' }}>Pay at Counter</div>
                          <div style={{ fontSize: '11.5px', color: '#64748B' }}>Cash or POS on Arrival</div>
                        </div>
                      </div>
                      <div style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        border: `2px solid ${paymentOption === 'CounterCash' ? '#059669' : '#CBD5E1'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        {paymentOption === 'CounterCash' && (
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#059669' }} />
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* If Online Card Selected & Not Deferred -> Card Input Form */}
                {!requiresPrescription && paymentOption === 'OnlineCard' && (
                  <div style={styles.cardFormContainer}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                      <span style={{ fontSize: '12.5px', fontWeight: 800, color: '#0F172A' }}>
                        Enter Card Details (Demo Mode)
                      </span>
                      <button
                        type="button"
                        onClick={handleFillDemoCard}
                        style={styles.demoFillBtn}
                      >
                        <Wand2 size={13} /> Fill Demo Card
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div>
                        <label style={styles.fieldLabel}>Cardholder Name</label>
                        <input
                          type="text"
                          value={cardHolder}
                          onChange={e => setCardHolder(e.target.value)}
                          placeholder="e.g. Dinith Gamage"
                          style={styles.formInput}
                        />
                      </div>

                      <div>
                        <label style={styles.fieldLabel}>Card Number</label>
                        <input
                          type="text"
                          value={cardNumber}
                          onChange={e => setCardNumber(e.target.value)}
                          placeholder="4242 •••• •••• 4242"
                          style={styles.formInput}
                        />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <div>
                          <label style={styles.fieldLabel}>Expiry (MM/YY)</label>
                          <input
                            type="text"
                            value={cardExpiry}
                            onChange={e => setCardExpiry(e.target.value)}
                            placeholder="08/29"
                            style={styles.formInput}
                          />
                        </div>
                        <div>
                          <label style={styles.fieldLabel}>CVV</label>
                          <input
                            type="password"
                            maxLength={4}
                            value={cardCvv}
                            onChange={e => setCardCvv(e.target.value)}
                            placeholder="888"
                            style={styles.formInput}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {!requiresPrescription && paymentOption === 'CounterCash' && (
                  <div style={styles.counterNoticeBox}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <ShieldCheck size={20} color="#059669" />
                      <span style={{ fontSize: '12.5px', color: '#065F46', fontWeight: 600 }}>
                        Your slot will be reserved immediately. You can pay at the phlebotomy reception desk via Cash or Card on arrival.
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* 5. SUMMARY & BREAKDOWN CARD */}
              <div style={styles.summaryCard}>
                {selectedSlot && (
                  <div style={styles.summaryRow}>
                    <span style={styles.summaryLabel}>Scheduled Slot</span>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#065F46' }}>
                      {formatSlotTime(selectedSlot)} ({getAvailableCount(selectedSlot)} available)
                    </span>
                  </div>
                )}

                <div style={styles.summaryRow}>
                  <span style={styles.summaryLabel}>Total Test Charges ({selectedTests.length} Tests)</span>
                  <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A' }}>
                    LKR {totalPrice.toLocaleString()}
                  </span>
                </div>

                <div style={styles.summaryRow}>
                  <span style={styles.summaryLabel}>AI Clinical Screening & Booking</span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#059669' }}>FREE</span>
                </div>

                <div style={styles.summaryDivider} />

                <div style={{ ...styles.summaryRow, marginBottom: 0 }}>
                  <span style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>
                    Total Amount Payable Now
                  </span>
                  <span style={{
                    fontSize: '18px',
                    fontWeight: 900,
                    color: requiresPrescription ? '#D97706' : '#059669',
                  }}>
                    {requiresPrescription ? 'LKR 0 (Deferred)' : `LKR ${totalPrice.toLocaleString()}`}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            FOOTER ACTION BUTTONS
        ═══════════════════════════════════════════════════════════════════ */}
        <div style={styles.footerBar}>
          {currentStep === 1 ? (
            /* STEP 1 FOOTER: SELECTED TESTS COUNT & PROCEED TO NEXT */
            <div style={styles.catalogueFooterRow}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#0F172A' }}>
                    {selectedTests.length} {selectedTests.length === 1 ? 'Test' : 'Tests'} Selected
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 900, color: '#059669' }}>
                    Total: LKR {totalPrice.toLocaleString()}
                  </div>
                </div>

                {/* Chips Preview of Selected Tests */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', maxWidth: '380px' }}>
                  {selectedTests.slice(0, 3).map(t => (
                    <span key={t.id} style={styles.miniSelectedChip}>
                      {t.name}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveTest(t.id);
                        }}
                        style={styles.miniChipRemoveBtn}
                        title="Remove"
                      >
                        <X size={11} />
                      </button>
                    </span>
                  ))}
                  {selectedTests.length > 3 && (
                    <span style={styles.miniMoreChip}>
                      +{selectedTests.length - 3} more
                    </span>
                  )}
                </div>
              </div>

              <button
                type="button"
                disabled={selectedTests.length === 0}
                onClick={handleProceedToSchedule}
                style={{
                  ...styles.proceedNextBtn,
                  opacity: selectedTests.length === 0 ? 0.5 : 1,
                  cursor: selectedTests.length === 0 ? 'not-allowed' : 'pointer',
                  boxShadow: selectedTests.length > 0 ? '0 4px 16px rgba(5, 150, 105, 0.35)' : 'none',
                }}
              >
                <span>Next: Schedule Appointment</span>
                <ArrowRight size={18} />
              </button>
            </div>
          ) : (
            /* STEP 2 FOOTER: BACK TO CATALOGUE & SUBMIT BOOKING */
            <div style={styles.scheduleFooterRow}>
              <button
                type="button"
                onClick={handleBackToCatalogue}
                style={styles.backBtn}
              >
                <ArrowLeft size={16} /> Back to Tests
              </button>

              <button
                type="button"
                disabled={submitting}
                onClick={handleConfirmBooking}
                style={{
                  ...styles.submitBtn,
                  opacity: submitting ? 0.7 : 1,
                  cursor: submitting ? 'not-allowed' : 'pointer'
                }}
              >
                {submitting ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                    <RefreshCw size={18} className="animate-spin" /> Scheduling Appointment...
                  </span>
                ) : (
                  requiresPrescription ? 'Submit for Prescription Verification' : 'Confirm Lab Appointments'
                )}
              </button>
            </div>
          )}
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
    backdropFilter: 'blur(5px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: '20px',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: '24px',
    maxWidth: '920px',
    width: '100%',
    maxHeight: '92vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    border: '1px solid #E2E8F0',
  },
  embeddedContainer: {
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '32px',
  },
  embeddedCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: '24px',
    maxWidth: '960px',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 8px 30px rgba(15, 23, 42, 0.08)',
    border: '1.5px solid #E2E8F0',
  },
  header: {
    padding: '20px 28px',
    borderBottom: '1px solid #F1F5F9',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  headerIcon: {
    width: '42px',
    height: '42px',
    borderRadius: '12px',
    backgroundColor: '#ECFDF5',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  headerTitle: {
    fontSize: '18px',
    fontWeight: 800,
    color: '#0F172A',
    margin: 0,
  },
  headerSubtitle: {
    fontSize: '12.5px',
    color: '#64748B',
    margin: '3px 0 0',
  },
  stepBadge: {
    padding: '2px 8px',
    borderRadius: '6px',
    backgroundColor: '#ECFDF5',
    color: '#059669',
    fontSize: '11px',
    fontWeight: 800,
    border: '1px solid #A7F3D0',
  },
  backToCatBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '7px 12px',
    borderRadius: '8px',
    border: '1px solid #CBD5E1',
    backgroundColor: '#F8FAFC',
    color: '#475569',
    fontSize: '12px',
    fontWeight: 700,
    cursor: 'pointer',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '6px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    padding: '24px 28px',
    overflowY: 'auto',
    flex: 1,
    maxHeight: '68vh',
  },
  // Step 1 Search & Category Styles
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 16px',
    borderRadius: '14px',
    border: '1.5px solid #CBD5E1',
    backgroundColor: '#F8FAFC',
    marginBottom: '16px',
  },
  searchInput: {
    flex: 1,
    border: 'none',
    outline: 'none',
    backgroundColor: 'transparent',
    fontSize: '13.5px',
    color: '#0F172A',
    fontWeight: 500,
  },
  searchClearBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryPillsRow: {
    display: 'flex',
    gap: '8px',
    overflowX: 'auto',
    paddingBottom: '8px',
    marginBottom: '18px',
  },
  catFilterPill: {
    padding: '6px 14px',
    borderRadius: '20px',
    fontSize: '12px',
    border: '1px solid #CBD5E1',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.2s ease',
  },
  emptyTestsBox: {
    padding: '50px 20px',
    textAlign: 'center',
    borderRadius: '16px',
    border: '1.5px dashed #CBD5E1',
    backgroundColor: '#F8FAFC',
  },
  catalogGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
    gap: '16px',
    marginBottom: '20px',
  },
  testCatalogueCard: {
    borderRadius: '16px',
    border: '1.5px solid #E2E8F0',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  testCategoryTag: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: '6px',
    backgroundColor: '#E0F2FE',
    color: '#0369A1',
    fontSize: '10.5px',
    fontWeight: 800,
  },
  rxBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '3px',
    padding: '2px 7px',
    borderRadius: '6px',
    backgroundColor: '#FEF3C7',
    color: '#B45309',
    fontSize: '10.5px',
    fontWeight: 800,
  },
  directBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '3px',
    padding: '2px 7px',
    borderRadius: '6px',
    backgroundColor: '#ECFDF5',
    color: '#065F46',
    fontSize: '10.5px',
    fontWeight: 800,
  },
  testNameTitle: {
    fontSize: '14.5px',
    fontWeight: 800,
    color: '#0F172A',
    margin: '0 0 6px',
    lineHeight: 1.35,
  },
  testDescSnippet: {
    fontSize: '12px',
    color: '#64748B',
    lineHeight: 1.4,
    margin: '0 0 10px',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
  testSpecsRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '11px',
    color: '#64748B',
    marginBottom: '12px',
    padding: '6px 8px',
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderRadius: '8px',
  },
  testCardBottomRow: {
    borderTop: '1px solid #E2E8F0',
    paddingTop: '10px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  testPriceText: {
    fontSize: '15px',
    fontWeight: 900,
    color: '#059669',
  },
  selectToggleBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '6px 12px',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: 800,
    border: '1px solid #CBD5E1',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  // Step 2 Review Card Styles
  selectedReviewCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: '16px',
    border: '1px solid #E2E8F0',
    padding: '16px',
    marginBottom: '22px',
  },
  addMoreTestsBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '5px 10px',
    borderRadius: '8px',
    border: '1px solid #059669',
    backgroundColor: '#FFFFFF',
    color: '#059669',
    fontSize: '11.5px',
    fontWeight: 700,
    cursor: 'pointer',
  },
  selectedReviewItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: '10px 14px',
    borderRadius: '10px',
    border: '1px solid #E2E8F0',
  },
  removeBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Section Headings
  sectionHeading: {
    fontSize: '14px',
    fontWeight: 800,
    color: '#0F172A',
    marginBottom: '10px',
    display: 'flex',
    alignItems: 'center',
  },
  // Date Carousel
  dateCarousel: {
    display: 'flex',
    gap: '10px',
    overflowX: 'auto',
    paddingBottom: '8px',
  },
  datePill: {
    minWidth: '64px',
    padding: '10px 8px',
    borderRadius: '14px',
    border: '1.5px solid #E2E8F0',
    backgroundColor: '#FFFFFF',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  // Slots
  capacityBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 14px',
    borderRadius: '10px',
    backgroundColor: '#ECFDF5',
    border: '1px solid #A7F3D0',
    fontSize: '12.5px',
    color: '#065F46',
    marginBottom: '12px',
  },
  slotsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '10px',
  },
  slotBtn: {
    padding: '10px',
    borderRadius: '12px',
    border: '1.5px solid #E2E8F0',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s ease',
  },
  // Prescription Section
  aiTag: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '3px 8px',
    borderRadius: '999px',
    backgroundColor: '#ECFDF5',
    color: '#059669',
    fontSize: '11px',
    fontWeight: 800,
  },
  rxWarningBanner: {
    display: 'flex',
    gap: '10px',
    padding: '12px 14px',
    borderRadius: '12px',
    backgroundColor: '#FFFBEB',
    border: '1px solid #FDE68A',
    marginBottom: '12px',
  },
  uploadDropzone: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    borderRadius: '16px',
    border: '2px dashed #CBD5E1',
    backgroundColor: '#F8FAFC',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  uploadIconCircle: {
    width: '46px',
    height: '46px',
    borderRadius: '50%',
    backgroundColor: '#ECFDF5',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '10px',
  },
  previewContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    borderRadius: '14px',
    border: '1.5px solid #A7F3D0',
    backgroundColor: '#ECFDF5',
  },
  previewImage: {
    width: '52px',
    height: '52px',
    borderRadius: '10px',
    objectFit: 'cover',
    border: '1px solid #CBD5E1',
  },
  changeRxBtn: {
    padding: '6px 12px',
    borderRadius: '8px',
    border: '1px solid #CBD5E1',
    backgroundColor: '#FFFFFF',
    fontSize: '12px',
    fontWeight: 700,
    color: '#0F172A',
    cursor: 'pointer',
  },
  // Payment Options
  paymentDeferralNotice: {
    display: 'flex',
    gap: '10px',
    padding: '12px 14px',
    borderRadius: '12px',
    backgroundColor: '#F0FDFA',
    border: '1px solid #99F6E4',
  },
  paymentOptionsRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
    marginBottom: '14px',
  },
  paymentOptionTile: {
    padding: '14px',
    borderRadius: '14px',
    border: '2px solid #E2E8F0',
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    transition: 'all 0.2s ease',
  },
  paymentTileIcon: {
    width: '38px',
    height: '38px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardFormContainer: {
    padding: '16px',
    borderRadius: '14px',
    border: '1px solid #E2E8F0',
    backgroundColor: '#F8FAFC',
    marginBottom: '14px',
  },
  demoFillBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 10px',
    borderRadius: '6px',
    backgroundColor: '#ECFDF5',
    color: '#059669',
    border: '1px solid #A7F3D0',
    fontSize: '11px',
    fontWeight: 800,
    cursor: 'pointer',
  },
  fieldLabel: {
    display: 'block',
    fontSize: '11.5px',
    fontWeight: 700,
    color: '#475569',
    marginBottom: '4px',
  },
  formInput: {
    width: '100%',
    padding: '9px 12px',
    borderRadius: '8px',
    border: '1px solid #CBD5E1',
    backgroundColor: '#FFFFFF',
    fontSize: '13px',
    color: '#0F172A',
    outline: 'none',
    boxSizing: 'border-box',
  },
  counterNoticeBox: {
    padding: '12px 14px',
    borderRadius: '12px',
    backgroundColor: '#F0FDF4',
    border: '1px solid #BBF7D0',
    marginBottom: '14px',
  },
  // Summary
  summaryCard: {
    padding: '16px',
    borderRadius: '16px',
    backgroundColor: '#F8FAFC',
    border: '1px solid #E2E8F0',
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  summaryLabel: {
    fontSize: '13px',
    color: '#64748B',
    fontWeight: 600,
  },
  summaryDivider: {
    height: '1px',
    backgroundColor: '#E2E8F0',
    margin: '10px 0',
  },
  // Footer Bars
  footerBar: {
    padding: '16px 28px',
    borderTop: '1px solid #F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  catalogueFooterRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '16px',
    flexWrap: 'wrap',
  },
  miniSelectedChip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '3px 8px',
    borderRadius: '6px',
    backgroundColor: '#ECFDF5',
    color: '#065F46',
    fontSize: '11px',
    fontWeight: 700,
    border: '1px solid #A7F3D0',
  },
  miniChipRemoveBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '0',
    display: 'flex',
    alignItems: 'center',
    color: '#059669',
  },
  miniMoreChip: {
    padding: '3px 6px',
    borderRadius: '6px',
    backgroundColor: '#F1F5F9',
    color: '#475569',
    fontSize: '11px',
    fontWeight: 700,
  },
  proceedNextBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 24px',
    borderRadius: '12px',
    border: 'none',
    background: 'linear-gradient(135deg, #059669, #0D9488)',
    color: '#FFFFFF',
    fontSize: '14px',
    fontWeight: 800,
    transition: 'all 0.2s ease',
  },
  scheduleFooterRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '16px',
  },
  backBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '12px 18px',
    borderRadius: '12px',
    border: '1px solid #CBD5E1',
    backgroundColor: '#FFFFFF',
    color: '#475569',
    fontSize: '13.5px',
    fontWeight: 700,
    cursor: 'pointer',
  },
  submitBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '12px 28px',
    borderRadius: '12px',
    border: 'none',
    background: 'linear-gradient(135deg, #059669, #0D9488)',
    color: '#FFFFFF',
    fontSize: '14px',
    fontWeight: 800,
    boxShadow: '0 4px 14px rgba(5, 150, 105, 0.35)',
    transition: 'all 0.2s ease',
  },
};
