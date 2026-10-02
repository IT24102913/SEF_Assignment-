import React, { useState, useEffect } from 'react';
import { emrApi } from '../../../api/emrApi';
import { FileText, ChevronDown, ChevronUp, Pill, Loader } from 'lucide-react';

export default function ConsultationNotes() {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [showInfo, setShowInfo] = useState(false);

  useEffect(() => {
    fetchConsultations();
  }, []);

  const fetchConsultations = async () => {
    setLoading(true);
    try {
      const myPatient = await emrApi.getMyPatient();
      if (myPatient && myPatient.patientCode) {
        const data = await emrApi.getConsultations(myPatient.patientCode);
        setNotes((data || []).map(c => {
          let meds = [];
          try {
            meds = typeof c.prescribedMedicines === 'string' ? JSON.parse(c.prescribedMedicines) : (c.prescribedMedicines || []);
          } catch { meds = []; }
          let tests = [];
          if (Array.isArray(c.recommendedTests)) {
            tests = c.recommendedTests;
          } else if (typeof c.recommendedTests === 'string') {
            tests = c.recommendedTests.split(',').map(s => s.trim()).filter(Boolean);
          }
          return {
            id: c.id,
            doctorName: c.doctorName,
            doctorDesignation: c.doctorDesignation,
            date: c.consultationDate ? c.consultationDate.split('T')[0] : '',
            diagnosis: c.diagnosis,
            recommendedTests: tests,
            medicines: meds,
            notes: c.clinicalNotes
          };
        }));
      } else {
        setNotes([]);
      }
    } catch (err) {
      console.error('Error fetching consultations:', err);
      setNotes([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#0f172a', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>Consultation Notes</span>
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
            Your clinical consultation history, diagnoses, and doctor recommendations.
          </p>
        )}
      </div>

      {loading ? (
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '48px', textAlign: 'center', color: '#64748b' }}>
          <Loader size={32} className="animate-spin" style={{ margin: '0 auto 12px auto', display: 'block', color: '#0d7c6b' }} />
          <p>Loading your consultation records...</p>
        </div>
      ) : notes.length === 0 ? (
        <div style={{ backgroundColor: '#ffffff', border: '2px dashed #cbd5e1', borderRadius: '16px', padding: '48px', textAlign: 'center', color: '#94a3b8' }}>
          <FileText size={40} style={{ marginBottom: '12px', opacity: 0.4 }} />
          <p>No consultation notes found. Your doctor will add notes after your next visit.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {notes.map((note) => {
            const isOpen = expanded === note.id;
            return (
              <div
                key={note.id}
                style={{
                  backgroundColor: '#ffffff',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  boxShadow: '0 4px 16px -2px rgba(15, 23, 42, 0.08), 0 2px 4px -1px rgba(15, 23, 42, 0.04)',
                  transition: 'all 0.2s ease-in-out'
                }}
              >
                {/* Header Row — Always Visible */}
                <div
                  onClick={() => setExpanded(isOpen ? null : note.id)}
                  style={{
                    padding: '22px 26px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                    backgroundColor: isOpen ? '#f8fafc' : '#ffffff',
                    borderBottom: isOpen ? '1.5px solid #cbd5e1' : 'none',
                    transition: 'background 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '12px', backgroundColor: '#eff6ff', color: '#0d7c6b', border: '1.5px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FileText size={22} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#0f172a' }}>{note.doctorName}</div>
                      <div style={{ fontSize: '0.85rem', color: '#0d7c6b', fontWeight: 600 }}>{note.doctorDesignation}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.88rem', color: '#1e293b', fontWeight: 700 }}>{note.date}</div>
                      <div style={{ fontSize: '0.78rem', color: '#64748b' }}>Note ID: {String(note.id).substring(0, 8)}...</div>
                    </div>
                    {isOpen ? <ChevronUp size={22} color="#0d7c6b" /> : <ChevronDown size={22} color="#64748b" />}
                  </div>
                </div>

                {/* Expanded Details */}
                {isOpen && (
                  <div style={{ padding: '24px 26px', backgroundColor: '#ffffff' }}>
                    {/* Diagnosis */}
                    <div style={{ marginBottom: '20px' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '8px' }}>
                        Primary Diagnosis
                      </div>
                      <div style={{ fontSize: '1.02rem', fontWeight: 700, color: '#064e3b', backgroundColor: '#f0fdf4', padding: '14px 18px', borderRadius: '10px', border: '1.5px solid #86efac', borderLeft: '5px solid #0d7c6b', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                        {note.diagnosis}
                      </div>
                    </div>

                    {/* Recommended Tests */}
                    {note.recommendedTests?.length > 0 && (
                      <div style={{ marginBottom: '20px' }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '8px' }}>
                          Ordered Diagnostic Tests
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          {note.recommendedTests.map((test, i) => (
                            <span key={i} style={{ backgroundColor: '#ecfdf5', color: '#065f46', fontSize: '0.86rem', fontWeight: 700, padding: '6px 16px', borderRadius: '20px', border: '1.5px solid #6ee7b7', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
                              {test}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Prescribed Medicines */}
                    {note.medicines?.length > 0 && (
                      <div style={{ marginBottom: '20px' }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '8px' }}>
                          Prescribed Medications
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {note.medicines.map((med, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: '#ffffff', padding: '12px 16px', borderRadius: '10px', border: '1.5px solid #cbd5e1', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
                              <div style={{ width: '34px', height: '34px', borderRadius: '8px', backgroundColor: '#ecfdf5', color: '#0d7c6b', border: '1px solid #a7f3d0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <Pill size={18} />
                              </div>
                              <div style={{ flex: 1 }}>
                                <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.96rem' }}>{med.name}</span>
                                <span style={{ color: '#475569', fontSize: '0.88rem', fontWeight: 600 }}> — {med.dosage}</span>
                                {med.duration && <span style={{ marginLeft: '10px', backgroundColor: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd', padding: '2px 8px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700 }}>{med.duration}</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Clinical Notes */}
                    {note.notes && (
                      <div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '8px' }}>
                          Doctor's Clinical Notes
                        </div>
                        <p style={{ fontSize: '0.94rem', color: '#1e293b', lineHeight: 1.6, backgroundColor: '#f8fafc', padding: '14px 18px', borderRadius: '10px', border: '1.5px solid #cbd5e1', borderLeft: '5px solid #0284c7', margin: 0, fontWeight: 500 }}>
                          {note.notes}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
