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
import { toast } from 'sonner';
import { ArrowLeft, Lock, ShieldCheck, Sun, Moon, Store, Truck, Shield } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';

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
    <div className="min-h-[100dvh] relative flex items-center justify-center py-12 px-4 bg-[#FAFAFA] dark:bg-[#08090A] text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Top Header Controls */}
      <div className="absolute top-6 left-4 sm:left-8 right-4 sm:right-8 flex items-center justify-between z-20">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors font-heading"
        >
          <ArrowLeft size={16} /> Back to Overview
        </Link>
        <button
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          className="p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-all cursor-pointer"
          aria-label="Toggle theme"
        >
          {resolvedTheme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
        </button>
      </div>

      {/* Main Login Card */}
      <div className="w-full max-w-md my-auto">
        <div className="double-bezel">
          <div className="double-bezel-inner p-6 sm:p-8 space-y-6">
            {/* Header */}
            <div className="text-center space-y-2">
              <div className="h-11 w-11 rounded-2xl bg-emerald-600 dark:bg-emerald-500 text-white dark:text-slate-950 font-extrabold text-xl flex items-center justify-center mx-auto shadow-sm">
                F
              </div>
              <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Sign in to Flowza
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Access your B2B trade workspace & operational dashboard
              </p>
            </div>

            {/* Quick-Fill Demo Pills */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 space-y-2">
              <p className="text-[11px] font-mono uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                Instant Demo Quick-Fill:
              </p>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => quickFill('vendor@supermarket.com')}
                  className="px-2 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:border-emerald-500 hover:text-emerald-600 cursor-pointer flex flex-col items-center gap-1 transition-all"
                >
                  <Store size={14} className="text-indigo-500" />
                  <span>Vendor</span>
                </button>
                <button
                  type="button"
                  onClick={() => quickFill('abc@distributors.com')}
                  className="px-2 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:border-emerald-500 hover:text-emerald-600 cursor-pointer flex flex-col items-center gap-1 transition-all"
                >
                  <Truck size={14} className="text-emerald-500" />
                  <span>Supplier</span>
                </button>
                <button
                  type="button"
                  onClick={() => quickFill('admin@flowza.com')}
                  className="px-2 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:border-emerald-500 hover:text-emerald-600 cursor-pointer flex flex-col items-center gap-1 transition-all"
                >
                  <Shield size={14} className="text-rose-500" />
                  <span>Admin</span>
                </button>
              </div>
            </div>

            {/* Login Form */}
            <FormProvider {...methods}>
              <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-4">
                <FormInput
                  name="email"
                  label="Work Email Address"
                  type="email"
                  placeholder="name@company.com"
                  required
                />
                <FormInput
                  name="password"
                  label="Account Password"
                  type="password"
                  placeholder="••••••••"
                  required
                />

                <div className="flex items-center justify-between text-xs pt-1">
                  <Checkbox
                    name="remember_me"
                    label="Keep me signed in"
                  />
                  <a href="#" className="text-emerald-600 dark:text-emerald-400 hover:underline">
                    Forgot Password?
                  </a>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  isLoading={loading}
                  className="w-full text-sm font-semibold mt-2"
                >
                  <Lock size={16} />
                  <span>Authenticate Session</span>
                </Button>
              </form>
            </FormProvider>

            {/* Registration Footer */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800/60 text-center text-xs text-slate-500 dark:text-slate-400">
              New to Flowza?{' '}
              <Link to="/register" className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline">
                Create Organization Account
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
