import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Search, CheckCircle, Ban, Truck, Trash2, AlertTriangle, X } from 'lucide-react';

export const RidersPage: React.FC = () => {
  const [riders, setRiders] = useState<any[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [riderToDelete, setRiderToDelete] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = () => {
    setLoading(true);
    api.get<{ riders: any[] }>('/api/admin/riders')
      .then(d => setRiders(d.riders))
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

  const filtered = riders.filter(r => !q || r.name.toLowerCase().includes(q.toLowerCase()) || r.phone?.includes(q) || r.email?.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Rider Operations</h1>
        <p className="text-sm text-gray-500">Track active deliveries, vehicle assignments, and rider payouts (FR-04)</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={q} onChange={e => setQ(e.target.value)} placeholder="Search riders by name, email, phone..."
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2C59]/20"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-premium overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 border-b border-gray-100 text-gray-600">
            <tr>
              <th className="px-5 py-3.5 font-semibold">Rider Details</th>
              <th className="px-5 py-3.5 font-semibold">Vehicle</th>
              <th className="px-5 py-3.5 font-semibold">Deliveries</th>
              <th className="px-5 py-3.5 font-semibold">Wallet / Payout</th>
              <th className="px-5 py-3.5 font-semibold">Status</th>
              <th className="px-5 py-3.5 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={6} className="px-5 py-12 text-center text-gray-400">Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-gray-400">No riders found.</td></tr>
            ) : filtered.map(r => (
              <tr key={r.id || r._id} className="hover:bg-gray-50/50">
                <td className="px-5 py-4">
                  <p className="font-semibold text-gray-900 flex items-center gap-1.5"><Truck className="w-4 h-4 text-blue-500"/> {r.name}</p>
                  <p className="text-xs text-gray-500">{r.phone}</p>
                  {r.email && <p className="text-xs text-blue-600 font-mono truncate max-w-[200px] mt-0.5">{r.email}</p>}
                </td>
                <td className="px-5 py-4 text-gray-600">
                  {r.riderProfile?.vehicleType || 'Unassigned'} <br/>
                  <span className="text-xs text-gray-400">{r.riderProfile?.licenseNumber || '—'}</span>
                </td>
                <td className="px-5 py-4 font-semibold text-gray-900">
                  {r.riderProfile?.deliveries?.length || 0} Total
                </td>
                <td className="px-5 py-4">
                  <p className="font-numbers font-semibold text-gray-900">₹{r.riderProfile?.walletBalance || 0}</p>
                  {r.riderProfile?.walletBalance > 0 && (
                    <button onClick={() => processPayout(r.id, r.riderProfile.walletBalance)} className="text-xs text-blue-600 font-semibold hover:underline mt-1">
                      Clear Dues
                    </button>
                  )}
                </td>
                <td className="px-5 py-4">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded ${r.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                    {r.status}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-1.5">
                    {r.status !== 'active' && (
                      <button title="Activate Rider" onClick={() => updateStatus(r.id, 'active')} className="p-1.5 text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors">
                        <CheckCircle className="w-4 h-4"/>
                      </button>
                    )}
                    {r.status !== 'suspended' && (
                      <button title="Suspend Rider" onClick={() => updateStatus(r.id, 'suspended')} className="p-1.5 text-amber-600 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors">
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
            ))}
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

