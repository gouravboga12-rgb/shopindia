import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, HelpCircle, Ticket, CheckCircle2, 
  Bot, X, ArrowLeft, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../lib/api';
import { useSocketEvent } from '../../lib/socket';

interface Message {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
  suggestTicket?: boolean;
}

interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

const DEFAULT_FAQS: FaqItem[] = [
  {
    id: 'book',
    question: '🛠️ How to book a service?',
    answer: 'Select any service package from the catalog, choose your preferred date and time slot, and tap "Book Service Now". A certified expert technician will be assigned to your doorstep.'
  },
  {
    id: 'reschedule',
    question: '⏱️ Can I reschedule my slot?',
    answer: 'Yes! Rescheduling is free of charge up to 2 hours prior to the scheduled slot from your Orders dashboard or via customer support.'
  },
  {
    id: 'pricing',
    question: '💰 What are the inspection charges?',
    answer: 'We provide 100% upfront transparent pricing. A nominal inspection fee of ₹199 applies only if you choose not to proceed with the repair.'
  },
  {
    id: 'warranty',
    question: '🛡️ Is there a service warranty?',
    answer: 'Every service booked on ShopIndia comes with a 30-Day Service Warranty with free technician revisit for complete peace of mind.'
  },
  {
    id: 'technician',
    question: '👨‍🔧 Are technicians certified?',
    answer: 'All our service partners are background-verified, skill-tested, and certified with strict safety protocols.'
  }
];

