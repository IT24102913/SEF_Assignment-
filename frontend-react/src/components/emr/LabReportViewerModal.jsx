import React, { useMemo } from 'react';
import { X, Download, ExternalLink, FileText, Image as ImageIcon, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * Converts DataURL to Blob for reliable browser viewing and downloading
 */
export function dataUrlToBlob(dataUrl) {
  const parts = dataUrl.split(',');
  const mime = parts[0].match(/:(.*?);/)?.[1] || 'application/octet-stream';
  const binary = atob(parts[1]);
  const array = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    array[i] = binary.charCodeAt(i);
  }
  return new Blob([array], { type: mime });
}

/**
 * Directly downloads the exact PDF or photo uploaded by the laboratorian
 */
export function downloadLabReport(report) {
  if (!report) {
    toast.error('No report selected.');
    return;
  }

  // 1. If we have a Base64 DataURL
  if (report.fileUrl && report.fileUrl.startsWith('data:')) {
    try {
      const blob = dataUrlToBlob(report.fileUrl);
      const url = URL.createObjectURL(blob);
      const isImg = report.fileUrl.startsWith('data:image/');
      const fileName = report.fileName || (isImg ? 'LabReport.jpg' : 'LabReport.pdf');
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 15000);
      toast.success(`Downloaded: ${fileName}`);
      return;
    } catch (err) {
      console.error('Download blob error:', err);
    }
  }

  // 2. If we have a direct fileUrl (HTTP or Blob)
  if (report.fileUrl && !report.fileUrl.startsWith('data:')) {
    const a = document.createElement('a');
    a.href = report.fileUrl;
    a.download = report.fileName || 'LabReport.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success(`Downloaded: ${report.fileName || 'LabReport.pdf'}`);
    return;
  }

  // 3. Fallback to backend download endpoint if ID exists
  if (report.id) {
    const downloadUrl = `/api/emr/lab-reports/${report.id}/download`;
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = report.fileName || 'LabReport.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success(`Downloading ${report.fileName || 'LabReport'}...`);
    return;
  }

  toast.error('No attached PDF or photo found for this report.');
}

/**
 * Opens the exact PDF or photo in a new browser tab
 */
export function openLabReportInNewTab(report) {
  if (!report) return;

  if (report.fileUrl) {
    try {
      if (report.fileUrl.startsWith('data:')) {
        const blob = dataUrlToBlob(report.fileUrl);
        const url = URL.createObjectURL(blob);
        const win = window.open(url, '_blank');
        if (!win) {
          const a = document.createElement('a');
          a.href = url;
          a.target = '_blank';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }
        return;
      } else {
        window.open(report.fileUrl, '_blank');
        return;
      }
    } catch (err) {
      console.error('Open tab error:', err);
    }
  }

  if (report.id) {
    window.open(`/api/emr/lab-reports/${report.id}/view`, '_blank');
    return;
  }

  toast.error('No attached PDF or photo found for this report.');
}

/**
 * Clean, lightweight viewer modal: ONLY displays the actual PDF or Photo uploaded by the laboratorian.
 * No big forms or artificial tables.
 */
export default function LabReportViewerModal({ report, onClose }) {
  if (!report) return null;

  const effectiveUrl = useMemo(() => {
    if (report.fileUrl) {
      if (report.fileUrl.startsWith('data:')) {
        try {
          const blob = dataUrlToBlob(report.fileUrl);
          return URL.createObjectURL(blob);
        } catch (e) {
          console.error('Blob conversion error:', e);
          return report.fileUrl;
        }
      }
      return report.fileUrl;
    }
    if (report.id) {
      return `/api/emr/lab-reports/${report.id}/view`;
    }
    return null;
  }, [report.fileUrl, report.id]);

  const hasFile = Boolean(report.fileUrl || report.id);

  const isImage = (report.fileUrl && (
    report.fileUrl.startsWith('data:image/') ||
    /\.(png|jpe?g|webp|gif|svg)$/i.test(report.fileName || '')
  )) || /\.(png|jpe?g|webp|gif|svg)$/i.test(report.fileName || '');

  const isPdf = !isImage && ((report.fileUrl && (
    report.fileUrl.startsWith('data:application/pdf') ||
    /\.pdf$/i.test(report.fileName || '')
  )) || /\.pdf$/i.test(report.fileName || '') || (!isImage && Boolean(effectiveUrl)));

  const handleOpenExternal = () => {
    if (effectiveUrl) {
      window.open(effectiveUrl, '_blank');
    } else {
      openLabReportInNewTab(report);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(3px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '16px'
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '960px',
        height: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        border: '1px solid #cbd5e1',
        overflow: 'hidden'
      }}>
        {/* Simple Top Navigation Bar */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '14px 20px',
          backgroundColor: '#0f172a',
          color: '#ffffff'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
            {isImage ? (
              <ImageIcon size={20} color="#38bdf8" />
            ) : (
              <FileText size={20} color="#38bdf8" />
            )}
            <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                {report.fileName || report.testTitle}
              </span>
              <span style={{ fontSize: '0.78rem', color: '#94a3b8', marginLeft: '8px' }}>
                ({report.testTitle} • {report.orderedDoctor || 'Laboratory'})
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            {hasFile && (
              <>
                <button
                  onClick={handleOpenExternal}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '7px 12px',
                    borderRadius: '8px',
                    border: '1px solid #334155',
                    backgroundColor: '#1e293b',
                    color: '#e2e8f0',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                  title="Open file in new browser window"
                >
                  <ExternalLink size={14} /> Open in New Tab
                </button>

                <button
                  onClick={() => downloadLabReport(report)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '7px 14px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#10b981',
                    color: '#ffffff',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                  title="Download attached file"
                >
                  <Download size={14} /> Download
                </button>
              </>
            )}

            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center'
              }}
              title="Close viewer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Pure File Viewer Body - No Big Forms! */}
        <div style={{
          flex: 1,
          backgroundColor: '#f8fafc',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {!effectiveUrl ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
              <AlertCircle size={44} style={{ margin: '0 auto 12px auto', color: '#f59e0b' }} />
              <h4 style={{ margin: '0 0 6px 0', fontSize: '1.1rem', color: '#0f172a', fontWeight: 700 }}>
                No File Attached
              </h4>
              <p style={{ margin: 0, fontSize: '0.88rem', color: '#64748b' }}>
                The laboratorian did not attach a PDF or image file for this test.
              </p>
            </div>
          ) : isImage ? (
            <div style={{
              width: '100%',
              height: '100%',
              overflow: 'auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px'
            }}>
              <img
                src={effectiveUrl}
                alt={report.fileName || 'Diagnostic Photo'}
                style={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  objectFit: 'contain',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
                  borderRadius: '8px'
                }}
              />
            </div>
          ) : (
            // Native PDF viewer iframe
            <iframe
              src={effectiveUrl}
              title={report.fileName || 'Lab PDF Report'}
              style={{
                width: '100%',
                height: '100%',
                border: 'none'
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
