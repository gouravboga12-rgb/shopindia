import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import type { ManagedVendor } from '../AdminPortal';
import {
  ArrowLeft, ShieldAlert, LayoutDashboard, Package,
  ShoppingBag, BarChart3, Wallet, Wrench,
  DollarSign, Clock, Trash2, Search,
} from 'lucide-react';

interface Props {
  vendor: ManagedVendor;
  onBack: () => void;
}

type Tab = 'overview' | 'products' | 'orders' | 'analytics' | 'wallet' | 'technicians';

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'overview',     label: 'Overview',     icon: LayoutDashboard },
  { id: 'products',     label: 'Products',      icon: Package },
  { id: 'orders',       label: 'Orders',        icon: ShoppingBag },
  { id: 'analytics',    label: 'Analytics',     icon: BarChart3 },
  { id: 'wallet',       label: 'Wallet',        icon: Wallet },
  { id: 'technicians',  label: 'Technicians',   icon: Wrench },
];

const fmtRs = (n: number) => '₹' + new Intl.NumberFormat('en-IN').format(n);

// ─── Overview Tab ──────────────────────────────────────────────────────────────
const OverviewTab: React.FC<{ vendorId: string }> = ({ vendorId }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<any>(`/api/admin/vendors/${vendorId}/overview`)
      .then(setData).catch(console.error).finally(() => setLoading(false));
  }, [vendorId]);

  if (loading) return <div className="h-32 skeleton-shimmer rounded-2xl" />;

  const nonPendingStatuses = ['delivered', 'cancelled', 'refunded', 'returned', 'failed'];
  const pending = data?.ordersByStatus
    ?.filter((s: any) => !nonPendingStatuses.includes(s._id))
    ?.reduce((sum: number, s: any) => sum + s.count, 0) || 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {[
        { label: 'Total Revenue',   value: fmtRs(data?.allTime?.total || 0),  icon: DollarSign, color: 'text-emerald-600 bg-emerald-50' },
        { label: 'Total Orders',    value: data?.allTime?.count || 0,          icon: ShoppingBag, color: 'text-blue-600 bg-blue-50' },
        { label: 'Pending Orders',  value: pending,                             icon: Clock,       color: 'text-amber-600 bg-amber-50' },
        { label: 'Wallet Balance',  value: fmtRs(data?.walletBalance || 0),    icon: Wallet,      color: 'text-purple-600 bg-purple-50' },
      ].map(c => (
        <div key={c.label} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-premium flex items-center gap-4">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${c.color}`}>
            <c.icon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-semibold uppercase">{c.label}</p>
            <p className="text-2xl font-bold text-gray-900 font-numbers">{c.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

// ─── Products Tab ──────────────────────────────────────────────────────────────
const ProductsTab: React.FC<{ vendorId: string }> = ({ vendorId }) => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    api.get<{ products: any[] }>(`/api/admin/vendors/${vendorId}/products`)
      .then(d => setProducts(d.products)).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(load, [vendorId]);

  const handleDelete = async (pid: string, name: string) => {
    if (!confirm(`Delete product "${name}"? This cannot be undone.`)) return;
    setDeleting(pid);
    try {
      await api.delete(`/api/admin/vendors/${vendorId}/products/${pid}`);
      load();
    } catch (err: any) { alert(err.message); }
    finally { setDeleting(null); }
  };

  if (loading) return <div className="h-32 skeleton-shimmer rounded-2xl" />;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-premium overflow-hidden">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <p className="font-semibold text-gray-900 text-sm">{products.length} products</p>
      </div>
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-100">
          <tr>
            <th className="text-left px-5 py-3 font-semibold text-gray-600">Product</th>
            <th className="text-left px-5 py-3 font-semibold text-gray-600">Category</th>
            <th className="text-left px-5 py-3 font-semibold text-gray-600">Price</th>
            <th className="text-left px-5 py-3 font-semibold text-gray-600">Stock</th>
            <th className="text-left px-5 py-3 font-semibold text-gray-600">Status</th>
            <th className="text-left px-5 py-3 font-semibold text-gray-600">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {products.length === 0 ? (
            <tr><td colSpan={6} className="text-center py-10 text-gray-400">No products found.</td></tr>
          ) : products.map(p => (
            <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
              <td className="px-5 py-3 font-medium text-gray-900">{p.name}</td>
              <td className="px-5 py-3 text-gray-500">{p.category?.name || '—'}</td>
              <td className="px-5 py-3 font-numbers text-gray-900">{fmtRs(p.basePrice || 0)}</td>
              <td className="px-5 py-3 text-gray-500">{p.stock ?? '—'}</td>
              <td className="px-5 py-3">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                  p.status === 'active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                  p.status === 'deleted' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                  'bg-gray-50 text-gray-600 border border-gray-200'
                }`}>
                  {p.status || 'active'}
                </span>
              </td>
              <td className="px-5 py-3">
                <div className="flex gap-1">
                  {p.status !== 'deleted' && (
                    <button
                      onClick={() => handleDelete(p.id, p.name)}
                      disabled={deleting === p.id}
                      className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                      title="Delete product"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ─── Orders Tab ────────────────────────────────────────────────────────────────
const ORDER_STATUSES = ['placed','packing','dispatched','delivered','cancelled'];

const OrdersTab: React.FC<{ vendorId: string }> = ({ vendorId }) => {
  const [orders, setOrders]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [q, setQ] = useState('');

  const load = () => {
    setLoading(true);
    api.get<{ orders: any[] }>(`/api/admin/vendors/${vendorId}/orders`)
      .then(d => setOrders(d.orders)).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(load, [vendorId]);

  const updateStatus = async (orderId: string, status: string) => {
    setUpdating(orderId);
    try {
      await api.patch(`/api/admin/vendors/${vendorId}/orders/${orderId}/status`, { status });
      load();
    } catch (err: any) { alert(err.message); }
    finally { setUpdating(null); }
  };

  const statusColor: Record<string, string> = {
    placed:     'bg-blue-50 text-blue-700',
    packing:    'bg-amber-50 text-amber-700',
    dispatched: 'bg-purple-50 text-purple-700',
    delivered:  'bg-emerald-50 text-emerald-700',
    cancelled:  'bg-red-50 text-red-700',
  };

  const filtered = orders.filter(o => !q ||
    o.orderNumber?.toLowerCase().includes(q.toLowerCase()) ||
    o.id?.toLowerCase().includes(q.toLowerCase()) ||
    o.customer?.name?.toLowerCase().includes(q.toLowerCase()) ||
    o.items?.some((item: any) => item.name?.toLowerCase().includes(q.toLowerCase()))
  );

  if (loading) return <div className="h-32 skeleton-shimmer rounded-2xl" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search order #, ID, or customer..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2C59]/20 bg-white"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-premium overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-5 py-3 font-semibold text-gray-600">Order #</th>
              <th className="text-left px-5 py-3 font-semibold text-gray-600">Customer</th>
              <th className="text-left px-5 py-3 font-semibold text-gray-600">Items</th>
              <th className="text-left px-5 py-3 font-semibold text-gray-600">Amount</th>
              <th className="text-left px-5 py-3 font-semibold text-gray-600">Date</th>
              <th className="text-left px-5 py-3 font-semibold text-gray-600">Status</th>
              <th className="text-left px-5 py-3 font-semibold text-gray-600">Update</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-10 text-gray-400">No matching orders found.</td></tr>
            ) : filtered.map(o => (
            <tr key={o.id} className="hover:bg-gray-50/50 transition-colors">
              <td className="px-5 py-3 font-medium text-[#0F2C59]">{o.orderNumber} ({o.items?.map((item: any) => item.name).join(', ')})</td>
              <td className="px-5 py-3 text-gray-600">{o.customer?.name || '—'}</td>
              <td className="px-5 py-3">
                <div className="space-y-1">
                  {o.items?.map((item: any, idx: number) => (
                    <div key={idx} className="text-xs text-gray-600">
                      <span className="font-semibold text-gray-900">{item.name}</span> x {item.quantity}
                    </div>
                  ))}
                </div>
              </td>
              <td className="px-5 py-3 font-numbers font-semibold">{fmtRs(o.total || 0)}</td>
              <td className="px-5 py-3 text-gray-400 text-xs">{o.createdAt?.slice(0, 10)}</td>
              <td className="px-5 py-3">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[o.status] || 'bg-gray-100 text-gray-600'}`}>
                  {o.status}
                </span>
              </td>
              <td className="px-5 py-3">
                <select
                  value={o.status}
                  disabled={updating === o.id}
                  onChange={e => updateStatus(o.id, e.target.value)}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#0F2C59]/20 bg-gray-50"
                >
                  {ORDER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
};

// ─── Wallet Tab ────────────────────────────────────────────────────────────────
const WalletTab: React.FC<{ vendorId: string }> = ({ vendorId }) => {
  const [data, setData]       = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    api.get<any>(`/api/admin/vendors/${vendorId}/wallet`)
      .then(setData).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(load, [vendorId]);

  const handleAction = async (tid: string, action: 'approve' | 'reject') => {
    setProcessing(tid);
    try {
      await api.post(`/api/admin/vendors/${vendorId}/wallet/transactions/${tid}/${action}`, {});
      load();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setProcessing(null);
    }
  };

  if (loading) return <div className="h-32 skeleton-shimmer rounded-2xl" />;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-premium flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center">
          <Wallet className="w-6 h-6 text-purple-600" />
        </div>
        <div>
          <p className="text-xs text-gray-400 uppercase font-semibold">Current Balance</p>
          <p className="text-3xl font-bold text-gray-900 font-numbers">{fmtRs(data?.walletBalance || 0)}</p>
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-premium overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 font-semibold text-sm text-gray-900">Transaction History</div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-5 py-3 font-semibold text-gray-600">Date</th>
              <th className="text-left px-5 py-3 font-semibold text-gray-600">Type</th>
              <th className="text-left px-5 py-3 font-semibold text-gray-600">Amount</th>
              <th className="text-left px-5 py-3 font-semibold text-gray-600">Status</th>
              <th className="text-left px-5 py-3 font-semibold text-gray-600">Note</th>
              <th className="text-left px-5 py-3 font-semibold text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {!data?.transactions?.length ? (
              <tr><td colSpan={6} className="text-center py-8 text-gray-400">No transactions yet.</td></tr>
            ) : data.transactions.map((t: any) => (
              <tr key={t.id} className="hover:bg-gray-50/50">
                <td className="px-5 py-3 text-gray-400 text-xs">{t.createdAt?.slice(0, 10)}</td>
                <td className="px-5 py-3 text-gray-600 capitalize font-medium">{t.type}</td>
                <td className={`px-5 py-3 font-numbers font-semibold ${t.amount >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {t.amount >= 0 ? '+' : ''}{fmtRs(t.amount)}
                </td>
                <td className="px-5 py-3">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${
                    t.status === 'paid' ? 'bg-emerald-50 text-emerald-700' :
                    t.status === 'pending' ? 'bg-amber-50 text-amber-700' :
                    'bg-red-50 text-red-700'
                  }`}>
                    {t.status}
                  </span>
                </td>
                <td className="px-5 py-3 text-gray-400 text-xs">{t.note || '—'}</td>
                <td className="px-5 py-3">
                  {t.type === 'withdrawal' && t.status === 'pending' ? (
                    <div className="flex gap-1.5">
                      <button
                        disabled={processing === t.id}
                        onClick={() => handleAction(t.id, 'approve')}
                        className="px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-semibold"
                      >
                        Approve
                      </button>
                      <button
                        disabled={processing === t.id}
                        onClick={() => handleAction(t.id, 'reject')}
                        className="px-2.5 py-1 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg text-xs font-semibold"
                      >
                        Reject
                      </button>
                    </div>
                  ) : (
                    <span className="text-gray-300 text-xs">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─── Technicians Tab ───────────────────────────────────────────────────────────
const TechniciansTab: React.FC<{ vendorId: string }> = ({ vendorId }) => {
  const [techs, setTechs]     = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ technicians: any[] }>(`/api/admin/vendors/${vendorId}/technicians`)
      .then(d => setTechs(d.technicians)).catch(console.error).finally(() => setLoading(false));
  }, [vendorId]);

  if (loading) return <div className="h-32 skeleton-shimmer rounded-2xl" />;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-premium overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-100">
          <tr>
            <th className="text-left px-5 py-3 font-semibold text-gray-600">Name</th>
            <th className="text-left px-5 py-3 font-semibold text-gray-600">Phone</th>
            <th className="text-left px-5 py-3 font-semibold text-gray-600">Specialization</th>
            <th className="text-left px-5 py-3 font-semibold text-gray-600">Joined</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {techs.length === 0 ? (
            <tr><td colSpan={4} className="text-center py-10 text-gray-400">No technicians found.</td></tr>
          ) : techs.map(t => (
            <tr key={t.id} className="hover:bg-gray-50/50">
              <td className="px-5 py-3 font-medium text-gray-900">{t.name}</td>
              <td className="px-5 py-3 text-gray-500">{t.phone || '—'}</td>
              <td className="px-5 py-3 text-gray-500">{t.specialization || '—'}</td>
              <td className="px-5 py-3 text-gray-400 text-xs">{t.createdAt?.slice(0, 10)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ─── Main AdminVendorView ──────────────────────────────────────────────────────
export const AdminVendorView: React.FC<Props> = ({ vendor, onBack }) => {
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const renderTab = () => {
    switch (activeTab) {
      case 'overview':    return <OverviewTab    vendorId={vendor.id} />;
      case 'products':    return <ProductsTab    vendorId={vendor.id} />;
      case 'orders':      return <OrdersTab      vendorId={vendor.id} />;
      case 'analytics':   return <OverviewTab    vendorId={vendor.id} />; // reuse overview stats
      case 'wallet':      return <WalletTab      vendorId={vendor.id} />;
      case 'technicians': return <TechniciansTab vendorId={vendor.id} />;
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-4 flex-wrap">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Vendors
        </button>

        {/* Admin view badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-[#0F2C59] text-white rounded-xl text-xs font-bold shadow-lg">
          <ShieldAlert className="w-3.5 h-3.5" />
          ADMIN VIEW — {vendor.name}
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit flex-wrap">
        {TABS.map(t => {
          const Icon = t.icon;
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                active ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {renderTab()}
    </div>
  );
};
