import React from 'react';
import { Calendar, Clock, MapPin } from 'lucide-react';

export default function ChannelingHistory() {
  const appointments = [
    {
      id: 'APT-3011',
      doctor: 'Dr. Sarah Jenkins',
      specialty: 'Cardiologist',
      date: 'Aug 24, 2026',
      time: '10:30 AM',
      room: 'Room 304, West Wing',
      status: 'Upcoming'
    },
    {
      id: 'APT-2890',
      doctor: 'Dr. Michael Chang',
      specialty: 'General Practitioner',
      date: 'Jul 22, 2026',
      time: '02:00 PM',
      room: 'Room 108, Main Clinic',
      status: 'Completed'
    }
  ];

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

            <div style={{ display: 'flex', gap: '24px', color: '#475569', fontSize: '0.88rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={16} color="#64748b" />
                {apt.date}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={16} color="#64748b" />
                {apt.time}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MapPin size={16} color="#64748b" />
                {apt.room}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
