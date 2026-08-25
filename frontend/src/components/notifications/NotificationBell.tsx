import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  Check,
  CheckCheck,
  ShoppingBag,
  Truck,
  Receipt,
  CreditCard,
  AlertTriangle,
  Package,
  Info,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { notificationService } from '../../services/notificationService';
import { NotificationItem, NotificationType } from '../../types';

function formatTimeAgo(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

function getNotificationIcon(type: NotificationType) {
  switch (type) {
    case 'ORDER_CREATED':
    case 'ORDER_ACCEPTED':
    case 'ORDER_PROCESSING':
      return <ShoppingBag className="w-4 h-4 text-emerald-500" />;
    case 'ORDER_PACKED':
    case 'ORDER_SHIPPED':
      return <Truck className="w-4 h-4 text-indigo-500" />;
    case 'ORDER_DELIVERED':
    case 'ORDER_COMPLETED':
      return <Check className="w-4 h-4 text-emerald-600" />;
    case 'ORDER_REJECTED':
    case 'ORDER_CANCELLED':
      return <AlertTriangle className="w-4 h-4 text-rose-500" />;
    case 'INVOICE_GENERATED':
      return <Receipt className="w-4 h-4 text-blue-500" />;
    case 'PAYMENT_RECORDED':
    case 'PAYMENT_COMPLETED':
      return <CreditCard className="w-4 h-4 text-violet-500" />;
    case 'INVENTORY_LOW_STOCK':
    case 'INVENTORY_OUT_OF_STOCK':
      return <Package className="w-4 h-4 text-amber-500" />;
    default:
      return <Info className="w-4 h-4 text-slate-500" />;
  }
}

function getNavigationRoute(item: NotificationItem): string {
  if (item.entity_type === 'ORDER') {
    return '/orders';
  }
  if (item.entity_type === 'INVOICE') {
    return '/invoices';
  }
  if (item.entity_type === 'INVENTORY') {
    return '/inventory';
  }
  return '/notifications';
}

export const NotificationBell: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Fetch unread count
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: () => notificationService.getUnreadCount(),
    refetchInterval: 30000,
  });

  // Fetch latest 5 notifications
  const { data: notifData, isLoading } = useQuery({
    queryKey: ['notifications-bell-preview'],
    queryFn: () => notificationService.getNotifications({ page: 1, limit: 5 }),
    enabled: isOpen,
  });

  // Mark single as read mutation
  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationService.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-bell-preview'] });
    },
  });

  // Mark all as read mutation
  const markAllReadMutation = useMutation({
    mutationFn: () => notificationService.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-bell-preview'] });
    },
  });

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleItemClick = (item: NotificationItem) => {
    if (!item.is_read) {
      markReadMutation.mutate(item.id);
    }
    setIsOpen(false);
    navigate(getNavigationRoute(item));
  };

  const notifications = notifData?.items || [];

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer border border-slate-200/80 dark:border-slate-800 focus:outline-none"
        title="Notifications"
        aria-label="View notifications"
      >
        <Bell size={16} className={unreadCount > 0 ? 'text-emerald-600 dark:text-emerald-400' : ''} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-bold text-white shadow-sm ring-2 ring-white dark:ring-slate-950 animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl p-0 glass-panel shadow-2xl border border-slate-200 dark:border-slate-800 z-50 animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
          {/* Header */}
          <div className="p-3.5 bg-white/50 dark:bg-slate-900/50 border-b border-slate-200/70 dark:border-slate-800/70 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white font-heading tracking-wide uppercase">
                Notifications
              </h3>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  {unreadCount} unread
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllReadMutation.mutate()}
                disabled={markAllReadMutation.isPending}
                className="text-[11px] font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50"
              >
                <CheckCheck size={13} />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* List Area */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
            {isLoading ? (
              <div className="p-6 text-center text-xs text-slate-400">Loading notifications...</div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-10 h-10 mx-auto rounded-full bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center text-slate-400 mb-2">
                  <Bell size={18} />
                </div>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">All caught up!</p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">No notifications right now.</p>
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  className={`p-3.5 flex items-start gap-3 hover:bg-slate-50/80 dark:hover:bg-slate-800/50 cursor-pointer transition-colors relative ${
                    !item.is_read ? 'bg-emerald-50/30 dark:bg-emerald-950/10' : ''
                  }`}
                >
                  {/* Category Icon */}
                  <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 shrink-0 mt-0.5 border border-slate-200/50 dark:border-slate-700/50">
                    {getNotificationIcon(item.type)}
                  </div>

                  {/* Body */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {item.title}
                      </p>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 shrink-0 font-mono">
                        {formatTimeAgo(item.created_at)}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                      {item.message}
                    </p>
                  </div>

                  {/* Unread indicator dot */}
                  {!item.is_read && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 mt-1.5 ring-2 ring-white dark:ring-slate-900" />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 bg-slate-50/70 dark:bg-slate-900/70 border-t border-slate-200/70 dark:border-slate-800/70 text-center">
            <Link
              to="/notifications"
              onClick={() => setIsOpen(false)}
              className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 flex items-center justify-center gap-1.5 transition-colors py-1"
            >
              <span>View all notifications</span>
              <ChevronRight size={13} />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};
