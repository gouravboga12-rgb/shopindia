import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import {
  Headphones, MessageSquare, Clock, AlertTriangle, Send,
  User, CheckCircle2, Phone, Bike, ArrowUpRight,
  RefreshCw
} from 'lucide-react';

interface RegionalTicket {
  id: string;
  ticketNumber: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  tier: number;
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
    deliveryPincode?: string;
    delivery?: {
      status: string;
      distanceKm: number;
      riderProfile?: {
        user?: { name: string; phone?: string };
      };
    };
  };
  messages: Array<{ id: string; senderRole: string; text: string; sentAt: string }>;
  createdAt: string;
}

export const RegionalSupport: React.FC = () => {
  const [tickets, setTickets] = useState<RegionalTicket[]>([]);
  const [regionName, setRegionName] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<RegionalTicket | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  // Note & Escalate Modals
  const [showEscalateModal, setShowEscalateModal] = useState(false);
  const [escalateReason, setEscalateReason] = useState('');
  const [escalating, setEscalating] = useState(false);

  const [noteText, setNoteText] = useState('');

  const loadTickets = async () => {
    try {
      const res: any = await api.get('/api/regional-admin/support/tickets');
      if (res?.tickets) {
        setTickets(res.tickets);
        if (res.regionName) setRegionName(res.regionName);
        if (selectedTicket) {
          const updated = res.tickets.find((t: RegionalTicket) => t.id === selectedTicket.id);
          if (updated) setSelectedTicket(updated);
        }
      }
    } catch (err) {
      console.error('Regional tickets fetch error:', err);
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
      const res: any = await api.post(`/api/regional-admin/support/tickets/${selectedTicket.id}/reply`, {
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

  const handleEscalateToSuperAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket) return;

    setEscalating(true);
    try {
      const res: any = await api.post(`/api/regional-admin/support/tickets/${selectedTicket.id}/escalate`, {
        reason: escalateReason
      });
      alert('Ticket successfully escalated to Super Admin Executive Queue.');
      setShowEscalateModal(false);
      setEscalateReason('');
      if (res?.ticket) setSelectedTicket(res.ticket);
      loadTickets();
    } catch (err: any) {
      alert(err.message || 'Failed to escalate ticket');
    } finally {
      setEscalating(false);
    }
  };

  const handleAddNote = async () => {
    if (!noteText.trim() || !selectedTicket) return;
    try {
      await api.post(`/api/regional-admin/support/tickets/${selectedTicket.id}/internal-note`, {
        note: noteText.trim()
      });
      setNoteText('');
      loadTickets();
    } catch (err: any) {
      alert(err.message || 'Failed to add internal note');
    }
  };

  const breachedCount = tickets.filter(t => t.isBreached).length;

  return (
    <div className="space-y-6 pb-12 font-sans text-left">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-premium flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 font-heading">
                Territory Support & Dispute Escalations {regionName ? `(${regionName})` : ''}
              </h1>
              <p className="text-xs text-slate-500">Tier 2 territory intervention for rider delivery issues & merchant escalations</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {breachedCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold animate-pulse">
              <AlertTriangle className="w-4 h-4" />
              <span>{breachedCount} Breached SLA</span>
            </div>
          )}
          <button
            onClick={loadTickets}
            className="p-2 border rounded-xl hover:bg-slate-50 text-slate-600 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[600px]">
        {/* Left: Territory Tickets (5 Cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 shadow-premium overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider font-heading">
              Territory Queue ({tickets.length})
            </span>
            <span className="text-[11px] text-slate-400">Pincode matched</span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 max-h-[650px]">
            {loading && tickets.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">Loading territory tickets...</div>
            ) : tickets.length === 0 ? (
              <div className="p-12 text-center text-slate-400 space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                <p className="text-xs font-bold text-slate-700">No Escalated Territory Issues</p>
                <p className="text-[11px]">All delivery operations in your zone are running smoothly.</p>
              </div>
            ) : (
              tickets.map(t => {
                const isSelected = selectedTicket?.id === t.id;
                return (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTicket(t)}
                    className={`p-4 cursor-pointer transition-all hover:bg-slate-50 ${
                      isSelected ? 'bg-blue-50/60 border-l-4 border-blue-600' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] font-bold text-slate-400">
                            {t.ticketNumber}
                          </span>
                          <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">
                            Tier {t.tier}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-900 line-clamp-1">{t.subject}</h4>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                          <User className="w-3 h-3 text-slate-400" />
                          <span>{t.customer?.name || 'Customer'}</span>
                          {t.order?.orderNumber && (
                            <span className="font-mono font-bold text-indigo-600 bg-indigo-50 px-1.5 rounded text-[10px]">
                              {t.order.orderNumber}
                            </span>
                          )}
                        </div>
                      </div>

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
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-slate-100 text-slate-600 flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5 text-slate-400" /> {t.slaRemainingMinutes}m left
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

        {/* Right: Conversation & Operations Intervention (7 Cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 shadow-premium flex flex-col overflow-hidden">
          {selectedTicket ? (
            <>
              {/* Top Details Bar */}
              <div className="p-4 border-b border-slate-100 bg-slate-50/70 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono text-slate-400 font-bold block">
                      {selectedTicket.ticketNumber} · Tier {selectedTicket.tier} Escalation
                    </span>
                    <h3 className="text-sm font-bold text-slate-900">{selectedTicket.subject}</h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowEscalateModal(true)}
                      className="px-3 py-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" />
                      <span>Escalate to Super Admin</span>
                    </button>
                  </div>
                </div>

                {/* Operations & Rider Details Card */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1 text-[11px]">
                  <div className="p-2.5 bg-white border border-slate-200 rounded-xl space-y-1">
                    <span className="font-bold text-slate-700 block">👤 Customer Details:</span>
                    <p className="text-slate-600">{selectedTicket.customer?.name} ({selectedTicket.customer?.phone || selectedTicket.customer?.email})</p>
                    {selectedTicket.order?.deliveryPincode && (
                      <p className="font-mono text-slate-500">Pincode: {selectedTicket.order.deliveryPincode}</p>
                    )}
                  </div>

                  <div className="p-2.5 bg-white border border-slate-200 rounded-xl space-y-1">
                    <span className="font-bold text-slate-700 flex items-center gap-1">
                      <Bike className="w-3 h-3 text-blue-600" /> Assigned Delivery Partner:
                    </span>
                    {selectedTicket.order?.delivery?.riderProfile?.user ? (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-800 font-semibold">
                          {selectedTicket.order.delivery.riderProfile.user.name}
                        </span>
                        {selectedTicket.order.delivery.riderProfile.user.phone && (
                          <a
                            href={`tel:${selectedTicket.order.delivery.riderProfile.user.phone}`}
                            className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[10px] font-bold flex items-center gap-1 hover:bg-emerald-100"
                          >
                            <Phone className="w-2.5 h-2.5" /> Call Rider
                          </a>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">No local rider assigned / 3PL shipment</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Message Thread */}
              <div className="flex-1 p-5 overflow-y-auto space-y-4 max-h-[350px] bg-slate-50/20">
                {selectedTicket.messages.map((m, idx) => {
                  const isRegional = m.senderRole === 'regional_admin';
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
                      className={`flex flex-col ${isRegional ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center gap-1.5 mb-1 text-[10px] text-slate-400">
                        <span className="font-bold capitalize">{isCustomer ? selectedTicket.customer?.name || 'Customer' : isRegional ? 'You (Territory Manager)' : m.senderRole}</span>
                        <span>•</span>
                        <span>{new Date(m.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div
                        className={`max-w-md p-3.5 rounded-2xl text-xs leading-relaxed ${
                          isRegional
                            ? 'bg-blue-600 text-white rounded-tr-none shadow-sm'
                            : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none shadow-xs'
                        }`}
                      >
                        {m.text}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Internal Notes Section */}
              <div className="p-3 bg-amber-50/80 border-t border-b border-amber-200/60 text-[11px] text-amber-950 space-y-1.5">
                <span className="font-bold block">🔒 Internal Territory Notes (Hidden from customer):</span>
                {selectedTicket.internalNotes ? (
                  <pre className="whitespace-pre-wrap font-sans text-[11px] bg-white/60 p-2 rounded-lg border border-amber-200/50">
                    {selectedTicket.internalNotes}
                  </pre>
                ) : (
                  <span className="text-slate-400 italic block">No internal notes yet.</span>
                )}
                <div className="flex gap-2 pt-1">
                  <input
                    value={noteText}
                    onChange={e => setNoteText(e.target.value)}
                    placeholder="Add private manager note..."
                    className="flex-1 px-3 py-1.5 bg-white border border-amber-300 rounded-lg text-xs"
                  />
                  <button
                    onClick={handleAddNote}
                    className="px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-bold"
                  >
                    Add Note
                  </button>
                </div>
              </div>

              {/* Reply Input Bar */}
              <form onSubmit={handleSendReply} className="p-3 border-t border-slate-100 bg-white flex gap-2">
                <input
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  placeholder="Reply to customer as Regional Manager..."
                  className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-500"
                />
                <button
                  type="submit"
                  disabled={sendingReply || !replyText.trim()}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-slate-400">
              <MessageSquare className="w-12 h-12 text-slate-200 mb-3" />
              <p className="text-sm font-bold text-slate-700">Select a Territory Ticket</p>
              <p className="text-xs max-w-sm mt-1">
                View customer disputes, contact delivery riders directly, or escalate complex claims to the Super Admin.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Escalate to Super Admin Modal */}
      {showEscalateModal && selectedTicket && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-sm text-slate-900">Escalate to Super Admin Executive Queue</h3>
              <button onClick={() => setShowEscalateModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="p-3 bg-red-50 rounded-xl border border-red-200 text-xs text-red-900 leading-relaxed">
              🚨 <strong>Executive Escalation:</strong> This moves the ticket to Tier 3 for Super Admin review and sets priority to Urgent.
            </div>

            <form onSubmit={handleEscalateToSuperAdmin} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Escalation Reason</label>
                <textarea
                  rows={3}
                  value={escalateReason}
                  onChange={e => setEscalateReason(e.target.value)}
                  placeholder="e.g. Unresolved merchant dispute / rider non-compliance / refund exceeding authority"
                  className="w-full px-3 py-2 border rounded-xl"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEscalateModal(false)}
                  className="flex-1 py-2.5 border rounded-xl font-bold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={escalating}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-md"
                >
                  {escalating ? 'Escalating...' : 'Confirm Escalation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
