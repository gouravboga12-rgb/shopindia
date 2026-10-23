import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import {
  Send, X, Filter, AlertTriangle,
  DollarSign, Check, XCircle
} from 'lucide-react';

export const SupportPage: React.FC = () => {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replying, setReplying] = useState(false);
  const [filterTab, setFilterTab] = useState<'all' | 'sla_breached' | 'escalated' | 'refund_requests'>('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Internal Note state
  const [noteText, setNoteText] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  // Refund Modal state
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundAmount, setRefundAmount] = useState<number>(0);
  const [refundAtFault, setRefundAtFault] = useState<'vendor' | 'rider' | 'platform'>('vendor');
  const [refundAdminNotes, setRefundAdminNotes] = useState('');
  const [processingRefund, setProcessingRefund] = useState(false);

  const load = () => {
    setLoading(true);
    const query = filterTab === 'all' ? '' : `?filter=${filterTab}`;
    api.get<{ tickets: any[] }>(`/api/admin/support/tickets${query}`)
      .then(d => setTickets(d.tickets || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(load, [filterTab]);

  // Live polling for table
  useEffect(() => {
    const timer = setInterval(() => {
      const query = filterTab === 'all' ? '' : `?filter=${filterTab}`;
      api.get<{ tickets: any[] }>(`/api/admin/support/tickets${query}`)
        .then(d => {
          if (d.tickets) setTickets(d.tickets);
        })
        .catch(() => {});
    }, 4000);
    return () => clearInterval(timer);
  }, [filterTab]);

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

  const handleAddInternalNote = async () => {
    if (!noteText.trim() || !selectedTicket) return;
    setAddingNote(true);
    try {
      const ticketId = selectedTicket.id || selectedTicket._id;
      const res: any = await api.post(`/api/admin/support/tickets/${ticketId}/internal-note`, {
        note: noteText.trim()
      });
      if (res?.internalNotes) {
        setSelectedTicket((prev: any) => ({ ...prev, internalNotes: res.internalNotes }));
      }
      setNoteText('');
      load();
    } catch (err: any) {
      alert(err.message || 'Failed to add note');
    } finally {
      setAddingNote(false);
    }
  };

  const handleProcessRefund = async (status: 'approved' | 'rejected') => {
    if (!selectedTicket) return;
    const ticketId = selectedTicket.id || selectedTicket._id;
    setProcessingRefund(true);

    try {
      const res: any = await api.post(`/api/admin/support/tickets/${ticketId}/refund`, {
        refundStatus: status,
        refundAmount: status === 'approved' ? refundAmount : undefined,
        refundAtFault,
        adminNotes: refundAdminNotes
      });
      alert(res?.message || `Refund ${status} successfully!`);
      setShowRefundModal(false);
      setRefundAdminNotes('');
      if (res?.ticket) setSelectedTicket(res.ticket);
      load();
    } catch (err: any) {
      alert(err.message || 'Failed to process refund');
    } finally {
      setProcessingRefund(false);
    }
  };

  const filteredTickets = filterStatus === 'all' 
    ? tickets 
    : tickets.filter(t => t.status === filterStatus);

  const breachedCount = tickets.filter(t => t.isBreached).length;
  const refundReqCount = tickets.filter(t => t.refundRequested && t.refundStatus !== 'approved').length;

  return (
    <div className="space-y-6 text-left font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 font-heading">Support & Dispute Governance</h1>
          <p className="text-xs text-gray-500 font-medium mt-1">
            3-Tier Escalation Hub: Vendor ➔ Regional Operations ➔ Super Admin Executive Queue
          </p>
        </div>

        {/* Status Filter Pills */}
        <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-gray-200 shadow-xs">
          <Filter size={14} className="text-gray-400 ml-2" />
          {['all', 'open', 'in_progress', 'resolved'].map(st => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1 text-xs font-bold rounded-lg uppercase tracking-wider transition-all ${
                filterStatus === st 
                  ? 'bg-blue-600 text-white shadow-xs' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Queue Tabs Bar */}
      <div className="flex gap-2 border-b border-gray-200 overflow-x-auto pb-1">
        {[
          { id: 'all', label: 'All Tickets', count: tickets.length },
          { id: 'sla_breached', label: '🚨 SLA Breached', count: breachedCount, alert: breachedCount > 0 },
          { id: 'escalated', label: '⚡ Escalated (Tier 2/3)' },
          { id: 'refund_requests', label: '💳 Refund Requests', count: refundReqCount, alert: refundReqCount > 0 },
        ].map((tab: any) => {
          const active = filterTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setFilterTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                active
                  ? 'bg-[#0F2C59] text-white shadow-sm'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-100'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count != null && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  tab.alert
                    ? 'bg-red-500 text-white animate-pulse'
                    : active ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tickets Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-premium overflow-hidden">
        <table className="w-full text-xs text-left">
          <thead className="bg-gray-50/80 border-b border-gray-100 text-gray-500 uppercase tracking-wider font-semibold">
            <tr>
              <th className="px-5 py-3.5">Ticket # & Tier</th>
              <th className="px-5 py-3.5">Customer & Contact</th>
              <th className="px-5 py-3.5">Subject & Order</th>
              <th className="px-5 py-3.5">Priority & SLA</th>
              <th className="px-5 py-3.5">Refund Status</th>
              <th className="px-5 py-3.5">Status</th>
              <th className="px-5 py-3.5 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}><td colSpan={7} className="px-5 py-4"><div className="h-4 bg-gray-100 animate-pulse rounded" /></td></tr>
              ))
            ) : filteredTickets.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12 text-gray-400 font-medium">No tickets found for this queue.</td></tr>
            ) : (
              filteredTickets.map(t => {
                const id = t.id || t._id;
                const customerName = t.customer?.name || t.customerId?.name || 'Customer';
                const customerContact = t.customer?.phone || t.customer?.email || '';
                
                return (
                  <tr key={id} className="hover:bg-gray-50/60 transition-colors">
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
                    <td className="px-5 py-4">
                      <div className="font-bold text-gray-900">{customerName}</div>
                      {customerContact && <div className="text-[11px] text-gray-400">{customerContact}</div>}
                    </td>
                    <td className="px-5 py-4 max-w-xs">
                      <div className="font-semibold text-gray-800 line-clamp-1">{t.subject}</div>
                      {t.order?.orderNumber && (
                        <span className="font-mono text-[10px] text-indigo-600 bg-indigo-50 px-1 rounded font-bold">
                          {t.order.orderNumber}
                        </span>
                      )}
                    </td>
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
                    <td className="px-5 py-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        t.status === 'open' ? 'bg-amber-100 text-amber-800' :
                        t.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                        'bg-emerald-100 text-emerald-800'
                      }`}>
                        {t.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedTicket(t);
                          if (t.refundAmount || t.order?.total) {
                            setRefundAmount(t.refundAmount || t.order.total);
                          }
                        }}
                        className="px-3 py-1.5 bg-gray-50 hover:bg-blue-50 text-blue-600 border border-gray-200 hover:border-blue-200 rounded-lg font-bold text-xs transition-all"
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

      {/* Ticket Details & Action Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-slate-50/80">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-blue-600">
                    #{selectedTicket.ticketNumber}
                  </span>
                  <span className="text-[10px] font-bold bg-purple-50 text-purple-700 px-2 py-0.5 rounded">
                    Tier {selectedTicket.tier}
                  </span>
                  {selectedTicket.refundRequested && (
                    <span className="text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded">
                      Refund Claim: ₹{selectedTicket.refundAmount}
                    </span>
                  )}
                </div>
                <h3 className="font-bold text-base text-gray-900 font-heading">{selectedTicket.subject}</h3>
              </div>

              <div className="flex items-center gap-2">
                {selectedTicket.refundRequested && selectedTicket.refundStatus !== 'approved' && (
                  <button
                    onClick={() => setShowRefundModal(true)}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
                  >
                    <DollarSign className="w-4 h-4" />
                    <span>Review Refund</span>
                  </button>
                )}
                <button
                  onClick={() => setSelectedTicket(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Content Scrollable Area */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Customer & Order Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Customer Information</span>
                  <p className="font-bold text-gray-900 mt-1">{selectedTicket.customer?.name}</p>
                  <p className="text-gray-500">{selectedTicket.customer?.email} • {selectedTicket.customer?.phone}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Order Details</span>
                  {selectedTicket.order ? (
                    <div className="mt-1">
                      <p className="font-bold text-indigo-700 font-mono">#{selectedTicket.order.orderNumber}</p>
                      <p className="text-gray-600">Total: ₹{selectedTicket.order.total} • Status: {selectedTicket.order.status}</p>
                    </div>
                  ) : (
                    <p className="text-gray-400 mt-1 italic">No order linked</p>
                  )}
                </div>
              </div>

              {/* Message Thread */}
              <div className="space-y-3">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                  Communication History
                </span>
                <div className="space-y-3 max-h-[300px] overflow-y-auto p-4 bg-gray-50/50 rounded-2xl border border-gray-100">
                  {selectedTicket.messages?.map((m: any, idx: number) => {
                    const isStaff = m.senderRole === 'support' || m.senderRole === 'admin';
                    const isSystem = m.senderRole === 'system';
                    const isVendor = m.senderRole === 'vendor';

                    if (isSystem) {
                      return (
                        <div key={m.id || idx} className="text-center my-2">
                          <span className="inline-block px-3 py-1 rounded-full text-[10px] bg-amber-50 text-amber-900 border border-amber-200 font-medium">
                            {m.text}
                          </span>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={m.id || idx}
                        className={`flex flex-col ${isStaff ? 'items-end' : 'items-start'}`}
                      >
                        <div className="flex items-center gap-1.5 mb-1 text-[10px] text-gray-400">
                          <span className="font-bold capitalize">{isStaff ? 'Super Admin Support' : isVendor ? 'Store Merchant' : 'Customer'}</span>
                          <span>•</span>
                          <span>{new Date(m.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div
                          className={`max-w-md p-3.5 rounded-2xl text-xs leading-relaxed ${
                            isStaff
                              ? 'bg-blue-600 text-white rounded-tr-none shadow-sm'
                              : isVendor
                              ? 'bg-emerald-50 text-emerald-950 border border-emerald-200 rounded-tl-none'
                              : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none shadow-xs'
                          }`}
                        >
                          {m.text}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Internal Notes Section */}
              <div className="p-4 bg-amber-50/80 rounded-2xl border border-amber-200 text-xs space-y-2">
                <span className="font-bold text-amber-900 block flex items-center gap-1">
                  🔒 Internal Notes & Dispute Audit Trail:
                </span>
                {selectedTicket.internalNotes ? (
                  <pre className="whitespace-pre-wrap font-sans text-xs bg-white/70 p-3 rounded-xl border border-amber-200">
                    {selectedTicket.internalNotes}
                  </pre>
                ) : (
                  <p className="text-gray-400 italic">No internal notes added yet.</p>
                )}

                <div className="flex gap-2 pt-1">
                  <input
                    value={noteText}
                    onChange={e => setNoteText(e.target.value)}
                    placeholder="Add an internal note visible only to admins..."
                    className="flex-1 px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs"
                  />
                  <button
                    onClick={handleAddInternalNote}
                    disabled={addingNote || !noteText.trim()}
                    className="px-4 py-2 bg-amber-800 hover:bg-amber-900 text-white font-bold rounded-xl text-xs"
                  >
                    Add Note
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer: Reply & Status */}
            <div className="p-4 border-t border-gray-100 bg-white space-y-3">
              <form onSubmit={sendReply} className="flex gap-2">
                <input
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  placeholder="Send official response to customer..."
                  className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-blue-500"
                />
                <button
                  type="submit"
                  disabled={replying || !replyText.trim()}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </form>

              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-gray-500 font-medium">Quick Status Change:</span>
                <div className="flex gap-1.5">
                  {['open', 'in_progress', 'resolved'].map(st => (
                    <button
                      key={st}
                      onClick={() => updateStatus(selectedTicket.id || selectedTicket._id, st)}
                      className={`px-3 py-1 rounded-lg font-bold text-[11px] uppercase ${
                        selectedTicket.status === st
                          ? 'bg-gray-900 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {st.replace('_', ' ')}
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-base text-gray-900">Review & Execute Customer Refund</h3>
              <button onClick={() => setShowRefundModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-950 space-y-1">
              <span className="font-bold block">⚖️ Ledger & Financial Liability Notice:</span>
              <p className="leading-relaxed">
                Approving this refund will immediately update the order and <strong>post an immutable REFUND_DEBIT to the selected at-fault party's ledger</strong>, automatically deducting the amount from their pending wallet balance.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Approved Refund Amount (₹)</label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  max={selectedTicket.order?.total || 10000}
                  value={refundAmount}
                  onChange={e => setRefundAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 border rounded-xl font-numbers font-bold text-base text-emerald-700"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">At-Fault Party (Who bears this deduction?)</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'vendor', label: 'Merchant' },
                    { id: 'rider', label: 'Delivery Rider' },
                    { id: 'platform', label: 'Platform Loss' },
                  ].map(p => (
                    <button
                      type="button"
                      key={p.id}
                      onClick={() => setRefundAtFault(p.id as any)}
                      className={`p-2.5 rounded-xl border text-center font-bold text-xs transition-all ${
                        refundAtFault === p.id
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border-gray-200'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Resolution Note / Reason</label>
                <textarea
                  rows={2}
                  value={refundAdminNotes}
                  onChange={e => setRefundAdminNotes(e.target.value)}
                  placeholder="e.g. Package damaged during transit / merchant agreed to refund"
                  className="w-full px-3 py-2 border rounded-xl text-xs"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => handleProcessRefund('rejected')}
                  disabled={processingRefund}
                  className="flex-1 py-2.5 bg-red-100 hover:bg-red-200 text-red-700 font-bold rounded-xl text-xs flex items-center justify-center gap-1"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Reject Claim</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleProcessRefund('approved')}
                  disabled={processingRefund || refundAmount <= 0}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1 shadow-md"
                >
                  <Check className="w-4 h-4" />
                  <span>{processingRefund ? 'Posting...' : 'Approve & Debit'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
