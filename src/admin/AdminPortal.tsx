import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { Menu, Store, ArrowRight, X } from 'lucide-react';
import { api } from '../lib/api';
import { useSocketEvent } from '../lib/socket';
import { AdminLogin } from './pages/AdminLogin';
import { AdminSidebar, type AdminBadgeCounts } from './AdminSidebar';
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

function playNotificationChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now); // D5
    gain1.gain.setValueAtTime(0.15, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.12); // A5
    gain2.gain.setValueAtTime(0.2, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.55);
  } catch (e) {
    // Audio might be blocked until user gesture, ignore safely
  }
}

const AdminContent: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [tab, setTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [managedVendor, setManagedVendor] = useState<ManagedVendor | null>(null);
  const [statementTarget, setStatementTarget] = useState<{ partyType: string; partyId: string; name?: string } | null>(null);
  const [badgeCounts, setBadgeCounts] = useState<AdminBadgeCounts>({});
  const [vendorFilterOverride, setVendorFilterOverride] = useState<string | null>(null);
  const [vendorAlertToast, setVendorAlertToast] = useState<{
    id: string;
    businessName: string;
    contactName?: string;
    email?: string;
    category?: string;
    city?: string;
  } | null>(null);

  const loadBadgeCounts = () => {
    api
      .get<{ success: boolean; counts: AdminBadgeCounts }>('/api/admin/dashboard/badge-counts')
      .then((res) => {
        if (res.counts) setBadgeCounts(res.counts);
      })
      .catch((e) => console.warn('Failed to load badge counts', e));
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadBadgeCounts();
    }
  }, [isAuthenticated]);

  // Real-time synchronization when badge counts are updated across the server
  useSocketEvent('admin:badge_counts_updated', (counts: AdminBadgeCounts) => {
    if (counts) setBadgeCounts(counts);
  });

  // Real-time alert when a new merchant registers and submits KYC documents
  useSocketEvent('admin:new_vendor_application', (data: any) => {
    playNotificationChime();
    if (data?.vendor) {
      setVendorAlertToast(data.vendor);
    }
    loadBadgeCounts();
  });

  const handleReviewVendorToast = () => {
    setVendorAlertToast(null);
    setStatementTarget(null);
    setManagedVendor(null);
    setVendorFilterOverride('pending');
    setTab('vendors');
  };

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
          badgeCounts={badgeCounts}
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
      case 'vendors': return <VendorsPage onManage={setManagedVendor} initialFilter={vendorFilterOverride || undefined} />;
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
    <div className="flex flex-col lg:flex-row h-screen w-screen overflow-hidden bg-[#FAF9F6] relative">
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
        badgeCounts={badgeCounts}
      />

      <main
        className="flex-1 h-[calc(100vh-56px)] lg:h-screen overflow-y-auto p-4 sm:p-6 lg:p-8"
        key={statementTarget ? `stmt-${statementTarget.partyId}` : tab}
      >
        <div className="max-w-7xl mx-auto w-full">
          {renderTab()}
        </div>
      </main>

      {/* ─── Global Real-Time Verification Floating Alert Toast ─── */}
      {vendorAlertToast && (
        <aside
          role="region"
          aria-label="Notifications"
          className="fixed bottom-5 right-5 z-50 max-w-sm w-full bg-slate-900 text-white rounded-2xl p-4 shadow-2xl border border-rose-500/40 animate-in slide-in-from-bottom duration-200"
        >
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400 shrink-0 border border-rose-500/30">
              <Store className="w-5 h-5 animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-rose-400 bg-rose-950 px-2 py-0.5 rounded border border-rose-800">
                  New Vendor Application
                </span>
                <button
                  onClick={() => setVendorAlertToast(null)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <h4 className="font-bold text-sm text-white mt-1 truncate">{vendorAlertToast.businessName}</h4>
              <p className="text-xs text-slate-300 truncate">
                {vendorAlertToast.contactName || 'Merchant'} • {vendorAlertToast.email}
              </p>
              <div className="mt-3 flex items-center justify-between gap-2">
                <span className="text-[10px] text-slate-400">KYC documents attached</span>
                <button
                  onClick={handleReviewVendorToast}
                  className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs rounded-xl shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-1"
                >
                  <span>Review & Approve</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </aside>
      )}
    </div>
  );
};

export const AdminPortal: React.FC = () => (
  <AuthProvider storagePrefix="admin">
    <AdminContent />
  </AuthProvider>
);
