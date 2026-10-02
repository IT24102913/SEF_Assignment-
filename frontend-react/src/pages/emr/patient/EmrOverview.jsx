import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Sparkles, Brain, ArrowRight, ShieldCheck, Microscope, Pill, FileText } from 'lucide-react';

export default function EmrOverview() {
  const rawUser = sessionStorage.getItem('user') || localStorage.getItem('hb_user') || localStorage.getItem('user') || '{}';
  const storedUser = JSON.parse(rawUser);
  const userName = storedUser.fullName || storedUser.name || 'Patient';

  const [showBannerInfo, setShowBannerInfo] = React.useState(false);
  const [activeCardInfo, setActiveCardInfo] = React.useState(null);

  const cards = [
    {
      title: 'Consultation Notes',
      description: 'View your consultation history, medical diagnoses, and doctor notes.',
      badgeText: 'Consultations',
      dotColor: '#ef4444', // Red dot
      path: '/emr/consultation-notes',
      image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&q=80&w=800',
    },
    {
      title: 'Lab Reports',
      description: 'Access your blood tests, pathology results, and lab diagnostics.',
      badgeText: 'Lab Diagnostics',
      dotColor: '#22c55e', // Green dot
      path: '/emr/lab-reports',
      image: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&q=80&w=800',
    },
    {
      title: 'Pharmacy',
      description: 'Track your active prescriptions, medication dosages, and refills.',
      badgeText: 'Pharmacy Services',
      dotColor: '#3b82f6', // Blue dot
      path: '/emr/pharmacy',
      image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&q=80&w=800',
    },
    {
      title: 'Doctor Channeling History',
      description: 'Review your appointment history and upcoming doctor sessions.',
      badgeText: 'Appointments',
      dotColor: '#f97316', // Orange dot
      path: '/emr/channeling-history',
      image: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=800',
    },
  ];

  return (
    <div>
      {/* Welcome Banner */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
          Welcome back, {userName}!
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.95rem' }}>
          Here's your comprehensive medical records and personalized AI clinical intelligence.
        </p>
      </div>

      {/* ─── Hero Agentic AI Banner with direct CTA Button ─── */}
      <div style={{
        marginBottom: '32px',
        borderRadius: '18px',
        background: 'linear-gradient(135deg, #095e51 0%, #0d7c6b 50%, #064e43 100%)',
        padding: '28px 32px',
        color: '#ffffff',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 12px 30px -8px rgba(9, 94, 81, 0.35)',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '24px'
      }}>
        {/* Subtle background glow effect */}
        <div style={{
          position: 'absolute',
          top: '-40px',
          right: '-40px',
          width: '260px',
          height: '260px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 70%)',
          pointerEvents: 'none'
        }} />

        <div style={{ maxWidth: '640px', position: 'relative', zIndex: 1 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'rgba(255, 255, 255, 0.16)',
            padding: '5px 14px',
            borderRadius: '999px',
            fontSize: '0.78rem',
            fontWeight: 700,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            marginBottom: '12px',
            backdropFilter: 'blur(4px)',
            border: '1px solid rgba(255, 255, 255, 0.25)'
          }}>
            <Sparkles size={14} style={{ color: '#5eead4' }} />
            <span>Agentic AI Clinical Intelligence</span>
          </div>

          <h2 style={{ fontSize: '1.65rem', fontWeight: 800, margin: '0 0 8px 0', letterSpacing: '-0.02em', lineHeight: 1.25, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <span>Understand Your Medical Condition & Diagnostics</span>
            <button
              type="button"
              onClick={() => setShowBannerInfo(prev => !prev)}
              title={showBannerInfo ? "Hide explanation" : "Click to view detailed explanation"}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                backgroundColor: showBannerInfo ? '#ffffff' : 'rgba(255, 255, 255, 0.25)',
                color: showBannerInfo ? '#095e51' : '#ffffff',
                border: '1.5px solid rgba(255, 255, 255, 0.7)',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 800,
                fontFamily: 'monospace, sans-serif',
                lineHeight: 1,
                transition: 'all 0.2s ease',
                padding: 0,
                boxShadow: showBannerInfo ? '0 0 0 3px rgba(255,255,255,0.3)' : 'none'
              }}
            >
              !
            </button>
          </h2>

          {showBannerInfo && (
            <div style={{ animation: 'fadeIn 0.25s ease-out' }}>
              <p style={{ fontSize: '0.94rem', color: '#cce8e3', margin: '0 0 16px 0', lineHeight: 1.55 }}>
                Our Agentic AI reviews your latest laboratory tests, prescription medications, and doctor consultation notes to explain what your doctor said and clearly interpret your health status.
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', fontSize: '0.82rem', color: '#e6f5f2' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <FileText size={14} style={{ color: '#5eead4' }} /> Doctor Notes Explained
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <Microscope size={14} style={{ color: '#5eead4' }} /> Lab Results Decoded
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <Pill size={14} style={{ color: '#5eead4' }} /> Medications Clarified
                </span>
              </div>
            </div>
          )}
        </div>

        <div style={{ position: 'relative', zIndex: 1 }}>
          <Link
            to="/emr/ai-insights"
            id="open-ai-advisor-btn"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              backgroundColor: '#ffffff',
              color: '#095e51',
              padding: '14px 26px',
              borderRadius: '12px',
              fontWeight: 700,
              fontSize: '1rem',
              textDecoration: 'none',
              boxShadow: '0 6px 18px rgba(0,0,0,0.18)',
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              whiteSpace: 'nowrap'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 10px 24px rgba(0,0,0,0.25)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 6px 18px rgba(0,0,0,0.18)';
            }}
          >
            <Brain size={20} style={{ color: '#0d7c6b' }} />
            <span>Launch AI Health Advisor</span>
            <ArrowRight size={18} />
          </Link>
        </div>
      </div>

      {/* 2x2 Grid of Image Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '32px 24px'
      }}>
        {cards.map((card) => {
          const isInfoOpen = activeCardInfo === card.title;
          return (
            <Link 
              key={card.title} 
              to={card.path} 
              className="image-banner-card"
              style={{ '--badge-color': card.dotColor }}
            >
              {/* Image Wrapper with Badge & Action Arrow */}
              <div className="card-image-wrapper">
                <img src={card.image} alt={card.title} />
                
                {/* Top-Left Pill Badge */}
                <div className="card-badge">
                  <span className="card-badge-dot" style={{ backgroundColor: card.dotColor }}></span>
                  {card.badgeText}
                </div>

                {/* Top-Right Action Arrow Button */}
                <div className="card-action-btn">
                  <ArrowUpRight size={20} />
                </div>
              </div>

              {/* Bottom Content Metadata */}
              <div className="card-content-meta">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <h3 style={{ margin: 0 }}>{card.title}</h3>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setActiveCardInfo(prev => prev === card.title ? null : card.title);
                    }}
                    title={isInfoOpen ? "Hide description" : "Click to view description"}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '22px',
                      height: '22px',
                      borderRadius: '50%',
                      backgroundColor: isInfoOpen ? '#0d7c6b' : '#f1f5f9',
                      color: isInfoOpen ? '#ffffff' : '#0d7c6b',
                      border: `1.5px solid ${isInfoOpen ? '#0d7c6b' : '#cbd5e1'}`,
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: 800,
                      fontFamily: 'monospace, sans-serif',
                      lineHeight: 1,
                      padding: 0,
                      flexShrink: 0,
                      transition: 'all 0.2s ease',
                      boxShadow: isInfoOpen ? '0 0 0 3px rgba(13, 124, 107, 0.2)' : 'none'
                    }}
                  >
                    !
                  </button>
                </div>
                {isInfoOpen && (
                  <p style={{ marginTop: '8px', color: '#0d7c6b', fontWeight: 500, animation: 'fadeIn 0.2s ease-out' }}>
                    {card.description}
                  </p>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
