import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { UserRole } from '../types';

interface GuardProps {
  children: React.ReactNode;
}

const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA] dark:bg-[#08090A]">
    <div className="h-8 w-8 rounded-full border-2 border-slate-200 dark:border-slate-800 border-t-emerald-500 animate-spin" />
  </div>
);

export const AuthGuard: React.FC<GuardProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuthStore();
  const location = useLocation();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    // Save current location for redirection after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

interface RoleGuardProps extends GuardProps {
  allowedRoles: UserRole[];
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ children, allowedRoles }) => {
  const { user, isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  const roleName = user.role?.name;
  if (!roleName || !allowedRoles.includes(roleName)) {
    // Redirect wrong role to their own dashboard
    const userRole = roleName || 'vendor';
    return <Navigate to={`/dashboard/${userRole}`} replace />;
  }

  return <>{children}</>;
};

export const PublicOnlyGuard: React.FC<GuardProps> = ({ children }) => {
  const { isAuthenticated, user, isLoading } = useAuthStore();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (isAuthenticated && user) {
    const userRole = user.role?.name || 'vendor';
    return <Navigate to={`/dashboard/${userRole}`} replace />;
  }

  return <>{children}</>;
};
