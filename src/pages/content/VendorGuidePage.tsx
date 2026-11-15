import React from 'react';
import { useApp } from '../../context/AppContext';
import { ShieldCheck, Truck, Coins, ArrowRight, BarChart3 } from 'lucide-react';

export const VendorGuidePage: React.FC = () => {
  const { navigateTo } = useApp();

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-12">
        {/* Hero Section */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold tracking-wide uppercase">
            Sell on Shop India
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
            Grow Your Business Nationwide with Zero Price Cuts
          </h1>
          <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Sell your products across India or to your local neighborhood. You keep 100% of your listed wholesale price with zero deduction surprises.
          </p>
          <div className="pt-2">
            <a
              href="/vendor"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition-all active:scale-95"
            >
              <span>Register as Vendor / Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* 4 Pillars of Shop India Seller Protection */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <Coins className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-slate-900">100% Guaranteed Base Price</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              If you list a product at ₹500, you receive ₹500 in your payout. Shop India markup is added on top, protecting your margins.
            </p>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <Truck className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-slate-900">Pan-India Shiprocket Courier</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Automated doorstep order pickups by top 3PL couriers (Delhivery, BlueDart, DTDC). Print labels directly from your portal.
            </p>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
              <BarChart3 className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-slate-900">Real-Time Sales Analytics</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Monitor incoming orders, inventory counts, product reviews, and settlement statements from a unified dashboard.
            </p>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-slate-900">Weekly Wallet Settlements</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              All fulfilled and delivered orders are settled directly into your linked bank account with transparent accounting statements.
            </p>
          </div>
        </div>

        {/* Dual Channel Selling: Shop India vs Quick Shopping */}
        <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200 space-y-8">
          <div>
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Selling Options</span>
            <h3 className="text-2xl font-black text-slate-900 mt-1">Choose How You Want to Sell</h3>
            <p className="text-sm text-slate-600 mt-1">Vendors can choose either channel or sell on both simultaneously.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                  1
                </div>
                <div>
                  <h4 className="font-black text-base text-slate-900">Shop India (E-Commerce)</h4>
                  <p className="text-xs text-slate-500">Pan-India Standard Courier Delivery</p>
                </div>
              </div>
              <ul className="text-xs text-slate-600 space-y-2 list-disc list-inside">
                <li>Ideal for Electronics, Fashion, Home Goods, Books & Cosmetics</li>
                <li>Reach 28,000+ pin codes across India</li>
                <li>Doorstep courier pickup scheduled automatically upon order confirmation</li>
              </ul>
            </div>

            <div className="bg-amber-50/50 rounded-2xl p-6 border border-amber-200 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold text-sm">
                  2
                </div>
                <div>
                  <h4 className="font-black text-base text-slate-900">Quick Shopping (Hyperlocal)</h4>
                  <p className="text-xs text-slate-500">10–20 Minute Neighborhood Express</p>
                </div>
              </div>
              <ul className="text-xs text-slate-600 space-y-2 list-disc list-inside">
                <li>Ideal for Groceries, Fresh Produce, Daily Essentials & FMCG</li>
                <li>Orders assigned instantly to nearby delivery riders (5–10 km radius)</li>
                <li>Riders arrive at your store within 5 minutes to collect and deliver</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 3 Step Registration Walkthrough */}
        <div className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-3xl p-8 sm:p-12 text-white space-y-8">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <h3 className="text-2xl sm:text-3xl font-black">Ready to Start Selling?</h3>
            <p className="text-xs sm:text-sm text-slate-300">
              Get onboarded in under 10 minutes. All you need are your store details and GST/PAN.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-white/10 rounded-2xl p-5 backdrop-blur-xs space-y-2">
              <span className="text-2xl font-black text-blue-400">01</span>
              <h4 className="font-bold text-sm text-white">Create Vendor Account</h4>
              <p className="text-xs text-slate-300">Enter your store name, business email, and phone number on the vendor portal.</p>
            </div>
            <div className="bg-white/10 rounded-2xl p-5 backdrop-blur-xs space-y-2">
              <span className="text-2xl font-black text-blue-400">02</span>
              <h4 className="font-bold text-sm text-white">Add Products & Pricing</h4>
              <p className="text-xs text-slate-300">Upload your items, product images, stock quantities, and your guaranteed payout price.</p>
            </div>
            <div className="bg-white/10 rounded-2xl p-5 backdrop-blur-xs space-y-2">
              <span className="text-2xl font-black text-blue-400">03</span>
              <h4 className="font-bold text-sm text-white">Receive & Fulfill Orders</h4>
              <p className="text-xs text-slate-300">Get order notifications, pack the item, and hand over to our courier or rider.</p>
            </div>
          </div>

          <div className="text-center pt-4">
            <a
              href="/vendor"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-white text-slate-900 font-extrabold text-sm hover:bg-slate-100 transition-all shadow-lg active:scale-95"
            >
              <span>Go to Vendor Portal Now</span>
              <ArrowRight className="w-4 h-4 text-blue-600" />
            </a>
          </div>
        </div>

        {/* Back to Home CTA */}
        <div className="text-center pt-4">
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
