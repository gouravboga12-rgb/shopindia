import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Search, UserX, Ban, CheckCircle, Download, Trash2, AlertTriangle, Loader2 } from 'lucide-react';

const ROLES = ['all', 'customer', 'vendor', 'rider', 'regional_admin', 'super_admin'];

export const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [role, setRole] = useState('all');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string; email: string; role?: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = () => {
    setLoading(true);
    const qs = [role !== 'all' ? `role=${role}` : '', q ? `q=${q}` : ''].filter(Boolean).join('&');
    api.get<{ users: any[] }>(`/api/admin/users?${qs}`)
      .then(d => setUsers(d.users))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(load, [role]);

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      await api.patch(`/api/admin/users/${id}/status`, { status: newStatus });
      load();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/api/admin/users/${deleteTarget.id}`);
      setUsers(prev => prev.filter(u => (u.id || u._id) !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err: any) {
      alert(err.message || 'Failed to delete user.');
    } finally {
      setDeleting(false);
    }
  };

  const filtered = users.filter(u =>
    (role === 'all' || u.role === role) &&
    (!q || u.name.toLowerCase().includes(q.toLowerCase()) || u.email.toLowerCase().includes(q.toLowerCase()))
  );

  const handleExportCSV = () => {
    if (!filtered || filtered.length === 0) {
      alert('No user records match current filters to export.');
      return;
    }
    const headers = ['User ID', 'Name', 'Email', 'Phone', 'Role', 'Status', 'Joined Date'];
    const rows = filtered.map(u => [
      `"${u.id || ''}"`,
      `"${(u.name || '').replace(/"/g, '""')}"`,
      `"${(u.email || '').replace(/"/g, '""')}"`,
      `"${(u.phone || '').replace(/"/g, '""')}"`,
      `"${(u.role || '').toUpperCase()}"`,
      `"${(u.status || 'ACTIVE').toUpperCase()}"`,
      `"${u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-IN') : ''}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `users_export_${role}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-heading">User Management</h1>
          <p className="text-sm text-gray-500">View and manage customers, staff, riders, vendors, and regional admins</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-xs font-bold flex items-center gap-1.5 hover:bg-gray-50 shadow-2xs transition-all cursor-pointer"
          >
            <Download className="w-4 h-4 text-[#0F2C59]" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="relative flex-1 min-w-full max-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search users..."
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2C59]/20"
          />
        </div>

        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
          {ROLES.map(r => (
            <button
              key={r}
              onClick={() => setRole(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                role === r ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {r.replace('_', ' ').toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-premium overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-gray-600">
                <th className="text-left px-5 py-3.5 font-semibold">User</th>
                <th className="text-left px-5 py-3.5 font-semibold">Phone</th>
                <th className="text-left px-5 py-3.5 font-semibold">Role</th>
                <th className="text-left px-5 py-3.5 font-semibold">Status</th>
                <th className="text-left px-5 py-3.5 font-semibold">Registered</th>
                <th className="text-left px-5 py-3.5 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}><td colSpan={6} className="px-5 py-4"><div className="h-4 skeleton-shimmer rounded" /></td></tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-gray-400">No users found.</td></tr>
              ) : (
                filtered.map(u => (
                  <tr key={u.id || u._id} className="hover:bg-gray-50/50">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-gray-900">{u.name}</p>
                      <p className="text-xs text-gray-400">{u.email}</p>
                    </td>
                    <td className="px-5 py-4 text-gray-600">{u.phone}</td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                        {u.role}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                        u.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        u.status === 'suspended' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        'bg-red-50 text-red-700 border-red-200'
                      }`}>
                        {u.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs text-gray-400">{u.createdAt?.slice(0, 10)}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5">
                        {u.status !== 'active' && (
                          <button
                            onClick={() => updateStatus(u.id || u._id, 'active')}
                            className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors cursor-pointer"
                            title="Activate User"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        {u.status !== 'suspended' && (
                          <button
                            onClick={() => updateStatus(u.id || u._id, 'suspended')}
                            className="p-1.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors cursor-pointer"
                            title="Suspend User"
                          >
                            <UserX className="w-4 h-4" />
                          </button>
                        )}
                        {u.status !== 'blocked' && (
                          <button
                            onClick={() => updateStatus(u.id || u._id, 'blocked')}
                            className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors cursor-pointer"
                            title="Block User"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        )}

                        {/* Permanent Delete Button with Professional In-Page Confirmation */}
                        {u.email !== 'admin@shopindia.in' && (
                          <button
                            onClick={() => setDeleteTarget({ id: u.id || u._id, name: u.name, email: u.email, role: u.role })}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Permanently Delete User Account"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── Professional In-Page Delete Confirmation Modal ─── */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-6 sm:p-7 w-full max-w-md shadow-2xl border border-gray-100 space-y-5 animate-in zoom-in-95 duration-150">
            {/* Header Icon & Title */}
            <div className="text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto shadow-xs">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-extrabold text-gray-900 tracking-tight">
                Permanently Delete User?
              </h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto leading-relaxed">
                This will permanently purge this user's account and all linked records from the database. This action <strong className="text-rose-600 font-bold">cannot be undone</strong>.
              </p>
            </div>

            {/* Target Account Summary Card */}
            <div className="bg-gray-50 border border-gray-200/80 rounded-2xl p-4 text-xs space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-gray-500 font-medium">User Name:</span>
                <span className="font-extrabold text-gray-900">{deleteTarget.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 font-medium">Email:</span>
                <span className="font-mono text-gray-800 font-bold">{deleteTarget.email}</span>
              </div>
              {deleteTarget.role && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 font-medium">Assigned Role:</span>
                  <span className="font-bold uppercase text-[10px] px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100">
                    {deleteTarget.role}
                  </span>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 px-4 bg-white border border-gray-200 text-gray-700 font-bold text-xs rounded-xl hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={confirmDelete}
                className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Permanently</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
