import React from 'react';
import { useCustomer } from '../../context/CustomerContext';
import { useApp } from '../../context/AppContext';
import { SectionCard, Badge, statusTone } from '../../components/dashboard/DashboardUI';
import type { DashboardTab } from '../../components/dashboard/DashboardLayout';
import {
  Package, Heart, ShoppingCart, BadgeIndianRupee, Ticket,
  ArrowRight, ChevronRight,
} from 'lucide-react';
import { motion } from 'framer-motion';

export const OverviewPage: React.FC<{ onNavigate: (t: DashboardTab) => void }> = ({ onNavigate }) => {
  const { profile, points, notifications, coupons, unread, wishlist } = useCustomer();
  const { cart, orders } = useApp();

  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);
  const recentOrders = [...orders].slice(0, 3);
  const activeCoupons = coupons.filter((c) => c.state === 'available').slice(0, 3);
  const recentNotifs = notifications.slice(0, 3);

  const stats = [
    { icon: <Package className="w-5 h-5 text-brand-blue" />, label: 'Orders', value: String(orders.length), onClick: () => onNavigate('orders') },
    { icon: <Heart className="w-5 h-5 text-red-500" />, label: 'Wishlist', value: String(wishlist.length), onClick: () => onNavigate('wishlist') },
    { icon: <ShoppingCart className="w-5 h-5 text-emerald-600" />, label: 'Cart', value: String(cartCount), onClick: () => onNavigate('cart') },
    { icon: <BadgeIndianRupee className="w-5 h-5 text-indigo-600" />, label: 'Points', value: points.toLocaleString('en-IN'), onClick: () => onNavigate('coupons') },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-brand-blue to-blue-800 rounded-2xl p-8 text-white shadow-premium relative overflow-hidden">
        <div className="relative z-10">
          <h1 className="text-2xl font-black font-heading mb-2">Welcome back, {profile.name?.split(' ')[0] || 'User'}!</h1>
          <p className="text-blue-100 text-sm font-medium max-w-md">Manage your orders, track deliveries, and discover new products curated just for you.</p>
        </div>
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/5 skew-x-12 translate-x-1/4" />
        <div className="absolute right-12 top-0 bottom-0 w-1/4 bg-white/5 skew-x-12 translate-x-1/2" />
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <motion.button 
            key={i} 
            type="button" 
            onClick={s.onClick} 
            whileHover={{ y: -2 }}
            className="bg-white rounded-2xl p-5 shadow-soft border border-brand-border/60 flex flex-col items-center justify-center gap-3 hover:border-brand-blue/30 transition-all text-center group"
          >
            <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center transition-transform group-hover:scale-110 group-hover:bg-blue-50">
              {s.icon}
            </div>
            <div>
              <p className="text-xl font-bold text-brand-graphite font-numbers leading-none">{s.value}</p>
              <p className="text-xs text-brand-slate font-bold mt-1 group-hover:text-brand-blue transition-colors">{s.label}</p>
            </div>
          </motion.button>
        ))}
      </div>



      {/* Recent Orders */}
      <SectionCard
        title="Recent Orders"
        subtitle="Your latest purchases"
        action={<button onClick={() => onNavigate('orders')} className="text-xs font-bold text-brand-blue inline-flex items-center gap-1">View all <ArrowRight className="w-3 h-3" /></button>}
      >
        {recentOrders.length === 0 ? (
          <p className="text-sm text-brand-slate font-medium">No orders placed yet. Head to the store to start shopping.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {recentOrders.map((o) => {
              const firstItem = o.items?.[0];
              const productTitle = o.items?.map(it => it.product?.title).filter(Boolean).join(', ') || o.orderNumber || 'Product Order';
              const firstImage = firstItem?.product?.image;
              const isService = o.vertical === 'services';
              const statusText = isService && ((o.status as string) === 'placed' || (o.status as string) === 'pending')
                ? 'Service Booked'
                : o.status === 'placed'
                ? 'Order Placed'
                : o.status;

              return (
                <div 
                  key={o.id} 
                  onClick={() => onNavigate('orders')}
                  className="border border-brand-border rounded-card p-3.5 flex flex-col justify-between gap-3 hover:border-brand-blue/40 hover:shadow-soft transition-all cursor-pointer bg-white group text-left"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 border border-brand-border/60 overflow-hidden flex-shrink-0 flex items-center justify-center">
                      {firstImage ? (
                        <img src={firstImage} alt={productTitle} className="w-full h-full object-cover" />
                      ) : (
                        <Package className="w-5 h-5 text-brand-blue" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-brand-graphite truncate group-hover:text-brand-blue transition-colors">
                        {productTitle}
                      </p>
                      <p className="text-[11px] text-brand-slate mt-0.5">
                        {isService ? 'Booking' : 'Order'} {o.orderNumber || o.id.slice(0, 12)} · {o.date}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-brand-border/50 text-xs">
                    <span className="font-extrabold text-brand-graphite font-numbers">
                      ₹{o.total.toLocaleString('en-IN')}{' '}
                      <span className="text-[11px] font-medium text-brand-slate">
                        · {o.items.length} {o.items.length === 1 ? 'item' : 'items'}
                      </span>
                    </span>
                    <Badge tone={statusTone(o.status)}>{statusText}</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      {/* Active Coupons + Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SectionCard title="Active Coupons" subtitle="Available to redeem" action={<button onClick={() => onNavigate('coupons')} className="text-xs font-bold text-brand-blue inline-flex items-center gap-1">All <ChevronRight className="w-3 h-3" /></button>}>
          <div className="flex flex-col gap-2.5">
            {activeCoupons.map((c) => (
              <div key={c.id} className="flex items-center justify-between border border-dashed border-brand-border rounded-xl px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-brand-orange/10 flex items-center justify-center text-brand-orange"><Ticket className="w-4 h-4" /></div>
                  <div>
                    <p className="text-xs font-extrabold font-numbers text-brand-graphite">{c.code}</p>
                    <p className="text-xs text-brand-slate">{c.title}</p>
                  </div>
                </div>
                <span className="text-xs text-brand-orange font-bold">-{c.discountValue}{c.discountType === 'PERCENTAGE' ? '%' : ''}</span>
              </div>
            ))}
            {activeCoupons.length === 0 && <p className="text-xs text-brand-slate">No active coupons.</p>}
          </div>
        </SectionCard>

        <SectionCard
          title="Recent Notifications"
          subtitle={`${unread} unread`}
          action={<button onClick={() => onNavigate('notifications')} className="text-xs font-bold text-brand-blue inline-flex items-center gap-1">View all <ChevronRight className="w-3 h-3" /></button>}
        >
          <div className="flex flex-col gap-3">
            {recentNotifs.map((n) => (
              <div key={n.id} className="flex items-start gap-3">
                <div className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${n.isRead ? 'bg-slate-200' : 'bg-brand-blue'}`} />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-brand-graphite">{n.title}</p>
                  <p className="text-xs text-brand-slate line-clamp-1">{n.message}</p>
                </div>
              </div>
            ))}
            {notifications.length === 0 && <p className="text-xs text-brand-slate">No notifications.</p>}
          </div>
        </SectionCard>
      </div>
    </div>
  );
};