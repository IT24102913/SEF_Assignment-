import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Phone, Mail, CheckCircle2 } from 'lucide-react';
import logoImage from '../../assets/mediz.png';

export default function EmrFooter() {
  return (
    <footer style={{
      marginTop: '36px',
      background: 'linear-gradient(135deg, #047857 0%, #065F46 100%)',
      color: '#FFFFFF',
      padding: '20px 28px 14px',
      borderRadius: '16px 16px 0 0',
      borderTop: '1px solid #059669',
      boxShadow: '0 -4px 18px rgba(4, 120, 87, 0.08)'
    }}>
      {/* Slim Top Bar: Brand, Navigation Links, and 24/7 Hotline */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '18px',
        paddingBottom: '14px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.15)'
      }}>
        {/* Brand & Mini Subtitle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            background: '#FFFFFF',
            padding: '3px 7px',
            borderRadius: '8px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 6px rgba(0,0,0,0.12)'
          }}>
            <img src={logoImage} alt="Health Bridge Private" style={{ height: '26px', objectFit: 'contain' }} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '14px', fontWeight: 900, color: '#FFFFFF', letterSpacing: '-0.2px', lineHeight: 1.1 }}>
                HEALTH BRIDGE
              </span>
              <span style={{ fontSize: '9px', fontWeight: 800, color: '#A7F3D0', letterSpacing: '1px', textTransform: 'uppercase' }}>
                PRIVATE
              </span>
            </div>
            <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#D1FAE5', opacity: 0.9 }}>
              Clinical Sanctuary & Electronic Medical Records
            </p>
          </div>
        </div>

        {/* Slim Horizontal Quick Links */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', fontSize: '12.5px', fontWeight: 600 }}>
          <Link to="/patient/dashboard" style={{ color: '#ECFDF5', textDecoration: 'none', transition: 'color 0.2s' }}>
            Appointments
          </Link>
          <span style={{ color: 'rgba(255,255,255,0.3)' }}>•</span>
          <Link to="/emr/overview" style={{ color: '#ECFDF5', textDecoration: 'none', transition: 'color 0.2s' }}>
            Health Overview
          </Link>
          <span style={{ color: 'rgba(255,255,255,0.3)' }}>•</span>
          <Link to="/emr/consultation-notes" style={{ color: '#ECFDF5', textDecoration: 'none', transition: 'color 0.2s' }}>
            Doctor Notes
          </Link>
          <span style={{ color: 'rgba(255,255,255,0.3)' }}>•</span>
          <Link to="/emr/lab-reports" style={{ color: '#ECFDF5', textDecoration: 'none', transition: 'color 0.2s' }}>
            Lab Reports
          </Link>
          <span style={{ color: 'rgba(255,255,255,0.3)' }}>•</span>
          <Link to="/emr/pharmacy" style={{ color: '#ECFDF5', textDecoration: 'none', transition: 'color 0.2s' }}>
            Prescriptions
          </Link>
          <span style={{ color: 'rgba(255,255,255,0.3)' }}>•</span>
          <Link to="/emr/ai-advisor" style={{ color: '#5eead4', textDecoration: 'none', fontWeight: 700 }}>
            ✨ AI Advisor
          </Link>
        </nav>

        {/* Compact Contact Badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: 'rgba(255, 255, 255, 0.12)',
            border: '1px solid rgba(255, 255, 255, 0.25)',
            padding: '5px 12px',
            borderRadius: '20px',
            fontSize: '11.5px',
            fontWeight: 600,
            color: '#ECFDF5'
          }}>
            <Phone size={13} color="#A7F3D0" />
            <span>24/7 Hotline: <strong>+94 76 447 7999</strong></span>
          </div>

          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            backgroundColor: 'rgba(255, 255, 255, 0.12)',
            border: '1px solid rgba(255, 255, 255, 0.25)',
            padding: '5px 10px',
            borderRadius: '20px',
            fontSize: '11px',
            fontWeight: 700,
            color: '#A7F3D0'
          }}>
            <Shield size={12} color="#A7F3D0" /> ISO 27001
          </div>
        </div>
      </div>

      {/* Slim Bottom Copyright Bar */}
      <div style={{
        paddingTop: '10px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '10px',
        fontSize: '11.5px',
        color: '#D1FAE5',
        fontWeight: 500
      }}>
        <span>© {new Date().getFullYear()} Health Bridge Private Medical Portal. All rights reserved.</span>
        <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
          <span style={{ cursor: 'pointer', opacity: 0.9 }}>Privacy Policy</span>
          <span>·</span>
          <span style={{ cursor: 'pointer', opacity: 0.9 }}>Terms of Service</span>
          <span>·</span>
          <span style={{ cursor: 'pointer', opacity: 0.9 }}>Patient Support</span>
        </div>
      </div>
    </footer>
  );
}
