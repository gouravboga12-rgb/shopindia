import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { 
  Bell, Send, Users, Store, Globe2, 
  CheckCircle2, Clock, AlertTriangle,
  RefreshCw, ExternalLink
} from 'lucide-react';

export const NotificationsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'broadcast' | 'history'>('broadcast');

  // Multi-select targets
  const [targetCustomers, setTargetCustomers] = useState(true);
  const [targetVendors, setTargetVendors] = useState(false);
  const [targetRegionalAdmins, setTargetRegionalAdmins] = useState(false);

  // Form inputs
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<'info' | 'announcement' | 'warning' | 'urgent'>('announcement');
  const [category, setCategory] = useState<'alert' | 'promotion' | 'system'>('alert');
  const [link, setLink] = useState('');

  // Status
  const [sending, setSending] = useState(false);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // History state
  const [broadcasts, setBroadcasts] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await api.get<{ broadcasts: any[] }>('/api/admin/notifications/broadcasts');
      if (res?.broadcasts) {
        setBroadcasts(res.broadcasts);
      }
    } catch (err) {
      console.warn('Failed to load broadcast history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory();
    }
  }, [activeTab]);

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessBanner(null);
    setErrorMessage(null);

    const targets: string[] = [];
    if (targetCustomers) targets.push('customers');
    if (targetVendors) targets.push('vendors');
    if (targetRegionalAdmins) targets.push('regional_admins');

    if (targets.length === 0) {
      setErrorMessage('Please select at least one recipient audience (Customers, Vendors, or Regional Admins).');
      return;
    }
    if (!title.trim() || !message.trim()) {
      setErrorMessage('Please enter both a title and message.');
      return;
    }

    setSending(true);
    try {
      const res = await api.post<{ success: boolean; message: string; deliveredCount: number }>('/api/admin/notifications/broadcast', {
        targets,
        title: title.trim(),
        message: message.trim(),
        priority,
        category,
        link: link.trim() || undefined
      });

      setSuccessBanner(res.message || `Successfully dispatched notification alert to ${res.deliveredCount || 0} users!`);
      setTitle('');
      setMessage('');
      setLink('');
      loadHistory();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to dispatch notification alert.');
    } finally {
      setSending(false);
    }
  };

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case 'urgent':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-red-100 text-red-700 border border-red-200">Urgent</span>;
      case 'warning':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-100 text-amber-800 border border-amber-200">Warning</span>;
      case 'announcement':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">Announcement</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-100 text-blue-800 border border-blue-200">Info</span>;
    }
  };

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-heading flex items-center gap-2">
            <Bell className="w-6 h-6 text-[#0F2C59]" />
            <span>Platform Broadcast &amp; Alert Center</span>
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Dispatch announcements and critical alerts to Shoppers, Vendors, and Regional Admins separately or simultaneously.
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="bg-gray-100 p-1 rounded-xl flex items-center gap-1 border border-gray-200 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('broadcast')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'broadcast' ? 'bg-[#0F2C59] text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            📢 Send Alert
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'history' ? 'bg-[#0F2C59] text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            📋 Sent History ({broadcasts.length})
          </button>
        </div>
      </div>

      {successBanner && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl flex items-center justify-between gap-3 text-xs font-bold animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successBanner}</span>
          </div>
          <button onClick={() => setSuccessBanner(null)} className="text-emerald-700 hover:text-emerald-900 underline cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-900 rounded-2xl flex items-center justify-between gap-3 text-xs font-bold animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-red-700 hover:text-red-900 underline cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {activeTab === 'broadcast' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Form */}
          <form onSubmit={handleSendBroadcast} className="lg:col-span-2 bg-white rounded-3xl border border-gray-200 p-6 shadow-sm space-y-5">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-2 font-heading">
                Step 1: Select Target Recipients (Check 1, 2, or all 3)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Customers */}
                <label className={`p-4 rounded-2xl border-2 transition-all flex flex-col gap-2 cursor-pointer ${
                  targetCustomers ? 'border-blue-600 bg-blue-50/40 text-blue-900' : 'border-gray-200 hover:border-gray-300 bg-white text-gray-700'
                }`}>
                  <div className="flex items-center justify-between">
                    <Users className="w-5 h-5 text-blue-600" />
                    <input
                      type="checkbox"
                      checked={targetCustomers}
                      onChange={e => setTargetCustomers(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                    />
                  </div>
                  <div>
                    <span className="font-bold text-xs block">Shoppers / Users</span>
                    <span className="text-[10px] text-gray-500 block">Customer App &amp; Dashboard</span>
                  </div>
                </label>

                {/* Vendors */}
                <label className={`p-4 rounded-2xl border-2 transition-all flex flex-col gap-2 cursor-pointer ${
                  targetVendors ? 'border-emerald-600 bg-emerald-50/40 text-emerald-900' : 'border-gray-200 hover:border-gray-300 bg-white text-gray-700'
                }`}>
                  <div className="flex items-center justify-between">
                    <Store className="w-5 h-5 text-emerald-600" />
                    <input
                      type="checkbox"
                      checked={targetVendors}
                      onChange={e => setTargetVendors(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
                    />
                  </div>
                  <div>
                    <span className="font-bold text-xs block">Store Vendors</span>
                    <span className="text-[10px] text-gray-500 block">Merchant Portal &amp; Orders</span>
                  </div>
                </label>

                {/* Regional Admins */}
                <label className={`p-4 rounded-2xl border-2 transition-all flex flex-col gap-2 cursor-pointer ${
                  targetRegionalAdmins ? 'border-purple-600 bg-purple-50/40 text-purple-900' : 'border-gray-200 hover:border-gray-300 bg-white text-gray-700'
                }`}>
                  <div className="flex items-center justify-between">
                    <Globe2 className="w-5 h-5 text-purple-600" />
                    <input
                      type="checkbox"
                      checked={targetRegionalAdmins}
                      onChange={e => setTargetRegionalAdmins(e.target.checked)}
                      className="w-4 h-4 text-purple-600 rounded cursor-pointer"
                    />
                  </div>
                  <div>
                    <span className="font-bold text-xs block">Regional Admins</span>
                    <span className="text-[10px] text-gray-500 block">Territory &amp; Hub Managers</span>
                  </div>
                </label>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4 space-y-4">
              <label className="block text-xs font-black uppercase tracking-wider text-gray-500 font-heading">
                Step 2: Compose Notification Message
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Alert Priority / Tone</label>
                  <select
                    value={priority}
                    onChange={e => setPriority(e.target.value as any)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F2C59]/20 cursor-pointer"
                  >
                    <option value="announcement">📢 Announcement (Standard Green)</option>
                    <option value="info">ℹ️ Informational (Blue)</option>
                    <option value="warning">⚠️ Important Warning (Amber)</option>
                    <option value="urgent">🚨 Urgent / Action Required (Red)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Category Classification</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value as any)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F2C59]/20 cursor-pointer"
                  >
                    <option value="alert">System Alert</option>
                    <option value="promotion">Promotions &amp; Offers</option>
                    <option value="system">Policy / Maintenance Notice</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Notification Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g., Extended Delivery Hours for Hyderabad Region"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F2C59]/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Message Content</label>
                <textarea
                  rows={4}
                  required
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Type clear instructions or updates here..."
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F2C59]/20 leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Optional Target Link / CTA</label>
                <input
                  type="text"
                  value={link}
                  onChange={e => setLink(e.target.value)}
                  placeholder="e.g., /orders or /vendor/dashboard or https://..."
                  className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-700 focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={sending || (!targetCustomers && !targetVendors && !targetRegionalAdmins)}
                className="w-full sm:w-auto px-6 py-3 bg-[#0F2C59] hover:bg-[#1E3E62] disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>{sending ? 'Dispatching Alert Broadcast...' : 'Dispatch Notification Broadcast Now'}</span>
              </button>
            </div>
          </form>

          {/* Right Col: Live Preview */}
          <div className="space-y-4">
            <div className="bg-white rounded-3xl border border-gray-200 p-5 shadow-sm space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 font-heading">
                Live Recipient Preview
              </h3>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {getPriorityBadge(priority)}
                    <span className="text-[10px] text-gray-400 font-mono">Just now</span>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                </div>

                <h4 className="font-bold text-xs text-gray-900 leading-snug">
                  {title || 'Sample Broadcast Headline'}
                </h4>

                <p className="text-xs text-gray-600 leading-relaxed">
                  {message || 'Your broadcast message preview will appear here in real-time as you type.'}
                </p>

                {link && (
                  <div className="pt-1">
                    <span className="text-[10px] font-bold text-blue-600 flex items-center gap-1">
                      <span>Action Link:</span>
                      <span className="underline">{link}</span>
                      <ExternalLink size={10} />
                    </span>
                  </div>
                )}
              </div>

              <div className="pt-2 text-xs text-gray-500 space-y-1">
                <span className="font-bold text-gray-700 block">Active Target Panels:</span>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {targetCustomers && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                      👤 Customers (Active)
                    </span>
                  )}
                  {targetVendors && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      🏪 Vendors (Active)
                    </span>
                  )}
                  {targetRegionalAdmins && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                      📍 Regional Admins (Active)
                    </span>
                  )}
                  {!targetCustomers && !targetVendors && !targetRegionalAdmins && (
                    <span className="text-xs text-red-500 font-medium italic">
                      No targets selected yet
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Broadcast History Table */
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-gray-900">Broadcast History Log</h3>
              <p className="text-xs text-gray-500">Record of alerts previously dispatched from Super Admin</p>
            </div>
            <button
              onClick={loadHistory}
              disabled={loadingHistory}
              className="p-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 hover:text-gray-900 flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingHistory ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-gray-50/70 text-gray-500 font-bold uppercase tracking-wider text-[10.5px]">
                <tr>
                  <th className="px-5 py-3.5">Sent Timestamp</th>
                  <th className="px-5 py-3.5">Target Audiences</th>
                  <th className="px-5 py-3.5">Message / Alert Details</th>
                  <th className="px-5 py-3.5">Delivery Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loadingHistory ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-gray-400">Loading history...</td>
                  </tr>
                ) : broadcasts.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-gray-400">No broadcasts sent yet.</td>
                  </tr>
                ) : (
                  broadcasts.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-4 whitespace-nowrap text-gray-600 font-mono">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span>{new Date(b.sentAt).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded text-[10px]">
                          {b.recipient}
                        </span>
                      </td>
                      <td className="px-5 py-4 max-w-md">
                        <p className="font-medium text-gray-800 line-clamp-2">{b.message}</p>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
                          <CheckCircle2 size={10} />
                          <span>Delivered</span>
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
