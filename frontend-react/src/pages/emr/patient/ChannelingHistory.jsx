import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { emrApi } from '../../../api/emrApi';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  CalendarX, 
  Loader, 
  Search, 
  Activity, 
  CheckCircle2, 
  AlertCircle, 
  Hash, 
  CreditCard, 
  PlusCircle,
  RefreshCw
} from 'lucide-react';

export default function ChannelingHistory() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'Ongoing' | 'Upcoming' | 'Past'
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      let patientCode = '';
      try {
        const rawUser = sessionStorage.getItem('user') || localStorage.getItem('hb_user') || localStorage.getItem('user') || '{}';
        const u = JSON.parse(rawUser);
        if (u.patientCode) patientCode = u.patientCode;
        
        const myPatient = await emrApi.getMyPatient(u.patientCode, u.email);
        if (myPatient && myPatient.patientCode) {
          patientCode = myPatient.patientCode;
        }
      } catch (err) {
        console.warn('Could not retrieve full patient profile, attempting fallback lookup:', err);
      }

      const data = await emrApi.getChannelingAppointments(patientCode);
      const list = Array.isArray(data) ? data : [];

      setAppointments(list.map(a => ({
        id: a.appointmentCode || a.id || `APT-${Math.random()}`,
        appointmentCode: a.appointmentCode || a.id,
        doctor: a.doctorName || 'Doctor',
        specialty: a.specialty || 'General Specialist',
        date: a.formattedDate || (a.appointmentDate ? new Date(a.appointmentDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Scheduled'),
        time: a.timeSlot || a.formattedTime || (a.appointmentDate ? new Date(a.appointmentDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'Flexible'),
        room: a.room || 'Consultation Suite',
        hospitalBranch: a.hospitalBranch || 'Health Bridge Hospital',
        status: a.status || 'Upcoming',
        category: a.category || (a.status === 'Completed' || a.status === 'Cancelled' ? 'Past' : (a.status === 'Ongoing' ? 'Ongoing' : 'Upcoming')),
        queueNumber: a.queueNumber,
        totalAmount: a.totalAmount,
        paymentStatus: a.paymentStatus
      })));
    } catch (err) {
      console.error('Error fetching channeling appointments:', err);
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  // Counts for tabs
  const ongoingCount = appointments.filter(a => a.category?.toLowerCase() === 'ongoing').length;
  const upcomingCount = appointments.filter(a => a.category?.toLowerCase() === 'upcoming').length;
  const pastCount = appointments.filter(a => a.category?.toLowerCase() === 'past').length;

  // Filtered list
  const filteredAppointments = appointments.filter(apt => {
    // Tab filter
    if (activeTab === 'Ongoing' && apt.category?.toLowerCase() !== 'ongoing') return false;
    if (activeTab === 'Upcoming' && apt.category?.toLowerCase() !== 'upcoming') return false;
    if (activeTab === 'Past' && apt.category?.toLowerCase() !== 'past') return false;

    // Search filter
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchDoctor = apt.doctor?.toLowerCase().includes(q);
      const matchSpecialty = apt.specialty?.toLowerCase().includes(q);
      const matchRoom = apt.room?.toLowerCase().includes(q);
      const matchCode = apt.appointmentCode?.toLowerCase().includes(q);
      const matchStatus = apt.status?.toLowerCase().includes(q);
      return matchDoctor || matchSpecialty || matchRoom || matchCode || matchStatus;
    }

    return true;
  });

  const getStatusBadge = (status, category) => {
    const s = (status || '').toLowerCase();
    const c = (category || '').toLowerCase();

    if (c === 'ongoing' || s === 'ongoing' || s.includes('consultation')) {
      return (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          backgroundColor: '#ecfdf5',
          color: '#065f46',
          fontSize: '0.8rem',
          fontWeight: 700,
          padding: '4px 12px',
          borderRadius: '9999px',
          border: '1px solid #a7f3d0'
        }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block' }} />
          {status}
        </span>
      );
    }

    if (c === 'upcoming' || s === 'upcoming' || s === 'confirmed') {
      return (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          backgroundColor: '#eff6ff',
          color: '#1e40af',
          fontSize: '0.8rem',
          fontWeight: 600,
          padding: '4px 12px',
          borderRadius: '9999px',
          border: '1px solid #bfdbfe'
        }}>
          <Clock size={12} color="#2563eb" />
          {status}
        </span>
      );
    }

    if (s === 'pending payment' || s === 'pending') {
      return (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          backgroundColor: '#fffbeb',
          color: '#b45309',
          fontSize: '0.8rem',
          fontWeight: 600,
          padding: '4px 12px',
          borderRadius: '9999px',
          border: '1px solid #fde68a'
        }}>
          <AlertCircle size={12} color="#d97706" />
          {status}
        </span>
      );
    }

    if (s === 'cancelled') {
      return (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          backgroundColor: '#fef2f2',
          color: '#991b1b',
          fontSize: '0.8rem',
          fontWeight: 600,
          padding: '4px 12px',
          borderRadius: '9999px',
          border: '1px solid #fecaca'
        }}>
          {status}
        </span>
      );
    }

    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        backgroundColor: '#f1f5f9',
        color: '#475569',
        fontSize: '0.8rem',
        fontWeight: 600,
        padding: '4px 12px',
        borderRadius: '9999px',
        border: '1px solid #e2e8f0'
      }}>
        <CheckCircle2 size={12} color="#64748b" />
        {status}
      </span>
    );
  };

  return (
    <div style={{ maxWidth: '1080px', margin: '0 auto', paddingBottom: '40px' }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start', 
        flexWrap: 'wrap', 
        gap: '16px', 
        marginBottom: '24px' 
      }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', marginBottom: '6px', letterSpacing: '-0.02em' }}>
            Doctor Channeling History
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.95rem' }}>
            All your booked doctor channeling appointments in one place — ongoing sessions, upcoming visits, and past consultations.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={fetchAppointments}
            disabled={loading}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 16px',
              backgroundColor: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '10px',
              color: '#334155',
              fontSize: '0.88rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>

          <Link
            to="/patient/dashboard?tab=channeling"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '9px 18px',
              backgroundColor: '#0d7c6b',
              color: '#ffffff',
              borderRadius: '10px',
              fontSize: '0.88rem',
              fontWeight: 600,
              textDecoration: 'none',
              boxShadow: '0 2px 4px rgba(13, 124, 107, 0.2)'
            }}
          >
            <PlusCircle size={16} />
            Book New Doctor
          </Link>
        </div>
      </div>

      {/* Tabs and Search Bar */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '16px',
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '14px',
        padding: '12px 18px',
        marginBottom: '20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
      }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {[
            { key: 'ALL', label: 'All Appointments', count: appointments.length },
            { key: 'Ongoing', label: 'Ongoing', count: ongoingCount, dot: ongoingCount > 0 },
            { key: 'Upcoming', label: 'Upcoming', count: upcomingCount },
            { key: 'Past', label: 'Past', count: pastCount }
          ].map(tab => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '7px 14px',
                  borderRadius: '8px',
                  fontSize: '0.88rem',
                  fontWeight: isActive ? 700 : 500,
                  backgroundColor: isActive ? '#0d7c6b' : 'transparent',
                  color: isActive ? '#ffffff' : '#64748b',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {tab.dot && (
                  <span style={{ 
                    width: '7px', 
                    height: '7px', 
                    borderRadius: '50%', 
                    backgroundColor: isActive ? '#ffffff' : '#10b981' 
                  }} />
                )}
                {tab.label}
                <span style={{
                  backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : '#f1f5f9',
                  color: isActive ? '#ffffff' : '#475569',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: '2px 7px',
                  borderRadius: '9999px'
                }}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div style={{ position: 'relative', minWidth: '240px', flex: '1 1 200px', maxWidth: '340px' }}>
          <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search doctor, specialty, code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 36px',
              fontSize: '0.88rem',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              outline: 'none',
              backgroundColor: '#f8fafc',
              boxSizing: 'border-box'
            }}
          />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ padding: '64px', textAlign: 'center', color: '#64748b' }}>
          <Loader size={36} className="animate-spin" style={{ margin: '0 auto 16px', color: '#0d7c6b' }} />
          <p style={{ fontWeight: 600, fontSize: '0.98rem' }}>Loading your channeling appointments...</p>
        </div>
      ) : filteredAppointments.length === 0 ? (
        <div style={{
          backgroundColor: '#ffffff',
          border: '2px dashed #cbd5e1',
          borderRadius: '16px',
          padding: '56px 24px',
          textAlign: 'center',
          color: '#94a3b8'
        }}>
          <CalendarX size={48} style={{ margin: '0 auto 14px', opacity: 0.6, color: '#0d7c6b' }} />
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
            No Channeling Appointments Found
          </h3>
          <p style={{ fontSize: '0.92rem', maxWidth: '440px', margin: '0 auto 20px', color: '#64748b' }}>
            {searchTerm 
              ? `No appointments matched "${searchTerm}". Try another search term or reset filters.`
              : activeTab !== 'ALL'
              ? `You currently do not have any ${activeTab.toLowerCase()} doctor channeling appointments.`
              : 'You do not have any channeling appointments booked yet. Discover top medical specialists and book your consultation in seconds.'}
          </p>
          <Link
            to="/patient/dashboard?tab=channeling"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 22px',
              backgroundColor: '#0d7c6b',
              color: '#ffffff',
              borderRadius: '10px',
              fontSize: '0.92rem',
              fontWeight: 600,
              textDecoration: 'none'
            }}
          >
            <PlusCircle size={16} />
            Book Your First Appointment
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredAppointments.map((apt) => (
            <div 
              key={apt.id} 
              style={{
                backgroundColor: '#ffffff',
                border: apt.category?.toLowerCase() === 'ongoing' ? '1.5px solid #10b981' : '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '24px',
                boxShadow: apt.category?.toLowerCase() === 'ongoing' 
                  ? '0 4px 12px rgba(16, 185, 129, 0.1)' 
                  : '0 1px 3px rgba(0,0,0,0.02)',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease'
              }}
            >
              {/* Header row inside card */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                      {apt.doctor}
                    </h3>
                    {apt.queueNumber && (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '2px',
                        backgroundColor: '#f1f5f9',
                        color: '#0f766e',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        padding: '2px 8px',
                        fontSize: '0.78rem',
                        fontWeight: 700
                      }}>
                        <Hash size={12} /> Queue #{apt.queueNumber}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.9rem', color: '#0d7c6b', fontWeight: 600 }}>
                      {apt.specialty}
                    </span>
                    <span style={{ color: '#cbd5e1' }}>•</span>
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontFamily: 'monospace' }}>
                      Ref: {apt.appointmentCode}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {getStatusBadge(apt.status, apt.category)}
                </div>
              </div>

              {/* Grid details */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '14px',
                paddingTop: '16px',
                borderTop: '1px solid #f1f5f9'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#334155', fontSize: '0.88rem' }}>
                  <Calendar size={17} color="#0d7c6b" />
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Date</div>
                    <div style={{ fontWeight: 600 }}>{apt.date}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#334155', fontSize: '0.88rem' }}>
                  <Clock size={17} color="#0d7c6b" />
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Time Slot</div>
                    <div style={{ fontWeight: 600 }}>{apt.time}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#334155', fontSize: '0.88rem' }}>
                  <MapPin size={17} color="#0d7c6b" />
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Location & Room</div>
                    <div style={{ fontWeight: 600 }}>{apt.room}</div>
                  </div>
                </div>

                {apt.totalAmount != null && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#334155', fontSize: '0.88rem' }}>
                    <CreditCard size={17} color="#0d7c6b" />
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Payment</div>
                      <div style={{ fontWeight: 600 }}>
                        LKR {Number(apt.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        {apt.paymentStatus && (
                          <span style={{ 
                            marginLeft: '6px', 
                            fontSize: '0.75rem', 
                            color: apt.paymentStatus === 'Paid' ? '#059669' : '#d97706',
                            fontWeight: 700 
                          }}>
                            ({apt.paymentStatus})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
