import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import EmrLayout from './components/layout/EmrLayout';
import EmrOverview from './pages/emr/EmrOverview';
import ConsultationNotes from './pages/emr/ConsultationNotes';
import LabReports from './pages/emr/LabReports';
import PharmacyPage from './pages/emr/PharmacyPage';
import ChannelingHistory from './pages/emr/ChannelingHistory';
import AdminPortal from './pages/admin/AdminPortal';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/emr/overview" replace />} />

      {/* EMR Patient Portal Routes */}
      <Route path="/emr" element={<EmrLayout />}>
        <Route path="overview" element={<EmrOverview />} />
        <Route path="consultation-notes" element={<ConsultationNotes />} />
        <Route path="lab-reports" element={<LabReports />} />
        <Route path="pharmacy" element={<PharmacyPage />} />
        <Route path="channeling-history" element={<ChannelingHistory />} />
        <Route path="notifications" element={
          <div style={{ padding: '12px' }}>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>Notifications Center</h1>
            <p style={{ color: '#64748b' }}>All patient alerts, lab updates, and prescription notifications will appear here.</p>
          </div>
        } />
        <Route path="profile" element={
          <div style={{ padding: '12px' }}>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>Patient Profile</h1>
            <p style={{ color: '#64748b' }}>Demographic details, emergency contacts and portal settings.</p>
          </div>
        } />
      </Route>

      {/* Hospital Staff & Admin Portal */}
      <Route path="/admin" element={<AdminPortal />} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/emr/overview" replace />} />
    </Routes>
  );
}
