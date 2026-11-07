import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import {
  Headphones, Send, CheckCircle2, Mail, Copy,
  Phone, Clock, MessageSquareText
} from 'lucide-react';

interface InquiryItem {
  id: string;
  ticketNumber: string;
  subject: string;
  category: string;
  status: string;
  createdAt: string;
  messages: Array<{
    id: string;
    senderRole: string;
    text: string;
    sentAt: string;
  }>;
}

export const VendorSupport: React.FC = () => {
  const [inquiries, setInquiries] = useState<InquiryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Form State
  const [category, setCategory] = useState('payment');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const loadInquiries = async () => {
    try {
      const res: any = await api.get('/api/vendor/support/tickets');
      if (res?.tickets) {
        setInquiries(res.tickets);
      }
    } catch (err) {
      console.error('Error loading inquiries:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInquiries();
  }, []);

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
        setSuccessMsg(`Ticket #${res.ticket?.ticketNumber || 'ADM'} submitted successfully! Shop India Support will review and reply promptly.`);
        setSubject('');
        setMessage('');
        loadInquiries();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to submit ticket');
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2500);
  };

  return (
    <div className="space-y-6 font-sans max-w-5xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200/80 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
            <Headphones className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900 font-heading">Partner Support Desk</h1>
            <p className="text-xs text-gray-500 font-medium">
              Direct assistance for your store, orders, payouts, and deliveries
            </p>
          </div>
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold self-start sm:self-auto">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Support Hours: 9:00 AM – 8:00 PM</span>
        </div>
      </div>

      {/* Direct Contact Cards (2 Columns: Phone & Email) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Direct Phone Support */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200/90 shadow-sm flex flex-col justify-between space-y-4 hover:border-emerald-300 transition-all">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                <Phone className="w-4 h-4" />
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider">
                Direct Helpline
              </span>
            </div>

            <div>
              <h3 className="text-sm font-bold text-gray-900">Direct Phone Support</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Call our merchant helpline directly for urgent store, order, or payout concerns.
              </p>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between font-mono font-bold text-slate-800 text-sm">
              <span>+91 7386570555</span>
              <button
                type="button"
                onClick={() => copyToClipboard('7386570555', 'phone')}
                className="text-xs font-sans text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1"
                title="Copy Number"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copiedField === 'phone' ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>
          </div>

          <a
            href="tel:+917386570555"
            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all"
          >
            <Phone className="w-3.5 h-3.5" />
            <span>Call Helpline</span>
          </a>
        </div>

        {/* Card 2: Official Support Email */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200/90 shadow-sm flex flex-col justify-between space-y-4 hover:border-blue-300 transition-all">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                <Mail className="w-4 h-4" />
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-black uppercase tracking-wider">
                Official Email
              </span>
            </div>

            <div>
              <h3 className="text-sm font-bold text-gray-900">Email Support Desk</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                For formal paperwork, tax invoices, bank updates, and written documentation.
              </p>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between font-mono font-bold text-slate-800 text-xs truncate">
              <span className="truncate">shopindia.info.co.in@gmail.com</span>
              <button
                type="button"
                onClick={() => copyToClipboard('shopindia.info.co.in@gmail.com', 'email')}
                className="text-xs font-sans text-blue-700 hover:text-blue-800 font-bold flex items-center gap-1 shrink-0 ml-2"
                title="Copy Email"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copiedField === 'email' ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>
          </div>

          <a
            href="mailto:shopindia.info.co.in@gmail.com?subject=Merchant%20Support%20Inquiry%20-%20ShopIndia"
            className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all"
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Open Email</span>
          </a>
        </div>
      </div>

      {/* Main Section: Ticket Submission & Active Tickets */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left Column (3 cols): Raise a Ticket Form */}
        <div className="lg:col-span-3">
          <div className="bg-white p-6 rounded-2xl border border-gray-200/90 shadow-sm space-y-4">
            <div className="border-b border-gray-100 pb-3">
              <h2 className="text-base font-bold text-gray-900 font-heading">Raise a Support Ticket</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Submit an inquiry and our partner support team will evaluate and update you promptly.
              </p>
            </div>

            {successMsg && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-xs text-emerald-800 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmitInquiry} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Issue Category</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                >
                  <option value="payment">💰 Payouts, Wallet & Bank Sync</option>
                  <option value="delivery">🚚 Store Pickup & Delivery Partner Coordination</option>
                  <option value="product">📦 Product Catalog, Pricing & Stock Approvals</option>
                  <option value="order_issue">📦 Order Issue & Customer Queries</option>
                  <option value="other">💬 General Merchant Policy & Inquiry</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Subject / Reference</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. UTR status for payout of ₹1,200 or store pickup assistance"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Detailed Message</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Describe your issue with exact details (order numbers, payout amount, date requested, or question)..."
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-xs font-normal text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-gray-400 font-medium">
                  Response SLA: Within 1–2 business hours
                </span>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-sm transition-all"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submitting ? 'Submitting...' : 'Submit Ticket'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column (2 cols): Your Tickets & Status */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-200/90 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-3 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <MessageSquareText className="w-4 h-4 text-emerald-600" />
                <span>Your Support Tickets</span>
              </span>
              <span className="text-[11px] font-mono font-bold text-gray-400">
                {inquiries.length} {inquiries.length === 1 ? 'Ticket' : 'Tickets'}
              </span>
            </h3>

            {loading ? (
              <div className="py-10 text-center text-xs text-gray-400">Loading tickets...</div>
            ) : inquiries.length === 0 ? (
              <div className="py-10 text-center text-xs text-gray-400 space-y-2">
                <Clock className="w-6 h-6 mx-auto text-gray-300" />
                <p>No active support tickets.</p>
                <p className="text-[11px] text-gray-400">When you raise a ticket, updates and replies from Shop India Support will appear here.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {inquiries.map(inq => (
                  <div key={inq.id} className="p-3.5 rounded-xl border border-gray-200/80 bg-slate-50/60 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                          #{inq.ticketNumber}
                        </span>
                        <h4 className="text-xs font-bold text-gray-900 mt-1 line-clamp-1">{inq.subject}</h4>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[9.5px] font-bold uppercase tracking-wider shrink-0 ${
                        inq.status === 'resolved' || inq.status === 'closed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : inq.status === 'in_progress'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {inq.status === 'open' ? 'Pending Review' : inq.status === 'in_progress' ? 'In Progress' : inq.status}
                      </span>
                    </div>

                    {inq.messages?.length > 0 && (
                      <div className="space-y-1.5 pt-2 border-t border-gray-200/60">
                        {inq.messages.map(m => (
                          <div
                            key={m.id}
                            className={`p-2 rounded-lg text-xs leading-relaxed ${
                              m.senderRole === 'vendor'
                                ? 'bg-white border border-gray-200 text-gray-700'
                                : 'bg-emerald-50 border border-emerald-200 text-emerald-950 font-medium'
                            }`}
                          >
                            <span className="font-bold text-[10px] uppercase tracking-wider block text-gray-400 mb-0.5">
                              {m.senderRole === 'vendor' ? 'You' : 'Shop India Support'}
                            </span>
                            {m.text}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
