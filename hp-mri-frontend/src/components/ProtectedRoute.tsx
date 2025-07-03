import React from 'react';
import { Navigate } from 'react-router-dom';
import { isAuthenticated } from '../pages/loginpages/cognitoUtils';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  if (!isAuthenticated()) {
    return <Navigate to="/account" replace />;
  }
  return <>{children}</>;
};

export default ProtectedRoute; 