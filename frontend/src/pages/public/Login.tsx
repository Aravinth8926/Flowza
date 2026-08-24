import React, { useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useLocation } from 'react-router-dom';
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

      toast.success('Welcome back! Redirecting to your dashboard...');

      const from = (location.state as any)?.from?.pathname;
      const user = useAuthStore.getState().user;
      const roleName = user?.role?.name || 'vendor';

      if (from) {
        navigate(from, { replace: true });
      } else {
        navigate(`/dashboard/${roleName}`, { replace: true });
      }
    } catch (error: any) {
      // Distinguish backend-offline errors from credential errors
      const isNetworkError =
        !error.response &&
        (error.message?.includes('connect') ||
          error.message?.includes('Network') ||
          error.message?.includes('ECONNREFUSED') ||
          error.message?.includes('port 8000'));

      if (isNetworkError) {
        setBackendOffline(true);
        toast.error('Backend server is offline. Please start the FastAPI server on port 8000.');
      } else {
        const msg =
          error.response?.data?.error?.message ||
          error.response?.data?.detail ||
          error.message ||
          'Incorrect email or password. Please try again.';
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center py-12 px-4 bg-slate-50 dark:bg-slate-950 transition-colors duration-300 overflow-hidden">
      {/* Background Blobs */}
      <div className="absolute top-0 -left-20 w-96 h-96 bg-blue-500/10 dark:bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 -right-20 w-96 h-96 bg-indigo-500/10 dark:bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* Top Nav */}
      <div className="absolute top-6 left-6 right-6 flex items-center justify-between z-20">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-white transition-colors"
        >
          <ArrowLeft size={16} /> Back to Home
        </Link>
        <button
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          className="p-2 rounded-full hover:bg-slate-200/50 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
          title="Toggle theme"
        >
          {resolvedTheme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>

      <div className="w-full max-w-md space-y-4 relative z-10">
        {/* Backend offline alert */}
        {backendOffline && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-sm">
            <AlertCircle size={18} className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-red-700 dark:text-red-400">Backend Server Offline</p>
              <p className="text-red-600/80 dark:text-red-400/70 text-xs mt-0.5">
                The Flowza API server is not running. Start the FastAPI backend with{' '}
                <code className="bg-red-100 dark:bg-red-900/50 px-1 rounded font-mono">
                  uvicorn app.main:app --reload
                </code>{' '}
                and try again.
              </p>
            </div>
          </div>
        )}

        <Card className="glass-card shadow-2xl border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden">
          <CardHeader className="text-center space-y-3 pt-8 pb-4">
            <div className="mx-auto h-12 w-12 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-blue-500/30">
              F
            </div>
            <div>
              <CardTitle className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                Sign In to Flowza
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Enter your registered email and password to continue
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-5 px-6 pb-8">
            {/* Role info banner */}
            <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/50">
              <ShieldCheck size={15} className="text-blue-600 dark:text-blue-400 shrink-0" />
              <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">
                Your dashboard (Vendor, Supplier, or Admin) is determined by your registered account role.
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
                  <a href="#" className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                    Forgot password?
                  </a>
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 text-sm font-semibold shadow-md bg-blue-600 hover:bg-blue-700 text-white"
                  isLoading={loading}
                >
                  <Lock size={15} className="mr-2" />
                  Sign In to Dashboard
                </Button>
              </form>
            </FormProvider>

            <div className="text-center text-xs text-slate-500 dark:text-slate-400 pt-2">
              Don't have an account?{' '}
              <Link to="/register" className="font-bold text-blue-600 dark:text-blue-400 hover:underline">
                Create Account
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Demo hint box */}
        <div className="p-3 rounded-xl bg-slate-100/80 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 text-center">
          <p className="text-xxs font-bold text-slate-400 uppercase tracking-wider mb-1">Default Seeded Accounts</p>
          <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-0.5">
            <li><span className="font-mono font-bold">testvendor@example.com</span> — Password123!</li>
            <li><span className="font-mono font-bold">admin@flowza.com</span> — Password123!</li>
          </ul>
          <p className="text-xxs text-slate-400 mt-1">Only works when the backend server is running.</p>
        </div>
      </div>
    </div>
  );
};
