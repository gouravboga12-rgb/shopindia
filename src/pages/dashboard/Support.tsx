import React, { useState, useEffect, useRef } from 'react';
import { PageHeader, PrimaryButton, fieldCls, selectCls, Badge } from '../../components/dashboard/DashboardUI';
import { 
  MessageSquare, Mail, Phone, ChevronDown, LifeBuoy, 
  Send, Ticket, CheckCircle2, Bot, ArrowLeft, RefreshCw,
  Sparkles
} from 'lucide-react';
import { api } from '../../lib/api';

const FAQS = [
  { q: 'How do I track my order or service booking?', a: 'Head to My Orders / Bookings in your dashboard. Each order has a live tracking timeline with technician or delivery updates.' },
  { q: 'What is your return & cancellation policy?', a: 'You can request a return for delivered items within 7 days. Service bookings can be rescheduled or cancelled free of charge up to 2 hours prior to the slot.' },
  { q: 'How do I apply a coupon or voucher?', a: 'Add a coupon code at cart checkout. Active coupons are listed under Coupons & Rewards.' },
  { q: 'Can I change my delivery address or booking time after ordering?', a: 'Yes — before your item ships or technician departs. Contact support from this page or raise a ticket and we will update it immediately.' },
  { q: 'Is there a warranty on technician repairs?', a: 'Yes! All services booked on ShopIndia include a 30-Day Service Warranty with free technician revisit for complete peace of mind.' }
];

const INITIAL_CHAT = [
  { from: 'agent', text: 'Hi! 👋 Welcome to ShopIndia Live Support. How can we help you today?' },
];

