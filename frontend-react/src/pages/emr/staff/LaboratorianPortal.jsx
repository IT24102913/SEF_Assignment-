import React, { useState } from 'react';
import PatientSelector from './PatientSelector';
import { emrStore } from '../../../data/mockEmrStore';
import { Microscope, Upload, FilePlus, AlertCircle, CheckCircle2, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';

export default function LaboratorianPortal({ staffSession }) {
  const { user } = useAuth();
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [testTitle, setTestTitle] = useState('');
  const [category, setCategory] = useState('Hematology');
  const [orderedDoctor, setOrderedDoctor] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState('Completed');
  const [fileName, setFileName] = useState('');

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFileName(file.name);
      toast.success(`Attached file: ${file.name}`);
    }
  };

  const handleCreateLabReport = async (e) => {
    e.preventDefault();
    if (!selectedPatient) {
      toast.error('Please select a patient first.');
      return;
    }
    if (!testTitle.trim()) {
      toast.error('Please enter the report / test title.');
      return;
    }

    setSaving(true);
    try {
      const generatedFileName = fileName || `${testTitle.replace(/[^a-zA-Z0-9]/g, '_')}_${selectedPatient.name.replace(/[^a-zA-Z0-9]/g, '')}.pdf`;

      const newReport = {
        patientId: selectedPatient.id,
        patientName: selectedPatient.name,
        testTitle: testTitle.trim(),
        category: category || 'Hematology',
        orderedDoctor: orderedDoctor.trim() || 'Dr. Consultant',
        date,
        status,
        fileName: generatedFileName,
        resultsSummary: '',
        addedBy: `${staffSession?.staffId || user?.fullName || 'LAB-202'} (Lab Staff)`
      };

      await emrStore.addLabReport(newReport);
      toast.success(`Lab Report "${testTitle}" uploaded for ${selectedPatient.name}!`);

      // Reset form
      setTestTitle('');
      setCategory('Hematology');
      setOrderedDoctor('');
      setStatus('Completed');
      setFileName('');
    } catch (err) {
      console.error('Failed to upload lab report:', err);
      toast.error('Failed to upload lab report. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleRequestPermission = () => {
    toast('Edit/Delete restricted for Lab Staff. Request sent to Super Admin.', {
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
        backgroundColor: '#f0fdf4',
        padding: '18px 24px',
        borderRadius: '16px',
        border: '1.5px solid #bbf7d0'
      }}>
        <div style={{
          width: '42px',
          height: '42px',
          borderRadius: '12px',
          backgroundColor: '#16a34a',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          <Microscope size={22} />
        </div>
        <div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: '0 0 2px 0' }}>
            Laboratorian (Lab Staff) Workspace
          </h2>
          <p style={{ color: '#475569', fontSize: '0.88rem', margin: 0 }}>
            Logged in as <strong>{staffSession?.staffId || 'LAB-202'}</strong> • Authorized to generate & upload diagnostic lab test reports.
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
          <strong>Privacy Shield Policy:</strong> Consultation notes are restricted to Doctor & Patient only. Lab staff can issue test reports based on lab order or patient physical document.
        </div>
      </div>

      {/* 3. Patient Selector (Shows max 8 patients & prominent search) */}
      <PatientSelector selectedPatient={selectedPatient} onSelectPatient={setSelectedPatient} />

      {/* 4. Upload Lab Report Form Card */}
      {selectedPatient ? (
        <form onSubmit={handleCreateLabReport} style={{
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
              <FilePlus size={22} color="#16a34a" />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Upload Lab Report for {selectedPatient.name} ({selectedPatient.id})
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
              Permission: Create Only (No Delete/Edit)
            </span>
          </div>

          {/* Row 1: Report Title (50%) & Laboratory Category (50%) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '8px', display: 'block' }}>
                Report / Test Title
              </label>
              <input
                type="text"
                value={testTitle}
                onChange={(e) => setTestTitle(e.target.value)}
                placeholder="Complete Blood Count (CBC)"
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
                Laboratory Category
              </label>
              <div style={{ position: 'relative' }}>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '11px 36px 11px 16px',
                    borderRadius: '10px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.92rem',
                    outline: 'none',
                    backgroundColor: '#ffffff',
                    appearance: 'none',
                    cursor: 'pointer',
                    color: '#0f172a'
                  }}
                >
                  <option value="Hematology">Hematology</option>
                  <option value="Biochemistry">Biochemistry</option>
                  <option value="Immunology">Immunology</option>
                  <option value="Microbiology">Microbiology</option>
                  <option value="Radiology">Radiology</option>
                  <option value="Pathology">Pathology</option>
                  <option value="General Diagnostics">General Diagnostics</option>
                </select>
                <ChevronDown size={18} color="#64748b" style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              </div>
            </div>
          </div>

          {/* Row 2: Ordered Doctor Name (33%), Report Date (33%), Report Status (33%) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '24px' }}>
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '8px', display: 'block' }}>
                Ordered Doctor Name
              </label>
              <input
                type="text"
                value={orderedDoctor}
                onChange={(e) => setOrderedDoctor(e.target.value)}
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
                Report Date
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

            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '8px', display: 'block' }}>
                Report Status
              </label>
              <div style={{ position: 'relative' }}>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '11px 36px 11px 16px',
                    borderRadius: '10px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.92rem',
                    outline: 'none',
                    backgroundColor: '#ffffff',
                    appearance: 'none',
                    cursor: 'pointer',
                    color: '#0f172a'
                  }}
                >
                  <option value="Completed">Completed</option>
                  <option value="Pending">Pending Analysis</option>
                  <option value="Review">Requires Doctor Review</option>
                </select>
                <ChevronDown size={18} color="#64748b" style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              </div>
            </div>
          </div>

          {/* Row 3: Digital File Attachment Box */}
          <div style={{
            border: '2px dashed #cbd5e1',
            borderRadius: '14px',
            padding: '32px 20px',
            textAlign: 'center',
            backgroundColor: '#f8fafc',
            marginBottom: '28px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
              <Upload size={28} color="#16a34a" />
            </div>

            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
              Attach PDF or Scan Image Report
            </div>
            <div style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '16px' }}>
              Supported formats: .PDF, .PNG, .JPG (Max 15MB)
            </div>

            <input
              type="file"
              id="lab-report-file"
              onChange={handleFileUpload}
              accept=".pdf,.png,.jpg,.jpeg"
              style={{ display: 'none' }}
            />
            <label
              htmlFor="lab-report-file"
              style={{
                display: 'inline-block',
                backgroundColor: '#ffffff',
                border: '1.5px solid #cbd5e1',
                borderRadius: '8px',
                padding: '8px 22px',
                fontSize: '0.88rem',
                fontWeight: 600,
                color: '#334155',
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
              }}
            >
              Choose File
            </label>

            {fileName && (
              <div style={{ marginTop: '12px', fontSize: '0.88rem', color: '#16a34a', fontWeight: 700 }}>
                Selected File: {fileName}
              </div>
            )}
          </div>

          {/* Row 4: Bottom Action Buttons */}
          <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
            <button
              type="submit"
              disabled={saving}
              style={{
                backgroundColor: '#16a34a',
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
                boxShadow: '0 4px 10px rgba(22, 163, 74, 0.25)',
                transition: 'background 0.2s, transform 0.1s'
              }}
            >
              <CheckCircle2 size={18} /> {saving ? 'Uploading Report...' : 'Upload Lab Report'}
            </button>

            <button
              type="button"
              onClick={handleRequestPermission}
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
              Request Edit / Delete Permission
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
          Select a patient above to upload lab test reports.
        </div>
      )}
    </div>
  );
}
