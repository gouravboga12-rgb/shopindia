import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Plus, Edit2, Trash2, Eye, EyeOff, Tag, Award, Star, Search } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  slug: string;
  vertical: string;
  image: string | null;
  sortOrder: number;
  isActive: boolean;
  _count?: { products: number };
}

interface BrandItem {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  description: string | null;
  isActive: boolean;
  isFeatured: boolean;
  createdAt: string;
}

const VERTICAL_OPTIONS = [
  { value: 'quick_grocery', label: '⚡ Instant Grocery' },
  { value: 'quick_food', label: '🍔 Food Delivery' },
  { value: 'quick_pharmacy', label: '💊 Pharmacy & Medicines' },
  { value: 'services_home', label: '🏠 Home Services' },
  { value: 'services_vehicle', label: '🚗 Vehicle Services' },
  { value: 'shop', label: '🛍️ Traditional E-Commerce' },
];

export const CategoriesPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'categories' | 'brands'>('categories');

  // Categories State
  const [cats, setCats] = useState<Category[]>([]);
  const [loadingCats, setLoadingCats] = useState(true);
  const [catModal, setCatModal] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [catForm, setCatForm] = useState({ name: '', vertical: 'quick_grocery', image: '', slug: '' });
  const [catError, setCatError] = useState<string | null>(null);
  const [catUploading, setCatUploading] = useState(false);
  const [catSearch, setCatSearch] = useState('');

  // Brands State
  const [brands, setBrands] = useState<BrandItem[]>([]);
  const [loadingBrands, setLoadingBrands] = useState(false);
  const [brandModal, setBrandModal] = useState(false);
  const [editingBrand, setEditingBrand] = useState<BrandItem | null>(null);
  const [brandForm, setBrandForm] = useState({ name: '', logo: '', description: '', isFeatured: true, isActive: true });
  const [brandError, setBrandError] = useState<string | null>(null);
  const [brandUploading, setBrandUploading] = useState(false);
  const [brandSearch, setBrandSearch] = useState('');

  const loadCategories = () => {
    setLoadingCats(true);
    api.get<Category[]>('/api/admin/categories')
      .then(d => setCats(Array.isArray(d) ? d : (d as any).categories || []))
      .catch(err => {
        if (!err.message?.includes('Not Found') && !err.message?.includes('404')) {
          console.error(err);
        }
      })
      .finally(() => setLoadingCats(false));
  };

  const loadBrands = () => {
    setLoadingBrands(true);
    api.get<{ brands: BrandItem[] }>('/api/admin/brands')
      .then(d => setBrands(d?.brands || []))
      .catch(err => console.error('Failed to load brands:', err))
      .finally(() => setLoadingBrands(false));
  };

  useEffect(() => {
    loadCategories();
    loadBrands();
  }, []);

  // --- Category Handlers ---
  const filteredCats = cats.filter(c => 
    c.name.toLowerCase().includes(catSearch.toLowerCase()) || 
    c.vertical.toLowerCase().includes(catSearch.toLowerCase())
  );

  const nameMatches = catForm.name.trim().length > 1 ? cats.filter(c => 
    c.name.toLowerCase().includes(catForm.name.toLowerCase()) && c.id !== editingCat?.id
  ) : [];

  const openCreateCat = () => {
    setEditingCat(null);
    setCatForm({ name: '', vertical: 'quick_grocery', image: '', slug: '' });
    setCatError(null);
    setCatModal(true);
  };

  const openEditCat = (c: Category) => {
    setEditingCat(c);
    setCatForm({ name: c.name, vertical: c.vertical, image: c.image || '', slug: c.slug || '' });
    setCatError(null);
    setCatModal(true);
  };

  const handleCatImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setCatUploading(true);
      setCatError(null);
      const fd = new FormData();
      fd.append('image', file);
      const res = await api.post('/api/admin/categories/upload-image', fd) as any;
      setCatForm(prev => ({ ...prev, image: res.imageUrl }));
    } catch (err: any) {
      setCatError(err.message || 'Image upload failed');
    } finally {
      setCatUploading(false);
    }
  };

  const saveCat = async (e: React.FormEvent) => {
    e.preventDefault();
    setCatError(null);
    try {
      const payload: any = { name: catForm.name, vertical: catForm.vertical, image: catForm.image || null, slug: catForm.slug || null };
      if (editingCat) {
        await api.patch(`/api/admin/categories/${editingCat.id}`, payload);
      } else {
        await api.post('/api/admin/categories', payload);
      }
      setCatModal(false);
      loadCategories();
    } catch (err: any) { setCatError(err.message); }
  };

  const toggleCat = async (id: string) => {
    try { await api.patch(`/api/admin/categories/${id}/toggle`, {}); loadCategories(); }
    catch (err: any) { alert(err.message); }
  };

  const removeCat = async (id: string) => {
    if (!confirm('Delete this category? Products will become uncategorized.')) return;
    try { await api.delete(`/api/admin/categories/${id}`); loadCategories(); }
    catch (err: any) { alert(err.message); }
  };

  // --- Brand Handlers ---
  const filteredBrands = brands.filter(b =>
    b.name.toLowerCase().includes(brandSearch.toLowerCase()) ||
    (b.description && b.description.toLowerCase().includes(brandSearch.toLowerCase()))
  );

  const openCreateBrand = () => {
    setEditingBrand(null);
    setBrandForm({ name: '', logo: '', description: '', isFeatured: true, isActive: true });
    setBrandError(null);
    setBrandModal(true);
  };

  const openEditBrand = (b: BrandItem) => {
    setEditingBrand(b);
    setBrandForm({
      name: b.name,
      logo: b.logo || '',
      description: b.description || '',
      isFeatured: b.isFeatured,
      isActive: b.isActive
    });
    setBrandError(null);
    setBrandModal(true);
  };

  const handleBrandLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setBrandUploading(true);
      setBrandError(null);
      const fd = new FormData();
      fd.append('logo', file);
      const res = await api.post('/api/admin/brands/upload-logo', fd) as any;
      setBrandForm(prev => ({ ...prev, logo: res.logoUrl }));
    } catch (err: any) {
      setBrandError(err.message || 'Logo upload failed');
    } finally {
      setBrandUploading(false);
    }
  };

  const saveBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    setBrandError(null);
    try {
      const payload = {
        name: brandForm.name.trim(),
        logo: brandForm.logo || null,
        description: brandForm.description || null,
        isFeatured: brandForm.isFeatured,
        isActive: brandForm.isActive
      };
      if (editingBrand) {
        await api.put(`/api/admin/brands/${editingBrand.id}`, payload);
      } else {
        await api.post('/api/admin/brands', payload);
      }
      setBrandModal(false);
      loadBrands();
    } catch (err: any) {
      setBrandError(err.message || 'Failed to save brand');
    }
  };

  const toggleBrandActive = async (id: string) => {
    try {
      await api.patch(`/api/admin/brands/${id}/toggle`, {});
      loadBrands();
    } catch (err: any) {
      alert(err.message || 'Failed to update brand status');
    }
  };

  const toggleBrandFeatured = async (id: string) => {
    try {
      await api.patch(`/api/admin/brands/${id}/featured`, {});
      loadBrands();
    } catch (err: any) {
      alert(err.message || 'Failed to update featured status');
    }
  };

  const removeBrand = async (id: string, name: string) => {
    if (!confirm(`Delete official brand "${name}"? Existing products under this brand will retain their label.`)) return;
    try {
      await api.delete(`/api/admin/brands/${id}`);
      loadBrands();
    } catch (err: any) {
      alert(err.message || 'Failed to delete brand');
    }
  };

  const color: Record<string, string> = {
    shop: 'bg-blue-50 text-blue-700',
    quick: 'bg-emerald-50 text-emerald-700',
    quick_grocery: 'bg-emerald-50 text-emerald-700',
    quick_food: 'bg-orange-50 text-orange-700',
    quick_pharmacy: 'bg-cyan-50 text-cyan-700',
    services: 'bg-amber-50 text-amber-700',
    services_home: 'bg-amber-50 text-amber-700',
    services_vehicle: 'bg-indigo-50 text-indigo-700',
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Header with Tab switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Catalog Taxonomies</h1>
          <p className="text-sm text-slate-500">Manage storefront categories and official brand catalog across all verticals</p>
        </div>

        {/* Tab pills */}
        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200/80">
          <button
            onClick={() => setActiveTab('categories')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'categories' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Storefront Categories ({cats.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('brands')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'brands' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Award className="w-3.5 h-3.5 text-amber-500" />
            <span>Official Brands ({brands.length})</span>
          </button>
        </div>
      </div>

      {/* ────────────────── CATEGORIES TAB ────────────────── */}
      {activeTab === 'categories' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search categories..."
                value={catSearch}
                onChange={(e) => setCatSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <button
              onClick={() => { openCreateCat(); if (catSearch) setCatForm(prev => ({ ...prev, name: catSearch })); }}
              className="flex items-center gap-2 px-4 py-2 bg-[#0F2C59] text-white rounded-xl text-xs font-bold hover:bg-[#1a3d73] shadow-xs cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" /> Add Category
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-600 font-bold">
                <tr>
                  <th className="text-left px-5 py-3.5">Category</th>
                  <th className="text-left px-5 py-3.5">Module / Vertical</th>
                  <th className="text-left px-5 py-3.5">Products</th>
                  <th className="text-left px-5 py-3.5">Status</th>
                  <th className="text-right px-5 py-3.5">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loadingCats ? (
                  <tr><td colSpan={5} className="text-center py-10 text-slate-400 font-medium">Loading categories...</td></tr>
                ) : filteredCats.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-10 text-slate-400 font-medium">No categories found. Click "Add Category" to create one.</td></tr>
                ) : filteredCats.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3.5 font-bold text-slate-900 flex items-center gap-3">
                      {c.image ? (
                        <img src={c.image} alt="" className="w-8 h-8 rounded-lg object-contain border border-slate-100 p-0.5 bg-white" />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-xs font-black text-slate-400">{c.name[0]}</div>
                      )}
                      <div>
                        <div>{c.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono font-normal">/{c.slug}</div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${color[c.vertical] || 'bg-slate-100 text-slate-700'}`}>
                        {c.vertical.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-bold text-slate-600">{c._count?.products || 0}</td>
                    <td className="px-5 py-3.5">
                      <button
                        onClick={() => toggleCat(c.id)}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold cursor-pointer transition-all ${
                          c.isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {c.isActive ? 'Active' : 'Disabled'}
                      </button>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => toggleCat(c.id)} title={c.isActive ? 'Disable' : 'Enable'} className="p-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 cursor-pointer">
                          {c.isActive ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        </button>
                        <button onClick={() => openEditCat(c)} title="Edit" className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 cursor-pointer">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => removeCat(c.id)} title="Delete" className="p-2 rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-100 cursor-pointer">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ────────────────── BRANDS TAB ────────────────── */}
      {activeTab === 'brands' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search official brands..."
                value={brandSearch}
                onChange={(e) => setBrandSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <button
              onClick={() => { openCreateBrand(); if (brandSearch) setBrandForm(prev => ({ ...prev, name: brandSearch })); }}
              className="flex items-center gap-2 px-4 py-2 bg-[#0F2C59] text-white rounded-xl text-xs font-bold hover:bg-[#1a3d73] shadow-xs cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" /> Add Official Brand
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-600 font-bold">
                <tr>
                  <th className="text-left px-5 py-3.5">Brand & Logo</th>
                  <th className="text-left px-5 py-3.5">Description</th>
                  <th className="text-center px-5 py-3.5">Explore Top Brands</th>
                  <th className="text-center px-5 py-3.5">Status</th>
                  <th className="text-right px-5 py-3.5">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loadingBrands ? (
                  <tr><td colSpan={5} className="text-center py-10 text-slate-400 font-medium">Loading official brand catalog...</td></tr>
                ) : filteredBrands.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-10 text-slate-400 font-medium">No brands found. Click "Add Official Brand" to create one.</td></tr>
                ) : filteredBrands.map(b => (
                  <tr key={b.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3.5 font-bold text-slate-900 flex items-center gap-3">
                      <div className="w-12 h-10 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-center p-1.5 overflow-hidden">
                        {b.logo ? (
                          <img src={b.logo} alt={b.name} className="max-h-full max-w-full object-contain" />
                        ) : (
                          <span className="text-[10px] font-black text-slate-400">{b.name.substring(0, 3).toUpperCase()}</span>
                        )}
                      </div>
                      <div>
                        <div className="text-slate-900 font-bold text-sm">{b.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono font-normal">slug: {b.slug}</div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 max-w-xs truncate">
                      {b.description || <span className="text-slate-300 italic">No description</span>}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <button
                        onClick={() => toggleBrandFeatured(b.id)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold cursor-pointer transition-all ${
                          b.isFeatured
                            ? 'bg-amber-50 text-amber-800 border border-amber-300'
                            : 'bg-slate-100 text-slate-400 hover:text-slate-600'
                        }`}
                        title="Click to toggle featured on storefront carousel"
                      >
                        <Star className={`w-3 h-3 ${b.isFeatured ? 'fill-amber-400 text-amber-500' : ''}`} />
                        <span>{b.isFeatured ? 'Featured' : 'Standard'}</span>
                      </button>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <button
                        onClick={() => toggleBrandActive(b.id)}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold cursor-pointer transition-all ${
                          b.isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {b.isActive ? 'Active' : 'Disabled'}
                      </button>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditBrand(b)}
                          title="Edit Brand"
                          className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => removeBrand(b.id, b.name)}
                          title="Delete Brand"
                          className="p-2 rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-100 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ────────────────── CATEGORY MODAL ────────────────── */}
      {catModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form onSubmit={saveCat} className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 animate-in zoom-in-95">
            <h3 className="font-bold text-slate-900 text-lg">{editingCat ? 'Edit Category' : 'Add Category'}</h3>
            {catError && <div className="p-3 rounded-xl bg-rose-50 text-rose-600 text-xs font-semibold">{catError}</div>}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Category Name</label>
              <input required value={catForm.name} onChange={e => setCatForm({ ...catForm, name: e.target.value })} placeholder="e.g. Footwear & Shoes" className="w-full px-3 py-2 border rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500/20" />
              {nameMatches.length > 0 && (
                <div className="mt-2 text-[11px] text-amber-700 bg-amber-50 p-2.5 rounded-xl border border-amber-100 flex flex-col gap-1">
                  <span className="font-semibold">Similar existing categories:</span>
                  <ul className="list-disc pl-4 opacity-80">
                    {nameMatches.map(c => <li key={c.id}>{c.name} <span className="capitalize">({c.vertical})</span></li>)}
                  </ul>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Target Module / Vertical</label>
                <select value={catForm.vertical} onChange={e => setCatForm({ ...catForm, vertical: e.target.value })} className="w-full px-3 py-2 border rounded-xl text-xs font-bold bg-white">
                  {VERTICAL_OPTIONS.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Slug (optional)</label>
                <input value={catForm.slug} onChange={e => setCatForm({ ...catForm, slug: e.target.value })} placeholder="auto" className="w-full px-3 py-2 border rounded-xl text-xs font-medium" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Category Icon / Banner</label>
              <div className="flex items-center gap-3">
                {catForm.image && (
                  <img src={catForm.image} alt="Preview" className="w-10 h-10 rounded-xl object-contain border p-1 bg-white" />
                )}
                <div className="flex-1">
                  <input type="file" accept="image/*" onChange={handleCatImageUpload} disabled={catUploading} className="w-full text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer" />
                </div>
              </div>
              {catUploading && <p className="text-[10px] text-indigo-600 mt-1 font-bold">Uploading to S3...</p>}
            </div>
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setCatModal(false)} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer">Cancel</button>
              <button type="submit" disabled={catUploading} className="flex-1 py-2.5 bg-[#0F2C59] text-white rounded-xl text-xs font-bold hover:bg-[#1a3d73] disabled:opacity-50 cursor-pointer shadow-xs">{editingCat ? 'Save' : 'Create'}</button>
            </div>
          </form>
        </div>
      )}

      {/* ────────────────── BRAND MODAL ────────────────── */}
      {brandModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form onSubmit={saveBrand} className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-amber-500 text-white rounded-xl shadow-xs">
                <Award className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-lg">{editingBrand ? 'Edit Official Brand' : 'Add Official Brand'}</h3>
                <p className="text-[11px] text-slate-500">Curate verified brand names and logos for storefront & vendors</p>
              </div>
            </div>

            {brandError && <div className="p-3 rounded-xl bg-rose-50 text-rose-600 text-xs font-semibold">{brandError}</div>}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Brand Name *</label>
              <input
                required
                value={brandForm.name}
                onChange={e => setBrandForm({ ...brandForm, name: e.target.value })}
                placeholder="e.g. Nike, Apple, boAt, Levi's"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Brand Logo (Image or SVG)</label>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  {brandForm.logo ? (
                    <div className="w-12 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center p-1">
                      <img src={brandForm.logo} alt="Preview" className="max-h-full max-w-full object-contain" />
                    </div>
                  ) : (
                    <div className="w-12 h-10 rounded-xl bg-slate-100 border border-dashed border-slate-300 flex items-center justify-center text-[10px] text-slate-400 font-bold">
                      No Logo
                    </div>
                  )}
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*,.svg"
                      onChange={handleBrandLogoUpload}
                      disabled={brandUploading}
                      className="w-full text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
                    />
                  </div>
                </div>
                {brandUploading && <p className="text-[10px] text-indigo-600 font-bold">Uploading brand logo to S3...</p>}
                <input
                  type="text"
                  value={brandForm.logo}
                  onChange={e => setBrandForm({ ...brandForm, logo: e.target.value })}
                  placeholder="Or paste direct image / SVG URL here"
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-[11px] text-slate-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Short Description (optional)</label>
              <textarea
                rows={2}
                value={brandForm.description}
                onChange={e => setBrandForm({ ...brandForm, description: e.target.value })}
                placeholder="e.g. Leading global electronics & smart audio equipment brand."
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs resize-none"
              />
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 space-y-2">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={brandForm.isFeatured}
                  onChange={e => setBrandForm({ ...brandForm, isFeatured: e.target.checked })}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <span className="text-xs font-bold text-slate-800">Featured in "Explore Top Brands"</span>
                  <p className="text-[10px] text-slate-500">Show this brand card prominently on the customer storefront</p>
                </div>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={brandForm.isActive}
                  onChange={e => setBrandForm({ ...brandForm, isActive: e.target.checked })}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <span className="text-xs font-bold text-slate-800">Active (Visible to Vendors)</span>
                  <p className="text-[10px] text-slate-500">Allow vendors to select this brand when creating products</p>
                </div>
              </label>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setBrandModal(false)}
                className="flex-1 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={brandUploading}
                className="flex-1 py-2.5 bg-[#0F2C59] text-white rounded-xl text-xs font-bold hover:bg-[#1a3d73] disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {editingBrand ? 'Save Changes' : 'Create Brand'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
