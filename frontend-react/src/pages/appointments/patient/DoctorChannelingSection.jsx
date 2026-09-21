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
  const [validatingAvailability, setValidatingAvailability] = useState(false);
  const [isSessionValidated, setIsSessionValidated] = useState(false);

  // Payment State
  const [paymentMethod, setPaymentMethod] = useState('CreditCard');
  const [cardData, setCardData] = useState({ number: '', expiry: '', cvv: '' });
  const [walletPhone, setWalletPhone] = useState('');
  const [bankRef, setBankRef] = useState('');
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

  // ─── AI Symptom Recommendation ───────────────────────────────────────────

  const handleAiSymptomTriage = async () => {
    if (!symptomInput.trim()) {
      notify('Please describe your symptoms first', 'error');
      return;
    }
    setAiLoading(true);
    try {
      const res = await recommendSpecialty(symptomInput.trim());
      setAiRecommendations(res.data);
      notify('AI specialist recommendations generated!', 'success');
    } catch (err) {
      console.error('AI triage error', err);
      notify('Could not retrieve AI recommendations. Please pick a specialty manually.', 'error');
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
        setAvailableSessions(res.data);
        // Default to first available date
        if (res.data.length > 0) {
          const uniqueDates = [...new Set(res.data.map(s => s.sessionDate))];
          setSelectedSessionDate(uniqueDates[0]);
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
      if (currentSlot && currentSlot.isAvailable) {
        setIsSessionValidated(true);
        notify('Session slot confirmed! Available to book.', 'success');
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

  const handleProceedToPayment = () => {
    if (!patientDetails.fullName.trim()) {
      notify('Please enter your full name', 'error');
      return;
    }
    if (!patientDetails.nic.trim()) {
      notify('Please enter your NIC / Passport number', 'error');
      return;
    }
    if (!patientDetails.phone.trim()) {
      notify('Please enter your contact phone number', 'error');
      return;
    }
    setCurrentStep(5);
  };

  // ─── Step 5: Payment & Finalize Booking ────────────────────────────────────

  const handleConfirmAndPay = async () => {
    setIsProcessingPayment(true);
    try {
      // 1. Create Appointment
      const bookRes = await bookAppointment({
        doctorId: selectedDoctor.id,
        doctorSessionId: selectedSession.id,
        patientName: patientDetails.fullName,
        patientPhone: patientDetails.phone,
        patientEmail: patientDetails.email,
        patientNic: patientDetails.nic,
        patientAddress: patientDetails.address,
        notes: patientDetails.notes
      });

      const appointment = bookRes.data;

      // 2. Process Simulated Payment
      let maskedCard = null;
      if (paymentMethod === 'CreditCard') {
        const last4 = cardData.number.replace(/\s+/g, '').slice(-4) || '3456';
        maskedCard = `**** **** **** ${last4}`;
      }

      const payRes = await payAppointment(appointment.id, {
        paymentMethod,
        cardMaskedReference: maskedCard,
        bankReference: paymentMethod === 'BankTransfer' ? bankRef : null
      });

      setConfirmedAppointment(payRes.data);
      notify('Appointment confirmed and paid successfully!', 'success');
    } catch (err) {
      console.error('Booking failed', err);
      const msg = err.response?.data?.message || 'Failed to complete booking and payment';
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
        // Exclude current session
        setRescheduleSessions(res.data.filter(s => s.id !== apt.doctorSessionId && s.isAvailable));
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

  const uniqueSessionDates = [...new Set(availableSessions.map(s => s.sessionDate))];

  const sessionsForSelectedDate = availableSessions.filter(
    s => s.sessionDate === selectedSessionDate
  );

  const totalFee = (selectedDoctor?.consultationFee || 0) + 300.00;

  // Filter My Appointments by active tab
  const filteredMyAppointments = myAppointments.filter(apt => {
    if (appointmentsTab === 'Upcoming') {
      return apt.status === 'Confirmed' || apt.status === 'InProgress' || apt.status === 'PendingPayment';
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

            {/* Agentic AI Symptom Assistant Box */}
            <div style={{
              marginTop: '20px',
              padding: '16px',
              borderRadius: '10px',
              backgroundColor: '#F0FDF4',
              border: '1px solid #BBF7D0'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Sparkles size={18} color="#15803D" />
                <h3 style={{ margin: 0, fontSize: '13px', fontWeight: '700', color: '#166534' }}>
                  Agentic AI Specialist Recommender (Human-in-the-Loop Triage)
                </h3>
              </div>
              <p style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#14532D' }}>
                Unsure which department to consult? Describe your symptoms below and our clinical agent will recommend the most appropriate specialty.
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="e.g. chest tightness, palpitations and mild shortness of breath..."
                  value={symptomInput}
                  onChange={(e) => setSymptomInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAiSymptomTriage(); }}
                  style={{
                    flex: 1,
                    padding: '9px 12px',
                    border: '1px solid #86EFAC',
                    borderRadius: '6px',
                    fontSize: '13px',
                    outline: 'none',
                    backgroundColor: '#FFFFFF'
                  }}
                />
                <button
                  type="button"
                  onClick={handleAiSymptomTriage}
                  disabled={aiLoading}
                  style={{
                    padding: '9px 16px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: '#16A34A',
                    color: '#FFFFFF',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: aiLoading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  {aiLoading ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  {aiLoading ? 'Analyzing...' : 'Ask AI'}
                </button>
              </div>

              {/* AI Recommendations Results */}
              {aiRecommendations && aiRecommendations.recommendations?.length > 0 && (
                <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px dashed #86EFAC' }}>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: '#166534', marginBottom: '6px' }}>
                    Recommended Specialties:
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {aiRecommendations.recommendations.map((rec, i) => (
                      <div
                        key={i}
                        onClick={() => handleApplyAiSpecialty(rec.specialty)}
                        style={{
                          backgroundColor: '#FFFFFF',
                          border: '1px solid #16A34A',
                          borderRadius: '8px',
                          padding: '8px 12px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.04)'
                        }}
                      >
                        <span style={{
                          backgroundColor: '#DCFCE7',
                          color: '#15803D',
                          fontSize: '11px',
                          fontWeight: '800',
                          padding: '2px 6px',
                          borderRadius: '4px'
                        }}>
                          {Math.round(rec.matchScore * 100)}% Match
                        </span>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: '700', color: '#14532D' }}>
                            {rec.specialty}
                          </div>
                          <div style={{ fontSize: '11px', color: '#4B5563' }}>
                            {rec.reasoning}
                          </div>
                        </div>
                        <ChevronRight size={14} color="#16A34A" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
                          backgroundColor: disabled
                            ? '#ECEFF1'
                            : isSelected
                              ? '#E0F2F1'
                              : '#FFFFFF',
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
                        <div style={{ fontSize: '10px', marginTop: '4px', color: disabled ? '#B0BEC5' : '#00796B' }}>
                          {disabled ? 'Booked' : 'Available'}
                        </div>
                      </button>
                    );
                  })}
                </div>

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
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#37474F', marginBottom: '6px' }}>
                  FULL NAME *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Nuwan Perera"
                  value={patientDetails.fullName}
                  onChange={(e) => setPatientDetails({ ...patientDetails, fullName: e.target.value })}
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
                  NIC / PASSPORT NUMBER *
                </label>
                <input
                  type="text"
                  placeholder="e.g. 199512345678 or 987654321V"
                  value={patientDetails.nic}
                  onChange={(e) => setPatientDetails({ ...patientDetails, nic: e.target.value })}
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#37474F', marginBottom: '6px' }}>
                    CONTACT NUMBER *
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. +94 77 123 4567"
                    value={patientDetails.phone}
                    onChange={(e) => setPatientDetails({ ...patientDetails, phone: e.target.value })}
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
                    EMAIL ADDRESS
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. patient@gmail.com"
                    value={patientDetails.email}
                    onChange={(e) => setPatientDetails({ ...patientDetails, email: e.target.value })}
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
                      onClick={() => setPaymentMethod(tab.id)}
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
                <div style={{ padding: '16px', borderRadius: '8px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', marginBottom: '20px' }}>
                  <p style={{ margin: '0 0 12px 0', fontSize: '11px', color: '#64748B' }}>
                    * Simulated University Sandbox Payment. Raw card information is validated client-side only and never stored in the database.
                  </p>
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                      CARD NUMBER
                    </label>
                    <input
                      type="text"
                      placeholder="1234 5678 9012 3456"
                      maxLength={19}
                      value={cardData.number}
                      onChange={(e) => setCardData({ ...cardData, number: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                        EXPIRY (MM/YY)
                      </label>
                      <input
                        type="text"
                        placeholder="MM/YY"
                        maxLength={5}
                        value={cardData.expiry}
                        onChange={(e) => setCardData({ ...cardData, expiry: e.target.value })}
                        style={{ width: '100%', padding: '9px 12px', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                        CVV
                      </label>
                      <input
                        type="password"
                        placeholder="•••"
                        maxLength={4}
                        value={cardData.cvv}
                        onChange={(e) => setCardData({ ...cardData, cvv: e.target.value })}
                        style={{ width: '100%', padding: '9px 12px', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {paymentMethod === 'MobileWallet' && (
                <div style={{ padding: '16px', borderRadius: '8px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', marginBottom: '20px' }}>
                  <p style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#475569' }}>
                    Supports eZ Cash, Dialog Genie, and FriMi wallets. Enter your registered wallet mobile number:
                  </p>
                  <input
                    type="tel"
                    placeholder="e.g. 077 123 4567"
                    value={walletPhone}
                    onChange={(e) => setWalletPhone(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
              )}

              {paymentMethod === 'BankTransfer' && (
                <div style={{ padding: '16px', borderRadius: '8px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', marginBottom: '20px' }}>
                  <p style={{ margin: '0 0 6px 0', fontSize: '12px', color: '#475569' }}>
                    Account: <strong>Health Bridge Pvt Ltd</strong> | Bank of Ceylon: 00812345678 (Corporate Branch)
                  </p>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                    TRANSFER SLIP REFERENCE NUMBER
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. TXN-8921827"
                    value={bankRef}
                    onChange={(e) => setBankRef(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
              )}

              <button
                type="button"
                onClick={handleConfirmAndPay}
                disabled={isProcessingPayment}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
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
                  boxShadow: '0 4px 12px rgba(0,121,107,0.25)'
                }}
              >
                {isProcessingPayment ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                {isProcessingPayment ? 'Processing Payment...' : `Confirm & Pay LKR ${totalFee.toLocaleString()}`}
              </button>
            </div>
          ) : (
            /* Appointment Confirmed State (with QR Code) */
            <div style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              padding: '32px 24px',
              border: '1px solid #80CBC4',
              boxShadow: '0 4px 20px rgba(0,77,64,0.08)',
              maxWidth: '560px',
              margin: '0 auto',
              textAlign: 'center'
            }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: '#E0F2F1',
                color: '#00796B',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px auto'
              }}>
                <CheckCircle2 size={36} />
              </div>

              <span style={{
                backgroundColor: '#DCFCE7',
                color: '#15803D',
                fontSize: '11px',
                fontWeight: '800',
                padding: '4px 10px',
                borderRadius: '20px',
                textTransform: 'uppercase'
              }}>
                Payment Confirmed
              </span>

              <h2 style={{ margin: '8px 0 4px 0', fontSize: '20px', fontWeight: '900', color: '#004D40' }}>
                Appointment Confirmed!
              </h2>
              <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#607D8B' }}>
                Ref: <strong>{confirmedAppointment.appointmentNumber}</strong>
              </p>

              {/* Queue Number Badge */}
              <div style={{
                backgroundColor: '#E0F2F1',
                borderRadius: '10px',
                padding: '12px',
                marginBottom: '16px',
                display: 'inline-block'
              }}>
                <div style={{ fontSize: '11px', color: '#00796B', fontWeight: '700', textTransform: 'uppercase' }}>
                  Assigned Queue Number
                </div>
                <div style={{ fontSize: '28px', fontWeight: '900', color: '#004D40' }}>
                  Queue #{String(confirmedAppointment.queueNumber).padStart(2, '0')}
                </div>
              </div>

              {/* Key Details Card */}
              <div style={{
                backgroundColor: '#F8FAFC',
                borderRadius: '10px',
                padding: '14px',
                textAlign: 'left',
                fontSize: '13px',
                color: '#334155',
                marginBottom: '20px',
                lineHeight: '1.6'
              }}>
                <div><strong>Doctor:</strong> {confirmedAppointment.doctorName} ({confirmedAppointment.specialization})</div>
                <div><strong>Date & Time:</strong> {confirmedAppointment.appointmentDate} at {confirmedAppointment.timeSlot}</div>
                <div><strong>Hospital Branch:</strong> {confirmedAppointment.hospitalBranch}</div>
                <div><strong>Patient:</strong> {confirmedAppointment.patientName} (NIC: {confirmedAppointment.patientNic})</div>
                <div><strong>Total Paid:</strong> LKR {confirmedAppointment.totalAmount.toLocaleString()}</div>
              </div>

              {/* Real-time QR Code for Check-in (api.qrserver.com URL pattern) */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '8px' }}>
                  Hospital Check-in QR Code:
                </div>
                <div style={{
                  display: 'inline-block',
                  padding: '10px',
                  backgroundColor: '#FFFFFF',
                  borderRadius: '8px',
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                }}>
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(confirmedAppointment.qrCodeText || `MEDIX:${confirmedAppointment.appointmentNumber}`)}`}
                    alt="Appointment Check-in QR"
                    style={{ width: '160px', height: '160px', display: 'block' }}
                  />
                </div>
                <p style={{ margin: '6px 0 0 0', fontSize: '11px', color: '#94A3B8' }}>
                  Show this QR code at the 24/7 Channeling Desk on visit date
                </p>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <button
                  type="button"
                  onClick={() => setActiveReceiptApt(confirmedAppointment)}
                  style={{
                    padding: '9px 18px',
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
                  <Printer size={15} /> Download Receipt
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCurrentStep(6);
                    fetchMyAppointmentsList();
                  }}
                  style={{
                    padding: '9px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#00796B',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Go to My Appointments
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
                const isConfirmed = apt.status === 'Confirmed';
                const isInProgress = apt.status === 'InProgress';
                const isCompleted = apt.status === 'Completed';
                const isCancelled = apt.status === 'Cancelled' || apt.status === 'NoShow';

                const statusColor = isConfirmed
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
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

                      {isCompleted && (
                        <button
                          onClick={() => setActiveReceiptApt(apt)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '6px',
                            border: '1px solid #CFD8DC',
                            backgroundColor: '#FFFFFF',
                            color: '#37474F',
                            fontSize: '12px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <FileText size={14} /> Receipt
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
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(activeQrApt.qrCodeText || `MEDIX:${activeQrApt.appointmentNumber}`)}`}
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

            <div style={{ textAlign: 'center', marginBottom: '16px', borderBottom: '1px dashed #CFD8DC', paddingBottom: '14px' }}>
              <h3 style={{ margin: '0 0 2px 0', fontSize: '16px', fontWeight: '800', color: '#004D40' }}>
                Health Bridge Hospital (Pvt) Ltd
              </h3>
              <p style={{ margin: 0, fontSize: '11px', color: '#78909C' }}>
                Official Channeling Consultation e-Receipt
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
                <span>Doctor:</span>
                <strong>{activeReceiptApt.doctorName}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Specialization:</span>
                <strong>{activeReceiptApt.specialization}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Date & Time:</span>
                <strong>{activeReceiptApt.appointmentDate} ({activeReceiptApt.timeSlot})</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Hospital Branch:</span>
                <strong>{activeReceiptApt.hospitalBranch}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Payment Method:</span>
                <strong>{activeReceiptApt.paymentMethod} ({activeReceiptApt.paymentReference || 'Paid'})</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #ECEFF1', paddingTop: '6px', marginTop: '6px', fontSize: '13px' }}>
                <span>Total Amount Paid:</span>
                <strong style={{ color: '#00796B' }}>LKR {activeReceiptApt.totalAmount?.toLocaleString()}</strong>
              </div>
            </div>

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
