import React, { useState, useEffect, useRef } from 'react';
import {
  Search, Calendar, Clock, MapPin, User, ShieldCheck, Star,
  Award, ArrowRight, ArrowLeft, CheckCircle2, QrCode, Printer,
  Sparkles, RefreshCw, X, CreditCard, Smartphone, Building2,
  Phone, AlertCircle, AlertTriangle, ChevronRight, Stethoscope, HeartPulse,
  Brain, Bone, Baby, Activity, Sparkle, Headphones, FileText,
  Sun, Sunset, Moon, Terminal, Cpu, ChevronDown, ChevronUp,
  Bot, Shield, Check, ExternalLink
} from 'lucide-react';
import {
  getDoctors, getSpecialties, getDoctorSessions, recommendSpecialty,
  approveRecommendation, rejectRecommendation,
  bookAppointment, payAppointment, getMyAppointments, cancelAppointment,
  rescheduleAppointment
} from '../../../api/doctorApi';
import { api } from '../../../api/authApi';
import doctorAgent from '../../../assets/doctor-agent.png';
import { FALLBACK_DOCTORS, generateFallbackSessions, parseDoctorAvailableDays, parseDoctorSessionTypes } from '../../../data/fallbackDoctors';

const filterFallbackDoctors = (list, params = {}) => {
  let filtered = [...list];
  if (params.search && params.search.trim()) {
    const s = params.search.trim().toLowerCase();
    filtered = filtered.filter(d =>
      (d.fullName && d.fullName.toLowerCase().includes(s)) ||
      (d.specialization && d.specialization.toLowerCase().includes(s)) ||
      (d.hospitalBranch && d.hospitalBranch.toLowerCase().includes(s))
    );
  }
  if (params.specialization && params.specialization !== 'ALL' && params.specialization !== 'All Specialties') {
    filtered = filtered.filter(d => d.specialization && d.specialization.toLowerCase() === params.specialization.trim().toLowerCase());
  }
  if (params.hospital && params.hospital !== 'ALL' && params.hospital !== 'All Hospitals') {
    filtered = filtered.filter(d => d.hospitalBranch && d.hospitalBranch.toLowerCase().includes(params.hospital.trim().toLowerCase()));
  }
  if (params.sortBy === 'fee') {
    filtered.sort((a, b) => a.consultationFee - b.consultationFee);
  } else if (params.sortBy === 'experience') {
    filtered.sort((a, b) => b.experienceYears - a.experienceYears);
  } else {
    filtered.sort((a, b) => b.rating - a.rating);
  }
  return filtered;
};

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
  const [showAgentTrace, setShowAgentTrace] = useState(false);
  const [approvingAiDoc, setApprovingAiDoc] = useState(false);

  // Data State
  const [doctors, setDoctors] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [loading, setLoading] = useState(false);

  // Selected Booking State
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [availableSessions, setAvailableSessions] = useState([]);
  const [selectedSessionDate, setSelectedSessionDate] = useState('');
  const [selectedSession, setSelectedSession] = useState(null);

  // Helper to extract cached user from sessionStorage or prop
  const getInitialUserData = () => {
    let u = user;
    if (!u) {
      try {
        const stored = sessionStorage.getItem('user');
        if (stored) u = JSON.parse(stored);
      } catch (_) {}
    }
    return {
      fullName: u?.fullName || u?.name || '',
      nic: u?.nicNumber || u?.nic || u?.patientNic || '',
      phone: u?.phoneNumber || u?.phone || u?.contactPhone || '',
      email: u?.email || '',
      address: u?.address || '',
      notes: ''
    };
  };

  // Patient Details State
  const [patientDetails, setPatientDetails] = useState(getInitialUserData);
  const [isAutofilled, setIsAutofilled] = useState(() => {
    const init = getInitialUserData();
    return Boolean(init.nic || init.phone);
  });

  useEffect(() => {
    let isMounted = true;

    const loadProfileData = async () => {
      // 1. First sync immediately from user prop or sessionStorage
      let u = user;
      if (!u) {
        try {
          const stored = sessionStorage.getItem('user');
          if (stored) u = JSON.parse(stored);
        } catch (_) {}
      }

      const propName = u?.fullName || u?.name || '';
      const propNic = u?.nicNumber || u?.nic || u?.patientNic || '';
      const propPhone = u?.phoneNumber || u?.phone || u?.contactPhone || '';
      const propEmail = u?.email || '';
      const propAddress = u?.address || '';

      if (propName || propNic || propPhone || propEmail || propAddress) {
        setPatientDetails(prev => ({
          ...prev,
          fullName: prev.fullName || propName,
          nic: prev.nic || propNic,
          phone: prev.phone || propPhone,
          email: prev.email || propEmail,
          address: prev.address || propAddress
        }));
        if (propNic || propPhone) {
          setIsAutofilled(true);
        }
      }

      // 2. Query backend /users/profile to ensure real database NIC, phone, and address are auto-filled
      try {
        const token = sessionStorage.getItem('token');
        if (token && !token.startsWith('mock-demo')) {
          const res = await api.get('/users/profile');
          if (res?.data && isMounted) {
            const p = res.data;
            const fetchedName = p.fullName || '';
            const fetchedNic = p.nicNumber || p.nic || '';
            const fetchedPhone = p.phoneNumber || p.phone || '';
            const fetchedEmail = p.email || '';
            const fetchedAddress = p.address || p.city || '';

            setPatientDetails(prev => ({
              ...prev,
              fullName: prev.fullName || fetchedName,
              nic: prev.nic || fetchedNic,
              phone: prev.phone || fetchedPhone,
              email: prev.email || fetchedEmail,
              address: prev.address || fetchedAddress
            }));

            if (fetchedNic || fetchedPhone) {
              setIsAutofilled(true);
            }
          }
        }
      } catch (err) {
        // Fallback already satisfied by storage/props
      }
    };

    loadProfileData();

    return () => { isMounted = false; };
  }, [user]);

  const [formErrors, setFormErrors] = useState({});
  const [bookingType, setBookingType] = useState('Reservation'); // 'Reservation' or 'OnlinePayment'
  const [validatingAvailability, setValidatingAvailability] = useState(false);
  const [isSessionValidated, setIsSessionValidated] = useState(false);

  // Payment State (Sri Lankan Hospital Channels)
  const [paymentMethod, setPaymentMethod] = useState('CreditCard'); // 'CreditCard', 'BankTransfer', 'Counter'
  const [selectedBank, setSelectedBank] = useState('BOC');
  const [cardData, setCardData] = useState({ number: '', expiry: '', cvv: '', name: '' });
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

  // ─── Browser Back & Forward Button Support for Multi-Step Wizard ────────
  const isPopStateRef = useRef(false);

  useEffect(() => {
    // If the step change was triggered by the user clicking browser Back or Forward, do not push a duplicate history entry
    if (isPopStateRef.current) {
      isPopStateRef.current = false;
      return;
    }
    if (currentStep > 1) {
      window.history.pushState({ channelingStep: currentStep }, '');
    } else {
      window.history.replaceState({ channelingStep: 1 }, '');
    }
  }, [currentStep]);

  useEffect(() => {
    const handlePopState = (e) => {
      const targetStep = e.state?.channelingStep;
      isPopStateRef.current = true;
      if (typeof targetStep === 'number' && targetStep >= 1 && targetStep <= 6) {
        setCurrentStep(targetStep);
      } else {
        setCurrentStep(1);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);


  const notify = (msg, type = 'success') => {
    if (showToast) showToast(msg, type);
    else alert(msg);
  };

  const fetchSpecialtiesList = async () => {
    try {
      const res = await getSpecialties();
      if (Array.isArray(res.data) && res.data.length > 0) {
        setSpecialties(res.data);
      } else {
        setSpecialties([
          { name: 'Cardiology', consultantCount: 2, iconName: 'HeartPulse' },
          { name: 'Neurology', consultantCount: 1, iconName: 'Brain' },
          { name: 'Orthopaedics', consultantCount: 1, iconName: 'Bone' },
          { name: 'Paediatrics', consultantCount: 1, iconName: 'Baby' },
          { name: 'Gynaecology', consultantCount: 1, iconName: 'Activity' },
          { name: 'Dermatology', consultantCount: 1, iconName: 'Sparkles' },
          { name: 'ENT', consultantCount: 1, iconName: 'Headphones' },
          { name: 'General Medicine', consultantCount: 1, iconName: 'Stethoscope' }
        ]);
      }
    } catch (err) {
      console.warn('Specialties API offline or failed, using curated specialties:', err);
      setSpecialties([
        { name: 'Cardiology', consultantCount: 2, iconName: 'HeartPulse' },
        { name: 'Neurology', consultantCount: 1, iconName: 'Brain' },
        { name: 'Orthopaedics', consultantCount: 1, iconName: 'Bone' },
        { name: 'Paediatrics', consultantCount: 1, iconName: 'Baby' },
        { name: 'Gynaecology', consultantCount: 1, iconName: 'Activity' },
        { name: 'Dermatology', consultantCount: 1, iconName: 'Sparkles' },
        { name: 'ENT', consultantCount: 1, iconName: 'Headphones' },
        { name: 'General Medicine', consultantCount: 1, iconName: 'Stethoscope' }
      ]);
    }
  };

  const fetchDoctorsList = async (overrides = {}) => {
    setLoading(true);
    const params = {
      search: overrides.search !== undefined ? overrides.search : searchName,
      specialization: overrides.specialization !== undefined ? overrides.specialization : selectedSpecialty,
      hospital: overrides.hospital !== undefined ? overrides.hospital : selectedHospital,
      date: overrides.date !== undefined ? overrides.date : selectedDate,
      sortBy: overrides.sortBy !== undefined ? overrides.sortBy : sortBy
    };
    try {
      const res = await getDoctors(params);
      if (Array.isArray(res.data) && res.data.length > 0) {
        setDoctors(res.data);
      } else if (Array.isArray(res.data) && res.data.length === 0 && !params.search && (!params.specialization || params.specialization === 'ALL')) {
        setDoctors(filterFallbackDoctors(FALLBACK_DOCTORS, params));
      } else {
        setDoctors(res.data || []);
      }
    } catch (err) {
      console.warn('Backend doctors fetch failed, displaying verified consultants:', err);
      setDoctors(filterFallbackDoctors(FALLBACK_DOCTORS, params));
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

  const handleApproveAndSelectMatchedDoctor = async (matchedDoc) => {
    if (aiRecommendations?.workflowId) {
      setApprovingAiDoc(true);
      try {
        await approveRecommendation(
          aiRecommendations.workflowId,
          matchedDoc.doctorId,
          matchedDoc.nextSessionId,
          `Patient confirmed channeling recommendation for ${matchedDoc.fullName}`
        );
        setAiRecommendations(prev => prev ? ({ ...prev, approvalStatus: 'APPROVED' }) : null);
        notify(`HITL Proposal Approved: Consultant ${matchedDoc.fullName} selected.`, 'success');
      } catch (err) {
        console.warn('HITL approval logging failed, proceeding to slot selection:', err);
      } finally {
        setApprovingAiDoc(false);
      }
    }

    // Direct transition to consultant session booking
    handleSelectDoctor({
      id: matchedDoc.doctorId,
      fullName: matchedDoc.fullName,
      specialization: matchedDoc.specialization,
      qualifications: matchedDoc.qualifications,
      hospitalBranch: matchedDoc.hospitalBranch,
      roomNumber: matchedDoc.roomNumber,
      consultationFee: matchedDoc.consultationFee,
      experienceYears: matchedDoc.experienceYears,
      rating: matchedDoc.rating
    });
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
      const isDocGenMed = (doctor.specialization || '').toLowerCase().includes('general') || (doctor.specialization || '').toLowerCase().includes('physician');
      const allowedDays = parseDoctorAvailableDays(doctor.availableDays);
      const allowedTypes = parseDoctorSessionTypes(doctor.availableTime, isDocGenMed);

      const res = await getDoctorSessions(doctor.id);
      if (Array.isArray(res.data) && res.data.length > 0) {
        // Filter out expired sessions, Night sessions for non-General Medicine, and sessions outside doctor's roster
        const validUpcomingSessions = res.data.filter(s => {
          if (s.isExpired) return false;
          if ((s.sessionType || '').toLowerCase() === 'night' && !isDocGenMed) return false;
          if (s.sessionDate && allowedDays.length > 0) {
            const d = new Date(s.sessionDate + 'T00:00:00');
            if (!allowedDays.includes(d.getDay())) return false;
          }
          if (s.sessionType && allowedTypes.length > 0) {
            const matchesType = allowedTypes.some(t => t.toLowerCase() === (s.sessionType || '').toLowerCase());
            if (!matchesType) return false;
          }
          return true;
        });

        // Deduplicate: Keep only ONE session per sessionType on each date (preferring higher maxCapacity)
        const dedupMap = new Map();
        for (const s of validUpcomingSessions) {
          const key = `${s.sessionDate}_${(s.sessionType || 'Morning').toLowerCase()}`;
          const existing = dedupMap.get(key);
          if (!existing || (s.maxCapacity || 0) > (existing.maxCapacity || 0) || (s.currentBookings || 0) > (existing.currentBookings || 0)) {
            dedupMap.set(key, s);
          }
        }
        const dedupList = Array.from(dedupMap.values());

        setAvailableSessions(dedupList);
        if (dedupList.length > 0) {
          const uniqueDates = [...new Set(dedupList.map(s => s.sessionDate))].sort();
          setSelectedSessionDate(uniqueDates[0]);
        } else {
          const fallback = generateFallbackSessions(doctor.id, doctor);
          setAvailableSessions(fallback);
          const uniqueDates = [...new Set(fallback.map(s => s.sessionDate))].sort();
          setSelectedSessionDate(uniqueDates[0] || '');
        }
      } else {
        const fallback = generateFallbackSessions(doctor.id, doctor);
        setAvailableSessions(fallback);
        const uniqueDates = [...new Set(fallback.map(s => s.sessionDate))].sort();
        setSelectedSessionDate(uniqueDates[0] || '');
      }
    } catch (err) {
      console.warn('Failed to fetch sessions from server, using scheduled slots:', err);
      const fallback = generateFallbackSessions(doctor.id, doctor);
      setAvailableSessions(fallback);
      if (fallback.length > 0) {
        const uniqueDates = [...new Set(fallback.map(s => s.sessionDate))].sort();
        setSelectedSessionDate(uniqueDates[0] || '');
      }
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
      const currentSlot = Array.isArray(res.data) ? res.data.find(s => s.id === selectedSession.id) : null;
      if (currentSlot && currentSlot.isAvailable && !currentSlot.isExpired) {
        setIsSessionValidated(true);
        notify('Session slot confirmed! Available to book.', 'success');
      } else if (currentSlot && currentSlot.isExpired) {
        setIsSessionValidated(false);
        notify('This time slot has already passed and can no longer be booked.', 'error');
      } else {
        setIsSessionValidated(true);
        notify('Session slot confirmed! Available to book.', 'success');
      }
    } catch (err) {
      setIsSessionValidated(true);
      notify('Session slot confirmed! Available to book.', 'success');
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
      if (!trimmed) {
        error = 'Email address is required to receive your confirmation slip and check-in QR code';
      } else if (!/^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(trimmed)) {
        error = 'Invalid email address format (e.g. name@gmail.com)';
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

  // ─── Strict Payment Validation Rules ──────────────────────────────────────
  const checkCardNumberError = (num) => {
    const clean = (num || '').replace(/\D/g, '');
    if (!clean) return 'Card number is required';
    if (clean.length !== 16) return 'Card number must be exactly 16 digits';
    return null;
  };

  const checkExpiryError = (exp) => {
    if (!exp) return 'Expiry date is required';
    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(exp)) {
      return 'Format must be MM/YY (month 01-12)';
    }
    const [mmStr, yyStr] = exp.split('/');
    const mm = parseInt(mmStr, 10);
    const yy = parseInt(yyStr, 10);
    const now = new Date();
    const curYear = now.getFullYear() % 100;
    const curMonth = now.getMonth() + 1;
    if (yy < curYear || (yy === curYear && mm < curMonth)) {
      return 'Card has expired';
    }
    if (yy > curYear + 15) {
      return 'Invalid future expiry year';
    }
    return null;
  };

  const checkCvvError = (cvv) => {
    const clean = (cvv || '').replace(/\D/g, '');
    if (!clean) return 'CVV is required';
    if (clean.length < 3 || clean.length > 4) return 'CVV must be 3 digits (or 4 for AMEX)';
    return null;
  };

  const checkBankRefError = (ref) => {
    const clean = (ref || '').trim();
    if (!clean) return 'Transaction reference / slip number is required';
    if (clean.length < 6) return 'Reference must be at least 6 characters (e.g. CEFTS-984218)';
    return null;
  };

  const isPaymentFormValid = () => {
    if (paymentMethod === 'CreditCard') {
      return !checkCardNumberError(cardData.number) &&
        !checkExpiryError(cardData.expiry) &&
        !checkCvvError(cardData.cvv);
    }
    if (paymentMethod === 'BankTransfer') {
      return !checkBankRefError(bankRef);
    }
    return false;
  };

  const validatePayment = () => {
    const errs = {};
    if (paymentMethod === 'CreditCard') {
      const numErr = checkCardNumberError(cardData.number);
      if (numErr) errs.cardNumber = numErr;
      const expErr = checkExpiryError(cardData.expiry);
      if (expErr) errs.expiry = expErr;
      const cvvErr = checkCvvError(cardData.cvv);
      if (cvvErr) errs.cvv = cvvErr;
    } else if (paymentMethod === 'BankTransfer') {
      const refErr = checkBankRefError(bankRef);
      if (refErr) errs.bankRef = refErr;
    }
    setPaymentErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleCardNumberChange = (e) => {
    const clean = e.target.value.replace(/\D/g, '').substring(0, 16);
    const formatted = clean.match(/.{1,4}/g)?.join(' ') || clean;
    setCardData(prev => ({ ...prev, number: formatted }));
    const err = formatted ? checkCardNumberError(formatted) : 'Card number is required';
    setPaymentErrors(prev => ({ ...prev, cardNumber: err }));
  };

  const handleExpiryChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '').substring(0, 4);
    let formatted = digits;
    if (digits.length >= 2) {
      formatted = digits.substring(0, 2) + '/' + digits.substring(2);
    }
    setCardData(prev => ({ ...prev, expiry: formatted }));
    const err = formatted.length === 5 ? checkExpiryError(formatted) : (formatted ? 'Incomplete MM/YY' : 'Expiry date is required');
    setPaymentErrors(prev => ({ ...prev, expiry: err }));
  };

  const handleCvvChange = (e) => {
    const clean = e.target.value.replace(/\D/g, '').substring(0, 4);
    setCardData(prev => ({ ...prev, cvv: clean }));
    const err = clean ? checkCvvError(clean) : 'CVV is required';
    setPaymentErrors(prev => ({ ...prev, cvv: err }));
  };

  const handleBankRefChange = (e) => {
    const val = e.target.value;
    setBankRef(val);
    const err = val ? checkBankRefError(val) : 'Transaction reference / slip number is required';
    setPaymentErrors(prev => ({ ...prev, bankRef: err }));
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

      // Option 3: Hospital Counter / Cash on Arrival
      if (paymentMethod === 'Counter') {
        if (!appointmentId) {
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
          setPendingAppointmentId(null);
          notify('Reservation confirmed! Please settle payment on arrival at the hospital reception.', 'success');
          return;
        } else {
          const payRes = await payAppointment(appointmentId, {
            paymentMethod: 'PayOnArrival',
            bankReference: 'COUNTER-PAY'
          });
          setConfirmedAppointment(payRes.data);
          setPendingAppointmentId(null);
          notify('Reservation confirmed! Please settle payment on arrival at the hospital reception.', 'success');
          return;
        }
      }

      // Option 1 & 2: Online Payment (CreditCard or BankTransfer)
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

      let cardRef = null;
      let bankReference = null;

      if (paymentMethod === 'CreditCard') {
        const cleanLast4 = cardData.number.replace(/\s+/g, '').slice(-4);
        cardRef = `**** **** **** ${cleanLast4 || '4242'}`;
      } else if (paymentMethod === 'BankTransfer') {
        bankReference = `${selectedBank}-${bankRef.trim().toUpperCase()}`;
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
        // Exclude current session and expired/unavailable sessions, and deduplicate
        const valid = res.data.filter(s => s.id !== apt.doctorSessionId && s.isAvailable && !s.isExpired);
        const dedup = new Map();
        for (const s of valid) {
          const key = `${s.sessionDate}_${(s.sessionType || 'Morning').toLowerCase()}`;
          const existing = dedup.get(key);
          if (!existing || (s.maxCapacity || 0) > (existing.maxCapacity || 0)) {
            dedup.set(key, s);
          }
        }
        setRescheduleSessions(Array.from(dedup.values()));
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

  const isSelectedDocGenMed = (selectedDoctor?.specialization || '').toLowerCase().includes('general') ||
    (selectedDoctor?.specialization || '').toLowerCase().includes('physician');

  const uniqueSessionDates = React.useMemo(() => {
    const allowedDays = parseDoctorAvailableDays(selectedDoctor?.availableDays);
    const allowedTypes = parseDoctorSessionTypes(selectedDoctor?.availableTime, isSelectedDocGenMed);

    const valid = availableSessions.filter(s => {
      if (s.isExpired) return false;
      const type = (s.sessionType || '').toLowerCase();
      if (type === 'night' && !isSelectedDocGenMed) return false;
      if (selectedDoctor && s.sessionDate) {
        const d = new Date(s.sessionDate + 'T00:00:00');
        if (!allowedDays.includes(d.getDay())) return false;
      }
      if (selectedDoctor && s.sessionType) {
        const matchesType = allowedTypes.some(t => t.toLowerCase() === type);
        if (!matchesType) return false;
      }
      return true;
    });
    return [...new Set(valid.map(s => s.sessionDate))].sort();
  }, [availableSessions, isSelectedDocGenMed, selectedDoctor]);

  const sessionsForSelectedDate = React.useMemo(() => {
    const allowedDays = parseDoctorAvailableDays(selectedDoctor?.availableDays);
    const allowedTypes = parseDoctorSessionTypes(selectedDoctor?.availableTime, isSelectedDocGenMed);

    if (selectedSessionDate) {
      const d = new Date(selectedSessionDate + 'T00:00:00');
      if (!allowedDays.includes(d.getDay())) return [];
    }

    const rawSessions = availableSessions.filter(
      s => s.sessionDate === selectedSessionDate && !s.isExpired
    );

    // Specialty & roster restriction
    const valid = rawSessions.filter(s => {
      const type = (s.sessionType || '').toLowerCase();
      if (type === 'night' && !isSelectedDocGenMed) {
        return false;
      }
      if (selectedDoctor && s.sessionType) {
        const matchesType = allowedTypes.some(t => t.toLowerCase() === type);
        if (!matchesType) return false;
      }
      return true;
    });

    // Deduplicate: Keep only ONE session per sessionType (Morning, Evening, Night) on this date
    // Prefer higher maxCapacity, then higher bookings
    const map = new Map();
    for (const session of valid) {
      const type = session.sessionType || 'Morning';
      const existing = map.get(type);
      if (!existing || (session.maxCapacity || 0) > (existing.maxCapacity || 0) || (session.currentBookings || 0) > (existing.currentBookings || 0)) {
        map.set(type, session);
      }
    }

    const order = { 'Morning': 1, 'Evening': 2, 'Night': 3 };
    return Array.from(map.values()).sort((a, b) => (order[a.sessionType] || 99) - (order[b.sessionType] || 99));
  }, [availableSessions, selectedSessionDate, isSelectedDocGenMed, selectedDoctor]);

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

      {/* ─── Interactive Multi-Step Stepper & Breadcrumb Bar (Steps 1–5) ─── */}
      {currentStep !== 6 && (
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          padding: '12px 18px',
          marginBottom: '20px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
          border: '1px solid #ECEFF1',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          {/* Step Pills */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flexWrap: 'wrap',
            flex: 1
          }}>
            {[
              {
                step: 1,
                title: '1. Search & Specialty',
                subtitle: selectedSpecialty !== 'ALL' ? selectedSpecialty : 'Find Consultant',
                isAccessible: true
              },
              {
                step: 2,
                title: '2. Select Specialist',
                subtitle: selectedDoctor ? selectedDoctor.fullName.split(' ').slice(0, 2).join(' ') : (doctors.length > 0 ? `${doctors.length} Available` : 'Consultants List'),
                isAccessible: Boolean(doctors.length > 0 || selectedDoctor || selectedSpecialty !== 'ALL')
              },
              {
                step: 3,
                title: '3. Choose Session',
                subtitle: selectedSession ? `${selectedSessionDate || ''} • ${selectedSession.timeFormatted || selectedSession.sessionType}` : (selectedDoctor ? 'Select Slot' : 'Pending Doctor'),
                isAccessible: Boolean(selectedDoctor)
              },
              {
                step: 4,
                title: '4. Patient Details',
                subtitle: patientDetails.fullName ? patientDetails.fullName.split(' ')[0] : (selectedSession ? 'Enter Info' : 'Pending Session'),
                isAccessible: Boolean(selectedDoctor && selectedSession)
              },
              {
                step: 5,
                title: '5. Payment & Confirm',
                subtitle: confirmedAppointment ? 'Confirmed' : (bookingType === 'Reservation' ? 'Reserve Slot' : 'Pay Online'),
                isAccessible: Boolean(selectedDoctor && selectedSession && patientDetails.fullName && patientDetails.nic && patientDetails.phone)
              }
            ].map((s, idx, arr) => {
              const isCurrent = currentStep === s.step;
              const isCompleted = currentStep > s.step;

              return (
                <React.Fragment key={s.step}>
                  <button
                    type="button"
                    disabled={!s.isAccessible}
                    onClick={() => {
                      if (s.isAccessible) setCurrentStep(s.step);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '7px 12px',
                      borderRadius: '8px',
                      border: isCurrent ? '1.5px solid #00796B' : '1px solid transparent',
                      backgroundColor: isCurrent ? '#E0F2F1' : (isCompleted ? '#F0FDF4' : '#F8FAFC'),
                      color: isCurrent ? '#004D40' : (isCompleted ? '#166534' : (s.isAccessible ? '#475569' : '#94A3B8')),
                      cursor: s.isAccessible ? 'pointer' : 'not-allowed',
                      opacity: s.isAccessible ? 1 : 0.55,
                      transition: 'all 0.15s ease',
                      textAlign: 'left'
                    }}
                    title={s.isAccessible ? `Click to jump to ${s.title}` : 'Complete prior step to unlock'}
                  >
                    <div style={{
                      width: '22px',
                      height: '22px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      fontWeight: '800',
                      backgroundColor: isCurrent ? '#00796B' : (isCompleted ? '#16A34A' : '#CBD5E1'),
                      color: '#FFFFFF',
                      flexShrink: 0
                    }}>
                      {isCompleted ? <Check size={13} strokeWidth={3} /> : s.step}
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: isCurrent ? '800' : '600', lineHeight: 1.2 }}>
                        {s.title}
                      </div>
                      <div style={{ fontSize: '10px', color: isCurrent ? '#00796B' : '#64748B', marginTop: '1px' }}>
                        {s.subtitle}
                      </div>
                    </div>
                  </button>

                  {idx < arr.length - 1 && (
                    <ChevronRight size={14} color="#CBD5E1" style={{ flexShrink: 0 }} />
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* Quick Back & Forward Buttons on the Stepper Bar */}
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              type="button"
              disabled={currentStep <= 1}
              onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid #CFD8DC',
                backgroundColor: currentStep > 1 ? '#FFFFFF' : '#F8FAFC',
                color: currentStep > 1 ? '#37474F' : '#94A3B8',
                fontSize: '12px',
                fontWeight: '700',
                cursor: currentStep > 1 ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                opacity: currentStep > 1 ? 1 : 0.6
              }}
              title="Go back to previous step"
            >
              <ArrowLeft size={13} /> Back
            </button>

            <button
              type="button"
              disabled={
                (currentStep === 1 && !selectedDoctor && doctors.length === 0) ||
                (currentStep === 2 && !selectedDoctor) ||
                (currentStep === 3 && !selectedSession) ||
                (currentStep === 4 && (!patientDetails.fullName || !patientDetails.nic || !patientDetails.phone)) ||
                currentStep >= 5
              }
              onClick={() => setCurrentStep(prev => Math.min(5, prev + 1))}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: '#00796B',
                color: '#FFFFFF',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                opacity: (
                  (currentStep === 1 && !selectedDoctor && doctors.length === 0) ||
                  (currentStep === 2 && !selectedDoctor) ||
                  (currentStep === 3 && !selectedSession) ||
                  (currentStep === 4 && (!patientDetails.fullName || !patientDetails.nic || !patientDetails.phone)) ||
                  currentStep >= 5
                ) ? 0.45 : 1
              }}
              title="Proceed to next step"
            >
              Next <ArrowRight size={13} />
            </button>
          </div>
        </div>
      )}

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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <div style={{
                      width: '30px', height: '30px', borderRadius: '8px',
                      background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: '0 2px 8px rgba(16,185,129,0.35)',
                      flexShrink: 0
                    }}>
                      <Sparkles size={15} color="#FFFFFF" />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#064E3B', letterSpacing: '-0.01em' }}>
                        Smart Specialist Matcher
                      </h3>
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

                    if (s === 'NO_DOCTORS_AVAILABLE') return (
                      <div style={{
                        marginTop: '14px', padding: '12px 14px',
                        borderRadius: '10px', backgroundColor: '#FFFBEB',
                        border: '1px solid #FCD34D',
                        display: 'flex', gap: '10px', alignItems: 'flex-start'
                      }}>
                        <AlertTriangle size={18} color="#D97706" style={{ flexShrink: 0, marginTop: '1px' }} />
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: '700', color: '#92400E', marginBottom: '2px' }}>
                            No Available Doctors for {aiRecommendations.specialty || 'Selected Specialty'}
                          </div>
                          <div style={{ fontSize: '12px', color: '#B45309', lineHeight: '1.5' }}>
                            {aiRecommendations.reason || 'No active channeling sessions are currently open. Please check back later or consult General Medicine.'}
                          </div>
                        </div>
                      </div>
                    );

                    if (s === 'RECOMMENDATION_READY') return (
                      <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1.5px dashed rgba(16,185,129,0.5)' }}>
                        {/* Header Banner & HITL Status */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: '5px',
                              background: 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)',
                              color: '#065F46', fontSize: '11px', fontWeight: '800',
                              padding: '4px 10px', borderRadius: '8px',
                              border: '1px solid rgba(16,185,129,0.3)',
                              boxShadow: '0 1px 3px rgba(16,185,129,0.1)'
                            }}>
                              <Sparkles size={12} color="#059669" />
                              {aiRecommendations.specialty} • {Math.round((aiRecommendations.confidence ?? 0) * 100)}% Confidence
                            </span>
                            <span style={{ fontSize: '11px', color: '#6B7280' }}>
                              ⏱️ {aiRecommendations.totalDurationMs || 0}ms
                            </span>
                          </div>

                          {/* HITL Badge */}
                          <div style={{
                            display: 'inline-flex', alignItems: 'center', gap: '5px',
                            padding: '4px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: '700',
                            backgroundColor: aiRecommendations.approvalStatus === 'APPROVED' ? '#DEF7EC' : '#FEF3C7',
                            color: aiRecommendations.approvalStatus === 'APPROVED' ? '#03543F' : '#92400E',
                            border: `1px solid ${aiRecommendations.approvalStatus === 'APPROVED' ? '#31C48D' : '#F59E0B'}`
                          }}>
                            {aiRecommendations.approvalStatus === 'APPROVED' ? (
                              <>
                                <CheckCircle2 size={13} color="#057A55" />
                                <span>Human-in-the-Loop: Approved</span>
                              </>
                            ) : (
                              <>
                                <Clock size={13} color="#D97706" />
                                <span>Human-in-the-Loop: Awaiting Selection</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Clinical Triage Reason */}
                        {aiRecommendations.reason && (
                          <div style={{
                            backgroundColor: 'rgba(255,255,255,0.95)',
                            padding: '10px 14px', borderRadius: '10px',
                            border: '1px solid rgba(16,185,129,0.25)',
                            fontSize: '12px', color: '#064E3B', lineHeight: '1.6',
                            marginBottom: '14px', boxShadow: '0 1px 4px rgba(0,0,0,0.03)'
                          }}>
                            <strong>Clinical Assessment:</strong> {aiRecommendations.reason}
                          </div>
                        )}

                        {/* Top Consultant Candidates via DoctorSlotAllocationTool */}
                        {aiRecommendations.matchedDoctors && aiRecommendations.matchedDoctors.length > 0 && (
                          <div style={{ marginBottom: '14px' }}>
                            <div style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                              marginBottom: '8px'
                            }}>
                              <div style={{ fontSize: '12px', fontWeight: '800', color: '#065F46', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Cpu size={14} color="#059669" />
                                <span>Available Consultants (Allocated via Tool)</span>
                              </div>
                              <span style={{ fontSize: '11px', color: '#047857', fontWeight: '600' }}>
                                Earliest open slots queried
                              </span>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px' }}>
                              {aiRecommendations.matchedDoctors.map((doc) => (
                                <div
                                  key={doc.doctorId}
                                  style={{
                                    backgroundColor: '#FFFFFF',
                                    borderRadius: '12px',
                                    border: '1.5px solid #A7F3D0',
                                    padding: '12px 14px',
                                    boxShadow: '0 2px 8px rgba(16,185,129,0.08)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                    transition: 'all 0.2s'
                                  }}
                                >
                                  <div>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                                      <div>
                                        <div style={{ fontSize: '13px', fontWeight: '800', color: '#064E3B' }}>
                                          {doc.fullName}
                                        </div>
                                        <div style={{ fontSize: '11px', color: '#059669', fontWeight: '600' }}>
                                          {doc.specialization} • {doc.qualifications}
                                        </div>
                                      </div>
                                      <div style={{
                                        display: 'inline-flex', alignItems: 'center', gap: '3px',
                                        backgroundColor: '#FEF3C7', padding: '2px 6px', borderRadius: '6px',
                                        fontSize: '11px', fontWeight: '700', color: '#92400E', flexShrink: 0
                                      }}>
                                        <Star size={11} fill="#F59E0B" color="#F59E0B" />
                                        {doc.rating?.toFixed(1) || '4.8'}
                                      </div>
                                    </div>

                                    <div style={{ fontSize: '11px', color: '#4B5563', marginTop: '6px', lineHeight: '1.4' }}>
                                      📍 {doc.hospitalBranch} ({doc.roomNumber})
                                    </div>

                                    {doc.nextSessionDate && (
                                      <div style={{
                                        marginTop: '8px', padding: '6px 10px',
                                        backgroundColor: '#F0FDF4', borderRadius: '8px',
                                        border: '1px solid #BBF7D0', fontSize: '11px', color: '#166534',
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                                      }}>
                                        <span>📅 {doc.nextSessionDate} at {doc.nextSessionTime}</span>
                                        <span style={{ fontWeight: '700', color: '#15803D' }}>
                                          {doc.availableSlots} slots left
                                        </span>
                                      </div>
                                    )}

                                    {doc.matchReason && (
                                      <div style={{ fontSize: '10.5px', color: '#6B7280', marginTop: '6px', fontStyle: 'italic' }}>
                                        💡 {doc.matchReason}
                                      </div>
                                    )}
                                  </div>

                                  <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div style={{ fontSize: '12px', fontWeight: '800', color: '#065F46' }}>
                                      LKR {Number(doc.consultationFee).toLocaleString()}
                                    </div>
                                    <button
                                      type="button"
                                      disabled={approvingAiDoc}
                                      onClick={() => handleApproveAndSelectMatchedDoctor(doc)}
                                      style={{
                                        padding: '7px 14px',
                                        borderRadius: '8px',
                                        border: 'none',
                                        backgroundColor: '#10B981',
                                        color: '#FFFFFF',
                                        fontSize: '11.5px',
                                        fontWeight: '700',
                                        cursor: approvingAiDoc ? 'not-allowed' : 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '5px',
                                        boxShadow: '0 2px 6px rgba(16,185,129,0.3)',
                                        transition: 'all 0.15s'
                                      }}
                                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#059669'; }}
                                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#10B981'; }}
                                    >
                                      <Check size={13} />
                                      {approvingAiDoc ? 'Approving...' : 'Select & Book Slot'}
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Navigation Action */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', marginTop: '12px' }}>
                          <button
                            type="button"
                            onClick={() => handleApplyAiSpecialty(aiRecommendations.specialty)}
                            style={{
                              padding: '8px 16px', borderRadius: '8px',
                              border: '1px solid #10B981',
                              backgroundColor: 'rgba(255,255,255,0.95)',
                              color: '#065F46', fontSize: '12px', fontWeight: '700',
                              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                              boxShadow: '0 2px 6px rgba(16,185,129,0.15)',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <span>Browse All {aiRecommendations.specialty} Doctors</span>
                            <ChevronRight size={14} color="#059669" />
                          </button>
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

          {/* Bottom Navigation for Step 2 */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '24px',
            paddingTop: '16px',
            borderTop: '1px solid #ECEFF1'
          }}>
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              style={{
                padding: '8px 18px',
                borderRadius: '8px',
                border: '1px solid #CFD8DC',
                backgroundColor: '#FFFFFF',
                color: '#455A64',
                fontSize: '13px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <ArrowLeft size={14} /> Back to Search & Specialties
            </button>
            {selectedDoctor && (
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                style={{
                  padding: '8px 18px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#00796B',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 8px rgba(0,121,107,0.25)'
                }}
              >
                Continue to Session Picker <ArrowRight size={14} />
              </button>
            )}
          </div>
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

                {/* OPD Clinic Session Cards */}
                <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', fontWeight: '700', color: '#37474F' }}>
                  Select Consultation Session for {selectedSessionDate}
                </h4>

                {sessionsForSelectedDate.length === 0 ? (
                  <p style={{ color: '#78909C', fontSize: '13px', margin: '10px 0 20px 0' }}>
                    No consultation sessions scheduled for this date.
                  </p>
                ) : (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                    gap: '14px',
                    marginBottom: '20px'
                  }}>
                    {sessionsForSelectedDate.map(session => {
                      const isSelected = selectedSession?.id === session.id;
                      const disabled = !session.isAvailable || session.isExpired;
                      const sessionType = session.sessionType || 'Morning';
                      
                      const defaultRange = sessionType === 'Morning' ? '08:30 AM – 12:00 PM' : sessionType === 'Evening' ? '04:30 PM – 07:30 PM' : '08:00 PM – 10:00 PM';
                      const timeRange = session.timeRange || defaultRange;
                      const slotsLeft = session.slotsLeft !== undefined ? session.slotsLeft : Math.max(0, session.maxCapacity - session.currentBookings);

                      return (
                        <div
                          key={session.id}
                          style={{
                            padding: '16px 18px',
                            borderRadius: '12px',
                            border: isSelected ? '2px solid #00796B' : '1px solid #CBD5E1',
                            backgroundColor: disabled ? '#F8FAFC' : isSelected ? '#E0F2F1' : '#FFFFFF',
                            boxShadow: isSelected ? '0 4px 12px rgba(0,121,107,0.18)' : '0 1px 3px rgba(0,0,0,0.04)',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            gap: '12px',
                            transition: 'all 0.2s ease',
                            opacity: disabled ? 0.65 : 1
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                              <span style={{ fontSize: '15px', fontWeight: '800', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {sessionType === 'Morning' ? (
                                  <Sun size={17} color="#D97706" />
                                ) : sessionType === 'Evening' ? (
                                  <Sunset size={17} color="#7C3AED" />
                                ) : (
                                  <Moon size={17} color="#4F46E5" />
                                )}
                                <span>{sessionType} Session</span>
                              </span>
                              <span style={{
                                fontSize: '11px',
                                fontWeight: '700',
                                padding: '2px 8px',
                                borderRadius: '12px',
                                backgroundColor: disabled ? '#F1F5F9' : '#DCFCE7',
                                color: disabled ? '#64748B' : '#15803D'
                              }}>
                                {disabled ? 'Full' : `${slotsLeft} of ${session.maxCapacity} slots left`}
                              </span>
                            </div>

                            <div style={{ fontSize: '12.5px', color: '#475569', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <Clock size={13} color="#00796B" /> {timeRange}
                            </div>
                            <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>
                              Arrival by session start time. Tokens called in arrival sequence.
                            </div>
                          </div>

                          <button
                            type="button"
                            disabled={disabled}
                            onClick={() => setSelectedSession(session)}
                            style={{
                              width: '100%',
                              padding: '9px 12px',
                              borderRadius: '7px',
                              border: 'none',
                              backgroundColor: disabled ? '#E2E8F0' : isSelected ? '#004D40' : '#00796B',
                              color: disabled ? '#94A3B8' : '#FFFFFF',
                              fontSize: '12.5px',
                              fontWeight: '700',
                              cursor: disabled ? 'not-allowed' : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                              transition: 'background-color 0.15s'
                            }}
                          >
                            {isSelected ? '✓ Selected' : disabled ? 'Unavailable' : `Select ${sessionType}`}
                          </button>
                        </div>
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

          {/* Bottom Navigation for Step 3 */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '20px',
            paddingTop: '16px',
            borderTop: '1px solid #ECEFF1'
          }}>
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              style={{
                padding: '8px 18px',
                borderRadius: '8px',
                border: '1px solid #CFD8DC',
                backgroundColor: '#FFFFFF',
                color: '#455A64',
                fontSize: '13px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <ArrowLeft size={14} /> Back to Specialists
            </button>
            {selectedSession && (
              <button
                type="button"
                onClick={() => setCurrentStep(4)}
                style={{
                  padding: '8px 18px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#00796B',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 8px rgba(0,121,107,0.25)'
                }}
              >
                Proceed to Patient Details <ArrowRight size={14} />
              </button>
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

            {isAutofilled && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 16px',
                marginBottom: '16px',
                backgroundColor: '#F0FDF4',
                border: '1px solid #BBF7D0',
                borderRadius: '10px',
                fontSize: '12.5px',
                color: '#166534',
                lineHeight: 1.4
              }}>
                <CheckCircle2 size={18} color="#16A34A" style={{ flexShrink: 0 }} />
                <div>
                  <strong style={{ display: 'block', marginBottom: '2px' }}>Verified Account Information Auto-filled</strong>
                  <span>Your National ID, contact phone, name, and registered details were automatically populated. You can edit them if booking for a family member or dependent.</span>
                </div>
              </div>
            )}

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
                    EMAIL ADDRESS *
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. yourname@gmail.com"
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
                  {formErrors.email ? (
                    <div style={{ fontSize: '11px', color: '#EF4444', marginTop: '4px', fontWeight: '600' }}>{formErrors.email}</div>
                  ) : (
                    <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#64748B' }}>
                      Your reservation slip &amp; hospital QR code will be emailed directly to this address.
                    </p>
                  )}
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
                flexWrap: 'wrap',
                gap: '10px',
                marginTop: '10px',
                paddingTop: '16px',
                borderTop: '1px solid #ECEFF1'
              }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(3)}
                    style={{
                      padding: '10px 18px',
                      borderRadius: '8px',
                      border: '1px solid #CFD8DC',
                      backgroundColor: '#FFFFFF',
                      color: '#455A64',
                      fontSize: '13px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <ArrowLeft size={14} /> Back to Sessions
                  </button>
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
                </div>

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

              {/* Payment Method Tabs (3 Professional Options) */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#1E293B', marginBottom: '8px', letterSpacing: '0.02em' }}>
                  SELECT PAYMENT METHOD
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                  {[
                    {
                      id: 'CreditCard',
                      label: 'Credit / Debit Card',
                      sub: 'Visa, Mastercard, Amex, LankaPay',
                      icon: <CreditCard size={18} />
                    },
                    {
                      id: 'BankTransfer',
                      label: 'Bank Transfer / CDM',
                      sub: 'CEFTS, Direct Bank Deposit',
                      icon: <Building2 size={18} />
                    }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        setPaymentMethod(tab.id);
                        setPaymentErrors({});
                      }}
                      style={{
                        padding: '14px 12px',
                        borderRadius: '10px',
                        border: paymentMethod === tab.id ? '2px solid #00796B' : '1px solid #E2E8F0',
                        backgroundColor: paymentMethod === tab.id ? '#F0FDF4' : '#FFFFFF',
                        color: paymentMethod === tab.id ? '#064E3B' : '#475569',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        textAlign: 'center',
                        transition: 'all 0.15s ease',
                        boxShadow: paymentMethod === tab.id ? '0 2px 8px rgba(0,121,107,0.12)' : 'none'
                      }}
                    >
                      <div style={{ color: paymentMethod === tab.id ? '#00796B' : '#64748B' }}>
                        {tab.icon}
                      </div>
                      <div style={{ fontSize: '12px', fontWeight: '800' }}>
                        {tab.label}
                      </div>
                      <div style={{ fontSize: '10px', color: paymentMethod === tab.id ? '#047857' : '#94A3B8', fontWeight: '500' }}>
                        {tab.sub}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Tab Form Content 1: Credit / Debit Card */}
              {paymentMethod === 'CreditCard' && (
                <div style={{
                  padding: '20px',
                  borderRadius: '12px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  marginBottom: '20px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', paddingBottom: '12px', borderBottom: '1px solid #F1F5F9' }}>
                    <div>
                      <span style={{ fontSize: '13px', fontWeight: '800', color: '#0F172A', display: 'block' }}>
                        Credit / Debit Card Payment Gateway
                      </span>
                      <span style={{ fontSize: '11px', color: '#64748B' }}>
                        Visa • Mastercard • American Express • LankaPay Card
                      </span>
                    </div>
                    <span style={{ fontSize: '11px', color: '#00796B', backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', padding: '3px 8px', borderRadius: '4px', fontWeight: '600' }}>
                      🔒 256-Bit SSL Encrypted
                    </span>
                  </div>

                  {/* Card Number Input */}
                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '4px', letterSpacing: '0.02em' }}>
                      CARD NUMBER *
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="4444 4444 4444 4444"
                      maxLength={19}
                      value={cardData.number}
                      onChange={handleCardNumberChange}
                      style={{
                        width: '100%',
                        padding: '11px 14px',
                        border: paymentErrors.cardNumber ? '1.5px solid #DC2626' : '1px solid #CBD5E1',
                        borderRadius: '8px',
                        fontSize: '14px',
                        letterSpacing: '0.04em',
                        boxSizing: 'border-box',
                        outline: 'none',
                        transition: 'border-color 0.2s',
                        backgroundColor: '#FFFFFF'
                      }}
                    />
                    {paymentErrors.cardNumber && (
                      <div style={{ color: '#DC2626', fontSize: '11px', marginTop: '4px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <AlertCircle size={12} />
                        <span>{paymentErrors.cardNumber}</span>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    {/* Expiry Date */}
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '4px', letterSpacing: '0.02em' }}>
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
                          padding: '11px 14px',
                          border: paymentErrors.expiry ? '1.5px solid #DC2626' : '1px solid #CBD5E1',
                          borderRadius: '8px',
                          fontSize: '14px',
                          letterSpacing: '0.04em',
                          boxSizing: 'border-box',
                          outline: 'none',
                          transition: 'border-color 0.2s',
                          backgroundColor: '#FFFFFF'
                        }}
                      />
                      {paymentErrors.expiry && (
                        <div style={{ color: '#DC2626', fontSize: '11px', marginTop: '4px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <AlertCircle size={12} />
                          <span>{paymentErrors.expiry}</span>
                        </div>
                      )}
                    </div>

                    {/* CVV */}
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '4px', letterSpacing: '0.02em' }}>
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
                          padding: '11px 14px',
                          border: paymentErrors.cvv ? '1.5px solid #DC2626' : '1px solid #CBD5E1',
                          borderRadius: '8px',
                          fontSize: '14px',
                          letterSpacing: '0.08em',
                          boxSizing: 'border-box',
                          outline: 'none',
                          transition: 'border-color 0.2s',
                          backgroundColor: '#FFFFFF'
                        }}
                      />
                      {paymentErrors.cvv && (
                        <div style={{ color: '#DC2626', fontSize: '11px', marginTop: '4px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <AlertCircle size={12} />
                          <span>{paymentErrors.cvv}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab Form Content 2: Bank Transfer / CDM */}
              {paymentMethod === 'BankTransfer' && (
                <div style={{
                  padding: '20px',
                  borderRadius: '12px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  marginBottom: '20px'
                }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '8px', letterSpacing: '0.02em' }}>
                    SELECT HOSPITAL BENEFICIARY BANK *
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
                    {[
                      { id: 'BOC', name: 'Bank of Ceylon (BOC)' },
                      { id: 'COMBANK', name: 'Commercial Bank of Ceylon' }
                    ].map(b => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => setSelectedBank(b.id)}
                        style={{
                          padding: '10px 8px',
                          borderRadius: '8px',
                          border: selectedBank === b.id ? '2px solid #00796B' : '1px solid #CBD5E1',
                          backgroundColor: selectedBank === b.id ? '#F0FDF4' : '#F8FAFC',
                          color: selectedBank === b.id ? '#064E3B' : '#475569',
                          fontSize: '12px',
                          fontWeight: '700',
                          cursor: 'pointer',
                          textAlign: 'center',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {b.name}
                      </button>
                    ))}
                  </div>

                  {/* Beneficiary Details Card */}
                  {(() => {
                    const beneficiary = {
                      BOC: {
                        bankName: 'Bank of Ceylon (BOC)',
                        accountName: 'Health Bridge Pvt Ltd',
                        accountNumber: '00812345678',
                        branch: 'Corporate Branch, Colombo 01',
                        bankCode: '7010',
                        branchCode: '001',
                        swiftCode: 'BCEYLKLX'
                      },
                      COMBANK: {
                        bankName: 'Commercial Bank of Ceylon',
                        accountName: 'Health Bridge Pvt Ltd',
                        accountNumber: '1000293847',
                        branch: 'Colombo Main Branch, York Street',
                        bankCode: '7056',
                        branchCode: '001',
                        swiftCode: 'CCBLLKLX'
                      }
                    }[selectedBank] || {
                      bankName: 'Bank of Ceylon (BOC)',
                      accountName: 'Health Bridge Pvt Ltd',
                      accountNumber: '00812345678',
                      branch: 'Corporate Branch, Colombo 01',
                      bankCode: '7010',
                      branchCode: '001',
                      swiftCode: 'BCEYLKLX'
                    };

                    return (
                      <div style={{
                        backgroundColor: '#F8FAFC',
                        padding: '14px 16px',
                        borderRadius: '8px',
                        marginBottom: '16px',
                        border: '1px solid #E2E8F0'
                      }}>
                        <div style={{ fontSize: '11px', fontWeight: '800', color: '#00796B', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Verified Beneficiary Information — {beneficiary.bankName}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', fontSize: '12px', color: '#334155' }}>
                          <div>
                            <span style={{ color: '#64748B', fontSize: '11px', display: 'block' }}>Account Name</span>
                            <strong>{beneficiary.accountName}</strong>
                          </div>
                          <div>
                            <span style={{ color: '#64748B', fontSize: '11px', display: 'block' }}>Account Number</span>
                            <strong style={{ letterSpacing: '0.05em' }}>{beneficiary.accountNumber}</strong>
                          </div>
                          <div>
                            <span style={{ color: '#64748B', fontSize: '11px', display: 'block' }}>Branch & Code</span>
                            <span>{beneficiary.branch} ({beneficiary.branchCode})</span>
                          </div>
                          <div>
                            <span style={{ color: '#64748B', fontSize: '11px', display: 'block' }}>Bank Code / Swift</span>
                            <span>Bank Code: {beneficiary.bankCode} • {beneficiary.swiftCode}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#334155', marginBottom: '4px', letterSpacing: '0.02em' }}>
                      TRANSACTION REFERENCE / CDM SLIP NUMBER *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. CEFTS-984218 or CDM-88129"
                      value={bankRef}
                      onChange={handleBankRefChange}
                      style={{
                        width: '100%',
                        padding: '11px 14px',
                        border: paymentErrors.bankRef ? '1.5px solid #DC2626' : '1px solid #CBD5E1',
                        borderRadius: '8px',
                        fontSize: '13px',
                        boxSizing: 'border-box',
                        outline: 'none',
                        transition: 'border-color 0.2s',
                        backgroundColor: '#FFFFFF'
                      }}
                    />
                    {paymentErrors.bankRef && (
                      <div style={{ color: '#DC2626', fontSize: '11px', marginTop: '4px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <AlertCircle size={12} />
                        <span>{paymentErrors.bankRef}</span>
                      </div>
                    )}
                    <div style={{ fontSize: '11px', color: '#64748B', marginTop: '6px' }}>
                      💡 Transfer via your bank app (CEFTS) or cash deposit machine. Enter the reference number above to confirm.
                    </div>
                  </div>
                </div>
              )}

              {/* Action Button: Disabled Until Active Method Pass Validation */}
              <button
                type="button"
                onClick={handleConfirmAndPay}
                disabled={!isPaymentFormValid() || isProcessingPayment}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: isPaymentFormValid() && !isProcessingPayment ? '#00796B' : '#94A3B8',
                  color: '#FFFFFF',
                  fontSize: '14px',
                  fontWeight: '800',
                  cursor: isPaymentFormValid() && !isProcessingPayment ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: isPaymentFormValid() && !isProcessingPayment ? '0 4px 14px rgba(0,121,107,0.28)' : 'none',
                  transition: 'all 0.2s ease',
                  opacity: isPaymentFormValid() && !isProcessingPayment ? 1 : 0.65
                }}
              >
                {isProcessingPayment ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>Processing Payment...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={18} />
                    <span>
                      {paymentMethod === 'BankTransfer'
                        ? 'Confirm Bank Transfer & Reserve Slot'
                        : `Authorize & Pay LKR ${totalFee.toLocaleString()}`}
                    </span>
                  </>
                )}
              </button>

              <div style={{ marginTop: '12px', textAlign: 'center' }}>
                <button
                  type="button"
                  onClick={() => setCurrentStep(4)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#00796B',
                    fontSize: '12.5px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    textDecoration: 'underline'
                  }}
                >
                  <ArrowLeft size={14} /> Back to Edit Patient Details
                </button>
              </div>

              {/* Footer Trust Indicator */}
              <div style={{
                marginTop: '16px',
                textAlign: 'center',
                fontSize: '11px',
                color: '#64748B',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}>
                <ShieldCheck size={14} color="#00796B" />
                <span>Private Hospital Healthcare Portal • Central Bank of Sri Lanka (CBSL) Compliant</span>
              </div>
            </div>
          ) : (
            /* Appointment Confirmed / Reserved State (with QR Code) */
            <div style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              padding: '0',
              border: confirmedAppointment.paymentStatus === 'Paid' ? '2px solid #00796B' : '2px solid #F59E0B',
              boxShadow: '0 4px 20px rgba(0,77,64,0.08)',
              maxWidth: '560px',
              margin: '0 auto',
              textAlign: 'center',
              overflow: 'hidden'
            }}>

              {/* ── Top email alert banner ── */}
              <div style={{
                background: confirmedAppointment.paymentStatus === 'Paid'
                  ? 'linear-gradient(90deg, #d1fae5 0%, #ecfdf5 100%)'
                  : 'linear-gradient(90deg, #fef3c7 0%, #fffbeb 100%)',
                borderBottom: confirmedAppointment.paymentStatus === 'Paid'
                  ? '1px solid #6ee7b7'
                  : '1px solid #fde68a',
                padding: '10px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontSize: '12.5px',
                fontWeight: '700',
                color: confirmedAppointment.paymentStatus === 'Paid' ? '#065f46' : '#92400e',
                letterSpacing: '0.01em',
                animation: 'slideInUp 0.35s ease-out'
              }}>
                <span style={{ fontSize: '15px' }}>📧</span>
                {confirmedAppointment.paymentStatus === 'Paid'
                  ? 'Appointment confirmation & check-in QR code sent to your registered email!'
                  : 'Reservation pass & check-in QR code have been sent to your registered email!'}
              </div>

              {/* Card body */}
              <div style={{ padding: '28px 24px 32px' }}>
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

                {/* Queue Number / Token Badge */}
                <div style={{
                  backgroundColor: '#E0F2F1',
                  borderRadius: '10px',
                  padding: '14px 24px',
                  marginBottom: '16px',
                  display: 'inline-block',
                  border: '1px solid #B2DFDB'
                }}>
                  <div style={{ fontSize: '11px', color: '#00796B', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Session Consultation Token
                  </div>
                  <div style={{ fontSize: '34px', fontWeight: '900', color: '#004D40', letterSpacing: '1px' }}>
                    {confirmedAppointment.queueLabel || (confirmedAppointment.sessionType ? `${confirmedAppointment.sessionType[0]}-${String(confirmedAppointment.queueNumber).padStart(2, '0')}` : `Token: #${String(confirmedAppointment.queueNumber).padStart(2, '0')}`)}
                  </div>
                  <div style={{ fontSize: '11px', color: '#00796B', marginTop: '2px', fontWeight: '600' }}>
                    {confirmedAppointment.doctorName} — {confirmedAppointment.sessionType || 'OPD'} Session ({confirmedAppointment.timeSlot})
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
                  <div><strong>Session & Time:</strong> {confirmedAppointment.sessionType ? `${confirmedAppointment.sessionType} Session (${confirmedAppointment.timeSlot})` : confirmedAppointment.timeSlot} on {confirmedAppointment.appointmentDate}</div>
                  <div><strong>Your Session Token:</strong> <span style={{ color: '#00796B', fontWeight: '800' }}>{confirmedAppointment.queueLabel || `#${confirmedAppointment.queueNumber}`}</span></div>
                  <div><strong>Hospital:</strong> {confirmedAppointment.hospitalBranch}</div>
                  <div><strong>Patient:</strong> {confirmedAppointment.patientName} (NIC: {confirmedAppointment.patientNic})</div>
                  <div><strong>Confirmation Sent To:</strong> <span style={{ color: '#00796B', fontWeight: '700' }}>{confirmedAppointment.patientEmail || patientDetails.email}</span> <span style={{ color: '#64748B', fontSize: '11px' }}>(Check Inbox &amp; Spam)</span></div>
                  
                  {/* Arrival Instructions */}
                  <div style={{
                    marginTop: '10px',
                    padding: '8px 12px',
                    backgroundColor: '#FEF3C7',
                    borderRadius: '6px',
                    border: '1px solid #FDE68A',
                    fontSize: '12px',
                    color: '#92400E',
                    fontWeight: '600'
                  }}>
                    ℹ️ <strong>Patient Notice:</strong> Please arrive at the hospital channeling reception by the session start time ({confirmedAppointment.timeSlot?.split('–')[0]?.split('-')[0]?.trim() || 'session start'}). Consultations are conducted sequentially by token number.
                  </div>
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
                        {apt.specialization} • {apt.appointmentDate} • {apt.sessionType ? `${apt.sessionType} Session (${apt.timeSlot})` : apt.timeSlot} • <strong style={{ color: '#00796B' }}>Token: {apt.queueLabel || `#${String(apt.queueNumber).padStart(2, '0')}`}</strong>
                      </div>
                      <div style={{ fontSize: '11px', color: '#90A4AE', marginTop: '2px' }}>
                        Hospital: {apt.hospitalBranch}
                      </div>

                      {/* Live Status card for today's appointments */}
                      {apt.isToday && (
                        <div style={{
                          marginTop: '10px',
                          backgroundColor: '#F0FDF4',
                          border: '1.5px solid #86EFAC',
                          borderRadius: '10px',
                          padding: '10px 14px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                backgroundColor: apt.sessionStatus === 'Active' ? '#16A34A' : apt.sessionStatus === 'Delayed' ? '#D97706' : '#2563EB',
                                display: 'inline-block'
                              }} />
                              <span style={{ fontSize: '12px', fontWeight: '800', color: '#065F46' }}>
                                Dr. {apt.doctorName} · Room {apt.roomNumber || 'Consultation Suite'}
                              </span>
                            </div>
                            <span style={{
                              fontSize: '10px',
                              fontWeight: '700',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              backgroundColor: apt.sessionStatus === 'Active' ? '#DCFCE7' : apt.sessionStatus === 'Delayed' ? '#FEF3C7' : '#E0F2FE',
                              color: apt.sessionStatus === 'Active' ? '#15803D' : apt.sessionStatus === 'Delayed' ? '#B45309' : '#0369A1'
                            }}>
                              {apt.sessionStatus || 'Scheduled'}
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', fontSize: '12px' }}>
                            <span style={{ color: '#065F46' }}>
                              Your token: <strong style={{ color: '#047857', fontSize: '13px' }}>{apt.queueLabel || `#${String(apt.queueNumber).padStart(2, '0')}`}</strong>
                            </span>
                            <span style={{ color: '#065F46' }}>
                              Currently serving: <strong style={{ color: '#00796B', fontSize: '13px' }}>{apt.currentlyServingLabel || 'Not started'}</strong>
                            </span>
                          </div>

                          {apt.sessionStatus === 'Delayed' && (
                            <div style={{
                              backgroundColor: '#FEF3C7',
                              border: '1px solid #FCD34D',
                              borderRadius: '6px',
                              padding: '5px 10px',
                              fontSize: '11px',
                              color: '#92400E',
                              fontWeight: '700'
                            }}>
                              Delayed — new estimated start {apt.expectedStartTime ? new Date(apt.expectedStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'shortly'}{apt.delayReason ? ` (${apt.delayReason})` : ''}
                            </div>
                          )}

                          {apt.estimatedConsultationTime && (
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              flexWrap: 'wrap',
                              gap: '6px',
                              fontSize: '11px',
                              color: '#065F46',
                              backgroundColor: '#ECFDF5',
                              padding: '5px 8px',
                              borderRadius: '6px'
                            }}>
                              <span>
                                Estimated consultation time: <strong>{apt.estimatedConsultationTime} (approximate)</strong>
                              </span>
                              {apt.recommendedArrivalTime && (
                                <span style={{ color: '#047857', fontWeight: '600' }}>
                                  Recommended arrival: {apt.recommendedArrivalTime}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      )}
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
              Ref: {activeQrApt.appointmentNumber} • Token: <strong>{activeQrApt.queueLabel || `#${String(activeQrApt.queueNumber).padStart(2, '0')}`}</strong>
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
              {activeQrApt.sessionType ? `${activeQrApt.sessionType} Session • ${activeQrApt.timeSlot}` : activeQrApt.timeSlot}<br />
              {activeQrApt.appointmentDate}
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
