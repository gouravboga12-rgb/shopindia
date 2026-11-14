import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Plus, Edit2, Trash2, Search, X, Package, Zap, ShoppingBag, CheckCircle, AlertCircle, RefreshCw, Star, Video, Play } from 'lucide-react';

const parseDescriptionAndReviews = (raw: string) => {
  if (!raw) return { desc: '', reviews: [] };
  const marker = '<!--SHOWCASE_REVIEWS:';
  const idx = raw.indexOf(marker);
  if (idx !== -1) {
    const desc = raw.substring(0, idx).trim();
    try {
      const jsonStr = raw.substring(idx + marker.length).replace(/-->$/, '').trim();
      return { desc, reviews: JSON.parse(jsonStr) };
    } catch {
      return { desc, reviews: [] };
    }
  }
  return { desc: raw, reviews: [] };
};

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
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState<number>(0);
  const [stock, setStock] = useState<number>(10);
  const [fulfillmentType, setFulfillmentType] = useState<'traditional' | 'quick_commerce'>('traditional');
  const [subType, setSubType] = useState<'retail' | 'grocery' | 'food' | 'pharmacy'>('retail');
  const [isVeg, setIsVeg] = useState(true);
  const [isRx, setIsRx] = useState(false);
  const [categoryId, setCategoryId] = useState('');
  const [categories, setCategories] = useState<any[]>([]);
  const [availableBrands, setAvailableBrands] = useState<any[]>([]);
  const [isCustomBrand, setIsCustomBrand] = useState(false);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);

  // Showcase Reviews State (Option 3)
  const [showcaseReviews, setShowcaseReviews] = useState<Array<{ name: string; rating: number; title: string; comment: string }>>([]);
  const [newReviewAuthor, setNewReviewAuthor] = useState('');
  const [newReviewRating, setNewReviewRating] = useState<number>(5);
  const [newReviewTitle, setNewReviewTitle] = useState('');
  const [newReviewComment, setNewReviewComment] = useState('');
  const [showAddReview, setShowAddReview] = useState(false);

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

    api.get<{ brands: any[] }>('/api/brands')
      .then(res => {
        if (res?.brands && Array.isArray(res.brands)) {
          setAvailableBrands(res.brands);
        }
      })
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
    setName(''); setBrand(''); setDescription(''); setPrice(0); setStock(10);
    setIsCustomBrand(false);
    setVendorPrice(0); setMrp(0); setPricePreview(null);
    setShowcaseReviews([]);
    setNewReviewAuthor('');
    setNewReviewRating(5);
    setNewReviewTitle('');
    setNewReviewComment('');
    setShowAddReview(false);
    // Default modal channel matches active section tab if specific
    const initialChannel = activeTab === 'quick_commerce' ? 'quick_commerce' : 'traditional';
    setFulfillmentType(initialChannel);
    setSubType(initialChannel === 'quick_commerce' ? 'grocery' : 'retail');
    setIsVeg(true); setIsRx(false);
    setCategoryId('');
    setImageFiles([]);
    setFilePreviews([]);
    setExistingImages([]);
    setVideoUrl('');
    setVideoFile(null);
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setVideoPreview(null);
  };

  const openAdd = () => { resetForm(); setModal(true); };

  const openEdit = (p: any) => {
    setEditingId(p.id || p._id);
    setName(p.name || '');
    const currentBrand = p.brand || '';
    setBrand(currentBrand);
    const brandMatchesOfficial = availableBrands.some(b => b.name?.toLowerCase() === currentBrand.toLowerCase());
    setIsCustomBrand(Boolean(currentBrand && !brandMatchesOfficial));
    const { desc, reviews } = parseDescriptionAndReviews(p.description || '');
    setDescription(desc);
    setShowcaseReviews(reviews || []);
    setNewReviewAuthor('');
    setNewReviewRating(5);
    setNewReviewTitle('');
    setNewReviewComment('');
    setShowAddReview(false);

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
    
    const prodImages = Array.isArray(p.images)
      ? p.images.map((img: any) => typeof img === 'string' ? img : img.url).filter(Boolean)
      : (p.image ? [p.image] : []);
    setExistingImages(prodImages);
    setImageFiles([]);
    setFilePreviews([]);
    setVideoUrl(p.videoUrl || '');
    setVideoFile(null);
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setVideoPreview(null);
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

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const combinedFiles = [...imageFiles, ...files].slice(0, 8);
    setImageFiles(combinedFiles);
    const newPreviews = files.map(f => URL.createObjectURL(f));
    setFilePreviews(prev => [...prev, ...newPreviews].slice(0, 8));
  };

  const removeExistingImage = (index: number) => {
    setExistingImages(prev => prev.filter((_, i) => i !== index));
  };

  const removeNewFile = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setFilePreviews(prev => {
      if (prev[index]) URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleVideoSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 100 * 1024 * 1024) {
      alert('Video file size exceeds 100MB limit. Please upload a compressed MP4/WebM video.');
      return;
    }
    setVideoFile(file);
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setVideoPreview(URL.createObjectURL(file));
  };

  const removeVideo = () => {
    setVideoFile(null);
    if (videoPreview) {
      URL.revokeObjectURL(videoPreview);
      setVideoPreview(null);
    }
    setVideoUrl('');
  };

  const handleUploadImages = async (): Promise<string[]> => {
    if (imageFiles.length === 0) return [];
    setUploading(true);
    try {
      const formData = new FormData();
      imageFiles.forEach(file => {
        formData.append('images', file);
      });
      const token = localStorage.getItem('shopindia_vendor_token') || localStorage.getItem('shopindia_admin_token');
      const API_BASE = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '') : '';
      const uploadRes = await fetch(`${API_BASE}/api/vendor/products/upload-images`, {
        method: 'POST',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: formData
      });
      if (!uploadRes.ok) {
        const errData = await uploadRes.json().catch(() => ({}));
        throw new Error(errData.error || `Upload failed (HTTP ${uploadRes.status})`);
      }
      const uploadData = await uploadRes.json();
      return uploadData.urls || [];
    } finally {
      setUploading(false);
    }
  };

  const handleUploadVideo = async (): Promise<string | null> => {
    if (!videoFile) return videoUrl || null;
    setUploadingVideo(true);
    try {
      const formData = new FormData();
      formData.append('video', videoFile);
      const token = localStorage.getItem('shopindia_vendor_token') || localStorage.getItem('shopindia_admin_token');
      const API_BASE = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '') : '';
      const uploadRes = await fetch(`${API_BASE}/api/vendor/products/upload-video`, {
        method: 'POST',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: formData
      });
      if (!uploadRes.ok) {
        const errData = await uploadRes.json().catch(() => ({}));
        throw new Error(errData.error || `Video upload failed (HTTP ${uploadRes.status})`);
      }
      const uploadData = await uploadRes.json();
      return uploadData.url;
    } finally {
      setUploadingVideo(false);
    }
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

      let finalDescription = (description || '').trim();
      if (showcaseReviews && showcaseReviews.length > 0) {
        finalDescription += `\n<!--SHOWCASE_REVIEWS:${JSON.stringify(showcaseReviews)}-->`;
      }

      const payload: any = {
        name,
        brand: brand || undefined,
        description: finalDescription || undefined,
        basePrice: price,
        vendorPrice: vendorPrice > 0 ? vendorPrice : price,
        mrp: mrp > 0 ? mrp : undefined,
        stock,
        fulfillmentType,
        tags,
      };

      if (categoryId) payload.categoryId = categoryId;
      
      let uploadedUrls: string[] = [];
      if (imageFiles.length > 0) {
        uploadedUrls = await handleUploadImages();
      }
      const allImages = [...existingImages, ...uploadedUrls];
      if (allImages.length > 0) {
        payload.images = allImages;
      }

      let finalVideoUrl = videoUrl || null;
      if (videoFile) {
        finalVideoUrl = await handleUploadVideo();
      }
      payload.videoUrl = finalVideoUrl;

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
      setUploadingVideo(false);
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
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-gray-700">Official Brand (Optional)</label>
                <button
                  type="button"
                  onClick={() => {
                    setIsCustomBrand(!isCustomBrand);
                    if (isCustomBrand) setBrand('');
                  }}
                  className="text-[11px] text-indigo-600 font-bold hover:underline cursor-pointer"
                >
                  {isCustomBrand ? '← Choose from Verified Brands' : '+ Enter Unlisted / Custom Brand'}
                </button>
              </div>

              {!isCustomBrand ? (
                <select
                  value={brand}
                  onChange={e => {
                    if (e.target.value === '__custom__') {
                      setIsCustomBrand(true);
                      setBrand('');
                    } else {
                      setBrand(e.target.value);
                    }
                  }}
                  className="w-full px-3.5 py-2.5 border rounded-xl text-xs font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="">-- No Brand / Generic / Unbranded --</option>
                  {availableBrands.map(b => (
                    <option key={b.id || b.name} value={b.name}>
                      {b.name} {b.isFeatured ? '★ (Featured Brand)' : ''}
                    </option>
                  ))}
                  <option value="__custom__">+ Other / Not in list...</option>
                </select>
              ) : (
                <div className="space-y-1">
                  <input
                    value={brand}
                    onChange={e => setBrand(e.target.value)}
                    placeholder="Type unlisted brand name (e.g. Local Organic Farm)"
                    className="w-full px-3.5 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                  <p className="text-[10px] text-gray-400">
                    Entering a custom brand. To be featured on the storefront "Explore Brands" carousel, brand must be verified by Admin.
                  </p>
                </div>
              )}
            </div>

            {/* Product Description */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-gray-700">Product Description & Highlights</label>
                <span className="text-[10px] text-gray-400">Shown prominently on product detail page</span>
              </div>
              <textarea
                rows={3}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Detailed product specifications, key features, materials, warranty, usage or cooking instructions..."
                className="w-full px-3.5 py-2 border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#10B981]/20 resize-y"
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

            {/* Product Images (Gallery) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-gray-700">
                  Product Photos ({existingImages.length + imageFiles.length}/8)
                </label>
                <span className="text-[11px] text-gray-400">First photo is cover image</span>
              </div>

              {/* Photo thumbnails grid */}
              {(existingImages.length > 0 || filePreviews.length > 0) && (
                <div className="grid grid-cols-4 gap-2 mb-2.5">
                  {existingImages.map((url, idx) => (
                    <div key={`existing-${idx}`} className="relative aspect-square rounded-xl border border-gray-200 overflow-hidden bg-gray-50 group">
                      <img src={url} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                      {idx === 0 && (
                        <span className="absolute bottom-1 left-1 bg-emerald-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow">
                          Cover
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => removeExistingImage(idx)}
                        className="absolute top-1 right-1 w-5 h-5 bg-red-600 text-white rounded-full flex items-center justify-center opacity-80 hover:opacity-100 shadow transition-opacity"
                        title="Remove image"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  {filePreviews.map((url, idx) => {
                    const isFirstOverall = existingImages.length === 0 && idx === 0;
                    return (
                      <div key={`preview-${idx}`} className="relative aspect-square rounded-xl border-2 border-dashed border-emerald-400 overflow-hidden bg-emerald-50/30 group">
                        <img src={url} alt={`New ${idx + 1}`} className="w-full h-full object-cover" />
                        {isFirstOverall && (
                          <span className="absolute bottom-1 left-1 bg-emerald-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow">
                            Cover
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => removeNewFile(idx)}
                          className="absolute top-1 right-1 w-5 h-5 bg-red-600 text-white rounded-full flex items-center justify-center opacity-80 hover:opacity-100 shadow transition-opacity"
                          title="Remove image"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {existingImages.length + imageFiles.length < 8 && (
                <div>
                  <input
                    id="product-images-input"
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFilesSelected}
                    className="hidden"
                  />
                  <label
                    htmlFor="product-images-input"
                    className="flex items-center justify-center gap-2 w-full py-2.5 px-3 border border-dashed border-gray-300 rounded-xl text-xs font-semibold text-gray-600 hover:text-emerald-700 hover:border-emerald-400 hover:bg-emerald-50/50 cursor-pointer transition-colors"
                  >
                    <Plus size={14} /> Add Product Photos (Upload multiple)
                  </label>
                </div>
              )}
            </div>

            {/* Product Video (Optional) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                  <Video size={14} className="text-indigo-600" />
                  <span>Product Video (Optional)</span>
                </label>
                <span className="text-[11px] text-gray-400">MP4, WebM (up to 50MB)</span>
              </div>

              {(videoPreview || videoUrl) ? (
                <div className="relative rounded-2xl border border-indigo-200 overflow-hidden bg-slate-900 group">
                  <video
                    src={videoPreview || videoUrl}
                    controls
                    playsInline
                    className="w-full h-44 object-contain"
                  />
                  <div className="absolute top-2 left-2 bg-indigo-600/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-md backdrop-blur-xs flex items-center gap-1">
                    <Play size={10} className="fill-white" />
                    <span>{videoPreview ? 'New Video Selected' : 'Active Product Video'}</span>
                  </div>
                  <button
                    type="button"
                    onClick={removeVideo}
                    className="absolute top-2 right-2 px-2.5 py-1 bg-red-600/90 hover:bg-red-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1 shadow transition-colors cursor-pointer"
                  >
                    <Trash2 size={12} />
                    <span>Remove Video</span>
                  </button>
                </div>
              ) : (
                <div>
                  <input
                    id="product-video-input"
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime,video/*"
                    onChange={handleVideoSelected}
                    className="hidden"
                  />
                  <label
                    htmlFor="product-video-input"
                    className="flex flex-col items-center justify-center gap-1.5 w-full py-4 px-3 border-2 border-dashed border-gray-200 hover:border-indigo-400 hover:bg-indigo-50/40 rounded-2xl text-xs cursor-pointer transition-all text-center"
                  >
                    <div className="w-9 h-9 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                      <Video size={18} />
                    </div>
                    <div>
                      <span className="font-bold text-gray-800">Upload Product Video</span>
                      <p className="text-[11px] text-gray-400 mt-0.5">Showcase unboxing, features, demo, or 360 view</p>
                    </div>
                  </label>
                </div>
              )}
            </div>

            {/* Showcase Reviews & Testimonials Section (Option 3) */}
            <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Star size={15} className="fill-amber-400 text-amber-500" />
                  <span className="text-xs font-bold text-gray-800">Showcase Reviews &amp; Testimonials</span>
                </div>
                <span className="text-[10px] text-amber-800 bg-amber-100/70 font-semibold px-2 py-0.5 rounded-full">
                  {showcaseReviews.length} added
                </span>
              </div>
              <p className="text-[11px] text-gray-500 leading-normal">
                Add authentic verified customer feedback to display on your product detail page. Customers cannot tamper with or delete these.
              </p>

              {/* List of currently added showcase reviews */}
              {showcaseReviews.length > 0 && (
                <div className="space-y-2">
                  {showcaseReviews.map((rev, idx) => (
                    <div key={idx} className="p-2.5 bg-white rounded-xl border border-amber-200/60 flex items-start justify-between gap-2 shadow-2xs">
                      <div className="flex flex-col text-left">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-gray-900">{rev.name}</span>
                          <div className="flex text-amber-400">
                            {Array.from({ length: rev.rating }).map((_, i) => (
                              <Star key={i} size={10} className="fill-amber-400 text-amber-400" />
                            ))}
                          </div>
                          {rev.title && <span className="text-[11px] font-semibold text-gray-700">· {rev.title}</span>}
                        </div>
                        <p className="text-[11px] text-gray-600 mt-0.5 leading-snug">{rev.comment}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowcaseReviews(prev => prev.filter((_, i) => i !== idx))}
                        className="text-red-400 hover:text-red-600 p-1 shrink-0"
                        title="Remove review"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add New Review Sub-form */}
              {showAddReview ? (
                <div className="p-3 bg-white rounded-xl border border-amber-200 space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-800">Add Customer Review</span>
                    <button
                      type="button"
                      onClick={() => setShowAddReview(false)}
                      className="text-gray-400 hover:text-gray-600 text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-600 mb-0.5">Customer Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Rahul S. / Verified Customer"
                        value={newReviewAuthor}
                        onChange={e => setNewReviewAuthor(e.target.value)}
                        className="w-full px-2.5 py-1.5 border rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-600 mb-0.5">Rating (1 to 5 Stars)</label>
                      <select
                        value={newReviewRating}
                        onChange={e => setNewReviewRating(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 border rounded-lg text-xs bg-white"
                      >
                        <option value={5}>★★★★★ (5 Stars)</option>
                        <option value={4}>★★★★☆ (4 Stars)</option>
                        <option value={3}>★★★☆☆ (3 Stars)</option>
                        <option value={2}>★★☆☆☆ (2 Stars)</option>
                        <option value={1}>★☆☆☆☆ (1 Star)</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-600 mb-0.5">Review Headline (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Excellent quality and fast shipping"
                      value={newReviewTitle}
                      onChange={e => setNewReviewTitle(e.target.value)}
                      className="w-full px-2.5 py-1.5 border rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-600 mb-0.5">Customer Feedback / Comment</label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Product was delivered in perfect condition. Value for money!"
                      value={newReviewComment}
                      onChange={e => setNewReviewComment(e.target.value)}
                      className="w-full px-2.5 py-1.5 border rounded-lg text-xs"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!newReviewComment.trim()) {
                        alert('Please enter review comment.');
                        return;
                      }
                      setShowcaseReviews(prev => [
                        ...prev,
                        {
                          name: newReviewAuthor.trim() || 'Verified Buyer',
                          rating: newReviewRating || 5,
                          title: newReviewTitle.trim() || 'Verified Customer Review',
                          comment: newReviewComment.trim()
                        }
                      ]);
                      setNewReviewAuthor('');
                      setNewReviewRating(5);
                      setNewReviewTitle('');
                      setNewReviewComment('');
                      setShowAddReview(false);
                    }}
                    className="w-full py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs"
                  >
                    + Add to Product Reviews
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowAddReview(true)}
                  className="w-full py-2 bg-white hover:bg-amber-50 text-amber-800 border border-amber-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Plus size={14} /> Add Showcase Review / Testimonial
                </button>
              )}
            </div>

            {/* Buttons */}
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => { setModal(false); resetForm(); }}
                className="flex-1 py-2.5 border rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 cursor-pointer"
                disabled={uploading || uploadingVideo}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={uploading || uploadingVideo}
                className="flex-1 py-2.5 bg-[#10B981] text-white rounded-xl text-sm font-bold hover:bg-[#059669] shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {(uploading || uploadingVideo) ? 'Uploading media...' : editingId ? 'Save Changes' : 'Publish Product'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
