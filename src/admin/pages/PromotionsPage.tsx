import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import {
  Image as ImageIcon, Plus, Trash2, Power, Eye, Check, Sparkles, Award,
  Zap, ArrowUp, ArrowDown, Search, X, CheckCircle2, ShoppingBag
} from 'lucide-react';

export const PromotionsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'banners' | 'deals' | 'spotlight'>('banners');

  // Hero Banners State
  const [banners, setBanners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ title: '', subtitle: '', image: '', vertical: 'shop', isActive: true });

  // Spotlight Brand Promo State
  const [spotlightForm, setSpotlightForm] = useState({
    badge: 'Partnership',
    title: 'Active Jordan series',
    subtitle: 'Claim premium cashbacks instantly.',
    actionText: 'Shop Now',
    actionLink: 'shoes',
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&auto=format',
    partnerTitle: 'Plus Guaranteed Partner',
    partnerSub: '1-day fast delivery',
    partnerNote: 'Enjoy 1-day delivery and special discount prices on items displaying the ShopIndia Assured badge.',
    isActive: true
  });
  const [spotlightUploading, setSpotlightUploading] = useState(false);
  const [spotlightSaving, setSpotlightSaving] = useState(false);
  const [spotlightSavedSuccess, setSpotlightSavedSuccess] = useState(false);

  // Deals of the Day (Limited Offer) State
  const [dealsForm, setDealsForm] = useState<{
    isActive: boolean;
    title: string;
    badge: string;
    productIds: string[];
  }>({
    isActive: true,
    title: 'Deals of the Day',
    badge: 'Limited Offer',
    productIds: []
  });
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [savingDeals, setSavingDeals] = useState(false);
  const [dealsSavedSuccess, setDealsSavedSuccess] = useState(false);
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get<{ banners: any[] }>('/api/admin/banners').catch(() => ({ banners: [] })),
      api.get<{ spotlight: any }>('/api/admin/banners/spotlight').catch(() => ({ spotlight: null })),
      api.get<{ deals: any }>('/api/admin/banners/deals').catch(() => ({ deals: null })),
      api.get<{ products: any[] }>('/api/admin/products?limit=150&status=active').catch(() => ({ products: [] })),
      api.get<any>('/api/products?vertical=shop').catch(() => []),
    ])
      .then(([bannersRes, spotlightRes, dealsRes, productsRes, storefrontProds]) => {
        setBanners(bannersRes.banners || []);
        if (spotlightRes.spotlight) {
          setSpotlightForm(prev => ({ ...prev, ...spotlightRes.spotlight }));
        }
        if (dealsRes?.deals) {
          setDealsForm({
            isActive: dealsRes.deals.isActive !== false,
            title: dealsRes.deals.title || 'Deals of the Day',
            badge: dealsRes.deals.badge || 'Limited Offer',
            productIds: Array.isArray(dealsRes.deals.productIds) ? dealsRes.deals.productIds : []
          });
        }
        const adminProds = productsRes?.products || [];
        const sfProds = Array.isArray(storefrontProds) ? storefrontProds : (storefrontProds as any)?.products || [];
        const prodMap = new Map();
        for (const p of [...adminProds, ...sfProds]) {
          if (p?.id && !prodMap.has(p.id)) prodMap.set(p.id, p);
        }
        setAllProducts(Array.from(prodMap.values()));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  // --- Hero Banner Handlers ---
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/api/admin/banners', form);
      setShowForm(false);
      setForm({ title: '', subtitle: '', image: '', vertical: 'shop', isActive: true });
      load();
    } catch (err: any) { alert(err.message); }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await api.post<{ imageUrl: string }>('/api/admin/banners/upload-image', formData);
      setForm({ ...form, image: res.imageUrl });
    } catch (error: any) {
      alert(`Upload failed: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const toggleStatus = async (id: string) => {
    try {
      await api.patch(`/api/admin/banners/${id}/toggle`, {});
      load();
    } catch (err: any) { alert(err.message); }
  };

  const deleteBanner = async (id: string) => {
    if (!confirm('Are you sure you want to delete this promotional banner?')) return;
    try {
      await api.delete(`/api/admin/banners/${id}`);
      load();
    } catch (err: any) { alert(err.message); }
  };

  // --- Spotlight Ad Handlers ---
  const handleSaveSpotlight = async (e: React.FormEvent) => {
    e.preventDefault();
    setSpotlightSaving(true);
    setSpotlightSavedSuccess(false);
    try {
      await api.post('/api/admin/banners/spotlight', spotlightForm);
      setSpotlightSavedSuccess(true);
      setTimeout(() => setSpotlightSavedSuccess(false), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to save spotlight promo');
    } finally {
      setSpotlightSaving(false);
    }
  };

  const handleSpotlightImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSpotlightUploading(true);
    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await api.post<{ imageUrl: string }>('/api/admin/banners/upload-image', formData);
      setSpotlightForm(prev => ({ ...prev, image: res.imageUrl }));
    } catch (error: any) {
      alert(`Upload failed: ${error.message}`);
    } finally {
      setSpotlightUploading(false);
    }
  };

  // --- Deals of the Day Handlers ---
  const handleSaveDeals = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingDeals(true);
    setDealsSavedSuccess(false);
    try {
      await api.post('/api/admin/banners/deals', dealsForm);
      setDealsSavedSuccess(true);
      setTimeout(() => setDealsSavedSuccess(false), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to save Deals of the Day');
    } finally {
      setSavingDeals(false);
    }
  };

  const addProductToDeals = (id: string) => {
    if (dealsForm.productIds.includes(id)) return;
    setDealsForm(prev => ({
      ...prev,
      productIds: [...prev.productIds, id]
    }));
  };

  const removeProductFromDeals = (id: string) => {
    setDealsForm(prev => ({
      ...prev,
      productIds: prev.productIds.filter(pid => pid !== id)
    }));
  };

  const moveDealProduct = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= dealsForm.productIds.length) return;
    const newIds = [...dealsForm.productIds];
    const temp = newIds[index];
    newIds[index] = newIds[targetIndex];
    newIds[targetIndex] = temp;
    setDealsForm(prev => ({ ...prev, productIds: newIds }));
  };

  // Resolved list of selected deal products
  const selectedDealProducts = dealsForm.productIds
    .map(id => allProducts.find(p => p.id === id))
    .filter(Boolean);

  // Available products for picker modal
  const pickerFilteredProducts = allProducts.filter(p => {
    if (dealsForm.productIds.includes(p.id)) return false;
    if (!pickerSearch.trim()) return true;
    const q = pickerSearch.toLowerCase();
    return (
      (p.name && p.name.toLowerCase().includes(q)) ||
      (p.brand && p.brand.toLowerCase().includes(q)) ||
      (p.category?.name && p.category.name.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header and Master Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Promotions & Curated Deals</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Manage hero banners, homepage Deals of the Day carousel, and sidebar spotlight promotions
          </p>
        </div>

        {/* Master Navigation Pills */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <button
            onClick={() => setActiveTab('banners')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'banners' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Hero Banners ({banners.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('deals')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'deals' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            <span>Deals of the Day ({dealsForm.productIds.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('spotlight')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'spotlight' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Spotlight Brand Ad</span>
          </button>
        </div>
      </div>

      {/* ────────────────── TAB 1: HERO BANNERS ────────────────── */}
      {activeTab === 'banners' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Hero Carousel Banners</h2>
              <p className="text-xs text-slate-500">Auto-rotating hero slides displayed at the very top of the storefront</p>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 px-4 py-2 bg-[#0F2C59] text-white rounded-xl text-xs font-bold shadow-xs hover:bg-[#1a3d73] transition-all cursor-pointer"
            >
              <Plus size={15} /> {showForm ? 'Cancel' : 'Add Banner'}
            </button>
          </div>

          {showForm && (
            <form onSubmit={handleCreate} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 animate-in zoom-in-95">
              <h3 className="font-bold text-base text-slate-900 mb-4">Create New Hero Slide</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Title (Optional)</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={e => setForm({ ...form, title: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500/20"
                    placeholder="e.g. Flagship Electronics & Gadgets"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Subtitle (Optional)</label>
                  <input
                    type="text"
                    value={form.subtitle}
                    onChange={e => setForm({ ...form, subtitle: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500/20"
                    placeholder="e.g. Discover cutting-edge smartphones & audio."
                  />
                </div>
                <div className="md:col-span-2 space-y-3">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Banner Image (Required)</label>
                  <div className="flex items-center gap-4">
                    {form.image && (
                      <div className="w-24 h-16 rounded-xl overflow-hidden border border-slate-200 shrink-0">
                        <img src={form.image} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="flex-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={uploading}
                        className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
                      />
                      {uploading && <p className="text-[10px] text-indigo-600 mt-1 font-bold animate-pulse">Uploading to S3...</p>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <hr className="flex-1 border-slate-200" />
                    <span className="text-[10px] text-slate-400 font-bold uppercase">OR PASTE DIRECT URL</span>
                    <hr className="flex-1 border-slate-200" />
                  </div>
                  <input
                    type="url"
                    required
                    value={form.image}
                    onChange={e => setForm({ ...form, image: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono"
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Vertical Target</label>
                  <select
                    value={form.vertical}
                    onChange={e => setForm({ ...form, vertical: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold bg-white"
                  >
                    <option value="shop">Main Shop (Shop India)</option>
                    <option value="quick">Quick Shopping (10-20 Min)</option>
                    <option value="services">Glacons Services</option>
                  </select>
                </div>
                <div className="flex flex-col justify-center">
                  <label className="flex items-center gap-2 cursor-pointer mt-4">
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={e => setForm({ ...form, isActive: e.target.checked })}
                      className="w-4 h-4 text-indigo-600 rounded"
                    />
                    <span className="text-xs font-bold text-slate-700">Activate banner immediately on storefront</span>
                  </label>
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-6 py-2 bg-[#0F2C59] text-white rounded-xl text-xs font-bold shadow-xs hover:bg-[#1a3d73] cursor-pointer"
                >
                  Save Slide
                </button>
              </div>
            </form>
          )}

          {loading ? (
            <div className="p-8 text-center text-slate-400 text-xs">Loading banners...</div>
          ) : banners.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 flex flex-col items-center justify-center">
              <ImageIcon className="w-12 h-12 text-slate-300 mb-3" />
              <h3 className="text-sm font-bold text-slate-900">No Banners Found</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">Create hero slides to display promotional campaigns on the customer storefront.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {banners.map((banner) => (
                <div key={banner.id} className={`bg-white rounded-2xl overflow-hidden border ${banner.isActive ? 'border-slate-200 shadow-2xs' : 'border-slate-100 opacity-60'}`}>
                  <div className="aspect-[16/7] bg-slate-100 relative">
                    {banner.image ? (
                      <img src={banner.image} alt={banner.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><ImageIcon className="text-slate-300" size={32}/></div>
                    )}
                    {!banner.isActive && (
                      <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] flex items-center justify-center">
                        <span className="bg-slate-900 text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">Inactive</span>
                      </div>
                    )}
                  </div>
                  <div className="p-4 flex flex-col gap-1 text-left">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <h3 className="font-bold text-slate-900 text-xs line-clamp-1">{banner.title || 'Untitled Banner'}</h3>
                        {banner.subtitle && <p className="text-[11px] text-slate-500 line-clamp-1">{banner.subtitle}</p>}
                      </div>
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 shrink-0">{banner.vertical}</span>
                    </div>

                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => toggleStatus(banner.id)}
                        className={`flex-1 py-1.5 flex justify-center items-center gap-1.5 rounded-xl text-[11px] font-bold border transition-colors cursor-pointer ${
                          banner.isActive ? 'border-amber-200 text-amber-700 hover:bg-amber-50' : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                        }`}
                      >
                        {banner.isActive ? <><Power size={13}/> Disable</> : <><Eye size={13}/> Enable</>}
                      </button>
                      <button
                        onClick={() => deleteBanner(banner.id)}
                        className="p-1.5 rounded-xl text-rose-600 border border-rose-200 hover:bg-rose-50 transition-colors cursor-pointer"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ────────────────── TAB 2: DEALS OF THE DAY (LIMITED OFFERS) ────────────────── */}
      {activeTab === 'deals' && (
        <div className="space-y-6">
          <form onSubmit={handleSaveDeals} className="space-y-5">
            {/* Header Card */}
            <div className="bg-gradient-to-r from-orange-50/90 via-amber-50/70 to-yellow-50/60 p-5 rounded-3xl border border-amber-200/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-orange-600 text-white rounded-2xl shadow-xs mt-0.5">
                  <Zap className="w-5 h-5 fill-current" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-black text-slate-900">Deals of the Day & Limited Offers</h2>
                    <span className="px-2 py-0.5 bg-orange-100 text-orange-800 rounded-full text-[10px] font-extrabold uppercase tracking-wider">
                      Super Admin Exclusive
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                    Handpick specific vendor products to feature in the homepage countdown deal carousel. Only Super Admin has permission to feature products here, protecting the storefront from vendor spam.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end md:self-auto">
                {dealsSavedSuccess && (
                  <span className="text-xs font-bold text-emerald-700 flex items-center gap-1 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                    <CheckCircle2 className="w-4 h-4" /> Saved!
                  </span>
                )}
                <button
                  type="submit"
                  disabled={savingDeals}
                  className="px-5 py-2.5 bg-[#0F2C59] text-white rounded-xl text-xs font-bold hover:bg-[#1a3d73] shadow-xs cursor-pointer flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>{savingDeals ? 'Saving Deals...' : 'Save Deals Carousel'}</span>
                </button>
              </div>
            </div>

            {/* Carousel Controls */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs space-y-4">
              <h3 className="font-bold text-xs text-slate-700 uppercase tracking-wider">Carousel Display Settings</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Section Title</label>
                  <input
                    type="text"
                    value={dealsForm.title}
                    onChange={e => setDealsForm({ ...dealsForm, title: e.target.value })}
                    placeholder="e.g. Deals of the Day / Mega Flash Sale"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Badge Callout</label>
                  <input
                    type="text"
                    value={dealsForm.badge}
                    onChange={e => setDealsForm({ ...dealsForm, badge: e.target.value })}
                    placeholder="e.g. Limited Offer / 24H Only"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold"
                  />
                </div>
                <div className="flex flex-col justify-end">
                  <label className="flex items-center gap-2.5 p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={dealsForm.isActive}
                      onChange={e => setDealsForm({ ...dealsForm, isActive: e.target.checked })}
                      className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-800">Display Carousel on Storefront</span>
                      <p className="text-[10px] text-slate-400">Uncheck to hide Deals of the Day completely</p>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Handpicked Products List */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Featured Deal Products ({selectedDealProducts.length})</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Products will appear in the customer horizontal deals slider in the exact order shown below
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowProductPicker(true)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add Product to Deals</span>
                </button>
              </div>

              {selectedDealProducts.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300 space-y-2">
                  <ShoppingBag className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs font-bold text-slate-700">No products handpicked yet</p>
                  <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                    Click "+ Add Product to Deals" above to pick specific vendor items. If none are chosen, the storefront automatically falls back to items with the highest discounts.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden">
                  {selectedDealProducts.map((p, idx) => {
                    const discount = p.mrp > p.basePrice
                      ? Math.round(((p.mrp - p.basePrice) / p.mrp) * 100)
                      : 0;
                    const imgUrl = p.images?.[0]?.url || p.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&auto=format';

                    return (
                      <div key={p.id} className="p-3.5 flex items-center justify-between gap-4 bg-white hover:bg-slate-50/70 transition-colors">
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-xs font-black flex items-center justify-center shrink-0">
                            #{idx + 1}
                          </span>
                          <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200/60 p-1 flex items-center justify-center shrink-0 overflow-hidden">
                            <img src={imgUrl} alt={p.name || p.title} className="max-h-full max-w-full object-contain" />
                          </div>
                          <div>
                            <div className="font-bold text-xs text-slate-900 line-clamp-1">{p.name || p.title}</div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                              <span>Brand: <strong>{p.brand || 'Unbranded'}</strong></span>
                              <span>•</span>
                              <span>Vendor: <strong>{p.vendor?.businessName || 'Local Vendor'}</strong></span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="font-bold text-xs text-slate-900">₹{(p.basePrice || p.price || 0).toLocaleString('en-IN')}</div>
                            {discount > 0 ? (
                              <span className="text-[10px] font-black text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200/60">
                                {discount}% OFF
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400">Regular Price</span>
                            )}
                          </div>

                          {/* Reorder Buttons */}
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => moveDealProduct(idx, 'up')}
                              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                              title="Move left in carousel"
                            >
                              <ArrowUp className="w-3.5 h-3.5 text-slate-600" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === selectedDealProducts.length - 1}
                              onClick={() => moveDealProduct(idx, 'down')}
                              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                              title="Move right in carousel"
                            >
                              <ArrowDown className="w-3.5 h-3.5 text-slate-600" />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeProductFromDeals(p.id)}
                              className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 cursor-pointer"
                              title="Remove from Deals"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </form>

          {/* Product Picker Modal */}
          {showProductPicker && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-3xl p-6 w-full max-w-2xl shadow-2xl space-y-4 max-h-[85vh] flex flex-col animate-in zoom-in-95">
                <div className="flex items-center justify-between pb-3 border-b">
                  <div>
                    <h3 className="font-bold text-base text-slate-900">Add Product to Deals of the Day</h3>
                    <p className="text-xs text-slate-500">Pick any active vendor product to feature in the deals slider</p>
                  </div>
                  <button
                    onClick={() => { setShowProductPicker(false); setPickerSearch(''); }}
                    className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={pickerSearch}
                    onChange={e => setPickerSearch(e.target.value)}
                    placeholder="Search product title, brand, or category..."
                    className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-orange-500/20"
                  />
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-slate-100 pr-1">
                  {pickerFilteredProducts.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400">
                      No matching unselected products found.
                    </div>
                  ) : (
                    pickerFilteredProducts.map(p => {
                      const discount = p.mrp > p.basePrice
                        ? Math.round(((p.mrp - p.basePrice) / p.mrp) * 100)
                        : 0;
                      const imgUrl = p.images?.[0]?.url || p.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&auto=format';

                      return (
                        <div key={p.id} className="py-2.5 px-2 flex items-center justify-between gap-3 hover:bg-slate-50 rounded-xl transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-slate-50 border p-1 flex items-center justify-center shrink-0">
                              <img src={imgUrl} alt={p.name || p.title} className="max-h-full max-w-full object-contain" />
                            </div>
                            <div>
                              <div className="text-xs font-bold text-slate-900 line-clamp-1">{p.name || p.title}</div>
                              <div className="text-[10px] text-slate-400 flex items-center gap-2">
                                <span>{p.brand || 'Unbranded'}</span>
                                <span>•</span>
                                <span>₹{(p.basePrice || p.price || 0).toLocaleString('en-IN')}</span>
                                {discount > 0 && <span className="text-orange-600 font-bold">({discount}% off)</span>}
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => addProductToDeals(p.id)}
                            className="px-3 py-1.5 bg-orange-50 hover:bg-orange-600 text-orange-700 hover:text-white border border-orange-200 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap"
                          >
                            + Feature
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="pt-3 border-t flex justify-end">
                  <button
                    onClick={() => { setShowProductPicker(false); setPickerSearch(''); }}
                    className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Done Adding
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ────────────────── TAB 3: SPOTLIGHT BRAND AD ────────────────── */}
      {activeTab === 'spotlight' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles size={20} className="text-amber-500" />
                <h2 className="text-lg font-bold text-slate-900">Spotlight Brand Promotion</h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Right-side partner spotlight banner (e.g. Jordan Shoes / Guaranteed Partner) on the storefront
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <form onSubmit={handleSaveSpotlight} className="lg:col-span-2 bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <span className="font-bold text-sm text-slate-900">Edit Spotlight Ad Content</span>
                <button
                  type="submit"
                  disabled={spotlightSaving}
                  className="px-5 py-2 bg-[#0F2C59] text-white rounded-xl text-xs font-bold shadow-xs hover:bg-[#1a3d73] cursor-pointer flex items-center gap-1.5"
                >
                  <Check size={14} />
                  <span>{spotlightSaving ? 'Saving...' : 'Save Ad'}</span>
                </button>
              </div>

              {spotlightSavedSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Spotlight promotion saved successfully! Updated on storefront.</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Badge Tag</label>
                  <input
                    type="text"
                    value={spotlightForm.badge}
                    onChange={e => setSpotlightForm({ ...spotlightForm, badge: e.target.value })}
                    placeholder="e.g. Partnership / Official"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Button Action Text</label>
                  <input
                    type="text"
                    value={spotlightForm.actionText}
                    onChange={e => setSpotlightForm({ ...spotlightForm, actionText: e.target.value })}
                    placeholder="e.g. Shop Now"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Spotlight Title</label>
                  <input
                    type="text"
                    required
                    value={spotlightForm.title}
                    onChange={e => setSpotlightForm({ ...spotlightForm, title: e.target.value })}
                    placeholder="e.g. Active Jordan series"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Subtitle / Callout</label>
                  <input
                    type="text"
                    value={spotlightForm.subtitle}
                    onChange={e => setSpotlightForm({ ...spotlightForm, subtitle: e.target.value })}
                    placeholder="e.g. Claim premium cashbacks instantly."
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Action Link / Search Query</label>
                  <input
                    type="text"
                    value={spotlightForm.actionLink}
                    onChange={e => setSpotlightForm({ ...spotlightForm, actionLink: e.target.value })}
                    placeholder="e.g. shoes, electronics, or /search"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono"
                  />
                </div>

                <div className="md:col-span-2 space-y-3">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Spotlight Image</label>
                  <div className="flex items-center gap-4">
                    {spotlightForm.image && (
                      <div className="w-16 h-20 rounded-xl overflow-hidden border border-slate-200 shrink-0 bg-neutral-900">
                        <img src={spotlightForm.image} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="flex-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleSpotlightImageUpload}
                        disabled={spotlightUploading}
                        className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
                      />
                      {spotlightUploading && <p className="text-[10px] text-indigo-600 mt-1 font-bold animate-pulse">Uploading to S3...</p>}
                    </div>
                  </div>

                  <input
                    type="url"
                    value={spotlightForm.image}
                    onChange={e => setSpotlightForm({ ...spotlightForm, image: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono"
                    placeholder="Or paste direct image URL (https://...)"
                  />
                </div>

                <div className="md:col-span-2 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={spotlightForm.isActive}
                      onChange={e => setSpotlightForm({ ...spotlightForm, isActive: e.target.checked })}
                      className="w-4 h-4 text-indigo-600 rounded"
                    />
                    <span className="text-xs font-bold text-slate-700">Display spotlight card on storefront sidebar</span>
                  </label>
                </div>
              </div>
            </form>

            {/* Live Preview Column */}
            <div className="flex flex-col gap-4">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Live Storefront Preview</span>
              <div className="w-full max-w-sm bg-white p-5 rounded-3xl shadow-sm border border-slate-200/80 flex flex-col gap-3">
                <span className="font-bold text-[11px] tracking-widest text-slate-400 uppercase">Spotlight Brand</span>
                <div className="relative aspect-[3/4] rounded-2xl overflow-hidden shadow-inner group cursor-pointer bg-neutral-900">
                  <img
                    src={spotlightForm.image || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&auto=format'}
                    alt="Spotlight Ad"
                    className="w-full h-full object-cover opacity-75"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-transparent to-transparent flex flex-col justify-end p-5 text-white">
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 bg-orange-50/15 border border-amber-400/20 px-2 py-0.5 rounded w-max mb-1.5">
                      {spotlightForm.badge || 'Partnership'}
                    </span>
                    <h4 className="text-base font-black leading-tight mb-1">{spotlightForm.title || 'Active Jordan series'}</h4>
                    <p className="text-[10.5px] text-zinc-300 leading-normal mb-4 font-medium">
                      {spotlightForm.subtitle || 'Claim premium cashbacks instantly.'}
                    </p>
                    <button
                      type="button"
                      className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold text-xs tracking-wide w-max shadow uppercase"
                    >
                      {spotlightForm.actionText || 'Shop Now'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="w-full max-w-sm bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
                  <Award size={16} />
                </div>
                <div className="flex flex-col text-xs leading-tight">
                  <span className="font-bold text-slate-800">ShopIndia Guaranteed Partner</span>
                  <span className="text-[11px] text-slate-500">1-day fast delivery</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
