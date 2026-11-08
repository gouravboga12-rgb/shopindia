import React, { useState } from 'react';
import { useApp, type Notification } from '../context/AppContext';
import { useIsMobile } from '../hooks/useMediaQuery';
import {
  Bell, Package, Zap, Wrench, ChevronLeft, CheckCircle2, Clock,
  Trash2, X, ExternalLink, Eye, CheckCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const NotificationsPage: React.FC = () => {
  const {
    navigateTo,
    goBack,
    notifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
  } = useApp();

  const isMobile = useIsMobile();
  const [activeFilter, setActiveFilter] = useState<'all' | 'order' | 'quick' | 'service'>('all');
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);

  const filtered = notifications.filter(
    (n) => activeFilter === 'all' || n.type === activeFilter
  );
  const unreadCount = notifications.filter((n) => !n.read).length;

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Zap':
        return Zap;
      case 'Wrench':
        return Wrench;
      case 'Package':
        return Package;
      case 'CheckCircle2':
        return CheckCircle2;
      default:
        return Bell;
    }
  };

  const handleOpenDetail = (n: Notification) => {
    setSelectedNotification(n);
    if (!n.read) {
      markAsRead(n.id);
    }
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteNotification(id);
    if (selectedNotification?.id === id) {
      setSelectedNotification(null);
    }
  };

  const handleAction = (n: Notification) => {
    markAsRead(n.id);
    setSelectedNotification(null);
    if (n.link) {
      if (n.link.startsWith('http://') || n.link.startsWith('https://')) {
        window.open(n.link, '_blank', 'noopener,noreferrer');
      } else {
        const cleanPath = n.link.replace(/^\//, '');
        navigateTo(cleanPath as any);
      }
    } else if (n.type === 'order') {
      navigateTo('orders');
    } else if (n.type === 'service') {
      navigateTo('home');
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#F5F7FA] font-sans text-brand-graphite pb-12">
      {/* Mobile Header Bar */}
      {isMobile && (
        <div className="bg-white px-4 py-3 border-b flex items-center justify-between sticky top-0 z-30 shadow-xs">
          <div className="flex items-center gap-2.5">
            <button
              onClick={goBack}
              className="p-1 rounded-full hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <ChevronLeft size={22} className="text-brand-graphite" />
            </button>
            <h1 className="text-sm font-extrabold font-heading">Notifications</h1>
            {unreadCount > 0 && (
              <span className="bg-brand-red text-white text-[10px] font-black px-1.5 py-0.2 rounded-full font-numbers">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-[10px] font-black text-brand-blue uppercase tracking-wider cursor-pointer"
              >
                Mark read
              </button>
            )}
            {notifications.length > 0 && (
              <button
                onClick={clearAllNotifications}
                className="text-[10px] font-bold text-red-600 hover:text-red-700 uppercase tracking-wider flex items-center gap-0.5 cursor-pointer"
                title="Clear all notifications"
              >
                <Trash2 size={12} />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>
      )}

      <div className={`mx-auto ${isMobile ? 'px-0' : 'max-w-3xl px-6 py-8'}`}>
        {/* Desktop Header */}
        {!isMobile && (
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <button
                onClick={goBack}
                className="p-2 rounded-full hover:bg-slate-200/50 bg-white shadow-xs transition-colors border border-slate-200 cursor-pointer"
              >
                <ChevronLeft size={20} className="text-brand-graphite" />
              </button>
              <h1 className="text-2xl font-black font-heading tracking-tight">Notifications</h1>
              {unreadCount > 0 && (
                <span className="bg-brand-red text-white text-[10px] font-black px-2 py-0.5 rounded-full font-numbers">
                  {unreadCount} New
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-xs font-bold text-brand-blue rounded-xl shadow-2xs transition-all cursor-pointer"
                >
                  <CheckCheck size={14} />
                  <span>Mark all as read</span>
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={clearAllNotifications}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-red-200 hover:bg-red-50 text-xs font-bold text-red-600 rounded-xl shadow-2xs transition-all cursor-pointer"
                >
                  <Trash2 size={14} />
                  <span>Clear all</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Filters */}
        <div
          className={`flex items-center gap-2 overflow-x-auto no-scrollbar mb-4 ${
            isMobile ? 'px-4 pt-4' : ''
          }`}
        >
          {[
            { id: 'all', label: 'All' },
            { id: 'order', label: 'Orders' },
            { id: 'quick', label: 'Quick' },
            { id: 'service', label: 'Services' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id as any)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border cursor-pointer ${
                activeFilter === f.id
                  ? 'bg-brand-graphite text-white border-brand-graphite shadow-soft'
                  : 'bg-white text-brand-slate border-brand-border hover:border-slate-300'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Notifications List */}
        <div className={`flex flex-col ${isMobile ? '' : 'gap-3'}`}>
          {filtered.length > 0 ? (
            filtered.map((n, i) => {
              const Icon = getIcon(n.icon);
              return (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  key={n.id}
                  onClick={() => handleOpenDetail(n)}
                  className={`
                    group flex gap-3.5 p-4 cursor-pointer transition-all relative
                    ${
                      isMobile
                        ? 'border-b border-brand-border/60 bg-white'
                        : 'rounded-2xl bg-white border border-brand-border shadow-xs hover:shadow-md hover:border-slate-300'
                    }
                    ${!n.read ? 'bg-blue-50/20' : ''}
                  `}
                >
                  {/* Category Icon */}
                  <div
                    className={`w-11 h-11 rounded-2xl flex-shrink-0 flex items-center justify-center border border-black/5 shadow-2xs ${
                      n.bg || 'bg-blue-50'
                    } ${n.color || 'text-blue-600'}`}
                  >
                    <Icon size={20} strokeWidth={2.5} />
                  </div>

                  {/* Body Content */}
                  <div className="flex-1 min-w-0 flex flex-col pt-0.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <h3
                          className={`text-xs sm:text-sm font-black leading-tight tracking-tight truncate ${
                            !n.read ? 'text-brand-graphite' : 'text-slate-700'
                          }`}
                        >
                          {n.title}
                        </h3>
                        {!n.read && (
                          <span className="w-2 h-2 rounded-full bg-brand-blue flex-shrink-0 shadow-[0_0_8px_rgba(26,115,232,0.6)]" />
                        )}
                      </div>

                      {/* Card Actions: View & Delete */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => handleDelete(e, n.id)}
                          className="p-1.5 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete notification"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Preview Message (2 lines) */}
                    <p
                      className={`text-xs mt-1 leading-relaxed line-clamp-2 ${
                        !n.read
                          ? 'text-slate-700 font-semibold'
                          : 'text-slate-500 font-medium'
                      }`}
                    >
                      {n.message}
                    </p>

                    {/* Footer: Time + Dynamic Action Pill */}
                    <div className="flex items-center justify-between mt-2.5 pt-1">
                      <div className="flex items-center gap-1 text-slate-400">
                        <Clock size={11} />
                        <span className="text-[10px] font-bold uppercase tracking-wider font-mono">
                          {n.timestamp}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDetail(n);
                          }}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
                        >
                          <Eye size={12} />
                          <span>View Details</span>
                        </button>

                        {n.actionText && (
                          <button
                            type="button"
                            className="text-[10px] font-black uppercase tracking-wider text-brand-blue hover:text-blue-700 active:scale-95 transition-transform cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAction(n);
                            }}
                          >
                            {n.actionText}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center px-4 bg-white rounded-3xl border border-brand-border mt-4 mx-4 md:mx-0 shadow-xs">
              <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300 mb-4 border border-brand-border">
                <Bell size={28} strokeWidth={2} />
              </div>
              <h3 className="text-sm font-black text-brand-graphite mb-1 font-heading">
                No notifications yet
              </h3>
              <p className="text-xs font-bold text-brand-slate max-w-[240px]">
                When you get order updates, delivery tracking, or platform alerts, they will appear here.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Expanded Notification Details Modal */}
      <AnimatePresence>
        {selectedNotification && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[85vh]"
            >
              {/* Modal Header */}
              <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center border border-black/5 ${
                      selectedNotification.bg || 'bg-blue-50'
                    } ${selectedNotification.color || 'text-blue-600'}`}
                  >
                    {React.createElement(getIcon(selectedNotification.icon), {
                      size: 18,
                      strokeWidth: 2.5,
                    })}
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block font-mono">
                      Notification Details
                    </span>
                    <span className="text-xs font-bold text-slate-700 capitalize">
                      {selectedNotification.type === 'quick'
                        ? '⚡ Quick Shopping'
                        : selectedNotification.type === 'service'
                        ? '🛠️ Glacons Service'
                        : selectedNotification.type === 'promo'
                        ? '🏷️ Offer / Promo'
                        : '📢 Platform Alert'}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedNotification(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 rounded-xl transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body with Full Message */}
              <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
                <div>
                  <h3 className="text-base font-black text-slate-900 leading-snug">
                    {selectedNotification.title}
                  </h3>
                  <div className="flex items-center gap-1.5 text-slate-400 text-xs mt-1.5">
                    <Clock size={12} />
                    <span>Received: {selectedNotification.timestamp}</span>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/70">
                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-wrap font-medium">
                    {selectedNotification.message}
                  </p>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 sm:p-5 bg-white border-t border-slate-100 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={(e) => handleDelete(e, selectedNotification.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                >
                  <Trash2 size={15} />
                  <span>Delete</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedNotification(null)}
                    className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    Close
                  </button>

                  {(selectedNotification.link || selectedNotification.actionText) && (
                    <button
                      type="button"
                      onClick={() => handleAction(selectedNotification)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-blue hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                    >
                      <span>{selectedNotification.actionText || 'Open Action'}</span>
                      <ExternalLink size={13} />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
