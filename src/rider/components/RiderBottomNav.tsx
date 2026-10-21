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
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 border-t border-slate-800 backdrop-blur-lg px-2 py-2 safe-area-bottom">
      <div className="flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`relative flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
                isActive ? 'text-orange-400 font-medium' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'scale-110 text-orange-400' : ''}`} />
                {tab.badge && (
                  <span
                    className={`absolute -top-1 -right-2 text-[9px] font-extrabold px-1.5 py-0.2 rounded-full leading-tight ${
                      tab.badge === 'ON'
                        ? 'bg-emerald-500 text-slate-950'
                        : 'bg-orange-500 text-white animate-pulse'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-1">{tab.label}</span>
              {isActive && (
                <span className="w-1.5 h-1.5 bg-orange-400 rounded-full mt-0.5" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
