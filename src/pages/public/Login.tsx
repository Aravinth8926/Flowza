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
import { ArrowLeft, Lock, ShieldCheck, Sparkles, Sun, Moon } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
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

      toast.success('Successfully signed in! Welcome back.');

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
        'Login failed. Please verify your email and password.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const fillDemoCredentials = (email: string) => {
    methods.setValue('email', email);
    methods.setValue('password', 'Password123!');
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center py-12 px-4 bg-slate-50 dark:bg-slate-950 transition-colors duration-300 overflow-hidden">
      {/* Dynamic Background Mesh Gradients */}
      <div className="absolute top-0 -left-20 w-96 h-96 bg-blue-500/10 dark:bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 -right-20 w-96 h-96 bg-indigo-500/10 dark:bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header Navigation bar */}
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

      <div className="w-full max-w-md space-y-6 relative z-10">
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
                Enter your credentials to access your B2B procurement portal
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-5 px-6 pb-8">
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

                <Button type="submit" className="w-full h-11 text-sm font-semibold shadow-md" isLoading={loading}>
                  Sign In to Dashboard
                </Button>
              </form>
            </FormProvider>

            {/* Quick Demo Credentials Assistant */}
            <div className="pt-4 border-t border-slate-200/60 dark:border-slate-800/80">
              <p className="text-xxs font-bold text-slate-400 uppercase tracking-wider mb-2 text-center">
                Quick Fill Demo Accounts
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                <button
                  type="button"
                  onClick={() => fillDemoCredentials('testvendor@example.com')}
                  className="px-2.5 py-1 text-xs font-medium rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 transition-colors cursor-pointer"
                >
                  Vendor Demo
                </button>
                <button
                  type="button"
                  onClick={() => fillDemoCredentials('user_1785320153@example.com')}
                  className="px-2.5 py-1 text-xs font-medium rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 transition-colors cursor-pointer"
                >
                  Supplier Demo
                </button>
                <button
                  type="button"
                  onClick={() => fillDemoCredentials('admin@flowza.com')}
                  className="px-2.5 py-1 text-xs font-medium rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 transition-colors cursor-pointer"
                >
                  Admin Demo
                </button>
              </div>
            </div>

            <div className="text-center text-xs text-slate-500 dark:text-slate-400 pt-2">
              Don't have an account?{' '}
              <Link to="/register" className="font-bold text-blue-600 dark:text-blue-400 hover:underline">
                Create Account
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
