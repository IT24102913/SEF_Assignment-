import React, { useState, useEffect } from 'react';
import { emrStore } from '../../data/mockEmrStore';
import { Pill, Calendar, Clock, CheckCircle2, AlertCircle } from 'lucide-react';

const statusConfig = {
  'Active':    { bg: '#dbeafe', color: '#1d4ed8', icon: Clock },
  'Completed': { bg: '#dcfce7', color: '#15803d', icon: CheckCircle2 },
  'Cancelled': { bg: '#fef2f2', color: '#dc2626', icon: AlertCircle },
};

export default function PharmacyPage() {
  const [prescriptions, setPrescriptions] = useState([]);
  const storedUser = JSON.parse(localStorage.getItem('hb_user') || '{}');
  const PATIENT_ID = storedUser.patientCode || 'PAT-1001';

  useEffect(() => {
    setPrescriptions(emrStore.getPrescriptions(PATIENT_ID));
    const unsubscribe = emrStore.subscribe(() => {
      setPrescriptions(emrStore.getPrescriptions(PATIENT_ID));
    });
    return unsubscribe;
  }, [PATIENT_ID]);

  const active = prescriptions.filter(rx => rx.status === 'Active');
  const completed = prescriptions.filter(rx => rx.status !== 'Active');

  const RxCard = ({ rx }) => {
    const cfg = statusConfig[rx.status] || statusConfig['Active'];
    const StatusIcon = cfg.icon;
    return (
      <div style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '14px',
        padding: '22px 24px',
        boxShadow: '0 2px 8px -2px rgba(0,0,0,0.04)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: '#faf5ff', color: '#9333ea', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Pill size={22} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#0f172a' }}>{rx.medication}</div>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Prescribed by <strong>{rx.prescribedDoctor}</strong></div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: cfg.bg, color: cfg.color, fontSize: '0.82rem', fontWeight: 700, padding: '5px 14px', borderRadius: '20px' }}>
            <StatusIcon size={14} />
            {rx.status}
          </div>
        </div>

        {/* Details grid */}
        <div style={{ backgroundColor: '#f8fafc', padding: '14px 16px', borderRadius: '10px', fontSize: '0.88rem' }}>
          <div style={{ color: '#334155', marginBottom: '6px' }}>
            <strong>Instructions:</strong> {rx.dosage}
          </div>
          <div style={{ display: 'flex', gap: '24px', color: '#64748b', flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Calendar size={14} /> {rx.startDate} → {rx.endDate}
            </span>
            <span><strong>Duration:</strong> {rx.duration}</span>
            {rx.unitPrice && <span><strong>Cost:</strong> {rx.unitPrice}</span>}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>Pharmacy</h1>
        <p style={{ color: '#64748b', fontSize: '0.92rem' }}>
          Your active prescriptions, medication schedules, and refill history.
        </p>
      </div>

      {prescriptions.length === 0 ? (
        <div style={{ backgroundColor: '#ffffff', border: '2px dashed #cbd5e1', borderRadius: '16px', padding: '48px', textAlign: 'center', color: '#94a3b8' }}>
          <Pill size={40} style={{ marginBottom: '12px', opacity: 0.4 }} />
          <p>No prescriptions found. Medications will appear here after your doctor prescribes them.</p>
        </div>
      ) : (
        <>
          {/* Active Prescriptions */}
          {active.length > 0 && (
            <div style={{ marginBottom: '32px' }}>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1d4ed8', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={18} /> Active Prescriptions ({active.length})
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {active.map(rx => <RxCard key={rx.id} rx={rx} />)}
              </div>
            </div>
          )}

          {/* Completed Prescriptions */}
          {completed.length > 0 && (
            <div>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#64748b', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={18} /> Past Prescriptions ({completed.length})
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {completed.map(rx => <RxCard key={rx.id} rx={rx} />)}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
