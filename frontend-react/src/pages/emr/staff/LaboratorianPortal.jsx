import React, { useState, useEffect } from 'react';
import PatientSelector from './PatientSelector';
import { emrStore } from '../../../data/mockEmrStore';
import {
  Microscope,
  Upload,
  FilePlus,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  FileText,
  Image as ImageIcon,
  Eye,
  Trash2,
  X,
  Plus,
  ShieldCheck,
  Download,
  Clock
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';
import LabReportViewerModal, { downloadLabReport } from '../../../components/emr/LabReportViewerModal';

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
  const [resultsSummary, setResultsSummary] = useState('');

  // Multiple files attachment state
  const [attachedFiles, setAttachedFiles] = useState([]);

  // Verification & preview modals
  const [verifyingReport, setVerifyingReport] = useState(null);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [patientReports, setPatientReports] = useState([]);

  // Sync reports for selected patient
  const loadPatientReports = () => {
    if (selectedPatient) {
      const reports = emrStore.getLabReports(selectedPatient.id) || [];
      setPatientReports(reports);
    } else {
      setPatientReports([]);
    }
  };

  useEffect(() => {
    loadPatientReports();
    const unsub = emrStore.subscribe(loadPatientReports);
    return unsub;
  }, [selectedPatient]);

  // Handle multiple files selection
  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const filePromises = files.map((file) => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (uploadEvent) => {
          resolve({
            id: Math.random().toString(36).substring(2, 9),
            name: file.name,
            size:
              file.size / 1024 < 1024
                ? `${(file.size / 1024).toFixed(1)} KB`
                : `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
            fileUrl: uploadEvent.target.result,
            isImage:
              file.type.startsWith('image/') ||
              /\.(png|jpe?g|webp|gif|svg)$/i.test(file.name)
          });
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(filePromises).then((newFiles) => {
      setAttachedFiles((prev) => [...prev, ...newFiles]);
      toast.success(`Attached ${files.length} file(s). Click "Upload Lab Report" to submit.`);
    });

    // Reset input so user can select more files if needed
    e.target.value = '';
  };

  const handleRemoveFile = (fileId) => {
    setAttachedFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  // Submit lab report(s)
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
      const staffIdentifier = `${staffSession?.staffId || user?.fullName || 'LAB-202'} (Lab Staff)`;
      const defaultSummary = resultsSummary.trim() || 'Diagnostic evaluation conducted under standardized laboratory protocols. Parameters within acceptable clinical variance.';

      if (attachedFiles.length > 0) {
        // Upload each attached file as a report record
        for (let i = 0; i < attachedFiles.length; i++) {
          const file = attachedFiles[i];
          const reportTitle =
            attachedFiles.length > 1
              ? `${testTitle.trim()} - ${file.name.replace(/\.[^/.]+$/, '')}`
              : testTitle.trim();

          const newReport = {
            patientId: selectedPatient.id,
            patientName: selectedPatient.name,
            testTitle: reportTitle,
            category: category || 'Hematology',
            orderedDoctor: orderedDoctor.trim() || 'Dr. Consultant',
            date,
            status,
            fileName: file.name,
            fileUrl: file.fileUrl || '',
            resultsSummary: defaultSummary,
            addedBy: staffIdentifier
          };

          await emrStore.addLabReport(newReport);
        }
        toast.success(`Uploaded ${attachedFiles.length} lab report file(s) for ${selectedPatient.name}!`);
      } else {
        // Text-only report without attached file
        const newReport = {
          patientId: selectedPatient.id,
          patientName: selectedPatient.name,
          testTitle: testTitle.trim(),
          category: category || 'Hematology',
          orderedDoctor: orderedDoctor.trim() || 'Dr. Consultant',
          date,
          status,
          fileName: '',
          fileUrl: '',
          resultsSummary: defaultSummary,
          addedBy: staffIdentifier
        };

        await emrStore.addLabReport(newReport);
        toast.success(`Lab Report "${testTitle}" uploaded for ${selectedPatient.name}!`);
      }

      // Reset form and attached files
      setTestTitle('');
      setCategory('Hematology');
      setOrderedDoctor('');
      setStatus('Completed');
      setResultsSummary('');
      setAttachedFiles([]);
      loadPatientReports();
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
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: '0 0 2px 0' }}>
            Laboratorian (Lab Staff) Workspace
          </h2>
          <p style={{ margin: 0, fontSize: '0.86rem', color: '#15803d' }}>
            Logged in as <strong>{user?.fullName || staffSession?.name || 'Lab Staff'}</strong> • Authorized to generate & upload diagnostic lab test reports.
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
          boxShadow: '0 4px 14px rgba(0, 0, 0, 0.03)',
          marginBottom: '28px'
        }}>
          {/* Header Row with Verify Button */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
            borderBottom: '1px solid #f1f5f9',
            paddingBottom: '16px',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FilePlus size={22} color="#16a34a" />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Upload Lab Report for {selectedPatient.name} ({selectedPatient.id})
              </h3>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {/* Button so Laboratorian can see and verify uploaded reports */}
              <button
                type="button"
                onClick={() => setShowVerifyModal(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '7px',
                  padding: '7px 14px',
                  backgroundColor: '#eff6ff',
                  border: '1.5px solid #bfdbfe',
                  borderRadius: '10px',
                  color: '#2563eb',
                  fontWeight: 700,
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                title="View and verify all reports uploaded for this patient"
              >
                <ShieldCheck size={16} />
                See & Verify Uploaded Reports ({patientReports.length})
              </button>

              <span style={{
                fontSize: '0.78rem',
                backgroundColor: '#f1f5f9',
                color: '#64748b',
                padding: '4px 10px',
                borderRadius: '8px',
                fontWeight: 600
              }}>
                Permission: Create Only
              </span>
            </div>
          </div>

          {/* Row 1: Test Title & Category */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '20px' }}>
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '8px', display: 'block' }}>
                Report / Test Title <span style={{ color: '#dc2626' }}>*</span>
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
                  <option value="Microbiology">Microbiology</option>
                  <option value="Immunology">Immunology</option>
                  <option value="Pathology">Pathology</option>
                  <option value="Radiology">Radiology</option>
                  <option value="General">General</option>
                </select>
                <ChevronDown size={18} color="#64748b" style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              </div>
            </div>
          </div>

          {/* Row 2: Doctor, Date & Status */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '20px' }}>
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
                  <option value="In Progress">In Progress</option>
                  <option value="Review">Requires Doctor Review</option>
                </select>
                <ChevronDown size={18} color="#64748b" style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              </div>
            </div>
          </div>

          {/* Row 3: Diagnostic Findings & Results Summary */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '8px', display: 'block' }}>
              Diagnostic Findings & Summary (Optional)
            </label>
            <textarea
              rows={3}
              value={resultsSummary}
              onChange={(e) => setResultsSummary(e.target.value)}
              placeholder="e.g. Hemoglobin: 14.5 g/dL, WBC: 7,200 /mcL, Platelets: 250,000 /mcL. Parameters within reference limits."
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '10px',
                border: '1.5px solid #cbd5e1',
                fontSize: '0.9rem',
                outline: 'none',
                backgroundColor: '#ffffff',
                resize: 'vertical',
                color: '#0f172a'
              }}
            />
          </div>

          {/* Row 4: Multiple Digital Files Attachment Box */}
          <div style={{
            border: '2px dashed #cbd5e1',
            borderRadius: '14px',
            padding: '24px 20px',
            textAlign: 'center',
            backgroundColor: '#f8fafc',
            marginBottom: '28px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
              <Upload size={28} color="#16a34a" />
            </div>

            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
              Attach PDF or Scan Image Reports (Multiple Files Allowed)
            </div>
            <div style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '16px' }}>
              Select one or multiple files at once (.PDF, .PNG, .JPG). Files will be uploaded after you click "Upload Lab Report".
            </div>

            <input
              type="file"
              id="lab-report-file"
              multiple
              onChange={handleFileUpload}
              accept=".pdf,.png,.jpg,.jpeg"
              style={{ display: 'none' }}
            />

            <label
              htmlFor="lab-report-file"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: '#ffffff',
                border: '1.5px solid #cbd5e1',
                borderRadius: '8px',
                padding: '9px 24px',
                fontSize: '0.88rem',
                fontWeight: 600,
                color: '#334155',
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
              }}
            >
              <Plus size={16} color="#16a34a" />
              {attachedFiles.length > 0 ? 'Choose More Files' : 'Choose Files'}
            </label>

            {/* Attached files list with Preview / Verify option */}
            {attachedFiles.length > 0 && (
              <div style={{
                marginTop: '18px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                maxWidth: '680px',
                margin: '18px auto 0 auto',
                textAlign: 'left'
              }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#16a34a', marginBottom: '2px' }}>
                  Ready to upload ({attachedFiles.length} file{attachedFiles.length > 1 ? 's' : ''}):
                </div>
                {attachedFiles.map((file, idx) => (
                  <div
                    key={file.id || idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: '#ffffff',
                      border: '1px solid #bbf7d0',
                      borderRadius: '8px',
                      padding: '8px 14px',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                      {file.isImage ? <ImageIcon size={18} color="#0284c7" /> : <FileText size={18} color="#0284c7" />}
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f172a' }}>{file.name}</span>
                        <span style={{ fontSize: '0.78rem', color: '#64748b', marginLeft: '8px' }}>({file.size})</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                      {/* Verify attached file before uploading */}
                      <button
                        type="button"
                        onClick={() => setVerifyingReport({
                          fileName: file.name,
                          testTitle: testTitle || file.name,
                          fileUrl: file.fileUrl,
                          orderedDoctor: orderedDoctor || 'Laboratory (Pre-upload verify)',
                          patientName: selectedPatient.name,
                          patientId: selectedPatient.id
                        })}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '5px 10px',
                          backgroundColor: '#eff6ff',
                          border: '1px solid #bfdbfe',
                          borderRadius: '6px',
                          color: '#2563eb',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                        title="Verify this file before uploading"
                      >
                        <Eye size={13} /> Verify File
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRemoveFile(file.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#dc2626',
                          cursor: 'pointer',
                          padding: '4px',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                        title="Remove file"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Row 5: Bottom Action Buttons */}
          <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
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
              <CheckCircle2 size={18} />
              {saving
                ? 'Uploading Report(s)...'
                : attachedFiles.length > 1
                ? `Upload All ${attachedFiles.length} Lab Reports`
                : 'Upload Lab Report'}
            </button>

            {/* Prominent Button to see and verify uploaded reports */}
            <button
              type="button"
              onClick={() => setShowVerifyModal(true)}
              style={{
                backgroundColor: '#eff6ff',
                color: '#1d4ed8',
                border: '1.5px solid #bfdbfe',
                padding: '12px 20px',
                borderRadius: '10px',
                fontSize: '0.9rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'background 0.2s'
              }}
              title="See and verify all reports uploaded for this patient"
            >
              <ShieldCheck size={18} color="#2563eb" />
              See & Verify Uploaded Reports ({patientReports.length})
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
          fontSize: '0.95rem',
          marginBottom: '28px'
        }}>
          Select a patient above to upload lab test reports.
        </div>
      )}

      {/* 5. Laboratorian Verification Drawer / Panel for Uploaded Reports */}
      {selectedPatient && patientReports.length > 0 && (
        <div style={{
          backgroundColor: '#ffffff',
          border: '1.5px solid #e2e8f0',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.02)'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
            borderBottom: '1px solid #f1f5f9',
            paddingBottom: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={20} color="#16a34a" />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Uploaded Lab Reports for {selectedPatient.name} ({patientReports.length})
              </h3>
            </div>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
              Laboratorian can inspect, open & verify uploaded documents below
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {patientReports.map((report) => (
              <div
                key={report.id}
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '16px 20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 800, fontSize: '0.98rem', color: '#0f172a' }}>
                      {report.testTitle}
                    </span>
                    <span style={{
                      fontSize: '0.76rem',
                      backgroundColor: '#f0fdf4',
                      color: '#16a34a',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '8px',
                      border: '1px solid #bbf7d0'
                    }}>
                      {report.category}
                    </span>
                    <span style={{
                      fontSize: '0.76rem',
                      backgroundColor: report.status === 'Completed' ? '#dcfce7' : '#fef9c3',
                      color: report.status === 'Completed' ? '#15803d' : '#854d0e',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '8px'
                    }}>
                      {report.status}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
                    Ordered by: <strong>{report.orderedDoctor}</strong> • Date: {report.date}
                  </div>

                  {report.fileName && (
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      fontSize: '0.78rem',
                      color: '#0369a1',
                      backgroundColor: '#e0f2fe',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      marginTop: '6px',
                      fontWeight: 600
                    }}>
                      <FileText size={13} color="#0284c7" />
                      Uploaded File: {report.fileName}
                    </div>
                  )}
                </div>

                {/* Verification Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setVerifyingReport(report)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 14px',
                      backgroundColor: '#eff6ff',
                      border: '1.5px solid #bfdbfe',
                      borderRadius: '8px',
                      color: '#2563eb',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      cursor: 'pointer'
                    }}
                    title="Open document to verify report details"
                  >
                    <Eye size={15} /> See & Verify Document
                  </button>

                  <button
                    type="button"
                    onClick={() => downloadLabReport(report)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 14px',
                      backgroundColor: '#f0fdf4',
                      border: '1.5px solid #bbf7d0',
                      borderRadius: '8px',
                      color: '#16a34a',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      cursor: 'pointer'
                    }}
                    title="Download uploaded document to verify file integrity"
                  >
                    <Download size={15} /> Download
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. Modal popup for 'See & Verify Uploaded Reports' */}
      {showVerifyModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.7)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9998,
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '800px',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            border: '1px solid #cbd5e1',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px 22px',
              backgroundColor: '#0f172a',
              color: '#ffffff'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <ShieldCheck size={22} color="#4ade80" />
                <div>
                  <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>
                    Laboratorian Verification Suite
                  </h4>
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                    Patient: {selectedPatient?.name} ({selectedPatient?.id})
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowVerifyModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '6px'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '20px', overflowY: 'auto', flex: 1, backgroundColor: '#f8fafc' }}>
              {patientReports.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
                  <FileText size={40} style={{ margin: '0 auto 12px auto', opacity: 0.5 }} />
                  <p style={{ margin: 0, fontWeight: 600 }}>No reports uploaded yet for this patient.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {patientReports.map((report) => (
                    <div
                      key={report.id}
                      style={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        padding: '16px 20px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '12px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.98rem', color: '#0f172a', marginBottom: '4px' }}>
                          {report.testTitle}
                        </div>
                        <div style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '6px' }}>
                          <span style={{ backgroundColor: '#f1f5f9', padding: '2px 8px', borderRadius: '6px', fontWeight: 600, color: '#475569', marginRight: '8px' }}>
                            {report.category}
                          </span>
                          Ordered by <strong>{report.orderedDoctor}</strong> • {report.date}
                        </div>
                        {report.fileName && (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#0369a1', backgroundColor: '#f0f9ff', border: '1px solid #bae6fd', padding: '2px 8px', borderRadius: '6px', fontWeight: 600 }}>
                            <FileText size={12} color="#0284c7" />
                            {report.fileName}
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => {
                            setVerifyingReport(report);
                          }}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 14px',
                            backgroundColor: '#eff6ff',
                            border: '1.5px solid #bfdbfe',
                            borderRadius: '8px',
                            color: '#2563eb',
                            fontWeight: 700,
                            fontSize: '0.82rem',
                            cursor: 'pointer'
                          }}
                          title="Open document to verify report details"
                        >
                          <Eye size={15} /> Verify Document
                        </button>

                        <button
                          type="button"
                          onClick={() => downloadLabReport(report)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 14px',
                            backgroundColor: '#f0fdf4',
                            border: '1.5px solid #bbf7d0',
                            borderRadius: '8px',
                            color: '#16a34a',
                            fontWeight: 700,
                            fontSize: '0.82rem',
                            cursor: 'pointer'
                          }}
                          title="Download document"
                        >
                          <Download size={15} /> Download
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '12px 20px', borderTop: '1px solid #e2e8f0', backgroundColor: '#ffffff', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowVerifyModal(false)}
                style={{
                  padding: '8px 18px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#f8fafc',
                  color: '#334155',
                  fontWeight: 700,
                  fontSize: '0.84rem',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Exact Document Verification Viewer Modal */}
      {verifyingReport && (
        <LabReportViewerModal
          report={verifyingReport}
          onClose={() => setVerifyingReport(null)}
        />
      )}
    </div>
  );
}
