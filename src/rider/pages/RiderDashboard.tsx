import React, { useState } from 'react';
import { useRider } from '../context/RiderContext';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { ActiveDeliveryView } from './ActiveDeliveryView';
import {
  Radar,
  Power,
  TrendingUp,
  Package,
  Clock,
  Navigation,
  CheckCircle2,
  MapPin,
  RefreshCw,
  AlertCircle,
  Banknote,
  ArrowUpRight,
  ShieldAlert,
  Loader2,
  Phone,
  MessageSquare,
  X,
  Building2
} from 'lucide-react';

interface RiderDashboardProps {
  onNavigateToTab?: (tab: string) => void;
}

export const RiderDashboard: React.FC<RiderDashboardProps> = () => {
  const { profile, isOnline, toggleOnline, activeDelivery, updateGpsLocation, refreshData } = useRider();
  const { user } = useAuth();
  const [locating, setLocating] = useState(false);
  const [locFeedback, setLocFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [isPayingRazorpay, setIsPayingRazorpay] = useState(false);
  const [remitFeedback, setRemitFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Hub Handover State
  const [showHubModal, setShowHubModal] = useState(false);
  const [loadingHubStatus, setLoadingHubStatus] = useState(false);
  const [isSubmittingToHub, setIsSubmittingToHub] = useState(false);
  const [hubStatusData, setHubStatusData] = useState<{
    regionalAdminAvailable: boolean;
    regionalAdmin?: {
      id: string;
      name: string;
      phone?: string;
      hubName?: string;
      address?: string;
      district?: string;
      state?: string;
    } | null;
    pendingSubmission?: { id: string; amount: number; createdAt: string } | null;
    riderPincode?: string;
    deadlineRule?: string;
    floatLimit?: number;
  } | null>(null);

  const fetchHubStatus = async () => {
    try {
      setLoadingHubStatus(true);
      const res: any = await api.get('/api/rider/cod/status');
      if (res?.success) {
        setHubStatusData({
          regionalAdminAvailable: res.regionalAdminAvailable,
          regionalAdmin: res.regionalAdmin,
          pendingSubmission: res.pendingSubmission,
          riderPincode: res.riderPincode,
          deadlineRule: res.deadlineRule,
          floatLimit: res.floatLimit,
        });
      }
    } catch (e) {
      console.warn('Failed to load rider COD hub status:', e);
    } finally {
      setLoadingHubStatus(false);
    }
  };

  const handleOpenHubModal = async () => {
    setShowHubModal(true);
    await fetchHubStatus();
  };

  const handleSubmitCashToHub = async () => {
    try {
      setIsSubmittingToHub(true);
      const res: any = await api.post('/api/rider/cod/submit-cash-to-hub', {});
      if (res?.success) {
        setRemitFeedback({ type: 'success', text: res.message || 'Submitted cash to Regional Admin! Awaiting verification.' });
        await fetchHubStatus();
        if (refreshData) await refreshData();
      }
    } catch (err: any) {
      setRemitFeedback({ type: 'error', text: err.message || 'Failed to submit cash.' });
    } finally {
      setIsSubmittingToHub(false);
    }
  };

  const handlePayCODOnline = async () => {
    const floatAmt = profile?.codCashFloat || 0;
    if (floatAmt <= 0) return;
    setIsPayingRazorpay(true);
    setRemitFeedback(null);

    try {
      const orderRes = await api.post<{
        success: boolean;
        orderId: string;
        amount: number;
        currency: string;
        keyId: string;
        rider: { name: string; email: string; phone: string };
      }>('/api/rider/cod/create-razorpay-order', {});

      if (!orderRes.success) throw new Error('Could not initiate remittance order');

      const Razorpay = (window as any).Razorpay;
      if (!Razorpay) {
        alert('Payment gateway is loading. Please try again in a few moments.');
        setIsPayingRazorpay(false);
        return;
      }

      const options = {
        key: orderRes.keyId,
        amount: orderRes.amount,
        currency: orderRes.currency,
        name: 'ShopIndia COD Clearance',
        description: `Clearance of ₹${floatAmt} offline cash float`,
        order_id: orderRes.orderId,
        prefill: {
          name: orderRes.rider?.name || user?.name || 'Rider',
          email: orderRes.rider?.email || user?.email || '',
          contact: orderRes.rider?.phone || '',
        },
        theme: {
          color: '#EA580C',
        },
        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => {
          try {
            const verifyRes = await api.post<{ success: boolean; message: string; clearedAmount: number }>(
              '/api/rider/cod/verify-razorpay-remittance',
              {
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              }
            );

            if (verifyRes.success) {
              setRemitFeedback({ type: 'success', text: verifyRes.message || 'Payment cleared successfully! Cash float reset.' });
              if (refreshData) await refreshData();
            }
          } catch (verr: unknown) {
            setRemitFeedback({
              type: 'error',
              text: verr instanceof Error ? verr.message : 'Payment verification failed',
            });
          } finally {
            setIsPayingRazorpay(false);
          }
        },
        modal: {
          ondismiss: () => {
            setIsPayingRazorpay(false);
          },
        },
      };

      const rzp = new Razorpay(options);
      rzp.on('payment.failed', (failResp: any) => {
        setIsPayingRazorpay(false);
        setRemitFeedback({
          type: 'error',
          text: failResp?.error?.description || 'Payment was cancelled or failed.',
        });
      });
      rzp.open();
    } catch (err: unknown) {
      setRemitFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to initiate remittance.',
      });
      setIsPayingRazorpay(false);
    }
  };

  const handleUpdateLocation = async () => {
    setLocating(true);
    setLocFeedback(null);
    const result = await updateGpsLocation();
    setLocating(false);
    if (result.success) {
      setLocFeedback({ type: 'success', text: 'GPS & base station synchronized via Mapbox' });
      setTimeout(() => setLocFeedback(null), 4000);
    } else {
      setLocFeedback({ type: 'error', text: result.error || 'Failed to detect location' });
    }
  };

  // If there is an active assigned delivery, prioritize rendering the active turn-by-turn view
  if (activeDelivery) {
    return <ActiveDeliveryView />;
  }

  return (
    <div className="space-y-5 sm:space-y-6 text-slate-800 animate-in fade-in duration-200">
      
      {/* Shift Overview Banner */}
      <div className="relative bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-xs overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`w-3 h-3 rounded-full ${
                  isOnline ? 'bg-emerald-500 ring-4 ring-emerald-100 animate-pulse' : 'bg-slate-400'
                }`}
              />
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500">
                {isOnline ? 'Active on Dispatch Radar' : 'Standby / Offline'}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
              {isOnline ? 'Scanning Nearby Quick Orders 🛵' : 'Ready to Start Delivering?'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Operating within <span className="text-orange-600 font-bold">{profile?.serviceRadiusKm || 25} km</span> radius of your base station
            </p>
          </div>

          <button
            onClick={toggleOnline}
            className={`px-5 py-3 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition-all active:scale-95 cursor-pointer ${
              isOnline
                ? 'bg-red-50 hover:bg-red-100 text-red-600 border border-red-200/80'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
            }`}
          >
            <Power className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>{isOnline ? 'GO OFFLINE' : 'GO ONLINE & RECEIVE ORDERS'}</span>
          </button>
        </div>
      </div>

      {/* Floating Cash in Hand Alert Banner (Prominent COD Cash Remittance to Super Admin) */}
      {(profile?.codCashFloat ?? 0) > 0 && (
        <div className={`p-5 rounded-2xl sm:rounded-3xl border-2 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-sm ${
          (profile?.codCashFloat ?? 0) >= (profile?.codFloatLimit || 3000)
            ? 'bg-red-50 border-red-300 text-red-900'
            : 'bg-gradient-to-r from-amber-50 to-orange-50 border-orange-300 text-orange-950'
        }`}>
          <div className="flex items-start sm:items-center gap-3.5">
            <div className={`p-3 rounded-2xl border shadow-xs shrink-0 ${
              (profile?.codCashFloat ?? 0) >= (profile?.codFloatLimit || 3000)
                ? 'bg-red-500 text-white border-red-600'
                : 'bg-orange-500 text-white border-orange-600'
            }`}>
              <Banknote className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm sm:text-base font-black uppercase tracking-tight">
                  Cash in Hand: ₹{(profile?.codCashFloat ?? 0).toLocaleString('en-IN')}
                </span>
                {(profile?.codCashFloat ?? 0) >= (profile?.codFloatLimit || 3000) ? (
                  <span className="text-[10px] bg-red-200 text-red-900 font-black px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-red-300">
                    <ShieldAlert className="w-3 h-3" /> RADAR PAUSED (LIMIT REACHED)
                  </span>
                ) : (
                  <span className="text-[10px] bg-amber-200/90 text-amber-900 font-bold px-2 py-0.5 rounded-full border border-amber-300">
                    Remit to Admin (Limit ₹{(profile?.codFloatLimit || 3000).toLocaleString('en-IN')})
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 mt-1">
                {(profile?.codCashFloat ?? 0) >= (profile?.codFloatLimit || 3000)
                  ? 'Your cash float reached the threshold. Pay to Admin online or submit to Regional Admin to continue receiving orders.'
                  : 'Customer COD cash collected. Remit online via UPI/Razorpay or generate cash handover code for your local hub.'}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5 self-start lg:self-auto shrink-0">
            {remitFeedback && (
              <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg ${
                remitFeedback.type === 'success' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
              }`}>
                {remitFeedback.text}
              </span>
            )}
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isPayingRazorpay || (profile?.codCashFloat ?? 0) <= 0}
                onClick={handlePayCODOnline}
                className="px-4 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-md shadow-orange-500/25 flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
              >
                {isPayingRazorpay ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing Gateway...</span>
                  </>
                ) : (
                  <>
                    <span>Pay Online via UPI / Razorpay</span>
                    <ArrowUpRight className="w-4 h-4" />
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleOpenHubModal}
                className="px-3.5 py-2.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 font-bold text-xs rounded-xl transition-all cursor-pointer shadow-2xs flex items-center gap-1.5"
              >
                <Building2 className="w-4 h-4 text-slate-600" />
                <span>Hub Handover</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual GPS Location Bar (Mapbox Geocoding — Zero Background Polling) */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600 shrink-0">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700">Rider Base Station (Mapbox GPS)</span>
              <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                Manual on-demand
              </span>
            </div>
            <p className="text-sm font-bold text-slate-900 mt-0.5 line-clamp-1">
              {profile?.address || 'No GPS coordinates recorded yet — click update below'}
            </p>
            {profile?.currentLat && profile?.currentLng && (
              <p className="text-[11px] font-mono text-slate-500 mt-0.5">
                Coords: {profile.currentLat.toFixed(4)}°N, {profile.currentLng.toFixed(4)}°E
              </p>
            )}
            {locFeedback && (
              <p className={`text-xs mt-1 font-medium flex items-center gap-1.5 ${
                locFeedback.type === 'success' ? 'text-emerald-700' : 'text-red-600'
              }`}>
                {locFeedback.type === 'success' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                {locFeedback.text}
              </p>
            )}
          </div>
        </div>

        <button
          onClick={handleUpdateLocation}
          disabled={locating}
          className="px-4 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${locating ? 'animate-spin' : ''}`} />
          <span>{locating ? 'Fetching GPS...' : 'Update GPS Location'}</span>
        </button>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {/* Wallet Balance */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs hover:border-orange-200 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Wallet Balance</span>
            <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-600">
            ₹{(profile?.walletBalance || 0).toLocaleString('en-IN')}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">Instant withdrawable</span>
        </div>

        {/* Deliveries Completed */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs hover:border-orange-200 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Completed Trips</span>
            <div className="p-1.5 bg-orange-50 text-orange-600 rounded-lg">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900">
            {profile?.totalDeliveries || 0}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">Lifetime deliveries</span>
        </div>

        {/* Service Radius */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs hover:border-orange-200 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Service Radius</span>
            <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
              <Navigation className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900">
            {profile?.serviceRadiusKm || 25} <span className="text-xs font-normal text-slate-500">km</span>
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">Coverage distance</span>
        </div>

        {/* Partner Rating */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs hover:border-orange-200 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Partner Rating</span>
            <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-600">
            ★ {profile?.rating ? profile.rating.toFixed(1) : '5.0'}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">Top rated tier</span>
        </div>
      </div>

      {/* Radar Standby Screen */}
      <div className="bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl p-6 sm:p-8 text-center shadow-xs relative overflow-hidden">
        {isOnline ? (
          <div className="space-y-4 max-w-md mx-auto">
            {/* Animated Radar Pulse concentric circles */}
            <div className="relative w-32 h-32 sm:w-36 sm:h-36 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border border-orange-400/30 animate-ping" />
              <div className="absolute inset-3 sm:inset-4 rounded-full border border-orange-400/40 animate-pulse" />
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-orange-50 border border-orange-300 flex items-center justify-center shadow-md shadow-orange-500/10 text-orange-600">
                <Radar className="w-8 h-8 sm:w-10 sm:h-10 animate-spin" />
              </div>
            </div>

            <h3 className="text-base sm:text-lg font-bold text-slate-900">Radar Active — Listening for Dispatches</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              When a local vendor broadcasts an order within your {profile?.serviceRadiusKm || 25} km radius, an audio alert and acceptance card will appear immediately.
            </p>

            <div className="pt-2 flex flex-wrap justify-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> High priority queue
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-200">
                10-30 min deliveries
              </span>
            </div>
          </div>
        ) : (
          <div className="space-y-3 max-w-md mx-auto">
            <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 border border-slate-200">
              <Power className="w-7 h-7 sm:w-8 sm:h-8" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900">You are Currently Offline</h3>
            <p className="text-xs text-slate-500">
              Switch your status to Online to start receiving delivery broadcast alerts and earn instantly.
            </p>
            <button
              onClick={toggleOnline}
              className="mt-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
            >
              GO ONLINE NOW
            </button>
          </div>
        )}
      </div>

      {/* Hub Handover Modal */}
      {showHubModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-orange-100 text-orange-600 rounded-xl">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Regional Hub Cash Handover</h3>
                  <p className="text-xs text-slate-500">Submit collected customer COD cash to your regional base station</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowHubModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              {loadingHubStatus ? (
                <div className="py-12 text-center text-slate-500 text-xs flex flex-col items-center justify-center gap-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-orange-500" />
                  <span>Checking territory hub availability...</span>
                </div>
              ) : hubStatusData?.regionalAdminAvailable && hubStatusData?.regionalAdmin ? (
                <>
                  {/* Amount to Hand Over */}
                  <div className="p-4 bg-orange-50/80 rounded-2xl border border-orange-200 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-orange-900 uppercase">Cash in Hand to Handover</span>
                      <p className="text-2xl font-black text-orange-600 font-mono mt-0.5">
                        ₹{(profile?.codCashFloat ?? 0).toLocaleString('en-IN')}
                      </p>
                    </div>
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-orange-200 text-orange-900">
                      Physical Cash
                    </span>
                  </div>

                  {/* Regional Admin & Hub Card */}
                  <div className="p-4 rounded-2xl border border-slate-200/90 bg-slate-50/50 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Assigned Regional Hub</span>
                        <h4 className="text-sm font-bold text-slate-900 mt-0.5">{hubStatusData.regionalAdmin.hubName}</h4>
                        <p className="text-xs text-slate-600 mt-0.5">Manager: <strong className="text-slate-800">{hubStatusData.regionalAdmin.name}</strong></p>
                        {hubStatusData.regionalAdmin.address && (
                          <p className="text-[11px] text-slate-500 mt-1 flex items-start gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                            <span>{hubStatusData.regionalAdmin.address}</span>
                          </p>
                        )}
                      </div>
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full">
                        Hub Online
                      </span>
                    </div>

                    {/* Communication and Navigation Pills */}
                    <div className="pt-2 border-t border-slate-200/60 flex flex-wrap gap-2">
                      {hubStatusData.regionalAdmin.phone && (
                        <>
                          <a
                            href={`tel:${hubStatusData.regionalAdmin.phone}`}
                            className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-2xs flex items-center gap-1.5 transition-all"
                          >
                            <Phone className="w-3.5 h-3.5 text-blue-600" />
                            <span>Call Admin</span>
                          </a>

                          <a
                            href={`https://wa.me/91${hubStatusData.regionalAdmin.phone.replace(/\D/g, '').slice(-10)}?text=${encodeURIComponent(
                              `Hello ${hubStatusData.regionalAdmin.name}, I am delivery rider ${user?.name || ''} arriving at ${hubStatusData.regionalAdmin.hubName} to hand over COD cash of ₹${profile?.codCashFloat || 0}.`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 shadow-2xs flex items-center gap-1.5 transition-all"
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                            <span>WhatsApp</span>
                          </a>
                        </>
                      )}

                      {hubStatusData.regionalAdmin.address && (
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(hubStatusData.regionalAdmin.address)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl text-xs font-bold text-blue-800 shadow-2xs flex items-center gap-1.5 transition-all"
                        >
                          <Navigation className="w-3.5 h-3.5 text-blue-600" />
                          <span>Turn-by-Turn Maps</span>
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Pending Submission Banner or Direct Submit Button */}
                  {hubStatusData.pendingSubmission ? (
                    <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 flex items-start gap-2">
                      <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">Pending Hub Approval</p>
                        <p className="text-[11px] text-amber-700 mt-0.5">
                          You submitted ₹{hubStatusData.pendingSubmission.amount} cash to this hub. Please hand over the physical currency to the manager upon arrival to clear your balance.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={isSubmittingToHub || (profile?.codCashFloat ?? 0) <= 0}
                      onClick={handleSubmitCashToHub}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98"
                    >
                      {isSubmittingToHub ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Submitting Cash...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Confirm & Submit ₹{(profile?.codCashFloat ?? 0).toLocaleString('en-IN')} Cash to Hub</span>
                        </>
                      )}
                    </button>
                  )}
                </>
              ) : (
                /* No Regional Admin Available in Territory */
                <div className="space-y-4">
                  <div className="p-4 bg-red-50 border-2 border-red-200 rounded-2xl text-red-950 space-y-2">
                    <div className="flex items-center gap-2 text-red-700">
                      <ShieldAlert className="w-5 h-5 shrink-0" />
                      <h4 className="font-bold text-sm">No Regional Hub in Your Territory</h4>
                    </div>
                    <p className="text-xs text-red-800 leading-relaxed">
                      There is currently no physical Regional Admin assigned to your registered area (Pincode: <strong>{hubStatusData?.riderPincode || 'Unassigned'}</strong>). Offline cash handover is unavailable.
                    </p>
                  </div>

                  {/* Mandatory Suspension Notice */}
                  <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-2xl text-amber-900 space-y-1.5 text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-amber-950">
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                      <span>Platform Compliance & Account Suspension Notice</span>
                    </div>
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                      As per platform policy set by Super Admin, all collected cash must be remitted before the deadline (by End of the Day or within consecutive orders). <strong>Failure to clear your balance within the allowed window will result in automatic account suspension</strong>, preventing you from receiving any delivery dispatches.
                    </p>
                  </div>

                  {/* Direct Online Payment Button */}
                  <button
                    type="button"
                    disabled={isPayingRazorpay || (profile?.codCashFloat ?? 0) <= 0}
                    onClick={() => {
                      setShowHubModal(false);
                      handlePayCODOnline();
                    }}
                    className="w-full py-3.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md shadow-orange-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98"
                  >
                    <span>Pay ₹{(profile?.codCashFloat ?? 0).toLocaleString('en-IN')} Online via UPI / Razorpay Now</span>
                    <ArrowUpRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
