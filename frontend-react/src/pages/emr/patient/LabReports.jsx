import React, { useState, useEffect } from 'react';
import { emrApi } from '../../../api/emrApi';
import { emrStore } from '../../../data/mockEmrStore';
import { Microscope, Download, Eye, Clock, CheckCircle, Loader, FileText, Image as ImageIcon } from 'lucide-react';
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

      let data = [];
      try {
        data = await emrApi.getLabReports(patientCode);
      } catch (err) {
        console.warn('Backend lab-reports fetch failed, fallback to store:', err);
      }

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
            resultsSummary: s.resultsSummary
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
        resultsSummary: l.resultsSummary
      })));
    } catch (err) {
      console.error('Error fetching lab reports:', err);
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
          Lab Reports
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.92rem' }}>
          Your laboratory diagnostics, blood work, and imaging results. Open and download the exact PDF or photo attached by the laboratory.
        </p>
      </div>

      {loading ? (
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '48px', textAlign: 'center', color: '#64748b' }}>
          <Loader size={32} className="animate-spin" style={{ margin: '0 auto 12px auto', display: 'block', color: '#0d7c6b' }} />
          <p>Loading your lab diagnostic records...</p>
        </div>
      ) : reports.length === 0 ? (
        <div style={{ backgroundColor: '#ffffff', border: '2px dashed #cbd5e1', borderRadius: '16px', padding: '48px', textAlign: 'center', color: '#94a3b8' }}>
          <Microscope size={40} style={{ marginBottom: '12px', opacity: 0.4 }} />
          <p>No lab reports found. Reports will appear here once your tests are processed.</p>
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
                  border: '1px solid #e2e8f0',
                  borderRadius: '14px',
                  padding: '20px 24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  boxShadow: '0 2px 8px -2px rgba(0,0,0,0.04)',
                  transition: 'box-shadow 0.2s',
                  gap: '16px',
                  flexWrap: 'wrap'
                }}
              >
                {/* Left: Icon + Info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, minWidth: '280px' }}>
                  <div style={{ width: '46px', height: '46px', borderRadius: '12px', backgroundColor: '#f0fdf4', color: '#0d7c6b', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Microscope size={24} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#0f172a', marginBottom: '3px' }}>
                      {report.testTitle}
                    </div>
                    <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
                      <span style={{ backgroundColor: '#f1f5f9', padding: '2px 8px', borderRadius: '6px', fontWeight: 600, color: '#475569', marginRight: '8px' }}>
                        {report.category}
                      </span>
                      Ordered by <strong>{report.orderedDoctor}</strong> • {report.date}
                    </div>

                    {/* Attached file indicator */}
                    {report.fileName && (
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '0.78rem',
                        color: '#0369a1',
                        backgroundColor: '#f0f9ff',
                        border: '1px solid #bae6fd',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        marginTop: '6px',
                        fontWeight: 600
                      }}>
                        {isImage ? <ImageIcon size={13} color="#0284c7" /> : <FileText size={13} color="#0284c7" />}
                        {report.fileName}
                      </div>
                    )}

                    {report.resultsSummary && (
                      <div style={{ fontSize: '0.82rem', color: '#334155', marginTop: '6px', backgroundColor: '#f8fafc', padding: '6px 10px', borderRadius: '6px' }}>
                        {report.resultsSummary}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Status + View & Download Actions */}
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
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pure PDF & Photo Viewer Modal - No Big Form! */}
      {selectedReport && (
        <LabReportViewerModal
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
        />
      )}
    </div>
  );
}
