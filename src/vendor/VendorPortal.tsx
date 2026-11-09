import React, { useState } from 'react';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { Menu, Store, Power } from 'lucide-react';
import { VendorProvider, useVendor } from './context/VendorContext';
import { VendorLogin } from './pages/VendorLogin';
import { VendorSidebar } from './VendorSidebar';
import { VendorBottomNav } from './components/VendorBottomNav';
import { VendorDashboard } from './pages/VendorDashboard';
import { VendorProducts } from './pages/VendorProducts';
import { VendorOrders } from './pages/VendorOrders';
import { VendorAnalytics } from './pages/VendorAnalytics';
import { VendorWallet } from './pages/VendorWallet';
import { VendorSupport } from './pages/VendorSupport';
import { VendorSettings } from './pages/VendorSettings';

const TAB_TITLES: Record<string, string> = {
  dashboard: 'Overview & Metrics',
  products: 'Products & Inventory',
  orders: 'Orders Fulfillment',
  analytics: 'Sales Analytics',
  wallet: 'Wallet & Payouts',
  'admin-help': 'Admin Help Desk',
  support: 'Admin Help Desk',
  settings: 'Store Settings & GPS',
};

const VendorContent: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const { vendor, isOnline, toggleOnline, toggling } = useVendor();
  const [tab, setTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!isAuthenticated) {
    const registerRequested = window.location.pathname.includes('/register') || window.location.hash.includes('/register');
    return <VendorLogin initialRegister={registerRequested} />;
  }

  const handleTabChange = (newTab: string) => {
    setTab(newTab);
    setSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderTab = () => {
    switch (tab) {
      case 'dashboard':  return <VendorDashboard />;
      case 'products':   return <VendorProducts />;
      case 'orders':     return <VendorOrders />;
      case 'analytics':  return <VendorAnalytics />;
      case 'wallet':     return <VendorWallet />;
      case 'admin-help':
      case 'support':    return <VendorSupport />;
      case 'settings':   return <VendorSettings />;
      default:           return <VendorDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-gray-800 flex flex-col lg:flex-row">
      {/* Mobile Top Header */}
      <header className="lg:hidden sticky top-0 z-40 bg-white border-b border-gray-200/80 px-4 py-3 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
            <Store className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-black tracking-tight text-gray-900 truncate max-w-[120px]">
                {vendor?.businessName || 'ShopIndia'}
              </span>
              <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.2 rounded font-mono">
                STORE
              </span>
            </div>
            <p className="text-[11px] text-gray-500 font-medium truncate max-w-[130px]">
              {TAB_TITLES[tab] || user?.name || 'Vendor Hub'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Mobile Online Toggle Switch */}
          <button
            onClick={() => toggleOnline()}
            disabled={toggling}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full font-bold text-xs transition-all cursor-pointer whitespace-nowrap active:scale-95 ${
              isOnline
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                : 'bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-300'
            }`}
          >
            <Power className={`w-3.5 h-3.5 ${isOnline ? 'animate-pulse' : ''}`} />
            <span>{isOnline ? 'ONLINE' : 'OFFLINE'}</span>
          </button>

          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-xl text-gray-700 hover:text-emerald-700 hover:bg-emerald-50 border border-gray-200 transition-colors cursor-pointer"
            aria-label="Open Navigation Menu"
          >
            <Menu size={18} />
          </button>
        </div>
      </header>

      {/* Desktop & Mobile Drawer Sidebar */}
      <VendorSidebar
        currentTab={tab}
        onTabChange={handleTabChange}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content View with Safe Bottom Padding for Mobile Nav */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8 overflow-y-auto max-w-7xl mx-auto w-full">
        {/* Desktop Top Header Bar with Store Online/Offline Switch */}
        <div className="hidden lg:flex items-center justify-between bg-white border border-gray-200/80 rounded-2xl px-6 py-4 mb-6 shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold shadow-2xs">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-gray-900 font-heading">
                  {vendor?.businessName || user?.name || 'My Merchant Store'}
                </h2>
                <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full uppercase tracking-wider font-mono">
                  Verified Partner
                </span>
              </div>
              <p className="text-xs text-gray-500 font-medium">
                {TAB_TITLES[tab] || 'Overview'} • {vendor?.city ? `${vendor.city}, ${vendor.state || 'India'}` : 'Hyper-local Delivery Network'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="flex items-center justify-end gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
                <p className="text-xs font-bold text-gray-900">
                  {isOnline ? 'Store is ONLINE' : 'Store is OFFLINE'}
                </p>
              </div>
              <p className="text-[11px] text-gray-500">
                {isOnline ? 'Receiving orders & service bookings' : 'Incoming orders paused'}
              </p>
            </div>

            {/* Desktop Online / Offline Action Button */}
            <button
              onClick={() => toggleOnline()}
              disabled={toggling}
              className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-xs sm:text-sm transition-all shadow-xs active:scale-95 cursor-pointer whitespace-nowrap ${
                isOnline
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20'
                  : 'bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-300'
              }`}
            >
              <Power className={`w-4 h-4 ${isOnline ? 'animate-pulse' : ''}`} />
              <span>{isOnline ? 'ONLINE' : 'GO ONLINE'}</span>
            </button>
          </div>
        </div>

        {renderTab()}
      </main>

      {/* Mobile Sticky Bottom Navigation */}
      <VendorBottomNav currentTab={tab} onTabChange={handleTabChange} />
    </div>
  );
};

export const VendorPortal: React.FC = () => (
  <AuthProvider storagePrefix="vendor">
    <VendorProvider>
      <VendorContent />
    </VendorProvider>
  </AuthProvider>
);
