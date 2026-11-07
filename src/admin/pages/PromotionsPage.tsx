import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Image as ImageIcon, Plus, Trash2, Power, Eye, Check, Save, Sparkles, Award } from 'lucide-react';

export const PromotionsPage: React.FC = () => {
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

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get<{ banners: any[] }>('/api/admin/banners').catch(() => ({ banners: [] })),
      api.get<{ spotlight: any }>('/api/admin/banners/spotlight').catch(() => ({ spotlight: null }))
    ])
      .then(([bannersRes, spotlightRes]) => {
        setBanners(bannersRes.banners || []);
        if (spotlightRes.spotlight) {
          setSpotlightForm(prev => ({ ...prev, ...spotlightRes.spotlight }));
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Promotional Banners</h1>
          <p className="text-sm text-gray-500">Manage the hero banners shown on the frontend</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 bg-[#0F2C59] text-white rounded-xl shadow hover:opacity-90 transition-opacity">
          <Plus size={16} /> {showForm ? 'Cancel' : 'Add Banner'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="font-bold text-lg mb-4">Create New Promotion</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Title (Optional)</label>
              <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="e.g. Summer Sale" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Subtitle (Optional)</label>
              <input type="text" value={form.subtitle} onChange={e => setForm({ ...form, subtitle: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="e.g. Up to 50% off!" />
            </div>
            <div className="md:col-span-2 space-y-3">
              <label className="block text-xs font-bold text-gray-700 mb-1">Banner Image (Required)</label>
              
              <div className="flex items-center gap-4">
                {form.image && (
                  <div className="w-24 h-16 rounded overflow-hidden border border-gray-200">
                    <img src={form.image} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="flex-1">
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploading}
                    className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" 
                  />
                  {uploading && <p className="text-xs text-blue-600 mt-1 animate-pulse">Uploading to S3...</p>}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <hr className="flex-1 border-gray-100" />
                <span className="text-xs text-gray-400 font-bold uppercase">OR PASTE URL</span>
                <hr className="flex-1 border-gray-100" />
              </div>
              <input type="url" required value={form.image} onChange={e => setForm({ ...form, image: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="https://..." />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Vertical Target</label>
              <select value={form.vertical} onChange={e => setForm({ ...form, vertical: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
                <option value="shop">Main Shop</option>
                <option value="quick">Quick Commerce (10 Min)</option>
                <option value="services">Home Services</option>
              </select>
            </div>
            <div className="flex flex-col justify-center">
              <label className="flex items-center gap-2 cursor-pointer mt-5">
                <input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} className="w-4 h-4 text-blue-600 rounded" />
                <span className="text-sm font-medium">Activate immediately</span>
              </label>
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold shadow-md hover:bg-blue-700">Save Banner</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="p-8 text-center text-gray-500">Loading...</div>
      ) : banners.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100 flex flex-col items-center justify-center">
          <ImageIcon className="w-12 h-12 text-gray-300 mb-4" />
          <h3 className="text-lg font-bold text-gray-900">No Banners Found</h3>
          <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">You haven't created any promotional banners yet. Create one to display on the storefront!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {banners.map((banner) => (
            <div key={banner.id} className={`bg-white rounded-2xl overflow-hidden border ${banner.isActive ? 'border-gray-200 shadow-sm' : 'border-gray-100 shadow-none opacity-75'}`}>
              <div className="aspect-[16/6] bg-gray-100 relative">
                {banner.image ? (
                  <img src={banner.image} alt={banner.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center"><ImageIcon className="text-gray-300" size={32}/></div>
                )}
                {!banner.isActive && (
                  <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center">
                    <span className="bg-black/70 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest">Inactive</span>
                  </div>
                )}
              </div>
              <div className="p-4 flex flex-col gap-1 text-left">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-gray-900">{banner.title || 'Untitled'}</h3>
                    {banner.subtitle && <p className="text-xs text-gray-500">{banner.subtitle}</p>}
                  </div>
                  <span className="text-xs font-bold uppercase px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">{banner.vertical}</span>
                </div>
                
                <div className="mt-4 flex gap-2">
                  <button onClick={() => toggleStatus(banner.id)} className={`flex-1 py-1.5 flex justify-center items-center gap-1.5 rounded-lg text-xs font-bold border transition-colors ${banner.isActive ? 'border-orange-200 text-orange-600 hover:bg-orange-50' : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'}`}>
                    {banner.isActive ? <><Power size={14}/> Disable</> : <><Eye size={14}/> Enable</>}
                  </button>
                  <button onClick={() => deleteBanner(banner.id)} className="px-3 py-1.5 flex justify-center items-center rounded-lg text-xs font-bold border border-red-200 text-red-600 hover:bg-red-50 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dynamic Spotlight Brand Promotion Section */}
      <div className="pt-8 border-t border-gray-200">
        <div className="flex justify-between items-center mb-6">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles size={20} className="text-amber-500" />
              <h2 className="text-xl font-bold text-gray-900">Spotlight Brand Promotion</h2>
            </div>
            <p className="text-sm text-gray-500">
              Manage the dedicated right-sidebar promotional card (like the Jordan card) shown on the main storefront
            </p>
          </div>
          <button
            onClick={handleSaveSpotlight}
            disabled={spotlightSaving}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow font-bold text-sm transition-all"
          >
            {spotlightSavedSuccess ? (
              <>
                <Check size={16} className="text-emerald-300" /> Saved to Storefront!
              </>
            ) : spotlightSaving ? (
              'Saving...'
            ) : (
              <>
                <Save size={16} /> Save Spotlight Promo
              </>
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Edit Form */}
          <form onSubmit={handleSaveSpotlight} className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Badge Tag</label>
                <input
                  type="text"
                  value={spotlightForm.badge}
                  onChange={e => setSpotlightForm({ ...spotlightForm, badge: e.target.value })}
                  placeholder="e.g. Partnership, New Arrival, Hot Deal"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Action Button Text</label>
                <input
                  type="text"
                  value={spotlightForm.actionText}
                  onChange={e => setSpotlightForm({ ...spotlightForm, actionText: e.target.value })}
                  placeholder="e.g. Shop Now, Explore, View Deals"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-700 mb-1">Spotlight Title</label>
                <input
                  type="text"
                  required
                  value={spotlightForm.title}
                  onChange={e => setSpotlightForm({ ...spotlightForm, title: e.target.value })}
                  placeholder="e.g. Active Jordan series"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-semibold"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-700 mb-1">Subtitle / Cashback Callout</label>
                <input
                  type="text"
                  value={spotlightForm.subtitle}
                  onChange={e => setSpotlightForm({ ...spotlightForm, subtitle: e.target.value })}
                  placeholder="e.g. Claim premium cashbacks instantly."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-700 mb-1">Action Link / Search Query</label>
                <input
                  type="text"
                  value={spotlightForm.actionLink}
                  onChange={e => setSpotlightForm({ ...spotlightForm, actionLink: e.target.value })}
                  placeholder="e.g. shoes, electronics, or /search"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                />
              </div>

              <div className="md:col-span-2 space-y-3">
                <label className="block text-xs font-bold text-gray-700 mb-1">Spotlight Promo Image</label>
                <div className="flex items-center gap-4">
                  {spotlightForm.image && (
                    <div className="w-20 h-24 rounded-lg overflow-hidden border border-gray-200 shrink-0 bg-neutral-900">
                      <img src={spotlightForm.image} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleSpotlightImageUpload}
                      disabled={spotlightUploading}
                      className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    {spotlightUploading && <p className="text-xs text-blue-600 mt-1 animate-pulse">Uploading to S3...</p>}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <hr className="flex-1 border-gray-100" />
                  <span className="text-[10px] text-gray-400 font-bold uppercase">OR PASTE URL</span>
                  <hr className="flex-1 border-gray-100" />
                </div>
                <input
                  type="url"
                  value={spotlightForm.image}
                  onChange={e => setSpotlightForm({ ...spotlightForm, image: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  placeholder="https://..."
                />
              </div>

              <div className="md:col-span-2 flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={spotlightForm.isActive}
                    onChange={e => setSpotlightForm({ ...spotlightForm, isActive: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">Display card on storefront sidebar</span>
                </label>
              </div>
            </div>
          </form>

          {/* Live Preview Column */}
          <div className="flex flex-col gap-4">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Live Storefront Preview</span>
            <div className="w-full max-w-sm bg-white p-5 rounded-2xl shadow-sm border border-gray-200 flex flex-col gap-3">
              <span className="font-bold text-xs tracking-widest text-gray-400 uppercase">Spotlight Brand</span>
              <div className="relative aspect-[3/4] rounded-xl overflow-hidden shadow-inner group cursor-pointer bg-neutral-900">
                <img
                  src={spotlightForm.image || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&auto=format'}
                  alt="Spotlight Ad"
                  className="w-full h-full object-cover opacity-75"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-transparent to-transparent flex flex-col justify-end p-5 text-white">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-400 bg-orange-50/15 border border-amber-400/20 px-2 py-0.5 rounded w-max mb-1.5">
                    {spotlightForm.badge || 'Partnership'}
                  </span>
                  <h4 className="text-base font-bold leading-tight mb-1">{spotlightForm.title || 'Active Jordan series'}</h4>
                  <p className="text-[10.5px] text-zinc-300 leading-normal mb-4 font-medium">
                    {spotlightForm.subtitle || 'Claim premium cashbacks instantly.'}
                  </p>
                  <button
                    type="button"
                    className="px-5 py-2 bg-blue-600 text-white rounded-lg font-bold text-xs tracking-wide w-max shadow uppercase"
                  >
                    {spotlightForm.actionText || 'Shop Now'}
                  </button>
                </div>
              </div>
            </div>

            <div className="w-full max-w-sm bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
                <Award size={16} />
              </div>
              <div className="flex flex-col text-xs leading-tight">
                <span className="font-bold text-gray-800">ShopIndia Guaranteed Partner</span>
                <span className="text-gray-500">1-day fast delivery</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
