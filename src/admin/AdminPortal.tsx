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
import { CommissionsPage } from './pages/CommissionsPage';
import { RidersPage } from './pages/RidersPage';
import { RegionalAdminsPage } from './pages/RegionalAdminsPage';
import { ReportsPage } from './pages/ReportsPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { OffersPage } from './pages/OffersPage';
import { PromotionsPage } from './pages/PromotionsPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { AdminVendorView } from './pages/AdminVendorView';

export interface ManagedVendor { id: string; name: string; }

const AdminContent: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [tab, setTab] = useState('dashboard');
  const [managedVendor, setManagedVendor] = useState<ManagedVendor | null>(null);

  if (!isAuthenticated) return <AdminLogin />;

  // When a vendor is being managed, render the vendor panel overlay
  if (managedVendor) {
    return (
      <div className="flex min-h-screen bg-[#FAF9F6]">
        <AdminSidebar currentTab={tab} onTabChange={(t) => { setTab(t); setManagedVendor(null); }} />
        <main className="flex-1 p-8 overflow-y-auto max-w-7xl mx-auto">
          <AdminVendorView vendor={managedVendor} onBack={() => setManagedVendor(null)} />
        </main>
      </div>
    );
  }

  const renderTab = () => {
    switch (tab) {
      case 'dashboard': return <Dashboard />;
      case 'regional-admins': return <RegionalAdminsPage />;
      case 'vendors': return <VendorsPage onManage={setManagedVendor} />;
      case 'users': return <UsersPage />;
      case 'products': return <ProductsPage />;
      case 'orders': return <OrdersPage />;
      case 'branches': return <BranchesPage />;
      case 'rbac': return <RBACPage />;
      case 'service-areas': return <ServiceAreasPage />;
      case 'support': return <SupportPage />;
      case 'commissions': return <CommissionsPage />;
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
    <div className="flex min-h-screen bg-[#FAF9F6]">
      <AdminSidebar currentTab={tab} onTabChange={setTab} />
      <main className="flex-1 p-8 overflow-y-auto max-w-7xl mx-auto">
        {renderTab()}
      </main>
    </div>
  );
};

export const AdminPortal: React.FC = () => (
  <AuthProvider storagePrefix="admin">
    <AdminContent />
  </AuthProvider>
);
