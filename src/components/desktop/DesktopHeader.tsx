import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useCustomer } from '../../context/CustomerContext';
import { useProducts } from '../../hooks/useProducts';
import { CartDrawer } from '../common/CartDrawer';
import { LocationModal } from '../common/LocationModal';
import { 
  Search, Zap, Wrench, Bell, ShoppingCart, User, 
  Mic, Camera, Sparkles, MapPin, ChevronDown, Package, LogOut, Briefcase 
} from 'lucide-react';

export const DesktopHeader: React.FC = () => {
  const {
    currentVertical,
    setCurrentVertical,
    cart,
    navigateTo,
    location,
    searchQuery,
    setSearchQuery,
    getCartTotal,
    notifications
  } = useApp();

  const { isAuthenticated, profile, logout } = useCustomer();

  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);
  const [logoLoaded, setLogoLoaded] = useState(true);
  const suggestionRef = useRef<HTMLDivElement>(null);
  const { products } = useProducts();
  const unreadNotificationsCount = notifications.filter(n => !n.read).length;

  // Handle outside click for search suggestions
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (suggestionRef.current && !suggestionRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update autocomplete suggestions
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSuggestions([]);
      return;
    }

    const filtered = products
      .filter(p => p.vertical === currentVertical &&
        (p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
         p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
         p.brand.toLowerCase().includes(searchQuery.toLowerCase()))
      )
      .map(p => p.title)
      .slice(0, 5);

    setSuggestions(filtered);
  }, [searchQuery, currentVertical]);

  const handleSearchSubmit = (query: string) => {
    setSearchQuery(query);
    setShowSuggestions(false);
    navigateTo('search');
  };

  const cartItemCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  // Design System vertical themes mapping (Apple / Linear style)
  const verticalThemes = {
    shop: {
      headerBg: 'bg-white/95 backdrop-blur-md border-b border-brand-border',
      textColor: 'text-brand-graphite',
      subTextColor: 'text-brand-slate',
      inputFocus: 'focus-within:border-brand-blue focus-within:ring-2 focus-within:ring-brand-blue/10',
      buttonBg: 'bg-brand-blue text-white hover:bg-blue-600',
      badgeColor: 'bg-brand-blue/10 text-brand-blue'
    },
    quick: {
      headerBg: 'bg-white/95 backdrop-blur-md border-b border-brand-border',
      textColor: 'text-brand-graphite',
      subTextColor: 'text-brand-slate',
      inputFocus: 'focus-within:border-brand-green focus-within:ring-2 focus-within:ring-brand-green/10',
      buttonBg: 'bg-brand-green text-white hover:bg-emerald-650',
      badgeColor: 'bg-brand-green/10 text-brand-green'
    },
    services: {
      headerBg: 'bg-brand-graphite/95 backdrop-blur-md border-b border-zinc-800',
      textColor: 'text-white',
      subTextColor: 'text-zinc-400',
      inputFocus: 'focus-within:border-services-gold focus-within:ring-2 focus-within:ring-services-gold/15',
      buttonBg: 'bg-services-gold text-brand-graphite hover:bg-services-gold/90',
      badgeColor: 'bg-services-gold/15 text-services-gold'
    }
  };

  const theme = verticalThemes[currentVertical];


  return (
    <header className="w-full flex flex-col sticky top-0 z-50 shadow-soft select-none theme-transition transition-all duration-300 bg-white text-brand-graphite border-b border-brand-border/60">
      {/* Top Vertical Selector Bar — Highlighted Platform Cards inspired by JioHotstar & Tadka */}
      <div className="w-full border-b flex justify-between items-center px-8 lg:px-12 py-2 transition-colors duration-300 select-none bg-slate-50/80 border-slate-200/80">
        <div className="flex items-center gap-2">
          {/* Subtle guide label for customers */}
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 hidden xl:flex items-center gap-1.5 mr-1 select-none">
            <Sparkles size={12} className="text-amber-500 fill-amber-400" />
            <span>Switch Store:</span>
          </span>

          <div className="flex items-center gap-2 p-1 rounded-2xl bg-white border border-slate-200/90 shadow-sm">
            {/* 1. ShopIndia Tab (E-Commerce) */}
            {(() => {
              const isActive = currentVertical === 'shop';
              return (
                <button
                  key="shop"
                  onClick={() => setCurrentVertical('shop')}
                  className={`group relative flex items-center justify-between gap-2.5 px-3.5 py-1.5 rounded-[12px] h-[42px] min-w-[150px] transition-all duration-300 cursor-pointer select-none focus:outline-none ${
                    isActive
                      ? 'bg-gradient-to-r from-[#0F172A] via-[#1E293B] to-[#0F172A] text-white shadow-md shadow-slate-900/25 ring-2 ring-blue-500/40 scale-[1.02]'
                      : 'bg-slate-50/90 hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200 hover:border-slate-300 hover:scale-[1.01]'
                  }`}
                  title="ShopIndia — Full E-commerce Catalog"
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-all ${
                      isActive ? 'bg-blue-600 text-white shadow-sm' : 'bg-blue-100 text-blue-700 group-hover:bg-blue-200'
                    }`}>
                      <Sparkles size={13} className={isActive ? 'fill-white' : ''} />
                    </div>
                    <div className="flex flex-col text-left leading-tight">
                      <span className="text-xs font-black tracking-tight">ShopIndia</span>
                      <span className={`text-[10px] font-medium leading-none ${isActive ? 'text-slate-300' : 'text-slate-500'}`}>
                        Mega Store
                      </span>
                    </div>
                  </div>
                  <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full tracking-wider transition-all ${
                    isActive 
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-400/30' 
                      : 'bg-slate-200/80 text-slate-600'
                  }`}>
                    E-COM
                  </span>
                </button>
              );
            })()}

            {/* 2. Quick Commerce Tab (Tadka / Instant Delivery) */}
            {(() => {
              const isActive = currentVertical === 'quick';
              return (
                <button
                  key="quick"
                  onClick={() => setCurrentVertical('quick')}
                  className={`group relative flex items-center justify-between gap-2.5 px-3.5 py-1.5 rounded-[12px] h-[42px] min-w-[155px] transition-all duration-300 cursor-pointer select-none focus:outline-none ${
                    isActive
                      ? 'bg-gradient-to-r from-[#FF0055] via-[#FF5500] to-[#FFAA00] text-white shadow-lg shadow-orange-500/30 ring-2 ring-amber-300 scale-[1.02]'
                      : 'bg-gradient-to-r from-orange-50/90 to-amber-50/90 hover:from-orange-100 hover:to-amber-100 text-orange-950 border border-orange-200 hover:border-orange-300 hover:scale-[1.01]'
                  }`}
                  title="Quick — 10 Minute Grocery Delivery"
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-all ${
                      isActive ? 'bg-white text-orange-600 shadow-sm animate-pulse' : 'bg-orange-500 text-white shadow-xs'
                    }`}>
                      <Zap size={13} className="fill-current" />
                    </div>
                    <div className="flex flex-col text-left leading-tight">
                      <span className="text-xs font-black tracking-tight">Quick</span>
                      <span className={`text-[10px] font-semibold leading-none ${isActive ? 'text-amber-100' : 'text-orange-700'}`}>
                        Instant Delivery
                      </span>
                    </div>
                  </div>
                  <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full tracking-wider transition-all ${
                    isActive 
                      ? 'bg-white/25 text-white border border-white/40' 
                      : 'bg-orange-500 text-white shadow-xs'
                  }`}>
                    10 MIN
                  </span>
                </button>
              );
            })()}

            {/* 3. Glacons Services Tab */}
            {(() => {
              const isActive = currentVertical === 'services';
              return (
                <button
                  key="services"
                  onClick={() => setCurrentVertical('services')}
                  className={`group relative flex items-center justify-between gap-2.5 px-3.5 py-1.5 rounded-[12px] h-[42px] min-w-[155px] transition-all duration-300 cursor-pointer select-none focus:outline-none ${
                    isActive
                      ? 'bg-gradient-to-r from-[#047857] via-[#0D9488] to-[#10B981] text-white shadow-lg shadow-teal-900/30 ring-2 ring-emerald-300 scale-[1.02]'
                      : 'bg-gradient-to-r from-teal-50/90 to-emerald-50/90 hover:from-teal-100 hover:to-emerald-100 text-teal-950 border border-teal-200 hover:border-teal-300 hover:scale-[1.01]'
                  }`}
                  title="Glacons — Home, AC & Appliance Repair Services"
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-all ${
                      isActive ? 'bg-white text-teal-700 shadow-sm' : 'bg-teal-600 text-white shadow-xs'
                    }`}>
                      <Wrench size={12} strokeWidth={2.5} />
                    </div>
                    <div className="flex flex-col text-left leading-tight">
                      <span className="text-xs font-black tracking-tight">Glacons</span>
                      <span className={`text-[10px] font-semibold leading-none ${isActive ? 'text-emerald-100' : 'text-teal-700'}`}>
                        Home Services
                      </span>
                    </div>
                  </div>
                  <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full tracking-wider transition-all ${
                    isActive 
                      ? 'bg-white/25 text-white border border-white/40' 
                      : 'bg-teal-600 text-white shadow-xs'
                  }`}>
                    PRO
                  </span>
                </button>
              );
            })()}
          </div>
        </div>
        <button 
          onClick={() => setShowLocationModal(true)}
          className="flex items-center gap-1.5 text-xs font-bold py-1 px-2.5 rounded-lg hover:bg-slate-100/90 border border-transparent hover:border-brand-border/60 transition-all cursor-pointer select-none group"
        >
          <MapPin size={13} className="text-brand-blue shrink-0 group-hover:animate-bounce" />
          <span className="text-brand-slate">Delivering to: <strong className="text-brand-graphite">{location}</strong></span>
          <ChevronDown size={11} className="text-brand-slate shrink-0 ml-0.5 group-hover:text-brand-blue" />
        </button>
      </div>

      {/* Main Header Container */}
      <div className="w-full flex items-center justify-between px-12 py-3.5 transition-colors duration-300 bg-transparent text-brand-graphite">
        <div className="flex items-center gap-10 w-full max-w-5xl">
          {/* Logo Container */}
          <div onClick={() => navigateTo('home')} className="flex flex-col cursor-pointer shrink-0">
            {logoLoaded ? (
              <img
                src="/logo.png"
                alt="ShopIndia"
                className="h-14 object-contain transition-all"
                onError={() => setLogoLoaded(false)}
              />
            ) : (
              <span className="text-xl font-extrabold tracking-tight italic flex items-center gap-1 text-brand-graphite">
                ShopIndia
                {currentVertical === 'quick' && <span className="text-xs uppercase font-black tracking-widest px-1.5 py-0.5 rounded bg-brand-green/10 text-brand-green not-italic">10M</span>}
                {currentVertical === 'services' && <span className="text-xs uppercase font-black tracking-widest px-1.5 py-0.5 rounded bg-services-gold/15 text-services-gold not-italic">PRO</span>}
              </span>
            )}
            {currentVertical === 'shop' && (
              <span className="text-xs tracking-wider uppercase font-black text-brand-orange hover:underline flex items-center gap-0.5 leading-none mt-0.5">
                Explore <span className="text-brand-blue">Plus</span>
                <Sparkles size={8} className="fill-brand-blue text-brand-blue animate-pulse" />
              </span>
            )}
          </div>

          {/* Design System Search bar */}
          <div ref={suggestionRef} className="relative w-full max-w-xl">
            <div className={`flex w-full rounded-input overflow-hidden items-center border transition-all duration-300 bg-white/80 border-brand-border/40 text-brand-graphite backdrop-blur-md ${theme.inputFocus}`}>
              <button
                onClick={() => handleSearchSubmit(searchQuery)}
                className="p-3.5 flex items-center justify-center text-brand-slate hover:text-brand-blue transition-colors"
              >
                <Search size={15} strokeWidth={2.5} />
              </button>
              <input
                type="text"
                placeholder={
                  currentVertical === 'quick'
                    ? "Search for milk, bananas, fresh bread, snacks..."
                    : currentVertical === 'services'
                    ? "Search for AC repair, deep cleaning, massage..."
                    : "Search for products, brands and tech catalog..."
                }
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSearchSubmit(searchQuery);
                }}
                className="w-full py-2.5 text-xs bg-transparent focus:outline-none placeholder-brand-slate font-medium text-brand-graphite"
              />
              <div className="flex items-center gap-3 px-4 border-l border-brand-border/20 text-brand-slate shrink-0">
                <button className="hover:text-brand-blue hover:scale-110 active:scale-95 transition-all p-0.5" title="Voice Search">
                  <Mic size={14} />
                </button>
                <button className="hover:text-brand-blue hover:scale-110 active:scale-95 transition-all p-0.5" title="Search by Image">
                  <Camera size={14} />
                </button>
              </div>
            </div>

            {/* Auto-suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-brand-border rounded-card shadow-elevated overflow-hidden text-brand-graphite z-50">
                {suggestions.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleSearchSubmit(item)}
                    className="flex items-center gap-3.5 px-5 py-3 text-xs hover:bg-slate-50 cursor-pointer font-bold border-b border-brand-border last:border-0 transition-colors"
                  >
                    <Search size={13} className="text-brand-slate" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Menu Controls */}
        <div className="flex items-center gap-8 shrink-0 text-xs font-bold">
          {/* Notifications Button */}
          <button 
            onClick={() => navigateTo('notifications')}
            className={`flex items-center gap-2 py-2 px-3 rounded-button transition-all hover:bg-slate-100 ${theme.buttonBg.replace('bg-', 'hover:bg-').replace('text-white', 'text-brand-graphite')}`}
          >
            <div className="relative">
              <Bell size={18} />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-brand-red px-1 text-[8px] font-black text-white font-numbers border border-white">
                  {unreadNotificationsCount}
                </span>
              )}
            </div>
            <span className={currentVertical === 'services' ? 'text-white' : ''}>Alerts</span>
          </button>

          {/* Profile Dropdown */}
          <div
            className="relative"
            onMouseEnter={() => setShowProfileDropdown(true)}
            onMouseLeave={() => setShowProfileDropdown(false)}
          >
            <button
              onClick={() => navigateTo(isAuthenticated ? 'dashboard' : 'profile')}
              className={`flex items-center gap-2 py-2 px-4 rounded-button transition-all border border-brand-border/10 shadow-soft font-extrabold ${theme.buttonBg}`}
            >
              {isAuthenticated && profile ? (
                <>
                  <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs uppercase font-black tracking-widest">{profile.name?.charAt(0) || 'U'}</div>
                  <span>{profile.name?.split(' ')[0] || 'User'}</span>
                </>
              ) : (
                <>
                  <User size={15} />
                  <span>Sign In</span>
                </>
              )}
              <ChevronDown size={12} className={`transition-transform duration-200 ${showProfileDropdown ? 'rotate-180' : ''}`} />
            </button>

            {/* Profile Dropdown Menu */}
            {showProfileDropdown && (
              <div className="absolute right-0 top-full pt-2.5 w-60 z-50">
                <div className="bg-white text-brand-graphite border border-brand-border rounded-card shadow-elevated overflow-hidden flex flex-col font-bold text-xs">
                  
                  {isAuthenticated && profile ? (
                    <div className="p-4 border-b border-brand-border bg-slate-50/50 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-brand-blue/10 flex items-center justify-center text-brand-blue font-black uppercase">{profile.name?.charAt(0) || 'U'}</div>
                      <div className="flex flex-col leading-tight">
                        <span className="font-extrabold text-brand-graphite">{profile.name || 'User'}</span>
                        <span className="text-xs text-brand-slate font-medium">{profile.email}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 border-b border-brand-border bg-slate-50/50 flex flex-col items-start gap-2">
                      <span className="font-extrabold text-brand-graphite text-sm">Welcome</span>
                      <span className="text-xs text-brand-slate font-medium leading-tight">Sign in to access your orders, saved items, and settings.</span>
                      <button onClick={() => navigateTo('profile')} className="mt-1 w-full py-2 bg-brand-blue text-white rounded-button text-xs uppercase tracking-wider font-bold">Sign In / Register</button>
                    </div>
                  )}

                  <button
                    onClick={() => { navigateTo(isAuthenticated ? 'dashboard' : 'profile'); setShowProfileDropdown(false); }}
                    className="flex items-center gap-3.5 px-5 py-3 hover:bg-slate-50 transition-colors text-left"
                  >
                    <User size={15} className="text-brand-slate" /> My Profile
                  </button>
                  <button
                    onClick={() => { navigateTo('orders'); setShowProfileDropdown(false); }}
                    className="flex items-center gap-3.5 px-5 py-3 hover:bg-slate-50 transition-colors text-left"
                  >
                    <Package size={15} className="text-brand-slate" /> Orders & Tracking
                  </button>
                  <button
                    onClick={() => { setIsCartDrawerOpen(true); setShowProfileDropdown(false); }}
                    className="flex items-center gap-3.5 px-5 py-3 hover:bg-slate-50 transition-colors text-left border-b border-brand-border"
                  >
                    <ShoppingCart size={15} className="text-brand-slate" /> Active Cart
                  </button>
                  
                  {isAuthenticated && (
                    <button
                      onClick={() => { 
                        logout(); 
                        setShowProfileDropdown(false); 
                      }}
                      className="flex items-center gap-3.5 px-5 py-3 hover:bg-red-50 text-brand-red transition-colors text-left font-black"
                    >
                      <LogOut size={15} /> Logout
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => navigateTo('orders')}
            className="transition-colors flex items-center gap-2 hover:text-[#0066FF] text-brand-slate hover:text-brand-graphite"
          >
            <Briefcase size={15} />
            <span>Orders</span>
          </button>

          {/* Cart Button */}
          <button
            onClick={() => navigateTo('cart')}
            className="relative flex items-center gap-2 hover:opacity-85 transition-opacity text-brand-slate hover:text-brand-graphite"
          >
            <div className="relative">
              <ShoppingCart size={16} strokeWidth={2.5} />
              {cartItemCount > 0 && (
                <span className="absolute -top-2 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-orange px-1 text-[8.5px] font-black text-white">
                  {cartItemCount}
                </span>
              )}
            </div>
            <span>Cart</span>
            {cartItemCount > 0 && (
              <span className="text-xs font-black text-brand-graphite dark:text-white hidden lg:inline font-numbers">
                (₹{getCartTotal().toLocaleString('en-IN')})
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Cart Drawer */}
      <CartDrawer isOpen={isCartDrawerOpen} onClose={() => setIsCartDrawerOpen(false)} />

      {/* Location Modal */}
      <LocationModal isOpen={showLocationModal} onClose={() => setShowLocationModal(false)} />
    </header>
  );
};

