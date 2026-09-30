import React, { useState, useEffect } from 'react';
import { AppProvider } from './context/AppContext';
import { CustomerProvider } from './context/CustomerContext';
import { useIsMobile } from './hooks/useMediaQuery';
import { DesktopApp } from './components/desktop/DesktopApp';
import { MobileApp } from './components/mobile/MobileApp';
import { AdminPortal } from './admin/AdminPortal';
import { VendorPortal } from './vendor/VendorPortal';
import { QuickCommerceDemoPage } from './pages/QuickCommerceDemoPage';

const MainLayout: React.FC = () => {
  const isMobile = useIsMobile();
  return isMobile ? <MobileApp /> : <DesktopApp />;
};

function getCleanPath(): string {
  // If legacy hash routing is present, automatically redirect to clean path
  if (window.location.hash.startsWith('#/')) {
    const clean = window.location.hash.slice(1);
    window.history.replaceState(null, '', clean);
    return clean;
  }
  return window.location.pathname;
}

function App() {
  const [pathname, setPathname] = useState(getCleanPath);

  useEffect(() => {
    const handleLocationChange = () => setPathname(getCleanPath());
    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('shopindia:navigate', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('shopindia:navigate', handleLocationChange);
    };
  }, []);

  if (pathname.startsWith('/admin')) {
    return <AdminPortal />;
  }

  if (pathname.startsWith('/vendor')) {
    return <VendorPortal />;
  }

  if (pathname.startsWith('/demo-design') || pathname.startsWith('/quick-demo')) {
    return (
      <CustomerProvider>
        <AppProvider>
          <QuickCommerceDemoPage />
        </AppProvider>
      </CustomerProvider>
    );
  }

  return (
    <CustomerProvider>
      <AppProvider>
        <MainLayout />
      </AppProvider>
    </CustomerProvider>
  );
}

export default App;
