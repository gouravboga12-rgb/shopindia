import React from 'react';
import { useApp } from '../../context/AppContext';
import { CreditCard, Smartphone, Wallet, ShieldCheck, ExternalLink } from 'lucide-react';

export const DesktopFooter: React.FC = () => {
  const { currentVertical, navigateTo } = useApp();

  const isServices = currentVertical === 'services';

  return (
    <footer className={`w-full text-xs transition-colors duration-300 ${
      isServices ? 'bg-services-bg text-services-gray border-t border-services-border' : 'bg-[#172337] text-white'
    }`}>
      {/* Upper footer links columns */}
      <div className={`max-w-7xl mx-auto px-4 md:px-8 lg:px-12 py-12 grid grid-cols-2 md:grid-cols-6 gap-8 ${
        isServices ? 'border-b border-services-border' : 'border-b border-gray-700/80'
      }`}>
        {/* Column 1: About */}
        <div className="flex flex-col gap-2.5">
          <span className="font-bold text-gray-400 uppercase tracking-wider mb-1 text-[11px]">About</span>
          <button
            onClick={() => navigateTo('about')}
            className="text-left hover:underline text-gray-200 transition-colors"
          >
            About Us
          </button>
          <button
            onClick={() => navigateTo('dashboard')}
            className="text-left hover:underline text-gray-200 transition-colors flex items-center gap-1.5"
          >
            <span>Customer Support</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          </button>
        </div>

        {/* Column 2: Join Our Fleet */}
        <div className="flex flex-col gap-2.5">
          <span className="font-bold text-gray-400 uppercase tracking-wider mb-1 text-[11px]">Join Our Fleet</span>
          <button
            onClick={() => navigateTo('careers')}
            className="text-left hover:underline text-gray-200 transition-colors"
          >
            Careers (Rider & Tech)
          </button>
          <a
            href="/rider"
            className="hover:underline text-amber-300 font-semibold transition-colors flex items-center gap-1"
          >
            <span>Rider Portal</span>
            <ExternalLink size={11} />
          </a>
        </div>

        {/* Column 3: Sell & Grow */}
        <div className="flex flex-col gap-2.5">
          <span className="font-bold text-gray-400 uppercase tracking-wider mb-1 text-[11px]">Sell & Grow</span>
          <button
            onClick={() => navigateTo('vendor-guide')}
            className="text-left hover:underline text-gray-200 transition-colors"
          >
            Register as Vendor
          </button>
          <a
            href="/vendor"
            className="hover:underline text-blue-300 font-semibold transition-colors flex items-center gap-1"
          >
            <span>Vendor Login</span>
            <ExternalLink size={11} />
          </a>
        </div>

        {/* Column 4: Policies */}
        <div className="flex flex-col gap-2.5">
          <span className="font-bold text-gray-400 uppercase tracking-wider mb-1 text-[11px]">Policies</span>
          <button
            onClick={() => navigateTo('refund-policy')}
            className="text-left hover:underline text-gray-200 transition-colors"
          >
            Refund Policy
          </button>
          <button
            onClick={() => navigateTo('terms')}
            className="text-left hover:underline text-gray-200 transition-colors"
          >
            Terms and Conditions
          </button>
          <button
            onClick={() => navigateTo('privacy')}
            className="text-left hover:underline text-gray-200 transition-colors"
          >
            Privacy Policy
          </button>
        </div>

        {/* Column 5: Social */}
        <div className="flex flex-col gap-2.5 border-r border-gray-700/60 pr-4">
          <span className="font-bold text-gray-400 uppercase tracking-wider mb-1 text-[11px]">Social</span>
          <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="hover:underline text-gray-200">
            Facebook
          </a>
          <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="hover:underline text-gray-200">
            Twitter / X
          </a>
          <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className="hover:underline text-gray-200">
            YouTube
          </a>
          <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="hover:underline text-gray-200">
            Instagram
          </a>
        </div>

        {/* Column 6: Registered Office */}
        <div className="flex flex-col gap-2 col-span-2 md:col-span-1 pl-0 md:pl-2">
          <span className="font-bold text-gray-400 uppercase tracking-wider mb-1 text-[11px]">Office Address</span>
          <p className="leading-relaxed text-gray-300 text-[11px]">
            ShopIndia Internet Private Limited,<br />
            Buildings Alyssa, Begonia &<br />
            Clove Embassy Tech Village,<br />
            Outer Ring Road, Bengaluru, 560103,<br />
            Karnataka, India<br />
            <span className="text-gray-400">CIN: U51109KA2012PTC066107</span>
          </p>
        </div>
      </div>

      {/* Lower footer info bar */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12 py-6 flex flex-wrap justify-between items-center gap-4">
        <div className="text-gray-400 text-xs">
          <span>© 2026 ShopIndia.com. All rights reserved.</span>
        </div>

        <div className="flex items-center gap-4 text-zinc-400">
          <div className="flex items-center gap-2 text-zinc-300 text-[11px]">
            <ShieldCheck size={18} className="text-emerald-400" />
            <span className="font-bold">100% SECURE CHECKOUT</span>
          </div>
          <div className="flex items-center gap-2 text-zinc-400">
            <CreditCard size={20} className="hover:text-white transition-colors" />
            <Smartphone size={20} className="hover:text-white transition-colors" />
            <Wallet size={20} className="hover:text-white transition-colors" />
          </div>
        </div>
      </div>
    </footer>
  );
};
