import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, FlaskConical, CalendarCheck, ClipboardList, 
  TestTube, LogOut, ArrowLeft, ShieldCheck, Sparkles 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { to: '/laboratory/dashboard', altTo: '/admin/lab', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/laboratory/pending', altTo: '/pending', icon: ClipboardList, label: 'Pending Approvals' },
  { to: '/laboratory/pending-tests', altTo: '/pending-tests', icon: FlaskConical, label: 'Pending Tests' },
  { to: '/laboratory/bookings', altTo: '/bookings', icon: CalendarCheck, label: 'All Bookings' },
  { to: '/laboratory/tests', altTo: '/tests', icon: TestTube, label: 'Test Catalogue' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <h2>🧪 LabSystem</h2>
          <span style={{ 
            fontSize: '10px', 
            fontWeight: 800, 
            background: 'rgba(0, 137, 123, 0.15)', 
            color: 'var(--primary-dark)', 
            padding: '2px 6px', 
            borderRadius: '4px' 
          }}>
            MEDIX LAB
          </span>
        </div>
        <p>Lab Technician Portal</p>
      </div>

      <div style={{ padding: '0 16px 12px' }}>
        <button
          onClick={() => navigate('/admin/dashboard')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            width: '100%',
            padding: '8px 12px',
            borderRadius: 8,
            border: '1px solid var(--border)',
            background: 'var(--bg-card2)',
            color: 'var(--text)',
            cursor: 'pointer',
            fontSize: 12.5,
            fontWeight: 600,
            transition: 'all 0.2s'
          }}
          title="Return to Main Admin Dashboard"
        >
          <ArrowLeft size={14} /> Main Dashboard
        </button>
      </div>

      <nav style={{ flex: 1 }}>
        {navItems.map(({ to, altTo, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => {
              const currentPath = window.location.pathname;
              const isItemActive = isActive || currentPath === to || currentPath === altTo;
              return `nav-item ${isItemActive ? 'active' : ''}`;
            }}
          >
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, color: 'var(--primary-dark)' }}>
          <Sparkles size={13} color="var(--primary)" />
          <span style={{ fontSize: '11px', fontWeight: 700 }}>Gemini AI Active</span>
        </div>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Logged in as</p>
        <p style={{ fontSize: '14px', fontWeight: 600, marginBottom: 12, color: 'var(--text)' }}>
          {user?.fullName || user?.name || 'Staff User'}
        </p>
        <button
          id="logout-btn"
          onClick={handleLogout}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            width: '100%',
            padding: '8px 12px',
            borderRadius: 8,
            border: '1px solid rgba(239,68,68,0.3)',
            background: 'rgba(239,68,68,0.08)',
            color: '#ef4444',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 600,
            transition: 'all 0.2s'
          }}
        >
          <LogOut size={15} /> Sign Out
        </button>
      </div>
    </aside>
  );
}
