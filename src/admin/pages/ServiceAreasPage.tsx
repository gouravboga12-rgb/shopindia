import React, { useEffect, useState, useMemo } from 'react';
import { api } from '../../lib/api';
import {
  Plus, Bell, MapPin, CheckCircle2, Store, Building2, Search,
  Navigation, Radio, Sparkles
} from 'lucide-react';

interface VendorCoverage {
  id: string;
  businessName: string;
  contactName: string;
  email: string;
  phone: string;
  street?: string;
  city?: string;
  state?: string;
  pincode?: string;
  category?: string;
  deliveryRadiusKm?: number;
  supportsQuick?: boolean;
  approvalStatus: string;
  isActive: boolean;
  isOnline: boolean;
  _count?: { products: number; orders: number };
}

interface RegionalHubCoverage {
  id: string;
  regionName: string;
  district?: string;
  state?: string;
  assignedPincodes: string[];
  status: string;
  user?: { name: string; email: string; phone: string };
  branch?: { id: string; name: string; city: string; state: string };
}

interface CoverageData {
  summary: {
    totalVendors: number;
    quickStoresCount: number;
    regionalHubsCount: number;
    citiesCovered: number;
    pincodesCovered: number;
  };
  vendors: VendorCoverage[];
  regionalHubs: RegionalHubCoverage[];
  branches: any[];
}

