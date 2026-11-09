import React, { useState } from 'react';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { Menu } from 'lucide-react';
import { AdminLogin } from './pages/AdminLogin';
import { AdminSidebar } from './AdminSidebar';
import { Dashboard } from './pages/Dashboard';
import { VendorsPage } from './pages/VendorsPage';
import { UsersPage } from './pages/UsersPage';
import { ProductsPage } from './pages/ProductsPage';
import { OrdersPage } from './pages/OrdersPage';
import { ServiceAreasPage } from './pages/ServiceAreasPage';
import { SupportPage } from './pages/SupportPage';
import { PricingSettingsPage } from './pages/PricingSettingsPage';
import { RidersPage } from './pages/RidersPage';
import { RegionalAdminsPage } from './pages/RegionalAdminsPage';
import { NotificationsPage } from './pages/NotificationsPage';
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
import { CanceledOrdersPage } from './pages/CanceledOrdersPage';

export interface ManagedVendor { id: string; name: string; }

const TAB_TITLES: Record<string, string> = {
  dashboard: 'Admin Dashboard',
  finance: 'Finance Center',
  'payouts-vendors': 'Merchant Payouts',
  'payouts-fleet': 'Rider & Tech Payouts',
  accounts: 'Accounts & Statements',
  'cod-settings': 'Cash Float & COD',
  commissions: 'Rates & Commissions',
  'regional-admins': 'Regional Admins',
  vendors: 'Vendors Hub',
  riders: 'Riders Operations',
  users: 'Users & Roles',
  products: 'Products Catalog',
  services: 'Services & Repairs',
  categories: 'Categories & Brands',
  orders: 'Orders Management',
  'canceled-orders': 'Canceled Orders & Refunds',
  'service-areas': 'Service Areas',
  support: 'Support Queue',
  promotions: 'Promotions',
  notifications: 'Broadcast Alerts',
};

const AdminContent: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [tab, setTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [managedVendor, setManagedVendor] = useState<ManagedVendor | null>(null);
  const [statementTarget, setStatementTarget] = useState<{ partyType: string; partyId: string; name?: string } | null>(null);

  const handleTabChange = (newTab: string) => {
    setStatementTarget(null);
    setManagedVendor(null);
    setTab(newTab);
    setSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!isAuthenticated) return <AdminLogin />;

  // When a vendor is being managed, render the vendor panel overlay
  if (managedVendor) {
    return (
      <div className="flex flex-col lg:flex-row h-screen w-screen overflow-hidden bg-[#FAF9F6]">
        {/* Mobile Top Header */}
        <header className="lg:hidden sticky top-0 z-40 bg-[#0F2C59] text-white px-4 py-3 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center font-bold text-white text-xs border border-white/20">
              SI
            </div>
            <div>
              <h1 className="text-xs font-black tracking-tight uppercase text-white font-heading">
                Managed Vendor View
              </h1>
              <p className="text-[10px] text-white/60 truncate max-w-[180px]">{managedVendor.name}</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            aria-label="Open Navigation Menu"
          >
            <Menu size={18} />
          </button>
        </header>

        <AdminSidebar
          currentTab={tab}
          onTabChange={handleTabChange}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <main className="flex-1 h-[calc(100vh-56px)] lg:h-screen overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto w-full">
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
          key={`statement-${statementTarget.partyType}-${statementTarget.partyId}`}
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
      case 'canceled-orders': return <CanceledOrdersPage />;
      case 'service-areas': return <ServiceAreasPage />;
      case 'support': return <SupportPage />;
      case 'commissions': return <PricingSettingsPage />;
      case 'pricing': return <PricingSettingsPage />;
      case 'riders': return <RidersPage />;
      case 'promotions': return <PromotionsPage />;
      case 'notifications': return <NotificationsPage />;
      case 'categories': return <CategoriesPage />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen w-screen overflow-hidden bg-[#FAF9F6]">
      {/* Mobile Top Header */}
      <header className="lg:hidden sticky top-0 z-40 bg-[#0F2C59] text-white px-4 py-3 flex items-center justify-between shadow-md shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center font-bold text-white text-xs border border-white/20">
            SI
          </div>
          <div>
            <h1 className="text-xs font-black tracking-tight uppercase text-white font-heading">
              {statementTarget ? 'Account Statement' : (TAB_TITLES[tab] || 'Super Admin')}
            </h1>
            <p className="text-[10px] text-white/60">ShopIndia Super Admin</p>
          </div>
        </div>
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          aria-label="Open Navigation Menu"
        >
          <Menu size={18} />
        </button>
      </header>

      <AdminSidebar
        currentTab={statementTarget ? '' : tab}
        onTabChange={handleTabChange}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main
        className="flex-1 h-[calc(100vh-56px)] lg:h-screen overflow-y-auto p-4 sm:p-6 lg:p-8"
        key={statementTarget ? `stmt-${statementTarget.partyId}` : tab}
      >
        <div className="max-w-7xl mx-auto w-full">
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
