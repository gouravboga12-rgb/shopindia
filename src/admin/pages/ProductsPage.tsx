import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Search, Trash2, Edit2, Clock, X } from 'lucide-react';

export const ProductsPage: React.FC = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);

  // Edit Modal State
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [editPrice, setEditPrice] = useState<number>(0);
  const [editStock, setEditStock] = useState<number>(0);
  const [editStatus, setEditStatus] = useState<string>('active');
  const [editDuration, setEditDuration] = useState<string>('45-90 min');
  const [editSlots, setEditSlots] = useState<string[]>([]);
  const [newSlotText, setNewSlotText] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    api.get<{ products: any[] }>(`/api/admin/products?q=${q}`)
      .then(d => setProducts(d.products))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openEditModal = (p: any) => {
    setEditingProduct(p);
    setEditPrice(Number(p.basePrice || 0));
    setEditStock(Number(p.stock || 0));
    setEditStatus(p.status || 'active');
    setEditDuration(p.durationEstimate || '45-90 min');
    setEditSlots(p.serviceSlots && p.serviceSlots.length > 0 ? p.serviceSlots : ['08:00 AM', '10:00 AM', '01:00 PM', '04:00 PM', '06:00 PM']);
    setNewSlotText('');
  };

  const handleAddSlot = (slotToAdd?: string) => {
    const slot = (slotToAdd || newSlotText).trim();
    if (!slot) return;
    if (!editSlots.includes(slot)) {
      setEditSlots(prev => [...prev, slot]);
    }
    if (!slotToAdd) setNewSlotText('');
  };

  const handleRemoveSlot = (slotToRemove: string) => {
    setEditSlots(prev => prev.filter(s => s !== slotToRemove));
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    setSaving(true);
    try {
      const isService = editingProduct.fulfillmentType === 'hvac' || editingProduct.fulfillmentType === 'hvac_service' ||
        (editingProduct.tags && (editingProduct.tags.includes('home_service') || editingProduct.tags.includes('vehicle_service')));

      const payload: any = {
        basePrice: editPrice,
        stock: editStock,
        status: editStatus,
      };

      if (isService) {
        payload.durationEstimate = editDuration;
        payload.serviceSlots = editSlots;
      }

      await api.put(`/api/admin/products/${editingProduct.id || editingProduct._id}`, payload);
      setEditingProduct(null);
      load();
    } catch (err: any) {
      alert(err.message || 'Failed to update product');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      await api.delete(`/api/admin/products/${id}`);
      load();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const filtered = products.filter(p => !q || p.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Product &amp; Catalog Management</h1>
          <p className="text-sm text-gray-500">Monitor and curate marketplace catalog products</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search products..."
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2C59]/20"
          />
        </div>
        <button onClick={load} className="px-4 py-2.5 bg-[#0F2C59] text-white rounded-xl text-sm font-medium hover:bg-[#1a3d73] transition-colors">
          Search
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-premium overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 border-b border-gray-100 text-gray-600">
            <tr>
              <th className="px-5 py-3.5 font-semibold">Product</th>
              <th className="px-5 py-3.5 font-semibold">Vendor</th>
              <th className="px-5 py-3.5 font-semibold">Price</th>
              <th className="px-5 py-3.5 font-semibold">Stock</th>
              <th className="px-5 py-3.5 font-semibold">Type</th>
              <th className="px-5 py-3.5 font-semibold">Status</th>
              <th className="px-5 py-3.5 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i}><td colSpan={7} className="px-5 py-4"><div className="h-4 skeleton-shimmer rounded" /></td></tr>
              ))
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12 text-gray-400">No products found.</td></tr>
            ) : (
              filtered.map(p => (
                <tr key={p.id || p._id} className="hover:bg-gray-50/50">
                  <td className="px-5 py-4 font-semibold text-gray-900">{p.name}</td>
                  <td className="px-5 py-4 text-gray-600">{p.vendor?.businessName || '—'}</td>
                  <td className="px-5 py-4 font-numbers font-medium text-gray-900">₹{p.basePrice}</td>
                  <td className="px-5 py-4">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded ${p.isOutOfStock ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                      {p.isOutOfStock ? 'Out of Stock' : `${p.stock} units`}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="capitalize text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-md">
                      {p.fulfillmentType?.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${p.status === 'active' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-gray-100 border-gray-200 text-gray-600'}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => openEditModal(p)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          p.fulfillmentType === 'hvac' || p.fulfillmentType === 'hvac_service'
                            ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                            : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                        }`}
                        title={
                          p.fulfillmentType === 'hvac' || p.fulfillmentType === 'hvac_service'
                            ? 'Edit Service & Timing Slots'
                            : 'Edit Product'
                        }
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(p.id || p._id)}
                        className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                        title="Delete Product"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
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

            {/* Service-Specific Timing Slots & Duration Config */}
            {(editingProduct.fulfillmentType === 'hvac' ||
              editingProduct.fulfillmentType === 'hvac_service' ||
              (editingProduct.tags &&
                (editingProduct.tags.includes('home_service') ||
                  editingProduct.tags.includes('vehicle_service')))) && (
              <div className="p-4 bg-amber-50/70 rounded-2xl border border-amber-200/80 space-y-3.5">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span>Service Duration & Admin Timing Slots</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Service Duration Estimate (Customer Badge)
                  </label>
                  <input
                    value={editDuration}
                    onChange={e => setEditDuration(e.target.value)}
                    placeholder="e.g. 45-90 min"
                    className="w-full px-3 py-1.5 bg-white border border-amber-200 rounded-xl text-xs focus:ring-1 focus:ring-amber-500"
                  />
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {['30-45 min', '45-90 min', '1-2 hrs', '2-3 hrs'].map(preset => (
                      <button
                        type="button"
                        key={preset}
                        onClick={() => setEditDuration(preset)}
                        className={`text-[10px] px-2 py-0.5 rounded-full border transition-all ${
                          editDuration === preset
                            ? 'bg-amber-600 text-white border-amber-600 font-bold'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-amber-300'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-gray-700">
                      Available Time Slots ({editSlots.length})
                    </label>
                    <span className="text-[10px] text-gray-500">Live booking slots for customers</span>
                  </div>

                  {/* Active Chips */}
                  <div className="flex flex-wrap gap-1.5 mb-2.5 min-h-[38px] p-2 bg-white rounded-xl border border-amber-200">
                    {editSlots.length === 0 ? (
                      <span className="text-xs text-red-500 italic">No slots defined. Add at least one slot.</span>
                    ) : (
                      editSlots.map(slot => (
                        <span
                          key={slot}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300"
                        >
                          {slot}
                          <button
                            type="button"
                            onClick={() => handleRemoveSlot(slot)}
                            className="text-amber-700 hover:text-red-600 p-0.5"
                            title="Remove slot"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))
                    )}
                  </div>

                  {/* Add Slot Input */}
                  <div className="flex gap-2">
                    <input
                      value={newSlotText}
                      onChange={e => setNewSlotText(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddSlot();
                        }
                      }}
                      placeholder="e.g. 09:30 AM or 05:00 PM"
                      className="flex-1 px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-amber-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddSlot()}
                      className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs"
                    >
                      + Add Slot
                    </button>
                  </div>

                  {/* Quick-add presets */}
                  <div className="mt-2">
                    <span className="text-[10px] text-gray-500 block mb-1">Quick Add Common Slots:</span>
                    <div className="flex flex-wrap gap-1">
                      {['08:00 AM', '10:00 AM', '12:00 PM', '01:00 PM', '02:00 PM', '04:00 PM', '06:00 PM', '08:00 PM'].map(
                        preset => {
                          const exists = editSlots.includes(preset);
                          return (
                            <button
                              type="button"
                              key={preset}
                              onClick={() => handleAddSlot(preset)}
                              disabled={exists}
                              className={`text-[10px] px-2 py-0.5 rounded-md border transition-all ${
                                exists
                                  ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-50'
                                  : 'bg-white text-gray-700 border-gray-200 hover:border-amber-400 hover:text-amber-700'
                              }`}
                            >
                              + {preset}
                            </button>
                          );
                        }
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

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
