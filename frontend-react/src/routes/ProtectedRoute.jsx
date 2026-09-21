import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles }) => {
    const { user, loading } = useAuth();

    if (loading) {
        return <div>Loading...</div>;
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles) {
        const userRole = user.role?.toLowerCase();
        const normalizedAllowedRoles = allowedRoles.map(r => r.toLowerCase());

        if (!normalizedAllowedRoles.includes(userRole)) {
            return <Navigate to={`/${userRole}/dashboard`} replace />;
        }
    }

    return children;
};

export default ProtectedRoute;