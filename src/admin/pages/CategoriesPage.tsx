import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import {
  Plus, Edit2, Trash2, Eye, EyeOff, Tag, Award, Star, Search,
  ShoppingBag, Zap, Wrench, UtensilsCrossed, Apple, Pill, Car, Home,
  Info, Check
} from 'lucide-react';

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

const VERTICAL_METADATA: Record<string, {
  label: string;
  channel: 'shop' | 'quick' | 'services';
  channelName: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  usedFor: string;
  icon: any;
}> = {
  shop: {
    label: 'Traditional E-Commerce',
    channel: 'shop',
    channelName: 'Shop India (E-Commerce)',
    badgeBg: 'bg-blue-50',
    badgeText: 'text-blue-700',
    badgeBorder: 'border-blue-200',
    usedFor: 'Shop India Storefront (Pan-India courier delivery: Fashion, Electronics, Footwear, Lifestyle)',
    icon: ShoppingBag,
  },
  quick_grocery: {
    label: 'Instant Grocery',
    channel: 'quick',
    channelName: 'Quick Shopping: Grocery',
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-700',
    badgeBorder: 'border-emerald-200',
    usedFor: 'Quick Shopping (10-20 min rider delivery: Fruits, Veggies, Dairy, Snacks, Daily Essentials)',
    icon: Apple,
  },
  quick_food: {
    label: 'Food & Restaurants',
    channel: 'quick',
    channelName: 'Quick Shopping: Food',
    badgeBg: 'bg-orange-50',
    badgeText: 'text-orange-700',
    badgeBorder: 'border-orange-200',
    usedFor: 'Quick Food Section (Restaurant delivery: Biryani, Pizzas, Curries, Bakery, Beverages)',
    icon: UtensilsCrossed,
  },
  quick_pharmacy: {
    label: 'Pharmacy & Meds',
    channel: 'quick',
    channelName: 'Quick Shopping: Pharmacy',
    badgeBg: 'bg-cyan-50',
    badgeText: 'text-cyan-700',
    badgeBorder: 'border-cyan-200',
    usedFor: 'Quick Pharmacy (Chemist delivery: Medicines, First Aid, Health Supplements, Rx drugs)',
    icon: Pill,
  },
  services_home: {
    label: 'Home Services',
    channel: 'services',
    channelName: 'Glacons: Home Repairs',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-800',
    badgeBorder: 'border-amber-200',
    usedFor: 'Glacons Services (Technician visits: AC cleaning, Electrician, Plumbing, Appliance fixes)',
    icon: Home,
  },
  services_vehicle: {
    label: 'Vehicle Services',
    channel: 'services',
    channelName: 'Glacons: Vehicle Repairs',
    badgeBg: 'bg-purple-50',
    badgeText: 'text-purple-700',
    badgeBorder: 'border-purple-200',
    usedFor: 'Glacons Vehicle Care (Mechanic visits: Car wash, Bike servicing, Battery replacement)',
    icon: Car,
  },
};

