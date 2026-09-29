import React, { useState } from 'react';
import { useCustomer } from '../../context/CustomerContext';
import { useApp } from '../../context/AppContext';
import {
  LayoutDashboard, Package, Heart, ShoppingCart, Star, MapPin, CreditCard,
  Bell, TicketPercent, History, UserCog, ShieldCheck, Headphones, LogOut,
  Menu, X, Clock,
} from 'lucide-react';
import { clearCustomerSession } from '../../lib/customerAuth';
import { motion, AnimatePresence } from 'framer-motion';

export type DashboardTab =
  | 'overview' | 'orders' | 'wishlist' | 'cart' | 'saved' | 'addresses' | 'payments'
  | 'notifications' | 'reviews' | 'coupons' | 'recently-viewed' | 'profile' | 'security' | 'support';

const NAV: { id: DashboardTab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'orders', label: 'Orders', icon: Package },
  { id: 'wishlist', label: 'Wishlist', icon: Heart },
  { id: 'cart', label: 'Cart', icon: ShoppingCart },
  { id: 'saved', label: 'Saved For Later', icon: Clock },
  { id: 'recently-viewed', label: 'Recently Viewed', icon: History },
  { id: 'addresses', label: 'Addresses', icon: MapPin },
  { id: 'payments', label: 'Payment Methods', icon: CreditCard },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'reviews', label: 'Reviews & Ratings', icon: Star },
  { id: 'coupons', label: 'Coupons & Rewards', icon: TicketPercent },
  { id: 'profile', label: 'Profile Settings', icon: UserCog },
  { id: 'security', label: 'Security', icon: ShieldCheck },
  { id: 'support', label: 'Support Center', icon: Headphones },
];

export const DashboardLayout: React.FC<{ activeTab: DashboardTab; onTabChange: (t: DashboardTab) => void; children: React.ReactNode }> = ({ activeTab, onTabChange, children }) => {
  const { unread, wishlist, profile, isLoading } = useCustomer();
  const { cart } = useApp();
  const [drawer, setDrawer] = useState(false);


  const counts: Partial<Record<DashboardTab, number>> = {
    cart: cart.length,
    wishlist: wishlist.length,
    notifications: unread,
  };

  const handleSelect = (t: DashboardTab) => {
    onTabChange(t);
    setDrawer(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-brand-graphite flex flex-col font-sans">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 pt-24 pb-28 lg:py-8 flex flex-col lg:flex-row gap-8 flex-1">
        
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex w-64 flex-col self-start sticky top-8">
          
          {/* User Profile Card */}
          <div className="bg-white border border-brand-border/80 rounded-2xl p-5 mb-5 shadow-soft flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-brand-blue/10 flex items-center justify-center text-brand-blue font-black uppercase text-xl">
              {profile.name?.[0] || 'U'}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-extrabold text-brand-graphite truncate font-heading">{profile.name}</p>
              <p className="text-xs font-bold text-brand-slate uppercase tracking-wider truncate mt-0.5">{profile.email}</p>
            </div>
          </div>

          {/* Navigation Menu */}
          <nav className="bg-white border border-brand-border/80 rounded-2xl p-3 shadow-soft flex flex-col space-y-0.5">
            {NAV.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              const badge = counts[item.id];
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all relative ${
                    active 
                      ? 'bg-blue-50 text-brand-blue' 
                      : 'text-brand-slate hover:bg-slate-50 hover:text-brand-graphite'
                  }`}
                >
                  <Icon size={16} strokeWidth={active ? 2.5 : 2} />
                  <span className="flex-1 text-left">{item.label}</span>
                  {badge ? (
                    <span className="min-w-[20px] h-[20px] px-1.5 rounded-full bg-brand-red text-white text-[11px] font-black flex items-center justify-center shrink-0">
                      {badge}
                    </span>
                  ) : null}
                </button>
              );
            })}
            
            <div className="h-px bg-brand-border/60 my-2 mx-4" />
            
            <button
              onClick={() => {
                clearCustomerSession();
                window.location.href = '/';
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold text-brand-red hover:bg-red-50 transition-all"
            >
              <LogOut size={16} strokeWidth={2} /> 
              <span className="flex-1 text-left">Logout</span>
            </button>
          </nav>
        </aside>

      {/* Mobile Topbar */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-40 bg-[#0F2C59] text-white flex items-center justify-between px-4 py-3.5 shadow-premium">
        <div className="flex items-center gap-3">
          <button onClick={() => setDrawer(true)} aria-label="Open menu" className="p-1">
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center text-xs font-black">SI</div>
            <span className="font-black text-sm font-heading">My Account</span>
          </div>
        </div>
        <button onClick={() => (window.location.href = '/')} aria-label="Back to store" className="p-1.5 bg-white/10 rounded-full">
          <X size={18} />
        </button>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {drawer && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDrawer(false)} className="lg:hidden fixed inset-0 bg-black/50 z-40 backdrop-blur-sm" />
            <motion.aside
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 220 }}
              className="lg:hidden fixed inset-y-0 left-0 w-72 bg-[#0F2C59] text-white z-50 flex flex-col shadow-elevated"
            >
              <div className="p-5 border-b border-white/10 flex items-center justify-between">
                <div>
                  <h2 className="font-black font-heading">ShopIndia</h2>
                  <p className="text-xs text-white/50">My Account</p>
                </div>
                <button onClick={() => setDrawer(false)} aria-label="Close menu" className="p-1"><X size={18} /></button>
              </div>
              <nav className="flex-1 overflow-y-auto p-3 space-y-0.5 no-scrollbar">
                {NAV.map((item) => {
                  const Icon = item.icon;
                  const badge = counts[item.id];
                  return (
                    <button key={item.id} onClick={() => handleSelect(item.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                        activeTab === item.id ? 'bg-white/15 text-white font-semibold' : 'text-white/70 hover:bg-white/5 hover:text-white'
                      }`}>
                      <Icon className="w-4 h-4" />
                      <span className="flex-1 text-left">{item.label}</span>
                      {badge ? <span className="min-w-[20px] h-[20px] px-1.5 rounded-full bg-red-500 text-[11px] font-black flex items-center justify-center shrink-0">{badge}</span> : null}
                    </button>
                  );
                })}
              </nav>
              <div className="p-4 border-t border-white/10">
                <button onClick={() => {
                  clearCustomerSession();
                  window.location.href = '/';
                }} className="w-full flex items-center justify-center gap-2 py-2 bg-red-500/20 text-red-100 rounded-xl text-xs font-bold">
                  <LogOut className="w-3.5 h-3.5" /> Logout
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0">
        <div className="h-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
            >
              {isLoading ? (
                <div className="animate-pulse flex flex-col gap-6">
                  <div className="h-24 bg-slate-200 rounded-2xl w-full"></div>
                  <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
                    {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-28 bg-slate-200 rounded-2xl"></div>)}
                  </div>
                  <div className="h-64 bg-slate-200 rounded-2xl w-full"></div>
                </div>
              ) : children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
      </div>
    </div>
  );
};

export type Tab = DashboardTab;