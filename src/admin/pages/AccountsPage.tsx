import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import {
  Users, Search, Zap, RefreshCw, FileText,
  AlertTriangle, SlidersHorizontal
} from 'lucide-react';

interface AccountItem {
  id: string;
  partyType: 'VENDOR' | 'RIDER';
  partnerRole?: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  city: string;
  walletBalance: number;
  commissionRate?: number;
  kycStatus: string;
  bankDetails: {
    accountHolder?: string;
    accountNumber?: string;
    ifsc?: string;
    bankName?: string;
    upiId?: string;
  };
  totalOrders: number;
  codFloat?: number;
}

interface AccountsPageProps {
  onOpenStatement: (partyType: string, partyId: string, name: string) => void;
}

export const AccountsPage: React.FC<AccountsPageProps> = ({ onOpenStatement }) => {
  const [filterType, setFilterType] = useState<'all' | 'vendor' | 'rider'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Manual Adjustment Modal State
  const [activeAccountForAdj, setActiveAccountForAdj] = useState<AccountItem | null>(null);
  const [adjAmount, setAdjAmount] = useState<string>('');
  const [adjType, setAdjType] = useState<'CREDIT' | 'DEBIT'>('CREDIT');
  const [adjReason, setAdjReason] = useState<string>('');
  const [adjusting, setAdjusting] = useState<boolean>(false);
  const [adjMessage, setAdjMessage] = useState<{ text: string; isError?: boolean } | null>(null);

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const res: any = await api.get(`/api/admin/payouts/accounts?type=${filterType}&search=${encodeURIComponent(searchQuery)}`);
      if (res?.accounts) setAccounts(res.accounts);
    } catch (err) {
      console.error('Failed to load accounts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(loadAccounts, 300);
    return () => clearTimeout(timer);
  }, [filterType, searchQuery]);

  const handlePostAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAccountForAdj || !adjAmount || !adjReason.trim()) return;

    try {
      setAdjusting(true);
      setAdjMessage(null);
      const res: any = await api.post('/api/admin/payouts/manual-adjustment', {
        partyType: activeAccountForAdj.partyType,
        partyId: activeAccountForAdj.id,
        amount: parseFloat(adjAmount),
        type: adjType,
        reason: adjReason.trim(),
      });

      if (res?.success) {
        setAdjMessage({ text: res.message || 'Manual adjustment posted successfully!' });
        setActiveAccountForAdj(null);
        setAdjAmount('');
        setAdjReason('');
        loadAccounts();
      }
    } catch (err: any) {
      setAdjMessage({ text: err.message || 'Failed to post adjustment.', isError: true });
    } finally {
      setAdjusting(false);
    }
  };

  const formatINR = (val?: number) => `₹${(val || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-heading flex items-center gap-2">
            <Users className="w-6 h-6 text-emerald-600" />
            Partner Accounts Directory & Balances
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Complete registry of all registered Merchants, Delivery Riders, and Technicians with active ledger balances and verified payout accounts.
          </p>
        </div>

        <button
          onClick={loadAccounts}
          disabled={loading}
          className="p-2 rounded-xl bg-white border border-gray-200 text-gray-600 hover:text-gray-900 shadow-sm transition-all flex items-center gap-2 text-xs font-semibold"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {adjMessage && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center justify-between ${
            adjMessage.isError
              ? 'bg-red-50 text-red-700 border border-red-200'
              : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
          }`}
        >
          <span>{adjMessage.text}</span>
          <button onClick={() => setAdjMessage(null)} className="font-bold underline ml-2">
            Dismiss
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        {/* Tabs */}
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filterType === 'all'
                ? 'bg-[#0F2C59] text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All Partners ({accounts.length})
          </button>
          <button
            onClick={() => setFilterType('vendor')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filterType === 'vendor'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Vendors & Merchants
          </button>
          <button
            onClick={() => setFilterType('rider')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filterType === 'rider'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Riders & Technicians
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search name, phone, city..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Directory Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-gray-400 text-xs flex flex-col items-center justify-center">
            <RefreshCw className="w-6 h-6 animate-spin mb-2 text-emerald-600" />
            Loading partner accounts...
          </div>
        ) : accounts.length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-xs">
            No partner accounts found matching your search.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-600 font-bold border-b border-gray-200">
                <tr>
                  <th className="py-3 px-4">Account / Partner</th>
                  <th className="py-3 px-4">Contact & Location</th>
                  <th className="py-3 px-4">Current Ledger Balance</th>
                  <th className="py-3 px-4">Masked Bank & Fast UPI</th>
                  <th className="py-3 px-4">KYC Status</th>
                  <th className="py-3 px-4 text-right">Passbook & Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {accounts.map((acc) => (
                  <tr key={acc.id} className="hover:bg-gray-50/50">
                    <td className="py-3 px-4">
                      <div className="font-bold text-gray-900">{acc.name}</div>
                      <div className="text-[11px] text-gray-400 flex items-center gap-1.5 mt-0.5">
                        <span className={`px-1.5 py-0.2 rounded font-extrabold text-[9px] uppercase ${
                          acc.partyType === 'VENDOR'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-blue-50 text-blue-700'
                        }`}>
                          {acc.partyType}
                        </span>
                        {acc.partnerRole && <span>({acc.partnerRole})</span>}
                        <span>• {acc.totalOrders} orders</span>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="text-gray-700">{acc.phone || '—'}</div>
                      <div className="text-[11px] text-gray-400">{acc.city}</div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-black text-gray-900 text-sm">
                        {formatINR(acc.walletBalance)}
                      </div>
                      {acc.codFloat != null && acc.codFloat > 0 && (
                        <div className="text-[10px] text-amber-600 font-semibold">
                          COD Float: {formatINR(acc.codFloat)}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      {acc.bankDetails?.upiId && (
                        <div className="font-mono text-emerald-700 font-bold text-[11px] flex items-center gap-1">
                          <Zap className="w-3 h-3 text-emerald-600" />
                          {acc.bankDetails.upiId}
                        </div>
                      )}
                      {acc.bankDetails?.accountNumber && (
                        <div className="text-gray-500 text-[11px] font-mono">
                          {acc.bankDetails.bankName || 'Bank'}: {acc.bankDetails.accountNumber}
                        </div>
                      )}
                      {!acc.bankDetails?.upiId && !acc.bankDetails?.accountNumber && (
                        <span className="text-gray-400 italic">No bank saved</span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        acc.kycStatus === 'approved'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}>
                        {acc.kycStatus}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onOpenStatement(acc.partyType, acc.id, acc.name)}
                          className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-[11px] shadow-2xs transition-all flex items-center gap-1"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          Statement
                        </button>

                        <button
                          onClick={() => {
                            setActiveAccountForAdj(acc);
                            setAdjAmount('');
                            setAdjType('CREDIT');
                            setAdjReason('');
                          }}
                          className="px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 font-semibold text-[11px] transition-all"
                          title="Post Audited Manual Adjustment"
                        >
                          Adjust
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: AUDITED MANUAL ADJUSTMENT */}
      {activeAccountForAdj && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="font-bold text-base text-gray-900 flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-amber-600" />
                Post Manual Ledger Adjustment
              </h3>
              <button
                onClick={() => setActiveAccountForAdj(null)}
                className="text-gray-400 hover:text-gray-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-gray-50 rounded-xl space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Partner:</span>
                <span className="font-bold text-gray-900">{activeAccountForAdj.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Current Balance:</span>
                <span className="font-bold text-emerald-700">{formatINR(activeAccountForAdj.walletBalance)}</span>
              </div>
            </div>

            <form onSubmit={handlePostAdjustment} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Adjustment Type *</label>
                  <select
                    value={adjType}
                    onChange={(e: any) => setAdjType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  >
                    <option value="CREDIT">CREDIT (+) Add to Wallet</option>
                    <option value="DEBIT">DEBIT (-) Deduct from Wallet</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Amount (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="e.g. 500"
                    value={adjAmount}
                    onChange={(e) => setAdjAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Mandatory Business Reason *</label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. Compensation for lost delivery package #ORD-9281, bonus incentive, or manual dispute settlement..."
                  value={adjReason}
                  onChange={(e) => setAdjReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="p-3 bg-amber-50 rounded-xl text-[11px] text-amber-800 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <span>
                  This will write an immutable record directly into the double-entry ledger with an audit trail citing your admin footprint.
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveAccountForAdj(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adjusting || !adjAmount || !adjReason.trim()}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-sm transition-all disabled:opacity-50"
                >
                  {adjusting ? 'Posting...' : 'Post Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
