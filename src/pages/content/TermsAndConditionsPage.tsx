import React from 'react';
import { useApp } from '../../context/AppContext';

export const TermsAndConditionsPage: React.FC = () => {
  const { navigateTo } = useApp();

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-300 text-slate-700 text-xs font-bold tracking-wide uppercase">
            Legal & Compliance
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Terms and Conditions
          </h1>
          <p className="text-sm text-slate-600 max-w-xl mx-auto">
            Effective Date: November 2026. Please read these terms carefully before accessing or using Shop India services.
          </p>
        </div>

        {/* Content Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-xs space-y-8 text-slate-700 text-xs sm:text-sm leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-black">1</span>
              Agreement to Terms
            </h2>
            <p>
              These Terms and Conditions constitute a legally binding agreement between you ("Customer", "User", or "You") and <strong>ShopIndia Internet Private Limited</strong> ("Shop India", "We", "Us", or "Our"). By accessing our website, mobile application, or any associated platform services (Shop India E-Commerce, Quick Shopping, and Glacons Services), you acknowledge that you have read, understood, and agree to be bound by all of these terms.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-black">2</span>
              User Accounts & Security
            </h2>
            <p>
              To place orders or book services, you may be required to register an account using your mobile phone number and verified OTP. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to notify us immediately of any unauthorized access.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-black">3</span>
              Pricing, Convenience Fees & Taxes
            </h2>
            <p>
              All prices displayed on the storefront are inclusive of statutory Goods and Services Tax (GST) unless explicitly indicated otherwise. A nominal platform convenience fee may be applied transparently at checkout to offset third-party digital payment gateway processing and platform maintenance costs. We reserve the right to correct pricing typographical errors prior to order dispatch.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-black">4</span>
              Fulfillment & Delivery
            </h2>
            <p>
              Fulfillment models are segregated by vertical:
            </p>
            <ul className="list-disc list-inside space-y-1.5 pl-2 text-slate-600">
              <li><strong>Shop India (E-Commerce):</strong> Dispatched nationwide via licensed third-party courier aggregators (Shiprocket). Estimated delivery is typically 3–7 business days depending on destination pincode.</li>
              <li><strong>Quick Shopping:</strong> Delivered by local fleet partners within an estimated 10 to 20 minutes from store dispatch, subject to traffic, weather, and distance constraints.</li>
              <li><strong>Glacons Services:</strong> Doorstep technician visit executed at your scheduled appointment time slot by verified technicians.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-black">5</span>
              Independent Merchant & Partner Relationship
            </h2>
            <p>
              Shop India operates as an online marketplace technology platform connecting buyers with verified independent merchant sellers and licensed service technicians. While Shop India enforces strict onboarding standards, each vendor is independently responsible for product manufacturing standards, manufacturer warranties, and accurate product listings.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-black">6</span>
              Limitation of Liability & Governing Law
            </h2>
            <p>
              These Terms shall be governed by and defined following the laws of India. Any disputes arising in connection with these Terms shall be subject to the exclusive jurisdiction of the courts located in Bengaluru, Karnataka, India.
            </p>
          </section>
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
