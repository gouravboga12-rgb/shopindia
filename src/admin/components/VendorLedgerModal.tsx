import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Store, RefreshCw, X, Download } from 'lucide-react';

interface VendorLedgerModalProps {
  vendorId: string | null;
  onClose: () => void;
}

export const VendorLedgerModal: React.FC<VendorLedgerModalProps> = ({ vendorId, onClose }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<any | null>(null);
  const [ledgerTab, setLedgerTab] = useState<'orders' | 'payouts'>('orders');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!vendorId) return;
    setLoading(true);
    setError(null);
    api.get<any>(`/api/admin/payouts/vendor/${vendorId}/ledger`)
      .then((res) => {
        if (res.success) {
          setData(res);
        } else {
          setError(res.error || 'Failed to fetch vendor ledger');
        }
      })
      .catch((err) => {
        setError(err.message || 'Error fetching vendor ledger');
      })
      .finally(() => setLoading(false));
  }, [vendorId]);

  if (!vendorId) return null;

  const formatINR = (val?: number) => `₹${(val || 0).toLocaleString('en-IN')}`;

  const exportCSV = () => {
    if (!data) return;
    let csvContent = 'data:text/csv;charset=utf-8,';
    if (ledgerTab === 'orders') {
      csvContent += 'Date,Order Number,Customer Name,Customer Phone,Customer Email,Items,Total Vendor Due,Status\n';
      data.orders.forEach((o: any) => {
        const itemsStr = (o.items || []).map((i: any) => `${i.name} (x${i.quantity})`).join('; ');
        csvContent += `"${new Date(o.date).toLocaleDateString('en-IN')}","${o.orderNumber}","${o.customerName}","${o.customerPhone}","${o.customerEmail}","${itemsStr}","${o.totalDue}","${o.isPaid ? 'Cleared & Paid' : 'Pending from Shop India'}"\n`;
      });
    } else {
      csvContent += 'Date,Payout Ref,Amount,Payment Mode,Bank UTR,Status\n';
      data.payouts.forEach((p: any) => {
        csvContent += `"${new Date(p.date).toLocaleDateString('en-IN')}","${p.payoutRef}","${p.amount}","${p.paymentMode}","${p.utr || ''}","${p.status}"\n`;
      });
    }
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${data.vendor?.businessName || 'vendor'}_${ledgerTab}_ledger.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-4xl w-full p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-2xl">
              <Store className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">
                {data?.vendor?.businessName || 'Merchant Statement of Accounts'}
              </h3>
              <p className="text-xs text-slate-500">Merchant Statement of Accounts &amp; Outstanding Ledger</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 text-sm font-bold transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-emerald-600" />
            <p className="font-medium">Loading merchant statement &amp; orders ledger...</p>
          </div>
        ) : error ? (
          <div className="py-12 text-center text-rose-500 text-xs space-y-2">
            <p className="font-bold">{error}</p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl"
            >
              Close
            </button>
          </div>
        ) : data ? (
          <>
            {/* 3 Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <p className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">All-Time Delivered Sales</p>
                <p className="text-xl font-black text-slate-900 mt-1 font-mono">{formatINR(data.summary?.totalEarned)}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">100% vendor product earnings</p>
              </div>

              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200">
                <p className="text-[10.5px] font-bold text-emerald-700 uppercase tracking-wider">Total Disbursed (Cleared)</p>
                <p className="text-xl font-black text-emerald-800 mt-1 font-mono">{formatINR(data.summary?.totalCleared)}</p>
                <p className="text-[10px] text-emerald-600 mt-0.5">Transferred with Bank UTR reference</p>
              </div>

              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200">
                <p className="text-[10.5px] font-bold text-amber-700 uppercase tracking-wider">Pending from Shop India</p>
                <p className="text-xl font-black text-amber-800 mt-1 font-mono">{formatINR(data.summary?.pendingBalance)}</p>
                <p className="text-[10px] text-amber-600 mt-0.5">Awaiting payout disbursement</p>
              </div>
            </div>

            {/* Bank Coordinates */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div>
                <span className="text-slate-400 font-bold block text-[10px] uppercase">Bank Account</span>
                <span className="font-mono font-bold text-slate-800">
                  {data.vendor?.accountNumber
                    ? `${data.vendor.bankName || 'Bank'} (A/C: ${data.vendor.accountNumber})`
                    : 'No bank account added'}
                </span>
                {data.vendor?.ifsc && (
                  <span className="text-[10px] font-mono text-slate-500 ml-2">IFSC: {data.vendor.ifsc}</span>
                )}
              </div>
              <div>
                <span className="text-slate-400 font-bold block text-[10px] uppercase">Fast UPI ID</span>
                <span className="font-mono font-bold text-emerald-700">
                  {data.vendor?.upiId ? `⚡ ${data.vendor.upiId}` : 'No UPI added'}
                </span>
              </div>
            </div>

            {/* Tabs + Actions */}
            <div className="flex items-center justify-between border-b border-slate-100 pt-1">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setLedgerTab('orders')}
                  className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                    ledgerTab === 'orders'
                      ? 'border-emerald-600 text-emerald-700'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Delivered Orders ({data.orders?.length || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setLedgerTab('payouts')}
                  className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                    ledgerTab === 'payouts'
                      ? 'border-emerald-600 text-emerald-700'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Disbursement History ({data.payouts?.length || 0})
                </button>
              </div>

              <button
                type="button"
                onClick={exportCSV}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer mb-2"
                title="Export Ledger CSV"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Export CSV</span>
              </button>
            </div>

            {/* TAB CONTENT: Orders */}
            {ledgerTab === 'orders' && (
              <div className="max-h-80 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b text-[10px] font-bold text-slate-500 uppercase">
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Order #</th>
                      <th className="py-2.5 px-3">Customer</th>
                      <th className="py-2.5 px-3">Items</th>
                      <th className="py-2.5 px-3 text-right">Vendor Price</th>
                      <th className="py-2.5 px-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.orders?.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                          No delivered retail orders for this merchant yet.
                        </td>
                      </tr>
                    ) : (
                      data.orders?.map((o: any) => (
                        <tr key={o.id} className="hover:bg-slate-50/60">
                          <td className="py-2.5 px-3 font-mono text-slate-600 text-[11px]">
                            {new Date(o.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-900">#{o.orderNumber}</td>
                          <td className="py-2.5 px-3">
                            <span className="font-bold text-slate-800 block">{o.customerName}</span>
                            <span className="text-[10px] text-slate-400 font-mono">{o.customerPhone}</span>
                          </td>
                          <td className="py-2.5 px-3">
                            {o.items?.map((it: any, i: number) => (
                              <span key={i} className="text-[11px] text-slate-600 block">
                                {it.name} ×{it.quantity}
                              </span>
                            ))}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-black text-slate-900">{formatINR(o.totalDue)}</td>
                          <td className="py-2.5 px-3 text-right">
                            <span className={`px-2 py-0.5 rounded-full text-[9.5px] font-bold uppercase ${
                              o.isPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {o.isPaid ? 'Cleared & Paid' : 'Pending from Shop India'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB CONTENT: Payouts */}
            {ledgerTab === 'payouts' && (
              <div className="max-h-80 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b text-[10px] font-bold text-slate-500 uppercase">
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Ref</th>
                      <th className="py-2.5 px-3">Amount</th>
                      <th className="py-2.5 px-3">Mode</th>
                      <th className="py-2.5 px-3">Bank UTR</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.payouts?.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                          No disbursement payout history for this merchant yet.
                        </td>
                      </tr>
                    ) : (
                      data.payouts?.map((p: any) => (
                        <tr key={p.id} className="hover:bg-slate-50/60">
                          <td className="py-2.5 px-3 font-mono text-slate-600 text-[11px]">
                            {new Date(p.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{p.payoutRef}</td>
                          <td className="py-2.5 px-3 font-mono font-black text-emerald-700">{formatINR(p.amount)}</td>
                          <td className="py-2.5 px-3">
                            <span className="font-bold text-slate-700 text-[10.5px]">{p.paymentMode}</span>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-slate-800 font-bold">{p.utr || '—'}</td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded-full text-[9.5px] font-bold uppercase bg-emerald-100 text-emerald-800">
                              {p.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Close Ledger
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
};
