import React, { useState } from 'react';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { RegionalAdminSidebar } from './RegionalAdminSidebar';
import { RegionalAdminHeader } from './components/RegionalAdminHeader';
import { RegionalAdminBottomNav } from './components/RegionalAdminBottomNav';
import { RegionalAdminLogin } from './pages/RegionalAdminLogin';
import { RegionalAdminRegister } from './pages/RegionalAdminRegister';
import { RegionalDashboard } from './pages/RegionalDashboard';
import { RegionalLiveMap } from './pages/RegionalLiveMap';
import { RegionalVendors } from './pages/RegionalVendors';
import { RegionalRiders } from './pages/RegionalRiders';
import { RegionalSupport } from './pages/RegionalSupport';
import { RegionalPayouts } from './pages/RegionalPayouts';
import { RegionalCODCollection } from './pages/RegionalCODCollection';
import { RegionalSettings } from './pages/RegionalSettings';
import { AccountStatementPage } from '../admin/pages/AccountStatementPage';

const RegionalAdminContent: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [tab, setTab] = useState('dashboard');
  const [statementTarget, setStatementTarget] = useState<{ partyType: string; partyId: string; name?: string } | null>(null);
  const [showRegister, setShowRegister] = useState(() => {
    return window.location.pathname.includes('/register') || window.location.hash.includes('/register');
  });

  if (!isAuthenticated) {
    if (showRegister) {
      return <RegionalAdminRegister onSwitchToLogin={() => setShowRegister(false)} />;
    }
    return <RegionalAdminLogin onSwitchToRegister={() => setShowRegister(true)} />;
  }

  const handleTabChange = (newTab: string) => {
    setStatementTarget(null);
    setTab(newTab);
  };

  const renderTab = () => {
    if (statementTarget) {
      return (
        <AccountStatementPage
          key={`regional-statement-${statementTarget.partyType}-${statementTarget.partyId}`}
          partyType={statementTarget.partyType}
          partyId={statementTarget.partyId}
          initialAccountName={statementTarget.name}
          onBack={() => setStatementTarget(null)}
        />
      );
    }

    switch (tab) {
      case 'dashboard':
        return <RegionalDashboard />;
      case 'live-map':
        return <RegionalLiveMap />;
      case 'vendors':
        return <RegionalVendors onOpenStatement={(partyType, partyId, name) => setStatementTarget({ partyType, partyId, name })} />;
      case 'riders':
        return <RegionalRiders />;
      case 'cod-remittance':
        return <RegionalCODCollection />;
      case 'payouts':
        return <RegionalPayouts onOpenStatement={(partyType, partyId, name) => setStatementTarget({ partyType, partyId, name })} />;
      case 'support':
        return <RegionalSupport />;
      case 'settings':
        return <RegionalSettings />;
      default:
        return <RegionalDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col lg:flex-row">
      {/* Mobile / Tablet Sticky Header */}
      <RegionalAdminHeader currentTab={tab} onTabChange={handleTabChange} />

      {/* Desktop Persistent Left Sidebar */}
      <RegionalAdminSidebar currentTab={tab} onTabChange={handleTabChange} />

      {/* Main Content View */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8 overflow-y-auto max-w-7xl mx-auto w-full">
        {renderTab()}
      </main>

      {/* Mobile Sticky Bottom Navigation */}
      <RegionalAdminBottomNav currentTab={tab} onTabChange={handleTabChange} />
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
