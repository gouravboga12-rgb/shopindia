import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useIsMobile } from '../hooks/useMediaQuery';
import { Bell, Package, Zap, Wrench, ChevronLeft, CheckCircle2, Clock } from 'lucide-react';
import { motion } from 'framer-motion';



export const NotificationsPage: React.FC = () => {
  const { navigateTo, goBack, notifications, markAsRead, markAllAsRead } = useApp();
  const isMobile = useIsMobile();
  const [activeFilter, setActiveFilter] = useState<'all' | 'order' | 'quick' | 'service'>('all');

  const filtered = notifications.filter(n => activeFilter === 'all' || n.type === activeFilter);
  const unreadCount = notifications.filter(n => !n.read).length;

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Zap': return Zap;
      case 'Wrench': return Wrench;
      case 'Package': return Package;
      case 'CheckCircle2': return CheckCircle2;
      default: return Bell;
    }
  };

  return (
    <div className={`w-full min-h-screen bg-[#F5F7FA] font-sans text-brand-graphite pb-12`}>
      {/* Mobile Header Back Button */}
      {isMobile && (
        <div className="bg-white px-4 py-3 border-b flex items-center justify-between sticky top-0 z-30 shadow-sm">
          <div className="flex items-center gap-3">
            <button onClick={goBack} className="p-1 rounded-full hover:bg-slate-50 transition-colors">
              <ChevronLeft size={22} className="text-brand-graphite" />
            </button>
            <h1 className="text-sm font-extrabold font-heading">Notifications</h1>
          </div>
          {unreadCount > 0 && (
            <button onClick={markAllAsRead} className="text-[10px] font-black text-brand-blue uppercase tracking-wider">
              Mark all read
            </button>
          )}
        </div>
      )}

      <div className={`mx-auto ${isMobile ? 'px-0' : 'max-w-3xl px-6 py-8'}`}>
        {!isMobile && (
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <button onClick={goBack} className="p-2 rounded-full hover:bg-slate-200/50 bg-white shadow-sm transition-colors border">
                <ChevronLeft size={20} className="text-brand-graphite" />
              </button>
              <h1 className="text-2xl font-black font-heading tracking-tight">Notifications</h1>
              {unreadCount > 0 && (
                <span className="bg-brand-red text-white text-[10px] font-black px-2 py-0.5 rounded-full font-numbers">
                  {unreadCount} New
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button onClick={markAllAsRead} className="text-xs font-bold text-brand-blue hover:text-blue-700 transition-colors">
                Mark all as read
              </button>
            )}
          </div>
        )}

        {/* Filters */}
        <div className={`flex items-center gap-2 overflow-x-auto no-scrollbar mb-4 ${isMobile ? 'px-4 pt-4' : ''}`}>
          {[
            { id: 'all', label: 'All' },
            { id: 'order', label: 'Orders' },
            { id: 'quick', label: 'Quick' },
            { id: 'service', label: 'Services' }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id as any)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
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
                  transition={{ delay: i * 0.05 }}
                  key={n.id}
                  onClick={() => markAsRead(n.id)}
                  className={`
                    flex gap-4 p-4 cursor-pointer transition-all
                    ${isMobile ? 'border-b border-brand-border/60 bg-white' : 'rounded-[16px] bg-white border border-brand-border shadow-sm hover:shadow-md'}
                    ${!n.read ? 'bg-blue-50/10' : ''}
                  `}
                >
                  <div className={`w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center border border-black/5 ${n.bg} ${n.color}`}>
                    <Icon size={20} strokeWidth={2.5} />
                  </div>
                  
                  <div className="flex-1 flex flex-col pt-0.5">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className={`text-[13px] font-black leading-tight tracking-tight ${!n.read ? 'text-brand-graphite' : 'text-slate-700'}`}>
                        {n.title}
                      </h3>
                      {!n.read && <span className="w-2 h-2 rounded-full bg-brand-blue flex-shrink-0 mt-1 shadow-[0_0_8px_rgba(26,115,232,0.6)]" />}
                    </div>
                    
                    <p className={`text-xs mt-1.5 leading-snug ${!n.read ? 'text-slate-600 font-semibold' : 'text-slate-500 font-medium'}`}>
                      {n.message}
                    </p>
                    
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <Clock size={10} />
                        <span className="text-[10px] font-bold uppercase tracking-wider">{n.timestamp}</span>
                      </div>
                      
                      {n.actionText && (
                        <button 
                          className="text-[10px] font-black uppercase tracking-wider text-brand-blue active:scale-95 transition-transform"
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(n.id);
                            if (n.type === 'order') navigateTo('orders');
                          }}
                        >
                          {n.actionText}
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center px-4 bg-white rounded-card border border-brand-border mt-4 mx-4 md:mx-0">
              <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 mb-4 border border-brand-border">
                <Bell size={28} strokeWidth={2} />
              </div>
              <h3 className="text-sm font-black text-brand-graphite mb-1 font-heading">No notifications yet</h3>
              <p className="text-xs font-bold text-brand-slate max-w-[200px]">
                When you get order updates or promos, they will appear here.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
