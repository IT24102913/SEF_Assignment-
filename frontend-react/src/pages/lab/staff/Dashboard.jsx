import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStats, getAllBookings } from '../../../api/labApi';
import LabLayout from '../../../components/layout/LabLayout';
import { ClipboardList, CheckCircle, XCircle, FlaskConical, TestTube, Brain, Clock, Activity, Sparkles, ArrowRight } from 'lucide-react';
import labHeroBanner from '../../../assets/lab_hero_banner.jpg';
import labAiAnalysis from '../../../assets/lab_ai_analysis.jpg';

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [pendingTestsCount, setPendingTestsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadData = () => {
    Promise.all([
      getStats().catch(() => ({ data: null })),
      getAllBookings('').catch(() => ({ data: [] }))
    ]).then(([statsRes, bookingsRes]) => {
      setStats(statsRes.data);
      const all = bookingsRes.data || [];
      const queueCount = all.filter(b => 
        b.status === 'Confirmed' ||
        b.status === 'SampleCollected' ||
        b.status === 'TestingInProgress' ||
        b.status === 'ResultVerification' ||
        b.status === 'ResultsReady' ||
        b.status === 'ReportDelivered'
      ).length;
      setPendingTestsCount(queueCount);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 8000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <LabLayout>
        <div className="spinner" />
      </LabLayout>
    );
  }

  const cards = [
    { label: 'Total Orders', value: stats?.totalBookings ?? 0, icon: ClipboardList, color: '#059669', bg: '#ECFDF5', link: '/laboratory/bookings' },
    { label: 'Pending Appointments', value: stats?.pendingApproval ?? 0, icon: Clock, color: '#D97706', bg: '#FEF3C7', link: '/laboratory/pending' },
    { label: 'Pending Tests (Queue)', value: pendingTestsCount, icon: FlaskConical, color: '#0284C7', bg: '#E0F2FE', link: '/laboratory/pending-tests' },
    { label: 'Confirmed Slots', value: stats?.confirmed ?? 0, icon: CheckCircle, color: '#10B981', bg: '#D1FAE5', link: '/laboratory/pending-tests' },
    { label: 'Sample Collected', value: stats?.sampleCollected ?? 0, icon: FlaskConical, color: '#0D9488', bg: '#CCFBF1', link: '/laboratory/pending-tests' },
    { label: 'Results Ready', value: stats?.resultsReady ?? 0, icon: TestTube, color: '#047857', bg: '#D1FAE5', link: '/laboratory/pending-tests' },
    { label: 'AI Pre-Approved', value: stats?.aiPreApproved ?? 0, icon: Brain, color: '#059669', bg: '#ECFDF5', link: '/laboratory/pending' },
    { label: 'AI Flagged (Review)', value: stats?.aiFlagged ?? 0, icon: Activity, color: '#DC2626', bg: '#FEE2E2', link: '/laboratory/pending' },
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

      {/* Prominent Staff Action Attention Bar */}
      <div 
        className="animate-slide-up"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div 
          onClick={() => navigate('/laboratory/pending')}
          style={{
            background: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)',
            border: '1.5px solid #FCD34D',
            borderRadius: 16,
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(217, 119, 6, 0.08)',
            transition: 'all 0.2s',
          }}
          className="hover-lift"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: '#FDE68A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={22} color="#B45309" />
            </div>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 800, color: '#92400E' }}>Pending Appointments & Approvals</div>
              <div style={{ fontSize: 11.5, color: '#B45309', marginTop: 2 }}>Requires technician / prescription verification</div>
            </div>
          </div>
          <div style={{
            fontSize: 22,
            fontWeight: 900,
            color: '#B45309',
            background: '#FFFFFF',
            padding: '4px 14px',
            borderRadius: 12,
            border: '1px solid #FCD34D',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}>
            {stats?.pendingApproval ?? 0}
            <ArrowRight size={14} color="#B45309" />
          </div>
        </div>

        <div 
          onClick={() => navigate('/laboratory/pending-tests')}
          style={{
            background: 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)',
            border: '1.5px solid #6EE7B7',
            borderRadius: 16,
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(5, 150, 105, 0.08)',
            transition: 'all 0.2s',
          }}
          className="hover-lift"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: '#A7F3D0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FlaskConical size={22} color="#065F46" />
            </div>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 800, color: '#065F46' }}>Pending Tests In Work Queue</div>
              <div style={{ fontSize: 11.5, color: '#047857', marginTop: 2 }}>Specimen intake, analysis & PDF report upload</div>
            </div>
          </div>
          <div style={{
            fontSize: 22,
            fontWeight: 900,
            color: '#065F46',
            background: '#FFFFFF',
            padding: '4px 14px',
            borderRadius: 12,
            border: '1px solid #6EE7B7',
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}>
            {pendingTestsCount}
            <ArrowRight size={14} color="#065F46" />
          </div>
        </div>
      </div>

      <div className="stats-grid">
        {cards.map(({ label, value, icon: Icon, color, bg, link }, i) => (
          <div 
            className="stat-card animate-scale-up" 
            key={label} 
            onClick={() => link && navigate(link)}
            style={{ 
              animationDelay: `${i * 60}ms`, 
              animationFillMode: 'both',
              cursor: link ? 'pointer' : 'default',
              transition: 'all 0.2s'
            }}
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
