import React, { useState, useEffect } from 'react';
import { 
  X, Calendar, Clock, Microscope, ShieldCheck, 
  Sparkles, Upload, CreditCard, DollarSign, CheckCircle2, 
  AlertCircle, AlertTriangle, ArrowRight, ArrowLeft, QrCode,
  Search, Check, RefreshCw, ChevronRight, Edit3, Filter
} from 'lucide-react';
import { createBooking, getSlots, uploadFile, uploadPrescription, getAllTests } from '../../../api/labApi';
import toast from 'react-hot-toast';

const DEFAULT_SLOTS = ['08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00'];

export default function BookLabTestModal({ 
  test, 
  initialTest, 
  initialTests = [], 
  user, 
  onClose, 
  onSuccess 
}) {
  const [step, setStep] = useState(1); // 1: Schedule & Test, 2: Patient & Rx, 3: Payment, 4: Confirmed
  
  // Resolve initial test from any of the provided props
  const resolvedInitialTest = (test && test.id) 
    ? test 
    : (initialTest && initialTest.id) 
      ? initialTest 
      : (initialTests.length > 0 && initialTests[0]?.id) 
        ? initialTests[0] 
        : null;

  const [selectedTest, setSelectedTest] = useState(resolvedInitialTest);
  const [availableTests, setAvailableTests] = useState(initialTests.length > 0 ? initialTests : []);
  const [loadingTests, setLoadingTests] = useState(false);
  const [testSearch, setTestSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isChangingTest, setIsChangingTest] = useState(!resolvedInitialTest);

  // Date & Slot state (default tomorrow)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const [selectedDate, setSelectedDate] = useState(tomorrow.toISOString().split('T')[0]);
  const [selectedSlot, setSelectedSlot] = useState('09:00');
  const [slotCapacities, setSlotCapacities] = useState({});
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Patient Info state
  const [patientName, setPatientName] = useState(user?.fullName || user?.name || 'Patient');
  const [patientEmail, setPatientEmail] = useState(user?.email || 'patient@healthbridge.lk');
  const [patientPhone, setPatientPhone] = useState(user?.phoneNumber || user?.phone || '+94 77 123 4567');
  const [patientAge, setPatientAge] = useState(user?.age || '32');
  const [patientGender, setPatientGender] = useState(user?.gender || 'Male');
  const [notes, setNotes] = useState('');

  // Prescription Upload state
  const [prescriptionFile, setPrescriptionFile] = useState(null);
  const [prescriptionPreview, setPrescriptionPreview] = useState('');
  const [uploadingRx, setUploadingRx] = useState(false);

  // Payment Option state
  const [paymentOption, setPaymentOption] = useState('OnlineCard'); // 'OnlineCard' or 'CounterCash'
  const [cardNumber, setCardNumber] = useState('4242 •••• •••• 4242');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvv, setCardCvv] = useState('123');

  // Submitting & Confirmed state
  const [submitting, setSubmitting] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState(null);

  // Sync test if prop changes
  useEffect(() => {
    const t = (test && test.id) ? test : (initialTest && initialTest.id) ? initialTest : null;
    if (t) {
      setSelectedTest(t);
      setIsChangingTest(false);
    }
  }, [test, initialTest]);

  // Fetch all tests for test picker if empty or needed
  useEffect(() => {
    const fetchTests = async () => {
      setLoadingTests(true);
      try {
        const res = await getAllTests();
        const raw = res?.data || res || [];
        const items = Array.isArray(raw) ? raw : (raw.data || raw.items || []);
        setAvailableTests(items);
        
        // If no test was selected and we have items, set first one if still on change mode
        if (!selectedTest && items.length > 0 && !resolvedInitialTest) {
          // keep open so user picks
        }
      } catch (err) {
        console.error('Failed to load lab tests:', err);
      } finally {
        setLoadingTests(false);
      }
    };

    fetchTests();
  }, []);

  // Fetch slots on date change
  useEffect(() => {
    if (selectedDate) {
      fetchSlotCapacities(selectedDate);
    }
  }, [selectedDate]);

  const fetchSlotCapacities = async (dateStr) => {
    setLoadingSlots(true);
    try {
      const res = await getSlots(dateStr);
      if (res.data && Array.isArray(res.data)) {
        const caps = {};
        res.data.forEach(s => {
          if (s.slotTime) caps[s.slotTime] = s.availableSeats ?? 5;
        });
        setSlotCapacities(caps);
      }
    } catch {
      // Fallback capacities
      setSlotCapacities({
        '08:00': 4, '09:00': 2, '10:00': 5, '11:00': 3,
        '13:00': 6, '14:00': 4, '15:00': 5, '16:00': 6
      });
    } finally {
      setLoadingSlots(false);
    }
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

  const handleSelectTest = (t) => {
    setSelectedTest(t);
    setIsChangingTest(false);
  };

  const handleNextStep = () => {
    if (step === 1) {
      if (!selectedTest || !selectedTest.id) {
        toast.error('Please select a laboratory test from the catalogue below to continue.');
        setIsChangingTest(true);
        return;
      }
      if (!selectedDate || !selectedSlot) {
        toast.error('Please choose a preferred date and time slot.');
        return;
      }
    }

    if (step === 2) {
      if (!patientName.trim()) {
        toast.error('Please enter the patient full name.');
        return;
      }
      if (selectedTest?.isRestricted && !prescriptionFile && !prescriptionPreview) {
        toast.error('This test is restricted. Please upload a doctor prescription to proceed.');
        return;
      }
    }

    setStep(s => s + 1);
  };

  const handleBookingSubmit = async () => {
    if (!selectedTest || !selectedTest.id) {
      toast.error('Please select a laboratory test.');
      setStep(1);
      setIsChangingTest(true);
      return;
    }
    if (!selectedDate || !selectedSlot) {
      toast.error('Please choose a valid date and time slot.');
      setStep(1);
      return;
    }

    setSubmitting(true);
    try {
      const formattedTime = selectedSlot.length === 5 ? `${selectedSlot}:00` : selectedSlot;
      const parsedPatientId = parseInt(user?.id || user?.userId) || 1;
      const validEmail = patientEmail?.includes('@') ? patientEmail : 'patient@healthbridge.lk';

      const bookingPayload = {
        labTestId: selectedTest.id,
        patientId: parsedPatientId,
        patientName: patientName.trim() || user?.fullName || 'Patient',
        patientEmail: validEmail,
        bookingDate: selectedDate,
        timeSlot: formattedTime,
      };

      const res = await createBooking(bookingPayload);
      const created = res.data || {
        ...bookingPayload,
        tokenNumber: `LAB-${Math.floor(1000 + Math.random() * 9000)}`,
        status: selectedTest.isRestricted ? 'PendingPrescriptionUpload' : 'Confirmed',
        labTest: selectedTest,
      };

      // Upload prescription file if attached
      if (prescriptionFile && created.id) {
        setUploadingRx(true);
        try {
          const upRes = await uploadFile(prescriptionFile);
          const prescriptionUrl = upRes.data?.url || upRes.data?.fileUrl || '';
          if (prescriptionUrl) {
            await uploadPrescription(created.id, prescriptionUrl);
            created.prescriptionImageUrl = prescriptionUrl;
            created.status = 'PendingAIVerification';
          }
        } catch (rxErr) {
          console.warn('Prescription upload background error:', rxErr);
        } finally {
          setUploadingRx(false);
        }
      }

      setConfirmedBooking(created);
      setStep(4);
      toast.success(`Lab appointment successfully booked! Token: #${created.tokenNumber || 'LAB'}`);
      if (onSuccess) onSuccess(created);
    } catch (err) {
      console.error('Failed to create lab booking:', err);
      const msg = err.response?.data?.message || 'Failed to submit booking. Please try again.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Filter available tests for picker
  const categories = ['All', ...new Set(availableTests.map(t => t.category).filter(Boolean))];
  const filteredTests = availableTests.filter(t => {
    const matchesSearch = testSearch === '' || 
      t.name.toLowerCase().includes(testSearch.toLowerCase()) || 
      (t.category && t.category.toLowerCase().includes(testSearch.toLowerCase()));
    const matchesCategory = selectedCategory === 'All' || t.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        {/* Top Header */}
        <div style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={styles.headerIcon}>
              <Microscope size={20} color="#059669" />
            </div>
            <div>
              <h2 style={styles.headerTitle}>
                {step === 4 ? 'Appointment Confirmed!' : 'Book Laboratory Test'}
              </h2>
              <div style={styles.headerSubtitle}>
                {step === 1 && 'Step 1 of 3: Choose Test, Schedule & Time Slot'}
                {step === 2 && 'Step 2 of 3: Patient Information & Prescription'}
                {step === 3 && (selectedTest?.isRestricted ? 'Step 3 of 3: Verification Review & Submit' : 'Step 3 of 3: Payment Method & Review')}
                {step === 4 && (selectedTest?.isRestricted ? 'Prescription submitted for laboratory review' : 'Your official booking pass and counter token')}
              </div>
            </div>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>
            <X size={20} color="#64748b" />
          </button>
        </div>

        {/* Modal Body */}
        <div style={styles.body}>
          {/* STEP 1: TEST SELECTION, SCHEDULE & SLOTS */}
          {step === 1 && (
            <div>
              {/* Selected Test Card */}
              {selectedTest && !isChangingTest ? (
                <div style={styles.testBadgeCard}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ flex: 1, minWidth: '220px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <span style={styles.categoryChip}>{selectedTest.category || 'Diagnostic'}</span>
                        {selectedTest.isRestricted && (
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: '999px',
                            background: '#FEF3C7',
                            color: '#B45309',
                            fontSize: '11px',
                            fontWeight: 800,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <AlertTriangle size={11} /> Rx Required
                          </span>
                        )}
                      </div>
                      <h3 style={styles.testCardTitle}>{selectedTest.name}</h3>
                      <div style={styles.testMetaRow}>
                        <span>Specimen: <strong>{selectedTest.sampleType || 'Blood'}</strong></span>
                        <span>Turnaround: <strong>{selectedTest.turnaroundDays || 1} Day(s)</strong></span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                      <div style={styles.priceTag}>
                        Rs. {Number(selectedTest.price || 0).toLocaleString()}
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsChangingTest(true)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '5px 12px',
                          borderRadius: '8px',
                          border: '1px solid #CBD5E1',
                          background: '#FFFFFF',
                          color: '#0F172A',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        <Edit3 size={12} /> Change Test
                      </button>
                    </div>
                  </div>

                  {selectedTest.isRestricted && (
                    <div style={styles.rxWarning}>
                      <AlertTriangle size={15} color="#b45309" />
                      <span>Doctor prescription required for this test. You can upload in Step 2.</span>
                    </div>
                  )}
                </div>
              ) : (
                /* Test Picker / Catalogue Dropdown */
                <div style={{
                  background: '#F8FAFC',
                  borderRadius: '16px',
                  border: '1.5px solid #0D9488',
                  padding: '18px 20px',
                  marginBottom: '20px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <label style={{ fontSize: '13.5px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Microscope size={16} color="#0D9488" /> Select Laboratory Test to Book:
                    </label>
                    {selectedTest && (
                      <button
                        type="button"
                        onClick={() => setIsChangingTest(false)}
                        style={{ fontSize: '12px', color: '#64748B', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                      >
                        Keep "{selectedTest.name}"
                      </button>
                    )}
                  </div>

                  {/* Search Bar */}
                  <div style={{ position: 'relative', marginBottom: '10px' }}>
                    <Search size={15} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '11px' }} />
                    <input
                      type="text"
                      placeholder="Search test name or pathology category..."
                      value={testSearch}
                      onChange={e => setTestSearch(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '9px 12px 9px 36px',
                        borderRadius: '10px',
                        border: '1px solid #CBD5E1',
                        fontSize: '13px',
                        boxSizing: 'border-box',
                        outline: 'none'
                      }}
                    />
                  </div>

                  {/* Category Pills */}
                  {categories.length > 2 && (
                    <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '10px' }}>
                      {categories.map(cat => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setSelectedCategory(cat)}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '999px',
                            border: '1px solid',
                            borderColor: selectedCategory === cat ? '#059669' : '#E2E8F0',
                            background: selectedCategory === cat ? '#059669' : '#FFFFFF',
                            color: selectedCategory === cat ? '#FFFFFF' : '#475569',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* List of Tests */}
                  <div style={{
                    maxHeight: '200px',
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    paddingRight: '4px'
                  }}>
                    {loadingTests ? (
                      <div style={{ textAlign: 'center', padding: '16px', color: '#64748B', fontSize: '13px' }}>
                        Loading clinical tests...
                      </div>
                    ) : filteredTests.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '16px', color: '#64748B', fontSize: '13px' }}>
                        No tests match "{testSearch}".
                      </div>
                    ) : (
                      filteredTests.map(t => {
                        const isThisSelected = selectedTest?.id === t.id;
                        return (
                          <div
                            key={t.id}
                            onClick={() => handleSelectTest(t)}
                            style={{
                              padding: '10px 14px',
                              borderRadius: '10px',
                              border: isThisSelected ? '1.5px solid #059669' : '1px solid #E2E8F0',
                              background: isThisSelected ? '#ECFDF5' : '#FFFFFF',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              transition: 'all 0.15s ease'
                            }}
                            onMouseEnter={(e) => {
                              if (!isThisSelected) e.currentTarget.style.borderColor = '#0D9488';
                            }}
                            onMouseLeave={(e) => {
                              if (!isThisSelected) e.currentTarget.style.borderColor = '#E2E8F0';
                            }}
                          >
                            <div>
                              <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#0F172A' }}>
                                {t.name}
                              </div>
                              <div style={{ fontSize: '11.5px', color: '#64748B', display: 'flex', gap: '8px', marginTop: '2px' }}>
                                <span>{t.category || 'Clinical'}</span>
                                <span>&bull;</span>
                                <span>{t.sampleType || 'Blood'}</span>
                                {t.isRestricted && <span style={{ color: '#D97706', fontWeight: 700 }}>&bull; Rx Required</span>}
                              </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '14px', fontWeight: 900, color: '#059669' }}>
                                Rs. {Number(t.price || 0).toLocaleString()}
                              </div>
                              <div style={{ fontSize: '11px', color: isThisSelected ? '#059669' : '#0284C7', fontWeight: 700 }}>
                                {isThisSelected ? 'Selected ✓' : 'Select'}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* Date Selection */}
              <div style={{ marginTop: '20px' }}>
                <label style={styles.fieldLabel}>Select Preferred Date</label>
                <div style={styles.inputWrap}>
                  <Calendar size={18} color="#64748b" style={{ marginRight: '10px' }} />
                  <input
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    value={selectedDate}
                    onChange={e => setSelectedDate(e.target.value)}
                    style={styles.dateInput}
                  />
                </div>
              </div>

              {/* Smart Slot Selection */}
              <div style={{ marginTop: '22px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <label style={styles.fieldLabel}>Available Counter Time Slots</label>
                  {loadingSlots && <span style={{ fontSize: '11.5px', color: '#059669' }}>Checking live queue...</span>}
                </div>
                <div style={styles.slotsGrid}>
                  {DEFAULT_SLOTS.map(slot => {
                    const isSelected = selectedSlot === slot;
                    const seats = slotCapacities[slot] ?? 4;
                    const isFull = seats <= 0;

                    return (
                      <button
                        key={slot}
                        type="button"
                        disabled={isFull}
                        onClick={() => setSelectedSlot(slot)}
                        style={{
                          ...styles.slotBtn,
                          ...(isSelected ? styles.slotBtnActive : {}),
                          ...(isFull ? styles.slotBtnDisabled : {})
                        }}
                      >
                        <Clock size={14} color={isSelected ? '#059669' : '#64748b'} />
                        <span style={{ fontWeight: 700 }}>{slot}</span>
                        <span style={{
                          fontSize: '10.5px',
                          color: isSelected ? '#047857' : isFull ? '#dc2626' : '#64748b'
                        }}>
                          {isFull ? 'Full' : `${seats} left`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Preparation Rules Advisory */}
              <div style={styles.prepNotice}>
                <Sparkles size={16} color="#059669" />
                <div>
                  <strong>Preparation Rule:</strong> {selectedTest?.preparationNotes || 'Fasting 8–10 hours recommended for metabolic & lipid panels. Water is permitted.'}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: PATIENT DETAILS & PRESCRIPTION */}
          {step === 2 && (
            <div>
              <div style={styles.twoCol}>
                <div>
                  <label style={styles.fieldLabel}>Patient Full Name</label>
                  <input
                    type="text"
                    value={patientName}
                    onChange={e => setPatientName(e.target.value)}
                    style={styles.input}
                    placeholder="Enter full name"
                  />
                </div>
                <div>
                  <label style={styles.fieldLabel}>Patient Email</label>
                  <input
                    type="email"
                    value={patientEmail}
                    onChange={e => setPatientEmail(e.target.value)}
                    style={styles.input}
                    placeholder="patient@healthbridge.lk"
                  />
                </div>
              </div>

              <div style={{ ...styles.twoCol, marginTop: '16px' }}>
                <div>
                  <label style={styles.fieldLabel}>Phone Number</label>
                  <input
                    type="text"
                    value={patientPhone}
                    onChange={e => setPatientPhone(e.target.value)}
                    style={styles.input}
                    placeholder="+94 77 000 0000"
                  />
                </div>
                <div>
                  <label style={styles.fieldLabel}>Gender</label>
                  <select
                    value={patientGender}
                    onChange={e => setPatientGender(e.target.value)}
                    style={styles.input}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              {/* Prescription Upload Section */}
              <div style={{ marginTop: '20px' }}>
                <label style={styles.fieldLabel}>
                  Doctor's Prescription {selectedTest?.isRestricted ? '(Required)' : '(Optional)'}
                </label>
                <div style={styles.uploadBox}>
                  {prescriptionPreview ? (
                    <div style={{ textAlign: 'center' }}>
                      <img src={prescriptionPreview} alt="Prescription Preview" style={styles.previewImage} />
                      <div style={{ marginTop: '10px' }}>
                        <button
                          type="button"
                          onClick={() => { setPrescriptionFile(null); setPrescriptionPreview(''); }}
                          style={styles.changeRxBtn}
                        >
                          Change Photo
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <Upload size={32} color="#059669" style={{ margin: '0 auto 8px' }} />
                      <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0f172a' }}>
                        Click to upload prescription photo or PDF
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                        Gemini Vision AI will automatically verify test eligibility
                      </div>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={handleFileChange}
                        style={styles.fileInputHidden}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div style={{ marginTop: '16px' }}>
                <label style={styles.fieldLabel}>Clinical Notes or Allergies (Optional)</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  style={{ ...styles.input, minHeight: '64px', resize: 'vertical' }}
                  placeholder="e.g. Diabetic, prone to dizziness during blood draw..."
                />
              </div>
            </div>
          )}

          {/* STEP 3: PAYMENT & REVIEW */}
          {step === 3 && (
            <div>
              {selectedTest?.isRestricted ? (
                <div>
                  <div style={styles.orderReviewCard}>
                    <div style={styles.reviewRow}>
                      <span>Selected Test:</span>
                      <strong>{selectedTest?.name}</strong>
                    </div>
                    <div style={styles.reviewRow}>
                      <span>Schedule:</span>
                      <strong>{selectedDate} at {selectedSlot}</strong>
                    </div>
                    <div style={styles.reviewRow}>
                      <span>Patient:</span>
                      <strong>{patientName} ({patientGender}, {patientEmail})</strong>
                    </div>
                    <div style={styles.reviewRow}>
                      <span>Prescription File:</span>
                      <strong style={{ color: '#059669' }}>✓ Attached for AI & Lab review</strong>
                    </div>
                    <div style={{ ...styles.reviewRow, borderTop: '1px solid #e2e8f0', paddingTop: '10px', marginTop: '6px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 800 }}>Amount Payable Now:</span>
                      <span style={{ fontSize: '18px', fontWeight: 900, color: '#059669' }}>
                        Rs. 0 <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>(Deferred)</span>
                      </span>
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#64748b', textAlign: 'right', marginTop: '2px' }}>
                      Standard fee of Rs. {Number(selectedTest?.price || 0).toLocaleString()} payable after clinical approval
                    </div>
                  </div>

                  <div style={{
                    marginTop: '20px',
                    padding: '16px',
                    borderRadius: '14px',
                    background: '#FFFBEB',
                    border: '1px solid #FDE68A',
                    display: 'flex',
                    gap: '12px',
                    alignItems: 'flex-start'
                  }}>
                    <AlertTriangle size={20} color="#D97706" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#92400E' }}>
                        Payment Deferred Pending Clinical Approval
                      </div>
                      <div style={{ fontSize: '12px', color: '#78350F', marginTop: '4px', lineHeight: 1.5 }}>
                        This is a restricted diagnostic test requiring clinical verification by Gemini Vision AI and certified laboratory staff.
                        Payment is not required at this time.
                        <br /><br />
                        Once your prescription is reviewed and approved, you will receive an approval email notification and you can proceed to payment (Online Card or Counter Cash) directly from your portal.
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={styles.orderReviewCard}>
                    <div style={styles.reviewRow}>
                      <span>Selected Test:</span>
                      <strong>{selectedTest?.name}</strong>
                    </div>
                    <div style={styles.reviewRow}>
                      <span>Schedule:</span>
                      <strong>{selectedDate} at {selectedSlot}</strong>
                    </div>
                    <div style={styles.reviewRow}>
                      <span>Patient:</span>
                      <strong>{patientName} ({patientGender}, {patientEmail})</strong>
                    </div>
                    <div style={{ ...styles.reviewRow, borderTop: '1px solid #e2e8f0', paddingTop: '10px', marginTop: '6px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 800 }}>Total Payable:</span>
                      <span style={{ fontSize: '18px', fontWeight: 900, color: '#059669' }}>
                        Rs. {Number(selectedTest?.price || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div style={{ marginTop: '22px' }}>
                    <label style={styles.fieldLabel}>Choose Payment Method</label>
                    <div style={styles.paymentOptions}>
                      <label style={{
                        ...styles.payOptionCard,
                        borderColor: paymentOption === 'OnlineCard' ? '#059669' : '#e2e8f0',
                        backgroundColor: paymentOption === 'OnlineCard' ? '#ecfdf5' : '#fff',
                      }}>
                        <input
                          type="radio"
                          name="paymentOption"
                          checked={paymentOption === 'OnlineCard'}
                          onChange={() => setPaymentOption('OnlineCard')}
                          style={{ accentColor: '#059669' }}
                        />
                        <div>
                          <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#0f172a' }}>💳 Credit / Debit Card (Online Instant)</div>
                          <div style={{ fontSize: '12px', color: '#64748b' }}>Instant queue priority and fast counter check-in</div>
                        </div>
                      </label>

                      <label style={{
                        ...styles.payOptionCard,
                        borderColor: paymentOption === 'CounterCash' ? '#059669' : '#e2e8f0',
                        backgroundColor: paymentOption === 'CounterCash' ? '#ecfdf5' : '#fff',
                      }}>
                        <input
                          type="radio"
                          name="paymentOption"
                          checked={paymentOption === 'CounterCash'}
                          onChange={() => setPaymentOption('CounterCash')}
                          style={{ accentColor: '#059669' }}
                        />
                        <div>
                          <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#0f172a' }}>💵 Pay Cash at Phlebotomy Counter</div>
                          <div style={{ fontSize: '12px', color: '#64748b' }}>Settle invoice when giving blood/specimen at the lab</div>
                        </div>
                      </label>
                    </div>
                  </div>

                  {paymentOption === 'OnlineCard' && (
                    <div style={styles.mockCardForm}>
                      <div>
                        <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569' }}>Card Number</label>
                        <input
                          type="text"
                          value={cardNumber}
                          onChange={e => setCardNumber(e.target.value)}
                          style={styles.cardInput}
                        />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '10px' }}>
                        <div>
                          <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569' }}>Expires</label>
                          <input
                            type="text"
                            value={cardExpiry}
                            onChange={e => setCardExpiry(e.target.value)}
                            style={styles.cardInput}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569' }}>CVV</label>
                          <input
                            type="password"
                            value={cardCvv}
                            onChange={e => setCardCvv(e.target.value)}
                            style={styles.cardInput}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* STEP 4: CONFIRMATION RECEIPT */}
          {step === 4 && confirmedBooking && (
            <div style={{ textAlign: 'center', padding: '10px 0' }}>
              <div style={{
                ...styles.successIcon,
                backgroundColor: selectedTest?.isRestricted ? '#FEF3C7' : '#ecfdf5'
              }}>
                {selectedTest?.isRestricted ? (
                  <Sparkles size={42} color="#D97706" />
                ) : (
                  <CheckCircle2 size={42} color="#059669" />
                )}
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: 900, color: '#0f172a', margin: '14px 0 4px' }}>
                {selectedTest?.isRestricted ? 'Prescription Submitted for Review!' : 'Appointment Confirmed!'}
              </h3>
              <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                {selectedTest?.isRestricted
                  ? 'Your prescription has been submitted for AI analysis and laboratory staff approval.'
                  : 'Please present this token at the laboratory reception counter.'}
              </p>

              <div style={styles.tokenDisplayCard}>
                <div style={{
                  fontSize: '12px',
                  fontWeight: 800,
                  color: selectedTest?.isRestricted ? '#B45309' : '#047857',
                  textTransform: 'uppercase',
                  letterSpacing: '1px'
                }}>
                  {selectedTest?.isRestricted ? 'Reference Token Number' : 'Laboratory Token Number'}
                </div>
                <div style={{
                  ...styles.tokenBigNumber,
                  color: selectedTest?.isRestricted ? '#B45309' : '#059669'
                }}>
                  #{confirmedBooking.tokenNumber || 'LAB-1082'}
                </div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                  {confirmedBooking.bookingDate} at {confirmedBooking.timeSlot}
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                  {confirmedBooking.labTest?.name || selectedTest?.name} • {selectedTest?.isRestricted ? 'Status: Pending Verification' : 'Room 4 (Specimen Collection)'}
                </div>
              </div>

              {selectedTest?.isRestricted && (
                <div style={{
                  marginTop: '16px',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  fontSize: '12px',
                  color: '#475569',
                  textAlign: 'left'
                }}>
                  <strong>What happens next?</strong>
                  <ul style={{ margin: '6px 0 0', paddingLeft: '18px', lineHeight: 1.5 }}>
                    <li>Gemini Vision AI and laboratory staff will review your prescription.</li>
                    <li>You will receive an approval email notification once verified.</li>
                    <li>Payment (Online Card or Counter Cash) will be unlocked in your portal after approval.</li>
                  </ul>
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '20px' }}>
                <button
                  style={styles.primaryActionBtn}
                  onClick={onClose}
                >
                  {selectedTest?.isRestricted ? 'View in My Bookings' : 'Done'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Navigation */}
        {step < 4 && (
          <div style={styles.footer}>
            {step > 1 ? (
              <button
                type="button"
                style={styles.backBtn}
                onClick={() => setStep(step - 1)}
              >
                <ArrowLeft size={16} /> Back
              </button>
            ) : <div />}

            {step < 3 ? (
              <button
                type="button"
                style={styles.nextBtn}
                onClick={handleNextStep}
              >
                Next Step <ArrowRight size={16} />
              </button>
            ) : (
              <button
                type="button"
                disabled={submitting}
                style={styles.confirmBtn}
                onClick={handleBookingSubmit}
              >
                {submitting
                  ? 'Submitting...'
                  : (selectedTest?.isRestricted
                      ? 'Submit for Prescription Verification'
                      : `Confirm & Book (Rs. ${Number(selectedTest?.price || 0).toLocaleString()})`)}
              </button>
            )}
          </div>
        )}
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
    zIndex: 9999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
  },
  modal: {
    backgroundColor: '#ffffff',
    borderRadius: '24px',
    maxWidth: '680px',
    width: '100%',
    maxHeight: '92vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    overflow: 'hidden',
  },
  header: {
    padding: '20px 24px',
    borderBottom: '1px solid #e2e8f0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
  },
  headerIcon: {
    width: '40px',
    height: '40px',
    borderRadius: '12px',
    backgroundColor: '#ecfdf5',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: '18px',
    fontWeight: 800,
    color: '#0f172a',
    margin: 0,
  },
  headerSubtitle: {
    fontSize: '12.5px',
    color: '#64748b',
    marginTop: '2px',
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
    padding: '24px',
    overflowY: 'auto',
    flex: 1,
  },
  testBadgeCard: {
    backgroundColor: '#f8fafc',
    borderRadius: '16px',
    border: '1px solid #e2e8f0',
    padding: '18px 20px',
  },
  categoryChip: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: '6px',
    backgroundColor: '#ecfdf5',
    color: '#059669',
    fontSize: '11px',
    fontWeight: 800,
    textTransform: 'uppercase',
  },
  testCardTitle: {
    fontSize: '17px',
    fontWeight: 800,
    color: '#0f172a',
    margin: '4px 0 6px',
  },
  testMetaRow: {
    fontSize: '12.5px',
    color: '#64748b',
    display: 'flex',
    gap: '16px',
  },
  priceTag: {
    fontSize: '20px',
    fontWeight: 900,
    color: '#059669',
  },
  rxWarning: {
    marginTop: '12px',
    padding: '10px 14px',
    borderRadius: '10px',
    backgroundColor: '#fef3c7',
    border: '1px solid #fde68a',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '12.5px',
    color: '#b45309',
    fontWeight: 600,
  },
  fieldLabel: {
    display: 'block',
    fontSize: '13px',
    fontWeight: 700,
    color: '#334155',
    marginBottom: '8px',
  },
  inputWrap: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    border: '1px solid #cbd5e1',
    borderRadius: '12px',
    padding: '10px 14px',
  },
  dateInput: {
    border: 'none',
    outline: 'none',
    fontSize: '14px',
    fontWeight: 600,
    color: '#0f172a',
    width: '100%',
    fontFamily: 'inherit',
  },
  slotsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '10px',
  },
  slotBtn: {
    padding: '10px 6px',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    backgroundColor: '#ffffff',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '3px',
    transition: 'all 0.2s',
  },
  slotBtnActive: {
    backgroundColor: '#ecfdf5',
    borderColor: '#059669',
    boxShadow: '0 0 0 2px #05966920',
  },
  slotBtnDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
    backgroundColor: '#f1f5f9',
  },
  prepNotice: {
    marginTop: '20px',
    padding: '12px 16px',
    borderRadius: '12px',
    backgroundColor: '#f0fdf4',
    border: '1px solid #bbf7d0',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    fontSize: '12.5px',
    color: '#166534',
    lineHeight: 1.5,
  },
  twoCol: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
  },
  input: {
    width: '100%',
    padding: '11px 14px',
    borderRadius: '12px',
    border: '1px solid #cbd5e1',
    fontSize: '13.5px',
    color: '#0f172a',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
  },
  uploadBox: {
    border: '2px dashed #cbd5e1',
    borderRadius: '16px',
    padding: '24px 20px',
    textAlign: 'center',
    cursor: 'pointer',
    position: 'relative',
    backgroundColor: '#f8fafc',
  },
  fileInputHidden: {
    position: 'absolute',
    inset: 0,
    opacity: 0,
    cursor: 'pointer',
    width: '100%',
    height: '100%',
  },
  previewImage: {
    maxHeight: '160px',
    borderRadius: '10px',
    border: '1px solid #cbd5e1',
    objectFit: 'contain',
  },
  changeRxBtn: {
    padding: '6px 14px',
    borderRadius: '8px',
    backgroundColor: '#ef4444',
    color: '#fff',
    border: 'none',
    fontSize: '12px',
    fontWeight: 700,
    cursor: 'pointer',
  },
  orderReviewCard: {
    backgroundColor: '#f8fafc',
    borderRadius: '16px',
    border: '1px solid #e2e8f0',
    padding: '16px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  reviewRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '13px',
    color: '#475569',
  },
  paymentOptions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  payOptionCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '14px 18px',
    borderRadius: '14px',
    border: '1.5px solid',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  mockCardForm: {
    marginTop: '16px',
    padding: '16px',
    borderRadius: '14px',
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
  },
  cardInput: {
    width: '100%',
    padding: '9px 12px',
    borderRadius: '10px',
    border: '1px solid #cbd5e1',
    fontSize: '13px',
    fontFamily: 'monospace',
    marginTop: '4px',
    boxSizing: 'border-box',
  },
  successIcon: {
    width: '68px',
    height: '68px',
    borderRadius: '50%',
    backgroundColor: '#ecfdf5',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto',
  },
  tokenDisplayCard: {
    backgroundColor: '#f0fdf4',
    borderRadius: '18px',
    border: '1.5px solid #a7f3d0',
    padding: '24px 20px',
    margin: '20px 0',
  },
  tokenBigNumber: {
    fontSize: '36px',
    fontWeight: 900,
    color: '#059669',
    letterSpacing: '1px',
    margin: '8px 0',
    fontFamily: 'monospace',
  },
  primaryActionBtn: {
    padding: '12px 36px',
    borderRadius: '12px',
    backgroundColor: '#059669',
    color: '#ffffff',
    border: 'none',
    fontWeight: 800,
    fontSize: '14px',
    cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(5, 150, 105, 0.3)',
  },
  footer: {
    padding: '16px 24px',
    borderTop: '1px solid #e2e8f0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
  },
  backBtn: {
    padding: '10px 18px',
    borderRadius: '10px',
    border: '1px solid #cbd5e1',
    backgroundColor: '#ffffff',
    color: '#475569',
    fontSize: '13.5px',
    fontWeight: 700,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  nextBtn: {
    padding: '10px 22px',
    borderRadius: '10px',
    border: 'none',
    backgroundColor: '#059669',
    color: '#ffffff',
    fontSize: '13.5px',
    fontWeight: 800,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)',
  },
  confirmBtn: {
    padding: '11px 24px',
    borderRadius: '10px',
    border: 'none',
    backgroundColor: '#059669',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: 800,
    cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(5, 150, 105, 0.3)',
  },
};
