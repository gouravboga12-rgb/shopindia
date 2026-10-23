import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Package, ShoppingBag, BarChart3, Wallet, LogOut, Store, Wrench, Headphones } from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
}

export const VendorSidebar: React.FC<SidebarProps> = ({ currentTab, onTabChange }) => {
  const { user, logout } = useAuth();

  const navItems = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
    { id: 'products', label: 'Products & Stock', icon: Package },
    { id: 'orders', label: 'Orders Fulfillment', icon: ShoppingBag },
    { id: 'analytics', label: 'Sales Analytics', icon: BarChart3 },
    { id: 'wallet', label: 'Wallet & Payouts', icon: Wallet },
    { id: 'technicians', label: 'Technicians', icon: Wrench },
    { id: 'support', label: 'Support Queue', icon: Headphones },
  ];

  return (
    <aside className="w-64 bg-white border-r border-gray-100 text-gray-800 flex flex-col justify-between flex-shrink-0 min-h-screen">
      <div>
        <div className="p-6 border-b border-gray-100 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-base font-heading">Vendor Hub</h2>
            <p className="text-xs text-gray-400">ShopIndia Partner</p>
          </div>
        </div>

        <nav className="p-3 space-y-1">
          {navItems.map(item => {
            const Icon = item.icon;
            const active = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? 'bg-emerald-50 text-emerald-700 font-semibold shadow-sm'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-gray-100">
        <div className="flex items-center gap-3 mb-3 px-2">
          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">
            {user?.name?.[0] || 'V'}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-gray-900 truncate">{user?.name}</p>
            <p className="text-xs text-gray-400 font-mono">VENDOR</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" /> Sign Out
        </button>
      </div>
    </aside>
  );
};
