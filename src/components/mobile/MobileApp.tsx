import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { VerticalShopMobile } from './VerticalShopMobile';
import { VerticalQuickCommerceMobile } from './VerticalQuickCommerceMobile';
import { VerticalServicesMobile } from './VerticalServicesMobile';
import { SearchPage } from '../../pages/Search';
import { ProductDetailPage } from '../../pages/ProductDetail';
import { CartPage } from '../../pages/Cart';
import { OrdersPage } from '../../pages/Orders';
import { ProfilePage } from '../../pages/Profile';
import { NotificationsPage } from '../../pages/Notifications';
import { CategoriesPage } from '../../pages/Categories';
import { Home, User, MapPin, X, Search, ChevronDown, ShoppingBag, Zap, Wrench, LayoutGrid, Bell, ShoppingCart, ListOrdered, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ServiceQuickSupport } from '../common/ServiceQuickSupport';
import { LocationModal } from '../common/LocationModal';

export const MobileApp: React.FC = () => {
  const {
    currentVertical,
    setCurrentVertical,
    currentPath,
    navigateTo,
    location,
    cart,
    searchQuery,
    setSearchQuery,
    notifications
  } = useApp();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showSupportDrawer, setShowSupportDrawer] = useState(false);
  const [showHeader, setShowHeader] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          if (currentPath !== 'home') {
            setShowHeader(true);
            ticking = false;
            return;
          }
          if (currentScrollY > 80) {
            if (currentScrollY > lastScrollY.current) {
              setShowHeader(false); // Scrolling down, collapse
            } else {
              setShowHeader(true); // Scrolling up, reveal
            }
          } else {
            setShowHeader(true); // Near top, reveal
          }
          lastScrollY.current = currentScrollY;
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [currentPath]);

  const cartItemCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const unreadNotificationsCount = notifications.filter(n => !n.read).length;

  const renderActiveScreen = () => {
    switch (currentPath) {
      case 'home':
        if (currentVertical === 'quick') return <VerticalQuickCommerceMobile />;
        if (currentVertical === 'services') return <VerticalServicesMobile />;
        return <VerticalShopMobile />;
      case 'category':
        return <CategoriesPage />;
      case 'search':
        return <SearchPage />;
      case 'detail':
        return <ProductDetailPage />;
      case 'cart':
        return <CartPage />;
      case 'orders':
        return <OrdersPage />;
      case 'profile':
        return <ProfilePage />;
      case 'notifications':
        return <NotificationsPage />;
      default:
        return <VerticalShopMobile />;
    }
  };

  const getActiveTab = () => {
    if (currentPath === 'home') return 'home';
    if (currentPath === 'category') return 'category';
    if (currentPath === 'cart') return 'cart';
    if (currentPath === 'orders') return 'orders';
    if (currentPath === 'profile') return 'profile';
    return '';
  };

  const activeTab = getActiveTab();
  const isServices = currentVertical === 'services';

  return (
    <div className="min-h-screen pb-16 flex flex-col w-full relative transition-colors duration-300 bg-brand-bg text-brand-graphite font-sans">
      {currentPath === 'home' && (
      <div 
        style={{ transform: showHeader ? 'translateY(0)' : 'translateY(-126px)' }}
        className={`w-full px-4 fixed top-0 left-0 right-0 z-40 transition-all duration-220 ease-in-out flex flex-col py-3.5 gap-2.5 ${
          showHeader ? 'shadow-none' : 'shadow-soft'
        } bg-white border-b border-brand-border/60 text-brand-graphite`}
      >
        
        {/* Row 1: Switcher Cards (Static height, transition opacity only) */}
        {/* Row 1: Segmented Vertical Selector (Mobile) */}
        <div className={`w-full transition-all duration-220 flex-shrink-0 ${
          showHeader ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}>
          <div className="grid grid-cols-3 gap-2 w-full select-none p-1 rounded-2xl bg-slate-200/50 border border-slate-200">
            {(['shop', 'quick', 'services'] as const).map(v => {
              const isActive = currentVertical === v;
              const config = {
                shop: { 
                  title: 'E-Commerce', 
                  badge: 'MEGASTORE',
                  badgeActive: 'bg-blue-500/25 text-blue-200 border-blue-400/40',
                  badgeInactive: 'bg-blue-50 text-blue-700 border-blue-200',
                  icon: ShoppingBag,
                  iconActive: 'bg-blue-500 text-white',
                  iconInactive: 'bg-blue-50 text-blue-600',
                  activeClass: 'bg-slate-950 text-white shadow-md ring-2 ring-blue-500/30'
                },
                quick: { 
                  title: 'Quick', 
                  badge: '⚡ 10-20M',
                  badgeActive: 'bg-emerald-500/25 text-emerald-200 border-emerald-400/40 animate-pulse',
                  badgeInactive: 'bg-emerald-100 text-emerald-800 border-emerald-300 animate-pulse',
                  icon: Zap,
                  iconActive: 'bg-emerald-500 text-white',
                  iconInactive: 'bg-emerald-50 text-emerald-600',
                  activeClass: 'bg-slate-950 text-white shadow-md ring-2 ring-emerald-500/30'
                },
                services: { 
                  title: 'Glacons', 
                  badge: '🛠️ AC & CARE',
                  badgeActive: 'bg-amber-500/25 text-amber-200 border-amber-400/40',
                  badgeInactive: 'bg-amber-50 text-amber-900 border-amber-300',
                  icon: Wrench,
                  iconActive: 'bg-amber-500 text-slate-950',
                  iconInactive: 'bg-amber-50 text-amber-700',
                  activeClass: 'bg-slate-950 text-white shadow-md ring-2 ring-amber-500/30'
                }
              };
              const item = config[v];
              const Icon = item.icon;

              return (
                <button
                  key={v}
                  onClick={() => {
                    setCurrentVertical(v);
                    navigateTo('home');
                  }}
                  className={`flex flex-col items-center justify-center gap-0.5 py-1.5 px-1 rounded-xl text-center relative transition-all duration-200 active:scale-95 focus:outline-none ${
                    isActive ? item.activeClass : 'bg-white text-slate-800 border border-slate-200 shadow-2xs'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${
                      isActive ? item.iconActive : item.iconInactive
                    }`}>
                      <Icon size={11} strokeWidth={2.6} />
                    </div>
                    <span className={`text-[11px] tracking-tight leading-none ${isActive ? 'font-black text-white' : 'font-bold text-slate-900'}`}>
                      {item.title}
                    </span>
                  </div>
                  <span className={`text-[8px] font-black uppercase px-1 py-0.2 rounded-full border tracking-wide whitespace-nowrap mt-0.5 ${
                    isActive ? item.badgeActive : item.badgeInactive
                  }`}>
                    {item.badge}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Row 2: Location indicator row (Static height, transition opacity only) */}
        <div className={`w-full transition-all duration-220 h-[36px] flex-shrink-0 flex items-center justify-between ${
          showHeader ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}>
          <div 
            onClick={() => setShowLocationModal(true)}
            className={`flex items-center py-1.5 px-1 text-left select-none cursor-pointer transition-colors max-w-[75%]`}
          >
            <div className="flex gap-2 items-center overflow-hidden">
              <MapPin size={12} className="text-slate-800 shrink-0" />
              <span className="text-xs font-bold truncate text-slate-800">
                {location}
              </span>
            </div>
            <ChevronDown size={11} className="text-slate-800 shrink-0 ml-1" />
          </div>

          <div className="flex items-center gap-4 px-1 shrink-0">
            <button onClick={() => navigateTo('notifications')} className="relative transition-transform active:scale-95">
              <Bell size={18} strokeWidth={2.2} className="text-slate-800" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1.5 flex h-[14px] min-w-[14px] items-center justify-center rounded-full bg-brand-red px-1 text-[9px] font-black text-white font-numbers shadow-sm border border-white">
                  {unreadNotificationsCount}
                </span>
              )}
            </button>
            <button onClick={() => navigateTo('cart')} className="relative transition-transform active:scale-95">
              <ShoppingCart size={18} strokeWidth={2.2} className="text-slate-800" />
              {cartItemCount > 0 && (
                <span className="absolute -top-1.5 -right-2 flex h-[14px] min-w-[14px] items-center justify-center rounded-full bg-brand-red px-1 text-[9px] font-black text-white font-numbers shadow-sm">
                  {cartItemCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Row 3: Search Bar Trigger (Static height, always visible) */}
        <div className="w-full h-[44px] flex-shrink-0 select-none">
          <div
            onClick={() => { setSearchQuery(''); navigateTo('search'); }}
            className="w-full bg-white border-[2px] border-[#2874F0] rounded-full py-2.5 px-4 flex items-center justify-between shadow-sm text-brand-slate text-xs font-medium cursor-pointer transition-all active:scale-[0.99] leading-none shrink-0"
          >
            <div className="flex items-center gap-2.5">
              <Search size={16} className="text-zinc-500" />
              <span className="text-zinc-500 font-sans text-[12px] font-medium truncate max-w-[170px] sm:max-w-xs">
                Search products, brands and catalog...
              </span>
            </div>
            <div className="flex items-center gap-3 text-zinc-400 select-none shrink-0">
              <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                <path d="M19 10v1a7 7 0 0 1-14 0v-1M12 19v4M8 23h8" />
              </svg>
              <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Screen Router */}
      <div className={`flex-1 w-full relative ${currentPath === 'home' ? 'pt-[182px]' : 'pt-0'}`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={`${currentPath}-${currentVertical}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="w-full"
          >
            {renderActiveScreen()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Native-style Mobile Bottom Navigation Tab Bar (Rounded 24px) */}
      {currentPath !== 'detail' && (
        <nav className={`fixed bottom-0 left-0 right-0 h-16 border-t border-brand-border/60 z-45 flex justify-around items-center select-none shadow-[0_-4px_20px_rgba(0,0,0,0.04)] bg-white transition-colors duration-300 px-2`}>
          {[
          { id: 'home', label: 'Home', icon: Home, action: () => navigateTo('home') },
          {
            id: 'category',
            label: 'Category',
            icon: LayoutGrid,
            action: () => navigateTo('category')
          },
          { id: 'orders', label: isServices ? 'Bookings' : 'Orders', icon: ListOrdered, action: () => navigateTo('orders') },
          { id: 'cart', label: 'Cart', icon: ShoppingCart, action: () => navigateTo('cart'), badge: true },
          { id: 'profile', label: 'Account', icon: User, action: () => navigateTo('profile') }
        ].map(tab => {
          const isActive = (tab.id === 'support' && showSupportDrawer) || activeTab === tab.id || (tab.id === 'search' && currentPath === 'search' && !searchQuery);
          const Icon = tab.icon;
          const activeColor = isServices ? 'text-amber-600' : 'text-[#1A73E8]';
          const activeFill = isServices ? '#d97706' : '#1A73E8';
          const inactiveColor = 'text-[#64748b]';

          return (
            <motion.button
              key={tab.id}
              onClick={tab.action}
              whileTap={{ scale: 0.9 }}
              className={`flex flex-col items-center justify-center gap-1 h-full w-full relative transition-colors py-2 ${
                isActive ? `${activeColor}` : inactiveColor
              }`}
            >
              <div className="relative">
                {/* When active, we set fill to the active color, else transparent */}
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} className="transition-all duration-300" fill={isActive ? activeFill : 'transparent'} stroke={isActive ? activeFill : 'currentColor'} />
                {tab.badge && cartItemCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-xs font-black text-white font-numbers border border-white">
                    {cartItemCount}
                  </span>
                )}
              </div>
              <span className={`text-xs font-sans transition-all duration-300 ${isActive ? 'font-bold' : 'font-medium'}`}>{tab.label}</span>
            </motion.button>
          );
        })}
        </nav>
      )}

      {/* Support & AI Chat Drawer Bottom Sheet */}
      <AnimatePresence>
        {showSupportDrawer && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center select-none backdrop-blur-xs">
            <div className="absolute inset-0" onClick={() => setShowSupportDrawer(false)} />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 220 }}
              className="w-full max-h-[88vh] overflow-y-auto rounded-t-[28px] p-4 pb-8 text-left z-50 shadow-elevated bg-white border-t border-brand-border text-brand-graphite font-sans"
            >
              <div className="flex justify-between items-center border-b border-brand-border pb-3 mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center">
                    <MessageSquare size={16} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-brand-graphite font-heading">Services Support & Live Help</h3>
                    <p className="text-[10px] text-slate-400 font-medium">Instant AI Answers & Ticket Desk</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSupportDrawer(false)}
                  className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 font-bold"
                >
                  <X size={14} />
                </button>
              </div>

              <ServiceQuickSupport />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Hamburger Drawer Modal Sidebar */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
              className="fixed inset-0 bg-brand-graphite/40 z-50 backdrop-blur-xs"
            />
            {/* Drawer Panel */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 220 }}
              className="fixed inset-y-0 left-0 w-72 bg-white text-brand-graphite shadow-elevated z-50 flex flex-col select-none border-r border-brand-border"
            >
              {/* Profile header of drawer */}
              <div className="bg-brand-graphite text-white p-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white font-extrabold text-sm border border-white/10">
                    G
                  </div>
                  <div className="flex flex-col leading-tight text-left">
                    <span className="font-extrabold text-sm">Guest Account</span>
                    <span className="text-xs text-zinc-400 font-semibold">guest@shopindia.com</span>
                  </div>
                </div>
                <button onClick={() => setDrawerOpen(false)} className="text-zinc-400 hover:text-white p-1 rounded-full">
                  <X size={18} />
                </button>
              </div>

              {/* Drawer Links */}
              <div className="flex-1 overflow-y-auto py-5 flex flex-col font-bold text-xs">
                <span className="px-5 text-xs text-brand-slate uppercase tracking-widest block mb-2">Business Verticals</span>
                <button
                  onClick={() => { setCurrentVertical('shop'); setDrawerOpen(false); }}
                  className={`flex items-center gap-3 px-5 py-3 text-left border-l-4 ${currentVertical === 'shop' ? 'border-brand-blue bg-blue-50/30 text-brand-blue' : 'border-transparent text-brand-graphite'}`}
                >
                  Shop (E-commerce)
                </button>
                <button
                  onClick={() => { setCurrentVertical('quick'); setDrawerOpen(false); }}
                  className={`flex items-center gap-3 px-5 py-3 text-left border-l-4 ${currentVertical === 'quick' ? 'border-brand-green bg-green-50/30 text-brand-green' : 'border-transparent text-brand-graphite'}`}
                >
                  10 Min Delivery (Groceries)
                </button>
                <button
                  onClick={() => { setCurrentVertical('services'); setDrawerOpen(false); }}
                  className={`flex items-center gap-3 px-5 py-3 text-left border-l-4 ${currentVertical === 'services' ? 'border-services-gold bg-amber-50/20 text-services-gold' : 'border-transparent text-brand-graphite'}`}
                >
                  Home Services
                </button>

                <div className="border-t border-brand-border my-4" />

                <span className="px-5 text-xs text-brand-slate uppercase tracking-widest block mb-2">Quick Links</span>
                <button
                  onClick={() => { navigateTo('profile'); setDrawerOpen(false); }}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors text-left text-brand-graphite"
                >
                  My Profile Settings
                </button>
                <button
                  onClick={() => { navigateTo('orders'); setDrawerOpen(false); }}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors text-left text-brand-graphite"
                >
                  Orders History
                </button>
                <button
                  onClick={() => { navigateTo('cart'); setDrawerOpen(false); }}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors text-left text-brand-graphite"
                >
                  Active Cart
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Address Picker / Real-Time Live Location Modal */}
      <LocationModal isOpen={showLocationModal} onClose={() => setShowLocationModal(false)} />
    </div>
  );
};
