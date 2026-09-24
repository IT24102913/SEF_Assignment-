import React, { useState } from 'react';
import PatientSelector from './PatientSelector';
import { emrStore } from '../../../data/mockEmrStore';
import { Stethoscope, FilePlus, Save, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';

export default function ConsultantPortal({ staffSession }) {
  const { user } = useAuth();
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [saving, setSaving] = useState(false);
  
  // Doctor form state
  const defaultDoctor = user?.role === 'Doctor' ? (user.fullName || '') : (staffSession?.staffId && !staffSession.staffId.includes('DOC') ? staffSession.staffId : '');
  const [doctorName, setDoctorName] = useState(defaultDoctor);
  const [doctorDesignation, setDoctorDesignation] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [diagnosis, setDiagnosis] = useState('');
  const [recommendedTests, setRecommendedTests] = useState('');
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

  const handleSaveNote = async (e) => {
    e.preventDefault();
    if (!selectedPatient) {
      toast.error('Please select a patient first.');
      return;
    }
    if (!diagnosis.trim()) {
      toast.error('Please enter the primary diagnosis.');
      return;
    }

    setSaving(true);
    try {
      const newNote = {
        patientId: selectedPatient.id,
        patientName: selectedPatient.name,
        doctorId: staffSession?.staffId || 'DOC-101',
        doctorName: doctorName.trim() || 'Dr. Consultant',
        doctorDesignation: doctorDesignation.trim() || 'Consultant Specialist',
        date,
        diagnosis: diagnosis.trim(),
        recommendedTests: recommendedTests ? recommendedTests.split(',').map(t => t.trim()).filter(Boolean) : [],
        medicines: medicines.filter(m => m.name.trim()),
        notes: clinicalNotes.trim()
      };

      await emrStore.addConsultation(newNote);
      toast.success(`Consultation note saved for ${selectedPatient.name}!`);

      // Reset form fields
      setDiagnosis('');
      setRecommendedTests('');
      setClinicalNotes('');
      setMedicines([{ name: '', dosage: '', duration: '' }]);
    } catch (err) {
      console.error('Failed to save consultation note:', err);
      toast.error('Failed to save consultation note. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* 1. Header Banner */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        marginBottom: '24px',
        backgroundColor: '#f0f7ff',
        padding: '18px 24px',
        borderRadius: '16px',
        border: '1.5px solid #bfdbfe'
      }}>
        <div style={{
          width: '42px',
          height: '42px',
          borderRadius: '12px',
          backgroundColor: '#2563eb',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          <Stethoscope size={22} />
        </div>
        <div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: '0 0 2px 0' }}>
            Consultant (Doctor) Workspace
          </h2>
          <p style={{ color: '#475569', fontSize: '0.88rem', margin: 0 }}>
            Logged in as <strong>{staffSession?.staffId || 'DOC-101'}</strong> • Authorized to author clinical diagnosis & consultation notes.
          </p>
        </div>
      </div>

      {/* 2. Patient Selector Component (Shows max 8 patients & prominent search) */}
      <PatientSelector selectedPatient={selectedPatient} onSelectPatient={setSelectedPatient} />

      {/* 3. Doctor Consultation Entry Form */}
      {selectedPatient ? (
        <form onSubmit={handleSaveNote} style={{
          backgroundColor: '#ffffff',
          border: '1.5px solid #cbd5e1',
          borderRadius: '16px',
          padding: '28px 32px',
          boxShadow: '0 4px 14px rgba(0, 0, 0, 0.03)'
        }}>
          {/* Form Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '24px',
            borderBottom: '1px solid #f1f5f9',
            paddingBottom: '16px'
          }}>
            <FilePlus size={22} color="#2563eb" />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Create Consultation Note for {selectedPatient.name} ({selectedPatient.id})
            </h3>
          </div>

          {/* Row 1: Doctor Name, Designation, Date */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 1fr', gap: '20px', marginBottom: '20px' }}>
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '8px', display: 'block' }}>
                Doctor Name
              </label>
              <input
                type="text"
                value={doctorName}
                onChange={(e) => setDoctorName(e.target.value)}
                placeholder="Dr. Sarah Jenkins"
                style={{
                  width: '100%',
                  padding: '11px 16px',
                  borderRadius: '10px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '0.92rem',
                  outline: 'none',
                  backgroundColor: '#ffffff'
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '8px', display: 'block' }}>
                Designation / Specialty
              </label>
              <input
                type="text"
                value={doctorDesignation}
                onChange={(e) => setDoctorDesignation(e.target.value)}
                placeholder="Senior Consultant (MD)"
                style={{
                  width: '100%',
                  padding: '11px 16px',
                  borderRadius: '10px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '0.92rem',
                  outline: 'none',
                  backgroundColor: '#ffffff'
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '8px', display: 'block' }}>
                Consultation Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '11px 16px',
                  borderRadius: '10px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '0.92rem',
                  outline: 'none',
                  backgroundColor: '#ffffff'
                }}
              />
            </div>
          </div>

          {/* Row 2: Primary Diagnosis */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '8px', display: 'block' }}>
              Primary Diagnosis
            </label>
            <input
              type="text"
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              placeholder="e.g. Mild Hypertension, Seasonal Allergies, Diabetes Type 2"
              required
              style={{
                width: '100%',
                padding: '11px 16px',
                borderRadius: '10px',
                border: '1.5px solid #cbd5e1',
                fontSize: '0.92rem',
                outline: 'none',
                backgroundColor: '#ffffff'
              }}
            />
          </div>

          {/* Row 3: Recommended Diagnostic Tests */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '8px', display: 'block' }}>
              Recommended Diagnostic Tests (Comma separated)
            </label>
            <input
              type="text"
              value={recommendedTests}
              onChange={(e) => setRecommendedTests(e.target.value)}
              placeholder="Complete Blood Count (CBC), Lipid Profile Panel"
              style={{
                width: '100%',
                padding: '11px 16px',
                borderRadius: '10px',
                border: '1.5px solid #cbd5e1',
                fontSize: '0.92rem',
                outline: 'none',
                backgroundColor: '#ffffff'
              }}
            />
          </div>

          {/* Row 4: Prescribed Medications & Items Box */}
          <div style={{
            marginBottom: '24px',
            backgroundColor: '#f8fafc',
            padding: '20px 22px',
            borderRadius: '14px',
            border: '1.5px solid #e2e8f0'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Prescribed Medications & Items
              </h4>
              <button
                type="button"
                onClick={handleAddMedicine}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 16px',
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '20px',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(37, 99, 235, 0.25)'
                }}
              >
                <Plus size={14} /> Add Medicine
              </button>
            </div>

            {medicines.map((med, index) => (
              <div key={index} style={{
                display: 'grid',
                gridTemplateColumns: '1.4fr 2fr 1.2fr 36px',
                gap: '12px',
                marginBottom: '10px',
                alignItems: 'center'
              }}>
                <input
                  type="text"
                  placeholder="Medicine Name"
                  value={med.name}
                  onChange={(e) => handleMedicineChange(index, 'name', e.target.value)}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.9rem',
                    backgroundColor: '#ffffff',
                    outline: 'none'
                  }}
                />
                <input
                  type="text"
                  placeholder="Dosage Instructions (e.g. 1 tab 3x daily)"
                  value={med.dosage}
                  onChange={(e) => handleMedicineChange(index, 'dosage', e.target.value)}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.9rem',
                    backgroundColor: '#ffffff',
                    outline: 'none'
                  }}
                />
                <input
                  type="text"
                  placeholder="Duration (e.g. 7 Days)"
                  value={med.duration}
                  onChange={(e) => handleMedicineChange(index, 'duration', e.target.value)}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.9rem',
                    backgroundColor: '#ffffff',
                    outline: 'none'
                  }}
                />
                {medicines.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => handleRemoveMedicine(index)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#ef4444',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '4px'
                    }}
                    title="Remove item"
                  >
                    <Trash2 size={18} />
                  </button>
                ) : <div />}
              </div>
            ))}
          </div>

          {/* Row 5: Detailed Doctor Clinical Notes */}
          <div style={{ marginBottom: '28px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '8px', display: 'block' }}>
              Detailed Doctor Clinical Notes
            </label>
            <textarea
              rows={4}
              value={clinicalNotes}
              onChange={(e) => setClinicalNotes(e.target.value)}
              placeholder="Enter patient symptom history, vitals, lifestyle advice..."
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '12px',
                border: '1.5px solid #cbd5e1',
                fontSize: '0.92rem',
                outline: 'none',
                backgroundColor: '#ffffff',
                resize: 'vertical',
                fontFamily: 'inherit'
              }}
            />
          </div>

          {/* Bottom Action: Forest Green Save Button */}
          <button
            type="submit"
            disabled={saving}
            style={{
              backgroundColor: '#065f46',
              color: '#ffffff',
              border: 'none',
              padding: '12px 26px',
              borderRadius: '10px',
              fontSize: '0.98rem',
              fontWeight: 700,
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.7 : 1,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 10px rgba(6, 95, 70, 0.25)',
              transition: 'background 0.2s, transform 0.1s'
            }}
          >
            <Save size={18} /> {saving ? 'Saving Consultation...' : 'Save Consultation Note'}
          </button>
        </form>
      ) : (
        <div style={{
          backgroundColor: '#ffffff',
          border: '2px dashed #cbd5e1',
          borderRadius: '16px',
          padding: '44px 20px',
          textAlign: 'center',
          color: '#64748b',
          fontSize: '0.95rem'
        }}>
          Select a patient above to start writing consultation notes.
        </div>
      )}
    </div>
  );
}
