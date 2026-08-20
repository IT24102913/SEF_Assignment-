import { useEffect, useState } from 'react';
import { getStats } from '../../api/labApi';
import LabLayout from '../../components/LabLayout';
import { ClipboardList, CheckCircle, XCircle, FlaskConical, TestTube, Brain, Clock, Activity, Sparkles, ShieldCheck } from 'lucide-react';
import labHeroBanner from '../../assets/lab_hero_banner.jpg';
import labAiAnalysis from '../../assets/lab_ai_analysis.jpg';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStats().then(r => { setStats(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <LabLayout>
        <div className="spinner" />
      </LabLayout>
    );
  }

  const cards = [
    { label: 'Total Orders', value: stats?.totalBookings ?? 0, icon: ClipboardList, color: '#059669', bg: '#ECFDF5' },
    { label: 'Pending Approval', value: stats?.pendingApproval ?? 0, icon: Clock, color: '#D97706', bg: '#FEF3C7' },
    { label: 'Confirmed', value: stats?.confirmed ?? 0, icon: CheckCircle, color: '#10B981', bg: '#D1FAE5' },
    { label: 'Sample Collected', value: stats?.sampleCollected ?? 0, icon: FlaskConical, color: '#0D9488', bg: '#CCFBF1' },
    { label: 'Results Ready', value: stats?.resultsReady ?? 0, icon: TestTube, color: '#047857', bg: '#D1FAE5' },
    { label: 'Rejected', value: stats?.rejected ?? 0, icon: XCircle, color: '#DC2626', bg: '#FEE2E2' },
    { label: 'AI Pre-Approved', value: stats?.aiPreApproved ?? 0, icon: Brain, color: '#059669', bg: '#ECFDF5' },
    { label: 'AI Flagged', value: stats?.aiFlagged ?? 0, icon: Activity, color: '#D97706', bg: '#FEF3C7' },
  ];

  return (
    <LabLayout>
      <div 
        className="lab-hero-banner animate-slide-up" 
        style={{ 
          backgroundImage: `linear-gradient(to right, rgba(6, 78, 59, 0.94), rgba(5, 150, 105, 0.78)), url(${labHeroBanner})`, 
          backgroundSize: 'cover', 
          backgroundPosition: 'center' 
        }}
      >
        <div className="lab-hero-banner-content">
          <div className="lab-hero-tag">
            <Sparkles size={13} color="#A7F3D0" />
            Clinical Diagnostic Hub
          </div>
          <h1>Laboratory Pathology & Diagnostics</h1>
          <p>Real-time booking management, automated Gemini AI prescription validation, specimen collection tracking, and result delivery.</p>
        </div>
      </div>

      <div className="stats-grid">
        {cards.map(({ label, value, icon: Icon, color, bg }, i) => (
          <div 
            className="stat-card animate-scale-up" 
            key={label} 
            style={{ animationDelay: `${i * 60}ms`, animationFillMode: 'both' }}
          >
            <div className="stat-icon" style={{ background: bg }}>
              <Icon size={22} color={color} />
            </div>
            <div>
              <div className="stat-value" style={{ color }}>{value}</div>
              <div className="stat-label">{label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="ai-section-card animate-slide-up" style={{ animationDelay: '400ms', animationFillMode: 'both' }}>
        <div className="ai-scan-header">
          <div>
            <h2 className="card-title">
              <Brain size={22} color="var(--primary-dark)" /> 
              Gemini Vision AI Prescription Radar
            </h2>
            <p className="text-muted" style={{ margin: '4px 0 0' }}>
              Optical Character Recognition (OCR) and clinical consistency model scanning patient uploads
            </p>
          </div>
          <span className="ai-radar-badge">
            <span className="pulsing-dot" />
            AI Scanner Online
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 28, alignItems: 'center' }}>
          <div>
            <img 
              src={labAiAnalysis} 
              alt="AI Analysis" 
              style={{ width: '100%', borderRadius: 16, boxShadow: 'var(--shadow-md)', border: '1px solid var(--border)' }} 
            />
          </div>
          <div className="ai-grid" style={{ gridTemplateColumns: '1fr' }}>
            <div className="ai-stat-box approved hover-lift">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ color: '#059669', margin: 0, fontWeight: 700 }}>✅ Pre-Approved by AI Vision</h4>
                <span className="badge badge-approved">Confidence &ge; 90%</span>
              </div>
              <p style={{ fontSize: 34, fontWeight: 800, margin: '8px 0', color: 'var(--text-dark)' }}>
                {stats?.aiPreApproved ?? 0}
              </p>
              <p className="text-muted text-sm">Prescriptions automatically matched with requested diagnostic tests</p>
              <div className="ai-stat-progress-bar">
                <div className="ai-stat-progress-fill" style={{ width: '100%', background: 'linear-gradient(90deg, #34D399, #059669)' }} />
              </div>
            </div>

            <div className="ai-stat-box flagged hover-lift">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ color: '#D97706', margin: 0, fontWeight: 700 }}>⚠️ Flagged for Manual Review</h4>
                <span className="badge badge-pending">Action Required</span>
              </div>
              <p style={{ fontSize: 34, fontWeight: 800, margin: '8px 0', color: 'var(--text-dark)' }}>
                {stats?.aiFlagged ?? 0}
              </p>
              <p className="text-muted text-sm">Requires technician inspection due to handwriting ambiguity or test discrepancies</p>
              <div className="ai-stat-progress-bar">
                <div className="ai-stat-progress-fill" style={{ width: '100%', background: 'linear-gradient(90deg, #FCD34D, #D97706)' }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </LabLayout>
  );
}
