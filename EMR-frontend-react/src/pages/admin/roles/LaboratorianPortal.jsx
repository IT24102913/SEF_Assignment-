import React, { useState } from 'react';
import PatientSelector from '../components/PatientSelector';
import { emrStore } from '../../../data/mockEmrStore';
import { Microscope, Upload, FilePlus, ShieldAlert, CheckCircle, Info } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LaboratorianPortal({ staffSession }) {
  const [selectedPatient, setSelectedPatient] = useState(null);

  // Form state
  const [testTitle, setTestTitle] = useState('Complete Blood Count (CBC)');
  const [category, setCategory] = useState('Hematology');
  const [orderedDoctor, setOrderedDoctor] = useState('Dr. Sarah Jenkins');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState('Completed');
  const [fileName, setFileName] = useState('');

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFileName(file.name);
    }
  };

  const handleCreateLabReport = (e) => {
    e.preventDefault();
    if (!selectedPatient) {
      toast.error('Please select a patient first.');
      return;
    }

    const newReport = {
      id: `LAB-${Math.floor(1000 + Math.random() * 9000)}`,
      patientId: selectedPatient.id,
      patientName: selectedPatient.name,
      testTitle,
      category,
      orderedDoctor,
      date,
      status,
      fileName: fileName || `${testTitle.replace(/\s+/g, '_')}_${selectedPatient.name.replace(/\s+/g, '')}.pdf`,
      addedBy: `${staffSession.staffId} (Lab Staff)`
    };

    emrStore.addLabReport(newReport);
    toast.success(`Lab Report "${testTitle}" uploaded for ${selectedPatient.name}!`);

    // Reset fields
    setFileName('');
  };

  const handleEditRequest = () => {
    toast('Edit/Delete restricted for Lab Staff. Request sent to Super Admin.', {
      icon: '🛡️',
    });
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

            <div style={{ fontSize: '0.8rem', backgroundColor: '#f1f5f9', color: '#475569', padding: '4px 12px', borderRadius: '12px', fontWeight: 600 }}>
              Permission: Create Only (No Delete/Edit)
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
            <div className="form-group">
              <label style={{ fontSize: '0.88rem', fontWeight: 600, color: '#334155', marginBottom: '6px', display: 'block' }}>Report / Test Title</label>
              <input type="text" value={testTitle} onChange={(e) => setTestTitle(e.target.value)} required className="input-field" style={{ width: '100%' }} />
            </div>

            <div className="form-group">
              <label style={{ fontSize: '0.88rem', fontWeight: 600, color: '#334155', marginBottom: '6px', display: 'block' }}>Laboratory Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="input-field" style={{ width: '100%' }}>
                <option value="Hematology">Hematology</option>
                <option value="Biochemistry">Biochemistry</option>
                <option value="Microbiology">Microbiology</option>
                <option value="Radiology">Radiology & Imaging</option>
                <option value="Pathology">Pathology</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '24px' }}>
            <div className="form-group">
              <label style={{ fontSize: '0.88rem', fontWeight: 600, color: '#334155', marginBottom: '6px', display: 'block' }}>Ordered Doctor Name</label>
              <input type="text" value={orderedDoctor} onChange={(e) => setOrderedDoctor(e.target.value)} required className="input-field" style={{ width: '100%' }} />
            </div>

            <div className="form-group">
              <label style={{ fontSize: '0.88rem', fontWeight: 600, color: '#334155', marginBottom: '6px', display: 'block' }}>Report Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required className="input-field" style={{ width: '100%' }} />
            </div>

            <div className="form-group">
              <label style={{ fontSize: '0.88rem', fontWeight: 600, color: '#334155', marginBottom: '6px', display: 'block' }}>Report Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="input-field" style={{ width: '100%' }}>
                <option value="Completed">Completed</option>
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
              </select>
            </div>
          </div>

          {/* File Upload Box */}
          <div style={{
            border: '2px dashed #cbd5e1',
            borderRadius: '14px',
            padding: '24px',
            textAlign: 'center',
            backgroundColor: '#f8fafc',
            marginBottom: '28px'
          }}>
            <Upload size={32} color="#16a34a" style={{ marginBottom: '8px' }} />
            <div style={{ fontWeight: 600, fontSize: '0.92rem', color: '#0f172a', marginBottom: '4px' }}>
              Attach PDF or Scan Image Report
            </div>
            <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '12px' }}>Supported formats: .PDF, .PNG, .JPG (Max 15MB)</p>
            
            <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={handleFileUpload} id="lab-file-input" style={{ display: 'none' }} />
            <label htmlFor="lab-file-input" className="btn btn-secondary" style={{ cursor: 'pointer', display: 'inline-flex' }}>
              Choose File
            </label>

            {fileName && (
              <div style={{ marginTop: '12px', fontSize: '0.85rem', color: '#16a34a', fontWeight: 600 }}>
                Selected File: {fileName}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            <button type="submit" className="btn" style={{ backgroundColor: '#16a34a', color: '#fff', padding: '14px 28px', fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <CheckCircle size={18} /> Upload Lab Report
            </button>

            <button type="button" onClick={handleEditRequest} className="btn btn-secondary" style={{ color: '#475569' }}>
              Request Edit / Delete Permission
            </button>
          </div>
        </form>
      ) : (
        <div style={{ backgroundColor: '#ffffff', border: '2px dashed #cbd5e1', borderRadius: '16px', padding: '40px', textAlign: 'center', color: '#64748b' }}>
          Select a patient above to create and upload lab reports.
        </div>
      )}
    </div>
  );
}
