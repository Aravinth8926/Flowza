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
import { FlowzaLogo } from '../../components/common/FlowzaLogo';
import { toast } from 'sonner';
import { ArrowLeft, Sun, Moon, Store, Truck, Shield } from 'lucide-react';

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
    try {
      await login({
        email: values.email,
        password: values.password,
        remember_me: values.remember_me,
      });

      toast.success('Authenticated successfully. Redirecting...');

      const from = (location.state as any)?.from?.pathname;
      const user = useAuthStore.getState().user;
      const roleName = user?.role?.name || 'vendor';

      if (from) {
        navigate(from, { replace: true });
      } else {
        navigate(`/dashboard/${roleName}`, { replace: true });
      }
    } catch (error: any) {
      const msg =
        error.response?.data?.error?.message ||
        error.response?.data?.detail ||
        error.message ||
        'Authentication failed. Please check credentials.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const quickFill = (email: string, pass: string = 'Password123!') => {
    methods.setValue('email', email);
    methods.setValue('password', pass);
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center py-12 px-4 bg-[#F8F8F6] dark:bg-[#0A0A0B] text-neutral-900 dark:text-neutral-100 transition-colors duration-200">
      {/* Top Header Controls */}
      <div className="absolute top-6 left-4 sm:left-8 right-4 sm:right-8 flex items-center justify-between z-20">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-mono font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white transition-colors"
        >
          <ArrowLeft size={14} /> Back to Overview
        </Link>
        <button
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          className="p-2 rounded text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200/60 dark:hover:bg-neutral-800 transition-all cursor-pointer"
          aria-label="Toggle theme"
        >
          {resolvedTheme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>

      {/* Main Login Card */}
      <div className="w-full max-w-md my-auto">
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#121215] shadow-lg p-6 sm:p-8 space-y-6">
          {/* Header & Logo */}
          <div className="space-y-3">
            <div className="flex pb-1">
              <FlowzaLogo size="md" badge="B2B Network" />
            </div>
            <h1 className="font-heading text-2xl font-extrabold text-neutral-950 dark:text-white tracking-tight">
              Sign in to Workspace
            </h1>
            <p className="text-xs text-neutral-500 font-mono">
              Access your real-time procurement & supplier dashboard
            </p>
          </div>

          {/* Quick-Fill Demo Pills */}
          <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-2">
            <p className="text-[10px] font-mono uppercase font-bold text-neutral-500 tracking-wider">
              Instant Demo Quick-Fill:
            </p>
            <div className="grid grid-cols-3 gap-1.5 font-mono">
              <button
                type="button"
                onClick={() => quickFill('vendor@supermarket.com')}
                className="flex items-center justify-center gap-1 py-1.5 px-2 rounded bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-[11px] font-medium text-neutral-700 dark:text-neutral-300 hover:border-amber-500 hover:text-amber-600 transition-all cursor-pointer shadow-xs"
              >
                <Store size={12} className="text-amber-500" />
                <span>Vendor</span>
              </button>
              <button
                type="button"
                onClick={() => quickFill('abc@distributors.com')}
                className="flex items-center justify-center gap-1 py-1.5 px-2 rounded bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-[11px] font-medium text-neutral-700 dark:text-neutral-300 hover:border-amber-500 hover:text-amber-600 transition-all cursor-pointer shadow-xs"
              >
                <Truck size={12} className="text-amber-500" />
                <span>Supplier</span>
              </button>
              <button
                type="button"
                onClick={() => quickFill('admin@flowza.com', 'AdminPassword123!')}
                className="flex items-center justify-center gap-1 py-1.5 px-2 rounded bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-[11px] font-medium text-neutral-700 dark:text-neutral-300 hover:border-amber-500 hover:text-amber-600 transition-all cursor-pointer shadow-xs"
              >
                <Shield size={12} className="text-amber-500" />
                <span>Admin</span>
              </button>
            </div>
          </div>

          {/* Form */}
          <FormProvider {...methods}>
            <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-4">
              <FormInput
                name="email"
                label="Business Email"
                type="email"
                placeholder="name@company.com"
                autoComplete="email"
                required
              />

              <div className="space-y-1">
                <FormInput
                  name="password"
                  label="Password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
              </div>

              <div className="flex items-center justify-between pt-1 text-xs font-mono">
                <Checkbox name="remember_me" label="Remember for 30 days" />
                <a
                  href="#forgot"
                  onClick={(e) => {
                    e.preventDefault();
                    toast.info('Demo password is: Password123! (or AdminPassword123!)');
                  }}
                  className="text-amber-600 dark:text-amber-400 hover:underline"
                >
                  Forgot password?
                </a>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded text-xs font-mono font-bold bg-neutral-950 text-white dark:bg-amber-500 dark:text-neutral-950 hover:bg-neutral-800 dark:hover:bg-amber-400 transition-all cursor-pointer shadow-md disabled:opacity-50"
              >
                {loading ? 'Authenticating...' : 'Sign In to Workspace →'}
              </button>
            </form>
          </FormProvider>

          {/* Register Link */}
          <div className="pt-2 text-center text-xs text-neutral-500 border-t border-neutral-100 dark:border-neutral-800">
            Don't have an enterprise account?{' '}
            <Link
              to="/register"
              className="font-semibold text-neutral-900 dark:text-white hover:underline"
            >
              Create Free Account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
