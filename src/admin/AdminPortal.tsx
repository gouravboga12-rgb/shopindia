import React, { useState } from 'react';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { AdminLogin } from './pages/AdminLogin';
import { AdminSidebar } from './AdminSidebar';
import { Dashboard } from './pages/Dashboard';
import { VendorsPage } from './pages/VendorsPage';
import { UsersPage } from './pages/UsersPage';
import { ProductsPage } from './pages/ProductsPage';
import { OrdersPage } from './pages/OrdersPage';
import { BranchesPage } from './pages/BranchesPage';
import { RBACPage } from './pages/RBACPage';
import { ServiceAreasPage } from './pages/ServiceAreasPage';
import { SupportPage } from './pages/SupportPage';
import { PricingSettingsPage } from './pages/PricingSettingsPage';
import { RidersPage } from './pages/RidersPage';
import { RegionalAdminsPage } from './pages/RegionalAdminsPage';
import { ReportsPage } from './pages/ReportsPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { OffersPage } from './pages/OffersPage';
import { PromotionsPage } from './pages/PromotionsPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { AdminVendorView } from './pages/AdminVendorView';
import { FinancePage } from './pages/FinancePage';
import { VendorPayoutsPage } from './pages/VendorPayoutsPage';
import { FleetPayoutsPage } from './pages/FleetPayoutsPage';
import { AccountsPage } from './pages/AccountsPage';
import { AccountStatementPage } from './pages/AccountStatementPage';
import { CODSettingsPage } from './pages/CODSettingsPage';
import { ServicesManagementPage } from './pages/ServicesManagementPage';

export interface ManagedVendor { id: string; name: string; }

const AdminContent: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [tab, setTab] = useState('dashboard');
  const [managedVendor, setManagedVendor] = useState<ManagedVendor | null>(null);
  const [statementTarget, setStatementTarget] = useState<{ partyType: string; partyId: string; name?: string } | null>(null);

  if (!isAuthenticated) return <AdminLogin />;

  // When a vendor is being managed, render the vendor panel overlay
  if (managedVendor) {
    return (
      <div className="flex h-screen w-screen overflow-hidden bg-[#FAF9F6]">
        <AdminSidebar currentTab={tab} onTabChange={(t) => { setTab(t); setManagedVendor(null); setStatementTarget(null); }} />
        <main className="flex-1 h-screen overflow-y-auto p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <AdminVendorView vendor={managedVendor} onBack={() => setManagedVendor(null)} />
          </div>
        </main>
      </div>
    );
  }

  const renderTab = () => {
    if (statementTarget) {
      return (
        <AccountStatementPage
          partyType={statementTarget.partyType}
          partyId={statementTarget.partyId}
          initialAccountName={statementTarget.name}
          onBack={() => setStatementTarget(null)}
        />
      );
    }

    switch (tab) {
      case 'dashboard': return <Dashboard />;
      case 'finance': return <FinancePage />;
      case 'payouts-vendors': return <VendorPayoutsPage onOpenStatement={(partyType, partyId, name) => setStatementTarget({ partyType, partyId, name })} />;
      case 'payouts-fleet': return <FleetPayoutsPage onOpenStatement={(partyType, partyId, name) => setStatementTarget({ partyType, partyId, name })} />;
      case 'payouts': return <VendorPayoutsPage onOpenStatement={(partyType, partyId, name) => setStatementTarget({ partyType, partyId, name })} />;
      case 'accounts': return <AccountsPage onOpenStatement={(partyType, partyId, name) => setStatementTarget({ partyType, partyId, name })} />;
      case 'cod-settings': return <CODSettingsPage />;
      case 'regional-admins': return <RegionalAdminsPage />;
      case 'vendors': return <VendorsPage onManage={setManagedVendor} />;
      case 'users': return <UsersPage />;
      case 'products': return <ProductsPage />;
      case 'services': return <ServicesManagementPage />;
      case 'orders': return <OrdersPage />;
      case 'branches': return <BranchesPage />;
      case 'rbac': return <RBACPage />;
      case 'service-areas': return <ServiceAreasPage />;
      case 'support': return <SupportPage />;
      case 'commissions': return <PricingSettingsPage />;
      case 'pricing': return <PricingSettingsPage />;
      case 'riders': return <RidersPage />;
      case 'reports': return <ReportsPage />;
      case 'promotions': return <PromotionsPage />;
      case 'notifications': return <NotificationsPage />;
      case 'offers': return <OffersPage />;
      case 'categories': return <CategoriesPage />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#FAF9F6]">
      <AdminSidebar currentTab={tab} onTabChange={setTab} />
      <main className="flex-1 h-screen overflow-y-auto p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          {renderTab()}
        </div>
      </main>
    </div>
  );
};

export const AdminPortal: React.FC = () => (
  <AuthProvider storagePrefix="admin">
    <AdminContent />
  </AuthProvider>
);
