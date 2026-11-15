import React from 'react';
import { useApp } from '../../context/AppContext';
import { Bike, Wrench, CheckCircle2, ArrowRight } from 'lucide-react';

export const CareersPage: React.FC = () => {
  const { navigateTo } = useApp();

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-12">
        {/* Hero Section */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold tracking-wide uppercase">
            Careers & Partner Fleet
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
            Deliver with Pride. Earn with Confidence.
          </h1>
          <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Join thousands of delivery partners and certified service technicians across India who earn daily guaranteed payouts with flexible work hours.
          </p>
        </div>

        {/* Two Partner Tracks */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Card 1: Quick Commerce Delivery Partner */}
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
            <div className="space-y-6">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                <Bike className="w-8 h-8" />
              </div>

              <div>
                <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">Quick Shopping Fleet</span>
                <h2 className="text-2xl font-black text-slate-900 mt-1">Delivery Rider Partner</h2>
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                  Deliver groceries, daily essentials, and quick orders within your local neighborhood (5–10 km radius) in 10 to 20 minutes.
                </p>
              </div>

              {/* Benefits */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Guaranteed Pay Per Order</h4>
                    <p className="text-xs text-slate-500">Base fee per delivery plus extra payout per kilometer.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Flexible Shifts</h4>
                    <p className="text-xs text-slate-500">Choose your own operating hours — work full-time or part-time.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Weekly Direct Payouts</h4>
                    <p className="text-xs text-slate-500">Earnings transferred directly to your bank account or UPI ID.</p>
                  </div>
                </div>
              </div>

              {/* Requirements */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">Requirements:</h4>
                <ul className="text-xs text-slate-600 space-y-1 list-disc list-inside">
                  <li>Valid Driving License & Two-Wheeler (Bike/Scooter/EV)</li>
                  <li>Android / iOS Smartphone with GPS</li>
                  <li>Aadhaar Card & PAN Card for KYC</li>
                </ul>
              </div>
            </div>

            <div className="pt-8">
              <a
                href="/rider"
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm shadow-md transition-all active:scale-95"
              >
                <span>Register as Delivery Rider</span>
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Card 2: Glacons Service Technician */}
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
            <div className="space-y-6">
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
                <Wrench className="w-8 h-8" />
              </div>

              <div>
                <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Glacons Services</span>
                <h2 className="text-2xl font-black text-slate-900 mt-1">Service Technician</h2>
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                  Provide professional doorstep AC service, appliance repair, plumbing, or electrical installation with zero lead-acquisition fees.
                </p>
              </div>

              {/* Benefits */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Guaranteed Visit Fee</h4>
                    <p className="text-xs text-slate-500">Every service visit has a guaranteed technician payout.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Zero Marketing Costs</h4>
                    <p className="text-xs text-slate-500">Shop India connects you directly with verified neighborhood customers.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Partner Support & Tools</h4>
                    <p className="text-xs text-slate-500">Dedicated operational help desk and technician app support.</p>
                  </div>
                </div>
              </div>

              {/* Requirements */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">Requirements:</h4>
                <ul className="text-xs text-slate-600 space-y-1 list-disc list-inside">
                  <li>Prior technical experience in HVAC, electrical, or appliances</li>
                  <li>Basic service toolkit and personal transport</li>
                  <li>Government ID (Aadhaar / Voter ID / PAN)</li>
                </ul>
              </div>
            </div>

            <div className="pt-8">
              <a
                href="/rider"
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md transition-all active:scale-95"
              >
                <span>Join as Service Professional</span>
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>

        {/* 3 Step Onboarding Guide */}
        <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200">
          <h3 className="text-xl font-black text-slate-900 text-center mb-8">How Partner Onboarding Works</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-900 font-black text-sm flex items-center justify-center mx-auto">
                1
              </div>
              <h4 className="font-bold text-sm text-slate-900">Sign Up Online</h4>
              <p className="text-xs text-slate-500">Submit your mobile number, vehicle details, and city location.</p>
            </div>
            <div className="text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-900 font-black text-sm flex items-center justify-center mx-auto">
                2
              </div>
              <h4 className="font-bold text-sm text-slate-900">Document Verification</h4>
              <p className="text-xs text-slate-500">Our regional admin team verifies your KYC within 24 hours.</p>
            </div>
            <div className="text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-900 font-black text-sm flex items-center justify-center mx-auto">
                3
              </div>
              <h4 className="font-bold text-sm text-slate-900">Go Online & Start Earning</h4>
              <p className="text-xs text-slate-500">Switch your radar to online, accept orders, and earn immediately.</p>
            </div>
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
