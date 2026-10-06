import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { getDashboardPath } from '../../../utils/navigation';
import {
  getAllAppointments, updateAppointmentStatus, deleteAppointment, getAppointmentStats,
  checkInAppointment, lookupAppointmentByQr, searchAppointmentsForDesk, getDoctors, getDoctorSessions, startSession, delaySession, cancelSession,
  forceStatusAppointment
} from '../../../api/doctorApi';
import logoImage from '../../../assets/mediz.png';
import { FALLBACK_DOCTORS, generateFallbackSessions } from '../../../data/fallbackDoctors';
import {
  Stethoscope, Calendar, Clock, MapPin, User, Search,
  CheckCircle2, XCircle, AlertCircle, RefreshCw, QrCode,
  Filter, ArrowLeft, Trash2, Phone, Mail, X, Activity, DollarSign,
  Play, AlertTriangle, UserCheck, ShieldAlert, ChevronDown, ChevronUp,
  CalendarDays, MoreHorizontal
} from 'lucide-react';

const DoctorAppointmentsAdmin = () => {
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  const [appointments, setAppointments] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedQrApt, setSelectedQrApt] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // Force Status Modal State
  const [forceStatusModalApt, setForceStatusModalApt] = useState(null);
  const [forceStatusTarget, setForceStatusTarget] = useState('Confirmed');
  const [forceStatusReason, setForceStatusReason] = useState('');
  const [forceStatusError, setForceStatusError] = useState('');
  const [forceStatusLoading, setForceStatusLoading] = useState(false);

  // Overflow Actions & Delete Modal State
  const [openOverflowRowId, setOpenOverflowRowId] = useState(null);
  const [deleteModalApt, setDeleteModalApt] = useState(null);

  // Duplicate Bookings Highlighting / Filter State
  const [duplicateFilterKey, setDuplicateFilterKey] = useState(null);

  // Desk Check-In State
  const [deskMode, setDeskMode] = useState('scan'); // 'scan' | 'manual'
  const [deskQrInput, setDeskQrInput] = useState('');
  const [deskManualQuery, setDeskManualQuery] = useState('');
  const [manualSearchResults, setManualSearchResults] = useState([]);
  const [isSearchingManual, setIsSearchingManual] = useState(false);
  const [previewApt, setPreviewApt] = useState(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [checkInResult, setCheckInResult] = useState(null);
  const scannerInputRef = useRef(null);

  // Sessions Management State
  const [doctorsList, setDoctorsList] = useState([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [doctorSessions, setDoctorSessions] = useState([]);
  const [sessionFilterTab, setSessionFilterTab] = useState('today'); // 'today' | 'upcoming' | 'history'
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [delayModalSession, setDelayModalSession] = useState(null);
  const [delayExpectedTime, setDelayExpectedTime] = useState('');
  const [delayReason, setDelayReason] = useState('');
  const [cancelModalSession, setCancelModalSession] = useState(null);
  const [cancelReason, setCancelReason] = useState('');

  // Accordion state for upcoming / history grouped dates
  const [expandedDates, setExpandedDates] = useState({});
  const toggleDateExpanded = (dateStr) => {
    setExpandedDates(prev => ({
      ...prev,
      [dateStr]: !prev[dateStr]
    }));
  };

  // Master Appointments Table Date & Status Filters
  const [tableDateFilter, setTableDateFilter] = useState('today'); // 'today' | 'week' | 'all'
  const [tableStatusTab, setTableStatusTab] = useState('ALL'); // 'ALL' | 'AwaitingCheckIn' | 'Waiting' | 'Completed'

  const formatFriendlyDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: '2-digit', year: 'numeric' });
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  useEffect(() => {
    fetchData();
    fetchDoctors();
  }, [statusFilter]);

  useEffect(() => {
    if (selectedDoctorId) {
      fetchSessions(selectedDoctorId);
    }
  }, [selectedDoctorId]);

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3500);
  };

  const fetchDoctors = async () => {
    try {
      const res = await getDoctors();
      if (Array.isArray(res.data) && res.data.length > 0) {
        setDoctorsList(res.data);
        setSelectedDoctorId(res.data[0].id);
      } else {
        setDoctorsList(FALLBACK_DOCTORS);
        setSelectedDoctorId(FALLBACK_DOCTORS[0].id);
      }
    } catch (err) {
      console.warn('Failed to load doctors list from server, using fallback:', err);
      setDoctorsList(FALLBACK_DOCTORS);
      setSelectedDoctorId(FALLBACK_DOCTORS[0].id);
    }
  };

  const fetchSessions = async (docId) => {
    setLoadingSessions(true);
    try {
      const res = await getDoctorSessions(docId);
      if (Array.isArray(res.data) && res.data.length > 0) {
        setDoctorSessions(res.data);
      } else {
        setDoctorSessions(generateFallbackSessions(Number(docId)));
      }
    } catch (err) {
      console.warn('Failed to load sessions from server, using fallback:', err);
      setDoctorSessions(generateFallbackSessions(Number(docId)));
    } finally {
      setLoadingSessions(false);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [aptRes, statsRes] = await Promise.all([
        getAllAppointments({ search, status: statusFilter }),
        getAppointmentStats()
      ]);
      if (Array.isArray(aptRes.data)) setAppointments(aptRes.data);
      if (statsRes.data) setStats(statsRes.data);
    } catch (err) {
      console.error('Failed to load appointments admin data', err);
      showToast('Error loading appointments data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchData();
  };

  const handleQrLookup = async (tokenOverride) => {
    const token = (tokenOverride || deskQrInput).trim();
    if (!token) {
      showToast('Please scan a QR code or paste a QR token', 'error');
      return;
    }
    setIsLookingUp(true);
    try {
      const res = await lookupAppointmentByQr(token);
      setPreviewApt(res.data);
      setDeskQrInput('');
      showToast(`Appointment found for ${res.data.patientName}`, 'success');
    } catch (err) {
      console.error('QR Lookup failed', err);
      const msg = err.response?.data?.message || 'No appointment found matching this QR code';
      showToast(msg, 'error');
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleManualSearch = async (e) => {
    if (e) e.preventDefault();
    if (!deskManualQuery.trim()) {
      showToast('Please enter Patient Name, NIC, Phone, or Appointment Number', 'error');
      return;
    }
    setIsSearchingManual(true);
    try {
      const res = await searchAppointmentsForDesk(deskManualQuery.trim());
      if (Array.isArray(res.data)) {
        setManualSearchResults(res.data);
        if (res.data.length === 0) {
          showToast('No matching appointments found', 'error');
        }
      }
    } catch (err) {
      console.error('Manual search failed', err);
      showToast('Search failed. Please try again.', 'error');
    } finally {
      setIsSearchingManual(false);
    }
  };

  const handleSelectManualApt = async (m) => {
    setIsLookingUp(true);
    try {
      const res = await lookupAppointmentByQr(m.appointmentNumber);
      setPreviewApt(res.data);
      setManualSearchResults([]);
      setDeskManualQuery('');
      showToast(`Loaded details for ${res.data.patientName}`, 'success');
    } catch (err) {
      setPreviewApt(m);
      setManualSearchResults([]);
      setDeskManualQuery('');
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleConfirmCheckIn = async () => {
    if (!previewApt || actionLoading) return;
    setActionLoading(true);
    try {
      // Manual path passes null qrToken if not present
      const token = previewApt.qrToken || null;
      const res = await checkInAppointment(previewApt.id, token);
      const updatedApt = res.data;
      setCheckInResult(updatedApt);
      setPreviewApt(updatedApt);
      showToast(`Patient ${updatedApt.patientName} checked in! Arrival: ${updatedApt.arrivalStatus}`, 'success');
      fetchData();
    } catch (err) {
      console.error('Check-in failed', err);
      const msg = err.response?.data?.message || 'Check-in validation failed';
      showToast(msg, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleClearPreview = () => {
    setPreviewApt(null);
    setCheckInResult(null);
    if (deskMode === 'scan') {
      setTimeout(() => scannerInputRef.current?.focus(), 100);
    }
  };

  const handleStartSession = async (sessionId) => {
    setActionLoading(true);
    try {
      await startSession(sessionId);
      showToast('Session started successfully!', 'success');
      fetchSessions(selectedDoctorId);
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to start session', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelaySession = async () => {
    if (!delayModalSession || !delayExpectedTime) {
      showToast('Please specify expected start time', 'error');
      return;
    }
    setActionLoading(true);
    try {
      await delaySession(delayModalSession.id, delayExpectedTime, delayReason);
      showToast('Session marked as delayed and patients notified!', 'success');
      setDelayModalSession(null);
      setDelayExpectedTime('');
      setDelayReason('');
      fetchSessions(selectedDoctorId);
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delay session', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelSession = async () => {
    if (!cancelModalSession) return;
    setActionLoading(true);
    try {
      await cancelSession(cancelModalSession.id, cancelReason);
      showToast('Session cancelled and all patient bookings notified!', 'success');
      setCancelModalSession(null);
      setCancelReason('');
      fetchSessions(selectedDoctorId);
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to cancel session', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Duplicate active bookings computation
  const getDuplicateKey = (a) => {
    if (!a) return '';
    const patientKey = (a.patientNic?.trim().toLowerCase() || a.patientPhone?.trim() || a.patientName?.trim().toLowerCase() || '');
    return `${a.doctorId}_${a.appointmentDate}_${patientKey}`;
  };

  const duplicateMap = React.useMemo(() => {
    const map = new Map();
    appointments.forEach(a => {
      if (a.status === 'Cancelled') return;
      const key = getDuplicateKey(a);
      if (!key) return;
      map.set(key, (map.get(key) || 0) + 1);
    });
    return map;
  }, [appointments]);

  const handleFindInCheckIn = (apt) => {
    // Switch Section 2 to manual search and pre-fill with appointment reference
    setDeskMode('manual');
    setDeskManualQuery(apt.appointmentNumber);

    setIsSearchingManual(true);
    searchAppointmentsForDesk(apt.appointmentNumber)
      .then(res => {
        if (Array.isArray(res.data)) {
          setManualSearchResults(res.data);
        }
      })
      .catch(err => {
        console.error('Manual desk search prefill failed', err);
      })
      .finally(() => {
        setIsSearchingManual(false);
      });

    // Smooth scroll to Section 2 (Check-in desk) without mutating appointment state
    const el = document.getElementById('channeling-desk-checkin-station');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.scrollTo({ top: 220, behavior: 'smooth' });
    }

    showToast(`Focused in Check-In Desk for ${apt.patientName}`, 'success');
  };

  const handleStatusChange = async (id, status, notes = '') => {
    setActionLoading(true);
    try {
      await updateAppointmentStatus(id, status, notes);
      showToast(`Appointment status updated to ${status}`, 'success');
      fetchData();
    } catch (err) {
      const msg = err.response?.data?.message || `Failed to update status to ${status}`;
      showToast(msg, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApplyForceStatus = async () => {
    if (!forceStatusReason.trim()) {
      setForceStatusError('A valid reason is strictly required to force appointment status.');
      return;
    }
    setForceStatusLoading(true);
    setForceStatusError('');
    try {
      await forceStatusAppointment(forceStatusModalApt.id, forceStatusTarget, forceStatusReason.trim());
      showToast(`Status updated to ${forceStatusTarget} with audit reason`, 'success');
      setForceStatusModalApt(null);
      setForceStatusReason('');
      fetchData();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to force status';
      setForceStatusError(msg);
      showToast(msg, 'error');
    } finally {
      setForceStatusLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteModalApt) return;
    setActionLoading(true);
    try {
      await deleteAppointment(deleteModalApt.id);
      showToast(`Appointment ${deleteModalApt.appointmentNumber} deleted`, 'success');
      setDeleteModalApt(null);
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete appointment', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F4F7F6', display: 'flex', flexDirection: 'column', fontFamily: 'inherit' }}>
      {/* Toast Notification */}
      {toast.show && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 9999,
          padding: '12px 20px',
          borderRadius: '8px',
          backgroundColor: toast.type === 'error' ? '#EF4444' : '#00897B',
          color: '#FFFFFF',
          fontSize: '13px',
          fontWeight: '700',
          boxShadow: '0 4px 14px rgba(0,0,0,0.15)'
        }}>
          {toast.message}
        </div>
      )}

      {/* Top Navigation Bar */}
      <header style={{
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #E0E6ED',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={() => navigate('/pharmacist/medicines')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              border: '1px solid #CFD8DC',
              backgroundColor: '#FFFFFF',
              color: '#37474F',
              padding: '6px 12px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '600'
            }}
          >
            <ArrowLeft size={14} /> Back
          </button>
          <Link
            to={getDashboardPath(user)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              textDecoration: 'none',
              cursor: 'pointer',
              transition: 'opacity 0.2s ease'
            }}
            className="cursor-pointer"
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
            title="Return to Main Dashboard"
          >
            <img src={logoImage} alt="Health Bridge" style={{ height: '36px' }} />
            <div>
              <h1 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#004D40' }}>
                Doctor Channeling Operations Desk
              </h1>
              <p style={{ margin: 0, fontSize: '11px', color: '#78909C' }}>
                Real-time queues, desk check-in verification, and session management
              </p>
            </div>
          </Link>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => {
              fetchData();
              if (selectedDoctorId) fetchSessions(selectedDoctorId);
            }}
            disabled={loading}
            style={{
              padding: '8px 14px',
              borderRadius: '6px',
              border: '1px solid #CFD8DC',
              backgroundColor: '#FFFFFF',
              color: '#00796B',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <div style={{ fontSize: '12px', color: '#455A64' }}>
            Logged in: <strong>{user?.fullName || user?.email}</strong>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ padding: '24px', maxWidth: '1360px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>

        {/* Stats KPIs */}
        {stats && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '14px',
            marginBottom: '20px'
          }}>
            {[
              { label: 'TOTAL BOOKINGS', value: stats.totalAppointments, icon: <Calendar size={18} color="#00796B" />, bg: '#E0F2F1' },
              { label: "TODAY'S QUEUE", value: stats.todayQueueCount, icon: <Activity size={18} color="#0284C7" />, bg: '#E0F2FE' },
              { label: 'CONFIRMED', value: stats.confirmedCount, icon: <CheckCircle2 size={18} color="#15803D" />, bg: '#DCFCE7' },
              { label: 'COMPLETED', value: stats.completedCount, icon: <CheckCircle2 size={18} color="#6B7280" />, bg: '#F3F4F6' },
              { label: 'REVENUE', value: `LKR ${stats.totalRevenue.toLocaleString()}`, icon: <DollarSign size={18} color="#B45309" />, bg: '#FEF3C7' }
            ].map((kpi, idx) => (
              <div key={idx} style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '10px',
                padding: '14px 18px',
                border: '1px solid #E0E0E0',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
              }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '8px',
                  backgroundColor: kpi.bg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {kpi.icon}
                </div>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#78909C' }}>{kpi.label}</div>
                  <div style={{ fontSize: '18px', fontWeight: '900', color: '#1A2B32' }}>{kpi.value}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ─── Channeling Desk Patient Verification & Check-In Station ─── */}
        <div id="channeling-desk-checkin-station" style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          padding: '20px 24px',
          border: '1.5px solid #80CBC4',
          boxShadow: '0 4px 16px rgba(0,77,64,0.08)',
          marginBottom: '22px'
        }}>
          {/* Header & Mode Switcher */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ backgroundColor: '#E0F2F1', padding: '8px', borderRadius: '10px', color: '#00796B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <UserCheck size={22} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#004D40' }}>
                  Channeling Desk Patient Check-In Verification
                </h3>
                <p style={{ margin: 0, fontSize: '12px', color: '#607D8B' }}>
                  Verify patient identity via QR scan or manual search before admitting them to the doctor's live queue.
                </p>
              </div>
            </div>

            {/* Mode Toggle Pills */}
            <div style={{ display: 'flex', backgroundColor: '#F1F5F9', padding: '3px', borderRadius: '8px', gap: '4px' }}>
              <button
                type="button"
                onClick={() => {
                  setDeskMode('scan');
                  setTimeout(() => scannerInputRef.current?.focus(), 100);
                }}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: deskMode === 'scan' ? '#00796B' : 'transparent',
                  color: deskMode === 'scan' ? '#FFFFFF' : '#475569',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s ease'
                }}
              >
                <QrCode size={14} /> 1. QR Scanner
              </button>
              <button
                type="button"
                onClick={() => {
                  setDeskMode('manual');
                  setManualSearchResults([]);
                }}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: deskMode === 'manual' ? '#00796B' : 'transparent',
                  color: deskMode === 'manual' ? '#FFFFFF' : '#475569',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s ease'
                }}
              >
                <Search size={14} /> 2. Can't scan? Manual Search
              </button>
            </div>
          </div>

          {/* Mode 1: QR Scanner Input */}
          {deskMode === 'scan' && (
            <form onSubmit={(e) => { e.preventDefault(); handleQrLookup(); }} style={{ marginBottom: '14px' }}>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 340px', position: 'relative' }}>
                  <input
                    ref={scannerInputRef}
                    type="text"
                    placeholder="Aim scanner at patient QR code or paste QR Token (e.g. 3fa85f64-5717-4562-b3fc-2c963f66afa6)..."
                    value={deskQrInput}
                    onChange={(e) => setDeskQrInput(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      border: '1.5px solid #B2DFDB',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontFamily: 'monospace',
                      backgroundColor: '#FAFCFC',
                      boxSizing: 'border-box',
                      outline: 'none',
                      color: '#004D40'
                    }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLookingUp || !deskQrInput.trim()}
                  style={{
                    padding: '10px 22px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#00796B',
                    color: '#FFFFFF',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: !deskQrInput.trim() ? 'not-allowed' : 'pointer',
                    opacity: !deskQrInput.trim() ? 0.7 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  {isLookingUp ? <RefreshCw size={14} className="spin" /> : <Search size={14} />}
                  Fetch & Verify Details
                </button>
              </div>
              <p style={{ margin: '6px 0 0 2px', fontSize: '11px', color: '#90A4AE' }}>
                Compatible with hardware USB/Bluetooth barcode & QR scanners. Automatic search triggers when scanned.
              </p>
            </form>
          )}

          {/* Mode 2: Manual Search Fallback */}
          {deskMode === 'manual' && (
            <div style={{ marginBottom: '14px' }}>
              <form onSubmit={handleManualSearch} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
                <div style={{ flex: '1 1 340px' }}>
                  <input
                    type="text"
                    placeholder="Search by Patient Name, NIC, Phone, or Appointment # (e.g. APT-202610...)"
                    value={deskManualQuery}
                    onChange={(e) => setDeskManualQuery(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      border: '1.5px solid #CFD8DC',
                      borderRadius: '8px',
                      fontSize: '13px',
                      backgroundColor: '#FFFFFF',
                      boxSizing: 'border-box',
                      outline: 'none'
                    }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSearchingManual || !deskManualQuery.trim()}
                  style={{
                    padding: '10px 22px',
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
                  {isSearchingManual ? <RefreshCw size={14} className="spin" /> : <Search size={14} />}
                  Find Appointment
                </button>
              </form>

              {/* Manual Search Results Dropdown/List */}
              {manualSearchResults.length > 0 && (
                <div style={{
                  backgroundColor: '#F8FAFC',
                  borderRadius: '8px',
                  border: '1px solid #E2E8F0',
                  padding: '10px 14px',
                  maxHeight: '200px',
                  overflowY: 'auto'
                }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748B', marginBottom: '8px' }}>
                    Found {manualSearchResults.length} matching appointment(s):
                  </div>
                  {manualSearchResults.map((m) => (
                    <div
                      key={m.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 10px',
                        borderBottom: '1px solid #F1F5F9',
                        gap: '10px',
                        flexWrap: 'wrap'
                      }}
                    >
                      <div>
                        <span style={{ fontWeight: '800', color: '#1E293B', fontSize: '12px' }}>{m.patientName}</span>
                        <span style={{ fontSize: '11px', color: '#64748B', marginLeft: '6px' }}>(NIC: {m.maskedNic || m.patientNic || 'N/A'})</span>
                        <div style={{ fontSize: '11px', color: '#475569' }}>
                          Ref: <strong>{m.appointmentNumber}</strong> • Dr. {m.doctorName} ({m.specialization}) • {m.appointmentDate} • Token: <strong>{m.queueLabel || `#${String(m.queueNumber).padStart(2, '0')}`}</strong>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSelectManualApt(m)}
                        style={{
                          padding: '5px 12px',
                          borderRadius: '6px',
                          border: '1px solid #00796B',
                          backgroundColor: '#E0F2F1',
                          color: '#004D40',
                          fontSize: '11px',
                          fontWeight: '700',
                          cursor: 'pointer'
                        }}
                      >
                        Select & Verify ➔
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ─── Unified Confirmation Preview Card ─── */}
          {(() => {
            if (!previewApt) return null;

            const todayDateStr = new Date().toISOString().split('T')[0];
            const isWrongDay = previewApt.appointmentDate && previewApt.appointmentDate !== todayDateStr;
            const isAlreadyCheckedIn = Boolean(previewApt.checkedInAt || previewApt.queueStatus === 'Waiting');
            const isCancelled = previewApt.status === 'Cancelled' || previewApt.doctorSession?.sessionStatus === 'Cancelled';
            const isPendingPayment = previewApt.status === 'PendingPayment' ||
              (previewApt.bookingType === 'OnlinePayment' && previewApt.paymentStatus !== 'Completed' && previewApt.paymentStatus !== 'Paid');
            const isSessionInactive = previewApt.doctorSession && (!previewApt.doctorSession.isActive || previewApt.doctorSession.sessionStatus === 'Cancelled');
            const isCheckInBlocked = isWrongDay || isCancelled || isPendingPayment || isSessionInactive || isAlreadyCheckedIn;

            const isReservation = previewApt.bookingType === 'Reservation';
            const isOnlinePaid = previewApt.paymentStatus === 'Completed' || previewApt.paymentStatus === 'Paid';

            return (
              <div style={{
                backgroundColor: isWrongDay ? '#FFFBEB' : '#F0FDFA',
                borderRadius: '10px',
                border: isWrongDay ? '1.5px solid #F59E0B' : (isCheckInBlocked && !isAlreadyCheckedIn ? '1.5px solid #EF4444' : '1.5px solid #00796B'),
                padding: '16px 20px',
                marginTop: '12px',
                boxShadow: '0 2px 10px rgba(0,77,64,0.06)',
                animation: 'fadeIn 0.25s ease'
              }}>
                {/* Card Title & Close */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', borderBottom: '1px solid #CCFBF1', paddingBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 size={18} color={isWrongDay ? '#D97706' : '#00796B'} />
                    <span style={{ fontSize: '14px', fontWeight: '800', color: '#004D40' }}>
                      Patient Verification & Check-In Preview
                    </span>
                    <span style={{
                      backgroundColor: '#CCFBF1',
                      color: '#0F766E',
                      fontSize: '11px',
                      fontWeight: '800',
                      padding: '2px 8px',
                      borderRadius: '12px'
                    }}>
                      {previewApt.appointmentNumber}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleClearPreview}
                    title="Clear & scan next patient"
                    style={{
                      border: 'none',
                      background: 'none',
                      cursor: 'pointer',
                      color: '#64748B',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '11px',
                      fontWeight: '700'
                    }}
                  >
                    <X size={14} /> Clear / Next
                  </button>
                </div>

                {/* ── Blocking State Alert Banners ── */}
                {isWrongDay && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    backgroundColor: '#FEF3C7',
                    border: '1px solid #FDE68A',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    marginBottom: '14px',
                    color: '#92400E',
                    fontSize: '12px',
                    fontWeight: '700'
                  }}>
                    <AlertTriangle size={18} color="#D97706" />
                    <span>
                      ⚠️ WRONG-DAY WARNING: This appointment is scheduled for <strong>{previewApt.appointmentDate}</strong>, which is NOT today ({todayDateStr}). Check-in is blocked.
                    </span>
                  </div>
                )}

                {isCancelled && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    backgroundColor: '#FEE2E2',
                    border: '1px solid #FECACA',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    marginBottom: '14px',
                    color: '#991B1B',
                    fontSize: '12px',
                    fontWeight: '700'
                  }}>
                    <XCircle size={18} color="#DC2626" />
                    <span>
                      ⛔ APPOINTMENT CANCELLED: This appointment was cancelled. Patient cannot be admitted.
                    </span>
                  </div>
                )}

                {isPendingPayment && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    backgroundColor: '#FEF2F2',
                    border: '1px solid #FCA5A5',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    marginBottom: '14px',
                    color: '#B91C1C',
                    fontSize: '12px',
                    fontWeight: '700'
                  }}>
                    <AlertCircle size={18} color="#EF4444" />
                    <span>
                      💳 PAYMENT REQUIRED: Online payment is not settled ({previewApt.paymentStatus}). Please direct patient to billing cashier.
                    </span>
                  </div>
                )}

                {isSessionInactive && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    backgroundColor: '#FEF2F2',
                    border: '1px solid #FCA5A5',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    marginBottom: '14px',
                    color: '#B91C1C',
                    fontSize: '12px',
                    fontWeight: '700'
                  }}>
                    <AlertTriangle size={18} color="#EF4444" />
                    <span>
                      ⚠️ INACTIVE SESSION: The doctor's consultation session for this slot is inactive or cancelled.
                    </span>
                  </div>
                )}

                {/* Grid of Verified Details */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                  gap: '12px 16px',
                  marginBottom: '16px'
                }}>
                  <div>
                    <div style={{ fontSize: '11px', color: '#64748B', fontWeight: '700', textTransform: 'uppercase' }}>Patient Name</div>
                    <div style={{ fontSize: '13px', fontWeight: '800', color: '#0F172A' }}>{previewApt.patientName}</div>
                    <div style={{ fontSize: '11px', color: '#475569' }}>NIC: {previewApt.patientNic || 'N/A'} • {previewApt.patientPhone}</div>
                  </div>

                  <div>
                    <div style={{ fontSize: '11px', color: '#64748B', fontWeight: '700', textTransform: 'uppercase' }}>Consultant Doctor</div>
                    <div style={{ fontSize: '13px', fontWeight: '800', color: '#0F172A' }}>{previewApt.doctorName}</div>
                    <div style={{ fontSize: '11px', color: '#0F766E', fontWeight: '700' }}>{previewApt.specialization}</div>
                  </div>

                  <div>
                    <div style={{ fontSize: '11px', color: '#64748B', fontWeight: '700', textTransform: 'uppercase' }}>Session & Time</div>
                    <div style={{ fontSize: '13px', fontWeight: '800', color: '#0F172A' }}>{previewApt.timeSlot}</div>
                    <div style={{ fontSize: '11px', color: isWrongDay ? '#D97706' : '#475569', fontWeight: isWrongDay ? '700' : '400' }}>
                      {previewApt.appointmentDate} • {previewApt.hospitalBranch || previewApt.hospital}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '11px', color: '#64748B', fontWeight: '700', textTransform: 'uppercase' }}>Session Token</div>
                    <div style={{ fontSize: '18px', fontWeight: '900', color: '#00796B' }}>
                      {previewApt.queueLabel || `Token #${String(previewApt.queueNumber).padStart(2, '0')}`}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748B' }}>
                      Status: <strong style={{ color: '#0F766E' }}>{previewApt.status}</strong>
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '11px', color: '#64748B', fontWeight: '700', textTransform: 'uppercase' }}>Payment Details</div>
                    <div style={{ fontSize: '13px', fontWeight: '800', color: '#0F172A' }}>
                      LKR {previewApt.totalAmount?.toLocaleString()}
                    </div>
                    <div style={{
                      fontSize: '11px',
                      color: isReservation ? '#1D4ED8' : (isOnlinePaid ? '#15803D' : '#B45309'),
                      fontWeight: '700'
                    }}>
                      {isReservation
                        ? 'Reservation (Pay on Arrival)'
                        : (isOnlinePaid ? `Online Paid (${previewApt.paymentMethod || 'Card'})` : 'Payment Pending')}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '11px', color: '#64748B', fontWeight: '700', textTransform: 'uppercase' }}>Arrival & Queue State</div>
                    <div style={{ fontSize: '13px', fontWeight: '800', color: previewApt.queueStatus === 'Waiting' ? '#166534' : '#B45309' }}>
                      Queue: {previewApt.queueStatus || 'Not Checked In'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748B' }}>
                      Arrival: <strong>{previewApt.arrivalStatus || 'Calculated at check-in'}</strong>
                    </div>
                  </div>
                </div>

                {/* Action Bar */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', borderTop: '1px solid #CCFBF1', paddingTop: '12px' }}>
                  {isAlreadyCheckedIn ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#166534', fontSize: '12px', fontWeight: '700' }}>
                      <CheckCircle2 size={18} color="#166534" />
                      <span>
                        ✓ Patient already checked in at {new Date(previewApt.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (Arrival: <strong>{previewApt.arrivalStatus}</strong>). Admitted to waiting queue.
                      </span>
                    </div>
                  ) : (
                    <>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <div style={{ fontSize: '12px', color: '#0F766E', fontWeight: '700' }}>
                          Confirm patient identity before admitting:
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748B' }}>
                          Arrival punctuality is calculated at confirm time • Visible on Doctor dashboard upon refresh
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleConfirmCheckIn}
                        disabled={actionLoading || isCheckInBlocked}
                        style={{
                          padding: '10px 24px',
                          borderRadius: '8px',
                          border: 'none',
                          backgroundColor: isCheckInBlocked ? '#94A3B8' : '#00796B',
                          color: '#FFFFFF',
                          fontSize: '13px',
                          fontWeight: '800',
                          cursor: isCheckInBlocked ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          boxShadow: isCheckInBlocked ? 'none' : '0 2px 8px rgba(0,121,107,0.3)'
                        }}
                      >
                        {actionLoading ? <RefreshCw size={15} className="spin" /> : <UserCheck size={16} />}
                        {isCheckInBlocked ? 'CHECK-IN BLOCKED' : 'CONFIRM CHECK-IN & ADMIT TO QUEUE'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })()}
        </div>

        {/* ─── Doctor Session Workflow Operations ─── */}
        {(() => {
          const todayDateStr = new Date().toISOString().split('T')[0];
          const selectedDoctor = doctorsList.find(d => d.id === selectedDoctorId) || doctorsList[0];
          
          const adminTodaySessions = doctorSessions.filter(s => s.sessionDate === todayDateStr);
          const upcomingSessions = doctorSessions.filter(s => s.sessionDate > todayDateStr && s.sessionStatus !== 'Cancelled');
          const historySessions = doctorSessions.filter(s => (s.sessionDate < todayDateStr && s.sessionDate !== todayDateStr) || s.sessionStatus === 'Completed' || s.sessionStatus === 'Cancelled');
          
          const displayedAdminSessions = sessionFilterTab === 'today' ? adminTodaySessions : sessionFilterTab === 'upcoming' ? upcomingSessions : historySessions;

          const todayBookings = adminTodaySessions.reduce((acc, s) => acc + (s.currentBookings || 0), 0);
          const todayCapacity = adminTodaySessions.reduce((acc, s) => acc + (s.maxPatients || s.maxCapacity || 15), 0);
          const primaryTodaySession = adminTodaySessions.find(s => s.sessionStatus === 'InProgress') ||
                                      adminTodaySessions.find(s => s.sessionStatus === 'Scheduled' || s.sessionStatus === 'Delayed') ||
                                      adminTodaySessions[0];

          return (
            <div style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '14px',
              padding: '20px 24px',
              border: '1px solid #E2E8F0',
              boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
              marginBottom: '22px'
            }}>
              {/* Header & Doctor Selection */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Stethoscope size={20} color="#00796B" />
                  <div>
                    <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#004D40' }}>
                      Consultation Session Management Desk
                    </h3>
                    <p style={{ margin: 0, fontSize: '11px', color: '#64748B' }}>
                      Monitor live doctor clinics, manage delays, and adjust consultation schedules
                    </p>
                  </div>
                </div>

                {/* Doctor Selector */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '12px', color: '#475569', fontWeight: '700' }}>Select Doctor:</span>
                  <select
                    value={selectedDoctorId}
                    onChange={(e) => setSelectedDoctorId(parseInt(e.target.value, 10))}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '8px',
                      border: '1.5px solid #CBD5E1',
                      fontSize: '12px',
                      backgroundColor: '#F8FAFC',
                      fontWeight: '700',
                      color: '#004D40',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    {doctorsList.map(doc => (
                      <option key={doc.id} value={doc.id}>
                        {doc.fullName} ({doc.specialization})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Session Filter Tabs: Today, Upcoming, History */}
              <div style={{
                display: 'flex',
                gap: '8px',
                marginBottom: '16px',
                borderBottom: '1px solid #E2E8F0',
                paddingBottom: '10px',
                flexWrap: 'wrap'
              }}>
                {[
                  { id: 'today', label: `🟢 Today's Sessions (${todayDateStr})`, count: adminTodaySessions.length },
                  { id: 'upcoming', label: `📅 Upcoming Schedule`, count: upcomingSessions.length },
                  { id: 'history', label: `📜 Past / Expired History`, count: historySessions.length }
                ].map(tab => {
                  const isActive = sessionFilterTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setSessionFilterTab(tab.id)}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '8px',
                        border: 'none',
                        backgroundColor: isActive ? '#00796B' : '#F1F5F9',
                        color: isActive ? '#FFFFFF' : '#475569',
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: isActive ? '0 2px 6px rgba(0,121,107,0.25)' : 'none',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <span>{tab.label}</span>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '10px',
                        backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : '#E2E8F0',
                        color: isActive ? '#FFFFFF' : '#64748B',
                        fontSize: '11px',
                        fontWeight: '800'
                      }}>
                        {tab.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Doctor Roster Summary Card */}
              {selectedDoctor && (
                <div style={{
                  backgroundColor: '#F0FDFA',
                  border: '1.5px solid #99F6E4',
                  borderRadius: '12px',
                  padding: '16px 20px',
                  marginBottom: '18px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: '800', color: '#0F766E', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        TODAY'S CLINIC SUMMARY ({todayDateStr})
                      </div>
                      <h4 style={{ margin: '4px 0 2px 0', fontSize: '16px', fontWeight: '800', color: '#134E4A' }}>
                        {selectedDoctor.fullName} <span style={{ fontSize: '13px', fontWeight: '600', color: '#0D9488' }}>({selectedDoctor.specialization})</span>
                      </h4>
                      <div style={{ fontSize: '12px', color: '#475569' }}>
                        Doctor Schedule: <strong>{selectedDoctor.availableDays || 'Mon & Wed'} ({selectedDoctor.availableTime || '08:00 AM – 12:00 PM'})</strong> | Room: <strong>{selectedDoctor.roomNumber || 'Suite 201'}</strong>, {selectedDoctor.hospitalBranch || 'Health Bridge Colombo'}
                      </div>
                    </div>

                    <div style={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #CCFBF1',
                      borderRadius: '8px',
                      padding: '8px 16px',
                      textAlign: 'right'
                    }}>
                      <div style={{ fontSize: '10px', color: '#64748B', fontWeight: '800', textTransform: 'uppercase' }}>
                        TOTAL CAPACITY TODAY
                      </div>
                      <div style={{ fontSize: '16px', fontWeight: '900', color: '#0F766E' }}>
                        {todayBookings} / {todayCapacity > 0 ? todayCapacity : 15} Patients Booked
                      </div>
                    </div>
                  </div>

                  {/* If today has a session, show quick action bar */}
                  {primaryTodaySession && (
                    <div style={{
                      marginTop: '12px',
                      paddingTop: '12px',
                      borderTop: '1px solid #CCFBF1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '10px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '12px', fontWeight: '800', color: '#1E293B' }}>
                          {primaryTodaySession.timeFormatted} Clinic Session
                        </span>
                        <span style={{
                          fontSize: '10px',
                          fontWeight: '800',
                          padding: '2px 8px',
                          borderRadius: '10px',
                          backgroundColor: primaryTodaySession.sessionStatus === 'InProgress' ? '#DCFCE7' : primaryTodaySession.sessionStatus === 'Delayed' ? '#FEF3C7' : '#E0F2FE',
                          color: primaryTodaySession.sessionStatus === 'InProgress' ? '#166534' : primaryTodaySession.sessionStatus === 'Delayed' ? '#B45309' : '#0369A1'
                        }}>
                          {primaryTodaySession.sessionStatus === 'InProgress' ? '🟢 IN PROGRESS' : primaryTodaySession.sessionStatus === 'Delayed' ? '⚠️ DELAYED' : '🔵 ' + primaryTodaySession.sessionStatus.toUpperCase()}
                        </span>
                        <span style={{ fontSize: '11px', color: '#64748B' }}>
                          Serving: <strong>#{String(primaryTodaySession.currentlyServingQueueNumber || 0).padStart(2, '0')}</strong> • Booked: <strong>{primaryTodaySession.currentBookings}/{primaryTodaySession.maxPatients || primaryTodaySession.maxCapacity || 15}</strong>
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        {(primaryTodaySession.sessionStatus === 'Scheduled' || primaryTodaySession.sessionStatus === 'Delayed' || primaryTodaySession.sessionStatus === 'Expired') && (
                          <button
                            type="button"
                            onClick={() => handleStartSession(primaryTodaySession.id)}
                            disabled={actionLoading}
                            style={{
                              padding: '6px 14px',
                              borderRadius: '6px',
                              border: 'none',
                              backgroundColor: '#00796B',
                              color: '#FFFFFF',
                              fontSize: '11px',
                              fontWeight: '700',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                          >
                            <Play size={13} /> Start Clinic
                          </button>
                        )}

                        {primaryTodaySession.sessionStatus !== 'Completed' && primaryTodaySession.sessionStatus !== 'Cancelled' && (
                          <>
                            <button
                              type="button"
                              onClick={() => setDelayModalSession(primaryTodaySession)}
                              disabled={actionLoading}
                              style={{
                                padding: '6px 12px',
                                borderRadius: '6px',
                                border: '1px solid #F59E0B',
                                backgroundColor: '#FEF3C7',
                                color: '#B45309',
                                fontSize: '11px',
                                fontWeight: '700',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px'
                              }}
                            >
                              <AlertTriangle size={13} /> Mark Delay
                            </button>

                            <button
                              type="button"
                              onClick={() => setCancelModalSession(primaryTodaySession)}
                              disabled={actionLoading}
                              style={{
                                padding: '6px 12px',
                                borderRadius: '6px',
                                border: '1px solid #FCA5A5',
                                backgroundColor: '#FEF2F2',
                                color: '#B91C1C',
                                fontSize: '11px',
                                fontWeight: '700',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px'
                              }}
                            >
                              <XCircle size={13} /> Cancel Session
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Slot Cards List — flat grid for Today, accordion grouped-by-date for Upcoming / History */}
              {loadingSessions ? (
                <div style={{ textAlign: 'center', padding: '30px', color: '#00796B', fontSize: '12px' }}>
                  <RefreshCw size={20} className="animate-spin" style={{ margin: '0 auto 8px auto' }} />
                  Loading consultant sessions...
                </div>
              ) : displayedAdminSessions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px', backgroundColor: '#F8FAFC', borderRadius: '10px', border: '1px dashed #CBD5E1', color: '#78909C', fontSize: '13px' }}>
                  No {sessionFilterTab} consultation sessions found for this doctor.
                </div>
              ) : sessionFilterTab === 'today' ? (
                /* TODAY — keep flat card grid */
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px' }}>
                  {displayedAdminSessions.map(session => {
                    const isScheduled = session.sessionStatus === 'Scheduled';
                    const isInProgress = session.sessionStatus === 'InProgress';
                    const isDelayed = session.sessionStatus === 'Delayed';
                    const isCompleted = session.sessionStatus === 'Completed';
                    const isCancelled = session.sessionStatus === 'Cancelled';
                    const statusBadgeBg = isScheduled ? '#E0F2FE' : isInProgress ? '#DCFCE7' : isDelayed ? '#FEF3C7' : isCompleted ? '#F3F4F6' : '#FEE2E2';
                    const statusBadgeColor = isScheduled ? '#0369A1' : isInProgress ? '#15803D' : isDelayed ? '#B45309' : isCompleted ? '#475569' : '#B91C1C';
                    return (
                      <div key={session.id} style={{ border: isInProgress ? '2px solid #10B981' : isDelayed ? '1.5px solid #F59E0B' : '1px solid #E2E8F0', borderRadius: '10px', padding: '14px 16px', backgroundColor: isInProgress ? '#F0FDF4' : '#F8FAFC' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <div style={{ fontSize: '13px', fontWeight: '800', color: '#1E293B' }}>
                            TODAY • {session.sessionType ? `${session.sessionType === 'Morning' ? '🌅 Morning' : session.sessionType === 'Evening' ? '🌇 Evening' : '🌙 Night'} Session` : ''} ({session.timeRange || session.timeFormatted})
                          </div>
                          <span style={{ backgroundColor: statusBadgeBg, color: statusBadgeColor, fontSize: '10px', fontWeight: '800', padding: '2px 8px', borderRadius: '10px' }}>{session.sessionStatus}</span>
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748B', marginBottom: '8px' }}>
                          Room: <strong>{session.roomNumber || selectedDoctor?.roomNumber || 'Suite 201'}</strong> • Bookings: <strong>{session.currentBookings}/{session.maxPatients || session.maxCapacity || 15}</strong> • Serving: <strong>#{String(session.currentlyServingQueueNumber || 0).padStart(2, '0')}</strong>
                        </div>
                        {isDelayed && <div style={{ fontSize: '11px', color: '#B45309', marginBottom: '8px', backgroundColor: '#FEF9C3', padding: '4px 8px', borderRadius: '4px' }}>Delay: {session.expectedStartTime ? `Expected at ${session.expectedStartTime}` : ''} ({session.delayReason || 'Doctor running late'})</div>}
                        <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                          {(isScheduled || isDelayed || session.sessionStatus === 'Expired') && <button type="button" onClick={() => handleStartSession(session.id)} disabled={actionLoading} style={{ padding: '5px 10px', borderRadius: '6px', border: 'none', backgroundColor: '#00796B', color: '#FFFFFF', fontSize: '11px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}><Play size={12} /> Start</button>}
                          {!isCompleted && !isCancelled && (<><button type="button" onClick={() => setDelayModalSession(session)} disabled={actionLoading} style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid #F59E0B', backgroundColor: '#FEF3C7', color: '#B45309', fontSize: '11px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}><AlertTriangle size={12} /> Delay</button><button type="button" onClick={() => setCancelModalSession(session)} disabled={actionLoading} style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid #FCA5A5', backgroundColor: '#FEF2F2', color: '#B91C1C', fontSize: '11px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}><XCircle size={12} /> Cancel</button></>)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (() => {
                /* UPCOMING / HISTORY — group by date, render accordion rows */
                const grouped = displayedAdminSessions.reduce((acc, s) => {
                  const d = s.sessionDate;
                  if (!acc[d]) acc[d] = [];
                  acc[d].push(s);
                  return acc;
                }, {});
                const sortedDates = Object.keys(grouped).sort();
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {sortedDates.map(dateStr => {
                      const slots = grouped[dateStr];
                      const isOpen = expandedDates[dateStr] || false;
                      const totalBooked = slots.reduce((s, x) => s + (x.currentBookings || 0), 0);
                      const totalSlots = slots.length;
                      const hasActiveSlot = slots.some(s => s.sessionStatus === 'InProgress' || s.sessionStatus === 'Delayed');
                      return (
                        <div key={dateStr} style={{ border: hasActiveSlot ? '1.5px solid #10B981' : '1px solid #E2E8F0', borderRadius: '12px', overflow: 'hidden', backgroundColor: '#FFFFFF' }}>
                          {/* Accordion Header Row */}
                          <button
                            type="button"
                            onClick={() => toggleDateExpanded(dateStr)}
                            style={{ width: '100%', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: hasActiveSlot ? 'linear-gradient(90deg,#F0FDF4,#ECFDF5)' : '#F8FAFC', border: 'none', cursor: 'pointer', textAlign: 'left', gap: '12px' }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                              <CalendarDays size={18} color={hasActiveSlot ? '#10B981' : '#64748B'} />
                              <div>
                                <div style={{ fontSize: '13px', fontWeight: '800', color: '#1E293B' }}>🗓️ {formatFriendlyDate(dateStr)}</div>
                                <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                                  <span style={{ marginRight: '12px' }}>{totalBooked > 0 ? `${totalBooked} Patient${totalBooked > 1 ? 's' : ''} Booked` : 'No Bookings Yet'}</span>
                                  <span>{totalSlots} Time Slot{totalSlots > 1 ? 's' : ''} Available</span>
                                </div>
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              {totalBooked > 0 && (
                                <span style={{ backgroundColor: '#DCFCE7', color: '#166534', fontSize: '11px', fontWeight: '800', padding: '2px 10px', borderRadius: '12px' }}>
                                  {totalBooked} Booked
                                </span>
                              )}
                              {hasActiveSlot && (
                                <span style={{ backgroundColor: '#DCFCE7', color: '#166534', fontSize: '10px', fontWeight: '800', padding: '2px 8px', borderRadius: '10px' }}>● ACTIVE</span>
                              )}
                              <span style={{ display: 'flex', alignItems: 'center', color: '#475569' }}>
                                {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                              </span>
                            </div>
                          </button>

                          {/* Expanded Slot List */}
                          {isOpen && (
                            <div style={{ borderTop: '1px solid #E2E8F0', padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: '#FFFFFF' }}>
                              {slots.map(session => {
                                const isScheduled = session.sessionStatus === 'Scheduled';
                                const isInProgress = session.sessionStatus === 'InProgress';
                                const isDelayed = session.sessionStatus === 'Delayed';
                                const isCompleted = session.sessionStatus === 'Completed';
                                const isCancelled = session.sessionStatus === 'Cancelled';
                                const statusBadgeBg = isScheduled ? '#E0F2FE' : isInProgress ? '#DCFCE7' : isDelayed ? '#FEF3C7' : isCompleted ? '#F3F4F6' : '#FEE2E2';
                                const statusBadgeColor = isScheduled ? '#0369A1' : isInProgress ? '#15803D' : isDelayed ? '#B45309' : isCompleted ? '#475569' : '#B91C1C';
                                return (
                                  <div key={session.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '8px', backgroundColor: isInProgress ? '#F0FDF4' : isDelayed ? '#FFFBEB' : '#F8FAFC', border: isInProgress ? '1.5px solid #10B981' : isDelayed ? '1px solid #FCD34D' : '1px solid #E2E8F0', flexWrap: 'wrap', gap: '10px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                      <span style={{ fontSize: '13px', fontWeight: '800', color: '#1E293B', minWidth: '72px' }}>
                                        └─► {session.sessionType ? `${session.sessionType === 'Morning' ? '🌅 Morning' : session.sessionType === 'Evening' ? '🌇 Evening' : '🌙 Night'} Session • ` : ''}{session.timeRange || session.timeFormatted}
                                      </span>
                                      <span style={{ backgroundColor: statusBadgeBg, color: statusBadgeColor, fontSize: '10px', fontWeight: '800', padding: '2px 8px', borderRadius: '8px' }}>{session.sessionStatus}</span>
                                      <span style={{ fontSize: '11px', color: '#64748B' }}>
                                        <strong>{session.currentBookings || 0}/{session.maxPatients || session.maxCapacity || 15}</strong> Booked • Room: <strong>{session.roomNumber || selectedDoctor?.roomNumber || 'Suite 201'}</strong>
                                      </span>
                                      {isDelayed && <span style={{ fontSize: '11px', color: '#B45309', fontStyle: 'italic' }}>⚠ {session.delayReason || 'Delayed'}</span>}
                                    </div>
                                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                      {(isScheduled || isDelayed || session.sessionStatus === 'Expired') && <button type="button" onClick={() => handleStartSession(session.id)} disabled={actionLoading} style={{ padding: '4px 10px', borderRadius: '5px', border: 'none', backgroundColor: '#00796B', color: '#FFFFFF', fontSize: '11px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}><Play size={11} /> Start</button>}
                                      {!isCompleted && !isCancelled && (<><button type="button" onClick={() => setDelayModalSession(session)} disabled={actionLoading} style={{ padding: '4px 10px', borderRadius: '5px', border: '1px solid #F59E0B', backgroundColor: '#FEF3C7', color: '#B45309', fontSize: '11px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}><AlertTriangle size={11} /> Delay</button><button type="button" onClick={() => setCancelModalSession(session)} disabled={actionLoading} style={{ padding: '4px 10px', borderRadius: '5px', border: '1px solid #FCA5A5', backgroundColor: '#FEF2F2', color: '#B91C1C', fontSize: '11px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}><XCircle size={11} /> Cancel</button></>)}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()
              }
            </div>
          );
        })()}

        {/* ─── Master Appointments Table ─── */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 2px 10px rgba(0,0,0,0.04)', overflow: 'hidden' }}>

          {/* Table Header & Controls */}
          <div style={{ padding: '18px 22px', borderBottom: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#004D40' }}>Master Channeling Appointments</h3>
                <p style={{ margin: 0, fontSize: '11px', color: '#64748B' }}>Search and manage all patient bookings across sessions • Manual refresh</p>
              </div>
              {/* Search & Manual Refresh */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '8px' }}>
                  <div style={{ position: 'relative' }}>
                    <Search size={15} color="#90A4AE" style={{ position: 'absolute', left: '10px', top: '9px' }} />
                    <input
                      type="text"
                      placeholder="Search patient, NIC, ref..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      style={{ padding: '8px 12px 8px 32px', border: '1.5px solid #CBD5E1', borderRadius: '8px', fontSize: '12px', width: '220px', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                  <button type="submit" style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', backgroundColor: '#00796B', color: '#FFFFFF', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>Search</button>
                </form>
                <button
                  type="button"
                  onClick={fetchData}
                  disabled={loading}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: '1.5px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    color: '#00796B',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                  title="Manually reload table data"
                >
                  <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                  Refresh
                </button>
              </div>
            </div>

            {/* Date Range Toggle */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap' }}>
              {[
                { id: 'today', label: '📅 Today Only' },
                { id: 'week', label: '⏩ Next 7 Days' },
                { id: 'all', label: '🌐 All Dates' }
              ].map(opt => {
                const isAct = tableDateFilter === opt.id;
                return (
                  <button key={opt.id} type="button"
                    onClick={() => setTableDateFilter(opt.id)}
                    style={{ padding: '6px 14px', borderRadius: '7px', border: isAct ? 'none' : '1.5px solid #CBD5E1', backgroundColor: isAct ? '#0F766E' : '#FFFFFF', color: isAct ? '#FFFFFF' : '#475569', fontSize: '12px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.14s' }}>
                    {opt.label}
                  </button>
                );
              })}
            </div>

            {/* Status Tab Pills */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {[
                { id: 'ALL', label: 'ALL', color: '#475569', bg: '#F1F5F9' },
                { id: 'AwaitingCheckIn', label: '⚪ Awaiting Check-In', color: '#64748B', bg: '#F1F5F9' },
                { id: 'Waiting', label: '🟢 Checked-In / Waiting', color: '#15803D', bg: '#DCFCE7' },
                { id: 'InProgress', label: '🟡 In Consultation', color: '#854D0E', bg: '#FEF08A' },
                { id: 'Completed', label: '🔵 Completed', color: '#0369A1', bg: '#E0F2FE' }
              ].map(opt => {
                const isAct = tableStatusTab === opt.id;
                return (
                  <button key={opt.id} type="button"
                    onClick={() => setTableStatusTab(opt.id)}
                    style={{ padding: '5px 13px', borderRadius: '20px', border: isAct ? 'none' : '1.5px solid #E2E8F0', backgroundColor: isAct ? opt.bg : '#FFFFFF', color: isAct ? opt.color : '#64748B', fontSize: '11px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.14s', boxShadow: isAct ? '0 1px 4px rgba(0,0,0,0.08)' : 'none' }}>
                    {opt.label}
                  </button>
                );
              })}
            </div>

            {/* Active Duplicate Filter Banner */}
            {duplicateFilterKey && (
              <div style={{
                marginTop: '12px',
                backgroundColor: '#FEF3C7',
                border: '1px solid #F59E0B',
                borderRadius: '8px',
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '10px',
                flexWrap: 'wrap'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#92400E' }}>
                  <AlertTriangle size={16} color="#D97706" />
                  <span>
                    <strong>Duplicate Bookings Filter Active:</strong> Showing active bookings for this patient &amp; doctor on this date.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setDuplicateFilterKey(null)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    border: '1px solid #D97706',
                    backgroundColor: '#FFFFFF',
                    color: '#92400E',
                    fontSize: '11px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Clear Filter ✕
                </button>
              </div>
            )}
          </div>

          {/* Scrollable Table Body */}
          <div style={{ overflowX: 'auto', maxHeight: '520px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left', minWidth: '960px' }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569', fontSize: '11px', textTransform: 'uppercase' }}>
                  <th style={{ padding: '11px 14px' }}>Queue #</th>
                  <th style={{ padding: '11px 14px' }}>Ref / Date</th>
                  <th style={{ padding: '11px 14px' }}>Doctor</th>
                  <th style={{ padding: '11px 14px' }}>Patient</th>
                  <th style={{ padding: '11px 14px' }}>Booking & Pay</th>
                  <th style={{ padding: '11px 14px' }}>Arrival</th>
                  <th style={{ padding: '11px 14px' }}>Queue Status</th>
                  <th style={{ padding: '11px 14px' }}>Appt Status</th>
                  <th style={{ padding: '11px 14px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const todayStr2 = new Date().toISOString().split('T')[0];
                  const weekLater = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

                  let filtered = appointments;

                  // Date filter
                  if (tableDateFilter === 'today') {
                    filtered = filtered.filter(a => a.appointmentDate === todayStr2);
                  } else if (tableDateFilter === 'week') {
                    filtered = filtered.filter(a => a.appointmentDate >= todayStr2 && a.appointmentDate <= weekLater);
                  }

                  // Status tab filter
                  if (tableStatusTab === 'AwaitingCheckIn') {
                    filtered = filtered.filter(a => !a.checkedInAt && a.queueStatus !== 'Waiting' && a.queueStatus !== 'InConsultation' && a.status !== 'Completed' && a.status !== 'Cancelled' && a.status !== 'NoShow');
                  } else if (tableStatusTab === 'Waiting') {
                    filtered = filtered.filter(a => a.queueStatus === 'Waiting' || (a.checkedInAt && a.status !== 'Completed' && a.queueStatus !== 'InConsultation'));
                  } else if (tableStatusTab === 'InProgress') {
                    filtered = filtered.filter(a => a.queueStatus === 'InConsultation' || a.status === 'InProgress');
                  } else if (tableStatusTab === 'Completed') {
                    filtered = filtered.filter(a => a.status === 'Completed' || a.queueStatus === 'Completed');
                  }

                  // Duplicate bookings filter
                  if (duplicateFilterKey) {
                    filtered = filtered.filter(a => a.status !== 'Cancelled' && getDuplicateKey(a) === duplicateFilterKey);
                  }

                  // Deterministic chronological sort:
                  // Primary key: session date + time ascending
                  // Secondary key: queue number within the same session
                  filtered = [...filtered].sort((a, b) => {
                    const dateComp = (a.appointmentDate || '').localeCompare(b.appointmentDate || '');
                    if (dateComp !== 0) return dateComp;

                    const parseTime = (t) => {
                      if (!t) return 0;
                      const match = t.match(/(\d+):(\d+)\s*(AM|PM)?/i);
                      if (!match) return 0;
                      let hours = parseInt(match[1], 10);
                      const mins = parseInt(match[2], 10);
                      const ampm = match[3]?.toUpperCase();
                      if (ampm === 'PM' && hours < 12) hours += 12;
                      if (ampm === 'AM' && hours === 12) hours = 0;
                      return hours * 60 + mins;
                    };

                    const timeComp = parseTime(a.timeSlot) - parseTime(b.timeSlot);
                    if (timeComp !== 0) return timeComp;

                    return (a.queueNumber || 0) - (b.queueNumber || 0);
                  });

                  if (loading) return (
                    <tr><td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: '#78909C' }}><RefreshCw size={22} className="animate-spin" style={{ margin: '0 auto 8px auto' }} /><br />Loading operations queue...</td></tr>
                  );
                  if (filtered.length === 0) return (
                    <tr><td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: '#78909C' }}>No appointments matching the selected filters.</td></tr>
                  );

                  return filtered.map(apt => {
                    const isReserved = apt.status === 'Reserved';
                    const isConfirmed = apt.status === 'Confirmed';
                    const isInProgress = apt.status === 'InProgress';
                    const isCompleted = apt.status === 'Completed';
                    const isCancelled = apt.status === 'Cancelled' || apt.status === 'NoShow';
                    const isCheckedIn = Boolean(apt.checkedInAt || apt.queueStatus === 'Waiting');

                    const badgeBg = isReserved ? '#FEF3C7' : isConfirmed ? '#DCFCE7' : isInProgress ? '#FFEDD5' : isCompleted ? '#E0F2FE' : '#FEE2E2';
                    const badgeColor = isReserved ? '#B45309' : isConfirmed ? '#15803D' : isInProgress ? '#C2410C' : isCompleted ? '#0369A1' : '#B91C1C';
                    const arrivalBg = apt.arrivalStatus === 'OnTime' ? '#DCFCE7' : apt.arrivalStatus === 'Early' ? '#DBEAFE' : apt.arrivalStatus === 'Late' ? '#FEE2E2' : '#F1F5F9';
                    const arrivalColor = apt.arrivalStatus === 'OnTime' ? '#166534' : apt.arrivalStatus === 'Early' ? '#1E40AF' : apt.arrivalStatus === 'Late' ? '#991B1B' : '#64748B';
                    const queueBg = apt.queueStatus === 'InConsultation' ? '#FEF08A' : apt.queueStatus === 'Waiting' ? '#E0F2FE' : apt.queueStatus === 'Completed' ? '#DCFCE7' : '#F1F5F9';
                    const queueColor = apt.queueStatus === 'InConsultation' ? '#854D0E' : apt.queueStatus === 'Waiting' ? '#0369A1' : apt.queueStatus === 'Completed' ? '#166534' : '#64748B';

                    const dupCount = duplicateMap.get(getDuplicateKey(apt)) || 0;
                    const isFilteredDup = duplicateFilterKey === getDuplicateKey(apt);

                    return (
                      <tr key={apt.id} style={{ borderBottom: '1px solid #F1F5F9', backgroundColor: isInProgress ? '#FEFCE8' : isCheckedIn ? '#F0FDFA' : '#FFFFFF' }}>
                        <td style={{ padding: '11px 14px' }}>
                          <span style={{ backgroundColor: '#E0F2F1', color: '#004D40', padding: '3px 8px', borderRadius: '6px', fontWeight: '800', fontSize: '12px' }}>
                            {apt.queueLabel || `#${String(apt.queueNumber).padStart(2, '0')}`}
                          </span>
                        </td>
                        <td style={{ padding: '11px 14px' }}>
                          <div style={{ fontWeight: '700', color: '#1E293B', fontSize: '12px' }}>{apt.appointmentNumber}</div>
                          <div style={{ fontSize: '11px', color: '#64748B' }}>{apt.appointmentDate} • {apt.timeSlot}</div>
                        </td>
                        <td style={{ padding: '11px 14px' }}>
                          <div style={{ fontWeight: '700', color: '#004D40', fontSize: '12px' }}>{apt.doctorName}</div>
                          <div style={{ fontSize: '11px', color: '#64748B' }}>{apt.specialization}</div>
                        </td>
                        <td style={{ padding: '11px 14px' }}>
                          <div style={{ fontWeight: '700', color: '#1E293B', fontSize: '12px' }}>{apt.patientName}</div>
                          <div style={{ fontSize: '11px', color: '#64748B' }}>NIC: {apt.patientNic} | {apt.patientPhone}</div>
                          {dupCount > 1 && apt.status !== 'Cancelled' && (
                            <button
                              type="button"
                              onClick={() => setDuplicateFilterKey(isFilteredDup ? null : getDuplicateKey(apt))}
                              title="Click to filter to this patient's duplicate bookings with this doctor today"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                marginTop: '4px',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                backgroundColor: isFilteredDup ? '#D97706' : '#FEF3C7',
                                border: '1px solid #F59E0B',
                                color: isFilteredDup ? '#FFFFFF' : '#92400E',
                                fontSize: '10px',
                                fontWeight: '800',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <AlertTriangle size={11} />
                              <span>{dupCount} active bookings today</span>
                            </button>
                          )}
                          {apt.statusChangeReason && (
                            <div style={{ fontSize: '10px', color: '#64748B', fontStyle: 'italic', marginTop: '3px' }} title={`Status Override Reason: ${apt.statusChangeReason}`}>
                              Override: "{apt.statusChangeReason.length > 28 ? apt.statusChangeReason.slice(0, 28) + '...' : apt.statusChangeReason}"
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '11px 14px' }}>
                          <div style={{ fontWeight: '700', color: '#004D40', fontSize: '12px' }}>LKR {apt.totalAmount?.toLocaleString()}</div>
                          <span style={{ fontSize: '10px', fontWeight: '800', padding: '1px 6px', borderRadius: '4px', backgroundColor: apt.bookingType === 'Reservation' ? '#FEF9C3' : '#E0F2FE', color: apt.bookingType === 'Reservation' ? '#854D0E' : '#0369A1' }}>
                            {apt.bookingType || 'Online'} • {apt.paymentStatus}
                          </span>
                        </td>
                        <td style={{ padding: '11px 14px' }}>
                          <span style={{ backgroundColor: arrivalBg, color: arrivalColor, fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '10px' }}>{apt.arrivalStatus || 'Pending'}</span>
                        </td>
                        <td style={{ padding: '11px 14px' }}>
                          <span style={{ backgroundColor: queueBg, color: queueColor, fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '10px' }}>{apt.queueStatus || 'NotCheckedIn'}</span>
                        </td>
                        <td style={{ padding: '11px 14px' }}>
                          <span style={{ backgroundColor: badgeBg, color: badgeColor, fontSize: '11px', fontWeight: '800', padding: '3px 8px', borderRadius: '12px' }}>{apt.status}</span>
                        </td>
                        <td style={{ padding: '11px 14px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '5px', justifyContent: 'flex-end', alignItems: 'center' }}>
                            {/* 1. [ QR ] */}
                            <button
                              type="button"
                              onClick={() => setSelectedQrApt(apt)}
                              title="Verify QR"
                              style={{
                                padding: '5px 7px',
                                borderRadius: '5px',
                                border: '1px solid #CFD8DC',
                                backgroundColor: '#FFFFFF',
                                cursor: 'pointer',
                                color: '#00796B',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px'
                              }}
                            >
                              <QrCode size={13} />
                            </button>

                            {/* 2. [ Find in Check-In ] */}
                            <button
                              type="button"
                              onClick={() => handleFindInCheckIn(apt)}
                              title="Find and preview at Check-In Desk"
                              style={{
                                padding: '4px 8px',
                                borderRadius: '5px',
                                border: '1px solid #00796B',
                                backgroundColor: '#E0F2F1',
                                color: '#004D40',
                                fontSize: '11px',
                                fontWeight: '700',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              <Search size={12} /> Find in Check-In
                            </button>

                            {/* 3. [ No-Show (gated) ] */}
                            {(() => {
                              const isTerminal = apt.status === 'Completed' || apt.status === 'Cancelled' || apt.status === 'NoShow' || apt.queueStatus === 'Completed' || apt.queueStatus === 'NoShow';
                              if (isTerminal) return null;

                              const isCalled = apt.queueStatus === 'Called';
                              const isSessionPassed = (apt.doctorSession?.currentlyServingQueueNumber && apt.doctorSession.currentlyServingQueueNumber > apt.queueNumber) || apt.doctorSession?.sessionStatus === 'Completed';
                              const canMarkNoShow = isCalled || isSessionPassed;

                              return (
                                <button
                                  type="button"
                                  onClick={() => canMarkNoShow && handleStatusChange(apt.id, 'NoShow')}
                                  disabled={!canMarkNoShow || actionLoading}
                                  title={canMarkNoShow ? 'Mark appointment as No-Show' : 'Available once patient has been called'}
                                  style={{
                                    padding: '4px 8px',
                                    borderRadius: '5px',
                                    border: canMarkNoShow ? '1px solid #FCA5A5' : '1px solid #E2E8F0',
                                    backgroundColor: canMarkNoShow ? '#FEF2F2' : '#F8FAFC',
                                    color: canMarkNoShow ? '#B91C1C' : '#94A3B8',
                                    fontSize: '11px',
                                    fontWeight: '700',
                                    cursor: canMarkNoShow && !actionLoading ? 'pointer' : 'not-allowed',
                                    opacity: canMarkNoShow ? 1 : 0.65,
                                    whiteSpace: 'nowrap'
                                  }}
                                >
                                  No-Show
                                </button>
                              );
                            })()}

                            {/* 4. [ Force Status ] */}
                            <button
                              type="button"
                              onClick={() => {
                                setForceStatusModalApt(apt);
                                setForceStatusTarget(apt.status || 'Confirmed');
                                setForceStatusReason('');
                                setForceStatusError('');
                              }}
                              title="Administrative Status Override"
                              style={{
                                padding: '4px 8px',
                                borderRadius: '5px',
                                border: '1px solid #B2DFDB',
                                backgroundColor: '#FFFFFF',
                                color: '#004D40',
                                fontSize: '11px',
                                fontWeight: '700',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              <ShieldAlert size={12} color="#00796B" /> Force Status
                            </button>

                            {/* 5. [ ⋯ → Delete (confirm required) ] */}
                            <div style={{ position: 'relative' }}>
                              <button
                                type="button"
                                onClick={() => setOpenOverflowRowId(openOverflowRowId === apt.id ? null : apt.id)}
                                style={{
                                  padding: '4px 7px',
                                  borderRadius: '5px',
                                  border: '1px solid #CBD5E1',
                                  backgroundColor: openOverflowRowId === apt.id ? '#F1F5F9' : '#FFFFFF',
                                  cursor: 'pointer',
                                  color: '#475569',
                                  fontSize: '13px',
                                  fontWeight: '900',
                                  lineHeight: '1'
                                }}
                                title="More actions"
                              >
                                ⋯
                              </button>

                              {openOverflowRowId === apt.id && (
                                <div style={{
                                  position: 'absolute',
                                  right: 0,
                                  top: '100%',
                                  marginTop: '4px',
                                  backgroundColor: '#FFFFFF',
                                  borderRadius: '8px',
                                  border: '1px solid #E2E8F0',
                                  boxShadow: '0 6px 18px rgba(0,0,0,0.12)',
                                  zIndex: 50,
                                  minWidth: '150px',
                                  overflow: 'hidden'
                                }}>
                                  {isInProgress && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenOverflowRowId(null);
                                        handleStatusChange(apt.id, 'Completed');
                                      }}
                                      style={{
                                        width: '100%',
                                        padding: '8px 12px',
                                        border: 'none',
                                        background: 'none',
                                        textAlign: 'left',
                                        fontSize: '12px',
                                        fontWeight: '600',
                                        color: '#15803D',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px'
                                      }}
                                    >
                                      <CheckCircle2 size={13} /> Complete
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenOverflowRowId(null);
                                      setDeleteModalApt(apt);
                                    }}
                                    style={{
                                      width: '100%',
                                      padding: '8px 12px',
                                      border: 'none',
                                      background: 'none',
                                      textAlign: 'left',
                                      fontSize: '12px',
                                      fontWeight: '600',
                                      color: '#DC2626',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '8px'
                                    }}
                                  >
                                    <Trash2 size={13} /> Delete Record
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Desk QR Verification Modal */}
      {selectedQrApt && (
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
              onClick={() => setSelectedQrApt(null)}
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
              Channeling Desk QR Verify
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: '#78909C' }}>
              Ref: {selectedQrApt.appointmentNumber} • Token: <strong>{selectedQrApt.queueLabel || `#${String(selectedQrApt.queueNumber).padStart(2, '0')}`}</strong>
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
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(selectedQrApt.qrToken || selectedQrApt.qrCodeText || selectedQrApt.appointmentNumber)}`}
                alt="Appointment QR"
                style={{ width: '180px', height: '180px', display: 'block' }}
              />
            </div>

            <div style={{ fontSize: '12px', color: '#37474F', marginBottom: '16px' }}>
              Patient: <strong>{selectedQrApt.patientName}</strong> (NIC: {selectedQrApt.patientNic})<br />
              Doctor: {selectedQrApt.doctorName} ({selectedQrApt.specialization})<br />
              Token: <code style={{ fontSize: '10px', backgroundColor: '#F1F5F9', padding: '2px 4px' }}>{selectedQrApt.qrToken || 'N/A'}</code>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={async () => {
                  try {
                    setActionLoading(true);
                    const res = await checkInAppointment(selectedQrApt.id, selectedQrApt.qrToken);
                    showToast(`Patient ${res.data.patientName} checked in! Arrival: ${res.data.arrivalStatus}`, 'success');
                    setPreviewApt(res.data);
                    setSelectedQrApt(null);
                    fetchData();
                  } catch (err) {
                    showToast(err.response?.data?.message || 'Check-in failed', 'error');
                  } finally {
                    setActionLoading(false);
                  }
                }}
                disabled={actionLoading}
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
                Confirm Check-In
              </button>
              <button
                onClick={() => setSelectedQrApt(null)}
                style={{
                  padding: '9px 14px',
                  borderRadius: '8px',
                  border: '1px solid #CFD8DC',
                  backgroundColor: '#FFFFFF',
                  color: '#475569',
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

      {/* Delay Session Modal */}
      {delayModalSession && (
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
            maxWidth: '420px',
            width: '100%',
            position: 'relative'
          }}>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: '800', color: '#004D40' }}>
              Mark Session as Delayed
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: '#64748B' }}>
              Session: {delayModalSession.sessionDate} • {delayModalSession.timeFormatted}
            </p>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                EXPECTED START TIME *
              </label>
              <input
                type="text"
                placeholder="e.g. 10:45 AM or 11:00"
                value={delayExpectedTime}
                onChange={(e) => setDelayExpectedTime(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                REASON FOR DELAY
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Doctor is completing an emergency surgery round..."
                value={delayReason}
                onChange={(e) => setDelayReason(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setDelayModalSession(null)}
                style={{ padding: '8px 14px', borderRadius: '6px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', color: '#64748B', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleDelaySession}
                disabled={actionLoading}
                style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', backgroundColor: '#D97706', color: '#FFFFFF', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
              >
                Confirm Delay & Notify
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Session Modal */}
      {cancelModalSession && (
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
            maxWidth: '420px',
            width: '100%',
            position: 'relative'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#DC2626', marginBottom: '8px' }}>
              <ShieldAlert size={22} />
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800' }}>
                Cancel Doctor Session
              </h3>
            </div>
            <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: '#64748B', lineHeight: '1.5' }}>
              <strong>Warning:</strong> Cancelling this session will automatically cancel all <strong>{cancelModalSession.currentBookings}</strong> booked patient appointments and dispatch cancellation emails.
            </p>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                REASON FOR CANCELLATION
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Doctor is on emergency hospital leave..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setCancelModalSession(null)}
                style={{ padding: '8px 14px', borderRadius: '6px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', color: '#64748B', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
              >
                Back
              </button>
              <button
                onClick={handleCancelSession}
                disabled={actionLoading}
                style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', backgroundColor: '#DC2626', color: '#FFFFFF', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
              >
                Confirm Cancel Session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Force Status Override Modal */}
      {forceStatusModalApt && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.55)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            padding: '26px',
            maxWidth: '460px',
            width: '100%',
            position: 'relative',
            boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
          }}>
            <button
              type="button"
              onClick={() => setForceStatusModalApt(null)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                border: 'none',
                background: 'none',
                cursor: 'pointer'
              }}
            >
              <X size={20} color="#78909C" />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#00796B', marginBottom: '8px' }}>
              <ShieldAlert size={22} color="#00796B" />
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '800' }}>
                Force Status Override
              </h3>
            </div>
            <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: '#64748B', lineHeight: '1.5' }}>
              Administratively override appointment status. Bypasses standard transition rules, but <strong>requires an audit reason</strong>.
            </p>

            <div style={{ backgroundColor: '#F8FAFC', borderRadius: '10px', padding: '12px 14px', marginBottom: '16px', border: '1px solid #E2E8F0', fontSize: '12px' }}>
              <div><strong>Ref:</strong> {forceStatusModalApt.appointmentNumber}</div>
              <div><strong>Patient:</strong> {forceStatusModalApt.patientName} (NIC: {forceStatusModalApt.patientNic || 'N/A'})</div>
              <div><strong>Doctor:</strong> {forceStatusModalApt.doctorName}</div>
              <div><strong>Current Status:</strong> <span style={{ fontWeight: '700', color: '#00796B' }}>{forceStatusModalApt.status}</span> (Queue: {forceStatusModalApt.queueStatus})</div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                TARGET STATUS *
              </label>
              <select
                value={forceStatusTarget}
                onChange={(e) => setForceStatusTarget(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1.5px solid #CBD5E1',
                  fontSize: '13px',
                  outline: 'none',
                  backgroundColor: '#FFFFFF',
                  color: '#1E293B',
                  fontWeight: '600'
                }}
              >
                <option value="Confirmed">Confirmed</option>
                <option value="InProgress">InProgress (In Consultation)</option>
                <option value="Completed">Completed</option>
                <option value="NoShow">NoShow</option>
                <option value="Cancelled">Cancelled</option>
                <option value="Reserved">Reserved</option>
              </select>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
                OVERRIDE REASON (MANDATORY AUDIT TRAIL) *
              </label>
              <textarea
                rows={3}
                placeholder="Specify administrative reason (e.g. Doctor requested urgent consultation override / System payment discrepancy verified / Patient arrived late by arrangement)..."
                value={forceStatusReason}
                onChange={(e) => {
                  setForceStatusReason(e.target.value);
                  if (forceStatusError) setForceStatusError('');
                }}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  border: forceStatusError ? '1.5px solid #DC2626' : '1.5px solid #CBD5E1',
                  borderRadius: '8px',
                  fontSize: '12.5px',
                  boxSizing: 'border-box',
                  outline: 'none'
                }}
              />
              {forceStatusError && (
                <div style={{ color: '#DC2626', fontSize: '11px', marginTop: '4px', fontWeight: '600' }}>
                  ⚠ {forceStatusError}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setForceStatusModalApt(null)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '7px',
                  border: '1px solid #CBD5E1',
                  backgroundColor: '#FFFFFF',
                  color: '#64748B',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyForceStatus}
                disabled={forceStatusLoading || !forceStatusReason.trim()}
                style={{
                  padding: '8px 18px',
                  borderRadius: '7px',
                  border: 'none',
                  backgroundColor: !forceStatusReason.trim() ? '#94A3B8' : '#00796B',
                  color: '#FFFFFF',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: !forceStatusReason.trim() || forceStatusLoading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {forceStatusLoading ? <RefreshCw size={13} className="animate-spin" /> : <ShieldAlert size={14} />}
                Apply Force Status
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Permanent Delete Confirmation Modal */}
      {deleteModalApt && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.55)',
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
            maxWidth: '420px',
            width: '100%',
            position: 'relative',
            boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#DC2626', marginBottom: '8px' }}>
              <Trash2 size={22} />
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800' }}>
                Confirm Permanent Deletion
              </h3>
            </div>
            <p style={{ margin: '0 0 16px 0', fontSize: '12.5px', color: '#64748B', lineHeight: '1.5' }}>
              Are you sure you want to permanently delete appointment <strong>{deleteModalApt.appointmentNumber}</strong> for patient <strong>{deleteModalApt.patientName}</strong>?
            </p>
            <div style={{
              backgroundColor: '#FEF2F2',
              borderRadius: '8px',
              padding: '10px 14px',
              border: '1px solid #FCA5A5',
              color: '#991B1B',
              fontSize: '11.5px',
              marginBottom: '18px'
            }}>
              ⚠ <strong>Permanent Action:</strong> This hard-deletes the appointment record from the database and restores session capacity if applicable. This cannot be undone.
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setDeleteModalApt(null)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '7px',
                  border: '1px solid #CBD5E1',
                  backgroundColor: '#FFFFFF',
                  color: '#64748B',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={actionLoading}
                style={{
                  padding: '8px 18px',
                  borderRadius: '7px',
                  border: 'none',
                  backgroundColor: '#DC2626',
                  color: '#FFFFFF',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: actionLoading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {actionLoading ? <RefreshCw size={13} className="animate-spin" /> : <Trash2 size={13} />}
                Permanently Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorAppointmentsAdmin;
