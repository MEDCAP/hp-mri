import React from 'react';
import { Navigate } from 'react-router-dom';
import { useCurrentUser } from './useCurrentUser';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isSignedIn } = useCurrentUser();
  if (!isSignedIn) {
    return <Navigate to="/account" replace />;
  }
  return <>{children}</>;
};

export default ProtectedRoute;
