import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Plus, Edit2, Trash2, Search, Clock, X } from 'lucide-react';

export const VendorProducts: React.FC = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  const [modal, setModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [price, setPrice] = useState<number>(0);
  const [stock, setStock] = useState<number>(10);
  const [fulfillmentType, setFulfillmentType] = useState('traditional');
  const [subVertical, setSubVertical] = useState('grocery');
  const [isVeg, setIsVeg] = useState(true);
  const [isRx, setIsRx] = useState(false);
  const [vehicleType, setVehicleType] = useState('car');
  const [categoryId, setCategoryId] = useState('');
  const [categories, setCategories] = useState<any[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Service Timing Slots & Duration
  const [serviceSlots, setServiceSlots] = useState<string[]>(['08:00 AM', '10:00 AM', '01:00 PM', '04:00 PM', '06:00 PM']);
  const [durationEstimate, setDurationEstimate] = useState('45-90 min');
  const [newSlotInput, setNewSlotInput] = useState('');

  const load = () => {
    setLoading(true);
    api.get<{ products: any[] }>('/api/vendor/products')
      .then(d => setProducts(d.products))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    api.get<any[]>('/api/categories')
      .then(setCategories)
      .catch(console.error);
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setName(''); setBrand(''); setPrice(0); setStock(10);
    setFulfillmentType('traditional'); setSubVertical('grocery');
    setIsVeg(true); setIsRx(false); setVehicleType('car');
    setCategoryId(''); setImageFile(null);
    setServiceSlots(['08:00 AM', '10:00 AM', '01:00 PM', '04:00 PM', '06:00 PM']);
    setDurationEstimate('45-90 min');
    setNewSlotInput('');
  };

  const handleAddSlot = (slotToAdd?: string) => {
    const slot = (slotToAdd || newSlotInput).trim();
    if (!slot) return;
    if (!serviceSlots.includes(slot)) {
      setServiceSlots(prev => [...prev, slot]);
    }
    if (!slotToAdd) setNewSlotInput('');
  };

  const handleRemoveSlot = (slotToRemove: string) => {
    setServiceSlots(prev => prev.filter(s => s !== slotToRemove));
  };

  const openAdd = () => { resetForm(); setModal(true); };

  const openEdit = (p: any) => {
    setEditingId(p.id || p._id);
    setName(p.name);
    setBrand(p.brand || '');
    setPrice(Number(p.basePrice || 0));
    setStock(Number(p.stock || 0));
    setFulfillmentType(p.fulfillmentType || 'traditional');

    // Infer subVertical from tags
    const tags = p.tags || [];
    if (tags.includes('food')) setSubVertical('food');
    else if (tags.includes('pharmacy')) setSubVertical('pharmacy');
    else if (tags.includes('vehicle_service')) setSubVertical('vehicle_service');
    else if (tags.includes('home_service')) setSubVertical('home_service');
    else if (p.fulfillmentType === 'quick_commerce') setSubVertical('grocery');
    else setSubVertical('retail');

    setIsVeg(!tags.includes('Non-Veg'));
    setIsRx(tags.includes('rx'));
    setVehicleType(tags.includes('bike') ? 'bike' : 'car');
    setCategoryId(p.categoryId || '');
    setImageFile(null);

    // Populate service timing slots & duration if present
    if (p.serviceSlots && p.serviceSlots.length > 0) {
      setServiceSlots(p.serviceSlots);
    } else {
      setServiceSlots(['08:00 AM', '10:00 AM', '01:00 PM', '04:00 PM', '06:00 PM']);
    }
    setDurationEstimate(p.durationEstimate || '45-90 min');
    setNewSlotInput('');

    setModal(true);
  };

  const toggleStock = async (id: string, currentOut: boolean) => {
    try {
      await api.patch(`/api/vendor/products/${id}/stock`, { isOutOfStock: !currentOut });
      load();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleImageUpload = async (): Promise<string> => {
    if (!imageFile) return '';
    setUploading(true);
    const formData = new FormData();
    formData.append('image', imageFile);
    const token = localStorage.getItem('shopindia_vendor_token') || localStorage.getItem('shopindia_admin_token');
    const API_BASE = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '') : '';
    const uploadRes = await fetch(`${API_BASE}/api/vendor/products/upload-image`, {
      method: 'POST',
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: formData
    });
    if (!uploadRes.ok) {
      const errData = await uploadRes.json().catch(() => ({}));
      throw new Error(errData.error || `Upload failed (HTTP ${uploadRes.status})`);
    }
    const uploadData = await uploadRes.json();
    setUploading(false);
    return uploadData.url;
  };

  const saveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Find category object if selected
      const selectedCat = categories.find((c: any) => c.id === categoryId);

      // Build tags matching the sub-vertical
      const tags: string[] = [subVertical];
      if (selectedCat) tags.push(selectedCat.name);
      if (subVertical === 'food') tags.push(isVeg ? 'Veg' : 'Non-Veg');
      if (subVertical === 'pharmacy' && isRx) tags.push('rx');
      if (subVertical === 'vehicle_service') tags.push(vehicleType);

      // Determine fulfillment type
      let finalFulfillment = fulfillmentType;
      if (subVertical === 'grocery' || subVertical === 'food' || subVertical === 'pharmacy') {
        finalFulfillment = 'quick_commerce';
      } else if (subVertical === 'home_service' || subVertical === 'vehicle_service') {
        finalFulfillment = 'hvac_service';
      } else {
        finalFulfillment = 'traditional';
      }

      const payload: any = {
        name,
        brand: brand || undefined,
        basePrice: price,
        stock,
        fulfillmentType: finalFulfillment,
        tags,
      };
      if (subVertical === 'home_service' || subVertical === 'vehicle_service') {
        payload.serviceSlots = serviceSlots;
        payload.durationEstimate = durationEstimate;
      }
      if (categoryId) payload.categoryId = categoryId;
      let imageUrl = '';
      if (imageFile) imageUrl = await handleImageUpload();
      if (imageUrl) payload.images = [imageUrl];

      if (editingId) {
        await api.put(`/api/vendor/products/${editingId}`, payload);
      } else {
        await api.post('/api/vendor/products', payload);
      }

      setModal(false);
      resetForm();
      load();
    } catch (err: any) {
      setUploading(false);
      alert(err.message);
    }
  };

  const deleteProduct = async (id: string) => {
    if (!confirm('Delete this product? It will be removed from the catalog.')) return;
    try {
      await api.delete(`/api/vendor/products/${id}`);
      load();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const filtered = products.filter(p => !q || p.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory & Products</h1>
          <p className="text-sm text-gray-500">Manage catalog, pricing, variants, and stock status (FR-02.2)</p>
        </div>
        <button
          onClick={openAdd}
          className="px-4 py-2 bg-[#10B981] text-white rounded-xl text-sm font-semibold flex items-center gap-2 hover:bg-[#059669]"
        >
          <Plus className="w-4 h-4" /> Add Product
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search products..."
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2C59]/20 bg-white"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-premium overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 border-b border-gray-100 text-gray-600">
            <tr>
              <th className="px-5 py-3.5 font-semibold">Product Name</th>
              <th className="px-5 py-3.5 font-semibold">Price</th>
              <th className="px-5 py-3.5 font-semibold">Stock</th>
              <th className="px-5 py-3.5 font-semibold">Channel</th>
              <th className="px-5 py-3.5 font-semibold">Stock Status</th>
              <th className="px-5 py-3.5 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i}><td colSpan={6} className="px-5 py-4"><div className="h-4 skeleton-shimmer rounded" /></td></tr>
              ))
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-10 text-gray-400">No matching products found.</td></tr>
            ) : filtered.map(p => (
              <tr key={p.id || p._id} className="hover:bg-gray-50/50">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    {p.images?.[0]?.url && <img src={p.images[0].url} alt="" className="w-10 h-10 rounded-lg object-cover border border-gray-100" />}
                    <span className="font-semibold text-gray-900">{p.name}</span>
                  </div>
                </td>
                <td className="px-5 py-4 font-numbers font-medium text-gray-900">₹{p.basePrice}</td>
                <td className="px-5 py-4 font-numbers text-gray-600">{p.stock} units</td>
                <td className="px-5 py-4 capitalize text-xs font-medium text-gray-500">{p.fulfillmentType?.replace('_', ' ')}</td>
                <td className="px-5 py-4">
                  <button
                    onClick={() => toggleStock(p.id || p._id, p.isOutOfStock || p.stock <= 0)}
                    className={`text-xs font-semibold px-3 py-1 rounded-full border transition-all ${(p.isOutOfStock || p.stock <= 0) ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}
                  >
                    {(p.isOutOfStock || p.stock <= 0) ? 'Mark In-Stock' : 'In Stock (Click to Mark Out)'}
                  </button>
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => openEdit(p)} title="Edit" className="p-2 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => deleteProduct(p.id || p._id)} title="Delete" className="p-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <form onSubmit={saveProduct} className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 my-8 max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-gray-900 text-lg border-b pb-2">{editingId ? 'Edit Product / Service' : 'Add New Product / Service'}</h3>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Target Sub-Vertical / Module</label>
              <select
                value={subVertical}
                onChange={e => {
                  const val = e.target.value;
                  setSubVertical(val);
                  if (val === 'grocery' || val === 'food' || val === 'pharmacy') setFulfillmentType('quick_commerce');
                  else if (val === 'home_service' || val === 'vehicle_service') setFulfillmentType('hvac_service');
                  else setFulfillmentType('traditional');
                }}
                className="w-full px-3 py-2 border rounded-xl text-sm font-semibold bg-slate-50"
              >
                <optgroup label="⚡ Quick Commerce">
                  <option value="grocery">⚡ Instant Grocery (10-20 Mins)</option>
                  <option value="food">🍔 Food Delivery (Restaurant & Kitchen)</option>
                  <option value="pharmacy">💊 Pharmacy & Healthcare</option>
                </optgroup>
                <optgroup label="🛠️ Services Marketplace">
                  <option value="home_service">🏠 Home Services ( Company Style)</option>
                  <option value="vehicle_service">🚗 Vehicle Services (Technician Care)</option>
                </optgroup>
                <optgroup label="🛒 E-Commerce">
                  <option value="retail">🛍️ Traditional Shopping (Courier)</option>
                </optgroup>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Title / Service Name</label>
              <input required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Hyderabadi Dum Biryani / AC Jet Service" className="w-full px-3 py-2 border rounded-xl text-sm" />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Brand / Restaurant / Provider Name</label>
              <input value={brand} onChange={e => setBrand(e.target.value)} placeholder="e.g. Behrouz Biryani / AutoTech / Farm Fresh" className="w-full px-3 py-2 border rounded-xl text-sm" />
            </div>

            {/* Specialized Sub-Vertical Toggles */}
            {subVertical === 'food' && (
              <div className="p-3 bg-orange-50 rounded-xl border border-orange-200 flex items-center justify-between text-xs">
                <span className="font-semibold text-orange-900">Dietary Type:</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsVeg(true)}
                    className={`px-3 py-1 rounded-lg font-bold ${isVeg ? 'bg-emerald-600 text-white' : 'bg-white text-gray-600'}`}
                  >
                    Veg 🌱
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsVeg(false)}
                    className={`px-3 py-1 rounded-lg font-bold ${!isVeg ? 'bg-red-600 text-white' : 'bg-white text-gray-600'}`}
                  >
                    Non-Veg 🍗
                  </button>
                </div>
              </div>
            )}

            {subVertical === 'pharmacy' && (
              <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 flex items-center justify-between text-xs">
                <span className="font-semibold text-blue-900">Requires Doctor's Prescription (Rx)?</span>
                <input
                  type="checkbox"
                  checked={isRx}
                  onChange={e => setIsRx(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
              </div>
            )}

            {subVertical === 'vehicle_service' && (
              <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-200 flex items-center justify-between text-xs">
                <span className="font-semibold text-indigo-900">Applicable Vehicle:</span>
                <select
                  value={vehicleType}
                  onChange={e => setVehicleType(e.target.value)}
                  className="px-2 py-1 bg-white border rounded-lg text-xs"
                >
                  <option value="car">4-Wheeler (Car)</option>
                  <option value="bike">2-Wheeler (Bike)</option>
                  <option value="both">Both (Car & Bike)</option>
                </select>
              </div>
            )}

            {/* Service Timing Slots & Duration Config */}
            {(subVertical === 'home_service' || subVertical === 'vehicle_service') && (
              <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-200/80 space-y-3">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span>Service Duration & Customer Booking Slots</span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Duration Estimate (Shown on Service Card)
                  </label>
                  <input
                    value={durationEstimate}
                    onChange={e => setDurationEstimate(e.target.value)}
                    placeholder="e.g. 45-90 min or 1-2 hours"
                    className="w-full px-3 py-1.5 bg-white border border-amber-200 rounded-xl text-xs focus:ring-1 focus:ring-amber-500"
                  />
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {['30-45 min', '45-90 min', '1-2 hrs', '2-3 hrs'].map(preset => (
                      <button
                        type="button"
                        key={preset}
                        onClick={() => setDurationEstimate(preset)}
                        className={`text-[10px] px-2 py-0.5 rounded-full border transition-all ${
                          durationEstimate === preset
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
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-medium text-gray-700">
                      Available Time Slots ({serviceSlots.length})
                    </label>
                    <span className="text-[10px] text-gray-500">Customers select from these slots</span>
                  </div>

                  {/* Active Slots Chips */}
                  <div className="flex flex-wrap gap-1.5 mb-2 min-h-[36px] p-2 bg-white/80 rounded-xl border border-amber-200">
                    {serviceSlots.length === 0 ? (
                      <span className="text-xs text-red-500 italic">No slots added. Add at least one slot.</span>
                    ) : (
                      serviceSlots.map(slot => (
                        <span
                          key={slot}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-xs"
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

                  {/* Custom Slot Input */}
                  <div className="flex gap-2">
                    <input
                      value={newSlotInput}
                      onChange={e => setNewSlotInput(e.target.value)}
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
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs"
                    >
                      + Add Slot
                    </button>
                  </div>

                  {/* Quick-add suggestions */}
                  <div className="mt-2">
                    <span className="text-[10px] text-gray-500 block mb-1">Quick Add Common Slots:</span>
                    <div className="flex flex-wrap gap-1">
                      {['08:00 AM', '10:00 AM', '12:00 PM', '01:00 PM', '02:00 PM', '04:00 PM', '06:00 PM', '08:00 PM'].map(
                        preset => {
                          const exists = serviceSlots.includes(preset);
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

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Price (₹)</label>
                <input type="number" required value={price} onChange={e => setPrice(Number(e.target.value))} className="w-full px-3 py-2 border rounded-xl text-sm font-numbers" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Available Units / Capacity</label>
                <input type="number" required value={stock} onChange={e => setStock(Number(e.target.value))} className="w-full px-3 py-2 border rounded-xl text-sm font-numbers" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Category</label>
              <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-sm">
                <option value="">Select Category (Aisle)</option>
                {categories
                  .filter((c: any) => {
                    const v = (c.vertical || '').toLowerCase();
                    if (subVertical === 'grocery') return v === 'quick_grocery' || v === 'quick';
                    if (subVertical === 'food') return v === 'quick_food';
                    if (subVertical === 'pharmacy') return v === 'quick_pharmacy';
                    if (subVertical === 'home_service') return v === 'services_home' || v === 'services';
                    if (subVertical === 'vehicle_service') return v === 'services_vehicle';
                    return v === 'shop';
                  })
                  .map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Product / Banner Image</label>
              <input type="file" accept="image/*" onChange={e => setImageFile(e.target.files?.[0] || null)} className="w-full px-3 py-2 border rounded-xl text-sm file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100" />
            </div>

            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => { setModal(false); resetForm(); }} className="flex-1 py-2.5 border rounded-xl text-sm font-semibold text-gray-600" disabled={uploading}>Cancel</button>
              <button type="submit" disabled={uploading} className="flex-1 py-2.5 bg-[#10B981] text-white rounded-xl text-sm font-bold hover:bg-[#059669] shadow-md shadow-emerald-500/20 disabled:opacity-50">
                {uploading ? 'Uploading...' : editingId ? 'Save Changes' : 'Publish Product'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};