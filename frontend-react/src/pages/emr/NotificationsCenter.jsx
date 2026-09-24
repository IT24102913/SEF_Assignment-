import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Bell, CheckCircle2, AlertCircle, Clock, Shield, ArrowRight, CheckCheck, Filter
} from 'lucide-react';
import { emrApi } from '../../api/emrApi';

export default function NotificationsCenter() {
  const rawUser = sessionStorage.getItem('user') || localStorage.getItem('hb_user') || localStorage.getItem('user') || '{}';
  const storedUser = JSON.parse(rawUser);
  const userRole = storedUser.role || 'Patient';

  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('all'); // 'all', 'unread', 'high'
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLiveNotifications();
  }, []);

  const fetchLiveNotifications = async () => {
    setLoading(true);
    try {
      const data = await emrApi.getMyNotifications();
      if (Array.isArray(data)) {
        setNotifications(data);
      } else {
        setNotifications([]);
      }
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkRead = (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, unread: false } : n));
  };

  const handleMarkAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
  };

  const filtered = notifications.filter(n => {
    if (filter === 'unread') return n.unread;
    if (filter === 'high') return n.priority === 'High';
    return true;
  });

  const unreadCount = notifications.filter(n => n.unread).length;

  const roleStyles = {
    Doctor: { label: 'Physician / Consultant Portal', color: '#095e51', bg: '#e6f5f2' },
    Pharmacist: { label: 'Pharmacy Operations Portal', color: '#b45309', bg: '#fef3c7' },
    Laboratory: { label: 'Pathology & Lab Diagnostics', color: '#1d4ed8', bg: '#dbeafe' },
    Admin: { label: 'Hospital Administration System', color: '#7c3aed', bg: '#ede9fe' },
    Patient: { label: 'Personal Health Passport', color: '#095e51', bg: '#e6f5f2' },
  };

  const currentRoleStyle = roleStyles[userRole] || roleStyles.Patient;

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.3px', margin: 0 }}>
              Notifications Center
            </h1>
            <span style={{
              backgroundColor: currentRoleStyle.bg,
              color: currentRoleStyle.color,
              fontSize: '0.78rem',
              fontWeight: 700,
              padding: '4px 12px',
              borderRadius: '20px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <Shield size={13} />
              {currentRoleStyle.label}
            </span>
          </div>
          <p style={{ color: '#64748b', fontSize: '0.92rem', margin: 0 }}>
            Role-specific clinical alerts, health updates, and system notices for your account.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#ffffff',
              border: '1.5px solid #cbd5e1',
              borderRadius: '10px',
              padding: '8px 16px',
              color: '#334155',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <CheckCheck size={16} color="#095e51" />
            Mark All as Read ({unreadCount})
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
        <button
          onClick={() => setFilter('all')}
          style={{
            padding: '6px 16px',
            borderRadius: '8px',
            border: 'none',
            fontSize: '0.86rem',
            fontWeight: 700,
            cursor: 'pointer',
            backgroundColor: filter === 'all' ? '#095e51' : '#f1f5f9',
            color: filter === 'all' ? '#ffffff' : '#64748b',
            transition: 'all 0.15s'
          }}
        >
          All ({notifications.length})
        </button>
        <button
          onClick={() => setFilter('unread')}
          style={{
            padding: '6px 16px',
            borderRadius: '8px',
            border: 'none',
            fontSize: '0.86rem',
            fontWeight: 700,
            cursor: 'pointer',
            backgroundColor: filter === 'unread' ? '#095e51' : '#f1f5f9',
            color: filter === 'unread' ? '#ffffff' : '#64748b',
            transition: 'all 0.15s'
          }}
        >
          Unread ({unreadCount})
        </button>
        <button
          onClick={() => setFilter('high')}
          style={{
            padding: '6px 16px',
            borderRadius: '8px',
            border: 'none',
            fontSize: '0.86rem',
            fontWeight: 700,
            cursor: 'pointer',
            backgroundColor: filter === 'high' ? '#095e51' : '#f1f5f9',
            color: filter === 'high' ? '#ffffff' : '#64748b',
            transition: 'all 0.15s'
          }}
        >
          Priority Alerts ({notifications.filter(n => n.priority === 'High').length})
        </button>
      </div>

      {/* Notifications List */}
      {filtered.length === 0 ? (
        <div style={{
          backgroundColor: '#ffffff',
          border: '2px dashed #cbd5e1',
          borderRadius: '16px',
          padding: '50px 20px',
          textAlign: 'center',
          color: '#94a3b8'
        }}>
          <CheckCircle2 size={44} style={{ margin: '0 auto 12px', opacity: 0.4, color: '#10b981' }} />
          <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
            No Notifications Found
          </h3>
          <p style={{ fontSize: '0.88rem' }}>You're all caught up with your {userRole.toLowerCase()} notifications.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filtered.map((n) => {
            const isUnread = n.unread;
            return (
              <div
                key={n.id}
                style={{
                  backgroundColor: '#ffffff',
                  border: isUnread ? '1.5px solid #cce8e3' : '1px solid #e2e8f0',
                  borderRadius: '14px',
                  padding: '18px 22px',
                  boxShadow: isUnread ? '0 3px 12px -2px rgba(9,94,81,0.06)' : '0 1px 4px rgba(0,0,0,0.02)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: '16px',
                  transition: 'all 0.2s',
                  position: 'relative'
                }}
              >
                <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                  {/* Left Priority Icon */}
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    backgroundColor: n.priority === 'High' ? '#fef2f2' : '#e6f5f2',
                    color: n.priority === 'High' ? '#dc2626' : '#095e51',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {n.priority === 'High' ? <AlertCircle size={20} /> : <Bell size={20} />}
                  </div>

                  <div>
                    {/* Header: Title + Category Pill + Time */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.96rem', color: '#0f172a' }}>
                        {n.title}
                      </span>
                      <span style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        backgroundColor: '#f1f5f9',
                        color: '#475569',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        textTransform: 'uppercase'
                      }}>
                        {n.category}
                      </span>
                      {isUnread && (
                        <span style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          backgroundColor: '#ecfdf5',
                          color: '#059669',
                          padding: '2px 8px',
                          borderRadius: '6px'
                        }}>
                          NEW
                        </span>
                      )}
                    </div>

                    <p style={{ color: '#475569', fontSize: '0.88rem', margin: '4px 0 8px 0', lineHeight: 1.45 }}>
                      {n.message}
                    </p>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.78rem', color: '#94a3b8' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={13} />
                        {n.time}
                      </span>
                      {n.link && (
                        <Link
                          to={n.link}
                          style={{
                            color: '#095e51',
                            fontWeight: 600,
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          View Details <ArrowRight size={13} />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Action: Mark Read */}
                {isUnread && (
                  <button
                    onClick={() => handleMarkRead(n.id)}
                    title="Mark as read"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#94a3b8',
                      cursor: 'pointer',
                      padding: '4px',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      transition: 'color 0.2s',
                      flexShrink: 0
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#095e51'}
                    onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
                  >
                    <CheckCircle2 size={18} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
