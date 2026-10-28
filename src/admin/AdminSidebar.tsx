import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Users, Store, Package, ShoppingBag,
  Building2, ShieldCheck, MapPin, Headphones, Percent, LogOut,
  Truck, Tag, BarChart3, Bell, LayoutGrid, Image, Globe2,
  DollarSign, CreditCard, Bike, Banknote, Wrench
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
}

export const AdminSidebar: React.FC<SidebarProps> = ({ currentTab, onTabChange }) => {
  const { user, logout, hasPermission } = useAuth();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, perm: 'view_dashboard' },
    { id: 'finance', label: 'Finance Center', icon: DollarSign, perm: 'manage_commissions' },
    { id: 'payouts-vendors', label: 'Merchant Payouts', icon: Store, perm: 'manage_commissions' },
    { id: 'payouts-fleet', label: 'Fleet & Service Payouts', icon: Bike, perm: 'manage_commissions' },
    { id: 'accounts', label: 'Accounts & Statements', icon: CreditCard, perm: 'manage_commissions' },
    { id: 'cod-settings', label: 'COD & Cash Clearance', icon: Banknote, perm: 'manage_commissions' },
    { id: 'commissions', label: 'Pricing & Commission', icon: Percent, perm: 'manage_commissions' },
    { id: 'regional-admins', label: 'Regional Admins', icon: Globe2, perm: 'manage_users' },
    { id: 'vendors', label: 'Vendors', icon: Store, perm: 'view_vendors' },
    { id: 'riders', label: 'Riders Operations', icon: Truck, perm: 'view_users' },
    { id: 'users', label: 'Users & Roles', icon: Users, perm: 'view_users' },
    { id: 'products', label: 'Products Catalog', icon: Package, perm: 'view_products' },
    { id: 'services', label: 'Services & Repairs', icon: Wrench, perm: 'view_products' },
    { id: 'orders', label: 'Orders', icon: ShoppingBag, perm: 'view_orders' },
    { id: 'branches', label: 'Branches', icon: Building2, perm: 'view_branches' },
    { id: 'rbac', label: 'RBAC Controls', icon: ShieldCheck, perm: 'manage_users' },
    { id: 'service-areas', label: 'Service Areas', icon: MapPin, perm: 'manage_service_areas' },
    { id: 'support', label: 'Support Queue', icon: Headphones, perm: 'view_support' },
    { id: 'promotions', label: 'Promotions', icon: Image, perm: 'manage_commissions' },
    { id: 'offers', label: 'Offers & Coupons', icon: Tag, perm: 'manage_commissions' },
    { id: 'categories', label: 'Categories', icon: LayoutGrid, perm: 'view_products' },
    { id: 'reports', label: 'Deep Reporting', icon: BarChart3, perm: 'view_dashboard' },
    { id: 'notifications', label: 'Notifications', icon: Bell, perm: 'manage_users' },
  ];

  return (
    <aside className="w-64 bg-[#0F2C59] text-white flex flex-col flex-shrink-0 h-screen sticky top-0 select-none shadow-xl border-r border-[#0A1F3F]">
      {/* Brand Header - Pinned at top */}
      <div className="p-5 border-b border-white/10 flex items-center gap-3 flex-shrink-0 bg-[#0C2346]">
        <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center font-bold text-white border border-white/20 shadow-inner">
          SI
        </div>
        <div>
          <h2 className="font-bold text-base font-heading tracking-wide">ShopIndia</h2>
          <p className="text-xs text-white/50">Admin Management</p>
        </div>
      </div>

      {/* Nav Items Container - Independent Vertical Scrolling */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1 overscroll-contain" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.2) transparent' }}>
        {navItems.map(item => {
          const allowed = hasPermission(item.perm) || user?.role === 'super_admin';
          if (!allowed) return null;
          const Icon = item.icon;
          const active = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                active
                  ? 'bg-white/20 text-white shadow-inner font-bold border border-white/10'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer - Pinned at bottom */}
      <div className="p-4 border-t border-white/10 flex-shrink-0 bg-[#0C2346]">
        <div className="flex items-center gap-3 mb-3 px-2">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold shrink-0">
            {user?.name?.[0] || 'A'}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-white truncate">{user?.name}</p>
            <p className="text-[10px] text-white/50 uppercase tracking-wider font-mono">{user?.role?.replace('_', ' ')}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-red-500/20 text-red-200 hover:bg-red-500/30 transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" /> Sign Out
        </button>
      </div>
    </aside>
  );
};
