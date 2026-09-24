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
        border: '1px solid #e2e8f0',
        borderRadius: '14px',
        padding: '22px 24px',
        boxShadow: '0 2px 8px -2px rgba(0,0,0,0.04)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: '#e6f5f2', color: '#095e51', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
            {rx.startDate && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Calendar size={14} /> {rx.startDate} {rx.endDate ? `→ ${rx.endDate}` : ''}
              </span>
            )}
            {rx.duration && <span><strong>Duration:</strong> {rx.duration}</span>}
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
