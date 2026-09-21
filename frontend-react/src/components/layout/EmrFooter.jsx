import React from 'react';
import { Link } from 'react-router-dom';
import { Activity, ShieldCheck, Lock, CheckCircle2, PhoneCall, Heart } from 'lucide-react';

export default function EmrFooter() {
  return (
    <footer style={{
      marginTop: '48px',
      borderTop: '1px solid #e2e8f0',
      backgroundColor: '#ffffff',
      padding: '40px 36px 24px 36px',
      borderRadius: '20px 20px 0 0',
      boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.02)'
    }}>
      {/* Top Grid Area */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1.4fr 1fr 1.2fr',
        gap: '40px',
        marginBottom: '32px'
      }}>
        {/* Col 1: Brand & Hotline */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <div style={{
              width: '34px',
              height: '34px',
              backgroundColor: '#2563eb',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff'
            }}>
              <Activity size={18} />
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>Aegis Health</h3>
            <span style={{ fontSize: '0.7rem', color: '#2563eb', backgroundColor: '#eff6ff', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>EMR PORTAL</span>
          </div>

          <p style={{ color: '#64748b', fontSize: '0.88rem', lineHeight: 1.5, marginBottom: '16px', maxWidth: '340px' }}>
            Empowering patients with instant, encrypted access to electronic medical records, lab diagnostics, and prescription management.
          </p>

          {/* 24/7 Hotline Badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px',
            backgroundColor: '#f8fafc',
            border: '1px solid #cbd5e1',
            padding: '8px 16px',
            borderRadius: '24px',
            fontSize: '0.85rem',
            color: '#0f172a',
            fontWeight: 500
          }}>
            <span style={{ width: '8px', height: '8px', backgroundColor: '#22c55e', borderRadius: '50%', boxShadow: '0 0 8px #22c55e' }}></span>
            <PhoneCall size={14} color="#2563eb" />
            24/7 Helpline: <strong>+1 (800) 992-AEGIS</strong>
          </div>
        </div>

        {/* Col 2: Quick Links */}
        <div>
          <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '16px' }}>
            EMR Modules
          </h4>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.88rem' }}>
            <li><Link to="/emr/overview" style={{ color: '#64748b', textDecoration: 'none', transition: 'color 0.2s' }}>Health Overview</Link></li>
            <li><Link to="/emr/consultation-notes" style={{ color: '#64748b', textDecoration: 'none', transition: 'color 0.2s' }}>Doctor Consultation Notes</Link></li>
            <li><Link to="/emr/lab-reports" style={{ color: '#64748b', textDecoration: 'none', transition: 'color 0.2s' }}>Laboratory Reports</Link></li>
            <li><Link to="/emr/pharmacy" style={{ color: '#64748b', textDecoration: 'none', transition: 'color 0.2s' }}>Pharmacy & Prescriptions</Link></li>
            <li><Link to="/emr/channeling-history" style={{ color: '#64748b', textDecoration: 'none', transition: 'color 0.2s' }}>Doctor Appointments</Link></li>
          </ul>
        </div>

        {/* Col 3: Security & Certifications */}
        <div>
          <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '16px' }}>
            Security & Compliance
          </h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#f0fdf4', padding: '10px 14px', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
              <ShieldCheck size={18} color="#16a34a" />
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#15803d' }}>HIPAA Compliant</div>
                <div style={{ fontSize: '0.76rem', color: '#166534' }}>Full Medical Privacy Guard</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#eff6ff', padding: '10px 14px', borderRadius: '10px', border: '1px solid #bfdbfe' }}>
              <Lock size={18} color="#2563eb" />
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1d4ed8' }}>256-Bit SSL Encrypted</div>
                <div style={{ fontSize: '0.76rem', color: '#1e40af' }}>End-to-End Data Security</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#faf5ff', padding: '10px 14px', borderRadius: '10px', border: '1px solid #e9d5ff' }}>
              <CheckCircle2 size={18} color="#9333ea" />
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#7e22ce' }}>ISO 27001 Certified</div>
                <div style={{ fontSize: '0.76rem', color: '#6b21a8' }}>International Health Security</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar Divider & Copyright */}
      <div style={{
        borderTop: '1px solid #f1f5f9',
        paddingTop: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '0.82rem',
        color: '#94a3b8'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>© 2026 Aegis Health EMR Portal. Built with care</span>
          <Heart size={14} color="#ef4444" fill="#ef4444" />
          <span>for patient wellness.</span>
        </div>

        <div style={{ display: 'flex', gap: '20px' }}>
          <span style={{ cursor: 'pointer' }}>Privacy Policy</span>
          <span>•</span>
          <span style={{ cursor: 'pointer' }}>Terms of Service</span>
          <span>•</span>
          <span style={{ cursor: 'pointer' }}>Patient Support</span>
        </div>
      </div>
    </footer>
  );
}
