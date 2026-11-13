import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Users, Store, Package, ShoppingBag,
  MapPin, Headphones, Percent, LogOut,
  Truck, Bell, LayoutGrid, Image, Globe2,
  DollarSign, CreditCard, Bike, Banknote, Wrench, AlertOctagon, X
} from 'lucide-react';

export interface AdminBadgeCounts {
  pendingVendors?: number;
  pendingRiders?: number;
  pendingRegionalAdmins?: number;
  openTickets?: number;
  pendingRefunds?: number;
}

interface SidebarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
  badgeCounts?: AdminBadgeCounts;
}

export const AdminSidebar: React.FC<SidebarProps> = ({
  currentTab,
  onTabChange,
  isOpen = false,
  onClose,
  badgeCounts,
}) => {
  const { user, logout, hasPermission } = useAuth();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, perm: 'view_dashboard' },
    { id: 'finance', label: 'Finance Center', icon: DollarSign, perm: 'manage_commissions' },
    { id: 'payouts-vendors', label: 'Merchant Payouts', icon: Store, perm: 'manage_commissions' },
    { id: 'payouts-fleet', label: 'Rider & Tech Payouts', icon: Bike, perm: 'manage_commissions' },
    { id: 'accounts', label: 'Accounts & Statements', icon: CreditCard, perm: 'manage_commissions' },
    { id: 'cod-settings', label: 'Rider Cash Float & Due Recovery', icon: Banknote, perm: 'manage_commissions' },
    { id: 'commissions', label: 'Delivery Charges & Rider Pay', icon: Percent, perm: 'manage_commissions' },
    { id: 'regional-admins', label: 'Regional Admins', icon: Globe2, perm: 'manage_users' },
    { id: 'vendors', label: 'Vendors', icon: Store, perm: 'view_vendors' },
    { id: 'riders', label: 'Riders Operations', icon: Truck, perm: 'view_users' },
    { id: 'users', label: 'Users & Roles', icon: Users, perm: 'view_users' },
    { id: 'products', label: 'Products Catalog', icon: Package, perm: 'view_products' },
    { id: 'services', label: 'Services & Repairs', icon: Wrench, perm: 'view_products' },
    { id: 'categories', label: 'Categories & Brands', icon: LayoutGrid, perm: 'view_products' },
    { id: 'orders', label: 'Orders', icon: ShoppingBag, perm: 'view_orders' },
    { id: 'canceled-orders', label: 'Canceled Orders & Refunds', icon: AlertOctagon, perm: 'view_orders' },
    { id: 'service-areas', label: 'Service Areas', icon: MapPin, perm: 'manage_service_areas' },
    { id: 'support', label: 'Support Queue', icon: Headphones, perm: 'view_support' },
    { id: 'promotions', label: 'Promotions', icon: Image, perm: 'manage_commissions' },
    { id: 'notifications', label: 'Notifications', icon: Bell, perm: 'manage_users' },
  ];

  const renderNavContent = (isMobileDrawer = false) => (
    <>
      {/* Brand Header */}
      <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between flex-shrink-0 bg-[#0C2346]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center font-bold text-white border border-white/20 shadow-inner">
            SI
          </div>
          <div>
            <h2 className="font-bold text-sm sm:text-base font-heading tracking-wide">ShopIndia</h2>
            <p className="text-[11px] text-white/50">Super Admin Portal</p>
          </div>
        </div>
        {isMobileDrawer && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close Sidebar"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* Nav Items Container */}
      <nav
        className="flex-1 overflow-y-auto p-3 space-y-1 overscroll-contain"
        style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.2) transparent' }}
      >
        {navItems.map((item) => {
          const allowed = hasPermission(item.perm) || user?.role === 'super_admin';
          if (!allowed) return null;
          const Icon = item.icon;
          const active = currentTab === item.id;

          let badgeElement = null;
          if (item.id === 'vendors' && (badgeCounts?.pendingVendors ?? 0) > 0) {
            badgeElement = (
              <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white animate-pulse shadow-xs shrink-0">
                {badgeCounts!.pendingVendors} pending
              </span>
            );
          } else if (item.id === 'riders' && (badgeCounts?.pendingRiders ?? 0) > 0) {
            badgeElement = (
              <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white shrink-0">
                {badgeCounts!.pendingRiders}
              </span>
            );
          } else if (item.id === 'regional-admins' && (badgeCounts?.pendingRegionalAdmins ?? 0) > 0) {
            badgeElement = (
              <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500 text-white shrink-0">
                {badgeCounts!.pendingRegionalAdmins}
              </span>
            );
          } else if (item.id === 'support' && (badgeCounts?.openTickets ?? 0) > 0) {
            badgeElement = (
              <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white shrink-0">
                {badgeCounts!.openTickets}
              </span>
            );
          } else if (item.id === 'canceled-orders' && (badgeCounts?.pendingRefunds ?? 0) > 0) {
            badgeElement = (
              <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white shrink-0">
                {badgeCounts!.pendingRefunds}
              </span>
            );
          }

          return (
            <button
              key={item.id}
              onClick={() => {
                onTabChange(item.id);
                if (isMobileDrawer && onClose) onClose();
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                active
                  ? 'bg-white/20 text-white shadow-inner font-bold border border-white/10'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{item.label}</span>
              {badgeElement}
            </button>
          );
        })}
      </nav>

      {/* Footer Info & Sign Out */}
      <div className="p-4 border-t border-white/10 flex-shrink-0 bg-[#0C2346]">
        <div className="flex items-center gap-3 mb-3 px-2">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold shrink-0">
            {user?.name?.[0] || 'A'}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-white truncate">{user?.name || 'Administrator'}</p>
            <p className="text-[10px] text-white/50 uppercase tracking-wider font-mono">
              {user?.role?.replace('_', ' ') || 'Super Admin'}
            </p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-red-500/20 text-red-200 hover:bg-red-500/30 transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" /> Sign Out
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar (screens >= lg) */}
      <aside className="hidden lg:flex w-64 bg-[#0F2C59] text-white flex-col flex-shrink-0 h-screen sticky top-0 select-none shadow-xl border-r border-[#0A1F3F]">
        {renderNavContent(false)}
      </aside>

      {/* Mobile & Tablet Slide-Over Drawer (screens < lg) */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={onClose}
          />
          <div className="relative w-72 max-w-[85vw] bg-[#0F2C59] text-white flex flex-col h-full shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {renderNavContent(true)}
          </div>
        </div>
      )}
    </>
  );
};
