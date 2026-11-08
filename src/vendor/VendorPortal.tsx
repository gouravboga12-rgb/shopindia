import React, { useState } from 'react';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { Menu, Store } from 'lucide-react';
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
              <span className="text-sm font-black tracking-tight text-gray-900">ShopIndia</span>
              <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.2 rounded font-mono">
                MERCHANT
              </span>
            </div>
            <p className="text-[11px] text-gray-500 font-medium truncate max-w-[180px]">
              {TAB_TITLES[tab] || user?.name || 'Vendor Hub'}
            </p>
          </div>
        </div>

        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 rounded-xl text-gray-700 hover:text-emerald-700 hover:bg-emerald-50 border border-gray-200 transition-colors cursor-pointer"
          aria-label="Open Navigation Menu"
        >
          <Menu size={18} />
        </button>
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
        {renderTab()}
      </main>

      {/* Mobile Sticky Bottom Navigation */}
      <VendorBottomNav currentTab={tab} onTabChange={handleTabChange} />
    </div>
  );
};

export const VendorPortal: React.FC = () => (
  <AuthProvider storagePrefix="vendor">
    <VendorContent />
  </AuthProvider>
);
