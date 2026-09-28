import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import {
  getAllAppointments, updateAppointmentStatus, deleteAppointment, getAppointmentStats,
  checkInAppointment, getDoctors, getDoctorSessions, startSession, delaySession, cancelSession
} from '../../../api/doctorApi';
import logoImage from '../../../assets/mediz.png';
import {
  Stethoscope, Calendar, Clock, MapPin, User, Search,
  CheckCircle2, XCircle, AlertCircle, RefreshCw, QrCode,
  Filter, ArrowLeft, Trash2, Phone, Mail, X, Activity, DollarSign,
  Play, AlertTriangle, UserCheck, ShieldAlert
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

  // Desk Check-In State
  const [deskQrInput, setDeskQrInput] = useState('');
  const [deskAptIdInput, setDeskAptIdInput] = useState('');
  const [checkInResult, setCheckInResult] = useState(null);

  // Sessions Management State
  const [doctorsList, setDoctorsList] = useState([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [doctorSessions, setDoctorSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [delayModalSession, setDelayModalSession] = useState(null);
  const [delayExpectedTime, setDelayExpectedTime] = useState('');
  const [delayReason, setDelayReason] = useState('');
  const [cancelModalSession, setCancelModalSession] = useState(null);
  const [cancelReason, setCancelReason] = useState('');

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
      }
    } catch (err) {
      console.error('Failed to load doctors list', err);
    }
  };

  const fetchSessions = async (docId) => {
    setLoadingSessions(true);
    try {
      const res = await getDoctorSessions(docId);
      if (Array.isArray(res.data)) {
        setDoctorSessions(res.data);
      }
    } catch (err) {
      console.error('Failed to load sessions', err);
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

  const handleCheckIn = async (aptId, qrToken) => {
    setActionLoading(true);
    try {
      const res = await checkInAppointment(aptId, qrToken);
      const updatedApt = res.data;
      setCheckInResult(updatedApt);
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

  const handleManualDeskCheckIn = (e) => {
    e.preventDefault();
    if (!deskAptIdInput || !deskQrInput) {
      showToast('Please enter both Appointment ID and QR Token', 'error');
      return;
    }
    handleCheckIn(parseInt(deskAptIdInput, 10), deskQrInput.trim());
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
          <img src={logoImage} alt="Logo" style={{ height: '36px' }} />
          <div>
            <h1 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#004D40' }}>
              Doctor Channeling Operations Desk
            </h1>
            <p style={{ margin: 0, fontSize: '11px', color: '#78909C' }}>
              Real-time queues, desk check-in verification, and session management
            </p>
          </div>
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

        {/* ─── Fast-Track QR Check-In Counter ─── */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          padding: '18px 22px',
          border: '1px solid #80CBC4',
          boxShadow: '0 2px 10px rgba(0,77,64,0.06)',
          marginBottom: '20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ backgroundColor: '#E0F2F1', padding: '6px', borderRadius: '8px', color: '#00796B' }}>
                <UserCheck size={18} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '800', color: '#004D40' }}>
                  Channeling Desk Patient Check-In Verification
                </h3>
                <p style={{ margin: 0, fontSize: '11px', color: '#607D8B' }}>
                  Scan patient QR token or enter Appointment ID to verify and calculate arrival status (Early / OnTime / Late).
                </p>
              </div>
            </div>

            {checkInResult && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 12px',
                backgroundColor: '#DCFCE7',
                borderRadius: '8px',
                border: '1px solid #86EFAC'
              }}>
                <CheckCircle2 size={16} color="#15803D" />
                <span style={{ fontSize: '12px', color: '#166534', fontWeight: '700' }}>
                  Checked In: {checkInResult.patientName} (Arrival: <strong>{checkInResult.arrivalStatus}</strong>)
                </span>
                <button
                  onClick={() => setCheckInResult(null)}
                  style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#166534', padding: '0 4px' }}
                >
                  <X size={14} />
                </button>
              </div>
            )}
          </div>

          <form onSubmit={handleManualDeskCheckIn} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 120px' }}>
              <input
                type="number"
                placeholder="Apt ID (e.g. 1)"
                value={deskAptIdInput}
                onChange={(e) => setDeskAptIdInput(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #CFD8DC',
                  borderRadius: '6px',
                  fontSize: '12px',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <div style={{ flex: '3 1 240px' }}>
              <input
                type="text"
                placeholder="Paste Scanned QR Token (e.g. 3fa85f64-5717-4562-b3fc-2c963f66afa6)"
                value={deskQrInput}
                onChange={(e) => setDeskQrInput(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #CFD8DC',
                  borderRadius: '6px',
                  fontSize: '12px',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <button
              type="submit"
              disabled={actionLoading}
              style={{
                padding: '8px 18px',
                borderRadius: '6px',
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
              <CheckCircle2 size={14} /> Verify & Check In
            </button>
          </form>
        </div>

        {/* ─── Doctor Session Workflow Operations ─── */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          padding: '18px 22px',
          border: '1px solid #E0E0E0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          marginBottom: '20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Stethoscope size={18} color="#00796B" />
              <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '800', color: '#004D40' }}>
                Consultation Session Management
              </h3>
            </div>

            {/* Doctor Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', color: '#607D8B', fontWeight: '600' }}>Select Doctor:</span>
              <select
                value={selectedDoctorId}
                onChange={(e) => setSelectedDoctorId(parseInt(e.target.value, 10))}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid #CFD8DC',
                  fontSize: '12px',
                  backgroundColor: '#FFFFFF',
                  fontWeight: '600',
                  color: '#004D40',
                  outline: 'none'
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

          {loadingSessions ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#00796B', fontSize: '12px' }}>
              <RefreshCw size={16} className="animate-spin" style={{ margin: '0 auto 6px auto' }} />
              Loading sessions...
            </div>
          ) : doctorSessions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '16px', color: '#78909C', fontSize: '12px' }}>
              No sessions found for the selected consultant.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px' }}>
              {doctorSessions.map(session => {
                const isScheduled = session.sessionStatus === 'Scheduled';
                const isInProgress = session.sessionStatus === 'InProgress';
                const isDelayed = session.sessionStatus === 'Delayed';
                const isCompleted = session.sessionStatus === 'Completed';
                const isCancelled = session.sessionStatus === 'Cancelled';

                const statusBadgeBg = isScheduled ? '#E0F2FE' : isInProgress ? '#DCFCE7' : isDelayed ? '#FEF3C7' : isCompleted ? '#F3F4F6' : '#FEE2E2';
                const statusBadgeColor = isScheduled ? '#0369A1' : isInProgress ? '#15803D' : isDelayed ? '#B45309' : isCompleted ? '#475569' : '#B91C1C';

                return (
                  <div
                    key={session.id}
                    style={{
                      border: '1px solid #E2E8F0',
                      borderRadius: '8px',
                      padding: '12px 16px',
                      backgroundColor: '#F8FAFC'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <div style={{ fontSize: '13px', fontWeight: '800', color: '#1E293B' }}>
                        {session.sessionDate} • {session.timeFormatted}
                      </div>
                      <span style={{
                        backgroundColor: statusBadgeBg,
                        color: statusBadgeColor,
                        fontSize: '10px',
                        fontWeight: '800',
                        padding: '2px 8px',
                        borderRadius: '10px'
                      }}>
                        {session.sessionStatus}
                      </span>
                    </div>

                    <div style={{ fontSize: '11px', color: '#64748B', marginBottom: '8px' }}>
                      Room {session.roomNumber} • Bookings: <strong>{session.currentBookings}/{session.maxPatients}</strong> • Serving: <strong>#{session.currentlyServingQueueNumber || 0}</strong>
                    </div>

                    {isDelayed && (
                      <div style={{ fontSize: '11px', color: '#B45309', marginBottom: '8px', backgroundColor: '#FEF9C3', padding: '4px 8px', borderRadius: '4px' }}>
                        Delay: {session.expectedStartTime ? `Expected at ${session.expectedStartTime}` : ''} ({session.delayReason || 'Doctor running late'})
                      </div>
                    )}

                    {/* Session Controls */}
                    <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                      {(isScheduled || isDelayed) && (
                        <button
                          onClick={() => handleStartSession(session.id)}
                          disabled={actionLoading}
                          style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            border: 'none',
                            backgroundColor: '#00796B',
                            color: '#FFFFFF',
                            fontSize: '11px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <Play size={12} /> Start
                        </button>
                      )}

                      {!isCompleted && !isCancelled && (
                        <>
                          <button
                            onClick={() => setDelayModalSession(session)}
                            disabled={actionLoading}
                            style={{
                              padding: '4px 8px',
                              borderRadius: '4px',
                              border: '1px solid #F59E0B',
                              backgroundColor: '#FEF3C7',
                              color: '#B45309',
                              fontSize: '11px',
                              fontWeight: '700',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <AlertTriangle size={12} /> Delay
                          </button>

                          <button
                            onClick={() => setCancelModalSession(session)}
                            disabled={actionLoading}
                            style={{
                              padding: '4px 8px',
                              borderRadius: '4px',
                              border: '1px solid #FCA5A5',
                              backgroundColor: '#FEF2F2',
                              color: '#B91C1C',
                              fontSize: '11px',
                              fontWeight: '700',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <XCircle size={12} /> Cancel
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

        {/* Search & Filter Controls */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '10px',
          padding: '16px 20px',
          border: '1px solid #E0E0E0',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '14px'
        }}>
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '10px', flex: 1, minWidth: '280px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={16} color="#90A4AE" style={{ position: 'absolute', left: '10px', top: '10px' }} />
              <input
                type="text"
                placeholder="Search by patient, doctor, NIC, or ref..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 34px',
                  border: '1px solid #CFD8DC',
                  borderRadius: '6px',
                  fontSize: '13px',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <button
              type="submit"
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: '#00796B',
                color: '#FFFFFF',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              Search
            </button>
          </form>

          {/* Status Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter size={14} color="#607D8B" />
            <span style={{ fontSize: '12px', color: '#546E7A', fontWeight: '600' }}>Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: '7px 10px',
                borderRadius: '6px',
                border: '1px solid #CFD8DC',
                fontSize: '12px',
                backgroundColor: '#FFFFFF',
                outline: 'none'
              }}
            >
              <option value="ALL">All Statuses</option>
              <option value="Reserved">Reserved</option>
              <option value="Confirmed">Confirmed</option>
              <option value="InProgress">In Progress</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
              <option value="NoShow">No Show</option>
              <option value="PendingPayment">Pending Payment</option>
            </select>
          </div>
        </div>

        {/* Appointments Table */}
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #E0E0E0',
          overflow: 'hidden',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569', fontSize: '11px', textTransform: 'uppercase' }}>
                <th style={{ padding: '12px 14px' }}>Queue #</th>
                <th style={{ padding: '12px 14px' }}>Ref / Date</th>
                <th style={{ padding: '12px 14px' }}>Doctor</th>
                <th style={{ padding: '12px 14px' }}>Patient Details</th>
                <th style={{ padding: '12px 14px' }}>Booking & Pay</th>
                <th style={{ padding: '12px 14px' }}>Arrival Status</th>
                <th style={{ padding: '12px 14px' }}>Queue Status</th>
                <th style={{ padding: '12px 14px' }}>Appt Status</th>
                <th style={{ padding: '12px 14px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: '#78909C' }}>
                    <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 8px auto' }} />
                    Loading operations queue...
                  </td>
                </tr>
              ) : appointments.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: '#78909C' }}>
                    No appointments matching the specified filter.
                  </td>
                </tr>
              ) : (
                appointments.map(apt => {
                  const isReserved = apt.status === 'Reserved';
                  const isConfirmed = apt.status === 'Confirmed';
                  const isInProgress = apt.status === 'InProgress';
                  const isCompleted = apt.status === 'Completed';
                  const isCancelled = apt.status === 'Cancelled' || apt.status === 'NoShow';

                  const badgeBg = isReserved ? '#FEF3C7' : isConfirmed ? '#DCFCE7' : isInProgress ? '#FFEDD5' : isCompleted ? '#E0F2FE' : '#FEE2E2';
                  const badgeColor = isReserved ? '#B45309' : isConfirmed ? '#15803D' : isInProgress ? '#C2410C' : isCompleted ? '#0369A1' : '#B91C1C';

                  const arrivalBg = apt.arrivalStatus === 'OnTime' ? '#DCFCE7' : apt.arrivalStatus === 'Early' ? '#DBEAFE' : apt.arrivalStatus === 'Late' ? '#FEE2E2' : '#F1F5F9';
                  const arrivalColor = apt.arrivalStatus === 'OnTime' ? '#166534' : apt.arrivalStatus === 'Early' ? '#1E40AF' : apt.arrivalStatus === 'Late' ? '#991B1B' : '#64748B';

                  const queueBg = apt.queueStatus === 'InConsultation' ? '#FEF08A' : apt.queueStatus === 'Waiting' ? '#E0F2FE' : apt.queueStatus === 'Completed' ? '#DCFCE7' : '#F1F5F9';
                  const queueColor = apt.queueStatus === 'InConsultation' ? '#854D0E' : apt.queueStatus === 'Waiting' ? '#0369A1' : apt.queueStatus === 'Completed' ? '#166534' : '#64748B';

                  return (
                    <tr key={apt.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          backgroundColor: '#E0F2F1',
                          color: '#004D40',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          fontWeight: '800',
                          fontSize: '12px'
                        }}>
                          #{String(apt.queueNumber).padStart(2, '0')}
                        </span>
                      </td>

                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: '700', color: '#1E293B' }}>{apt.appointmentNumber}</div>
                        <div style={{ fontSize: '11px', color: '#64748B' }}>{apt.appointmentDate} at {apt.timeSlot}</div>
                        <div style={{ fontSize: '10px', color: '#94A3B8' }}>ID: {apt.id}</div>
                      </td>

                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: '700', color: '#004D40' }}>{apt.doctorName}</div>
                        <div style={{ fontSize: '11px', color: '#64748B' }}>{apt.specialization} ({apt.hospitalBranch})</div>
                      </td>

                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: '700', color: '#1E293B' }}>{apt.patientName}</div>
                        <div style={{ fontSize: '11px', color: '#64748B' }}>
                          NIC: {apt.patientNic} | {apt.patientPhone}
                        </div>
                      </td>

                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: '700', color: '#004D40' }}>LKR {apt.totalAmount.toLocaleString()}</div>
                        <span style={{
                          fontSize: '10px',
                          fontWeight: '800',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          backgroundColor: apt.bookingType === 'Reservation' ? '#FEF9C3' : '#E0F2FE',
                          color: apt.bookingType === 'Reservation' ? '#854D0E' : '#0369A1'
                        }}>
                          {apt.bookingType || 'Online'} • {apt.paymentStatus}
                        </span>
                      </td>

                      {/* Arrival Status */}
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          backgroundColor: arrivalBg,
                          color: arrivalColor,
                          fontSize: '11px',
                          fontWeight: '700',
                          padding: '2px 8px',
                          borderRadius: '10px'
                        }}>
                          {apt.arrivalStatus || 'Pending'}
                        </span>
                      </td>

                      {/* Queue Status */}
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          backgroundColor: queueBg,
                          color: queueColor,
                          fontSize: '11px',
                          fontWeight: '700',
                          padding: '2px 8px',
                          borderRadius: '10px'
                        }}>
                          {apt.queueStatus || 'Waiting'}
                        </span>
                      </td>

                      {/* Appointment Status */}
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          backgroundColor: badgeBg,
                          color: badgeColor,
                          fontSize: '11px',
                          fontWeight: '800',
                          padding: '3px 8px',
                          borderRadius: '12px'
                        }}>
                          {apt.status}
                        </span>
                      </td>

                      <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                          {/* Fast Check-In button using apt.qrToken */}
                          {(!apt.checkedInAt || apt.arrivalStatus === 'Pending') && !isCompleted && !isCancelled && (
                            <button
                              onClick={() => handleCheckIn(apt.id, apt.qrToken)}
                              disabled={actionLoading}
                              title="Check in patient at desk"
                              style={{
                                padding: '4px 8px',
                                borderRadius: '4px',
                                border: '1px solid #00796B',
                                backgroundColor: '#E0F2F1',
                                color: '#004D40',
                                fontSize: '11px',
                                fontWeight: '700',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px'
                              }}
                            >
                              <UserCheck size={12} /> Check-In
                            </button>
                          )}

                          {/* QR Code Action */}
                          <button
                            onClick={() => setSelectedQrApt(apt)}
                            title="Verify Check-in QR"
                            style={{
                              padding: '5px',
                              borderRadius: '4px',
                              border: '1px solid #CFD8DC',
                              backgroundColor: '#FFFFFF',
                              cursor: 'pointer',
                              color: '#00796B'
                            }}
                          >
                            <QrCode size={14} />
                          </button>

                          {/* Quick Status Workflow Action */}
                          {isInProgress && (
                            <button
                              onClick={() => handleStatusChange(apt.id, 'Completed')}
                              disabled={actionLoading}
                              style={{
                                padding: '4px 8px',
                                borderRadius: '4px',
                                border: 'none',
                                backgroundColor: '#15803D',
                                color: '#FFFFFF',
                                fontSize: '11px',
                                fontWeight: '700',
                                cursor: 'pointer'
                              }}
                            >
                              Complete
                            </button>
                          )}

                          {!isCompleted && !isCancelled && (
                            <button
                              onClick={() => handleStatusChange(apt.id, 'NoShow')}
                              disabled={actionLoading}
                              title="Mark No Show"
                              style={{
                                padding: '4px 8px',
                                borderRadius: '4px',
                                border: '1px solid #FCA5A5',
                                backgroundColor: '#FEF2F2',
                                color: '#B91C1C',
                                fontSize: '11px',
                                fontWeight: '700',
                                cursor: 'pointer'
                              }}
                            >
                              No-Show
                            </button>
                          )}

                          <button
                            onClick={() => handleDelete(apt.id)}
                            disabled={actionLoading}
                            title="Delete"
                            style={{
                              padding: '5px',
                              borderRadius: '4px',
                              border: 'none',
                              backgroundColor: '#FEE2E2',
                              color: '#DC2626',
                              cursor: 'pointer'
                            }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
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
              Ref: {selectedQrApt.appointmentNumber} • Queue #{String(selectedQrApt.queueNumber).padStart(2, '0')}
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
                onClick={() => {
                  handleCheckIn(selectedQrApt.id, selectedQrApt.qrToken);
                  setSelectedQrApt(null);
                }}
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
    </div>
  );
};

export default DoctorAppointmentsAdmin;
