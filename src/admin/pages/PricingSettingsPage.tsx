import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import {
  ShoppingBag, Zap, ShieldCheck, History,
  Save, Plus, Trash2, CheckCircle2, AlertCircle, RefreshCw,
  Sparkles, Moon, Clock, Calendar
} from 'lucide-react';

interface PricingRule {
  id: string;
  scope: string;
  scopeId?: string | null;
  targetName?: string | null;
  vertical?: string | null;
  commissionPct: number;
  includeGateway: boolean;
  isActive: boolean;
  description?: string | null;
}

interface DeliveryPayRule {
  id?: string;
  scope: string;
  basePayPerOrder: number | string;
  payPerKm: number | string;
  maxDistanceKm: number | string;
  isActive: boolean;
  description?: string | null;
}

interface AppSettings {
  shiprocket_base_fee: string;
  shiprocket_free_delivery_enabled: string;
  shiprocket_free_threshold: string;
  shiprocket_estimated_cost: string;
  quick_customer_base_fee: string;
  quick_customer_per_km: string;
  quick_free_delivery_enabled: string;
  quick_free_threshold: string;
  service_commission_pct: string;
  shop_commission_pct?: string;
  quick_commission_pct?: string;
  platform_charge_pct: string;
  gst_percent: string;
  cgst_percent: string;
  sgst_percent: string;
  midnight_blackout_enabled?: string;
  midnight_blackout_start?: string;
  midnight_blackout_end?: string;
  midnight_blackout_verticals?: string;
  midnight_blackout_title?: string;
  midnight_blackout_message?: string;
  friday_break_enabled?: string;
  friday_break_day?: string;
  friday_break_start?: string;
  friday_break_end?: string;
  friday_break_verticals?: string;
  friday_break_title?: string;
  friday_break_subtitle?: string;
  friday_break_message?: string;
  [key: string]: any;
}

