import React from 'react';
import { useApp } from '../../context/AppContext';
import { Gift, HelpCircle, Briefcase, Award, CreditCard, Smartphone, Wallet } from 'lucide-react';

export const DesktopFooter: React.FC = () => {
  const { currentVertical } = useApp();

  const isServices = currentVertical === 'services';

  return (
    <footer className={`w-full text-xs transition-colors duration-300 ${
      isServices ? 'bg-services-bg text-services-gray border-t border-services-border' : 'bg-[#172337] text-white'
    }`}>
      {/* Upper footer links columns */}
      <div className={`max-w-7xl mx-auto px-12 py-10 grid grid-cols-1 md:grid-cols-6 gap-6 ${
        isServices ? 'border-b border-services-border' : 'border-b border-gray-700'
      }`}>
        <div className="flex flex-col gap-2.5">
          <span className="font-semibold text-gray-400 uppercase tracking-wider mb-1">About</span>
          <a href="#" className="hover:underline">Contact Us</a>
          <a href="#" className="hover:underline">About Us</a>
          <a href="#" className="hover:underline">Careers</a>
          <a href="#" className="hover:underline">ShopIndia Stories</a>
          <a href="#" className="hover:underline">Press Releases</a>
        </div>

        <div className="flex flex-col gap-2.5">
          <span className="font-semibold text-gray-400 uppercase tracking-wider mb-1">Help</span>
          <a href="#" className="hover:underline">Payments</a>
          <a href="#" className="hover:underline">Shipping</a>
          <a href="#" className="hover:underline">Cancellation & Returns</a>
          <a href="#" className="hover:underline">FAQ</a>
          <a href="#" className="hover:underline">Report Infringement</a>
        </div>

        <div className="flex flex-col gap-2.5">
          <span className="font-semibold text-gray-400 uppercase tracking-wider mb-1">Consumer Policy</span>
          <a href="#" className="hover:underline">Cancellation & Returns</a>
          <a href="#" className="hover:underline">Terms Of Use</a>
          <a href="#" className="hover:underline">Security</a>
          <a href="#" className="hover:underline">Privacy Policy</a>
          <a href="#" className="hover:underline">Sitemap</a>
        </div>

        <div className="flex flex-col gap-2.5 border-r border-gray-700 pr-4">
          <span className="font-semibold text-gray-400 uppercase tracking-wider mb-1">Social</span>
          <a href="#" className="hover:underline">Facebook</a>
          <a href="#" className="hover:underline">Twitter / X</a>
          <a href="#" className="hover:underline">YouTube</a>
          <a href="#" className="hover:underline">Instagram</a>
        </div>

        <div className="flex flex-col gap-2 md:col-span-2 pl-4">
          <span className="font-semibold text-gray-400 uppercase tracking-wider mb-1">Registered Office Address</span>
          <p className="leading-relaxed">
            ShopIndia Internet Private Limited,<br />
            Buildings Alyssa, Begonia &<br />
            Clove Embassy Tech Village,<br />
            Outer Ring Road, Devarabeesanahalli Village,<br />
            Bengaluru, 560103,<br />
            Karnataka, India<br />
            CIN : U51109KA2012PTC066107
          </p>
        </div>
      </div>

      {/* Lower footer info links */}
      <div className="max-w-7xl mx-auto px-12 py-6 flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center gap-6 text-sm font-semibold text-brand-graphite">
          <a href="/vendor/register" className="flex items-center gap-2 hover:text-brand-blue transition-colors">
            <Briefcase size={14} className="text-brand-orange" />
            <span>Become a Seller</span>
          </a>
          <a href="#" className="flex items-center gap-2 hover:text-brand-blue transition-colors">
            <Award size={14} className="text-brand-orange" />
            <span>Advertise</span>
          </a>
          <a href="#" className="flex items-center gap-2 hover:text-brand-blue transition-colors">
            <Gift size={14} className="text-brand-orange" />
            <span>Gift Cards</span>
          </a>
          <a href="#" className="flex items-center gap-2 hover:text-brand-blue transition-colors">
            <HelpCircle size={14} className="text-brand-orange" />
            <span>Help Center</span>
          </a>
        </div>

        <div className="text-gray-400">
          <span>© 2026 ShopIndia.com. Created with React & Tailwind.</span>
        </div>

        <div className="flex items-center gap-3 text-zinc-400">
          <CreditCard size={24} className="hover:text-brand-graphite transition-colors" />
          <Smartphone size={24} className="hover:text-brand-graphite transition-colors" />
          <Wallet size={24} className="hover:text-brand-graphite transition-colors" />
          <span className="text-xs font-bold ml-1">100% SECURE</span>
        </div>
      </div>
    </footer>
  );
};
