import React from 'react';
import { Globe2, LayoutDashboard, Radar, Store, Bike, LogOut, ChevronRight, Headphones } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface RegionalAdminSidebarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
}

export const RegionalAdminSidebar: React.FC<RegionalAdminSidebarProps> = ({ currentTab, onTabChange }) => {
  const { logout, user } = useAuth();

  const navItems = [
    { id: 'dashboard', label: 'Regional Dashboard', icon: LayoutDashboard },
    { id: 'live-map', label: 'Live Dispatch Radar', icon: Radar },
    { id: 'vendors', label: 'Territory Merchants', icon: Store },
    { id: 'riders', label: 'Delivery Fleet & KYC', icon: Bike },
    { id: 'support', label: 'Territory Support', icon: Headphones },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-64 shrink-0 bg-white border-r border-slate-200/80 text-slate-700 min-h-screen">
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-200/80">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl shadow-md shadow-blue-500/20 text-white font-bold">
            <Globe2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-slate-900 flex items-center gap-1.5">
              ShopIndia <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200/80 px-1.5 py-0.5 rounded font-mono font-bold">ZONE</span>
            </h1>
            <p className="text-xs text-slate-500 truncate max-w-[130px] font-medium">{user?.name || 'Regional Hub'}</p>
          </div>
        </div>
      </div>

      {/* Nav Menu */}
      <nav className="flex-1 p-4 space-y-1.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-blue-50 text-blue-700 border border-blue-200/80 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isActive ? 'text-blue-600 translate-x-0.5' : 'text-slate-400'}`} />
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-200/80 space-y-3">
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
          <div className="text-[11px] font-bold text-slate-800 truncate">{user?.name || 'Hub Manager'}</div>
          <div className="text-[10px] text-slate-500 truncate">{user?.email}</div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors font-medium border border-transparent hover:border-red-200/60"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Exit Regional Hub</span>
        </button>
      </div>
    </aside>
  );
};
