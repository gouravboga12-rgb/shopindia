import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import {
  DollarSign, RefreshCw, Calendar, Download,
  Layers, Search, TrendingUp, CheckCircle2,
  ChevronRight, Store, CreditCard
} from 'lucide-react';

interface ChannelSummary {
  channelKey: string;
  label: string;
  badge: string;
  customerPaid: number;
  vendorPayout: number;
  razorpayFee: number;
  adminNetProfit: number;
  ordersCount: number;
  marginPercent: number;
}

interface FinanceSummary {
  totalCustomerPaid: number;
  totalVendorPayout: number;
  totalRazorpayFee: number;
  totalAdminNetProfit: number;
  totalOrdersCount: number;
  marginPercent: number;
}

interface ProfitOrder {
  id: string;
  orderNumber: string;
  channel: 'shop_india' | 'quick_shopping' | 'glacons';
  channelLabel: string;
  customerPaid: number;
  vendorPayout: number;
  razorpayFee: number;
  adminNetProfit: number;
  marginPercent: number;
  paymentMethod: string;
  paymentStatus: string;
  status: string;
  customerName: string;
  partnerName: string;
  createdAt: string;
}

export const FinancePage: React.FC = () => {
  const [period, setPeriod] = useState<string>('today');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  // Financial state
  const [summary, setSummary] = useState<FinanceSummary>({
    totalCustomerPaid: 0,
    totalVendorPayout: 0,
    totalRazorpayFee: 0,
    totalAdminNetProfit: 0,
    totalOrdersCount: 0,
    marginPercent: 0,
  });

  const [channels, setChannels] = useState<{
    shop_india: ChannelSummary;
    quick_shopping: ChannelSummary;
    glacons: ChannelSummary;
  }>({
    shop_india: {
      channelKey: 'shop_india',
      label: 'Shop India (Courier)',
      badge: '🛍️',
      customerPaid: 0,
      vendorPayout: 0,
      razorpayFee: 0,
      adminNetProfit: 0,
      ordersCount: 0,
      marginPercent: 0,
    },
    quick_shopping: {
      channelKey: 'quick_shopping',
      label: 'Quick Shopping (10-20 Min)',
      badge: '⚡',
      customerPaid: 0,
      vendorPayout: 0,
      razorpayFee: 0,
      adminNetProfit: 0,
      ordersCount: 0,
      marginPercent: 0,
    },
    glacons: {
      channelKey: 'glacons',
      label: 'Glacons Doorstep Services',
      badge: '🛠️',
      customerPaid: 0,
      vendorPayout: 0,
      razorpayFee: 0,
      adminNetProfit: 0,
      ordersCount: 0,
      marginPercent: 0,
    },
  });

  const [orders, setOrders] = useState<ProfitOrder[]>([]);
  const [selectedChannelFilter, setSelectedChannelFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

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

      const res: any = await api.get(`/api/admin/finance/overview?${queryParams.toString()}`);
      const data = res?.data || res;

      if (data?.summary) {
        setSummary(data.summary);
      }
      if (data?.channels) {
        setChannels(data.channels);
      }
      if (Array.isArray(data?.orders)) {
        setOrders(data.orders);
      }
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
    return `₹${(val || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Filter orders by channel and search query
  const filteredOrders = orders.filter((o) => {
    const matchesChannel =
      selectedChannelFilter === 'all' || o.channel === selectedChannelFilter;
    const matchesSearch =
      searchQuery.trim() === '' ||
      o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.partnerName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesChannel && matchesSearch;
  });

  const handleExportCSV = () => {
    if (orders.length === 0) return;
    const headers = [
      'Order Number',
      'Platform Channel',
      'Customer Paid (Gross)',
      'Vendor / Tech Payout',
      'Razorpay Fee (3%)',
      'Super Admin Net Profit',
      'Net Margin %',
      'Customer Name',
      'Partner / Vendor',
      'Payment Method',
      'Status',
      'Date & Time',
    ];
    const rows = orders.map((o) => [
      `"${o.orderNumber}"`,
      `"${o.channelLabel}"`,
      `"${o.customerPaid}"`,
      `"${o.vendorPayout}"`,
      `"${o.razorpayFee}"`,
      `"${o.adminNetProfit}"`,
      `"${o.marginPercent}%"`,
      `"${o.customerName}"`,
      `"${o.partnerName}"`,
      `"${o.paymentMethod}"`,
      `"${o.status}"`,
      `"${new Date(o.createdAt).toLocaleString('en-IN')}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `ShopIndia_Profit_Ledger_${period}_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* ─── Top Header ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-heading flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-6 h-6" />
            </div>
            Financial Center & Profit Ledger
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Real-time profit tracking across <span className="font-semibold text-gray-700">Shop India</span>, <span className="font-semibold text-gray-700">Quick Shopping</span>, and <span className="font-semibold text-gray-700">Glacons Services</span> (excluding 3% Razorpay charges).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            disabled={orders.length === 0}
            className="px-3.5 py-2 rounded-xl bg-white border border-gray-200 text-xs font-bold text-gray-700 hover:text-gray-900 hover:bg-gray-50 shadow-xs flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export Profit CSV
          </button>

          <button
            onClick={loadFinanceData}
            disabled={loading}
            className="p-2.5 rounded-xl bg-white border border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-50 shadow-xs transition-all cursor-pointer"
            title="Refresh Finance Overview"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ─── Day-wise / Timeline Device Filters Bar ────────────────── */}
      <div className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-xs space-y-2.5">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-gray-500 font-bold flex items-center gap-1 mr-1">
            <Calendar className="w-3.5 h-3.5 text-emerald-600" /> Day-wise Filter:
          </span>
          {[
            { id: 'today', label: 'Today' },
            { id: 'yesterday', label: 'Yesterday' },
            { id: '7d', label: 'Last 7 Days' },
            { id: '30d', label: 'Last 30 Days' },
            { id: '90d', label: 'Last 90 Days' },
            { id: 'all', label: 'All Time' },
            { id: 'custom', label: 'Custom Date Range' },
          ].map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
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
          <div className="flex flex-wrap items-center gap-3 pt-2.5 border-t border-gray-100 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-gray-500 font-medium">From Date:</span>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-800 font-medium"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500 font-medium">To Date:</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-800 font-medium"
              />
            </div>
            <button
              onClick={loadFinanceData}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold transition-colors cursor-pointer shadow-xs"
            >
              Apply Filter
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[350px] bg-white rounded-2xl border border-gray-100 p-8">
          <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mb-3" />
          <p className="text-sm font-semibold text-gray-700">Calculating real-time profits...</p>
          <p className="text-xs text-gray-400 mt-1">Deducting 3% Razorpay gateway fee & vendor wholesale payouts</p>
        </div>
      ) : (
        <>
          {/* ─── 1. MASTER GRAND TOTAL BOX (All 3 Combined) ──────────── */}
          <div className="bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 text-white p-6 rounded-3xl shadow-lg border border-emerald-500/20 relative overflow-hidden">
            {/* Subtle background glow */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              {/* Left Column: Net Profit Hero */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                    Total Profit from Three Platforms
                  </span>
                  <span className="text-xs text-slate-400">
                    ({period === 'today' ? 'Today' : period === 'yesterday' ? 'Yesterday' : period === '7d' ? 'Last 7 Days' : period === '30d' ? 'Last 30 Days' : 'Selected Period'})
                  </span>
                </div>

                <div className="flex items-baseline gap-3">
                  <div className="text-4xl sm:text-5xl font-black font-mono text-emerald-400 tracking-tight">
                    {formatINR(summary.totalAdminNetProfit)}
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs font-bold font-mono">
                    {summary.marginPercent}% Net Margin
                  </span>
                </div>

                <p className="text-xs text-slate-300">
                  Pure platform net profit kept by Super Admin after deducting vendor payouts and the 3% Razorpay gateway fee.
                </p>
              </div>

              {/* Right Column: 4-Part Transparent Equation */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-black/30 p-4 rounded-2xl border border-white/10 backdrop-blur-xs">
                {/* 1. Customer Paid */}
                <div className="space-y-1">
                  <div className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Store className="w-3 h-3 text-sky-400" /> Gross Customer Paid
                  </div>
                  <div className="text-base font-bold font-mono text-white">
                    {formatINR(summary.totalCustomerPaid)}
                  </div>
                  <div className="text-[10px] text-slate-400">{summary.totalOrdersCount} Total Orders</div>
                </div>

                {/* 2. Vendor Payouts */}
                <div className="space-y-1">
                  <div className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Building2Icon className="w-3 h-3 text-rose-400" /> Vendor Payouts
                  </div>
                  <div className="text-base font-bold font-mono text-rose-300">
                    - {formatINR(summary.totalVendorPayout)}
                  </div>
                  <div className="text-[10px] text-slate-400">Wholesale cost</div>
                </div>

                {/* 3. Razorpay 3% */}
                <div className="space-y-1">
                  <div className="text-[11px] text-slate-400 flex items-center gap-1">
                    <CreditCard className="w-3 h-3 text-amber-400" /> Razorpay Fee (3%)
                  </div>
                  <div className="text-base font-bold font-mono text-amber-300">
                    - {formatINR(summary.totalRazorpayFee)}
                  </div>
                  <div className="text-[10px] text-slate-400">Gateway charges</div>
                </div>

                {/* 4. Super Admin Profit */}
                <div className="space-y-1">
                  <div className="text-[11px] text-emerald-300 flex items-center gap-1 font-bold">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Net Kept Profit
                  </div>
                  <div className="text-base font-bold font-mono text-emerald-400">
                    {formatINR(summary.totalAdminNetProfit)}
                  </div>
                  <div className="text-[10px] text-emerald-300">Clean profit</div>
                </div>
              </div>
            </div>
          </div>

          {/* ─── 2. THE THREE VERTICAL CARDS (Side-by-Side) ─────────── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* CARD 1: Shop India (Courier E-Commerce) */}
            <div
              onClick={() => setSelectedChannelFilter('shop_india')}
              className={`p-5 rounded-2xl border transition-all cursor-pointer bg-white ${
                selectedChannelFilter === 'shop_india'
                  ? 'border-emerald-600 ring-2 ring-emerald-600/20 shadow-md'
                  : 'border-gray-200 hover:border-emerald-300 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🛍️</span>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">Shop India</h3>
                    <p className="text-[10px] text-gray-400">Pan-India Courier Goods</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  {channels.shop_india.ordersCount} Orders
                </span>
              </div>

              <div className="my-3.5 space-y-1">
                <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                  Net Admin Profit
                </div>
                <div className="text-2xl font-black font-mono text-emerald-600">
                  {formatINR(channels.shop_india.adminNetProfit)}
                </div>
                <span className="inline-block text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                  {channels.shop_india.marginPercent}% Profit Margin
                </span>
              </div>

              <div className="text-xs text-gray-600 space-y-1.5 pt-3 border-t border-gray-100">
                <div className="flex justify-between">
                  <span className="text-gray-500">Customer Paid:</span>
                  <strong className="text-gray-900 font-mono">{formatINR(channels.shop_india.customerPaid)}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Vendor Payout:</span>
                  <span className="text-rose-600 font-mono font-medium">- {formatINR(channels.shop_india.vendorPayout)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Razorpay Fee (3%):</span>
                  <span className="text-amber-600 font-mono font-medium">- {formatINR(channels.shop_india.razorpayFee)}</span>
                </div>
              </div>

              <div className="mt-3.5 pt-2 text-right">
                <span className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 inline-flex items-center gap-0.5">
                  View Shop India Orders <ChevronRight className="w-3 h-3" />
                </span>
              </div>
            </div>

            {/* CARD 2: Quick Shopping (Hyperlocal 10-20 Min) */}
            <div
              onClick={() => setSelectedChannelFilter('quick_shopping')}
              className={`p-5 rounded-2xl border transition-all cursor-pointer bg-white ${
                selectedChannelFilter === 'quick_shopping'
                  ? 'border-emerald-600 ring-2 ring-emerald-600/20 shadow-md'
                  : 'border-gray-200 hover:border-emerald-300 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <span className="text-xl">⚡</span>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">Quick Shopping</h3>
                    <p className="text-[10px] text-gray-400">10-20 Min Local Delivery</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                  {channels.quick_shopping.ordersCount} Orders
                </span>
              </div>

              <div className="my-3.5 space-y-1">
                <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                  Net Admin Profit
                </div>
                <div className="text-2xl font-black font-mono text-emerald-600">
                  {formatINR(channels.quick_shopping.adminNetProfit)}
                </div>
                <span className="inline-block text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                  {channels.quick_shopping.marginPercent}% Profit Margin
                </span>
              </div>

              <div className="text-xs text-gray-600 space-y-1.5 pt-3 border-t border-gray-100">
                <div className="flex justify-between">
                  <span className="text-gray-500">Customer Paid:</span>
                  <strong className="text-gray-900 font-mono">{formatINR(channels.quick_shopping.customerPaid)}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Store Payout:</span>
                  <span className="text-rose-600 font-mono font-medium">- {formatINR(channels.quick_shopping.vendorPayout)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Razorpay Fee (3%):</span>
                  <span className="text-amber-600 font-mono font-medium">- {formatINR(channels.quick_shopping.razorpayFee)}</span>
                </div>
              </div>

              <div className="mt-3.5 pt-2 text-right">
                <span className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 inline-flex items-center gap-0.5">
                  View Quick Orders <ChevronRight className="w-3 h-3" />
                </span>
              </div>
            </div>

            {/* CARD 3: Glacons (Doorstep Services & Repairs) */}
            <div
              onClick={() => setSelectedChannelFilter('glacons')}
              className={`p-5 rounded-2xl border transition-all cursor-pointer bg-white ${
                selectedChannelFilter === 'glacons'
                  ? 'border-emerald-600 ring-2 ring-emerald-600/20 shadow-md'
                  : 'border-gray-200 hover:border-emerald-300 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🛠️</span>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">Glacons Services</h3>
                    <p className="text-[10px] text-gray-400">Home & Appliance Services</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                  {channels.glacons.ordersCount} Bookings
                </span>
              </div>

              <div className="my-3.5 space-y-1">
                <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                  Net Admin Profit
                </div>
                <div className="text-2xl font-black font-mono text-emerald-600">
                  {formatINR(channels.glacons.adminNetProfit)}
                </div>
                <span className="inline-block text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                  {channels.glacons.marginPercent}% Profit Margin
                </span>
              </div>

              <div className="text-xs text-gray-600 space-y-1.5 pt-3 border-t border-gray-100">
                <div className="flex justify-between">
                  <span className="text-gray-500">Customer Paid:</span>
                  <strong className="text-gray-900 font-mono">{formatINR(channels.glacons.customerPaid)}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Technician Payout:</span>
                  <span className="text-rose-600 font-mono font-medium">- {formatINR(channels.glacons.vendorPayout)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Razorpay Fee (3%):</span>
                  <span className="text-amber-600 font-mono font-medium">- {formatINR(channels.glacons.razorpayFee)}</span>
                </div>
              </div>

              <div className="mt-3.5 pt-2 text-right">
                <span className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 inline-flex items-center gap-0.5">
                  View Glacons Bookings <ChevronRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          </div>

          {/* ─── 3. ORDER-BY-ORDER NET PROFIT LEDGER TABLE ──────────── */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
              <div>
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-indigo-600" />
                  Order-by-Order Net Profit Ledger
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Exact net profit earned on every transaction after deducting vendor share and the 3% Razorpay gateway fee.
                </p>
              </div>

              {/* Channel Selector Pills */}
              <div className="flex flex-wrap items-center gap-1.5 bg-gray-100 p-1 rounded-xl text-xs">
                {[
                  { id: 'all', label: 'All Channels', badge: '🌐', count: orders.length },
                  { id: 'shop_india', label: 'Shop India', badge: '🛍️', count: channels.shop_india.ordersCount },
                  { id: 'quick_shopping', label: 'Quick Shopping', badge: '⚡', count: channels.quick_shopping.ordersCount },
                  { id: 'glacons', label: 'Glacons Services', badge: '🛠️', count: channels.glacons.ordersCount },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setSelectedChannelFilter(tab.id)}
                    className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      selectedChannelFilter === tab.id
                        ? 'bg-white text-gray-900 shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <span>{tab.badge}</span>
                    <span>{tab.label}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-gray-200/80 text-gray-700">
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by Order #, Customer Name, or Store / Technician..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-800 placeholder-gray-400 focus:bg-white focus:outline-emerald-500"
              />
            </div>

            {/* Table */}
            {filteredOrders.length === 0 ? (
              <div className="py-14 text-center text-gray-400 text-xs">
                No orders recorded for this timeline and vertical filter.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 text-gray-600 font-bold border-b border-gray-200">
                    <tr>
                      <th className="py-3 px-4">Order / Reference</th>
                      <th className="py-3 px-4">Platform Vertical</th>
                      <th className="py-3 px-4 text-right">Customer Paid</th>
                      <th className="py-3 px-4 text-right">Vendor / Tech Payout</th>
                      <th className="py-3 px-4 text-right">Razorpay (3%)</th>
                      <th className="py-3 px-4 text-right">Super Admin Profit</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Date & Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredOrders.map((o) => (
                      <tr key={o.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-mono font-bold text-gray-900 text-xs">
                            {o.orderNumber}
                          </div>
                          <div className="text-[11px] text-gray-500">
                            {o.customerName} • <span className="text-gray-400">{o.partnerName}</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase inline-flex items-center gap-1 ${
                              o.channel === 'shop_india'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : o.channel === 'quick_shopping'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-purple-50 text-purple-700 border border-purple-200'
                            }`}
                          >
                            <span>{o.channel === 'shop_india' ? '🛍️' : o.channel === 'quick_shopping' ? '⚡' : '🛠️'}</span>
                            {o.channelLabel}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono font-bold text-gray-900">
                          {formatINR(o.customerPaid)}
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono font-medium text-rose-600">
                          - {formatINR(o.vendorPayout)}
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono font-medium text-amber-600">
                          - {formatINR(o.razorpayFee)}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <span className="font-mono font-bold text-sm text-emerald-600">
                            + {formatINR(o.adminNetProfit)}
                          </span>
                          <div className="text-[10px] font-bold text-emerald-700">
                            {o.marginPercent}% margin
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-700 uppercase">
                            {o.status || 'Delivered'}
                          </span>
                          <div className="text-[9px] text-gray-400 mt-0.5">
                            {o.paymentMethod}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-right text-gray-500 whitespace-nowrap">
                          {new Date(o.createdAt).toLocaleString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
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

// Helper icon
const Building2Icon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
    <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
    <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
    <path d="M10 6h4" />
    <path d="M10 10h4" />
    <path d="M10 14h4" />
    <path d="M10 18h4" />
  </svg>
);
