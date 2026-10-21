import React, { useState } from 'react';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { RegionalAdminSidebar } from './RegionalAdminSidebar';
import { RegionalAdminLogin } from './pages/RegionalAdminLogin';
import { RegionalAdminRegister } from './pages/RegionalAdminRegister';
import { RegionalDashboard } from './pages/RegionalDashboard';
import { RegionalLiveMap } from './pages/RegionalLiveMap';
import { RegionalVendors } from './pages/RegionalVendors';
import { RegionalRiders } from './pages/RegionalRiders';

const RegionalAdminContent: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [tab, setTab] = useState('dashboard');
  const [showRegister, setShowRegister] = useState(() => {
    return window.location.pathname.includes('/register') || window.location.hash.includes('/register');
  });

  if (!isAuthenticated) {
    if (showRegister) {
      return <RegionalAdminRegister onSwitchToLogin={() => setShowRegister(false)} />;
    }
    return <RegionalAdminLogin onSwitchToRegister={() => setShowRegister(true)} />;
  }

  const renderTab = () => {
    switch (tab) {
      case 'dashboard':
        return <RegionalDashboard />;
      case 'live-map':
        return <RegionalLiveMap />;
      case 'vendors':
        return <RegionalVendors />;
      case 'riders':
        return <RegionalRiders />;
      default:
        return <RegionalDashboard />;
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      <RegionalAdminSidebar currentTab={tab} onTabChange={setTab} />
      <main className="flex-1 p-6 sm:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
        {renderTab()}
      </main>
    </div>
  );
};

export const RegionalAdminPortal: React.FC = () => {
  return (
    <AuthProvider storagePrefix="regional_admin">
      <RegionalAdminContent />
    </AuthProvider>
  );
};
