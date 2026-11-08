import React, { useState, useEffect, useRef } from 'react';
import { PageHeader, PrimaryButton, fieldCls, selectCls, Badge } from '../../components/dashboard/DashboardUI';
import { 
  MessageSquare, Mail, Phone, ChevronDown, LifeBuoy, 
  Send, Ticket, CheckCircle2, Bot, ArrowLeft, RefreshCw,
  Sparkles, Package, FileText, Clock
} from 'lucide-react';
import { api } from '../../lib/api';
import { useApp } from '../../context/AppContext';
import { useCustomer } from '../../context/CustomerContext';

const INITIAL_FAQS = [
  { q: 'When will my Shop India order be delivered?', a: 'Standard Shop India orders are dispatched via our verified logistics partners and delivered within 2 to 5 business working days depending on your pin code. Live tracking is available in My Orders.' },
  { q: 'How fast is Quick Shopping delivery?', a: 'Quick Shopping grocery and food orders are delivered within 10 to 20 minutes from our nearest local dark stores and vendor hubs by dedicated express riders.' },
  { q: 'Is there a warranty or guarantee on Glacons repairs?', a: 'Yes! All services booked on ShopIndia include a 30-Day Guarantee with free technician revisit for complete peace of mind.' },
  { q: 'How long does a refund take to reflect in my account?', a: 'Once approved, refunds are credited back to your original payment method (UPI / Cards / Netbanking) within 2 to 4 business working days.' },
  { q: 'How do I escalate an issue to Shop India superiors?', a: 'Submit your complaint using the "Raise a Support Ticket" form on the left. Higher-level support executives and desk supervisors review all escalated tickets and resolve them within 2 to 4 business working days.' }
];

const INITIAL_CHAT = [
  { 
    from: 'agent', 
    senderLabel: 'ShopIndia Assistant',
    text: 'Hi! 👋 Welcome to ShopIndia Support Chat.\n\nYou can select any common question below regarding Shop India (2–5 day delivery), Quick Shopping (10–20 min delivery), Glacons Services (30-day guarantee), or Refunds (2–4 business days), or raise an official support ticket directly on the left.' 
  },
];

