import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Search, CheckCircle, Ban, Truck, Trash2, AlertTriangle, X, MapPin, Banknote, ShieldAlert, Wrench, Bike, RefreshCw } from 'lucide-react';

export const RidersPage: React.FC = () => {
  const [riders, setRiders] = useState<any[]>([]);
  const [q, setQ] = useState('');
  const [cityFilter, setCityFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [riderToDelete, setRiderToDelete] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = () => {
    setLoading(true);
    api.get<{ riders: any[] }>('/api/admin/riders')
      .then(d => setRiders(d.riders || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      await api.patch(`/api/admin/riders/${id}`, { status: newStatus });
      load();
    } catch (err: any) { alert(err.message); }
  };

  const processPayout = async (id: string, amount: number) => {
    if (!amount || amount <= 0) return;
    try {
      await api.patch(`/api/admin/riders/${id}`, { payoutAmount: amount });
      load();
    } catch (err: any) { alert(err.message); }
  };

  const handleDeleteRider = async () => {
    if (!riderToDelete) return;
    try {
      setDeleting(true);
      await api.delete(`/api/admin/riders/${riderToDelete.id}`);
      setRiderToDelete(null);
      load();
    } catch (err: any) {
      alert(err.message || 'Failed to delete rider.');
    } finally {
      setDeleting(false);
    }
  };

  // Derive unique cities from rider data
  const cities = Array.from(new Set(riders.map(r => {
    const rawCity = r.branch?.city || r.riderProfile?.branch?.city || r.riderProfile?.address || '';
    if (!rawCity) return null;
    const parts = rawCity.split(',');
    return parts[parts.length - 1]?.trim() || rawCity.trim();
  }).filter(Boolean))) as string[];

  const filtered = riders.filter(r => {
    const matchesQ = !q || r.name.toLowerCase().includes(q.toLowerCase()) || r.phone?.includes(q) || r.email?.toLowerCase().includes(q.toLowerCase());
    
    const rCity = (r.branch?.city || r.riderProfile?.branch?.city || r.riderProfile?.address || '').toLowerCase();
    const matchesCity = cityFilter === 'all' || rCity.includes(cityFilter.toLowerCase());

    const pType = r.riderProfile?.partnerType || 'delivery';
    const matchesRole = roleFilter === 'all' || pType === roleFilter;

    return matchesQ && matchesCity && matchesRole;
  });

  const totalCodHeld = riders.reduce((sum, r) => sum + (r.riderProfile?.codCashFloat || 0), 0);
  const onlineCount = riders.filter(r => r.riderProfile?.isOnline).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-heading">Rider & Fleet Operations</h1>
          <p className="text-sm text-gray-500">Track operating cities, partner trade roles, live GPS, and COD cash float</p>
        </div>

        <button
          onClick={load}
          className="self-start sm:self-auto flex items-center gap-1.5 px-3.5 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors shadow-2xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Fleet</span>
        </button>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-premium">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Total Registered Fleet</span>
          <span className="text-xl font-black text-gray-900 font-numbers mt-1 block">{riders.length} Partners</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-premium">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 block">Active On Radar Now</span>
          <span className="text-xl font-black text-emerald-700 font-numbers mt-1 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            {onlineCount} Online
          </span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-premium">
          <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600 block">Total Float Held in Field</span>
          <span className="text-xl font-black text-orange-700 font-numbers mt-1 block">₹{totalCodHeld.toLocaleString('en-IN')}</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-premium">
          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 block">Operating Hubs / Cities</span>
          <span className="text-xl font-black text-indigo-700 font-numbers mt-1 block">{Math.max(1, cities.length)} Locations</span>
        </div>
      </div>

      {/* Filter Bar: Search, City Filter & Role Filter */}
      <div className="flex flex-wrap items-center gap-3 bg-white p-3.5 rounded-2xl border border-gray-100 shadow-premium">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search riders by name, phone, email..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2C59]/20"
          />
        </div>

        {/* City Filter */}
        <div className="flex items-center gap-1.5 min-w-[170px]">
          <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
          <select
            value={cityFilter}
            onChange={e => setCityFilter(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-semibold bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#0F2C59]/20"
          >
            <option value="all">📍 All Cities & Hubs</option>
            {cities.map(c => (
              <option key={c} value={c}>📍 {c}</option>
            ))}
          </select>
        </div>

        {/* Role Filter */}
        <select
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-xl text-xs font-semibold bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#0F2C59]/20"
        >
          <option value="all">⚡ All Partner Roles</option>
          <option value="delivery">🚚 Quick Delivery Rider</option>
          <option value="service">🛠️ Service Technician</option>
          <option value="both">⚡ All-Rounder (Both)</option>
        </select>
      </div>

      {/* Riders Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-premium overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 border-b border-gray-100 text-gray-600 text-xs uppercase tracking-wider font-semibold">
            <tr>
              <th className="px-5 py-3.5">Partner Details</th>
              <th className="px-5 py-3.5">Operating City / Hub</th>
              <th className="px-5 py-3.5">Role & Vehicle</th>
              <th className="px-5 py-3.5">COD Float Held</th>
              <th className="px-5 py-3.5">Wallet / Payout</th>
              <th className="px-5 py-3.5">Radar & Status</th>
              <th className="px-5 py-3.5">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={7} className="px-5 py-12 text-center text-gray-400">Loading fleet data...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12 text-gray-400">No riders match this filter.</td></tr>
            ) : filtered.map(r => {
              const profile = r.riderProfile;
              const cityName = r.branch?.city || profile?.branch?.city || profile?.address || 'Hyderabad';
              const partnerRole = profile?.partnerType || 'delivery';
              const codHeld = profile?.codCashFloat || 0;
              const codLimit = profile?.codFloatLimit || 3000;
              const isOverLimit = codHeld >= codLimit;

              return (
                <tr key={r.id || r._id} className="hover:bg-gray-50/50">
                  {/* Partner Details */}
                  <td className="px-5 py-4">
                    <p className="font-bold text-gray-900 flex items-center gap-1.5">
                      <Truck className="w-4 h-4 text-blue-600"/>
                      <span>{r.name}</span>
                    </p>
                    <p className="text-xs text-gray-500 font-mono mt-0.5">{r.phone}</p>
                    {r.email && <p className="text-xs text-blue-600 font-mono truncate max-w-[180px]">{r.email}</p>}
                  </td>

                  {/* Operating City & Hub */}
                  <td className="px-5 py-4">
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                      <MapPin className="w-3 h-3 text-red-500" />
                      <span>{cityName}</span>
                    </span>
                    <span className="text-[10px] text-gray-400 block mt-1">
                      Radius: {profile?.serviceRadiusKm || 25} km
                    </span>
                  </td>

                  {/* Role & Vehicle */}
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                      partnerRole === 'service'
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                        : partnerRole === 'both'
                        ? 'bg-purple-50 text-purple-700 border-purple-200'
                        : 'bg-orange-50 text-orange-700 border-orange-200'
                    }`}>
                      {partnerRole === 'service' ? <Wrench className="w-3 h-3" /> : <Bike className="w-3 h-3" />}
                      <span>{partnerRole === 'both' ? 'All-Rounder' : partnerRole}</span>
                    </span>
                    <p className="text-xs text-gray-600 capitalize mt-1">
                      {profile?.vehicleType || 'Bike'} {profile?.vehicleNumber ? `• ${profile.vehicleNumber}` : ''}
                    </p>
                  </td>

                  {/* COD Float Held */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1 font-numbers font-black text-sm text-gray-900">
                      <Banknote className="w-4 h-4 text-orange-500" />
                      <span>₹{codHeld.toLocaleString('en-IN')}</span>
                    </div>
                    {isOverLimit ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-700 bg-red-100 border border-red-200 px-1.5 py-0.2 rounded-full mt-1">
                        <ShieldAlert className="w-3 h-3" /> Limit Exceeded
                      </span>
                    ) : (
                      <span className="text-[10px] text-gray-400 block mt-0.5">
                        Max ₹{codLimit.toLocaleString('en-IN')}
                      </span>
                    )}
                  </td>

                  {/* Wallet / Payout */}
                  <td className="px-5 py-4">
                    <p className="font-numbers font-bold text-gray-900">₹{profile?.walletBalance || 0}</p>
                    {profile?.walletBalance > 0 && (
                      <button
                        onClick={() => processPayout(r.id, profile.walletBalance)}
                        className="text-xs text-blue-600 font-semibold hover:underline mt-1 cursor-pointer block"
                      >
                        Clear Dues
                      </button>
                    )}
                  </td>

                  {/* Radar & Status */}
                  <td className="px-5 py-4">
                    <div className="space-y-1">
                      <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                        profile?.isOnline
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                          : 'bg-gray-100 text-gray-600 border-gray-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${profile?.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
                        <span>{profile?.isOnline ? 'Online' : 'Offline'}</span>
                      </span>

                      <span className={`block text-[10px] font-semibold px-2 py-0.5 rounded capitalize ${
                        r.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
                      }`}>
                        {r.status}
                      </span>
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1.5">
                      {r.status !== 'active' && (
                        <button title="Activate Rider" onClick={() => updateStatus(r.id, 'active')} className="p-1.5 text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors cursor-pointer">
                          <CheckCircle className="w-4 h-4"/>
                        </button>
                      )}
                      {r.status !== 'suspended' && (
                        <button title="Suspend Rider" onClick={() => updateStatus(r.id, 'suspended')} className="p-1.5 text-amber-600 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors cursor-pointer">
                          <Ban className="w-4 h-4"/>
                        </button>
                      )}
                      <button
                        title="Permanently Delete Rider"
                        onClick={() => setRiderToDelete(r)}
                        className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors cursor-pointer"
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

      {/* Delete Rider Confirmation Modal */}
      {riderToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-red-100 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="p-2.5 bg-red-50 text-red-600 rounded-2xl flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <span className="font-bold text-sm text-red-700">Permanent Rider Deletion</span>
              </div>
              <button onClick={() => setRiderToDelete(null)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-gray-700 font-medium">
                Are you sure you want to permanently delete this rider and user account?
              </p>
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-600 space-y-1">
                <div><span className="font-semibold text-gray-800">Name:</span> {riderToDelete.name}</div>
                <div><span className="font-semibold text-gray-800">Email:</span> {riderToDelete.email}</div>
                <div><span className="font-semibold text-gray-800">Phone:</span> {riderToDelete.phone}</div>
                <div><span className="font-semibold text-gray-800">Vehicle:</span> {riderToDelete.riderProfile?.vehicleType || 'Unassigned'} ({riderToDelete.riderProfile?.vehicleNumber || 'No number'})</div>
              </div>
              <p className="text-xs text-red-600 bg-red-50/70 p-2.5 rounded-xl border border-red-200">
                ⚠️ This action will completely erase the rider profile, vehicle records, KYC documents, and user login credentials from the database. The phone and email will be freed up for fresh registration.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setRiderToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDeleteRider}
                className="px-5 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors cursor-pointer shadow-sm flex items-center gap-1.5"
              >
                {deleting ? 'Deleting...' : 'Yes, Delete Rider'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

