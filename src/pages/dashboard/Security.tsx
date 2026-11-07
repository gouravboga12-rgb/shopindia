import React, { useState } from 'react';
import { PageHeader, SectionCard, fieldCls } from '../../components/dashboard/DashboardUI';
import { KeyRound, Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { API_BASE, getCustomerToken, clearCustomerSession } from '../../lib/customerAuth';

export const SecurityPage: React.FC = () => {
  // Password change state
  const [cur, setCur] = useState('');
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ text: string; isError: boolean } | null>(null);

  // Delete account modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Handle password update
  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw !== confirm) {
      setPwMsg({ text: 'New passwords do not match.', isError: true });
      return;
    }
    if (pw.length < 6) {
      setPwMsg({ text: 'New password must be at least 6 characters long.', isError: true });
      return;
    }

    setPwLoading(true);
    setPwMsg(null);

    try {
      const token = getCustomerToken();
      if (!token) {
        setPwMsg({ text: 'Please log in to update your password.', isError: true });
        return;
      }

      const res = await fetch(`${API_BASE}/api/customer/profile/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword: cur, newPassword: pw }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update password.');
      }

      setPwMsg({ text: 'Password updated successfully!', isError: false });
      setCur('');
      setPw('');
      setConfirm('');
    } catch (err: any) {
      setPwMsg({ text: err.message || 'Error updating password.', isError: true });
    } finally {
      setPwLoading(false);
    }
  };

  // Delete account execution
  const handleDeleteAccount = async () => {
    if (!deletePassword.trim()) {
      setDeleteError('Please enter your account password to confirm account deletion.');
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);

    try {
      const token = getCustomerToken();
      if (!token) {
        throw new Error('Please sign in to delete your account.');
      }

      const res = await fetch(`${API_BASE}/api/customer/profile`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ password: deletePassword }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Could not delete account. Please verify your password.');
      }

      // Clear all local session caches
      clearCustomerSession();
      try {
        localStorage.removeItem('shopindia_customer_wishlist');
        localStorage.removeItem('shopindia_customer_notifications');
        localStorage.removeItem('shopindia_cart');
      } catch {}

      // Redirect user to storefront
      window.location.href = '/';
    } catch (err: any) {
      setDeleteError(err.message || 'Could not delete account. Please verify your password.');
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Security" subtitle="Protect your account and update your credentials" />

      {/* Change password */}
      <SectionCard title="Change Password" subtitle="Use a strong password you don't use elsewhere">
        <form onSubmit={changePassword} autoComplete="off" className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-black uppercase text-brand-slate">Current Password</label>
            <input
              type="password"
              name="current-password"
              autoComplete="current-password"
              className={fieldCls}
              value={cur}
              onChange={(e) => setCur(e.target.value)}
              required
              placeholder="••••••••"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-black uppercase text-brand-slate">New Password</label>
            <input
              type="password"
              name="new-password"
              autoComplete="new-password"
              className={fieldCls}
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              required
              minLength={6}
              placeholder="At least 6 characters"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-black uppercase text-brand-slate">Confirm New Password</label>
            <input
              type="password"
              name="confirm-password"
              autoComplete="new-password"
              className={fieldCls}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              placeholder="Confirm new password"
            />
          </div>
          <div className="md:col-span-3 flex items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={pwLoading}
              className="px-5 py-2.5 bg-brand-blue text-white rounded-button text-xs font-bold inline-flex items-center gap-1.5 hover:bg-brand-blue/90 transition-colors disabled:opacity-50"
            >
              {pwLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}
              {pwLoading ? 'Updating...' : 'Update Password'}
            </button>
            {pwMsg && (
              <span className={`text-xs font-bold ${pwMsg.isError ? 'text-red-500' : 'text-emerald-600'}`}>
                {pwMsg.text}
              </span>
            )}
          </div>
        </form>
      </SectionCard>

      {/* Delete account */}
      <SectionCard title="Danger Zone" subtitle="Irreversible actions on your account">
        <div className="flex items-center justify-between px-4 py-4 bg-red-50/70 border border-red-200/80 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center text-red-600 shrink-0">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-red-800">Delete My Account</p>
              <p className="text-xs text-red-600">Permanently remove your account, profile, and personal records.</p>
            </div>
          </div>
          <button
            onClick={() => {
              setDeletePassword('');
              setDeleteError(null);
              setIsDeleteModalOpen(true);
            }}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-button text-xs font-bold transition-colors shadow-sm"
          >
            Delete Account
          </button>
        </div>
      </SectionCard>

      {/* Confirmation Modal for Account Deletion */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-red-100 space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-base font-bold text-slate-900">Delete Account Permanently</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Are you sure you want to delete your account? This action cannot be undone. All your order history,
                saved addresses, and account details will be permanently deactivated.
              </p>
            </div>

            {deleteError && (
              <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg font-medium text-center">
                {deleteError}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase text-slate-700">
                Enter your password to confirm <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                className={fieldCls}
                value={deletePassword}
                onChange={(e) => {
                  setDeletePassword(e.target.value);
                  if (deleteError) setDeleteError(null);
                }}
                placeholder="Enter password to confirm"
                autoFocus
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setDeleteError(null);
                  setDeletePassword('');
                }}
                className="flex-1 py-2.5 px-4 rounded-button text-xs font-bold border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteAccount}
                className="flex-1 py-2.5 px-4 rounded-button text-xs font-bold bg-red-600 hover:bg-red-700 text-white transition-colors flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
              >
                {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                {isDeleting ? 'Deleting...' : 'Delete My Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
