import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import EmrLayout from './components/layout/EmrLayout';
import EmrOverview from './pages/emr/EmrOverview';
import ConsultationNotes from './pages/emr/ConsultationNotes';
import LabReports from './pages/emr/LabReports';
import PharmacyPage from './pages/emr/PharmacyPage';
import ChannelingHistory from './pages/emr/ChannelingHistory';
import ProfilePage from './pages/emr/ProfilePage';
import AdminPortal from './pages/admin/AdminPortal';
import AuthPage from './pages/auth/AuthPage';

// ── Simple auth guard: checks localStorage for a valid token
function RequireAuth({ children }) {
  const token = localStorage.getItem('hb_token');
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      {/* ── Public: Login / Signup */}
      <Route path="/login" element={<AuthPage />} />

      {/* ── Root → redirect based on auth state */}
      <Route
        path="/"
        element={
          localStorage.getItem('hb_token')
            ? <Navigate to="/emr/overview" replace />
            : <Navigate to="/login" replace />
        }
      />

      {/* ── Protected: EMR Patient Portal Routes */}
      <Route
        path="/emr"
        element={
          <RequireAuth>
            <EmrLayout />
          </RequireAuth>
        }
      >
        <Route path="overview"           element={<EmrOverview />} />
        <Route path="consultation-notes" element={<ConsultationNotes />} />
        <Route path="lab-reports"        element={<LabReports />} />
        <Route path="pharmacy"           element={<PharmacyPage />} />
        <Route path="channeling-history" element={<ChannelingHistory />} />
        <Route path="notifications" element={
          <div style={{ padding: '12px' }}>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>Notifications Center</h1>
            <p style={{ color: '#64748b' }}>All patient alerts, lab updates, and prescription notifications will appear here.</p>
          </div>
        } />
        <Route path="profile" element={<ProfilePage />} />
      </Route>

      {/* ── Hospital Staff & Admin Portal (no auth guard — admin manages its own auth) */}
      <Route path="/admin" element={<AdminPortal />} />

      {/* ── Fallback */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
