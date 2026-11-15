import React from 'react';
import { useApp } from '../../context/AppContext';
import { RotateCcw, Clock, ShieldCheck, CheckCircle2, HelpCircle } from 'lucide-react';

export const RefundPolicyPage: React.FC = () => {
  const { navigateTo } = useApp();

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-10">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold tracking-wide uppercase">
            Trust & Transparency
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Refund, Return & Cancellation Policy
          </h1>
          <p className="text-sm text-slate-600 max-w-xl mx-auto">
            Last updated: November 2026. Shop India is committed to ensuring a hassle-free, fair, and transparent shopping experience.
          </p>
        </div>

        {/* 3 Verticals Policy Breakdown */}
        <div className="space-y-6">
          {/* Vertical 1: Shop India (E-Commerce) */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Pan-India E-Commerce</span>
                <h3 className="text-lg font-black text-slate-900">Shop India Return & Refund Policy</h3>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              We offer an <strong>easy 7-day return and exchange window</strong> from the date of delivery on eligible items across Electronics, Fashion, Home Goods, and general retail.
            </p>

            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2 text-xs text-slate-600">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Eligible reasons:</strong> Damaged in transit, defective, wrong size/color delivered, or item physically different from product listing.</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Return process:</strong> Go to <em>My Orders &gt; Select Item &gt; Request Return</em>. Our courier partner will pick up the item from your doorstep.</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Refund timeline:</strong> Upon quality check at vendor warehouse, your refund is credited within <strong>3 to 5 business days</strong> to the original payment source (UPI/Card/NetBanking) or instant Shop India wallet credit.</span>
              </div>
            </div>
          </div>

          {/* Vertical 2: Quick Shopping */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">Hyperlocal 10–20 Min</span>
                <h3 className="text-lg font-black text-slate-900">Quick Shopping Grocery & Essentials</h3>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Due to the perishable nature of fresh groceries, produce, dairy, and food items, returns after delivery acceptance are handled swiftly through our instant support desk:
            </p>

            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2 text-xs text-slate-600">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Missing or damaged items:</strong> If any item is missing, damaged, or expired upon rider delivery, report it within <strong>24 hours</strong> with a photo in Customer Support.</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Resolution:</strong> Instant replacement dispatch or immediate 100% wallet/bank refund processed with zero return pickup required for perishables.</span>
              </div>
            </div>
          </div>

          {/* Vertical 3: Glacons Services */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Glacons Services</span>
                <h3 className="text-lg font-black text-slate-900">Doorstep Repairs & Service Visits</h3>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              We respect your time and schedule. Service appointments come with flexible cancellation and satisfaction guarantees:
            </p>

            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2 text-xs text-slate-600">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Free cancellation:</strong> Cancel or reschedule with zero fee up to <strong>2 hours</strong> before the scheduled technician arrival time.</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Service Guarantee:</strong> All repairs include a <strong>30-day post-service warranty</strong>. If the issue reoccurs, a technician will re-inspect at zero additional visit charge.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Cancellation Rules */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-lg font-black text-slate-900">Order Cancellation by Customer</h3>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            You can cancel any order directly from your <strong>Orders</strong> page before the vendor has packed or dispatched the shipment. For cancelled prepaid orders, 100% of the paid amount is refunded immediately to your original payment mode without any deduction.
          </p>
        </div>

        {/* Need Help CTA */}
        <div className="bg-slate-900 rounded-3xl p-8 text-white text-center space-y-4">
          <HelpCircle className="w-10 h-10 text-emerald-400 mx-auto" />
          <h3 className="text-xl font-black">Have questions about an existing refund?</h3>
          <p className="text-xs text-slate-300 max-w-md mx-auto">
            Our 24/7 Customer Support desk is ready to assist you with order tracking, return pickups, or settlement queries.
          </p>
          <button
            onClick={() => navigateTo('dashboard')}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-md transition-all active:scale-95"
          >
            <span>Contact Customer Support</span>
          </button>
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