export const SupportCenterPage: React.FC = () => {
  const { orders, addNotification } = useApp();
  const { addNotification: addCustomerNotification } = useCustomer();

  // Ticket Creation Form State
  const [ticketForm, setTicketForm] = useState({ 
    subject: '', 
    category: 'order_issue', 
    priority: 'medium', 
    message: '',
    name: '',
    phone: '',
    email: '',
    orderId: ''
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
  const [chat, setChat] = useState<{ id?: string; from: string; senderRole?: string; senderLabel?: string; text: string; time?: string }[]>(INITIAL_CHAT);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isAgentConnected, setIsAgentConnected] = useState(false);
  const [connectedAgentName, setConnectedAgentName] = useState<string | null>(null);
  const [liveSessionNumber, setLiveSessionNumber] = useState<string | null>(null);

  // Dynamic FAQs from Backend
  const [faqsList, setFaqsList] = useState<any[]>([]);
  const [faqCategories, setFaqCategories] = useState<string[]>([
    'All',
    'Shop India',
    'Quick Shopping',
    'Glacons Services',
    'Refunds & Payments',
    'Superiors & Tickets'
  ]);
  const [selectedFaqCat, setSelectedFaqCat] = useState('All');

  // FAQ Accordion State
  const [faqOpen, setFaqOpen] = useState<string | null>(null);

  // Form highlighting and ticket redirection state
  const [highlightForm, setHighlightForm] = useState(false);
  const ticketSectionRef = useRef<HTMLDivElement>(null);
  const subjectInputRef = useRef<HTMLInputElement>(null);

  // Dedicated Chat container ref to eliminate window jumping
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const threadEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);

  const selectedOrder = orders?.find(o => o.id === ticketForm.orderId);

  // Focus Ticket Form and pre-populate if needed
  const handleFocusTicketForm = (subject?: string, category?: string) => {
    if (subject) {
      setTicketForm(prev => ({ ...prev, subject }));
    }
    if (category) {
      setTicketForm(prev => ({ ...prev, category }));
    }
    setHighlightForm(true);
    ticketSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => {
      subjectInputRef.current?.focus();
    }, 350);
    setTimeout(() => {
      setHighlightForm(false);
    }, 2800);
  };

  // Strictly container-scoped scroll — ZERO window jumping!
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
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

  // Load dynamic FAQs from API
  const loadFaqs = async () => {
    try {
      const res = await api.get<{ faqs: any[] }>('/api/support/faqs');
      if (res?.faqs && Array.isArray(res.faqs) && res.faqs.length > 0) {
        setFaqsList(res.faqs);
        const categories = Array.from(new Set(res.faqs.map(f => f.category).filter(Boolean)));
        if (categories.length > 0) {
          setFaqCategories(['All', ...categories]);
        }
      }
    } catch (err) {
      console.warn('Could not load dynamic FAQs:', err);
    }
  };

  useEffect(() => {
    loadFaqs();
  }, []);

  // Load persistent chat history from database
  const loadChatHistory = async () => {
    try {
      const res = await api.get<{
        messages: any[];
        isAgentConnected: boolean;
        agentName: string | null;
        sessionNumber: string | null;
      }>('/api/support/chat/history');
      if (res && Array.isArray(res.messages) && res.messages.length > 0) {
        setChat(res.messages);
      }
      if (res.isAgentConnected) {
        setIsAgentConnected(true);
        setConnectedAgentName(res.agentName || 'Support Specialist');
      }
      if (res.sessionNumber) {
        setLiveSessionNumber(res.sessionNumber);
      }
    } catch {
      // Keep default fallback
    }
  };

  useEffect(() => {
    loadChatHistory();
  }, []);

  // Real-time polling for Live Chat messages & agent replies (every 3.5s)
  useEffect(() => {
    const timer = setInterval(async () => {
      try {
        const res = await api.get<{
          messages: any[];
          isAgentConnected: boolean;
          agentName: string | null;
          sessionNumber: string | null;
        }>('/api/support/chat/history');
        if (res && Array.isArray(res.messages) && res.messages.length > 0) {
          setChat(prev => {
            if (res.messages.length > prev.length) {
              return res.messages;
            }
            return prev;
          });
        }
        if (res.isAgentConnected) {
          setIsAgentConnected(true);
          setConnectedAgentName(res.agentName || 'Support Specialist');
        }
        if (res.sessionNumber) {
          setLiveSessionNumber(res.sessionNumber);
        }
      } catch {
        // Silent poll error
      }
    }, 3500);

    return () => clearInterval(timer);
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
            if (!prev) return res.ticket;
            const prevLen = prev.messages?.length || 0;
            const newLen = res.ticket.messages.length;
            if (newLen > prevLen) {
              const lastMsg = res.ticket.messages[newLen - 1];
              if (lastMsg && lastMsg.senderRole !== 'customer') {
                const roleTitle = lastMsg.senderRole === 'regional_admin' ? 'Regional Support' : lastMsg.senderRole === 'vendor' ? 'Store Merchant' : 'Support Specialist';
                addNotification({
                  type: 'order',
                  title: `New Reply on Ticket #${res.ticket.ticketNumber} 💬`,
                  message: `${roleTitle}: "${lastMsg.text.slice(0, 80)}${lastMsg.text.length > 80 ? '...' : ''}"`,
                  actionText: 'View',
                  icon: MessageSquare,
                  color: 'text-brand-blue',
                  bg: 'bg-blue-50'
                });
                if (addCustomerNotification) {
                  addCustomerNotification({
                    category: 'order',
                    title: `New Reply on Ticket #${res.ticket.ticketNumber} 💬`,
                    message: `${roleTitle}: "${lastMsg.text.slice(0, 80)}${lastMsg.text.length > 80 ? '...' : ''}"`
                  });
                }
              }
              return res.ticket;
            }
            if (prev.status !== res.ticket.status) {
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
  }, [activeTicket?.id, activeTicket?.ticketNumber, addNotification, addCustomerNotification]);

  // Submit real ticket directly to PostgreSQL API
  const submitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingTicket(true);
    setTicketSuccessMessage(null);

    try {
      const payload: any = { ...ticketForm };
      if (!payload.orderId) delete payload.orderId;

      const res = await api.post<{ success: boolean; ticket: any; message: string }>('/api/support/ticket', payload);
      if (res.success && res.ticket) {
        setTicketSuccessMessage(`Ticket #${res.ticket.ticketNumber} created successfully! A specialist is reviewing your issue.`);
        
        // Trigger In-App Notification Alert
        try {
          addNotification({
            type: 'order',
            title: `Support Ticket #${res.ticket.ticketNumber} Raised 🎫`,
            message: `Your request regarding "${ticketForm.subject}" has been received. Our team will assist shortly.`,
            actionText: 'View Ticket',
            icon: Ticket,
            color: 'text-brand-blue',
            bg: 'bg-blue-50'
          });
          if (addCustomerNotification) {
            addCustomerNotification({
              category: 'order',
              title: `Support Ticket #${res.ticket.ticketNumber} Raised 🎫`,
              message: `Your request regarding "${ticketForm.subject}" has been received.`
            });
          }
        } catch (notifErr) {
          console.warn('In-app alert notification error:', notifErr);
        }

        setTicketForm({ subject: '', category: 'order_issue', message: '', priority: 'medium', name: '', phone: '', email: '', orderId: '' });
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

  // Send message in Support Chat
  const sendChat = async (e?: React.FormEvent, directQuery?: string, instantAnswer?: string, canRaiseTicket?: boolean, _ticketSubject?: string) => {
    if (e) e.preventDefault();
    const q = (directQuery || chatInput).trim();
    if (!q) return;

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setChat((c) => [...c, { from: 'me', text: q, time }]);
    setChatInput('');

    // If we have an instant verified FAQ answer, show it immediately!
    if (instantAnswer) {
      let fullAnswer = instantAnswer;
      if (canRaiseTicket && !fullAnswer.includes('Raise a Support Ticket') && !fullAnswer.includes('raise a ticket')) {
        fullAnswer += `\n\n📌 Need further assistance? You can submit an official complaint on the left panel. Our superiors will review and resolve it within 2 to 4 business working days.`;
      }
      setChat((c) => [
        ...c,
        {
          from: 'agent',
          senderLabel: 'ShopIndia Assistant',
          text: fullAnswer,
          time
        }
      ]);

      // Silently record to backend in background
      api.post('/api/support/chat', { query: q }).catch(() => {});
      return;
    }

    setIsTyping(true);

    try {
      const res = await api.post<{
        answer: string;
        sessionNumber?: string;
        isEscalated?: boolean;
        suggestTicket?: boolean;
        time?: string;
      }>('/api/support/chat', { query: q });

      setIsTyping(false);
      setChat((c) => [
        ...c, 
        { 
          from: 'agent', 
          senderLabel: res.isEscalated ? 'Support Desk' : 'ShopIndia Assistant',
          text: res.answer || 'Thank you for contacting ShopIndia Support. You can select any question below or submit a support ticket on the left.',
          time: res.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
      if (res.isEscalated) {
        setIsAgentConnected(true);
        setConnectedAgentName('Support Specialist (Queued)');
      }
      if (res.sessionNumber) {
        setLiveSessionNumber(res.sessionNumber);
      }
    } catch {
      setIsTyping(false);
      setChat((c) => [
        ...c, 
        { 
          from: 'agent', 
          senderLabel: 'ShopIndia Assistant',
          text: 'Thanks for reaching out! You can choose any common question below or submit an official complaint using the "Raise a Support Ticket" form on the left (SLA: 2–4 business working days).',
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
            label: 'Support Chat', 
            sub: 'Instant Answers & FAQs',
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
        <div 
          ref={ticketSectionRef}
          id="raise-ticket-section" 
          className={`bg-white border rounded-2xl shadow-premium p-5 flex flex-col transition-all duration-500 ${
            highlightForm ? 'ring-4 ring-indigo-500/40 border-indigo-600 shadow-xl' : 'border-brand-border'
          }`}
        >
          <div className="flex items-center justify-between border-b border-brand-border pb-3 mb-4">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                highlightForm ? 'bg-indigo-600 text-white' : 'bg-blue-50 text-brand-blue'
              }`}>
                <Ticket size={16} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-sm text-brand-graphite font-heading">
                    {activeTicket ? 'Ticket Conversation' : 'Raise a Support Ticket'}
                  </h3>
                  {!activeTicket && (
                    <span className="text-[9.5px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                      2–4 Business Days SLA
                    </span>
                  )}
                </div>
                <p className="text-[10.5px] text-brand-slate font-medium">
                  {activeTicket ? `Ticket #${activeTicket.ticketNumber}` : 'Superiors & management review desk'}
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
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[10.5px] text-brand-slate uppercase font-bold">Category: {activeTicket.category}</span>
                  {(activeTicket.order || activeTicket.orderId) && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-brand-blue bg-blue-50 border border-blue-200/60 px-2 py-0.5 rounded-full font-mono">
                      <Package size={10} />
                      <span>Order #{activeTicket.order?.orderNumber || activeTicket.orderId?.slice(-6)}</span>
                    </span>
                  )}
                </div>
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

              {/* Associated Order Dropdown */}
              {orders && orders.length > 0 && (
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[10.5px] font-black uppercase text-brand-slate font-heading flex items-center gap-1.5">
                      <Package size={12} className="text-brand-blue" />
                      <span>Associated Order (Optional)</span>
                    </label>
                    {ticketForm.orderId && (
                      <button
                        type="button"
                        onClick={() => setTicketForm(prev => ({ ...prev, orderId: '' }))}
                        className="text-[10px] text-brand-slate hover:text-red-500 font-bold underline cursor-pointer"
                      >
                        Clear Order
                      </button>
                    )}
                  </div>
                  <div className="relative w-full">
                    <select 
                      className={selectCls} 
                      value={ticketForm.orderId} 
                      onChange={(e) => {
                        const selectedId = e.target.value;
                        const found = orders.find(o => o.id === selectedId);
                        setTicketForm(prev => ({
                          ...prev,
                          orderId: selectedId,
                          subject: found && (!prev.subject || prev.subject.startsWith('Issue with Order #'))
                            ? `Issue with Order #${found.orderNumber || found.id.slice(-6)}`
                            : prev.subject,
                          category: prev.category === 'other' ? 'order_issue' : prev.category
                        }));
                      }}
                    >
                      <option value="">-- No specific order (General inquiry) --</option>
                      {orders.map((o) => {
                        const num = o.orderNumber || `OD-${o.id.slice(-6)}`;
                        const firstItem = o.items?.[0]?.product?.title || (o.items?.[0]?.product as any)?.name || 'Items';
                        const moreCount = (o.items?.length || 0) - 1;
                        const itemsSummary = moreCount > 0 ? `${firstItem} +${moreCount} more` : firstItem;
                        return (
                          <option key={o.id} value={o.id}>
                            #{num} — {itemsSummary} (₹{o.total}) • [{o.status?.toUpperCase()}]
                          </option>
                        );
                      })}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-brand-slate">
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </div>

                  {/* Selected order summary badge */}
                  {selectedOrder && (
                    <div className="p-2.5 bg-blue-50/70 border border-blue-200/80 rounded-xl text-xs flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-brand-graphite font-heading">
                            Order #{selectedOrder.orderNumber || selectedOrder.id.slice(-6)}
                          </span>
                          <span className="text-[9.5px] uppercase font-bold text-emerald-700 bg-emerald-100/80 px-1.5 py-0.5 rounded">
                            {selectedOrder.status}
                          </span>
                        </div>
                        <p className="text-[10.5px] text-brand-slate">
                          {selectedOrder.items?.map(it => `${it.product?.title || (it.product as any)?.name || 'Item'} (x${it.quantity})`).join(', ') || 'Order items'}
                        </p>
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <span className="font-mono font-black text-brand-blue block">₹{selectedOrder.total}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-col gap-1">
                <label className="text-[10.5px] font-black uppercase text-brand-slate font-heading">Issue Subject</label>
                <input 
                  ref={subjectInputRef}
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
                          {(t.order?.orderNumber || t.orderId) && (
                            <span className="text-[9px] font-bold text-brand-slate bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200 font-mono">
                              #{t.order?.orderNumber || t.orderId.slice(-6)}
                            </span>
                          )}
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

        {/* Right Column: Support Chat & FAQ Knowledge Base */}
        <div className="bg-white border border-brand-border rounded-2xl shadow-premium flex flex-col overflow-hidden">
          {/* Chat Header */}
          <div className="bg-gradient-to-r from-[#0F2C59] to-[#1E3E62] text-white px-5 py-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-extrabold font-heading tracking-wide">Support Chat</p>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Online" />
                  {liveSessionNumber && (
                    <span className="text-[9px] font-mono font-bold bg-white/15 px-1.5 py-0.5 rounded text-white/90">
                      #{liveSessionNumber}
                    </span>
                  )}
                </div>
                <p className="text-[10.5px] text-white/70">
                  {isAgentConnected ? `Connected with ${connectedAgentName || 'Specialist'}` : 'Instant answers for Shop India, Quick & Glacons Services'}
                </p>
              </div>
            </div>

            {isAgentConnected ? (
              <span className="text-[10px] bg-blue-500/30 text-blue-200 font-bold px-2.5 py-0.5 rounded-full border border-blue-400/40 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Specialist Online</span>
              </span>
            ) : (
              <span className="text-[10px] bg-emerald-400/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-400/30">
                Online
              </span>
            )}
          </div>

          {/* Chat Timeline (Container-scoped scroll only) */}
          <div 
            ref={chatContainerRef}
            className="flex-1 p-4 space-y-3 min-h-[300px] max-h-[380px] overflow-y-auto bg-slate-50/40 text-xs"
          >
            {chat.map((m, i) => {
              const showTicketButton = m.from !== 'me' && (
                m.text.includes('Raise a Support Ticket') ||
                m.text.includes('raise a ticket') ||
                m.text.includes('support ticket') ||
                m.text.includes('official complaint')
              );

              return (
                <div key={m.id || i} className={`flex ${m.from === 'me' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed shadow-xs ${
                      m.from === 'me' 
                        ? 'bg-brand-blue text-white rounded-br-none' 
                        : 'bg-white border border-brand-border text-brand-graphite rounded-bl-none'
                    }`}
                  >
                    {m.from !== 'me' && m.senderLabel && (
                      <span className="text-[9.5px] font-black uppercase text-brand-blue block mb-1 tracking-wider">
                        {m.senderLabel}
                      </span>
                    )}
                    <p className="font-semibold whitespace-pre-wrap">{m.text}</p>
                    
                    {/* One-click Action to Focus & Pre-populate Ticket Form */}
                    {showTicketButton && (
                      <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[9.5px] text-slate-500 font-medium flex items-center gap-1">
                          <Clock size={11} className="text-indigo-600 shrink-0" />
                          <span>2–4 business working days SLA</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => handleFocusTicketForm('Support Request from Chat', 'order_issue')}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#0F2C59] text-white rounded-lg text-[10.5px] font-bold hover:bg-[#1E3E62] transition-colors cursor-pointer shadow-2xs"
                        >
                          <FileText size={11} />
                          <span>Raise Support Ticket</span>
                        </button>
                      </div>
                    )}

                    {m.time && (
                      <span className={`text-[9px] block mt-1 ${m.from === 'me' ? 'text-blue-100 text-right' : 'text-slate-400'}`}>
                        {m.time}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {isTyping && (
              <div className="flex items-center gap-1.5 bg-white border border-brand-border rounded-full px-3 py-1.5 w-max text-slate-400 text-[10px] shadow-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-blue animate-bounce" />
                <span className="w-1.5 h-1.5 rounded-full bg-brand-blue animate-bounce [animation-delay:0.2s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-brand-blue animate-bounce [animation-delay:0.4s]" />
                <span className="font-bold ml-1 text-slate-500">Support Assistant is typing...</span>
              </div>
            )}
          </div>

          {/* FAQ Category Pills */}
          <div className="px-3 pt-2 pb-1 bg-slate-50 border-t border-brand-border flex items-center gap-1 overflow-x-auto no-scrollbar">
            <span className="text-[10px] font-extrabold uppercase text-slate-400 mr-1 shrink-0">Topics:</span>
            {faqCategories.map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedFaqCat(cat)}
                className={`shrink-0 text-[10px] font-bold px-2.5 py-0.5 rounded-full transition-all cursor-pointer ${
                  selectedFaqCat === cat
                    ? 'bg-[#0F2C59] text-white shadow-2xs'
                    : 'bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Interactive Question Chips */}
          <div className="px-3 py-2 bg-slate-100/70 border-t border-brand-border/60 flex gap-1.5 overflow-x-auto no-scrollbar">
            {(faqsList.length > 0 ? faqsList : [
              { question: 'When will my Shop India order be delivered?', answer: 'Standard Shop India orders are dispatched via our verified logistics partners and delivered within 2 to 5 business working days depending on your pin code.', category: 'Shop India' },
              { question: 'How fast is Quick Shopping delivery?', answer: 'Quick Shopping grocery and food orders are delivered within 10 to 20 minutes from our nearest local dark stores and vendor hubs by dedicated express delivery partners.', category: 'Quick Shopping' },
              { question: 'Is there a warranty or guarantee on Glacons repairs?', answer: 'Yes! All appliance and home services booked through ShopIndia include a complete 30-Day Guarantee. If you experience any issues with the serviced appliance within 30 days, we provide a 100% free technician revisit.', category: 'Glacons Services' },
              { question: 'How long does a refund take to reach my bank account?', answer: 'Once approved, refunds are credited back to your original payment method (UPI / Cards / Netbanking) within 2 to 4 business working days. UPI and wallet refunds typically reflect within 2 to 4 hours.', category: 'Refunds & Payments', canRaiseTicket: true },
              { question: 'How do I escalate an issue to Shop India superiors?', answer: 'To ensure formal management tracking and priority review, please submit your complaint using the "Raise a Support Ticket" form on the left. Higher-level support executives and desk supervisors review all escalated tickets and resolve them within 2 to 4 business working days.', category: 'Superiors & Tickets', canRaiseTicket: true }
            ])
              .filter(f => selectedFaqCat === 'All' || f.category === selectedFaqCat)
              .map(faq => (
                <button
                  key={faq.id || faq.question}
                  type="button"
                  onClick={() => sendChat(undefined, faq.question, faq.answer, faq.canRaiseTicket, faq.ticketSubject)}
                  className="shrink-0 text-[10.5px] font-semibold bg-white hover:bg-blue-50 text-brand-slate hover:text-brand-blue border border-brand-border px-3 py-1 rounded-full shadow-2xs transition-colors cursor-pointer"
                >
                  {faq.question}
                </button>
              ))}
          </div>

          {/* Chat Input Form */}
          <form id="chat-form" onSubmit={(e) => sendChat(e)} className="p-3 border-t border-brand-border flex gap-2 bg-white">
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
          {(faqsList.length > 0 ? faqsList.map(f => ({ q: f.question, a: f.answer })) : INITIAL_FAQS).map((f) => (
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