export const ServiceQuickSupport: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'assistant' | 'my_tickets'>('assistant');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'bot',
      text: 'Hi! 👋 Welcome to ShopIndia Service Assistant. How can we help you with your home services today?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      suggestTicket: false
    }
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [ticketSubmitting, setTicketSubmitting] = useState(false);
  const [ticketSuccess, setTicketSuccess] = useState<any | null>(null);
  
  // My tickets state
  const [myTickets, setMyTickets] = useState<any[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [activeTicketThread, setActiveTicketThread] = useState<any | null>(null);
  const [replyInput, setReplyInput] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [searchTicketNo, setSearchTicketNo] = useState('');

  // Ticket form state
  const [ticketForm, setTicketForm] = useState({
    subject: '',
    category: 'other',
    priority: 'medium',
    message: '',
    name: '',
    phone: '',
    email: ''
  });

  const chatEndRef = useRef<HTMLDivElement>(null);
  const threadEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeTicketThread?.messages, sendingReply]);

  const loadMyTickets = async () => {
    setLoadingTickets(true);
    try {
      const res = await api.get<{ tickets: any[] }>('/api/support/tickets');
      setMyTickets(res.tickets || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingTickets(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'my_tickets') {
      loadMyTickets();
    }
  }, [activeTab]);

  const handleSelectFaq = (faq: FaqItem) => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: Message = {
      id: 'usr-' + Date.now(),
      sender: 'user',
      text: faq.question.replace(/^[^\w\s]+/, '').trim(),
      timestamp: time
    };

    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      const botMsg: Message = {
        id: 'bot-' + Date.now(),
        sender: 'bot',
        text: faq.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestTicket: true
      };
      setMessages(prev => [...prev, botMsg]);
    }, 600);
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = inputQuery.trim();
    if (!query) return;

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: Message = {
      id: 'usr-' + Date.now(),
      sender: 'user',
      text: query,
      timestamp: time
    };

    setMessages(prev => [...prev, userMsg]);
    setInputQuery('');
    setIsTyping(true);

    try {
      const res = await api.post<{ answer: string; suggestTicket?: boolean }>('/api/support/chat', { query });
      setIsTyping(false);
      const botMsg: Message = {
        id: 'bot-' + Date.now(),
        sender: 'bot',
        text: res.answer || 'Thank you for reaching out! Our service team is available to assist you.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestTicket: res.suggestTicket ?? true
      };
      setMessages(prev => [...prev, botMsg]);
    } catch {
      setIsTyping(false);
      const botMsg: Message = {
        id: 'bot-' + Date.now(),
        sender: 'bot',
        text: 'Thank you for your inquiry. To get fast human assistance, please raise a support ticket and our specialist will contact you immediately.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestTicket: true
      };
      setMessages(prev => [...prev, botMsg]);
    }
  };

  const handleOpenTicket = (prefillSubject?: string) => {
    setTicketForm(prev => ({
      ...prev,
      subject: prefillSubject || prev.subject || 'Service Assistance Request',
      message: prev.message || (messages.length > 1 ? `Inquiry regarding: ${messages[messages.length - 1].text}` : '')
    }));
    setTicketSuccess(null);
    setTicketModalOpen(true);
  };

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setTicketSubmitting(true);
    try {
      const res = await api.post<{ success: boolean; ticket: any; message: string }>('/api/support/ticket', ticketForm);
      setTicketSubmitting(false);
      if (res.success && res.ticket) {
        setTicketSuccess(res.ticket);
        // Add to myTickets
        setMyTickets(prev => [res.ticket, ...prev]);
        setMessages(prev => [
          ...prev,
          {
            id: 'tkt-conf-' + Date.now(),
            sender: 'bot',
            text: `✅ Ticket #${res.ticket.ticketNumber} created successfully for "${res.ticket.subject}". A specialist has been assigned. You can track & reply under "My Tickets".`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            suggestTicket: false
          }
        ]);
      }
    } catch (err: any) {
      setTicketSubmitting(false);
      alert(err.message || 'Failed to submit ticket. Please try again.');
    }
  };

  // Live polling for Active Ticket Thread (Instant 2-way sync every 2s)
  // Real-time synchronization via WebSockets (zero background polling)
  useSocketEvent('ticket:updated', async (payload: any) => {
    if (activeTab === 'my_tickets') {
      try {
        const res = await api.get<{ tickets: any[] }>('/api/support/tickets');
        if (res.tickets) setMyTickets(res.tickets);
      } catch {}
    }
    if (activeTicketThread) {
      const ticketId = activeTicketThread.id || activeTicketThread.ticketNumber;
      if (payload?.ticketId && (payload.ticketId === activeTicketThread.id || payload.ticketId === activeTicketThread.ticketNumber)) {
        try {
          const res = await api.get<{ ticket: any }>(`/api/support/tickets/${ticketId}`);
          if (res.ticket) setActiveTicketThread(res.ticket);
        } catch {}
      }
    }
  });

  const handleOpenThread = async (ticketId: string) => {
    try {
      const res = await api.get<{ ticket: any }>(`/api/support/tickets/${ticketId}`);
      setActiveTicketThread(res.ticket);
    } catch (e: any) {
      alert(e.message || 'Failed to load ticket thread.');
    }
  };

  const handleCustomerReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyInput.trim() || !activeTicketThread) return;
    const text = replyInput.trim();
    setReplyInput('');

    // Optimistic UI Update: immediately show customer message in thread with 0 lag
    const optimisticMsg = {
      id: 'opt-' + Date.now(),
      senderRole: 'customer',
      text,
      sentAt: new Date().toISOString()
    };

    setActiveTicketThread((prev: any) => ({
      ...prev,
      messages: [...(prev?.messages || []), optimisticMsg]
    }));

    setSendingReply(true);
    try {
      const res = await api.post<{ success: boolean; message: any; ticket: any }>(
        `/api/support/tickets/${activeTicketThread.id || activeTicketThread.ticketNumber}/reply`,
        { text }
      );
      if (res.ticket) {
        setActiveTicketThread(res.ticket);
      }
      loadMyTickets();
    } catch (e: any) {
      alert(e.message || 'Failed to send reply.');
    } finally {
      setSendingReply(false);
    }
  };

  const handleSearchByTicketNo = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchTicketNo.trim().replace(/^#/, '');
    if (!q) return;
    try {
      const res = await api.get<{ tickets: any[] }>(`/api/support/tickets?ticketNumber=${encodeURIComponent(q)}`);
      if (res.tickets && res.tickets.length > 0) {
        setMyTickets(res.tickets);
        setActiveTicketThread(res.tickets[0]);
      } else {
        alert(`No ticket found with ID #${q}`);
      }
    } catch (e: any) {
      alert(e.message || 'Search failed.');
    }
  };

  return (
    <div className="w-full flex flex-col gap-3 my-1">
      {/* Main Support & Chat Container */}
      <div className="w-full bg-white border border-brand-border rounded-2xl shadow-soft overflow-hidden text-left font-sans">
        
        {/* Card Header with Live Support Badge */}
        <div className="bg-gradient-to-r from-amber-700 via-amber-600 to-amber-800 text-white px-4 py-3 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20">
              <Bot size={18} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 leading-none">
                <span className="font-extrabold text-xs font-heading tracking-wide">24/7 Services Support Desk</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Online" />
              </div>
              <span className="text-[10px] text-amber-100 font-medium">Instant AI Answers & Live Ticket Resolution</span>
            </div>
          </div>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => handleOpenTicket()}
            className="px-2.5 py-1.5 bg-white text-amber-800 rounded-lg text-[10.5px] font-extrabold flex items-center gap-1 shadow-sm hover:bg-amber-50 active:scale-95 transition-all font-heading"
          >
            <Ticket size={12} className="text-amber-700" />
            <span>Raise Ticket</span>
          </motion.button>
        </div>

        {/* Navigation Tabs (Assistant vs My Tickets) */}
        <div className="flex items-center bg-amber-50/60 border-b border-amber-100 px-3 pt-2 gap-2">
          <button
            onClick={() => { setActiveTab('assistant'); setActiveTicketThread(null); }}
            className={`px-3.5 py-1.5 text-xs font-extrabold rounded-t-xl transition-all font-heading flex items-center gap-1.5 ${
              activeTab === 'assistant'
                ? 'bg-white text-amber-800 border-t border-x border-amber-200 shadow-xs'
                : 'text-slate-600 hover:text-amber-800'
            }`}
          >
            <Bot size={13} />
            <span>Live Help & FAQs</span>
          </button>

          <button
            onClick={() => setActiveTab('my_tickets')}
            className={`px-3.5 py-1.5 text-xs font-extrabold rounded-t-xl transition-all font-heading flex items-center gap-1.5 relative ${
              activeTab === 'my_tickets'
                ? 'bg-white text-amber-800 border-t border-x border-amber-200 shadow-xs'
                : 'text-slate-600 hover:text-amber-800'
            }`}
          >
            <Ticket size={13} />
            <span>My Tickets & Replies</span>
            {myTickets.length > 0 && (
              <span className="bg-amber-600 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full font-numbers">
                {myTickets.length}
              </span>
            )}
          </button>
        </div>

        {/* TAB 1: AI Assistant & Quick FAQs */}
        {activeTab === 'assistant' && (
          <div>
            {/* Quick Questions Interactive Chips */}
            <div className="p-3 bg-amber-50/20 border-b border-amber-100/60">
              <span className="text-[10px] uppercase font-black tracking-widest text-amber-800 font-heading block mb-2">
                Frequent Inquiries (Tap for Instant Answer)
              </span>
              <div className="flex gap-2 overflow-x-auto no-scrollbar py-0.5 select-none">
                {DEFAULT_FAQS.map(faq => (
                  <button
                    key={faq.id}
                    onClick={() => handleSelectFaq(faq)}
                    className="shrink-0 px-3 py-1.5 bg-white border border-amber-200/80 hover:border-amber-400 hover:bg-amber-50/60 text-slate-800 rounded-full text-xs font-bold transition-all shadow-xs active:scale-95 text-left"
                  >
                    {faq.question}
                  </button>
                ))}
              </div>
            </div>

            {/* Chat Messages Timeline */}
            <div className="p-3.5 flex flex-col gap-2.5 max-h-[220px] overflow-y-auto bg-slate-50/30 text-xs">
              {messages.map(msg => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed shadow-xs ${
                      msg.sender === 'user'
                        ? 'bg-amber-600 text-white rounded-br-none'
                        : 'bg-white text-brand-graphite border border-brand-border/70 rounded-bl-none'
                    }`}
                  >
                    <p className="font-semibold whitespace-pre-wrap">{msg.text}</p>
                    <span className={`text-[9px] block mt-1 ${msg.sender === 'user' ? 'text-amber-100 text-right' : 'text-slate-400'}`}>
                      {msg.timestamp}
                    </span>
                  </div>

                  {/* Suggest Raise Ticket CTA after Bot answer */}
                  {msg.suggestTicket && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-1.5 flex items-center gap-2 bg-white border border-amber-200 rounded-xl p-2 shadow-xs"
                    >
                      <HelpCircle size={13} className="text-amber-600 shrink-0" />
                      <span className="text-[10px] text-slate-600 font-semibold">Need dedicated specialist help?</span>
                      <button
                        onClick={() => handleOpenTicket(msg.text.slice(0, 30))}
                        className="px-2 py-0.5 bg-amber-600 hover:bg-amber-700 text-white rounded-md text-[10px] font-black uppercase tracking-wider ml-auto shrink-0 transition-colors shadow-xs"
                      >
                        Raise Ticket
                      </button>
                    </motion.div>
                  )}
                </div>
              ))}

              {isTyping && (
                <div className="flex items-center gap-1.5 bg-white border border-brand-border/60 rounded-full px-3 py-1.5 w-max text-slate-400 text-[10px] shadow-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-bounce" />
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-bounce [animation-delay:0.2s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-bounce [animation-delay:0.4s]" />
                  <span className="font-bold ml-1 text-slate-500">Assistant is typing...</span>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input Bar */}
            <form onSubmit={handleSendMessage} className="p-2.5 bg-white border-t border-brand-border flex items-center gap-2">
              <input
                type="text"
                placeholder="Ask anything about our services..."
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                className="flex-1 bg-slate-100/80 focus:bg-white border border-transparent focus:border-amber-400 rounded-full px-4 py-2 text-xs font-semibold text-brand-graphite focus:outline-none transition-all placeholder:text-slate-400"
              />
              <button
                type="submit"
                disabled={!inputQuery.trim()}
                className="w-9 h-9 rounded-full bg-amber-600 disabled:bg-slate-200 text-white flex items-center justify-center transition-all shadow-xs hover:bg-amber-700 active:scale-95 shrink-0"
              >
                <Send size={14} />
              </button>
            </form>
          </div>
        )}

        {/* TAB 2: My Tickets & 2-Way Conversations */}
        {activeTab === 'my_tickets' && (
          <div className="p-3 bg-slate-50/50">
            {activeTicketThread ? (
              /* Active Ticket Conversation View */
              <div className="bg-white border border-brand-border rounded-xl p-3 shadow-xs">
                {/* Thread Header */}
                <div className="flex items-center justify-between border-b border-brand-border pb-2.5 mb-2.5">
                  <button
                    onClick={() => setActiveTicketThread(null)}
                    className="flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-amber-800"
                  >
                    <ArrowLeft size={14} />
                    <span>Back to Tickets</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-amber-700">#{activeTicketThread.ticketNumber}</span>
                    <span className={`text-[9.5px] font-black uppercase px-2 py-0.5 rounded-full ${
                      activeTicketThread.status === 'resolved' 
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {activeTicketThread.status}
                    </span>
                    <button onClick={() => handleOpenThread(activeTicketThread.id || activeTicketThread.ticketNumber)} title="Refresh">
                      <RefreshCw size={12} className="text-slate-400 hover:text-slate-600" />
                    </button>
                  </div>
                </div>

                <div className="mb-2">
                  <h4 className="font-bold text-xs text-brand-graphite font-heading">{activeTicketThread.subject}</h4>
                  <span className="text-[10px] text-slate-400 font-medium">Category: {activeTicketThread.category}</span>
                </div>

                {/* Message Thread History */}
                <div className="max-h-[200px] overflow-y-auto space-y-2.5 pr-1 mb-3">
                  {activeTicketThread.messages && activeTicketThread.messages.length > 0 ? (
                    activeTicketThread.messages.map((m: any, idx: number) => {
                      const isCustomer = m.senderRole === 'customer';
                      return (
                        <div
                          key={idx}
                          className={`flex flex-col ${isCustomer ? 'items-end' : 'items-start'}`}
                        >
                          <div
                            className={`max-w-[88%] rounded-xl p-2.5 text-xs ${
                              isCustomer
                                ? 'bg-amber-600 text-white rounded-br-none shadow-xs'
                                : 'bg-slate-100 text-slate-800 border border-slate-200 rounded-bl-none shadow-xs'
                            }`}
                          >
                            <div className="flex justify-between items-center text-[9px] opacity-75 font-bold uppercase mb-1">
                              <span>{isCustomer ? 'You' : 'Support Specialist'}</span>
                              <span className="ml-2 font-mono">{new Date(m.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <p className="font-medium whitespace-pre-wrap">{m.text}</p>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-4 text-slate-400 text-xs">No messages yet.</div>
                  )}
                  <div ref={threadEndRef} />
                </div>

                {/* Reply Back Box */}
                <form onSubmit={handleCustomerReply} className="flex gap-1.5 pt-2 border-t border-brand-border">
                  <input
                    type="text"
                    placeholder="Type your reply to support..."
                    value={replyInput}
                    onChange={(e) => setReplyInput(e.target.value)}
                    className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:bg-white focus:border-amber-500"
                  />
                  <button
                    type="submit"
                    disabled={sendingReply || !replyInput.trim()}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-200 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-all"
                  >
                    <Send size={12} />
                    <span>Reply</span>
                  </button>
                </form>
              </div>
            ) : (
              /* Ticket List & Lookup View */
              <div className="space-y-3">
                {/* Search Ticket by ID bar */}
                <form onSubmit={handleSearchByTicketNo} className="flex gap-1.5">
                  <input
                    type="text"
                    placeholder="Enter Ticket ID (e.g. 849201)..."
                    value={searchTicketNo}
                    onChange={(e) => setSearchTicketNo(e.target.value)}
                    className="flex-1 px-3 py-1.5 bg-white border border-brand-border rounded-xl text-xs font-semibold focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold font-heading"
                  >
                    Track
                  </button>
                </form>

                {/* Ticket Cards */}
                {loadingTickets ? (
                  <div className="py-6 text-center text-xs text-slate-400 font-bold">Loading your tickets...</div>
                ) : myTickets.length === 0 ? (
                  <div className="bg-white border border-brand-border rounded-xl p-5 text-center flex flex-col items-center gap-2">
                    <Ticket size={24} className="text-slate-300" />
                    <span className="text-xs font-bold text-slate-600">No raised tickets yet</span>
                    <p className="text-[10.5px] text-slate-400 max-w-xs">
                      If you need help with an existing booking or service, click "Raise Ticket" above.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {myTickets.map(t => {
                      const id = t.id || t.ticketNumber;
                      const msgCount = t.messages?.length || 1;
                      const hasSupportReply = t.messages?.some((m: any) => m.senderRole !== 'customer');

                      return (
                        <div
                          key={id}
                          onClick={() => handleOpenThread(id)}
                          className="bg-white border border-brand-border hover:border-amber-400 rounded-xl p-3 cursor-pointer transition-all shadow-xs hover:shadow-sm text-left flex justify-between items-center group"
                        >
                          <div className="flex-1 pr-2">
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className="font-mono text-xs font-bold text-amber-700">#{t.ticketNumber}</span>
                              <span className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded-full ${
                                t.status === 'resolved' 
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}>
                                {t.status}
                              </span>
                              {hasSupportReply && (
                                <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                                  New Reply!
                                </span>
                              )}
                            </div>
                            <h5 className="font-bold text-xs text-brand-graphite line-clamp-1 group-hover:text-amber-800 transition-colors font-heading">
                              {t.subject}
                            </h5>
                            <span className="text-[10px] text-slate-400 font-medium">
                              {new Date(t.createdAt).toLocaleDateString('en-IN')} · {msgCount} messages
                            </span>
                          </div>

                          <button className="px-2.5 py-1 bg-amber-50 text-amber-800 group-hover:bg-amber-600 group-hover:text-white rounded-lg text-[10.5px] font-extrabold transition-colors shrink-0 font-heading">
                            View & Reply →
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Raise Ticket Modal / Dialog */}
      <AnimatePresence>
        {ticketModalOpen && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs text-left">
            <div className="absolute inset-0" onClick={() => setTicketModalOpen(false)} />
            
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-md p-5 shadow-elevated border border-brand-border relative z-10 overflow-hidden"
            >
              {/* Modal Header */}
              <div className="flex justify-between items-center border-b border-brand-border pb-3 mb-4 leading-none">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                    <Ticket size={16} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-brand-graphite font-heading">Raise a Service Ticket</h3>
                    <p className="text-[10.5px] text-slate-400 font-medium">A support technician will follow up within 2 hours</p>
                  </div>
                </div>
                <button
                  onClick={() => setTicketModalOpen(false)}
                  className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
                >
                  <X size={14} />
                </button>
              </div>

              {ticketSuccess ? (
                <div className="py-6 flex flex-col items-center text-center gap-3">
                  <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-soft">
                    <CheckCircle2 size={32} />
                  </div>
                  <h4 className="font-black text-base text-brand-graphite font-heading">Ticket Successfully Raised!</h4>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 w-full text-xs font-mono font-bold text-slate-700">
                    Ticket ID: <span className="text-amber-600 font-extrabold">#{ticketSuccess.ticketNumber}</span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium max-w-xs leading-relaxed">
                    Our certified service support desk has received your issue. You can track this ticket and chat with support under "My Tickets & Replies".
                  </p>
                  <button
                    onClick={() => {
                      setTicketModalOpen(false);
                      setActiveTab('my_tickets');
                      handleOpenThread(ticketSuccess.id || ticketSuccess.ticketNumber);
                    }}
                    className="w-full py-2.5 bg-amber-600 text-white font-extrabold text-xs rounded-xl uppercase tracking-wider hover:bg-amber-700 transition-colors mt-2 font-heading"
                  >
                    View Ticket & Conversation
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmitTicket} className="space-y-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 font-heading">Subject / Issue Title</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g., AC not cooling / Booking reschedule needed"
                      value={ticketForm.subject}
                      onChange={(e) => setTicketForm(prev => ({ ...prev, subject: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:bg-white focus:border-amber-500 transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 font-heading">Service Category</label>
                      <select
                        value={ticketForm.category}
                        onChange={(e) => setTicketForm(prev => ({ ...prev, category: e.target.value }))}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:bg-white focus:border-amber-500 transition-all"
                      >
                        <option value="other">General Service Issue</option>
                        <option value="order_issue">Booking / Slot Issue</option>
                        <option value="product">Technician / Repair Quality</option>
                        <option value="payment">Payment & Invoice</option>
                        <option value="refund">Warranty & Refund</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 font-heading">Urgency</label>
                      <select
                        value={ticketForm.priority}
                        onChange={(e) => setTicketForm(prev => ({ ...prev, priority: e.target.value }))}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:bg-white focus:border-amber-500 transition-all capitalize"
                      >
                        <option value="low">Standard</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 font-heading">Your Name</label>
                      <input
                        type="text"
                        placeholder="Your full name"
                        value={ticketForm.name}
                        onChange={(e) => setTicketForm(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:bg-white focus:border-amber-500 transition-all"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 font-heading">Mobile Number</label>
                      <input
                        type="tel"
                        placeholder="10-digit number"
                        value={ticketForm.phone}
                        onChange={(e) => setTicketForm(prev => ({ ...prev, phone: e.target.value }))}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:bg-white focus:border-amber-500 transition-all"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 font-heading">Describe Your Issue in Detail</label>
                    <textarea
                      required
                      rows={3}
                      placeholder="Please explain what you need help with..."
                      value={ticketForm.message}
                      onChange={(e) => setTicketForm(prev => ({ ...prev, message: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:bg-white focus:border-amber-500 transition-all resize-none"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={ticketSubmitting}
                      className="w-full py-3 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-300 text-white font-extrabold text-xs rounded-xl uppercase tracking-wider shadow-sm transition-all active:scale-95 flex items-center justify-center gap-2 font-heading"
                    >
                      {ticketSubmitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Submitting Ticket...</span>
                        </>
                      ) : (
                        <>
                          <Send size={13} />
                          <span>Submit Support Ticket</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
