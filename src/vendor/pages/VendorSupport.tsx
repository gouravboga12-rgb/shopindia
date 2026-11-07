import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import {
  Headphones, MessageSquare, Send,
  CheckCircle2, Mail, ExternalLink, Zap, Copy,
  FileText, PhoneOff, ArrowUpRight
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

  // Form State
  const [category, setCategory] = useState('payout');
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
        setSuccessMsg(`Inquiry #${res.ticket?.ticketNumber || 'ADM'} submitted successfully! Admin will respond within 2-4 business hours.`);
        setSubject('');
        setMessage('');
        loadInquiries();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to submit inquiry');
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard?.writeText(text);
    alert(`Copied ${label}: ${text}`);
  };

  return (
    <div className="space-y-8 font-sans max-w-6xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-black text-gray-900 font-heading">Admin Help Desk</h1>
              <p className="text-xs text-gray-500 font-medium">
                Direct escalation channels with ShopIndia platform administration & finance desk
              </p>
            </div>
          </div>
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold">
          <PhoneOff className="w-4 h-4 text-amber-600 shrink-0" />
          <span>Strictly No Phone Calls • WhatsApp & Email Only</span>
        </div>
      </div>

      {/* Direct Escalation Channels Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Channel 1: Super Admin Finance Desk */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-premium flex flex-col justify-between space-y-4 hover:border-emerald-200 transition-all">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                <Zap className="w-4 h-4" />
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider">
                Instant Chat
              </span>
            </div>

            <div>
              <h3 className="text-sm font-bold text-gray-900">Finance & Payouts Desk</h3>
              <p className="text-xs text-gray-500 mt-1">
                For UTR disbursement status, bank sync verification, and settlement ledger inquiries.
              </p>
            </div>

            <div className="p-2.5 bg-rose-50 border border-rose-200/80 rounded-xl flex items-center gap-2 text-[11px] text-rose-800 font-bold">
              <PhoneOff className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              <span>Voice calls strictly not accepted</span>
            </div>
          </div>

          <a
            href="https://wa.me/918073845949?text=Hello%20ShopIndia%20Finance%20Admin%2C%20I%20am%20a%20registered%20merchant%20and%20need%20assistance%20with%20my%20payout%20%2F%20account."
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all"
          >
            <span>Chat on WhatsApp</span>
            <ArrowUpRight className="w-4 h-4" />
          </a>
        </div>

        {/* Channel 2: Regional Logistics Hub */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-premium flex flex-col justify-between space-y-4 hover:border-blue-200 transition-all">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                <MessageSquare className="w-4 h-4" />
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-black uppercase tracking-wider">
                Regional Hub
              </span>
            </div>

            <div>
              <h3 className="text-sm font-bold text-gray-900">3PL & Quick Fleet Desk</h3>
              <p className="text-xs text-gray-500 mt-1">
                For Shiprocket courier pickup delays, delivery rider allocation, and packaging supplies.
              </p>
            </div>

            <div className="p-2.5 bg-rose-50 border border-rose-200/80 rounded-xl flex items-center gap-2 text-[11px] text-rose-800 font-bold">
              <PhoneOff className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              <span>Voice calls strictly not accepted</span>
            </div>
          </div>

          <a
            href="https://wa.me/918073845949?text=Hello%20ShopIndia%20Logistics%20Admin%2C%20I%20need%20help%20with%20a%20store%20pickup%20%2F%20rider%20delivery."
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all"
          >
            <span>Chat on WhatsApp</span>
            <ArrowUpRight className="w-4 h-4" />
          </a>
        </div>

        {/* Channel 3: Official Support Email */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-premium flex flex-col justify-between space-y-4 hover:border-purple-200 transition-all">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
                <Mail className="w-4 h-4" />
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-black uppercase tracking-wider">
                Official Desk
              </span>
            </div>

            <div>
              <h3 className="text-sm font-bold text-gray-900">Email Support Desk</h3>
              <p className="text-xs text-gray-500 mt-1">
                For formal tax disputes, legal documentation, contract updates, and business inquiries.
              </p>
            </div>

            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs font-mono font-bold text-slate-800">
              <span>support@shopindia.in</span>
              <button
                type="button"
                onClick={() => copyToClipboard('support@shopindia.in', 'Support Email')}
                className="p-1 hover:text-purple-700 text-slate-400"
                title="Copy Email"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <a
            href="mailto:support@shopindia.in?subject=Merchant%20Support%20Inquiry%20-%20ShopIndia"
            className="w-full py-2.5 px-4 bg-slate-800 hover:bg-black text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all"
          >
            <span>Open Email Client</span>
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Main Section: 1-Form Inquiry Desk & Notice Board */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2 Cols): Inquiry Submission Form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-premium space-y-5">
            <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-gray-900 font-heading">Submit Inquiry to Super Admin</h2>
                <p className="text-xs text-gray-500">
                  Direct ticket to the platform management board with guaranteed 2-4 hour review
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200">
                SLA: &lt; 4 Hours
              </span>
            </div>

            {successMsg && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-xs text-emerald-800 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmitInquiry} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Inquiry Department / Category</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                >
                  <option value="payout">💰 Wallet & Payout Disbursement (UTR / Banking)</option>
                  <option value="account">🔐 Store Verification & Bank / UPI Details Sync</option>
                  <option value="catalog">📦 Product Catalog, Pricing & Stock Approvals</option>
                  <option value="logistics">🚚 3PL Shiprocket & Hyperlocal Delivery</option>
                  <option value="other">💬 General Merchant Policy & Inquiry</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Subject / Reference</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. UTR status for payout request of ₹1,200 or UPI ID update"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Detailed Message / Request</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Describe your issue with exact details (order numbers, payout amount, date requested, or new bank IFSC/UPI handle)..."
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-xs font-normal text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-gray-400 font-medium">
                  Logged as verified merchant store
                </span>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-sm transition-all"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submitting ? 'Submitting...' : 'Send Inquiry'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Past Inquiries List */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-premium space-y-4">
            <h3 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-3 flex items-center gap-2">
              <FileText className="w-4 h-4 text-gray-400" />
              <span>Your Admin Inquiries & Responses</span>
            </h3>

            {loading ? (
              <div className="py-8 text-center text-xs text-gray-400">Loading inquiries...</div>
            ) : inquiries.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-400">
                No past inquiries submitted. All your requests and responses from Super Admin will appear here.
              </div>
            ) : (
              <div className="space-y-3">
                {inquiries.map(inq => (
                  <div key={inq.id} className="p-4 rounded-xl border border-gray-100 bg-slate-50/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-gray-900">#{inq.ticketNumber}</span>
                        <span className="text-xs font-bold text-gray-700">{inq.subject}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        inq.status === 'resolved' || inq.status === 'closed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : inq.status === 'in_progress'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {inq.status}
                      </span>
                    </div>

                    {inq.messages?.length > 0 && (
                      <div className="text-xs text-gray-600 space-y-1.5 pt-1 border-t border-gray-200/50">
                        {inq.messages.map(m => (
                          <div key={m.id} className={`p-2 rounded-lg text-xs ${
                            m.senderRole === 'vendor' ? 'bg-white border border-gray-200' : 'bg-emerald-50 border border-emerald-200 text-emerald-900 font-medium'
                          }`}>
                            <span className="font-bold text-[10.5px] uppercase tracking-wider block text-gray-400 mb-0.5">
                              {m.senderRole === 'vendor' ? 'You' : 'Admin Desk'}
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

        {/* Right Column (1 Col): Official Admin Policies & Notice Board */}
        <div className="space-y-5">
          {/* Notice Card 1: Strictly No Calls */}
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 space-y-2.5 text-xs text-rose-950 shadow-sm">
            <div className="flex items-center gap-2 font-bold text-rose-900 text-sm">
              <PhoneOff className="w-4 h-4 text-rose-600 shrink-0" />
              <span>Strictly No Phone Calls Policy</span>
            </div>
            <p className="leading-relaxed">
              To eliminate financial discrepancies and ensure every payout request, bank account change, and UTR reference has an <strong>immutable digital paper trail</strong>, voice calls are disabled across all administrative departments.
            </p>
            <p className="font-bold">
              Please submit inquiries via this portal or send a message on WhatsApp for instant verified assistance.
            </p>
          </div>

          {/* Notice Card 2: Vendor Net Protection */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 space-y-2.5 text-xs text-emerald-950 shadow-sm">
            <div className="flex items-center gap-2 font-bold text-emerald-900 text-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Vendor Net Protection Guarantee</span>
            </div>
            <p className="leading-relaxed">
              For all Shop India and Quick Shopping Commerce orders, you receive <strong>100% of your listed product price</strong>.
            </p>
            <div className="p-2.5 bg-white/80 rounded-xl border border-emerald-100 text-[11px] font-mono">
              Your Product Price = ₹60<br/>
              Your Wallet Credit = ₹60 (Zero cuts!)
            </div>
            <p className="text-[11px] text-emerald-800">
              Admin platform commissions are added on top and collected directly from the customer.
            </p>
          </div>

          {/* Notice Card 3: Instant UPI Disbursal */}
          <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-5 space-y-2.5 text-xs text-indigo-950 shadow-sm">
            <div className="flex items-center gap-2 font-bold text-indigo-900 text-sm">
              <Zap className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>Instant UPI Payout Settlements</span>
            </div>
            <p className="leading-relaxed">
              Super Admin supports instant direct transfers to your UPI ID (e.g. yourname@oksbi).
            </p>
            <p className="text-[11px] text-indigo-800">
              To update or verify your UPI handle, navigate to <strong>Store Settings & GPS</strong>. Any open payout requests will automatically synchronize with your updated details.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
