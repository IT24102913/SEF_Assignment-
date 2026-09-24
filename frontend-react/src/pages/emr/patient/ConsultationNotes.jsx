import React, { useState, useEffect } from 'react';
import { emrApi } from '../../../api/emrApi';
import { FileText, ChevronDown, ChevronUp, Pill, Loader } from 'lucide-react';

export default function ConsultationNotes() {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

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
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
          Consultation Notes
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.92rem' }}>
          Your clinical consultation history, diagnoses, and doctor recommendations.
        </p>
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
                  border: '1px solid #e2e8f0',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  boxShadow: '0 2px 8px -2px rgba(0,0,0,0.04)'
                }}
              >
                {/* Header Row — Always Visible */}
                <div
                  onClick={() => setExpanded(isOpen ? null : note.id)}
                  style={{
                    padding: '20px 24px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                    backgroundColor: isOpen ? '#f8fafc' : '#ffffff',
                    transition: 'background 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#eff6ff', color: '#0d7c6b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FileText size={20} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a' }}>{note.doctorName}</div>
                      <div style={{ fontSize: '0.82rem', color: '#0d7c6b', fontWeight: 500 }}>{note.doctorDesignation}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 600 }}>{note.date}</div>
                      <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Note ID: {String(note.id).substring(0, 8)}...</div>
                    </div>
                    {isOpen ? <ChevronUp size={20} color="#64748b" /> : <ChevronDown size={20} color="#64748b" />}
                  </div>
                </div>

                {/* Expanded Details */}
                {isOpen && (
                  <div style={{ padding: '0 24px 24px 24px', borderTop: '1px solid #f1f5f9' }}>
                    {/* Diagnosis */}
                    <div style={{ marginTop: '20px', marginBottom: '16px' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Primary Diagnosis</div>
                      <div style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a', backgroundColor: '#f8fafc', padding: '12px 16px', borderRadius: '10px', borderLeft: '3px solid #0d7c6b' }}>
                        {note.diagnosis}
                      </div>
                    </div>

                    {/* Recommended Tests */}
                    {note.recommendedTests?.length > 0 && (
                      <div style={{ marginBottom: '16px' }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Ordered Diagnostic Tests</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          {note.recommendedTests.map((test, i) => (
                            <span key={i} style={{ backgroundColor: '#f0fdf4', color: '#15803d', fontSize: '0.83rem', fontWeight: 600, padding: '4px 14px', borderRadius: '20px', border: '1px solid #bbf7d0' }}>
                              {test}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Prescribed Medicines */}
                    {note.medicines?.length > 0 && (
                      <div style={{ marginBottom: '16px' }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Prescribed Medications</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {note.medicines.map((med, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: '#faf5ff', padding: '10px 14px', borderRadius: '10px', border: '1px solid #e9d5ff' }}>
                              <Pill size={16} color="#0d7c6b" />
                              <div>
                                <span style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.9rem' }}>{med.name}</span>
                                <span style={{ color: '#64748b', fontSize: '0.82rem' }}> — {med.dosage}</span>
                                {med.duration && <span style={{ color: '#095e51', fontSize: '0.8rem', fontWeight: 600 }}> [{med.duration}]</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Clinical Notes */}
                    {note.notes && (
                      <div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Doctor's Clinical Notes</div>
                        <p style={{ fontSize: '0.9rem', color: '#475569', lineHeight: 1.6, backgroundColor: '#f8fafc', padding: '14px 16px', borderRadius: '10px' }}>
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
