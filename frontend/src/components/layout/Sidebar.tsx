import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth';
import { useSidebarStore } from '../../store/sidebar';
import {
  LayoutDashboard,
  User as UserIcon,
  Settings as SettingsIcon,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Inbox,
  PlusCircle,
  ShoppingBag,
  Package,
} from 'lucide-react';
import { Button } from '../ui/Button';

export const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { isCollapsed, isOpen, toggleCollapse, close } = useSidebarStore();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const getRoleBadge = () => {
    const roleName = user?.role?.name;
    if (!roleName) return null;
    const colors: Record<string, string> = {
      admin: 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900/50',
      vendor: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/50',
      supplier: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/50',
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xxs font-semibold uppercase tracking-wider border border-transparent ${colors[roleName] || 'bg-slate-100 text-slate-800'}`}>
        {roleName}
      </span>
    );
  };

  const roleName = user?.role?.name || 'vendor';

  const menuItems = [
    {
      label: 'Dashboard',
      path: `/dashboard/${roleName}`,
      icon: <LayoutDashboard size={18} />,
    },
    ...(roleName === 'supplier'
      ? [
        {
          label: 'Incoming Orders',
          path: '/dashboard/supplier/orders/incoming',
          icon: <Inbox size={18} />,
        },
        {
          label: 'My Products',
          path: '/dashboard/supplier/products',
          icon: <Package size={18} />,
        },
      ]
      : []),
    ...(roleName === 'vendor'
      ? [
        {
          label: 'Product Catalog',
          path: '/dashboard/vendor/products',
          icon: <Package size={18} />,
        },
        {
          label: 'New Order Request',
          path: '/dashboard/vendor/orders/new',
          icon: <PlusCircle size={18} />,
        },
        {
          label: 'Sent Orders',
          path: '/dashboard/vendor/orders',
          icon: <ShoppingBag size={18} />,
        },
      ]
      : []),
    {
      label: 'My Profile',
      path: '/profile',
      icon: <UserIcon size={18} />,
    },
    {
      label: 'Settings',
      path: '/settings',
      icon: <SettingsIcon size={18} />,
    },
  ];

  return (
    <>
      {/* Mobile Sidebar Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm md:hidden"
          onClick={close}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-30 flex flex-col bg-white dark:bg-[#0c111d] border-r border-slate-200 dark:border-[#1e293b] transition-all duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
          } ${isCollapsed ? 'w-20' : 'w-64'}`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-slate-200 dark:border-[#1e293b] shrink-0">
          <div className="flex items-center space-x-2.5 overflow-hidden">
            <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-lg shrink-0 shadow-sm">
              F
            </div>
            {!isCollapsed && (
              <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-[#f1f5f9] truncate">
                Flowza
              </span>
            )}
          </div>
          <button
            onClick={toggleCollapse}
            className="hidden md:flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 dark:border-[#1e293b] bg-slate-50 dark:bg-[#151d2e] text-slate-500 dark:text-[#8896ab] hover:text-slate-900 dark:hover:text-white cursor-pointer"
          >
            {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        {/* User Card */}
        <div className={`p-4 border-b border-slate-100 dark:border-[#1e293b] ${isCollapsed ? 'flex justify-center' : ''}`}>
          {isCollapsed ? (
            <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-[#151d2e] flex items-center justify-center text-slate-700 dark:text-[#f1f5f9] font-bold text-xs select-none border border-slate-200 dark:border-[#1e293b]">
              {user?.full_name?.slice(0, 1).toUpperCase() || 'U'}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center space-x-3">
                <div className="h-9 w-9 rounded-full bg-blue-600/10 dark:bg-blue-500/15 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs shrink-0 select-none">
                  {user?.full_name?.slice(0, 2).toUpperCase() || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-900 dark:text-[#f1f5f9] truncate">
                    {user?.full_name}
                  </p>
                  <p className="text-xxs text-slate-500 dark:text-[#64748b] truncate">
                    {user?.email}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 pt-0.5">{getRoleBadge()}</div>
            </div>
          )}
        </div>

        {/* Navigation Section Title */}
        {!isCollapsed && (
          <div className="px-4 pt-4 pb-1 text-xxs font-semibold uppercase tracking-wider text-slate-400 dark:text-[#64748b]">
            Platform Menu
          </div>
        )}

        {/* Navigation Menu */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 text-xs font-medium rounded-md transition-colors ${isActive
                  ? 'bg-blue-50 text-blue-600 dark:bg-[#1a253a] dark:text-[#f1f5f9] border-l-2 border-blue-500 font-semibold'
                  : 'text-slate-600 dark:text-[#8896ab] hover:bg-slate-100/60 dark:hover:bg-[#151d2e] hover:text-slate-900 dark:hover:text-[#f1f5f9]'
                } ${isCollapsed ? 'justify-center px-0' : ''}`
              }
              title={isCollapsed ? item.label : undefined}
            >
              <span className="shrink-0">{item.icon}</span>
              {!isCollapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Sidebar Footer (Logout) */}
        <div className="p-3 border-t border-slate-200 dark:border-[#1e293b] dark:bg-[#090d17] shrink-0">
          <Button
            variant="ghost"
            onClick={handleLogout}
            className={`w-full flex items-center gap-3 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30 ${isCollapsed ? 'justify-center px-0' : 'justify-start'
              }`}
            title={isCollapsed ? 'Logout' : undefined}
          >
            <LogOut size={16} />
            {!isCollapsed && <span className="text-xs font-semibold">Sign Out</span>}
          </Button>
        </div>
      </aside>
    </>
  );
};
