import React, { useState } from 'react';
import RoleSelector from './components/RoleSelector';
import ConsultantPortal from './roles/ConsultantPortal';
import LaboratorianPortal from './roles/LaboratorianPortal';
import PharmacistPortal from './roles/PharmacistPortal';
import AdminPortalDashboard from './roles/AdminPortalDashboard';
import { LogOut, UserCheck, ShieldCheck, HeartPulse } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AdminPortal() {
  const [staffSession, setStaffSession] = useState(null);

  const handleLogin = (session) => {
    setStaffSession(session);
  };

  const handleLogout = () => {
    setStaffSession(null);
  };

  if (!staffSession) {
    return <RoleSelector onLogin={handleLogin} />;
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      {/* Top Staff Navigation Header */}
      <header style={{
        backgroundColor: '#095e51',
        color: '#ffffff',
        padding: '16px 32px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            backgroundColor: staffSession.accentColor,
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff'
          }}>
            <HeartPulse size={20} />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Health Bridge Staff Portal</h2>
              <span style={{ fontSize: '0.75rem', backgroundColor: staffSession.accentColor, color: '#ffffff', fontWeight: 700, padding: '2px 10px', borderRadius: '12px' }}>
                {staffSession.role.toUpperCase()}
              </span>
            </div>
            <span style={{ fontSize: '0.8rem', color: '#a8d5ce' }}>Staff ID: <strong>{staffSession.staffId}</strong></span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link to="/emr/overview" style={{ color: '#b2ddd6', textDecoration: 'none', fontSize: '0.88rem', fontWeight: 600 }}>
            View Patient Portal →
          </Link>

          <button
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: 'rgba(255,255,255,0.12)',
              color: '#ffffff',
              border: '1px solid rgba(255,255,255,0.2)',
              padding: '8px 16px',
              borderRadius: '10px',
              cursor: 'pointer',
              fontSize: '0.88rem',
              fontWeight: 600,
              transition: 'background 0.2s'
            }}
          >
            <LogOut size={16} /> Switch Role / Logout
          </button>
        </div>
      </header>

      {/* Main Staff Role Workspace */}
      <main style={{ padding: '36px', maxWidth: '1200px', margin: '0 auto' }}>
        {staffSession.role === 'Consultant' && <ConsultantPortal staffSession={staffSession} />}
        {staffSession.role === 'Laboratorian' && <LaboratorianPortal staffSession={staffSession} />}
        {staffSession.role === 'Pharmacist' && <PharmacistPortal staffSession={staffSession} />}
        {staffSession.role === 'Admin' && <AdminPortalDashboard staffSession={staffSession} />}
      </main>
    </div>
  );
}
