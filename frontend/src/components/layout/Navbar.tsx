import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth';
import { useThemeStore } from '../../store/theme';
import { FlowzaLogo } from '../common/FlowzaLogo';
import {
  Sun,
  Moon,
  LogOut,
  ArrowRight,
  Menu,
  X,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuthStore();
  const { resolvedTheme, setTheme } = useThemeStore();
  const [isOpen, setIsOpen] = useState(false);

  const getDashboardPath = () => {
    if (!user) return '/login';
    return `/dashboard/${user.role?.name || 'vendor'}`;
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#F7F6F2]/95 dark:bg-[#0D0E12]/95 backdrop-blur-md border-b border-neutral-200/80 dark:border-neutral-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        {/* Left Side: Logo & Business Navigation */}
        <div className="flex items-center space-x-8">
          <Link to="/" className="flex items-center group">
            <FlowzaLogo size="sm" badge="B2B" />
          </Link>

          {/* Desktop Business Navigation Links */}
          <nav className="hidden md:flex items-center space-x-6 text-xs font-medium text-neutral-600 dark:text-neutral-400">
            <a
              href="#how-it-works"
              className="hover:text-neutral-950 dark:hover:text-white transition-colors"
            >
              How It Works
            </a>
            <a
              href="#retailers"
              className="hover:text-neutral-950 dark:hover:text-white transition-colors"
            >
              For Retailers
            </a>
            <a
              href="#suppliers"
              className="hover:text-neutral-950 dark:hover:text-white transition-colors"
            >
              For Suppliers
            </a>
            <a
              href="#trust"
              className="hover:text-neutral-950 dark:hover:text-white transition-colors"
            >
              GST & Trust
            </a>
            <a
              href="#simulator"
              className="hover:text-neutral-950 dark:hover:text-white transition-colors"
            >
              Order Simulator
            </a>
          </nav>
        </div>

        {/* Right Side: Theme Toggle & Actions */}
        <div className="flex items-center space-x-3">
          {/* Theme Toggle */}
          <button
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            className="p-1.5 rounded text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white hover:bg-neutral-200/60 dark:hover:bg-neutral-800 transition-all cursor-pointer"
            aria-label="Toggle theme"
          >
            {resolvedTheme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          {isAuthenticated && user ? (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => navigate(getDashboardPath())}
                className="px-3 py-1.5 rounded-md text-xs font-mono font-medium border border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-900 hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-900 dark:text-neutral-100 transition-colors cursor-pointer"
              >
                Dashboard
              </button>
              <button
                onClick={handleLogout}
                className="p-1.5 rounded text-neutral-500 hover:text-red-600 transition-colors cursor-pointer"
                title="Sign out"
              >
                <LogOut size={15} />
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-3 text-xs">
              <Link
                to="/login"
                className="font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/login"
                className="px-3 py-1.5 rounded-md font-semibold bg-neutral-950 text-white dark:bg-amber-500 dark:text-neutral-950 hover:bg-neutral-800 dark:hover:bg-amber-400 transition-colors inline-flex items-center gap-1 cursor-pointer shadow-xs"
              >
                <span>Get Started</span>
                <ArrowRight size={12} />
              </Link>
            </div>
          )}

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-1.5 rounded text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800"
          >
            {isOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Mobile Nav Drawer */}
      {isOpen && (
        <div className="md:hidden border-t border-neutral-200 dark:border-neutral-800 bg-[#F7F6F2] dark:bg-[#0D0E12] px-4 py-4 space-y-3 text-xs font-medium">
          <a
            href="#how-it-works"
            onClick={() => setIsOpen(false)}
            className="block py-1 text-neutral-700 dark:text-neutral-300"
          >
            How It Works
          </a>
          <a
            href="#retailers"
            onClick={() => setIsOpen(false)}
            className="block py-1 text-neutral-700 dark:text-neutral-300"
          >
            For Retailers
          </a>
          <a
            href="#suppliers"
            onClick={() => setIsOpen(false)}
            className="block py-1 text-neutral-700 dark:text-neutral-300"
          >
            For Suppliers
          </a>
          <a
            href="#trust"
            onClick={() => setIsOpen(false)}
            className="block py-1 text-neutral-700 dark:text-neutral-300"
          >
            GST & Trust
          </a>
          <a
            href="#simulator"
            onClick={() => setIsOpen(false)}
            className="block py-1 text-neutral-700 dark:text-neutral-300"
          >
            Order Simulator
          </a>
        </div>
      )}
    </header>
  );
};
