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
  ShoppingCart,
  BarChart2,
  ShieldCheck,
  Activity,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

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
    const variants: Record<string, 'destructive' | 'indigo' | 'emerald'> = {
      admin: 'destructive',
      vendor: 'indigo',
      supplier: 'emerald',
    };
    return (
      <Badge variant={variants[roleName] || 'emerald'} dot className="uppercase text-[10px]">
        {roleName}
      </Badge>
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
          label: 'My Catalog',
          path: '/dashboard/supplier/products',
          icon: <Package size={18} />,
        },
        {
          label: 'Inventory Control',
          path: '/dashboard/supplier/inventory',
          icon: <BarChart2 size={18} />,
        },
      ]
      : []),
    ...(roleName === 'vendor'
      ? [
        {
          label: 'Wholesale Catalog',
          path: '/dashboard/vendor/products',
          icon: <Package size={18} />,
        },
        {
          label: 'Procurement Cart',
          path: '/dashboard/vendor/cart',
          icon: <ShoppingCart size={18} />,
        },
        {
          label: 'Create Order Request',
          path: '/dashboard/vendor/orders/new',
          icon: <PlusCircle size={18} />,
        },
        {
          label: 'My Orders',
          path: '/dashboard/vendor/orders',
          icon: <ShoppingBag size={18} />,
        },
      ]
      : []),
    {
      label: 'Profile',
      path: '/profile',
      icon: <UserIcon size={18} />,
    },
    {
      label: 'System Settings',
      path: '/settings',
      icon: <SettingsIcon size={18} />,
    },
  ];

  return (
    <>
      {/* Mobile Sidebar Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-950/70 backdrop-blur-md md:hidden"
          onClick={close}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-30 flex flex-col bg-white dark:bg-slate-950/90 backdrop-blur-xl border-r border-slate-200 dark:border-slate-800/80 transition-all duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } ${isCollapsed ? 'w-20' : 'w-64'}`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-slate-200 dark:border-slate-800/80 shrink-0">
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center text-white font-extrabold text-lg shrink-0 shadow-lg shadow-emerald-500/20 border border-emerald-300/30">
              F
            </div>
            {!isCollapsed && (
              <div className="flex flex-col">
                <span className="font-heading text-lg font-bold tracking-tight text-slate-900 dark:text-white leading-none">
                  Flowza
                </span>
                <span className="text-[10px] font-mono font-medium tracking-wider uppercase text-emerald-600 dark:text-emerald-400">
                  Precision Procurement
                </span>
              </div>
            )}
          </div>
          <button
            onClick={toggleCollapse}
            className="hidden md:flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer transition-all hover:scale-105"
          >
            {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        {/* User Card */}
        <div className={`p-4 border-b border-slate-100 dark:border-slate-800/60 ${isCollapsed ? 'flex justify-center' : ''}`}>
          {isCollapsed ? (
            <div className="h-9 w-9 rounded-xl bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-xs select-none border border-slate-200 dark:border-slate-800">
              {user?.full_name?.slice(0, 1).toUpperCase() || 'U'}
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-sm shrink-0 select-none shadow-sm">
                  {user?.full_name?.slice(0, 2).toUpperCase() || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate font-heading">
                    {user?.full_name}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate font-mono">
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
          <div className="px-4 pt-4 pb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-400 font-heading">
            Platform Operations
          </div>
        )}

        {/* Navigation Menu */}
        <nav className="flex-1 px-3 py-2 space-y-1.5 overflow-y-auto">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 text-xs font-semibold rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 shadow-sm font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900/60 hover:text-slate-900 dark:hover:text-white'
                } ${isCollapsed ? 'justify-center px-0' : ''}`
              }
              title={isCollapsed ? item.label : undefined}
            >
              <span className="shrink-0">{item.icon}</span>
              {!isCollapsed && <span className="font-heading tracking-tight">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Operational Status Indicator */}
        {!isCollapsed && (
          <div className="px-4 py-2 mx-3 mb-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-[11px]">
            <span className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-mono">
              <Activity size={12} className="text-emerald-500 animate-pulse" />
              API Engine
            </span>
            <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">100% ONLINE</span>
          </div>
        )}

        {/* Sidebar Footer (Logout) */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800/80 shrink-0">
          <Button
            variant="ghost"
            onClick={handleLogout}
            className={`w-full flex items-center gap-3 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30 ${
              isCollapsed ? 'justify-center px-0' : 'justify-start'
            }`}
            title={isCollapsed ? 'Logout' : undefined}
          >
            <LogOut size={16} />
            {!isCollapsed && <span className="text-xs font-semibold font-heading">Sign Out</span>}
          </Button>
        </div>
      </aside>
    </>
  );
};

