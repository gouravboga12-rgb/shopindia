import React, { useState, useEffect } from 'react';
import { useRider } from '../context/RiderContext';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { Power, Wallet, AlertCircle, LogOut, Bell, X, CheckCheck, Clock, ExternalLink, Zap, Wrench, CheckCircle2 } from 'lucide-react';

interface RiderHeaderProps {
  onLogout?: () => void;
  onNavigateToTab?: (tab: string) => void;
}

interface RiderNotification {
  id: string;
  title: string;
  message: string;
  category: string;
  isRead: boolean;
  link?: string | null;
  createdAt: string;
}

export const RiderHeader: React.FC<RiderHeaderProps> = ({ onNavigateToTab }) => {
  const { profile, isOnline, toggleOnline } = useRider();
  const { user, logout } = useAuth();
  const cashInHand = profile?.codCashFloat ?? 0;

  const [notifications, setNotifications] = useState<RiderNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDrawer, setShowDrawer] = useState(false);
  const [loadingNotifs, setLoadingNotifs] = useState(false);

  const fetchNotifications = async () => {
    try {
      setLoadingNotifs(true);
      const res: any = await api.get('/api/rider/notifications');
      if (res?.success) {
        setNotifications(res.notifications || []);
        setUnreadCount(res.unreadCount || 0);
      }
    } catch (e) {
      // silently handle
    } finally {
      setLoadingNotifs(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.put(`/api/rider/notifications/${id}/read`, {});
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {}
  };

  const handleMarkAllRead = async () => {
    try {
      await api.put('/api/rider/notifications/read-all', {});
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {}
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 border-b border-slate-200/80 text-slate-800 shadow-xs backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between gap-2">
        {/* Rider Identity */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="relative shrink-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center font-bold text-white shadow-sm text-sm sm:text-base">
              {user?.name ? user.name[0].toUpperCase() : 'R'}
            </div>
            <span
              className={`absolute bottom-0 right-0 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full border-2 border-white ${
                isOnline ? 'bg-emerald-500 ring-2 ring-emerald-400/50 animate-pulse' : 'bg-slate-400'
              }`}
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm sm:text-base text-slate-900 truncate max-w-[100px] sm:max-w-none">{user?.name || 'Delivery Partner'}</span>
              {profile?.isApproved ? (
                <span title="KYC Verified" className="inline-flex items-center shrink-0">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 fill-emerald-100" />
                </span>
              ) : (
                <span title="KYC Pending" className="inline-flex items-center shrink-0">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                </span>
              )}
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 truncate">
              {profile?.vehicleType ? `${profile.vehicleType.toUpperCase()} • ` : ''}
              Radius: {profile?.serviceRadiusKm || 25} km
            </p>
          </div>
        </div>

        {/* Center / Right: Online Status Toggle & Wallet */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* COD Cash in Hand (if holding customer cash) */}
          {cashInHand > 0 && (
            <button
              type="button"
              onClick={() => onNavigateToTab?.('wallet')}
              className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full border text-xs sm:text-sm font-black transition-all cursor-pointer ${
                cashInHand >= (profile?.codFloatLimit || 3000)
                  ? 'bg-red-50 text-red-700 border-red-300 animate-pulse'
                  : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
              }`}
              title="Click to remit customer cash to Admin"
            >
              <span className="text-[10px] uppercase font-bold text-amber-600 hidden md:inline">COD Cash:</span>
              <span>₹{cashInHand.toLocaleString('en-IN')}</span>
              <span className="text-[10px] bg-amber-200/80 text-amber-900 px-1.5 py-0.2 rounded font-bold">PAY</span>
            </button>
          )}

          {/* Wallet Balance Pill (Handles Auto-Offset Net Balance) */}
          <div className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full border shadow-2xs ${
            (profile?.walletBalance || 0) < 0
              ? 'bg-amber-50 border-amber-300 text-amber-800'
              : 'bg-emerald-50 border-emerald-200/80 text-emerald-700'
          }`}>
            <Wallet className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${
              (profile?.walletBalance || 0) < 0 ? 'text-amber-600' : 'text-emerald-600'
            }`} />
            <span className="text-xs sm:text-sm font-black">
              {(profile?.walletBalance || 0) < 0
                ? `-₹${Math.abs(Math.round(profile?.walletBalance || 0)).toLocaleString('en-IN')}`
                : `₹${Math.round(profile?.walletBalance || 0).toLocaleString('en-IN')}`}
            </span>
          </div>

          {/* Notification Bell with Unread Badge */}
          <div className="relative">
            <button
              onClick={() => {
                setShowDrawer(prev => !prev);
                if (!showDrawer) fetchNotifications();
              }}
              className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
              title="Fleet Notifications & Alerts"
            >
              <Bell className="w-5 h-5 text-slate-700" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 px-1.5 py-0.2 bg-orange-600 text-white text-[10px] font-black rounded-full min-w-[18px] text-center shadow-xs animate-bounce">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown Popover */}
            {showDrawer && (
              <>
                <div
                  className="fixed inset-0 z-40 bg-black/20 sm:bg-transparent"
                  onClick={() => setShowDrawer(false)}
                />
                <div className="fixed sm:absolute top-16 sm:top-full right-2 sm:right-0 mt-2 w-[calc(100vw-1rem)] sm:w-96 max-h-[80vh] bg-white rounded-3xl border border-slate-200 shadow-2xl z-50 overflow-hidden flex flex-col animate-in fade-in zoom-in-95">
                  <div className="p-3.5 px-4 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-orange-600" />
                      <span className="font-black text-xs text-slate-900 tracking-tight">Fleet Alerts &amp; Updates</span>
                      {unreadCount > 0 && (
                        <span className="px-1.5 py-0.2 bg-orange-100 text-orange-800 text-[10px] font-bold rounded-full">
                          {unreadCount} new
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={handleMarkAllRead}
                          className="text-[11px] font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1 cursor-pointer"
                        >
                          <CheckCheck className="w-3.5 h-3.5" />
                          <span>Mark read</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setShowDrawer(false)}
                        className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="p-2 overflow-y-auto divide-y divide-slate-100 space-y-1">
                    {loadingNotifs && notifications.length === 0 ? (
                      <div className="p-8 text-center text-slate-400">
                        <p className="text-xs font-bold text-slate-500 animate-pulse">Loading fleet alerts...</p>
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="p-8 text-center text-slate-400">
                        <Bell className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        <p className="text-xs font-bold text-slate-600">No announcements</p>
                        <p className="text-[11px] text-slate-400">You're all caught up with fleet updates.</p>
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => {
                            if (!n.isRead) handleMarkAsRead(n.id);
                          }}
                          className={`p-3 rounded-2xl transition-all cursor-pointer ${
                            !n.isRead
                              ? 'bg-orange-50/60 border border-orange-200/60 shadow-2xs'
                              : 'hover:bg-slate-50 border border-transparent'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <div className="flex items-center gap-1.5">
                              {n.title.toLowerCase().includes('quick') ? (
                                <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
                              ) : n.title.toLowerCase().includes('service') ? (
                                <Wrench className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              ) : (
                                <Bell className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                              )}
                              <h4 className="text-xs font-black text-slate-900 leading-snug">{n.title}</h4>
                            </div>
                            {!n.isRead && (
                              <span className="w-2 h-2 rounded-full bg-orange-600 shrink-0 mt-1" />
                            )}
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed pl-5">{n.message}</p>
                          <div className="mt-2 pl-5 flex items-center justify-between text-[10px] text-slate-400 font-medium">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {n.link && (
                              <a
                                href={n.link}
                                onClick={(e) => e.stopPropagation()}
                                className="text-orange-600 hover:text-orange-700 font-bold flex items-center gap-0.5"
                              >
                                <span>Details</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Online Toggle Switch */}
          <button
            onClick={toggleOnline}
            className={`flex items-center gap-1 sm:gap-2 px-2.5 sm:px-4 py-1.5 rounded-full font-bold text-xs sm:text-sm transition-all shadow-xs active:scale-95 cursor-pointer whitespace-nowrap ${
              isOnline
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20'
                : 'bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200'
            }`}
          >
            <Power className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isOnline ? 'animate-pulse' : ''}`} />
            <span>{isOnline ? 'ONLINE' : 'GO ONLINE'}</span>
          </button>

          {/* Logout */}
          <button
            onClick={logout}
            title="Log Out"
            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
