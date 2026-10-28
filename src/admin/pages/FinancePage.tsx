import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import {
  DollarSign, RefreshCw, ArrowDownRight, ArrowUpRight,
  Calendar, Download, Building2, Layers
} from 'lucide-react';

interface FinanceMetrics {
  totalRevenue: number;
  grossCustomerPaid: number;
  actualGatewayFees: number;
  netReceived: number;
  toBeCleared: number;
  vendorOwed: number;
  riderOwed: number;
  platformNetProfit: number;
  grossCommission: number;
  codCashWithRiders: number;
  totalRefunds: number;
  totalCodRemitted: number;
  codRemittanceCount: number;
  totalGrossInflow: number;
  vendorPayoutsDisbursed: number;
  riderPayoutsDisbursed: number;
  totalDisbursedToPartners: number;
  pendingPayoutsCount: number;
  pendingPayoutsAmount: number;
  netTreasuryBalance: number;
  paidOrdersCount: number;
  activeVendorsCount: number;
  activeRidersCount: number;
  settlementsCount: number;
  settledAmount: number;
}

export const FinancePage: React.FC = () => {
  const [period, setPeriod] = useState<string>('30d');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [metrics, setMetrics] = useState<FinanceMetrics | null>(null);
  const [settlements, setSettlements] = useState<any[]>([]);

  const loadFinanceData = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (period === 'custom' && customStart) {
        queryParams.set('startDate', customStart);
        if (customEnd) queryParams.set('endDate', customEnd);
      } else {
        queryParams.set('period', period);
      }

      const [overviewRes, settlementsRes]: any = await Promise.all([
        api.get(`/api/admin/finance/overview?${queryParams.toString()}`),
        api.get(`/api/admin/finance/settlements?${queryParams.toString()}&limit=25`),
      ]);

      const rawMetrics = overviewRes?.data?.metrics || overviewRes?.metrics;
      if (rawMetrics) setMetrics(rawMetrics);

      const rawSettlements = settlementsRes?.data?.settlements || settlementsRes?.settlements || [];
      setSettlements(rawSettlements);
    } catch (err) {
      console.error('Failed to load finance data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFinanceData();
  }, [period]);

  const formatINR = (val?: number) => {
    return `₹${(val || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  };

  const handleExportCSV = () => {
    if (settlements.length === 0) return;
    const headers = ['Type', 'Reference/ID', 'Partner/Source', 'Channel/Method', 'Amount', 'Status', 'Date'];
    const rows = settlements.map(s => [
      `"${s.streamType || s.type || 'Transaction'}"`,
      `"${s.utr || s.settlementId || s.id || ''}"`,
      `"${s.partnerName || s.source || 'Platform'}"`,
      `"${s.method || s.paymentMethod || 'Online'}"`,
      `"${s.amount || 0}"`,
      `"${s.status || 'completed'}"`,
      `"${new Date(s.createdAt || s.date || Date.now()).toLocaleString('en-IN')}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Finance_Ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-heading flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-emerald-600" />
            Finance Center & CFO Treasury Ledger
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Real-time reconciliation of online customer collections, offline COD deposits, partner payouts, and net treasury balance.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            disabled={settlements.length === 0}
            className="px-3 py-2 rounded-xl bg-white border border-gray-200 text-xs font-bold text-gray-700 hover:text-gray-900 shadow-sm flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>

          <button
            onClick={loadFinanceData}
            disabled={loading}
            className="p-2 rounded-xl bg-white border border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-50 shadow-sm transition-all"
            title="Refresh Finance Overview"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Date Range Selector Chips */}
      <div className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-sm space-y-2.5">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-gray-500 font-bold flex items-center gap-1 mr-1">
            <Calendar className="w-3.5 h-3.5" /> Timeline:
          </span>
          {[
            { id: 'today', label: 'Today' },
            { id: 'yesterday', label: 'Yesterday' },
            { id: '7d', label: 'Last 7 Days' },
            { id: '30d', label: 'Last 30 Days' },
            { id: '90d', label: 'Last 90 Days' },
            { id: 'all', label: 'All Time' },
            { id: 'custom', label: 'Custom Range' },
          ].map(p => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                period === p.id
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {period === 'custom' && (
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-gray-100 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-gray-500 font-medium">Start Date:</span>
              <input
                type="date"
                value={customStart}
                onChange={e => setCustomStart(e.target.value)}
                className="px-2.5 py-1 bg-gray-50 border border-gray-200 rounded-lg text-gray-800 font-medium"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500 font-medium">End Date:</span>
              <input
                type="date"
                value={customEnd}
                onChange={e => setCustomEnd(e.target.value)}
                className="px-2.5 py-1 bg-gray-50 border border-gray-200 rounded-lg text-gray-800 font-medium"
              />
            </div>
            <button
              onClick={loadFinanceData}
              className="px-3.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold transition-colors cursor-pointer"
            >
              Apply Filter
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[350px]">
          <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mb-3" />
          <p className="text-sm font-medium text-gray-500">Calculating real-time CFO balance sheet...</p>
        </div>
      ) : (
        <>
          {/* Section 1: Inflow vs Outflow Cash Equation */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* INFLOW CARD */}
            <div className="bg-gradient-to-br from-emerald-50 via-white to-emerald-50/20 p-5 rounded-2xl border border-emerald-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between text-emerald-700">
                <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <ArrowDownRight className="w-4 h-4 text-emerald-600" /> Total Inflows (Escrow + COD)
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  Funds Collected
                </span>
              </div>
              <div className="text-2xl font-black text-emerald-900 font-mono">
                {formatINR(metrics?.totalGrossInflow ?? (metrics?.grossCustomerPaid || 0) + (metrics?.totalCodRemitted || 0))}
              </div>
              <div className="text-xs text-gray-600 space-y-1 pt-1 border-t border-emerald-100">
                <div className="flex justify-between">
                  <span>Online Orders (Razorpay):</span>
                  <strong className="text-emerald-700 font-mono">{formatINR(metrics?.grossCustomerPaid || metrics?.totalRevenue)}</strong>
                </div>
                <div className="flex justify-between">
                  <span>COD Remittances Received:</span>
                  <strong className="text-emerald-700 font-mono">{formatINR(metrics?.totalCodRemitted)}</strong>
                </div>
              </div>
            </div>

            {/* OUTFLOW CARD */}
            <div className="bg-gradient-to-br from-rose-50 via-white to-rose-50/20 p-5 rounded-2xl border border-rose-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between text-rose-700">
                <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <ArrowUpRight className="w-4 h-4 text-rose-600" /> Partner Disbursed Outflows
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                  Disbursed
                </span>
              </div>
              <div className="text-2xl font-black text-rose-900 font-mono">
                {formatINR(metrics?.totalDisbursedToPartners ?? (metrics?.vendorPayoutsDisbursed || 0) + (metrics?.riderPayoutsDisbursed || 0))}
              </div>
              <div className="text-xs text-gray-600 space-y-1 pt-1 border-t border-rose-100">
                <div className="flex justify-between">
                  <span>Merchant Store Payouts:</span>
                  <strong className="text-rose-700 font-mono">{formatINR(metrics?.vendorPayoutsDisbursed)}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Fleet & Delivery Payouts:</span>
                  <strong className="text-rose-700 font-mono">{formatINR(metrics?.riderPayoutsDisbursed)}</strong>
                </div>
              </div>
            </div>

            {/* NET TREASURY BALANCE */}
            <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white p-5 rounded-2xl shadow-md space-y-3">
              <div className="flex items-center justify-between text-indigo-200">
                <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-indigo-300" /> Platform Treasury Retention
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                  Net Reserves
                </span>
              </div>
              <div className="text-3xl font-black font-mono text-emerald-400">
                {formatINR(metrics?.netTreasuryBalance ?? ((metrics?.totalGrossInflow || 0) - (metrics?.totalDisbursedToPartners || 0)))}
              </div>
              <div className="text-xs text-slate-300 space-y-1 pt-1 border-t border-indigo-800/60">
                <div className="flex justify-between">
                  <span>Pending Payout Commitments:</span>
                  <span className="text-amber-400 font-bold font-mono">{formatINR(metrics?.pendingPayoutsAmount)} ({metrics?.pendingPayoutsCount || 0} reqs)</span>
                </div>
                <div className="flex justify-between">
                  <span>Estimated Gateway Fees:</span>
                  <span className="text-slate-400 font-mono">{formatINR(metrics?.actualGatewayFees)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Detailed KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4.5 rounded-2xl border border-gray-100 shadow-sm space-y-1.5">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Captured Orders</span>
              <div className="text-xl font-bold text-gray-900 font-mono">
                {metrics?.paidOrdersCount || 0} Orders
              </div>
              <p className="text-[11px] text-gray-500">
                Gross GMV: {formatINR(metrics?.grossCustomerPaid || metrics?.totalRevenue)}
              </p>
            </div>

            <div className="bg-white p-4.5 rounded-2xl border border-gray-100 shadow-sm space-y-1.5">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">COD Remittance Inflows</span>
              <div className="text-xl font-bold text-emerald-700 font-mono">
                {formatINR(metrics?.totalCodRemitted)}
              </div>
              <p className="text-[11px] text-gray-500">
                Across {metrics?.codRemittanceCount || 0} approved deposits
              </p>
            </div>

            <div className="bg-white p-4.5 rounded-2xl border border-gray-100 shadow-sm space-y-1.5">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Active Fleet & Merchants</span>
              <div className="text-xl font-bold text-gray-900 font-mono">
                {(metrics?.activeVendorsCount || 0) + (metrics?.activeRidersCount || 0)} Active Partners
              </div>
              <p className="text-[11px] text-gray-500">
                {metrics?.activeVendorsCount || 0} Stores • {metrics?.activeRidersCount || 0} Riders
              </p>
            </div>

            <div className="bg-white p-4.5 rounded-2xl border border-gray-100 shadow-sm space-y-1.5">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Customer Refunds & Debits</span>
              <div className="text-xl font-bold text-rose-600 font-mono">
                {formatINR(metrics?.totalRefunds)}
              </div>
              <p className="text-[11px] text-gray-500">
                Processed refund claims
              </p>
            </div>
          </div>

          {/* Section 3: Unified Transaction Ledger */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-gray-100">
              <div>
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-indigo-600" />
                  Unified Cash Flow & Settlements Ledger
                </h3>
                <p className="text-xs text-gray-500">
                  Continuous chronological stream of gateway settlements, COD remittances deposited, and partner payouts disbursed.
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-lg">
                {settlements.length} Records
              </span>
            </div>

            {settlements.length === 0 ? (
              <div className="py-14 text-center text-gray-400 text-xs">
                No financial transactions or settlements recorded for the selected timeline.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 text-gray-600 font-bold border-b border-gray-200">
                    <tr>
                      <th className="py-3 px-4">Transaction / UTR Reference</th>
                      <th className="py-3 px-4">Flow Stream</th>
                      <th className="py-3 px-4">Party / Source</th>
                      <th className="py-3 px-4">Method</th>
                      <th className="py-3 px-4 text-right">Amount</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {settlements.map((tx: any, idx: number) => {
                      const isCredit = tx.flowDirection === 'INFLOW' || tx.type === 'INFLOW' || tx.type === 'COD_REMITTANCE' || tx.streamType === 'COD_REMITTANCE';
                      return (
                        <tr key={tx.id || idx} className="hover:bg-gray-50/50 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-mono font-bold text-gray-900 text-xs">
                              {tx.utr || tx.settlementId || tx.reference || (tx.id ? `TXN-${tx.id.slice(0, 8).toUpperCase()}` : '—')}
                            </div>
                            {tx.notes && <div className="text-[10px] text-gray-400 truncate max-w-xs">{tx.notes}</div>}
                          </td>

                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase inline-flex items-center gap-1 ${
                              isCredit
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}>
                              {isCredit ? <ArrowDownRight className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                              {tx.streamType || tx.type || (isCredit ? 'COD Inflow' : 'Partner Outflow')}
                            </span>
                          </td>

                          <td className="py-3 px-4 font-semibold text-gray-800">
                            {tx.partnerName || tx.source || tx.vendorName || tx.riderName || 'Platform Treasury'}
                          </td>

                          <td className="py-3 px-4 text-gray-600 font-mono text-[11px]">
                            {tx.method || tx.paymentMethod || tx.channel || 'Online/NEFT'}
                          </td>

                          <td className={`py-3 px-4 text-right font-mono font-bold text-sm ${
                            isCredit ? 'text-emerald-700' : 'text-rose-600'
                          }`}>
                            {isCredit ? `+ ${formatINR(tx.amount)}` : `- ${formatINR(tx.amount)}`}
                          </td>

                          <td className="py-3 px-4 text-center">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-700 uppercase">
                              {tx.status || 'Completed'}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-right text-gray-500 whitespace-nowrap">
                            {new Date(tx.createdAt || tx.date || Date.now()).toLocaleString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
