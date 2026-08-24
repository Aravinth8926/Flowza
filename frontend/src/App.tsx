import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { useAuthStore } from './store/auth';
import { useThemeStore } from './store/theme';
import { AuthGuard, RoleGuard, PublicOnlyGuard } from './routes/guards';
import { Landing } from './pages/public/Landing';
import { About } from './pages/public/About';
import { Login } from './pages/public/Login';
import { Register } from './pages/public/Register';
import { VendorDashboard } from './pages/dashboard/VendorDashboard';
import { SupplierDashboard } from './pages/dashboard/SupplierDashboard';
import { AdminDashboard } from './pages/dashboard/AdminDashboard';
import { NewOrderRequest } from './pages/vendor/NewOrderRequest';
import { VendorOrders } from './pages/vendor/VendorOrders';
import { IncomingOrders } from './pages/supplier/IncomingOrders';
import { SupplierProducts } from './pages/supplier/SupplierProducts';
import { VendorCatalog } from './pages/vendor/VendorCatalog';
import VendorCart from './pages/vendor/VendorCart';
import InventoryManagement from './pages/supplier/InventoryManagement';
import { Profile } from './pages/Profile';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { ShieldAlert, Home, RefreshCw } from 'lucide-react';
import { Button } from './components/ui/Button';

// TanStack Query Client
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Custom 404 Page
const NotFoundPage: React.FC = () => (
  <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 text-center">
    <div className="h-16 w-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-primary mb-6">
      <ShieldAlert size={32} />
    </div>
    <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2">404 - Page Not Found</h1>
    <p className="text-slate-500 dark:text-slate-400 max-w-sm mb-6">
      The page you are looking for does not exist or has been relocated.
    </p>
    <Link to="/">
      <Button className="flex items-center gap-2">
        <Home size={16} />
        Go Home
      </Button>
    </Link>
  </div>
);

// Custom 403 Page
const UnauthorizedPage: React.FC = () => {
  const { user } = useAuthStore();
  const getDashboardPath = () => {
    if (!user) return '/login';
    return `/dashboard/${user.role?.name || 'vendor'}`;
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 text-center">
      <div className="h-16 w-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center text-red-500 mb-6">
        <ShieldAlert size={32} />
      </div>
      <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2">403 - Access Denied</h1>
      <p className="text-slate-500 dark:text-slate-400 max-w-sm mb-6">
        You do not have the required permissions to view this dashboard workspace.
      </p>
      <Link to={getDashboardPath()}>
        <Button className="flex items-center gap-2">
          <Home size={16} />
          Back to Dashboard
        </Button>
      </Link>
    </div>
  );
};

// Global Error Boundary Fallback component
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('ErrorBoundary caught an error', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 text-center">
          <div className="h-16 w-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center text-red-500 mb-6">
            <RefreshCw size={32} className="animate-spin" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2">Something went wrong</h1>
          <p className="text-slate-500 dark:text-slate-400 max-w-sm mb-6">
            An unexpected error occurred in the client application.
          </p>
          <Button onClick={() => window.location.reload()} className="flex items-center gap-2">
            Reload Application
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

export const App: React.FC = () => {
  const { initializeAuth } = useAuthStore();
  const { initialize: initializeTheme } = useThemeStore();

  useEffect(() => {
    initializeTheme();
    initializeAuth();
  }, [initializeTheme, initializeAuth]);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Landing />} />
            <Route path="/about" element={<About />} />

            {/* Auth Routes (Only access when NOT logged in) */}
            <Route
              path="/login"
              element={
                <PublicOnlyGuard>
                  <Login />
                </PublicOnlyGuard>
              }
            />
            <Route
              path="/register"
              element={
                <PublicOnlyGuard>
                  <Register />
                </PublicOnlyGuard>
              }
            />

            {/* Protected Workspace Layout */}
            <Route
              element={
                <AuthGuard>
                  <DashboardLayout />
                </AuthGuard>
              }
            >
              {/* Vendor Protected Routes */}
              <Route
                path="/dashboard/vendor"
                element={
                  <RoleGuard allowedRoles={['vendor']}>
                    <VendorDashboard />
                  </RoleGuard>
                }
              />
              <Route
                path="/dashboard/vendor/orders/new"
                element={
                  <RoleGuard allowedRoles={['vendor']}>
                    <NewOrderRequest />
                  </RoleGuard>
                }
              />
              <Route
                path="/dashboard/vendor/orders"
                element={
                  <RoleGuard allowedRoles={['vendor']}>
                    <VendorOrders />
                  </RoleGuard>
                }
              />
              <Route
                path="/dashboard/vendor/products"
                element={
                  <RoleGuard allowedRoles={['vendor']}>
                    <VendorCatalog />
                  </RoleGuard>
                }
              />
              <Route
                path="/dashboard/vendor/cart"
                element={
                  <RoleGuard allowedRoles={['vendor']}>
                    <VendorCart />
                  </RoleGuard>
                }
              />

              {/* Supplier Protected Routes */}
              <Route
                path="/dashboard/supplier"
                element={
                  <RoleGuard allowedRoles={['supplier']}>
                    <SupplierDashboard />
                  </RoleGuard>
                }
              />
              <Route
                path="/dashboard/supplier/orders/incoming"
                element={
                  <RoleGuard allowedRoles={['supplier']}>
                    <IncomingOrders />
                  </RoleGuard>
                }
              />
              <Route
                path="/dashboard/supplier/products"
                element={
                  <RoleGuard allowedRoles={['supplier']}>
                    <SupplierProducts />
                  </RoleGuard>
                }
              />
              <Route
                path="/dashboard/supplier/inventory"
                element={
                  <RoleGuard allowedRoles={['supplier']}>
                    <InventoryManagement />
                  </RoleGuard>
                }
              />

              {/* Admin Routes */}
              <Route
                path="/dashboard/admin"
                element={
                  <RoleGuard allowedRoles={['admin']}>
                    <AdminDashboard />
                  </RoleGuard>
                }
              />

              {/* Shared Protected Profile / Settings */}
              <Route path="/profile" element={<Profile />} />
              <Route path="/settings" element={<Profile />} />
            </Route>

            {/* Error Pages */}
            <Route path="/unauthorized" element={<UnauthorizedPage />} />
            <Route path="/403" element={<UnauthorizedPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </BrowserRouter>
        <Toaster position="top-right" richColors closeButton />
      </QueryClientProvider>
    </ErrorBoundary>
  );
};
