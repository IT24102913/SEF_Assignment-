import React, { useState, useEffect, useMemo } from 'react';
import { emrStore } from '../../../data/mockEmrStore';
import {
  ShieldAlert,
  Users,
  FileText,
  Microscope,
  Pill,
  Trash2,
  Search,
  X,
  Filter,
  Calendar,
  Stethoscope,
  FlaskConical,
  CheckCircle2,
  Clock,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminPortalDashboard({ staffSession }) {
  const [activeTab, setActiveTab] = useState('consultations');
  const [patients, setPatients] = useState([]);
  const [consultations, setConsultations] = useState([]);
  const [labReports, setLabReports] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);

  // ── Tab 1 Filters: Consultations ──────────────────────────────────────────
  const [consultSearch, setConsultSearch] = useState('');
  const [consultDoctor, setConsultDoctor] = useState('ALL');
  const [consultTimeframe, setConsultTimeframe] = useState('ALL');

  // ── Tab 2 Filters: Lab Reports ────────────────────────────────────────────
  const [labSearch, setLabSearch] = useState('');
  const [labCategory, setLabCategory] = useState('ALL');
  const [labStatus, setLabStatus] = useState('ALL');

  // ── Tab 3 Filters: Pharmacy Records ───────────────────────────────────────
  const [rxSearch, setRxSearch] = useState('');
  const [rxStatus, setRxStatus] = useState('ALL');
  const [rxDoctor, setRxDoctor] = useState('ALL');
  const [rxDuration, setRxDuration] = useState('ALL');

  // ── Tab 4 Filters: Patients Directory ─────────────────────────────────────
  const [patientSearch, setPatientSearch] = useState('');
  const [patientGender, setPatientGender] = useState('ALL');
  const [patientBloodGroup, setPatientBloodGroup] = useState('ALL');

  const loadAll = () => {
    setPatients(emrStore.getPatients() || []);
    setConsultations(emrStore.getConsultations() || []);
    setLabReports(emrStore.getLabReports() || []);
    setPrescriptions(emrStore.getPrescriptions() || []);
  };

  useEffect(() => {
    loadAll();
    emrStore.syncFromBackend();
    const unsubscribe = emrStore.subscribe(loadAll);
    return unsubscribe;
  }, []);

  // ── Unique Doctor Lists for Filter Dropdowns ──────────────────────────────
  const uniqueConsultDoctors = useMemo(() => {
    const set = new Set();
    consultations.forEach(c => {
      if (c.doctorName && c.doctorName.trim()) set.add(c.doctorName.trim());
    });
    return Array.from(set);
  }, [consultations]);

  const uniqueRxDoctors = useMemo(() => {
    const set = new Set();
    prescriptions.forEach(p => {
      if (p.prescribedDoctor && p.prescribedDoctor.trim()) set.add(p.prescribedDoctor.trim());
    });
    return Array.from(set);
  }, [prescriptions]);

  // ── Filtered Datasets ─────────────────────────────────────────────────────

  // 1. Consultations
  const filteredConsultations = useMemo(() => {
    return consultations.filter(note => {
      // Search term filter
      const term = consultSearch.trim().toLowerCase();
      if (term) {
        const matchesName = (note.patientName || '').toLowerCase().includes(term);
        const matchesId = (note.patientId || '').toLowerCase().includes(term);
        const matchesDoctor = (note.doctorName || '').toLowerCase().includes(term);
        const matchesDiagnosis = (note.diagnosis || '').toLowerCase().includes(term);
        const matchesNotes = (note.notes || '').toLowerCase().includes(term);
        if (!matchesName && !matchesId && !matchesDoctor && !matchesDiagnosis && !matchesNotes) {
          return false;
        }
      }

      // Doctor filter
      if (consultDoctor !== 'ALL') {
        if ((note.doctorName || '').trim().toLowerCase() !== consultDoctor.trim().toLowerCase()) {
          return false;
        }
      }

      // Timeframe filter
      if (consultTimeframe !== 'ALL' && note.date) {
        const noteDate = new Date(note.date);
        const now = new Date();
        const diffDays = Math.floor((now - noteDate) / (1000 * 60 * 60 * 24));

        if (consultTimeframe === 'TODAY' && diffDays > 0) return false;
        if (consultTimeframe === 'WEEK' && diffDays > 7) return false;
        if (consultTimeframe === 'MONTH' && diffDays > 30) return false;
      }

      return true;
    });
  }, [consultations, consultSearch, consultDoctor, consultTimeframe]);

  // 2. Lab Reports
  const filteredLabReports = useMemo(() => {
    return labReports.filter(report => {
      // Search term filter
      const term = labSearch.trim().toLowerCase();
      if (term) {
        const matchesTitle = (report.testTitle || '').toLowerCase().includes(term);
        const matchesName = (report.patientName || '').toLowerCase().includes(term);
        const matchesId = (report.patientId || '').toLowerCase().includes(term);
        const matchesDoctor = (report.orderedDoctor || '').toLowerCase().includes(term);
        const matchesSummary = (report.resultsSummary || '').toLowerCase().includes(term);
        if (!matchesTitle && !matchesName && !matchesId && !matchesDoctor && !matchesSummary) {
          return false;
        }
      }

      // Category filter
      if (labCategory !== 'ALL') {
        if ((report.category || '').toLowerCase() !== labCategory.toLowerCase()) {
          return false;
        }
      }

      // Status filter
      if (labStatus !== 'ALL') {
        if ((report.status || '').toLowerCase() !== labStatus.toLowerCase()) {
          return false;
        }
      }

      return true;
    });
  }, [labReports, labSearch, labCategory, labStatus]);

  // 3. Pharmacy Prescriptions
  const filteredPrescriptions = useMemo(() => {
    return prescriptions.filter(rx => {
      // Search term filter
      const term = rxSearch.trim().toLowerCase();
      if (term) {
        const matchesMed = (rx.medication || '').toLowerCase().includes(term);
        const matchesName = (rx.patientName || '').toLowerCase().includes(term);
        const matchesId = (rx.patientId || '').toLowerCase().includes(term);
        const matchesDoctor = (rx.prescribedDoctor || '').toLowerCase().includes(term);
        const matchesDosage = (rx.dosage || '').toLowerCase().includes(term);
        if (!matchesMed && !matchesName && !matchesId && !matchesDoctor && !matchesDosage) {
          return false;
        }
      }

      // Status filter
      if (rxStatus !== 'ALL') {
        if ((rx.status || '').toLowerCase() !== rxStatus.toLowerCase()) {
          return false;
        }
      }

      // Doctor filter
      if (rxDoctor !== 'ALL') {
        if ((rx.prescribedDoctor || '').trim().toLowerCase() !== rxDoctor.trim().toLowerCase()) {
          return false;
        }
      }

      // Duration filter
      if (rxDuration !== 'ALL') {
        const days = parseInt(String(rx.duration || '').replace(/\D/g, ''), 10) || 7;
        if (rxDuration === 'SHORT' && days > 7) return false;
        if (rxDuration === 'LONG' && days <= 7) return false;
      }

      return true;
    });
  }, [prescriptions, rxSearch, rxStatus, rxDoctor, rxDuration]);

  // 4. Patients
  const filteredPatients = useMemo(() => {
    return patients.filter(p => {
      const term = patientSearch.trim().toLowerCase();
      if (term) {
        const matchesName = (p.name || '').toLowerCase().includes(term);
        const matchesId = (p.id || '').toLowerCase().includes(term);
        const matchesPhone = (p.phone || '').toLowerCase().includes(term);
        if (!matchesName && !matchesId && !matchesPhone) return false;
      }

      if (patientGender !== 'ALL') {
        if ((p.gender || '').toLowerCase() !== patientGender.toLowerCase()) return false;
      }

      if (patientBloodGroup !== 'ALL') {
        if ((p.bloodGroup || '').toLowerCase() !== patientBloodGroup.toLowerCase()) return false;
      }

      return true;
    });
  }, [patients, patientSearch, patientGender, patientBloodGroup]);

  // Delete Actions
  const handleDeleteConsultation = async (id) => {
    if (window.confirm('Admin Confirm: Permanently delete consultation note?')) {
      await emrStore.deleteConsultation(id);
      toast.success(`Consultation note deleted.`);
    }
  };

  const handleDeleteLabReport = async (id) => {
    if (window.confirm('Admin Confirm: Permanently delete lab report?')) {
      await emrStore.deleteLabReport(id);
      toast.success(`Lab report deleted.`);
    }
  };

  const handleDeletePrescription = async (id) => {
    if (window.confirm('Admin Confirm: Permanently delete prescription record?')) {
      await emrStore.deletePrescription(id);
      toast.success(`Prescription deleted.`);
    }
  };

  // Status Toggles
  const handleToggleLabStatus = (report) => {
    const nextStatus = report.status === 'Completed' ? 'Pending' : 'Completed';
    emrStore.updateLabReport(report.id, { status: nextStatus });
    toast.success(`Lab Report status changed to ${nextStatus}.`);
  };

  const handleToggleRxStatus = (rx) => {
    const nextStatus = rx.status === 'Active' ? 'Completed' : 'Active';
    emrStore.updatePrescription(rx.id, { status: nextStatus });
    toast.success(`Prescription status changed to ${nextStatus}.`);
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* 1. Admin Header Banner */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        marginBottom: '24px',
        backgroundColor: '#fff7ed',
        padding: '20px 24px',
        borderRadius: '16px',
        border: '1px solid #ffedd5',
        boxShadow: '0 2px 8px rgba(234, 88, 12, 0.04)'
      }}>
        <div style={{
          width: '44px',
          height: '44px',
          borderRadius: '12px',
          backgroundColor: '#ea580c',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          <ShieldAlert size={24} />
        </div>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: '0 0 2px 0' }}>
            Admin Management Suite
          </h2>
          <p style={{ color: '#475569', fontSize: '0.9rem', margin: 0 }}>
            Logged in as <strong>{staffSession.staffId}</strong> • Full system privileges over Consultation Notes, Lab Reports, Pharmacy Records & Patients.
          </p>
        </div>
      </div>

      {/* 2. Tabs Navigation */}
      <div style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '24px',
        borderBottom: '2px solid #e2e8f0',
        paddingBottom: '12px',
        flexWrap: 'wrap'
      }}>
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
            gap: '8px',
            transition: 'all 0.15s ease'
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
            gap: '8px',
            transition: 'all 0.15s ease'
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
            gap: '8px',
            transition: 'all 0.15s ease'
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
            gap: '8px',
            transition: 'all 0.15s ease'
          }}
        >
          <Users size={18} /> Patients Directory ({patients.length})
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: CONSULTATION NOTES */}
      {/* ========================================================================= */}
      {activeTab === 'consultations' && (
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0' }}>
                Manage Consultation Notes
              </h3>
              <p style={{ margin: 0, fontSize: '0.86rem', color: '#64748b' }}>
                Review, filter and delete specialist consultation notes recorded across all doctors.
              </p>
            </div>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#2563eb', backgroundColor: '#eff6ff', padding: '5px 12px', borderRadius: '20px', border: '1px solid #bfdbfe' }}>
              Showing {filteredConsultations.length} of {consultations.length} notes
            </div>
          </div>

          {/* Consultation Search & Filter Toolbar */}
          <div style={{
            display: 'flex',
            gap: '12px',
            marginBottom: '20px',
            flexWrap: 'wrap',
            alignItems: 'center',
            backgroundColor: '#f8fafc',
            padding: '14px',
            borderRadius: '12px',
            border: '1.5px solid #e2e8f0'
          }}>
            {/* Search Input */}
            <div style={{ position: 'relative', flex: '1 1 300px', minWidth: '260px' }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              <input
                type="text"
                value={consultSearch}
                onChange={(e) => setConsultSearch(e.target.value)}
                placeholder="Search patient name, ID (e.g. PAT-1004), doctor, or diagnosis..."
                style={{
                  width: '100%',
                  padding: '10px 36px 10px 38px',
                  borderRadius: '10px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '0.88rem',
                  outline: 'none',
                  backgroundColor: '#ffffff',
                  color: '#0f172a',
                  transition: 'border-color 0.15s ease'
                }}
              />
              {consultSearch && (
                <button
                  onClick={() => setConsultSearch('')}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#94a3b8',
                    padding: '2px'
                  }}
                  title="Clear search"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Doctor Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Stethoscope size={16} style={{ color: '#2563eb' }} />
              <select
                value={consultDoctor}
                onChange={(e) => setConsultDoctor(e.target.value)}
                style={{
                  padding: '9px 12px',
                  borderRadius: '10px',
                  border: '1.5px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  fontSize: '0.85rem',
                  color: '#1e293b',
                  fontWeight: 600,
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="ALL">All Doctors</option>
                {uniqueConsultDoctors.map(doc => (
                  <option key={doc} value={doc}>{doc}</option>
                ))}
              </select>
            </div>

            {/* Timeframe Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={16} style={{ color: '#2563eb' }} />
              <select
                value={consultTimeframe}
                onChange={(e) => setConsultTimeframe(e.target.value)}
                style={{
                  padding: '9px 12px',
                  borderRadius: '10px',
                  border: '1.5px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  fontSize: '0.85rem',
                  color: '#1e293b',
                  fontWeight: 600,
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="ALL">All Dates</option>
                <option value="TODAY">Today Only</option>
                <option value="WEEK">Last 7 Days</option>
                <option value="MONTH">Last 30 Days</option>
              </select>
            </div>

            {/* Reset Filters Button */}
            {(consultSearch || consultDoctor !== 'ALL' || consultTimeframe !== 'ALL') && (
              <button
                onClick={() => {
                  setConsultSearch('');
                  setConsultDoctor('ALL');
                  setConsultTimeframe('ALL');
                }}
                style={{
                  padding: '8px 14px',
                  borderRadius: '10px',
                  border: '1px solid #bfdbfe',
                  backgroundColor: '#eff6ff',
                  color: '#2563eb',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <RotateCcw size={14} /> Reset
              </button>
            )}
          </div>

          {/* Cards List */}
          {filteredConsultations.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {filteredConsultations.map((note) => (
                <div
                  key={note.id}
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '20px',
                    backgroundColor: '#f8fafc',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    transition: 'border-color 0.15s ease'
                  }}
                >
                  <div style={{ flex: 1, paddingRight: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0f172a' }}>{note.patientName}</span>
                      <span style={{ fontSize: '0.78rem', backgroundColor: '#eff6ff', color: '#2563eb', fontWeight: 700, padding: '3px 10px', borderRadius: '12px', border: '1px solid #bfdbfe' }}>
                        {note.patientId}
                      </span>
                      <span style={{ fontSize: '0.82rem', color: '#64748b' }}>• {note.date || 'Recent Visit'}</span>
                    </div>

                    <div style={{ fontSize: '0.88rem', color: '#334155', marginBottom: '4px' }}>
                      <strong>Doctor:</strong> {note.doctorName} {note.doctorDesignation ? `(${note.doctorDesignation})` : ''}
                    </div>

                    <div style={{ fontSize: '0.88rem', color: '#334155', marginBottom: '6px' }}>
                      <strong>Diagnosis:</strong> <span style={{ color: '#0f172a', fontWeight: 600 }}>{note.diagnosis}</span>
                    </div>

                    {note.recommendedTests && note.recommendedTests.length > 0 && (
                      <div style={{ fontSize: '0.82rem', color: '#475569', marginBottom: '4px' }}>
                        <strong>Tests:</strong> {Array.isArray(note.recommendedTests) ? note.recommendedTests.join(', ') : note.recommendedTests}
                      </div>
                    )}

                    {note.notes && (
                      <div style={{ fontSize: '0.82rem', color: '#64748b', backgroundColor: '#ffffff', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', marginTop: '6px' }}>
                        {note.notes}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => handleDeleteConsultation(note.id)}
                      style={{
                        backgroundColor: '#fef2f2',
                        border: '1px solid #fecaca',
                        color: '#dc2626',
                        padding: '8px 14px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '0.82rem',
                        fontWeight: 700
                      }}
                    >
                      <Trash2 size={16} /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '48px 20px', color: '#94a3b8' }}>
              <FileText size={36} style={{ margin: '0 auto 12px auto', opacity: 0.6 }} />
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                No consultation notes match your search or filters.
              </div>
              <p style={{ fontSize: '0.84rem', margin: '0 0 16px 0' }}>
                Try adjusting your search terms or clearing active filters.
              </p>
              {(consultSearch || consultDoctor !== 'ALL' || consultTimeframe !== 'ALL') && (
                <button
                  onClick={() => {
                    setConsultSearch('');
                    setConsultDoctor('ALL');
                    setConsultTimeframe('ALL');
                  }}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#f8fafc',
                    color: '#0f172a',
                    fontWeight: 700,
                    fontSize: '0.84rem',
                    cursor: 'pointer'
                  }}
                >
                  Clear All Filters
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: LAB REPORTS */}
      {/* ========================================================================= */}
      {activeTab === 'lab' && (
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0' }}>
                Manage Lab Reports
              </h3>
              <p style={{ margin: 0, fontSize: '0.86rem', color: '#64748b' }}>
                Search, filter by pathology discipline, toggle report completion, or purge obsolete reports.
              </p>
            </div>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#16a34a', backgroundColor: '#f0fdf4', padding: '5px 12px', borderRadius: '20px', border: '1px solid #bbf7d0' }}>
              Showing {filteredLabReports.length} of {labReports.length} reports
            </div>
          </div>

          {/* Lab Search & Filter Toolbar */}
          <div style={{
            display: 'flex',
            gap: '12px',
            marginBottom: '20px',
            flexWrap: 'wrap',
            alignItems: 'center',
            backgroundColor: '#f8fafc',
            padding: '14px',
            borderRadius: '12px',
            border: '1.5px solid #e2e8f0'
          }}>
            {/* Search Input */}
            <div style={{ position: 'relative', flex: '1 1 300px', minWidth: '260px' }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              <input
                type="text"
                value={labSearch}
                onChange={(e) => setLabSearch(e.target.value)}
                placeholder="Search test name (e.g. CBC), patient name, ID, or doctor..."
                style={{
                  width: '100%',
                  padding: '10px 36px 10px 38px',
                  borderRadius: '10px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '0.88rem',
                  outline: 'none',
                  backgroundColor: '#ffffff',
                  color: '#0f172a'
                }}
              />
              {labSearch && (
                <button
                  onClick={() => setLabSearch('')}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#94a3b8',
                    padding: '2px'
                  }}
                  title="Clear search"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Category Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FlaskConical size={16} style={{ color: '#16a34a' }} />
              <select
                value={labCategory}
                onChange={(e) => setLabCategory(e.target.value)}
                style={{
                  padding: '9px 12px',
                  borderRadius: '10px',
                  border: '1.5px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  fontSize: '0.85rem',
                  color: '#1e293b',
                  fontWeight: 600,
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="ALL">All Categories</option>
                <option value="Hematology">Hematology</option>
                <option value="Biochemistry">Biochemistry</option>
                <option value="Microbiology">Microbiology</option>
                <option value="Immunology">Immunology</option>
                <option value="Pathology">Pathology</option>
                <option value="Radiology">Radiology</option>
                <option value="General">General</option>
              </select>
            </div>

            {/* Status Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={16} style={{ color: '#16a34a' }} />
              <select
                value={labStatus}
                onChange={(e) => setLabStatus(e.target.value)}
                style={{
                  padding: '9px 12px',
                  borderRadius: '10px',
                  border: '1.5px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  fontSize: '0.85rem',
                  color: '#1e293b',
                  fontWeight: 600,
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="ALL">All Statuses</option>
                <option value="Completed">Completed</option>
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
              </select>
            </div>

            {/* Reset Button */}
            {(labSearch || labCategory !== 'ALL' || labStatus !== 'ALL') && (
              <button
                onClick={() => {
                  setLabSearch('');
                  setLabCategory('ALL');
                  setLabStatus('ALL');
                }}
                style={{
                  padding: '8px 14px',
                  borderRadius: '10px',
                  border: '1px solid #bbf7d0',
                  backgroundColor: '#f0fdf4',
                  color: '#16a34a',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <RotateCcw size={14} /> Reset
              </button>
            )}
          </div>

          {/* Cards List */}
          {filteredLabReports.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {filteredLabReports.map((report) => (
                <div
                  key={report.id}
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '20px',
                    backgroundColor: '#f8fafc',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '14px'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0f172a' }}>{report.testTitle}</span>
                      <span style={{ fontSize: '0.78rem', backgroundColor: '#f0fdf4', color: '#16a34a', fontWeight: 700, padding: '3px 10px', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
                        {report.category}
                      </span>
                      {report.fileName && (
                        <span style={{ fontSize: '0.76rem', backgroundColor: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: '6px' }}>
                          📎 {report.fileName}
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: '0.86rem', color: '#64748b' }}>
                      Patient: <strong>{report.patientName} ({report.patientId})</strong> • Ordered by: <strong>{report.orderedDoctor}</strong>
                      {report.date && <> • Date: {report.date}</>}
                    </div>

                    {report.resultsSummary && (
                      <div style={{ fontSize: '0.82rem', color: '#334155', marginTop: '6px' }}>
                        <strong>Findings:</strong> {report.resultsSummary}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button
                      onClick={() => handleToggleLabStatus(report)}
                      style={{
                        backgroundColor: report.status === 'Completed' ? '#dcfce7' : '#fef9c3',
                        color: report.status === 'Completed' ? '#15803d' : '#854d0e',
                        border: '1px solid ' + (report.status === 'Completed' ? '#bbf7d0' : '#fde047'),
                        padding: '7px 16px',
                        borderRadius: '20px',
                        fontWeight: 700,
                        fontSize: '0.82rem',
                        cursor: 'pointer'
                      }}
                      title="Click to toggle status"
                    >
                      Status: {report.status} ⇄
                    </button>

                    <button
                      onClick={() => handleDeleteLabReport(report.id)}
                      style={{
                        backgroundColor: '#fef2f2',
                        border: '1px solid #fecaca',
                        color: '#dc2626',
                        padding: '8px 14px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '0.82rem',
                        fontWeight: 700
                      }}
                    >
                      <Trash2 size={16} /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '48px 20px', color: '#94a3b8' }}>
              <Microscope size={36} style={{ margin: '0 auto 12px auto', opacity: 0.6 }} />
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                No lab reports match your search or filters.
              </div>
              <p style={{ fontSize: '0.84rem', margin: '0 0 16px 0' }}>
                Try adjusting your search query or discipline category.
              </p>
              {(labSearch || labCategory !== 'ALL' || labStatus !== 'ALL') && (
                <button
                  onClick={() => {
                    setLabSearch('');
                    setLabCategory('ALL');
                    setLabStatus('ALL');
                  }}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#f8fafc',
                    color: '#0f172a',
                    fontWeight: 700,
                    fontSize: '0.84rem',
                    cursor: 'pointer'
                  }}
                >
                  Clear All Filters
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: PHARMACY RECORDS */}
      {/* ========================================================================= */}
      {activeTab === 'pharmacy' && (
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0' }}>
                Manage Pharmacy Prescriptions
              </h3>
              <p style={{ margin: 0, fontSize: '0.86rem', color: '#64748b' }}>
                Monitor dispensed medicines, filter by doctor or status, toggle lifecycle, and manage medication records.
              </p>
            </div>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#9333ea', backgroundColor: '#faf5ff', padding: '5px 12px', borderRadius: '20px', border: '1px solid #e9d5ff' }}>
              Showing {filteredPrescriptions.length} of {prescriptions.length} records
            </div>
          </div>

          {/* Pharmacy Search & Filter Toolbar */}
          <div style={{
            display: 'flex',
            gap: '12px',
            marginBottom: '20px',
            flexWrap: 'wrap',
            alignItems: 'center',
            backgroundColor: '#f8fafc',
            padding: '14px',
            borderRadius: '12px',
            border: '1.5px solid #e2e8f0'
          }}>
            {/* Search Input */}
            <div style={{ position: 'relative', flex: '1 1 280px', minWidth: '240px' }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              <input
                type="text"
                value={rxSearch}
                onChange={(e) => setRxSearch(e.target.value)}
                placeholder="Search medication (e.g. Amoxicillin), patient name, ID, or doctor..."
                style={{
                  width: '100%',
                  padding: '10px 36px 10px 38px',
                  borderRadius: '10px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '0.88rem',
                  outline: 'none',
                  backgroundColor: '#ffffff',
                  color: '#0f172a'
                }}
              />
              {rxSearch && (
                <button
                  onClick={() => setRxSearch('')}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#94a3b8',
                    padding: '2px'
                  }}
                  title="Clear search"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Status Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={16} style={{ color: '#9333ea' }} />
              <select
                value={rxStatus}
                onChange={(e) => setRxStatus(e.target.value)}
                style={{
                  padding: '9px 12px',
                  borderRadius: '10px',
                  border: '1.5px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  fontSize: '0.85rem',
                  color: '#1e293b',
                  fontWeight: 600,
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="ALL">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>

            {/* Doctor Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Stethoscope size={16} style={{ color: '#9333ea' }} />
              <select
                value={rxDoctor}
                onChange={(e) => setRxDoctor(e.target.value)}
                style={{
                  padding: '9px 12px',
                  borderRadius: '10px',
                  border: '1.5px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  fontSize: '0.85rem',
                  color: '#1e293b',
                  fontWeight: 600,
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="ALL">All Doctors</option>
                {uniqueRxDoctors.map(doc => (
                  <option key={doc} value={doc}>{doc}</option>
                ))}
              </select>
            </div>

            {/* Duration Range Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={16} style={{ color: '#9333ea' }} />
              <select
                value={rxDuration}
                onChange={(e) => setRxDuration(e.target.value)}
                style={{
                  padding: '9px 12px',
                  borderRadius: '10px',
                  border: '1.5px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  fontSize: '0.85rem',
                  color: '#1e293b',
                  fontWeight: 600,
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="ALL">All Durations</option>
                <option value="SHORT">Short-term (≤ 7 Days)</option>
                <option value="LONG">Long-term (&gt; 7 Days)</option>
              </select>
            </div>

            {/* Reset Button */}
            {(rxSearch || rxStatus !== 'ALL' || rxDoctor !== 'ALL' || rxDuration !== 'ALL') && (
              <button
                onClick={() => {
                  setRxSearch('');
                  setRxStatus('ALL');
                  setRxDoctor('ALL');
                  setRxDuration('ALL');
                }}
                style={{
                  padding: '8px 14px',
                  borderRadius: '10px',
                  border: '1px solid #e9d5ff',
                  backgroundColor: '#faf5ff',
                  color: '#9333ea',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <RotateCcw size={14} /> Reset
              </button>
            )}
          </div>

          {/* Cards List */}
          {filteredPrescriptions.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {filteredPrescriptions.map((rx) => (
                <div
                  key={rx.id}
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '20px',
                    backgroundColor: '#f8fafc',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '14px'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0f172a' }}>{rx.medication}</span>
                      <span style={{ fontSize: '0.8rem', backgroundColor: '#faf5ff', color: '#9333ea', fontWeight: 800, padding: '3px 10px', borderRadius: '12px', border: '1px solid #e9d5ff' }}>
                        {rx.unitPrice}
                      </span>
                      <span style={{ fontSize: '0.78rem', backgroundColor: '#eff6ff', color: '#2563eb', fontWeight: 600, padding: '2px 8px', borderRadius: '8px' }}>
                        ⏱ {rx.duration}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.86rem', color: '#64748b' }}>
                      Patient: <strong>{rx.patientName} ({rx.patientId})</strong> • Prescribed by: <strong>{rx.prescribedDoctor}</strong>
                      {rx.startDate && <> • From: {rx.startDate}</>}
                    </div>

                    {rx.dosage && (
                      <div style={{ fontSize: '0.82rem', color: '#475569', marginTop: '4px' }}>
                        <strong>Instructions:</strong> {rx.dosage}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button
                      onClick={() => handleToggleRxStatus(rx)}
                      style={{
                        backgroundColor: rx.status === 'Active' ? '#dbeafe' : '#f1f5f9',
                        color: rx.status === 'Active' ? '#1d4ed8' : '#64748b',
                        border: '1px solid ' + (rx.status === 'Active' ? '#bfdbfe' : '#cbd5e1'),
                        padding: '7px 16px',
                        borderRadius: '20px',
                        fontWeight: 700,
                        fontSize: '0.82rem',
                        cursor: 'pointer'
                      }}
                      title="Click to toggle status"
                    >
                      Status: {rx.status} ⇄
                    </button>

                    <button
                      onClick={() => handleDeletePrescription(rx.id)}
                      style={{
                        backgroundColor: '#fef2f2',
                        border: '1px solid #fecaca',
                        color: '#dc2626',
                        padding: '8px 14px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '0.82rem',
                        fontWeight: 700
                      }}
                    >
                      <Trash2 size={16} /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '48px 20px', color: '#94a3b8' }}>
              <Pill size={36} style={{ margin: '0 auto 12px auto', opacity: 0.6 }} />
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                No pharmacy prescriptions match your search or filters.
              </div>
              <p style={{ fontSize: '0.84rem', margin: '0 0 16px 0' }}>
                Try adjusting your search query or doctor filter.
              </p>
              {(rxSearch || rxStatus !== 'ALL' || rxDoctor !== 'ALL' || rxDuration !== 'ALL') && (
                <button
                  onClick={() => {
                    setRxSearch('');
                    setRxStatus('ALL');
                    setRxDoctor('ALL');
                    setRxDuration('ALL');
                  }}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#f8fafc',
                    color: '#0f172a',
                    fontWeight: 700,
                    fontSize: '0.84rem',
                    cursor: 'pointer'
                  }}
                >
                  Clear All Filters
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: PATIENTS DIRECTORY */}
      {/* ========================================================================= */}
      {activeTab === 'patients' && (
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0' }}>
                Manage Registered Patients
              </h3>
              <p style={{ margin: 0, fontSize: '0.86rem', color: '#64748b' }}>
                Browse patient clinical identifiers, demographic vitals, blood groups, and account status.
              </p>
            </div>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#ea580c', backgroundColor: '#fff7ed', padding: '5px 12px', borderRadius: '20px', border: '1px solid #fed7aa' }}>
              Showing {filteredPatients.length} of {patients.length} patients
            </div>
          </div>

          {/* Patients Search & Filter Toolbar */}
          <div style={{
            display: 'flex',
            gap: '12px',
            marginBottom: '20px',
            flexWrap: 'wrap',
            alignItems: 'center',
            backgroundColor: '#f8fafc',
            padding: '14px',
            borderRadius: '12px',
            border: '1.5px solid #e2e8f0'
          }}>
            {/* Search Input */}
            <div style={{ position: 'relative', flex: '1 1 280px', minWidth: '240px' }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              <input
                type="text"
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
                placeholder="Search patient name, ID (e.g. PAT-1001), phone, or blood group..."
                style={{
                  width: '100%',
                  padding: '10px 36px 10px 38px',
                  borderRadius: '10px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '0.88rem',
                  outline: 'none',
                  backgroundColor: '#ffffff',
                  color: '#0f172a'
                }}
              />
              {patientSearch && (
                <button
                  onClick={() => setPatientSearch('')}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#94a3b8',
                    padding: '2px'
                  }}
                  title="Clear search"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Gender Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <select
                value={patientGender}
                onChange={(e) => setPatientGender(e.target.value)}
                style={{
                  padding: '9px 12px',
                  borderRadius: '10px',
                  border: '1.5px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  fontSize: '0.85rem',
                  color: '#1e293b',
                  fontWeight: 600,
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="ALL">All Genders</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Blood Group Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <select
                value={patientBloodGroup}
                onChange={(e) => setPatientBloodGroup(e.target.value)}
                style={{
                  padding: '9px 12px',
                  borderRadius: '10px',
                  border: '1.5px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  fontSize: '0.85rem',
                  color: '#1e293b',
                  fontWeight: 600,
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="ALL">All Blood Groups</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
                <option value="Unknown">Unknown</option>
              </select>
            </div>

            {/* Reset Button */}
            {(patientSearch || patientGender !== 'ALL' || patientBloodGroup !== 'ALL') && (
              <button
                onClick={() => {
                  setPatientSearch('');
                  setPatientGender('ALL');
                  setPatientBloodGroup('ALL');
                }}
                style={{
                  padding: '8px 14px',
                  borderRadius: '10px',
                  border: '1px solid #fed7aa',
                  backgroundColor: '#fff7ed',
                  color: '#ea580c',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <RotateCcw size={14} /> Reset
              </button>
            )}
          </div>

          {/* Cards Grid */}
          {filteredPatients.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
              {filteredPatients.map((p) => (
                <div
                  key={p.id}
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '18px',
                    backgroundColor: '#f8fafc',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.02)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a' }}>{p.name}</span>
                    <span style={{ fontSize: '0.78rem', backgroundColor: '#e2e8f0', color: '#334155', fontWeight: 700, padding: '3px 8px', borderRadius: '10px' }}>
                      {p.id}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '14px', lineHeight: '1.5' }}>
                    Age: <strong>{p.age != null ? p.age : '—'}</strong> • Gender: <strong>{p.gender || '—'}</strong> • Blood: <strong>{p.bloodGroup || '—'}</strong>
                    {p.phone && <><br />Phone: <span style={{ color: '#0f172a' }}>{p.phone}</span></>}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button
                      onClick={() => {
                        if (window.confirm(`Delete patient ${p.name}?`)) {
                          emrStore.deletePatient(p.id);
                          toast.success(`Patient ${p.name} deleted.`);
                        }
                      }}
                      style={{
                        backgroundColor: '#fef2f2',
                        border: '1px solid #fecaca',
                        color: '#dc2626',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.78rem',
                        fontWeight: 700
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '48px 20px', color: '#94a3b8' }}>
              <Users size={36} style={{ margin: '0 auto 12px auto', opacity: 0.6 }} />
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                No patients match your search or filters.
              </div>
              <p style={{ fontSize: '0.84rem', margin: '0 0 16px 0' }}>
                Try adjusting your search terms or blood group filter.
              </p>
              {(patientSearch || patientGender !== 'ALL' || patientBloodGroup !== 'ALL') && (
                <button
                  onClick={() => {
                    setPatientSearch('');
                    setPatientGender('ALL');
                    setPatientBloodGroup('ALL');
                  }}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#f8fafc',
                    color: '#0f172a',
                    fontWeight: 700,
                    fontSize: '0.84rem',
                    cursor: 'pointer'
                  }}
                >
                  Clear All Filters
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
