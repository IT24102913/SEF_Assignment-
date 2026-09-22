import React, { useState, useEffect } from 'react';
import { Search, UserCheck, UserPlus, Filter } from 'lucide-react';
import { emrStore } from '../../../data/mockEmrStore';

export default function PatientSelector({ selectedPatient, onSelectPatient }) {
  const [patients, setPatients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    setPatients(emrStore.getPatients());
    const unsubscribe = emrStore.subscribe(() => {
      setPatients(emrStore.getPatients());
    });
    return unsubscribe;
  }, []);

  const filteredPatients = patients.filter(p => 
    p.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.age.toString().includes(searchTerm)
  );

  return (
    <div style={{
      backgroundColor: '#ffffff',
      border: '1.5px solid #cbd5e1',
      borderRadius: '16px',
      padding: '24px',
      marginBottom: '28px',
      boxShadow: '0 4px 12px -2px rgba(0, 0, 0, 0.03)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>Select Patient</h3>
          <p style={{ fontSize: '0.85rem', color: '#64748b' }}>Search patient record by ID, Name, or Age to begin entry.</p>
        </div>

        {selectedPatient && (
          <div style={{
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            padding: '6px 14px',
            borderRadius: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.85rem',
            color: '#15803d',
            fontWeight: 600
          }}>
            <UserCheck size={16} />
            Selected: {selectedPatient.name} ({selectedPatient.id})
          </div>
        )}
      </div>

      {/* Search Input Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        backgroundColor: '#f8fafc',
        border: '1.5px solid #cbd5e1',
        borderRadius: '12px',
        padding: '10px 16px',
        marginBottom: '16px'
      }}>
        <Search size={18} color="#64748b" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by Patient ID (e.g. PAT-1001), Name, or Age..."
          style={{
            border: 'none',
            background: 'transparent',
            outline: 'none',
            width: '100%',
            fontSize: '0.92rem',
            color: '#0f172a'
          }}
        />
      </div>

      {/* Patient Grid / Table */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
        gap: '12px',
        maxHeight: '220px',
        overflowY: 'auto'
      }}>
        {filteredPatients.length > 0 ? (
          filteredPatients.map((p) => {
            const isSelected = selectedPatient?.id === p.id;
            return (
              <div
                key={p.id}
                onClick={() => onSelectPatient(p)}
                style={{
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: isSelected ? '2px solid #2563eb' : '1px solid #e2e8f0',
                  backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.9rem', color: isSelected ? '#1d4ed8' : '#0f172a' }}>{p.name}</span>
                  <span style={{ fontSize: '0.75rem', backgroundColor: '#f1f5f9', color: '#475569', fontWeight: 600, padding: '2px 8px', borderRadius: '10px' }}>
                    {p.id}
                  </span>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', gap: '12px' }}>
                  <span>Age: <strong>{p.age}</strong></span>
                  <span>Gender: <strong>{p.gender}</strong></span>
                  <span>Blood: <strong>{p.bloodGroup}</strong></span>
                </div>
              </div>
            );
          })
        ) : (
          <div style={{ gridColumn: '1 / -1', padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>
            No patient found matching "{searchTerm}".
          </div>
        )}
      </div>
    </div>
  );
}
