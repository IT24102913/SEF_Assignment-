import React, { useState } from 'react';
import PatientSelector from '../components/PatientSelector';
import { emrStore } from '../../../data/mockEmrStore';
import { Stethoscope, FilePlus, Save, CheckCircle, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ConsultantPortal({ staffSession }) {
  const [selectedPatient, setSelectedPatient] = useState(null);
  
  // Doctor form state
  const [doctorName, setDoctorName] = useState('Dr. Sarah Jenkins');
  const [doctorDesignation, setDoctorDesignation] = useState('Senior Consultant (MD)');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [diagnosis, setDiagnosis] = useState('');
  const [recommendedTests, setRecommendedTests] = useState('Complete Blood Count (CBC), Lipid Profile Panel');
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [medicines, setMedicines] = useState([
    { name: '', dosage: '', duration: '' }
  ]);

  const handleAddMedicine = () => {
    setMedicines([...medicines, { name: '', dosage: '', duration: '' }]);
  };

  const handleRemoveMedicine = (index) => {
    setMedicines(medicines.filter((_, i) => i !== index));
  };

  const handleMedicineChange = (index, field, value) => {
    const updated = [...medicines];
    updated[index][field] = value;
    setMedicines(updated);
  };

  const handleSaveNote = (e) => {
    e.preventDefault();
    if (!selectedPatient) {
      toast.error('Please select a patient first.');
      return;
    }
    if (!diagnosis.trim()) {
      toast.error('Please enter the primary diagnosis.');
      return;
    }

    const newNote = {
      id: `CN-${Math.floor(1000 + Math.random() * 9000)}`,
      patientId: selectedPatient.id,
      patientName: selectedPatient.name,
      doctorName,
      doctorDesignation,
      date,
      diagnosis,
      recommendedTests: recommendedTests.split(',').map(t => t.trim()).filter(Boolean),
      medicines: medicines.filter(m => m.name.trim()),
      notes: clinicalNotes
    };

    emrStore.addConsultation(newNote);
    toast.success(`Consultation note saved for ${selectedPatient.name}!`);

    // Reset form
    setDiagnosis('');
    setClinicalNotes('');
    setMedicines([{ name: '', dosage: '', duration: '' }]);
  };

  return (
    <div>
      {/* Header Banner */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px', backgroundColor: '#eff6ff', padding: '20px', borderRadius: '16px', border: '1px solid #bfdbfe' }}>
        <div style={{ width: '44px', height: '44px', borderRadius: '12px', backgroundColor: '#2563eb', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Stethoscope size={24} />
        </div>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>Consultant (Doctor) Workspace</h2>
          <p style={{ color: '#475569', fontSize: '0.9rem' }}>
            Logged in as <strong>{staffSession.staffId}</strong> • Authorized to author clinical diagnosis & consultation notes.
          </p>
        </div>
      </div>

      {/* 1. Patient Selector */}
      <PatientSelector selectedPatient={selectedPatient} onSelectPatient={setSelectedPatient} />

      {/* 2. Doctor Consultation Entry Form */}
      {selectedPatient ? (
        <form onSubmit={handleSaveNote} style={{
          backgroundColor: '#ffffff',
          border: '1.5px solid #cbd5e1',
          borderRadius: '20px',
          padding: '32px',
          boxShadow: '0 8px 20px -4px rgba(0, 0, 0, 0.04)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px', borderBottom: '1px solid #f1f5f9', pb: '16px' }}>
            <FilePlus size={22} color="#2563eb" />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a' }}>
              Create Consultation Note for {selectedPatient.name} ({selectedPatient.id})
            </h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '20px' }}>
            <div className="form-group">
              <label style={{ fontSize: '0.88rem', fontWeight: 600, color: '#334155', marginBottom: '6px', display: 'block' }}>Doctor Name</label>
              <input type="text" value={doctorName} onChange={(e) => setDoctorName(e.target.value)} required className="input-field" style={{ width: '100%' }} />
            </div>

            <div className="form-group">
              <label style={{ fontSize: '0.88rem', fontWeight: 600, color: '#334155', marginBottom: '6px', display: 'block' }}>Designation / Specialty</label>
              <input type="text" value={doctorDesignation} onChange={(e) => setDoctorDesignation(e.target.value)} required className="input-field" style={{ width: '100%' }} />
            </div>

            <div className="form-group">
              <label style={{ fontSize: '0.88rem', fontWeight: 600, color: '#334155', marginBottom: '6px', display: 'block' }}>Consultation Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required className="input-field" style={{ width: '100%' }} />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '0.88rem', fontWeight: 600, color: '#334155', marginBottom: '6px', display: 'block' }}>Primary Diagnosis</label>
            <input type="text" value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} placeholder="e.g. Mild Hypertension, Seasonal Allergies, Diabetes Type 2" required className="input-field" style={{ width: '100%' }} />
          </div>

          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label style={{ fontSize: '0.88rem', fontWeight: 600, color: '#334155', marginBottom: '6px', display: 'block' }}>Recommended Diagnostic Tests (Comma separated)</label>
            <input type="text" value={recommendedTests} onChange={(e) => setRecommendedTests(e.target.value)} placeholder="e.g. Complete Blood Count (CBC), Lipid Profile Panel, Chest X-Ray" className="input-field" style={{ width: '100%' }} />
          </div>

          {/* Prescribed Medicines Builder */}
          <div style={{ marginBottom: '24px', backgroundColor: '#f8fafc', padding: '20px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>Prescribed Medications & Items</h4>
              <button type="button" onClick={handleAddMedicine} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}>
                <Plus size={14} /> Add Medicine
              </button>
            </div>

            {medicines.map((med, index) => (
              <div key={index} style={{ display: 'grid', gridTemplateColumns: '1.5fr 2fr 1fr 40px', gap: '12px', marginBottom: '10px', alignItems: 'center' }}>
                <input type="text" placeholder="Medicine Name" value={med.name} onChange={(e) => handleMedicineChange(index, 'name', e.target.value)} className="input-field" />
                <input type="text" placeholder="Dosage Instructions (e.g. 1 tab 3x daily)" value={med.dosage} onChange={(e) => handleMedicineChange(index, 'dosage', e.target.value)} className="input-field" />
                <input type="text" placeholder="Duration (e.g. 7 Days)" value={med.duration} onChange={(e) => handleMedicineChange(index, 'duration', e.target.value)} className="input-field" />
                {medicines.length > 1 && (
                  <button type="button" onClick={() => handleRemoveMedicine(index)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="form-group" style={{ marginBottom: '28px' }}>
            <label style={{ fontSize: '0.88rem', fontWeight: 600, color: '#334155', marginBottom: '6px', display: 'block' }}>Detailed Doctor Clinical Notes</label>
            <textarea rows={4} value={clinicalNotes} onChange={(e) => setClinicalNotes(e.target.value)} placeholder="Enter patient symptom history, vitals, lifestyle advice..." className="input-field" style={{ width: '100%', resize: 'vertical' }} />
          </div>

          <button type="submit" className="btn btn-primary" style={{ padding: '14px 28px', fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Save size={18} /> Save Consultation Note
          </button>
        </form>
      ) : (
        <div style={{ backgroundColor: '#ffffff', border: '2px dashed #cbd5e1', borderRadius: '16px', padding: '40px', textAlign: 'center', color: '#64748b' }}>
          Select a patient above to start writing consultation notes.
        </div>
      )}
    </div>
  );
}
