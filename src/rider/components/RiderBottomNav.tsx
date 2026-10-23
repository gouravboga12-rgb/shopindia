import React from 'react';
import { Radar, PackageCheck, Wallet, UserCheck } from 'lucide-react';
import { useRider } from '../context/RiderContext';

interface RiderBottomNavProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
}

export const RiderBottomNav: React.FC<RiderBottomNavProps> = ({ currentTab, onTabChange }) => {
  const { activeDelivery, isOnline } = useRider();

  const tabs = [
    { id: 'radar', label: 'Radar', icon: Radar, badge: isOnline ? 'ON' : undefined },
    { id: 'orders', label: 'Deliveries', icon: PackageCheck, badge: activeDelivery ? '1' : undefined },
    { id: 'wallet', label: 'Wallet', icon: Wallet },
    { id: 'profile', label: 'Profile', icon: UserCheck },
  ];

  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 border-t border-slate-200/80 backdrop-blur-lg px-2 py-2 safe-area-bottom shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
      <div className="flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`relative flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all cursor-pointer ${
                isActive ? 'text-orange-600 font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110 text-orange-600' : ''}`} />
                {tab.badge && (
                  <span
                    className={`absolute -top-1 -right-2.5 text-[9px] font-extrabold px-1.5 py-0.2 rounded-full leading-tight shadow-2xs ${
                      tab.badge === 'ON'
                        ? 'bg-emerald-500 text-white'
                        : 'bg-orange-500 text-white animate-pulse'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-1 tracking-tight">{tab.label}</span>
              {isActive && (
                <span className="w-1.5 h-1.5 bg-orange-600 rounded-full mt-0.5 animate-in fade-in" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
