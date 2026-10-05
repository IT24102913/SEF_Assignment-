import React, { useState, useEffect } from 'react';
import { emrApi } from '../../../api/emrApi';
import { emrStore } from '../../../data/mockEmrStore';
import { Microscope, Download, Eye, Clock, CheckCircle, Loader, FileText, Image as ImageIcon, Plus, Trash2, X, Upload } from 'lucide-react';
import LabReportViewerModal, { downloadLabReport } from '../../../components/emr/LabReportViewerModal';

const statusConfig = {
  'Completed': { bg: '#dcfce7', color: '#15803d', icon: CheckCircle },
  'Pending':   { bg: '#fff7ed', color: '#c2410c', icon: Clock },
  'In Progress': { bg: '#eff6ff', color: '#1d4ed8', icon: Loader },
};

export default function LabReports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showInfo, setShowInfo] = useState(false);
  const [currentPatientCode, setCurrentPatientCode] = useState('');

  // Modal State for adding own lab report
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [addForm, setAddForm] = useState({
    testTitle: '',
    category: 'Blood Test',
    orderedDoctor: 'Self Uploaded',
    date: new Date().toISOString().split('T')[0],
    status: 'Completed',
    resultsSummary: '',
    fileName: '',
    fileUrl: ''
  });

  useEffect(() => {
    fetchLabReports();
  }, []);

  const fetchLabReports = async () => {
    setLoading(true);
    try {
      let patientCode = '';
      try {
        const myPatient = await emrApi.getMyPatient();
        if (myPatient && myPatient.patientCode) {
          patientCode = myPatient.patientCode;
        }
      } catch (e) {
        const rawUser = sessionStorage.getItem('user') || localStorage.getItem('hb_user') || localStorage.getItem('user');
        if (rawUser) {
          try {
            const u = JSON.parse(rawUser);
            patientCode = u.patientCode || u.patientId || '';
          } catch {}
        }
      }

      setCurrentPatientCode(patientCode);

      let data = [];
      try {
        data = await emrApi.getLabReports(patientCode);
      } catch (err) {
        console.warn('Backend lab-reports fetch failed, fallback to store:', err);
      }

      const cleanSummary = (s) => {
        if (!s) return '';
        if (typeof s === 'string' && s.includes('Diagnostic evaluation conducted')) return '';
        return s;
      };

      // If backend returned empty or failed, fallback to store
      if (!Array.isArray(data) || data.length === 0) {
        const storeLabs = emrStore.getLabReports(patientCode) || [];
        if (storeLabs.length > 0) {
          data = storeLabs.map(s => ({
            id: s.id,
            testTitle: s.testTitle,
            category: s.category,
            orderedDoctor: s.orderedDoctor,
            reportDate: s.date,
            status: s.status,
            fileName: s.fileName,
            fileUrl: s.fileUrl,
            resultsSummary: cleanSummary(s.resultsSummary)
          }));
        }
      }

      setReports((data || []).map(l => ({
        id: l.id,
        testTitle: l.testTitle,
        category: l.category,
        orderedDoctor: l.orderedDoctor,
        date: l.reportDate ? (typeof l.reportDate === 'string' ? l.reportDate.split('T')[0] : l.reportDate) : (l.date || ''),
        status: l.status,
        fileName: l.fileName || '',
        fileUrl: l.fileUrl || '',
        resultsSummary: cleanSummary(l.resultsSummary)
      })));
    } catch (err) {
      console.error('Error fetching lab reports:', err);
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setAddForm(prev => ({
        ...prev,
        fileName: file.name,
        fileUrl: reader.result
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!addForm.testTitle.trim()) {
      alert('Please enter a test title.');
      return;
    }
    setSubmitting(true);
    try {
      const code = currentPatientCode || 'PAT-1004';
      const payload = {
        patientCode: code,
        testTitle: addForm.testTitle.trim(),
        category: addForm.category,
        orderedDoctor: addForm.orderedDoctor.trim() || 'Self Uploaded',
        reportDate: addForm.date ? new Date(addForm.date).toISOString() : new Date().toISOString(),
        status: addForm.status || 'Completed',
        fileName: addForm.fileName || '',
        fileUrl: addForm.fileUrl || '',
        resultsSummary: addForm.resultsSummary || ''
      };

      let newReport = null;
      try {
        newReport = await emrApi.createLabReport(payload);
      } catch (apiErr) {
        console.warn('Backend createLabReport failed, creating locally:', apiErr);
      }

      if (!newReport || !newReport.id) {
        newReport = {
          id: `lab-${Date.now()}`,
          patientCode: payload.patientCode,
          testTitle: payload.testTitle,
          category: payload.category,
          orderedDoctor: payload.orderedDoctor,
          date: addForm.date,
          status: payload.status,
          fileName: payload.fileName,
          fileUrl: payload.fileUrl,
          resultsSummary: payload.resultsSummary
        };
        emrStore.addLabReport(newReport);
      } else {
        newReport.date = addForm.date;
      }

      setReports(prev => [newReport, ...prev]);
      setIsAddModalOpen(false);
      setAddForm({
        testTitle: '',
        category: 'Blood Test',
        orderedDoctor: 'Self Uploaded',
        date: new Date().toISOString().split('T')[0],
        status: 'Completed',
        resultsSummary: '',
        fileName: '',
        fileUrl: ''
      });
    } catch (err) {
      console.error('Error adding lab report:', err);
      alert('Could not save lab report. Please check details.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteReport = async (reportId) => {
    if (!window.confirm('Are you sure you want to remove this lab report?')) {
      return;
    }
    try {
      try {
        await emrApi.deleteLabReport(reportId);
      } catch (err) {
        console.warn('Backend deleteLabReport failed, removing locally:', err);
      }
      try {
        emrStore.deleteLabReport(reportId);
      } catch {}
      setReports(prev => prev.filter(r => r.id !== reportId));
    } catch (err) {
      console.error('Error deleting lab report:', err);
      alert('Could not remove the lab report.');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#0f172a', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>Lab Reports</span>
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
              Your laboratory diagnostics, blood work, and imaging results. Open and download the exact PDF or photo attached by the laboratory.
            </p>
          )}
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#0d7c6b',
            color: '#ffffff',
            border: 'none',
            borderRadius: '10px',
            padding: '10px 18px',
            fontSize: '0.9rem',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(13, 124, 107, 0.25)',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#095e51'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0d7c6b'}
        >
          <Plus size={18} />
          <span>Upload Lab Report</span>
        </button>
      </div>

      {loading ? (
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '48px', textAlign: 'center', color: '#64748b' }}>
          <Loader size={32} className="animate-spin" style={{ margin: '0 auto 12px auto', display: 'block', color: '#0d7c6b' }} />
          <p>Loading your lab diagnostic records...</p>
        </div>
      ) : reports.length === 0 ? (
        <div style={{ backgroundColor: '#ffffff', border: '2px dashed #cbd5e1', borderRadius: '16px', padding: '48px', textAlign: 'center', color: '#94a3b8' }}>
          <Microscope size={40} style={{ marginBottom: '12px', opacity: 0.4 }} />
          <p>No lab reports found. Upload your test reports or wait until laboratory staff attaches them.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {reports.map((report) => {
            const cfg = statusConfig[report.status] || statusConfig['Pending'];
            const StatusIcon = cfg.icon;
            const hasAttachedFile = Boolean(report.fileUrl || report.id);
            const isImage = report.fileUrl && (
              report.fileUrl.startsWith('data:image/') ||
              /\.(png|jpe?g|webp|gif|svg)$/i.test(report.fileName || '')
            );

            return (
              <div
                key={report.id}
                style={{
                  backgroundColor: '#ffffff',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: '16px',
                  padding: '22px 26px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  boxShadow: '0 4px 16px -2px rgba(15, 23, 42, 0.08), 0 2px 4px -1px rgba(15, 23, 42, 0.04)',
                  transition: 'all 0.2s ease-in-out',
                  gap: '18px',
                  flexWrap: 'wrap'
                }}
              >
                {/* Left: Icon + Info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, minWidth: '280px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#ecfdf5', color: '#095e51', border: '1.5px solid #a7f3d0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Microscope size={24} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '1.15rem', color: '#0f172a', marginBottom: '4px', letterSpacing: '-0.01em' }}>
                      {report.testTitle}
                    </div>
                    <div style={{ fontSize: '0.84rem', color: '#475569' }}>
                      <span style={{ backgroundColor: '#e2e8f0', border: '1px solid #cbd5e1', padding: '3px 10px', borderRadius: '6px', fontWeight: 700, color: '#0f172a', marginRight: '10px' }}>
                        {report.category}
                      </span>
                      Ordered by <strong style={{ color: '#0f172a' }}>{report.orderedDoctor}</strong> • {report.date}
                      {report.orderedDoctor === 'HealthBridge Diagnostic Labs' && (
                        <span style={{
                          backgroundColor: '#ecfdf5',
                          border: '1px solid #a7f3d0',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontWeight: 700,
                          color: '#047857',
                          fontSize: '0.75rem',
                          marginLeft: '8px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px'
                        }}>
                          🔬 Lab Management Sync
                        </span>
                      )}
                    </div>

                    {/* Attached file indicator */}
                    {report.fileName && (
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '0.8rem',
                        color: '#0369a1',
                        backgroundColor: '#f0f9ff',
                        border: '1.5px solid #bae6fd',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        marginTop: '8px',
                        fontWeight: 700
                      }}>
                        {isImage ? <ImageIcon size={14} color="#0284c7" /> : <FileText size={14} color="#0284c7" />}
                        {report.fileName}
                      </div>
                    )}

                    {report.resultsSummary && !report.resultsSummary.includes('Diagnostic evaluation conducted') && (
                      <div style={{ fontSize: '0.88rem', color: '#0f172a', fontWeight: 600, marginTop: '8px', backgroundColor: '#f8fafc', border: '1.5px solid #cbd5e1', borderLeft: '4px solid #0d7c6b', padding: '8px 12px', borderRadius: '8px' }}>
                        {report.resultsSummary}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Status + View, Download & Delete Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    backgroundColor: cfg.bg,
                    color: cfg.color,
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    padding: '5px 14px',
                    borderRadius: '20px'
                  }}>
                    <StatusIcon size={14} />
                    {report.status}
                  </div>

                  {hasAttachedFile ? (
                    <>
                      <button
                        onClick={() => setSelectedReport(report)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '8px 14px',
                          backgroundColor: '#eff6ff',
                          border: '1px solid #bfdbfe',
                          borderRadius: '10px',
                          color: '#2563eb',
                          cursor: 'pointer',
                          fontSize: '0.84rem',
                          fontWeight: 700,
                          transition: 'all 0.2s'
                        }}
                        title="Open attached PDF or photo"
                      >
                        <Eye size={15} />
                        Open
                      </button>

                      <button
                        onClick={() => downloadLabReport(report)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '8px 14px',
                          backgroundColor: '#f0fdf4',
                          border: '1px solid #bbf7d0',
                          borderRadius: '10px',
                          color: '#16a34a',
                          cursor: 'pointer',
                          fontSize: '0.84rem',
                          fontWeight: 700,
                          transition: 'all 0.2s'
                        }}
                        title="Download exact attached PDF or photo"
                      >
                        <Download size={15} />
                        Download
                      </button>
                    </>
                  ) : (
                    <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontStyle: 'italic', padding: '6px 10px' }}>
                      No file attached
                    </span>
                  )}

                  <button
                    onClick={() => handleDeleteReport(report.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 12px',
                      backgroundColor: '#fef2f2',
                      border: '1px solid #fecaca',
                      borderRadius: '10px',
                      color: '#dc2626',
                      cursor: 'pointer',
                      fontSize: '0.84rem',
                      fontWeight: 700,
                      transition: 'all 0.2s'
                    }}
                    title="Remove this lab report"
                  >
                    <Trash2 size={15} />
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pure PDF & Photo Viewer Modal */}
      {selectedReport && (
        <LabReportViewerModal
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
        />
      )}

      {/* Add / Upload Lab Report Modal */}
      {isAddModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '18px',
            width: '100%',
            maxWidth: '520px',
            boxShadow: '0 20px 40px -10px rgba(0,0,0,0.25)',
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
            animation: 'fadeIn 0.2s ease-out'
          }}>
            <div style={{
              padding: '18px 24px',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#f8fafc'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#e6f5f2', color: '#095e51', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Microscope size={20} />
                </div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>
                  Upload Lab Report
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Test Title / Investigation *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Full Blood Count (FBC) or Lipid Profile"
                  value={addForm.testTitle}
                  onChange={(e) => setAddForm(prev => ({ ...prev, testTitle: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.9rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Category
                  </label>
                  <select
                    value={addForm.category}
                    onChange={(e) => setAddForm(prev => ({ ...prev, category: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '0.9rem',
                      outline: 'none',
                      backgroundColor: '#ffffff',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="Blood Test">Blood Test</option>
                    <option value="Biochemistry">Biochemistry</option>
                    <option value="Imaging">Imaging / X-Ray</option>
                    <option value="Pathology">Pathology</option>
                    <option value="Urine Analysis">Urine Analysis</option>
                    <option value="Cardiology">Cardiology (ECG/Echo)</option>
                    <option value="General Diagnostics">General Diagnostics</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                    Report Date
                  </label>
                  <input
                    type="date"
                    value={addForm.date}
                    onChange={(e) => setAddForm(prev => ({ ...prev, date: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '0.9rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Ordered Doctor / Laboratory Facility
                </label>
                <input
                  type="text"
                  placeholder="e.g. Dr. Silva or Nawaloka Laboratory"
                  value={addForm.orderedDoctor}
                  onChange={(e) => setAddForm(prev => ({ ...prev, orderedDoctor: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.9rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Key Findings & Clinical Summary
                </label>
                <textarea
                  rows={2}
                  placeholder="Key observations or summary from report results"
                  value={addForm.resultsSummary}
                  onChange={(e) => setAddForm(prev => ({ ...prev, resultsSummary: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.9rem',
                    outline: 'none',
                    resize: 'vertical',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Attach Report File (PDF or Image)
                </label>
                <input
                  type="file"
                  accept="application/pdf,image/*"
                  onChange={handleFileChange}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '8px',
                    border: '1.5px dashed #cbd5e1',
                    backgroundColor: '#f8fafc',
                    fontSize: '0.85rem',
                    boxSizing: 'border-box'
                  }}
                />
                {addForm.fileName && (
                  <div style={{ marginTop: '6px', fontSize: '0.8rem', color: '#0d7c6b', fontWeight: 600 }}>
                    Selected file: {addForm.fileName}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  style={{
                    padding: '10px 18px',
                    backgroundColor: '#f1f5f9',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 600,
                    color: '#475569',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '10px 22px',
                    backgroundColor: '#0d7c6b',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    opacity: submitting ? 0.7 : 1
                  }}
                >
                  {submitting && <Loader size={16} className="animate-spin" />}
                  <span>{submitting ? 'Saving...' : 'Add to EMR'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