export const CategoriesPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'categories' | 'brands'>('categories');

  // Categories State
  const [cats, setCats] = useState<Category[]>([]);
  const [loadingCats, setLoadingCats] = useState(true);
  const [catModal, setCatModal] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [catForm, setCatForm] = useState({ name: '', vertical: 'shop', image: '', slug: '' });
  const [catError, setCatError] = useState<string | null>(null);
  const [catUploading, setCatUploading] = useState(false);
  const [catSearch, setCatSearch] = useState('');
  const [channelFilter, setChannelFilter] = useState<'all' | 'shop' | 'quick' | 'quick_grocery' | 'quick_food' | 'quick_pharmacy' | 'services'>('all');

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

  // --- Category Counts ---
  const shopCount = cats.filter(c => (c.vertical || '').toLowerCase() === 'shop').length;
  const quickCount = cats.filter(c => (c.vertical || '').startsWith('quick')).length;
  const groceryCount = cats.filter(c => c.vertical === 'quick_grocery').length;
  const foodCount = cats.filter(c => c.vertical === 'quick_food').length;
  const pharmacyCount = cats.filter(c => c.vertical === 'quick_pharmacy').length;
  const servicesCount = cats.filter(c => (c.vertical || '').startsWith('services')).length;

  // --- Category Filter Handler ---
  const filteredCats = cats.filter(c => {
    const v = (c.vertical || '').toLowerCase();
    if (channelFilter === 'shop' && v !== 'shop') return false;
    if (channelFilter === 'quick' && !v.startsWith('quick')) return false;
    if (channelFilter === 'quick_grocery' && v !== 'quick_grocery') return false;
    if (channelFilter === 'quick_food' && v !== 'quick_food') return false;
    if (channelFilter === 'quick_pharmacy' && v !== 'quick_pharmacy') return false;
    if (channelFilter === 'services' && !v.startsWith('services')) return false;

    if (catSearch.trim()) {
      const q = catSearch.toLowerCase();
      const meta = VERTICAL_METADATA[c.vertical];
      return (
        c.name.toLowerCase().includes(q) ||
        v.includes(q) ||
        (meta && meta.channelName.toLowerCase().includes(q)) ||
        (meta && meta.usedFor.toLowerCase().includes(q)) ||
        (c.slug && c.slug.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const nameMatches = catForm.name.trim().length > 1 ? cats.filter(c => 
    c.name.toLowerCase().includes(catForm.name.toLowerCase()) && c.id !== editingCat?.id
  ) : [];

  const openCreateCat = () => {
    setEditingCat(null);
    // If a channel filter is active, default the new category to that channel
    const defaultVertical = channelFilter === 'shop' ? 'shop' :
      channelFilter === 'quick_food' ? 'quick_food' :
      channelFilter === 'quick_pharmacy' ? 'quick_pharmacy' :
      channelFilter === 'services' ? 'services_home' :
      channelFilter === 'quick' ? 'quick_grocery' : 'shop';

    setCatForm({ name: '', vertical: defaultVertical, image: '', slug: '' });
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
    if (!confirm('Delete this category? Products in this category will become uncategorized.')) return;
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

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Top Header & Main Tab Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Categories & Official Brands</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Organize catalog categories by business vertical (Shop India, Quick Shopping, Glacons) and manage official brands
          </p>
        </div>

        {/* Master Tabs: Categories vs Brands */}
        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200/80 shadow-2xs">
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
          {/* Explanation Banner to clear confusion between Shop India, Quick Shopping, and Glacons */}
          <div className="bg-gradient-to-r from-blue-50/80 via-emerald-50/50 to-amber-50/50 border border-slate-200/80 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
            <div className="flex items-start gap-2.5">
              <div className="p-1.5 bg-indigo-600 text-white rounded-lg shrink-0 mt-0.5">
                <Info className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <span className="font-bold text-slate-900 text-xs">Understanding Platform Categories:</span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[11px] text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0"></span>
                    <span><strong>Shop India:</strong> Courier Pan-India delivery (Fashion, Tech, Shoes)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0"></span>
                    <span><strong>Quick Shopping:</strong> 10-20 min delivery (Grocery, Food, Pharmacy)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-600 shrink-0"></span>
                    <span><strong>Glacons:</strong> At-home technician repairs & maintenance</span>
                  </div>
                </div>
              </div>
            </div>
            <button
              onClick={openCreateCat}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#0F2C59] text-white rounded-xl text-xs font-bold hover:bg-[#1a3d73] shadow-xs cursor-pointer whitespace-nowrap self-end md:self-auto"
            >
              <Plus className="w-3.5 h-3.5" /> Add Category
            </button>
          </div>

          {/* Vertical Channel Filter Pills */}
          <div className="flex flex-wrap items-center gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-200/80">
            <button
              onClick={() => setChannelFilter('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                channelFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200/60'
              }`}
            >
              All Channels ({cats.length})
            </button>

            <button
              onClick={() => setChannelFilter('shop')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                channelFilter === 'shop'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-blue-700 hover:bg-blue-50 border border-blue-200'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Shop India ({shopCount})</span>
            </button>

            <div className="h-4 w-px bg-slate-300 mx-1 hidden sm:block"></div>

            <button
              onClick={() => setChannelFilter('quick')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                channelFilter === 'quick'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white text-emerald-700 hover:bg-emerald-50 border border-emerald-200'
              }`}
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>All Quick Shopping ({quickCount})</span>
            </button>

            <button
              onClick={() => setChannelFilter('quick_grocery')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                channelFilter === 'quick_grocery'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-white text-emerald-800 hover:bg-emerald-50 border border-emerald-200/70'
              }`}
            >
              <Apple className="w-3 h-3" />
              <span>Grocery ({groceryCount})</span>
            </button>

            <button
              onClick={() => setChannelFilter('quick_food')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                channelFilter === 'quick_food'
                  ? 'bg-orange-600 text-white shadow-xs'
                  : 'bg-white text-orange-700 hover:bg-orange-50 border border-orange-200/70'
              }`}
            >
              <UtensilsCrossed className="w-3 h-3" />
              <span>Food Delivery ({foodCount})</span>
            </button>

            <button
              onClick={() => setChannelFilter('quick_pharmacy')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                channelFilter === 'quick_pharmacy'
                  ? 'bg-cyan-600 text-white shadow-xs'
                  : 'bg-white text-cyan-700 hover:bg-cyan-50 border border-cyan-200/70'
              }`}
            >
              <Pill className="w-3 h-3" />
              <span>Pharmacy ({pharmacyCount})</span>
            </button>

            <div className="h-4 w-px bg-slate-300 mx-1 hidden sm:block"></div>

            <button
              onClick={() => setChannelFilter('services')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                channelFilter === 'services'
                  ? 'bg-purple-700 text-white shadow-xs'
                  : 'bg-white text-purple-700 hover:bg-purple-50 border border-purple-200'
              }`}
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>Glacons Services ({servicesCount})</span>
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search category name, channel, or purpose..."
              value={catSearch}
              onChange={(e) => setCatSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {/* Categories Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-600 font-bold">
                <tr>
                  <th className="text-left px-5 py-3.5">Category Name</th>
                  <th className="text-left px-5 py-3.5">Business Channel</th>
                  <th className="text-left px-5 py-3.5 hidden md:table-cell">Where It Appears & Purpose</th>
                  <th className="text-center px-4 py-3.5">Products</th>
                  <th className="text-center px-4 py-3.5">Status</th>
                  <th className="text-right px-5 py-3.5">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loadingCats ? (
                  <tr><td colSpan={6} className="text-center py-10 text-slate-400 font-medium">Loading platform categories...</td></tr>
                ) : filteredCats.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-slate-400 font-medium">
                      No categories found for this channel. Click "Add Category" above to create one.
                    </td>
                  </tr>
                ) : filteredCats.map(c => {
                  const meta = VERTICAL_METADATA[c.vertical] || {
                    label: c.vertical,
                    channel: 'shop',
                    channelName: c.vertical.toUpperCase(),
                    badgeBg: 'bg-slate-100',
                    badgeText: 'text-slate-700',
                    badgeBorder: 'border-slate-200',
                    usedFor: 'General Catalog',
                    icon: Tag
                  };
                  const Icon = meta.icon;

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Name & Icon */}
                      <td className="px-5 py-3.5 font-bold text-slate-900">
                        <div className="flex items-center gap-3">
                          {c.image ? (
                            <img src={c.image} alt="" className="w-8 h-8 rounded-lg object-contain border border-slate-100 p-0.5 bg-white shrink-0" />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-xs font-black text-slate-400 shrink-0">
                              {c.name[0]}
                            </div>
                          )}
                          <div>
                            <div className="text-slate-900 font-bold">{c.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono font-normal">/{c.slug}</div>
                          </div>
                        </div>
                      </td>

                      {/* Channel Badge */}
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${meta.badgeBg} ${meta.badgeText} ${meta.badgeBorder}`}>
                          <Icon className="w-3 h-3" />
                          <span>{meta.channelName}</span>
                        </span>
                      </td>

                      {/* Where it appears & Purpose */}
                      <td className="px-5 py-3.5 text-slate-500 max-w-sm hidden md:table-cell">
                        <span className="text-[11px] leading-snug block">{meta.usedFor}</span>
                      </td>

                      {/* Product Count */}
                      <td className="px-4 py-3.5 text-center font-bold text-slate-600 font-numbers">
                        {c._count?.products || 0}
                      </td>

                      {/* Status Toggle */}
                      <td className="px-4 py-3.5 text-center">
                        <button
                          onClick={() => toggleCat(c.id)}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold cursor-pointer transition-all ${
                            c.isActive
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-500 border border-slate-200'
                          }`}
                        >
                          {c.isActive ? 'Active' : 'Disabled'}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => toggleCat(c.id)}
                            title={c.isActive ? 'Disable' : 'Enable'}
                            className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 cursor-pointer"
                          >
                            {c.isActive ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            onClick={() => openEditCat(c)}
                            title="Edit Category"
                            className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => removeCat(c.id)}
                            title="Delete Category"
                            className="p-1.5 rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-100 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ────────────────── BRANDS TAB ────────────────── */}
      {activeTab === 'brands' && (
        <div className="space-y-4">
          <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
            <div className="flex items-start gap-2.5">
              <div className="p-1.5 bg-amber-500 text-white rounded-lg shrink-0 mt-0.5">
                <Award className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <span className="font-bold text-slate-900 text-xs">Official Brand System (Dynamic):</span>
                <p className="text-[11px] text-slate-600">
                  Every brand created here is saved directly to the database. It immediately populates the <strong>Vendor Product Upload</strong> dropdown and the <strong>Storefront "Explore Top Brands"</strong> carousel when marked Featured.
                </p>
              </div>
            </div>
            <button
              onClick={() => { openCreateBrand(); if (brandSearch) setBrandForm(prev => ({ ...prev, name: brandSearch })); }}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#0F2C59] text-white rounded-xl text-xs font-bold hover:bg-[#1a3d73] shadow-xs cursor-pointer whitespace-nowrap self-end md:self-auto"
            >
              <Plus className="w-3.5 h-3.5" /> Add Official Brand
            </button>
          </div>

          <div className="relative max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search official brands by name or description..."
              value={brandSearch}
              onChange={(e) => setBrandSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-600 font-bold">
                <tr>
                  <th className="text-left px-5 py-3.5">Brand & Logo</th>
                  <th className="text-left px-5 py-3.5">Description</th>
                  <th className="text-center px-5 py-3.5">Storefront Featured</th>
                  <th className="text-center px-5 py-3.5">Vendor Visibility</th>
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
                        title="Toggle visibility in Explore Top Brands carousel"
                      >
                        <Star className={`w-3 h-3 ${b.isFeatured ? 'fill-amber-400 text-amber-500' : ''}`} />
                        <span>{b.isFeatured ? 'Featured on Storefront' : 'Standard'}</span>
                      </button>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <button
                        onClick={() => toggleBrandActive(b.id)}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold cursor-pointer transition-all ${
                          b.isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {b.isActive ? 'Active (In Vendor List)' : 'Disabled'}
                      </button>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditBrand(b)}
                          title="Edit Brand"
                          className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => removeBrand(b.id, b.name)}
                          title="Delete Brand"
                          className="p-1.5 rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-100 cursor-pointer"
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <form onSubmit={saveCat} className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4 my-8 max-h-[90vh] overflow-y-auto animate-in zoom-in-95">
            <div>
              <h3 className="font-bold text-slate-900 text-lg">{editingCat ? 'Edit Category' : 'Create New Category'}</h3>
              <p className="text-xs text-slate-500">Assign this category to the correct business vertical so products appear in the right place</p>
            </div>

            {catError && <div className="p-3 rounded-xl bg-rose-50 text-rose-600 text-xs font-semibold">{catError}</div>}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Category Name *</label>
              <input
                required
                value={catForm.name}
                onChange={e => setCatForm({ ...catForm, name: e.target.value })}
                placeholder="e.g. Footwear & Sneakers / Basmati Rice & Grains / AC Service"
                className="w-full px-3.5 py-2.5 border rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500/20"
              />
              {nameMatches.length > 0 && (
                <div className="mt-2 text-[11px] text-amber-700 bg-amber-50 p-2.5 rounded-xl border border-amber-100 flex flex-col gap-1">
                  <span className="font-semibold">Similar existing categories:</span>
                  <ul className="list-disc pl-4 opacity-80">
                    {nameMatches.map(c => <li key={c.id}>{c.name} <span className="capitalize">({c.vertical})</span></li>)}
                  </ul>
                </div>
              )}
            </div>

            {/* Clear Visual Vertical Channel Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Select Business Channel / Vertical *
              </label>
              <div className="space-y-2">
                {/* 1. Shop India Option */}
                <div
                  onClick={() => setCatForm({ ...catForm, vertical: 'shop' })}
                  className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 ${
                    catForm.vertical === 'shop'
                      ? 'bg-blue-50/80 border-blue-400 ring-2 ring-blue-500/20'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className={`p-2 rounded-xl mt-0.5 ${catForm.vertical === 'shop' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                    <ShoppingBag className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">🛍️ Shop India (Traditional E-Commerce)</span>
                      {catForm.vertical === 'shop' && <Check className="w-4 h-4 text-blue-600" />}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Standard courier delivery pan-India. For Fashion, Electronics, Footwear, Books, and General Goods.
                    </p>
                  </div>
                </div>

                {/* 2. Quick Shopping Options */}
                <div className="p-3 bg-emerald-50/40 rounded-2xl border border-emerald-200/80 space-y-2">
                  <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 fill-emerald-600 text-emerald-600" />
                    <span>⚡ Quick Shopping (Hyperlocal 10-20 Min Rider Delivery)</span>
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {[
                      { id: 'quick_grocery', label: '🥦 Instant Grocery', desc: 'Fruits, dairy, snacks' },
                      { id: 'quick_food', label: '🍲 Food & Dining', desc: 'Restaurant dishes' },
                      { id: 'quick_pharmacy', label: '💊 Pharmacy', desc: 'Meds & healthcare' },
                    ].map(opt => (
                      <button
                        type="button"
                        key={opt.id}
                        onClick={() => setCatForm({ ...catForm, vertical: opt.id })}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          catForm.vertical === opt.id
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : 'bg-white text-slate-700 border-emerald-200 hover:bg-emerald-100/50'
                        }`}
                      >
                        <div className="text-xs font-bold">{opt.label}</div>
                        <div className={`text-[10px] mt-0.5 ${catForm.vertical === opt.id ? 'text-emerald-100' : 'text-slate-400'}`}>
                          {opt.desc}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Glacons Services */}
                <div className="p-3 bg-amber-50/40 rounded-2xl border border-amber-200/80 space-y-2">
                  <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                    <Wrench className="w-3.5 h-3.5 text-amber-600" />
                    <span>🔧 Glacons (On-Demand Repair & Maintenance Services)</span>
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[
                      { id: 'services_home', label: '🏠 Home Services', desc: 'AC, plumbing, electrician' },
                      { id: 'services_vehicle', label: '🚗 Vehicle Services', desc: 'Car wash, bike repair' },
                    ].map(opt => (
                      <button
                        type="button"
                        key={opt.id}
                        onClick={() => setCatForm({ ...catForm, vertical: opt.id })}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          catForm.vertical === opt.id
                            ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                            : 'bg-white text-slate-700 border-amber-200 hover:bg-amber-100/50'
                        }`}
                      >
                        <div className="text-xs font-bold">{opt.label}</div>
                        <div className={`text-[10px] mt-0.5 ${catForm.vertical === opt.id ? 'text-amber-100' : 'text-slate-400'}`}>
                          {opt.desc}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Slug (optional)</label>
              <input
                value={catForm.slug}
                onChange={e => setCatForm({ ...catForm, slug: e.target.value })}
                placeholder="Leave blank for auto-generated slug"
                className="w-full px-3 py-2 border rounded-xl text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Category Icon / Image</label>
              <div className="flex items-center gap-3">
                {catForm.image && (
                  <img src={catForm.image} alt="Preview" className="w-10 h-10 rounded-xl object-contain border p-1 bg-white" />
                )}
                <div className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleCatImageUpload}
                    disabled={catUploading}
                    className="w-full text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
                  />
                </div>
              </div>
              {catUploading && <p className="text-[10px] text-indigo-600 mt-1 font-bold">Uploading to S3...</p>}
            </div>

            <div className="flex gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setCatModal(false)}
                className="flex-1 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={catUploading}
                className="flex-1 py-2.5 bg-[#0F2C59] text-white rounded-xl text-xs font-bold hover:bg-[#1a3d73] disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {editingCat ? 'Save Changes' : 'Create Category'}
              </button>
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
                placeholder="e.g. Nike, Apple, boAt, Levi's, Puma, Zudio"
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
