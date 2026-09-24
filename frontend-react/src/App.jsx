import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Toaster } from 'react-hot-toast';
import Login from './pages/Login';
import ProtectedRoute from './routes/ProtectedRoute';
import AdminDashboard from './pages/admin/Dashboard';
import PatientDashboard from './pages/patient/Dashboard';

// ✅ Import Hospital Admin
import Patients from './pages/admin/Patients';
import StaffManagement from './pages/admin/StaffManagement';

// ✅ Import Pharmacy Module (Staff & Patient)
import PharmacyDashboard from './pages/pharmacy/staff/PharmacyDashboard';
import Medicines from './pages/pharmacy/staff/Medicines';
import Categories from './pages/pharmacy/staff/Categories';
import Inventory from './pages/pharmacy/staff/Inventory';
import Sales from './pages/pharmacy/staff/Sales';
import AIForecast from './pages/pharmacy/staff/AIForecast';
import Orders from './pages/pharmacy/staff/Orders';
import CustomerPharmacyStore from './pages/pharmacy/patient/CustomerPharmacyStore';

// ✅ Import Doctor Appointments & Channeling Module
import DoctorAppointmentsAdmin from './pages/appointments/staff/DoctorAppointmentsAdmin';
import DoctorDashboard from './pages/appointments/staff/DoctorDashboard';

// ✅ Import Laboratory Modules
import AdminLabDashboard from './pages/lab/staff/Dashboard';
import LabPendingApprovals from './pages/lab/staff/PendingApprovals';
import LabAllBookings from './pages/lab/staff/AllBookings';
import LabTestCatalogue from './pages/lab/staff/TestCatalogue';
import LabUploadResults from './pages/lab/staff/UploadResults';
import LabPendingTests from './pages/lab/staff/PendingTests';
import CustomerLabHub from './pages/lab/patient/CustomerLabHub';

// Placeholder Dashboards
const StaffDashboard = () => <h2>Staff Dashboard</h2>;

// ✅ Import EMR (Electronic Medical Records) Module
import EmrLayout from './components/layout/EmrLayout';
import EmrOverview from './pages/emr/patient/EmrOverview';
import ConsultationNotes from './pages/emr/patient/ConsultationNotes';
import LabReports from './pages/emr/patient/LabReports';
import Prescriptions from './pages/emr/patient/Prescriptions';
import ChannelingHistory from './pages/emr/patient/ChannelingHistory';
import HealthPassport from './pages/emr/patient/HealthPassport';
import EmrStaffPortal from './pages/emr/staff/StaffPortal';
import NotificationsCenter from './pages/emr/NotificationsCenter';

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

                    {/* ✅ Admin → Registered Customers / Patients Directory */}
                    <Route path="/admin/patients" element={
                        <ProtectedRoute allowedRoles={['Admin']}>
                            <Patients />
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

                    <Route path="/pharmacist/orders" element={
                        <ProtectedRoute allowedRoles={['Admin', 'Pharmacist']}>
                            <Orders />
                        </ProtectedRoute>
                    } />

                    <Route path="/pharmacist/appointments" element={
                        <ProtectedRoute allowedRoles={['Admin', 'Pharmacist']}>
                            <DoctorAppointmentsAdmin />
                        </ProtectedRoute>
                    } />

                    <Route path="/admin/appointments" element={
                        <ProtectedRoute allowedRoles={['Admin', 'Pharmacist']}>
                            <DoctorAppointmentsAdmin />
                        </ProtectedRoute>
                    } />

                    <Route path="/admin/doctor" element={
                        <ProtectedRoute allowedRoles={['Admin', 'Pharmacist']}>
                            <DoctorAppointmentsAdmin />
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

                    {/* Patient Laboratory Hub */}
                    <Route path="/lab/hub" element={
                        <ProtectedRoute allowedRoles={['Patient', 'Admin']}>
                            <CustomerLabHub />
                        </ProtectedRoute>
                    } />
                    <Route path="/laboratory/hub" element={
                        <ProtectedRoute allowedRoles={['Patient', 'Admin']}>
                            <CustomerLabHub />
                        </ProtectedRoute>
                    } />

                    {/* ============================================ */}
                    {/* OTHER ROLE DASHBOARDS */}
                    {/* ============================================ */}
                    <Route path="/pharmacist/dashboard" element={
                        <ProtectedRoute allowedRoles={['Pharmacist', 'Admin']}>
                            <PharmacyDashboard />
                        </ProtectedRoute>
                    } />
                    <Route path="/pharmacy/dashboard" element={
                        <ProtectedRoute allowedRoles={['Pharmacist', 'Admin']}>
                            <PharmacyDashboard />
                        </ProtectedRoute>
                    } />
                    <Route path="/pharmacy/store" element={
                        <ProtectedRoute allowedRoles={['Patient', 'Admin']}>
                            <CustomerPharmacyStore />
                        </ProtectedRoute>
                    } />

                    <Route path="/doctor/dashboard" element={
                        <ProtectedRoute allowedRoles={['Doctor', 'Admin']}>
                            <DoctorDashboard />
                        </ProtectedRoute>
                    } />

                    <Route path="/patient/dashboard" element={
                        <ProtectedRoute allowedRoles={['Patient']}>
                            <PatientDashboard />
                        </ProtectedRoute>
                    } />

                    {/* ============================================ */}
                    {/* EMR (ELECTRONIC MEDICAL RECORDS) MODULE */}
                    {/* ============================================ */}
                    <Route path="/emr" element={
                        <ProtectedRoute allowedRoles={['Patient', 'Admin', 'Doctor']}>
                            <EmrLayout />
                        </ProtectedRoute>
                    }>
                        <Route index element={<Navigate to="/emr/overview" replace />} />
                        <Route path="overview" element={<EmrOverview />} />
                        <Route path="consultation-notes" element={<ConsultationNotes />} />
                        <Route path="lab-reports" element={<LabReports />} />
                        <Route path="pharmacy" element={<Prescriptions />} />
                        <Route path="channeling-history" element={<ChannelingHistory />} />
                        <Route path="profile" element={<HealthPassport />} />
                        <Route path="notifications" element={<NotificationsCenter />} />
                    </Route>
                    <Route path="/emr/staff" element={<EmrStaffPortal />} />
                    <Route path="/emr/admin" element={<EmrStaffPortal />} />
                    <Route path="/admin/records" element={<Navigate to="/emr/admin" replace />} />
                    <Route path="/admin/staff" element={
                        <ProtectedRoute allowedRoles={['Admin']}>
                            <StaffManagement />
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