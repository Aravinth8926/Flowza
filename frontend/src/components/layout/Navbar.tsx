import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth';
import { useThemeStore } from '../../store/theme';
import { Button } from '../ui/Button';
import { Dropdown } from '../ui/Dropdown';
import { Menu, X, Sun, Moon, LogOut, LayoutDashboard, Search, User as UserIcon, Settings, Command } from 'lucide-react';

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
      label: 'Dashboard',
      icon: <LayoutDashboard size={15} />,
      onClick: () => navigate(getDashboardPath()),
    },
    {
      id: 'profile',
      label: 'My Profile',
      icon: <UserIcon size={15} />,
      onClick: () => navigate('/profile'),
    },
    {
      id: 'settings',
      label: 'Settings',
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
          ? 'glass shadow-xs py-3'
          : 'bg-transparent py-4'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <div className="flex items-center space-x-6">
            <Link to="/" className="flex items-center space-x-3 group">
              <div className="h-9 w-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-sm group-hover:scale-105 transition-transform">
                F
              </div>
              <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-[#f1f5f9] flex items-center gap-1.5">
                Flowza
              </span>
            </Link>

            {/* Quick Search Shortcut Trigger */}
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-[#111827] border border-slate-200 dark:border-[#1e293b] text-xs cursor-pointer hover:border-slate-300 dark:hover:border-[#28354d] transition-colors">
              <Search size={14} className="text-slate-400 dark:text-[#64748b]" />
              <span className="pr-6 font-medium text-slate-500 dark:text-[#8896ab]">Search workspace...</span>
              <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-white dark:bg-[#1c2638] border border-slate-200 dark:border-[#1e293b] text-xxs font-semibold font-mono text-slate-600 dark:text-[#8896ab]">
                <Command size={10} /> K
              </span>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <a
              href="#features"
              className="text-xs font-semibold text-slate-600 hover:text-blue-600 dark:text-[#8896ab] dark:hover:text-[#f1f5f9] transition-colors"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className="text-xs font-semibold text-slate-600 hover:text-blue-600 dark:text-[#8896ab] dark:hover:text-[#f1f5f9] transition-colors"
            >
              How It Works
            </a>
            <Link
              to="/about"
              className="text-xs font-semibold text-slate-600 hover:text-blue-600 dark:text-[#8896ab] dark:hover:text-[#f1f5f9] transition-colors"
            >
              About Us
            </Link>

            {/* Theme Toggle */}
            <button
              onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-lg bg-slate-100 dark:bg-[#151d2e] hover:bg-slate-200 dark:hover:bg-[#1e293b] text-slate-600 dark:text-[#8896ab] transition-colors cursor-pointer border border-slate-200/60 dark:border-[#1e293b]"
              aria-label="Toggle theme"
              title="Toggle Light/Dark Theme"
            >
              {resolvedTheme === 'dark' ? <Sun size={16} className="text-amber-400" /> : <Moon size={16} className="text-slate-700" />}
            </button>

            {/* Auth Buttons / User Dropdown */}
            {isAuthenticated && user ? (
              <div className="flex items-center space-x-3">
                <Link to={getDashboardPath()}>
                  <Button size="sm" className="flex items-center gap-2 rounded-lg font-semibold bg-blue-600 hover:bg-blue-700 text-white">
                    <LayoutDashboard size={15} />
                    Dashboard
                  </Button>
                </Link>

                <Dropdown
                  trigger={
                    <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-[#151d2e] hover:bg-slate-200 dark:hover:bg-[#1e293b] transition-colors cursor-pointer border border-slate-200/60 dark:border-[#1e293b]">
                      <div className="h-6 w-6 rounded-md bg-blue-600 text-white font-bold flex items-center justify-center text-xs">
                        {user.full_name?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <span className="text-xs font-semibold text-slate-800 dark:text-[#f1f5f9] max-w-[100px] truncate">
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
                  <Button variant="ghost" size="sm" className="font-semibold text-slate-700 dark:text-[#f1f5f9] hover:text-blue-600">
                    Sign In
                  </Button>
                </Link>
                <Link to="/register">
                  <Button size="sm" className="rounded-lg font-semibold bg-blue-600 hover:bg-blue-700 text-white">
                    Get Started
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden items-center space-x-3">
            <button
              onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-lg bg-slate-100 dark:bg-[#151d2e] text-slate-600 dark:text-[#8896ab]"
            >
              {resolvedTheme === 'dark' ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} />}
            </button>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-lg bg-slate-100 dark:bg-[#151d2e] text-slate-600 dark:text-[#8896ab]"
            >
              {isOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden glass border-b border-slate-200 dark:border-[#1e293b] mt-2 px-6 pt-4 pb-6 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <a
            href="#features"
            onClick={() => setIsOpen(false)}
            className="block py-2 text-sm font-medium text-slate-700 dark:text-[#f1f5f9] hover:text-blue-600"
          >
            Features
          </a>
          <a
            href="#how-it-works"
            onClick={() => setIsOpen(false)}
            className="block py-2 text-sm font-medium text-slate-700 dark:text-[#f1f5f9] hover:text-blue-600"
          >
            How It Works
          </a>
          <Link
            to="/about"
            onClick={() => setIsOpen(false)}
            className="block py-2 text-sm font-medium text-slate-700 dark:text-[#f1f5f9] hover:text-blue-600"
          >
            About Us
          </Link>

          <div className="pt-4 border-t border-slate-200 dark:border-[#1e293b] space-y-2">
            {isAuthenticated && user ? (
              <>
                <Link to={getDashboardPath()} onClick={() => setIsOpen(false)}>
                  <Button variant="outline" className="w-full flex items-center justify-center gap-2">
                    <LayoutDashboard size={16} />
                    Dashboard
                  </Button>
                </Link>
                <Button variant="ghost" onClick={handleLogout} className="w-full flex items-center justify-center gap-2 text-red-600 dark:text-red-400">
                  <LogOut size={16} />
                  Logout
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
                  <Button className="w-full bg-blue-600 text-white">Get Started</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};
