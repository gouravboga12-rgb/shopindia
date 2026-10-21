import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Users, Store, Package, ShoppingBag,
  Building2, ShieldCheck, MapPin, Headphones, Percent, LogOut,
  Truck, Tag, BarChart3, Bell, LayoutGrid, Image, Globe2
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
}

export const AdminSidebar: React.FC<SidebarProps> = ({ currentTab, onTabChange }) => {
  const { user, logout, hasPermission } = useAuth();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, perm: 'view_dashboard' },
    { id: 'regional-admins', label: 'Regional Admins', icon: Globe2, perm: 'manage_users' },
    { id: 'vendors', label: 'Vendors', icon: Store, perm: 'view_vendors' },
    { id: 'riders', label: 'Riders Operations', icon: Truck, perm: 'view_users' },
    { id: 'users', label: 'Users & Roles', icon: Users, perm: 'view_users' },
    { id: 'products', label: 'Products Catalog', icon: Package, perm: 'view_products' },
    { id: 'orders', label: 'Orders', icon: ShoppingBag, perm: 'view_orders' },
    { id: 'branches', label: 'Branches', icon: Building2, perm: 'view_branches' },
    { id: 'rbac', label: 'RBAC Controls', icon: ShieldCheck, perm: 'manage_users' },
    { id: 'service-areas', label: 'Service Areas', icon: MapPin, perm: 'manage_service_areas' },
    { id: 'support', label: 'Support Queue', icon: Headphones, perm: 'view_support' },
    { id: 'commissions', label: 'Commissions', icon: Percent, perm: 'manage_commissions' },
    { id: 'promotions', label: 'Promotions', icon: Image, perm: 'manage_commissions' },
    { id: 'offers', label: 'Offers & Coupons', icon: Tag, perm: 'manage_commissions' },
    { id: 'categories', label: 'Categories', icon: LayoutGrid, perm: 'view_products' },
    { id: 'reports', label: 'Deep Reporting', icon: BarChart3, perm: 'view_dashboard' },
    { id: 'notifications', label: 'Notifications', icon: Bell, perm: 'manage_users' },
  ];

  return (
    <aside className="w-64 bg-[#0F2C59] text-white flex flex-col justify-between flex-shrink-0 min-h-screen">
      <div>
        <div className="p-6 border-b border-white/10 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center font-bold text-white border border-white/20">
            SI
          </div>
          <div>
            <h2 className="font-bold text-base font-heading tracking-wide">ShopIndia</h2>
            <p className="text-xs text-white/50">Admin Management</p>
          </div>
        </div>

        <nav className="p-3 space-y-1">
          {navItems.map(item => {
            const allowed = hasPermission(item.perm) || user?.role === 'super_admin';
            if (!allowed) return null;
            const Icon = item.icon;
            const active = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${active
                    ? 'bg-white/15 text-white font-semibold shadow-inner'
                    : 'text-white/70 hover:bg-white/5 hover:text-white'
                  }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-3 mb-3 px-2">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">
            {user?.name?.[0] || 'A'}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-white truncate">{user?.name}</p>
            <p className="text-xs text-white/50 uppercase tracking-wider font-mono">{user?.role}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-red-500/20 text-red-200 hover:bg-red-500/30 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" /> Sign Out
        </button>
      </div>
    </aside>
  );
};
