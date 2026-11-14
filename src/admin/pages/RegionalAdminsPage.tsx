import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { useSocketEvent } from '../../lib/socket';
import {
  Globe2,
  CheckCircle2,
  RefreshCw,
  Building,
  Mail,
  Phone,
  PauseCircle,
  Eye,
  FileText,
  ExternalLink,
  X,
  XCircle,
  Trash2,
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
    address?: string;
    idProofUrl?: string;
    status: string;
    branch?: { id: string; name: string; city: string };
  };
}

export const RegionalAdminsPage: React.FC = () => {
  const [admins, setAdmins] = useState<RegionalAdminItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<{ title: string; url: string } | null>(null);

  const loadAdmins = () => {
    setLoading(true);
    api
      .get<{ regionalAdmins: RegionalAdminItem[] }>('/api/admin/regional-admins')
      .then((data) => setAdmins(data.regionalAdmins || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(loadAdmins, []);

  // Real-time synchronization when any regional admin updates their profile/pincodes/docs
  useSocketEvent('regional_admin:profile_updated', () => {
    loadAdmins();
  });

  const handleUpdateStatus = async (userId: string, newStatus: string) => {
    setActionLoadingId(userId);
    try {
      const res: any = await api.patch(`/api/admin/regional-admins/${userId}/status`, { status: newStatus });
      setAdmins((prev) =>
        prev.map((a) => {
          if (a.id === userId) {
            return {
              ...a,
              regionalAdminProfile: res?.profile || {
                ...(a.regionalAdminProfile || {}),
                status: newStatus,
                regionName: a.regionalAdminProfile?.regionName || 'Territory Hub',
              },
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

  const handleDeleteAdmin = async (userId: string, name: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete the application record for "${name}"?`)) return;
    setActionLoadingId(userId);
    try {
      await api.delete(`/api/admin/regional-admins/${userId}`);
      setAdmins((prev) => prev.filter((a) => a.id !== userId));
    } catch (err: any) {
      alert(err.message || 'Failed to delete regional admin');
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
                          ? 'bg-gray-100 text-gray-700 border border-gray-200'
                          : status === 'rejected'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
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

                  {/* ID Proof / Compliance Document Preview */}
                  <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-gray-400">KYC / ID Proof:</span>
                    {profile?.idProofUrl ? (
                      <button
                        type="button"
                        onClick={() => setPreviewDoc({ title: `Hub Admin ID Proof • ${adm.name}`, url: profile.idProofUrl! })}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg cursor-pointer transition-colors"
                      >
                        <Eye className="w-3 h-3" /> View Document
                      </button>
                    ) : (
                      <span className="text-[10px] text-gray-400 font-medium">Not Attached</span>
                    )}
                  </div>
                </div>

                {/* Status Action Buttons */}
                <div className="pt-3 border-t border-gray-100 flex items-center gap-2">
                  {/* When Pending: Show Approve & Reject */}
                  {status === 'pending_approval' && (
                    <>
                      <button
                        disabled={actionLoadingId === adm.id}
                        onClick={() => handleUpdateStatus(adm.id, 'approved')}
                        className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <CheckCircle2 size={13} />
                        <span>Approve</span>
                      </button>

                      <button
                        disabled={actionLoadingId === adm.id}
                        onClick={() => handleUpdateStatus(adm.id, 'rejected')}
                        className="py-1.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
                      >
                        Reject
                      </button>
                    </>
                  )}

                  {/* When Approved: Show Suspend */}
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

                  {/* When Suspended: Show Re-activate */}
                  {status === 'suspended' && (
                    <button
                      disabled={actionLoadingId === adm.id}
                      onClick={() => handleUpdateStatus(adm.id, 'approved')}
                      className="flex-1 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <CheckCircle2 size={13} />
                      <span>Re-activate</span>
                    </button>
                  )}

                  {/* When Rejected: Clearly show Rejected state, do not show Approve as primary button */}
                  {status === 'rejected' && (
                    <div className="flex-1 flex items-center justify-between py-1">
                      <span className="text-xs font-bold text-rose-600 flex items-center gap-1.5">
                        <XCircle size={14} className="text-rose-500" />
                        Application Rejected
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={actionLoadingId === adm.id}
                          onClick={() => handleUpdateStatus(adm.id, 'approved')}
                          className="text-[11px] font-semibold text-gray-500 hover:text-emerald-700 hover:underline cursor-pointer transition-colors"
                          title="Reconsider and approve this application"
                        >
                          Re-approve?
                        </button>
                        <button
                          type="button"
                          disabled={actionLoadingId === adm.id}
                          onClick={() => handleDeleteAdmin(adm.id, adm.name)}
                          className="p-1 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete application record"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── In-Page Document Preview Lightbox Modal ─── */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh] border border-slate-200">
            {/* Modal Header */}
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                <h3 className="font-bold text-sm text-slate-900 truncate">{previewDoc.title}</h3>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={previewDoc.url}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-colors"
                  title="Open in new window"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewDoc(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Document Viewer Body */}
            <div className="flex-1 overflow-auto p-4 sm:p-6 bg-slate-950 flex items-center justify-center min-h-[350px]">
              {previewDoc.url.toLowerCase().includes('.pdf') ? (
                <iframe
                  src={previewDoc.url}
                  className="w-full h-[65vh] rounded-xl border border-slate-800"
                  title={previewDoc.title}
                />
              ) : (
                <img
                  src={previewDoc.url}
                  alt={previewDoc.title}
                  className="max-w-full max-h-[70vh] object-contain rounded-xl shadow-2xl"
                />
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
              <span className="font-mono text-[11px] text-slate-500">AWS Cloud S3 Verified Document</span>
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="px-4 py-1.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
