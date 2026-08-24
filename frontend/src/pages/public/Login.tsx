import React, { useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../store/auth';
import { useThemeStore } from '../../store/theme';
import { Button } from '../../components/ui/Button';
import { FormInput } from '../../components/forms/FormComponents';
import { Checkbox } from '../../components/ui/Checkbox';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { toast } from 'sonner';
import { ArrowLeft, Lock, ShieldCheck, AlertCircle, Sun, Moon } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  remember_me: z.boolean().default(false),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuthStore();
  const { resolvedTheme, setTheme } = useThemeStore();
  const [loading, setLoading] = useState(false);
  const [backendOffline, setBackendOffline] = useState(false);

  const methods = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      remember_me: false,
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setLoading(true);
    setBackendOffline(false);
    try {
      await login({
        email: values.email,
        password: values.password,
        remember_me: values.remember_me,
      });

      toast.success('Welcome back! Redirecting to operational dashboard...');

      const from = (location.state as any)?.from?.pathname;
      const user = useAuthStore.getState().user;
      const roleName = user?.role?.name || 'vendor';

      if (from) {
        navigate(from, { replace: true });
      } else {
        navigate(`/dashboard/${roleName}`, { replace: true });
      }
    } catch (error: any) {
      const isNetworkError =
        !error.response &&
        (error.message?.includes('connect') ||
          error.message?.includes('Network') ||
          error.message?.includes('ECONNREFUSED') ||
          error.message?.includes('port 8000'));

      if (isNetworkError) {
        setBackendOffline(true);
        toast.error('Backend server is offline. Please start FastAPI on port 8000.');
      } else {
        const msg =
          error.response?.data?.error?.message ||
          error.response?.data?.detail ||
          error.message ||
          'Incorrect email or password.';
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center py-12 px-4 bg-slate-50 dark:bg-slate-950 transition-colors duration-300 overflow-hidden">
      {/* Background Blobs */}
      <div className="absolute top-0 -left-20 w-96 h-96 bg-emerald-500/10 dark:bg-emerald-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 -right-20 w-96 h-96 bg-indigo-500/10 dark:bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* Top Nav */}
      <div className="absolute top-6 left-6 right-6 flex items-center justify-between z-20">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-emerald-500 dark:hover:text-white transition-colors font-heading"
        >
          <ArrowLeft size={16} /> Back to Flowza Overview
        </Link>
        <button
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
          title="Toggle theme"
        >
          {resolvedTheme === 'dark' ? <Sun size={16} className="text-amber-400" /> : <Moon size={16} />}
        </button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="w-full max-w-md space-y-4 relative z-10"
      >
        {/* Backend offline alert */}
        {backendOffline && (
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-xs font-sans">
            <AlertCircle size={18} className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-red-700 dark:text-red-400 font-heading">Backend Server Offline</p>
              <p className="text-red-600/80 dark:text-red-400/70 text-xs mt-0.5 font-mono">
                The Flowza API server is not running on port 8000. Start backend with uvicorn and retry.
              </p>
            </div>
          </div>
        )}

        <Card className="glass-panel shadow-2xl border-slate-200/80 dark:border-slate-800 rounded-3xl overflow-hidden p-2">
          <CardHeader className="text-center space-y-3 pt-6 pb-4">
            <div className="mx-auto h-12 w-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center text-white font-extrabold text-2xl shadow-lg shadow-emerald-500/30 border border-emerald-300/30">
              F
            </div>
            <div>
              <CardTitle className="text-2xl font-extrabold text-slate-900 dark:text-white font-heading">
                Sign In to Workspace
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Enter your registered credentials to access your portal
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-5 px-6 pb-6">
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <ShieldCheck size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <p className="text-xs text-emerald-700 dark:text-emerald-300 font-medium font-sans">
                Portal features (Vendor, Supplier, or Admin) adapt automatically to your user role.
              </p>
            </div>

            <FormProvider {...methods}>
              <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-4">
                <FormInput
                  name="email"
                  type="email"
                  label="Email Address"
                  placeholder="name@company.com"
                  autoComplete="email"
                />

                <FormInput
                  name="password"
                  type="password"
                  label="Password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />

                <div className="flex items-center justify-between">
                  <Checkbox
                    id="remember_me"
                    label="Remember Me"
                    {...methods.register('remember_me')}
                  />
                  <a href="#" className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline font-heading">
                    Forgot password?
                  </a>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  glow
                  className="w-full h-11 text-sm font-semibold shadow-md font-heading"
                  isLoading={loading}
                >
                  <Lock size={15} className="mr-2" />
                  Sign In to Workspace
                </Button>
              </form>
            </FormProvider>

            <div className="text-center text-xs text-slate-500 dark:text-slate-400 pt-2 font-sans">
              Don't have an account?{' '}
              <Link to="/register" className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline font-heading">
                Create Account
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Demo hint box */}
        <div className="p-3 rounded-2xl glass-panel text-center">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-heading mb-1">Seeded Accounts</p>
          <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-0.5 font-mono">
            <li><span className="font-bold text-emerald-500">testvendor@example.com</span> — Password123!</li>
            <li><span className="font-bold text-emerald-500">admin@flowza.com</span> — Password123!</li>
          </ul>
        </div>
      </motion.div>
    </div>
  );
};

