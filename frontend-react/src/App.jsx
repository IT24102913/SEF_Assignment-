import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Toaster } from 'react-hot-toast';
import Login from './pages/Login';
import ProtectedRoute from './routes/ProtectedRoute';
import AdminDashboard from './pages/admin/Dashboard';

// ✅ Import Pharmacy Dashboard
import PharmacyDashboard from './pages/admin/PharmacyDashboard';

// ✅ Import Pharmacy Modules
import Medicines from './pages/pharmacist/Medicines';
import Categories from './pages/pharmacist/Categories';
import Inventory from './pages/pharmacist/Inventory';
import Sales from './pages/pharmacist/Sales';
import AIForecast from './pages/pharmacist/AIForecast';

// ✅ Import Laboratory Modules
import AdminLabDashboard from './pages/laboratory/Dashboard';
import LabPendingApprovals from './pages/laboratory/PendingApprovals';
import LabAllBookings from './pages/laboratory/AllBookings';
import LabTestCatalogue from './pages/laboratory/TestCatalogue';
import LabUploadResults from './pages/laboratory/UploadResults';
import LabPendingTests from './pages/laboratory/PendingTests';

// Placeholder Dashboards
const PharmacistDashboard = () => <h2>Pharmacist Dashboard</h2>;
const DoctorDashboard = () => <h2>Doctor Dashboard</h2>;
const StaffDashboard = () => <h2>Staff Dashboard</h2>;

const RoleRedirect = () => {
    const { user } = useAuth();

    if (!user) return <Navigate to="/login" replace />;
    return <Navigate to={`/${user.role.toLowerCase()}/dashboard`} replace />;
};

function App() {
    return (
        <AuthProvider>
            <Toaster
                position="top-right"
                toastOptions={{
                    style: { background: '#fff', color: '#004D40', border: '1px solid #B2DFDB', fontFamily: 'inherit' },
                    success: { iconTheme: { primary: '#00897B', secondary: '#fff' } },
                    error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
                }}
            />
            <Router>
                <Routes>
                    {/* Public Route */}
                    <Route path="/login" element={<Login />} />
                    <Route path="/" element={<RoleRedirect />} />

                    {/* ============================================ */}
                    {/* ADMIN ROUTES */}
                    {/* ============================================ */}
                    <Route path="/admin/dashboard" element={
                        <ProtectedRoute allowedRoles={['Admin']}>
                            <AdminDashboard />
                        </ProtectedRoute>
                    } />

                    {/* ✅ Admin → Pharmacy Dashboard (5 Modules) */}
                    <Route path="/admin/pharmacy" element={
                        <ProtectedRoute allowedRoles={['Admin']}>
                            <PharmacyDashboard />
                        </ProtectedRoute>
                    } />

                    {/* ============================================ */}
                    {/* PHARMACY MODULE ROUTES (Admin + Pharmacist) */}
                    {/* ============================================ */}
                    <Route path="/pharmacist/medicines" element={
                        <ProtectedRoute allowedRoles={['Admin', 'Pharmacist']}>
                            <Medicines />
                        </ProtectedRoute>
                    } />

                    <Route path="/pharmacist/categories" element={
                        <ProtectedRoute allowedRoles={['Admin', 'Pharmacist']}>
                            <Categories />
                        </ProtectedRoute>
                    } />

                    <Route path="/pharmacist/inventory" element={
                        <ProtectedRoute allowedRoles={['Admin', 'Pharmacist']}>
                            <Inventory />
                        </ProtectedRoute>
                    } />

                    <Route path="/pharmacist/sales" element={
                        <ProtectedRoute allowedRoles={['Admin', 'Pharmacist']}>
                            <Sales />
                        </ProtectedRoute>
                    } />

                    <Route path="/pharmacist/ai-forecast" element={
                        <ProtectedRoute allowedRoles={['Admin', 'Pharmacist']}>
                            <AIForecast />
                        </ProtectedRoute>
                    } />

                    {/* ============================================ */}
                    {/* LABORATORY MODULE ROUTES */}
                    {/* ============================================ */}
                    <Route path="/laboratory/dashboard" element={
                        <ProtectedRoute allowedRoles={['Laboratory', 'Admin']}>
                            <AdminLabDashboard />
                        </ProtectedRoute>
                    } />
                    <Route path="/admin/lab" element={
                        <ProtectedRoute allowedRoles={['Laboratory', 'Admin']}>
                            <AdminLabDashboard />
                        </ProtectedRoute>
                    } />

                    {/* Lab sub-pages — also accessible via short paths used in Dashboard buttons */}
                    <Route path="/laboratory/pending" element={
                        <ProtectedRoute allowedRoles={['Laboratory', 'Admin']}>
                            <LabPendingApprovals />
                        </ProtectedRoute>
                    } />
                    <Route path="/pending" element={
                        <ProtectedRoute allowedRoles={['Laboratory', 'Admin']}>
                            <LabPendingApprovals />
                        </ProtectedRoute>
                    } />

                    <Route path="/laboratory/bookings" element={
                        <ProtectedRoute allowedRoles={['Laboratory', 'Admin']}>
                            <LabAllBookings />
                        </ProtectedRoute>
                    } />
                    <Route path="/bookings" element={
                        <ProtectedRoute allowedRoles={['Laboratory', 'Admin']}>
                            <LabAllBookings />
                        </ProtectedRoute>
                    } />

                    <Route path="/laboratory/tests" element={
                        <ProtectedRoute allowedRoles={['Laboratory', 'Admin']}>
                            <LabTestCatalogue />
                        </ProtectedRoute>
                    } />
                    <Route path="/tests" element={
                        <ProtectedRoute allowedRoles={['Laboratory', 'Admin']}>
                            <LabTestCatalogue />
                        </ProtectedRoute>
                    } />

                    <Route path="/laboratory/pending-tests" element={
                        <ProtectedRoute allowedRoles={['Laboratory', 'Admin']}>
                            <LabPendingTests />
                        </ProtectedRoute>
                    } />
                    <Route path="/pending-tests" element={
                        <ProtectedRoute allowedRoles={['Laboratory', 'Admin']}>
                            <LabPendingTests />
                        </ProtectedRoute>
                    } />

                    <Route path="/laboratory/results" element={
                        <ProtectedRoute allowedRoles={['Laboratory', 'Admin']}>
                            <LabPendingTests />
                        </ProtectedRoute>
                    } />
                    <Route path="/results" element={
                        <ProtectedRoute allowedRoles={['Laboratory', 'Admin']}>
                            <LabPendingTests />
                        </ProtectedRoute>
                    } />

                    {/* ============================================ */}
                    {/* OTHER ROLE DASHBOARDS */}
                    {/* ============================================ */}
                    <Route path="/pharmacist/dashboard" element={
                        <ProtectedRoute allowedRoles={['Pharmacist']}>
                            <PharmacistDashboard />
                        </ProtectedRoute>
                    } />

                    <Route path="/doctor/dashboard" element={
                        <ProtectedRoute allowedRoles={['Doctor']}>
                            <DoctorDashboard />
                        </ProtectedRoute>
                    } />

                    <Route path="/patient/dashboard" element={
                        <ProtectedRoute allowedRoles={['Patient']}>
                            <AdminLabDashboard />
                        </ProtectedRoute>
                    } />

                    <Route path="/staff/dashboard" element={
                        <ProtectedRoute allowedRoles={['Staff']}>
                            <StaffDashboard />
                        </ProtectedRoute>
                    } />
                </Routes>
            </Router>
        </AuthProvider>
    );
}

export default App;