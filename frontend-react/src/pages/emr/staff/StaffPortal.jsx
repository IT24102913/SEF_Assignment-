import React, { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import RoleSelector from './RoleSelector';
import ConsultantPortal from './ConsultantPortal';
import LaboratorianPortal from './LaboratorianPortal';
import PharmacistPortal from './PharmacistPortal';
import AdminPortalDashboard from './AdminPortalDashboard';
import { LogOut, UserCheck, ShieldCheck, HeartPulse } from 'lucide-react';

export default function StaffPortal() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const roleParam = searchParams.get('role');
  const [hasLoggedOut, setHasLoggedOut] = useState(false);

  const createPharmacistSession = (currentUser) => ({
    role: 'Pharmacist',
    staffId: currentUser?.fullName || currentUser?.email || 'PHARM-303',
    roleTitle: 'Pharmacist',
    accentColor: '#9333ea',
    user: currentUser
  });

  const createConsultantSession = (currentUser) => ({
    role: 'Consultant',
    staffId: currentUser?.fullName || currentUser?.email || 'DOC-01',
    roleTitle: 'Consultant (Doctor)',
    accentColor: '#0d7c6b',
    user: currentUser
  });

  const createLaboratorianSession = (currentUser) => ({
    role: 'Laboratorian',
    staffId: currentUser?.fullName || currentUser?.email || 'LAB-01',
    roleTitle: 'Laboratorian (Lab Staff)',
    accentColor: '#16a34a',
    user: currentUser
  });

  const createAdminSession = (currentUser) => ({
    role: 'Admin',
    staffId: currentUser?.fullName || currentUser?.email || 'ADMIN-01',
    roleTitle: 'Hospital Administrator',
    accentColor: '#ea580c',
    user: currentUser
  });

  const resolveInitialSession = (currentUser, targetRole) => {
    if (!currentUser) return null;
    if (targetRole === 'Pharmacist' || currentUser.role === 'Pharmacist') {
      return createPharmacistSession(currentUser);
    }
    if (targetRole === 'Consultant' || targetRole === 'Doctor' || currentUser.role === 'Doctor') {
      return createConsultantSession(currentUser);
    }
    if (targetRole === 'Laboratorian' || targetRole === 'Laboratory' || currentUser.role === 'Laboratory') {
      return createLaboratorianSession(currentUser);
    }
    if (targetRole === 'Admin' || (currentUser.role === 'Admin' && targetRole === 'Admin')) {
      return createAdminSession(currentUser);
    }
    return null;
  };

  const [staffSession, setStaffSession] = useState(() => {
    return resolveInitialSession(user, roleParam);
  });

  useEffect(() => {
    if (!hasLoggedOut && !staffSession && user) {
      const resolved = resolveInitialSession(user, roleParam);
      if (resolved) {
        setStaffSession(resolved);
      }
    }
  }, [roleParam, user, hasLoggedOut]);

  const handleLogin = (session) => {
    setHasLoggedOut(false);
    setStaffSession(session);
  };

  const handleLogout = () => {
    setHasLoggedOut(true);
    setStaffSession(null);
    if (roleParam) {
      setSearchParams({});
    }
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
        <Link
          to="/dashboard"
          style={{ display: 'flex', alignItems: 'center', gap: '16px', textDecoration: 'none', color: '#ffffff', cursor: 'pointer', transition: 'opacity 0.2s ease' }}
          className="cursor-pointer hover:opacity-90 transition-opacity"
          title="Return to Main Dashboard"
        >
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
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>Health Bridge Staff Portal</h2>
              <span style={{ fontSize: '0.75rem', backgroundColor: staffSession.accentColor, color: '#ffffff', fontWeight: 700, padding: '2px 10px', borderRadius: '12px' }}>
                {staffSession.role.toUpperCase()}
              </span>
            </div>
            <span style={{ fontSize: '0.8rem', color: '#a8d5ce' }}>Staff ID: <strong>{staffSession.staffId}</strong></span>
          </div>
        </Link>

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
