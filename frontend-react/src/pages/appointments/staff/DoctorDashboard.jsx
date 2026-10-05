import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import { getDashboardPath } from '../../../utils/navigation';
import { API_BASE_URL } from '../../../api/config';
import {
  getDoctors, getDoctorQueue, updateAppointmentStatus,
  getDoctorSessions, getSessionQueue, callNextPatient
} from '../../../api/doctorApi';
import logoImage from '../../../assets/mediz.png';
import {
  Stethoscope, User, Calendar, Clock, CheckCircle2,
  AlertCircle, RefreshCw, LogOut, ChevronRight, Activity,
  Phone, FileText, Check, ShieldCheck, UserCheck, Play,
  Volume2, AlertTriangle, ArrowRight, ClipboardList, Info
} from 'lucide-react';

const DoctorDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [selectedDoctorId, setSelectedDoctorId] = useState(null);
  const [currentDoctor, setCurrentDoctor] = useState(null);

  const [sessions, setSessions] = useState([]);
  const [sessionTab, setSessionTab] = useState('today'); // 'today' | 'upcoming' | 'past'
  const [selectedBookmarkDate, setSelectedBookmarkDate] = useState(null);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [activeSession, setActiveSession] = useState(null);

  const [queue, setQueue] = useState([]);
  const [currentlyServing, setCurrentlyServing] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [notesModalApt, setNotesModalApt] = useState(null);
  const [consultationNotes, setConsultationNotes] = useState('');
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3500);
  };

  const playQueueChime = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.7);
    } catch (e) {
      console.warn('Audio chime unsupported or blocked', e);
    }
  };

  // Safe room name resolution fallback across all possible DTO keys
  const resolveRoomName = (sess) => {
    return (
      sess?.roomNumber ||
      sess?.roomNo ||
      sess?.room ||
      sess?.hospitalBranch ||
      currentDoctor?.roomNumber ||
      'Suite 201'
    );
  };

  useEffect(() => {
    initDoctors();
  }, []);

  useEffect(() => {
    if (selectedDoctorId) {
      loadDoctorSessions(selectedDoctorId);
    }
  }, [selectedDoctorId]);

  useEffect(() => {
    if (activeSessionId) {
      fetchSessionQueueData(activeSessionId);
    } else if (selectedDoctorId) {
      fetchDoctorQueueData(selectedDoctorId);
    }
  }, [activeSessionId, selectedDoctorId]);

  const initDoctors = async () => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem('token') || localStorage.getItem('token');

      // 1. Primary: fetch authenticated doctor record linked to the caller's JWT
      const meRes = await axios.get(`${API_BASE_URL}/doctors/me`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (meRes.data && meRes.data.id) {
        setSelectedDoctorId(meRes.data.id);
        setCurrentDoctor(meRes.data);
        return;
      }
    } catch (err) {
      console.warn('GET /api/doctors/me returned error or unlinked doctor, attempting fallback resolution:', err);
      // Resilient fallback: match logged-in user against doctor records
      try {
        const res = await getDoctors();
        if (Array.isArray(res.data) && res.data.length > 0) {
          const matched = res.data.find(d =>
            (d.email && user?.email && d.email.toLowerCase() === user.email.toLowerCase()) ||
            (user?.fullName && d.fullName.toLowerCase().includes(user.fullName.toLowerCase()))
          );

          if (matched) {
            setSelectedDoctorId(matched.id);
            setCurrentDoctor(matched);
            return;
          }
        }
      } catch (fallbackErr) {
        console.error('Fallback doctor resolution failed', fallbackErr);
      }
      showToast('Error loading your doctor profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];

  const loadDoctorSessions = async (docId) => {
    try {
      const res = await getDoctorSessions(docId);
      if (Array.isArray(res.data) && res.data.length > 0) {
        const sortedSessions = res.data;
        setSessions(sortedSessions);

        // Auto-selection priority:
        // 1. Today's session that has active bookings (currentBookings > 0)
        // 2. Today's session that is InProgress or Scheduled
        // 3. Next upcoming session with active bookings (currentBookings > 0)
        // 4. Any session with sessionDate == today
        // 5. Next upcoming session
        // 6. Fallback to latest session
        const todayWithBookings = sortedSessions.find(s => s.sessionDate === todayStr && (s.currentBookings > 0));
        const todayActive = sortedSessions.find(s => s.sessionDate === todayStr && (s.sessionStatus === 'InProgress' || s.sessionStatus === 'Scheduled'));
        const nextUpcomingWithBookings = sortedSessions
          .filter(s => s.sessionDate >= todayStr && (s.currentBookings > 0) && s.sessionStatus !== 'Cancelled')
          .sort((a, b) => a.sessionDate.localeCompare(b.sessionDate))[0];
        const anyToday = sortedSessions.find(s => s.sessionDate === todayStr);
        const nextUpcoming = sortedSessions
          .filter(s => s.sessionDate > todayStr && s.sessionStatus !== 'Cancelled')
          .sort((a, b) => a.sessionDate.localeCompare(b.sessionDate))[0];
        const fallback = sortedSessions[0];

        const target = todayWithBookings || todayActive || nextUpcomingWithBookings || anyToday || nextUpcoming || fallback;
        if (target) {
          setActiveSessionId(target.id);
          setActiveSession(target);
          setCurrentlyServing(target.currentlyServingQueueNumber || 0);
          if (target.sessionDate === todayStr || (target.isActive && target.sessionStatus === 'InProgress')) {
            setSessionTab('today');
          } else if (target.sessionDate > todayStr) {
            setSessionTab('upcoming');
          } else {
            setSessionTab('past');
          }
        }
      } else {
        setSessions([]);
        setActiveSessionId(null);
        setActiveSession(null);
      }
    } catch (err) {
      console.error('Failed to load sessions', err);
    }
  };


  const handleSelectSession = (sess) => {
    setActiveSessionId(sess.id);
    setActiveSession(sess);
    setCurrentlyServing(sess.currentlyServingQueueNumber || 0);
  };

  // ── Tab switch: syncs selected session + queue with chosen tab ────────────
  const handleTabSwitch = (tabId) => {
    setSessionTab(tabId);
    setSelectedBookmarkDate(null);

    if (tabId === 'today') {
      // Find the best active-today session
      const activeToday = sessions.find(
        s => s.sessionDate === todayStr &&
          (s.sessionStatus === 'InProgress' || s.sessionStatus === 'Scheduled') &&
          s.sessionStatus !== 'Cancelled'
      ) || sessions.find(s => s.sessionDate === todayStr);

      if (activeToday) {
        setActiveSessionId(activeToday.id);
        setActiveSession(activeToday);
        setCurrentlyServing(activeToday.currentlyServingQueueNumber || 0);
        // queue loads automatically via the activeSessionId useEffect
      } else {
        // No today session — clear everything
        setActiveSessionId(null);
        setActiveSession(null);
        setCurrentlyServing(0);
        setQueue([]);
      }
    } else if (tabId === 'upcoming') {
      const upcomingPool = sessions.filter(
        s => s.sessionDate > todayStr &&
          s.sessionStatus !== 'Cancelled' &&
          s.sessionStatus !== 'Completed'
      ).sort((a, b) => a.sessionDate.localeCompare(b.sessionDate));

      if (upcomingPool.length > 0) {
        const first = upcomingPool[0];
        setActiveSessionId(first.id);
        setActiveSession(first);
        setCurrentlyServing(first.currentlyServingQueueNumber || 0);
      } else {
        setActiveSessionId(null);
        setActiveSession(null);
        setCurrentlyServing(0);
        setQueue([]);
      }
    } else {
      // past — clear queue; user must manually click a past session card
      setActiveSessionId(null);
      setActiveSession(null);
      setCurrentlyServing(0);
      setQueue([]);
    }
  };

  const fetchSessionQueueData = async (sessionId) => {
    setLoading(true);
    try {
      const res = await getSessionQueue(sessionId);
      if (res.data) {
        setQueue(res.data.queue || []);
        setCurrentlyServing(res.data.currentlyServingQueueNumber || 0);
        if (activeSession) {
          setActiveSession({
            ...activeSession,
            sessionStatus: res.data.sessionStatus,
            delayReason: res.data.delayReason,
            expectedStartTime: res.data.expectedStartTime,
            roomNumber: res.data.roomNumber || activeSession.roomNumber,
            hospitalBranch: res.data.hospitalBranch || activeSession.hospitalBranch
          });
        }
      }
    } catch (err) {
      console.error('Failed to fetch session queue', err);
      fetchDoctorQueueData(selectedDoctorId);
    } finally {
      setLoading(false);
    }
  };

  const fetchDoctorQueueData = async (docId) => {
    setLoading(true);
    try {
      const res = await getDoctorQueue(docId);
      if (Array.isArray(res.data)) {
        setQueue(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch doctor queue', err);
      showToast('Failed to load consultation queue', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCallNext = async () => {
    if (!activeSessionId) {
      showToast('No active session selected', 'error');
      return;
    }
    setActionLoading(true);
    try {
      const res = await callNextPatient(activeSessionId);
      const nextApt = res.data;
      setCurrentlyServing(nextApt.queueNumber);
      playQueueChime();
      showToast(`Now Serving Queue #${String(nextApt.queueNumber).padStart(2, '0')}: ${nextApt.patientName}`, 'success');
      fetchSessionQueueData(activeSessionId);
    } catch (err) {
      console.error('Call next error', err);
      showToast(err.response?.data?.message || 'No more waiting patients to call', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStatusChange = async (aptId, newStatus, notes = '') => {
    setActionLoading(true);
    try {
      await updateAppointmentStatus(aptId, newStatus, notes);
      showToast(`Patient status updated: ${newStatus}`, 'success');
      if (activeSessionId) fetchSessionQueueData(activeSessionId);
      else fetchDoctorQueueData(selectedDoctorId);
    } catch (err) {
      showToast('Failed to update consultation status', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenCompleteModal = (apt) => {
    setNotesModalApt(apt);
    setConsultationNotes(apt.notes || '');
  };

  const handleSaveAndComplete = async () => {
    if (!notesModalApt) return;
    await handleStatusChange(notesModalApt.id, 'Completed', consultationNotes);
    setNotesModalApt(null);
  };

  // Categorize sessions into 3 tabs
  const todaySessions = sessions.filter(s => s.sessionDate === todayStr || (s.isActive && (s.sessionStatus === 'InProgress' || s.sessionStatus === 'Scheduled')));
  const upcomingSessions = sessions.filter(s => s.sessionDate > todayStr && s.sessionStatus !== 'Cancelled' && s.sessionStatus !== 'Completed');
  const pastSessions = sessions.filter(s => (s.sessionDate < todayStr && s.sessionDate !== todayStr) || s.sessionStatus === 'Completed' || s.sessionStatus === 'Cancelled');

  const displayedSessions = sessionTab === 'today' ? todaySessions : sessionTab === 'upcoming' ? upcomingSessions : pastSessions;

  // Find next booked session if current view has 0 bookings
  const nextBookedSession = sessions
    .filter(s => s.sessionDate >= todayStr && (s.currentBookings > 0) && s.id !== activeSessionId)
    .sort((a, b) => a.sessionDate.localeCompare(b.sessionDate))[0];

  const showNextBookedBanner = (activeSession?.currentBookings === 0 || queue.length === 0) && nextBookedSession;

  // KPIs
  const waitingCount = queue.filter(a => (a.queueStatus === 'Waiting' || a.checkedInAt) && a.status !== 'Completed' && a.status !== 'InProgress').length;
  const inProgressCount = queue.filter(a => a.status === 'InProgress' || a.queueStatus === 'InConsultation').length;
  const notCheckedInCount = queue.filter(a => a.queueStatus === 'NotCheckedIn' && !a.checkedInAt && a.status !== 'Completed' && a.status !== 'NoShow' && a.status !== 'InProgress').length;
  const completedCount = queue.filter(a => a.status === 'Completed' || a.queueStatus === 'Completed').length;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F8FAFC', display: 'flex', flexDirection: 'column', fontFamily: 'inherit' }}>
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

      {/* Top Header */}
      <header style={{
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #E2E8F0',
        padding: '12px 28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <Link
          to={getDashboardPath(user)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            textDecoration: 'none',
            cursor: 'pointer',
            transition: 'opacity 0.2s ease'
          }}
          className="cursor-pointer"
          onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
          title="Return to Dashboard"
        >
          <img src={logoImage} alt="Health Bridge" style={{ height: '36px' }} />
          <div>
            <h1 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#004D40' }}>
              Doctor Consultation Portal
            </h1>
            <p style={{ margin: 0, fontSize: '11px', color: '#64748B' }}>
              Real-time patient queue, clinical notes, and session workflow
            </p>
          </div>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Authenticated Doctor Badge (Read-only, no switcher) */}
          {currentDoctor && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 14px',
                borderRadius: '6px',
                backgroundColor: '#F0FDF4',
                border: '1px solid #A7F3D0',
                color: '#004D40',
                fontSize: '12px',
                fontWeight: '700'
              }}
              title={`Logged in as ${currentDoctor.fullName}`}
            >
              <UserCheck size={15} color="#059669" />
              <span>{currentDoctor.fullName}</span>
              <span style={{
                fontSize: '10px',
                backgroundColor: '#00796B',
                color: '#FFFFFF',
                padding: '1px 6px',
                borderRadius: '4px',
                fontWeight: '800'
              }}>
                {currentDoctor.specialization}
              </span>
            </div>
          )}

          <button
            onClick={() => {
              if (activeSessionId) fetchSessionQueueData(activeSessionId);
              else if (selectedDoctorId) fetchDoctorQueueData(selectedDoctorId);
            }}
            disabled={loading}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid #CBD5E1',
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

          {/* EMR Portal Button */}
          <button
            onClick={() => navigate('/emr/staff?role=Consultant')}
            title="Open EMR Consultant Workspace"
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: '1px solid #00796B',
              backgroundColor: '#00796B',
              color: '#FFFFFF',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 1px 4px rgba(0,121,107,0.25)',
              transition: 'background-color 0.2s, box-shadow 0.2s'
            }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#005f4f'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,121,107,0.4)'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#00796B'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,121,107,0.25)'; }}
          >
            <ClipboardList size={14} /> EMR Portal
          </button>

          <button
            onClick={logout}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid #FCA5A5',
              backgroundColor: '#FEF2F2',
              color: '#DC2626',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <LogOut size={13} /> Logout
          </button>
        </div>
      </header>

      {/* Main Body */}
      <main style={{ padding: '24px 28px', maxWidth: '1280px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>

        {/* 3 Session Category Tabs */}
        <div style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '16px',
          borderBottom: '1px solid #E2E8F0',
          paddingBottom: '8px',
          flexWrap: 'wrap'
        }}>
          {[
            { id: 'today', label: "🟢 Today's Active Clinic", count: todaySessions.length },
            { id: 'upcoming', label: "📅 Upcoming Schedule", count: upcomingSessions.length },
            { id: 'past', label: "📜 Past Sessions History", count: pastSessions.length }
          ].map(tab => {
            const isActive = sessionTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  handleTabSwitch(tab.id);
                  // for today/past chips: also select first session in pool
                  if (tab.id !== 'upcoming') {
                    const pool = tab.id === 'today' ? todaySessions : pastSessions;
                    if (pool.length > 0 && (!activeSession || !pool.some(s => s.id === activeSession.id))) {
                      handleSelectSession(pool[0]);
                    }
                  }
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: isActive ? '#00796B' : '#FFFFFF',
                  color: isActive ? '#FFFFFF' : '#475569',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: isActive ? '0 2px 6px rgba(0,121,107,0.25)' : 'none',
                  borderBottom: isActive ? '2px solid #004D40' : 'none'
                }}
              >
                <span>{tab.label}</span>
                <span style={{
                  padding: '2px 8px',
                  borderRadius: '12px',
                  backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : '#F1F5F9',
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

        {/* Next Booked Session Notice Banner (if today has 0 bookings or viewing empty slot) */}
        {showNextBookedBanner && (
          <div style={{
            backgroundColor: '#EFF6FF',
            border: '1.5px solid #3B82F6',
            borderRadius: '10px',
            padding: '12px 18px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            color: '#1E40AF'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Info size={20} color="#2563EB" />
              <div>
                <span style={{ fontWeight: '800', fontSize: '13px' }}>
                  Notice: Your next session with booked patients is on {nextBookedSession.sessionDate} — {nextBookedSession.sessionType ? `${nextBookedSession.sessionType} Session • ` : ''}{nextBookedSession.timeRange || nextBookedSession.timeFormatted} ({nextBookedSession.currentBookings} Patient{nextBookedSession.currentBookings > 1 ? 's' : ''} Booked).
                </span>
                <div style={{ fontSize: '11px', color: '#3B82F6', marginTop: '2px' }}>
                  Room: {resolveRoomName(nextBookedSession)} • Status: {nextBookedSession.sessionStatus}
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                if (nextBookedSession.sessionDate > todayStr) setSessionTab('upcoming');
                else setSessionTab('today');
                handleSelectSession(nextBookedSession);
              }}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: '#2563EB',
                color: '#FFFFFF',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              Switch to This Session <ArrowRight size={14} />
            </button>
          </div>
        )}

        {/* ── Session Selector: bookmark tabs for Upcoming, chips for Today/Past ── */}
        {sessionTab === 'upcoming' ? (() => {
          // Build 7-day bookmark window starting from tomorrow
          const bookmarkDays = Array.from({ length: 7 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() + 1 + i);
            const yyyy = d.getFullYear();
            const mm   = String(d.getMonth() + 1).padStart(2, '0');
            const dd   = String(d.getDate()).padStart(2, '0');
            const dateStr = `${yyyy}-${mm}-${dd}`;
            const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
            const monthDay = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            const slots = upcomingSessions.filter(s => s.sessionDate === dateStr);
            return { dateStr, dayName, monthDay, slots };
          });

          // Default to first day with slots, or first day
          const activeBmDate = selectedBookmarkDate ||
            (bookmarkDays.find(d => d.slots.length > 0)?.dateStr ?? bookmarkDays[0].dateStr);

          const filteredSlots = upcomingSessions.filter(s => s.sessionDate === activeBmDate);

          return (
            <div style={{ marginBottom: '20px' }}>
              {/* ── Bookmark Tab Bar ── */}
              <div style={{
                display: 'flex',
                alignItems: 'flex-end',
                gap: '3px',
                paddingLeft: '4px',
                paddingRight: '4px',
                overflowX: 'auto',
              }}>
                {bookmarkDays.map(({ dateStr, dayName, monthDay, slots }) => {
                  const isActive = dateStr === activeBmDate;
                  const hasSlots = slots.length > 0;
                  return (
                    <button
                      key={dateStr}
                      onClick={() => {
                        setSelectedBookmarkDate(dateStr);
                        const s = upcomingSessions.filter(x => x.sessionDate === dateStr);
                        if (s.length > 0) handleSelectSession(s[0]);
                      }}
                      style={{
                        flexShrink: 0,
                        minWidth: '100px',
                        padding: isActive ? '10px 12px 13px' : '8px 12px 11px',
                        borderRadius: '10px 10px 0 0',
                        border: isActive
                          ? '1.5px solid #E2E8F0'
                          : '1.5px solid #E2E8F0',
                        borderBottom: isActive ? '1.5px solid #FFFFFF' : '1.5px solid #E2E8F0',
                        borderTop: isActive ? '3px solid #059669' : '3px solid transparent',
                        backgroundColor: isActive ? '#FFFFFF' : '#F1F5F9',
                        color: isActive ? '#0f172a' : '#64748B',
                        cursor: 'pointer',
                        textAlign: 'center',
                        position: 'relative',
                        zIndex: isActive ? 10 : 1,
                        transform: isActive ? 'translateY(0)' : 'translateY(2px)',
                        transition: 'all 0.15s ease',
                        boxShadow: isActive
                          ? '0 -2px 8px rgba(5,150,105,0.10), -1px 0 0 #E2E8F0, 1px 0 0 #E2E8F0'
                          : 'none',
                      }}
                    >
                      <div style={{
                        fontSize: '10px',
                        fontWeight: '800',
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        color: isActive ? '#059669' : '#94A3B8',
                        marginBottom: '2px'
                      }}>
                        {dayName}
                      </div>
                      <div style={{
                        fontSize: '12px',
                        fontWeight: '700',
                        color: isActive ? '#0f172a' : '#475569',
                        marginBottom: '5px'
                      }}>
                        {monthDay}
                      </div>
                      <div style={{
                        display: 'inline-block',
                        padding: '2px 7px',
                        borderRadius: '20px',
                        fontSize: '10px',
                        fontWeight: '800',
                        backgroundColor: hasSlots
                          ? (isActive ? '#D1FAE5' : '#E2E8F0')
                          : (isActive ? '#FEE2E2' : '#E2E8F0'),
                        color: hasSlots
                          ? (isActive ? '#065F46' : '#64748B')
                          : (isActive ? '#B91C1C' : '#94A3B8'),
                      }}>
                        {hasSlots ? `${slots.length} Slot${slots.length > 1 ? 's' : ''}` : 'Off'}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* ── Schedule Card (flush under tabs) ── */}
              <div style={{
                backgroundColor: '#FFFFFF',
                border: '1.5px solid #E2E8F0',
                borderRadius: '0 10px 10px 10px',
                padding: '16px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              }}>
                {filteredSlots.length > 0 ? (
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    {filteredSlots.map(sess => {
                      const isSel = activeSessionId === sess.id;
                      const isDelayed = sess.sessionStatus === 'Delayed';
                      const isInProg  = sess.sessionStatus === 'InProgress';
                      return (
                        <div
                          key={sess.id}
                          onClick={() => handleSelectSession(sess)}
                          style={{
                            flexShrink: 0,
                            minWidth: '210px',
                            padding: '12px 16px',
                            borderRadius: '10px',
                            backgroundColor: isSel ? '#E0F2F1' : '#F8FAFC',
                            border: isSel ? '2px solid #00796B' : '1.5px solid #E2E8F0',
                            cursor: 'pointer',
                            boxShadow: isSel ? '0 2px 8px rgba(0,121,107,0.15)' : 'none',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <span style={{ fontSize: '11px', fontWeight: '800', color: isSel ? '#004D40' : '#475569' }}>
                              {sess.sessionDate}
                            </span>
                            <span style={{
                              fontSize: '10px', fontWeight: '800', padding: '2px 6px',
                              borderRadius: '4px',
                              backgroundColor: isInProg ? '#DCFCE7' : isDelayed ? '#FEF3C7' : '#F1F5F9',
                              color: isInProg ? '#166534' : isDelayed ? '#B45309' : '#475569'
                            }}>
                              {sess.sessionStatus}
                            </span>
                          </div>
                          <div style={{ fontSize: '13px', fontWeight: '800', color: '#1E293B' }}>
                            {sess.sessionType ? `${sess.sessionType === 'Morning' ? '🌅 Morning' : sess.sessionType === 'Evening' ? '🌇 Evening' : '🌙 Night'} Session` : sess.timeFormatted}
                          </div>
                          <div style={{ fontSize: '12px', fontWeight: '700', color: '#00796B', marginTop: '2px' }}>
                            {sess.timeRange || sess.timeFormatted}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748B', marginTop: '3px' }}>
                            {resolveRoomName(sess)} • <strong>{sess.currentBookings || 0}/{sess.maxCapacity}</strong> booked
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{
                    padding: '32px 16px',
                    textAlign: 'center',
                    color: '#94A3B8',
                  }}>
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>📭</div>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#64748B' }}>No sessions scheduled</div>
                    <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '4px' }}>
                      {bookmarkDays.find(d => d.dateStr === activeBmDate)?.monthDay} is a day off.
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })() : (
          /* ── Today / Past: original horizontal chip row ── */
          displayedSessions.length > 0 ? (
            <div style={{
              display: 'flex',
              gap: '12px',
              overflowX: 'auto',
              paddingBottom: '12px',
              marginBottom: '16px'
            }}>
              {displayedSessions.map(sess => {
                const isSel = activeSessionId === sess.id;
                const isDelayed = sess.sessionStatus === 'Delayed';
                const isInProg = sess.sessionStatus === 'InProgress';
                return (
                  <div
                    key={sess.id}
                    onClick={() => handleSelectSession(sess)}
                    style={{
                      flexShrink: 0,
                      minWidth: '240px',
                      padding: '12px 16px',
                      borderRadius: '10px',
                      backgroundColor: isSel ? '#E0F2F1' : '#FFFFFF',
                      border: isSel ? '2px solid #00796B' : '1px solid #E2E8F0',
                      cursor: 'pointer',
                      boxShadow: isSel ? '0 2px 8px rgba(0,121,107,0.15)' : '0 1px 3px rgba(0,0,0,0.03)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '11px', fontWeight: '800', color: isSel ? '#004D40' : '#475569' }}>
                        {sess.sessionDate === todayStr ? 'TODAY' : sess.sessionDate}
                      </span>
                      <span style={{
                        fontSize: '10px', fontWeight: '800', padding: '2px 6px', borderRadius: '4px',
                        backgroundColor: isInProg ? '#DCFCE7' : isDelayed ? '#FEF3C7' : '#F1F5F9',
                        color: isInProg ? '#166534' : isDelayed ? '#B45309' : '#475569'
                      }}>
                        {sess.sessionStatus}
                      </span>
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: '800', color: '#1E293B' }}>
                      {sess.sessionType ? `${sess.sessionType === 'Morning' ? '🌅 Morning' : sess.sessionType === 'Evening' ? '🌇 Evening' : '🌙 Night'} Session • ` : ''}{sess.timeRange || sess.timeFormatted}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                      Room: {resolveRoomName(sess)} • Bookings: <strong>{sess.currentBookings || 0}/{sess.maxCapacity}</strong>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{
              padding: '16px',
              backgroundColor: '#FFFFFF',
              borderRadius: '10px',
              border: '1px dashed #CBD5E1',
              textAlign: 'center',
              color: '#64748B',
              fontSize: '13px',
              marginBottom: '16px'
            }}>
              No {sessionTab} sessions scheduled for this consultant.
            </div>
          )
        )}

        {/* Doctor Header Banner Card */}
        {currentDoctor && (
          <div style={{
            background: 'linear-gradient(90deg, #004D40 0%, #00796B 100%)',
            color: '#FFFFFF',
            borderRadius: '14px',
            padding: '20px 24px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
            boxShadow: '0 4px 14px rgba(0,77,64,0.12)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                backgroundColor: '#FFFFFF',
                color: '#004D40',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                fontWeight: '900'
              }}>
                {currentDoctor.fullName.replace('Dr. ', '').split(' ').map(n => n[0]).slice(0, 2).join('')}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    fontSize: '10px',
                    fontWeight: '800',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    textTransform: 'uppercase'
                  }}>
                    {currentDoctor.specialization}
                  </span>
                  <span style={{ fontSize: '11px', color: '#A7F3D0' }}>
                    {currentDoctor.hospitalBranch || 'Health Bridge Hospital'}
                  </span>
                </div>
                <h2 style={{ margin: '4px 0', fontSize: '20px', fontWeight: '900' }}>
                  {currentDoctor.fullName}
                </h2>
                <div style={{ fontSize: '12px', color: '#E0F2F1' }}>
                  {currentDoctor.qualifications} • Room: <strong>{resolveRoomName(activeSession)}</strong> • Fee: LKR {currentDoctor.consultationFee?.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Currently Serving Box & Call Next Action */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                backgroundColor: 'rgba(255,255,255,0.15)',
                backdropFilter: 'blur(4px)',
                borderRadius: '10px',
                padding: '10px 18px',
                textAlign: 'center',
                border: '1px solid rgba(255,255,255,0.2)'
              }}>
                <div style={{ fontSize: '10px', color: '#A7F3D0', fontWeight: '800', textTransform: 'uppercase' }}>
                  CURRENTLY SERVING
                </div>
                <div style={{ fontSize: '24px', fontWeight: '900', color: '#FFFFFF' }}>
                  #{String(currentlyServing).padStart(2, '0')}
                </div>
              </div>

              <button
                onClick={handleCallNext}
                disabled={actionLoading || !activeSessionId}
                style={{
                  padding: '12px 20px',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: '#FFFFFF',
                  color: '#004D40',
                  fontSize: '13px',
                  fontWeight: '800',
                  cursor: actionLoading || !activeSessionId ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.15)'
                }}
              >
                <Volume2 size={18} color="#00796B" />
                Call Next Patient
              </button>
            </div>
          </div>
        )}

        {/* Delayed Session Warning Banner (if session is delayed) */}
        {activeSession?.sessionStatus === 'Delayed' && (
          <div style={{
            backgroundColor: '#FEF3C7',
            border: '1px solid #F59E0B',
            borderRadius: '10px',
            padding: '12px 18px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            color: '#92400E'
          }}>
            <AlertTriangle size={20} color="#D97706" />
            <div>
              <div style={{ fontSize: '13px', fontWeight: '800' }}>
                Session Delayed by Operations Desk
              </div>
              <div style={{ fontSize: '12px' }}>
                Expected Start Time: <strong>{activeSession.expectedStartTime || 'In progress soon'}</strong> • Reason: <em>{activeSession.delayReason || 'Doctor consultation delayed'}</em>. Patients have been notified.
              </div>
            </div>
          </div>
        )}

        {/* KPIs Bar — shows zeroed when no session is selected */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '14px',
          marginBottom: '24px'
        }}>
          {[
            { label: 'TOTAL BOOKED',         count: activeSession ? queue.length    : 0, bg: '#F1F5F9', color: '#334155' },
            { label: 'CHECKED-IN / WAITING', count: activeSession ? waitingCount     : 0, bg: '#E0F2FE', color: '#0284C7' },
            { label: 'IN CONSULTATION',      count: activeSession ? inProgressCount  : 0, bg: '#FFEDD5', color: '#C2410C' },
            { label: 'AWAITING CHECK-IN',    count: activeSession ? notCheckedInCount: 0, bg: '#F1F5F9', color: '#64748B' },
            { label: 'COMPLETED TODAY',      count: activeSession ? completedCount   : 0, bg: '#DCFCE7', color: '#15803D' }
          ].map((kpi, idx) => (
            <div key={idx} style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '10px',
              padding: '14px 20px',
              border: '1px solid #E2E8F0',
              borderLeft: `4px solid ${kpi.color}`,
              opacity: activeSession ? 1 : 0.45,
              transition: 'opacity 0.2s'
            }}>
              <div style={{ fontSize: '11px', fontWeight: '800', color: '#64748B' }}>{kpi.label}</div>
              <div style={{ fontSize: '24px', fontWeight: '900', color: kpi.color, marginTop: '4px' }}>
                {kpi.count}
              </div>
            </div>
          ))}
        </div>

        {/* Consultation Queue List */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '14px',
          padding: '24px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#004D40' }}>
              Patient Consultation Queue
            </h3>
            <span style={{ fontSize: '12px', color: '#64748B' }}>
              {activeSession
                ? `${activeSession.sessionDate} • ${activeSession.sessionType ? `${activeSession.sessionType} Session • ` : ''}${activeSession.timeRange || activeSession.timeFormatted} • ${activeSession.sessionStatus} (Room: ${resolveRoomName(activeSession)})`
                : 'No session selected'}
            </span>
          </div>

          {/* ── Empty state when no session is active ── */}
          {!activeSession ? (
            <div style={{
              textAlign: 'center',
              padding: '52px 20px',
              color: '#64748B'
            }}>
              <div style={{ fontSize: '40px', marginBottom: '10px' }}>🗓️</div>
              <h4 style={{ margin: '0 0 6px 0', color: '#334155', fontSize: '15px', fontWeight: '800' }}>
                {sessionTab === 'today'
                  ? 'No active session for today'
                  : sessionTab === 'past'
                  ? 'Select a past session to review'
                  : 'No upcoming session selected'}
              </h4>
              <p style={{ margin: 0, fontSize: '13px', maxWidth: '380px', marginLeft: 'auto', marginRight: 'auto' }}>
                {sessionTab === 'today'
                  ? 'There is no active clinic scheduled for today. Switch to the Upcoming Schedule tab to view and select a future session.'
                  : sessionTab === 'past'
                  ? 'Click on any past session card above to load its patient records and consultation history.'
                  : 'Select a session from the bookmark tabs above to load its patient queue.'}
              </p>
            </div>
          ) : loading ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#00796B' }}>
              <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 10px auto' }} />
              <p>Loading patient appointments...</p>
            </div>
          ) : queue.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '50px 20px', color: '#64748B' }}>
              <UserCheck size={40} color="#94A3B8" style={{ margin: '0 auto 10px auto' }} />
              <h4 style={{ margin: '0 0 6px 0', color: '#334155' }}>No patients in session queue</h4>
              <p style={{ margin: 0, fontSize: '13px' }}>
                All channeling appointments for this consultant session have been completed or none are scheduled.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {queue.map(apt => {
                const isConfirmed = apt.status === 'Confirmed' || apt.status === 'Reserved';
                const isInProgress = apt.status === 'InProgress' || apt.queueStatus === 'InConsultation';
                const isCompleted = apt.status === 'Completed' || apt.queueStatus === 'Completed';
                const isNoShow = apt.status === 'NoShow';
                const isCheckedIn = Boolean(apt.checkedInAt || apt.queueStatus === 'Waiting');
                const isNotCheckedIn = apt.queueStatus === 'NotCheckedIn' && !apt.checkedInAt;

                return (
                  <div
                    key={apt.id}
                    style={{
                      backgroundColor: isInProgress ? '#FEFCE8' : '#FFFFFF',
                      borderRadius: '10px',
                      border: isInProgress ? '2px solid #EAB308' : isCheckedIn ? '1.5px solid #99F6E4' : '1px solid #E2E8F0',
                      padding: '16px 20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '14px'
                    }}
                  >
                    {/* Patient Info */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{
                        width: '46px',
                        height: '46px',
                        borderRadius: '8px',
                        backgroundColor: isInProgress ? '#FEF08A' : isCheckedIn ? '#CCFBF1' : '#F1F5F9',
                        color: isInProgress ? '#854D0E' : isCheckedIn ? '#0F766E' : '#475569',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '16px',
                        fontWeight: '900'
                      }}>
                        #{String(apt.queueNumber).padStart(2, '0')}
                      </div>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px', flexWrap: 'wrap' }}>
                          {/* Main Queue State Badge */}
                          {isInProgress ? (
                            <span style={{
                              backgroundColor: '#FEF08A',
                              color: '#854D0E',
                              fontSize: '10px',
                              fontWeight: '800',
                              padding: '2px 8px',
                              borderRadius: '4px'
                            }}>
                              🟡 In Consultation
                            </span>
                          ) : isCheckedIn ? (
                            <span style={{
                              backgroundColor: '#DCFCE7',
                              color: '#15803D',
                              fontSize: '10px',
                              fontWeight: '800',
                              padding: '2px 8px',
                              borderRadius: '4px'
                            }}>
                              🟢 Checked-In at Desk (Waiting)
                            </span>
                          ) : isCompleted ? (
                            <span style={{
                              backgroundColor: '#E0F2FE',
                              color: '#0369A1',
                              fontSize: '10px',
                              fontWeight: '800',
                              padding: '2px 8px',
                              borderRadius: '4px'
                            }}>
                              🔵 Completed
                            </span>
                          ) : isNoShow ? (
                            <span style={{
                              backgroundColor: '#FEE2E2',
                              color: '#B91C1C',
                              fontSize: '10px',
                              fontWeight: '800',
                              padding: '2px 8px',
                              borderRadius: '4px'
                            }}>
                              🔴 No Show
                            </span>
                          ) : (
                            <span style={{
                              backgroundColor: '#F1F5F9',
                              color: '#64748B',
                              fontSize: '10px',
                              fontWeight: '800',
                              padding: '2px 8px',
                              borderRadius: '4px'
                            }}>
                              ⚪ Not Yet Checked-In
                            </span>
                          )}

                          <span style={{
                            backgroundColor: apt.bookingType === 'Reservation' ? '#FEF9C3' : '#E0F2FE',
                            color: apt.bookingType === 'Reservation' ? '#854D0E' : '#0369A1',
                            fontSize: '10px',
                            fontWeight: '700',
                            padding: '2px 6px',
                            borderRadius: '4px'
                          }}>
                            {apt.bookingType || 'Online'}
                          </span>

                          {apt.arrivalStatus && apt.arrivalStatus !== 'Pending' && (
                            <span style={{
                              backgroundColor: apt.arrivalStatus === 'OnTime' ? '#DCFCE7' : apt.arrivalStatus === 'Early' ? '#DBEAFE' : '#FEE2E2',
                              color: apt.arrivalStatus === 'OnTime' ? '#166534' : apt.arrivalStatus === 'Early' ? '#1E40AF' : '#991B1B',
                              fontSize: '10px',
                              fontWeight: '700',
                              padding: '2px 6px',
                              borderRadius: '4px'
                            }}>
                              Arrival: {apt.arrivalStatus}
                            </span>
                          )}

                          <span style={{ fontSize: '11px', color: '#64748B' }}>
                            Ref: {apt.appointmentNumber}
                          </span>
                        </div>

                        <h4 style={{ margin: '0 0 2px 0', fontSize: '15px', fontWeight: '800', color: '#1E293B' }}>
                          {apt.patientName}
                        </h4>
                        <div style={{ fontSize: '12px', color: '#64748B' }}>
                          NIC: {apt.patientNic} • Phone: {apt.patientPhone} • Time: <strong>{apt.appointmentDate} at {apt.timeSlot}</strong>
                        </div>
                        {apt.notes && (
                          <div style={{ fontSize: '11px', color: '#475569', fontStyle: 'italic', marginTop: '4px' }}>
                            Notes: "{apt.notes}"
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Doctor Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {(isConfirmed || isCheckedIn) && !isInProgress && !isCompleted && !isNoShow && (
                        <button
                          onClick={() => handleStatusChange(apt.id, 'InProgress')}
                          disabled={actionLoading}
                          style={{
                            padding: '8px 16px',
                            borderRadius: '6px',
                            border: 'none',
                            backgroundColor: '#0284C7',
                            color: '#FFFFFF',
                            fontSize: '12px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          <Play size={14} /> Start Consultation
                        </button>
                      )}

                      {isInProgress && (
                        <button
                          onClick={() => handleOpenCompleteModal(apt)}
                          disabled={actionLoading}
                          style={{
                            padding: '8px 18px',
                            borderRadius: '6px',
                            border: 'none',
                            backgroundColor: '#16A34A',
                            color: '#FFFFFF',
                            fontSize: '12px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          <CheckCircle2 size={14} /> Complete Consultation
                        </button>
                      )}

                      {!isCompleted && !isNoShow && (
                        <button
                          onClick={() => handleStatusChange(apt.id, 'NoShow')}
                          disabled={actionLoading}
                          style={{
                            padding: '8px 12px',
                            borderRadius: '6px',
                            border: '1px solid #CBD5E1',
                            backgroundColor: '#FFFFFF',
                            color: '#64748B',
                            fontSize: '12px',
                            fontWeight: '600',
                            cursor: 'pointer'
                          }}
                        >
                          No-Show
                        </button>
                      )}

                      {isCompleted && (
                        <span style={{ fontSize: '12px', color: '#16A34A', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Check size={14} /> Consultation Completed
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Complete Consultation & Notes Modal */}
      {notesModalApt && (
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
            maxWidth: '460px',
            width: '100%',
            position: 'relative'
          }}>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: '800', color: '#004D40' }}>
              Complete Consultation
            </h3>
            <p style={{ margin: '0 0 14px 0', fontSize: '12px', color: '#64748B' }}>
              Patient: <strong>{notesModalApt.patientName}</strong> (Ref: {notesModalApt.appointmentNumber})
            </p>

            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
              DOCTOR CLINICAL / CONSULTATION NOTES
            </label>
            <textarea
              rows={4}
              placeholder="Record clinical assessment, observations, and recommendations..."
              value={consultationNotes}
              onChange={(e) => setConsultationNotes(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #CBD5E1',
                borderRadius: '8px',
                fontSize: '13px',
                boxSizing: 'border-box',
                marginBottom: '16px',
                outline: 'none'
              }}
            />

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setNotesModalApt(null)}
                style={{
                  flex: 1,
                  padding: '9px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  backgroundColor: '#FFFFFF',
                  color: '#475569',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAndComplete}
                disabled={actionLoading}
                style={{
                  flex: 1,
                  padding: '9px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#16A34A',
                  color: '#FFFFFF',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Save & Complete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorDashboard;
