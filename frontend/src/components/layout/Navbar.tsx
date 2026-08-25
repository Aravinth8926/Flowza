import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../store/auth';
import { useThemeStore } from '../../store/theme';
import { Button } from '../ui/Button';
import { Dropdown } from '../ui/Dropdown';
import { Sun, Moon, LogOut, LayoutDashboard, User as UserIcon, Settings, Sparkles, ArrowRight, ShieldCheck, Store, Truck } from 'lucide-react';
import { Badge } from '../ui/Badge';

export const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuthStore();
  const { resolvedTheme, setTheme } = useThemeStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 15);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const getDashboardPath = () => {
    if (!user) return '/login';
    return `/dashboard/${user.role?.name || 'vendor'}`;
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const userDropdownItems = [
    {
      id: 'dashboard',
      label: 'Operations Dashboard',
      icon: <LayoutDashboard size={15} />,
      onClick: () => navigate(getDashboardPath()),
    },
    {
      id: 'assistant',
      label: 'Flowza AI Assistant',
      icon: <Sparkles size={15} className="text-emerald-500" />,
      onClick: () => navigate('/assistant'),
    },
    {
      id: 'profile',
      label: 'Organization Profile',
      icon: <UserIcon size={15} />,
      onClick: () => navigate('/profile'),
    },
    'divider' as const,
    {
      id: 'logout',
      label: 'Sign Out',
      icon: <LogOut size={15} />,
      danger: true,
      onClick: handleLogout,
    },
  ];

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 px-3 sm:px-6 md:px-8 py-2.5 transition-all duration-300">
        <nav
          className={`mx-auto max-w-7xl rounded-2xl md:rounded-full transition-all duration-300 px-4 md:px-6 py-2.5 flex items-center justify-between ${
            isScrolled
              ? 'glass-panel shadow-lg shadow-black/5 dark:shadow-black/20'
              : 'bg-white/80 dark:bg-[#0E1015]/80 backdrop-blur-md border border-slate-200/60 dark:border-slate-800/60 shadow-sm'
          }`}
        >
          {/* Logo & Brand */}
          <div className="flex items-center space-x-6">
            <Link to="/" className="flex items-center space-x-3 group">
              <div className="h-9 w-9 rounded-xl bg-emerald-600 dark:bg-emerald-500 flex items-center justify-center text-white dark:text-slate-950 font-bold text-base shadow-[inset_0_1px_0_rgba(255,255,255,0.3)] transition-transform group-hover:scale-105">
                F
              </div>
              <div className="flex flex-col">
                <span className="font-heading text-lg font-bold tracking-tight text-slate-900 dark:text-white leading-none">
                  Flowza
                </span>
                <span className="text-[10px] font-mono font-medium tracking-wider uppercase text-emerald-600 dark:text-emerald-400">
                  B2B Precision
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <div className="hidden lg:flex items-center space-x-1 pl-4 border-l border-slate-200 dark:border-slate-800 text-sm font-medium text-slate-600 dark:text-slate-400">
              <Link to="/about" className="px-3 py-1.5 rounded-lg hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors">
                Architecture & About
              </Link>
              <a href="#features" className="px-3 py-1.5 rounded-lg hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors">
                Platform Engine
              </a>
              <a href="#simulator" className="px-3 py-1.5 rounded-lg hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors">
                Live Simulator
              </a>
              <a href="#faqs" className="px-3 py-1.5 rounded-lg hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors">
                FAQ
              </a>
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center space-x-2.5">
            {/* Theme Toggle */}
            <button
              onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-all cursor-pointer"
              aria-label="Toggle theme"
            >
              {resolvedTheme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
            </button>

            {isAuthenticated && user ? (
              <div className="flex items-center space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate(getDashboardPath())}
                  className="hidden sm:inline-flex"
                >
                  <LayoutDashboard size={14} />
                  <span>Dashboard</span>
                </Button>

                <Dropdown trigger={
                  <div className="flex items-center space-x-2 pl-1 cursor-pointer">
                    <div className="h-8 w-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-bold flex items-center justify-center text-xs">
                      {user.full_name?.charAt(0) || 'U'}
                    </div>
                  </div>
                } items={userDropdownItems} />
              </div>
            ) : (
              <div className="hidden sm:flex items-center space-x-2">
                <Button size="sm" variant="ghost" onClick={() => navigate('/login')}>
                  Sign In
                </Button>
                <Button size="sm" variant="primary" trailingIcon={<ArrowRight size={14} />} onClick={() => navigate('/register')}>
                  Get Started
                </Button>
              </div>
            )}

            {/* Mobile Hamburger Morph */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="lg:hidden p-2 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer focus:outline-none"
              aria-label="Toggle Menu"
            >
              <div className="w-5 h-4 flex flex-col justify-between items-center relative">
                <span
                  className={`w-full h-0.5 bg-current rounded-full transition-all duration-200 ${
                    isOpen ? 'rotate-45 translate-y-1.5' : ''
                  }`}
                />
                <span
                  className={`w-full h-0.5 bg-current rounded-full transition-all duration-200 ${
                    isOpen ? 'opacity-0' : ''
                  }`}
                />
                <span
                  className={`w-full h-0.5 bg-current rounded-full transition-all duration-200 ${
                    isOpen ? '-rotate-45 -translate-y-2' : ''
                  }`}
                />
              </div>
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile Modal Expansion */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-30 pt-20 px-4 bg-white/95 dark:bg-[#08090A]/95 backdrop-blur-2xl lg:hidden flex flex-col justify-between pb-8"
          >
            <div className="space-y-4 pt-4">
              <div className="space-y-1">
                <Link
                  to="/about"
                  onClick={() => setIsOpen(false)}
                  className="block px-4 py-3 rounded-xl text-base font-medium text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                >
                  Architecture & About
                </Link>
                <a
                  href="#features"
                  onClick={() => setIsOpen(false)}
                  className="block px-4 py-3 rounded-xl text-base font-medium text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                >
                  Platform Engine
                </a>
                <a
                  href="#simulator"
                  onClick={() => setIsOpen(false)}
                  className="block px-4 py-3 rounded-xl text-base font-medium text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                >
                  Live Simulator
                </a>
                <a
                  href="#faqs"
                  onClick={() => setIsOpen(false)}
                  className="block px-4 py-3 rounded-xl text-base font-medium text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                >
                  Frequently Asked Questions
                </a>
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2.5">
                {isAuthenticated && user ? (
                  <>
                    <Button
                      size="lg"
                      variant="primary"
                      className="w-full"
                      onClick={() => {
                        setIsOpen(false);
                        navigate(getDashboardPath());
                      }}
                    >
                      <LayoutDashboard size={18} />
                      <span>Go to Dashboard</span>
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        setIsOpen(false);
                        handleLogout();
                      }}
                    >
                      <LogOut size={18} />
                      <span>Sign Out</span>
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      size="lg"
                      variant="primary"
                      className="w-full"
                      onClick={() => {
                        setIsOpen(false);
                        navigate('/register');
                      }}
                    >
                      <span>Create Free Account</span>
                      <ArrowRight size={18} />
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        setIsOpen(false);
                        navigate('/login');
                      }}
                    >
                      <span>Sign In</span>
                    </Button>
                  </>
                )}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                <span>All Trade Engines Online</span>
              </span>
              <span className="font-mono">v1.0.0</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
