import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';

export default function EmrOverview() {
  const storedUser = JSON.parse(localStorage.getItem('hb_user') || '{}');
  const userName = storedUser.name || 'Patient';

  const cards = [
    {
      title: 'Consultation Notes',
      description: 'View your consultation history, medical diagnoses, and doctor notes.',
      badgeText: 'Consultations',
      dotColor: '#ef4444', // Red dot like screenshot
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
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
          Welcome back, {userName}!
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.95rem' }}>
          Here's your health overview at a glance.
        </p>
      </div>

      {/* 2x2 Grid of Image Cards (2 per row for 2 rows) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '32px 24px'
      }}>
        {cards.map((card) => (
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
              <h3>{card.title}</h3>
              <p>{card.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
