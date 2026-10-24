import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import {
  Calculator, Percent, Truck, Wrench, ShieldAlert, Plus,
  Save, Trash2, CheckCircle2, AlertTriangle, RefreshCw, History,
  Sparkles, Layers, ArrowRight, Zap, ExternalLink, CreditCard, ShieldCheck
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
  shiprocket_free_threshold: string;
  shiprocket_estimated_cost: string;
  quick_customer_base_fee: string;
  quick_customer_per_km: string;
  quick_free_threshold: string;
  include_gateway_in_platform_fee: string;
  gateway_fee_percent: string;
  service_visit_charge: string;
  service_technician_min_pay: string;
  service_commission_pct: string;
}

export const PricingSettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'commission' | 'delivery' | 'services' | 'gateway' | 'audit'>('commission');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [deliveryRules, setDeliveryRules] = useState<DeliveryPayRule[]>([
    {
      id: '',
      scope: 'global',
      basePayPerOrder: '30',
      payPerKm: '5',
      maxDistanceKm: '15',
      isActive: true,
      description: 'Global Quick Commerce Rider Pay Rule'
    }
  ]);
  const [settings, setSettings] = useState<AppSettings>({
    shiprocket_base_fee: '49',
    shiprocket_free_threshold: '499',
    shiprocket_estimated_cost: '45',
    quick_customer_base_fee: '35',
    quick_customer_per_km: '7',
    quick_free_threshold: '999',
    include_gateway_in_platform_fee: 'true',
    gateway_fee_percent: '2.36',
    service_visit_charge: '199',
    service_technician_min_pay: '149',
    service_commission_pct: '15'
  });
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Modal State for New Rule
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [newRule, setNewRule] = useState({
    scope: 'category',
    scopeId: '',
    vertical: 'services',
    commissionPct: 15,
    includeGateway: true,
    description: ''
  });

  // Simulator State
  const [simVendorPrice, setSimVendorPrice] = useState<number>(250);
  const [simMrp, setSimMrp] = useState<number>(399);
  const [simCommissionPct, setSimCommissionPct] = useState<number>(12);
  const [simIncludeGateway, setSimIncludeGateway] = useState<boolean>(true);
  const [simFulfillment, setSimFulfillment] = useState<'traditional' | 'quick_commerce' | 'services'>('traditional');
  const [simDistanceKm, setSimDistanceKm] = useState<number>(4);
  const [simResult, setSimResult] = useState<any>(null);
  const [simLoading, setSimLoading] = useState(false);

  // Load all pricing rules, delivery rules, and settings
  const loadData = async () => {
    setLoading(true);
    try {
      const [rRes, dRes, sRes]: any = await Promise.all([
        api.get('/api/admin/pricing/rules'),
        api.get('/api/admin/pricing/delivery-rules'),
        api.get('/api/admin/pricing/settings')
      ]);

      if (rRes?.rules) setRules(rRes.rules);
      if (dRes?.rules && dRes.rules.length > 0) {
        setDeliveryRules(dRes.rules);
      } else {
        setDeliveryRules([{
          id: '',
          scope: 'global',
          basePayPerOrder: '30',
          payPerKm: '5',
          maxDistanceKm: '15',
          isActive: true,
          description: 'Global Quick Commerce Rider Pay Rule'
        }]);
      }
      if (sRes?.settings) {
        setSettings({
          ...sRes.settings,
          service_commission_pct: sRes.settings.service_commission_pct || '15'
        });
      }
    } catch (err: any) {
      console.error('Failed to load pricing data:', err);
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

  // Run live simulation whenever simulator inputs change
  useEffect(() => {
    const runSim = async () => {
      setSimLoading(true);
      try {
        const isServices = simFulfillment === 'services';
        const res: any = await api.post('/api/admin/pricing/simulate', {
          vendorPrice: simVendorPrice,
          mrp: simMrp,
          commissionPct: simCommissionPct,
          includeGateway: simIncludeGateway,
          fulfillmentType: simFulfillment,
          distanceKm: simDistanceKm,
          shippingFee: isServices
            ? parseFloat(settings.service_visit_charge || '199')
            : parseFloat(settings.shiprocket_base_fee || '49'),
          freeShippingAbove: parseFloat(settings.shiprocket_free_threshold || '499'),
          riderBasePay: isServices
            ? parseFloat(settings.service_technician_min_pay || '149')
            : (parseFloat(deliveryRules[0]?.basePayPerOrder as any) || 30),
          riderPayPerKm: parseFloat(deliveryRules[0]?.payPerKm as any) || 5
        });
        if (res?.simulation) setSimResult(res.simulation);
      } catch (err) {
        console.error('Simulation error:', err);
      } finally {
        setSimLoading(false);
      }
    };

    const timer = setTimeout(runSim, 200);
    return () => clearTimeout(timer);
  }, [simVendorPrice, simMrp, simCommissionPct, simIncludeGateway, simFulfillment, simDistanceKm, settings, deliveryRules]);

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const currentRule = deliveryRules[0] || {
        scope: 'global',
        basePayPerOrder: 30,
        payPerKm: 5,
        maxDistanceKm: 15,
        isActive: true
      };

      const parsedBasePay = parseFloat(String(currentRule.basePayPerOrder));
      const parsedPayPerKm = parseFloat(String(currentRule.payPerKm));
      const parsedMaxDist = parseFloat(String(currentRule.maxDistanceKm));

      const deliveryRulePayload = {
        ...currentRule,
        basePayPerOrder: !isNaN(parsedBasePay) && parsedBasePay >= 0 ? parsedBasePay : 30,
        payPerKm: !isNaN(parsedPayPerKm) && parsedPayPerKm >= 0 ? parsedPayPerKm : 5,
        maxDistanceKm: !isNaN(parsedMaxDist) && parsedMaxDist >= 0 ? parsedMaxDist : 15
      };

      // 1. Save settings and deliveryRule in unified endpoint
      await api.post('/api/admin/pricing/settings', {
        settings,
        deliveryRule: deliveryRulePayload
      });

      // 2. Also ensure delivery-rules endpoint is explicitly synced
      await api.post('/api/admin/pricing/delivery-rules', deliveryRulePayload);

      alert('Pricing & delivery settings updated successfully!');
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/api/admin/pricing/rules', {
        ...newRule,
        scopeId: newRule.scope === 'vertical' ? null : newRule.scopeId
      });
      setShowRuleModal(false);
      setNewRule({
        scope: 'category',
        scopeId: '',
        vertical: 'services',
        commissionPct: 15,
        includeGateway: true,
        description: ''
      });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to create pricing rule');
    }
  };

  const handleDeleteRule = async (id: string) => {
    if (!confirm('Are you sure you want to delete this pricing rule?')) return;
    try {
      await api.delete(`/api/admin/pricing/rules/${id}`);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete rule');
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-premium">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 font-heading">Pricing & Commission Engine</h1>
              <p className="text-xs text-gray-500">
                Rule hierarchy: Product ➔ Vendor ➔ Category ➔ Vertical ➔ Global (Most specific rule applies)
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            className="p-2.5 border rounded-xl hover:bg-gray-50 text-gray-600 transition-colors"
            title="Refresh Rules"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowRuleModal(true)}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Rule</span>
          </button>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex gap-2 border-b border-gray-200 overflow-x-auto pb-1 font-sans">
        {[
          { id: 'commission', label: 'Product Commissions', icon: Percent },
          { id: 'delivery', label: 'Delivery & Logistics', icon: Truck },
          { id: 'services', label: 'Services & Technicians', icon: Wrench },
          { id: 'gateway', label: 'Razorpay Gateway & Buffer', icon: ShieldAlert },
          { id: 'audit', label: 'Settings Change History', icon: History },
        ].map(t => {
          const Icon = t.icon;
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => {
                setActiveTab(t.id as any);
                if (t.id === 'audit') loadAuditLogs();
              }}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                active
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Product Commission Rules */}
      {activeTab === 'commission' && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-premium overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Active Commission Rules Matrix</h3>
                <p className="text-xs text-gray-500">Commission is calculated on top of vendor price (Add-on model).</p>
              </div>
              <span className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 px-3 py-1 rounded-full font-bold">
                {rules.length} Rules Active
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="px-5 py-3.5">Scope Level</th>
                    <th className="px-5 py-3.5">Target / Context</th>
                    <th className="px-5 py-3.5">Vertical</th>
                    <th className="px-5 py-3.5">Commission</th>
                    <th className="px-5 py-3.5">Gateway Buffer</th>
                    <th className="px-5 py-3.5">Description</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {rules.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-10 text-center text-gray-400">
                        No custom rules configured yet. The default global commission applies (10.00%).
                      </td>
                    </tr>
                  ) : (
                    rules.map(rule => (
                      <tr key={rule.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-5 py-4">
                          <span className={`px-2.5 py-1 rounded-md font-bold text-[10px] uppercase tracking-wider ${
                            rule.scope === 'global' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                            rule.scope === 'vertical' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                            rule.scope === 'category' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            rule.scope === 'vendor' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                            'bg-pink-50 text-pink-700 border border-pink-200'
                          }`}>
                            {rule.scope}
                          </span>
                        </td>
                        <td className="px-5 py-4 font-semibold text-gray-800">
                          {rule.targetName || (rule.scope === 'global' ? 'All Products Platform-Wide' : (rule.scope === 'vertical' ? (rule.vertical === 'services' ? 'Doorstep Services & Repairs' : rule.vertical === 'quick' ? 'Quick Commerce Hyperlocal' : 'Pan-India E-commerce Shop') : (rule.scopeId || '—')))}
                        </td>
                        <td className="px-5 py-4 capitalize text-gray-600 font-medium">
                          {rule.vertical || 'All Verticals'}
                        </td>
                        <td className="px-5 py-4 font-numbers font-black text-gray-900 text-sm">
                          {rule.commissionPct}%
                        </td>
                        <td className="px-5 py-4">
                          {rule.includeGateway ? (
                            <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Added (+2.36%)
                            </span>
                          ) : (
                            <span className="text-[11px] font-bold text-gray-400">
                              Absorbed
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-gray-500 max-w-xs truncate">
                          {rule.description || '—'}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button
                            onClick={() => handleDeleteRule(rule.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Rule"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Delivery & Logistics (Shiprocket & Quick Fleet) */}
      {activeTab === 'delivery' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Pan-India (Shiprocket 3PL Logistics) */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-premium space-y-4">
              <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Pan-India Delivery (Shiprocket 3PL)</h3>
                  <p className="text-xs text-gray-500">Traditional e-commerce courier shipments</p>
                </div>
              </div>

              <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs text-amber-900 leading-relaxed">
                💡 <strong>Zero Deficit Guarantee:</strong> Shiprocket debits courier fees from the Super Admin's prepaid account. The customer delivery charge set here is collected at checkout to cover this cost directly.
              </div>

              <div className="space-y-4 pt-2 font-sans">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Standard Customer Shipping Fee (₹)
                  </label>
                  <input
                    type="number"
                    value={settings.shiprocket_base_fee}
                    onChange={e => setSettings({ ...settings, shiprocket_base_fee: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl text-sm font-numbers font-bold"
                  />
                  <span className="text-[11px] text-gray-400">Charged to customer on orders below the free shipping threshold.</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Free Shipping Threshold (₹)
                  </label>
                  <input
                    type="number"
                    value={settings.shiprocket_free_threshold}
                    onChange={e => setSettings({ ...settings, shiprocket_free_threshold: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl text-sm font-numbers font-bold text-emerald-600"
                  />
                  <span className="text-[11px] text-gray-400">Orders at or above this amount receive FREE delivery (absorbed from commission).</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Estimated 3PL Courier Cost (₹)
                  </label>
                  <input
                    type="number"
                    value={settings.shiprocket_estimated_cost}
                    onChange={e => setSettings({ ...settings, shiprocket_estimated_cost: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl text-sm font-numbers font-bold text-gray-600"
                  />
                  <span className="text-[11px] text-gray-400">Average courier charge debited by Shiprocket per parcel.</span>
                </div>
              </div>
            </div>

            {/* Quick-Commerce (Local Rider Fleet) */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-premium space-y-4">
              <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Hyperlocal Quick Commerce (Rider Fleet)</h3>
                  <p className="text-xs text-gray-500">Instant 10-30 min grocery & food delivery</p>
                </div>
              </div>

              <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl text-xs text-emerald-900 leading-relaxed">
                ⚡ <strong>Instant Partner Payout:</strong> When a rider verifies the 4-digit customer OTP, their wallet is instantly credited via the money ledger.
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 font-sans">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Rider Base Payout (₹)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={deliveryRules[0]?.basePayPerOrder ?? ''}
                    onChange={e => {
                      const val = e.target.value;
                      setDeliveryRules(prev => [{
                        ...(prev[0] || { scope: 'global', isActive: true, maxDistanceKm: 15 }),
                        basePayPerOrder: val
                      } as any]);
                    }}
                    className="w-full px-3 py-2 border rounded-xl text-sm font-numbers font-bold text-emerald-700"
                  />
                  <span className="text-[10px] text-gray-400">Base fee (first 2 km)</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Rider Pay Per Km (₹)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={deliveryRules[0]?.payPerKm ?? ''}
                    onChange={e => {
                      const val = e.target.value;
                      setDeliveryRules(prev => [{
                        ...(prev[0] || { scope: 'global', isActive: true, maxDistanceKm: 15 }),
                        payPerKm: val
                      } as any]);
                    }}
                    className="w-full px-3 py-2 border rounded-xl text-sm font-numbers font-bold text-emerald-700"
                  />
                  <span className="text-[10px] text-gray-400">For distance &gt; 2 km</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Customer Base Fee (₹)
                  </label>
                  <input
                    type="number"
                    value={settings.quick_customer_base_fee}
                    onChange={e => setSettings({ ...settings, quick_customer_base_fee: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl text-sm font-numbers font-bold"
                  />
                  <span className="text-[10px] text-gray-400">Charged to customer</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Customer Per Km (₹)
                  </label>
                  <input
                    type="number"
                    value={settings.quick_customer_per_km}
                    onChange={e => setSettings({ ...settings, quick_customer_per_km: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl text-sm font-numbers font-bold"
                  />
                  <span className="text-[10px] text-gray-400">Extra per km</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleSaveSettings}
              disabled={saving}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider flex items-center gap-2 shadow-premium transition-all"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving Changes...' : 'Save Logistics Settings'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Tab 3: Services & Technicians */}
      {activeTab === 'services' && (
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-premium space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shadow-sm">
                <Wrench className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 font-heading">Doorstep Services & Technician Payout Architecture</h3>
                <p className="text-xs text-gray-500">AC repair, plumbing, electrician, appliance services, & technician partner compensation</p>
              </div>
            </div>

            <a
              href="/admin/fleet-payouts"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl text-xs transition-colors border border-indigo-200"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open Fleet & Technician Payouts</span>
            </a>
          </div>

          {/* Revenue Architecture Banner */}
          <div className="p-4 bg-amber-50/70 border border-amber-200/90 rounded-2xl space-y-2 text-xs text-amber-950 leading-relaxed font-sans">
            <div className="flex items-center gap-2 font-bold text-amber-900">
              <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
              <span>How Money Flows for Services & Technicians:</span>
            </div>
            <p>
              When a customer books a doorstep repair or maintenance service, <b>100% of the funds (Service Rate + Diagnostic Visit Charge)</b> are paid online via Razorpay directly into the Super Admin account.
              The pricing engine deducts the platform commission % + visit margin. When the technician completes the service and the customer provides the <b>4-digit OTP</b>, the technician's partner wallet is credited immediately.
            </p>
          </div>

          {/* Controls Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-1 font-sans">
            {/* Control 1: Service Commission Pct */}
            <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-2">
              <label className="block text-xs font-bold text-gray-800">
                Service Commission Rate (%)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="75"
                value={settings.service_commission_pct || '15'}
                onChange={e => setSettings({ ...settings, service_commission_pct: e.target.value })}
                className="w-full px-3 py-2 border rounded-xl text-sm font-numbers font-bold text-indigo-600 bg-white"
              />
              <span className="text-[11px] text-gray-500 block leading-tight">
                Platform commission percentage deducted from service labor rate card.
              </span>
            </div>

            {/* Control 2: Visit Charge */}
            <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-2">
              <label className="block text-xs font-bold text-gray-800">
                Standard Doorstep Visit Charge (₹)
              </label>
              <input
                type="number"
                value={settings.service_visit_charge}
                onChange={e => setSettings({ ...settings, service_visit_charge: e.target.value })}
                className="w-full px-3 py-2 border rounded-xl text-sm font-numbers font-bold bg-white"
              />
              <span className="text-[11px] text-gray-500 block leading-tight">
                Diagnostic / inspection call-out fee charged to customer at checkout.
              </span>
            </div>

            {/* Control 3: Technician Pay */}
            <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-2">
              <label className="block text-xs font-bold text-gray-800">
                Technician Guaranteed Pay (₹)
              </label>
              <input
                type="number"
                value={settings.service_technician_min_pay}
                onChange={e => setSettings({ ...settings, service_technician_min_pay: e.target.value })}
                className="w-full px-3 py-2 border rounded-xl text-sm font-numbers font-bold text-emerald-700 bg-white"
              />
              <span className="text-[11px] text-gray-500 block leading-tight">
                Guaranteed earning credited to technician on completed inspection.
              </span>
            </div>

            {/* KPI 4: HQ Visit Margin */}
            <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/60 flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-emerald-900 block">HQ Visit Margin Retained</span>
                <span className="text-[11px] text-emerald-700/80 block mt-0.5">Retained by Super Admin per visit</span>
              </div>
              <div className="my-2">
                <span className="text-2xl font-black font-numbers text-emerald-700">
                  +₹{Math.max(0, (parseFloat(settings.service_visit_charge || '199') - parseFloat(settings.service_technician_min_pay || '149')))}
                </span>
              </div>
              <span className="text-[10px] text-emerald-600 font-medium">
                Customer (₹{settings.service_visit_charge || 199}) - Tech (₹{settings.service_technician_min_pay || 149})
              </span>
            </div>
          </div>

          {/* Visual Step-by-Step Flow Pipeline */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider font-heading">
              Complete Payment Collection & Partner Distribution Pipeline
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  <CreditCard className="w-4 h-4" />
                </div>
                <h5 className="font-bold text-xs text-gray-900">1. Customer Pays via Razorpay</h5>
                <p className="text-[11px] text-gray-500 leading-relaxed">
                  Customer books doorstep service online. 100% of order total is collected in Super Admin's Razorpay account.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                  <Calculator className="w-4 h-4" />
                </div>
                <h5 className="font-bold text-xs text-gray-900">2. Commission & Margin Retained</h5>
                <p className="text-[11px] text-gray-500 leading-relaxed">
                  Platform engine retains {settings.service_commission_pct || '15'}% commission on labor + ₹{Math.max(0, (parseFloat(settings.service_visit_charge || '199') - parseFloat(settings.service_technician_min_pay || '149')))} visit margin + 2.36% buffer.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <h5 className="font-bold text-xs text-gray-900">3. Instant Wallet Credit on OTP</h5>
                <p className="text-[11px] text-gray-500 leading-relaxed">
                  Technician completes the job. Customer provides 4-digit OTP. Technician's partner wallet is instantly credited.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                  <Zap className="w-4 h-4" />
                </div>
                <h5 className="font-bold text-xs text-gray-900">4. Disbursed via UPI / Bank</h5>
                <p className="text-[11px] text-gray-500 leading-relaxed">
                  Technician requests withdrawal. Admin disburses payout via IMPS/UPI in the Fleet & Service Payouts queue.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <a
              href="/admin/fleet-payouts"
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5"
            >
              <span>Manage Partner Withdrawal Requests</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>

            <button
              onClick={handleSaveSettings}
              disabled={saving}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider flex items-center gap-2 shadow-premium transition-all"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Services Settings'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Tab 4: Razorpay Gateway & Buffer Settings */}
      {activeTab === 'gateway' && (
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-premium space-y-6">
          <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Razorpay Fee Buffer & Safety Controls</h3>
              <p className="text-xs text-gray-500">Prevent platform income erosion from payment gateway processing fees</p>
            </div>
          </div>

          <div className="p-4 bg-indigo-50/70 border border-indigo-200/80 rounded-xl space-y-2 text-xs text-indigo-950">
            <p className="font-bold">Why the Gateway Buffer is Essential:</p>
            <p className="leading-relaxed">
              Razorpay charges standard <strong>2.00% + 18% GST (total 2.36%)</strong> on every captured online payment.
              When <em>"Include Gateway Buffer in Platform Fee"</em> is turned on, this 2.36% is incorporated transparently into the platform fee. The Super Admin receives full platform commission without losing 2.36% to transaction deductions.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
              <div>
                <span className="block text-xs font-bold text-gray-900">Include Gateway Buffer in Platform Fee</span>
                <span className="text-[11px] text-gray-500">Calculates customer price to absorb 2.36% gateway deduction safely</span>
              </div>
              <input
                type="checkbox"
                checked={settings.include_gateway_in_platform_fee === 'true'}
                onChange={e => setSettings({ ...settings, include_gateway_in_platform_fee: e.target.checked ? 'true' : 'false' })}
                className="w-5 h-5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
              />
            </div>

            <div className="max-w-xs">
              <label className="block text-xs font-bold text-gray-700 mb-1">Razorpay Standard Fee Rate (%)</label>
              <input
                type="text"
                disabled
                value="2.36% (2% + 18% GST)"
                className="w-full px-3 py-2 bg-gray-100 border rounded-xl text-sm font-numbers font-bold text-gray-500"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-gray-100">
            <button
              onClick={handleSaveSettings}
              disabled={saving}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider flex items-center gap-2 shadow-premium transition-all"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Gateway Settings'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Tab 5: Change Audit History */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-premium overflow-hidden">
          <div className="p-5 border-b border-gray-100 bg-slate-50/50">
            <h3 className="text-sm font-bold text-gray-900">Settings Change Audit Trail</h3>
            <p className="text-xs text-gray-500">Immutable ledger tracking every modification to platform rates</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-5 py-3.5">Setting / Rule Key</th>
                  <th className="px-5 py-3.5">Previous Value</th>
                  <th className="px-5 py-3.5">Updated Value</th>
                  <th className="px-5 py-3.5">Changed By</th>
                  <th className="px-5 py-3.5">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-gray-400">
                      No settings changes logged yet.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50/60">
                      <td className="px-5 py-4 font-mono font-bold text-indigo-700">{log.settingKey}</td>
                      <td className="px-5 py-4 font-mono text-gray-500 max-w-xs truncate">{log.oldValue || '—'}</td>
                      <td className="px-5 py-4 font-mono text-emerald-600 font-bold max-w-xs truncate">{log.newValue}</td>
                      <td className="px-5 py-4 text-gray-600 font-medium">{log.changedBy}</td>
                      <td className="px-5 py-4 text-gray-400">
                        {new Date(log.changedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Interactive Live Profit / Loss Calculator Simulator */}
      <div className="bg-gradient-to-br from-[#0F2C59] via-[#1E3A8A] to-[#1E293B] text-white p-6 md:p-8 rounded-3xl shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-emerald-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold font-heading flex items-center gap-2">
                  <span>Live Dynamic Pricing & Profit Simulator</span>
                  {simLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />}
                </h3>
                <p className="text-xs text-white/60">Test commission, gateway buffer, and logistics margins in real time</p>
              </div>
            </div>

            {simResult && (
              <span className={`px-4 py-1.5 rounded-full text-xs font-black tracking-wider uppercase flex items-center gap-1.5 border shadow-lg ${
                simResult.isProfitable
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30'
                  : 'bg-red-500/20 text-red-300 border-red-400/30'
              }`}>
                {simResult.isProfitable ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Profitable (+₹{simResult.netProfit})</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                    <span>Deficit Detected (-₹{Math.abs(simResult.netProfit)})</span>
                  </>
                )}
              </span>
            )}
          </div>

          {/* Simulator Inputs & Result Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Inputs (5 Cols) */}
            <div className="lg:col-span-5 space-y-4 bg-white/5 p-5 rounded-2xl border border-white/10 backdrop-blur-md">
              <span className="text-xs font-black uppercase tracking-wider text-white/50 block font-heading">
                Scenario Parameters
              </span>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-white/70 mb-1">
                    {simFulfillment === 'services' ? 'Service Labor Base (₹)' : 'Vendor Price (You Receive ₹)'}
                  </label>
                  <input
                    type="number"
                    value={simVendorPrice}
                    onChange={e => setSimVendorPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-sm font-numbers font-bold text-white focus:outline-none focus:border-emerald-400"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-white/70 mb-1">
                    {simFulfillment === 'services' ? 'Quoted Rate Card / Cap (₹)' : 'Product MRP (Cap ₹)'}
                  </label>
                  <input
                    type="number"
                    value={simMrp}
                    onChange={e => setSimMrp(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-sm font-numbers font-bold text-white focus:outline-none focus:border-emerald-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-white/70 mb-1">Commission Rate (%)</label>
                  <input
                    type="number"
                    value={simCommissionPct}
                    onChange={e => setSimCommissionPct(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-sm font-numbers font-bold text-emerald-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-white/70 mb-1">Fulfillment Mode</label>
                  <select
                    value={simFulfillment}
                    onChange={e => {
                      const mode = e.target.value as any;
                      setSimFulfillment(mode);
                      if (mode === 'services' && settings.service_commission_pct) {
                        setSimCommissionPct(Number(settings.service_commission_pct) || 15);
                      }
                    }}
                    className="w-full px-3 py-2 bg-slate-800 border border-white/20 rounded-xl text-xs font-bold text-white focus:outline-none"
                  >
                    <option value="traditional">Pan-India (Shiprocket)</option>
                    <option value="quick_commerce">⚡ Quick Commerce (Rider)</option>
                    <option value="services">🔧 Doorstep Services (Technician)</option>
                  </select>
                </div>
              </div>

              {simFulfillment === 'quick_commerce' && (
                <div>
                  <label className="block text-[11px] font-bold text-white/70 mb-1">Delivery Distance (km): {simDistanceKm} km</label>
                  <input
                    type="range"
                    min="1"
                    max="15"
                    step="0.5"
                    value={simDistanceKm}
                    onChange={e => setSimDistanceKm(Number(e.target.value))}
                    className="w-full accent-emerald-400"
                  />
                </div>
              )}

              {simFulfillment === 'services' && (
                <div className="p-3 bg-amber-500/10 border border-amber-400/30 rounded-xl text-[11px] text-amber-200 space-y-1">
                  <div className="flex items-center justify-between font-bold">
                    <span>Doorstep Diagnostic Visit:</span>
                    <span className="font-numbers">₹{settings.service_visit_charge || 199}</span>
                  </div>
                  <div className="flex items-center justify-between text-white/70">
                    <span>Technician Guaranteed Pay:</span>
                    <span className="font-numbers text-emerald-400">₹{settings.service_technician_min_pay || 149}</span>
                  </div>
                  <div className="flex items-center justify-between text-white/70 border-t border-amber-400/20 pt-1">
                    <span>Admin Visit Margin Retained:</span>
                    <span className="font-numbers font-bold text-amber-300">
                      +₹{Math.max(0, parseFloat(settings.service_visit_charge || '199') - parseFloat(settings.service_technician_min_pay || '149'))}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
                <span className="text-xs text-white/80 font-medium">Add Gateway Buffer (+2.36%)</span>
                <input
                  type="checkbox"
                  checked={simIncludeGateway}
                  onChange={e => setSimIncludeGateway(e.target.checked)}
                  className="w-4 h-4 accent-emerald-400 rounded"
                />
              </div>
            </div>

            {/* Right: Calculated Breakdown (7 Cols) */}
            <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-3">
              {simResult ? (
                <>
                  {/* Card 1: Total Customer Checkout Amount */}
                  <div className="p-4 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 rounded-2xl border border-blue-400/30 flex flex-col justify-between col-span-2 sm:col-span-1 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-blue-200 font-bold uppercase tracking-wider">Customer Pays (Total)</span>
                      <span className="text-[10px] bg-blue-400/20 text-blue-300 px-2 py-0.5 rounded-full font-mono font-bold">Checkout</span>
                    </div>
                    <div className="my-2">
                      <span className="text-3xl font-black font-numbers text-white">₹{simResult.grossTotal}</span>
                      <div className="mt-1 text-[11px] font-bold text-emerald-300 flex items-center gap-1">
                        <span>₹{simResult.customerPrice}</span>
                        <span className="text-white/60 font-normal">{simFulfillment === 'services' ? 'service +' : 'item +'}</span>
                        <span>{simResult.customerDelivery === 0 ? 'FREE' : `₹${simResult.customerDelivery}`}</span>
                        <span className="text-white/60 font-normal">{simFulfillment === 'services' ? 'visit' : 'delivery'}</span>
                      </div>
                      {simResult.isCappedAtMrp && (
                        <span className="block text-[10px] text-amber-300 font-bold mt-1">⚠️ Capped at Rate ₹{simResult.mrp}</span>
                      )}
                    </div>
                    <span className="text-[10px] text-white/50">Full amount paid online via Razorpay</span>
                  </div>

                  {/* Card 2: Vendor / Technician Receives */}
                  <div className="p-4 bg-white/10 rounded-2xl border border-white/10 flex flex-col justify-between">
                    <span className="text-[11px] text-white/60 font-semibold">
                      {simFulfillment === 'services' ? 'Technician Payout' : 'Vendor Receives'}
                    </span>
                    <div className="my-2">
                      <span className="text-2xl font-black font-numbers text-emerald-400">
                        ₹{simFulfillment === 'services' ? (simResult.vendorPrice + (simResult.deliveryCost || 0)) : simResult.vendorPrice}
                      </span>
                    </div>
                    <span className="text-[10px] text-white/40">
                      {simFulfillment === 'services' ? `Base labor + ₹${simResult.deliveryCost} visit pay` : '100% guaranteed base payout'}
                    </span>
                  </div>

                  {/* Card 3: Delivery / Visit Charge */}
                  <div className="p-4 bg-white/10 rounded-2xl border border-white/10 flex flex-col justify-between">
                    <span className="text-[11px] text-white/60 font-semibold">
                      {simFulfillment === 'services' ? 'Doorstep Visit Fee' : 'Delivery Charge'}
                    </span>
                    <div className="my-2">
                      <span className="text-2xl font-black font-numbers text-blue-300">
                        {simResult.customerDelivery === 0 ? 'FREE' : `₹${simResult.customerDelivery}`}
                      </span>
                    </div>
                    <span className="text-[10px] text-white/40">
                      {simFulfillment === 'services'
                        ? `Tech: ₹${simResult.deliveryCost} (Margin: +₹${simResult.deliveryMargin})`
                        : `Cost: ₹${simResult.deliveryCost} (Margin: ${simResult.deliveryMargin >= 0 ? `+₹${simResult.deliveryMargin}` : `-₹${Math.abs(simResult.deliveryMargin)}`})`}
                    </span>
                  </div>

                  {/* Card 4: Razorpay Deducts */}
                  <div className="p-4 bg-white/10 rounded-2xl border border-white/10 flex flex-col justify-between">
                    <span className="text-[11px] text-white/60 font-semibold">Razorpay Deducts</span>
                    <div className="my-2">
                      <span className="text-2xl font-black font-numbers text-red-300">₹{simResult.gatewayFeeActual}</span>
                    </div>
                    <span className="text-[10px] text-white/40">2.36% on ₹{simResult.grossTotal} Total</span>
                  </div>

                  {/* Card 5: Platform Fee Collected */}
                  <div className="p-4 bg-white/10 rounded-2xl border border-white/10 flex flex-col justify-between">
                    <span className="text-[11px] text-white/60 font-semibold">Platform Fee Collected</span>
                    <div className="my-2">
                      <span className="text-2xl font-black font-numbers text-indigo-300">₹{simResult.platformFee}</span>
                    </div>
                    <span className="text-[10px] text-white/40">Comm ₹{simResult.commissionAmount} + Buffer ₹{simResult.gatewayBuffer}</span>
                  </div>

                  {/* Card 6: Platform Net Profit */}
                  <div className={`p-4 rounded-2xl border flex flex-col justify-between ${
                    simResult.isProfitable
                      ? 'bg-emerald-500/20 border-emerald-400/40'
                      : 'bg-red-500/20 border-red-400/40'
                  }`}>
                    <span className="text-[11px] font-bold text-white/90">Platform Net Profit</span>
                    <div className="my-2">
                      <span className={`text-2xl font-black font-numbers ${
                        simResult.isProfitable ? 'text-emerald-300' : 'text-red-300'
                      }`}>
                        ₹{simResult.netProfit}
                      </span>
                    </div>
                    <span className="text-[10px] text-white/70">
                      {simResult.isProfitable ? 'Safe margin retained at HQ' : 'Loss incurred'}
                    </span>
                  </div>

                  {/* Summary Ribbon: Explaining the Full Customer Equation */}
                  <div className="col-span-2 sm:col-span-3 bg-white/5 border border-white/10 rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
                    <div className="flex items-center gap-2 text-white/90 font-medium">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"></span>
                      <span>
                        <b>Customer Checkout Equation:</b> ₹{simResult.customerPrice} ({simFulfillment === 'services' ? 'service rate' : 'item'}) + {simResult.customerDelivery === 0 ? '₹0 (FREE Delivery)' : `₹${simResult.customerDelivery} (${simFulfillment === 'services' ? 'diagnostic visit' : 'delivery'})`} = <b className="text-emerald-300 text-sm font-numbers">₹{simResult.grossTotal} Total Paid via Razorpay</b>
                      </span>
                    </div>
                    <div className="text-white/60 text-[11px] font-mono">
                      {simFulfillment === 'services'
                        ? 'Partner wallet credited upon OTP. Disbursed via Fleet Payouts.'
                        : `Razorpay 2.36% on ₹${simResult.grossTotal} = ₹${simResult.gatewayFeeActual}`}
                    </div>
                  </div>
                </>
              ) : (
                <div className="col-span-3 py-12 text-center text-white/40">
                  Calculating real-time breakdown...
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* New Rule Modal */}
      {showRuleModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-base text-gray-900 font-heading">Add Pricing & Commission Rule</h3>
              <button onClick={() => setShowRuleModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <form onSubmit={handleCreateRule} className="space-y-4 text-xs font-sans">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Scope Hierarchy Level</label>
                <select
                  value={newRule.scope}
                  onChange={e => setNewRule({ ...newRule, scope: e.target.value })}
                  className="w-full px-3 py-2 border rounded-xl text-xs font-semibold"
                >
                  <option value="global">Global (Platform-Wide Fallback)</option>
                  <option value="vertical">Vertical (Shop / Quick / Services)</option>
                  <option value="category">Category Override</option>
                  <option value="vendor">Vendor Specific Override</option>
                  <option value="product">Product Specific Override</option>
                </select>
              </div>

              {newRule.scope === 'vertical' ? (
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Select Vertical</label>
                  <select
                    value={newRule.vertical}
                    onChange={e => setNewRule({ ...newRule, vertical: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl text-xs font-semibold"
                  >
                    <option value="services">🔧 Doorstep Services & Repairs (services)</option>
                    <option value="quick">⚡ Quick Commerce Hyperlocal (quick)</option>
                    <option value="shop">📦 Pan-India E-commerce Shop (shop)</option>
                  </select>
                </div>
              ) : newRule.scope !== 'global' ? (
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    {newRule.scope === 'category' ? 'Category ID' : newRule.scope === 'vendor' ? 'Vendor ID' : 'Product ID'}
                  </label>
                  <input
                    value={newRule.scopeId}
                    onChange={e => setNewRule({ ...newRule, scopeId: e.target.value })}
                    placeholder={`Enter ${newRule.scope} ID`}
                    className="w-full px-3 py-2 border rounded-xl text-xs font-mono"
                    required
                  />
                </div>
              ) : null}

              <div>
                <label className="block font-bold text-gray-700 mb-1">Commission Rate (%)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="75"
                  value={newRule.commissionPct}
                  onChange={e => setNewRule({ ...newRule, commissionPct: Number(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-xl text-sm font-numbers font-bold"
                  required
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border">
                <div>
                  <span className="font-bold block text-gray-800">Add Gateway Buffer</span>
                  <span className="text-[10px] text-gray-500">Adds 2.36% buffer for Razorpay fees</span>
                </div>
                <input
                  type="checkbox"
                  checked={newRule.includeGateway}
                  onChange={e => setNewRule({ ...newRule, includeGateway: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Description / Internal Note</label>
                <input
                  value={newRule.description}
                  onChange={e => setNewRule({ ...newRule, description: e.target.value })}
                  placeholder="e.g. Standard Services commission rule"
                  className="w-full px-3 py-2 border rounded-xl text-xs"
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
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md"
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
