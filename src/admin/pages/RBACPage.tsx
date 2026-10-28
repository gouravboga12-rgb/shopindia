import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { ShieldCheck, Lock, CheckCircle, Plus, Edit2, Trash2, Key, Users } from 'lucide-react';

interface RoleItem {
  id?: string;
  _id?: string;
  name: string;
  displayName: string;
  isSystem: boolean;
  permissions: string[];
}

export const RBACPage: React.FC = () => {
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit/Create Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleItem | null>(null);
  const [roleName, setRoleName] = useState('');
  const [roleDisplayName, setRoleDisplayName] = useState('');
  const [selectedPerms, setSelectedPerms] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      api.get<RoleItem[]>('/api/admin/rbac/roles'),
      api.get<string[]>('/api/admin/rbac/permissions')
    ]).then(([r, p]) => {
      setRoles(r || []);
      setPermissions(p || []);
    }).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = () => {
    setEditingRole(null);
    setRoleName('');
    setRoleDisplayName('');
    setSelectedPerms([]);
    setErrorMsg(null);
    setModalOpen(true);
  };

  const openEditModal = (role: RoleItem) => {
    setEditingRole(role);
    setRoleName(role.name);
    setRoleDisplayName(role.displayName);
    setSelectedPerms(role.permissions || []);
    setErrorMsg(null);
    setModalOpen(true);
  };

  const togglePerm = (perm: string) => {
    setSelectedPerms(prev =>
      prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]
    );
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);
    try {
      if (editingRole) {
        const id = editingRole.id || editingRole._id;
        await api.put(`/api/admin/rbac/roles/${id}`, {
          displayName: roleDisplayName,
          permissions: selectedPerms,
        });
      } else {
        await api.post('/api/admin/rbac/roles', {
          name: roleName.toLowerCase().trim().replace(/\s+/g, '_'),
          displayName: roleDisplayName,
          permissions: selectedPerms,
          isSystem: false,
        });
      }
      setModalOpen(false);
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save role');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRole = async (role: RoleItem) => {
    const id = role.id || role._id;
    if (!id || role.isSystem) return;
    if (!window.confirm(`Are you sure you want to delete the role "${role.displayName}"?`)) return;
    try {
      await api.delete(`/api/admin/rbac/roles/${id}`);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete role');
    }
  };

  // Group permissions for clean structured layout
  const permissionGroups: Record<string, string[]> = {
    'Overview & Dashboard': permissions.filter(p => p.includes('dashboard') || p.includes('reports')),
    'Finance & Payouts': permissions.filter(p => p.includes('finance') || p.includes('payout') || p.includes('commission') || p.includes('cod')),
    'Merchants & Catalog': permissions.filter(p => p.includes('vendor') || p.includes('product') || p.includes('service') || p.includes('category')),
    'Fleet & Delivery': permissions.filter(p => p.includes('rider') || p.includes('order')),
    'Regional & Branches': permissions.filter(p => p.includes('regional') || p.includes('branch') || p.includes('service_area')),
    'Users & Support': permissions.filter(p => p.includes('user') || p.includes('rbac') || p.includes('support') || p.includes('notification')),
  };

  if (loading) return <div className="h-60 skeleton-shimmer rounded-2xl" />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-heading flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-[#0F2C59]" />
            Role-Based Access Control (RBAC)
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Configure system and custom staff roles, assign permission matrices, and govern administrative access.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="px-4 py-2.5 bg-[#0F2C59] text-white rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-[#1a3d73] shadow-md transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Role</span>
        </button>
      </div>

      {/* Role Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {roles.map(r => {
          const roleId = r.id || r._id;
          return (
            <div key={roleId || r.name} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#0F2C59] flex items-center justify-center font-bold">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-sm">{r.displayName}</h3>
                      <p className="text-[11px] font-mono text-gray-400">role: {r.name}</p>
                    </div>
                  </div>
                  {r.isSystem ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                      <Lock className="w-3 h-3" /> System
                    </span>
                  ) : (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(r)}
                        className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-blue-600 transition-colors"
                        title="Edit Permissions"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteRole(r)}
                        className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete Role"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-gray-50">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Granted Access</p>
                  {r.name === 'super_admin' ? (
                    <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Full System Super Control (Bypasses all guards)</span>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pr-1">
                      {r.permissions && r.permissions.length > 0 ? (
                        r.permissions.map((p: string) => (
                          <span key={p} className="text-[10px] bg-slate-50 border border-slate-200 text-slate-700 px-2 py-0.5 rounded-md font-mono">
                            {p}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-gray-400 italic">No explicit permissions assigned</span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {!r.isSystem && (
                <div className="pt-3 mt-3 border-t border-gray-50 flex justify-end">
                  <button
                    onClick={() => openEditModal(r)}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <Edit2 className="w-3 h-3" /> Manage Permissions
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* System Permission Registry */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-5">
        <div>
          <h2 className="font-bold text-gray-900 text-base flex items-center gap-2">
            <Key className="w-4 h-4 text-[#0F2C59]" />
            ShopIndia System Permission Registry
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">Active permission guard keys enforced across API routes and admin navigation:</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(permissionGroups).map(([groupName, groupPerms]) => (
            groupPerms.length > 0 && (
              <div key={groupName} className="p-3.5 rounded-xl border border-gray-100 bg-gray-50/60 space-y-2">
                <p className="text-xs font-bold text-gray-800">{groupName}</p>
                <div className="flex flex-wrap gap-1.5">
                  {groupPerms.map(p => (
                    <span key={p} className="px-2 py-1 bg-white border border-gray-200 rounded text-[11px] font-mono text-gray-700">
                      🔑 {p}
                    </span>
                  ))}
                </div>
              </div>
            )
          ))}
        </div>
      </div>

      {/* CREATE / EDIT ROLE MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="font-bold text-base text-gray-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#0F2C59]" />
                {editingRole ? `Edit Role: ${editingRole.displayName}` : 'Create New Team Role'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSaveRole} className="space-y-4 flex-1 overflow-y-auto pr-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Role Identifier (Slug)</label>
                  <input
                    type="text"
                    required
                    disabled={!!editingRole}
                    placeholder="e.g. territory_coordinator"
                    value={roleName}
                    onChange={(e) => setRoleName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-[#0F2C59] focus:outline-none disabled:bg-gray-100 disabled:text-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Display Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Territory Coordinator"
                    value={roleDisplayName}
                    onChange={(e) => setRoleDisplayName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-[#0F2C59] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">Select Assigned Permissions</label>
                <div className="space-y-3 border border-gray-200 rounded-xl p-3 bg-gray-50/50">
                  {Object.entries(permissionGroups).map(([groupName, groupPerms]) => (
                    groupPerms.length > 0 && (
                      <div key={groupName} className="space-y-1.5">
                        <p className="text-[11px] font-extrabold text-gray-500 uppercase tracking-wider">{groupName}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {groupPerms.map(p => {
                            const isChecked = selectedPerms.includes(p);
                            return (
                              <label
                                key={p}
                                className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                                  isChecked
                                    ? 'bg-blue-50 border-blue-200 text-[#0F2C59] font-semibold'
                                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => togglePerm(p)}
                                  className="w-4 h-4 rounded text-[#0F2C59] focus:ring-0 cursor-pointer"
                                />
                                <span className="font-mono text-[11px]">{p}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !roleDisplayName.trim() || (!editingRole && !roleName.trim())}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#0F2C59] hover:bg-[#1a3d73] shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                >
                  {saving ? 'Saving...' : editingRole ? 'Update Role' : 'Create Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
