import React, { useState } from 'react';
import { Globe2, LogOut, Menu, X, Shield, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface RegionalAdminHeaderProps {
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export const RegionalAdminHeader: React.FC<RegionalAdminHeaderProps> = ({ onRefresh, isRefreshing }) => {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

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
                className="p-2 rounded-xl text-slate-600 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 transition-colors"
                title="Refresh Live Pulse"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
              </button>
            )}

            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 rounded-xl text-slate-700 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 transition-colors"
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
          <div className="relative bg-white rounded-t-3xl border-t border-slate-200 p-6 shadow-2xl space-y-4 max-h-[80vh] overflow-y-auto animate-in slide-in-from-bottom duration-200">
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-2" />
            
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-white text-lg shadow-md shadow-blue-500/20">
                {user?.name ? user.name[0].toUpperCase() : 'H'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900 truncate">{user?.name || 'Regional Hub Manager'}</h3>
                  <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200">
                    HUB
                  </span>
                </div>
                <p className="text-xs text-slate-500 truncate">{user?.email}</p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                <Shield className="w-4 h-4 text-blue-600" />
                <span>Territory Operational Governance</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                You are managing local merchant fulfillment queues, quick-commerce fleet verification, and Shiprocket dispatch tracking.
              </p>
            </div>

            <button
              onClick={() => {
                setMenuOpen(false);
                logout();
              }}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-red-50 hover:bg-red-100 text-red-600 font-semibold rounded-2xl border border-red-200/80 transition-colors text-sm"
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
