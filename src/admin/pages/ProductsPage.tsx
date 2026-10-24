import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Search, Trash2, Edit2, X, Package, Zap, Truck, Flame, TrendingDown, RefreshCw, MapPin } from 'lucide-react';

export const ProductsPage: React.FC = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [q, setQ] = useState('');
  const [fulfillmentFilter, setFulfillmentFilter] = useState('all');
  const [demandFilter, setDemandFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  // Edit Modal State
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [editPrice, setEditPrice] = useState<number>(0);
  const [editStock, setEditStock] = useState<number>(0);
  const [editStatus, setEditStatus] = useState<string>('active');
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    let url = `/api/admin/products?vertical=products&limit=100`;
    if (q) url += `&q=${encodeURIComponent(q)}`;
    api.get<{ products: any[] }>(url)
      .then(d => setProducts(d.products || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openEditModal = (p: any) => {
    setEditingProduct(p);
    setEditPrice(Number(p.basePrice || 0));
    setEditStock(Number(p.stock || 0));
    setEditStatus(p.status || 'active');
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    setSaving(true);
    try {
      const payload: any = {
        basePrice: editPrice,
        stock: editStock,
        status: editStatus,
      };

      await api.put(`/api/admin/products/${editingProduct.id || editingProduct._id}`, payload);
      setEditingProduct(null);
      load();
    } catch (err: any) {
      alert(err.message || 'Failed to update product');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}" from the catalog?`)) return;
    try {
      await api.delete(`/api/admin/products/${id}`);
      load();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const filtered = products.filter(p => {
    const matchesQ = !q || p.name.toLowerCase().includes(q.toLowerCase()) || p.vendor?.businessName?.toLowerCase().includes(q.toLowerCase());
    const matchesFulfillment = fulfillmentFilter === 'all' || p.fulfillmentType === fulfillmentFilter;
    
    const orderCount = p._count?.orderItems || 0;
    let matchesDemand = true;
    if (demandFilter === 'high') matchesDemand = orderCount >= 10;
    else if (demandFilter === 'moderate') matchesDemand = orderCount >= 3 && orderCount < 10;
    else if (demandFilter === 'low') matchesDemand = orderCount < 3;

    return matchesQ && matchesFulfillment && matchesDemand;
  });

  const quickCount = products.filter(p => p.fulfillmentType === 'quick_commerce').length;
  const highDemandCount = products.filter(p => (p._count?.orderItems || 0) >= 10).length;
  const lowDemandCount = products.filter(p => (p._count?.orderItems || 0) < 3).length;

  return (
    <div className="space-y-5 text-slate-800">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-heading flex items-center gap-2">
            <Package className="w-6 h-6 text-[#0F2C59]" />
            <span>Physical Products &amp; Catalog</span>
          </h1>
          <p className="text-sm text-gray-500">
            Monitor vendor inventory, analyze high/low demand products, and manage selling prices
          </p>
        </div>

        <button
          onClick={load}
          className="self-start sm:self-auto flex items-center gap-1.5 px-3.5 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors shadow-2xs cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Catalog</span>
        </button>
      </div>

      {/* Demand & Inventory KPI Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-premium">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Total Catalog Products</span>
          <span className="text-xl font-black text-gray-900 font-numbers mt-1 block">{products.length} SKUs</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-premium">
          <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600 block">⚡ Quick Commerce SKUs</span>
          <span className="text-xl font-black text-orange-700 font-numbers mt-1 block">{quickCount} Local Items</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-premium">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 block">🔥 High Demand (Top Sellers)</span>
          <span className="text-xl font-black text-emerald-700 font-numbers mt-1 block">{highDemandCount} High Runners</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-premium">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">💤 Low Demand / Stagnant</span>
          <span className="text-xl font-black text-slate-700 font-numbers mt-1 block">{lowDemandCount} Items</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-white p-3.5 rounded-2xl border border-gray-100 shadow-premium">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search by product title or vendor..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2C59]/20"
          />
        </div>

        {/* Fulfillment Channel Filter */}
        <select
          value={fulfillmentFilter}
          onChange={e => setFulfillmentFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-xl text-xs font-semibold bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#0F2C59]/20"
        >
          <option value="all">📦 All Fulfillment Channels</option>
          <option value="quick_commerce">⚡ Quick Commerce Hyperlocal</option>
          <option value="traditional">🚚 Pan-India Traditional</option>
        </select>

        {/* Demand Level Filter */}
        <select
          value={demandFilter}
          onChange={e => setDemandFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-xl text-xs font-semibold bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#0F2C59]/20"
        >
          <option value="all">📊 All Demand Levels</option>
          <option value="high">🔥 High Demand (10+ Orders)</option>
          <option value="moderate">⚡ Steady Demand (3-9 Orders)</option>
          <option value="low">💤 Low Demand (&lt;3 Orders)</option>
        </select>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-premium overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 border-b border-gray-100 text-gray-600 text-xs uppercase tracking-wider font-semibold">
            <tr>
              <th className="px-5 py-3.5">Product &amp; Category</th>
              <th className="px-5 py-3.5">Demand Level</th>
              <th className="px-5 py-3.5">Vendor &amp; City</th>
              <th className="px-5 py-3.5">Price</th>
              <th className="px-5 py-3.5">Stock</th>
              <th className="px-5 py-3.5">Fulfillment</th>
              <th className="px-5 py-3.5">Status</th>
              <th className="px-5 py-3.5">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}><td colSpan={8} className="px-5 py-4"><div className="h-4 skeleton-shimmer rounded" /></td></tr>
              ))
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-12 text-gray-400">No physical products found.</td></tr>
            ) : (
              filtered.map(p => {
                const ordersCount = p._count?.orderItems || 0;
                const isQuick = p.fulfillmentType === 'quick_commerce';
                const hasImg = p.images?.[0]?.url;

                return (
                  <tr key={p.id || p._id} className="hover:bg-gray-50/50">
                    {/* Product Name */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        {hasImg ? (
                          <img src={hasImg} alt={p.name} className="w-10 h-10 rounded-xl object-cover border border-gray-200 shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                            <Package className="w-5 h-5" />
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-gray-900 leading-snug">{p.name}</p>
                          <span className="text-[11px] text-gray-400">
                            {p.category?.name || 'General Product'} {p.brand ? `• ${p.brand}` : ''}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Demand Level Badge */}
                    <td className="px-5 py-4">
                      {ordersCount >= 10 ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 shadow-2xs">
                          <Flame className="w-3.5 h-3.5 text-orange-500 fill-orange-500" />
                          <span>High Demand ({ordersCount})</span>
                        </span>
                      ) : ordersCount >= 3 ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-200">
                          <Zap className="w-3 h-3 text-indigo-500" />
                          <span>Steady ({ordersCount})</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
                          <TrendingDown className="w-3 h-3 text-slate-400" />
                          <span>Low ({ordersCount})</span>
                        </span>
                      )}
                    </td>

                    {/* Vendor & Location */}
                    <td className="px-5 py-4">
                      <p className="font-semibold text-gray-800 text-xs">{p.vendor?.businessName || 'Platform Vendor'}</p>
                      <span className="inline-flex items-center gap-1 text-[10px] text-gray-400 mt-0.5">
                        <MapPin className="w-3 h-3 text-red-400" />
                        <span>{p.vendor?.city || 'Local Hub'}</span>
                      </span>
                    </td>

                    {/* Price */}
                    <td className="px-5 py-4 font-numbers font-black text-gray-900">
                      ₹{p.basePrice}
                    </td>

                    {/* Stock */}
                    <td className="px-5 py-4">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                        p.isOutOfStock || p.stock === 0 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'
                      }`}>
                        {p.isOutOfStock || p.stock === 0 ? 'Out of Stock' : `${p.stock} units`}
                      </span>
                    </td>

                    {/* Fulfillment */}
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                        isQuick
                          ? 'bg-orange-50 text-orange-700 border-orange-200'
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                      }`}>
                        {isQuick ? <Zap className="w-3 h-3 text-orange-500" /> : <Truck className="w-3 h-3 text-blue-500" />}
                        <span>{isQuick ? 'Quick Commerce' : 'Pan-India'}</span>
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4">
                      <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                        p.status === 'active' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-gray-100 border-gray-200 text-gray-600'
                      }`}>
                        {p.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => openEditModal(p)}
                          className="p-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors cursor-pointer"
                          title="Edit Price & Inventory"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(p.id || p._id, p.name)}
                          className="p-1.5 rounded-lg text-red-600 bg-red-50 hover:bg-red-100 transition-colors cursor-pointer"
                          title="Delete Product"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Admin Edit Modal (with Timing Slots Manager for Services) */}
      {editingProduct && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <form
            onSubmit={handleSaveProduct}
            className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4 my-8 max-h-[90vh] overflow-y-auto border border-gray-100"
          >
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-bold text-gray-900 text-lg">Edit Catalog Item</h3>
                <p className="text-xs text-gray-500 truncate max-w-sm">{editingProduct.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Base Price (₹)</label>
                <input
                  type="number"
                  required
                  value={editPrice}
                  onChange={e => setEditPrice(Number(e.target.value))}
                  className="w-full px-3 py-2 border rounded-xl text-sm font-numbers"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Inventory / Capacity</label>
                <input
                  type="number"
                  required
                  value={editStock}
                  onChange={e => setEditStock(Number(e.target.value))}
                  className="w-full px-3 py-2 border rounded-xl text-sm font-numbers"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Product Status</label>
              <select
                value={editStatus}
                onChange={e => setEditStatus(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl text-sm bg-white"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div className="flex gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="flex-1 py-2.5 border rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-2.5 bg-[#0F2C59] hover:bg-[#1a3d73] text-white rounded-xl text-sm font-bold shadow-md disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
