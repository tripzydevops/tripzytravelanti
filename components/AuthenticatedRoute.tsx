import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface AuthenticatedRouteProps {
  children: React.ReactElement;
}

const AuthenticatedRoute: React.FC<AuthenticatedRouteProps> = ({ children }) => {
  const { user } = useAuth();

  if (!user) {
    // User not authenticated, redirect to login page
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default AuthenticatedRoute;
