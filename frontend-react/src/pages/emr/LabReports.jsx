import React, { useState, useEffect } from 'react';
import { emrStore } from '../../data/mockEmrStore';
import { Microscope, Download, Clock, CheckCircle, Loader } from 'lucide-react';

const statusConfig = {
  'Completed': { bg: '#dcfce7', color: '#15803d', icon: CheckCircle },
  'Pending':   { bg: '#fff7ed', color: '#c2410c', icon: Clock },
  'In Progress': { bg: '#eff6ff', color: '#1d4ed8', icon: Loader },
};

export default function LabReports() {
  const [reports, setReports] = useState([]);
  const storedUser = JSON.parse(localStorage.getItem('hb_user') || '{}');
  const PATIENT_ID = storedUser.patientCode || 'PAT-1001';

  useEffect(() => {
    setReports(emrStore.getLabReports(PATIENT_ID));
    const unsubscribe = emrStore.subscribe(() => {
      setReports(emrStore.getLabReports(PATIENT_ID));
    });
    return unsubscribe;
  }, [PATIENT_ID]);

  return (
    <div>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
          Lab Reports
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.92rem' }}>
          Your laboratory diagnostics, blood work, and imaging results.
        </p>
      </div>

      {reports.length === 0 ? (
        <div style={{ backgroundColor: '#ffffff', border: '2px dashed #cbd5e1', borderRadius: '16px', padding: '48px', textAlign: 'center', color: '#94a3b8' }}>
          <Microscope size={40} style={{ marginBottom: '12px', opacity: 0.4 }} />
          <p>No lab reports found. Reports will appear here once your tests are processed.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {reports.map((report) => {
            const cfg = statusConfig[report.status] || statusConfig['Pending'];
            const StatusIcon = cfg.icon;
            return (
              <div
                key={report.id}
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '14px',
                  padding: '20px 24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  boxShadow: '0 2px 8px -2px rgba(0,0,0,0.04)',
                  transition: 'box-shadow 0.2s'
                }}
              >
                {/* Left: Icon + Info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ width: '46px', height: '46px', borderRadius: '12px', backgroundColor: '#f0fdf4', color: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Microscope size={24} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#0f172a', marginBottom: '2px' }}>{report.testTitle}</div>
                    <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
                      <span style={{ backgroundColor: '#f1f5f9', padding: '2px 8px', borderRadius: '6px', fontWeight: 600, color: '#475569', marginRight: '8px' }}>{report.category}</span>
                      Ordered by <strong>{report.orderedDoctor}</strong> • {report.date}
                    </div>
                  </div>
                </div>

                {/* Right: Status + Download */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0 }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    backgroundColor: cfg.bg,
                    color: cfg.color,
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    padding: '5px 14px',
                    borderRadius: '20px'
                  }}>
                    <StatusIcon size={14} />
                    {report.status}
                  </div>

                  {report.status === 'Completed' && (
                    <button style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 16px',
                      backgroundColor: '#f1f5f9',
                      border: '1px solid #cbd5e1',
                      borderRadius: '10px',
                      color: '#334155',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      transition: 'all 0.2s'
                    }}>
                      <Download size={16} />
                      {report.fileName || 'Download PDF'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