// 12-Hour AM/PM Time Selector Component
const Time12HourPicker: React.FC<{
  label: string;
  helperText?: string;
  value: string; // "23:00" or "11:00 PM"
  accentColor?: 'indigo' | 'emerald';
  onChange: (time24: string) => void;
}> = ({ label, helperText, value, accentColor = 'indigo', onChange }) => {
  const parseVal = (str: string) => {
    if (!str) return { hour: '11', min: '00', period: 'PM' };
    const raw = str.trim().toUpperCase();
    const isPM = raw.includes('PM');
    const isAM = raw.includes('AM');
    const clean = raw.replace(/[^\d:]/g, '');
    const [hStr, mStr] = clean.split(':');
    let h = parseInt(hStr || '12', 10);
    const m = mStr ? mStr.padStart(2, '0') : '00';
    let p = 'AM';
    if (isPM) {
      p = 'PM';
    } else if (isAM) {
      p = 'AM';
    } else {
      p = h >= 12 ? 'PM' : 'AM';
      if (h > 12) h -= 12;
      if (h === 0) h = 12;
    }
    const h12 = h % 12 === 0 ? '12' : String(h % 12).padStart(2, '0');
    return { hour: h12, min: m, period: p };
  };

  const current = parseVal(value);

  const update = (h: string, m: string, p: string) => {
    let hourNum = parseInt(h, 10);
    if (p === 'PM' && hourNum < 12) hourNum += 12;
    if (p === 'AM' && hourNum === 12) hourNum = 0;
    const h24 = String(hourNum).padStart(2, '0');
    onChange(`${h24}:${m}`);
  };

  const activeBtnClass = accentColor === 'emerald'
    ? 'bg-emerald-600 text-white shadow-xs'
    : 'bg-indigo-600 text-white shadow-xs';

  return (
    <div>
      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <select
          value={current.hour}
          onChange={e => update(e.target.value, current.min, current.period)}
          className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:bg-white focus:border-indigo-600 transition-all cursor-pointer"
        >
          {['01','02','03','04','05','06','07','08','09','10','11','12'].map(hh => (
            <option key={hh} value={hh}>{hh}</option>
          ))}
        </select>
        <span className="font-bold text-gray-400">:</span>
        <select
          value={current.min}
          onChange={e => update(current.hour, e.target.value, current.period)}
          className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:bg-white focus:border-indigo-600 transition-all cursor-pointer"
        >
          {['00','15','30','45'].map(mm => (
            <option key={mm} value={mm}>{mm}</option>
          ))}
        </select>
        <div className="flex bg-gray-100 p-0.5 rounded-xl border border-gray-200">
          <button
            type="button"
            onClick={() => update(current.hour, current.min, 'AM')}
            className={`px-3 py-2 text-xs font-extrabold rounded-lg transition-all cursor-pointer ${
              current.period === 'AM'
                ? activeBtnClass
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            AM
          </button>
          <button
            type="button"
            onClick={() => update(current.hour, current.min, 'PM')}
            className={`px-3 py-2 text-xs font-extrabold rounded-lg transition-all cursor-pointer ${
              current.period === 'PM'
                ? activeBtnClass
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            PM
          </button>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-1">
        <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-md ${
          accentColor === 'emerald' ? 'text-emerald-700 bg-emerald-50' : 'text-indigo-700 bg-indigo-50'
        }`}>
          {current.hour}:{current.min} {current.period}
        </span>
        {helperText && <span className="text-[11px] text-gray-400">{helperText}</span>}
      </div>
    </div>
  );
};

export const PricingSettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'shop' | 'quick' | 'taxes' | 'blackout' | 'audit'>('shop');
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [liveOperatingStatus, setLiveOperatingStatus] = useState<any>(null);

  // Core Data
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [deliveryRule, setDeliveryRule] = useState<DeliveryPayRule>({
    scope: 'global',
    basePayPerOrder: '30',
    payPerKm: '5',
    maxDistanceKm: '15',
    isActive: true,
    description: 'Global Quick Commerce Rider Pay Rule'
  });
  const [settings, setSettings] = useState<AppSettings>({
    shiprocket_base_fee: '49',
    shiprocket_free_delivery_enabled: 'false',
    shiprocket_free_threshold: '499',
    shiprocket_estimated_cost: '45',
    quick_customer_base_fee: '35',
    quick_customer_per_km: '7',
    quick_free_delivery_enabled: 'false',
    quick_free_threshold: '999',
    service_commission_pct: '15',
    shop_commission_pct: '10',
    quick_commission_pct: '10',
    platform_charge_pct: '3.0',
    gst_percent: '18',
    cgst_percent: '9',
    sgst_percent: '9',
    midnight_blackout_enabled: 'false',
    midnight_blackout_start: '23:00',
    midnight_blackout_end: '07:00',
    midnight_blackout_verticals: 'both',
    midnight_blackout_title: 'Closed for the night! 🌙',
    midnight_blackout_message: "We're currently offline for the night to let our riders & partners rest. We'll be back at 7:00 AM!",
    friday_break_enabled: 'false',
    friday_break_day: '5',
    friday_break_start: '12:00',
    friday_break_end: '14:00',
    friday_break_verticals: 'both',
    friday_break_title: 'Friday Prayer Break 🕌',
    friday_break_subtitle: 'Jummah Mubarak! Services temporarily paused.',
    friday_break_message: 'Our deliveries and field services are on a brief break for Friday Jummah prayers. We will resume immediately at 2:00 PM.'
  });
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [vendors, setVendors] = useState<Array<{ id: string; storeName: string }>>([]);

  // Modal State for New Commission Rule
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [newRule, setNewRule] = useState({
    scope: 'category',
    scopeId: '',
    vertical: 'shop',
    commissionPct: 10,
    includeGateway: true,
    description: ''
  });

  // Interactive Live Previews
  const [quickSimDistance, setQuickSimDistance] = useState<number>(4);
  const [shopSimPrice, setShopSimPrice] = useState<number>(500);
  const [quickItemSimPrice, setQuickItemSimPrice] = useState<number>(100);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  const loadOperatingStatus = async () => {
    try {
      const res: any = await api.get('/api/orders/pricing-config');
      if (res?.operatingStatus) {
        setLiveOperatingStatus(res.operatingStatus);
      }
    } catch (_err) {}
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [rRes, dRes, sRes, catRes, venRes]: any = await Promise.all([
        api.get('/api/admin/pricing/rules').catch(() => ({ rules: [] })),
        api.get('/api/admin/pricing/delivery-rules').catch(() => ({ rules: [] })),
        api.get('/api/admin/pricing/settings').catch(() => ({ settings: {} })),
        api.get('/api/categories').catch(() => ({ categories: [] })),
        api.get('/api/admin/vendors').catch(() => ({ vendors: [] }))
      ]);

      loadOperatingStatus();

      if (rRes?.rules) setRules(rRes.rules);
      if (dRes?.rules && dRes.rules.length > 0) {
        setDeliveryRule(dRes.rules[0]);
      }
      if (sRes?.settings) {
        setSettings(prev => ({
          ...prev,
          ...sRes.settings,
          shiprocket_free_delivery_enabled: String(sRes.settings.shiprocket_free_delivery_enabled || 'false'),
          quick_free_delivery_enabled: String(sRes.settings.quick_free_delivery_enabled || 'false'),
          service_commission_pct: sRes.settings.service_commission_pct || '15',
          shop_commission_pct: sRes.settings.shop_commission_pct || '10',
          quick_commission_pct: sRes.settings.quick_commission_pct || '10',
          platform_charge_pct: sRes.settings.platform_charge_pct || '3.0'
        }));
      }
      if (catRes?.categories) setCategories(catRes.categories);
      else if (Array.isArray(catRes)) setCategories(catRes);

      if (venRes?.vendors) setVendors(venRes.vendors);
      else if (Array.isArray(venRes)) setVendors(venRes);
    } catch (err: any) {
      console.error('Failed to load pricing data:', err);
      showToast('Failed to load pricing data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadAuditLogs = async () => {
    try {
      const res: any = await api.get('/api/admin/pricing/audit-logs');
      if (res?.logs) setAuditLogs(res.logs);
    } catch (err) {
      console.error('Audit log fetch error:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Save Settings Helper
  const saveSettingsBundle = async (
    bundleSettings: Partial<AppSettings>,
    bundleDeliveryRule?: DeliveryPayRule,
    saveKey: string = 'general',
    successMsg: string = 'Settings saved successfully'
  ) => {
    setSavingKey(saveKey);
    try {
      const mergedSettings: AppSettings = { ...settings, ...bundleSettings };

      // Strictly send only the specific keys being updated so saving one schedule never overwrites another!
      const payload: any = { settings: bundleSettings };
      if (bundleDeliveryRule) {
        payload.deliveryRule = {
          ...bundleDeliveryRule,
          basePayPerOrder: parseFloat(String(bundleDeliveryRule.basePayPerOrder)) || 30,
          payPerKm: parseFloat(String(bundleDeliveryRule.payPerKm)) || 5,
          maxDistanceKm: parseFloat(String(bundleDeliveryRule.maxDistanceKm)) || 15
        };
      }

      await api.post('/api/admin/pricing/settings', payload);

      if (bundleDeliveryRule) {
        await api.post('/api/admin/pricing/delivery-rules', payload.deliveryRule).catch(() => {});
      }

      setSettings(mergedSettings);
      if (bundleDeliveryRule) {
        setDeliveryRule(payload.deliveryRule);
      }

      showToast(successMsg, 'success');
      loadOperatingStatus();
    } catch (err: any) {
      showToast(err.message || 'Failed to save settings', 'error');
    } finally {
      setSavingKey(null);
    }
  };

  // Commission Rule Handlers
  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/api/admin/pricing/rules', {
        ...newRule,
        scopeId: newRule.scope === 'vertical' || newRule.scope === 'global' ? null : newRule.scopeId
      });
      setShowRuleModal(false);
      setNewRule({
        scope: 'category',
        scopeId: '',
        vertical: 'shop',
        commissionPct: 10,
        includeGateway: true,
        description: ''
      });
      showToast('Commission rule created successfully');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to create commission rule', 'error');
    }
  };

  const handleDeleteRule = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this commission rule?')) return;
    try {
      await api.delete(`/api/admin/pricing/rules/${id}`);
      showToast('Commission rule deleted');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete rule', 'error');
    }
  };

  const handleDeleteAuditLog = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this activity log record?')) return;
    try {
      await api.delete(`/api/admin/pricing/audit-logs/${id}`);
      setAuditLogs(prev => prev.filter(l => l.id !== id));
      showToast('Activity record deleted permanently');
    } catch (err: any) {
      showToast(err.message || 'Failed to delete activity log', 'error');
    }
  };

  const handleClearAllAuditLogs = async () => {
    if (!window.confirm('Are you sure you want to permanently clear ALL activity history? This will delete the entire audit log from the database.')) return;
    try {
      await api.delete('/api/admin/pricing/audit-logs');
      setAuditLogs([]);
      showToast('Entire activity history cleared from database');
    } catch (err: any) {
      showToast(err.message || 'Failed to clear activity logs', 'error');
    }
  };

  // Quick Shopping Calculations
  const qBaseCust = parseFloat(settings.quick_customer_base_fee) || 35;
  const qPerKmCust = parseFloat(settings.quick_customer_per_km) || 7;
  const qRiderBase = parseFloat(String(deliveryRule.basePayPerOrder)) || 30;
  const qRiderPerKm = parseFloat(String(deliveryRule.payPerKm)) || 5;
  const extraKm = Math.max(0, quickSimDistance - 2);
  const simCustomerPay = Math.round(qBaseCust + (extraKm * qPerKmCust));
  const simRiderPay = Math.round(qRiderBase + (extraKm * qRiderPerKm));
  const simQuickMargin = simCustomerPay - simRiderPay;

  return (
    <div className="space-y-6 pb-24 font-sans text-gray-900">
      {/* Toast Alert Notification */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl border text-sm font-semibold animate-in fade-in slide-in-from-top-4 ${
            toast.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-rose-50 text-rose-900 border-rose-200'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Main Page Header */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="px-3 py-1 bg-indigo-50 text-indigo-700 font-bold text-xs rounded-full uppercase tracking-wider">
              Central Revenue Engine
            </span>
            <span className="text-xs text-gray-400 font-medium">Real-Time Global Sync</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">
            Delivery Charges & Commission Engine
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Dynamic pricing controls for Pan-India E-Commerce, Quick Commerce Riders, Glacons Services, and Platform Taxes.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={loading}
            className="p-3 border border-gray-200 rounded-2xl text-gray-600 hover:bg-gray-50 transition-colors"
            title="Refresh All Settings"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="flex gap-2 p-1.5 bg-gray-100/80 rounded-2xl overflow-x-auto">
        {[
          { id: 'shop', label: 'Shop India (E-Commerce)', icon: ShoppingBag },
          { id: 'quick', label: 'Quick Shopping & Riders', icon: Zap },
          { id: 'blackout', label: 'Operating Hours & Blackouts', icon: Moon },
          { id: 'taxes', label: 'Platform Fees & GST', icon: ShieldCheck },
          { id: 'audit', label: 'Change History', icon: History }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                if (tab.id === 'audit') loadAuditLogs();
              }}
              className={`flex items-center gap-2.5 px-5 py-3 rounded-xl text-xs md:text-sm font-bold transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-gray-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: SHOP INDIA E-COMMERCE */}
      {activeTab === 'shop' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Section Info Banner */}
          <div className="bg-indigo-50/60 border border-indigo-100 rounded-3xl p-5 flex items-start gap-4">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm mt-0.5">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-indigo-950">
                Pan-India E-Commerce Shipping & Vendor Protection
              </h3>
              <p className="text-xs text-indigo-800/80 mt-1 leading-relaxed">
                Controls standard courier deliveries (Shiprocket/3PL). Merchants receive <strong>100% of their product price</strong>.
                The admin commission % is added as a transparent markup for shoppers at checkout.
              </p>
            </div>
          </div>

          {/* Card 0: Platform Base Product Commission Rate */}
          <div className="bg-white rounded-3xl p-6 md:p-8 border border-gray-100 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center font-black text-sm">
                  %
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-gray-900">Platform Product Commission Rate (Shop India E-Commerce)</h3>
                  <p className="text-xs text-gray-500">
                    Base markup percentage added to vendor base price for nationwide courier orders. Vendors receive 100% of their base listing price.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  saveSettingsBundle(
                    { shop_commission_pct: settings.shop_commission_pct || '10' },
                    undefined,
                    'shop_commission',
                    'Shop India product commission rate saved successfully!'
                  )
                }
                disabled={savingKey === 'shop_commission'}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-sm transition-all disabled:opacity-50 cursor-pointer active:scale-95"
              >
                <Save className="w-4 h-4" />
                <span>{savingKey === 'shop_commission' ? 'Saving...' : 'Save Commission Rate'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              {/* Left Column: Slider and Rate Controls */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Admin Commission Percentage (%)
                  </label>
                  <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-lg border border-indigo-100">
                    {settings.shop_commission_pct || '10'}%
                  </span>
                </div>

                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="0"
                    max="50"
                    step="0.5"
                    value={parseFloat(settings.shop_commission_pct || '10') || 0}
                    onChange={e => setSettings({ ...settings, shop_commission_pct: e.target.value })}
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      max="50"
                      step="0.5"
                      value={settings.shop_commission_pct || '10'}
                      onChange={e => setSettings({ ...settings, shop_commission_pct: e.target.value })}
                      className="w-20 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-extrabold text-gray-900 text-center focus:bg-white focus:border-indigo-600 focus:outline-none"
                    />
                    <span className="text-xs font-bold text-gray-400">%</span>
                  </div>
                </div>

                {/* Split Visualizer */}
                <div className="space-y-1.5">
                  <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden flex shadow-inner">
                    <div
                      style={{ width: `${Math.min(100, Math.max(0, parseFloat(settings.shop_commission_pct || '10') || 0)) * 2}%` }}
                      className="bg-indigo-600 h-full transition-all duration-300"
                    />
                    <div
                      style={{ width: `${100 - (Math.min(100, Math.max(0, parseFloat(settings.shop_commission_pct || '10') || 0)) * 2)}%` }}
                      className="bg-emerald-500 h-full transition-all duration-300"
                    />
                  </div>
                  <div className="flex justify-between text-[11px] font-bold">
                    <span className="text-indigo-600">Admin Markup: {settings.shop_commission_pct || '10'}%</span>
                    <span className="text-emerald-700">Vendor Receives: 100% (Protected Base Price)</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Real-Time Payout Simulator */}
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-gray-700">Real-Time Product Price Simulator</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-gray-400 font-bold">Sample Vendor Price: ₹</span>
                    <input
                      type="number"
                      value={shopSimPrice}
                      onChange={e => setShopSimPrice(Number(e.target.value) || 0)}
                      className="w-20 px-2 py-1 bg-white border border-gray-200 rounded-lg text-xs font-black text-gray-900 text-center focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center p-2 bg-white rounded-xl border border-gray-100">
                    <span className="text-gray-600 font-medium">Vendor Listing Base Price:</span>
                    <span className="font-black text-gray-900">₹{shopSimPrice}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-indigo-50 rounded-xl border border-indigo-100">
                    <span className="text-indigo-900 font-semibold">
                      Admin Platform Markup ({settings.shop_commission_pct || '10'}%):
                    </span>
                    <span className="font-black text-indigo-700">
                      +₹{Math.round((shopSimPrice * ((parseFloat(settings.shop_commission_pct || '10') || 0) / 100)) * 100) / 100}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-emerald-50 rounded-xl border border-emerald-100">
                    <span className="text-emerald-900 font-bold">Customer Checkout Product Price:</span>
                    <span className="font-black text-emerald-700">
                      ₹{Math.round((shopSimPrice + (shopSimPrice * ((parseFloat(settings.shop_commission_pct || '10') || 0) / 100))) * 100) / 100}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-amber-50 rounded-xl border border-amber-100">
                    <span className="text-amber-900 font-bold">Vendor Payout (Transferred to Seller):</span>
                    <span className="font-black text-amber-700">₹{shopSimPrice} (100% Guaranteed)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 1: Delivery Charges & Free Threshold Policy */}
          <div className="bg-white rounded-3xl p-6 md:p-8 border border-gray-100 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <h2 className="text-base font-bold text-gray-900">Standard Customer Shipping Charges</h2>
                <p className="text-xs text-gray-500">Configure what customers pay for courier shipping across India.</p>
              </div>
              <button
                onClick={() =>
                  saveSettingsBundle(
                    {
                      shiprocket_base_fee: settings.shiprocket_base_fee,
                      shiprocket_free_delivery_enabled: settings.shiprocket_free_delivery_enabled,
                      shiprocket_free_threshold: settings.shiprocket_free_threshold
                    },
                    undefined,
                    'shop_shipping',
                    'Shop India delivery settings saved successfully!'
                  )
                }
                disabled={savingKey === 'shop_shipping'}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{savingKey === 'shop_shipping' ? 'Saving...' : 'Save Shipping Settings'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Standard Base Shipping Charge */}
              <div className="bg-gray-50/60 p-5 rounded-2xl border border-gray-100 space-y-2">
                <label className="block text-xs font-bold text-gray-700">
                  Standard Shipping Fee (₹)
                </label>
                <p className="text-[11px] text-gray-500">
                  Charged on customer checkout for standard courier shipping.
                </p>
                <div className="relative mt-2">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
                  <input
                    type="number"
                    min="0"
                    value={settings.shiprocket_base_fee}
                    onChange={e => setSettings({ ...settings, shiprocket_base_fee: e.target.value })}
                    className="w-full pl-9 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-base font-bold text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Free Shipping Policy & Toggle */}
              <div className="bg-gray-50/60 p-5 rounded-2xl border border-gray-100 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-xs font-bold text-gray-700">
                      Free Shipping on High-Value Carts
                    </label>
                    <p className="text-[11px] text-gray-500">
                      When disabled, standard delivery is always charged regardless of order value.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.shiprocket_free_delivery_enabled === 'true'}
                      onChange={e =>
                        setSettings({
                          ...settings,
                          shiprocket_free_delivery_enabled: e.target.checked ? 'true' : 'false'
                        })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                {settings.shiprocket_free_delivery_enabled === 'true' ? (
                  <div className="pt-2 border-t border-gray-200">
                    <label className="block text-xs font-bold text-emerald-800 mb-1">
                      Free Shipping Cart Threshold (₹)
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
                      <input
                        type="number"
                        min="1"
                        value={settings.shiprocket_free_threshold}
                        onChange={e => setSettings({ ...settings, shiprocket_free_threshold: e.target.value })}
                        className="w-full pl-9 pr-4 py-2.5 bg-white border border-emerald-300 rounded-xl text-sm font-bold text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                    <span className="text-[11px] text-emerald-600 mt-1 block">
                      Active: Orders with item subtotal ₹{settings.shiprocket_free_threshold} or more receive free delivery.
                    </span>
                  </div>
                ) : (
                  <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-800">
                    <strong>Free Delivery Disabled:</strong> All customer orders will be charged the standard ₹{settings.shiprocket_base_fee} delivery fee.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Card 2: Vendor Commission Matrix */}
          <div className="bg-white rounded-3xl p-6 md:p-8 border border-gray-100 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
              <div>
                <h2 className="text-base font-bold text-gray-900">Vendor Product Commission Rules</h2>
                <p className="text-xs text-gray-500">
                  Platform markup added on top of vendor listed prices. Vendors always receive 100% of their base price.
                </p>
              </div>
              <button
                onClick={() => {
                  setNewRule({
                    scope: 'category',
                    scopeId: categories[0]?.id || '',
                    vertical: 'shop',
                    commissionPct: 10,
                    includeGateway: true,
                    description: ''
                  });
                  setShowRuleModal(true);
                }}
                className="px-4 py-2.5 bg-gray-900 hover:bg-black text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Add Category or Vendor Commission</span>
              </button>
            </div>

            {/* Rules Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-400 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Level / Scope</th>
                    <th className="py-3 px-4">Target Name</th>
                    <th className="py-3 px-4">Commission %</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {rules
                    .filter(r => r.vertical !== 'services')
                    .map(rule => (
                      <tr key={rule.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="py-3 px-4">
                          <span
                            className={`px-2.5 py-1 rounded-lg font-bold text-[10px] uppercase tracking-wider ${
                              rule.scope === 'global'
                                ? 'bg-purple-50 text-purple-700'
                                : rule.scope === 'category'
                                ? 'bg-blue-50 text-blue-700'
                                : 'bg-amber-50 text-amber-700'
                            }`}
                          >
                            {rule.scope}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold text-gray-900">
                          {rule.targetName || (rule.scope === 'global' ? 'All Products (Global)' : rule.scopeId || '—')}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 font-extrabold rounded-lg text-xs">
                            {rule.commissionPct}%
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-500">
                          {rule.description || 'Standard commission rule'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleDeleteRule(rule.id)}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete rule"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  {rules.filter(r => r.vertical !== 'services').length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-400">
                        No custom commission rules configured. The fallback Shop India commission applies ({settings.shop_commission_pct || '10'}%).
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: QUICK SHOPPING & RIDER FLEET */}
      {activeTab === 'quick' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Section Info Banner */}
          <div className="bg-amber-50/60 border border-amber-200 rounded-3xl p-5 flex items-start gap-4">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center flex-shrink-0 shadow-sm mt-0.5">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-amber-950">
                Quick Commerce Hyperlocal Delivery (10–30 Minutes)
              </h3>
              <p className="text-xs text-amber-900/80 mt-1 leading-relaxed">
                Manages customer delivery fees and guaranteed rider payouts. When a rider delivers and enters the customer's 4-digit OTP,
                the rider payout is credited directly to their wallet balance automatically.
              </p>
            </div>
          </div>

          {/* Card: Quick Commerce Product Commission Rate */}
          <div className="bg-white rounded-3xl p-6 md:p-8 border border-gray-100 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center font-black text-sm">
                  %
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-gray-900">Quick Commerce Product Commission Rate</h3>
                  <p className="text-xs text-gray-500">
                    Platform markup percentage added on quick dark-store groceries and essentials. Quick merchants receive 100% of their base listed price.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  saveSettingsBundle(
                    { quick_commission_pct: settings.quick_commission_pct || '10' },
                    undefined,
                    'quick_commission',
                    'Quick Shopping product commission rate saved successfully!'
                  )
                }
                disabled={savingKey === 'quick_commission'}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-sm transition-all disabled:opacity-50 cursor-pointer active:scale-95"
              >
                <Save className="w-4 h-4" />
                <span>{savingKey === 'quick_commission' ? 'Saving...' : 'Save Quick Commission'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              {/* Left Column: Slider and Rate Controls */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Quick Commission Percentage (%)
                  </label>
                  <span className="text-xs font-black text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-lg border border-amber-200">
                    {settings.quick_commission_pct || '10'}%
                  </span>
                </div>

                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="0"
                    max="50"
                    step="0.5"
                    value={parseFloat(settings.quick_commission_pct || '10') || 0}
                    onChange={e => setSettings({ ...settings, quick_commission_pct: e.target.value })}
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
                  />
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      max="50"
                      step="0.5"
                      value={settings.quick_commission_pct || '10'}
                      onChange={e => setSettings({ ...settings, quick_commission_pct: e.target.value })}
                      className="w-20 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-extrabold text-gray-900 text-center focus:bg-white focus:border-amber-500 focus:outline-none"
                    />
                    <span className="text-xs font-bold text-gray-400">%</span>
                  </div>
                </div>

                {/* Split Visualizer */}
                <div className="space-y-1.5">
                  <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden flex shadow-inner">
                    <div
                      style={{ width: `${Math.min(100, Math.max(0, parseFloat(settings.quick_commission_pct || '10') || 0)) * 2}%` }}
                      className="bg-amber-500 h-full transition-all duration-300"
                    />
                    <div
                      style={{ width: `${100 - (Math.min(100, Math.max(0, parseFloat(settings.quick_commission_pct || '10') || 0)) * 2)}%` }}
                      className="bg-emerald-500 h-full transition-all duration-300"
                    />
                  </div>
                  <div className="flex justify-between text-[11px] font-bold">
                    <span className="text-amber-700">Admin Markup: {settings.quick_commission_pct || '10'}%</span>
                    <span className="text-emerald-700">Quick Merchant: 100% (Protected Listing Price)</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Real-Time Payout Simulator */}
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-gray-700">Real-Time Quick Item Price Simulator</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-gray-400 font-bold">Sample Item Price: ₹</span>
                    <input
                      type="number"
                      value={quickItemSimPrice}
                      onChange={e => setQuickItemSimPrice(Number(e.target.value) || 0)}
                      className="w-20 px-2 py-1 bg-white border border-gray-200 rounded-lg text-xs font-black text-gray-900 text-center focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center p-2 bg-white rounded-xl border border-gray-100">
                    <span className="text-gray-600 font-medium">Merchant Listed Item Price:</span>
                    <span className="font-black text-gray-900">₹{quickItemSimPrice}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-amber-50 rounded-xl border border-amber-100">
                    <span className="text-amber-900 font-semibold">
                      Admin Quick Markup ({settings.quick_commission_pct || '10'}%):
                    </span>
                    <span className="font-black text-amber-700">
                      +₹{Math.round((quickItemSimPrice * ((parseFloat(settings.quick_commission_pct || '10') || 0) / 100)) * 100) / 100}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-emerald-50 rounded-xl border border-emerald-100">
                    <span className="text-emerald-900 font-bold">Customer Checkout Item Price:</span>
                    <span className="font-black text-emerald-700">
                      ₹{Math.round((quickItemSimPrice + (quickItemSimPrice * ((parseFloat(settings.quick_commission_pct || '10') || 0) / 100))) * 100) / 100}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-blue-50 rounded-xl border border-blue-100">
                    <span className="text-blue-900 font-bold">Merchant Store Payout (Protected):</span>
                    <span className="font-black text-blue-700">₹{quickItemSimPrice} (100% Guaranteed)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Dual Card Layout: Customer Pays vs Rider Earns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card 1: What Customer Pays */}
            <div className="bg-white rounded-3xl p-6 md:p-8 border border-gray-100 shadow-sm space-y-5">
              <div className="border-b border-gray-100 pb-3">
                <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">Step 1</span>
                <h3 className="text-base font-bold text-gray-900">What the Customer Pays</h3>
                <p className="text-xs text-gray-500">Delivery charge billed to customer at quick checkout.</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Base Delivery Fee (First 2 KM) (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={settings.quick_customer_base_fee}
                    onChange={e => setSettings({ ...settings, quick_customer_base_fee: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-gray-400 mt-1 block">Default fee charged for orders within 2 km radius.</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Distance Fee per KM (Beyond 2 KM) (₹/km)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={settings.quick_customer_per_km}
                    onChange={e => setSettings({ ...settings, quick_customer_per_km: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-gray-400 mt-1 block">Added to base fee for every kilometer past 2 km.</span>
                </div>

                {/* Free Delivery Policy & Toggle for Quick Commerce */}
                <div className="pt-3 border-t border-gray-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="block text-xs font-bold text-gray-700">
                        Free Delivery on High-Value Quick Orders
                      </label>
                      <p className="text-[11px] text-gray-500">
                        When disabled, standard quick delivery fee is always charged regardless of order value.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.quick_free_delivery_enabled === 'true'}
                        onChange={e =>
                          setSettings({
                            ...settings,
                            quick_free_delivery_enabled: e.target.checked ? 'true' : 'false'
                          })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                    </label>
                  </div>

                  {settings.quick_free_delivery_enabled === 'true' ? (
                    <div className="pt-2">
                      <label className="block text-xs font-bold text-emerald-800 mb-1">
                        Free Quick Delivery Cart Threshold (₹)
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
                        <input
                          type="number"
                          min="1"
                          value={settings.quick_free_threshold}
                          onChange={e => setSettings({ ...settings, quick_free_threshold: e.target.value })}
                          className="w-full pl-9 pr-4 py-2.5 bg-white border border-emerald-300 rounded-xl text-sm font-bold text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>
                      <span className="text-[11px] text-emerald-600 mt-1 block">
                        Active: Orders with item subtotal ₹{settings.quick_free_threshold} or more receive free quick delivery.
                      </span>
                    </div>
                  ) : (
                    <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-800">
                      <strong>Free Delivery Disabled:</strong> Quick delivery charges (Base Fee + Distance Fee per KM) will always be applied to all orders.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Card 2: What Rider Earns */}
            <div className="bg-white rounded-3xl p-6 md:p-8 border border-gray-100 shadow-sm space-y-5">
              <div className="border-b border-gray-100 pb-3">
                <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Step 2</span>
                <h3 className="text-base font-bold text-gray-900">What the Rider Earns (DeliveryPayRule)</h3>
                <p className="text-xs text-gray-500">Guaranteed payout credited to rider wallet on OTP confirmation.</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Guaranteed Base Pay per Order (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={deliveryRule.basePayPerOrder}
                    onChange={e => setDeliveryRule({ ...deliveryRule, basePayPerOrder: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-gray-400 mt-1 block">Rider receives this base payout for every successful delivery.</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Distance Pay per KM (Beyond 2 KM) (₹/km)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={deliveryRule.payPerKm}
                    onChange={e => setDeliveryRule({ ...deliveryRule, payPerKm: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-gray-400 mt-1 block">Additional payout credited to rider per kilometer beyond 2 km.</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Maximum Delivery Radius (KM)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={deliveryRule.maxDistanceKm}
                    onChange={e => setDeliveryRule({ ...deliveryRule, maxDistanceKm: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-gray-400 mt-1 block">Max radius within which quick orders can be assigned.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Live Real-Time Calculator */}
          <div className="bg-white rounded-3xl p-6 md:p-8 border border-gray-100 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <span>Interactive Real-Time Payout Calculator</span>
                </h3>
                <p className="text-xs text-gray-500">
                  Preview exact customer charges vs rider payout for any delivery distance.
                </p>
              </div>

              {/* Distance Quick Buttons */}
              <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-xl">
                {[2, 3, 4, 6, 8, 10].map(d => (
                  <button
                    key={d}
                    onClick={() => setQuickSimDistance(d)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      quickSimDistance === d
                        ? 'bg-white text-indigo-600 shadow-sm'
                        : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    {d} km
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-indigo-50/70 border border-indigo-100 rounded-2xl">
                <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider block">Customer Pays</span>
                <span className="text-2xl font-extrabold text-indigo-950 mt-1 block">₹{simCustomerPay}</span>
                <span className="text-[10px] text-indigo-800/80 mt-1 block">
                  Base ₹{qBaseCust} + ({extraKm} km × ₹{qPerKmCust})
                </span>
              </div>

              <div className="p-4 bg-emerald-50/70 border border-emerald-100 rounded-2xl">
                <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">Rider Receives (Wallet)</span>
                <span className="text-2xl font-extrabold text-emerald-950 mt-1 block">₹{simRiderPay}</span>
                <span className="text-[10px] text-emerald-800/80 mt-1 block">
                  Base ₹{qRiderBase} + ({extraKm} km × ₹{qRiderPerKm})
                </span>
              </div>

              <div className="p-4 bg-purple-50/70 border border-purple-100 rounded-2xl">
                <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider block">Platform Delivery Margin</span>
                <span className={`text-2xl font-extrabold mt-1 block ${simQuickMargin >= 0 ? 'text-purple-950' : 'text-rose-600'}`}>
                  {simQuickMargin >= 0 ? `+₹${simQuickMargin}` : `-₹${Math.abs(simQuickMargin)}`}
                </span>
                <span className="text-[10px] text-purple-800/80 mt-1 block">
                  Customer Pay minus Rider Payout
                </span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() =>
                  saveSettingsBundle(
                    {
                      quick_customer_base_fee: settings.quick_customer_base_fee,
                      quick_customer_per_km: settings.quick_customer_per_km,
                      quick_free_delivery_enabled: settings.quick_free_delivery_enabled,
                      quick_free_threshold: settings.quick_free_threshold
                    },
                    deliveryRule,
                    'quick_settings',
                    'Quick Shopping & Rider payout settings saved successfully!'
                  )
                }
                disabled={savingKey === 'quick_settings'}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{savingKey === 'quick_settings' ? 'Saving...' : 'Save Quick Commerce & Rider Settings'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: TAXES & PLATFORM FEES */}
      {activeTab === 'taxes' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Section Info Banner */}
          <div className="bg-purple-50/70 border border-purple-200 rounded-3xl p-5 flex items-start gap-4">
            <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm mt-0.5">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-purple-950">
                Platform Convenience Fee & GST Slabs
              </h3>
              <p className="text-xs text-purple-900/80 mt-1 leading-relaxed">
                Applied transparently at customer checkout. The convenience fee protects the platform by offsetting payment gateway
                deductions (Razorpay 2.36%) and cloud infrastructure costs.
              </p>
            </div>
          </div>

          {/* Settings Card */}
          <div className="bg-white rounded-3xl p-6 md:p-8 border border-gray-100 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-gray-900">Platform Convenience & Tax Controls</h3>
                <p className="text-xs text-gray-500">Global fee applied at checkout and GST tax slabs for compliant invoicing.</p>
              </div>

              <button
                onClick={() =>
                  saveSettingsBundle(
                    {
                      platform_charge_pct: settings.platform_charge_pct,
                      gst_percent: settings.gst_percent,
                      cgst_percent: settings.cgst_percent,
                      sgst_percent: settings.sgst_percent
                    },
                    undefined,
                    'taxes_save',
                    'Platform fees and tax settings saved successfully!'
                  )
                }
                disabled={savingKey === 'taxes_save'}
                className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{savingKey === 'taxes_save' ? 'Saving...' : 'Save Taxes & Fee Settings'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Card 1: Platform Fee */}
              <div className="p-5 bg-gray-50/60 rounded-2xl border border-gray-100 space-y-3">
                <label className="block text-xs font-bold text-gray-700">
                  Platform Convenience Fee (%)
                </label>
                <p className="text-[11px] text-gray-500">
                  Applied on order checkout to offset payment gateway deduction (Razorpay ~2.36%) and transaction processing.
                </p>
                <div className="relative mt-2">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    value={settings.platform_charge_pct}
                    onChange={e => setSettings({ ...settings, platform_charge_pct: e.target.value })}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-base font-bold text-gray-900 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">%</span>
                </div>
              </div>

              {/* Card 2: GST Rates */}
              <div className="p-5 bg-gray-50/60 rounded-2xl border border-gray-100 space-y-3">
                <label className="block text-xs font-bold text-gray-700">
                  Statutory GST Tax Rates (%)
                </label>
                <p className="text-[11px] text-gray-500">
                  Used for tax invoices generated for shoppers and merchants.
                </p>
                <div className="grid grid-cols-3 gap-3 mt-2">
                  <div>
                    <span className="text-[10px] text-gray-500 font-bold block mb-1">Total GST %</span>
                    <input
                      type="number"
                      value={settings.gst_percent}
                      onChange={e => setSettings({ ...settings, gst_percent: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-center"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 font-bold block mb-1">CGST %</span>
                    <input
                      type="number"
                      value={settings.cgst_percent}
                      onChange={e => setSettings({ ...settings, cgst_percent: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-center"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 font-bold block mb-1">SGST %</span>
                    <input
                      type="number"
                      value={settings.sgst_percent}
                      onChange={e => setSettings({ ...settings, sgst_percent: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-center"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: OPERATING HOURS & BLACKOUT CONTROLS */}
      {activeTab === 'blackout' && (
        <div className="space-y-8 animate-in fade-in duration-200">
          {/* Section Info Banner */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 md:p-8 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 border border-slate-800">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 bg-amber-400/20 text-amber-300 font-black text-[11px] rounded-full uppercase tracking-wider border border-amber-400/30">
                  Automated Shutdown Protocol
                </span>
                <span className="text-xs text-slate-400 font-medium">Real-Time Checkout Interceptor</span>
              </div>
              <h2 className="text-xl md:text-2xl font-black tracking-tight text-white">
                Platform Operating Hours &amp; Scheduled Blackouts
              </h2>
              <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                Configure midnight closing hours to give riders rest, and weekly Friday prayer breaks to pause customer bookings in Quick Commerce and Glacons Services with live countdown alerts.
              </p>
            </div>
            <div className="flex items-center gap-3 self-start md:self-center">
              <div className="px-4 py-2.5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 text-xs font-bold text-slate-200 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>Indian Standard Time (IST)</span>
              </div>
            </div>
          </div>

          {/* LIVE SYSTEM STATUS BAR */}
          <div className="bg-slate-900 text-white p-5 rounded-3xl border border-slate-800 shadow-lg grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Server IST Clock</span>
              <p className="text-sm font-black font-mono text-emerald-400">
                {liveOperatingStatus?.serverIstTime || 'Active IST Node Synchronized'}
              </p>
            </div>

            <div className="space-y-1 border-t md:border-t-0 md:border-l border-slate-800 pt-3 md:pt-0 md:pl-4">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Midnight Blackout Status</span>
              {liveOperatingStatus?.midnightBlackout?.isActive ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-extrabold animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  SHUTTER CLOSED (Active Now)
                </div>
              ) : settings.midnight_blackout_enabled === 'true' ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  SCHEDULED ({liveOperatingStatus?.midnightBlackout?.formattedStart || '11:00 PM'} to {liveOperatingStatus?.midnightBlackout?.formattedEnd || '07:00 AM'})
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-800 text-slate-400 border border-slate-700 rounded-xl text-xs font-semibold">
                  24/7 ROUND-THE-CLOCK (Disabled)
                </div>
              )}
            </div>

            <div className="space-y-1 border-t md:border-t-0 md:border-l border-slate-800 pt-3 md:pt-0 md:pl-4">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Friday Prayer Break Status</span>
              {liveOperatingStatus?.fridayBreak?.isActive ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-extrabold animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  PAUSED FOR PRAYER (Active Now)
                </div>
              ) : settings.friday_break_enabled === 'true' ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  SCHEDULED (Fridays {liveOperatingStatus?.fridayBreak?.formattedStart || '12:00 PM'} to {liveOperatingStatus?.fridayBreak?.formattedEnd || '02:00 PM'})
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-800 text-slate-400 border border-slate-700 rounded-xl text-xs font-semibold">
                  PRAYER PAUSE DISABLED
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* CARD 1: MIDNIGHT BLACKOUT (Reference Image 54) */}
            <div className="bg-white rounded-3xl p-6 md:p-8 border border-gray-100 shadow-sm flex flex-col justify-between space-y-6">
              <div className="space-y-6">
                <div className="flex items-start justify-between gap-4 border-b border-gray-100 pb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
                      <Moon className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-gray-900">Midnight Operations Blackout</h3>
                      <p className="text-xs text-gray-500">Shut down ordering overnight (e.g. 11:00 PM – 7:00 AM)</p>
                    </div>
                  </div>

                  {/* Toggle Button with Instant Auto-Save */}
                  <button
                    disabled={savingKey === 'midnight_blackout'}
                    onClick={async () => {
                      const next = settings.midnight_blackout_enabled === 'true' ? 'false' : 'true';
                      setSettings(prev => ({ ...prev, midnight_blackout_enabled: next }));
                      await saveSettingsBundle(
                        {
                          midnight_blackout_enabled: next,
                          midnight_blackout_start: settings.midnight_blackout_start,
                          midnight_blackout_end: settings.midnight_blackout_end,
                          midnight_blackout_verticals: settings.midnight_blackout_verticals,
                          midnight_blackout_title: settings.midnight_blackout_title,
                          midnight_blackout_message: settings.midnight_blackout_message,
                        },
                        undefined,
                        'midnight_blackout',
                        next === 'true' ? 'Midnight blackout activated!' : 'Midnight blackout disabled (24/7 round-the-clock)'
                      );
                    }}
                    title="Click to toggle Midnight Blackout immediately"
                    className={`relative inline-flex h-7 w-13 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      settings.midnight_blackout_enabled === 'true' ? 'bg-indigo-600' : 'bg-gray-200'
                    } ${savingKey === 'midnight_blackout' ? 'opacity-60 cursor-wait' : ''}`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        settings.midnight_blackout_enabled === 'true' ? 'translate-x-6' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 text-xs font-black uppercase tracking-wider rounded-full ${
                      settings.midnight_blackout_enabled === 'true'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}
                  >
                    {settings.midnight_blackout_enabled === 'true' ? '● BLACKOUT ACTIVE AT NIGHT' : '○ 24/7 ROUND-THE-CLOCK'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Time12HourPicker
                    label="Shutdown Time (Start)"
                    helperText="Platform shuts down at this hour"
                    value={settings.midnight_blackout_start || '23:00'}
                    accentColor="indigo"
                    onChange={val => setSettings(prev => ({ ...prev, midnight_blackout_start: val }))}
                  />

                  <Time12HourPicker
                    label="Resumption Time (End)"
                    helperText="Normal operations reopen at this hour"
                    value={settings.midnight_blackout_end || '07:00'}
                    accentColor="indigo"
                    onChange={val => setSettings(prev => ({ ...prev, midnight_blackout_end: val }))}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Target Verticals Affected
                  </label>
                  <select
                    value={settings.midnight_blackout_verticals || 'both'}
                    onChange={e => setSettings(prev => ({ ...prev, midnight_blackout_verticals: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800"
                  >
                    <option value="both">Both (Quick Commerce &amp; Glacons Services)</option>
                    <option value="quick">Quick Commerce Only (10-15 Min Delivery)</option>
                    <option value="services">Glacons Services Only (HVAC &amp; Home Services)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Customer Alert Title
                  </label>
                  <input
                    type="text"
                    value={settings.midnight_blackout_title || 'Closed for the day!'}
                    onChange={e => setSettings(prev => ({ ...prev, midnight_blackout_title: e.target.value }))}
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Customer Shutter Announcement Note
                  </label>
                  <textarea
                    rows={2}
                    value={settings.midnight_blackout_message || ''}
                    onChange={e => setSettings(prev => ({ ...prev, midnight_blackout_message: e.target.value }))}
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                    placeholder="Message displayed to customers when ordering is blocked..."
                  />
                </div>

                {/* Zepto/Blinkit Shutters-Down Live Preview (Image 54) */}
                <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-inner space-y-3">
                  <span className="text-[10px] uppercase tracking-wider text-amber-400 font-black block">
                    Customer App Experience Preview
                  </span>
                  <div className="flex items-center gap-4 bg-slate-800/80 p-4 rounded-xl border border-slate-700">
                    <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-2xl flex-shrink-0">
                      🔒
                    </div>
                    <div>
                      <h4 className="text-sm font-extrabold text-white">
                        {settings.midnight_blackout_title || "Closed for the day! We'll be back at 7 AM"}
                      </h4>
                      <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">
                        {settings.midnight_blackout_message || "We're currently offline for the night to let our riders & partners rest. We'll be back at 7:00 AM!"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 flex justify-end">
                <button
                  onClick={() =>
                    saveSettingsBundle(
                      {
                        midnight_blackout_enabled: settings.midnight_blackout_enabled,
                        midnight_blackout_start: settings.midnight_blackout_start,
                        midnight_blackout_end: settings.midnight_blackout_end,
                        midnight_blackout_verticals: settings.midnight_blackout_verticals,
                        midnight_blackout_title: settings.midnight_blackout_title,
                        midnight_blackout_message: settings.midnight_blackout_message,
                      },
                      undefined,
                      'midnight_blackout',
                      'Midnight blackout schedule updated successfully!'
                    )
                  }
                  disabled={savingKey === 'midnight_blackout'}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{savingKey === 'midnight_blackout' ? 'Saving Schedule...' : 'Save Midnight Schedule'}</span>
                </button>
              </div>
            </div>

            {/* CARD 2: FRIDAY PRAYER BREAK (Reference Image 55) */}
            <div className="bg-white rounded-3xl p-6 md:p-8 border border-gray-100 shadow-sm flex flex-col justify-between space-y-6">
              <div className="space-y-6">
                <div className="flex items-start justify-between gap-4 border-b border-gray-100 pb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-gray-900">Friday Prayer Break (Jummah)</h3>
                      <p className="text-xs text-gray-500">Every Friday pause orders (e.g. 12:00 PM – 2:00 PM)</p>
                    </div>
                  </div>

                  {/* Toggle Button with Instant Auto-Save */}
                  <button
                    disabled={savingKey === 'friday_break'}
                    onClick={async () => {
                      const next = settings.friday_break_enabled === 'true' ? 'false' : 'true';
                      setSettings(prev => ({ ...prev, friday_break_enabled: next }));
                      await saveSettingsBundle(
                        {
                          friday_break_enabled: next,
                          friday_break_day: settings.friday_break_day,
                          friday_break_start: settings.friday_break_start,
                          friday_break_end: settings.friday_break_end,
                          friday_break_verticals: settings.friday_break_verticals,
                          friday_break_title: settings.friday_break_title,
                          friday_break_subtitle: settings.friday_break_subtitle,
                          friday_break_message: settings.friday_break_message,
                        },
                        undefined,
                        'friday_break',
                        next === 'true' ? 'Friday prayer pause activated!' : 'Friday prayer pause disabled'
                      );
                    }}
                    title="Click to toggle Friday Prayer Break immediately"
                    className={`relative inline-flex h-7 w-13 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      settings.friday_break_enabled === 'true' ? 'bg-emerald-600' : 'bg-gray-200'
                    } ${savingKey === 'friday_break' ? 'opacity-60 cursor-wait' : ''}`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        settings.friday_break_enabled === 'true' ? 'translate-x-6' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 text-xs font-black uppercase tracking-wider rounded-full ${
                      settings.friday_break_enabled === 'true'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                        : 'bg-gray-100 text-gray-600 border border-gray-200'
                    }`}
                  >
                    {settings.friday_break_enabled === 'true' ? '● RECURRING FRIDAY PRAYER PAUSE ACTIVE' : '○ PRAYER PAUSE DISABLED'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Time12HourPicker
                    label="Break Starts At"
                    helperText="Usually 12:00 PM before Jummah"
                    value={settings.friday_break_start || '12:00'}
                    accentColor="emerald"
                    onChange={val => setSettings(prev => ({ ...prev, friday_break_start: val }))}
                  />

                  <Time12HourPicker
                    label="Break Resumes At"
                    helperText="Usually 02:00 PM after prayers"
                    value={settings.friday_break_end || '14:00'}
                    accentColor="emerald"
                    onChange={val => setSettings(prev => ({ ...prev, friday_break_end: val }))}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Target Verticals Affected
                  </label>
                  <select
                    value={settings.friday_break_verticals || 'both'}
                    onChange={e => setSettings(prev => ({ ...prev, friday_break_verticals: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800"
                  >
                    <option value="both">Both (Quick Commerce & Glacons Services)</option>
                    <option value="quick">Quick Commerce Only</option>
                    <option value="services">Glacons Services Only</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      Card Title
                    </label>
                    <input
                      type="text"
                      value={settings.friday_break_title || 'Friday Prayer Break 🕌'}
                      onChange={e => setSettings(prev => ({ ...prev, friday_break_title: e.target.value }))}
                      className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      Card Subtitle
                    </label>
                    <input
                      type="text"
                      value={settings.friday_break_subtitle || 'Jummah Mubarak!'}
                      onChange={e => setSettings(prev => ({ ...prev, friday_break_subtitle: e.target.value }))}
                      className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Announcement Details
                  </label>
                  <textarea
                    rows={2}
                    value={settings.friday_break_message || ''}
                    onChange={e => setSettings(prev => ({ ...prev, friday_break_message: e.target.value }))}
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                    placeholder="Details shown to customer regarding the Friday prayer break..."
                  />
                </div>

                {/* Friday Prayer Break Live Card Preview (Image 55) */}
                <div className="bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-950 text-white p-5 rounded-2xl border border-emerald-800 shadow-inner space-y-3">
                  <span className="text-[10px] uppercase tracking-wider text-emerald-300 font-black block">
                    Customer App Experience Preview
                  </span>
                  <div className="bg-emerald-900/60 p-4 rounded-xl border border-emerald-700/60 flex flex-col items-center text-center space-y-2">
                    <div className="w-12 h-12 rounded-full bg-emerald-800 text-amber-300 flex items-center justify-center text-2xl shadow-md">
                      🕌
                    </div>
                    <h4 className="text-sm font-black text-white uppercase tracking-wider">
                      {settings.friday_break_title || 'Friday Prayer Break'}
                    </h4>
                    <span className="text-xs font-bold text-amber-300">
                      {settings.friday_break_subtitle || 'Jummah Mubarak!'}
                    </span>
                    <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-black/40 rounded-full border border-emerald-600/50 text-[11px] font-mono text-emerald-200 font-bold">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      <span>SERVICES RESUME IN: 01:24:35</span>
                    </div>
                    <p className="text-[11px] text-emerald-100/80 max-w-sm mt-1">
                      {settings.friday_break_message || 'Our deliveries and field services are on a brief break for Friday Jummah prayers.'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 flex justify-end">
                <button
                  onClick={() =>
                    saveSettingsBundle(
                      {
                        friday_break_enabled: settings.friday_break_enabled,
                        friday_break_day: settings.friday_break_day,
                        friday_break_start: settings.friday_break_start,
                        friday_break_end: settings.friday_break_end,
                        friday_break_verticals: settings.friday_break_verticals,
                        friday_break_title: settings.friday_break_title,
                        friday_break_subtitle: settings.friday_break_subtitle,
                        friday_break_message: settings.friday_break_message,
                      },
                      undefined,
                      'friday_break',
                      'Friday prayer break schedule updated successfully!'
                    )
                  }
                  disabled={savingKey === 'friday_break'}
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-md transition-all active:scale-95"
                >
                  <Save className="w-4 h-4" />
                  <span>{savingKey === 'friday_break' ? 'Saving Schedule...' : 'Save Friday Schedule'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: AUDIT LOGS */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-gray-100 shadow-sm space-y-6 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-gray-900">Settings Change History</h3>
              <p className="text-xs text-gray-500">Transparent audit trail of all pricing, commission, and delivery updates.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleClearAllAuditLogs}
                disabled={auditLogs.length === 0}
                className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-40"
                title="Permanently purge all activity history from database"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All History</span>
              </button>
              <button
                onClick={loadAuditLogs}
                className="px-4 py-2 border rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Refresh Logs
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Admin User</th>
                  <th className="py-3 px-4">Setting Key</th>
                  <th className="py-3 px-4">Old Value</th>
                  <th className="py-3 px-4">New Value</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 font-mono text-[11px]">
                {auditLogs.map((log, idx) => (
                  <tr key={log.id || idx} className="hover:bg-gray-50/60 transition-colors">
                    <td className="py-3 px-4 text-gray-500 font-sans">
                      {new Date(log.changedAt).toLocaleString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="py-3 px-4 font-bold text-indigo-700 font-sans">{log.changedBy || 'Super Admin'}</td>
                    <td className="py-3 px-4 font-bold text-gray-800">{log.settingKey}</td>
                    <td className="py-3 px-4 text-gray-400 max-w-xs truncate">{log.oldValue || '—'}</td>
                    <td className="py-3 px-4 text-emerald-700 font-bold max-w-xs truncate">{log.newValue}</td>
                    <td className="py-3 px-4 text-right font-sans">
                      <button
                        onClick={() => handleDeleteAuditLog(log.id)}
                        className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Delete this activity log record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
                {auditLogs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-400 font-sans">
                      No audit history recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Commission Rule Modal */}
      {showRuleModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-bold text-base text-gray-900">Add Commission Rule</h3>
              <button onClick={() => setShowRuleModal(false)} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
            </div>

            <form onSubmit={handleCreateRule} className="space-y-4 text-xs font-sans">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Commission Target</label>
                <select
                  value={newRule.scope}
                  onChange={e => setNewRule({ ...newRule, scope: e.target.value, scopeId: '' })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold"
                >
                  <option value="category">Specific Category Override</option>
                  <option value="vendor">Specific Vendor Override</option>
                  <option value="global">Global Platform Default</option>
                </select>
              </div>

              {newRule.scope === 'category' && (
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Select Category</label>
                  <select
                    value={newRule.scopeId}
                    onChange={e => setNewRule({ ...newRule, scopeId: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold"
                    required
                  >
                    <option value="">-- Choose Category --</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {newRule.scope === 'vendor' && (
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Select Vendor Store</label>
                  <select
                    value={newRule.scopeId}
                    onChange={e => setNewRule({ ...newRule, scopeId: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold"
                    required
                  >
                    <option value="">-- Choose Vendor Store --</option>
                    {vendors.map(v => (
                      <option key={v.id} value={v.id}>{v.storeName}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block font-bold text-gray-700 mb-1">Admin Commission Markup (%)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="70"
                  value={newRule.commissionPct}
                  onChange={e => setNewRule({ ...newRule, commissionPct: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Description / Internal Note</label>
                <input
                  value={newRule.description}
                  onChange={e => setNewRule({ ...newRule, description: e.target.value })}
                  placeholder="e.g. Special festive category commission"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRuleModal(false)}
                  className="flex-1 py-2.5 border rounded-xl font-bold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-all"
                >
                  Save Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
