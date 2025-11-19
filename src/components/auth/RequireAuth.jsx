import React from 'react';
import { Navigate } from 'react-router-dom';

export default function RequireAuth({ children, role }) {
  const token = localStorage.getItem('mv_token');
  const userRole = localStorage.getItem('mv_role');
  
  // No token - redirect to login
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  
  // Wrong role - redirect to appropriate dashboard
  if (role && userRole !== role) {
    // Redirect based on actual user role instead of showing error
    if (userRole === 'patient') {
      return <Navigate to="/patient-dashboard" replace />;
    } else if (userRole === 'doctor') {
      return <Navigate to="/doctor-dashboard" replace />;
    } else if (userRole === 'admin') {
      return <Navigate to="/admin-dashboard" replace />;
    }
    // If role not recognized, go to login
    return <Navigate to="/login" replace />;
  }
  
  return children;
}