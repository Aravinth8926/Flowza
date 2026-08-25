import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  Search,
  Filter,
  ShoppingBag,
  Truck,
  Receipt,
  CreditCard,
  Package,
  AlertTriangle,
  Info,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { notificationService } from '../services/notificationService';
import { NotificationItem, NotificationType } from '../types';

function formatTimestamp(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function getNotificationIcon(type: NotificationType) {
  switch (type) {
    case 'ORDER_CREATED':
    case 'ORDER_ACCEPTED':
    case 'ORDER_PROCESSING':
      return <ShoppingBag className="w-5 h-5 text-emerald-500" />;
    case 'ORDER_PACKED':
    case 'ORDER_SHIPPED':
      return <Truck className="w-5 h-5 text-indigo-500" />;
    case 'ORDER_DELIVERED':
    case 'ORDER_COMPLETED':
      return <Check className="w-5 h-5 text-emerald-600" />;
    case 'ORDER_REJECTED':
    case 'ORDER_CANCELLED':
      return <AlertTriangle className="w-5 h-5 text-rose-500" />;
    case 'INVOICE_GENERATED':
      return <Receipt className="w-5 h-5 text-blue-500" />;
    case 'PAYMENT_RECORDED':
    case 'PAYMENT_COMPLETED':
      return <CreditCard className="w-5 h-5 text-violet-500" />;
    case 'INVENTORY_LOW_STOCK':
    case 'INVENTORY_OUT_OF_STOCK':
      return <Package className="w-5 h-5 text-amber-500" />;
    default:
      return <Info className="w-5 h-5 text-slate-500" />;
  }
}

function getPriorityBadge(priority: string) {
  switch (priority.toLowerCase()) {
    case 'urgent':
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-800">
          Urgent
        </span>
      );
    case 'high':
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800">
          High
        </span>
      );
    default:
      return null;
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

type TabKey = 'ALL' | 'UNREAD' | 'ORDER' | 'FINANCIAL' | 'INVENTORY' | 'SYSTEM';

export const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<TabKey>('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 15;

  // Compute filters
  let isReadFilter: boolean | undefined = undefined;
  let typeFilter: string | undefined = undefined;

  if (activeTab === 'UNREAD') {
    isReadFilter = false;
  } else if (activeTab === 'ORDER') {
    typeFilter = 'ORDER';
  } else if (activeTab === 'FINANCIAL') {
    typeFilter = 'INVOICE,PAYMENT';
  } else if (activeTab === 'INVENTORY') {
    typeFilter = 'INVENTORY';
  } else if (activeTab === 'SYSTEM') {
    typeFilter = 'SYSTEM';
  }

  // Fetch notifications
  const { data, isLoading } = useQuery({
    queryKey: ['notifications', { page, is_read: isReadFilter, type: typeFilter, search }],
    queryFn: () =>
      notificationService.getNotifications({
        page,
        limit,
        is_read: isReadFilter,
        type: typeFilter,
        search: search.trim() || undefined,
      }),
  });

  // Fetch unread count
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: () => notificationService.getUnreadCount(),
  });

  // Mutations
  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationService.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-bell-preview'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationService.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-bell-preview'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => notificationService.deleteNotification(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-bell-preview'] });
    },
  });

  const items = data?.items || [];
  const pagination = data?.pagination || { page: 1, limit, total: 0, total_pages: 0 };

  const tabs: { key: TabKey; label: string; count?: number }[] = [
    { key: 'ALL', label: 'All Notifications' },
    { key: 'UNREAD', label: 'Unread', count: unreadCount },
    { key: 'ORDER', label: 'Orders' },
    { key: 'FINANCIAL', label: 'Invoices & Payments' },
    { key: 'INVENTORY', label: 'Stock Alerts' },
    { key: 'SYSTEM', label: 'System' },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white font-heading tracking-tight">
              Notification Center
            </h1>
            {unreadCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                {unreadCount} unread
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Real-time business updates across orders, invoices, payments, and warehouse inventory.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending}
            className="self-start sm:self-auto px-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2 shadow-sm cursor-pointer transition-colors disabled:opacity-50"
          >
            <CheckCheck size={15} className="text-emerald-500" />
            <span>Mark all as read</span>
          </button>
        )}
      </div>

      {/* Tabs & Search Filter Bar */}
      <div className="glass-panel p-2 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Tab Buttons */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Search Box */}
        <div className="relative min-w-[240px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search notifications..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl text-xs bg-slate-100/80 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-slate-900 dark:text-slate-100"
          />
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-2.5">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-400 glass-panel rounded-2xl">
            Loading notifications...
          </div>
        ) : items.length === 0 ? (
          <div className="p-16 text-center glass-panel rounded-2xl border border-slate-200/80 dark:border-slate-800/80">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
              <Sparkles size={24} />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white font-heading">
              No notifications found
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              You are up to date! All activity and business lifecycle alerts will appear here.
            </p>
          </div>
        ) : (
          items.map((item) => {
            const hasEntity = Boolean(item.entity_type && item.entity_id);
            const route = getNavigationRoute(item);

            return (
              <div
                key={item.id}
                className={`glass-panel p-4 rounded-2xl border transition-all duration-150 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  !item.is_read
                    ? 'border-emerald-500/40 bg-emerald-50/20 dark:bg-emerald-950/10 shadow-sm'
                    : 'border-slate-200/80 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                {/* Left content */}
                <div className="flex items-start gap-3.5 flex-1 min-w-0">
                  {/* Category icon */}
                  <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 shrink-0 mt-0.5">
                    {getNotificationIcon(item.type)}
                  </div>

                  {/* Body text */}
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4
                        onClick={() => {
                          if (hasEntity) {
                            if (!item.is_read) markReadMutation.mutate(item.id);
                            navigate(route);
                          }
                        }}
                        className={`text-xs font-bold text-slate-900 dark:text-white truncate ${
                          hasEntity ? 'cursor-pointer hover:text-emerald-600 dark:hover:text-emerald-400' : ''
                        }`}
                      >
                        {item.title}
                      </h4>
                      {getPriorityBadge(item.priority)}
                      {!item.is_read && (
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                      )}
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      {item.message}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                      <span>{formatTimestamp(item.created_at)}</span>
                      {item.entity_type && (
                        <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 font-bold uppercase text-[9px]">
                          {item.entity_type}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  {hasEntity && (
                    <button
                      onClick={() => {
                        if (!item.is_read) markReadMutation.mutate(item.id);
                        navigate(route);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-400 text-xs font-bold flex items-center gap-1.5 border border-emerald-200 dark:border-emerald-800 cursor-pointer transition-colors"
                    >
                      <span>View</span>
                      <ExternalLink size={12} />
                    </button>
                  )}

                  {!item.is_read ? (
                    <button
                      onClick={() => markReadMutation.mutate(item.id)}
                      disabled={markReadMutation.isPending}
                      className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-800 cursor-pointer transition-colors"
                      title="Mark as read"
                    >
                      <Check size={14} />
                    </button>
                  ) : null}

                  <button
                    onClick={() => deleteMutation.mutate(item.id)}
                    disabled={deleteMutation.isPending}
                    className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-rose-50 dark:hover:bg-rose-950/50 hover:text-rose-600 dark:hover:text-rose-400 text-slate-400 border border-slate-200/80 dark:border-slate-800 cursor-pointer transition-colors"
                    title="Delete notification"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination Controls */}
      {pagination.total_pages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-slate-200/80 dark:border-slate-800/80">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
            Showing Page {pagination.page} of {pagination.total_pages} ({pagination.total} total)
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1 transition-colors"
            >
              <ChevronLeft size={14} />
              <span>Previous</span>
            </button>
            <button
              onClick={() => setPage((prev) => Math.min(prev + 1, pagination.total_pages))}
              disabled={page >= pagination.total_pages}
              className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1 transition-colors"
            >
              <span>Next</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
