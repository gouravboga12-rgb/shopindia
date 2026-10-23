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
    <aside className="hidden sm:flex flex-col w-72 bg-white border-r border-slate-200/80 text-slate-700 min-h-screen">
      {/* Brand header */}
      <div className="p-6 border-b border-slate-200/80">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-tr from-orange-500 to-amber-500 rounded-xl shadow-md shadow-orange-500/20 text-white font-bold">
            <Bike className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight text-slate-900 flex items-center gap-1.5">
              ShopIndia <span className="text-[11px] bg-orange-50 text-orange-700 border border-orange-200 px-2 py-0.5 rounded font-mono font-bold">RIDER</span>
            </h1>
            <p className="text-xs text-slate-500 font-medium">Dispatch & Delivery Hub</p>
          </div>
        </div>
      </div>

      {/* Navigation items */}
      <nav className="flex-1 p-4 space-y-1.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                isActive
                  ? 'bg-orange-50 text-orange-600 border border-orange-200 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-5 h-5 ${isActive ? 'text-orange-600' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              <div className="flex items-center gap-2">
                {item.badge && (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      item.badge === 'ONLINE'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : item.badge === 'OFFLINE'
                        ? 'bg-slate-100 text-slate-600'
                        : 'bg-orange-100 text-orange-800 border border-orange-200 animate-pulse'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
                <ChevronRight className={`w-4 h-4 transition-transform ${isActive ? 'translate-x-0.5 text-orange-600' : 'text-slate-400'}`} />
              </div>
            </button>
          );
        })}
      </nav>

      {/* Rider Summary Footer */}
      <div className="p-4 border-t border-slate-200/80 bg-slate-50/50">
        <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-2xs mb-3">
          <div className="flex justify-between items-center text-xs text-slate-500 mb-1">
            <span>Completed Trips</span>
            <span className="font-bold text-slate-900">{profile?.totalDeliveries || 0}</span>
          </div>
          <div className="flex justify-between items-center text-xs text-slate-500">
            <span>Partner Rating</span>
            <span className="font-bold text-amber-600">★ {profile?.rating ? profile.rating.toFixed(1) : '5.0'}</span>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500">
          <span className="truncate max-w-[140px] font-medium">{user?.email}</span>
          <button
            onClick={logout}
            className="flex items-center gap-1 text-slate-500 hover:text-red-600 transition-colors font-medium cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
