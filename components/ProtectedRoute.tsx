import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactElement;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user } = useAuth();

  if (!user || !user.isAdmin) {
    // User not authenticated or not an admin, redirect to home page
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
