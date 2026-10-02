import React, { useState, useEffect, useMemo } from 'react';
import PatientSelector from './PatientSelector';
import { emrStore } from '../../../data/mockEmrStore';
import {
  Pill,
  PlusCircle,
  AlertCircle,
  CheckCircle2,
  Clock,
  Plus,
  Trash2,
  DollarSign,
  History,
  ShieldAlert,
  FileEdit,
  Stethoscope,
  Calendar,
  X,
  Send,
  AlertTriangle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';

export default function PharmacistPortal({ staffSession }) {
  const { user } = useAuth();
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [saving, setSaving] = useState(false);
  const [prescriptions, setPrescriptions] = useState([]);

  // General Prescription Order fields
  const [prescribedDoctor, setPrescribedDoctor] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);

  // Multi-medicine item list
  const [medicines, setMedicines] = useState([
    { medication: '', unitPrice: '', dosage: '', durationDays: '7' }
  ]);

  // Authorization Request Modal state
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [selectedMedForAuth, setSelectedMedForAuth] = useState(null);
  const [authType, setAuthType] = useState('Delete'); // 'Delete' or 'Edit'
  const [authReason, setAuthReason] = useState('');
  const [submittingAuth, setSubmittingAuth] = useState(false);

  // Subscribe to EMR Store prescriptions
  useEffect(() => {
    const updatePrescriptions = () => {
      setPrescriptions(emrStore.getPrescriptions() || []);
    };
    updatePrescriptions();
    const unsub = emrStore.subscribe(updatePrescriptions);
    return unsub;
  }, []);

  // Filter provided medicine history for the currently selected customer/patient
  const customerProvidedHistory = useMemo(() => {
    if (!selectedPatient) return [];
    return prescriptions.filter(
      p => p.patientId === selectedPatient.id || p.patientCode === selectedPatient.id
    );
  }, [prescriptions, selectedPatient]);

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
      toast.error('Failed to log prescriptions. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Open modal for a specific medicine item
  const handleOpenAuthModal = (med) => {
    setSelectedMedForAuth(med);
    setAuthType('Delete');
    setAuthReason('');
    setAuthModalOpen(true);
  };

  // Submit Authorization Request to Backend/Store
  const handleSubmitAuthRequest = async (e) => {
    e.preventDefault();
    if (!selectedMedForAuth) return;

    if (!authReason.trim()) {
      toast.error('Please provide a reason or explanation for the admin.');
      return;
    }

    setSubmittingAuth(true);
    const pharmacistIdentifier = staffSession?.staffId || user?.fullName || user?.email || 'PHARM-01';

    try {
      await emrStore.requestPrescriptionAuthorization(selectedMedForAuth.id, {
        requestType: authType,
        reason: authReason.trim(),
        requestedBy: pharmacistIdentifier
      });

      emrStore.addStaffNotification({
        type: 'Prescription',
        role: 'Pharmacist',
        requesterName: pharmacistIdentifier,
        targetId: selectedMedForAuth.id,
        targetTitle: selectedMedForAuth.medication,
        patientId: selectedMedForAuth.patientId || selectedPatient?.id || 'PAT-1004',
        patientName: selectedMedForAuth.patientName || selectedPatient?.name || 'Patient',
        actionRequested: `${authType} Permission`,
        reason: authReason.trim(),
      });

      toast.success(
        `Authorization request submitted! Admin can now review and ${
          authType === 'Delete' ? 'permanently delete' : 'edit'
        } this medication based on your request.`,
        { duration: 5000 }
      );

      setAuthModalOpen(false);
      setSelectedMedForAuth(null);
      setAuthReason('');
    } catch (err) {
      console.error('Failed to submit authorization request:', err);
      toast.error('Failed to submit authorization request. Please try again.');
    } finally {
      setSubmittingAuth(false);
    }
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
            Logged in as <strong>{staffSession?.staffId || 'PHARM-01'}</strong> • Review customer provided medical history, dispense medications, and request admin authorization for errors.
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
          <strong>Strict Safety Protocol:</strong> Pharmacists can view provided medical history and dispense medications. If any mistake is made, use <strong>Request Edit / Delete Authorization</strong> to notify the Admin for permanent removal or correction.
        </div>
      </div>

      {/* 3. Patient Selector */}
      <PatientSelector selectedPatient={selectedPatient} onSelectPatient={setSelectedPatient} />

      {selectedPatient ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          
          {/* ═══════════════════════════════════════════════════════════════════════ */}
          {/* SECTION 1: DISPENSE NEW MEDICATION FORM CARD                            */}
          {/* ═══════════════════════════════════════════════════════════════════════ */}
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
                  Dispense New Medication for {selectedPatient.name} ({selectedPatient.id})
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

            {/* Row 3: Bottom Action Button */}
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
            </div>
          </form>

          {/* ═══════════════════════════════════════════════════════════════════════ */}
          {/* SECTION 2: MEDICAL PROVIDED HISTORY FOR SELECTED CUSTOMER               */}
          {/* ═══════════════════════════════════════════════════════════════════════ */}
          <div style={{
            backgroundColor: '#ffffff',
            border: '1.5px solid #cbd5e1',
            borderRadius: '16px',
            padding: '24px 28px',
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.03)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
              borderBottom: '1px solid #f1f5f9',
              paddingBottom: '14px',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  backgroundColor: '#f3e8ff',
                  color: '#9333ea',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <History size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.18rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    Provided Medical History for {selectedPatient.name}
                  </h3>
                  <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
                    Customer Code: <strong>{selectedPatient.id}</strong> • Total Recorded Medicines: <strong>{customerProvidedHistory.length}</strong>
                  </span>
                </div>
              </div>

              <span style={{
                fontSize: '0.8rem',
                backgroundColor: '#eff6ff',
                color: '#2563eb',
                fontWeight: 700,
                padding: '5px 14px',
                borderRadius: '20px',
                border: '1px solid #bfdbfe'
              }}>
                {customerProvidedHistory.length} Dispensed Record(s)
              </span>
            </div>

            {/* List of Provided Medicines */}
            {customerProvidedHistory.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {customerProvidedHistory.map((med, index) => {
                  const isPending = med.hasAuthorizationRequest && med.authorizationStatus === 'Pending';

                  return (
                    <div
                      key={med.id || index}
                      style={{
                        border: isPending ? '1.5px solid #fdba74' : '1.5px solid #e2e8f0',
                        borderRadius: '12px',
                        padding: '18px 20px',
                        backgroundColor: isPending ? '#fffaf5' : '#f8fafc',
                        transition: 'all 0.15s ease',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.02)'
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        flexWrap: 'wrap',
                        gap: '14px'
                      }}>
                        {/* Medicine Information */}
                        <div style={{ flex: '1 1 500px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
                            <span style={{
                              fontWeight: 800,
                              fontSize: '1.05rem',
                              color: '#0f172a',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}>
                              <Pill size={16} color="#9333ea" />
                              {med.medication}
                            </span>

                            <span style={{
                              fontSize: '0.78rem',
                              backgroundColor: '#faf5ff',
                              color: '#9333ea',
                              fontWeight: 800,
                              padding: '2px 10px',
                              borderRadius: '12px',
                              border: '1px solid #e9d5ff'
                            }}>
                              {med.unitPrice || '$0.00'}
                            </span>

                            <span style={{
                              fontSize: '0.76rem',
                              backgroundColor: '#eff6ff',
                              color: '#2563eb',
                              fontWeight: 600,
                              padding: '2px 8px',
                              borderRadius: '8px'
                            }}>
                              ⏱ {med.duration || '7 Days'}
                            </span>

                            <span style={{
                              fontSize: '0.76rem',
                              backgroundColor: med.status === 'Active' ? '#dcfce7' : '#f1f5f9',
                              color: med.status === 'Active' ? '#15803d' : '#64748b',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '8px',
                              border: '1px solid ' + (med.status === 'Active' ? '#86efac' : '#cbd5e1')
                            }}>
                              {med.status || 'Active'}
                            </span>
                          </div>

                          <div style={{ fontSize: '0.85rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', marginBottom: '6px' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <Stethoscope size={14} color="#64748b" /> Prescribed by: <strong>{med.prescribedDoctor || 'Dr. Consultant'}</strong>
                            </span>
                            {med.startDate && (
                              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <Calendar size={14} color="#64748b" /> Dispensed: <strong>{med.startDate}</strong>
                              </span>
                            )}
                          </div>

                          {med.dosage && (
                            <div style={{
                              fontSize: '0.84rem',
                              color: '#334155',
                              backgroundColor: '#ffffff',
                              padding: '8px 12px',
                              borderRadius: '8px',
                              border: '1px solid #e2e8f0',
                              marginTop: '6px'
                            }}>
                              <strong style={{ color: '#0f172a' }}>Dosage Instructions:</strong> {med.dosage}
                            </div>
                          )}

                          {/* Pending Authorization Banner */}
                          {isPending && (
                            <div style={{
                              marginTop: '10px',
                              backgroundColor: '#fff7ed',
                              border: '1px solid #fed7aa',
                              borderRadius: '8px',
                              padding: '8px 12px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              fontSize: '0.82rem',
                              color: '#c2410c'
                            }}>
                              <AlertTriangle size={15} style={{ flexShrink: 0 }} />
                              <div>
                                <strong>Admin {med.authorizationType} Authorization Pending:</strong> "{med.authorizationReason}"
                                {med.authorizationRequestedBy && (
                                  <span style={{ color: '#9a3412', marginLeft: '6px' }}>
                                    (Requested by {med.authorizationRequestedBy})
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Request Authorization Action Button */}
                        <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                          {isPending ? (
                            <div style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              backgroundColor: '#fef3c7',
                              color: '#92400e',
                              border: '1px solid #fde68a',
                              padding: '8px 14px',
                              borderRadius: '8px',
                              fontSize: '0.82rem',
                              fontWeight: 700
                            }}>
                              <Clock size={15} /> Request Under Admin Review
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenAuthModal(med)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                backgroundColor: '#fff1f2',
                                color: '#e11d48',
                                border: '1.5px solid #fecdd3',
                                padding: '8px 14px',
                                borderRadius: '8px',
                                fontSize: '0.82rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                                boxShadow: '0 1px 3px rgba(225, 29, 72, 0.08)'
                              }}
                              onMouseOver={(e) => {
                                e.currentTarget.style.backgroundColor = '#ffe4e6';
                                e.currentTarget.style.borderColor = '#fda4af';
                              }}
                              onMouseOut={(e) => {
                                e.currentTarget.style.backgroundColor = '#fff1f2';
                                e.currentTarget.style.borderColor = '#fecdd3';
                              }}
                              title="Request Super Admin to permanently delete or edit this dispensed medicine"
                            >
                              <ShieldAlert size={15} /> Request Edit / Delete Authorization
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{
                backgroundColor: '#f8fafc',
                border: '1.5px dashed #cbd5e1',
                borderRadius: '12px',
                padding: '28px 20px',
                textAlign: 'center',
                color: '#64748b',
                fontSize: '0.9rem'
              }}>
                No medicine records previously provided for <strong>{selectedPatient.name}</strong>.
              </div>
            )}
          </div>
        </div>
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
          Select a patient above to view their provided medical history and dispense medications.
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════════ */}
      {/* MODAL: REQUEST EDIT / DELETE AUTHORIZATION FROM ADMIN                     */}
      {/* ═════════════════════════════════════════════════════════════════════════ */}
      {authModalOpen && selectedMedForAuth && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '18px',
            maxWidth: '560px',
            width: '100%',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
            overflow: 'hidden',
            border: '1px solid #cbd5e1'
          }}>
            {/* Modal Header */}
            <div style={{
              backgroundColor: '#faf5ff',
              padding: '20px 24px',
              borderBottom: '1px solid #e9d5ff',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  backgroundColor: '#9333ea',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <ShieldAlert size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                    Request Admin Authorization
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
                    Request Admin to delete or edit this dispensed medication
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setAuthModalOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#64748b',
                  padding: '4px'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSubmitAuthRequest} style={{ padding: '24px' }}>
              {/* Medicine Summary Card */}
              <div style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '14px 16px',
                marginBottom: '20px'
              }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', marginBottom: '4px', textTransform: 'uppercase' }}>
                  Target Medication
                </div>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
                  {selectedMedForAuth.medication}
                </div>
                <div style={{ fontSize: '0.84rem', color: '#475569' }}>
                  Customer: <strong>{selectedPatient?.name} ({selectedPatient?.id})</strong> • Dosage: <strong>{selectedMedForAuth.dosage}</strong>
                </div>
              </div>

              {/* Request Type Selector */}
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
                  Authorization Action Requested *
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    border: authType === 'Delete' ? '2px solid #e11d48' : '1.5px solid #cbd5e1',
                    backgroundColor: authType === 'Delete' ? '#fff1f2' : '#ffffff',
                    cursor: 'pointer',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    color: authType === 'Delete' ? '#9f1239' : '#475569'
                  }}>
                    <input
                      type="radio"
                      name="authType"
                      value="Delete"
                      checked={authType === 'Delete'}
                      onChange={() => setAuthType('Delete')}
                      style={{ accentColor: '#e11d48' }}
                    />
                    <Trash2 size={16} /> Delete Medicine (Mistake)
                  </label>

                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    border: authType === 'Edit' ? '2px solid #9333ea' : '1.5px solid #cbd5e1',
                    backgroundColor: authType === 'Edit' ? '#faf5ff' : '#ffffff',
                    cursor: 'pointer',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    color: authType === 'Edit' ? '#581c87' : '#475569'
                  }}>
                    <input
                      type="radio"
                      name="authType"
                      value="Edit"
                      checked={authType === 'Edit'}
                      onChange={() => setAuthType('Edit')}
                      style={{ accentColor: '#9333ea' }}
                    />
                    <FileEdit size={16} /> Request Modification
                  </label>
                </div>
              </div>

              {/* Reason / Explanation Textarea */}
              <div style={{ marginBottom: '22px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Reason for Admin (Explain mistake or change needed) *
                </label>
                <textarea
                  rows={4}
                  required
                  value={authReason}
                  onChange={(e) => setAuthReason(e.target.value)}
                  placeholder="e.g. Wrong dosage entered by mistake, customer cancelled order, or duplicate entry. Please delete permanently."
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.88rem',
                    outline: 'none',
                    backgroundColor: '#ffffff',
                    fontFamily: 'inherit',
                    resize: 'vertical'
                  }}
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setAuthModalOpen(false)}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '10px',
                    border: '1.5px solid #cbd5e1',
                    backgroundColor: '#f1f5f9',
                    color: '#475569',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submittingAuth}
                  style={{
                    padding: '10px 22px',
                    borderRadius: '10px',
                    border: 'none',
                    backgroundColor: authType === 'Delete' ? '#e11d48' : '#9333ea',
                    color: '#ffffff',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    cursor: submittingAuth ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: authType === 'Delete' ? '0 4px 10px rgba(225, 29, 72, 0.25)' : '0 4px 10px rgba(147, 51, 234, 0.25)'
                  }}
                >
                  <Send size={16} />
                  {submittingAuth ? 'Submitting...' : 'Submit to Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
