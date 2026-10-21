import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import {
  Globe2,
  CheckCircle2,
  RefreshCw,
  Building,
  Mail,
  Phone,
  PauseCircle,
} from 'lucide-react';

interface RegionalAdminItem {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  regionalAdminProfile?: {
    id: string;
    regionName: string;
    district?: string;
    state?: string;
    assignedPincodes?: string[];
    status: string;
    branch?: { id: string; name: string; city: string };
  };
}

export const RegionalAdminsPage: React.FC = () => {
  const [admins, setAdmins] = useState<RegionalAdminItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const loadAdmins = () => {
    setLoading(true);
    api
      .get<{ regionalAdmins: RegionalAdminItem[] }>('/api/admin/regional-admins')
      .then((data) => setAdmins(data.regionalAdmins || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(loadAdmins, []);

  const handleUpdateStatus = async (userId: string, newStatus: string) => {
    setActionLoadingId(userId);
    try {
      await api.patch(`/api/admin/regional-admins/${userId}/status`, { status: newStatus });
      setAdmins((prev) =>
        prev.map((a) => {
          if (a.id === userId && a.regionalAdminProfile) {
            return {
              ...a,
              regionalAdminProfile: { ...a.regionalAdminProfile, status: newStatus },
            };
          }
          return a;
        })
      );
    } catch (err: any) {
      alert(err.message || 'Failed to update regional admin status');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-heading">Regional Administrators & Zones</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Approve regional hub applications, assign operating branches, and oversee territory supervisors
          </p>
        </div>

        <button
          onClick={loadAdmins}
          disabled={loading}
          className="px-3.5 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-50 flex items-center gap-2 shadow-xs transition-all cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          <span>Refresh List</span>
        </button>
      </div>

      {/* Grid of Regional Admins */}
      {loading ? (
        <div className="py-16 text-center text-gray-400 text-xs">Loading regional managers...</div>
      ) : admins.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400">
          <Globe2 className="w-12 h-12 mx-auto mb-2 opacity-30 text-blue-600" />
          <p className="text-sm font-semibold text-gray-600">No Regional Admin applications filed yet.</p>
          <p className="text-xs text-gray-400 mt-1">Applicants register at /regional-admin/register</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {admins.map((adm) => {
            const profile = adm.regionalAdminProfile;
            const status = profile?.status || 'pending_approval';

            return (
              <div
                key={adm.id}
                className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">
                        {profile?.regionName || 'General Region'}
                      </span>
                      <h3 className="text-base font-bold text-gray-900 mt-0.5">{adm.name}</h3>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        status === 'approved'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : status === 'suspended'
                          ? 'bg-red-50 text-red-700 border border-red-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {status.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="mt-3 text-xs text-gray-500 space-y-1">
                    <p className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-gray-400" />
                      <span className="truncate">{adm.email}</span>
                    </p>
                    <p className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-gray-400" />
                      <span>{adm.phone || 'No phone'}</span>
                    </p>
                    <p className="flex items-center gap-2">
                      <Building className="w-3.5 h-3.5 text-gray-400" />
                      <span>
                        {profile?.district ? `${profile.district}, ` : ''}{profile?.state || 'Territory'}
                      </span>
                    </p>
                  </div>

                  {profile?.assignedPincodes && profile.assignedPincodes.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-gray-100">
                      <span className="text-[10px] font-semibold text-gray-400 block mb-1">Assigned Pincodes:</span>
                      <div className="flex flex-wrap gap-1">
                        {profile.assignedPincodes.map((pin) => (
                          <span key={pin} className="text-[10px] font-mono bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                            {pin}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Status Action Buttons */}
                <div className="pt-3 border-t border-gray-100 flex gap-2">
                  {status !== 'approved' && (
                    <button
                      disabled={actionLoadingId === adm.id}
                      onClick={() => handleUpdateStatus(adm.id, 'approved')}
                      className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <CheckCircle2 size={13} />
                      <span>Approve</span>
                    </button>
                  )}

                  {status === 'approved' && (
                    <button
                      disabled={actionLoadingId === adm.id}
                      onClick={() => handleUpdateStatus(adm.id, 'suspended')}
                      className="flex-1 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <PauseCircle size={13} />
                      <span>Suspend</span>
                    </button>
                  )}

                  {status !== 'rejected' && status !== 'approved' && (
                    <button
                      disabled={actionLoadingId === adm.id}
                      onClick={() => handleUpdateStatus(adm.id, 'rejected')}
                      className="py-1.5 px-3 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      Reject
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
