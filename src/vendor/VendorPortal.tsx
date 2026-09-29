import React, { useState } from 'react';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { VendorLogin } from './pages/VendorLogin';
import { VendorSidebar } from './VendorSidebar';
import { VendorDashboard } from './pages/VendorDashboard';
import { VendorProducts } from './pages/VendorProducts';
import { VendorOrders } from './pages/VendorOrders';
import { VendorAnalytics } from './pages/VendorAnalytics';
import { VendorWallet } from './pages/VendorWallet';
import { VendorTechnicians } from './pages/VendorTechnicians';

const VendorContent: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [tab, setTab] = useState('dashboard');

  if (!isAuthenticated) {
    const registerRequested = window.location.pathname.includes('/register') || window.location.hash.includes('/register');
    return <VendorLogin initialRegister={registerRequested} />;
  }

  const renderTab = () => {
    switch (tab) {
      case 'dashboard': return <VendorDashboard />;
      case 'products':  return <VendorProducts />;
      case 'orders':    return <VendorOrders />;
      case 'analytics':   return <VendorAnalytics />;
      case 'wallet':      return <VendorWallet />;
      case 'technicians': return <VendorTechnicians />;
      default:            return <VendorDashboard />;
    }
  };

  return (
    <div className="flex min-h-screen bg-[#FAF9F6]">
      <VendorSidebar currentTab={tab} onTabChange={setTab} />
      <main className="flex-1 p-8 overflow-y-auto max-w-7xl mx-auto">
        {renderTab()}
      </main>
    </div>
  );
};

export const VendorPortal: React.FC = () => (
  <AuthProvider storagePrefix="vendor">
    <VendorContent />
  </AuthProvider>
);
