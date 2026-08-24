import React from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { useSidebarStore } from '../../store/sidebar';
import { useThemeStore } from '../../store/theme';
import { useAuthStore } from '../../store/auth';
import { Menu, Sun, Moon, LogOut, User as UserIcon, Settings } from 'lucide-react';
import { Button } from '../ui/Button';

export const DashboardLayout: React.FC = () => {
  const navigate = useNavigate();
  const { isCollapsed, toggle } = useSidebarStore();
  const { resolvedTheme, setTheme } = useThemeStore();
  const { user, logout } = useAuthStore();
  const [dropdownOpen, setDropdownOpen] = React.useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 flex transition-colors duration-200">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Container */}
      <div
        className={`flex-1 flex flex-col min-w-0 min-h-screen transition-all duration-300 ${
          isCollapsed ? 'md:pl-20' : 'md:pl-64'
        }`}
      >
        {/* Top Header */}
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 sm:px-6 lg:px-8 z-10 shrink-0 sticky top-0">
          <div className="flex items-center gap-4">
            {/* Mobile Hamburger Menu Toggle */}
            <button
              onClick={toggle}
              className="p-2 -ml-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white md:hidden cursor-pointer"
            >
              <Menu size={20} />
            </button>
            <div className="flex items-center space-x-2 text-xs font-semibold text-slate-400 dark:text-slate-500">
              <span className="text-slate-700 dark:text-slate-300 uppercase tracking-wider text-xs">
                Flowza Workspace
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Theme Toggle */}
            <button
              onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-950 dark:hover:text-white cursor-pointer"
              title="Toggle theme"
            >
              {resolvedTheme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center space-x-2 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none cursor-pointer"
              >
                <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white font-semibold text-xs select-none">
                  {user?.full_name?.slice(0, 2).toUpperCase() || 'US'}
                </div>
              </button>

              {dropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 ring-1 ring-black/5 z-20">
                    <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-850">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                        {user?.full_name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {user?.email}
                      </p>
                    </div>
                    <Link
                      to="/profile"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-850"
                    >
                      <UserIcon size={14} />
                      Profile Settings
                    </Link>
                    <Link
                      to="/settings"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-850"
                    >
                      <Settings size={14} />
                      System Settings
                    </Link>
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        handleLogout();
                      }}
                      className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-650 hover:bg-red-550/10 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/20 text-left border-t border-slate-100 dark:border-slate-850 mt-1 cursor-pointer"
                    >
                      <LogOut size={14} />
                      Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
