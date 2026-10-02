import React, { useState, useEffect } from 'react';
import {
  Search, Calendar, Clock, MapPin, User, ShieldCheck, Star,
  Award, ArrowRight, ArrowLeft, CheckCircle2, QrCode, Printer,
  Sparkles, RefreshCw, X, CreditCard, Smartphone, Building2,
  Phone, AlertCircle, ChevronRight, Stethoscope, HeartPulse,
  Brain, Bone, Baby, Activity, Sparkle, Headphones, FileText
} from 'lucide-react';
import {
  getDoctors, getSpecialties, getDoctorSessions, recommendSpecialty,
  bookAppointment, payAppointment, getMyAppointments, cancelAppointment,
  rescheduleAppointment
} from '../../../api/doctorApi';
import doctorAgent from '../../../assets/doctor-agent.png';

const DoctorChannelingSection = ({ user, showToast }) => {
  // Wizard Steps:
  // 1: Search & Specialty Browse
  // 2: Available Specialists List
  // 3: Profile & Session Selection
  // 4: Patient Details Form
  // 5: Payment Processing & Confirmation
  // 6: My Appointments Dashboard
  const [currentStep, setCurrentStep] = useState(1);

  // Search & Filter State
  const [searchName, setSearchName] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('ALL');
  const [selectedHospital, setSelectedHospital] = useState('ALL');
  const [selectedDate, setSelectedDate] = useState('');
  const [sortBy, setSortBy] = useState('rating');
  const [availabilityFilter, setAvailabilityFilter] = useState('all');

  // AI Symptom Triage State
  const [symptomInput, setSymptomInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiRecommendations, setAiRecommendations] = useState(null);

  // Data State
  const [doctors, setDoctors] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [loading, setLoading] = useState(false);

  // Selected Booking State
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [availableSessions, setAvailableSessions] = useState([]);
  const [selectedSessionDate, setSelectedSessionDate] = useState('');
  const [selectedSession, setSelectedSession] = useState(null);

  // Patient Details State
  const [patientDetails, setPatientDetails] = useState({
    fullName: user?.fullName || user?.name || '',
    nic: user?.nicNumber || '',
    phone: user?.phoneNumber || '',
    email: user?.email || '',
    address: user?.address || '',
    notes: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [bookingType, setBookingType] = useState('Reservation'); // 'Reservation' or 'OnlinePayment'
  const [validatingAvailability, setValidatingAvailability] = useState(false);
  const [isSessionValidated, setIsSessionValidated] = useState(false);

  // Payment State
  const [paymentMethod, setPaymentMethod] = useState('CreditCard');
  const [walletProvider, setWalletProvider] = useState('FriMi');
  const [cardData, setCardData] = useState({ number: '', expiry: '', cvv: '', name: '' });
  const [walletPhone, setWalletPhone] = useState('');
  const [bankRef, setBankRef] = useState('');
  const [paymentErrors, setPaymentErrors] = useState({});
  const [pendingAppointmentId, setPendingAppointmentId] = useState(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [confirmedAppointment, setConfirmedAppointment] = useState(null);

  // My Appointments State
  const [appointmentsTab, setAppointmentsTab] = useState('Upcoming'); // Upcoming, Completed, Cancelled
  const [myAppointments, setMyAppointments] = useState([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);

  // Modals
  const [activeQrApt, setActiveQrApt] = useState(null);
  const [activeReceiptApt, setActiveReceiptApt] = useState(null);
  const [rescheduleApt, setRescheduleApt] = useState(null);
  const [rescheduleSessions, setRescheduleSessions] = useState([]);
  const [rescheduleLoading, setRescheduleLoading] = useState(false);

  // ─── Initial Load ─────────────────────────────────────────────────────────

  useEffect(() => {
    fetchSpecialtiesList();
    fetchDoctorsList();
  }, []);

  // ─── Browser Back Button Support for Multi-Step Wizard ──────────────────
  // Push a history entry when advancing past step 1 so the browser back
  // button walks backward through wizard steps instead of leaving the page.
  useEffect(() => {
    if (currentStep > 1) {
      window.history.pushState({ channelingStep: currentStep }, '');
    }
  }, [currentStep]);

  useEffect(() => {
    const handlePopState = (e) => {
      // If we're past step 1, go back one step instead of leaving
      if (currentStep > 1) {
        e.preventDefault();
        setCurrentStep(prev => Math.max(1, prev - 1));
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [currentStep]);


  const notify = (msg, type = 'success') => {
    if (showToast) showToast(msg, type);
    else alert(msg);
  };

  const fetchSpecialtiesList = async () => {
    try {
      const res = await getSpecialties();
      if (Array.isArray(res.data)) {
        setSpecialties(res.data);
      }
    } catch (err) {
      console.error('Failed to load specialties', err);
    }
  };

  const fetchDoctorsList = async (overrides = {}) => {
    setLoading(true);
    try {
      const params = {
        search: overrides.search !== undefined ? overrides.search : searchName,
        specialization: overrides.specialization !== undefined ? overrides.specialization : selectedSpecialty,
        hospital: overrides.hospital !== undefined ? overrides.hospital : selectedHospital,
        date: overrides.date !== undefined ? overrides.date : selectedDate,
        sortBy: overrides.sortBy !== undefined ? overrides.sortBy : sortBy
      };
      const res = await getDoctors(params);
      if (Array.isArray(res.data)) {
        setDoctors(res.data);
      }
    } catch (err) {
      console.error('Failed to load doctors', err);
      notify('Failed to load doctors list', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchMyAppointmentsList = async () => {
    setLoadingAppointments(true);
    try {
      const res = await getMyAppointments({
        patientId: user?.id,
        email: user?.email
      });
      if (Array.isArray(res.data)) {
        setMyAppointments(res.data);
      }
    } catch (err) {
      console.error('Failed to load my appointments', err);
    } finally {
      setLoadingAppointments(false);
    }
  };

  // ─── AI Symptom Recommendation ────────────────────────────

  const handleAiSymptomTriage = async () => {
    const trimmed = symptomInput.trim();
    if (!trimmed) {
      notify('Please describe your symptoms first.', 'error');
      return;
    }
    const words = trimmed.split(/\s+/).filter(Boolean);
    if (words.length < 2) {
      notify('Please describe your symptoms in 2 or more words (e.g., "throbbing headache" or "chest discomfort").', 'warning');
      return;
    }
    setAiLoading(true);
    setAiRecommendations(null);
    try {
      const res = await recommendSpecialty(trimmed);
      const data = res.data;
      setAiRecommendations(data);
      if (data.status === 'RECOMMENDATION_READY') {
        notify(`AI suggests: ${data.specialty}`, 'success');
      }
    } catch (err) {
      console.error('AI triage error', err);
      setAiRecommendations({
        status: 'SAFE_FAILURE',
        reason: 'Please select a specialty manually.'
      });
    } finally {
      setAiLoading(false);
    }
  };

  const handleApplyAiSpecialty = (specialtyName) => {
    setSelectedSpecialty(specialtyName);
    fetchDoctorsList({ specialization: specialtyName });
    setCurrentStep(2);
  };

  // ─── Search Handlers ──────────────────────────────────────────────────────

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    fetchDoctorsList();
    setCurrentStep(2);
  };

  const handleSelectSpecialtyCard = (specialtyName) => {
    setSelectedSpecialty(specialtyName);
    fetchDoctorsList({ specialization: specialtyName });
    setCurrentStep(2);
  };

  // ─── Doctor & Session Selection ───────────────────────────────────────────

  const handleSelectDoctor = async (doctor) => {
    setSelectedDoctor(doctor);
    setSelectedSession(null);
    setSelectedSessionDate('');
    setAvailableSessions([]);
    setCurrentStep(3);

    try {
      const res = await getDoctorSessions(doctor.id);
      if (Array.isArray(res.data)) {
        // Filter out expired/past time slots immediately
        const validUpcomingSessions = res.data.filter(s => !s.isExpired);
        
        setAvailableSessions(validUpcomingSessions);
        // Default to first available date
        if (validUpcomingSessions.length > 0) {
          const uniqueDates = [...new Set(validUpcomingSessions.map(s => s.sessionDate))];
          setSelectedSessionDate(uniqueDates[0]);
        } else {
          setSelectedSessionDate('');
        }
      }
    } catch (err) {
      console.error('Failed to fetch sessions', err);
      notify('Failed to fetch doctor sessions', 'error');
    }
  };

  // ─── Step 4: Availability Validation ──────────────────────────────────────

  const handleValidateAvailability = async () => {
    if (!selectedSession) {
      notify('Please select a session slot first', 'error');
      return;
    }
    setValidatingAvailability(true);
    try {
      const res = await getDoctorSessions(selectedDoctor.id, selectedSessionDate);
      const currentSlot = res.data.find(s => s.id === selectedSession.id);
      if (currentSlot && currentSlot.isAvailable && !currentSlot.isExpired) {
        setIsSessionValidated(true);
        notify('Session slot confirmed! Available to book.', 'success');
      } else if (currentSlot && currentSlot.isExpired) {
        setIsSessionValidated(false);
        notify('This time slot has already passed and can no longer be booked.', 'error');
      } else {
        setIsSessionValidated(false);
        notify('This slot was just booked or is unavailable. Please select another slot.', 'error');
      }
    } catch (err) {
      notify('Could not re-verify availability', 'error');
    } finally {
      setValidatingAvailability(false);
    }
  };

  const validateField = (field, value) => {
    let error = null;
    const trimmed = value.trim();
    if (field === 'fullName') {
      if (!trimmed) error = 'Full name is required';
    } else if (field === 'nic') {
      if (!trimmed) {
        error = 'NIC / Passport number is required';
      } else if (!/^([0-9]{9}[vVxX]|[0-9]{12}|[A-Za-z0-9]{7,10})$/.test(trimmed)) {
        error = 'Invalid NIC or Passport format (e.g. 199512345678 or 987654321V)';
      }
    } else if (field === 'phone') {
      if (!trimmed) {
        error = 'Contact number is required';
      } else if (!/^(?:07[0-9]{8}|\+947[0-9]{8}|0[0-9]{9})$/.test(value.replace(/\s+/g, ''))) {
        error = 'Invalid Sri Lankan contact number';
      }
    } else if (field === 'email') {
      if (trimmed && !/^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(trimmed)) {
        error = 'Invalid email address format (e.g., missing @ or domain)';
      }
    }
    return error;
  };

  const handleChange = (field, value) => {
    setPatientDetails(prev => ({ ...prev, [field]: value }));
    const error = validateField(field, value);
    setFormErrors(prev => {
      const newErrors = { ...prev };
      if (error) {
        newErrors[field] = error;
      } else {
        delete newErrors[field];
      }
      return newErrors;
    });
  };

  const validateForm = () => {
    const errors = {};
    const errName = validateField('fullName', patientDetails.fullName);
    if (errName) errors.fullName = errName;
    const errNic = validateField('nic', patientDetails.nic);
    if (errNic) errors.nic = errNic;
    const errPhone = validateField('phone', patientDetails.phone);
    if (errPhone) errors.phone = errPhone;
    const errEmail = validateField('email', patientDetails.email);
    if (errEmail) errors.email = errEmail;

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleProceedToPayment = () => {
    if (!validateForm()) {
      notify('Please correct the highlighted errors in the form.', 'error');
      return;
    }
    setPaymentErrors({});
    setCurrentStep(5);
  };

  const validatePayment = () => {
    const errs = {};
    if (paymentMethod === 'CreditCard') {
      const cleanNum = (cardData.number || '').replace(/\s+/g, '');
      if (!cleanNum) {
        errs.cardNumber = 'Card number is required';
      } else if (!/^\d{15,19}$/.test(cleanNum)) {
        errs.cardNumber = 'Enter a valid 15-19 digit card number';
      }

      if (!cardData.expiry) {
        errs.expiry = 'Expiry MM/YY required';
      } else if (!/^(0[1-9]|1[0-2])\/?([0-9]{2})$/.test(cardData.expiry)) {
        errs.expiry = 'Format must be MM/YY (e.g. 08/27)';
      }

      if (!cardData.cvv) {
        errs.cvv = 'CVV required';
      } else if (!/^\d{3,4}$/.test(cardData.cvv)) {
        errs.cvv = 'CVV must be 3 or 4 digits';
      }
    } else if (paymentMethod === 'MobileWallet') {
      const cleanPhone = (walletPhone || '').replace(/\s+/g, '');
      if (!cleanPhone) {
        errs.walletPhone = 'Wallet registered mobile number is required';
      } else if (!/^(?:07[0-9]{8}|\+947[0-9]{8})$/.test(cleanPhone)) {
        errs.walletPhone = 'Invalid Sri Lankan mobile format (e.g. 077 123 4567)';
      }
    } else if (paymentMethod === 'BankTransfer') {
      const cleanRef = (bankRef || '').trim();
      if (!cleanRef) {
        errs.bankRef = 'Bank deposit/transfer slip reference number is required';
      } else if (cleanRef.length < 4) {
        errs.bankRef = 'Reference must be at least 4 characters';
      }
    }

    setPaymentErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleCardNumberChange = (e) => {
    let val = e.target.value.replace(/\D/g, '').substring(0, 16);
    val = val.match(/.{1,4}/g)?.join(' ') || val;
    setCardData(prev => ({ ...prev, number: val }));
    if (paymentErrors.cardNumber) setPaymentErrors(prev => ({ ...prev, cardNumber: null }));
  };

  const handleExpiryChange = (e) => {
    let val = e.target.value.replace(/\D/g, '').substring(0, 4);
    if (val.length >= 2) {
      val = val.substring(0, 2) + '/' + val.substring(2);
    }
    setCardData(prev => ({ ...prev, expiry: val }));
    if (paymentErrors.expiry) setPaymentErrors(prev => ({ ...prev, expiry: null }));
  };

  const handleCvvChange = (e) => {
    let val = e.target.value.replace(/\D/g, '').substring(0, 4);
    setCardData(prev => ({ ...prev, cvv: val }));
    if (paymentErrors.cvv) setPaymentErrors(prev => ({ ...prev, cvv: null }));
  };

  // ─── Reservation Handler (Pay on Arrival) ──────────────────────────────────
  const handleConfirmReservation = async () => {
    if (!validateForm()) {
      notify('Please correct the highlighted errors in the form.', 'error');
      return;
    }

    setIsProcessingPayment(true);
    try {
      const bookRes = await bookAppointment({
        doctorId: selectedDoctor.id,
        doctorSessionId: selectedSession.id,
        bookingType: 'Reservation',
        patientName: patientDetails.fullName,
        patientPhone: patientDetails.phone,
        patientEmail: patientDetails.email,
        patientNic: patientDetails.nic,
        patientAddress: patientDetails.address,
        notes: patientDetails.notes
      });

      setConfirmedAppointment(bookRes.data);
      setCurrentStep(5);
      notify('Place reserved successfully! Settle payment on arrival at the hospital reception.', 'success');
    } catch (err) {
      console.error('Reservation failed', err);
      const msg = err.response?.data?.message || 'Failed to reserve appointment';
      notify(msg, 'error');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // ─── Step 5: Payment & Finalize Booking ────────────────────────────────────

  const handleConfirmAndPay = async () => {
    if (!validatePayment()) {
      notify('Please complete and correct all required payment fields.', 'error');
      return;
    }

    setIsProcessingPayment(true);
    try {
      let appointmentId = pendingAppointmentId;

      // 1. Create Appointment with OnlinePayment booking type if not already initiated
      if (!appointmentId) {
        const bookRes = await bookAppointment({
          doctorId: selectedDoctor.id,
          doctorSessionId: selectedSession.id,
          bookingType: 'OnlinePayment',
          patientName: patientDetails.fullName,
          patientPhone: patientDetails.phone,
          patientEmail: patientDetails.email,
          patientNic: patientDetails.nic,
          patientAddress: patientDetails.address,
          notes: patientDetails.notes
        });
        appointmentId = bookRes.data.id;
        setPendingAppointmentId(appointmentId);
      }

      // 2. Process Verified Payment Payload
      let cardRef = null;
      let bankReference = null;

      if (paymentMethod === 'CreditCard') {
        const cleanLast4 = cardData.number.replace(/\s+/g, '').slice(-4);
        cardRef = `**** **** **** ${cleanLast4}`;
      } else if (paymentMethod === 'MobileWallet') {
        bankReference = `${walletProvider}-${walletPhone.trim()}`;
      } else if (paymentMethod === 'BankTransfer') {
        bankReference = `BOC-${bankRef.trim()}`;
      }

      const payRes = await payAppointment(appointmentId, {
        paymentMethod,
        cardMaskedReference: cardRef,
        bankReference
      });

      setConfirmedAppointment(payRes.data);
      setPendingAppointmentId(null);
      notify('Payment verified and appointment confirmed successfully!', 'success');
    } catch (err) {
      console.error('Payment processing failed', err);
      const msg = err.response?.data?.message || 'Payment processing failed. Please verify payment details and try again.';
      notify(msg, 'error');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // ─── Step 6: Appointments Management ──────────────────────────────────────

  const handleCancelBooking = async (aptId) => {
    if (!window.confirm('Are you sure you want to cancel this appointment? This cannot be undone.')) {
      return;
    }
    try {
      await cancelAppointment(aptId);
      notify('Appointment cancelled successfully', 'success');
      fetchMyAppointmentsList();
    } catch (err) {
      notify('Failed to cancel appointment', 'error');
    }
  };

  const handleOpenRescheduleModal = async (apt) => {
    setRescheduleApt(apt);
    setRescheduleLoading(true);
    try {
      const res = await getDoctorSessions(apt.doctorId);
      if (Array.isArray(res.data)) {
        // Exclude current session and expired/unavailable sessions
        setRescheduleSessions(res.data.filter(s => s.id !== apt.doctorSessionId && s.isAvailable && !s.isExpired));
      }
    } catch (err) {
      notify('Failed to load reschedule sessions', 'error');
    } finally {
      setRescheduleLoading(false);
    }
  };

  const handleExecuteReschedule = async (newSessionId) => {
    try {
      await rescheduleAppointment(rescheduleApt.id, newSessionId);
      notify('Appointment rescheduled successfully!', 'success');
      setRescheduleApt(null);
      fetchMyAppointmentsList();
    } catch (err) {
      notify(err.response?.data?.message || 'Failed to reschedule appointment', 'error');
    }
  };

  // ─── Computed Filters & Values ───────────────────────────────────────────

  const filteredDoctors = doctors.filter(doc => {
    if (availabilityFilter === 'today') return doc.availableToday;
    if (availabilityFilter === 'tomorrow') return doc.availableTomorrow;
    return true;
  });

  const getSpecialtyIcon = (name) => {
    switch (name) {
      case 'Cardiology': return <HeartPulse className="w-5 h-5 text-teal-600" />;
      case 'Neurology': return <Brain className="w-5 h-5 text-indigo-600" />;
      case 'Orthopaedics': return <Bone className="w-5 h-5 text-amber-600" />;
      case 'Paediatrics': return <Baby className="w-5 h-5 text-pink-600" />;
      case 'Gynaecology': return <Activity className="w-5 h-5 text-rose-600" />;
      case 'Dermatology': return <Sparkle className="w-5 h-5 text-purple-600" />;
      case 'ENT': return <Headphones className="w-5 h-5 text-blue-600" />;
      case 'General Medicine': return <Stethoscope className="w-5 h-5 text-emerald-600" />;
      default: return <Stethoscope className="w-5 h-5 text-teal-600" />;
    }
  };

  const uniqueSessionDates = [...new Set(availableSessions.filter(s => !s.isExpired).map(s => s.sessionDate))];

  const sessionsForSelectedDate = availableSessions.filter(
    s => s.sessionDate === selectedSessionDate && !s.isExpired
  );

  const totalFee = (selectedDoctor?.consultationFee || 0) + 300.00;

  // Filter My Appointments by active tab
  const filteredMyAppointments = myAppointments.filter(apt => {
    if (appointmentsTab === 'Upcoming') {
      return apt.status === 'Confirmed' || apt.status === 'InProgress' || apt.status === 'PendingPayment' || apt.status === 'Reserved';
    }
    if (appointmentsTab === 'Completed') {
      return apt.status === 'Completed';
    }
    if (appointmentsTab === 'Cancelled') {
      return apt.status === 'Cancelled' || apt.status === 'NoShow';
    }
    return true;
  });

  return (
    <div className="doctor-channeling-wrapper" style={{ fontFamily: 'inherit', color: '#1A2B32' }}>

      {/* ─── Top Navigation Header / Tabs Bar ─── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 20px',
        backgroundColor: '#FFFFFF',
        borderRadius: '12px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            backgroundColor: '#E0F2F1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#00796B'
          }}>
            <Stethoscope size={22} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#004D40' }}>
              Doctor Channeling
            </h1>
            <p style={{ margin: 0, fontSize: '12px', color: '#607D8B' }}>
              Book specialist consultations across Colombo & Kandy hospitals
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => { setCurrentStep(1); }}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: currentStep !== 6 ? '1px solid #00796B' : '1px solid #CFD8DC',
              backgroundColor: currentStep !== 6 ? '#00796B' : '#FFFFFF',
              color: currentStep !== 6 ? '#FFFFFF' : '#37474F',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Search size={15} /> Find Consultants
          </button>
          <button
            onClick={() => {
              setCurrentStep(6);
              fetchMyAppointmentsList();
            }}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: currentStep === 6 ? '1px solid #00796B' : '1px solid #CFD8DC',
              backgroundColor: currentStep === 6 ? '#00796B' : '#FFFFFF',
              color: currentStep === 6 ? '#FFFFFF' : '#37474F',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Calendar size={15} /> My Appointments
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* SCREEN 1: DOCTOR SEARCH & BROWSE BY SPECIALTY                       */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {currentStep === 1 && (
        <div>
          {/* Channeling Desk Banner */}
          <div style={{
            background: 'linear-gradient(90deg, #004D40 0%, #00796B 100%)',
            color: '#FFFFFF',
            padding: '16px 24px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px',
            boxShadow: '0 4px 14px rgba(0,77,64,0.15)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                backgroundColor: 'rgba(255,255,255,0.15)',
                padding: '10px',
                borderRadius: '50%'
              }}>
                <Phone size={22} color="#80CBC4" />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '15px', fontWeight: '700' }}>
                  Need Help? Contact Our Channeling Desk
                </h2>
                <p style={{ margin: 0, fontSize: '12px', color: '#B2DFDB' }}>
                  Call +94 76 447 7999 or visit Health Bridge Hospital for walk-in scheduling assistance.
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <a
                href="tel:+94764477999"
                style={{
                  backgroundColor: '#FFFFFF',
                  color: '#004D40',
                  padding: '8px 16px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: '700',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Phone size={13} /> Call Now
              </a>
            </div>
          </div>

          {/* Find Your Doctor Card */}
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '14px',
            padding: '24px',
            boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
            border: '1px solid #ECEFF1',
            marginBottom: '28px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{
                backgroundColor: '#E0F2F1',
                color: '#00796B',
                fontSize: '11px',
                fontWeight: '800',
                padding: '3px 8px',
                borderRadius: '6px'
              }}>
                STEP 1
              </span>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#004D40' }}>
                Find Your Doctor
              </h2>
            </div>
            <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: '#546E7A' }}>
              Search by name, specialization, hospital branch, or browse our specialty list below.
            </p>

            <form onSubmit={handleSearchSubmit}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px',
                marginBottom: '16px'
              }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#37474F', marginBottom: '6px' }}>
                    DOCTOR NAME
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Search size={16} color="#90A4AE" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                    <input
                      type="text"
                      placeholder="Type doctor name..."
                      value={searchName}
                      onChange={(e) => setSearchName(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px 10px 36px',
                        border: '1px solid #CFD8DC',
                        borderRadius: '8px',
                        fontSize: '13px',
                        boxSizing: 'border-box',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#37474F', marginBottom: '6px' }}>
                    SPECIALIZATION
                  </label>
                  <select
                    value={selectedSpecialty}
                    onChange={(e) => setSelectedSpecialty(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #CFD8DC',
                      borderRadius: '8px',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                      backgroundColor: '#FFFFFF',
                      outline: 'none'
                    }}
                  >
                    <option value="ALL">All Specialties</option>
                    {specialties.map(s => (
                      <option key={s.name} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#37474F', marginBottom: '6px' }}>
                    HOSPITAL BRANCH
                  </label>
                  <select
                    value={selectedHospital}
                    onChange={(e) => setSelectedHospital(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #CFD8DC',
                      borderRadius: '8px',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                      backgroundColor: '#FFFFFF',
                      outline: 'none'
                    }}
                  >
                    <option value="ALL">All Hospitals</option>
                    <option value="Colombo">Health Bridge Hospital - Colombo</option>
                    <option value="Kandy">Health Bridge Hospital - Kandy</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#37474F', marginBottom: '6px' }}>
                    DATE
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #CFD8DC',
                      borderRadius: '8px',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                      backgroundColor: '#FFFFFF',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setSearchName('');
                    setSelectedSpecialty('ALL');
                    setSelectedHospital('ALL');
                    setSelectedDate('');
                    fetchDoctorsList({ search: '', specialization: 'ALL', hospital: 'ALL', date: '' });
                  }}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '8px',
                    border: '1px solid #CFD8DC',
                    backgroundColor: '#FFFFFF',
                    color: '#546E7A',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Reset
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '10px 24px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#00796B',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 2px 8px rgba(0,121,107,0.25)'
                  }}
                >
                  <Search size={16} /> Search Doctors
                </button>
              </div>
            </form>

            {/* Agentic AI Symptom Assistant Box — polished */}
            <div style={{
              position: 'relative',
              marginTop: '24px',
              padding: '20px 24px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, rgba(236,253,245,0.95) 0%, rgba(240,253,250,0.85) 60%, rgba(204,251,241,0.6) 100%)',
              border: '1px solid rgba(167,243,208,0.7)',
              boxShadow: '0 4px 24px rgba(16,185,129,0.08), 0 1px 4px rgba(0,0,0,0.04)',
              overflow: 'hidden'
            }}>
              {/* keyframes injected once */}
              <style>{`
                @keyframes aiMascotIdle {
                  0%,100% { transform: translateY(0px) rotate(-1.5deg); }
                  50%      { transform: translateY(-10px) rotate(1.5deg); }
                }
                @keyframes aiMascotHover {
                  0%,100% { transform: translateY(-3px) scale(1.08) rotate(-1deg); }
                  50%      { transform: translateY(-15px) scale(1.08) rotate(1deg); }
                }
                @keyframes aiAuraPulse {
                  0%,100% { transform: scale(1);   opacity: 0.55; }
                  50%      { transform: scale(1.18); opacity: 0.2;  }
                }
                .ai-mascot-img {
                  animation: aiMascotIdle 3.6s ease-in-out infinite;
                  filter:
                    drop-shadow(0 0 8px rgba(16,185,129,0.7))
                    drop-shadow(0 0 20px rgba(52,211,153,0.45))
                    drop-shadow(0 8px 16px rgba(6,78,59,0.3));
                  transition: filter 0.25s;
                }
                .ai-mascot-img:hover {
                  animation: aiMascotHover 1.1s ease-in-out infinite;
                  filter:
                    drop-shadow(0 0 12px rgba(16,185,129,0.95))
                    drop-shadow(0 0 28px rgba(52,211,153,0.7))
                    drop-shadow(0 0 48px rgba(110,231,183,0.4))
                    drop-shadow(0 10px 22px rgba(6,78,59,0.35)) !important;
                }
                .ai-mascot-aura {
                  animation: aiAuraPulse 2.8s ease-in-out infinite;
                }
                @keyframes aiSpinnerSpin {
                  to { transform: rotate(360deg); }
                }
                .ai-spinner { animation: aiSpinnerSpin 0.9s linear infinite; }
                @media (prefers-reduced-motion: reduce) {
                  .ai-mascot-img  { animation: none !important; filter: none !important; }
                  .ai-mascot-aura { animation: none !important; }
                  .ai-spinner     { animation: none !important; }
                }
              `}</style>

              {/* Layout: content left, mascot right */}
              <div style={{ display: 'flex', alignItems: 'stretch', gap: '0' }}>

                {/* Left: all text + controls */}
                <div style={{ flex: 1, minWidth: 0, paddingRight: '16px' }}>
                  {/* Header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <div style={{
                      width: '28px', height: '28px', borderRadius: '8px',
                      background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: '0 2px 8px rgba(16,185,129,0.35)'
                    }}>
                      <Sparkles size={14} color="#FFFFFF" />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '13px', fontWeight: '800', color: '#064E3B', letterSpacing: '-0.01em' }}>
                        Agentic AI Specialist Recommender
                      </h3>
                      <span style={{ fontSize: '10px', fontWeight: '600', color: '#059669', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Human-in-the-Loop Triage
                      </span>
                    </div>
                  </div>

                  <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: '#065F46', lineHeight: '1.6' }}>
                    Unsure which department to consult? Describe your symptoms in <strong>2 or more words</strong> (e.g. <em>&ldquo;severe chest tightness&rdquo;</em> or <em>&ldquo;skin rash with itching&rdquo;</em>) and our clinical agent will suggest the most appropriate specialty.
                  </p>

                  {/* Input row */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      placeholder="Describe in 2+ words (e.g. severe chest pressure, knee pain when walking)..."
                      value={symptomInput}
                      onChange={(e) => setSymptomInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleAiSymptomTriage(); }}
                      disabled={aiLoading}
                      style={{
                        flex: 1,
                        padding: '10px 14px',
                        border: '1.5px solid rgba(110,231,183,0.8)',
                        borderRadius: '10px',
                        fontSize: '13px',
                        outline: 'none',
                        backgroundColor: 'rgba(255,255,255,0.9)',
                        color: '#064E3B',
                        boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.05)',
                        transition: 'border-color 0.2s, box-shadow 0.2s',
                        opacity: aiLoading ? 0.65 : 1
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#10B981';
                        e.target.style.boxShadow = '0 0 0 3px rgba(16,185,129,0.12), inset 0 1px 3px rgba(0,0,0,0.04)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = 'rgba(110,231,183,0.8)';
                        e.target.style.boxShadow = 'inset 0 1px 3px rgba(0,0,0,0.05)';
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleAiSymptomTriage}
                      disabled={aiLoading}
                      style={{
                        padding: '10px 18px',
                        borderRadius: '10px',
                        border: 'none',
                        background: aiLoading
                          ? 'linear-gradient(135deg, #6EE7B7 0%, #34D399 100%)'
                          : 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                        color: '#FFFFFF',
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: aiLoading ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: aiLoading ? 'none' : '0 3px 10px rgba(16,185,129,0.35)',
                        transition: 'all 0.2s',
                        whiteSpace: 'nowrap'
                      }}
                      onMouseEnter={(e) => { if (!aiLoading) e.currentTarget.style.boxShadow = '0 5px 16px rgba(16,185,129,0.5)'; }}
                      onMouseLeave={(e) => { if (!aiLoading) e.currentTarget.style.boxShadow = '0 3px 10px rgba(16,185,129,0.35)'; }}
                    >
                      {aiLoading
                        ? <RefreshCw size={14} className="ai-spinner" />
                        : <Sparkles size={14} />}
                      {aiLoading ? 'Analyzing...' : 'Ask AI'}
                    </button>
                  </div>

                  <div style={{ marginTop: '7px', fontSize: '11px', color: '#047857', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{ fontSize: '12px' }}>💡</span>
                    <span>Please describe your condition in <strong>2 or more words</strong> for accurate triage (single words like &ldquo;fever&rdquo; or &ldquo;pain&rdquo; lack medical context).</span>
                  </div>

                  {/* ── Status-aware result panel ── */}
                  {aiRecommendations && (() => {
                    const s = aiRecommendations.status;

                    if (s === 'SAFETY_ESCALATION') return (
                      <div style={{
                        marginTop: '14px', padding: '12px 14px',
                        borderRadius: '10px', backgroundColor: '#FEF2F2',
                        border: '2px solid #F87171',
                        display: 'flex', gap: '10px', alignItems: 'flex-start'
                      }}>
                        <AlertCircle size={20} color="#DC2626" style={{ flexShrink: 0, marginTop: '1px' }} />
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: '800', color: '#991B1B', marginBottom: '4px' }}>⚠️ Emergency Alert</div>
                          <div style={{ fontSize: '12px', color: '#7F1D1D', lineHeight: '1.65' }}>{aiRecommendations.safetyMessage}</div>
                        </div>
                      </div>
                    );

                    if (s === 'INPUT_INVALID') return (
                      <div style={{
                        marginTop: '14px', padding: '10px 14px',
                        borderRadius: '10px', backgroundColor: '#FFFBEB',
                        border: '1px solid #FCD34D', fontSize: '12px', color: '#92400E', lineHeight: '1.6'
                      }}>
                        💬 {aiRecommendations.reason}
                      </div>
                    );

                    if (s === 'NEED_MORE_CONTEXT') return (
                      <div style={{
                        marginTop: '14px', padding: '12px 14px',
                        borderRadius: '10px', backgroundColor: '#EFF6FF',
                        border: '1px solid #BFDBFE'
                      }}>
                        <div style={{ fontSize: '12px', fontWeight: '700', color: '#1E40AF', marginBottom: '6px' }}>
                          🤔 A few more details will help:
                        </div>
                        {aiRecommendations.reason && (
                          <div style={{ fontSize: '12px', color: '#1E3A8A', marginBottom: '8px', lineHeight: '1.6' }}>{aiRecommendations.reason}</div>
                        )}
                        <ul style={{ margin: 0, paddingLeft: '18px' }}>
                          {(aiRecommendations.followUpQuestions || []).map((q, i) => (
                            <li key={i} style={{ fontSize: '12px', color: '#1D4ED8', marginBottom: '4px', lineHeight: '1.5' }}>{q}</li>
                          ))}
                        </ul>
                      </div>
                    );

                    if (s === 'SAFE_FAILURE') return (
                      <div style={{
                        marginTop: '14px', padding: '10px 14px',
                        borderRadius: '10px', backgroundColor: 'rgba(248,250,252,0.9)',
                        border: '1px solid #CBD5E1', fontSize: '12px', color: '#475569'
                      }}>
                        ℹ️ Please select a specialty manually using the cards below.
                      </div>
                    );

                    if (s === 'RECOMMENDATION_READY') return (
                      <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px dashed rgba(110,231,183,0.7)' }}>
                        <div style={{ fontSize: '11px', fontWeight: '700', color: '#059669', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                          AI Suggested Specialty
                        </div>
                        <div
                          onClick={() => handleApplyAiSpecialty(aiRecommendations.specialty)}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: '12px',
                            backgroundColor: 'rgba(255,255,255,0.95)',
                            border: '2px solid #10B981',
                            borderRadius: '12px', padding: '10px 16px', cursor: 'pointer',
                            boxShadow: '0 3px 12px rgba(16,185,129,0.15)',
                            transition: 'all 0.18s'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.boxShadow = '0 6px 20px rgba(16,185,129,0.28)';
                            e.currentTarget.style.transform = 'translateY(-1px)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.boxShadow = '0 3px 12px rgba(16,185,129,0.15)';
                            e.currentTarget.style.transform = 'translateY(0)';
                          }}
                        >
                          <span style={{
                            background: 'linear-gradient(135deg, #D1FAE5 0%, #A7F3D0 100%)',
                            color: '#065F46',
                            fontSize: '11px', fontWeight: '800',
                            padding: '3px 9px', borderRadius: '6px',
                            border: '1px solid rgba(16,185,129,0.2)',
                            whiteSpace: 'nowrap'
                          }}>
                            {Math.round((aiRecommendations.confidence ?? 0) * 100)}% match
                          </span>
                          <div>
                            <div style={{ fontSize: '14px', fontWeight: '800', color: '#064E3B', letterSpacing: '-0.01em' }}>
                              {aiRecommendations.specialty}
                            </div>
                            {aiRecommendations.reason && (
                              <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '2px', lineHeight: '1.5' }}>
                                {aiRecommendations.reason}
                              </div>
                            )}
                          </div>
                          <ChevronRight size={16} color="#10B981" />
                        </div>
                        <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '8px' }}>
                          ✨ AI suggestion only — you always choose your doctor.
                        </div>
                      </div>
                    );

                    return null;
                  })()}
                </div>

                {/* Right: mascot column */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  width: '150px',
                  paddingLeft: '12px',
                  position: 'relative'
                }}>
                  {/* Pulsing aura ring behind mascot */}
                  <div
                    className="ai-mascot-aura"
                    style={{
                      position: 'absolute',
                      width: '115px',
                      height: '115px',
                      borderRadius: '50%',
                      background: 'radial-gradient(circle, rgba(52,211,153,0.32) 0%, rgba(16,185,129,0.14) 55%, transparent 75%)',
                      pointerEvents: 'none',
                      zIndex: 0
                    }}
                  />
                  <img
                    src={doctorAgent}
                    alt=""
                    aria-hidden="true"
                    className="ai-mascot-img"
                    style={{
                      width: '130px',
                      height: 'auto',
                      display: 'block',
                      position: 'relative',
                      zIndex: 1
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Browse by Specialty Section */}
          <div style={{ marginBottom: '30px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#004D40' }}>
                  Browse by Specialty
                </h3>
                <p style={{ margin: 0, fontSize: '12px', color: '#78909C' }}>
                  Select a department to view available consultants
                </p>
              </div>
              <span style={{ fontSize: '12px', fontWeight: '600', color: '#00796B' }}>
                8 Medical Specialties
              </span>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
              gap: '14px'
            }}>
              {specialties.map(spec => (
                <div
                  key={spec.name}
                  onClick={() => handleSelectSpecialtyCard(spec.name)}
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E0E0E0',
                    borderRadius: '12px',
                    padding: '16px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#00796B';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 14px rgba(0,121,107,0.12)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#E0E0E0';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.02)';
                  }}
                >
                  <div style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '10px',
                    backgroundColor: '#E0F2F1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {getSpecialtyIcon(spec.name)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: '700', color: '#263238' }}>
                      {spec.name}
                    </h4>
                    <span style={{
                      fontSize: '11px',
                      color: '#00796B',
                      fontWeight: '700',
                      backgroundColor: '#E0F2F1',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      display: 'inline-block'
                    }}>
                      {spec.consultantCount} Consultant{spec.consultantCount !== 1 ? 's' : ''} Available
                    </span>
                  </div>
                  <ChevronRight size={16} color="#9E9E9E" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* SCREEN 2: AVAILABLE SPECIALISTS LIST                                */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {currentStep === 2 && (
        <div>
          {/* Header Bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                onClick={() => setCurrentStep(1)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid #CFD8DC',
                  backgroundColor: '#FFFFFF',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '12px',
                  color: '#455A64'
                }}
              >
                <ArrowLeft size={14} /> Back
              </button>
              <div>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#004D40' }}>
                  Available Specialists ({filteredDoctors.length} Consultants)
                </h2>
                <p style={{ margin: 0, fontSize: '12px', color: '#78909C' }}>
                  Showing specialists for: <strong>{selectedSpecialty === 'ALL' ? 'All Specialties' : selectedSpecialty}</strong>
                </p>
              </div>
            </div>

            {/* Controls */}
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '12px', color: '#546E7A', fontWeight: '600' }}>Sort by:</span>
                <select
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value);
                    fetchDoctorsList({ sortBy: e.target.value });
                  }}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '6px',
                    border: '1px solid #CFD8DC',
                    fontSize: '12px',
                    backgroundColor: '#FFFFFF',
                    outline: 'none'
                  }}
                >
                  <option value="rating">Rating (Highest)</option>
                  <option value="fee">Fee (Low-High)</option>
                  <option value="experience">Experience (Years)</option>
                </select>
              </div>

              {/* Availability Filter Chips */}
              <div style={{ display: 'flex', gap: '4px', backgroundColor: '#ECEFF1', padding: '3px', borderRadius: '6px' }}>
                {['all', 'today', 'tomorrow'].map(filter => (
                  <button
                    key={filter}
                    onClick={() => setAvailabilityFilter(filter)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '4px',
                      border: 'none',
                      backgroundColor: availabilityFilter === filter ? '#FFFFFF' : 'transparent',
                      color: availabilityFilter === filter ? '#004D40' : '#607D8B',
                      fontSize: '11px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      boxShadow: availabilityFilter === filter ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                    }}
                  >
                    {filter === 'all' ? 'All' : filter === 'today' ? 'Available Today' : 'Available Tomorrow'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Doctors Listing */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#00796B' }}>
              <RefreshCw size={32} className="animate-spin" style={{ margin: '0 auto 12px auto' }} />
              <p>Finding matching specialists...</p>
            </div>
          ) : filteredDoctors.length === 0 ? (
            <div style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              padding: '60px 20px',
              textAlign: 'center',
              border: '1px dashed #CFD8DC'
            }}>
              <User size={48} color="#90A4AE" style={{ margin: '0 auto 12px auto' }} />
              <h3 style={{ margin: '0 0 6px 0', color: '#37474F' }}>No specialists found</h3>
              <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#78909C' }}>
                Try adjusting your search criteria or specialty filters.
              </p>
              <button
                onClick={() => {
                  setSearchName('');
                  setSelectedSpecialty('ALL');
                  setAvailabilityFilter('all');
                  fetchDoctorsList({ search: '', specialization: 'ALL' });
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#00796B',
                  color: '#FFFFFF',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {filteredDoctors.map(doc => (
                <div
                  key={doc.id}
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '12px',
                    border: '1px solid #E0E0E0',
                    padding: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                    flexWrap: 'wrap',
                    gap: '16px'
                  }}
                >
                  {/* Left Column: Avatar & Doctor Info */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: '300px', flex: 1 }}>
                    {/* Initials Avatar */}
                    <div style={{
                      width: '60px',
                      height: '60px',
                      borderRadius: '50%',
                      backgroundColor: '#004D40',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '18px',
                      fontWeight: '800',
                      flexShrink: 0,
                      border: '2px solid #80CBC4'
                    }}>
                      {doc.fullName.replace('Dr. ', '').split(' ').map(n => n[0]).slice(0, 2).join('')}
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{
                          backgroundColor: '#E0F2F1',
                          color: '#00796B',
                          fontSize: '10px',
                          fontWeight: '800',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px'
                        }}>
                          <ShieldCheck size={11} /> RSGDGNT CONSULTANT
                        </span>
                        <span style={{
                          backgroundColor: '#F5F5F5',
                          color: '#616161',
                          fontSize: '11px',
                          fontWeight: '600',
                          padding: '2px 8px',
                          borderRadius: '10px'
                        }}>
                          {doc.specialization}
                        </span>
                      </div>

                      <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: '800', color: '#1A2B32' }}>
                        {doc.fullName}
                      </h3>
                      <p style={{ margin: '0 0 6px 0', fontSize: '12px', color: '#546E7A' }}>
                        {doc.qualifications}
                      </p>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '12px', color: '#607D8B', flexWrap: 'wrap' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#E65100', fontWeight: '700' }}>
                          <Star size={13} fill="#FFB300" color="#FFB300" /> {doc.rating.toFixed(1)} ({doc.reviewCount} Reviews)
                        </span>
                        <span>•</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Award size={13} /> {doc.experienceYears}+ Years
                        </span>
                        <span>•</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <MapPin size={13} /> {doc.hospitalBranch}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Fee, Availability & Actions */}
                  <div style={{ textAlign: 'right', minWidth: '180px' }}>
                    <div style={{ fontSize: '18px', fontWeight: '900', color: '#004D40', marginBottom: '4px' }}>
                      LKR {doc.consultationFee.toLocaleString()}
                      <span style={{ fontSize: '11px', fontWeight: '500', color: '#90A4AE' }}> / visit</span>
                    </div>

                    <div style={{ marginBottom: '12px' }}>
                      {doc.availableToday ? (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          fontSize: '11px',
                          fontWeight: '700',
                          color: '#2E7D32'
                        }}>
                          <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#4CAF50' }} />
                          Available Today ({doc.slotsLeft} slots left)
                        </span>
                      ) : doc.availableTomorrow ? (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          fontSize: '11px',
                          fontWeight: '700',
                          color: '#EF6C00'
                        }}>
                          <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#FF9800' }} />
                          Available Tomorrow
                        </span>
                      ) : (
                        <span style={{ fontSize: '11px', color: '#78909C' }}>
                          Next sessions this week
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => handleSelectDoctor(doc)}
                        style={{
                          padding: '7px 14px',
                          borderRadius: '6px',
                          border: '1px solid #CFD8DC',
                          backgroundColor: '#FFFFFF',
                          color: '#37474F',
                          fontSize: '12px',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                      >
                        View Profile
                      </button>
                      <button
                        onClick={() => handleSelectDoctor(doc)}
                        style={{
                          padding: '7px 18px',
                          borderRadius: '6px',
                          border: 'none',
                          backgroundColor: '#00796B',
                          color: '#FFFFFF',
                          fontSize: '12px',
                          fontWeight: '700',
                          cursor: 'pointer',
                          boxShadow: '0 2px 6px rgba(0,121,107,0.2)'
                        }}
                      >
                        Book Now
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* SCREEN 3: PROFILE & SESSION SELECTION                               */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {currentStep === 3 && selectedDoctor && (
        <div>
          {/* Top Return Bar */}
          <div style={{ marginBottom: '16px' }}>
            <button
              onClick={() => setCurrentStep(2)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid #CFD8DC',
                backgroundColor: '#FFFFFF',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
                color: '#455A64'
              }}
            >
              <ArrowLeft size={14} /> Back to Specialists
            </button>
          </div>

          {/* Consultant Profile Card */}
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '14px',
            padding: '24px',
            border: '1px solid #E0E0E0',
            boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
            marginBottom: '20px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <span style={{
                backgroundColor: '#E0F2F1',
                color: '#00796B',
                fontSize: '11px',
                fontWeight: '800',
                padding: '3px 8px',
                borderRadius: '6px'
              }}>
                STEP 2: PROFILE & SESSION SELECTION
              </span>
            </div>

            <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                backgroundColor: '#004D40',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '22px',
                fontWeight: '800',
                border: '3px solid #80CBC4'
              }}>
                {selectedDoctor.fullName.replace('Dr. ', '').split(' ').map(n => n[0]).slice(0, 2).join('')}
              </div>

              <div style={{ flex: 1 }}>
                <h2 style={{ margin: '0 0 4px 0', fontSize: '20px', fontWeight: '800', color: '#004D40' }}>
                  {selectedDoctor.fullName}
                </h2>
                <div style={{ fontSize: '13px', color: '#546E7A', marginBottom: '6px' }}>
                  {selectedDoctor.qualifications} • <strong>{selectedDoctor.experienceYears}+ Years Experience</strong>
                </div>
                <div style={{ fontSize: '12px', color: '#00796B', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Building2 size={14} /> {selectedDoctor.hospitalBranch} ({selectedDoctor.roomNumber})
                </div>
                {selectedDoctor.bio && (
                  <div style={{
                    marginTop: '8px',
                    fontSize: '12px',
                    fontStyle: 'italic',
                    color: '#455A64',
                    backgroundColor: '#F5F5F5',
                    padding: '8px 12px',
                    borderRadius: '6px'
                  }}>
                    "{selectedDoctor.bio}"
                  </div>
                )}
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '11px', color: '#78909C', textTransform: 'uppercase', fontWeight: '700' }}>
                  Consultation Fee
                </div>
                <div style={{ fontSize: '22px', fontWeight: '900', color: '#004D40' }}>
                  LKR {selectedDoctor.consultationFee.toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          {/* 5-Day Weekday Date Selector */}
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '14px',
            padding: '24px',
            border: '1px solid #E0E0E0',
            boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
            marginBottom: '20px'
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: '800', color: '#004D40' }}>
              Available Sessions — Select Date & Time Slot
            </h3>

            {uniqueSessionDates.length === 0 ? (
              <p style={{ color: '#78909C', fontSize: '13px' }}>
                No active channeling sessions scheduled for this doctor this week.
              </p>
            ) : (
              <div>
                {/* Horizontal Date Picker Chips */}
                <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '12px', marginBottom: '16px' }}>
                  {uniqueSessionDates.map(dateStr => {
                    const d = new Date(dateStr);
                    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
                    const dayNum = d.getDate();
                    const isSelected = selectedSessionDate === dateStr;

                    return (
                      <button
                        key={dateStr}
                        onClick={() => {
                          setSelectedSessionDate(dateStr);
                          setSelectedSession(null);
                        }}
                        style={{
                          padding: '12px 20px',
                          borderRadius: '10px',
                          border: isSelected ? '2px solid #00796B' : '1px solid #CFD8DC',
                          backgroundColor: isSelected ? '#00796B' : '#FFFFFF',
                          color: isSelected ? '#FFFFFF' : '#37474F',
                          cursor: 'pointer',
                          textAlign: 'center',
                          minWidth: '80px',
                          boxShadow: isSelected ? '0 4px 10px rgba(0,121,107,0.25)' : 'none'
                        }}
                      >
                        <div style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: '700' }}>
                          {dayName}
                        </div>
                        <div style={{ fontSize: '18px', fontWeight: '900', marginTop: '2px' }}>
                          {dayNum}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Time Slots Grid */}
                <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', fontWeight: '700', color: '#37474F' }}>
                  Select Time Slot for {selectedSessionDate}
                </h4>

                {sessionsForSelectedDate.length === 0 ? (
                  <p style={{ color: '#78909C', fontSize: '13px', margin: '10px 0 20px 0' }}>
                    No upcoming time slots remaining for this date.
                  </p>
                ) : (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                    gap: '10px',
                    marginBottom: '20px'
                  }}>
                    {sessionsForSelectedDate.map(session => {
                      const isSelected = selectedSession?.id === session.id;
                      const disabled = !session.isAvailable;

                      return (
                        <button
                          key={session.id}
                          disabled={disabled}
                          onClick={() => setSelectedSession(session)}
                          style={{
                            padding: '12px 10px',
                            borderRadius: '8px',
                            border: isSelected ? '2px solid #00796B' : '1px solid #B2DFDB',
                            backgroundColor: disabled ? '#ECEFF1' : isSelected ? '#E0F2F1' : '#FFFFFF',
                            color: disabled ? '#90A4AE' : '#004D40',
                            fontWeight: '700',
                            fontSize: '13px',
                            cursor: disabled ? 'not-allowed' : 'pointer',
                            textAlign: 'center',
                            boxShadow: isSelected ? '0 2px 8px rgba(0,121,107,0.2)' : 'none'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                            <Clock size={13} /> {session.timeFormatted}
                          </div>
                          <div style={{
                            fontSize: '10px',
                            marginTop: '4px',
                            color: disabled ? '#B0BEC5' : '#00796B',
                            fontWeight: '600'
                          }}>
                            {disabled ? 'Booked' : 'Available'}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Persistent Dynamic Summary Bar */}
                {selectedSession && (
                  <div style={{
                    backgroundColor: '#E0F2F1',
                    border: '1px solid #80CBC4',
                    borderRadius: '10px',
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px'
                  }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '800', color: '#004D40' }}>
                        Selected: {selectedSessionDate} • {selectedSession.timeFormatted}
                      </div>
                      <div style={{ fontSize: '12px', color: '#00796B' }}>
                        Consultation Fee: <strong>LKR {selectedDoctor.consultationFee.toLocaleString()}</strong> + Service Charge (LKR 300.00)
                      </div>
                    </div>

                    <button
                      onClick={() => setCurrentStep(4)}
                      style={{
                        padding: '10px 24px',
                        borderRadius: '8px',
                        border: 'none',
                        backgroundColor: '#00796B',
                        color: '#FFFFFF',
                        fontSize: '13px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: '0 2px 8px rgba(0,121,107,0.3)'
                      }}
                    >
                      Book Appointment <ArrowRight size={16} />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* SCREEN 4: PATIENT DETAILS FORM                                      */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {currentStep === 4 && selectedDoctor && selectedSession && (
        <div>
          {/* Top Back Navigation */}
          <div style={{ marginBottom: '16px' }}>
            <button
              onClick={() => setCurrentStep(3)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid #CFD8DC',
                backgroundColor: '#FFFFFF',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
                color: '#455A64'
              }}
            >
              <ArrowLeft size={14} /> Back to Session Picker
            </button>
          </div>

          {/* Persistent Summary Teal Banner */}
          <div style={{
            backgroundColor: '#004D40',
            color: '#FFFFFF',
            borderRadius: '12px',
            padding: '16px 20px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px'
          }}>
            <div>
              <div style={{ fontSize: '11px', color: '#80CBC4', textTransform: 'uppercase', fontWeight: '800' }}>
                STEP 3: PATIENT DETAILS FORM
              </div>
              <div style={{ fontSize: '15px', fontWeight: '800', marginTop: '2px' }}>
                Doctor: {selectedDoctor.fullName} • {selectedDoctor.specialization}
              </div>
              <div style={{ fontSize: '12px', color: '#B2DFDB' }}>
                Date: {selectedSessionDate}, {selectedSession.timeFormatted} | Fee: LKR {selectedDoctor.consultationFee.toLocaleString()}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{
                backgroundColor: '#E0F2F1',
                color: '#004D40',
                padding: '4px 10px',
                borderRadius: '20px',
                fontSize: '11px',
                fontWeight: '700'
              }}>
                1 Slot Reserved
              </span>
            </div>
          </div>

          {/* Patient Form */}
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '14px',
            padding: '24px',
            border: '1px solid #E0E0E0',
            boxShadow: '0 2px 10px rgba(0,0,0,0.04)'
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '800', color: '#004D40' }}>
              Patient Contact & Identity Information
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: formErrors.fullName ? '#EF4444' : '#37474F', marginBottom: '6px' }}>
                  FULL NAME *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Nuwan Perera"
                  value={patientDetails.fullName}
                  onChange={(e) => handleChange('fullName', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: formErrors.fullName ? '1px solid #EF4444' : '1px solid #CFD8DC',
                    borderRadius: '8px',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                    backgroundColor: formErrors.fullName ? '#FEF2F2' : '#FFFFFF'
                  }}
                />
                {formErrors.fullName && <div style={{ fontSize: '11px', color: '#EF4444', marginTop: '4px', fontWeight: '600' }}>{formErrors.fullName}</div>}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: formErrors.nic ? '#EF4444' : '#37474F', marginBottom: '6px' }}>
                  NIC / PASSPORT NUMBER *
                </label>
                <input
                  type="text"
                  placeholder="e.g. 199512345678 or 987654321V"
                  value={patientDetails.nic}
                  onChange={(e) => handleChange('nic', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: formErrors.nic ? '1px solid #EF4444' : '1px solid #CFD8DC',
                    borderRadius: '8px',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                    backgroundColor: formErrors.nic ? '#FEF2F2' : '#FFFFFF'
                  }}
                />
                {formErrors.nic && <div style={{ fontSize: '11px', color: '#EF4444', marginTop: '4px', fontWeight: '600' }}>{formErrors.nic}</div>}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: formErrors.phone ? '#EF4444' : '#37474F', marginBottom: '6px' }}>
                    CONTACT NUMBER *
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. +94 77 123 4567"
                    value={patientDetails.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: formErrors.phone ? '1px solid #EF4444' : '1px solid #CFD8DC',
                      borderRadius: '8px',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                      backgroundColor: formErrors.phone ? '#FEF2F2' : '#FFFFFF'
                    }}
                  />
                  {formErrors.phone && <div style={{ fontSize: '11px', color: '#EF4444', marginTop: '4px', fontWeight: '600' }}>{formErrors.phone}</div>}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: formErrors.email ? '#EF4444' : '#37474F', marginBottom: '6px' }}>
                    EMAIL ADDRESS
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. patient@gmail.com"
                    value={patientDetails.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: formErrors.email ? '1px solid #EF4444' : '1px solid #CFD8DC',
                      borderRadius: '8px',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                      backgroundColor: formErrors.email ? '#FEF2F2' : '#FFFFFF'
                    }}
                  />
                  {formErrors.email && <div style={{ fontSize: '11px', color: '#EF4444', marginTop: '4px', fontWeight: '600' }}>{formErrors.email}</div>}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#37474F', marginBottom: '6px' }}>
                  ADDRESS (OPTIONAL)
                </label>
                <input
                  type="text"
                  placeholder="e.g. No. 45, Galle Road, Colombo 03"
                  value={patientDetails.address}
                  onChange={(e) => setPatientDetails({ ...patientDetails, address: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #CFD8DC',
                    borderRadius: '8px',
                    fontSize: '13px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#37474F', marginBottom: '6px' }}>
                  REASON / SYMPTOMS NOTES (OPTIONAL)
                </label>
                <textarea
                  rows={2}
                  placeholder="Brief note for the doctor..."
                  value={patientDetails.notes}
                  onChange={(e) => setPatientDetails({ ...patientDetails, notes: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #CFD8DC',
                    borderRadius: '8px',
                    fontSize: '13px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Booking Mode Selection: Reserve vs Pay Online */}
              <div style={{ marginTop: '10px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#37474F', marginBottom: '8px' }}>
                  BOOKING & PAYMENT PREFERENCE *
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                  <div
                    onClick={() => setBookingType('Reservation')}
                    style={{
                      padding: '14px',
                      borderRadius: '10px',
                      border: bookingType === 'Reservation' ? '2px solid #00796B' : '1px solid #CFD8DC',
                      backgroundColor: bookingType === 'Reservation' ? '#E0F2F1' : '#FFFFFF',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '13px', fontWeight: '800', color: '#004D40' }}>
                        Reserve a Place
                      </span>
                      <span style={{
                        fontSize: '10px',
                        fontWeight: '700',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        backgroundColor: '#DCFCE7',
                        color: '#15803D'
                      }}>
                        Pay at Desk
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: '11px', color: '#546E7A' }}>
                      Get your queue number and QR instantly. Pay consultation fee in-person at hospital counter.
                    </p>
                  </div>

                  <div
                    onClick={() => setBookingType('OnlinePayment')}
                    style={{
                      padding: '14px',
                      borderRadius: '10px',
                      border: bookingType === 'OnlinePayment' ? '2px solid #00796B' : '1px solid #CFD8DC',
                      backgroundColor: bookingType === 'OnlinePayment' ? '#E0F2F1' : '#FFFFFF',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '13px', fontWeight: '800', color: '#004D40' }}>
                        Book & Pay Online
                      </span>
                      <span style={{
                        fontSize: '10px',
                        fontWeight: '700',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        backgroundColor: '#E0F2FE',
                        color: '#0369A1'
                      }}>
                        Card / Wallet
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: '11px', color: '#546E7A' }}>
                      Complete payment now using Credit/Debit Card or Mobile Wallet for fast-track arrival.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '10px',
                paddingTop: '16px',
                borderTop: '1px solid #ECEFF1'
              }}>
                <button
                  type="button"
                  onClick={handleValidateAvailability}
                  disabled={validatingAvailability}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '8px',
                    border: '1px solid #00796B',
                    backgroundColor: '#FFFFFF',
                    color: '#00796B',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: validatingAvailability ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <RefreshCw size={14} className={validatingAvailability ? 'animate-spin' : ''} />
                  {validatingAvailability ? 'Checking...' : isSessionValidated ? '✓ Slot Validated' : 'Validate Availability'}
                </button>

                {bookingType === 'Reservation' ? (
                  <button
                    type="button"
                    onClick={handleConfirmReservation}
                    disabled={isProcessingPayment}
                    style={{
                      padding: '10px 24px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: '#00796B',
                      color: '#FFFFFF',
                      fontSize: '13px',
                      fontWeight: '700',
                      cursor: isProcessingPayment ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 2px 8px rgba(0,121,107,0.25)'
                    }}
                  >
                    {isProcessingPayment ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={16} />}
                    {isProcessingPayment ? 'Reserving...' : 'Confirm Reservation & Get QR'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleProceedToPayment}
                    style={{
                      padding: '10px 24px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: '#00796B',
                      color: '#FFFFFF',
                      fontSize: '13px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 2px 8px rgba(0,121,107,0.25)'
                    }}
                  >
                    Proceed to Payment <ArrowRight size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* SCREEN 5: PAYMENT PROCESSING & APPOINTMENT CONFIRMATION             */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {currentStep === 5 && selectedDoctor && selectedSession && (
        <div>
          {/* Top Back Navigation (if not confirmed yet) */}
          {!confirmedAppointment && (
            <div style={{ marginBottom: '16px' }}>
              <button
                onClick={() => setCurrentStep(4)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid #CFD8DC',
                  backgroundColor: '#FFFFFF',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  color: '#455A64'
                }}
              >
                <ArrowLeft size={14} /> Back to Details
              </button>
            </div>
          )}

          {!confirmedAppointment ? (
            /* Payment Processing State */
            <div style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '14px',
              padding: '24px',
              border: '1px solid #E0E0E0',
              boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
              maxWidth: '680px',
              margin: '0 auto'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <span style={{
                  backgroundColor: '#E0F2F1',
                  color: '#00796B',
                  fontSize: '11px',
                  fontWeight: '800',
                  padding: '3px 8px',
                  borderRadius: '6px'
                }}>
                  STEP 4 & 5: PAYMENT & CONFIRMATION
                </span>
              </div>

              <h2 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '800', color: '#004D40' }}>
                Payment Processing
              </h2>

              {/* Itemized Fee Table */}
              <div style={{
                backgroundColor: '#F8FAFC',
                borderRadius: '10px',
                padding: '16px',
                marginBottom: '20px',
                border: '1px solid #E2E8F0'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px', color: '#475569' }}>
                  <span>Consultation Fee ({selectedDoctor.fullName})</span>
                  <span style={{ fontWeight: '600' }}>LKR {selectedDoctor.consultationFee.toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '12px', color: '#475569' }}>
                  <span>Channeling Service Charge</span>
                  <span style={{ fontWeight: '600' }}>LKR 300.00</span>
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '16px',
                  fontWeight: '900',
                  color: '#004D40',
                  paddingTop: '10px',
                  borderTop: '1px dashed #CBD5E1'
                }}>
                  <span>Total Payable</span>
                  <span>LKR {totalFee.toLocaleString()}</span>
                </div>
              </div>

              {/* Payment Method Tabs */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#37474F', marginBottom: '8px' }}>
                  SELECT PAYMENT METHOD
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  {[
                    { id: 'CreditCard', label: 'Credit Card', icon: <CreditCard size={16} /> },
                    { id: 'MobileWallet', label: 'Mobile Wallet', icon: <Smartphone size={16} /> },
                    { id: 'BankTransfer', label: 'Bank Transfer', icon: <Building2 size={16} /> }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        setPaymentMethod(tab.id);
                        setPaymentErrors({});
                      }}
                      style={{
                        padding: '12px 10px',
                        borderRadius: '8px',
                        border: paymentMethod === tab.id ? '2px solid #00796B' : '1px solid #CFD8DC',
                        backgroundColor: paymentMethod === tab.id ? '#E0F2F1' : '#FFFFFF',
                        color: paymentMethod === tab.id ? '#004D40' : '#455A64',
                        fontWeight: '700',
                        fontSize: '12px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      {tab.icon} {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tab Form Content */}
              {paymentMethod === 'CreditCard' && (
                <div style={{ padding: '18px', borderRadius: '10px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '800', color: '#004D40' }}>
                      💳 Credit / Debit Card Payment
                    </span>
                    <span style={{ fontSize: '11px', color: '#64748B' }}>
                      Visa • Mastercard • Amex
                    </span>
                  </div>

                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                      CARD NUMBER *
                    </label>
                    <input
                      type="text"
                      placeholder="4111 2222 3333 4444"
                      maxLength={19}
                      value={cardData.number}
                      onChange={handleCardNumberChange}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: paymentErrors.cardNumber ? '1.5px solid #EF4444' : '1px solid #CBD5E1',
                        borderRadius: '6px',
                        fontSize: '13px',
                        boxSizing: 'border-box',
                        outline: 'none'
                      }}
                    />
                    {paymentErrors.cardNumber && (
                      <div style={{ color: '#EF4444', fontSize: '11px', marginTop: '4px', fontWeight: '600' }}>
                        {paymentErrors.cardNumber}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                        EXPIRY DATE (MM/YY) *
                      </label>
                      <input
                        type="text"
                        placeholder="MM/YY"
                        maxLength={5}
                        value={cardData.expiry}
                        onChange={handleExpiryChange}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: paymentErrors.expiry ? '1.5px solid #EF4444' : '1px solid #CBD5E1',
                          borderRadius: '6px',
                          fontSize: '13px',
                          boxSizing: 'border-box',
                          outline: 'none'
                        }}
                      />
                      {paymentErrors.expiry && (
                        <div style={{ color: '#EF4444', fontSize: '11px', marginTop: '4px', fontWeight: '600' }}>
                          {paymentErrors.expiry}
                        </div>
                      )}
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                        SECURITY CODE (CVV) *
                      </label>
                      <input
                        type="password"
                        placeholder="•••"
                        maxLength={4}
                        value={cardData.cvv}
                        onChange={handleCvvChange}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: paymentErrors.cvv ? '1.5px solid #EF4444' : '1px solid #CBD5E1',
                          borderRadius: '6px',
                          fontSize: '13px',
                          boxSizing: 'border-box',
                          outline: 'none'
                        }}
                      />
                      {paymentErrors.cvv && (
                        <div style={{ color: '#EF4444', fontSize: '11px', marginTop: '4px', fontWeight: '600' }}>
                          {paymentErrors.cvv}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {paymentMethod === 'MobileWallet' && (
                <div style={{ padding: '18px', borderRadius: '10px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', marginBottom: '20px' }}>
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                      SELECT WALLET PROVIDER *
                    </label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {['FriMi', 'eZ Cash', 'Dialog Genie'].map(w => (
                        <button
                          key={w}
                          type="button"
                          onClick={() => setWalletProvider(w)}
                          style={{
                            flex: 1,
                            padding: '8px 10px',
                            borderRadius: '6px',
                            border: walletProvider === w ? '2px solid #00796B' : '1px solid #CBD5E1',
                            backgroundColor: walletProvider === w ? '#E0F2F1' : '#FFFFFF',
                            color: walletProvider === w ? '#004D40' : '#475569',
                            fontSize: '12px',
                            fontWeight: '700',
                            cursor: 'pointer'
                          }}
                        >
                          {w}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                      REGISTERED MOBILE NUMBER *
                    </label>
                    <input
                      type="tel"
                      placeholder="077 123 4567"
                      value={walletPhone}
                      onChange={(e) => {
                        setWalletPhone(e.target.value);
                        if (paymentErrors.walletPhone) setPaymentErrors(prev => ({ ...prev, walletPhone: null }));
                      }}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: paymentErrors.walletPhone ? '1.5px solid #EF4444' : '1px solid #CBD5E1',
                        borderRadius: '6px',
                        fontSize: '13px',
                        boxSizing: 'border-box',
                        outline: 'none'
                      }}
                    />
                    {paymentErrors.walletPhone && (
                      <div style={{ color: '#EF4444', fontSize: '11px', marginTop: '4px', fontWeight: '600' }}>
                        {paymentErrors.walletPhone}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {paymentMethod === 'BankTransfer' && (
                <div style={{ padding: '18px', borderRadius: '10px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', marginBottom: '20px' }}>
                  <div style={{ backgroundColor: '#EFF6FF', padding: '10px 14px', borderRadius: '6px', marginBottom: '12px', border: '1px solid #BFDBFE' }}>
                    <div style={{ fontSize: '11px', fontWeight: '800', color: '#1E40AF', marginBottom: '2px' }}>
                      DIRECT DEPOSIT / ONLINE BANK TRANSFER
                    </div>
                    <div style={{ fontSize: '12px', color: '#1E3A8A' }}>
                      Account: <strong>Health Bridge Pvt Ltd</strong> • Bank: <strong>Bank of Ceylon (BOC)</strong><br />
                      Account No: <strong>00812345678</strong> • Branch: <strong>Corporate Branch</strong>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                      DEPOSIT SLIP / ONLINE TXN REFERENCE *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. BOC-TXN-984218"
                      value={bankRef}
                      onChange={(e) => {
                        setBankRef(e.target.value);
                        if (paymentErrors.bankRef) setPaymentErrors(prev => ({ ...prev, bankRef: null }));
                      }}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: paymentErrors.bankRef ? '1.5px solid #EF4444' : '1px solid #CBD5E1',
                        borderRadius: '6px',
                        fontSize: '13px',
                        boxSizing: 'border-box',
                        outline: 'none'
                      }}
                    />
                    {paymentErrors.bankRef && (
                      <div style={{ color: '#EF4444', fontSize: '11px', marginTop: '4px', fontWeight: '600' }}>
                        {paymentErrors.bankRef}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={handleConfirmAndPay}
                disabled={isProcessingPayment}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: '#00796B',
                  color: '#FFFFFF',
                  fontSize: '14px',
                  fontWeight: '800',
                  cursor: isProcessingPayment ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(0,121,107,0.25)'
                }}
              >
                {isProcessingPayment ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle2 size={18} />}
                {isProcessingPayment ? 'Authorizing & Verifying Payment...' : `Authorize & Pay LKR ${totalFee.toLocaleString()}`}
              </button>
            </div>
          ) : (
            /* Appointment Confirmed / Reserved State (with QR Code) */
            <div style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              padding: '32px 24px',
              border: confirmedAppointment.paymentStatus === 'Paid' ? '2px solid #00796B' : '2px solid #F59E0B',
              boxShadow: '0 4px 20px rgba(0,77,64,0.08)',
              maxWidth: '560px',
              margin: '0 auto',
              textAlign: 'center'
            }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: confirmedAppointment.paymentStatus === 'Paid' ? '#DCFCE7' : '#FEF3C7',
                color: confirmedAppointment.paymentStatus === 'Paid' ? '#15803D' : '#B45309',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px auto'
              }}>
                <CheckCircle2 size={36} />
              </div>

              <span style={{
                backgroundColor: confirmedAppointment.paymentStatus === 'Paid' ? '#DCFCE7' : '#FEF3C7',
                color: confirmedAppointment.paymentStatus === 'Paid' ? '#15803D' : '#B45309',
                fontSize: '11px',
                fontWeight: '800',
                padding: '4px 12px',
                borderRadius: '20px',
                textTransform: 'uppercase'
              }}>
                {confirmedAppointment.paymentStatus === 'Paid' ? '✓ PAYMENT CONFIRMED & VERIFIED' : 'RESERVATION PASS — PAYMENT DUE AT DESK'}
              </span>

              <h2 style={{ margin: '10px 0 4px 0', fontSize: '20px', fontWeight: '900', color: '#004D40' }}>
                {confirmedAppointment.paymentStatus === 'Paid' ? 'Appointment & Payment Confirmed!' : 'Place Reserved Successfully!'}
              </h2>
              <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#64748B' }}>
                Ref: <strong>{confirmedAppointment.appointmentNumber}</strong>
              </p>

              {/* Queue Number Badge */}
              <div style={{
                backgroundColor: '#E0F2F1',
                borderRadius: '10px',
                padding: '12px 24px',
                marginBottom: '16px',
                display: 'inline-block'
              }}>
                <div style={{ fontSize: '11px', color: '#00796B', fontWeight: '700', textTransform: 'uppercase' }}>
                  Assigned Queue Number
                </div>
                <div style={{ fontSize: '32px', fontWeight: '900', color: '#004D40' }}>
                  Queue #{String(confirmedAppointment.queueNumber).padStart(2, '0')}
                </div>
              </div>

              {/* Key Details Card */}
              <div style={{
                backgroundColor: '#F8FAFC',
                borderRadius: '10px',
                padding: '16px',
                textAlign: 'left',
                fontSize: '13px',
                color: '#334155',
                marginBottom: '20px',
                lineHeight: '1.7'
              }}>
                <div><strong>Doctor:</strong> {confirmedAppointment.doctorName} ({confirmedAppointment.specialization})</div>
                <div><strong>Date & Time:</strong> {confirmedAppointment.appointmentDate} at {confirmedAppointment.timeSlot}</div>
                <div><strong>Hospital:</strong> {confirmedAppointment.hospitalBranch}</div>
                <div><strong>Patient:</strong> {confirmedAppointment.patientName} (NIC: {confirmedAppointment.patientNic})</div>
                {confirmedAppointment.paymentStatus === 'Paid' ? (
                  <div style={{ color: '#15803D', fontWeight: '700', borderTop: '1px solid #E2E8F0', paddingTop: '6px', marginTop: '6px' }}>
                    Payment: LKR {confirmedAppointment.totalAmount?.toLocaleString()} Paid ({confirmedAppointment.paymentMethod} • Ref: {confirmedAppointment.paymentReference || 'VERIFIED'})
                  </div>
                ) : (
                  <div style={{ color: '#B45309', fontWeight: '700', borderTop: '1px solid #E2E8F0', paddingTop: '6px', marginTop: '6px' }}>
                    Amount Due on Arrival: LKR {confirmedAppointment.totalAmount?.toLocaleString()} (Cash / Card at Hospital Desk)
                  </div>
                )}
              </div>

              {/* Real-time QR Code for Check-in */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '8px' }}>
                  Hospital Check-in QR Code:
                </div>
                <div style={{
                  display: 'inline-block',
                  padding: '10px',
                  backgroundColor: '#FFFFFF',
                  borderRadius: '10px',
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                }}>
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(confirmedAppointment.qrToken || confirmedAppointment.qrCodeText || confirmedAppointment.appointmentNumber)}`}
                    alt="Appointment Check-in QR"
                    style={{ width: '160px', height: '160px', display: 'block' }}
                  />
                </div>
                <p style={{ margin: '6px 0 0 0', fontSize: '11px', color: '#94A3B8' }}>
                  Present this QR code at the Channeling Desk on arrival for expedited check-in
                </p>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                {confirmedAppointment.paymentStatus === 'Paid' ? (
                  <button
                    type="button"
                    onClick={() => setActiveReceiptApt(confirmedAppointment)}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '8px',
                      border: '1px solid #00796B',
                      backgroundColor: '#00796B',
                      color: '#FFFFFF',
                      fontSize: '13px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <FileText size={15} /> View Official Receipt
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setActiveReceiptApt(confirmedAppointment)}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      backgroundColor: '#FFFFFF',
                      color: '#475569',
                      fontSize: '13px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <FileText size={15} /> View Reservation Slip
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setCurrentStep(6);
                    fetchMyAppointmentsList();
                  }}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    border: '1px solid #CFD8DC',
                    backgroundColor: '#FFFFFF',
                    color: '#37474F',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Calendar size={15} /> Go to My Appointments
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* SCREEN 6: MY APPOINTMENTS DASHBOARD                                 */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {currentStep === 6 && (
        <div>
          {/* Header & Tabs */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div>
              <span style={{
                backgroundColor: '#E0F2F1',
                color: '#00796B',
                fontSize: '11px',
                fontWeight: '800',
                padding: '3px 8px',
                borderRadius: '6px'
              }}>
                STEP 6: PERSONAL BOOKING DASHBOARD
              </span>
              <h2 style={{ margin: '4px 0 0 0', fontSize: '18px', fontWeight: '800', color: '#004D40' }}>
                My Appointments
              </h2>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              {/* Tabs: Upcoming, Completed, Cancelled */}
              <div style={{ display: 'flex', backgroundColor: '#ECEFF1', padding: '3px', borderRadius: '8px' }}>
                {['Upcoming', 'Completed', 'Cancelled'].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setAppointmentsTab(tab)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: appointmentsTab === tab ? '#FFFFFF' : 'transparent',
                      color: appointmentsTab === tab ? '#004D40' : '#546E7A',
                      fontSize: '12px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      boxShadow: appointmentsTab === tab ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                    }}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <button
                onClick={() => {
                  setCurrentStep(1);
                  setConfirmedAppointment(null);
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#00796B',
                  color: '#FFFFFF',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                + Book New Appointment
              </button>
            </div>
          </div>

          {/* List of Appointments */}
          {loadingAppointments ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#00796B' }}>
              <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 10px auto' }} />
              <p>Loading your appointments...</p>
            </div>
          ) : filteredMyAppointments.length === 0 ? (
            <div style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              padding: '50px 20px',
              textAlign: 'center',
              border: '1px dashed #CFD8DC'
            }}>
              <Calendar size={40} color="#90A4AE" style={{ margin: '0 auto 10px auto' }} />
              <h3 style={{ margin: '0 0 6px 0', color: '#37474F' }}>No {appointmentsTab.toLowerCase()} appointments</h3>
              <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#78909C' }}>
                You have no appointments in this category right now.
              </p>
              <button
                onClick={() => setCurrentStep(1)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#00796B',
                  color: '#FFFFFF',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Book An Appointment
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filteredMyAppointments.map(apt => {
                const isReserved = apt.status === 'Reserved' || apt.bookingType === 'Reservation';
                const isConfirmed = apt.status === 'Confirmed';
                const isInProgress = apt.status === 'InProgress';
                const isCompleted = apt.status === 'Completed';
                const isCancelled = apt.status === 'Cancelled' || apt.status === 'NoShow';

                const statusColor = isReserved
                  ? { bg: '#FEF3C7', text: '#B45309' }
                  : isConfirmed
                    ? { bg: '#DCFCE7', text: '#15803D' }
                    : isInProgress
                      ? { bg: '#FFEDD5', text: '#C2410C' }
                      : isCompleted
                        ? { bg: '#E0F2FE', text: '#0369A1' }
                        : { bg: '#FEE2E2', text: '#B91C1C' };

                return (
                  <div
                    key={apt.id}
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '12px',
                      border: '1px solid #E0E0E0',
                      padding: '16px 20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                      flexWrap: 'wrap',
                      gap: '12px'
                    }}
                  >
                    {/* Left: Details */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                        <span style={{
                          backgroundColor: statusColor.bg,
                          color: statusColor.text,
                          fontSize: '10px',
                          fontWeight: '800',
                          padding: '2px 8px',
                          borderRadius: '12px'
                        }}>
                          {apt.status}
                        </span>

                        <span style={{
                          backgroundColor: apt.bookingType === 'Reservation' ? '#FEF9C3' : '#E0F2FE',
                          color: apt.bookingType === 'Reservation' ? '#854D0E' : '#075985',
                          fontSize: '10px',
                          fontWeight: '700',
                          padding: '2px 8px',
                          borderRadius: '12px'
                        }}>
                          {apt.bookingType === 'Reservation' ? 'Reservation' : 'Paid Online'}
                        </span>

                        {apt.arrivalStatus && apt.arrivalStatus !== 'Pending' && (
                          <span style={{
                            backgroundColor: apt.arrivalStatus === 'OnTime' ? '#DCFCE7' : apt.arrivalStatus === 'Early' ? '#DBEAFE' : '#FEE2E2',
                            color: apt.arrivalStatus === 'OnTime' ? '#166534' : apt.arrivalStatus === 'Early' ? '#1E40AF' : '#991B1B',
                            fontSize: '10px',
                            fontWeight: '700',
                            padding: '2px 8px',
                            borderRadius: '12px'
                          }}>
                            Arrival: {apt.arrivalStatus}
                          </span>
                        )}

                        {apt.queueStatus && (
                          <span style={{
                            backgroundColor: apt.queueStatus === 'InConsultation' ? '#FEF08A' : apt.queueStatus === 'Waiting' ? '#E0F2FE' : '#F1F5F9',
                            color: apt.queueStatus === 'InConsultation' ? '#854D0E' : apt.queueStatus === 'Waiting' ? '#0369A1' : '#475569',
                            fontSize: '10px',
                            fontWeight: '700',
                            padding: '2px 8px',
                            borderRadius: '12px'
                          }}>
                            Queue: {apt.queueStatus}
                          </span>
                        )}

                        <span style={{ fontSize: '11px', color: '#78909C' }}>
                          Ref: {apt.appointmentNumber}
                        </span>
                      </div>

                      <h4 style={{ margin: '0 0 3px 0', fontSize: '15px', fontWeight: '800', color: '#1A2B32' }}>
                        {apt.doctorName}
                      </h4>
                      <div style={{ fontSize: '12px', color: '#546E7A' }}>
                        {apt.specialization} • {apt.appointmentDate} at {apt.timeSlot} • <strong>Queue #{String(apt.queueNumber).padStart(2, '0')}</strong>
                      </div>
                      <div style={{ fontSize: '11px', color: '#90A4AE', marginTop: '2px' }}>
                        Hospital: {apt.hospitalBranch}
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        onClick={() => setActiveQrApt(apt)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '6px',
                          border: '1px solid #B2DFDB',
                          backgroundColor: '#E0F2F1',
                          color: '#004D40',
                          fontSize: '12px',
                          fontWeight: '700',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <QrCode size={14} /> View QR
                      </button>

                      {(apt.paymentStatus === 'Paid' || isCompleted) ? (
                        <button
                          onClick={() => setActiveReceiptApt(apt)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '6px',
                            border: '1px solid #CFD8DC',
                            backgroundColor: '#FFFFFF',
                            color: '#00796B',
                            fontSize: '12px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <FileText size={14} /> Official Receipt
                        </button>
                      ) : (
                        <button
                          onClick={() => setActiveReceiptApt(apt)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '6px',
                            border: '1px solid #FEF08A',
                            backgroundColor: '#FEFCE8',
                            color: '#854D0E',
                            fontSize: '12px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <FileText size={14} /> Reservation Slip
                        </button>
                      )}

                      {!isCompleted && !isCancelled && (
                        <>
                          <button
                            onClick={() => handleOpenRescheduleModal(apt)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '6px',
                              border: '1px solid #CFD8DC',
                              backgroundColor: '#FFFFFF',
                              color: '#37474F',
                              fontSize: '12px',
                              fontWeight: '600',
                              cursor: 'pointer'
                            }}
                          >
                            Reschedule
                          </button>
                          <button
                            onClick={() => handleCancelBooking(apt.id)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '6px',
                              border: '1px solid #FFCDD2',
                              backgroundColor: '#FFEBEE',
                              color: '#C62828',
                              fontSize: '12px',
                              fontWeight: '700',
                              cursor: 'pointer'
                            }}
                          >
                            Cancel
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* MODAL: VIEW QR CODE FOR CHECK-IN                                    */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeQrApt && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            padding: '24px',
            maxWidth: '380px',
            width: '100%',
            textAlign: 'center',
            position: 'relative'
          }}>
            <button
              onClick={() => setActiveQrApt(null)}
              style={{
                position: 'absolute',
                top: '14px',
                right: '14px',
                border: 'none',
                background: 'none',
                cursor: 'pointer'
              }}
            >
              <X size={20} color="#78909C" />
            </button>

            <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: '800', color: '#004D40' }}>
              Hospital Check-in QR
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: '#78909C' }}>
              Ref: {activeQrApt.appointmentNumber} • Queue #{String(activeQrApt.queueNumber).padStart(2, '0')}
            </p>

            <div style={{
              display: 'inline-block',
              padding: '10px',
              backgroundColor: '#FFFFFF',
              borderRadius: '10px',
              border: '1px solid #ECEFF1',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              marginBottom: '16px'
            }}>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(activeQrApt.qrToken || activeQrApt.qrCodeText || activeQrApt.appointmentNumber)}`}
                alt="Appointment QR"
                style={{ width: '180px', height: '180px', display: 'block' }}
              />
            </div>

            <div style={{ fontSize: '12px', color: '#37474F', marginBottom: '16px' }}>
              <strong>{activeQrApt.doctorName}</strong> ({activeQrApt.specialization})<br />
              {activeQrApt.appointmentDate} • {activeQrApt.timeSlot}
            </div>

            <button
              onClick={() => setActiveQrApt(null)}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#00796B',
                color: '#FFFFFF',
                fontSize: '13px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* MODAL: PRINTABLE RECEIPT VIEW                                       */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeReceiptApt && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            padding: '28px',
            maxWidth: '460px',
            width: '100%',
            position: 'relative'
          }}>
            <button
              onClick={() => setActiveReceiptApt(null)}
              style={{
                position: 'absolute',
                top: '14px',
                right: '14px',
                border: 'none',
                background: 'none',
                cursor: 'pointer'
              }}
            >
              <X size={20} color="#78909C" />
            </button>

            {activeReceiptApt.paymentStatus === 'Paid' ? (
              <>
                <div style={{ textAlign: 'center', marginBottom: '16px', borderBottom: '1px dashed #CFD8DC', paddingBottom: '14px' }}>
                  <span style={{
                    backgroundColor: '#DCFCE7',
                    color: '#15803D',
                    fontSize: '10px',
                    fontWeight: '800',
                    padding: '3px 10px',
                    borderRadius: '12px',
                    display: 'inline-block',
                    marginBottom: '6px'
                  }}>
                    ✓ PAYMENT CONFIRMED & VERIFIED
                  </span>
                  <h3 style={{ margin: '0 0 2px 0', fontSize: '16px', fontWeight: '800', color: '#004D40' }}>
                    Health Bridge Hospital (Pvt) Ltd
                  </h3>
                  <p style={{ margin: 0, fontSize: '11px', color: '#78909C' }}>
                    Official Channeling Consultation e-Receipt / Tax Invoice
                  </p>
                </div>

                <div style={{ fontSize: '12px', color: '#37474F', lineHeight: '1.7', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Receipt / Apt Ref:</span>
                    <strong>{activeReceiptApt.appointmentNumber}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Queue Number:</span>
                    <strong style={{ color: '#004D40' }}>#{String(activeReceiptApt.queueNumber).padStart(2, '0')}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Patient Name:</span>
                    <strong>{activeReceiptApt.patientName}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Patient NIC:</span>
                    <strong>{activeReceiptApt.patientNic}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Consultant Doctor:</span>
                    <strong>{activeReceiptApt.doctorName}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Specialization:</span>
                    <strong>{activeReceiptApt.specialization}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Session Date & Time:</span>
                    <strong>{activeReceiptApt.appointmentDate} ({activeReceiptApt.timeSlot})</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Hospital Branch:</span>
                    <strong>{activeReceiptApt.hospitalBranch}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Payment Method:</span>
                    <strong>{activeReceiptApt.paymentMethod || 'Online Payment'}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Transaction Reference:</span>
                    <strong style={{ color: '#00796B' }}>{activeReceiptApt.paymentReference || activeReceiptApt.appointmentNumber}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #ECEFF1', paddingTop: '6px', marginTop: '6px', fontSize: '13px' }}>
                    <span>Total Amount Paid:</span>
                    <strong style={{ color: '#00796B' }}>LKR {activeReceiptApt.totalAmount?.toLocaleString()}</strong>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div style={{ textAlign: 'center', marginBottom: '16px', borderBottom: '1px dashed #F59E0B', paddingBottom: '14px' }}>
                  <span style={{
                    backgroundColor: '#FEF3C7',
                    color: '#B45309',
                    fontSize: '10px',
                    fontWeight: '800',
                    padding: '3px 10px',
                    borderRadius: '12px',
                    display: 'inline-block',
                    marginBottom: '6px'
                  }}>
                    RESERVATION SLIP — PAYMENT DUE AT HOSPITAL
                  </span>
                  <h3 style={{ margin: '0 0 2px 0', fontSize: '16px', fontWeight: '800', color: '#004D40' }}>
                    Health Bridge Hospital (Pvt) Ltd
                  </h3>
                  <p style={{ margin: 0, fontSize: '11px', color: '#78909C' }}>
                    Channeling Consultation Place Reservation
                  </p>
                </div>

                <div style={{ fontSize: '12px', color: '#37474F', lineHeight: '1.7', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Booking Reference:</span>
                    <strong>{activeReceiptApt.appointmentNumber}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Queue Number:</span>
                    <strong style={{ color: '#004D40' }}>#{String(activeReceiptApt.queueNumber).padStart(2, '0')}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Patient Name:</span>
                    <strong>{activeReceiptApt.patientName}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Patient NIC:</span>
                    <strong>{activeReceiptApt.patientNic}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Doctor:</span>
                    <strong>{activeReceiptApt.doctorName} ({activeReceiptApt.specialization})</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Session:</span>
                    <strong>{activeReceiptApt.appointmentDate} at {activeReceiptApt.timeSlot}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Hospital:</span>
                    <strong>{activeReceiptApt.hospitalBranch}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #ECEFF1', paddingTop: '6px', marginTop: '6px', fontSize: '13px' }}>
                    <span>Fee Payable on Arrival:</span>
                    <strong style={{ color: '#D97706' }}>LKR {activeReceiptApt.totalAmount?.toLocaleString()}</strong>
                  </div>
                  <div style={{ backgroundColor: '#FFFBEB', padding: '8px 10px', borderRadius: '6px', marginTop: '10px', fontSize: '11px', color: '#92400E' }}>
                    * Present your check-in QR code at the reception desk to settle your fee via Cash or Card and receive your consultation token.
                  </div>
                </div>
              </>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => window.print()}
                style={{
                  flex: 1,
                  padding: '9px',
                  borderRadius: '8px',
                  border: '1px solid #CFD8DC',
                  backgroundColor: '#FFFFFF',
                  color: '#37474F',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <Printer size={15} /> Print
              </button>
              <button
                onClick={() => setActiveReceiptApt(null)}
                style={{
                  flex: 1,
                  padding: '9px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#00796B',
                  color: '#FFFFFF',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* MODAL: RESCHEDULE APPOINTMENT SESSION                               */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {rescheduleApt && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            padding: '24px',
            maxWidth: '480px',
            width: '100%',
            position: 'relative'
          }}>
            <button
              onClick={() => setRescheduleApt(null)}
              style={{
                position: 'absolute',
                top: '14px',
                right: '14px',
                border: 'none',
                background: 'none',
                cursor: 'pointer'
              }}
            >
              <X size={20} color="#78909C" />
            </button>

            <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: '800', color: '#004D40' }}>
              Reschedule Appointment
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: '#78909C' }}>
              Ref: {rescheduleApt.appointmentNumber} with {rescheduleApt.doctorName}
            </p>

            {rescheduleLoading ? (
              <div style={{ textAlign: 'center', padding: '30px 0' }}>
                <RefreshCw size={24} className="animate-spin" color="#00796B" style={{ margin: '0 auto 8px auto' }} />
                <p style={{ fontSize: '12px', color: '#78909C' }}>Checking alternative sessions...</p>
              </div>
            ) : rescheduleSessions.length === 0 ? (
              <p style={{ fontSize: '13px', color: '#546E7A', padding: '20px 0' }}>
                No alternative open slots found for this consultant this week.
              </p>
            ) : (
              <div style={{ maxHeight: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                {rescheduleSessions.map(slot => (
                  <div
                    key={slot.id}
                    onClick={() => handleExecuteReschedule(slot.id)}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #B2DFDB',
                      backgroundColor: '#F0FDF4',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: '#004D40' }}>
                        {slot.sessionDate} • {slot.timeFormatted}
                      </div>
                      <div style={{ fontSize: '11px', color: '#00796B' }}>
                        Slot open (1 space left)
                      </div>
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#00796B' }}>
                      Select Slot →
                    </span>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => setRescheduleApt(null)}
              style={{
                width: '100%',
                padding: '9px',
                borderRadius: '8px',
                border: '1px solid #CFD8DC',
                backgroundColor: '#FFFFFF',
                color: '#546E7A',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorChannelingSection;