export const SupportCenterPage: React.FC = () => {
  // Ticket Creation Form State
  const [ticketForm, setTicketForm] = useState({ 
    subject: '', 
    category: 'order_issue', 
    priority: 'medium', 
    message: '',
    name: '',
    phone: '',
    email: ''
  });
  const [submittingTicket, setSubmittingTicket] = useState(false);
  const [ticketSuccessMessage, setTicketSuccessMessage] = useState<string | null>(null);

  // Tickets List & Active Thread State
  const [tickets, setTickets] = useState<any[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [activeTicket, setActiveTicket] = useState<any | null>(null);
  const [ticketReplyText, setTicketReplyText] = useState('');
  const [sendingTicketReply, setSendingTicketReply] = useState(false);

  // Live Chat State
  const [chat, setChat] = useState<{ from: string; text: string; time?: string }[]>(INITIAL_CHAT);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // FAQ Accordion State
  const [faqOpen, setFaqOpen] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const threadEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat, isTyping]);

  // Auto-scroll active ticket thread
  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeTicket?.messages, sendingTicketReply]);

  // Load My Tickets directly from backend API
  const loadTickets = async () => {
    setLoadingTickets(true);
    try {
      const res = await api.get<{ tickets: any[] }>('/api/support/tickets');
      setTickets(res.tickets || []);
    } catch (err) {
      console.error('Failed to load tickets from server:', err);
    } finally {
      setLoadingTickets(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  // Real-time polling for active ticket conversation (every 3s)
  useEffect(() => {
    if (!activeTicket) return;
    const ticketId = activeTicket.id || activeTicket.ticketNumber;
    const timer = setInterval(async () => {
      try {
        const res = await api.get<{ ticket: any }>(`/api/support/tickets/${ticketId}`);
        if (res.ticket && res.ticket.messages) {
          setActiveTicket((prev: any) => {
            if (!prev || prev.messages?.length !== res.ticket.messages?.length || prev.status !== res.ticket.status) {
              return res.ticket;
            }
            return prev;
          });
        }
      } catch {
        // Silently catch background sync errors
      }
    }, 3000);

    return () => clearInterval(timer);
  }, [activeTicket?.id, activeTicket?.ticketNumber]);

  // Submit real ticket directly to PostgreSQL API
  const submitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingTicket(true);
    setTicketSuccessMessage(null);

    try {
      const res = await api.post<{ success: boolean; ticket: any; message: string }>('/api/support/ticket', ticketForm);
      if (res.success && res.ticket) {
        setTicketSuccessMessage(`Ticket #${res.ticket.ticketNumber} created successfully! A specialist is reviewing your issue.`);
        setTicketForm({ subject: '', category: 'order_issue', message: '', priority: 'medium', name: '', phone: '', email: '' });
        setActiveTicket(res.ticket);
        loadTickets();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to submit ticket.');
    } finally {
      setSubmittingTicket(false);
    }
  };

  // Open single ticket thread directly from backend
  const openTicketThread = async (ticketId: string) => {
    try {
      const res = await api.get<{ ticket: any }>(`/api/support/tickets/${ticketId}`);
      if (res.ticket) {
        setActiveTicket(res.ticket);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to open ticket.');
    }
  };

  // Send reply in ticket conversation directly to backend
  const sendTicketReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketReplyText.trim() || !activeTicket) return;
    const text = ticketReplyText.trim();
    setTicketReplyText('');

    const optimisticMsg = {
      id: 'opt-' + Date.now(),
      senderRole: 'customer',
      text,
      sentAt: new Date().toISOString()
    };

    setActiveTicket((prev: any) => ({
      ...prev,
      messages: [...(prev?.messages || []), optimisticMsg]
    }));

    setSendingTicketReply(true);
    try {
      const res = await api.post<{ success: boolean; message: any; ticket: any }>(
        `/api/support/tickets/${activeTicket.id || activeTicket.ticketNumber}/reply`,
        { text }
      );
      if (res.ticket) {
        setActiveTicket(res.ticket);
      }
      loadTickets();
    } catch (err: any) {
      alert(err.message || 'Failed to send reply.');
    } finally {
      setSendingTicketReply(false);
    }
  };

  // Send message in Live Chat
  const sendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = chatInput.trim();
    if (!q) return;

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setChat((c) => [...c, { from: 'me', text: q, time }]);
    setChatInput('');
    setIsTyping(true);

    try {
      const res = await api.post<{ answer: string; suggestTicket?: boolean }>('/api/support/chat', { query: q });
      setIsTyping(false);
      setChat((c) => [
        ...c, 
        { 
          from: 'agent', 
          text: res.answer || 'Thank you for contacting ShopIndia Support. A specialist is on standby to assist.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } catch {
      setIsTyping(false);
      setChat((c) => [
        ...c, 
        { 
          from: 'agent', 
          text: 'Thanks for reaching out! If your query requires specialized assistance, you can also Raise a Support Ticket on the left.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }
  };

  return (
    <div className="space-y-6 text-left font-sans">
      <PageHeader title="Support Center" subtitle="We're here to help" />

      {/* Quick Action Channels */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { 
            icon: <MessageSquare className="w-5 h-5" />, 
            label: 'Live Chat Support', 
            sub: 'Instant Answers',
            color: 'bg-brand-blue/10 text-brand-blue',
            action: () => chatInputRef.current?.focus() 
          },
          { 
            icon: <Mail className="w-5 h-5" />, 
            label: 'Email Support', 
            sub: 'support@shopindia.in',
            color: 'bg-emerald-50 text-emerald-600',
            action: () => window.open('mailto:support@shopindia.in') 
          },
          { 
            icon: <Phone className="w-5 h-5" />, 
            label: 'Call Helpline', 
            sub: '1800-123-SHOP',
            color: 'bg-amber-50 text-amber-600',
            action: () => window.open('tel:18001237467') 
          },
          { 
            icon: <LifeBuoy className="w-5 h-5" />, 
            label: '24/7 Support Desk', 
            sub: 'Priority Tickets',
            color: 'bg-purple-50 text-purple-600',
            action: () => {
              const el = document.getElementById('raise-ticket-section');
              el?.scrollIntoView({ behavior: 'smooth' });
            }
          },
        ].map((c, i) => (
          <button 
            key={i} 
            onClick={c.action}
            className="bg-white border border-brand-border rounded-card shadow-premium p-4 flex flex-col items-center text-center gap-2 hover:shadow-elevated hover:-translate-y-0.5 transition-all cursor-pointer"
          >
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${c.color}`}>{c.icon}</div>
            <div className="leading-tight">
              <span className="text-xs font-extrabold text-brand-graphite block font-heading">{c.label}</span>
              <span className="text-[10px] text-brand-slate font-medium">{c.sub}</span>
            </div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Raise Ticket & My Tickets */}
        <div id="raise-ticket-section" className="bg-white border border-brand-border rounded-2xl shadow-premium p-5 flex flex-col">
          <div className="flex items-center justify-between border-b border-brand-border pb-3 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-brand-blue flex items-center justify-center">
                <Ticket size={16} />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-brand-graphite font-heading">
                  {activeTicket ? 'Ticket Conversation' : 'Raise a Support Ticket'}
                </h3>
                <p className="text-[10.5px] text-brand-slate font-medium">
                  {activeTicket ? `Ticket #${activeTicket.ticketNumber}` : 'Direct connection to our resolution desk'}
                </p>
              </div>
            </div>

            {activeTicket && (
              <button
                onClick={() => setActiveTicket(null)}
                className="flex items-center gap-1 text-xs font-bold text-brand-blue hover:underline cursor-pointer"
              >
                <ArrowLeft size={13} />
                <span>New Ticket</span>
              </button>
            )}
          </div>

          {activeTicket ? (
            /* Active Ticket 2-Way Live Conversation Thread */
            <div className="flex-1 flex flex-col space-y-3">
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono font-bold text-brand-blue">#{activeTicket.ticketNumber}</span>
                  <Badge tone={activeTicket.status === 'resolved' ? 'green' : activeTicket.status === 'in_progress' ? 'amber' : 'blue'}>
                    {activeTicket.status}
                  </Badge>
                </div>
                <h4 className="font-extrabold text-brand-graphite">{activeTicket.subject}</h4>
                <span className="text-[10.5px] text-brand-slate uppercase font-bold">Category: {activeTicket.category}</span>
              </div>

              {/* Message timeline */}
              <div className="flex-1 max-h-[260px] overflow-y-auto space-y-2.5 pr-1 bg-slate-50/40 p-2.5 rounded-xl border border-brand-border/60">
                {activeTicket.messages && activeTicket.messages.length > 0 ? (
                  activeTicket.messages.map((m: any, idx: number) => {
                    const isMe = m.senderRole === 'customer';
                    return (
                      <div key={idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                        <div
                          className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                            isMe 
                              ? 'bg-brand-blue text-white rounded-br-none shadow-xs' 
                              : 'bg-white border border-brand-border text-brand-graphite rounded-bl-none shadow-xs'
                          }`}
                        >
                          <div className="flex justify-between items-center text-[9px] opacity-75 font-bold uppercase mb-1">
                            <span>{isMe ? 'You' : 'Support Specialist'}</span>
                            <span className="ml-2 font-mono">{new Date(m.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <p className="font-medium whitespace-pre-wrap">{m.text}</p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-6 text-brand-slate text-xs">No message history.</div>
                )}
                <div ref={threadEndRef} />
              </div>

              {/* Reply Box */}
              <form onSubmit={sendTicketReply} className="flex gap-2 pt-2 border-t border-brand-border">
                <input
                  type="text"
                  placeholder="Type your reply to support..."
                  value={ticketReplyText}
                  onChange={(e) => setTicketReplyText(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-brand-border rounded-full font-medium focus:outline-none focus:bg-white focus:border-brand-blue"
                />
                <button
                  type="submit"
                  disabled={sendingTicketReply || !ticketReplyText.trim()}
                  className="px-4 py-2 bg-brand-blue hover:bg-blue-600 disabled:bg-slate-200 text-white rounded-full text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                >
                  <Send size={12} />
                  <span>Reply</span>
                </button>
              </form>
            </div>
          ) : (
            /* Ticket Creation Form */
            <form onSubmit={submitTicket} className="space-y-3">
              {ticketSuccessMessage && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                  <span>{ticketSuccessMessage}</span>
                </div>
              )}

              <div className="flex flex-col gap-1">
                <label className="text-[10.5px] font-black uppercase text-brand-slate font-heading">Issue Subject</label>
                <input 
                  className={fieldCls} 
                  placeholder="e.g., Delivery delay / Service reschedule needed"
                  value={ticketForm.subject} 
                  onChange={(e) => setTicketForm((t) => ({ ...t, subject: e.target.value }))} 
                  required 
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10.5px] font-black uppercase text-brand-slate font-heading">Category</label>
                  <div className="relative w-full">
                    <select 
                      className={selectCls} 
                      value={ticketForm.category} 
                      onChange={(e) => setTicketForm((t) => ({ ...t, category: e.target.value }))}
                    >
                      <option value="order_issue">Order / Booking Issue</option>
                      <option value="payment">Payment & Billing</option>
                      <option value="refund">Refund & Cancellation</option>
                      <option value="product">Service Quality / Technician</option>
                      <option value="delivery">Delivery Status</option>
                      <option value="other">Other Inquiry</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-brand-slate">
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10.5px] font-black uppercase text-brand-slate font-heading">Priority</label>
                  <div className="relative w-full">
                    <select 
                      className={selectCls} 
                      value={ticketForm.priority} 
                      onChange={(e) => setTicketForm((t) => ({ ...t, priority: e.target.value }))}
                    >
                      <option value="low">Standard</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-brand-slate">
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10.5px] font-black uppercase text-brand-slate font-heading">Describe your issue in detail</label>
                <textarea 
                  className={`${fieldCls} min-h-[85px] resize-none`} 
                  placeholder="Please provide details, order number, or preferred time..."
                  value={ticketForm.message} 
                  onChange={(e) => setTicketForm((t) => ({ ...t, message: e.target.value }))} 
                  required 
                />
              </div>

              <PrimaryButton disabled={submittingTicket}>
                {submittingTicket ? 'Submitting Ticket...' : 'Submit Support Ticket'}
              </PrimaryButton>
            </form>
          )}

          {/* My Raised Tickets Section */}
          {tickets.length > 0 && !activeTicket && (
            <div className="mt-5 pt-4 border-t border-brand-border">
              <div className="flex items-center justify-between mb-2.5">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-brand-slate font-heading">
                  My Tickets ({tickets.length})
                </h4>
                <button onClick={loadTickets} title="Refresh" className="text-brand-slate hover:text-brand-graphite">
                  <RefreshCw size={12} className={loadingTickets ? 'animate-spin' : ''} />
                </button>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {tickets.map((t) => {
                  const id = t.id || t.ticketNumber;
                  const hasReply = t.messages?.some((m: any) => m.senderRole !== 'customer');
                  return (
                    <div 
                      key={id} 
                      onClick={() => openTicketThread(id)}
                      className="flex items-center justify-between p-3 border border-brand-border rounded-xl hover:border-brand-blue/50 hover:bg-slate-50/50 transition-all cursor-pointer group"
                    >
                      <div className="max-w-[70%]">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="font-mono text-xs font-bold text-brand-blue">#{t.ticketNumber}</span>
                          {hasReply && (
                            <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                              New Reply
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-bold text-brand-graphite truncate group-hover:text-brand-blue transition-colors">
                          {t.subject}
                        </p>
                        <p className="text-[10px] text-brand-slate font-medium">
                          {new Date(t.createdAt).toLocaleDateString('en-IN')} · {t.category}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge tone={t.status === 'resolved' ? 'green' : t.status === 'in_progress' ? 'amber' : 'blue'}>
                          {t.status}
                        </Badge>
                        <span className="text-xs text-brand-slate group-hover:translate-x-0.5 transition-transform font-bold">→</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Instant Live Chat Support */}
        <div className="bg-white border border-brand-border rounded-2xl shadow-premium flex flex-col overflow-hidden">
          {/* Chat Header */}
          <div className="bg-gradient-to-r from-[#0F2C59] to-[#1E3E62] text-white px-5 py-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-extrabold font-heading tracking-wide">Live Chat Support</p>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Online" />
                </div>
                <p className="text-[10.5px] text-white/70">Instant AI answers & human specialist backup</p>
              </div>
            </div>

            <span className="text-[10px] bg-emerald-400/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-400/30">
              Online
            </span>
          </div>

          {/* Chat Timeline */}
          <div className="flex-1 p-4 space-y-3 min-h-[300px] max-h-[380px] overflow-y-auto bg-slate-50/40 text-xs">
            {chat.map((m, i) => (
              <div key={i} className={`flex ${m.from === 'me' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[82%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed shadow-xs ${
                    m.from === 'me' 
                      ? 'bg-brand-blue text-white rounded-br-none' 
                      : 'bg-white border border-brand-border text-brand-graphite rounded-bl-none'
                  }`}
                >
                  <p className="font-semibold whitespace-pre-wrap">{m.text}</p>
                  {m.time && (
                    <span className={`text-[9px] block mt-1 ${m.from === 'me' ? 'text-blue-100 text-right' : 'text-slate-400'}`}>
                      {m.time}
                    </span>
                  )}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex items-center gap-1.5 bg-white border border-brand-border rounded-full px-3 py-1.5 w-max text-slate-400 text-[10px] shadow-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-blue animate-bounce" />
                <span className="w-1.5 h-1.5 rounded-full bg-brand-blue animate-bounce [animation-delay:0.2s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-brand-blue animate-bounce [animation-delay:0.4s]" />
                <span className="font-bold ml-1 text-slate-500">Live Assistant is typing...</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Chat Quick Chips */}
          <div className="px-3 py-2 bg-slate-100/60 border-t border-brand-border/60 flex gap-1.5 overflow-x-auto no-scrollbar">
            {[
              'Track my delivery',
              'Reschedule service',
              'Refund status',
              'Talk to specialist'
            ].map(chip => (
              <button
                key={chip}
                onClick={() => {
                  setChatInput(chip);
                  setTimeout(() => {
                    const form = document.getElementById('chat-form') as HTMLFormElement;
                    form?.requestSubmit();
                  }, 50);
                }}
                className="shrink-0 text-[10.5px] font-bold bg-white hover:bg-blue-50 text-brand-slate hover:text-brand-blue border border-brand-border px-2.5 py-1 rounded-full shadow-2xs transition-colors"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Chat Input Form */}
          <form id="chat-form" onSubmit={sendChat} className="p-3 border-t border-brand-border flex gap-2 bg-white">
            <input 
              ref={chatInputRef}
              className="flex-1 px-4 py-2 border border-brand-border bg-slate-50 focus:bg-white rounded-full text-xs font-semibold focus:outline-none focus:border-brand-blue transition-all" 
              value={chatInput} 
              onChange={(e) => setChatInput(e.target.value)} 
              placeholder="Ask anything about orders, services, or issues..." 
            />
            <button 
              type="submit" 
              disabled={!chatInput.trim()}
              className="px-4 py-2 bg-brand-blue hover:bg-blue-600 disabled:bg-slate-200 text-white rounded-full text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Send size={13} />
              <span>Send</span>
            </button>
          </form>
        </div>
      </div>

      {/* Frequently Asked Questions */}
      <div className="bg-white border border-brand-border rounded-2xl shadow-premium p-5">
        <h3 className="font-extrabold text-sm text-brand-graphite font-heading mb-4 flex items-center gap-2">
          <Sparkles size={16} className="text-amber-500" />
          <span>Frequently Asked Questions</span>
        </h3>
        <div className="divide-y divide-brand-border/50">
          {FAQS.map((f) => (
            <div key={f.q}>
              <button 
                onClick={() => setFaqOpen(faqOpen === f.q ? null : f.q)} 
                className="w-full flex items-center justify-between py-3.5 text-left cursor-pointer group"
              >
                <span className="text-xs font-bold text-brand-graphite group-hover:text-brand-blue transition-colors">
                  {f.q}
                </span>
                <ChevronDown className={`w-4 h-4 text-brand-slate transition-transform ${faqOpen === f.q ? 'rotate-180 text-brand-blue' : ''}`} />
              </button>
              {faqOpen === f.q && (
                <p className="pb-3.5 text-xs text-brand-slate leading-relaxed font-medium pl-1">
                  {f.a}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};