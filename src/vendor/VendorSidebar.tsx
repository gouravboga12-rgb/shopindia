import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useVendor } from './context/VendorContext';
import { LayoutDashboard, Package, ShoppingBag, BarChart3, Wallet, LogOut, Store, Headphones, Settings, X } from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export const VendorSidebar: React.FC<SidebarProps> = ({
  currentTab,
  onTabChange,
  isOpen = false,
  onClose,
}) => {
  const { user, logout } = useAuth();
  const { vendor, isOnline } = useVendor();

  const navItems = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
    { id: 'products', label: 'Products & Stock', icon: Package },
    { id: 'orders', label: 'Orders Fulfillment', icon: ShoppingBag },
    { id: 'analytics', label: 'Sales Analytics', icon: BarChart3 },
    { id: 'wallet', label: 'Wallet & Payouts', icon: Wallet },
    { id: 'admin-help', label: 'Admin Help Desk', icon: Headphones },
    { id: 'settings', label: 'Store Settings & GPS', icon: Settings },
  ];

  const renderNavContent = (isMobileDrawer = false) => (
    <div className="flex flex-col h-full justify-between">
      <div>
        <div className="p-5 sm:p-6 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold shadow-xs">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base font-heading truncate max-w-[140px]">{vendor?.businessName || 'Vendor Hub'}</h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
                <span className="text-[11px] font-semibold text-slate-500">{isOnline ? 'Store Online' : 'Store Offline'}</span>
              </div>
            </div>
          </div>
          {isMobileDrawer && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Close Sidebar"
            >
              <X size={20} />
            </button>
          )}
        </div>

        <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-180px)]">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onTabChange(item.id);
                  if (isMobileDrawer && onClose) onClose();
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                  active
                    ? 'bg-emerald-50 text-emerald-700 font-semibold shadow-xs'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-gray-100 bg-slate-50/50">
        <div className="flex items-center gap-3 mb-3 px-2">
          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold shrink-0">
            {user?.name?.[0] || 'V'}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-gray-900 truncate">{user?.name || 'Store Owner'}</p>
            <p className="text-[10px] text-gray-400 font-mono">MERCHANT PARTNER</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100 transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" /> Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar (screens >= lg) */}
      <aside className="hidden lg:flex w-64 bg-white border-r border-gray-100 text-gray-800 flex-col justify-between flex-shrink-0 min-h-screen sticky top-0 select-none shadow-xs">
        {renderNavContent(false)}
      </aside>

      {/* Mobile & Tablet Slide-Over Drawer (screens < lg) */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={onClose}
          />
          <div className="relative w-72 max-w-[85vw] bg-white text-gray-800 flex flex-col h-full shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {renderNavContent(true)}
          </div>
        </div>
      )}
    </>
  );
};
