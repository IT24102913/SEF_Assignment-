import React, { useState, useEffect } from 'react';
import { emrStore } from '../../../data/mockEmrStore';
import { ShieldAlert, Users, FileText, Microscope, Pill, Trash2, Edit3, Plus, Search, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminPortalDashboard({ staffSession }) {
  const [activeTab, setActiveTab] = useState('consultations');
  const [patients, setPatients] = useState([]);
  const [consultations, setConsultations] = useState([]);
  const [labReports, setLabReports] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [search, setSearch] = useState('');

  // Editing state
  const [editingItem, setEditingItem] = useState(null);

  const loadAll = () => {
    setPatients(emrStore.getPatients());
    setConsultations(emrStore.getConsultations());
    setLabReports(emrStore.getLabReports());
    setPrescriptions(emrStore.getPrescriptions());
  };

  useEffect(() => {
    loadAll();
    const unsubscribe = emrStore.subscribe(loadAll);
    return unsubscribe;
  }, []);

  // Delete Actions
  const handleDeleteConsultation = (id) => {
    if (window.confirm('Admin Confirm: Permanently delete consultation note?')) {
      emrStore.deleteConsultation(id);
      toast.success(`Consultation note ${id} deleted.`);
    }
  };

  const handleDeleteLabReport = (id) => {
    if (window.confirm('Admin Confirm: Permanently delete lab report?')) {
      emrStore.deleteLabReport(id);
      toast.success(`Lab report ${id} deleted.`);
    }
  };

  const handleDeletePrescription = (id) => {
    if (window.confirm('Admin Confirm: Permanently delete prescription record?')) {
      emrStore.deletePrescription(id);
      toast.success(`Prescription ${id} deleted.`);
    }
  };

  // Status Toggles
  const handleToggleLabStatus = (report) => {
    const nextStatus = report.status === 'Completed' ? 'Pending' : 'Completed';
    emrStore.updateLabReport(report.id, { status: nextStatus });
    toast.success(`Lab Report ${report.id} status changed to ${nextStatus}.`);
  };

  const handleToggleRxStatus = (rx) => {
    const nextStatus = rx.status === 'Active' ? 'Completed' : 'Active';
    emrStore.updatePrescription(rx.id, { status: nextStatus });
    toast.success(`Prescription ${rx.id} status changed to ${nextStatus}.`);
  };

  return (
    <div>
      {/* Admin Header Banner */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px', backgroundColor: '#fff7ed', padding: '20px', borderRadius: '16px', border: '1px solid #ffedd5' }}>
        <div style={{ width: '44px', height: '44px', borderRadius: '12px', backgroundColor: '#ea580c', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ShieldAlert size={24} />
        </div>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>Super Admin Management Suite</h2>
          <p style={{ color: '#475569', fontSize: '0.9rem' }}>
            Logged in as <strong>{staffSession.staffId}</strong> • Full CRUD system privileges over Consultation Notes, Lab Reports & Pharmacy Records.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', borderBottom: '2px solid #e2e8f0', pb: '12px' }}>
        <button
          onClick={() => setActiveTab('consultations')}
          style={{
            padding: '10px 20px',
            borderRadius: '10px',
            fontWeight: 700,
            fontSize: '0.92rem',
            border: 'none',
            cursor: 'pointer',
            backgroundColor: activeTab === 'consultations' ? '#2563eb' : '#f1f5f9',
            color: activeTab === 'consultations' ? '#ffffff' : '#64748b',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <FileText size={18} /> Consultation Notes ({consultations.length})
        </button>

        <button
          onClick={() => setActiveTab('lab')}
          style={{
            padding: '10px 20px',
            borderRadius: '10px',
            fontWeight: 700,
            fontSize: '0.92rem',
            border: 'none',
            cursor: 'pointer',
            backgroundColor: activeTab === 'lab' ? '#16a34a' : '#f1f5f9',
            color: activeTab === 'lab' ? '#ffffff' : '#64748b',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Microscope size={18} /> Lab Reports ({labReports.length})
        </button>

        <button
          onClick={() => setActiveTab('pharmacy')}
          style={{
            padding: '10px 20px',
            borderRadius: '10px',
            fontWeight: 700,
            fontSize: '0.92rem',
            border: 'none',
            cursor: 'pointer',
            backgroundColor: activeTab === 'pharmacy' ? '#9333ea' : '#f1f5f9',
            color: activeTab === 'pharmacy' ? '#ffffff' : '#64748b',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Pill size={18} /> Pharmacy Records ({prescriptions.length})
        </button>

        <button
          onClick={() => setActiveTab('patients')}
          style={{
            padding: '10px 20px',
            borderRadius: '10px',
            fontWeight: 700,
            fontSize: '0.92rem',
            border: 'none',
            cursor: 'pointer',
            backgroundColor: activeTab === 'patients' ? '#ea580c' : '#f1f5f9',
            color: activeTab === 'patients' ? '#ffffff' : '#64748b',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Users size={18} /> Patients Directory ({patients.length})
        </button>
      </div>

      {/* Tab 1: Consultation Notes CRUD */}
      {activeTab === 'consultations' && (
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '16px', padding: '24px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginBottom: '16px' }}>Manage Consultation Notes</h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {consultations.map((note) => (
              <div key={note.id} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', backgroundColor: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a' }}>{note.patientName}</span>
                    <span style={{ fontSize: '0.78rem', backgroundColor: '#eff6ff', color: '#2563eb', fontWeight: 600, padding: '2px 8px', borderRadius: '10px' }}>{note.patientId}</span>
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>• {note.date}</span>
                  </div>
                  
                  <div style={{ fontSize: '0.88rem', color: '#334155', marginBottom: '4px' }}>
                    <strong>Doctor:</strong> {note.doctorName} ({note.doctorDesignation})
                  </div>

                  <div style={{ fontSize: '0.88rem', color: '#334155', marginBottom: '6px' }}>
                    <strong>Diagnosis:</strong> {note.diagnosis}
                  </div>

                  <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
                    {note.notes}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => handleDeleteConsultation(note.id)}
                    style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 600 }}
                  >
                    <Trash2 size={16} /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Lab Reports CRUD */}
      {activeTab === 'lab' && (
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '16px', padding: '24px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginBottom: '16px' }}>Manage Lab Reports</h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {labReports.map((report) => (
              <div key={report.id} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', backgroundColor: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a' }}>{report.testTitle}</span>
                    <span style={{ fontSize: '0.78rem', backgroundColor: '#f0fdf4', color: '#16a34a', fontWeight: 600, padding: '2px 8px', borderRadius: '10px' }}>{report.category}</span>
                  </div>

                  <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                    Patient: <strong>{report.patientName} ({report.patientId})</strong> • Ordered by: {report.orderedDoctor} • Added by: {report.addedBy}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button
                    onClick={() => handleToggleLabStatus(report)}
                    style={{
                      backgroundColor: report.status === 'Completed' ? '#dcfce7' : '#fff7ed',
                      color: report.status === 'Completed' ? '#15803d' : '#c2410c',
                      border: 'none',
                      padding: '6px 14px',
                      borderRadius: '20px',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      cursor: 'pointer'
                    }}
                  >
                    Status: {report.status} (Click to toggle)
                  </button>

                  <button
                    onClick={() => handleDeleteLabReport(report.id)}
                    style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 600 }}
                  >
                    <Trash2 size={16} /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Pharmacy Records CRUD */}
      {activeTab === 'pharmacy' && (
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '16px', padding: '24px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginBottom: '16px' }}>Manage Pharmacy Prescriptions</h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {prescriptions.map((rx) => (
              <div key={rx.id} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', backgroundColor: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a' }}>{rx.medication}</span>
                    <span style={{ fontSize: '0.78rem', backgroundColor: '#faf5ff', color: '#9333ea', fontWeight: 700, padding: '2px 8px', borderRadius: '10px' }}>{rx.unitPrice}</span>
                  </div>

                  <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                    Patient: <strong>{rx.patientName} ({rx.patientId})</strong> • Prescribed by: {rx.prescribedDoctor} • Duration: {rx.duration}
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#475569', marginTop: '4px' }}>
                    <strong>Instructions:</strong> {rx.dosage}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button
                    onClick={() => handleToggleRxStatus(rx)}
                    style={{
                      backgroundColor: rx.status === 'Active' ? '#dbeafe' : '#f1f5f9',
                      color: rx.status === 'Active' ? '#1d4ed8' : '#64748b',
                      border: 'none',
                      padding: '6px 14px',
                      borderRadius: '20px',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      cursor: 'pointer'
                    }}
                  >
                    Status: {rx.status} (Toggle)
                  </button>

                  <button
                    onClick={() => handleDeletePrescription(rx.id)}
                    style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 600 }}
                  >
                    <Trash2 size={16} /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Patient Directory CRUD */}
      {activeTab === 'patients' && (
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '16px', padding: '24px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginBottom: '16px' }}>Manage Registered Patients</h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {patients.map((p) => (
              <div key={p.id} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', backgroundColor: '#f8fafc' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a' }}>{p.name}</span>
                  <span style={{ fontSize: '0.78rem', backgroundColor: '#e2e8f0', color: '#334155', fontWeight: 600, padding: '2px 8px', borderRadius: '10px' }}>{p.id}</span>
                </div>

                <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '12px' }}>
                  Age: {p.age} • Gender: {p.gender} • Blood Group: {p.bloodGroup}
                  <br />Phone: {p.phone}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button
                    onClick={() => {
                      if (window.confirm(`Delete patient ${p.name}?`)) {
                        emrStore.deletePatient(p.id);
                        toast.success(`Patient ${p.name} deleted.`);
                      }
                    }}
                    style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
