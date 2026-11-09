import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Download, Calendar, Filter, BarChart3, TrendingUp, Zap, Clock, Wrench } from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const [reports, setReports] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [bookingModeFilter, setBookingModeFilter] = useState('all');
  const [period, setPeriod] = useState('30d');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);

  const loadReports = () => {
    setLoading(true);
    let url = `/api/admin/reports/sales?period=${period}`;
    if (selectedBranch) url += `&branchId=${selectedBranch}`;
    if (period === 'custom') {
      if (startDate) url += `&startDate=${startDate}`;
      if (endDate) url += `&endDate=${endDate}`;
    }
    api.get<{ orders: any[] }>(url)
      .then(d => setReports(d.orders || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    api.get<{ branches: any[] }>('/api/admin/branches')
      .then(d => setBranches(d.branches || []))
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (period !== 'custom') {
      loadReports();
    }
  }, [period, selectedBranch]);

  const handleExportCSV = async () => {
    try {
      let url = `/api/admin/reports/export?period=${period}`;
      if (selectedBranch) url += `&branchId=${selectedBranch}`;
      if (period === 'custom') {
        if (startDate) url += `&startDate=${startDate}`;
        if (endDate) url += `&endDate=${endDate}`;
      }
      const res = await api.get<{ data: any[] }>(url);
      const csvData = res.data;
      if (!csvData.length) return alert('No data to export');

      const headers = Object.keys(csvData[0]).join(',');
      const rows = csvData.map(row => 
        Object.values(row).map(v => typeof v === 'string' && v.includes(',') ? `"${v}"` : v).join(',')
      ).join('\n');
      const csv = `${headers}\n${rows}`;

      const blob = new Blob([csv], { type: 'text/csv' });
      const urlBlob = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = urlBlob;
      a.download = `shopindia_sales_report_${period}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err: any) {
      alert('Export failed: ' + err.message);
    }
  };

  const isOrderService = (r: any) => r.type === 'hvac_service' || (r.serviceJobs && r.serviceJobs.length > 0);
  const isOrderInstant = (r: any) => {
    if (!isOrderService(r)) return false;
    const notesLower = (r.notes || '').toLowerCase();
    return notesLower.includes('instant') || !notesLower.includes('scheduled');
  };
  const isOrderScheduled = (r: any) => {
    if (!isOrderService(r)) return false;
    return !isOrderInstant(r);
  };

  const instantCount = reports.filter(isOrderInstant).length;
  const scheduledCount = reports.filter(isOrderScheduled).length;

  const filteredReports = reports.filter(r => {
    if (bookingModeFilter === 'all') return true;
    if (bookingModeFilter === 'glacons_all') return isOrderService(r);
    if (bookingModeFilter === 'glacons_instant') return isOrderInstant(r);
    if (bookingModeFilter === 'glacons_scheduled') return isOrderScheduled(r);
    if (bookingModeFilter === 'retail') return !isOrderService(r);
    return true;
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Deep Reporting &amp; Analytics</h1>
          <p className="text-sm text-gray-500">Generate business reports and export financial data (FR-12)</p>
        </div>
        <button onClick={handleExportCSV} className="flex items-center gap-2 px-4 py-2 bg-[#0F2C59] text-white rounded-xl hover:bg-[#0F2C59]/90 font-medium text-sm transition-all shadow-lg shadow-[#0F2C59]/20 cursor-pointer">
          <Download className="w-4 h-4" />
          Export Filtered CSV
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-premium">
          <div className="flex items-center gap-3 text-[#0F2C59] mb-2"><BarChart3 className="w-5 h-5" /><h3 className="font-semibold text-sm">Total Orders</h3></div>
          <p className="text-2xl font-bold font-numbers">{reports.length}</p>
          <p className="text-xs text-gray-500 mt-1">Orders in timeframe</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-premium">
          <div className="flex items-center gap-3 text-emerald-600 mb-2"><TrendingUp className="w-5 h-5" /><h3 className="font-semibold text-sm">Total GMV Value</h3></div>
          <p className="text-2xl font-bold font-numbers">₹{reports.reduce((sum, r) => sum + (r.total || 0), 0).toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-1">Gross Merchandise Value</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-premium">
          <div className="flex items-center gap-3 text-amber-600 mb-2"><Zap className="w-5 h-5 fill-amber-500" /><h3 className="font-semibold text-sm">⚡ Instant Match Jobs</h3></div>
          <p className="text-2xl font-bold font-numbers text-amber-700">{instantCount}</p>
          <p className="text-xs text-gray-500 mt-1">15–30 Min Emergency fixes</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-premium">
          <div className="flex items-center gap-3 text-teal-600 mb-2"><Calendar className="w-5 h-5" /><h3 className="font-semibold text-sm">📅 Scheduled Slots</h3></div>
          <p className="text-2xl font-bold font-numbers text-teal-700">{scheduledCount}</p>
          <p className="text-xs text-gray-500 mt-1">Advance appointments</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-premium overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-wrap items-center gap-3">
          {/* Branch Filter */}
          <div className="flex-1 min-w-[140px] max-w-xs relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select 
              value={selectedBranch}
              onChange={e => setSelectedBranch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2C59]/20 bg-gray-50 text-gray-700 cursor-pointer"
            >
              <option value="">All Branches</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>

          {/* Booking Mode Filter */}
          <div className="flex-1 min-w-[170px] max-w-xs relative">
            <Wrench className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              value={bookingModeFilter}
              onChange={e => setBookingModeFilter(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2C59]/20 bg-gray-50 text-gray-700 cursor-pointer font-medium"
            >
              <option value="all">All Booking Modes</option>
              <option value="glacons_all">Glacons: All Services</option>
              <option value="glacons_instant">Glacons: ⚡ Instant Match (15–30m)</option>
              <option value="glacons_scheduled">Glacons: 📅 Scheduled Appointments</option>
              <option value="retail">🛍️ Quick / Retail Delivery</option>
            </select>
          </div>

          {/* Timeframe Filter */}
          <div className="flex-1 min-w-[140px] max-w-xs relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              value={period}
              onChange={e => setPeriod(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0F2C59]/20 bg-gray-50 text-gray-700 cursor-pointer"
            >
              <option value="7d">Last 7 Days</option>
              <option value="monthly">Monthly (30 Days)</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="6months">Last 6 Months</option>
              <option value="12months">Last 12 Months</option>
              <option value="yearly">Yearly</option>
              <option value="custom">Custom Date Range</option>
            </select>
          </div>

          {period === 'custom' && (
            <div className="flex items-center gap-2 animate-fadeIn pl-2 border-l border-gray-100">
              <input 
                type="date" 
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="pl-3 pr-3 py-1.5 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#0F2C59]/20 bg-gray-50 text-gray-600" 
              />
              <span className="text-xs text-gray-400">to</span>
              <input 
                type="date" 
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="pl-3 pr-3 py-1.5 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#0F2C59]/20 bg-gray-50 text-gray-600" 
              />
              <button
                onClick={loadReports}
                className="px-3.5 py-1.5 bg-[#0F2C59] hover:bg-[#0F2C59]/90 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors cursor-pointer"
              >
                Apply
              </button>
            </div>
          )}
        </div>

        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 border-b border-gray-100 text-gray-600 text-xs uppercase tracking-wider">
            <tr>
              <th className="px-5 py-3.5 font-semibold">Order No</th>
              <th className="px-5 py-3.5 font-semibold">Date</th>
              <th className="px-5 py-3.5 font-semibold">Booking Type</th>
              <th className="px-5 py-3.5 font-semibold">Amount</th>
              <th className="px-5 py-3.5 font-semibold">Vendor / Partner</th>
              <th className="px-5 py-3.5 font-semibold">Branch</th>
              <th className="px-5 py-3.5 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
               <tr><td colSpan={7} className="text-center py-8 text-gray-400">Loading Report...</td></tr>
            ) : filteredReports.length === 0 ? (
               <tr><td colSpan={7} className="text-center py-8 text-gray-400">No matching records found.</td></tr>
            ) : filteredReports.map(r => {
              const isService = isOrderService(r);
              const isInstant = isOrderInstant(r);
              const slotTime = r.serviceJobs?.[0]?.scheduledTimeSlot || r.notes || '';

              return (
                <tr key={r.id} className="hover:bg-gray-50/50">
                  <td className="px-5 py-3 font-medium text-[#0F2C59]">{r.orderNumber}</td>
                  <td className="px-5 py-3 text-gray-500 font-numbers">{new Date(r.createdAt).toLocaleDateString()}</td>
                  <td className="px-5 py-3">
                    {isService ? (
                      isInstant ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-black text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                          <Zap className="w-3 h-3 fill-amber-500 text-amber-600" />
                          <span>⚡ Instant Match (15–30m)</span>
                        </span>
                      ) : (
                        <div className="flex flex-col gap-0.5">
                          <span className="inline-flex items-center gap-1 text-[11px] font-black text-teal-700 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200 self-start">
                            <Clock className="w-3 h-3 text-teal-600" />
                            <span>📅 Scheduled Slot</span>
                          </span>
                          {slotTime && (
                            <span className="text-[10px] text-slate-500 font-medium truncate max-w-[180px]">
                              {slotTime}
                            </span>
                          )}
                        </div>
                      )
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                        🛍️ Retail Order
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 font-numbers font-semibold">₹{r.total}</td>
                  <td className="px-5 py-3 text-gray-600">{r.vendor?.businessName || 'N/A'}</td>
                  <td className="px-5 py-3 text-gray-600">{r.branch?.name || 'Online'}</td>
                  <td className="px-5 py-3 text-xs capitalize font-semibold">
                    <span className={`px-2 py-0.5 rounded-full ${
                      r.status === 'delivered' ? 'bg-emerald-50 text-emerald-700' :
                      r.status === 'cancelled' ? 'bg-red-50 text-red-700' :
                      'bg-amber-50 text-amber-700'
                    }`}>
                      {r.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
