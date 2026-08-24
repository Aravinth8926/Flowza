import React from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { useSidebarStore } from '../../store/sidebar';
import { useThemeStore } from '../../store/theme';
import { useAuthStore } from '../../store/auth';
import { Menu, Sun, Moon, LogOut, User as UserIcon, Settings, ChevronRight, ShieldCheck } from 'lucide-react';
import { Badge } from '../ui/Badge';

export const DashboardLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isCollapsed, toggle } = useSidebarStore();
  const { resolvedTheme, setTheme } = useThemeStore();
  const { user, logout } = useAuthStore();
  const [dropdownOpen, setDropdownOpen] = React.useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const getBreadcrumbs = () => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    if (pathSegments.length === 0) return 'Workspace';
    const last = pathSegments[pathSegments.length - 1];
    return last.replace(/-/g, ' ').toUpperCase();
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 flex transition-colors duration-200 relative overflow-x-hidden">
      {/* Background Ambient Glow Accents */}
      <div className="fixed top-0 right-1/4 w-96 h-96 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="fixed bottom-0 left-1/3 w-96 h-96 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Container */}
      <div
        className={`flex-1 flex flex-col min-w-0 min-h-screen transition-all duration-300 ${
          isCollapsed ? 'md:pl-20' : 'md:pl-64'
        }`}
      >
        {/* Top Header */}
        <header className="h-16 glass-panel border-b border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between px-4 sm:px-6 lg:px-8 z-20 shrink-0 sticky top-0">
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger Menu Toggle */}
            <button
              onClick={toggle}
              className="p-2 -ml-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white md:hidden cursor-pointer"
            >
              <Menu size={20} />
            </button>
            
            <div className="flex items-center space-x-2 text-xs font-semibold">
              <span className="text-slate-400 dark:text-slate-400 font-heading tracking-wider">FLOWZA</span>
              <ChevronRight size={12} className="text-slate-400" />
              <span className="text-emerald-600 dark:text-emerald-400 font-mono font-bold tracking-tight">
                {getBreadcrumbs()}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Theme Toggle */}
            <button
              onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer border border-slate-200/80 dark:border-slate-800"
              title="Toggle theme"
            >
              {resolvedTheme === 'dark' ? <Sun size={16} className="text-amber-400" /> : <Moon size={16} />}
            </button>

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center space-x-2.5 p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-all focus:outline-none cursor-pointer border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
              >
                <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-emerald-600 to-emerald-400 text-white font-bold flex items-center justify-center text-xs shadow-sm">
                  {user?.full_name?.slice(0, 2).toUpperCase() || 'US'}
                </div>
                <span className="hidden sm:inline-block text-xs font-bold text-slate-900 dark:text-white font-heading">
                  {user?.full_name?.split(' ')[0]}
                </span>
              </button>

              {dropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-56 rounded-2xl p-1.5 glass-panel shadow-2xl border border-slate-200 dark:border-slate-800 z-20 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-3.5 py-3 border-b border-slate-100 dark:border-slate-800/80 mb-1">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate font-heading">
                        {user?.full_name}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate font-mono mt-0.5">
                        {user?.email}
                      </p>
                    </div>
                    <Link
                      to="/profile"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors font-heading"
                    >
                      <UserIcon size={14} className="text-emerald-500" />
                      Profile Settings
                    </Link>
                    <Link
                      to="/settings"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors font-heading"
                    >
                      <Settings size={14} className="text-emerald-500" />
                      System Settings
                    </Link>
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        handleLogout();
                      }}
                      className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40 rounded-xl transition-colors text-left border-t border-slate-100 dark:border-slate-800/80 mt-1 cursor-pointer font-heading"
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

