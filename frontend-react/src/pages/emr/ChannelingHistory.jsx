import React, { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, CalendarX, Loader } from 'lucide-react';

const API_BASE = 'http://localhost:5238/api';

export default function ChannelingHistory() {
  const storedUser = JSON.parse(localStorage.getItem('hb_user') || '{}');
  const patientCode = storedUser.patientCode || 'PAT-1001';

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAppointments();
  }, [patientCode]);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/emr/channeling-appointments?patientCode=${patientCode}`);
      if (res.ok) {
        const data = await res.json();
        setAppointments(data.map(a => ({
          id: a.appointmentCode || a.id,
          doctor: a.doctorName,
          specialty: a.specialty,
          date: a.formattedDate || new Date(a.appointmentDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          time: a.formattedTime || new Date(a.appointmentDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          room: a.room,
          status: a.status
        })));
      } else {
        // Fallback for demo PAT-1001 if API fails
        if (patientCode === 'PAT-1001') {
          setAppointments([
            { id: 'APT-3011', doctor: 'Dr. Sarah Jenkins', specialty: 'Cardiologist', date: 'Aug 24, 2026', time: '10:30 AM', room: 'Room 304, West Wing', status: 'Upcoming' },
            { id: 'APT-2890', doctor: 'Dr. Michael Chang', specialty: 'General Practitioner', date: 'Jul 22, 2026', time: '02:00 PM', room: 'Room 108, Main Clinic', status: 'Completed' }
          ]);
        } else {
          setAppointments([]);
        }
      }
    } catch {
      if (patientCode === 'PAT-1001') {
        setAppointments([
          { id: 'APT-3011', doctor: 'Dr. Sarah Jenkins', specialty: 'Cardiologist', date: 'Aug 24, 2026', time: '10:30 AM', room: 'Room 304, West Wing', status: 'Upcoming' },
          { id: 'APT-2890', doctor: 'Dr. Michael Chang', specialty: 'General Practitioner', date: 'Jul 22, 2026', time: '02:00 PM', room: 'Room 108, Main Clinic', status: 'Completed' }
        ]);
      } else {
        setAppointments([]);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
          Doctor Channeling History
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.92rem' }}>
          Review your appointment history, upcoming channeling sessions, and clinic details.
        </p>
      </div>

      {loading ? (
        <div style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>
          <Loader size={32} className="animate-spin" style={{ margin: '0 auto 12px' }} />
          <p>Loading your appointments...</p>
        </div>
      ) : appointments.length === 0 ? (
        <div style={{
          backgroundColor: '#ffffff',
          border: '2px dashed #cbd5e1',
          borderRadius: '16px',
          padding: '48px 24px',
          textAlign: 'center',
          color: '#94a3b8'
        }}>
          <CalendarX size={44} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>No Channeling Appointments Found</h3>
          <p style={{ fontSize: '0.9rem', maxWidth: '420px', margin: '0 auto' }}>
            You do not have any upcoming or past doctor channeling sessions booked on your patient account.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {appointments.map((apt) => (
            <div key={apt.id} style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '14px',
              padding: '24px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#0f172a' }}>{apt.doctor}</h3>
                  <span style={{ fontSize: '0.85rem', color: '#2563eb', fontWeight: 500 }}>{apt.specialty}</span>
                </div>
                
                <span style={{
                  backgroundColor: apt.status === 'Upcoming' ? '#fff7ed' : '#f1f5f9',
                  color: apt.status === 'Upcoming' ? '#c2410c' : '#64748b',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  padding: '4px 12px',
                  borderRadius: '20px'
                }}>
                  {apt.status}
                </span>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                gap: '16px',
                paddingTop: '16px',
                borderTop: '1px solid #f1f5f9'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#475569', fontSize: '0.85rem' }}>
                  <Calendar size={16} color="#64748b" />
                  <span>{apt.date}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#475569', fontSize: '0.85rem' }}>
                  <Clock size={16} color="#64748b" />
                  <span>{apt.time}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#475569', fontSize: '0.85rem' }}>
                  <MapPin size={16} color="#64748b" />
                  <span>{apt.room}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
