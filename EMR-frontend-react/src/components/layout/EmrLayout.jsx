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
  Search, 
  Bell, 
  Activity 
} from 'lucide-react';

export default function EmrLayout() {
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef(null);

  // Close notification dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const navItems = [
    { name: 'Overview', path: '/emr/overview', icon: LayoutGrid },
    { name: 'Consultation Notes', path: '/emr/consultation-notes', icon: FileText },
    { name: 'Lab Reports', path: '/emr/lab-reports', icon: Microscope },
    { name: 'Pharmacy', path: '/emr/pharmacy', icon: Pill },
    { name: 'Channeling History', path: '/emr/channeling-history', icon: Calendar },
  ];

  const recentNotifications = [
    {
      id: 1,
      title: 'Lab Report Ready',
      message: 'Complete Blood Count (CBC) test results uploaded.',
      time: '5 mins ago',
      unread: true
    },
    {
      id: 2,
      title: 'Prescription Refilled',
      message: 'Amoxicillin 500mg processed by Central Pharmacy.',
      time: '1 hour ago',
      unread: true
    },
    {
      id: 3,
      title: 'Appointment Confirmed',
      message: 'Session with Dr. Sarah Jenkins confirmed for Aug 24.',
      time: '3 hours ago',
      unread: false
    },
    {
      id: 4,
      title: 'Consultation Note Added',
      message: 'Dr. Michael Chang added notes for seasonal allergies.',
      time: '1 day ago',
      unread: false
    },
    {
      id: 5,
      title: 'Security Alert',
      message: 'Successful portal login from Chrome on Windows.',
      time: '2 days ago',
      unread: false
    }
  ];

  return (
    <div className="emr-container">
      {/* Dark Sidebar */}
      <aside className="emr-sidebar">
        <div>
          {/* Logo Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '0 8px 32px 8px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              backgroundColor: '#2563eb',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff'
            }}>
              <Activity size={22} />
            </div>
            <div>
              <h2 style={{ color: '#ffffff', fontSize: '1.1rem', fontWeight: 700, lineHeight: 1.2 }}>Aegis Health</h2>
              <span style={{ color: '#6b7280', fontSize: '0.72rem', letterSpacing: '0.5px', textTransform: 'uppercase', fontWeight: 600 }}>EMR PORTAL</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.name}
                  to={item.path}
                  style={({ isActive }) => ({
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    color: isActive ? '#ffffff' : '#9ca3af',
                    backgroundColor: isActive ? '#2563eb' : 'transparent',
                    textDecoration: 'none',
                    fontWeight: isActive ? 600 : 500,
                    fontSize: '0.92rem',
                    transition: 'all 0.2s'
                  })}
                >
                  <Icon size={20} />
                  {item.name}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Bottom Sidebar Items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid #1f2937', paddingTop: '16px' }}>
          {/* Staff Admin Portal Link */}
          <Link to="/admin" style={{
            display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 16px', borderRadius: '10px',
            color: '#f97316', backgroundColor: 'rgba(249,115,22,0.1)', textDecoration: 'none', fontWeight: 600,
            fontSize: '0.92rem', border: '1px solid rgba(249,115,22,0.2)'
          }}>
            <ShieldCheck size={20} />
            Staff & Admin Portal
          </Link>

          <button style={{
            display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 16px', borderRadius: '10px',
            color: '#9ca3af', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.92rem'
          }}>
            <Settings size={20} />
            Settings
          </button>
          
          <button onClick={() => navigate('/')} style={{
            display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 16px', borderRadius: '10px',
            color: '#9ca3af', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.92rem'
          }}>
            <LogOut size={20} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Viewport */}
      <div className="emr-main">
        {/* Top Bar Header */}
        <header className="emr-header">
          {/* Search Bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            backgroundColor: '#f1f5f9',
            padding: '10px 16px',
            borderRadius: '24px',
            width: '360px'
          }}>
            <Search size={18} color="#94a3b8" />
            <input 
              type="text" 
              placeholder="Search patients, records, or labs..." 
              style={{
                border: 'none',
                background: 'transparent',
                outline: 'none',
                width: '100%',
                fontSize: '0.9rem',
                color: '#1e293b'
              }}
            />
          </div>

          {/* User & Notifications */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            {/* Notification Bell Dropdown Container */}
            <div ref={notificationRef} style={{ position: 'relative' }}>
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                style={{
                  background: showNotifications ? '#f1f5f9' : 'transparent',
                  border: 'none',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '8px',
                  transition: 'background 0.2s'
                }}
              >
                <Bell size={20} color={showNotifications ? '#2563eb' : '#64748b'} />
                <span style={{
                  position: 'absolute',
                  top: '6px',
                  right: '6px',
                  width: '8px',
                  height: '8px',
                  backgroundColor: '#ef4444',
                  borderRadius: '50%'
                }}></span>
              </button>

              {/* Notification Overlay Card */}
              {showNotifications && (
                <div style={{
                  position: 'absolute',
                  top: '50px',
                  right: '0',
                  width: '340px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '16px',
                  boxShadow: '0 12px 30px -5px rgba(0, 0, 0, 0.12), 0 4px 12px -2px rgba(0, 0, 0, 0.05)',
                  zIndex: 100,
                  overflow: 'hidden',
                  animation: 'fadeIn 0.2s ease-out'
                }}>
                  <div style={{
                    padding: '14px 18px',
                    borderBottom: '1px solid #f1f5f9',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    backgroundColor: '#ffffff'
                  }}>
                    <span style={{ fontWeight: 700, fontSize: '0.92rem', color: '#0f172a' }}>Notifications</span>
                    <span style={{ fontSize: '0.75rem', backgroundColor: '#eff6ff', color: '#2563eb', fontWeight: 600, padding: '3px 10px', borderRadius: '12px' }}>
                      5 Recent
                    </span>
                  </div>

                  {/* Notification List (Last 5 Notifications) */}
                  <div style={{ maxHeight: '310px', overflowY: 'auto' }}>
                    {recentNotifications.map((n) => (
                      <div 
                        key={n.id} 
                        style={{
                          padding: '12px 18px',
                          borderBottom: '1px solid #f8fafc',
                          fontSize: '0.85rem',
                          backgroundColor: n.unread ? '#f0f7ff' : '#ffffff',
                          transition: 'background 0.2s'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                          <span style={{ fontWeight: 600, color: '#0f172a' }}>{n.title}</span>
                          {n.unread && <span style={{ width: '6px', height: '6px', backgroundColor: '#2563eb', borderRadius: '50%' }}></span>}
                        </div>
                        <div style={{ color: '#64748b', fontSize: '0.8rem', lineHeight: 1.4 }}>{n.message}</div>
                        <div style={{ color: '#94a3b8', fontSize: '0.72rem', marginTop: '4px' }}>{n.time}</div>
                      </div>
                    ))}
                  </div>

                  {/* See All Notifications Link */}
                  <Link 
                    to="/emr/notifications" 
                    onClick={() => setShowNotifications(false)}
                    style={{
                      display: 'block',
                      padding: '12px',
                      textAlign: 'center',
                      backgroundColor: '#f8fafc',
                      color: '#2563eb',
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      textDecoration: 'none',
                      borderTop: '1px solid #e2e8f0',
                      transition: 'background 0.2s'
                    }}
                  >
                    See all notifications →
                  </Link>
                </div>
              )}
            </div>

            <div style={{ height: '24px', width: '1px', backgroundColor: '#e2e8f0' }}></div>

            {/* Profile Link */}
            <Link 
              to="/emr/profile" 
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                textDecoration: 'none',
                color: 'inherit',
                padding: '4px 8px',
                borderRadius: '8px',
                transition: 'background-color 0.2s'
              }}
            >
              <img 
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100" 
                alt="John Anderson" 
                style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
              />
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#0f172a' }}>John Anderson</div>
                <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Patient</div>
              </div>
            </Link>
          </div>
        </header>

        {/* Page Content View */}
        <main className="emr-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
