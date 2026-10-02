import React, { useState, useEffect } from 'react';
import { emrApi } from '../../../api/emrApi';
import { Pill, Calendar, Clock, CheckCircle2, AlertCircle, Loader } from 'lucide-react';

const statusConfig = {
  'Active':    { bg: '#dbeafe', color: '#0d7c6b', icon: Clock },
  'Completed': { bg: '#dcfce7', color: '#15803d', icon: CheckCircle2 },
  'Cancelled': { bg: '#fef2f2', color: '#dc2626', icon: AlertCircle },
};

export default function Prescriptions() {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInfo, setShowInfo] = useState(false);

  useEffect(() => {
    fetchPrescriptions();
  }, []);

  const fetchPrescriptions = async () => {
    setLoading(true);
    try {
      const myPatient = await emrApi.getMyPatient();
      if (myPatient && myPatient.patientCode) {
        const data = await emrApi.getPrescriptions(myPatient.patientCode);
        setPrescriptions((data || []).map(p => ({
          id: p.id,
          medication: p.medicationName,
          unitPrice: p.unitPrice ? `$${p.unitPrice.toFixed(2)}` : '',
          dosage: p.dosage,
          duration: p.duration,
          startDate: p.startDate ? p.startDate.split('T')[0] : '',
          endDate: p.endDate ? p.endDate.split('T')[0] : '',
          prescribedDoctor: p.prescribedDoctor,
          status: p.status || 'Active'
        })));
      } else {
        setPrescriptions([]);
      }
    } catch (err) {
      console.error('Error fetching prescriptions:', err);
      setPrescriptions([]);
    } finally {
      setLoading(false);
    }
  };

  const active = prescriptions.filter(rx => rx.status === 'Active');
  const completed = prescriptions.filter(rx => rx.status !== 'Active');

  const RxCard = ({ rx }) => {
    const cfg = statusConfig[rx.status] || statusConfig['Active'];
    const StatusIcon = cfg.icon;
    return (
      <div style={{
        backgroundColor: '#ffffff',
        border: '1.5px solid #cbd5e1',
        borderRadius: '16px',
        padding: '24px 26px',
        boxShadow: '0 4px 16px -2px rgba(15, 23, 42, 0.08), 0 2px 4px -1px rgba(15, 23, 42, 0.04)',
        transition: 'all 0.2s ease-in-out'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#ecfdf5', color: '#095e51', border: '1.5px solid #a7f3d0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Pill size={24} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.18rem', color: '#0f172a', letterSpacing: '-0.01em' }}>{rx.medication}</div>
              <div style={{ fontSize: '0.86rem', color: '#475569', marginTop: '2px' }}>Prescribed by <strong style={{ color: '#0f172a' }}>{rx.prescribedDoctor}</strong></div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: cfg.bg, color: cfg.color, fontSize: '0.85rem', fontWeight: 800, padding: '6px 16px', borderRadius: '20px', border: `1.5px solid ${cfg.color}30` }}>
            <StatusIcon size={15} />
            {rx.status}
          </div>
        </div>

        {/* Details box with crisp borders & distinct contrast */}
        <div style={{
          backgroundColor: '#f8fafc',
          border: '1.5px solid #cbd5e1',
          borderLeft: '5px solid #0d7c6b',
          padding: '16px 20px',
          borderRadius: '12px',
          fontSize: '0.92rem'
        }}>
          <div style={{ color: '#0f172a', marginBottom: '10px', fontSize: '0.96rem' }}>
            <span style={{ fontWeight: 800, color: '#095e51', marginRight: '8px' }}>Instructions:</span>
            <span style={{ fontWeight: 700, color: '#0f172a' }}>{rx.dosage}</span>
          </div>
          <div style={{ display: 'flex', gap: '12px', color: '#334155', flexWrap: 'wrap', fontSize: '0.86rem' }}>
            {rx.startDate && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#ffffff', padding: '5px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontWeight: 600 }}>
                <Calendar size={14} color="#0d7c6b" /> {rx.startDate} {rx.endDate ? `→ ${rx.endDate}` : ''}
              </span>
            )}
            {rx.duration && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', backgroundColor: '#ffffff', padding: '5px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontWeight: 600 }}>
                <strong style={{ color: '#095e51' }}>Duration:</strong> {rx.duration}
              </span>
            )}
            {rx.unitPrice && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', backgroundColor: '#ffffff', padding: '5px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontWeight: 600 }}>
                <strong style={{ color: '#095e51' }}>Cost:</strong> {rx.unitPrice}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#0f172a', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>Pharmacy</span>
          <button
            type="button"
            onClick={() => setShowInfo(prev => !prev)}
            title={showInfo ? "Hide explanation" : "Click to view description"}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '22px',
              height: '22px',
              borderRadius: '50%',
              backgroundColor: showInfo ? '#0d7c6b' : '#f1f5f9',
              color: showInfo ? '#ffffff' : '#0d7c6b',
              border: `1.5px solid ${showInfo ? '#0d7c6b' : '#cbd5e1'}`,
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 800,
              fontFamily: 'monospace, sans-serif',
              lineHeight: 1,
              padding: 0,
              transition: 'all 0.2s ease',
              boxShadow: showInfo ? '0 0 0 3px rgba(13, 124, 107, 0.2)' : 'none'
            }}
          >
            !
          </button>
        </h1>
        {showInfo && (
          <p style={{ color: '#0d7c6b', fontSize: '0.92rem', fontWeight: 500, margin: '4px 0 0 0', animation: 'fadeIn 0.2s ease-out' }}>
            Your active prescriptions, medication schedules, and refill history.
          </p>
        )}
      </div>

      {loading ? (
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '48px', textAlign: 'center', color: '#64748b' }}>
          <Loader size={32} className="animate-spin" style={{ margin: '0 auto 12px auto', display: 'block', color: '#0d7c6b' }} />
          <p>Loading your prescriptions...</p>
        </div>
      ) : prescriptions.length === 0 ? (
        <div style={{ backgroundColor: '#ffffff', border: '2px dashed #cbd5e1', borderRadius: '16px', padding: '48px', textAlign: 'center', color: '#94a3b8' }}>
          <Pill size={40} style={{ marginBottom: '12px', opacity: 0.4 }} />
          <p>No prescriptions found. Medications will appear here after your doctor prescribes them.</p>
        </div>
      ) : (
        <>
          {/* Active Prescriptions */}
          {active.length > 0 && (
            <div style={{ marginBottom: '32px' }}>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0d7c6b', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
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
