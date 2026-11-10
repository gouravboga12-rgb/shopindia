import React, { useState } from 'react';
import { useCustomer } from '../../context/CustomerContext';
import { PageHeader, EmptyState, Badge } from '../../components/dashboard/DashboardUI';
import { Bell, CheckCheck, Trash2, Package, Truck, Tag, Percent, TrendingDown, PackagePlus } from 'lucide-react';
import type { NotificationCategory } from '../../data/dashboardTypes';

const CAT_META: Record<NotificationCategory, { label: string; icon: React.ReactNode; tone: string }> = {
  order: { label: 'Order Updates', icon: <Package className="w-3.5 h-3.5" />, tone: 'blue' },
  shipping: { label: 'Shipping Updates', icon: <Truck className="w-3.5 h-3.5" />, tone: 'green' },
  promotion: { label: 'Promotions', icon: <Tag className="w-3.5 h-3.5" />, tone: 'purple' },
  coupon: { label: 'Coupons', icon: <Percent className="w-3.5 h-3.5" />, tone: 'amber' },
  price_drop: { label: 'Price Drops', icon: <TrendingDown className="w-3.5 h-3.5" />, tone: 'red' },
  stock: { label: 'Stock Alerts', icon: <PackagePlus className="w-3.5 h-3.5" />, tone: 'emerald' },
};

const FILTERS: ('all' | NotificationCategory)[] = ['all', 'order', 'shipping', 'promotion', 'coupon', 'price_drop', 'stock'];

export const NotificationsPage: React.FC = () => {
  const {
    notifications,
    unread,
    markNotificationRead,
    markAllNotificationsRead,
    removeNotification,
    clearAllNotifications,
  } = useCustomer();
  const [filter, setFilter] = useState<'all' | NotificationCategory>('all');

  const filtered = filter === 'all' ? notifications : notifications.filter((n) => n.category === filter);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        subtitle={`${unread} unread notification${unread === 1 ? '' : 's'}`}
        actions={
          <div className="flex items-center gap-2">
            {unread > 0 && (
              <button
                onClick={markAllNotificationsRead}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-button text-xs font-bold text-brand-graphite cursor-pointer transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" /> Mark all read
              </button>
            )}
            {notifications.length > 0 && (
              <button
                onClick={clearAllNotifications}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-button text-xs font-bold cursor-pointer transition-colors"
                title="Clear all notifications"
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear all
              </button>
            )}
          </div>
        }
      />

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {FILTERS.map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition-colors ${filter === f ? 'bg-brand-blue text-white border-brand-blue' : 'bg-white border-brand-border text-brand-slate hover:border-brand-blue/40'}`}>
            {f === 'all' ? 'All' : CAT_META[f as NotificationCategory].label}
          </button>
        ))}
      </div>

      {filtered.length === 0 && <EmptyState icon={<Bell className="w-6 h-6" />} title="No notifications" message="You're all caught up." />}

      <div className="flex flex-col gap-2.5">
        {filtered.map((n) => {
          const meta = CAT_META[n.category];
          return (
            <div key={n.id} onClick={() => !n.isRead && markNotificationRead(n.id)} className={`bg-white border rounded-card shadow-premium p-4 flex items-start gap-3 cursor-pointer transition-colors ${n.isRead ? 'border-brand-border opacity-75' : 'border-brand-blue/20 bg-blue-50/20'}`}>
              <div className="w-9 h-9 rounded-xl bg-brand-blue/5 text-brand-blue flex items-center justify-center flex-shrink-0">{meta.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-bold text-brand-graphite">{n.title}</p>
                  {!n.isRead && <span className="w-2 h-2 rounded-full bg-brand-blue flex-shrink-0" />}
                </div>
                <p className="text-xs text-brand-slate mt-0.5">{n.message}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <Badge tone="slate">{meta.label}</Badge>
                  <span className="text-xs text-brand-slate">{new Date(n.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
              <button onClick={(e) => { e.stopPropagation(); removeNotification(n.id); }} aria-label="Delete notification" className="p-1.5 rounded-lg text-brand-slate hover:bg-red-50 hover:text-red-500 flex-shrink-0">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
