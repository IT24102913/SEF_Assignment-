import React, { useState, useRef, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom';
import { 
  LayoutGrid,
  ShieldCheck,
  FileText, 
  Microscope, 
  Pill, 
  Calendar, 
  Settings, 
  LogOut, 
  Bell, 
  Activity 
} from 'lucide-react';

// ── Health Bridge brand teal palette
const T = {
  sidebarBg:      '#095e51',
  sidebarActive:  '#0d7c6b',
  sidebarBorder:  'rgba(255,255,255,0.08)',
  sidebarText:    '#a8d5ce',
  sidebarTextOn:  '#ffffff',
  logoBox:        '#0d7c6b',
  accent:         '#0d7c6b',
  accentBg:       '#e6f5f2',
  accentLight:    '#f2faf8',
  notifBadgeBg:   '#e6f5f2',
  notifBadgeTxt:  '#095e51',
  notifDot:       '#0d7c6b',
  headerBorder:   '#cce8e3',
  searchBg:       '#f2faf8',
};

export default function EmrLayout() {
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef(null);

  // Logged-in user from localStorage
  const storedUser = JSON.parse(localStorage.getItem('hb_user') || '{}');
  const userName   = storedUser.name  || 'Patient';
  const patientCode = storedUser.patientCode || 'PAT-1001';

  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (patientCode === 'PAT-1001') {
      setNotifications([
        { id: 1, title: 'Lab Report Ready',        message: 'Complete Blood Count (CBC) test results uploaded.',     time: '5 mins ago',  unread: true },
        { id: 2, title: 'Prescription Refilled',   message: 'Amoxicillin 500mg processed by Central Pharmacy.',     time: '1 hour ago',  unread: true },
        { id: 3, title: 'Appointment Confirmed',   message: 'Session with Dr. Sarah Jenkins confirmed for Aug 24.', time: '3 hours ago', unread: false },
        { id: 4, title: 'Consultation Note Added', message: 'Dr. Sarah Chen added notes for Stage 1 Hypertension.',  time: '1 day ago',   unread: false },
        { id: 5, title: 'Security Alert',          message: 'Successful portal login from Chrome on Windows.',       time: '2 days ago',  unread: false },
      ]);
    } else {
      setNotifications([
        { id: 'welcome',     title: `Welcome, ${userName}!`,     message: `Your Health Bridge medical records under ID ${patientCode} are now initialized.`, time: 'Just now',  unread: true },
        { id: 'profile-tip', title: 'Complete Medical Profile',  message: 'Click your profile to add blood group, allergies, and emergency contacts.',       time: '10m ago',   unread: true },
        { id: 'sec-notice',  title: 'Portal Security Active',   message: 'Your personal health data is encrypted and isolated to your account.',              time: 'Today',     unread: false },
      ]);
    }
  }, [patientCode, userName]);

  const handleLogout = () => {
    localStorage.removeItem('hb_token');
    localStorage.removeItem('hb_user');
    navigate('/login', { replace: true });
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navItems = [
    { name: 'Overview',           path: '/emr/overview',           icon: LayoutGrid },
    { name: 'Consultation Notes', path: '/emr/consultation-notes', icon: FileText },
    { name: 'Lab Reports',        path: '/emr/lab-reports',        icon: Microscope },
    { name: 'Pharmacy',           path: '/emr/pharmacy',           icon: Pill },
    { name: 'Channeling History', path: '/emr/channeling-history', icon: Calendar },
  ];

  return (
    <div className="emr-container">
      {/* ─── Teal Sidebar ───────────────────────────────────────────── */}
      <aside className="emr-sidebar">
        <div>
          {/* Brand Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '0 8px 32px 8px' }}>
            <div style={{
              width: '38px', height: '38px',
              backgroundColor: T.logoBox,
              borderRadius: '10px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 2px 8px rgba(0,0,0,0.25)'
            }}>
              <Activity size={22} />
            </div>
            <div>
              <h2 style={{ color: '#ffffff', fontSize: '1.1rem', fontWeight: 800, lineHeight: 1.2, letterSpacing: '-0.3px' }}>
                Health Bridge
              </h2>
              <span style={{ color: T.sidebarText, fontSize: '0.7rem', letterSpacing: '0.8px', textTransform: 'uppercase', fontWeight: 600 }}>
                EMR PORTAL
              </span>
            </div>
          </div>

          {/* Nav Links */}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.name}
                  to={item.path}
                  style={({ isActive }) => ({
                    display: 'flex', alignItems: 'center', gap: '14px',
                    padding: '11px 16px',
                    borderRadius: '10px',
                    color: isActive ? T.sidebarTextOn : T.sidebarText,
                    backgroundColor: isActive ? T.sidebarActive : 'transparent',
                    textDecoration: 'none',
                    fontWeight: isActive ? 600 : 500,
                    fontSize: '0.92rem',
                    transition: 'all 0.18s',
                    boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
                  })}
                >
                  <Icon size={19} />
                  {item.name}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Bottom Items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderTop: `1px solid ${T.sidebarBorder}`, paddingTop: '14px' }}>
          <Link to="/admin" style={{
            display: 'flex', alignItems: 'center', gap: '14px',
            padding: '11px 16px', borderRadius: '10px',
            color: '#fbbf24', backgroundColor: 'rgba(251,191,36,0.1)',
            textDecoration: 'none', fontWeight: 600, fontSize: '0.92rem',
            border: '1px solid rgba(251,191,36,0.2)'
          }}>
            <ShieldCheck size={19} />
            Staff &amp; Admin Portal
          </Link>

          <button style={{
            display: 'flex', alignItems: 'center', gap: '14px',
            padding: '11px 16px', borderRadius: '10px',
            color: T.sidebarText, backgroundColor: 'transparent',
            border: 'none', cursor: 'pointer', fontSize: '0.92rem'
          }}>
            <Settings size={19} />
            Settings
          </button>

          <button onClick={handleLogout} style={{
            display: 'flex', alignItems: 'center', gap: '14px',
            padding: '11px 16px', borderRadius: '10px',
            color: '#fca5a5', backgroundColor: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.15)',
            cursor: 'pointer', fontSize: '0.92rem', fontWeight: 600,
          }}>
            <LogOut size={19} />
            Logout
          </button>
        </div>
      </aside>

      {/* ─── Main Panel ─────────────────────────────────────────────── */}
      <div className="emr-main">
        {/* Top Bar */}
        <header className="emr-header" style={{ justifyContent: 'flex-end' }}>
          {/* Right: Bell + Profile */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>

            {/* Notification Bell */}
            <div ref={notificationRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                style={{
                  background: showNotifications ? T.accentBg : 'transparent',
                  border: 'none', borderRadius: '50%', cursor: 'pointer',
                  position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '8px', transition: 'background 0.2s'
                }}
              >
                <Bell size={20} color={showNotifications ? T.accent : '#4d7a73'} />
                <span style={{
                  position: 'absolute', top: '6px', right: '6px',
                  width: '8px', height: '8px',
                  backgroundColor: '#ef4444', borderRadius: '50%'
                }} />
              </button>

              {showNotifications && (
                <div style={{
                  position: 'absolute', top: '50px', right: '0', width: '340px',
                  backgroundColor: '#ffffff', border: `1px solid ${T.headerBorder}`,
                  borderRadius: '16px', boxShadow: '0 12px 30px -5px rgba(0,0,0,0.10)',
                  zIndex: 100, overflow: 'hidden', animation: 'fadeIn 0.2s ease-out'
                }}>
                  <div style={{ padding: '14px 18px', borderBottom: `1px solid ${T.accentBg}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.92rem', color: '#0d2b27' }}>Notifications</span>
                    <span style={{ fontSize: '0.75rem', backgroundColor: T.notifBadgeBg, color: T.notifBadgeTxt, fontWeight: 700, padding: '3px 10px', borderRadius: '12px' }}>
                      {notifications.length} Alerts
                    </span>
                  </div>

                  <div style={{ maxHeight: '310px', overflowY: 'auto' }}>
                    {notifications.map((n) => (
                      <div key={n.id} style={{
                        padding: '12px 18px', borderBottom: `1px solid ${T.accentLight}`,
                        fontSize: '0.85rem',
                        backgroundColor: n.unread ? T.accentBg : '#ffffff',
                        transition: 'background 0.2s'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                          <span style={{ fontWeight: 600, color: '#0d2b27' }}>{n.title}</span>
                          {n.unread && <span style={{ width: '7px', height: '7px', backgroundColor: T.notifDot, borderRadius: '50%' }} />}
                        </div>
                        <div style={{ color: '#4d7a73', fontSize: '0.8rem', lineHeight: 1.4 }}>{n.message}</div>
                        <div style={{ color: '#94a3b8', fontSize: '0.72rem', marginTop: '4px' }}>{n.time}</div>
                      </div>
                    ))}
                  </div>

                  <Link
                    to="/emr/notifications"
                    onClick={() => setShowNotifications(false)}
                    style={{
                      display: 'block', padding: '12px', textAlign: 'center',
                      backgroundColor: T.accentLight, color: T.accent,
                      fontWeight: 600, fontSize: '0.85rem', textDecoration: 'none',
                      borderTop: `1px solid ${T.headerBorder}`, transition: 'background 0.2s'
                    }}
                  >
                    See all notifications →
                  </Link>
                </div>
              )}
            </div>

            <div style={{ height: '24px', width: '1px', backgroundColor: T.headerBorder }} />

            {/* Profile */}
            <Link to="/emr/profile" style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              textDecoration: 'none', color: 'inherit',
              padding: '4px 8px', borderRadius: '8px', transition: 'background-color 0.2s'
            }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '50%',
                background: 'linear-gradient(135deg, #095e51, #0d7c6b)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: `2px solid ${T.headerBorder}`,
                color: '#ffffff', fontWeight: 700, fontSize: '1rem',
                flexShrink: 0,
              }}>
                {userName.charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#0d2b27' }}>{userName}</div>
                <div style={{ fontSize: '0.78rem', color: '#4d7a73' }}>Patient</div>
              </div>
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <main className="emr-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

