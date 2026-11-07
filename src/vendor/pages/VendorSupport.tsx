import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import {
  Headphones, Send, CheckCircle2, Mail, Copy,
  Phone, Clock, MessageSquareText, X, Trash2, Lock,
  RefreshCw, User, ShieldCheck
} from 'lucide-react';

interface TicketMessage {
  id: string;
  senderRole: string;
  text: string;
  sentAt: string;
}

interface TicketItem {
  id: string;
  ticketNumber: string;
  subject: string;
  category: string;
  status: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
  messages: TicketMessage[];
}

export const VendorSupport: React.FC = () => {
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Form State
  const [category, setCategory] = useState('payment');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  // Active Chat Modal State
  const [selectedTicket, setSelectedTicket] = useState<TicketItem | null>(null);
  const [chatReply, setChatReply] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  const loadTickets = async () => {
    try {
      const res: any = await api.get('/api/vendor/support/tickets');
      if (res?.tickets) {
        setTickets(res.tickets);
        // If a ticket is currently open in modal, refresh its data
        if (selectedTicket) {
          const updated = res.tickets.find((t: any) => t.id === selectedTicket.id);
          if (updated) setSelectedTicket(updated);
        }
      }
    } catch (err) {
      console.error('Error loading inquiries:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  // Poll for replies if chat modal is open
  useEffect(() => {
    if (!selectedTicket) return;
    const interval = setInterval(() => {
      api.get<any>(`/api/vendor/support/tickets/${selectedTicket.id}`)
        .then((res: any) => {
          if (res?.ticket) setSelectedTicket(res.ticket);
        })
        .catch(() => {});
    }, 4000);
    return () => clearInterval(interval);
  }, [selectedTicket?.id]);

  const handleSubmitInquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;

    setSubmitting(true);
    setSuccessMsg(null);
    try {
      const res: any = await api.post('/api/vendor/support/inquiry', {
        category,
        subject: subject.trim(),
        message: message.trim()
      });

      if (res?.success) {
        setSuccessMsg(`Ticket #${res.ticket?.ticketNumber || 'ADM'} submitted successfully! Shop India Support will reply shortly.`);
        setSubject('');
        setMessage('');
        loadTickets();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to submit inquiry');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendChatReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatReply.trim() || !selectedTicket) return;

    setSendingReply(true);
    const text = chatReply.trim();
    setChatReply('');
    try {
      const res: any = await api.post(`/api/vendor/support/tickets/${selectedTicket.id}/reply`, { text });
      if (res?.ticket) {
        setSelectedTicket(res.ticket);
      }
      loadTickets();
    } catch (err: any) {
      alert(err.message || 'Failed to send reply');
    } finally {
      setSendingReply(false);
    }
  };

  const handleCloseTicket = async (ticketId: string) => {
    if (!confirm('Are you sure you want to close this support ticket?')) return;
    try {
      await api.patch(`/api/vendor/support/tickets/${ticketId}/close`, {});
      loadTickets();
      if (selectedTicket && selectedTicket.id === ticketId) {
        setSelectedTicket(prev => prev ? { ...prev, status: 'closed' } : null);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to close ticket');
    }
  };

  const handleDeleteTicket = async (ticketId: string) => {
    if (!confirm('Are you sure you want to delete this support ticket? This action cannot be undone.')) return;
    try {
      await api.delete(`/api/vendor/support/tickets/${ticketId}`);
      if (selectedTicket && selectedTicket.id === ticketId) {
        setSelectedTicket(null);
      }
      loadTickets();
    } catch (err: any) {
      alert(err.message || 'Failed to delete ticket');
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2500);
  };

  const formatDateTime = (dateStr: string) => {
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-50 text-amber-800 border border-amber-200">Pending Review</span>;
      case 'in_progress':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-50 text-blue-800 border border-blue-200">In Progress</span>;
      case 'resolved':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-50 text-emerald-800 border border-emerald-200">Resolved</span>;
      case 'closed':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-gray-100 text-gray-700 border border-gray-200">Closed</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-gray-50 text-gray-600 border border-gray-200">{status}</span>;
    }
  };

  return (
    <div className="space-y-6 font-sans max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Headphones className="w-6 h-6 text-[#10B981]" />
          <span>Shop India Partner Support Desk</span>
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Direct assistance for payouts, logistics, catalog questions, and store inquiries
        </p>
      </div>

      {/* Direct Contact Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Direct Helpline */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-gray-900">Direct Merchant Helpline</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[9px] font-black uppercase">Official</span>
              </div>
              <div className="text-xs text-gray-500 font-mono mt-0.5">+91 7386570555</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => copyToClipboard('7386570555', 'phone')}
            className="px-3 py-1.5 bg-gray-50 hover:bg-emerald-50 text-emerald-700 border border-gray-200 hover:border-emerald-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>{copiedField === 'phone' ? 'Copied!' : 'Copy'}</span>
          </button>
        </div>

        {/* Written Support Desk */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-gray-900">Email Documentation Desk</span>
                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[9px] font-black uppercase">Official</span>
              </div>
              <div className="text-xs text-gray-500 font-mono mt-0.5">shopindia.info.co.in@gmail.com</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => copyToClipboard('shopindia.info.co.in@gmail.com', 'email')}
            className="px-3 py-1.5 bg-gray-50 hover:bg-blue-50 text-blue-700 border border-gray-200 hover:border-blue-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>{copiedField === 'email' ? 'Copied!' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {/* Main Two-Column Layout: Form on Left, Tickets List on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Raise Ticket Form */}
        <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
          <div>
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <MessageSquareText className="w-4 h-4 text-[#10B981]" />
              <span>Raise a Support Ticket</span>
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Submit your inquiry and our support team will update you promptly
            </p>
          </div>

          {successMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-2.5 text-xs text-emerald-900 font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmitInquiry} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">Issue Category *</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              >
                <option value="payment">💰 Payouts, Wallet &amp; Bank Sync</option>
                <option value="delivery">🚚 Store Pickup &amp; Delivery Coordination</option>
                <option value="product">📦 Product Catalog, Pricing &amp; Stock</option>
                <option value="order_issue">📦 Order Issue &amp; Customer Returns</option>
                <option value="other">💬 General Merchant Policy &amp; Inquiry</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">Subject / Reference *</label>
              <input
                type="text"
                required
                placeholder="e.g. UTR status for payout of ₹1,200 or store pickup help"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">Detailed Message *</label>
              <textarea
                required
                rows={4}
                placeholder="Describe your issue with exact details (order numbers, payout amount, date requested, or question)..."
                value={message}
                onChange={e => setMessage(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none"
              />
            </div>

            <div className="pt-2 flex items-center justify-between">
              <span className="text-[11px] text-gray-400 flex items-center gap-1 font-medium">
                <Clock className="w-3.5 h-3.5 text-gray-400" />
                <span>Response SLA: 1-2 business hours</span>
              </span>

              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2.5 bg-[#10B981] hover:bg-[#059669] text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{submitting ? 'Submitting...' : 'Submit Ticket'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Support Tickets List */}
        <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <MessageSquareText className="w-4 h-4 text-indigo-600" />
                <span>Your Support Tickets</span>
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">Click any ticket to chat directly with Shop India Support</p>
            </div>

            <button
              onClick={loadTickets}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100 transition-colors"
              title="Refresh Tickets"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2].map(i => (
                <div key={i} className="h-24 bg-gray-50 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-12 text-gray-400 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
              <MessageSquareText className="w-10 h-10 mx-auto text-gray-300 mb-2" />
              <p className="text-sm font-semibold text-gray-600">No Support Tickets Yet</p>
              <p className="text-xs text-gray-400 mt-1">Submit an inquiry using the form on the left whenever you need assistance.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
              {tickets.map(t => {
                const isClosed = t.status === 'closed' || t.status === 'resolved';
                const messageCount = t.messages?.length || 0;
                const lastMsg = t.messages?.[t.messages.length - 1];
                const hasAdminReply = t.messages?.some(m => m.senderRole === 'admin' || m.senderRole === 'support');

                return (
                  <div
                    key={t.id}
                    className="p-4 rounded-2xl border border-gray-200/80 bg-white hover:border-indigo-300 hover:shadow-xs transition-all space-y-3"
                  >
                    {/* Top Row: Ticket Number, Badges, and Date */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100">
                          #{t.ticketNumber}
                        </span>
                        {getStatusBadge(t.status)}
                        {hasAdminReply && !isClosed && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-100 text-emerald-800 animate-pulse">
                            New Reply 💬
                          </span>
                        )}
                      </div>

                      <span className="text-[11px] text-gray-400 font-medium">
                        {formatDateTime(t.createdAt)}
                      </span>
                    </div>

                    {/* Subject */}
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 leading-tight">{t.subject}</h4>
                      {lastMsg && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                          <span className="font-semibold text-gray-700">
                            {lastMsg.senderRole === 'admin' || lastMsg.senderRole === 'support' ? 'Shop India Support: ' : 'You: '}
                          </span>
                          {lastMsg.text}
                        </p>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs">
                      <span className="text-[11px] text-gray-400 font-medium">
                        {messageCount} {messageCount === 1 ? 'message' : 'messages'}
                      </span>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedTicket(t)}
                          className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <MessageSquareText className="w-3.5 h-3.5" />
                          <span>Open Chat</span>
                        </button>

                        {!isClosed && (
                          <button
                            type="button"
                            onClick={() => handleCloseTicket(t.id)}
                            className="px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-600 font-semibold rounded-xl text-xs flex items-center gap-1 transition-colors cursor-pointer"
                            title="Close Ticket"
                          >
                            <Lock className="w-3 h-3 text-gray-500" />
                            <span>Close</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleDeleteTicket(t.id)}
                          className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-colors cursor-pointer"
                          title="Delete Ticket"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Dedicated Clean Live Chat Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-slate-50/80">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                    #{selectedTicket.ticketNumber}
                  </span>
                  {getStatusBadge(selectedTicket.status)}
                  <span className="text-[11px] text-gray-400 font-medium">
                    {formatDateTime(selectedTicket.createdAt)}
                  </span>
                </div>
                <h3 className="font-bold text-base text-gray-900 leading-tight">{selectedTicket.subject}</h3>
              </div>

              <div className="flex items-center gap-2">
                {selectedTicket.status !== 'closed' && (
                  <button
                    type="button"
                    onClick={() => handleCloseTicket(selectedTicket.id)}
                    className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Close Ticket</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedTicket(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Chat Messages Container */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-slate-50/40 min-h-[300px]">
              {selectedTicket.messages && selectedTicket.messages.length > 0 ? (
                selectedTicket.messages.map((m, idx) => {
                  const isStaff = m.senderRole === 'admin' || m.senderRole === 'support';
                  const isSystem = m.senderRole === 'system';

                  if (isSystem) {
                    return (
                      <div key={m.id || idx} className="text-center my-2">
                        <span className="inline-block px-3 py-1 rounded-full text-[10px] bg-gray-100 text-gray-600 font-medium">
                          {m.text}
                        </span>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={m.id || idx}
                      className={`flex flex-col ${isStaff ? 'items-start' : 'items-end'}`}
                    >
                      <div className="flex items-center gap-1.5 mb-1 text-[10px] text-gray-400">
                        {isStaff ? (
                          <>
                            <ShieldCheck className="w-3 h-3 text-indigo-600" />
                            <span className="font-bold text-indigo-700">Shop India Official Support</span>
                          </>
                        ) : (
                          <>
                            <User className="w-3 h-3 text-emerald-600" />
                            <span className="font-bold text-emerald-700">You (Store Merchant)</span>
                          </>
                        )}
                        <span>•</span>
                        <span>{new Date(m.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>

                      <div
                        className={`max-w-md p-3.5 rounded-2xl text-xs leading-relaxed ${
                          isStaff
                            ? 'bg-white border border-indigo-200 text-gray-900 rounded-tl-none shadow-xs'
                            : 'bg-[#10B981] text-white rounded-tr-none shadow-sm'
                        }`}
                      >
                        {m.text}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-10 text-gray-400 text-xs">
                  No messages recorded in this conversation.
                </div>
              )}
            </div>

            {/* Reply Input Bar */}
            {selectedTicket.status === 'closed' ? (
              <div className="p-4 bg-gray-50 border-t border-gray-100 text-center text-xs text-gray-500 font-medium">
                🔒 This ticket is closed. If you have a new question, please submit a new ticket.
              </div>
            ) : (
              <form onSubmit={handleSendChatReply} className="p-4 bg-white border-t border-gray-100 flex items-center gap-2">
                <input
                  type="text"
                  required
                  placeholder="Type your message to Shop India Support..."
                  value={chatReply}
                  onChange={e => setChatReply(e.target.value)}
                  className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-gray-900"
                />
                <button
                  type="submit"
                  disabled={sendingReply || !chatReply.trim()}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{sendingReply ? 'Sending...' : 'Send'}</span>
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
