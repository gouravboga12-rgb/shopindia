import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import {
  CheckCircle, XCircle, Ban, Search, LayoutDashboard,
  Phone, Mail, MapPin, ExternalLink, MessageCircle,
  Store, Zap, ShoppingBag, Navigation
} from 'lucide-react';
import type { ManagedVendor } from '../AdminPortal';

const STATUSES = ['all', 'pending', 'approved', 'rejected', 'suspended'];
const SERVICE_FILTERS = [
  { id: 'all', label: 'All Services', icon: Store },
  { id: 'traditional', label: 'Shop India Only', icon: ShoppingBag },
  { id: 'quick', label: 'Quick Shopping', icon: Zap },
  { id: 'both', label: 'Both Platforms', icon: Navigation },
];

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const map: Record<string, string> = {
    pending:   'bg-amber-50  text-amber-700  border-amber-200',
    approved:  'bg-emerald-50 text-emerald-700 border-emerald-200',
    rejected:  'bg-red-50    text-red-700    border-red-200',
    suspended: 'bg-gray-100  text-gray-600   border-gray-200',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ${map[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

interface Props {
  onManage?: (vendor: ManagedVendor) => void;
}

export const VendorsPage: React.FC<Props> = ({ onManage }) => {
  const [vendors, setVendors]               = useState<any[]>([]);
  const [filter, setFilter]                 = useState('all');
  const [serviceFilter, setServiceFilter]   = useState('all');
  const [q, setQ]                           = useState('');
  const [loading, setLoading]               = useState(true);
  const [actionId, setActionId]             = useState<string | null>(null);
  const [note, setNote]                     = useState('');
  const [modal, setModal]                   = useState<{ id: string; action: string } | null>(null);

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filter !== 'all') params.set('status', filter);
    if (q) params.set('q', q);

    api.get<{ vendors: any[] }>(`/api/admin/vendors?${params.toString()}`)
      .then((d) => setVendors(d.vendors || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(load, [filter]);

  const approve = async (id: string, approvalStatus: string) => {
    setActionId(id);
    try {
      await api.patch(`/api/admin/vendors/${id}/approval`, { approvalStatus, approvalNote: note });
      load();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionId(null);
      setModal(null);
      setNote('');
    }
  };

  // Client-side filtering for service type & search
  const filtered = vendors.filter((v) => {
    const matchesSearch =
      !q ||
      v.businessName.toLowerCase().includes(q.toLowerCase()) ||
      (v.contactName && v.contactName.toLowerCase().includes(q.toLowerCase())) ||
      (v.phone && v.phone.includes(q)) ||
      (v.email && v.email.toLowerCase().includes(q.toLowerCase())) ||
      (v.city && v.city.toLowerCase().includes(q.toLowerCase())) ||
      (v.state && v.state.toLowerCase().includes(q.toLowerCase())) ||
      (v.pincode && v.pincode.includes(q));

    const matchesService =
      serviceFilter === 'all' ||
      (serviceFilter === 'traditional' && (v.serviceType === 'traditional_only' || (!v.supportsQuick && v.serviceType !== 'both'))) ||
      (serviceFilter === 'quick' && (v.serviceType === 'quick_only' || v.supportsQuick)) ||
      (serviceFilter === 'both' && v.serviceType === 'both');

    return matchesSearch && matchesService;
  });

  return (
    <div className="space-y-5">
      {/* ─── Header ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-heading flex items-center gap-2">
            <Store className="w-6 h-6 text-[#0F2C59]" />
            Vendor Partners Directory
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Complete merchant profiles with verified area locations, GPS coordinates, 1-click Call & WhatsApp options, and opted delivery verticals.
          </p>
        </div>
        <div className="text-xs font-bold text-gray-500 bg-gray-100 px-3 py-1.5 rounded-xl self-start sm:self-auto">
          {filtered.length} of {vendors.length} Vendors Active
        </div>
      </div>

      {/* ─── Filters & Search Toolbar ────────────────────────────── */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-premium space-y-3">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by store name, contact person, phone, email, city, area or pincode…"
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F2C59]/20"
          />
        </div>

        {/* Filter Rows: Status and Service Opted */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-1 bg-gray-100 rounded-xl p-1 text-xs">
            <span className="text-[11px] font-bold text-gray-400 px-2 uppercase tracking-wider">Status:</span>
            {STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  filter === s
                    ? 'bg-white text-gray-900 shadow-xs'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>

          {/* Service Opted Tabs */}
          <div className="flex flex-wrap items-center gap-1 bg-gray-100 rounded-xl p-1 text-xs">
            <span className="text-[11px] font-bold text-gray-400 px-2 uppercase tracking-wider">Vertical:</span>
            {SERVICE_FILTERS.map((s) => {
              const Icon = s.icon;
              return (
                <button
                  key={s.id}
                  onClick={() => setServiceFilter(s.id)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                    serviceFilter === s.id
                      ? 'bg-[#0F2C59] text-white shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── Vendors Table ───────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-premium overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50/80 text-gray-600 font-bold border-b border-gray-100">
              <tr>
                <th className="py-3.5 px-5">Business & Contact Person</th>
                <th className="py-3.5 px-5">Contact Details & Actions</th>
                <th className="py-3.5 px-5">Area & Location</th>
                <th className="py-3.5 px-5">Services Opted</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-center">Commission</th>
                <th className="py-3.5 px-5 text-center">Actions & Manage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={7} className="px-5 py-6">
                      <div className="h-6 skeleton-shimmer rounded-xl" />
                    </td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-14 text-gray-400 text-xs">
                    No vendor partners found matching your search and filter criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((v) => {
                  const cleanPhone = (v.phone || '').replace(/[^0-9]/g, '');
                  const phoneWith91 = cleanPhone.startsWith('91')
                    ? cleanPhone
                    : `91${cleanPhone}`;

                  const hasGps = v.lat != null && v.lng != null;
                  const fullAddress = [v.street, v.city, v.state, v.pincode]
                    .filter(Boolean)
                    .join(', ');

                  return (
                    <tr key={v.id || v._id} className="hover:bg-gray-50/60 transition-colors">
                      {/* 1. Business & Contact Person */}
                      <td className="py-4 px-5">
                        <div className="font-bold text-gray-900 text-sm">
                          {v.businessName}
                        </div>
                        <div className="text-xs text-gray-600 font-medium mt-0.5">
                          Owner: <span className="text-gray-800 font-semibold">{v.contactName || v.user?.name || 'Store Manager'}</span>
                        </div>
                        <div className="text-[10px] text-gray-400 mt-1">
                          Joined: {v.createdAt ? new Date(v.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                        </div>
                      </td>

                      {/* 2. Contact Details + Call & WhatsApp 1-Click Buttons */}
                      <td className="py-4 px-5">
                        <div className="font-mono text-xs font-semibold text-gray-900">
                          {v.phone ? `+91 ${v.phone}` : 'No phone listed'}
                        </div>
                        <div className="text-[11px] text-gray-500 font-mono truncate max-w-[170px] mt-0.5" title={v.email}>
                          {v.email}
                        </div>

                        {/* 1-Click Call, WhatsApp & Email Action Toolbar */}
                        <div className="flex items-center gap-1.5 mt-2">
                          {/* Call Button */}
                          {cleanPhone ? (
                            <a
                              href={`tel:${cleanPhone}`}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-[10px] transition-colors shadow-2xs border border-blue-200"
                              title={`Direct Call: ${v.phone}`}
                            >
                              <Phone className="w-3 h-3 text-blue-600" /> Call
                            </a>
                          ) : (
                            <span className="text-[10px] text-gray-300">No Call</span>
                          )}

                          {/* WhatsApp Button */}
                          {cleanPhone ? (
                            <a
                              href={`https://wa.me/${phoneWith91}?text=Hello%20${encodeURIComponent(
                                v.contactName || v.businessName
                              )},%20this%20is%20Shop%20India%20Super%20Admin.`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] transition-colors shadow-2xs"
                              title={`Open WhatsApp chat with ${v.businessName}`}
                            >
                              <MessageCircle className="w-3 h-3 text-emerald-100" /> WhatsApp
                            </a>
                          ) : null}

                          {/* Email Button */}
                          {v.email ? (
                            <a
                              href={`mailto:${v.email}`}
                              className="p-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
                              title={`Email: ${v.email}`}
                            >
                              <Mail className="w-3.5 h-3.5" />
                            </a>
                          ) : null}
                        </div>
                      </td>

                      {/* 3. Area, City, State, Pincode & Google Maps Location */}
                      <td className="py-4 px-5">
                        <div className="space-y-1">
                          {/* Area & Street */}
                          <div className="text-xs font-semibold text-gray-900 flex items-start gap-1">
                            <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                            <span>{v.street || 'Area not specified'}</span>
                          </div>

                          {/* City, State & PIN */}
                          <div className="text-[11px] text-gray-500 pl-4.5">
                            {v.city || '—'}, {v.state || '—'}
                            {v.pincode && (
                              <span className="font-mono font-bold text-gray-700 ml-1">
                                (PIN: {v.pincode})
                              </span>
                            )}
                          </div>

                          {/* Google Maps / GPS link */}
                          <div className="pl-4.5 pt-0.5 flex flex-wrap items-center gap-1.5">
                            {hasGps ? (
                              <a
                                href={`https://www.google.com/maps?q=${v.lat},${v.lng}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline"
                                title="Open exact store GPS pin on Google Maps"
                              >
                                GPS: {v.lat.toFixed(4)}, {v.lng.toFixed(4)}
                                <ExternalLink className="w-2.5 h-2.5 text-indigo-500" />
                              </a>
                            ) : fullAddress ? (
                              <a
                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[10px] font-medium text-gray-500 hover:text-indigo-600 hover:underline"
                                title="Search address on Google Maps"
                              >
                                View on Maps
                                <ExternalLink className="w-2.5 h-2.5 text-gray-400" />
                              </a>
                            ) : (
                              <span className="text-[10px] text-gray-400 italic">No GPS coordinates</span>
                            )}

                            {/* Delivery Radius for quick commerce */}
                            {v.supportsQuick && (
                              <span className="text-[9px] font-bold bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.2 rounded">
                                {v.deliveryRadiusKm || 5} km Radius
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 4. What type of services opted for: Shop India only or Quick Shopping */}
                      <td className="py-4 px-5">
                        {v.serviceType === 'both' ? (
                          <div className="space-y-1">
                            <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-gradient-to-r from-blue-50 to-amber-50 text-indigo-900 border border-indigo-200 inline-flex items-center gap-1.5 shadow-2xs">
                              <span>🛍️⚡</span> Both Platforms
                            </span>
                            <div className="text-[10px] text-gray-500 font-medium">
                              Shop India Courier + 10-20 Min Quick
                            </div>
                          </div>
                        ) : v.serviceType === 'quick_only' || v.supportsQuick ? (
                          <div className="space-y-1">
                            <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 inline-flex items-center gap-1.5 shadow-2xs">
                              <span>⚡</span> Quick Shopping
                            </span>
                            <div className="text-[10px] text-amber-700 font-medium">
                              Hyperlocal 10–20 Min Delivery
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200 inline-flex items-center gap-1.5 shadow-2xs">
                              <span>🛍️</span> Shop India Only
                            </span>
                            <div className="text-[10px] text-blue-700 font-medium">
                              Pan-India Standard Courier
                            </div>
                          </div>
                        )}
                      </td>

                      {/* 5. Approval Status */}
                      <td className="py-4 px-4 text-center">
                        <StatusBadge status={v.approvalStatus} />
                      </td>

                      {/* 6. Commission */}
                      <td className="py-4 px-4 text-center font-mono font-bold text-gray-700">
                        {v.commissionRate}%
                      </td>

                      {/* 7. Actions & Manage Panel */}
                      <td className="py-4 px-5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {/* Status Actions */}
                          <div className="flex items-center gap-1">
                            {v.approvalStatus === 'pending' && (
                              <>
                                <button
                                  onClick={() => approve(v.id || v._id, 'approved')}
                                  disabled={actionId === (v.id || v._id)}
                                  className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors cursor-pointer"
                                  title="Approve Vendor Account"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setModal({ id: v.id || v._id, action: 'rejected' })}
                                  className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors cursor-pointer"
                                  title="Reject Vendor Application"
                                >
                                  <XCircle className="w-4 h-4" />
                                </button>
                              </>
                            )}
                            {v.approvalStatus === 'approved' && (
                              <button
                                onClick={() => approve(v.id || v._id, 'suspended')}
                                disabled={actionId === (v.id || v._id)}
                                className="p-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors cursor-pointer"
                                title="Suspend Vendor Account"
                              >
                                <Ban className="w-4 h-4" />
                              </button>
                            )}
                            {v.approvalStatus === 'suspended' && (
                              <button
                                onClick={() => approve(v.id || v._id, 'approved')}
                                disabled={actionId === (v.id || v._id)}
                                className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors cursor-pointer"
                                title="Reinstate Vendor Account"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                            )}
                          </div>

                          {/* Manage Panel Button */}
                          {onManage && (
                            <button
                              onClick={() => onManage({ id: v.id || v._id, name: v.businessName })}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#0F2C59] text-white text-xs font-semibold hover:bg-[#0F2C59]/90 transition-colors shadow-xs cursor-pointer whitespace-nowrap"
                              title={`Manage ${v.businessName}'s store panel`}
                            >
                              <LayoutDashboard className="w-3.5 h-3.5" />
                              Manage
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── Reject Modal ────────────────────────────────────────── */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="font-bold text-gray-900 mb-1">Reject Vendor Application</h3>
            <p className="text-xs text-gray-500 mb-4">Provide a reason explaining why the application was rejected.</p>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="e.g. Missing valid GSTIN, incomplete warehouse address..."
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-red-200 resize-none font-medium text-gray-800"
            />
            <div className="flex gap-2.5 mt-4">
              <button
                onClick={() => setModal(null)}
                className="flex-1 py-2 border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => approve(modal.id, modal.action)}
                className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
