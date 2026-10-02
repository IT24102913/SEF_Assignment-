import React, { useState } from 'react';
import PatientSelector from './PatientSelector';
import { emrStore } from '../../../data/mockEmrStore';
import { Pill, PlusCircle, AlertCircle, CheckCircle2, Clock, Plus, Trash2, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';

export default function PharmacistPortal({ staffSession }) {
  const { user } = useAuth();
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [saving, setSaving] = useState(false);

  // General Prescription Order fields
  const [prescribedDoctor, setPrescribedDoctor] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);

  // Multi-medicine item list
  const [medicines, setMedicines] = useState([
    { medication: '', unitPrice: '', dosage: '', durationDays: '7' }
  ]);

  const handleAddMedicineItem = () => {
    setMedicines([
      ...medicines,
      { medication: '', unitPrice: '', dosage: '', durationDays: '7' }
    ]);
  };

  const handleRemoveMedicineItem = (index) => {
    if (medicines.length <= 1) return;
    setMedicines(medicines.filter((_, i) => i !== index));
  };

  const handleMedicineChange = (index, field, value) => {
    const updated = [...medicines];
    updated[index][field] = value;
    setMedicines(updated);
  };

  // Compute total cost across all medicines
  const totalCost = medicines.reduce((sum, m) => {
    const price = parseFloat(String(m.unitPrice || '0').replace(/[^0-9.]/g, '')) || 0;
    return sum + price;
  }, 0);

  const handleDispenseAll = async (e) => {
    e.preventDefault();
    if (!selectedPatient) {
      toast.error('Please select a patient first.');
      return;
    }

    const validMeds = medicines.filter(m => m.medication && m.medication.trim());
    if (validMeds.length === 0) {
      toast.error('Please add at least one medication name.');
      return;
    }

    for (let i = 0; i < validMeds.length; i++) {
      if (!validMeds[i].dosage || !validMeds[i].dosage.trim()) {
        toast.error(`Please enter dosage instructions for "${validMeds[i].medication}".`);
        return;
      }
    }

    setSaving(true);
    const todayStr = new Date().toISOString().split('T')[0];
    let savedCount = 0;

    try {
      await emrStore.addPrescriptionsBatch(
        selectedPatient.id,
        prescribedDoctor.trim() || 'Dr. Consultant',
        validMeds
      );

      toast.success(`Successfully dispensed ${validMeds.length} medication(s) for ${selectedPatient.name}!`);

      // Reset form to clean single item
      setMedicines([
        { medication: '', unitPrice: '', dosage: '', durationDays: '7' }
      ]);
      setPrescribedDoctor('');
    } catch (err) {
      console.error('Failed to log prescriptions:', err);
      toast.error('Failed to log all prescriptions. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleRequestAuthorization = () => {
    toast('Edit/Delete authorization requested. Request sent to Super Admin.', {
      icon: '🛡️',
      style: {
        borderRadius: '10px',
        background: '#334155',
        color: '#fff',
      }
    });
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* 1. Header Banner */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        marginBottom: '20px',
        backgroundColor: '#faf5ff',
        padding: '18px 24px',
        borderRadius: '16px',
        border: '1.5px solid #e9d5ff'
      }}>
        <div style={{
          width: '42px',
          height: '42px',
          borderRadius: '12px',
          backgroundColor: '#9333ea',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          <Pill size={22} />
        </div>
        <div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: '0 0 2px 0' }}>
            Pharmacist Workspace
          </h2>
          <p style={{ color: '#475569', fontSize: '0.88rem', margin: 0 }}>
            Logged in as <strong>{staffSession?.staffId || 'PHARM-303'}</strong> • Authorized to log medication dispensing & prescription schedules.
          </p>
        </div>
      </div>

      {/* 2. Privacy Shield Policy Alert Box */}
      <div style={{
        backgroundColor: '#fff7ed',
        border: '1.5px solid #fed7aa',
        color: '#9a3412',
        padding: '14px 20px',
        borderRadius: '12px',
        fontSize: '0.88rem',
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <AlertCircle size={20} color="#ea580c" style={{ flexShrink: 0 }} />
        <div>
          <strong>Privacy Shield Policy:</strong> Full consultation notes are restricted to Doctor & Patient. Pharmacists log medication based on doctor order slip or patient request item.
        </div>
      </div>

      {/* 3. Patient Selector (Shows max 8 patients & prominent search) */}
      <PatientSelector selectedPatient={selectedPatient} onSelectPatient={setSelectedPatient} />

      {/* 4. Multi-Medication Dispensing Form Card */}
      {selectedPatient ? (
        <form onSubmit={handleDispenseAll} style={{
          backgroundColor: '#ffffff',
          border: '1.5px solid #cbd5e1',
          borderRadius: '16px',
          padding: '28px 32px',
          boxShadow: '0 4px 14px rgba(0, 0, 0, 0.03)'
        }}>
          {/* Header Row */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
            borderBottom: '1px solid #f1f5f9',
            paddingBottom: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <PlusCircle size={22} color="#9333ea" />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Dispense Medication for {selectedPatient.name} ({selectedPatient.id})
              </h3>
            </div>

            <span style={{
              fontSize: '0.78rem',
              backgroundColor: '#f1f5f9',
              color: '#475569',
              fontWeight: 600,
              padding: '4px 14px',
              borderRadius: '20px'
            }}>
              Permission: Create Only (Auto-Status Transition)
            </span>
          </div>

          {/* Row 1: Doctor & Prescription Timing Info */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1.4fr', gap: '20px', marginBottom: '24px' }}>
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '8px', display: 'block' }}>
                Prescribed Doctor
              </label>
              <input
                type="text"
                value={prescribedDoctor}
                onChange={(e) => setPrescribedDoctor(e.target.value)}
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
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
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

            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '8px', display: 'block' }}>
                Auto Status Transition
              </label>
              <div style={{
                backgroundColor: '#eff6ff',
                border: '1.5px solid #dbeafe',
                borderRadius: '10px',
                padding: '11px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#2563eb',
                fontSize: '0.85rem',
                fontWeight: 600
              }}>
                <Clock size={16} style={{ flexShrink: 0 }} />
                <span>Active → Auto Completed after Duration</span>
              </div>
            </div>
          </div>

          {/* Row 2: Medications Container (With + Add Medicine Button) */}
          <div style={{
            backgroundColor: '#faf5ff',
            border: '1.5px solid #e9d5ff',
            borderRadius: '14px',
            padding: '20px',
            marginBottom: '28px'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
              borderBottom: '1px solid #f3e8ff',
              paddingBottom: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#581c87' }}>
                  Prescribed Medications to Dispense ({medicines.length})
                </span>
                {totalCost > 0 && (
                  <span style={{
                    fontSize: '0.78rem',
                    backgroundColor: '#f3e8ff',
                    color: '#7e22ce',
                    fontWeight: 700,
                    padding: '2px 10px',
                    borderRadius: '12px'
                  }}>
                    Total: ${totalCost.toFixed(2)}
                  </span>
                )}
              </div>

              {/* + ADD MEDICINE BUTTON */}
              <button
                type="button"
                onClick={handleAddMedicineItem}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: '#9333ea',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '20px',
                  padding: '7px 18px',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(147, 51, 234, 0.25)',
                  transition: 'background 0.2s, transform 0.1s'
                }}
              >
                <Plus size={16} /> Add Medicine
              </button>
            </div>

            {/* List of Medicine Item Rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {medicines.map((med, index) => (
                <div key={index} style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '16px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                }}>
                  {/* Item Sub-Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#7e22ce' }}>
                      Medication #{index + 1}
                    </span>

                    {medicines.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMedicineItem(index)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#ef4444',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '0.78rem',
                          fontWeight: 600
                        }}
                      >
                        <Trash2 size={14} /> Remove
                      </button>
                    )}
                  </div>

                  {/* Input Fields Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '14px', marginBottom: '10px' }}>
                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '4px', display: 'block' }}>
                        Medication Name & Strength *
                      </label>
                      <input
                        type="text"
                        value={med.medication}
                        onChange={(e) => handleMedicineChange(index, 'medication', e.target.value)}
                        placeholder="e.g. Amoxicillin 500mg, Paracetamol 500mg"
                        required
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          borderRadius: '8px',
                          border: '1.5px solid #cbd5e1',
                          fontSize: '0.88rem',
                          outline: 'none',
                          backgroundColor: '#ffffff'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '4px', display: 'block' }}>
                        Unit Price / Cost
                      </label>
                      <input
                        type="text"
                        value={med.unitPrice}
                        onChange={(e) => handleMedicineChange(index, 'unitPrice', e.target.value)}
                        placeholder="$15.00"
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          borderRadius: '8px',
                          border: '1.5px solid #cbd5e1',
                          fontSize: '0.88rem',
                          outline: 'none',
                          backgroundColor: '#ffffff'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '4px', display: 'block' }}>
                        Duration (Days) *
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="365"
                        value={med.durationDays}
                        onChange={(e) => handleMedicineChange(index, 'durationDays', e.target.value)}
                        placeholder="7"
                        required
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          borderRadius: '8px',
                          border: '1.5px solid #cbd5e1',
                          fontSize: '0.88rem',
                          outline: 'none',
                          backgroundColor: '#ffffff'
                        }}
                      />
                    </div>
                  </div>

                  {/* Dosage Instructions */}
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '4px', display: 'block' }}>
                      Dosage Instructions *
                    </label>
                    <input
                      type="text"
                      value={med.dosage}
                      onChange={(e) => handleMedicineChange(index, 'dosage', e.target.value)}
                      placeholder="e.g. Take 1 capsule every 8 hours with meals"
                      required
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: '1.5px solid #cbd5e1',
                        fontSize: '0.88rem',
                        outline: 'none',
                        backgroundColor: '#ffffff'
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Row 3: Bottom Action Buttons */}
          <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
            <button
              type="submit"
              disabled={saving}
              style={{
                backgroundColor: '#8b5cf6',
                color: '#ffffff',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '10px',
                fontSize: '0.95rem',
                fontWeight: 700,
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.7 : 1,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 10px rgba(139, 92, 246, 0.25)',
                transition: 'background 0.2s, transform 0.1s'
              }}
            >
              <CheckCircle2 size={18} />
              {saving ? 'Dispensing...' : `Dispense & Save All (${medicines.length})`}
            </button>

            <button
              type="button"
              onClick={handleRequestAuthorization}
              style={{
                backgroundColor: '#f1f5f9',
                color: '#475569',
                border: '1.5px solid #cbd5e1',
                padding: '12px 20px',
                borderRadius: '10px',
                fontSize: '0.9rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}
            >
              Request Edit / Delete Authorization
            </button>
          </div>
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
          Select a patient above to log prescription and medication schedules.
        </div>
      )}
    </div>
  );
}
