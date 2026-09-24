import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getAllBookings } from '../../api/labApi';
import { 
  Activity, Clock, ClipboardList, TestTube, 
  Microscope, ArrowLeft, LogOut, Sparkles, FlaskConical 
} from 'lucide-react';
import logoImage from '../../assets/mediz.png';

export default function LabHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const [counts, setCounts] = useState({
    pendingApprovals: 0,
    pendingTests: 0,
  });

  const fetchCounts = () => {
    getAllBookings('')
      .then(res => {
        const all = res.data || [];
        const pendingApprovals = all.filter(b => 
          b.status === 'PendingLabApproval' ||
          b.status === 'PendingPrescriptionUpload' ||
          b.status === 'PendingAIVerification'
        ).length;
        const pendingTests = all.filter(b => 
          b.status === 'Confirmed' ||
          b.status === 'SampleCollected' ||
          b.status === 'TestingInProgress' ||
          b.status === 'ResultVerification' ||
          b.status === 'ResultsReady' ||
          b.status === 'ReportDelivered'
        ).length;
        setCounts({ pendingApprovals, pendingTests });
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchCounts();
    const interval = setInterval(fetchCounts, 8000);
    window.addEventListener('lab-booking-updated', fetchCounts);
    return () => {
      clearInterval(interval);
      window.removeEventListener('lab-booking-updated', fetchCounts);
    };
  }, [location.pathname]);

  const navItems = [
    { path: '/laboratory/dashboard', label: 'Clinical Overview', icon: Activity },
    { 
      path: '/laboratory/pending', 
      label: 'Pending Approvals', 
      icon: Clock,
      badgeKey: 'pendingApprovals',
      badgeColor: '#B45309',
      badgeBg: '#FEF3C7',
      badgeBorder: '#FDE68A'
    },
    { 
      path: '/laboratory/pending-tests', 
      label: 'Pending Tests', 
      icon: FlaskConical,
      badgeKey: 'pendingTests',
      badgeColor: '#065F46',
      badgeBg: '#ECFDF5',
      badgeBorder: '#A7F3D0'
    },
    { path: '/laboratory/bookings', label: 'All Lab Bookings', icon: ClipboardList },
    { path: '/laboratory/tests', label: 'Test Catalogue', icon: Microscope },
  ];

  const isCurrentActive = (itemPath) => {
    if (location.pathname === itemPath) return true;
    if (itemPath === '/laboratory/pending' && location.pathname === '/pending') return true;
    if (itemPath === '/laboratory/pending-tests' && (location.pathname === '/pending-tests' || location.pathname === '/laboratory/pending-tests' || location.pathname === '/laboratory/results' || location.pathname === '/results')) return true;
    if (itemPath === '/laboratory/bookings' && location.pathname === '/bookings') return true;
    if (itemPath === '/laboratory/tests' && location.pathname === '/tests') return true;
    if (itemPath === '/laboratory/dashboard' && (location.pathname === '/admin/lab' || location.pathname === '/laboratory/dashboard')) return true;
    return false;
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div style={styles.headerWrapper}>
      {/* Top Banner */}
      <div style={styles.headerTop}>
        <div style={styles.leftSection}>
          <button 
            onClick={() => navigate('/admin/dashboard')} 
            style={styles.backBtn}
            title="Return to Main Admin Dashboard"
          >
            <ArrowLeft size={16} /> Main Dashboard
          </button>
          
          <div style={styles.divider} />

          <div style={styles.branding} onClick={() => navigate('/laboratory/dashboard')}>
            <img src={logoImage} alt="Health Bridge" style={styles.logoImg} />
            <div>
              <div style={styles.portalTitle}>
                CLINICAL DIAGNOSTIC HUB <span style={styles.badgeHub}>LAB</span>
              </div>
              <div style={styles.portalSubtitle}>HEALTH BRIDGE PATHOLOGY & IMAGING</div>
            </div>
          </div>
        </div>

        <div style={styles.rightSection}>
          <div style={styles.aiTag}>
            <Sparkles size={13} color="#10B981" />
            <span>AI Prescription Scanner Active</span>
          </div>

          <div style={styles.userBadge}>
            <div style={styles.userAvatar}>
              {user?.fullName ? user.fullName[0].toUpperCase() : 'L'}
            </div>
            <div>
              <div style={styles.userName}>{user?.fullName || 'Lab Admin'}</div>
              <div style={styles.userRole}>{user?.role || 'Laboratory'}</div>
            </div>
          </div>

          <button onClick={handleLogout} style={styles.logoutBtn} title="Sign Out">
            <LogOut size={15} />
          </button>
        </div>
      </div>

      {/* Lab Navigation Bar */}
      <div style={styles.navBar}>
        <div style={styles.navLinks}>
          {navItems.map(({ path, label, icon: Icon, badgeKey, badgeColor, badgeBg, badgeBorder }) => {
            const active = isCurrentActive(path);
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                style={{
                  ...styles.navLink,
                  ...(active ? styles.navLinkActive : {}),
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <Icon size={16} />
                <span>{label}</span>
                {badgeKey && counts[badgeKey] !== undefined && (
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      padding: '1px 7px',
                      borderRadius: '12px',
                      background: counts[badgeKey] > 0 ? badgeBg : 'rgba(100, 116, 139, 0.08)',
                      color: counts[badgeKey] > 0 ? badgeColor : '#64748B',
                      border: `1px solid ${counts[badgeKey] > 0 ? badgeBorder : '#E2E8F0'}`,
                      minWidth: '20px',
                      textAlign: 'center',
                      lineHeight: '16px',
                    }}
                  >
                    {counts[badgeKey]}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const styles = {
  headerWrapper: {
    background: '#FFFFFF',
    borderBottom: '1px solid #D1FAE5',
    boxShadow: '0 2px 8px rgba(16, 185, 129, 0.05)',
    marginBottom: '26px',
    position: 'sticky',
    top: 0,
    zIndex: 50,
  },
  headerTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 36px',
    borderBottom: '1px solid #F1F5F9',
    flexWrap: 'wrap',
    gap: '14px',
    maxWidth: '1440px',
    margin: '0 auto',
  },
  leftSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  backBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    background: '#ECFDF5',
    border: '1px solid #A7F3D0',
    borderRadius: '8px',
    padding: '7px 14px',
    fontSize: '12.5px',
    fontWeight: 700,
    color: '#065F46',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  divider: {
    width: '1px',
    height: '24px',
    background: '#E2E8F0',
  },
  branding: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    cursor: 'pointer',
  },
  logoImg: {
    height: '36px',
    objectFit: 'contain',
  },
  portalTitle: {
    fontSize: '15px',
    fontWeight: 800,
    color: '#064E3B',
    letterSpacing: '0.4px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  badgeHub: {
    fontSize: '10px',
    fontWeight: 800,
    background: '#D1FAE5',
    color: '#047857',
    padding: '2px 8px',
    borderRadius: '4px',
    border: '1px solid #A7F3D0',
  },
  portalSubtitle: {
    fontSize: '10.5px',
    fontWeight: 600,
    color: '#059669',
    letterSpacing: '0.6px',
  },
  rightSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
  },
  aiTag: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    background: '#ECFDF5',
    border: '1px solid #A7F3D0',
    color: '#065F46',
    padding: '5px 12px',
    borderRadius: '999px',
    fontSize: '11.5px',
    fontWeight: 700,
  },
  userBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    background: '#F8FAFC',
    padding: '4px 10px',
    borderRadius: '8px',
    border: '1px solid #E2E8F0',
  },
  userAvatar: {
    width: '30px',
    height: '30px',
    borderRadius: '8px',
    background: 'linear-gradient(135deg, #10B981, #059669)',
    color: '#FFFFFF',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 800,
    fontSize: '13px',
  },
  userName: {
    fontSize: '13px',
    fontWeight: 700,
    color: '#0F172A',
  },
  userRole: {
    fontSize: '10.5px',
    fontWeight: 600,
    color: '#059669',
    textTransform: 'uppercase',
  },
  logoutBtn: {
    background: '#FEE2E2',
    color: '#DC2626',
    border: '1px solid #FECACA',
    borderRadius: '8px',
    padding: '7px 10px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
  },
  navBar: {
    padding: '0 36px',
    background: '#FFFFFF',
    display: 'flex',
    overflowX: 'auto',
    maxWidth: '1440px',
    margin: '0 auto',
  },
  navLinks: {
    display: 'flex',
    gap: '8px',
  },
  navLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 18px',
    background: 'transparent',
    border: 'none',
    borderBottom: '2.5px solid transparent',
    color: '#64748B',
    fontSize: '13.5px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap',
    fontFamily: 'inherit',
  },
  navLinkActive: {
    color: '#064E3B',
    borderBottomColor: '#10B981',
    fontWeight: 700,
    background: '#F0FDF4',
  },
};
