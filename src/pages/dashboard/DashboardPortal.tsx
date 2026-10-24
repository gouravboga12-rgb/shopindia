import React, { useState } from 'react';
import { AppProvider } from '../../context/AppContext';
import { CustomerProvider } from '../../context/CustomerContext';
import { DashboardLayout, type DashboardTab } from '../../components/dashboard/DashboardLayout';
import { OverviewPage } from './Overview';
import { OrdersPage } from './Orders';
import { WishlistPage } from './Wishlist';
import { CartPage } from './Cart';
import { SavedForLaterPage } from './SavedForLater';
import { RecentlyViewedPage } from './RecentlyViewed';
import { AddressesPage } from './Addresses';
import { PaymentsPage } from './Payments';
import { NotificationsPage } from './Notifications';
import { ReviewsPage } from './Reviews';
import { CouponsRewardsPage } from './CouponsRewards';
import { ProfileSettingsPage } from './ProfileSettings';
import { SecurityPage } from './Security';
import { SupportCenterPage } from './Support';

const Content: React.FC<{ tab: DashboardTab; onNavigate: (t: DashboardTab) => void }> = ({ tab, onNavigate }) => {
  switch (tab) {
    case 'overview': return <OverviewPage onNavigate={onNavigate} />;
    case 'orders': return <OrdersPage />;
    case 'wishlist': return <WishlistPage />;
    case 'cart': return <CartPage />;
    case 'saved': return <SavedForLaterPage />;
    case 'recently-viewed': return <RecentlyViewedPage />;
    case 'addresses': return <AddressesPage />;
    case 'payments': return <PaymentsPage />;
    case 'notifications': return <NotificationsPage />;
    case 'reviews': return <ReviewsPage />;
    case 'coupons': return <CouponsRewardsPage />;
    case 'profile': return <ProfileSettingsPage onNavigate={onNavigate} />;
    case 'security': return <SecurityPage />;
    case 'support': return <SupportCenterPage />;
    default: return <OverviewPage onNavigate={onNavigate} />;
  }
};

export const DashboardInner: React.FC<{ initialTab?: DashboardTab }> = ({ initialTab = 'overview' }) => {
  const [tab, setTab] = useState<DashboardTab>(initialTab);

  React.useEffect(() => {
    if (initialTab) {
      setTab(initialTab);
    }
  }, [initialTab]);

  return (
    <DashboardLayout activeTab={tab} onTabChange={setTab}>
      <Content tab={tab} onNavigate={(t) => setTab(t as DashboardTab)} />
    </DashboardLayout>
  );
};

export const DashboardPortal: React.FC = () => (
  <AppProvider>
    <CustomerProvider>
      <DashboardInner />
    </CustomerProvider>
  </AppProvider>
);