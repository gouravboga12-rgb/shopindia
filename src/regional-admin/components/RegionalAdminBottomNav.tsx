import React from 'react';
import { LayoutDashboard, Radar, Store, Bike } from 'lucide-react';

interface RegionalAdminBottomNavProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
}

export const RegionalAdminBottomNav: React.FC<RegionalAdminBottomNavProps> = ({ currentTab, onTabChange }) => {
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'live-map', label: 'Radar Map', icon: Radar },
    { id: 'vendors', label: 'Merchants', icon: Store },
    { id: 'riders', label: 'Fleet & KYC', icon: Bike },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 border-t border-slate-200/80 backdrop-blur-lg px-2 py-2 safe-area-bottom shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
      <div className="flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`relative flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
                isActive ? 'text-blue-600 font-semibold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110 text-blue-600' : ''}`} />
              </div>
              <span className="text-[11px] mt-1 tracking-tight">{tab.label}</span>
              {isActive && (
                <span className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-0.5 animate-in fade-in" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
