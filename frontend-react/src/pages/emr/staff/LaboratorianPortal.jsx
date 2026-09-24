import React, { useState } from 'react';
import PatientSelector from './PatientSelector';
import { emrStore } from '../../../data/mockEmrStore';
import { Microscope, Upload, FilePlus, ShieldAlert, CheckCircle, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';

export default function LaboratorianPortal({ staffSession }) {
  const { user } = useAuth();
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [saving, setSaving] = useState(false);

  // Form state - 100% clean, no hardcoded demo values
  const [testTitle, setTestTitle] = useState('');
  const [category, setCategory] = useState('');
  const [orderedDoctor, setOrderedDoctor] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState('Completed');
  const [resultsSummary, setResultsSummary] = useState('');
  const [fileName, setFileName] = useState('');

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFileName(file.name);
    }
  };

  const handleCreateLabReport = async (e) => {
    e.preventDefault();
    if (!selectedPatient) {
      toast.error('Please select a patient first.');
      return;
    }
    if (!testTitle.trim()) {
      toast.error('Please enter the lab test title.');
      return;
    }

    setSaving(true);
    try {
      const generatedFileName = fileName || `${testTitle.replace(/[^a-zA-Z0-9]/g, '_')}_${selectedPatient.name.replace(/[^a-zA-Z0-9]/g, '')}.pdf`;

      const newReport = {
        patientId: selectedPatient.id,
        patientName: selectedPatient.name,
        testTitle: testTitle.trim(),
        category: category.trim() || 'General',
        orderedDoctor: orderedDoctor.trim() || 'Attending Physician',
        date,
        status,
        fileName: generatedFileName,
        resultsSummary: resultsSummary.trim(),
        addedBy: `${staffSession.staffId || user?.fullName || 'Staff'} (Lab)`
      };

      await emrStore.addLabReport(newReport);
      toast.success(`Lab Report "${testTitle}" saved for ${selectedPatient.name}!`);

      // Reset form
      setTestTitle('');
      setCategory('');
      setOrderedDoctor('');
      setResultsSummary('');
      setFileName('');
    } catch (err) {
      toast.error('Failed to upload lab report. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {/* Header Banner */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px', backgroundColor: '#f0fdf4', padding: '20px', borderRadius: '16px', border: '1px solid #bbf7d0' }}>
        <div style={{ width: '44px', height: '44px', borderRadius: '12px', backgroundColor: '#16a34a', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Microscope size={24} />
        </div>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>Laboratorian (Lab Staff) Workspace</h2>
          <p style={{ color: '#475569', fontSize: '0.9rem' }}>
            Logged in as <strong>{staffSession.staffId}</strong> • Authorized to generate & upload diagnostic lab test reports.
          </p>
        </div>
      </div>

      {/* Privacy Notice Banner */}
      <div style={{ backgroundColor: '#fff7ed', border: '1px solid #fed7aa', color: '#c2410c', padding: '14px 18px', borderRadius: '12px', fontSize: '0.88rem', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <ShieldAlert size={20} />
        <div>
          <strong>Privacy Shield Policy:</strong> Consultation notes are restricted to Doctor & Patient only. Lab staff can issue test reports based on lab order or patient physical document.
        </div>
      </div>

      {/* 1. Patient Selector */}
      <PatientSelector selectedPatient={selectedPatient} onSelectPatient={setSelectedPatient} />

      {/* 2. Lab Report Form */}
      {selectedPatient ? (
        <form onSubmit={handleCreateLabReport} style={{
          backgroundColor: '#ffffff',
          border: '1.5px solid #cbd5e1',
          borderRadius: '20px',
          padding: '32px',
          boxShadow: '0 8px 20px -4px rgba(0, 0, 0, 0.04)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid #f1f5f9', pb: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FilePlus size={22} color="#16a34a" />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a' }}>
                Upload Lab Report for {selectedPatient.name} ({selectedPatient.id})
              </h3>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
            <div className="form-group">
              <label style={{ fontSize: '0.88rem', fontWeight: 600, color: '#334155', marginBottom: '6px', display: 'block' }}>Diagnostic Test Title</label>
              <input
                type="text"
                value={testTitle}
                onChange={(e) => setTestTitle(e.target.value)}
                placeholder="e.g. Complete Blood Count (CBC), Lipid Profile"
                required
                className="input-field"
                style={{ width: '100%' }}
              />
            </div>

            <div className="form-group">
              <label style={{ fontSize: '0.88rem', fontWeight: 600, color: '#334155', marginBottom: '6px', display: 'block' }}>Category</label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Hematology, Biochemistry, Radiology, Microbiology"
                className="input-field"
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '20px' }}>
            <div className="form-group">
              <label style={{ fontSize: '0.88rem', fontWeight: 600, color: '#334155', marginBottom: '6px', display: 'block' }}>Ordering Doctor</label>
              <input
                type="text"
                value={orderedDoctor}
                onChange={(e) => setOrderedDoctor(e.target.value)}
                placeholder="e.g. Dr. John Doe"
                className="input-field"
                style={{ width: '100%' }}
              />
            </div>

            <div className="form-group">
              <label style={{ fontSize: '0.88rem', fontWeight: 600, color: '#334155', marginBottom: '6px', display: 'block' }}>Report Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="input-field"
                style={{ width: '100%' }}
              />
            </div>

            <div className="form-group">
              <label style={{ fontSize: '0.88rem', fontWeight: 600, color: '#334155', marginBottom: '6px', display: 'block' }}>Report Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="input-field"
                style={{ width: '100%', padding: '10px 12px' }}
              >
                <option value="Completed">Completed</option>
                <option value="Pending">Pending Analysis</option>
                <option value="Review">Requires Doctor Review</option>
              </select>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '0.88rem', fontWeight: 600, color: '#334155', marginBottom: '6px', display: 'block' }}>Diagnostic Findings / Results Summary</label>
            <textarea
              rows={3}
              value={resultsSummary}
              onChange={(e) => setResultsSummary(e.target.value)}
              placeholder="e.g. All parameters within normal reference ranges. Hemoglobin: 14.2 g/dL..."
              className="input-field"
              style={{ width: '100%', resize: 'vertical' }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '28px' }}>
            <label style={{ fontSize: '0.88rem', fontWeight: 600, color: '#334155', marginBottom: '6px', display: 'block' }}>Attach Digital Diagnostic PDF / Document (Optional)</label>
            <div style={{
              border: '2px dashed #cbd5e1',
              borderRadius: '12px',
              padding: '24px',
              textAlign: 'center',
              backgroundColor: '#f8fafc',
              cursor: 'pointer'
            }}>
              <Upload size={32} color="#16a34a" style={{ margin: '0 auto 10px auto' }} />
              <input
                type="file"
                id="lab-file"
                onChange={handleFileUpload}
                accept=".pdf,.png,.jpg,.jpeg"
                style={{ display: 'none' }}
              />
              <label htmlFor="lab-file" style={{ cursor: 'pointer', display: 'block' }}>
                <span style={{ color: '#16a34a', fontWeight: 700 }}>Click to browse files</span> or drag and drop PDF/Images
              </label>
              {fileName && (
                <div style={{ marginTop: '10px', fontSize: '0.85rem', color: '#0f172a', fontWeight: 600 }}>
                  Selected File: {fileName}
                </div>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="btn btn-primary"
            style={{
              backgroundColor: '#16a34a',
              borderColor: '#16a34a',
              padding: '14px 28px',
              fontSize: '1rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.7 : 1
            }}
          >
            <Save size={18} /> {saving ? 'Uploading Report...' : 'Publish Lab Report'}
          </button>
        </form>
      ) : (
        <div style={{ backgroundColor: '#ffffff', border: '2px dashed #cbd5e1', borderRadius: '16px', padding: '40px', textAlign: 'center', color: '#64748b' }}>
          Select a patient above to upload lab test reports.
        </div>
      )}
    </div>
  );
}
