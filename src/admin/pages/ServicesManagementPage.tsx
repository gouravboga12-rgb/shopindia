import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import {
  Wrench, Search, Plus, Edit2, Trash2, Clock, CheckCircle2,
  X, AlertCircle, Sparkles, RefreshCw, ShieldCheck
} from 'lucide-react';

interface Category {
  id: string;
  name: string;
  vertical: string;
}

interface ServiceItem {
  id: string;
  _id?: string;
  name: string;
  basePrice: number; // Standard Doorstep Visit Charge
  vendorPrice?: number | null; // Technician Guaranteed Pay
  mrp?: number | null;
  stock: number;
  status: string;
  fulfillmentType: string;
  durationEstimate?: string | null;
  serviceSlots: string[];
  tags: string[];
  category?: { id: string; name: string; vertical: string } | null;
  images?: Array<{ url: string }>;
  _count?: { orderItems: number };
}

const DEFAULT_SLOTS = [
  '08:00 - 10:00 AM',
  '10:00 - 12:00 PM',
  '12:00 - 02:00 PM',
  '02:00 - 04:00 PM',
  '04:00 - 06:00 PM',
  '06:00 - 08:00 PM'
];

export const ServicesManagementPage: React.FC = () => {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [doorstepVisitCharge, setDoorstepVisitCharge] = useState('499'); // Standard Doorstep Visit Charge (₹)
  const [technicianGuaranteedPay, setTechnicianGuaranteedPay] = useState('350'); // Technician Guaranteed Pay (₹)
  const [mrp, setMrp] = useState('699');
  const [duration, setDuration] = useState('60 mins');
  const [slots, setSlots] = useState<string[]>([...DEFAULT_SLOTS]);
  const [imageUrl, setImageUrl] = useState('');
  const [status, setStatus] = useState('active');

  const loadData = async () => {
    setLoading(true);
    try {
      const [prodRes, catRes] = await Promise.all([
        api.get<{ products: ServiceItem[] }>('/api/admin/products?vertical=services&limit=100'),
        api.get<Category[] | { categories: Category[] }>('/api/admin/categories')
      ]);

      const prodList = (prodRes as any).products || [];
      setServices(prodList);

      const rawCats = Array.isArray(catRes) ? catRes : (catRes as any).categories || [];
      const serviceCats = rawCats.filter((c: any) =>
        c.vertical?.includes('service') || c.vertical === 'services' || c.vertical === 'services_home' || c.vertical === 'services_vehicle'
      );
      setCategories(serviceCats);
    } catch (err: any) {
      console.error('Failed to load services data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = () => {
    setEditingService(null);
    setName('');
    setCategoryId(categories[0]?.id || '');
    setDoorstepVisitCharge('499');
    setTechnicianGuaranteedPay('350');
    setMrp('699');
    setDuration('60 mins');
    setSlots(['09:00 - 11:00 AM', '11:00 - 01:00 PM', '02:00 - 04:00 PM', '04:00 - 06:00 PM']);
    setImageUrl('');
    setStatus('active');
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (service: ServiceItem) => {
    setEditingService(service);
    setName(service.name);
    setCategoryId(service.category?.id || '');
    setDoorstepVisitCharge(String(service.basePrice || '499'));
    setTechnicianGuaranteedPay(String(service.vendorPrice ?? Math.round((service.basePrice || 499) * 0.7)));
    setMrp(service.mrp ? String(service.mrp) : '');
    setDuration(service.durationEstimate || '60 mins');
    setSlots(service.serviceSlots && service.serviceSlots.length > 0 ? service.serviceSlots : [...DEFAULT_SLOTS]);
    setImageUrl(service.images?.[0]?.url || '');
    setStatus(service.status || 'active');
    setFormError(null);
    setModalOpen(true);
  };

  const handleToggleSlot = (slot: string) => {
    setSlots(prev => prev.includes(slot) ? prev.filter(s => s !== slot) : [...prev, slot]);
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
      const payload: any = {
        name: name.trim(),
        basePrice: parseFloat(doorstepVisitCharge),
        vendorPrice: parseFloat(technicianGuaranteedPay),
        mrp: mrp ? parseFloat(mrp) : null,
        durationEstimate: duration,
        serviceSlots: slots,
        status,
        fulfillmentType: 'hvac_service',
        stock: 999,
        categoryId: categoryId || undefined,
        tags: ['doorstep_service', 'home_service'],
      };

      if (imageUrl.trim()) {
        payload.images = [imageUrl.trim()];
      }

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

  const filtered = services.filter(s => {
    const matchesQ = !q || s.name.toLowerCase().includes(q.toLowerCase());
    const matchesCat = selectedCategory === 'all' || s.category?.id === selectedCategory;
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    return matchesQ && matchesCat && matchesStatus;
  });

  const totalBookings = services.reduce((sum, s) => sum + (s._count?.orderItems || 0), 0);
  const activeCount = services.filter(s => s.status === 'active').length;

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
            Centrally manage doorstep rate cards, duration estimates, and customer appointment time slots
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="self-start sm:self-auto px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md shadow-indigo-600/20 flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
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
          <span className="text-xl font-black text-emerald-700 font-numbers mt-1 block">{categories.length} Trades</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-premium">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 block">Technician Dispatch Mode</span>
          <span className="text-xl font-black text-amber-700 font-numbers mt-1 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            OTP Verified
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-white p-3.5 rounded-2xl border border-gray-100 shadow-premium">
        <div className="relative flex-1 min-w-[220px]">
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

      {/* Services Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-premium overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 border-b border-gray-100 text-gray-600 text-xs uppercase tracking-wider font-semibold">
            <tr>
              <th className="px-4 py-3.5">Service Details</th>
              <th className="px-4 py-3.5">Trade Category</th>
              <th className="px-4 py-3.5">Doorstep Visit Charge</th>
              <th className="px-4 py-3.5">Technician Guaranteed Pay</th>
              <th className="px-4 py-3.5">Platform Margin</th>
              <th className="px-4 py-3.5">Duration</th>
              <th className="px-4 py-3.5">Time Slots</th>
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
                  <p>No doorstep services found.</p>
                  <button onClick={openCreateModal} className="mt-2 text-xs font-bold text-indigo-600 hover:underline">
                    + Add your first doorstep service
                  </button>
                </td>
              </tr>
            ) : filtered.map(s => {
              const bookings = s._count?.orderItems || 0;
              const hasImg = s.images?.[0]?.url;
              const techPay = s.vendorPrice != null ? s.vendorPrice : Math.round(s.basePrice * 0.7);
              const margin = s.basePrice - techPay;
              const marginPct = s.basePrice > 0 ? Math.round((margin / s.basePrice) * 100) : 0;

              return (
                <tr key={s.id || s._id} className="hover:bg-gray-50/50">
                  {/* Service Name & Image */}
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      {hasImg ? (
                        <img src={hasImg} alt={s.name} className="w-10 h-10 rounded-xl object-cover border border-gray-200 shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                          <Wrench className="w-5 h-5" />
                        </div>
                      )}
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

                  {/* Trade Category */}
                  <td className="px-4 py-4">
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                      <span>{s.category?.name || 'General Service'}</span>
                    </span>
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

                  {/* Technician Guaranteed Pay (₹) */}
                  <td className="px-4 py-4">
                    <div className="font-numbers font-black text-sm text-emerald-700">
                      ₹{techPay}
                    </div>
                    <span className="text-[10px] text-emerald-600 font-semibold block">Guaranteed Payout</span>
                  </td>

                  {/* Platform Margin */}
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

                  {/* Available Time Slots */}
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-1 max-w-[180px]">
                      {(s.serviceSlots && s.serviceSlots.length > 0 ? s.serviceSlots : DEFAULT_SLOTS.slice(0, 3)).slice(0, 2).map((sl, i) => (
                        <span key={i} className="text-[10px] font-medium bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">
                          {sl}
                        </span>
                      ))}
                      {(s.serviceSlots?.length || 0) > 2 && (
                        <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                          +{s.serviceSlots.length - 2} more
                        </span>
                      )}
                    </div>
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
                        title="Edit Service & Slots"
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
          <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden text-slate-800 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-indigo-50/50 to-blue-50/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-xs">
                  <Wrench className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-gray-900 font-heading">
                    {editingService ? 'Edit Doorstep Service' : 'Add New Doorstep Service'}
                  </h3>
                  <p className="text-xs text-gray-500">
                    Configure labor price, timing slots, and duration
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
            <form onSubmit={handleSaveService} className="p-5 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

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

              {/* Category Dropdown */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Service Trade Category
                </label>
                <select
                  value={categoryId}
                  onChange={e => setCategoryId(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs font-semibold bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="">Select a category</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <span className="text-[10px] text-gray-400 mt-1 block">
                  Technicians with this matching skill will be dispatched automatically for this service.
                </span>
              </div>

              {/* Pricing Architecture (Visit Charge, Tech Guaranteed Pay, MRP) */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-indigo-600" />
                    <span>Doorstep Visit &amp; Technician Payout Economics</span>
                  </span>
                  <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">
                    OTP Verified Payout
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
                      onChange={e => setDoorstepVisitCharge(e.target.value)}
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

              {/* Service Image URL */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Service Image URL (Optional)
                </label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={e => setImageUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/photo-..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              {/* Appointment Time Slots */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">
                  Customer Appointment Time Slots
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {DEFAULT_SLOTS.map(slot => {
                    const isChecked = slots.includes(slot);
                    return (
                      <button
                        type="button"
                        key={slot}
                        onClick={() => handleToggleSlot(slot)}
                        className={`p-2 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer ${
                          isChecked
                            ? 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-2xs'
                            : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
                        }`}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
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
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-md shadow-indigo-600/25 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-60"
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
    </div>
  );
};
