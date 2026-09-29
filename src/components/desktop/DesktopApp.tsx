import React, { useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { DesktopHeader } from './DesktopHeader';
import { DesktopFooter } from './DesktopFooter';
import { VerticalShop } from './VerticalShop';
import { VerticalQuickCommerce } from './VerticalQuickCommerce';
import { VerticalServices } from './VerticalServices';
import { SearchPage } from '../../pages/Search';
import { ProductDetailPage } from '../../pages/ProductDetail';
import { CartPage } from '../../pages/Cart';
import { OrdersPage } from '../../pages/Orders';
import { ProfilePage } from '../../pages/Profile';
import { NotificationsPage } from '../../pages/Notifications';
import { CategoriesPage } from '../../pages/Categories';
import { DashboardInner } from '../../pages/dashboard/DashboardPortal';
import { CartSuccessToast } from '../common/CartSuccessToast';

export const DesktopApp: React.FC = () => {
  const { currentVertical, currentPath } = useApp();

  // Scroll to the top on every route/page transition
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [currentPath, currentVertical]);

  const renderContent = () => {
    switch (currentPath) {
      case 'home':
        if (currentVertical === 'quick') return <VerticalQuickCommerce />;
        if (currentVertical === 'services') return <VerticalServices />;
        return <VerticalShop />;
      case 'category':
        return <CategoriesPage />;
      case 'search':
        return <SearchPage />;
      case 'detail':
        return <ProductDetailPage />;
      case 'cart':
        return <CartPage />;
      case 'orders':
        return <OrdersPage />;
      case 'profile':
        return <ProfilePage />;
      case 'notifications':
        return <NotificationsPage />;
      case 'dashboard':
        return <DashboardInner />;
      default:
        return <VerticalShop />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col w-full bg-[#FAF9F6] text-gray-800">
      <DesktopHeader />
      <main className="flex-1 w-full">
        {renderContent()}
      </main>
      <DesktopFooter />
      <CartSuccessToast />
    </div>
  );
};
