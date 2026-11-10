import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../../lib/api';
import {
  Users, Store, Bike, ShoppingBag, TrendingUp,
  AlertCircle, Clock, DollarSign, ArrowUpRight, Download, Calendar,
} from 'lucide-react';
import { TreasuryBanner, type PlatformTreasury } from '../components/TreasuryBanner';

interface Stats {
  totalUsers: number; totalVendors: number; totalRiders: number;
  totalOrders: number; pendingVendors: number; openTickets: number; totalRevenue: number;
}
interface DailyOrder { _id: string; count: number; revenue: number; }

type Range = '7d' | '3m' | '6m' | '12m';

const fmt = (n: number) => new Intl.NumberFormat('en-IN').format(n);
const fmtRs = (n: number) => '₹' + fmt(n);

const PRESETS: { label: string; value: Range }[] = [
  { label: '7 Days', value: '7d' },
  { label: '3 Months', value: '3m' },
  { label: '6 Months', value: '6m' },
  { label: '12 Months', value: '12m' },
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: currentYear - 2022 }, (_, i) => String(2023 + i));

const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: string; sub?: string; color: string }> = ({ icon, label, value, sub, color }) => (
  <div className="bg-white rounded-2xl p-6 shadow-premium border border-gray-100 flex items-start gap-4 hover:shadow-elevated transition-shadow">
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>{icon}</div>
    <div className="min-w-0">
      <p className="text-sm text-gray-500 font-medium">{label}</p>
      <p className="text-2xl font-bold text-gray-900 font-numbers mt-0.5">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  </div>
);

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [treasury, setTreasury] = useState<PlatformTreasury | null>(null);
  const [chart, setChart] = useState<DailyOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter state — only one active at a time
  const [range, setRange] = useState<Range>('7d');
  const [singleDate, setSingleDate] = useState('');
  const [year, setYear] = useState('');
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Load main stats once
  useEffect(() => {
    api.get<{ stats: Stats; treasury?: PlatformTreasury; dailyOrders: DailyOrder[] }>('/api/admin/dashboard')
      .then(d => {
        setStats(d.stats);
        if (d.treasury) setTreasury(d.treasury);
        setChart(d.dailyOrders);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // Re-fetch chart whenever filter changes
  const fetchChart = useCallback(() => {
    const params = new URLSearchParams();
    if (singleDate) {
      params.set('date', singleDate);
    } else if (year) {
      params.set('year', year);
    } else {
      params.set('range', range);
    }

    setChartLoading(true);
    setHoveredIdx(null);
    api.get<{ chartData: DailyOrder[] }>(`/api/admin/dashboard/revenue-chart?${params}`)
      .then(d => setChart(d.chartData))
      .catch(console.error)
      .finally(() => setChartLoading(false));
  }, [range, singleDate, year]);

  useEffect(() => {
    if (!loading) fetchChart();
  }, [range, singleDate, year, loading, fetchChart]);

  // CSV download — same filter params
  const handleDownloadCSV = async () => {
    try {
      const params = new URLSearchParams();
      if (singleDate) params.set('date', singleDate);
      else if (year) params.set('year', year);
      else params.set('range', range);

      const res = await api.get<{ data: Record<string, unknown>[] }>(
        `/api/admin/dashboard/revenue-export?${params}`
      );
      const csvData = res.data;
      if (!csvData.length) return alert('No revenue data for this period.');

      const headers = Object.keys(csvData[0]).join(',');
      const rows = csvData.map(row =>
        Object.values(row).map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
      ).join('\n');

      const blob = new Blob([`${headers}\n${rows}`], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const label = singleDate || year || range;
      a.href = url;
      a.download = `revenue_${label}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Export failed: ' + err.message);
    }
  };

  // Helpers to switch filter and clear the others
  const selectRange = (r: Range) => { setRange(r); setSingleDate(''); setYear(''); setHoveredIdx(null); };
  const selectDate = (d: string) => { setSingleDate(d); setYear(''); setHoveredIdx(null); };
  const selectYear = (y: string) => { setYear(y); setSingleDate(''); setHoveredIdx(null); };

  const activeLabel = singleDate
    ? `${singleDate} (Hourly)`
    : year
      ? `Year ${year}`
      : PRESETS.find(p => p.value === range)?.label ?? '';

  if (loading) return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl p-6 h-28 skeleton-shimmer" />
      ))}
    </div>
  );

  if (error) return (
    <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-red-700">
      <p className="font-semibold">Failed to load dashboard</p>
      <p className="text-sm mt-1">{error}</p>
      <p className="text-xs mt-2 text-red-500">Make sure the backend server is running on port 5001.</p>
    </div>
  );

  const maxRev = Math.max(...chart.map(d => d.revenue), 1);

  // SVG dimensions and padding
  const svgWidth = 600;
  const svgHeight = 200;
  const paddingLeft = 55; // space for Y-axis labels
  const paddingRight = 15;
  const paddingTop = 15;
  const paddingBottom = 25;

  const plotWidth = svgWidth - paddingLeft - paddingRight;
  const plotHeight = svgHeight - paddingTop - paddingBottom;

  // Compute points
  const points = chart.map((d, idx) => {
    let x = paddingLeft;
    if (chart.length > 1) {
      x = paddingLeft + (idx / (chart.length - 1)) * plotWidth;
    } else {
      x = paddingLeft + plotWidth / 2;
    }
    const y = paddingTop + plotHeight - (d.revenue / maxRev) * plotHeight;
    return { x, y, data: d };
  });

  // Calculate paths
  let linePath = '';
  let areaPath = '';

  if (chart.length === 1 && points.length === 1) {
    const yVal = points[0].y;
    linePath = `M ${paddingLeft} ${yVal} L ${paddingLeft + plotWidth} ${yVal}`;
    areaPath = `M ${paddingLeft} ${svgHeight - paddingBottom} L ${paddingLeft} ${yVal} L ${paddingLeft + plotWidth} ${yVal} L ${paddingLeft + plotWidth} ${svgHeight - paddingBottom} Z`;
  } else if (points.length > 1) {
    linePath = points.map((p, idx) => (idx === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ');
    areaPath = `M ${points[0].x} ${svgHeight - paddingBottom} ${points.map(p => `L ${p.x} ${p.y}`).join(' ')} L ${points[points.length - 1].x} ${svgHeight - paddingBottom} Z`;
  }

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    if (!chart.length) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const svgX = (mouseX / rect.width) * svgWidth;

    let closestIdx = 0;
    let minDiff = Infinity;

    points.forEach((p, idx) => {
      const diff = Math.abs(svgX - p.x);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = idx;
      }
    });

    setHoveredIdx(closestIdx);
  };

  const handleMouseLeave = () => {
    setHoveredIdx(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Platform overview — live stats</p>
      </div>

      {/* Unified Platform Treasury Metrics */}
      <TreasuryBanner initialTreasury={treasury} />

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<Users className="w-5 h-5 text-blue-600" />} label="Total Customers" value={fmt(stats?.totalUsers ?? 0)} color="bg-blue-50" />
        <StatCard icon={<Store className="w-5 h-5 text-emerald-600" />} label="Vendors" value={fmt(stats?.totalVendors ?? 0)} sub={`${stats?.pendingVendors} pending`} color="bg-emerald-50" />
        <StatCard icon={<Bike className="w-5 h-5 text-orange-600" />} label="Riders" value={fmt(stats?.totalRiders ?? 0)} color="bg-orange-50" />
        <StatCard icon={<ShoppingBag className="w-5 h-5 text-purple-600" />} label="Total Orders" value={fmt(stats?.totalOrders ?? 0)} color="bg-purple-50" />
        <StatCard icon={<DollarSign className="w-5 h-5 text-green-600" />} label="Platform Margin Revenue" value={fmtRs(stats?.totalRevenue ?? 0)} sub="Net commission earned" color="bg-green-50" />
        <StatCard icon={<AlertCircle className="w-5 h-5 text-red-600" />} label="Open Tickets" value={fmt(stats?.openTickets ?? 0)} color="bg-red-50" />
        <StatCard icon={<Clock className="w-5 h-5 text-amber-600" />} label="Pending Approvals" value={fmt(stats?.pendingVendors ?? 0)} sub="vendors awaiting review" color="bg-amber-50" />
        <StatCard icon={<TrendingUp className="w-5 h-5 text-indigo-600" />} label="Avg Margin / Order" value={fmtRs(stats ? Math.round(stats.totalRevenue / (stats.totalOrders || 1)) : 0)} sub="Commission per order" color="bg-indigo-50" />
      </div>

      {/* Revenue Chart */}
      <div className="bg-white rounded-2xl p-6 shadow-premium border border-gray-100">
        {/* Header row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div>
            <h2 className="font-bold text-gray-900">Platform Margin — {activeLabel}</h2>
            <p className="text-sm text-gray-500">Net platform profit margin from order commissions</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <ArrowUpRight className="w-4 h-4 text-emerald-600 hidden sm:block" />
            {/* Download CSV */}
            <button
              onClick={handleDownloadCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-[#0F2C59] text-white rounded-lg hover:bg-[#0F2C59]/90 transition-colors shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              CSV
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-2 mb-5">
          {/* Preset pills */}
          {PRESETS.map(p => (
            <button
              key={p.value}
              onClick={() => selectRange(p.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${!singleDate && !year && range === p.value
                  ? 'bg-[#0F2C59] text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
            >
              {p.label}
            </button>
          ))}

          {/* Single date picker */}
          <div className="relative">
            <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            <input
              type="date"
              value={singleDate}
              max={new Date().toISOString().split('T')[0]}
              onChange={e => selectDate(e.target.value)}
              className={`pl-8 pr-3 py-1.5 border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#0F2C59]/20 transition-colors ${singleDate ? 'border-[#0F2C59] bg-[#0F2C59]/5 text-[#0F2C59] font-semibold' : 'border-gray-200 bg-gray-50 text-gray-600'
                }`}
              title="Filter by a specific day"
            />
          </div>

          {/* Year select */}
          <select
            value={year}
            onChange={e => selectYear(e.target.value)}
            className={`px-3 py-1.5 border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#0F2C59]/20 transition-colors ${year ? 'border-[#0F2C59] bg-[#0F2C59]/5 text-[#0F2C59] font-semibold' : 'border-gray-200 bg-gray-50 text-gray-600'
              }`}
          >
            <option value="">Year</option>
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        {/* Chart */}
        {chartLoading ? (
          <div className="h-40 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-[#0F2C59] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : chart.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No revenue data for this period.</p>
        ) : (
          <div className="relative">
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-auto overflow-visible select-none"
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            >
              <defs>
                {/* Area Gradient */}
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563eb" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#0F2C59" stopOpacity={0.0} />
                </linearGradient>
                {/* Line Gradient */}
                <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#2563eb" />
                  <stop offset="100%" stopColor="#0F2C59" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line x1={paddingLeft} y1={paddingTop} x2={svgWidth - paddingRight} y2={paddingTop} stroke="#f1f5f9" strokeWidth={1} />
              <line x1={paddingLeft} y1={paddingTop + plotHeight * 0.33} x2={svgWidth - paddingRight} y2={paddingTop + plotHeight * 0.33} stroke="#f1f5f9" strokeWidth={1} />
              <line x1={paddingLeft} y1={paddingTop + plotHeight * 0.66} x2={svgWidth - paddingRight} y2={paddingTop + plotHeight * 0.66} stroke="#f1f5f9" strokeWidth={1} />
              <line x1={paddingLeft} y1={paddingTop + plotHeight} x2={svgWidth - paddingRight} y2={paddingTop + plotHeight} stroke="#e2e8f0" strokeWidth={1.5} />

              {/* Y Axis Labels */}
              <text x={paddingLeft - 8} y={paddingTop + 4} textAnchor="end" className="text-xs fill-gray-400 font-medium font-numbers">
                {fmtRs(maxRev)}
              </text>
              <text x={paddingLeft - 8} y={paddingTop + plotHeight * 0.33 + 4} textAnchor="end" className="text-xs fill-gray-400 font-medium font-numbers">
                {fmtRs(Math.round(maxRev * 0.66))}
              </text>
              <text x={paddingLeft - 8} y={paddingTop + plotHeight * 0.66 + 4} textAnchor="end" className="text-xs fill-gray-400 font-medium font-numbers">
                {fmtRs(Math.round(maxRev * 0.33))}
              </text>
              <text x={paddingLeft - 8} y={paddingTop + plotHeight + 4} textAnchor="end" className="text-xs fill-gray-400 font-medium font-numbers">
                ₹0
              </text>

              {/* Area path */}
              {areaPath && (
                <path d={areaPath} fill="url(#chartGradient)" className="transition-all duration-300" />
              )}

              {/* Trend Line path */}
              {linePath && (
                <path
                  d={linePath}
                  fill="none"
                  stroke="url(#lineGradient)"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="transition-all duration-300"
                />
              )}

              {/* Hover Crosshair line */}
              {hoveredIdx !== null && points[hoveredIdx] && (
                <line
                  x1={points[hoveredIdx].x}
                  y1={paddingTop}
                  x2={points[hoveredIdx].x}
                  y2={paddingTop + plotHeight}
                  stroke="#cbd5e1"
                  strokeWidth={1}
                  strokeDasharray="4 4"
                />
              )}

              {/* Data points (dots) */}
              {points.map((p, idx) => {
                const isHovered = idx === hoveredIdx;
                return (
                  <g key={p.data._id}>
                    {/* Pulsing dot shadow on hover */}
                    {isHovered && (
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r={8}
                        fill="#2563eb"
                        fillOpacity={0.25}
                      />
                    )}
                    {/* Actual data dot */}
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={isHovered ? 5.5 : 3.5}
                      fill={isHovered ? '#0F2C59' : '#2563eb'}
                      stroke="#ffffff"
                      strokeWidth={isHovered ? 2 : 1.5}
                      className="transition-all duration-150 cursor-pointer"
                    />
                  </g>
                );
              })}

              {/* X Axis Labels */}
              {chart.map((d, idx) => {
                let x = paddingLeft;
                if (chart.length > 1) {
                  x = paddingLeft + (idx / (chart.length - 1)) * plotWidth;
                } else {
                  x = paddingLeft + plotWidth / 2;
                }

                const label = d._id.length === 7
                  ? new Date(`${d._id}-01`).toLocaleString('default', { month: 'short' })
                  : d._id.length === 5
                    ? d._id
                    : d._id.slice(5);

                // Reduce amount of labels shown if they are too many
                let showLabel = true;
                if (chart.length > 12) {
                  const step = Math.ceil(chart.length / 7);
                  showLabel = idx % step === 0 || idx === chart.length - 1;
                }

                if (!showLabel) return null;

                return (
                  <text
                    key={d._id}
                    x={x}
                    y={paddingTop + plotHeight + 16}
                    textAnchor="middle"
                    className="text-xs fill-gray-400 font-medium"
                  >
                    {label}
                  </text>
                );
              })}
            </svg>

            {/* Custom Tooltip */}
            {hoveredIdx !== null && points[hoveredIdx] && (() => {
              const p = points[hoveredIdx];
              const isRightHalf = hoveredIdx > chart.length / 2;
              return (
                <div
                  className="absolute z-10 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-100 p-3 pointer-events-none transition-all duration-75"
                  style={{
                    left: `${(p.x / svgWidth) * 100}%`,
                    top: `${(p.y / svgHeight) * 100}%`,
                    transform: `translate(${isRightHalf ? '-110%' : '10%'}, -110%)`,
                  }}
                >
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    {p.data._id}
                  </p>
                  <p className="text-sm font-bold text-emerald-600 mt-0.5">
                    {fmtRs(p.data.revenue)}
                  </p>
                  <p className="text-[10px] text-gray-400">Net Profit Margin</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {p.data.count} {p.data.count === 1 ? 'order' : 'orders'}
                  </p>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
};
