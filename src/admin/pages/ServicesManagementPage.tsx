import React, { useEffect, useState, useMemo, useRef } from 'react';
import { api } from '../../lib/api';
import {
  Wrench, Search, Plus, Edit2, Trash2, Clock, CheckCircle2,
  X, AlertCircle, Sparkles, RefreshCw, ShieldCheck, Save, Zap, Calendar,
  Upload, Image as ImageIcon, Home, Car, ChevronRight, ChevronLeft, PlusCircle, Check,
  Layers, CheckSquare
} from 'lucide-react';

interface Category {
  id: string;
  name: string;
  vertical: string;
  slug?: string;
}

interface ServiceItem {
  id: string;
  _id?: string;
  name: string;
  description?: string | null;
  basePrice: number; // Standard Doorstep Visit Charge
  vendorPrice?: number | null; // Technician Guaranteed Pay
  mrp?: number | null;
  stock: number;
  status: string;
  fulfillmentType: string;
  durationEstimate?: string | null;
  serviceSlots?: string[];
  tags: string[];
  category?: { id: string; name: string; vertical: string; slug?: string } | null;
  images?: Array<{ url: string; displayOrder?: number }>;
  _count?: { orderItems: number };
}

export const ServicesManagementPage: React.FC = () => {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [selectedSectionFilter, setSelectedSectionFilter] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Commission Settings State
  const [commissionPct, setCommissionPct] = useState('20');
  const [savingCommission, setSavingCommission] = useState(false);
  const [applyingCommission, setApplyingCommission] = useState(false);
  const [simPrice, setSimPrice] = useState(500);
  const [commissionToast, setCommissionToast] = useState<string | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [selectedSection, setSelectedSection] = useState<'services_home' | 'services_vehicle' | 'custom'>('services_home');
  const [categoryId, setCategoryId] = useState('');
  const [doorstepVisitCharge, setDoorstepVisitCharge] = useState('499');
  const [technicianGuaranteedPay, setTechnicianGuaranteedPay] = useState('400');
  const [mrp, setMrp] = useState('699');
  const [duration, setDuration] = useState('60 mins');
  const [supportedBookingModes, setSupportedBookingModes] = useState<'both' | 'instant' | 'scheduled'>('both');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('active');

  // Multi-Image State
  const [images, setImages] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [manualImageUrl, setManualImageUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Inclusions State
  const [inclusions, setInclusions] = useState<string[]>([]);
  const [newInclusion, setNewInclusion] = useState('');

  // Quick Category Creator Modal
  const [showQuickCatModal, setShowQuickCatModal] = useState(false);
  const [quickCatName, setQuickCatName] = useState('');
  const [quickCatSection, setQuickCatSection] = useState('services_home');
  const [creatingQuickCat, setCreatingQuickCat] = useState(false);
  const [quickCatError, setQuickCatError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [prodRes, catRes, setRes]: any = await Promise.all([
        api.get<{ products: ServiceItem[] }>('/api/admin/products?vertical=services&limit=150'),
        api.get<Category[] | { categories: Category[] }>('/api/admin/categories'),
        api.get('/api/admin/pricing/settings').catch(() => ({ settings: {} }))
      ]);

      const prodList = (prodRes as any).products || [];
      setServices(prodList);

      const rawCats = Array.isArray(catRes) ? catRes : (catRes as any).categories || [];
      const serviceCats = rawCats.filter((c: any) =>
        c.vertical?.includes('service') || c.vertical === 'services' || c.vertical === 'services_home' || c.vertical === 'services_vehicle'
      );
      setCategories(serviceCats);

      if (setRes?.settings?.service_commission_pct) {
        setCommissionPct(String(setRes.settings.service_commission_pct));
      }
    } catch (err: any) {
      console.error('Failed to load services data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Save Commission Rate setting only
  const handleSaveCommissionRate = async () => {
    setSavingCommission(true);
    try {
      await api.post('/api/admin/pricing/settings', {
        settings: { service_commission_pct: commissionPct }
      });
      setCommissionToast('Platform service commission saved successfully!');
      setTimeout(() => setCommissionToast(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to update commission rate');
    } finally {
      setSavingCommission(false);
    }
  };

  // Save & Apply Commission to all existing services in DB
  const handleApplyCommissionToAll = async () => {
    const pct = parseFloat(commissionPct);
    if (isNaN(pct) || pct < 0 || pct > 75) {
      return alert('Commission percentage must be between 0% and 75%');
    }
    if (!confirm(`Apply ${pct}% commission to ALL doorstep services and recalculate guaranteed technician payouts in database?`)) {
      return;
    }

    setApplyingCommission(true);
    try {
      const res: any = await api.post('/api/admin/pricing/apply-service-commission', {
        commissionPct: pct
      });
      setCommissionToast(res.message || `Updated ${res.updatedServicesCount || 'all'} services to ${pct}% commission!`);
      setTimeout(() => setCommissionToast(null), 5000);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to apply commission rate to services');
    } finally {
      setApplyingCommission(false);
    }
  };

  // Handle visit charge change & auto-calculate technician pay based on active slider
  const handleDoorstepChargeChange = (val: string) => {
    setDoorstepVisitCharge(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      const commRate = parseFloat(commissionPct) || 20;
      const techPay = Math.round(num * (1 - commRate / 100));
      setTechnicianGuaranteedPay(String(techPay));
    }
  };

  // Multi-Image Upload
  const handleUploadImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingImages(true);
    try {
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append('images', files[i]);
      }
      const data: any = await api.post('/api/admin/products/upload-images', formData);
      if (data?.urls && Array.isArray(data.urls)) {
        setImages(prev => [...prev, ...data.urls]);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to upload images');
    } finally {
      setUploadingImages(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleAddManualImage = () => {
    if (!manualImageUrl.trim()) return;
    setImages(prev => [...prev, manualImageUrl.trim()]);
    setManualImageUrl('');
  };

  const moveImage = (index: number, direction: 'left' | 'right') => {
    setImages(prev => {
      const copy = [...prev];
      const target = direction === 'left' ? index - 1 : index + 1;
      if (target < 0 || target >= copy.length) return prev;
      const temp = copy[index];
      copy[index] = copy[target];
      copy[target] = temp;
      return copy;
    });
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  // Inclusions handlers
  const handleAddInclusion = () => {
    if (!newInclusion.trim()) return;
    if (!inclusions.includes(newInclusion.trim())) {
      setInclusions(prev => [...prev, newInclusion.trim()]);
    }
    setNewInclusion('');
  };

  const handleRemoveInclusion = (index: number) => {
    setInclusions(prev => prev.filter((_, i) => i !== index));
  };

  // Create Quick Category
  const handleCreateQuickCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickCatName.trim()) return setQuickCatError('Category name is required');
    setCreatingQuickCat(true);
    setQuickCatError(null);
    try {
      const vertical = quickCatSection || 'services_home';
      const slug = quickCatName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const res: any = await api.post('/api/admin/categories', {
        name: quickCatName.trim(),
        vertical,
        slug
      });
      const newCat = res.category || res;
      await loadData();
      if (newCat?.id) {
        setCategoryId(newCat.id);
      }
      setShowQuickCatModal(false);
      setQuickCatName('');
    } catch (err: any) {
      setQuickCatError(err.message || 'Failed to create category');
    } finally {
      setCreatingQuickCat(false);
    }
  };

  // Filter categories by the modal's selected section
  const modalFilteredCategories = useMemo(() => {
    if (selectedSection === 'services_home') {
      return categories.filter(c => c.vertical === 'services_home' || c.vertical === 'services' || (!c.vertical.includes('vehicle') && !c.name.toLowerCase().includes('car') && !c.name.toLowerCase().includes('bike')));
    }
    if (selectedSection === 'services_vehicle') {
      return categories.filter(c => c.vertical === 'services_vehicle' || c.name.toLowerCase().includes('vehicle') || c.name.toLowerCase().includes('car') || c.name.toLowerCase().includes('bike') || c.name.toLowerCase().includes('towing'));
    }
    return categories;
  }, [categories, selectedSection]);

  const openCreateModal = () => {
    setEditingService(null);
    setName('');
    setSelectedSection('services_home');
    setCategoryId(categories[0]?.id || '');
    setDoorstepVisitCharge('499');
    const commRate = parseFloat(commissionPct) || 20;
    setTechnicianGuaranteedPay(String(Math.round(499 * (1 - commRate / 100))));
    setMrp('699');
    setDuration('60 mins');
    setSupportedBookingModes('both');
    setDescription('');
    setImages([]);
    setInclusions([
      'Transparent upfront pricing & no hidden charges',
      'Verified & background-checked service technician',
      '30-day post-service warranty'
    ]);
    setStatus('active');
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (service: ServiceItem) => {
    setEditingService(service);
    setName(service.name);

    // Detect section
    const catVert = service.category?.vertical || '';
    if (catVert === 'services_vehicle' || service.name.toLowerCase().includes('car') || service.name.toLowerCase().includes('bike')) {
      setSelectedSection('services_vehicle');
    } else if (catVert === 'services_home') {
      setSelectedSection('services_home');
    } else {
      setSelectedSection('services_home');
    }

    setCategoryId(service.category?.id || '');
    setDoorstepVisitCharge(String(service.basePrice || '499'));
    const commRate = parseFloat(commissionPct) || 20;
    setTechnicianGuaranteedPay(
      String(service.vendorPrice ?? Math.round((service.basePrice || 499) * (1 - commRate / 100)))
    );
    setMrp(service.mrp ? String(service.mrp) : '');
    setDuration(service.durationEstimate || '60 mins');
    setDescription(service.description || '');

    // Parse booking modes from tags
    const existingTags = service.tags || [];
    let bMode: 'both' | 'instant' | 'scheduled' = 'both';
    if (existingTags.includes('instant_only')) bMode = 'instant';
    else if (existingTags.includes('scheduled_only')) bMode = 'scheduled';
    setSupportedBookingModes(bMode);

    // Inclusions
    const parsedInclusions = existingTags
      .filter(t => t.startsWith('inc:'))
      .map(t => t.replace('inc:', ''));
    setInclusions(parsedInclusions.length > 0 ? parsedInclusions : [
      'Transparent upfront pricing & no hidden charges',
      'Verified & background-checked service technician',
      '30-day post-service warranty'
    ]);

    // Images
    const imgs = (service.images || []).map(img => img.url);
    setImages(imgs);

    setStatus(service.status || 'active');
    setFormError(null);
    setModalOpen(true);
  };

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setFormError('Service name is required');
    if (!doorstepVisitCharge || isNaN(Number(doorstepVisitCharge)) || Number(doorstepVisitCharge) <= 0) {
      return setFormError('Enter a valid Standard Doorstep Visit Charge (₹)');
    }
    if (!technicianGuaranteedPay || isNaN(Number(technicianGuaranteedPay)) || Number(technicianGuaranteedPay) < 0) {
      return setFormError('Enter a valid Technician Guaranteed Pay (₹)');
    }
    if (Number(technicianGuaranteedPay) > Number(doorstepVisitCharge)) {
      return setFormError('Technician Guaranteed Pay cannot exceed the Standard Doorstep Visit Charge');
    }

    setSaving(true);
    setFormError(null);

    try {
      const tagList = ['doorstep_service', selectedSection === 'services_vehicle' ? 'vehicle_service' : 'home_service'];
      if (supportedBookingModes === 'instant') tagList.push('instant_only');
      else if (supportedBookingModes === 'scheduled') tagList.push('scheduled_only');
      else tagList.push('dual_mode');

      // Add structured inclusions
      inclusions.forEach(inc => {
        if (inc.trim()) tagList.push(`inc:${inc.trim()}`);
      });

      const payload: any = {
        name: name.trim(),
        description: description.trim() || null,
        basePrice: parseFloat(doorstepVisitCharge),
        vendorPrice: parseFloat(technicianGuaranteedPay),
        mrp: mrp ? parseFloat(mrp) : null,
        durationEstimate: duration,
        status,
        fulfillmentType: 'hvac_service',
        stock: 999,
        categoryId: categoryId || undefined,
        tags: tagList,
        images: images.length > 0 ? images : []
      };

      if (editingService) {
        await api.put(`/api/admin/products/${editingService.id || editingService._id}`, payload);
      } else {
        await api.post('/api/admin/products', payload);
      }

      setModalOpen(false);
      loadData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save service');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteService = async (id: string, serviceName: string) => {
    if (!confirm(`Are you sure you want to delete "${serviceName}"?`)) return;
    try {
      await api.delete(`/api/admin/products/${id}`);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete service');
    }
  };

  // Filter Catalog
  const filtered = services.filter(s => {
    const matchesQ = !q || s.name.toLowerCase().includes(q.toLowerCase());
    
    // Section match
    let matchesSection = true;
    if (selectedSectionFilter === 'services_home') {
      const v = (s.category?.vertical || '').toLowerCase();
      const isVeh = v === 'services_vehicle' || s.name.toLowerCase().includes('car') || s.name.toLowerCase().includes('bike') || s.name.toLowerCase().includes('towing');
      matchesSection = !isVeh;
    } else if (selectedSectionFilter === 'services_vehicle') {
      const v = (s.category?.vertical || '').toLowerCase();
      matchesSection = v === 'services_vehicle' || s.name.toLowerCase().includes('car') || s.name.toLowerCase().includes('bike') || s.name.toLowerCase().includes('towing');
    } else if (selectedSectionFilter === 'other') {
      const v = (s.category?.vertical || '').toLowerCase();
      matchesSection = v !== 'services_home' && v !== 'services_vehicle' && v !== 'services';
    }

    const matchesCat = selectedCategory === 'all' || s.category?.id === selectedCategory;
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    return matchesQ && matchesSection && matchesCat && matchesStatus;
  });

  const totalBookings = services.reduce((sum, s) => sum + (s._count?.orderItems || 0), 0);
  const activeCount = services.filter(s => s.status === 'active').length;
  const activeCommNum = Math.max(0, Math.min(100, parseFloat(commissionPct) || 20));

  return (
    <div className="space-y-6 text-slate-800">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-heading flex items-center gap-2">
            <Wrench className="w-6 h-6 text-indigo-600" />
            <span>Services &amp; Repairs Catalog</span>
          </h1>
          <p className="text-sm text-gray-500">
            Centrally configure Home &amp; Vehicle rate cards, dynamic category sections, multi-image uploads, and technician payout economics
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="self-start sm:self-auto px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md shadow-indigo-600/20 flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Service</span>
        </button>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-premium">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Active Service Offerings</span>
          <span className="text-xl font-black text-gray-900 font-numbers mt-1 block">{activeCount} Services</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-premium">
          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 block">Total Customer Bookings</span>
          <span className="text-xl font-black text-indigo-700 font-numbers mt-1 block">{totalBookings} Completed</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-premium">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 block">Service Categories</span>
          <span className="text-xl font-black text-emerald-700 font-numbers mt-1 block">{categories.length} Dynamic Trades</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-premium">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 block">Technician Dispatch Mode</span>
          <span className="text-xl font-black text-amber-700 font-numbers mt-1 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            OTP Verified
          </span>
        </div>
      </div>

      {/* Platform Commission Rate & Real-Time Sync Bar */}
      <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-premium space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-lg">
              %
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-gray-900">Platform Service Commission Rate</h3>
                <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full">
                  Real-Time Catalog Sync
                </span>
              </div>
              <p className="text-xs text-gray-500">
                Adjusting the slider below updates the catalog payout columns below in real-time. Click &quot;Save &amp; Apply to All Services&quot; to commit new rates to all database services.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {commissionToast && (
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 animate-in fade-in">
                {commissionToast}
              </span>
            )}
            <button
              type="button"
              onClick={handleSaveCommissionRate}
              disabled={savingCommission || applyingCommission}
              className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer active:scale-95"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{savingCommission ? 'Saving...' : 'Save Rate'}</span>
            </button>
            <button
              type="button"
              onClick={handleApplyCommissionToAll}
              disabled={savingCommission || applyingCommission}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-sm shadow-emerald-600/20 transition-all disabled:opacity-50 cursor-pointer active:scale-95"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>{applyingCommission ? 'Applying to Database...' : '⚡ Save & Apply to All Services'}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                Admin Commission Percentage (%)
              </label>
              <span className="text-sm font-black text-indigo-600 font-mono">{commissionPct}%</span>
            </div>

            <div className="flex items-center gap-4">
              <input
                type="range"
                min="0"
                max="50"
                step="1"
                value={commissionPct}
                onChange={e => setCommissionPct(e.target.value)}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <div className="relative w-24">
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={commissionPct}
                  onChange={e => setCommissionPct(e.target.value)}
                  className="w-full pl-3 pr-7 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 text-center"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">%</span>
              </div>
            </div>

            {/* Visual Ratio Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-indigo-600">Admin Platform: {commissionPct}%</span>
                <span className="text-emerald-600">Technician Share: {Math.max(0, 100 - Number(commissionPct))}%</span>
              </div>
              <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden flex">
                <div
                  className="bg-indigo-600 h-full transition-all duration-300"
                  style={{ width: `${Math.min(100, Number(commissionPct))}%` }}
                />
                <div
                  className="bg-emerald-500 h-full transition-all duration-300"
                  style={{ width: `${Math.max(0, 100 - Number(commissionPct))}%` }}
                />
              </div>
            </div>
          </div>

          {/* Real-Time Live Example Simulator */}
          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-gray-700">Real-Time Payout Simulator</span>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-400 font-bold">Sample Price: ₹</span>
                <input
                  type="number"
                  value={simPrice}
                  onChange={e => setSimPrice(Number(e.target.value) || 0)}
                  className="w-20 px-2 py-1 bg-white border border-gray-200 rounded-lg text-xs font-black text-gray-900 text-center"
                />
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center p-2 bg-white rounded-xl border border-gray-100">
                <span className="text-gray-600 font-medium">Customer Pays (Online via Razorpay):</span>
                <span className="font-black text-gray-900">₹{simPrice}</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-indigo-50 rounded-xl border border-indigo-100">
                <span className="text-indigo-900 font-semibold">Admin Retained ({commissionPct}%):</span>
                <span className="font-black text-indigo-700">
                  ₹{Math.round((simPrice * (Number(commissionPct) / 100)) * 100) / 100}
                </span>
              </div>
              <div className="flex justify-between items-center p-2 bg-emerald-50 rounded-xl border border-emerald-100">
                <span className="text-emerald-900 font-bold">Technician Credited to Wallet ({100 - Number(commissionPct)}%):</span>
                <span className="font-black text-emerald-700">
                  ₹{Math.max(0, simPrice - Math.round((simPrice * (Number(commissionPct) / 100)) * 100) / 100)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar with Dynamic Section Switcher */}
      <div className="flex flex-wrap items-center gap-3 bg-white p-3.5 rounded-2xl border border-gray-100 shadow-premium">
        {/* Section Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-gray-100 rounded-xl">
          <button
            type="button"
            onClick={() => setSelectedSectionFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              selectedSectionFilter === 'all'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            All Sections
          </button>
          <button
            type="button"
            onClick={() => setSelectedSectionFilter('services_home')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              selectedSectionFilter === 'services_home'
                ? 'bg-white text-amber-800 shadow-xs'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <Home className="w-3.5 h-3.5 text-amber-600" />
            <span>Home Services</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedSectionFilter('services_vehicle')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              selectedSectionFilter === 'services_vehicle'
                ? 'bg-white text-blue-800 shadow-xs'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <Car className="w-3.5 h-3.5 text-blue-600" />
            <span>Vehicle Services</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedSectionFilter('other')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              selectedSectionFilter === 'other'
                ? 'bg-white text-purple-800 shadow-xs'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-purple-600" />
            <span>Other Trades</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search service name (e.g. AC Repair, Plumbing, Towing)..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        {/* Category Filter */}
        <select
          value={selectedCategory}
          onChange={e => setSelectedCategory(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-xl text-xs font-semibold bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        >
          <option value="all">🔧 All Service Categories</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-xl text-xs font-semibold bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        >
          <option value="all">⚡ All Statuses</option>
          <option value="active">Active Only</option>
          <option value="inactive">Inactive / Paused</option>
        </select>

        <button
          onClick={loadData}
          className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
          title="Refresh Catalog"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Services Table with Dynamic Real-Time Recalculation */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-premium overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 border-b border-gray-100 text-gray-600 text-xs uppercase tracking-wider font-semibold">
            <tr>
              <th className="px-4 py-3.5">Service Details</th>
              <th className="px-4 py-3.5">Section &amp; Category</th>
              <th className="px-4 py-3.5">Doorstep Visit Charge</th>
              <th className="px-4 py-3.5">
                <span className="flex items-center gap-1 text-emerald-800">
                  <span>Technician Guaranteed Pay</span>
                  <span className="text-[10px] text-emerald-600 font-bold">({100 - activeCommNum}%)</span>
                </span>
              </th>
              <th className="px-4 py-3.5">
                <span className="flex items-center gap-1 text-indigo-800">
                  <span>Platform Margin</span>
                  <span className="text-[10px] text-indigo-600 font-bold">({activeCommNum}%)</span>
                </span>
              </th>
              <th className="px-4 py-3.5">Duration</th>
              <th className="px-4 py-3.5">Supported Booking Mode</th>
              <th className="px-4 py-3.5">Status</th>
              <th className="px-4 py-3.5">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={9} className="px-5 py-12 text-center text-gray-400">Loading doorstep services catalog...</td></tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-12 text-gray-400">
                  <Wrench className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p>No doorstep services match your filters.</p>
                  <button onClick={openCreateModal} className="mt-2 text-xs font-bold text-indigo-600 hover:underline">
                    + Add your first doorstep service
                  </button>
                </td>
              </tr>
            ) : filtered.map(s => {
              const bookings = s._count?.orderItems || 0;
              const hasImg = s.images?.[0]?.url;
              const imgCount = s.images?.length || 0;
              
              // Reactive real-time calculation synced to commissionPct slider
              const dynamicTechPay = Math.round(s.basePrice * (1 - activeCommNum / 100));
              const techPay = dynamicTechPay;
              const margin = s.basePrice - techPay;
              const marginPct = activeCommNum;

              const isVehicle = (s.category?.vertical || '').includes('vehicle') || s.name.toLowerCase().includes('car') || s.name.toLowerCase().includes('bike') || s.name.toLowerCase().includes('towing');

              return (
                <tr key={s.id || s._id} className="hover:bg-gray-50/50">
                  {/* Service Name & Multi-Image Preview */}
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="relative shrink-0">
                        {hasImg ? (
                          <img src={hasImg} alt={s.name} className="w-11 h-11 rounded-xl object-cover border border-gray-200" />
                        ) : (
                          <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                            <Wrench className="w-5 h-5" />
                          </div>
                        )}
                        {imgCount > 1 && (
                          <span className="absolute -bottom-1 -right-1 bg-gray-900 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full shadow-xs">
                            +{imgCount - 1}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 leading-snug">{s.name}</p>
                        {bookings > 0 && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 mt-1">
                            🔥 {bookings} Bookings
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Section & Category */}
                  <td className="px-4 py-4">
                    <div className="space-y-1">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${
                        isVehicle
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {isVehicle ? '🚗 Vehicle' : '🏠 Home'}
                      </span>
                      <span className="block text-xs font-bold text-slate-800">
                        {s.category?.name || 'General Service'}
                      </span>
                    </div>
                  </td>

                  {/* Standard Doorstep Visit Charge (₹) */}
                  <td className="px-4 py-4">
                    <div className="font-numbers font-black text-sm text-gray-900">
                      ₹{s.basePrice}
                    </div>
                    {s.mrp && s.mrp > s.basePrice && (
                      <span className="text-[11px] text-gray-400 line-through block">
                        ₹{s.mrp}
                      </span>
                    )}
                    <span className="text-[10px] text-gray-400 font-semibold block">Customer Billed</span>
                  </td>

                  {/* Technician Guaranteed Pay (₹) - Reactive to Slider */}
                  <td className="px-4 py-4">
                    <div className="font-numbers font-black text-sm text-emerald-700">
                      ₹{techPay}
                    </div>
                    <span className="text-[10px] text-emerald-600 font-semibold block">
                      Guaranteed Payout ({100 - activeCommNum}%)
                    </span>
                  </td>

                  {/* Platform Margin - Reactive to Slider */}
                  <td className="px-4 py-4">
                    <span className={`inline-flex items-center gap-1 text-xs font-black px-2 py-1 rounded-lg border font-numbers ${
                      margin >= 0
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                        : 'bg-red-50 text-red-700 border-red-200'
                    }`}>
                      +₹{margin} <span className="text-[10px] font-bold text-indigo-500">({marginPct}%)</span>
                    </span>
                  </td>

                  {/* Duration */}
                  <td className="px-4 py-4">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-700 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-md">
                      <Clock className="w-3 h-3 text-indigo-500" />
                      <span>{s.durationEstimate || '60 mins'}</span>
                    </span>
                  </td>

                  {/* Supported Booking Mode */}
                  <td className="px-4 py-4">
                    {s.tags?.includes('instant_only') ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-black text-amber-700 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200">
                        <Zap className="w-3 h-3 fill-amber-500 text-amber-600" />
                        <span>⚡ Instant Only (15-30m)</span>
                      </span>
                    ) : s.tags?.includes('scheduled_only') ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-black text-teal-700 bg-teal-50 px-2.5 py-1 rounded-xl border border-teal-200">
                        <Calendar className="w-3 h-3 text-teal-600" />
                        <span>📅 Scheduled Only</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs font-black text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-xl border border-indigo-200">
                        <Sparkles className="w-3 h-3 text-indigo-600" />
                        <span>⚡ Dual (Instant &amp; Scheduled)</span>
                      </span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-4">
                    <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                      s.status === 'active'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                        : 'bg-gray-100 text-gray-600 border-gray-200'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${s.status === 'active' ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                      <span className="capitalize">{s.status}</span>
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => openEditModal(s)}
                        className="p-1.5 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors cursor-pointer"
                        title="Edit Service & Pricing"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteService(s.id || s._id || '', s.name)}
                        className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors cursor-pointer"
                        title="Delete Service"
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

      {/* Add / Edit Service Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden text-slate-800 animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-indigo-50/50 to-blue-50/50 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-xs">
                  <Wrench className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-gray-900 font-heading">
                    {editingService ? 'Edit Doorstep Service' : 'Add New Doorstep Service'}
                  </h3>
                  <p className="text-xs text-gray-500">
                    Configure service section, categories, multi-image upload, and technician payout economics
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveService} className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* 1. Step: Service Section Selector */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">
                  1. Service Section / Vertical <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedSection('services_home')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                      selectedSection === 'services_home'
                        ? 'bg-amber-500 text-white border-amber-500 shadow-sm shadow-amber-500/20'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-amber-300'
                    }`}
                  >
                    <Home className="w-5 h-5 shrink-0" />
                    <div>
                      <span className="text-xs font-black block">Home Services</span>
                      <span className={`text-[10px] block ${selectedSection === 'services_home' ? 'text-amber-100' : 'text-gray-400'}`}>
                        AC, Cleaning, Repair
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedSection('services_vehicle')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                      selectedSection === 'services_vehicle'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-600/20'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <Car className="w-5 h-5 shrink-0" />
                    <div>
                      <span className="text-xs font-black block">Vehicle Services</span>
                      <span className={`text-[10px] block ${selectedSection === 'services_vehicle' ? 'text-blue-100' : 'text-gray-400'}`}>
                        Car/Bike Wash, Towing
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedSection('custom')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                      selectedSection === 'custom'
                        ? 'bg-purple-600 text-white border-purple-600 shadow-sm shadow-purple-600/20'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-purple-300'
                    }`}
                  >
                    <Layers className="w-5 h-5 shrink-0" />
                    <div>
                      <span className="text-xs font-black block">Other Trades</span>
                      <span className={`text-[10px] block ${selectedSection === 'custom' ? 'text-purple-100' : 'text-gray-400'}`}>
                        All Other Services
                      </span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Service Name */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Service Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. AC Jet Foam Deep Cleaning & Servicing"
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              {/* Category Dropdown with Quick Add Button */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-gray-700">
                    Trade Category <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setQuickCatSection(selectedSection === 'custom' ? 'services_custom' : selectedSection);
                      setShowQuickCatModal(true);
                    }}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>+ Add New Category</span>
                  </button>
                </div>
                <div className="flex gap-2">
                  <select
                    value={categoryId}
                    onChange={e => setCategoryId(e.target.value)}
                    className="flex-1 px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs font-semibold bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="">Select a trade category</option>
                    {modalFilteredCategories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <span className="text-[10px] text-gray-400 mt-1 block">
                  Technicians with this matching skill in the Rider Panel will automatically qualify for radar broadcast.
                </span>
              </div>

              {/* Multi-Image S3 Upload Dropzone & Gallery */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-indigo-600" />
                    <span>Service Photos &amp; Portfolio (Up to 10 Images)</span>
                  </label>
                  <span className="text-[11px] font-bold text-indigo-600">
                    {images.length}/10 Uploaded
                  </span>
                </div>

                {/* Dropzone / Upload button */}
                <div className="flex flex-col sm:flex-row items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleUploadImages}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImages || images.length >= 10}
                    className="w-full sm:w-auto px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Upload className="w-4 h-4" />
                    <span>{uploadingImages ? 'Uploading to S3...' : 'Upload Photos from Computer'}</span>
                  </button>

                  <div className="flex items-center gap-2 w-full sm:flex-1">
                    <input
                      type="url"
                      value={manualImageUrl}
                      onChange={e => setManualImageUrl(e.target.value)}
                      placeholder="Or paste image URL..."
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                    <button
                      type="button"
                      onClick={handleAddManualImage}
                      disabled={!manualImageUrl.trim() || images.length >= 10}
                      className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                    >
                      Add
                    </button>
                  </div>
                </div>

                {/* Thumbnail Gallery with Reordering & Badges */}
                {images.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-200">
                    {images.map((imgUrl, index) => (
                      <div key={index} className="relative group rounded-xl overflow-hidden border border-gray-200 bg-white aspect-video flex flex-col justify-between">
                        <img src={imgUrl} alt={`Upload ${index + 1}`} className="w-full h-full object-cover" />
                        
                        {/* Cover Image Badge */}
                        {index === 0 && (
                          <span className="absolute top-1.5 left-1.5 bg-indigo-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md shadow-xs">
                            ⭐ Cover / Main
                          </span>
                        )}

                        {/* Controls Overlay */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 p-1">
                          {index > 0 && (
                            <button
                              type="button"
                              onClick={() => moveImage(index, 'left')}
                              className="p-1 bg-white/90 hover:bg-white text-gray-800 rounded-lg text-xs"
                              title="Move Left"
                            >
                              <ChevronLeft className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="p-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs"
                            title="Remove Photo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          {index < images.length - 1 && (
                            <button
                              type="button"
                              onClick={() => moveImage(index, 'right')}
                              className="p-1 bg-white/90 hover:bg-white text-gray-800 rounded-lg text-xs"
                              title="Move Right"
                            >
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Description & Structured Inclusions */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Service Description
                  </label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Describe the service procedure, tools used, and what customer gets..."
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                {/* Structured Inclusions Checklist */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1.5">
                    <CheckSquare className="w-4 h-4 text-emerald-600" />
                    <span>Service Inclusions &amp; Scope Checklist</span>
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={newInclusion}
                      onChange={e => setNewInclusion(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddInclusion(); } }}
                      placeholder="e.g. Foam jet spray cleaning of indoor cooling coils..."
                      className="flex-1 px-3 py-1.5 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                    <button
                      type="button"
                      onClick={handleAddInclusion}
                      className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                    >
                      + Add
                    </button>
                  </div>
                  <div className="space-y-1">
                    {inclusions.map((inc, i) => (
                      <div key={i} className="flex items-center justify-between p-2 bg-emerald-50/50 border border-emerald-100 rounded-xl text-xs text-emerald-950">
                        <span className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>{inc}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveInclusion(i)}
                          className="text-gray-400 hover:text-red-600 transition-colors cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Pricing Architecture (Visit Charge, Tech Guaranteed Pay, MRP) */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-indigo-600" />
                    <span>Doorstep Visit &amp; Technician Payout Economics</span>
                  </span>
                  <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">
                    Commission Rate: {commissionPct}%
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Standard Doorstep Visit Charge */}
                  <div>
                    <label className="block text-xs font-bold text-gray-800 mb-1">
                      Standard Doorstep Visit Charge (₹) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={doorstepVisitCharge}
                      onChange={e => handleDoorstepChargeChange(e.target.value)}
                      placeholder="499"
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm font-numbers font-bold text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                    <span className="text-[10px] text-gray-500 mt-1 block">Billed to customer</span>
                  </div>

                  {/* Technician Guaranteed Pay */}
                  <div>
                    <label className="block text-xs font-bold text-gray-800 mb-1">
                      Technician Guaranteed Pay (₹) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={technicianGuaranteedPay}
                      onChange={e => setTechnicianGuaranteedPay(e.target.value)}
                      placeholder="350"
                      className="w-full px-3 py-2 border border-emerald-300 rounded-xl text-sm font-numbers font-bold text-emerald-700 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                    <span className="text-[10px] text-emerald-600 font-medium mt-1 block">Paid to technician</span>
                  </div>

                  {/* MRP / Strike Price */}
                  <div>
                    <label className="block text-xs font-bold text-gray-800 mb-1">
                      MRP / Strike Price (₹)
                    </label>
                    <input
                      type="number"
                      value={mrp}
                      onChange={e => setMrp(e.target.value)}
                      placeholder="699"
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm font-numbers text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                    <span className="text-[10px] text-gray-400 mt-1 block">Strikethrough reference</span>
                  </div>
                </div>

                {/* Live Margin Calculation Card */}
                {(() => {
                  const visitVal = parseFloat(doorstepVisitCharge) || 0;
                  const techVal = parseFloat(technicianGuaranteedPay) || 0;
                  const marginVal = visitVal - techVal;
                  const marginPct = visitVal > 0 ? Math.round((marginVal / visitVal) * 100) : 0;
                  const isNegative = marginVal < 0;

                  return (
                    <div className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs ${
                      isNegative
                        ? 'bg-red-50 border-red-200 text-red-800'
                        : 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                    }`}>
                      <div className="flex items-center gap-2">
                        {isNegative ? (
                          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                        ) : (
                          <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                        )}
                        <span className="font-medium">
                          {isNegative
                            ? 'Warning: Technician Pay exceeds Doorstep Visit Charge!'
                            : `Net Platform Margin: ₹${marginVal} (${marginPct}%)`}
                        </span>
                      </div>
                      <div className="font-mono text-[11px] font-bold shrink-0">
                        ₹{visitVal} (Customer) - ₹{techVal} (Tech) = <span className="font-black text-sm">{marginVal >= 0 ? `+₹${marginVal}` : `-₹${Math.abs(marginVal)}`}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Duration Estimate & Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Estimated Duration
                  </label>
                  <input
                    type="text"
                    value={duration}
                    onChange={e => setDuration(e.target.value)}
                    placeholder="e.g. 45 mins, 60 mins, 2 hours"
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-semibold bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="active">Active (Visible on Store)</option>
                    <option value="inactive">Inactive (Paused)</option>
                  </select>
                </div>
              </div>

              {/* Supported Booking Options */}
              <div className="p-4 bg-orange-50/50 border border-orange-200/80 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-orange-600 fill-orange-500" />
                    <span>Customer Booking Modes Supported</span>
                  </label>
                  <span className="text-[10px] font-extrabold text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full">
                    Customer Experience
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  Choose which booking options appear on the customer storefront for this doorstep service.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setSupportedBookingModes('both')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      supportedBookingModes === 'both'
                        ? 'bg-orange-600 text-white border-orange-600 shadow-sm shadow-orange-600/30'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-orange-300'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="text-xs font-black">⚡ Dual Mode</span>
                      <CheckCircle2 className={`w-3.5 h-3.5 ${supportedBookingModes === 'both' ? 'text-white' : 'text-slate-300'}`} />
                    </div>
                    <span className={`text-[10px] leading-tight ${supportedBookingModes === 'both' ? 'text-orange-100' : 'text-slate-500'}`}>
                      Both Instant Match (15–30m) &amp; Scheduled Advance Slots
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSupportedBookingModes('instant')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      supportedBookingModes === 'instant'
                        ? 'bg-orange-600 text-white border-orange-600 shadow-sm shadow-orange-600/30'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-orange-300'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="text-xs font-black">⚡ Instant Only</span>
                      <CheckCircle2 className={`w-3.5 h-3.5 ${supportedBookingModes === 'instant' ? 'text-white' : 'text-slate-300'}`} />
                    </div>
                    <span className={`text-[10px] leading-tight ${supportedBookingModes === 'instant' ? 'text-orange-100' : 'text-slate-500'}`}>
                      Emergency fixes only (15–30 min immediate arrival)
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSupportedBookingModes('scheduled')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      supportedBookingModes === 'scheduled'
                        ? 'bg-orange-600 text-white border-orange-600 shadow-sm shadow-orange-600/30'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-orange-300'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="text-xs font-black">📅 Scheduled Only</span>
                      <CheckCircle2 className={`w-3.5 h-3.5 ${supportedBookingModes === 'scheduled' ? 'text-white' : 'text-slate-300'}`} />
                    </div>
                    <span className={`text-[10px] leading-tight ${supportedBookingModes === 'scheduled' ? 'text-orange-100' : 'text-slate-500'}`}>
                      Customer selects preferred date &amp; daytime arrival time
                    </span>
                  </button>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-bold text-xs hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-md shadow-indigo-600/25 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-60"
                >
                  {saving ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{editingService ? 'Update Service' : 'Publish Service'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Category Creation Modal */}
      {showQuickCatModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-gray-200 p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-base text-gray-900 flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-indigo-600" />
                <span>Create New Trade Category</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowQuickCatModal(false)}
                className="p-1 text-gray-400 hover:text-gray-700 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateQuickCategory} className="space-y-4">
              {quickCatError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                  {quickCatError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Category Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={quickCatName}
                  onChange={e => setQuickCatName(e.target.value)}
                  placeholder="e.g. EV Charger Installation, Carpentry, Car Spa"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Service Vertical
                </label>
                <select
                  value={quickCatSection}
                  onChange={e => setQuickCatSection(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-semibold bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="services_home">🏠 Home Services (services_home)</option>
                  <option value="services_vehicle">🚗 Vehicle Services (services_vehicle)</option>
                  <option value="services_custom">🔧 Custom / General Services (services_custom)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowQuickCatModal(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingQuickCat}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 disabled:opacity-60"
                >
                  {creatingQuickCat ? 'Creating...' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
