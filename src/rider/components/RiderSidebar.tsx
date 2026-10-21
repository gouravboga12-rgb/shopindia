import React from 'react';
import { Radar, PackageCheck, Wallet, UserCheck, Bike, LogOut, ChevronRight } from 'lucide-react';
import { useRider } from '../context/RiderContext';
import { useAuth } from '../../context/AuthContext';

interface RiderSidebarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
}

export const RiderSidebar: React.FC<RiderSidebarProps> = ({ currentTab, onTabChange }) => {
  const { isOnline, activeDelivery, profile } = useRider();
  const { logout, user } = useAuth();

  const navItems = [
    { id: 'radar', label: 'Live Radar & Feed', icon: Radar, badge: isOnline ? 'ONLINE' : 'OFFLINE' },
    { id: 'orders', label: 'Active & Past Deliveries', icon: PackageCheck, badge: activeDelivery ? '1 Active' : undefined },
    { id: 'wallet', label: 'Earnings & Wallet Payouts', icon: Wallet },
    { id: 'profile', label: 'Vehicle & Radius Settings', icon: UserCheck },
  ];

  return (
    <aside className="hidden sm:flex flex-col w-72 bg-slate-900 border-r border-slate-800 text-slate-200 min-h-screen">
      {/* Brand header */}
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-tr from-orange-500 to-amber-500 rounded-xl shadow-lg shadow-orange-500/20 text-slate-950 font-bold">
            <Bike className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              ShopIndia <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded font-mono">RIDER</span>
            </h1>
            <p className="text-xs text-slate-400">Dispatch & Delivery Hub</p>
          </div>
        </div>
      </div>

      {/* Navigation items */}
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-orange-500/10 to-amber-500/10 text-orange-400 border border-orange-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-5 h-5 ${isActive ? 'text-orange-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              <div className="flex items-center gap-2">
                {item.badge && (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      item.badge === 'ONLINE'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : item.badge === 'OFFLINE'
                        ? 'bg-slate-800 text-slate-400'
                        : 'bg-orange-500/20 text-orange-400 border border-orange-500/30 animate-pulse'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
                <ChevronRight className={`w-4 h-4 transition-transform ${isActive ? 'translate-x-0.5 text-orange-400' : 'text-slate-600'}`} />
              </div>
            </button>
          );
        })}
      </nav>

      {/* Rider Summary Footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-900/50">
        <div className="bg-slate-800/80 rounded-xl p-3 border border-slate-700/60 mb-3">
          <div className="flex justify-between items-center text-xs text-slate-400 mb-1">
            <span>Completed Trips</span>
            <span className="font-semibold text-slate-200">{profile?.totalDeliveries || 0}</span>
          </div>
          <div className="flex justify-between items-center text-xs text-slate-400">
            <span>Rider Rating</span>
            <span className="font-semibold text-amber-400">★ {profile?.rating ? profile.rating.toFixed(1) : '5.0'}</span>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="truncate max-w-[140px]">{user?.email}</span>
          <button
            onClick={logout}
            className="flex items-center gap-1 text-slate-400 hover:text-red-400 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
