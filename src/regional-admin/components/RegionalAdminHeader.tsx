import React, { useState } from 'react';
import {
  Globe2, LogOut, Menu, X, Shield, RefreshCw,
  LayoutDashboard, Radar, Store, Bike, Banknote, Wallet, Headphones
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface RegionalAdminHeaderProps {
  currentTab?: string;
  onTabChange?: (tab: string) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export const RegionalAdminHeader: React.FC<RegionalAdminHeaderProps> = ({
  currentTab,
  onTabChange,
  onRefresh,
  isRefreshing,
}) => {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Regional Dashboard', icon: LayoutDashboard },
    { id: 'live-map', label: 'Live Dispatch Radar', icon: Radar },
    { id: 'vendors', label: 'Territory Merchants', icon: Store },
    { id: 'riders', label: 'Delivery Fleet & KYC', icon: Bike },
    { id: 'cod-remittance', label: 'Rider Cash & COD Float', icon: Banknote },
    { id: 'payouts', label: 'Payout Approvals', icon: Wallet },
    { id: 'support', label: 'Territory Support', icon: Headphones },
  ];

  return (
    <>
      <header className="lg:hidden sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 py-3 shadow-xs">
        <div className="flex items-center justify-between gap-3">
          {/* Brand & Zone */}
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl shadow-md shadow-blue-500/20 text-white font-bold shrink-0">
              <Globe2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-black tracking-tight text-slate-900">ShopIndia</span>
                <span className="text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200/80 px-1.5 py-0.2 rounded font-mono">
                  ZONE
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium truncate max-w-[170px]">
                {user?.name || 'Regional Hub'}
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-1.5">
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={isRefreshing}
                className="p-2 rounded-xl text-slate-600 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 transition-colors cursor-pointer"
                title="Refresh Live Pulse"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
              </button>
            )}

            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 rounded-xl text-slate-700 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 transition-colors cursor-pointer"
              aria-label="Open Hub Menu"
            >
              {menuOpen ? <X className="w-5 h-5 text-slate-900" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer Overlay */}
      {menuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
            onClick={() => setMenuOpen(false)}
          />
          <div className="relative bg-white rounded-t-3xl border-t border-slate-200 p-5 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-200">
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-1" />

            {/* Hub Manager Info */}
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-white text-base shadow-md shadow-blue-500/20 shrink-0">
                {user?.name ? user.name[0].toUpperCase() : 'H'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900 truncate">{user?.name || 'Regional Hub Manager'}</h3>
                  <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200">
                    HUB
                  </span>
                </div>
                <p className="text-xs text-slate-500 truncate">{user?.email}</p>
              </div>
            </div>

            {/* Navigation Links for Mobile */}
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-2 block font-heading">
                Hub Navigation
              </span>
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (onTabChange) onTabChange(item.id);
                      setMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-blue-50 text-blue-600 border border-blue-200/80 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Territory Info */}
            <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/80 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                <Shield className="w-4 h-4 text-blue-600" />
                <span>Territory Operational Governance</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Managing local merchant fulfillment queues, quick-commerce fleet verification, and rider cash remittance.
              </p>
            </div>

            <button
              onClick={() => {
                setMenuOpen(false);
                logout();
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-red-50 hover:bg-red-100 text-red-600 font-semibold rounded-2xl border border-red-200/80 transition-colors text-xs cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Exit Regional Hub</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
};
