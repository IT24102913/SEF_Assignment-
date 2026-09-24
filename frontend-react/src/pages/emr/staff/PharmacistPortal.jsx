import React, { useState } from 'react';
import PatientSelector from './PatientSelector';
import { emrStore } from '../../../data/mockEmrStore';
import { Pill, PlusCircle, ShieldAlert, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';

export default function PharmacistPortal({ staffSession }) {
  const { user } = useAuth();
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [saving, setSaving] = useState(false);

  // Form state - 100% clean, no hardcoded demo values
  const [medication, setMedication] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [dosage, setDosage] = useState('');
  const [durationDays, setDurationDays] = useState('');
  const [prescribedDoctor, setPrescribedDoctor] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);

  const handleAddMedication = async (e) => {
    e.preventDefault();
    if (!selectedPatient) {
      toast.error('Please select a patient first.');
      return;
    }
    if (!medication.trim()) {
      toast.error('Please enter the medication name.');
      return;
    }
    if (!dosage.trim()) {
      toast.error('Please enter dosage instructions.');
      return;
    }

    setSaving(true);
    try {
      const days = parseInt(durationDays, 10) || 7;
      const start = new Date(startDate);
      const end = new Date(start);
      end.setDate(end.getDate() + days);
      const endDateStr = end.toISOString().split('T')[0];

      const todayStr = new Date().toISOString().split('T')[0];
      const initialStatus = endDateStr < todayStr ? 'Completed' : 'Active';

      const priceNum = parseFloat(String(unitPrice).replace(/[^0-9.]/g, '')) || 0;

      const newPrescription = {
        patientId: selectedPatient.id,
        patientName: selectedPatient.name,
        medication: medication.trim(),
        unitPrice: `$${priceNum.toFixed(2)}`,
        dosage: dosage.trim(),
        duration: `${days} Days`,
        startDate,
        endDate: endDateStr,
        prescribedDoctor: prescribedDoctor.trim() || 'Attending Physician',
        status: initialStatus,
        addedBy: `${staffSession.staffId || user?.fullName || 'Staff'} (Pharmacist)`
      };

      await emrStore.addPrescription(newPrescription);
      toast.success(`Medication "${medication}" logged for ${selectedPatient.name}!`);

      // Reset form
      setMedication('');
      setUnitPrice('');
      setDosage('');
      setDurationDays('');
      setPrescribedDoctor('');
    } catch (err) {
      toast.error('Failed to log prescription. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {/* Header Banner */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px', backgroundColor: '#faf5ff', padding: '20px', borderRadius: '16px', border: '1px solid #e9d5ff' }}>
        <div style={{ width: '44px', height: '44px', borderRadius: '12px', backgroundColor: '#9333ea', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Pill size={24} />
        </div>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>Pharmacist Workspace</h2>
          <p style={{ color: '#475569', fontSize: '0.9rem' }}>
            Logged in as <strong>{staffSession.staffId}</strong> • Authorized to log medication dispensing & prescription schedules.
          </p>
        </div>
      </div>

      {/* Privacy Guard Notice */}
      <div style={{ backgroundColor: '#fff7ed', border: '1px solid #fed7aa', color: '#c2410c', padding: '14px 18px', borderRadius: '12px', fontSize: '0.88rem', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <ShieldAlert size={20} />
        <div>
          <strong>Privacy Shield Policy:</strong> Full consultation notes are restricted to Doctor & Patient. Pharmacists log medication based on doctor order slip or patient request item.
        </div>
      </div>

      {/* 1. Patient Selector */}
      <PatientSelector selectedPatient={selectedPatient} onSelectPatient={setSelectedPatient} />

      {/* 2. Pharmacist Form */}
      {selectedPatient ? (
        <form onSubmit={handleAddMedication} style={{
          backgroundColor: '#ffffff',
          border: '1.5px solid #cbd5e1',
          borderRadius: '20px',
          padding: '32px',
          boxShadow: '0 8px 20px -4px rgba(0, 0, 0, 0.04)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid #f1f5f9', pb: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <PlusCircle size={22} color="#9333ea" />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a' }}>
                Log Medication for {selectedPatient.name} ({selectedPatient.id})
              </h3>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginBottom: '20px' }}>
            <div className="form-group">
              <label style={{ fontSize: '0.88rem', fontWeight: 600, color: '#334155', marginBottom: '6px', display: 'block' }}>Medication Name & Strength</label>
              <input
                type="text"
                value={medication}
                onChange={(e) => setMedication(e.target.value)}
                placeholder="e.g. Amoxicillin 500mg, Paracetamol 500mg, Metformin 850mg"
                required
                className="input-field"
                style={{ width: '100%' }}
              />
            </div>

            <div className="form-group">
              <label style={{ fontSize: '0.88rem', fontWeight: 600, color: '#334155', marginBottom: '6px', display: 'block' }}>Unit Price (Optional)</label>
              <input
                type="text"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                placeholder="e.g. 15.00"
                className="input-field"
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '0.88rem', fontWeight: 600, color: '#334155', marginBottom: '6px', display: 'block' }}>Dosage & Consumption Instructions</label>
            <input
              type="text"
              value={dosage}
              onChange={(e) => setDosage(e.target.value)}
              placeholder="e.g. Take 1 capsule every 8 hours with meals"
              required
              className="input-field"
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '28px' }}>
            <div className="form-group">
              <label style={{ fontSize: '0.88rem', fontWeight: 600, color: '#334155', marginBottom: '6px', display: 'block' }}>Course Duration (Days)</label>
              <input
                type="number"
                min="1"
                max="365"
                value={durationDays}
                onChange={(e) => setDurationDays(e.target.value)}
                placeholder="e.g. 7"
                required
                className="input-field"
                style={{ width: '100%' }}
              />
            </div>

            <div className="form-group">
              <label style={{ fontSize: '0.88rem', fontWeight: 600, color: '#334155', marginBottom: '6px', display: 'block' }}>Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="input-field"
                style={{ width: '100%' }}
              />
            </div>

            <div className="form-group">
              <label style={{ fontSize: '0.88rem', fontWeight: 600, color: '#334155', marginBottom: '6px', display: 'block' }}>Prescribed Doctor</label>
              <input
                type="text"
                value={prescribedDoctor}
                onChange={(e) => setPrescribedDoctor(e.target.value)}
                placeholder="e.g. Dr. John Doe"
                className="input-field"
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="btn btn-primary"
            style={{
              backgroundColor: '#9333ea',
              borderColor: '#9333ea',
              padding: '14px 28px',
              fontSize: '1rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.7 : 1
            }}
          >
            <Save size={18} /> {saving ? 'Logging Medication...' : 'Log & Dispense Medication'}
          </button>
        </form>
      ) : (
        <div style={{ backgroundColor: '#ffffff', border: '2px dashed #cbd5e1', borderRadius: '16px', padding: '40px', textAlign: 'center', color: '#64748b' }}>
          Select a patient above to log prescription and medication schedules.
        </div>
      )}
    </div>
  );
}
