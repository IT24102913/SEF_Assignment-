import React, { useState } from 'react';
import PatientSelector from '../components/PatientSelector';
import { emrStore } from '../../../data/mockEmrStore';
import { Pill, PlusCircle, ShieldAlert, CheckCircle2, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PharmacistPortal({ staffSession }) {
  const [selectedPatient, setSelectedPatient] = useState(null);

  // Form state
  const [medication, setMedication] = useState('Amoxicillin 500mg');
  const [unitPrice, setUnitPrice] = useState('$15.00');
  const [dosage, setDosage] = useState('Take 1 capsule every 8 hours with meals');
  const [durationDays, setDurationDays] = useState(7);
  const [prescribedDoctor, setPrescribedDoctor] = useState('Dr. Sarah Jenkins');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);

  const handleAddMedication = (e) => {
    e.preventDefault();
    if (!selectedPatient) {
      toast.error('Please select a patient first.');
      return;
    }

    // Calculate end date based on duration
    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(end.getDate() + parseInt(durationDays || 7));
    const endDateStr = end.toISOString().split('T')[0];

    const todayStr = new Date().toISOString().split('T')[0];
    const initialStatus = endDateStr < todayStr ? 'Completed' : 'Active';

    const newPrescription = {
      id: `RX-${Math.floor(1000 + Math.random() * 9000)}`,
      patientId: selectedPatient.id,
      patientName: selectedPatient.name,
      medication,
      unitPrice: unitPrice.startsWith('$') ? unitPrice : `$${unitPrice}`,
      dosage,
      duration: `${durationDays} Days`,
      startDate,
      endDate: endDateStr,
      prescribedDoctor,
      status: initialStatus,
      addedBy: `${staffSession.staffId} (Pharmacist)`
    };

    emrStore.addPrescription(newPrescription);
    toast.success(`Medication "${medication}" logged for ${selectedPatient.name}!`);

    // Reset inputs
    setMedication('');
    setDosage('');
  };

  const handleEditRequest = () => {
    toast('Edit/Delete restricted for Pharmacists. Request sent to Super Admin.', {
      icon: '🛡️',
    });
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
                Dispense Medication for {selectedPatient.name} ({selectedPatient.id})
              </h3>
            </div>

            <div style={{ fontSize: '0.8rem', backgroundColor: '#f1f5f9', color: '#475569', padding: '4px 12px', borderRadius: '12px', fontWeight: 600 }}>
              Permission: Create Only (Auto-Status Transition)
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: '20px', marginBottom: '20px' }}>
            <div className="form-group">
              <label style={{ fontSize: '0.88rem', fontWeight: 600, color: '#334155', marginBottom: '6px', display: 'block' }}>Medication Name & Strength</label>
              <input type="text" value={medication} onChange={(e) => setMedication(e.target.value)} required placeholder="e.g. Amoxicillin 500mg, Paracetamol 500mg" className="input-field" style={{ width: '100%' }} />
            </div>

            <div className="form-group">
              <label style={{ fontSize: '0.88rem', fontWeight: 600, color: '#334155', marginBottom: '6px', display: 'block' }}>Unit Price / Cost</label>
              <input type="text" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} required className="input-field" style={{ width: '100%' }} />
            </div>

            <div className="form-group">
              <label style={{ fontSize: '0.88rem', fontWeight: 600, color: '#334155', marginBottom: '6px', display: 'block' }}>Prescribed Doctor</label>
              <input type="text" value={prescribedDoctor} onChange={(e) => setPrescribedDoctor(e.target.value)} required className="input-field" style={{ width: '100%' }} />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '0.88rem', fontWeight: 600, color: '#334155', marginBottom: '6px', display: 'block' }}>Dosage Instructions</label>
            <input type="text" value={dosage} onChange={(e) => setDosage(e.target.value)} required placeholder="e.g. Take 1 capsule every 8 hours after meals" className="input-field" style={{ width: '100%' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '28px' }}>
            <div className="form-group">
              <label style={{ fontSize: '0.88rem', fontWeight: 600, color: '#334155', marginBottom: '6px', display: 'block' }}>Start Date</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required className="input-field" style={{ width: '100%' }} />
            </div>

            <div className="form-group">
              <label style={{ fontSize: '0.88rem', fontWeight: 600, color: '#334155', marginBottom: '6px', display: 'block' }}>Duration (Days)</label>
              <input type="number" min="1" max="180" value={durationDays} onChange={(e) => setDurationDays(e.target.value)} required className="input-field" style={{ width: '100%' }} />
            </div>

            <div className="form-group">
              <label style={{ fontSize: '0.88rem', fontWeight: 600, color: '#334155', marginBottom: '6px', display: 'block' }}>Auto Status Transition</label>
              <div style={{ padding: '10px 14px', backgroundColor: '#f1f5f9', borderRadius: '10px', fontSize: '0.88rem', fontWeight: 600, color: '#2563eb', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={16} /> Active → Auto Completed after Duration
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            <button type="submit" className="btn" style={{ backgroundColor: '#9333ea', color: '#fff', padding: '14px 28px', fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <CheckCircle2 size={18} /> Dispense & Save Prescription
            </button>

            <button type="button" onClick={handleEditRequest} className="btn btn-secondary" style={{ color: '#475569' }}>
              Request Edit / Delete Authorization
            </button>
          </div>
        </form>
      ) : (
        <div style={{ backgroundColor: '#ffffff', border: '2px dashed #cbd5e1', borderRadius: '16px', padding: '40px', textAlign: 'center', color: '#64748b' }}>
          Select a patient above to log medication prescriptions.
        </div>
      )}
    </div>
  );
}
