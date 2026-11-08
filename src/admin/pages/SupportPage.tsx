import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import {
  Send, X, AlertTriangle,
  DollarSign, Store, User, Clock,
  ShieldCheck, RefreshCw, MessageSquare,
  Edit2, Trash2, Calendar, Check, Search,
  Package, MapPin, CheckCircle2
} from 'lucide-react';

type FilterTabType = 'all' | 'pending' | 'active' | 'sla_breached' | 'escalated' | 'refund_requests' | 'closed';

export const SupportPage: React.FC = () => {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replying, setReplying] = useState(false);
  const [filterTab, setFilterTab] = useState<FilterTabType>('all');
  const [q, setQ] = useState('');

  // Live Counts for Tabs
  const [counts, setCounts] = useState<{
    all: number;
    pending: number;
    active: number;
    closed: number;
    refund: number;
    breached: number;
    escalated: number;
  }>({
    all: 0,
    pending: 0,
    active: 0,
    closed: 0,
    refund: 0,
    breached: 0,
    escalated: 0,
  });

  // Day-wise / Date Filter State
  const [dateRange, setDateRange] = useState<'all' | 'today' | 'yesterday' | 'last7days' | 'last30days' | 'custom'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Message Edit State
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editMsgText, setEditMsgText] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Refund Modal state
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundAmount, setRefundAmount] = useState<number>(0);
  const refundAtFault: 'vendor' | 'rider' | 'platform' = 'vendor';
  const [refundAdminNotes, setRefundAdminNotes] = useState('');
  const [processingRefund, setProcessingRefund] = useState(false);

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterTab !== 'all') params.set('filter', filterTab);
    if (dateRange !== 'all') params.set('dateRange', dateRange);
    if (dateRange === 'custom') {
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
    }
    const query = params.toString() ? `?${params.toString()}` : '';
    api.get<{ tickets: any[]; total: number; counts: any }>(`/api/admin/support/tickets${query}`)
      .then(d => {
        setTickets(d.tickets || []);
        if (d.counts) setCounts(d.counts);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(load, [filterTab, dateRange, startDate, endDate]);

  // Live polling for table
  useEffect(() => {
    const timer = setInterval(() => {
      const params = new URLSearchParams();
      if (filterTab !== 'all') params.set('filter', filterTab);
      if (dateRange !== 'all') params.set('dateRange', dateRange);
      if (dateRange === 'custom') {
        if (startDate) params.set('startDate', startDate);
        if (endDate) params.set('endDate', endDate);
      }
      const query = params.toString() ? `?${params.toString()}` : '';
      api.get<{ tickets: any[]; counts: any }>(`/api/admin/support/tickets${query}`)
        .then(d => {
          if (d.tickets) setTickets(d.tickets);
          if (d.counts) setCounts(d.counts);
        })
        .catch(() => {});
    }, 4000);
    return () => clearInterval(timer);
  }, [filterTab, dateRange, startDate, endDate]);

  // Live polling for open modal thread
  useEffect(() => {
    if (!selectedTicket) return;
    const ticketId = selectedTicket.id || selectedTicket._id;
    const timer = setInterval(() => {
      api.get<any>(`/api/admin/support/tickets/${ticketId}`)
        .then(updated => {
          if (updated) setSelectedTicket(updated);
        })
        .catch(() => {});
    }, 2500);
    return () => clearInterval(timer);
  }, [selectedTicket?.id, selectedTicket?._id]);

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      await api.patch(`/api/admin/support/tickets/${id}/status`, { status: newStatus });
      if (selectedTicket && (selectedTicket.id === id || selectedTicket._id === id)) {
        setSelectedTicket((prev: any) => ({ ...prev, status: newStatus }));
      }
      load();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const sendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedTicket) return;
    const ticketId = selectedTicket.id || selectedTicket._id;
    const text = replyText.trim();
    setReplyText('');

    setReplying(true);
    try {
      await api.post(`/api/admin/support/tickets/${ticketId}/reply`, { text });
      const updated = await api.get<any>(`/api/admin/support/tickets/${ticketId}`);
      if (updated) setSelectedTicket(updated);
      load();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setReplying(false);
    }
  };

  const handleStartEdit = (msg: any) => {
    setEditingMsgId(msg.id);
    setEditMsgText(msg.text);
  };

  const handleSaveEdit = async (msgId: string) => {
    if (!editMsgText.trim()) return;
    setSavingEdit(true);
    try {
      await api.patch(`/api/admin/support/messages/${msgId}`, { text: editMsgText.trim() });
      if (selectedTicket) {
        setSelectedTicket((prev: any) => ({
          ...prev,
          messages: prev.messages.map((m: any) => m.id === msgId ? { ...m, text: editMsgText.trim() } : m)
        }));
      }
      setEditingMsgId(null);
      setEditMsgText('');
    } catch (err: any) {
      alert(err.message || 'Failed to edit message');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteMessage = async (msgId: string) => {
    if (!confirm('Are you sure you want to delete this message from the support thread?')) return;
    try {
      await api.delete(`/api/admin/support/messages/${msgId}`);
      if (selectedTicket) {
        setSelectedTicket((prev: any) => ({
          ...prev,
          messages: prev.messages.filter((m: any) => m.id !== msgId)
        }));
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete message');
    }
  };

  const handleApproveRefund = async () => {
    if (!selectedTicket || refundAmount <= 0) return;
    const ticketId = selectedTicket.id || selectedTicket._id;
    setProcessingRefund(true);
    try {
      await api.post(`/api/admin/support/tickets/${ticketId}/approve-refund`, {
        refundAmount,
        atFault: refundAtFault,
        adminNotes: refundAdminNotes.trim() || undefined
      });
      setShowRefundModal(false);
      setRefundAdminNotes('');
      const updated = await api.get<any>(`/api/admin/support/tickets/${ticketId}`);
      if (updated) setSelectedTicket(updated);
      load();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setProcessingRefund(false);
    }
  };

  const handleRejectRefund = async () => {
    if (!selectedTicket) return;
    const ticketId = selectedTicket.id || selectedTicket._id;
    const reason = prompt('Please provide reason for rejecting refund:');
    if (!reason) return;
    try {
      await api.post(`/api/admin/support/tickets/${ticketId}/reject-refund`, { reason });
      setShowRefundModal(false);
      const updated = await api.get<any>(`/api/admin/support/tickets/${ticketId}`);
      if (updated) setSelectedTicket(updated);
      load();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return dateStr;
    }
  };

  const filteredTickets = tickets.filter(t => {
    if (!q) return true;
    const search = q.toLowerCase();
    const ticketNo = (t.ticketNumber || '').toLowerCase();
    const subject = (t.subject || '').toLowerCase();
    const customerName = (t.customer?.name || '').toLowerCase();
    const vendorName = (t.vendor?.businessName || '').toLowerCase();
    const phone = (t.vendor?.phone || t.customer?.phone || '').toLowerCase();
    return ticketNo.includes(search) || subject.includes(search) || customerName.includes(search) || vendorName.includes(search) || phone.includes(search);
  });

  const TABS: Array<{ id: FilterTabType; label: string; count: number; alert?: boolean }> = [
    { id: 'all', label: 'All Tickets', count: counts.all },
    { id: 'pending', label: '🟡 Pending Review', count: counts.pending, alert: counts.pending > 0 },
    { id: 'active', label: '🟢 Active / In Progress', count: counts.active },
    { id: 'sla_breached', label: '🚨 SLA Breached', count: counts.breached, alert: counts.breached > 0 },
    { id: 'escalated', label: '⚡ Escalated', count: counts.escalated },
    { id: 'refund_requests', label: '💳 Refund Requests', count: counts.refund, alert: counts.refund > 0 },
    { id: 'closed', label: '🔒 Closed & Resolved', count: counts.closed },
  ];

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-heading flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-[#0F2C59]" />
            <span>Support &amp; Partner Help Desk Queue</span>
          </h1>
          <p className="text-sm text-gray-500">
            Unified support queue with pending, active, and closed lifecycle filtering, live chat, and dispute resolution
          </p>
        </div>

        <button
          onClick={load}
          className="self-start sm:self-auto flex items-center gap-1.5 px-3.5 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors shadow-2xs cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* Unified Primary Status & Queue Tabs */}
      <div className="flex gap-2 border-b border-gray-200 overflow-x-auto pb-1.5">
        {TABS.map(tab => {
          const active = filterTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setFilterTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                active
                  ? 'bg-[#0F2C59] text-white shadow-sm'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200/70'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-numbers font-bold ${
                tab.alert
                  ? 'bg-red-500 text-white animate-pulse'
                  : active ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-700'
              }`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Compact Search & Day-wise Filter Toolbar */}
      <div className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-sm flex flex-wrap items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search by ticket #, requester, phone, or subject..."
            className="w-full pl-9 pr-4 py-2 bg-gray-50/70 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#0F2C59]/20"
          />
        </div>

        {/* Day-Wise Filter Pill Buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-bold text-gray-500 flex items-center gap-1 mr-1">
            <Calendar className="w-3.5 h-3.5 text-indigo-600" />
            <span>Date:</span>
          </span>

          {[
            { id: 'all', label: 'All' },
            { id: 'today', label: 'Today' },
            { id: 'yesterday', label: 'Yesterday' },
            { id: 'last7days', label: '7 Days' },
            { id: 'last30days', label: '30 Days' },
            { id: 'custom', label: 'Custom' },
          ].map((d: any) => (
            <button
              key={d.id}
              type="button"
              onClick={() => setDateRange(d.id as any)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                dateRange === d.id
                  ? 'bg-indigo-600 text-white shadow-xs font-bold'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {d.label}
            </button>
          ))}

          {/* Custom Date Pickers */}
          {dateRange === 'custom' && (
            <div className="flex items-center gap-1 ml-2">
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="px-2 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-800"
              />
              <span className="text-xs text-gray-400">-</span>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="px-2 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-800"
              />
            </div>
          )}
        </div>
      </div>

      {/* Tickets Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-premium overflow-hidden">
        <table className="w-full text-xs text-left">
          <thead className="bg-gray-50/80 border-b border-gray-100 text-gray-500 uppercase tracking-wider font-semibold">
            <tr>
              <th className="px-5 py-3.5">Ticket # &amp; Tier</th>
              <th className="px-5 py-3.5">Created Date &amp; Time</th>
              <th className="px-5 py-3.5">Requester / Merchant Info</th>
              <th className="px-5 py-3.5">Subject &amp; Order</th>
              <th className="px-5 py-3.5">Priority &amp; SLA</th>
              <th className="px-5 py-3.5">Refund Status</th>
              <th className="px-5 py-3.5">Status</th>
              <th className="px-5 py-3.5 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}><td colSpan={8} className="px-5 py-4"><div className="h-4 bg-gray-100 animate-pulse rounded" /></td></tr>
              ))
            ) : filteredTickets.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-12 text-gray-400 font-medium">
                  No tickets found in this filtered view.
                </td>
              </tr>
            ) : (
              filteredTickets.map(t => {
                const id = t.id || t._id;
                const isVendorTicket = Boolean(t.vendor || t.vendorId);
                const customerName = t.customer?.name || t.customerId?.name || 'User';
                const customerContact = t.customer?.phone || t.customer?.email || '';

                return (
                  <tr key={id} className="hover:bg-gray-50/60 transition-colors">
                    {/* Ticket # & Tier */}
                    <td className="px-5 py-4">
                      <span className="font-mono font-bold text-blue-600 block">#{t.ticketNumber}</span>
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold mt-1 ${
                        t.tier === 1 ? 'bg-gray-100 text-gray-700' :
                        t.tier === 2 ? 'bg-blue-100 text-blue-800' :
                        'bg-purple-100 text-purple-800'
                      }`}>
                        Tier {t.tier} ({t.tier === 1 ? 'Vendor' : t.tier === 2 ? 'Regional' : 'Executive'})
                      </span>
                    </td>

                    {/* Created Date & Time */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="font-semibold text-gray-800 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span>{formatDateTime(t.createdAt)}</span>
                      </div>
                    </td>

                    {/* Requester / Merchant Info */}
                    <td className="px-5 py-4">
                      {isVendorTicket ? (
                        <div>
                          <div className="flex items-center gap-1.5">
                            <Store className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span className="font-bold text-gray-900">{t.vendor?.businessName || 'Store Merchant'}</span>
                          </div>
                          <div className="text-[11px] text-gray-500 mt-0.5">
                            {t.vendor?.city && <span className="font-medium text-gray-700">{t.vendor.city} • </span>}
                            <span>{t.vendor?.phone || t.vendor?.user?.email || customerContact}</span>
                          </div>
                          <span className="inline-block mt-1 px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-emerald-50 text-emerald-800 border border-emerald-200">
                            Merchant Partner
                          </span>
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <span className="font-bold text-gray-900">{customerName}</span>
                          </div>
                          {customerContact && <div className="text-[11px] text-gray-400 mt-0.5">{customerContact}</div>}
                          <span className="inline-block mt-1 px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-blue-50 text-blue-800 border border-blue-200">
                            Customer
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Subject & Order */}
                    <td className="px-5 py-4 max-w-xs">
                      <div className="font-semibold text-gray-800 line-clamp-1 flex items-center gap-1.5 flex-wrap">
                        {t.subject?.includes('[LIVE CHAT') && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            Live Chat
                          </span>
                        )}
                        <span>{t.subject}</span>
                      </div>
                      {t.order?.orderNumber && (
                        <span className="font-mono text-[10px] text-indigo-600 bg-indigo-50 px-1 rounded font-bold">
                          {t.order.orderNumber}
                        </span>
                      )}
                    </td>

                    {/* Priority & SLA */}
                    <td className="px-5 py-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        t.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                        t.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                        t.priority === 'medium' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {t.priority}
                      </span>

                      {t.isBreached ? (
                        <span className="block text-[10px] font-bold text-red-600 mt-1 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> SLA Breached
                        </span>
                      ) : t.slaRemainingMinutes != null && t.status !== 'resolved' ? (
                        <span className="block text-[10px] text-gray-400 mt-1">
                          {t.slaRemainingMinutes}m SLA left
                        </span>
                      ) : null}
                    </td>

                    {/* Refund Status */}
                    <td className="px-5 py-4">
                      {t.refundRequested ? (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          t.refundStatus === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                          t.refundStatus === 'rejected' ? 'bg-red-100 text-red-800' :
                          'bg-amber-100 text-amber-800 animate-pulse'
                        }`}>
                          {t.refundStatus || 'Requested'} {t.refundAmount ? `(₹${t.refundAmount})` : ''}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                        t.status === 'open' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                        t.status === 'in_progress' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                        t.status === 'resolved' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                        'bg-gray-100 text-gray-700 border border-gray-200'
                      }`}>
                        {t.status === 'open' ? 'Pending' : t.status.replace('_', ' ')}
                      </span>
                    </td>

                    {/* Action */}
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedTicket(t);
                          if (t.refundAmount || t.order?.total) {
                            setRefundAmount(t.refundAmount || t.order.total);
                          }
                        }}
                        className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg font-bold text-xs transition-all cursor-pointer"
                      >
                        Open Thread
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Ticket Details & Action Modal (Clean, Professional Chat Interface with Edit & Delete) */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-slate-50/80">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                    #{selectedTicket.ticketNumber}
                  </span>
                  <span className="text-[10px] font-bold bg-purple-50 text-purple-700 px-2 py-0.5 rounded">
                    Tier {selectedTicket.tier}
                  </span>
                  <span className="text-[11px] text-gray-400 font-medium">
                    {formatDateTime(selectedTicket.createdAt)}
                  </span>
                  {selectedTicket.order?.status === 'refunded' || selectedTicket.order?.paymentStatus === 'refunded' || selectedTicket.refundStatus === 'approved' ? (
                    <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      Refund Completed: ₹{selectedTicket.order?.refundAmount || selectedTicket.refundAmount || selectedTicket.order?.total || 0}
                    </span>
                  ) : selectedTicket.refundRequested ? (
                    <span className="text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded">
                      Refund Claim: ₹{selectedTicket.refundAmount || selectedTicket.order?.total || 0}
                    </span>
                  ) : null}
                </div>

                <h3 className="font-bold text-base text-gray-900 leading-tight">{selectedTicket.subject}</h3>

                <div className="text-xs text-gray-600 flex flex-wrap items-center gap-2 pt-0.5">
                  {selectedTicket.vendor ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200">
                      <Store className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Store Merchant: {selectedTicket.vendor.businessName} ({selectedTicket.vendor.city || 'India'}) • {selectedTicket.vendor.phone || selectedTicket.vendor.user?.email || ''}</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-blue-50 text-blue-800 font-semibold border border-blue-200">
                      <User className="w-3.5 h-3.5 text-blue-600" />
                      <span>Customer: {selectedTicket.customer?.name} • {selectedTicket.customer?.phone || selectedTicket.customer?.email}</span>
                    </span>
                  )}
                  {selectedTicket.region && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-amber-50 text-amber-800 font-semibold border border-amber-200">
                      <MapPin className="w-3.5 h-3.5 text-amber-600" />
                      <span>Territory Hub: {selectedTicket.region.regionName}</span>
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {selectedTicket.order?.status === 'refunded' || selectedTicket.order?.paymentStatus === 'refunded' || selectedTicket.refundStatus === 'approved' ? (
                  <span className="px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Refund Processed</span>
                  </span>
                ) : selectedTicket.refundRequested && selectedTicket.refundStatus !== 'approved' ? (
                  <button
                    onClick={() => {
                      setRefundAmount(selectedTicket.refundAmount || selectedTicket.order?.total || 0);
                      setShowRefundModal(true);
                    }}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <DollarSign className="w-4 h-4" />
                    <span>Approve Refund</span>
                  </button>
                ) : null}
                <button
                  onClick={() => setSelectedTicket(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Rich Order & Product Details Context Card */}
            {selectedTicket.order && (
              <div className="mx-6 mt-3 p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-200/60 text-xs">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-blue-600" />
                    <span className="font-mono font-bold text-slate-800">Order #{selectedTicket.order.orderNumber}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-blue-100 text-blue-800">
                      {selectedTicket.order.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-slate-500 font-medium">Payment: <strong className="text-slate-800 uppercase font-numbers">{selectedTicket.order.paymentMethod || 'Prepaid'}</strong> ({selectedTicket.order.paymentStatus || 'Paid'})</span>
                    <span className="font-black text-slate-900 font-numbers text-sm">₹{selectedTicket.order.total?.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                {/* Products in this Order */}
                {selectedTicket.order.items && selectedTicket.order.items.length > 0 && (
                  <div className="pt-2.5 space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Products in this Order ({selectedTicket.order.items.length})</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {selectedTicket.order.items.map((it: any, i: number) => {
                        const img = it.product?.images?.[0]?.url;
                        return (
                          <div key={it.id || i} className="flex items-center gap-2.5 p-2 bg-white rounded-xl border border-slate-200/60 shadow-2xs">
                            <div className="w-10 h-10 rounded-lg bg-slate-100 border overflow-hidden flex-shrink-0 flex items-center justify-center">
                              {img ? (
                                <img src={img} alt={it.name} className="w-full h-full object-cover" />
                              ) : (
                                <Package className="w-4 h-4 text-slate-400" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-slate-800 truncate">{it.name || it.product?.name}</p>
                              <p className="text-[11px] text-slate-500 font-numbers">Qty: {it.quantity} × ₹{it.price?.toLocaleString('en-IN')}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Customer, Merchant & Regional Hub Details */}
                <div className="pt-2.5 mt-2.5 border-t border-slate-200/60 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-400 font-medium block">👤 Customer Details</span>
                    <span className="font-bold text-slate-700">{selectedTicket.customer?.name} ({selectedTicket.customer?.phone || selectedTicket.customer?.email || 'N/A'})</span>
                    {selectedTicket.order.deliveryLine1 && (
                      <span className="text-slate-500 block truncate">{selectedTicket.order.deliveryLine1}, {selectedTicket.order.deliveryCity || ''} {selectedTicket.order.deliveryPincode || ''}</span>
                    )}
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">🏬 Merchant Store</span>
                    <span className="font-bold text-slate-700">{selectedTicket.order.vendor?.businessName || selectedTicket.vendor?.businessName || 'N/A'}</span>
                    <span className="text-slate-500 block">{selectedTicket.order.vendor?.phone || selectedTicket.vendor?.phone || ''}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">📍 Territory Regional Hub</span>
                    <span className="font-bold text-amber-700">{selectedTicket.region?.regionName || 'Medchal-Malkajgiri Hub'}</span>
                    {selectedTicket.region?.user?.name && (
                      <span className="text-slate-500 block">Manager: {selectedTicket.region.user.name}</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Modal Content: Scrollable Message Thread with Message Edit & Delete */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/40 min-h-[350px]">
              {selectedTicket.messages && selectedTicket.messages.length > 0 ? (
                selectedTicket.messages.map((m: any, idx: number) => {
                  const isStaff = m.senderRole === 'support' || m.senderRole === 'admin';
                  const isRegional = m.senderRole === 'regional_admin';
                  const isSystem = m.senderRole === 'system';
                  const isVendor = m.senderRole === 'vendor';
                  const isEditingThis = editingMsgId === m.id;

                  if (isSystem) {
                    return (
                      <div key={m.id || idx} className="text-center my-2">
                        <span className="inline-block px-3 py-1 rounded-full text-[10px] bg-gray-100 text-gray-700 border border-gray-200 font-medium">
                          {m.text}
                        </span>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={m.id || idx}
                      className={`flex flex-col group ${isStaff ? 'items-end' : 'items-start'}`}
                    >
                      {/* Message Meta Info Header */}
                      <div className="flex items-center gap-2 mb-1 text-[10px]">
                        {isStaff ? (
                          <>
                            <ShieldCheck className="w-3 h-3 text-indigo-600" />
                            <span className="font-bold text-indigo-700">Super Admin Official Support</span>
                          </>
                        ) : isRegional ? (
                          <>
                            <MapPin className="w-3 h-3 text-amber-600" />
                            <span className="font-bold text-amber-700">Regional Manager ({selectedTicket.region?.regionName || 'Territory Hub'})</span>
                          </>
                        ) : isVendor ? (
                          <>
                            <Store className="w-3 h-3 text-emerald-600" />
                            <span className="font-bold text-emerald-700">Store Merchant ({selectedTicket.vendor?.businessName || 'Merchant'})</span>
                          </>
                        ) : (
                          <>
                            <User className="w-3 h-3 text-blue-600" />
                            <span className="font-bold text-blue-700">Customer ({selectedTicket.customer?.name || 'Customer'})</span>
                          </>
                        )}
                        <span>•</span>
                        <span>{new Date(m.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>

                        {/* Super Admin Edit / Delete Actions on Hover */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 ml-2">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(m)}
                            className="p-1 rounded hover:bg-gray-200 text-gray-500 hover:text-indigo-600 transition-colors cursor-pointer"
                            title="Edit Message"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteMessage(m.id)}
                            className="p-1 rounded hover:bg-red-50 text-gray-500 hover:text-red-600 transition-colors cursor-pointer"
                            title="Delete Message"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Message Bubble or Inline Edit Form */}
                      {isEditingThis ? (
                        <div className="w-full max-w-md p-3 bg-white border border-indigo-300 rounded-2xl shadow-sm space-y-2">
                          <textarea
                            rows={3}
                            value={editMsgText}
                            onChange={e => setEditMsgText(e.target.value)}
                            className="w-full p-2 text-xs border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-gray-900 resize-none"
                          />
                          <div className="flex justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setEditingMsgId(null)}
                              className="px-2.5 py-1 text-xs text-gray-500 hover:bg-gray-100 rounded-lg cursor-pointer"
                              disabled={savingEdit}
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveEdit(m.id)}
                              disabled={savingEdit || !editMsgText.trim()}
                              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg flex items-center gap-1 shadow-xs cursor-pointer"
                            >
                              <Check className="w-3 h-3" />
                              <span>{savingEdit ? 'Saving...' : 'Save Edit'}</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          className={`max-w-md p-3.5 rounded-2xl text-xs leading-relaxed ${
                            isStaff
                              ? 'bg-[#0F2C59] text-white rounded-tr-none shadow-sm'
                              : isVendor
                              ? 'bg-emerald-50 text-emerald-950 border border-emerald-200 rounded-tl-none shadow-xs'
                              : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none shadow-xs'
                          }`}
                        >
                          {m.text}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-12 text-gray-400 text-xs">
                  No conversation messages recorded.
                </div>
              )}
            </div>

            {/* Modal Footer: Reply & Quick Status Bar */}
            <div className="p-4 border-t border-gray-100 bg-white space-y-3">
              <form onSubmit={sendReply} className="flex gap-2">
                <input
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  placeholder={`Send official reply to ${selectedTicket.vendor ? 'Store Merchant' : 'Customer'}...`}
                  className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
                <button
                  type="submit"
                  disabled={replying || !replyText.trim()}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{replying ? 'Sending...' : 'Send'}</span>
                </button>
              </form>

              <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-100">
                <span className="text-gray-500 font-medium">Ticket Status:</span>
                <div className="flex gap-1.5">
                  {[
                    { id: 'open', label: 'Open' },
                    { id: 'in_progress', label: 'In Progress' },
                    { id: 'resolved', label: 'Resolved' },
                    { id: 'closed', label: 'Closed' }
                  ].map(st => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => updateStatus(selectedTicket.id || selectedTicket._id, st.id)}
                      className={`px-3 py-1 rounded-lg font-bold text-[11px] uppercase transition-all cursor-pointer ${
                        selectedTicket.status === st.id
                          ? 'bg-[#0F2C59] text-white shadow-xs'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Refund Approval Modal */}
      {showRefundModal && selectedTicket && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-bold text-base text-gray-900">Approve Customer Refund</h3>
                <p className="text-xs text-gray-500">Order #{selectedTicket.order?.orderNumber || selectedTicket.ticketNumber}</p>
              </div>
              <button onClick={() => setShowRefundModal(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">✕</button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="p-3 bg-blue-50 border border-blue-200/80 rounded-xl text-blue-900 space-y-1">
                <p className="font-bold">Refund Execution Notice</p>
                <p className="text-slate-600 leading-relaxed text-[11px]">
                  Approving will process the customer refund, mark the ticket and order as refunded, and notify the customer.
                </p>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Refund Amount (₹)</label>
                <input
                  type="number"
                  value={refundAmount}
                  onChange={e => setRefundAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3.5 py-2.5 border rounded-xl font-bold font-numbers text-gray-900 text-sm focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Resolution Note for Customer (Optional)</label>
                <textarea
                  rows={2}
                  value={refundAdminNotes}
                  onChange={e => setRefundAdminNotes(e.target.value)}
                  placeholder="e.g. Approved customer dispute for damaged goods..."
                  className="w-full px-3 py-2 border rounded-xl bg-gray-50 focus:bg-white text-gray-800 text-xs"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={handleRejectRefund}
                className="flex-1 py-2.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl font-bold text-xs cursor-pointer"
              >
                Reject Claim
              </button>
              <button
                type="button"
                onClick={handleApproveRefund}
                disabled={processingRefund || refundAmount <= 0}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs cursor-pointer disabled:opacity-50"
              >
                {processingRefund ? 'Executing...' : `Approve & Refund ₹${refundAmount.toLocaleString('en-IN')}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
