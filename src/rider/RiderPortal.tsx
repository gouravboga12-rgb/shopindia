import React, { useState } from 'react';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { RiderProvider } from './context/RiderContext';
import { RiderHeader } from './components/RiderHeader';
import { RiderSidebar } from './components/RiderSidebar';
import { RiderBottomNav } from './components/RiderBottomNav';
import { IncomingRadarModal } from './components/IncomingRadarModal';
import { RiderLogin } from './pages/RiderLogin';
import { RiderDashboard } from './pages/RiderDashboard';
import { RiderOrders } from './pages/RiderOrders';
import { RiderWallet } from './pages/RiderWallet';
import { RiderProfile } from './pages/RiderProfile';

const RiderContent: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [tab, setTab] = useState('radar');

  if (!isAuthenticated) {
    const registerRequested =
      window.location.pathname.includes('/register') || window.location.hash.includes('/register');
    return <RiderLogin initialRegister={registerRequested} />;
  }

  const renderTab = () => {
    switch (tab) {
      case 'radar':
        return <RiderDashboard onNavigateToTab={setTab} />;
      case 'orders':
        return <RiderOrders />;
      case 'wallet':
        return <RiderWallet />;
      case 'profile':
        return <RiderProfile />;
      default:
        return <RiderDashboard onNavigateToTab={setTab} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Top sticky status header */}
      <RiderHeader />

      <div className="flex flex-1">
        {/* Desktop Sidebar Navigation */}
        <RiderSidebar currentTab={tab} onTabChange={setTab} />

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-24 sm:pb-8 max-w-5xl mx-auto w-full">
          {renderTab()}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <RiderBottomNav currentTab={tab} onTabChange={setTab} />

      {/* Global Real-time 30s Countdown Incoming Dispatch Modal */}
      <IncomingRadarModal />
    </div>
  );
};

export const RiderPortal: React.FC = () => {
  return (
    <AuthProvider storagePrefix="rider">
      <RiderProvider>
        <RiderContent />
      </RiderProvider>
    </AuthProvider>
  );
};
