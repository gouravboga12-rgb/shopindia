import React from 'react';
import { useApp } from '../../context/AppContext';
import { ShoppingBag, Zap, Wrench, ShieldCheck, HeartHandshake, MapPin } from 'lucide-react';

export const AboutUsPage: React.FC = () => {
  const { navigateTo, setCurrentVertical } = useApp();

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-12">
        {/* Hero Section */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold tracking-wide uppercase">
            About Shop India
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
            Empowering Neighborhood Commerce Across Bharat
          </h1>
          <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Shop India is India’s first unified platform seamlessly bridging pan-India e-commerce retail, 10–20 minute neighborhood quick delivery, and trusted doorstep technician services under one roof.
          </p>
        </div>

        {/* 3 Unified Verticals */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Vertical 1 */}
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xs flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-slate-900">Shop India (E-Commerce)</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Connects consumers with verified manufacturers, brands, and traditional retailers across India with reliable courier delivery via Shiprocket across 28,000+ pincodes.
              </p>
            </div>
            <button
              onClick={() => { setCurrentVertical('shop'); navigateTo('home'); }}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              Explore Shop India →
            </button>
          </div>

          {/* Vertical 2 */}
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xs flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-slate-900">Quick Shopping (Hyperlocal)</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Lightning-fast 10 to 20 minute delivery of fresh groceries, produce, milk, and household essentials fulfilled directly from neighborhood kirana stores and dark stores.
              </p>
            </div>
            <button
              onClick={() => { setCurrentVertical('quick'); navigateTo('home'); }}
              className="text-xs font-bold text-amber-600 hover:text-amber-800 flex items-center gap-1"
            >
              Explore Quick 10-Min →
            </button>
          </div>

          {/* Vertical 3 */}
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xs flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
                <Wrench className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-slate-900">Glacons Services</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Doorstep professional services including AC installation, repair, appliance diagnostics, plumbing, and electrical works executed by verified and background-checked technicians.
              </p>
            </div>
            <button
              onClick={() => { setCurrentVertical('services'); navigateTo('home'); }}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              Book Home Services →
            </button>
          </div>
        </div>

        {/* Our Core Values */}
        <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200 space-y-8">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <h3 className="text-2xl font-black text-slate-900">Why Shop India?</h3>
            <p className="text-xs text-slate-500">Built to empower both local sellers and everyday consumers.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-800 flex items-center justify-center mx-auto">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-sm text-slate-900">Fair to Merchants</h4>
              <p className="text-xs text-slate-500">We never squeeze merchant prices. Sellers get 100% of their base listing price with zero hidden margin cuts.</p>
            </div>

            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-800 flex items-center justify-center mx-auto">
                <HeartHandshake className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-sm text-slate-900">Fair to Riders</h4>
              <p className="text-xs text-slate-500">Transparent delivery pay formulas ensure delivery partners and technicians earn a dignified, guaranteed wage.</p>
            </div>

            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-800 flex items-center justify-center mx-auto">
                <MapPin className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-sm text-slate-900">Locally Anchored</h4>
              <p className="text-xs text-slate-500">Born in Tumakuru & Bengaluru, scaling across India with pride and customer-first care.</p>
            </div>
          </div>
        </div>

        {/* Back to Home CTA */}
        <div className="text-center pt-2">
          <button
            onClick={() => navigateTo('home')}
            className="text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
          >
            ← Return to Storefront
          </button>
        </div>
      </div>
    </div>
  );
};
