import React, { useState, useRef, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
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
  Activity,
  CheckCheck,
  Sparkles,
  X,
  Trash2,
  ArrowLeft
} from 'lucide-react';
import EmrFooter from './EmrFooter';
import { emrApi } from '../../api/emrApi';
import { getDashboardPath } from '../../utils/navigation';

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
  const location = useLocation();
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef(null);

  // Explicitly remove footer from requested EMR sub-pages
  const noFooterPaths = [
    '/emr/consultation-notes',
    '/emr/lab-reports',
    '/emr/pharmacy',
    '/emr/channeling-history',
    '/emr/ai-insights',
    '/emr/ai-advisor'
  ];
  const hideFooter = noFooterPaths.some(path => location.pathname.startsWith(path));

  // Support both Medix sessionStorage and EMR localStorage
  const rawUser = sessionStorage.getItem('user') || localStorage.getItem('hb_user') || localStorage.getItem('user') || '{}';
  const storedUser = JSON.parse(rawUser);
  const userName   = storedUser.fullName || storedUser.name || 'Patient';
  const patientCode = storedUser.patientCode || '';

  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    fetchLiveNotifications();
  }, [storedUser.id, storedUser.role]);

  const getDismissedNotifKey = () => `emr_dismissed_notifs_${storedUser.id || storedUser.email || 'guest'}`;

  const fetchLiveNotifications = async () => {
    try {
      const data = await emrApi.getMyNotifications();
      const dismissed = JSON.parse(localStorage.getItem(getDismissedNotifKey()) || '[]');
      if (Array.isArray(data)) {
        setNotifications(data.filter(n => !dismissed.includes(n.id)));
      } else {
        setNotifications([]);
      }
    } catch {
      setNotifications([]);
    }
  };

  const dismissNotification = (id, e) => {
    if (e) e.stopPropagation();
    const dismissed = JSON.parse(localStorage.getItem(getDismissedNotifKey()) || '[]');
    if (!dismissed.includes(id)) {
      dismissed.push(id);
      localStorage.setItem(getDismissedNotifKey(), JSON.stringify(dismissed));
    }
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAllNotifications = (e) => {
    if (e) e.stopPropagation();
    const dismissed = JSON.parse(localStorage.getItem(getDismissedNotifKey()) || '[]');
    notifications.forEach(n => {
      if (!dismissed.includes(n.id)) dismissed.push(n.id);
    });
    localStorage.setItem(getDismissedNotifKey(), JSON.stringify(dismissed));
    setNotifications([]);
  };

  const handleLogout = () => {
    localStorage.removeItem('hb_token');
    localStorage.removeItem('hb_user');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
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
    { name: 'AI Health Advisor',  path: '/emr/ai-insights',        icon: Sparkles, badge: 'Agentic AI' },
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
          <Link
            to={getDashboardPath(storedUser)}
            className="cursor-pointer"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '0 8px 32px 8px',
              textDecoration: 'none',
              cursor: 'pointer',
              transition: 'opacity 0.2s ease, transform 0.2s ease'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9'; e.currentTarget.style.transform = 'scale(0.99)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'scale(1)'; }}
            title="Return to Main Dashboard"
          >
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
              <h2 style={{ color: '#ffffff', fontSize: '1.1rem', fontWeight: 800, lineHeight: 1.2, letterSpacing: '-0.3px', margin: 0 }}>
                Health Bridge
              </h2>
              <span style={{ color: T.sidebarText, fontSize: '0.7rem', letterSpacing: '0.8px', textTransform: 'uppercase', fontWeight: 600 }}>
                EMR PORTAL
              </span>
            </div>
          </Link>

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
                  <span style={{ flex: 1 }}>{item.name}</span>
                  {item.badge && (
                    <span style={{
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      backgroundColor: 'rgba(255, 255, 255, 0.2)',
                      color: '#ffffff',
                      padding: '2px 7px',
                      borderRadius: '999px',
                      border: '1px solid rgba(255, 255, 255, 0.35)'
                    }}>
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Bottom Items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderTop: `1px solid ${T.sidebarBorder}`, paddingTop: '14px' }}>
          <Link to="/patient/dashboard" style={{
            display: 'flex', alignItems: 'center', gap: '14px',
            padding: '11px 16px', borderRadius: '10px',
            color: '#a8d5ce', backgroundColor: 'rgba(255,255,255,0.06)',
            textDecoration: 'none', fontWeight: 600, fontSize: '0.92rem',
            border: '1px solid rgba(255,255,255,0.1)'
          }}>
            <ArrowLeft size={19} />
            Back to Main Portal
          </Link>
        </div>
      </aside>

      {/* ─── Main Panel ─────────────────────────────────────────────── */}
      <div className="emr-main">
        {/* Top Bar */}
        <header className="emr-header" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{
              backgroundColor: '#e6f5f2',
              color: '#095e51',
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '0.8rem',
              fontWeight: 700
            }}>
              ID: {patientCode}
            </span>
          </div>

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
                title="Notifications"
              >
                <Bell size={20} color={showNotifications ? T.accent : '#4d7a73'} />
                {notifications.some(n => n.unread) && (
                  <span style={{
                    position: 'absolute', top: '6px', right: '6px',
                    width: '8px', height: '8px',
                    backgroundColor: '#ef4444', borderRadius: '50%',
                    border: '2px solid #ffffff'
                  }} />
                )}
              </button>

              {showNotifications && (
                <div style={{
                  position: 'absolute', top: '50px', right: '0', width: '350px',
                  backgroundColor: '#ffffff', border: `1px solid ${T.headerBorder}`,
                  borderRadius: '16px', boxShadow: '0 12px 30px -5px rgba(0,0,0,0.12)',
                  zIndex: 100, overflow: 'hidden', animation: 'fadeIn 0.2s ease-out'
                }}>
                  <div style={{ padding: '14px 18px', borderBottom: `1px solid ${T.accentBg}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.92rem', color: '#0d2b27' }}>Notifications</span>
                      <span style={{ fontSize: '0.72rem', backgroundColor: T.accentLight, color: T.accent, fontWeight: 700, padding: '2px 8px', borderRadius: '10px' }}>
                        {storedUser.role || 'Patient'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {notifications.some(n => n.unread) && (
                        <button
                          onClick={() => setNotifications(prev => prev.map(x => ({ ...x, unread: false })))}
                          style={{
                            background: 'none', border: 'none', color: T.accent,
                            fontSize: '0.76rem', fontWeight: 600, cursor: 'pointer',
                            display: 'inline-flex', alignItems: 'center', gap: '4px'
                          }}
                          title="Mark all notifications as read"
                        >
                          <CheckCheck size={13} /> Read all
                        </button>
                      )}
                      {notifications.length > 0 && (
                        <button
                          onClick={clearAllNotifications}
                          style={{
                            background: 'none', border: 'none', color: '#ef4444',
                            fontSize: '0.76rem', fontWeight: 600, cursor: 'pointer',
                            display: 'inline-flex', alignItems: 'center', gap: '4px'
                          }}
                          title="Remove all notifications"
                        >
                          <Trash2 size={13} /> Clear all
                        </button>
                      )}
                    </div>
                  </div>

                  <div style={{ maxHeight: '310px', overflowY: 'auto' }}>
                    {notifications.length === 0 ? (
                      <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                        No notifications for your account.
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => {
                            setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, unread: false } : x));
                            if (n.link) {
                              setShowNotifications(false);
                              navigate(n.link);
                            }
                          }}
                          style={{
                            padding: '12px 18px', borderBottom: `1px solid ${T.accentLight}`,
                            fontSize: '0.85rem',
                            backgroundColor: n.unread ? T.accentBg : '#ffffff',
                            cursor: 'pointer',
                            transition: 'background 0.2s'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2px', gap: '8px' }}>
                            <span style={{ fontWeight: 600, color: '#0d2b27' }}>{n.title}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                              {n.unread && <span style={{ width: '7px', height: '7px', backgroundColor: '#10b981', borderRadius: '50%' }} />}
                              <button
                                onClick={(e) => dismissNotification(n.id, e)}
                                title="Remove notification"
                                style={{
                                  background: 'none', border: 'none', padding: '2px',
                                  cursor: 'pointer', color: '#94a3b8', borderRadius: '4px',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                                onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
                              >
                                <X size={14} />
                              </button>
                            </div>
                          </div>
                          <div style={{ color: '#4d7a73', fontSize: '0.8rem', lineHeight: 1.4 }}>{n.message}</div>
                          <div style={{ color: '#94a3b8', fontSize: '0.72rem', marginTop: '4px' }}>{n.time}</div>
                        </div>
                      ))
                    )}
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
                {(userName || 'P').charAt(0).toUpperCase()}
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
          {!hideFooter && <EmrFooter />}
        </main>
      </div>
    </div>
  );
}
