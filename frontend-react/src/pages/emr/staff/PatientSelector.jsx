import React, { useState, useEffect } from 'react';
import { Search, UserCheck, X } from 'lucide-react';
import { emrStore } from '../../../data/mockEmrStore';

export default function PatientSelector({ selectedPatient, onSelectPatient }) {
  const [patients, setPatients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    // Initial load from store & trigger live PostgreSQL backend sync
    setPatients(emrStore.getPatients());
    emrStore.syncFromBackend();

    const unsubscribe = emrStore.subscribe(() => {
      setPatients(emrStore.getPatients());
    });
    return unsubscribe;
  }, []);

  // Filter patients based on search term
  const filteredPatients = patients.filter(p => 
    (p.id && p.id.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (p.name && p.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (p.age != null && p.age.toString().includes(searchTerm)) ||
    (p.bloodGroup && p.bloodGroup.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Exact requirement: Only 8 patients should be in the view
  const visiblePatients = filteredPatients.slice(0, 8);

  return (
    <div style={{
      backgroundColor: '#ffffff',
      border: '1.5px solid #cbd5e1',
      borderRadius: '16px',
      padding: '24px 28px',
      marginBottom: '28px',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)'
    }}>
      {/* Header Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
        <div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0' }}>
            Select Patient
          </h3>
          <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>
            Search patient record by ID, Name, or Age to begin entry.
          </p>
        </div>

        {selectedPatient && (
          <div style={{
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            padding: '7px 16px',
            borderRadius: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.85rem',
            color: '#15803d',
            fontWeight: 700
          }}>
            <UserCheck size={16} />
            Selected: {selectedPatient.name} ({selectedPatient.id})
          </div>
        )}
      </div>

      {/* High-Visibility Search Input Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        backgroundColor: '#ffffff',
        border: '1.5px solid #94a3b8',
        borderRadius: '12px',
        padding: '12px 18px',
        marginBottom: '20px',
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)',
        transition: 'border-color 0.2s, box-shadow 0.2s'
      }}>
        <Search size={20} color="#475569" style={{ flexShrink: 0 }} />
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
            fontSize: '0.95rem',
            fontWeight: 500,
            color: '#0f172a'
          }}
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              padding: '2px'
            }}
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Exactly 8 Patients Grid (4 Columns x 2 Rows) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '14px'
      }}>
        {visiblePatients.length > 0 ? (
          visiblePatients.map((p) => {
            const isSelected = selectedPatient?.id === p.id;
            return (
              <div
                key={p.id}
                onClick={() => onSelectPatient(p)}
                style={{
                  padding: '14px 16px',
                  borderRadius: '12px',
                  border: isSelected ? '2px solid #2563eb' : '1px solid #cbd5e1',
                  backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: isSelected ? '0 4px 12px rgba(37, 99, 235, 0.12)' : '0 1px 3px rgba(0, 0, 0, 0.02)'
                }}
              >
                {/* Header: Name + Patient Code Badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{
                    fontWeight: 700,
                    fontSize: '0.92rem',
                    color: isSelected ? '#1d4ed8' : '#0f172a',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: '130px'
                  }}>
                    {p.name}
                  </span>
                  <span style={{
                    fontSize: '0.72rem',
                    backgroundColor: isSelected ? '#dbeafe' : '#f1f5f9',
                    color: isSelected ? '#1e40af' : '#475569',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '8px',
                    flexShrink: 0
                  }}>
                    {p.id}
                  </span>
                </div>

                {/* Vitals Summary: Age, Gender, Blood */}
                <div style={{
                  fontSize: '0.78rem',
                  color: isSelected ? '#3b82f6' : '#64748b',
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: '4px'
                }}>
                  <span>Age: <strong style={{ color: isSelected ? '#1e40af' : '#334155' }}>{p.age != null ? p.age : '—'}</strong></span>
                  <span>Gender: <strong style={{ color: isSelected ? '#1e40af' : '#334155' }}>{p.gender || '—'}</strong></span>
                  <span>Blood: <strong style={{ color: isSelected ? '#1e40af' : '#334155' }}>{p.bloodGroup || '—'}</strong></span>
                </div>
              </div>
            );
          })
        ) : (
          <div style={{ gridColumn: '1 / -1', padding: '30px', textAlign: 'center', color: '#94a3b8', fontSize: '0.92rem' }}>
            {searchTerm ? `No patient found matching "${searchTerm}".` : 'No registered patients available in database.'}
          </div>
        )}
      </div>

      {/* Showing count indicator if more than 8 patients exist */}
      {filteredPatients.length > 8 && (
        <div style={{ marginTop: '12px', textAlign: 'right', fontSize: '0.78rem', color: '#94a3b8' }}>
          Showing 8 of {filteredPatients.length} patients • Refine search to locate specific records
        </div>
      )}
    </div>
  );
}
