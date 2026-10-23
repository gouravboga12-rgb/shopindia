import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import {
  Headphones, MessageSquare, Clock, AlertTriangle, Send,
  User, CheckCircle2, DollarSign
} from 'lucide-react';

interface TicketMessage {
  id: string;
  senderRole: string;
  text: string;
  sentAt: string;
}

interface Ticket {
  id: string;
  ticketNumber: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  tier: number;
  slaDeadline?: string;
  slaRemainingMinutes?: number;
  isBreached?: boolean;
  refundRequested?: boolean;
  refundAmount?: number;
  refundStatus?: string;
  internalNotes?: string;
  customer?: { name: string; email: string; phone?: string };
  order?: {
    orderNumber: string;
    total: number;
    status: string;
    items?: Array<{ name: string; quantity: number; price: number }>;
  };
  messages: TicketMessage[];
  createdAt: string;
}

export const VendorSupport: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  // Refund modal state
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundAmount, setRefundAmount] = useState<number>(0);
  const [refundReason, setRefundReason] = useState('');
  const [forwardingRefund, setForwardingRefund] = useState(false);

  // Internal note state
  const [noteText, setNoteText] = useState('');

  const loadTickets = async () => {
    try {
      const res: any = await api.get('/api/vendor/support/tickets');
      if (res?.tickets) {
        setTickets(res.tickets);
        if (selectedTicket) {
          const updated = res.tickets.find((t: Ticket) => t.id === selectedTicket.id);
          if (updated) setSelectedTicket(updated);
        }
      }
    } catch (err) {
      console.error('Error loading vendor tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
    const interval = setInterval(loadTickets, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedTicket) return;

    setSendingReply(true);
    try {
      const res: any = await api.post(`/api/vendor/support/tickets/${selectedTicket.id}/reply`, {
        text: replyText.trim()
      });
      if (res?.ticket) setSelectedTicket(res.ticket);
      setReplyText('');
      loadTickets();
    } catch (err: any) {
      alert(err.message || 'Failed to send reply');
    } finally {
      setSendingReply(false);
    }
  };

  const handleForwardRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || refundAmount <= 0) return;

    setForwardingRefund(true);
    try {
      const res: any = await api.post(`/api/vendor/support/tickets/${selectedTicket.id}/request-refund`, {
        refundAmount,
        reason: refundReason
      });
      alert(res?.message || 'Refund request forwarded to Platform Administration.');
      setShowRefundModal(false);
      setRefundReason('');
      if (res?.ticket) setSelectedTicket(res.ticket);
      loadTickets();
    } catch (err: any) {
      alert(err.message || 'Failed to forward refund');
    } finally {
      setForwardingRefund(false);
    }
  };

  const handleAddNote = async () => {
    if (!noteText.trim() || !selectedTicket) return;
    try {
      await api.post(`/api/vendor/support/tickets/${selectedTicket.id}/internal-note`, {
        note: noteText.trim()
      });
      setNoteText('');
      loadTickets();
    } catch (err: any) {
      alert(err.message || 'Failed to add note');
    }
  };

  const breachedCount = tickets.filter(t => t.isBreached).length;

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-premium flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 font-heading">Merchant Dispute & Support Queue</h1>
              <p className="text-xs text-gray-500">Tier 1 customer care for your storefront's orders & items</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {breachedCount > 0 && (
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold animate-pulse">
              <AlertTriangle className="w-4 h-4" />
              <span>{breachedCount} SLA Breached Tickets (Escalated)</span>
            </div>
          )}
          <span className="text-xs bg-gray-100 text-gray-600 px-3 py-1.5 rounded-xl font-bold">
            {tickets.length} Total Tickets
          </span>
        </div>
      </div>

      {/* Main Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[600px]">
        {/* Left: Ticket List (5 Cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-gray-100 shadow-premium overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-100 bg-slate-50/50 flex items-center justify-between">
            <span className="text-xs font-bold text-gray-700 uppercase tracking-wider font-heading">
              Support Requests
            </span>
            <span className="text-[11px] text-gray-400">Auto-refreshes every 5s</span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-gray-100 max-h-[650px]">
            {loading && tickets.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-xs">Loading support tickets...</div>
            ) : tickets.length === 0 ? (
              <div className="p-12 text-center text-gray-400 space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                <p className="text-xs font-bold text-gray-700">All Customer Inquiries Resolved!</p>
                <p className="text-[11px]">No active complaints or dispute tickets pending for your store.</p>
              </div>
            ) : (
              tickets.map(t => {
                const isSelected = selectedTicket?.id === t.id;
                return (
                  <div
                    key={t.id}
                    onClick={() => {
                      setSelectedTicket(t);
                      if (t.order?.total) setRefundAmount(t.order.total);
                    }}
                    className={`p-4 cursor-pointer transition-all hover:bg-slate-50 ${
                      isSelected ? 'bg-emerald-50/60 border-l-4 border-emerald-500' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <span className="font-mono text-[10px] font-bold text-gray-400 block">
                          {t.ticketNumber}
                        </span>
                        <h4 className="text-xs font-bold text-gray-900 line-clamp-1">{t.subject}</h4>
                        <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                          <User className="w-3 h-3 text-gray-400" />
                          <span>{t.customer?.name || 'Customer'}</span>
                          {t.order?.orderNumber && (
                            <span className="font-mono font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded text-[10px]">
                              {t.order.orderNumber}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Status / SLA Badges */}
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          t.status === 'open' ? 'bg-amber-100 text-amber-800' :
                          t.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                          'bg-emerald-100 text-emerald-800'
                        }`}>
                          {t.status.replace('_', ' ')}
                        </span>

                        {t.isBreached ? (
                          <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-red-100 text-red-700 border border-red-200 flex items-center gap-1">
                            <AlertTriangle className="w-2.5 h-2.5" /> SLA Breached
                          </span>
                        ) : t.slaRemainingMinutes != null && t.status !== 'resolved' ? (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-gray-100 text-gray-600 flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5 text-gray-400" /> {t.slaRemainingMinutes}m left
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Conversation & Resolution Details (7 Cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-gray-100 shadow-premium flex flex-col overflow-hidden">
          {selectedTicket ? (
            <>
              {/* Top Details Bar */}
              <div className="p-4 border-b border-gray-100 bg-slate-50/70 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono text-gray-400 font-bold block">
                      {selectedTicket.ticketNumber} · Tier {selectedTicket.tier} ({selectedTicket.tier === 1 ? 'Store Response' : selectedTicket.tier === 2 ? 'Regional Operations' : 'Super Admin'})
                    </span>
                    <h3 className="text-sm font-bold text-gray-900">{selectedTicket.subject}</h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowRefundModal(true)}
                      className="px-3 py-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                    >
                      <DollarSign className="w-3.5 h-3.5" />
                      <span>Forward Refund</span>
                    </button>
                  </div>
                </div>

                {/* Customer & Order details badge */}
                <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-gray-600">
                  <span className="bg-white border px-2 py-0.5 rounded font-medium">
                    Customer: {selectedTicket.customer?.name} ({selectedTicket.customer?.phone || selectedTicket.customer?.email})
                  </span>
                  {selectedTicket.order && (
                    <span className="bg-indigo-50 border border-indigo-200 text-indigo-700 px-2 py-0.5 rounded font-bold font-numbers">
                      Order: {selectedTicket.order.orderNumber} (₹{selectedTicket.order.total})
                    </span>
                  )}
                  {selectedTicket.refundRequested && (
                    <span className="bg-amber-50 border border-amber-200 text-amber-800 px-2 py-0.5 rounded font-bold">
                      Refund Status: {selectedTicket.refundStatus?.toUpperCase()} (₹{selectedTicket.refundAmount})
                    </span>
                  )}
                </div>
              </div>

              {/* Message Thread */}
              <div className="flex-1 p-5 overflow-y-auto space-y-4 max-h-[380px] bg-slate-50/20">
                {selectedTicket.messages.map((m, idx) => {
                  const isVendor = m.senderRole === 'vendor';
                  const isSystem = m.senderRole === 'system';
                  const isCustomer = m.senderRole === 'customer';

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
                      className={`flex flex-col ${isVendor ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center gap-1.5 mb-1 text-[10px] text-gray-400">
                        <span className="font-bold capitalize">{isCustomer ? selectedTicket.customer?.name || 'Customer' : isVendor ? 'You (Merchant)' : m.senderRole}</span>
                        <span>•</span>
                        <span>{new Date(m.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div
                        className={`max-w-md p-3.5 rounded-2xl text-xs leading-relaxed ${
                          isVendor
                            ? 'bg-emerald-600 text-white rounded-tr-none shadow-sm'
                            : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none shadow-xs'
                        }`}
                      >
                        {m.text}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Internal Notes Preview & Add Note */}
              <div className="p-3 bg-amber-50/70 border-t border-b border-amber-200/60 text-[11px] text-amber-900 font-mono space-y-1.5">
                <span className="font-bold block mb-0.5">📝 Internal Dispute Notes:</span>
                {selectedTicket.internalNotes ? (
                  <pre className="whitespace-pre-wrap font-sans text-[11px]">{selectedTicket.internalNotes}</pre>
                ) : (
                  <span className="text-gray-400 italic block font-sans">No internal notes added.</span>
                )}
                <div className="flex gap-2 pt-1 font-sans">
                  <input
                    value={noteText}
                    onChange={e => setNoteText(e.target.value)}
                    placeholder="Add private merchant note..."
                    className="flex-1 px-3 py-1 bg-white border border-amber-300 rounded-lg text-xs"
                  />
                  <button
                    onClick={handleAddNote}
                    disabled={!noteText.trim()}
                    className="px-3 py-1 bg-amber-700 hover:bg-amber-800 disabled:opacity-50 text-white rounded-lg text-xs font-bold"
                  >
                    Add Note
                  </button>
                </div>
              </div>

              {/* Reply Input Bar */}
              <form onSubmit={handleSendReply} className="p-3 border-t border-gray-100 bg-white flex gap-2">
                <input
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  placeholder="Type your message to customer..."
                  className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="submit"
                  disabled={sendingReply || !replyText.trim()}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-gray-400">
              <MessageSquare className="w-12 h-12 text-gray-200 mb-3" />
              <p className="text-sm font-bold text-gray-700">Select a Ticket to View Conversation</p>
              <p className="text-xs max-w-sm mt-1">
                Choose an inquiry from the left panel to reply directly to the customer or forward a refund request.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Forward Refund Modal */}
      {showRefundModal && selectedTicket && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-sm text-gray-900">Forward Refund Request to Admin</h3>
              <button onClick={() => setShowRefundModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 leading-relaxed">
              ⚠️ <strong>Platform Governance:</strong> Merchants cannot directly debit money. Forwarding this request submits it to Platform Administration for approval.
            </div>

            <form onSubmit={handleForwardRefund} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Refund Amount (₹)</label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  max={selectedTicket.order?.total || 10000}
                  value={refundAmount}
                  onChange={e => setRefundAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 border rounded-xl font-numbers font-bold text-sm text-emerald-700"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Reason for Refund</label>
                <textarea
                  rows={3}
                  value={refundReason}
                  onChange={e => setRefundReason(e.target.value)}
                  placeholder="e.g. Item defective / customer received incorrect package"
                  className="w-full px-3 py-2 border rounded-xl"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRefundModal(false)}
                  className="flex-1 py-2.5 border rounded-xl font-bold text-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={forwardingRefund}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-md"
                >
                  {forwardingRefund ? 'Submitting...' : 'Submit to Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
