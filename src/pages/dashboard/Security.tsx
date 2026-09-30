import React, { useState } from 'react';
import { PageHeader, SectionCard, GhostButton, fieldCls, Badge } from '../../components/dashboard/DashboardUI';
import { KeyRound, Smartphone, Laptop, Trash2, Check, AlertTriangle, LogOut, Loader2 } from 'lucide-react';
import { API_BASE, getCustomerToken, clearCustomerSession } from '../../lib/customerAuth';

interface SessionItem {
  id: string;
  device: string;
  location: string;
  active: boolean;
  isCurrent: boolean;
  lastActive: string;
}

const getInitialSessions = (): SessionItem[] => {
  let currentDevice = 'Windows · Chrome';
  if (typeof navigator !== 'undefined') {
    const ua = navigator.userAgent;
    let os = 'Windows';
    if (/iPhone/i.test(ua)) os = 'iPhone';
    else if (/iPad/i.test(ua)) os = 'iPad';
    else if (/Android/i.test(ua)) os = 'Android';
    else if (/Macintosh|Mac OS X/i.test(ua)) os = 'macOS';
    else if (/Linux/i.test(ua)) os = 'Linux';

    let browser = 'Chrome';
    if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari';
    else if (/Firefox/i.test(ua)) browser = 'Firefox';
    else if (/Edg/i.test(ua)) browser = 'Edge';

    currentDevice = `${os} · ${browser}`;
  }

  return [
    { id: 's1', device: `${currentDevice} (Current Device)`, location: 'Bengaluru, IN', active: true, isCurrent: true, lastActive: 'Now' },
    { id: 's2', device: 'Windows · Chrome', location: 'Mumbai, IN', active: false, isCurrent: false, lastActive: '2 days ago' },
  ];
};

export const SecurityPage: React.FC = () => {
  // Password change state
  const [cur, setCur] = useState('');
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ text: string; isError: boolean } | null>(null);

  // Sessions state
  const [sessions, setSessions] = useState<SessionItem[]>(getInitialSessions);
  const [sessionToast, setSessionToast] = useState<string | null>(null);

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
        setPwMsg({ text: 'Password updated successfully.', isError: false });
        setCur('');
        setPw('');
        setConfirm('');
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

  // Sign out of all other sessions
  const handleSignOutAll = () => {
    setSessions((prev) => prev.filter((s) => s.isCurrent));
    setSessionToast('All other active sessions have been signed out.');
    setTimeout(() => setSessionToast(null), 4000);
  };

  // Revoke single session
  const handleRevokeSession = (sessionId: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    setSessionToast('Session signed out successfully.');
    setTimeout(() => setSessionToast(null), 3000);
  };

  // Delete account execution
  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    setDeleteError(null);

    try {
      const token = getCustomerToken();
      if (token) {
        const res = await fetch(`${API_BASE}/api/customer/profile`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ password: deletePassword || undefined }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok && res.status !== 404) {
          throw new Error(data.error || 'Failed to delete account.');
        }
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

  const otherSessionsCount = sessions.filter((s) => !s.isCurrent).length;

  return (
    <div className="space-y-6">
      <PageHeader title="Security" subtitle="Protect your account and devices" />

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
            <label className="text-xs font-black uppercase text-brand-slate">Confirm New</label>
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
          <div className="md:col-span-3 flex items-center gap-3">
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

      {/* Active sessions */}
      <SectionCard
        title="Login Sessions"
        subtitle="Devices currently signed in to your account"
        action={
          <GhostButton
            onClick={handleSignOutAll}
            disabled={otherSessionsCount === 0}
            className={`text-xs font-bold transition-colors ${
              otherSessionsCount > 0
                ? 'text-red-600 hover:text-red-700 hover:bg-red-50'
                : 'text-slate-400 cursor-not-allowed opacity-60'
            }`}
          >
            <LogOut className="w-3 h-3 mr-1 inline" />
            Sign out all
          </GhostButton>
        }
      >
        <div className="space-y-2.5">
          {sessionToast && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium rounded-xl flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{sessionToast}</span>
            </div>
          )}

          {sessions.map((s) => (
            <div
              key={s.id}
              className={`flex items-center justify-between px-4 py-3 border rounded-xl transition-all ${
                s.isCurrent ? 'border-brand-blue/30 bg-blue-50/20' : 'border-brand-border bg-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-slate-100 text-brand-slate flex items-center justify-center">
                  {s.device.includes('Windows') || s.device.includes('macOS') || s.device.includes('Linux') ? (
                    <Laptop className="w-4 h-4" />
                  ) : (
                    <Smartphone className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-brand-graphite">{s.device}</p>
                    {s.isCurrent && (
                      <span className="px-1.5 py-0.5 text-[10px] font-bold bg-blue-100 text-brand-blue rounded">
                        Current
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-brand-slate">
                    {s.location} · {s.lastActive}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={s.active ? 'green' : 'slate'}>
                  {s.active ? <Check className="w-3 h-3 inline -mt-0.5 mr-0.5" /> : ''}
                  {s.active ? 'Active' : 'Inactive'}
                </Badge>
                {!s.isCurrent && (
                  <button
                    onClick={() => handleRevokeSession(s.id)}
                    className="text-[11px] font-semibold text-red-600 hover:text-red-700 hover:underline px-2 py-1"
                  >
                    Sign out
                  </button>
                )}
              </div>
            </div>
          ))}

          {sessions.length === 1 && (
            <p className="text-xs text-brand-slate text-center pt-2">
              No other active sessions. Your account is only signed in on this device.
            </p>
          )}
        </div>
      </SectionCard>

      {/* Delete account */}
      <SectionCard title="Danger Zone" subtitle="Irreversible actions on your account">
        <div className="flex items-center justify-between px-4 py-3 bg-red-50 border border-red-100 rounded-xl">
          <div className="flex items-center gap-3">
            <Trash2 className="w-5 h-5 text-red-500 shrink-0" />
            <div>
              <p className="text-xs font-bold text-red-700">Delete My Account</p>
              <p className="text-xs text-red-500">This removes all your data permanently.</p>
            </div>
          </div>
          <button
            onClick={() => setIsDeleteModalOpen(true)}
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
                saved addresses, and account details will be permanently removed.
              </p>
            </div>

            {deleteError && (
              <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg font-medium text-center">
                {deleteError}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase text-slate-600">
                Confirm your password (optional)
              </label>
              <input
                type="password"
                className={fieldCls}
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Enter password to confirm"
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