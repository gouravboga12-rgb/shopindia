import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import {
  DollarSign, TrendingUp, ShieldAlert, CreditCard,
  Building2, RefreshCw, Clock, AlertTriangle, CheckCircle2,
  Wallet
} from 'lucide-react';

interface FinanceMetrics {
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
  refundBreakdown: {
    vendor: number;
    rider: number;
    platform: number;
  };
  paidOrdersCount: number;
  activeVendorsCount: number;
  activeRidersCount: number;
  settlementsCount: number;
  settledAmount: number;
}

export const FinancePage: React.FC = () => {
  const [period, setPeriod] = useState<string>('30d');
  const [loading, setLoading] = useState<boolean>(true);
  const [metrics, setMetrics] = useState<FinanceMetrics | null>(null);
  const [settlements, setSettlements] = useState<any[]>([]);

  const loadFinanceData = async () => {
    setLoading(true);
    try {
      const [overviewRes, settlementsRes]: any = await Promise.all([
        api.get(`/api/admin/finance/overview?period=${period}`),
        api.get('/api/admin/finance/settlements?limit=10'),
      ]);

      if (overviewRes?.metrics) setMetrics(overviewRes.metrics);
      if (settlementsRes?.settlements) setSettlements(settlementsRes.settlements);
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

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-heading flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-emerald-600" />
            Finance Center & Master CFO Balance Sheet
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Real-time reconciliation of customer revenue, Razorpay gateway fees, partner liabilities, and true net platform profit.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-3.5 py-2 rounded-xl bg-white border border-gray-200 text-xs font-bold text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last Quarter (90 Days)</option>
            <option value="12months">Last 12 Months</option>
            <option value="all">All-Time Cumulative</option>
          </select>

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

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[350px]">
          <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mb-3" />
          <p className="text-sm font-medium text-gray-500">Calculating real-time balance sheet...</p>
        </div>
      ) : (
        <>
          {/* Top 5 Primary KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Card 1: Gross Customer Paid */}
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-gray-400">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Gross Customer Paid</span>
                <CreditCard className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-black text-gray-900 font-heading">
                {formatINR(metrics?.grossCustomerPaid)}
              </div>
              <p className="text-[11px] text-gray-400">
                Across {metrics?.paidOrdersCount || 0} captured orders
              </p>
            </div>

            {/* Card 2: Actual Gateway Fees */}
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-gray-400">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Gateway Fees (Razorpay)</span>
                <ShieldAlert className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-2xl font-black text-amber-600 font-heading">
                {formatINR(metrics?.actualGatewayFees)}
              </div>
              <p className="text-[11px] text-amber-600/80">
                2.00% + 18% GST standard deduction
              </p>
            </div>

            {/* Card 3: Net Received in Escrow */}
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-gray-400">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Net Received</span>
                <TrendingUp className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-2xl font-black text-blue-700 font-heading">
                {formatINR(metrics?.netReceived)}
              </div>
              <p className="text-[11px] text-blue-600/80">
                Net funds available in Escrow
              </p>
            </div>

            {/* Card 4: To Be Cleared (Owed to Partners) */}
            <div className="bg-white p-5 rounded-2xl border border-purple-100 bg-gradient-to-br from-purple-50/40 to-white shadow-sm space-y-2">
              <div className="flex items-center justify-between text-purple-600">
                <span className="text-xs font-bold text-purple-800 uppercase tracking-wider">To Be Cleared</span>
                <Wallet className="w-4 h-4 text-purple-600" />
              </div>
              <div className="text-2xl font-black text-purple-900 font-heading">
                {formatINR(metrics?.toBeCleared)}
              </div>
              <p className="text-[11px] font-semibold text-purple-700">
                Vendors: {formatINR(metrics?.vendorOwed)} • Riders: {formatINR(metrics?.riderOwed)}
              </p>
            </div>

            {/* Card 5: Platform Net Profit */}
            <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-5 rounded-2xl shadow-md space-y-2">
              <div className="flex items-center justify-between text-white/70">
                <span className="text-xs font-bold uppercase tracking-wider">Platform Net Profit</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-200" />
              </div>
              <div className="text-2xl font-black text-white font-heading">
                {formatINR(metrics?.platformNetProfit)}
              </div>
              <p className="text-[11px] text-white/80">
                Gross Comm: {formatINR(metrics?.grossCommission)}
              </p>
            </div>
          </div>

          {/* Secondary Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Box 1: COD Cash Float With Delivery Riders */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500" />
                  COD Floating Cash with Riders
                </h3>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-700">
                  Unremitted
                </span>
              </div>

              <div className="text-3xl font-black text-gray-900 font-heading">
                {formatINR(metrics?.codCashWithRiders)}
              </div>

              <p className="text-xs text-gray-500 leading-relaxed">
                Offline cash collected at customer doorsteps currently in custody of active riders. Must be deposited via Regional Admin or Razorpay QR.
              </p>

              <div className="p-3 bg-gray-50 rounded-xl text-xs text-gray-600 flex items-center justify-between">
                <span>Active Delivery Partners:</span>
                <span className="font-bold text-gray-900">{metrics?.activeRidersCount || 0}</span>
              </div>
            </div>

            {/* Box 2: Refund Losses & At-Fault Allocation */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  Refund Debits by At-Fault Party
                </h3>
                <span className="text-xs font-bold text-red-600">
                  Total: {formatINR(metrics?.totalRefunds)}
                </span>
              </div>

              <div className="space-y-3 pt-1">
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-gray-600">Merchant Fault (Debited from Vendor)</span>
                    <span className="font-bold text-gray-900">{formatINR(metrics?.refundBreakdown?.vendor)}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-purple-600 h-2 rounded-full"
                      style={{
                        width: `${Math.min(100, ((metrics?.refundBreakdown?.vendor || 0) / (metrics?.totalRefunds || 1)) * 100)}%`
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-gray-600">Rider Fault (Debited from Delivery)</span>
                    <span className="font-bold text-gray-900">{formatINR(metrics?.refundBreakdown?.rider)}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{
                        width: `${Math.min(100, ((metrics?.refundBreakdown?.rider || 0) / (metrics?.totalRefunds || 1)) * 100)}%`
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-gray-600">Platform Absorption (Platform Loss)</span>
                    <span className="font-bold text-red-600">{formatINR(metrics?.refundBreakdown?.platform)}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-red-500 h-2 rounded-full"
                      style={{
                        width: `${Math.min(100, ((metrics?.refundBreakdown?.platform || 0) / (metrics?.totalRefunds || 1)) * 100)}%`
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Box 3: Automated Gateway Settlements */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-blue-600" />
                  Razorpay Bank Settlements
                </h3>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-blue-700">
                  {metrics?.settlementsCount || 0} Batches
                </span>
              </div>

              <div className="text-3xl font-black text-gray-900 font-heading">
                {formatINR(metrics?.settledAmount)}
              </div>

              <p className="text-xs text-gray-500 leading-relaxed">
                Automated daily T+2 bank settlements disbursed by Razorpay directly into the ShopIndia nodal bank account.
              </p>

              <div className="p-3 bg-gray-50 rounded-xl text-xs text-gray-600 flex items-center justify-between">
                <span>Active Vendors on Platform:</span>
                <span className="font-bold text-gray-900">{metrics?.activeVendorsCount || 0}</span>
              </div>
            </div>
          </div>

          {/* Settlements Table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900">Recent Payment Gateway Settlements</h3>
                <p className="text-xs text-gray-500">Automated batch reconciliation logs synced from Razorpay</p>
              </div>
            </div>

            {settlements.length === 0 ? (
              <div className="py-12 text-center text-gray-400 text-xs">
                No bank settlement batches recorded for this period yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 text-gray-600 font-bold border-b border-gray-200">
                    <tr>
                      <th className="py-3 px-4">Settlement ID</th>
                      <th className="py-3 px-4">UTR Reference</th>
                      <th className="py-3 px-4">Gross Amount</th>
                      <th className="py-3 px-4">Gateway Fees</th>
                      <th className="py-3 px-4">Net Settled</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {settlements.map((s) => (
                      <tr key={s.id} className="hover:bg-gray-50/50">
                        <td className="py-3 px-4 font-mono font-semibold text-gray-900">{s.settlementId}</td>
                        <td className="py-3 px-4 font-mono text-gray-600">{s.utr || '—'}</td>
                        <td className="py-3 px-4 font-semibold">{formatINR(s.amount)}</td>
                        <td className="py-3 px-4 text-red-600 font-semibold">{formatINR((s.fees || 0) + (s.tax || 0))}</td>
                        <td className="py-3 px-4 font-bold text-emerald-700">{formatINR((s.amount || 0) - ((s.fees || 0) + (s.tax || 0)))}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 uppercase">
                            {s.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-500">{new Date(s.createdAt).toLocaleDateString('en-IN')}</td>
                      </tr>
                    ))}
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
