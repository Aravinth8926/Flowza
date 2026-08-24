import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth';
import { useThemeStore } from '../../store/theme';
import { Button } from '../ui/Button';
import { Dropdown } from '../ui/Dropdown';
import { Menu, X, Sun, Moon, LogOut, LayoutDashboard, Search, User as UserIcon, Settings, Command, Bell } from 'lucide-react';
import { Badge } from '../ui/Badge';

export const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuthStore();
  const { resolvedTheme, setTheme } = useThemeStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
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
      label: 'Operational Dashboard',
      icon: <LayoutDashboard size={15} />,
      onClick: () => navigate(getDashboardPath()),
    },
    {
      id: 'profile',
      label: 'Account & Business Profile',
      icon: <UserIcon size={15} />,
      onClick: () => navigate('/profile'),
    },
    {
      id: 'settings',
      label: 'System Settings',
      icon: <Settings size={15} />,
      onClick: () => navigate('/settings'),
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
    <nav
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
        isScrolled
          ? 'glass-panel shadow-lg py-2.5 border-b border-slate-200/80 dark:border-slate-800/80'
          : 'bg-transparent py-4'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <div className="flex items-center space-x-6">
            <Link to="/" className="flex items-center space-x-3 group">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center text-white font-extrabold text-lg shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform border border-emerald-300/30">
                F
              </div>
              <div className="flex flex-col">
                <span className="font-heading text-xl font-bold tracking-tight text-slate-900 dark:text-white leading-none">
                  Flowza
                </span>
                <span className="text-[10px] font-mono font-medium tracking-wider uppercase text-emerald-600 dark:text-emerald-400">
                  Precision Procurement
                </span>
              </div>
            </Link>

            {/* Quick Search Shortcut Trigger */}
            <div className="hidden lg:flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-100/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-xs cursor-pointer hover:border-emerald-500/40 transition-all">
              <Search size={14} className="text-slate-400 dark:text-slate-500" />
              <span className="pr-8 font-medium text-slate-500 dark:text-slate-400">Search suppliers, products, SKUs...</span>
              <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-bold font-mono text-slate-600 dark:text-slate-300">
                <Command size={10} /> K
              </span>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <a
              href="#features"
              className="text-xs font-semibold tracking-tight text-slate-600 hover:text-emerald-600 dark:text-slate-300 dark:hover:text-emerald-400 transition-colors font-heading"
            >
              Platform Capabilities
            </a>
            <a
              href="#how-it-works"
              className="text-xs font-semibold tracking-tight text-slate-600 hover:text-emerald-600 dark:text-slate-300 dark:hover:text-emerald-400 transition-colors font-heading"
            >
              Logistics Engine
            </a>
            <Link
              to="/about"
              className="text-xs font-semibold tracking-tight text-slate-600 hover:text-emerald-600 dark:text-slate-300 dark:hover:text-emerald-400 transition-colors font-heading"
            >
              About
            </Link>

            {/* Theme Toggle */}
            <button
              onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer border border-slate-200/80 dark:border-slate-800"
              aria-label="Toggle theme"
              title="Toggle Light/Dark Theme"
            >
              {resolvedTheme === 'dark' ? <Sun size={16} className="text-amber-400" /> : <Moon size={16} className="text-slate-700" />}
            </button>

            {/* Auth Buttons / User Dropdown */}
            {isAuthenticated && user ? (
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => navigate('/dashboard/vendor/cart')}
                  className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all relative"
                  title="Notifications"
                >
                  <Bell size={16} />
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                </button>

                <Link to={getDashboardPath()}>
                  <Button size="sm" variant="primary" glow className="gap-2 font-heading font-semibold">
                    <LayoutDashboard size={15} />
                    Workspace
                  </Button>
                </Link>

                <Dropdown
                  trigger={
                    <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 transition-all cursor-pointer border border-slate-200/80 dark:border-slate-800">
                      <div className="h-7 w-7 rounded-lg bg-gradient-to-tr from-emerald-600 to-emerald-400 text-white font-bold flex items-center justify-center text-xs shadow-sm">
                        {user.full_name?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <span className="text-xs font-bold text-slate-800 dark:text-white max-w-[110px] truncate font-heading">
                        {user.full_name?.split(' ')[0]}
                      </span>
                    </div>
                  }
                  items={userDropdownItems}
                />
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Link to="/login">
                  <Button variant="ghost" size="sm" className="font-semibold text-slate-700 dark:text-slate-200 hover:text-emerald-600 font-heading">
                    Sign In
                  </Button>
                </Link>
                <Link to="/register">
                  <Button size="sm" variant="primary" glow className="font-semibold font-heading">
                    Start Platform Setup
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden items-center space-x-3">
            <button
              onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300"
            >
              {resolvedTheme === 'dark' ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} />}
            </button>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300"
            >
              {isOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden glass-panel border-b border-slate-200 dark:border-slate-800 mt-2 px-6 pt-4 pb-6 space-y-3">
          <a
            href="#features"
            onClick={() => setIsOpen(false)}
            className="block py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-emerald-500 font-heading"
          >
            Platform Capabilities
          </a>
          <a
            href="#how-it-works"
            onClick={() => setIsOpen(false)}
            className="block py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-emerald-500 font-heading"
          >
            Logistics Engine
          </a>
          <Link
            to="/about"
            onClick={() => setIsOpen(false)}
            className="block py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-emerald-500 font-heading"
          >
            About Us
          </Link>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
            {isAuthenticated && user ? (
              <>
                <Link to={getDashboardPath()} onClick={() => setIsOpen(false)}>
                  <Button variant="outline" className="w-full flex items-center justify-center gap-2">
                    <LayoutDashboard size={16} />
                    Operational Dashboard
                  </Button>
                </Link>
                <Button variant="ghost" onClick={handleLogout} className="w-full flex items-center justify-center gap-2 text-red-600 dark:text-red-400">
                  <LogOut size={16} />
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={() => setIsOpen(false)}>
                  <Button variant="outline" className="w-full">
                    Sign In
                  </Button>
                </Link>
                <Link to="/register" onClick={() => setIsOpen(false)}>
                  <Button variant="primary" glow className="w-full">Start Platform Setup</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

