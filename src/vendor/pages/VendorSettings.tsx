import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import {
  Store, MapPin, Navigation, Landmark, ShieldCheck,
  Save, AlertTriangle, CheckCircle2, RefreshCw, Zap,
  Compass, Clock, Building2, Phone, Mail, FileText
} from 'lucide-react';

interface VendorSettingsData {
  id: string;
  businessName: string;
  contactName: string;
  email: string;
  phone: string;
  street: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  country: string;
  gstNumber: string | null;
  panNumber: string | null;
  walletBalance: number;
  commissionRate: number;
  accountHolder: string | null;
  accountNumber: string | null;
  ifsc: string | null;
  bankName: string | null;
  upiId: string | null;
  lat: number | null;
  lng: number | null;
  deliveryRadiusKm: number | null;
  supportsQuick: boolean;
  description: string | null;
  category: string | null;
  isActive: boolean;
}

export const VendorSettings: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [detectingGps, setDetectingGps] = useState(false);

  const [activeTab, setActiveTab] = useState<'store' | 'location' | 'banking'>('store');

  const [form, setForm] = useState<VendorSettingsData>({
    id: '',
    businessName: '',
    contactName: '',
    email: '',
    phone: '',
    street: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India',
    gstNumber: '',
    panNumber: '',
    walletBalance: 0,
    commissionRate: 10,
    accountHolder: '',
    accountNumber: '',
    ifsc: '',
    bankName: '',
    upiId: '',
    lat: null,
    lng: null,
    deliveryRadiusKm: 5,
    supportsQuick: true,
    description: '',
    category: '',
    isActive: true,
  });

  const loadSettings = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res: any = await api.get('/api/vendor/settings');
      if (res?.settings) {
        setForm(prev => ({
          ...prev,
          ...res.settings,
          deliveryRadiusKm: res.settings.deliveryRadiusKm || 5,
          supportsQuick: res.settings.supportsQuick ?? true,
        }));
      }
    } catch (err: any) {
      console.error('Failed to load vendor settings:', err);
      setErrorMsg(err.message || 'Failed to load store settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleDetectGps = () => {
    if (!navigator.geolocation) {
      setErrorMsg('Geolocation is not supported by your browser.');
      return;
    }

    setDetectingGps(true);
    setErrorMsg(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setForm(prev => ({
          ...prev,
          lat: Math.round(latitude * 1000000) / 1000000,
          lng: Math.round(longitude * 1000000) / 1000000,
        }));

        try {
          // Reverse geocode to auto-fill address details
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`,
            { headers: { 'Accept-Language': 'en' } }
          );
          const data = await res.json();
          const addr = data.address || {};
          const city = addr.city || addr.town || addr.village || addr.city_district || '';
          const state = addr.state || '';
          const postcode = addr.postcode || '';
          const street = [addr.road, addr.suburb, addr.neighbourhood].filter(Boolean).join(', ');

          setForm(prev => ({
            ...prev,
            street: prev.street || street || null,
            city: prev.city || city || null,
            state: prev.state || state || null,
            pincode: prev.pincode || postcode || null,
          }));
          setSuccessMsg('GPS coordinates and address detected successfully!');
        } catch {
          setSuccessMsg(`GPS Coordinates detected: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
        } finally {
          setDetectingGps(false);
          setTimeout(() => setSuccessMsg(null), 4000);
        }
      },
      (err) => {
        setDetectingGps(false);
        setErrorMsg(`Failed to detect location: ${err.message}. You can enter coordinates manually.`);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res: any = await api.put('/api/vendor/settings', form);
      if (res?.success) {
        setSuccessMsg('Store settings and location successfully saved!');
        if (res.settings) {
          setForm(prev => ({ ...prev, ...res.settings }));
        }
        setTimeout(() => setSuccessMsg(null), 4000);
      }
    } catch (err: any) {
      console.error('Failed to update vendor settings:', err);
      setErrorMsg(err.message || 'Failed to update store settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mb-3" />
        <p className="text-sm font-medium text-gray-500">Loading store settings & GPS profile...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-heading flex items-center gap-2">
            <Store className="w-6 h-6 text-emerald-600" />
            Store Settings & GPS Location
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your store's storefront visibility, GPS delivery radius for 10-min Quick Commerce, and audited payout details.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-sm transition-all disabled:opacity-50"
        >
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving Changes...' : 'Save Settings'}
        </button>
      </div>

      {/* Alerts */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-center gap-3 text-sm">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-3 text-sm">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200 gap-6">
        <button
          onClick={() => setActiveTab('store')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'store'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Building2 className="w-4 h-4" />
          Store Profile & Hours
        </button>

        <button
          onClick={() => setActiveTab('location')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'location'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Compass className="w-4 h-4" />
          Mapbox GPS & Quick Radius
        </button>

        <button
          onClick={() => setActiveTab('banking')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'banking'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Landmark className="w-4 h-4" />
          Bank & UPI Payouts
        </button>
      </div>

      {/* Form Content */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* TAB 1: STORE PROFILE */}
        {activeTab === 'store' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Store className="w-4 h-4 text-emerald-600" />
                Storefront Information
              </h3>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Business / Store Name *</label>
                <input
                  type="text"
                  required
                  value={form.businessName || ''}
                  onChange={e => setForm({ ...form, businessName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Contact Person Name</label>
                <input
                  type="text"
                  value={form.contactName || ''}
                  onChange={e => setForm({ ...form, contactName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Primary Store Category</label>
                <select
                  value={form.category || 'Retail & Electronics'}
                  onChange={e => setForm({ ...form, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="Retail & Electronics">Retail & Electronics (Pan-India)</option>
                  <option value="Grocery & Supermarket">Grocery & Supermarket (Quick Commerce)</option>
                  <option value="Cloud Kitchen & Food">Cloud Kitchen & Food (Quick Commerce)</option>
                  <option value="Pharmacy & Health">Pharmacy & Health (Quick Commerce)</option>
                  <option value="Home & Appliances Services">Home & Appliances Services</option>
                  <option value="Vehicle & Roadside Services">Vehicle & Roadside Services</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Store Description</label>
                <textarea
                  rows={3}
                  value={form.description || ''}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="Tell customers about your store, specialty products, or service quality..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-600" />
                Store Status & Visibility
              </h3>

              <div className="p-4 rounded-xl border border-gray-100 bg-gray-50 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-gray-900">Accepting Online Orders</h4>
                  <p className="text-xs text-gray-500">Toggle whether your products are actively visible on the storefront.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={e => setForm({ ...form, isActive: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              <div className="p-4 rounded-xl border border-gray-100 bg-gray-50 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
                    Quick-Commerce Fulfillment
                  </h4>
                  <p className="text-xs text-gray-500">Enables your items in 10-minute instant delivery within your radius.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.supportsQuick}
                    onChange={e => setForm({ ...form, supportsQuick: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-gray-400" />
                    Support Phone
                  </label>
                  <input
                    type="text"
                    value={form.phone || ''}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-gray-400" />
                    Email Address
                  </label>
                  <input
                    type="email"
                    disabled
                    value={form.email || ''}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-100 text-gray-500 cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-gray-400" />
                    GST Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 36AAAAA0000A1Z5"
                    value={form.gstNumber || ''}
                    onChange={e => setForm({ ...form, gstNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm uppercase focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-gray-400" />
                    PAN Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. ABCDE1234F"
                    value={form.panNumber || ''}
                    onChange={e => setForm({ ...form, panNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm uppercase focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: MAPBOX GPS & QUICK COMMERCE RADIUS */}
        {activeTab === 'location' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
                <div>
                  <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-emerald-600" />
                    Physical Store Address & GPS Coordinates
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Accurate GPS coordinates determine whether nearby customers see your store on the 10-minute Quick Commerce portal.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleDetectGps}
                  disabled={detectingGps}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold text-xs border border-emerald-200 transition-all"
                >
                  <Navigation className={`w-3.5 h-3.5 ${detectingGps ? 'animate-spin' : ''}`} />
                  {detectingGps ? 'Detecting via GPS...' : 'Auto-Detect Current GPS'}
                </button>
              </div>

              {/* Coordinates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-gray-50 border border-gray-100">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Latitude (°N)</label>
                  <input
                    type="number"
                    step="0.000001"
                    placeholder="e.g. 17.247200"
                    value={form.lat != null ? form.lat : ''}
                    onChange={e => setForm({ ...form, lat: e.target.value ? parseFloat(e.target.value) : null })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Longitude (°E)</label>
                  <input
                    type="number"
                    step="0.000001"
                    placeholder="e.g. 80.151400"
                    value={form.lng != null ? form.lng : ''}
                    onChange={e => setForm({ ...form, lng: e.target.value ? parseFloat(e.target.value) : null })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Delivery Radius Slider */}
              <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-100 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-emerald-600" />
                      Quick Commerce Delivery Radius
                    </h4>
                    <p className="text-xs text-gray-500">
                      Customers within this distance from your store will see your quick items.
                    </p>
                  </div>
                  <span className="text-base font-extrabold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-lg">
                    {form.deliveryRadiusKm || 5} km
                  </span>
                </div>

                <input
                  type="range"
                  min="5"
                  max="100"
                  step="1"
                  value={form.deliveryRadiusKm || 25}
                  onChange={e => setForm({ ...form, deliveryRadiusKm: parseFloat(e.target.value) })}
                  className="w-full accent-emerald-600 cursor-pointer"
                />
                <div className="flex justify-between items-center text-[11px] font-semibold text-gray-500 pt-1">
                  <span>5 km (Ultra local)</span>
                  <span>25 km (Standard Hub)</span>
                  <span>50 km (Metro Zone)</span>
                  <span>100 km (Regional Max)</span>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  {[10, 25, 50, 100].map(rad => (
                    <button
                      key={rad}
                      type="button"
                      onClick={() => setForm({ ...form, deliveryRadiusKm: rad })}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                        form.deliveryRadiusKm === rad
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-300'
                      }`}
                    >
                      {rad} km
                    </button>
                  ))}
                </div>
              </div>

              {/* Street Address */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 mb-1">Road / Street / Colony Address</label>
                  <input
                    type="text"
                    placeholder="Shop No., Building Name, Street / Colony..."
                    value={form.street || ''}
                    onChange={e => setForm({ ...form, street: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">City / District *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Khammam, Hyderabad, Warangal..."
                    value={form.city || ''}
                    onChange={e => setForm({ ...form, city: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Postal Pincode *</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="e.g. 507001"
                    value={form.pincode || ''}
                    onChange={e => setForm({ ...form, pincode: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">State *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Telangana"
                    value={form.state || ''}
                    onChange={e => setForm({ ...form, state: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Country</label>
                  <input
                    type="text"
                    disabled
                    value={form.country || 'India'}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-100 text-gray-500 cursor-not-allowed"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: BANK & UPI PAYOUTS */}
        {activeTab === 'banking' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <div>
                  <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <Landmark className="w-5 h-5 text-emerald-600" />
                    Bank Account & Fast UPI Payout Details
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Your earnings will be remitted to this account via IMPS/NEFT or instant UPI transfer upon settlement.
                  </p>
                </div>

                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Audited & Protected
                </div>
              </div>

              {/* UPI ID (NEW Feature) */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 space-y-2">
                <label className="block text-xs font-extrabold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-emerald-600" />
                  Instant UPI ID for Direct Settlement (Recommended)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. yourstore@okaxis, shopindia@ybl, merchant@upi"
                    value={form.upiId || ''}
                    onChange={e => setForm({ ...form, upiId: e.target.value.toLowerCase() })}
                    className="flex-1 px-3 py-2.5 bg-white border border-emerald-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <p className="text-[11px] text-emerald-700">
                  Providing a verified UPI ID enables 24/7 instant payouts directly to your business account without waiting for banking batch clearance.
                </p>
              </div>

              {/* Traditional Bank Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Bank Name</label>
                  <input
                    type="text"
                    placeholder="e.g. State Bank of India, HDFC Bank, ICICI..."
                    value={form.bankName || ''}
                    onChange={e => setForm({ ...form, bankName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Account Holder Name</label>
                  <input
                    type="text"
                    placeholder="As registered in the bank passbook..."
                    value={form.accountHolder || ''}
                    onChange={e => setForm({ ...form, accountHolder: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Bank Account Number</label>
                  <input
                    type="text"
                    placeholder="e.g. 50100234891234"
                    value={form.accountNumber || ''}
                    onChange={e => setForm({ ...form, accountNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">IFSC Code</label>
                  <input
                    type="text"
                    maxLength={11}
                    placeholder="e.g. SBIN0001234"
                    value={form.ifsc || ''}
                    onChange={e => setForm({ ...form, ifsc: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono uppercase focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Security Audit Notice */}
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Security Compliance Notice:</span> Every change made to banking or UPI details is cryptographically logged in our audit registry (`SettingsAuditLog`) with timestamp and user footprint to prevent unauthorized financial rerouting.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Save Action */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-sm transition-all disabled:opacity-50"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
};
