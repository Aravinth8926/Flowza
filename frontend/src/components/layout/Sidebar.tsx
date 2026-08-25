import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth';
import { useSidebarStore } from '../../store/sidebar';
import {
  LayoutDashboard,
  User as UserIcon,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Inbox,
  PlusCircle,
  Package,
  ShoppingCart,
  BarChart2,
  ShieldCheck,
  FileText,
  Bell,
  Sparkles,
  X,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { FlowzaLogo } from '../common/FlowzaLogo';

export const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { isCollapsed, isOpen, toggleCollapse, close } = useSidebarStore();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const roleName = user?.role?.name || 'vendor';

  const getRoleBadge = () => {
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

  const menuItems = [
    {
      label: 'Overview',
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
          label: 'Sales Invoices',
          path: '/dashboard/supplier/invoices',
          icon: <FileText size={18} />,
        },
        {
          label: 'Product Catalog',
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
          label: 'Direct PO Request',
          path: '/dashboard/vendor/orders/new',
          icon: <PlusCircle size={18} />,
        },
        {
          label: 'Order History',
          path: '/dashboard/vendor/orders',
          icon: <Inbox size={18} />,
        },
        {
          label: 'Invoices & Billing',
          path: '/dashboard/vendor/invoices',
          icon: <FileText size={18} />,
        },
      ]
      : []),
    ...(roleName === 'admin'
      ? [
        {
          label: 'Platform Audit',
          path: '/dashboard/admin',
          icon: <ShieldCheck size={18} />,
        },
      ]
      : []),
    {
      label: 'Flowza AI Assistant',
      path: '/assistant',
      icon: <Sparkles size={18} className="text-emerald-500" />,
      highlight: true,
    },
    {
      label: 'Notifications',
      path: '/notifications',
      icon: <Bell size={18} />,
    },
    {
      label: 'Organization Profile',
      path: '/profile',
      icon: <UserIcon size={18} />,
    },
  ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          onClick={close}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Enclosure */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col justify-between bg-white dark:bg-[#0A0C10] border-r border-slate-200/80 dark:border-slate-800/80 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isCollapsed ? 'w-[72px]' : 'w-64'
        } ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Top Header */}
        <div>
          <div className="h-16 px-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/60">
            <div className="flex items-center space-x-3 overflow-hidden">
              <FlowzaLogo size="xs" showText={!isCollapsed} />
            </div>

            {/* Mobile Close Button */}
            <button
              onClick={close}
              className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* User Role Pill */}
          {!isCollapsed && (
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Role Access</span>
              {getRoleBadge()}
            </div>
          )}

          {/* Navigation Links */}
          <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100dvh-200px)]">
            {menuItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => {
                  if (window.innerWidth < 1024) close();
                }}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs md:text-sm font-medium transition-all group cursor-pointer ${
                    isActive
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/80 dark:hover:bg-slate-800/60'
                  } ${isCollapsed ? 'justify-center px-2' : ''}`
                }
              >
                <span className="shrink-0 transition-transform group-hover:scale-105">
                  {item.icon}
                </span>
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Footer & Collapse Toggle */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800/60 space-y-2">
          {/* Collapse Button (Desktop Only) */}
          <button
            onClick={toggleCollapse}
            className="hidden lg:flex w-full items-center justify-center gap-2 p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 text-xs font-medium cursor-pointer transition-colors"
          >
            {isCollapsed ? <ChevronRight size={16} /> : <><ChevronLeft size={16} /><span>Collapse</span></>}
          </button>

          {/* Sign Out Button */}
          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs md:text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer ${
              isCollapsed ? 'justify-center px-2' : ''
            }`}
          >
            <LogOut size={16} />
            {!isCollapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>
    </>
  );
};
