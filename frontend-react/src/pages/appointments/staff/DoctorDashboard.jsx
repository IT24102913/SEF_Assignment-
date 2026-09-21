import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import {
  getDoctors, getDoctorQueue, updateAppointmentStatus
} from '../../../api/doctorApi';
import logoImage from '../../../assets/mediz.png';
import {
  Stethoscope, User, Calendar, Clock, CheckCircle2,
  AlertCircle, RefreshCw, LogOut, ChevronRight, Activity,
  Phone, FileText, Check, ShieldCheck, UserCheck, Play
} from 'lucide-react';

const DoctorDashboard = () => {
  const { user, logout } = useAuth();

  const [allDoctors, setAllDoctors] = useState([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState(null);
  const [currentDoctor, setCurrentDoctor] = useState(null);

  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [notesModalApt, setNotesModalApt] = useState(null);
  const [consultationNotes, setConsultationNotes] = useState('');
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3500);
  };

  useEffect(() => {
    initDoctors();
  }, []);

  useEffect(() => {
    if (selectedDoctorId) {
      fetchQueue(selectedDoctorId);
    }
  }, [selectedDoctorId]);

  const initDoctors = async () => {
    setLoading(true);
    try {
      const res = await getDoctors();
      if (Array.isArray(res.data) && res.data.length > 0) {
        setAllDoctors(res.data);

        // Try to match logged-in user email or default to first doctor
        const matched = res.data.find(d =>
          (d.email && user?.email && d.email.toLowerCase() === user.email.toLowerCase()) ||
          (user?.fullName && d.fullName.toLowerCase().includes(user.fullName.toLowerCase()))
        ) || res.data[0];

        setSelectedDoctorId(matched.id);
        setCurrentDoctor(matched);
      }
    } catch (err) {
      console.error('Failed to load doctors list', err);
      showToast('Error loading doctor profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDoctorChange = (e) => {
    const docId = parseInt(e.target.value, 10);
    setSelectedDoctorId(docId);
    const doc = allDoctors.find(d => d.id === docId);
    setCurrentDoctor(doc || null);
  };

  const fetchQueue = async (docId) => {
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

  const handleStatusChange = async (aptId, newStatus, notes = '') => {
    setActionLoading(true);
    try {
      await updateAppointmentStatus(aptId, newStatus, notes);
      showToast(`Patient status updated: ${newStatus}`, 'success');
      fetchQueue(selectedDoctorId);
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

  // KPIs
  const waitingCount = queue.filter(a => a.status === 'Confirmed').length;
  const inProgressCount = queue.filter(a => a.status === 'InProgress').length;
  const completedCount = queue.filter(a => a.status === 'Completed').length;

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <img src={logoImage} alt="Logo" style={{ height: '36px' }} />
          <div>
            <h1 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#004D40' }}>
              Doctor Consultation Portal
            </h1>
            <p style={{ margin: 0, fontSize: '11px', color: '#64748B' }}>
              Real-time patient queue, clinical notes, and session workflow
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Doctor Switcher for Viva Evaluation Demo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748B' }}>CONSULTANT:</span>
            <select
              value={selectedDoctorId || ''}
              onChange={handleSelectDoctorChange}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                fontSize: '12px',
                fontWeight: '700',
                color: '#004D40',
                backgroundColor: '#F0FDF4',
                outline: 'none'
              }}
            >
              {allDoctors.map(d => (
                <option key={d.id} value={d.id}>
                  {d.fullName} ({d.specialization})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => fetchQueue(selectedDoctorId)}
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

        {/* Doctor Identity Banner */}
        {currentDoctor && (
          <div style={{
            background: 'linear-gradient(90deg, #004D40 0%, #00796B 100%)',
            color: '#FFFFFF',
            borderRadius: '14px',
            padding: '20px 24px',
            marginBottom: '24px',
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
                    {currentDoctor.hospitalBranch}
                  </span>
                </div>
                <h2 style={{ margin: '4px 0', fontSize: '20px', fontWeight: '900' }}>
                  {currentDoctor.fullName}
                </h2>
                <div style={{ fontSize: '12px', color: '#E0F2F1' }}>
                  {currentDoctor.qualifications} • Room: {currentDoctor.roomNumber} • Fee: LKR {currentDoctor.consultationFee.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Availability Badge */}
            <div style={{ textAlign: 'right' }}>
              <span style={{
                backgroundColor: '#DCFCE7',
                color: '#15803D',
                fontSize: '12px',
                fontWeight: '800',
                padding: '6px 14px',
                borderRadius: '20px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22C55E' }} />
                On Duty / Active
              </span>
            </div>
          </div>
        )}

        {/* KPIs Bar */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '14px',
          marginBottom: '24px'
        }}>
          {[
            { label: 'TOTAL IN QUEUE', count: queue.length, bg: '#F1F5F9', color: '#334155' },
            { label: 'WAITING (CONFIRMED)', count: waitingCount, bg: '#E0F2FE', color: '#0284C7' },
            { label: 'IN CONSULTATION', count: inProgressCount, bg: '#FFEDD5', color: '#C2410C' },
            { label: 'COMPLETED TODAY', count: completedCount, bg: '#DCFCE7', color: '#15803D' }
          ].map((kpi, idx) => (
            <div key={idx} style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '10px',
              padding: '14px 20px',
              border: '1px solid #E2E8F0',
              borderLeft: `4px solid ${kpi.color}`
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#004D40' }}>
              Patient Consultation Queue
            </h3>
            <span style={{ fontSize: '12px', color: '#64748B' }}>
              Sorted by session queue order
            </span>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#00796B' }}>
              <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 10px auto' }} />
              <p>Loading patient appointments...</p>
            </div>
          ) : queue.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '50px 20px', color: '#64748B' }}>
              <UserCheck size={40} color="#94A3B8" style={{ margin: '0 auto 10px auto' }} />
              <h4 style={{ margin: '0 0 6px 0', color: '#334155' }}>No patients scheduled</h4>
              <p style={{ margin: 0, fontSize: '13px' }}>
                All channeling appointments for this consultant have been completed or none are scheduled.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {queue.map(apt => {
                const isConfirmed = apt.status === 'Confirmed';
                const isInProgress = apt.status === 'InProgress';
                const isCompleted = apt.status === 'Completed';

                return (
                  <div
                    key={apt.id}
                    style={{
                      backgroundColor: isInProgress ? '#FEFCE8' : '#FFFFFF',
                      borderRadius: '10px',
                      border: isInProgress ? '2px solid #EAB308' : '1px solid #E2E8F0',
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
                        backgroundColor: isInProgress ? '#FEF08A' : '#E0F2F1',
                        color: isInProgress ? '#854D0E' : '#004D40',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '16px',
                        fontWeight: '900'
                      }}>
                        #{String(apt.queueNumber).padStart(2, '0')}
                      </div>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                          <span style={{
                            backgroundColor: isConfirmed ? '#DCFCE7' : isInProgress ? '#FEF08A' : isCompleted ? '#E0F2FE' : '#FEE2E2',
                            color: isConfirmed ? '#15803D' : isInProgress ? '#854D0E' : isCompleted ? '#0369A1' : '#B91C1C',
                            fontSize: '10px',
                            fontWeight: '800',
                            padding: '2px 6px',
                            borderRadius: '4px'
                          }}>
                            {apt.status}
                          </span>
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
                      {isConfirmed && (
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

                      {!isCompleted && (
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
