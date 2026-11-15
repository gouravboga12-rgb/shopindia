import React from 'react';
import { useApp } from '../../context/AppContext';

export const PrivacyPolicyPage: React.FC = () => {
  const { navigateTo } = useApp();

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-300 text-slate-700 text-xs font-bold tracking-wide uppercase">
            Data Privacy & Security
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Privacy Policy
          </h1>
          <p className="text-sm text-slate-600 max-w-xl mx-auto">
            Last updated: November 2026. Your privacy is paramount. Discover how Shop India protects and manages your personal information.
          </p>
        </div>

        {/* Content Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-xs space-y-8 text-slate-700 text-xs sm:text-sm leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-xs font-black">1</span>
              Information We Collect
            </h2>
            <p>
              When you use Shop India, we collect information necessary to provide seamless shopping and delivery services:
            </p>
            <ul className="list-disc list-inside space-y-1.5 pl-2 text-slate-600">
              <li><strong>Contact Information:</strong> Your name, phone number, and email address provided during account registration or OTP verification.</li>
              <li><strong>Delivery Addresses:</strong> Street address, city, state, postal code, and optional GPS geolocation to ensure riders deliver to the exact doorstep.</li>
              <li><strong>Order & Transaction Records:</strong> Order item history, invoices, payment status, and customer service communication logs.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-xs font-black">2</span>
              Payment Data & PCI-DSS Security
            </h2>
            <p>
              Shop India <strong>never stores your credit card numbers, debit card PINs, CVV codes, or UPI net banking passwords</strong> on our servers. All digital payments are handled directly by RBI-licensed, PCI-DSS certified payment aggregators (such as Razorpay) using 256-bit bank-grade SSL encryption.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-xs font-black">3</span>
              How We Use Your Information
            </h2>
            <p>
              We utilize collected information solely for:
            </p>
            <ul className="list-disc list-inside space-y-1.5 pl-2 text-slate-600">
              <li>Fulfilling orders, routing couriers/riders, and coordinating technician visits.</li>
              <li>Sending transactional SMS, WhatsApp, and email updates regarding shipment tracking and order status.</li>
              <li>Preventing fraudulent transactions and ensuring overall platform safety.</li>
              <li>Generating compliant GST invoices and financial audit logs required by law.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-xs font-black">4</span>
              Sharing With Third Parties
            </h2>
            <p>
              We do <strong>not sell, rent, or trade your personal data</strong> to third-party advertisers. Information is shared only with strictly vetted operational fulfillment partners:
            </p>
            <ul className="list-disc list-inside space-y-1.5 pl-2 text-slate-600">
              <li><strong>Couriers & Riders:</strong> Your delivery address and masked contact number so the delivery partner can complete the drop-off.</li>
              <li><strong>Merchant Vendors:</strong> Ordered item specifications and shipping details to pack your order.</li>
              <li><strong>Legal Authorities:</strong> Only when strictly required by applicable Indian statutory law or court order.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-xs font-black">5</span>
              Your Data Rights & Grievance Redressal
            </h2>
            <p>
              You have the right to review, update, or request the deletion of your account and personal data at any time through your Profile Settings or by raising a ticket with our Customer Support desk.
            </p>
            <p className="mt-2 text-slate-500">
              For privacy grievances, you may contact our Grievance Officer at <em>grievance@shopindia.com</em> or write to our registered office address in Bengaluru, India.
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
