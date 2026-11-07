import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Plus, Edit2, Trash2, Search, X, Package, Zap, ShoppingBag, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

export const VendorProducts: React.FC = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  
  // Section / Channel Tab: 'all' | 'traditional' | 'quick_commerce'
  const [activeTab, setActiveTab] = useState<'traditional' | 'quick_commerce' | 'all'>('traditional');
  const [traditionalCount, setTraditionalCount] = useState<number>(0);
  const [quickCount, setQuickCount] = useState<number>(0);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Modal State
  const [modal, setModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [price, setPrice] = useState<number>(0);
  const [stock, setStock] = useState<number>(10);
  const [fulfillmentType, setFulfillmentType] = useState<'traditional' | 'quick_commerce'>('traditional');
  const [subType, setSubType] = useState<'retail' | 'grocery' | 'food' | 'pharmacy'>('retail');
  const [isVeg, setIsVeg] = useState(true);
  const [isRx, setIsRx] = useState(false);
  const [categoryId, setCategoryId] = useState('');
  const [categories, setCategories] = useState<any[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [existingImage, setExistingImage] = useState<string>('');
  const [uploading, setUploading] = useState(false);

  // Dynamic Pricing Engine Fields
  const [vendorPrice, setVendorPrice] = useState<number>(0);
  const [mrp, setMrp] = useState<number>(0);
  const [pricePreview, setPricePreview] = useState<any>(null);

  const load = () => {
    setLoading(true);
    let url = `/api/vendor/products?limit=100`;
    if (activeTab !== 'all') {
      url += `&channel=${activeTab}`;
    }
    if (q) url += `&q=${encodeURIComponent(q)}`;

    api.get<{
      products: any[];
      total: number;
      traditionalCount: number;
      quickCount: number;
    }>(url)
      .then(d => {
        setProducts(d.products || []);
        if (d.traditionalCount !== undefined) setTraditionalCount(d.traditionalCount);
        if (d.quickCount !== undefined) setQuickCount(d.quickCount);
        if (d.total !== undefined) setTotalCount(d.total);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [activeTab]);

  // Load active categories created by Admin
  useEffect(() => {
    api.get<any[]>('/api/categories')
      .then(res => setCategories(Array.isArray(res) ? res : []))
      .catch(console.error);
  }, []);

  // Live preview pricing resolution
  useEffect(() => {
    const val = Number(vendorPrice) || Number(price);
    if (val > 0) {
      api.post('/api/vendor/products/preview-price', {
        vendorPrice: val,
        mrp: mrp > 0 ? mrp : null,
        categoryId: categoryId || undefined
      }).then((res: any) => {
        if (res?.pricing) setPricePreview(res.pricing);
      }).catch(() => {
        const comm = Math.round(val * 0.1);
        const buf = Math.round(val * 0.0236);
        const cust = val + comm + buf;
        setPricePreview({
          customerPrice: cust,
          platformFee: comm + buf,
          commissionPct: 10,
          mrpExceeded: mrp > 0 && cust > mrp
        });
      });
    } else {
      setPricePreview(null);
    }
  }, [vendorPrice, price, mrp, categoryId]);

  const resetForm = () => {
    setEditingId(null);
    setName(''); setBrand(''); setPrice(0); setStock(10);
    setVendorPrice(0); setMrp(0); setPricePreview(null);
    // Default modal channel matches active section tab if specific
    const initialChannel = activeTab === 'quick_commerce' ? 'quick_commerce' : 'traditional';
    setFulfillmentType(initialChannel);
    setSubType(initialChannel === 'quick_commerce' ? 'grocery' : 'retail');
    setIsVeg(true); setIsRx(false);
    setCategoryId(''); setImageFile(null); setExistingImage('');
  };

  const openAdd = () => { resetForm(); setModal(true); };

  const openEdit = (p: any) => {
    setEditingId(p.id || p._id);
    setName(p.name || '');
    setBrand(p.brand || '');
    setPrice(Number(p.basePrice || 0));
    setVendorPrice(Number(p.vendorPrice || p.basePrice || 0));
    setMrp(Number(p.mrp || 0));
    setStock(Number(p.stock || 0));
    
    const channel = p.fulfillmentType === 'quick_commerce' ? 'quick_commerce' : 'traditional';
    setFulfillmentType(channel);

    const tags = p.tags || [];
    if (tags.includes('food')) setSubType('food');
    else if (tags.includes('pharmacy')) setSubType('pharmacy');
    else if (channel === 'quick_commerce') setSubType('grocery');
    else setSubType('retail');

    setIsVeg(!tags.includes('Non-Veg'));
    setIsRx(tags.includes('rx'));
    setCategoryId(p.categoryId || '');
    setImageFile(null);
    setExistingImage(p.images?.[0]?.url || '');
    setModal(true);
  };

  const toggleStock = async (id: string, currentOut: boolean) => {
    try {
      await api.patch(`/api/vendor/products/${id}/stock`, { isOutOfStock: !currentOut });
      load();
    } catch (err: any) {
      alert(err.message || 'Failed to update stock');
    }
  };

  const handleImageUpload = async (): Promise<string> => {
    if (!imageFile) return existingImage;
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
      const selectedCat = categories.find((c: any) => c.id === categoryId);

      // Build tags
      const tags: string[] = [subType];
      if (selectedCat) tags.push(selectedCat.name);
      if (fulfillmentType === 'quick_commerce' && subType === 'food') {
        tags.push(isVeg ? 'Veg' : 'Non-Veg');
      }
      if (fulfillmentType === 'quick_commerce' && subType === 'pharmacy' && isRx) {
        tags.push('rx');
      }

      const payload: any = {
        name,
        brand: brand || undefined,
        basePrice: price,
        vendorPrice: vendorPrice > 0 ? vendorPrice : price,
        mrp: mrp > 0 ? mrp : undefined,
        stock,
        fulfillmentType,
        tags,
      };

      if (categoryId) payload.categoryId = categoryId;
      
      let imageUrl = existingImage;
      if (imageFile) {
        imageUrl = await handleImageUpload();
      }
      if (imageUrl) {
        payload.images = [imageUrl];
      }

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
      alert(err.message || 'Failed to save product');
    }
  };

  const deleteProduct = async (id: string, prodName: string) => {
    if (!confirm(`Are you sure you want to delete "${prodName}"? It will be removed from your catalog.`)) return;
    try {
      await api.delete(`/api/vendor/products/${id}`);
      load();
    } catch (err: any) {
      alert(err.message || 'Failed to delete product');
    }
  };

  // Filtered categories for dropdown
  const filteredCategories = categories.filter((c: any) => {
    const v = (c.vertical || '').toLowerCase();
    if (fulfillmentType === 'traditional') {
      return v === 'shop' || (!v.startsWith('quick') && !v.startsWith('services'));
    }
    // Quick Commerce
    if (subType === 'food') return v === 'quick_food' || v.includes('food');
    if (subType === 'pharmacy') return v === 'quick_pharmacy' || v.includes('pharmacy');
    return v === 'quick_grocery' || v === 'quick' || v.startsWith('quick');
  });

  const filtered = products.filter(p => !q || p.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-6">
      {/* Page Title & Add Product Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Package className="w-6 h-6 text-[#10B981]" />
            <span>Products &amp; Stock Inventory</span>
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage your physical products, pricing, stock levels, and fulfillment channels
          </p>
        </div>

        <button
          onClick={openAdd}
          className="self-start sm:self-auto px-4 py-2.5 bg-[#10B981] hover:bg-[#059669] text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Add Product
        </button>
      </div>

      {/* Two Prominent Clickable Sections / Channel Tabs */}
      <div className="bg-white p-2 rounded-2xl border border-gray-100 shadow-sm flex flex-wrap gap-2">
        <button
          onClick={() => setActiveTab('traditional')}
          className={`flex-1 min-w-[200px] flex items-center justify-between px-5 py-3.5 rounded-xl font-bold text-sm transition-all cursor-pointer ${
            activeTab === 'traditional'
              ? 'bg-[#0F2C59] text-white shadow-md'
              : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="w-5 h-5 text-indigo-400" />
            <div className="text-left">
              <div className="leading-tight">Shop India Products</div>
              <div className={`text-[11px] font-normal ${activeTab === 'traditional' ? 'text-gray-300' : 'text-gray-500'}`}>
                Courier &amp; Pan-India Delivery
              </div>
            </div>
          </div>
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-numbers font-black ${
            activeTab === 'traditional' ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'
          }`}>
            {traditionalCount}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('quick_commerce')}
          className={`flex-1 min-w-[200px] flex items-center justify-between px-5 py-3.5 rounded-xl font-bold text-sm transition-all cursor-pointer ${
            activeTab === 'quick_commerce'
              ? 'bg-amber-500 text-white shadow-md'
              : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Zap className="w-5 h-5 text-yellow-200" />
            <div className="text-left">
              <div className="leading-tight">Quick Shopping</div>
              <div className={`text-[11px] font-normal ${activeTab === 'quick_commerce' ? 'text-amber-100' : 'text-gray-500'}`}>
                Hyperlocal (10-20 Mins / 5-10 Km Radius)
              </div>
            </div>
          </div>
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-numbers font-black ${
            activeTab === 'quick_commerce' ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'
          }`}>
            {quickCount}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-3.5 rounded-xl font-bold text-sm transition-all cursor-pointer ${
            activeTab === 'all'
              ? 'bg-gray-900 text-white'
              : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
          }`}
        >
          All SKUs ({totalCount})
        </button>
      </div>

      {/* Search and Refresh Bar */}
      <div className="flex items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-gray-100 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder={`Search ${activeTab === 'traditional' ? 'Shop India' : activeTab === 'quick_commerce' ? 'Quick Shopping' : 'all'} products...`}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#10B981]/20 bg-gray-50/50"
          />
        </div>

        <button
          onClick={load}
          className="flex items-center gap-1.5 px-3.5 py-2 border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50/80 border-b border-gray-100 text-gray-600 text-xs uppercase tracking-wider font-semibold">
            <tr>
              <th className="px-5 py-3.5">Product &amp; Category</th>
              <th className="px-5 py-3.5">Channel</th>
              <th className="px-5 py-3.5">Pricing</th>
              <th className="px-5 py-3.5">Stock</th>
              <th className="px-5 py-3.5">Stock Status</th>
              <th className="px-5 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i}><td colSpan={6} className="px-5 py-5"><div className="h-4 bg-gray-100 animate-pulse rounded" /></td></tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-gray-400">
                  <div className="flex flex-col items-center justify-center">
                    <Package className="w-10 h-10 text-gray-300 mb-2" />
                    <p className="font-medium text-gray-600">No products found in this section</p>
                    <p className="text-xs text-gray-400 mt-1">Click "+ Add Product" above to list an item</p>
                  </div>
                </td>
              </tr>
            ) : filtered.map(p => {
              const isOut = p.isOutOfStock || p.stock <= 0;
              const isQuick = p.fulfillmentType === 'quick_commerce';
              return (
                <tr key={p.id || p._id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      {p.images?.[0]?.url ? (
                        <img src={p.images[0].url} alt="" className="w-11 h-11 rounded-xl object-cover border border-gray-100 shrink-0" />
                      ) : (
                        <div className="w-11 h-11 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 shrink-0">
                          <Package className="w-5 h-5" />
                        </div>
                      )}
                      <div>
                        <div className="font-bold text-gray-900">{p.name}</div>
                        <div className="text-xs text-gray-400 flex items-center gap-1.5 mt-0.5">
                          {p.brand && <span className="text-gray-600 font-medium">{p.brand}</span>}
                          {p.brand && <span>•</span>}
                          <span>{p.category?.name || 'Uncategorized'}</span>
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="px-5 py-4">
                    {isQuick ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                        <Zap className="w-3 h-3 text-amber-600 fill-amber-600" />
                        <span>Quick Shopping</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
                        <ShoppingBag className="w-3 h-3 text-indigo-600" />
                        <span>Shop India</span>
                      </span>
                    )}
                  </td>

                  <td className="px-5 py-4">
                    <div className="font-numbers">
                      <div className="font-bold text-gray-900">₹{p.basePrice} <span className="text-[10px] text-gray-400 font-normal">store</span></div>
                      <div className="text-xs text-emerald-700 font-semibold">₹{p.vendorPrice || p.basePrice} <span className="text-[10px] text-gray-400 font-normal">payout</span></div>
                    </div>
                  </td>

                  <td className="px-5 py-4 font-numbers">
                    <span className={`font-semibold ${isOut ? 'text-red-600' : 'text-gray-700'}`}>
                      {p.stock} units
                    </span>
                  </td>

                  <td className="px-5 py-4">
                    <button
                      onClick={() => toggleStock(p.id || p._id, isOut)}
                      className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-all cursor-pointer flex items-center gap-1.5 ${
                        isOut
                          ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                      }`}
                    >
                      {isOut ? (
                        <>
                          <AlertCircle className="w-3 h-3 text-red-500" />
                          <span>Out of Stock (Click to In)</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-3 h-3 text-emerald-600" />
                          <span>In Stock (Click to Out)</span>
                        </>
                      )}
                    </button>
                  </td>

                  <td className="px-5 py-4 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        onClick={() => openEdit(p)}
                        title="Edit Product"
                        className="p-2 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteProduct(p.id || p._id, p.name)}
                        title="Delete Product"
                        className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Product Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <form
            onSubmit={saveProduct}
            className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4 my-8 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-bold text-gray-900 text-lg">
                  {editingId ? 'Edit Product Details' : 'Add New Physical Product'}
                </h3>
                <p className="text-xs text-gray-500">Retail goods &amp; grocery catalog (Services excluded)</p>
              </div>
              <button
                type="button"
                onClick={() => { setModal(false); resetForm(); }}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Channel Selection: Shop India vs Quick Shopping */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                Select Fulfillment Channel *
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setFulfillmentType('traditional');
                    setSubType('retail');
                  }}
                  className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                    fulfillmentType === 'traditional'
                      ? 'bg-indigo-50/80 border-indigo-300 ring-2 ring-indigo-500/20'
                      : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <ShoppingBag className={`w-5 h-5 mt-0.5 ${fulfillmentType === 'traditional' ? 'text-indigo-600' : 'text-gray-400'}`} />
                  <div>
                    <div className="text-xs font-bold text-gray-900">Shop India</div>
                    <div className="text-[10px] text-gray-500">Courier / Pan-India Delivery</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setFulfillmentType('quick_commerce');
                    setSubType('grocery');
                  }}
                  className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                    fulfillmentType === 'quick_commerce'
                      ? 'bg-amber-50/80 border-amber-300 ring-2 ring-amber-500/20'
                      : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <Zap className={`w-5 h-5 mt-0.5 ${fulfillmentType === 'quick_commerce' ? 'text-amber-600 fill-amber-600' : 'text-gray-400'}`} />
                  <div>
                    <div className="text-xs font-bold text-gray-900">Quick Shopping</div>
                    <div className="text-[10px] text-gray-500">Hyperlocal (10-20 Mins)</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Quick Shopping Sub-type if Quick selected */}
            {fulfillmentType === 'quick_commerce' && (
              <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-200/80 space-y-2">
                <label className="block text-xs font-bold text-amber-900">Quick Shopping Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'grocery', label: '🥦 Grocery' },
                    { id: 'food', label: '🍲 Food' },
                    { id: 'pharmacy', label: '💊 Pharmacy' },
                  ].map(t => (
                    <button
                      type="button"
                      key={t.id}
                      onClick={() => setSubType(t.id as any)}
                      className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition-all ${
                        subType === t.id
                          ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                          : 'bg-white text-gray-700 border-amber-200 hover:bg-amber-100/50'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {/* Dietary Toggle for Food */}
                {subType === 'food' && (
                  <div className="pt-2 flex items-center justify-between text-xs border-t border-amber-200/60">
                    <span className="font-semibold text-gray-700">Dietary Option:</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setIsVeg(true)}
                        className={`px-3 py-1 rounded-lg font-bold text-xs ${
                          isVeg ? 'bg-emerald-600 text-white' : 'bg-white text-gray-600 border'
                        }`}
                      >
                        Veg 🌱
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsVeg(false)}
                        className={`px-3 py-1 rounded-lg font-bold text-xs ${
                          !isVeg ? 'bg-red-600 text-white' : 'bg-white text-gray-600 border'
                        }`}
                      >
                        Non-Veg 🍗
                      </button>
                    </div>
                  </div>
                )}

                {/* Pharmacy Rx Toggle */}
                {subType === 'pharmacy' && (
                  <div className="pt-2 flex items-center justify-between text-xs border-t border-amber-200/60">
                    <span className="font-semibold text-gray-700">Doctor Prescription (Rx) Required?</span>
                    <input
                      type="checkbox"
                      checked={isRx}
                      onChange={e => setIsRx(e.target.checked)}
                      className="w-4 h-4 text-amber-600 rounded"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Product Title */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Product Title *</label>
              <input
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Fortune Sunlite Sunflower Oil 1L / Basmati Rice 5kg"
                className="w-full px-3.5 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#10B981]/20"
              />
            </div>

            {/* Brand / Producer */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Brand Name (Optional)</label>
              <input
                value={brand}
                onChange={e => setBrand(e.target.value)}
                placeholder="e.g. Fortune / Tata / Amul / Nestlé"
                className="w-full px-3.5 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#10B981]/20"
              />
            </div>

            {/* Category Dropdown (Dynamically Loaded from Admin categories) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-gray-700">Category *</label>
                <span className="text-[10px] text-gray-400">Synced dynamically from Super Admin</span>
              </div>
              <select
                required
                value={categoryId}
                onChange={e => setCategoryId(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#10B981]/20 font-medium"
              >
                <option value="">-- Choose Category --</option>
                {filteredCategories.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Dynamic Add-On Pricing & Payout Section */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-800">Pricing &amp; Payout</span>
                <span className="text-[10px] text-gray-500 font-medium">Auto Platform Calculation</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Your Net Payout (Base Price ₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={vendorPrice || price || ''}
                    onChange={e => {
                      const val = Number(e.target.value);
                      setVendorPrice(val);
                      setPrice(val);
                    }}
                    placeholder="Amount you receive"
                    className="w-full px-3 py-2 border rounded-xl text-sm font-numbers font-bold text-emerald-700 bg-white"
                  />
                  <span className="text-[10px] text-gray-400">Net payout credited to your balance</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    MRP (Maximum Retail Price ₹)
                  </label>
                  <input
                    type="number"
                    value={mrp || ''}
                    onChange={e => setMrp(Number(e.target.value))}
                    placeholder="Printed label price"
                    className="w-full px-3 py-2 border rounded-xl text-sm font-numbers font-bold text-gray-700 bg-white"
                  />
                  <span className="text-[10px] text-gray-400">Customer price cannot exceed this</span>
                </div>
              </div>

              {/* Live Preview Card */}
              {pricePreview && (
                <div className={`p-3 rounded-xl border text-xs flex flex-col gap-1 transition-all ${
                  pricePreview.mrpExceeded
                    ? 'bg-red-50 border-red-200 text-red-900'
                    : 'bg-emerald-50/80 border-emerald-200/80 text-emerald-950'
                }`}>
                  <div className="flex justify-between items-center font-bold">
                    <span>Customer Storefront Price:</span>
                    <span className="text-sm font-black font-numbers">₹{pricePreview.customerPrice}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-gray-500 font-medium border-t border-black/5 pt-1">
                    <span>Platform Fee ({pricePreview.commissionPct || 10}% commission + buffer):</span>
                    <span>+₹{pricePreview.platformFee}</span>
                  </div>
                  {pricePreview.mrpExceeded && (
                    <span className="text-[11px] font-bold text-red-600 mt-1">
                      ⚠️ Customer price (₹{pricePreview.customerPrice}) exceeds MRP (₹{mrp}). Please reduce your base payout price or raise MRP.
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Available Stock Units */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Stock Quantity (Units) *</label>
              <input
                type="number"
                required
                min={0}
                value={stock}
                onChange={e => setStock(Number(e.target.value))}
                className="w-full px-3.5 py-2 border rounded-xl text-sm font-numbers"
              />
            </div>

            {/* Product Image */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Product Image</label>
              {existingImage && !imageFile && (
                <div className="flex items-center gap-2 mb-2 p-2 bg-gray-50 rounded-xl border">
                  <img src={existingImage} alt="Current" className="w-10 h-10 rounded-lg object-cover" />
                  <span className="text-xs text-gray-500">Current product image</span>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={e => setImageFile(e.target.files?.[0] || null)}
                className="w-full px-3 py-2 border rounded-xl text-xs file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => { setModal(false); resetForm(); }}
                className="flex-1 py-2.5 border rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50"
                disabled={uploading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={uploading}
                className="flex-1 py-2.5 bg-[#10B981] text-white rounded-xl text-sm font-bold hover:bg-[#059669] shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {uploading ? 'Uploading...' : editingId ? 'Save Changes' : 'Publish Product'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