export const ServiceAreasPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'merchants' | 'regional' | 'zones' | 'leads'>('merchants');
  const [coverageData, setCoverageData] = useState<CoverageData | null>(null);
  const [areas, setAreas] = useState<any[]>([]);
  const [demandLeads, setDemandLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filters for Merchants
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('all');

  // Modal for adding custom zone
  const [modal, setModal] = useState(false);
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [pincodes, setPincodes] = useState('');
  const [deliveryType, setDeliveryType] = useState('both');

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get<CoverageData>('/api/admin/service-areas/partner-coverage').catch(() => null),
      api.get<any[]>('/api/admin/service-areas').catch(() => []),
      api.get<any[]>('/api/admin/service-areas/demand-leads').catch(() => []),
    ])
      .then(([cov, areasData, leadsData]) => {
        if (cov) setCoverageData(cov);
        setAreas(Array.isArray(areasData) ? areasData : []);
        setDemandLeads(Array.isArray(leadsData) ? leadsData : []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const toggleStatus = async (id: string) => {
    try {
      await api.patch(`/api/admin/service-areas/${id}/toggle`, {});
      load();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const createArea = async (e: React.FormEvent) => {
    e.preventDefault();
    const pinArr = pincodes.split(',').map(s => s.trim()).filter(Boolean);
    try {
      await api.post('/api/admin/service-areas', { name, city, pincodes: pinArr, deliveryType });
      load();
      setModal(false); setName(''); setCity(''); setPincodes('');
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Derive unique vendor cities
  const uniqueCities = useMemo(() => {
    if (!coverageData?.vendors) return [];
    const set = new Set<string>();
    coverageData.vendors.forEach(v => {
      if (v.city) set.add(v.city.trim());
    });
    return Array.from(set).sort();
  }, [coverageData]);

  // Filter vendors
  const filteredVendors = useMemo(() => {
    if (!coverageData?.vendors) return [];
    return coverageData.vendors.filter(v => {
      const matchSearch = !searchQuery ||
        v.businessName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (v.city && v.city.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (v.state && v.state.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (v.pincode && v.pincode.includes(searchQuery)) ||
        (v.category && v.category.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchCity = selectedCity === 'all' || v.city?.toLowerCase() === selectedCity.toLowerCase();
      return matchSearch && matchCity;
    });
  }, [coverageData, searchQuery, selectedCity]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Service Areas & Merchant Coverage</h1>
          <p className="text-sm text-gray-500">Live operational locations of vendors, quick-commerce dark stores, and regional service hubs</p>
        </div>
        {activeTab === 'zones' && (
          <button
            onClick={() => setModal(true)}
            className="px-4 py-2 bg-[#0F2C59] text-white rounded-xl text-sm font-semibold flex items-center gap-2 hover:bg-[#1a3d73] cursor-pointer shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" /> Add Delivery Zone
          </button>
        )}
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Store className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium">Active Partner Stores</p>
            <p className="text-2xl font-black text-gray-900 mt-0.5">{coverageData?.summary.totalVendors ?? '...'}</p>
            <p className="text-[11px] text-emerald-600 font-semibold">{coverageData?.summary.quickStoresCount ?? 0} Instant Quick Stores</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium">Regional Hubs</p>
            <p className="text-2xl font-black text-gray-900 mt-0.5">{coverageData?.summary.regionalHubsCount ?? '...'}</p>
            <p className="text-[11px] text-blue-600 font-semibold">Territory Operational Bases</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <MapPin className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium">Cities / Districts</p>
            <p className="text-2xl font-black text-gray-900 mt-0.5">{coverageData?.summary.citiesCovered ?? '...'}</p>
            <p className="text-[11px] text-indigo-600 font-semibold">Active Service Hubs</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Navigation className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium">Covered Pincodes</p>
            <p className="text-2xl font-black text-gray-900 mt-0.5">{coverageData?.summary.pincodesCovered ?? '...'}</p>
            <p className="text-[11px] text-amber-600 font-semibold">Nationwide Postal Codes</p>
          </div>
        </div>
      </div>

      {/* Modern Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('merchants')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'merchants'
              ? 'bg-[#0F2C59] text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Store size={15} />
          <span>Active Merchants & Stores ({coverageData?.vendors.length ?? 0})</span>
        </button>

        <button
          onClick={() => setActiveTab('regional')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'regional'
              ? 'bg-[#0F2C59] text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Building2 size={15} />
          <span>Glacons Regional Hubs ({coverageData?.regionalHubs.length ?? 0})</span>
        </button>

        <button
          onClick={() => setActiveTab('zones')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'zones'
              ? 'bg-[#0F2C59] text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Radio size={15} />
          <span>Custom Delivery Zones ({areas.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('leads')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'leads'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Bell size={15} />
          <span>Customer Demand Leads ({demandLeads.length})</span>
        </button>
      </div>

      {/* TAB 1: Active Merchants & Quick Stores (Live Operational Coverage) */}
      {activeTab === 'merchants' && (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search store name, city, state, or pincode..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:border-[#0F2C59]"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs text-gray-500 font-medium whitespace-nowrap">City:</span>
              <select
                value={selectedCity}
                onChange={e => setSelectedCity(e.target.value)}
                className="px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:border-[#0F2C59] bg-white cursor-pointer"
              >
                <option value="all">All Cities ({uniqueCities.length})</option>
                {uniqueCities.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Vendors Coverage Table */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-gray-500 text-sm">Loading operational merchants...</div>
            ) : filteredVendors.length === 0 ? (
              <div className="py-12 text-center">
                <Store className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-gray-700">No partner stores found matching your search.</p>
                <p className="text-xs text-gray-400 mt-1">Vendors registered will appear here showing their operational coverage.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 text-gray-600 uppercase font-bold text-[11px] border-b border-gray-200">
                    <tr>
                      <th className="p-3.5">Store / Merchant</th>
                      <th className="p-3.5">Category</th>
                      <th className="p-3.5">City & State</th>
                      <th className="p-3.5">Pincode & Street</th>
                      <th className="p-3.5">Fulfillment Mode</th>
                      <th className="p-3.5 text-center">Coverage Radius</th>
                      <th className="p-3.5 text-center">Live Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredVendors.map((vendor) => (
                      <tr key={vendor.id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="p-3.5">
                          <div className="font-bold text-gray-900">{vendor.businessName}</div>
                          <div className="text-[11px] text-gray-500">{vendor.contactName} • {vendor.phone || vendor.email}</div>
                        </td>
                        <td className="p-3.5">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-50 text-blue-700 border border-blue-200">
                            {vendor.category || 'General Store'}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <div className="font-semibold text-gray-800">{vendor.city || '—'}</div>
                          <div className="text-[11px] text-gray-400">{vendor.state || 'India'}</div>
                        </td>
                        <td className="p-3.5">
                          <div className="font-mono font-bold text-emerald-700">{vendor.pincode || '—'}</div>
                          <div className="text-[11px] text-gray-500 max-w-xs truncate">{vendor.street || 'Address registered'}</div>
                        </td>
                        <td className="p-3.5">
                          {vendor.supportsQuick ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <Sparkles className="w-3 h-3 text-emerald-600" />
                              Quick 10-Min Delivery
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              Pan-India Standard 3PL
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 text-center font-mono font-bold text-gray-700">
                          {vendor.deliveryRadiusKm ? `${vendor.deliveryRadiusKm} km` : '5-10 km'}
                        </td>
                        <td className="p-3.5 text-center">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            vendor.approvalStatus === 'approved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : vendor.approvalStatus === 'pending'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {vendor.approvalStatus.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Glacons Regional Hubs & Technician Centers */}
      {activeTab === 'regional' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-900 text-sm">Regional Admin Territories & Supervised Centers</h3>
                <p className="text-xs text-gray-500">Supervised areas handling hyperlocal quick dispatch and Glacons doorstep service operations</p>
              </div>
              <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
                {coverageData?.regionalHubs.length ?? 0} Territories
              </span>
            </div>

            {!coverageData?.regionalHubs || coverageData.regionalHubs.length === 0 ? (
              <div className="py-12 text-center">
                <Building2 className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-gray-700">No regional administrative hubs configured yet.</p>
                <p className="text-xs text-gray-400 mt-1">Approved regional admins will appear here with their assigned postal codes.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 text-gray-600 uppercase font-bold text-[11px] border-b border-gray-200">
                    <tr>
                      <th className="p-3.5">Territory / Hub Name</th>
                      <th className="p-3.5">District & State</th>
                      <th className="p-3.5">Hub Manager</th>
                      <th className="p-3.5">Assigned Pincodes</th>
                      <th className="p-3.5 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {coverageData.regionalHubs.map((hub) => (
                      <tr key={hub.id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="p-3.5 font-bold text-gray-900">
                          {hub.regionName}
                          {hub.branch && <div className="text-[10px] text-gray-400 font-normal">Branch: {hub.branch.name}</div>}
                        </td>
                        <td className="p-3.5">
                          <div className="font-semibold text-gray-800">{hub.district || '—'}</div>
                          <div className="text-[11px] text-gray-400">{hub.state || 'India'}</div>
                        </td>
                        <td className="p-3.5">
                          <div className="font-semibold text-gray-800">{hub.user?.name || 'Assigned Manager'}</div>
                          <div className="text-[11px] text-gray-400">{hub.user?.phone || hub.user?.email || '—'}</div>
                        </td>
                        <td className="p-3.5">
                          <div className="flex flex-wrap gap-1 max-w-md">
                            {hub.assignedPincodes && hub.assignedPincodes.length > 0 ? (
                              hub.assignedPincodes.map(pin => (
                                <span key={pin} className="px-2 py-0.5 font-mono text-[11px] font-bold rounded bg-blue-50 text-blue-700 border border-blue-200">
                                  {pin}
                                </span>
                              ))
                            ) : (
                              <span className="text-gray-400 italic">All district pincodes</span>
                            )}
                          </div>
                        </td>
                        <td className="p-3.5 text-center">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            hub.status === 'active' || hub.status === 'approved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {hub.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: Custom Delivery Zones */}
      {activeTab === 'zones' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-5 h-44 skeleton-shimmer" />
            ))
          ) : areas.length === 0 ? (
            <div className="col-span-full py-12 text-center bg-white rounded-2xl border border-gray-200">
              <MapPin className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-gray-600">No custom service zones defined.</p>
              <p className="text-xs text-gray-400 mt-1">Use "Add Delivery Zone" above to define custom operational clusters.</p>
            </div>
          ) : (
            areas.map((a) => (
              <div key={a.id || a._id} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-gray-900">{a.name}</h3>
                    <p className="text-xs text-gray-400">{a.city}</p>
                  </div>
                  <button
                    onClick={() => toggleStatus(a.id || a._id)}
                    className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border cursor-pointer ${
                      a.isActive ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-gray-100 border-gray-200 text-gray-600'
                    }`}
                  >
                    {a.isActive ? 'Active' : 'Disabled'}
                  </button>
                </div>

                <div className="pt-2 border-t border-gray-50 space-y-2">
                  <span className="inline-block text-xs font-medium px-2 py-0.5 rounded bg-blue-50 text-blue-700 capitalize">
                    {a.deliveryType?.replace('_', ' ')}
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-1">Covered Pincodes</p>
                    <div className="flex flex-wrap gap-1">
                      {a.pincodes?.map((pin: string) => (
                        <span key={pin} className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-700">
                          {pin}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 4: Nationwide Customer Demand Signals */}
      {activeTab === 'leads' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-gray-900 text-sm">Nationwide Customer Demand Signals</h3>
              <p className="text-xs text-gray-500">Real-time leads captured when customers clicked "Notify Me" in areas without technician coverage</p>
            </div>
            <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
              {demandLeads.length} Captured
            </span>
          </div>

          {demandLeads.length === 0 ? (
            <div className="py-12 text-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-semibold text-gray-700">No unserved demand leads at this time.</p>
              <p className="text-xs text-gray-400 mt-0.5">When customers request service outside covered areas, their details will appear here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 text-gray-600 uppercase font-bold text-[11px] border-b border-gray-200">
                  <tr>
                    <th className="p-3.5">Service Requested</th>
                    <th className="p-3.5">Category</th>
                    <th className="p-3.5">City / Locality</th>
                    <th className="p-3.5">Pincode</th>
                    <th className="p-3.5">Contact</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {demandLeads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="p-3.5 font-bold text-gray-900">{lead.serviceName}</td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-50 text-blue-700 border border-blue-200">
                          {lead.category}
                        </span>
                      </td>
                      <td className="p-3.5 text-gray-700 font-semibold">{lead.city || 'India'}</td>
                      <td className="p-3.5 font-mono text-gray-800">{lead.pincode || '—'}</td>
                      <td className="p-3.5 text-gray-600">{lead.phone || 'In-App Customer'}</td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-50 text-amber-700 border border-amber-200">
                          {lead.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-gray-400">
                        {new Date(lead.createdAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal: Add Delivery Zone */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form onSubmit={createArea} className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-4">
            <h3 className="font-bold text-gray-900 text-lg">Add Delivery Zone</h3>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Zone Name</label>
              <input required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Indiranagar Zone" className="w-full px-3 py-2 border rounded-xl text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">City</label>
              <input required value={city} onChange={e => setCity(e.target.value)} placeholder="e.g. Bengaluru" className="w-full px-3 py-2 border rounded-xl text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Pincodes (comma separated)</label>
              <input required value={pincodes} onChange={e => setPincodes(e.target.value)} placeholder="560038, 560008" className="w-full px-3 py-2 border rounded-xl text-sm font-mono" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Fulfillment Mode</label>
              <select value={deliveryType} onChange={e => setDeliveryType(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-sm">
                <option value="both">Both (Instant + Traditional)</option>
                <option value="quick_commerce">Quick Commerce (Instant)</option>
                <option value="traditional">Traditional Shipping</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setModal(false)} className="flex-1 py-2 border rounded-xl text-sm cursor-pointer">Cancel</button>
              <button type="submit" className="flex-1 py-2 bg-[#0F2C59] text-white rounded-xl text-sm font-semibold hover:bg-[#1a3d73] cursor-pointer">Add</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
