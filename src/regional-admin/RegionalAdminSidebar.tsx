import React from 'react';
import { Globe2, LayoutDashboard, Radar, Store, Bike, LogOut, ChevronRight } from 'lucide-react';
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
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 text-slate-200 flex flex-col min-h-screen">
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl shadow-lg shadow-blue-500/20 text-white font-bold">
            <Globe2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
              ShopIndia <span className="text-[10px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded font-mono">ZONE</span>
            </h1>
            <p className="text-xs text-slate-400 truncate max-w-[130px]">{user?.name || 'Regional Hub'}</p>
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
                  ? 'bg-blue-600/10 text-blue-400 border border-blue-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isActive ? 'text-blue-400 translate-x-0.5' : 'text-slate-600'}`} />
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-slate-800">
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-xl transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Exit Regional Hub</span>
        </button>
      </div>
    </aside>
  );
};
