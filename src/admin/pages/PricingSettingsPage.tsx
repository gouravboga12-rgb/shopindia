import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import {
  ShoppingBag, Zap, Wrench, ShieldCheck, History,
  Save, Plus, Trash2, CheckCircle2, AlertCircle, RefreshCw,
  ArrowRight, Info, Sparkles
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
  platform_charge_pct: string;
  gst_percent: string;
  cgst_percent: string;
  sgst_percent: string;
  [key: string]: any;
}

export const PricingSettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'shop' | 'quick' | 'services' | 'taxes' | 'audit'>('shop');
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

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
    platform_charge_pct: '3.0',
    gst_percent: '18',
    cgst_percent: '9',
    sgst_percent: '9'
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
  const [serviceSimPrice, setServiceSimPrice] = useState<number>(500);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4500);
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

      const payload: any = { settings: mergedSettings };
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

  // Glacons Calculations
  const serviceCommPct = parseFloat(settings.service_commission_pct) || 15;
  const simPlatformCommission = Math.round((serviceSimPrice * (serviceCommPct / 100)) * 100) / 100;
  const simTechnicianEarning = Math.max(0, Math.round((serviceSimPrice - simPlatformCommission) * 100) / 100);

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
          { id: 'services', label: 'Glacons Services & Techs', icon: Wrench },
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
                        No custom commission rules configured. The fallback global commission applies.
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

      {/* TAB 3: GLACONS SERVICES & TECHNICIANS */}
      {activeTab === 'services' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Section Info Banner */}
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-3xl p-5 flex items-start gap-4">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm mt-0.5">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-emerald-950">
                Glacons Doorstep Services & Technicians
              </h3>
              <p className="text-xs text-emerald-900/80 mt-1 leading-relaxed">
                Customers book home services at the exact price listed in the Services Catalog and pay online via Razorpay.
                The Admin retains the dynamic commission % configured below, and the technician partner receives the remaining payout
                in their wallet upon completing the job.
              </p>
            </div>
          </div>

          {/* Clarity Notice */}
          <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-2xl flex items-center gap-3 text-xs text-blue-900">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0" />
            <span>
              <strong>Zero Hidden Inspection Fees:</strong> The old ₹199 inspection fee and visit guarantees have been completely removed.
              Customers only pay the transparent price configured for that service.
            </span>
          </div>

          {/* Dynamic Commission Split Card */}
          <div className="bg-white rounded-3xl p-6 md:p-8 border border-gray-100 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-gray-900">Platform Service Commission Rate</h3>
                <p className="text-xs text-gray-500">
                  Percentage retained by the platform from every completed service booking.
                </p>
              </div>

              <button
                onClick={() =>
                  saveSettingsBundle(
                    { service_commission_pct: settings.service_commission_pct },
                    undefined,
                    'services_commission',
                    'Glacons service commission updated successfully!'
                  )
                }
                disabled={savingKey === 'services_commission'}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{savingKey === 'services_commission' ? 'Saving...' : 'Save Commission Rate'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div className="space-y-4">
                <label className="block text-xs font-bold text-gray-700">
                  Admin Commission Percentage (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="60"
                    step="0.5"
                    value={settings.service_commission_pct}
                    onChange={e => setSettings({ ...settings, service_commission_pct: e.target.value })}
                    className="w-full pl-4 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-xl text-lg font-bold text-gray-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">%</span>
                </div>

                {/* Visual Ratio Bar */}
                <div className="space-y-2 pt-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-indigo-600">Admin Commission: {serviceCommPct}%</span>
                    <span className="text-emerald-600">Technician Share: {Math.max(0, 100 - serviceCommPct)}%</span>
                  </div>
                  <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden flex">
                    <div
                      className="bg-indigo-600 h-full transition-all duration-300"
                      style={{ width: `${Math.min(100, serviceCommPct)}%` }}
                    />
                    <div
                      className="bg-emerald-500 h-full transition-all duration-300"
                      style={{ width: `${Math.max(0, 100 - serviceCommPct)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Real-World Live Example Card */}
              <div className="p-5 bg-gray-50 rounded-2xl border border-gray-200/80 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-700">Real-Time Payout Example</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-gray-400">Service Price: ₹</span>
                    <input
                      type="number"
                      value={serviceSimPrice}
                      onChange={e => setServiceSimPrice(Number(e.target.value) || 0)}
                      className="w-20 px-2 py-1 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-900 text-center"
                    />
                  </div>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between items-center p-2.5 bg-white rounded-xl border border-gray-100">
                    <span className="text-gray-600">Customer Pays (Online via Razorpay):</span>
                    <span className="font-extrabold text-gray-900">₹{serviceSimPrice}</span>
                  </div>
                  <div className="flex justify-between items-center p-2.5 bg-indigo-50 rounded-xl border border-indigo-100">
                    <span className="text-indigo-900 font-medium">Admin Commission Retained ({serviceCommPct}%):</span>
                    <span className="font-extrabold text-indigo-700">₹{simPlatformCommission}</span>
                  </div>
                  <div className="flex justify-between items-center p-2.5 bg-emerald-50 rounded-xl border border-emerald-100">
                    <span className="text-emerald-900 font-bold">Technician Credited to Wallet ({100 - serviceCommPct}%):</span>
                    <span className="font-extrabold text-emerald-700">₹{simTechnicianEarning}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Link to Services Catalog */}
          <div className="bg-white rounded-3xl p-6 md:p-8 border border-gray-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-gray-900">Individual Service Catalog Rates</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Each service rate (e.g. AC Deep Clean ₹499, Fan Repair ₹249) is configured directly inside the Services Catalog.
              </p>
            </div>
            <a
              href="/admin?tab=services"
              className="px-5 py-2.5 bg-gray-900 hover:bg-black text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 transition-all"
            >
              <span>Open Services Catalog</span>
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      )}

      {/* TAB 4: TAXES & PLATFORM FEES */}
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
