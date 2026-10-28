import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { detectCurrentLocationWithMapbox, searchAddressesMapbox, type GeocodedAddress } from '../../lib/mapbox';
import {
  Globe2,
  Bike,
  TrendingUp,
  RefreshCw,
  AlertCircle,
  Truck,
  Bell,
  CheckCircle2,
  MapPin,
  Search,
  Navigation,
  X,
  Compass
} from 'lucide-react';

interface RegionalMetrics {
  activeDeliveries: number;
  onlineRidersCount: number;
  totalRegionalRiders: number;
  pendingApprovalRiders: number;
  regionalGmv: number;
  totalOrdersCount: number;
}

export const RegionalDashboard: React.FC = () => {
  const { token, user } = useAuth();
  const [metrics, setMetrics] = useState<RegionalMetrics>({
    activeDeliveries: 0,
    onlineRidersCount: 0,
    totalRegionalRiders: 0,
    pendingApprovalRiders: 0,
    regionalGmv: 0,
    totalOrdersCount: 0,
  });
  const [recentDeliveries, setRecentDeliveries] = useState<any[]>([]);
  const [demandLeads, setDemandLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Regional Hub Station Mapbox Location State
  const [hubLocation, setHubLocation] = useState<{
    regionName: string;
    district?: string;
    state?: string;
    assignedPincodes: string[];
    formattedAddress?: string;
    coords?: { lat: number; lng: number };
  }>({
    regionName: '',
    assignedPincodes: [],
  });
  const [locating, setLocating] = useState(false);
  const [locFeedback, setLocFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Manual type / search state
  const [showSearchBox, setShowSearchBox] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GeocodedAddress[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const fetchHubLocation = async () => {
    try {
      const res: any = await api.get('/api/regional-admin/location');
      if (res?.success) {
        setHubLocation({
          regionName: res.regionName || '',
          district: res.district || '',
          state: res.state || '',
          assignedPincodes: res.assignedPincodes || [],
          formattedAddress: res.address || `${res.regionName || ''}${res.district ? ', ' + res.district : ''}${res.state ? ', ' + res.state : ''}`,
          coords: (res.currentLat && res.currentLng) ? { lat: res.currentLat, lng: res.currentLng } : undefined,
        });
      }
    } catch (e) {
      console.warn('Failed to fetch hub location:', e);
    }
  };

  const handleUpdateLocationGPS = async () => {
    setLocating(true);
    setLocFeedback(null);
    try {
      const geo = await detectCurrentLocationWithMapbox();
      const addrStr = geo.formattedAddress || geo.fullAddress || '';
      const hubName = geo.mandal || geo.neighborhood || geo.city || addrStr.split(',')[0];
      const regionTitle = hubName && geo.district && hubName !== geo.district
        ? `${hubName} Hub (${geo.district})`
        : `${hubName || 'Regional'} Hub`;

      const res: any = await api.patch('/api/regional-admin/location', {
        regionName: regionTitle,
        address: addrStr,
        district: geo.district || geo.city,
        state: geo.state,
        pincode: geo.pincode,
        latitude: geo.latitude,
        longitude: geo.longitude,
      });

      if (res?.success) {
        setHubLocation({
          regionName: res.profile?.regionName || regionTitle,
          district: geo.district || geo.city,
          state: geo.state,
          assignedPincodes: res.profile?.assignedPincodes || [],
          formattedAddress: addrStr,
          coords: { lat: geo.latitude, lng: geo.longitude },
        });
        setLocFeedback({ type: 'success', text: `Hub GPS Calibrated: ${geo.latitude.toFixed(5)}°N, ${geo.longitude.toFixed(5)}°E via Mapbox` });
        setTimeout(() => setLocFeedback(null), 6000);
      }
    } catch (err: any) {
      setLocFeedback({ type: 'error', text: err.message || 'Failed to detect location' });
    } finally {
      setLocating(false);
    }
  };

  const handleSearchAddress = async (q: string) => {
    setSearchQuery(q);
    if (!q || q.length < 2) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const results = await searchAddressesMapbox(q);
      setSearchResults(results);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectSearchResult = async (item: GeocodedAddress) => {
    setLocating(true);
    setLocFeedback(null);
    setShowSearchBox(false);
    setSearchQuery('');
    setSearchResults([]);
    try {
      const addrStr = item.formattedAddress || item.fullAddress || '';
      const pinMatch = addrStr.match(/\b([1-9][0-9]{5})\b/);
      const extractedPin = item.pincode || (pinMatch ? pinMatch[1] : undefined);
      const hubName = item.neighborhood || item.colony || item.city || addrStr.split(',')[0];
      const regionTitle = hubName && item.district && hubName !== item.district
        ? `${hubName} Hub (${item.district})`
        : `${hubName || 'Regional'} Hub`;

      const res: any = await api.patch('/api/regional-admin/location', {
        regionName: regionTitle,
        address: addrStr,
        district: item.district || item.city,
        state: item.state,
        pincode: extractedPin,
        latitude: item.latitude,
        longitude: item.longitude,
      });

      if (res?.success) {
        setHubLocation({
          regionName: res.profile?.regionName || regionTitle,
          district: item.district || item.city,
          state: item.state,
          assignedPincodes: res.profile?.assignedPincodes || [],
          formattedAddress: addrStr,
          coords: (item.latitude && item.longitude) ? { lat: item.latitude, lng: item.longitude } : undefined,
        });
        setLocFeedback({
          type: 'success',
          text: `Base station updated to ${regionTitle} (${item.latitude ? item.latitude.toFixed(5) + '°N, ' + item.longitude.toFixed(5) + '°E' : 'GPS recorded'})`,
        });
        await fetchHubLocation();
        setTimeout(() => setLocFeedback(null), 6000);
      }
    } catch (err: any) {
      setLocFeedback({ type: 'error', text: err.message || 'Failed to update location' });
    } finally {
      setLocating(false);
    }
  };

  const fetchDashboard = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/regional-admin/dashboard', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMetrics(data.metrics || {});
        setRecentDeliveries(data.recentDeliveries || []);
      }

      const leadsRes = await fetch('/api/regional-admin/demand-leads', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (leadsRes.ok) {
        const leadsData = await leadsRes.json();
        setDemandLeads(Array.isArray(leadsData) ? leadsData : []);
      }
    } catch (e) {
      console.error('Regional dashboard error', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    fetchHubLocation();
  }, [token]);

  return (
    <div className="space-y-5 sm:space-y-6 text-slate-800 animate-in fade-in duration-200">
      
      {/* Territory Header */}
      <div className="bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-blue-600">
            <Globe2 className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-[11px] sm:text-xs uppercase font-extrabold tracking-wider">Territory Operational Command</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
            Regional Control: {user?.name || 'Hub Manager'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Real-time quick-commerce fleet, merchant dispatches, and Shiprocket 3PL performance
          </p>
        </div>

        <button
          onClick={fetchDashboard}
          disabled={loading}
          className="self-start sm:self-auto flex items-center gap-2 px-3.5 py-2 bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded-xl text-xs font-semibold border border-slate-200 transition-colors shadow-2xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          <span>Refresh Live Pulse</span>
        </button>
      </div>

      {/* Regional Base Station Location (Mapbox Geocoding & Manual GPS) */}
      <div className="bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl p-5 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-800">Regional Hub Location (Mapbox Base Station)</span>
                <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-mono font-bold border border-blue-200">
                  Manual On-Demand
                </span>
              </div>
              <p className="text-xs text-slate-700 font-semibold mt-0.5">
                {hubLocation.regionName || 'Hub Location Not Calibrated'}
                {hubLocation.assignedPincodes.length > 0 && (
                  <span className="text-slate-400 font-normal ml-1">
                    (Covered Pincodes: {hubLocation.assignedPincodes.join(', ')})
                  </span>
                )}
              </p>
              {hubLocation.formattedAddress && (
                <p className="text-[11px] text-slate-500 font-medium mt-0.5 max-w-xl truncate">
                  {hubLocation.formattedAddress}
                </p>
              )}
              {hubLocation.coords && (
                <p className="text-[10.5px] font-mono font-bold text-blue-700 bg-blue-50/80 px-2 py-0.5 rounded-lg border border-blue-200 inline-flex items-center gap-1 mt-1">
                  <span>📍 GPS: {hubLocation.coords.lat.toFixed(5)}°N, {hubLocation.coords.lng.toFixed(5)}°E</span>
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
            <button
              type="button"
              onClick={handleUpdateLocationGPS}
              disabled={locating}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
            >
              <Navigation className={`w-3.5 h-3.5 ${locating ? 'animate-spin' : ''}`} />
              <span>{locating ? 'Calibrating...' : 'Detect GPS Location'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowSearchBox(!showSearchBox)}
              className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl shadow-2xs transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Type / Search Exact Location</span>
            </button>
          </div>
        </div>

        {locFeedback && (
          <div className={`p-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${
            locFeedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{locFeedback.text}</span>
          </div>
        )}

        {/* Mapbox Address Autocomplete Search Dropdown */}
        {showSearchBox && (
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 animate-in fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">Search Location via Mapbox</span>
              <button onClick={() => setShowSearchBox(false)} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="relative">
              <input
                type="text"
                placeholder="Type territory area, hub name, or pincode (e.g. Uppal, Hyderabad or BTM Layout, Bangalore)..."
                value={searchQuery}
                onChange={(e) => handleSearchAddress(e.target.value)}
                className="w-full px-3.5 py-2 pl-9 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>

            {isSearching && (
              <p className="text-xs text-slate-400 py-2">Searching Mapbox places...</p>
            )}

            {searchResults.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-48 overflow-y-auto shadow-sm">
                {searchResults.map((res, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSelectSearchResult(res)}
                    className="w-full text-left p-2.5 hover:bg-blue-50/60 transition-colors flex items-start gap-2 cursor-pointer"
                  >
                    <Compass className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">{(res.formattedAddress || res.fullAddress || '').split(',')[0]}</p>
                      <p className="text-[10px] text-slate-400 truncate">{res.formattedAddress || res.fullAddress}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* KPI Cards Grid - 1 Col on narrow mobile, 2 Col on tablet, 4 Col on desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Active Deliveries */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs hover:border-blue-200 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Active Deliveries</span>
            <div className="p-2 bg-orange-50 text-orange-600 rounded-xl border border-orange-100">
              <Bike className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-orange-600">
            {metrics.activeDeliveries}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Live in-transit orders</span>
        </div>

        {/* Online Riders */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs hover:border-blue-200 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Online Fleet</span>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>READY</span>
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600">
            {metrics.onlineRidersCount}{' '}
            <span className="text-xs sm:text-sm font-normal text-slate-400">/ {metrics.totalRegionalRiders}</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Available for broadcasts</span>
        </div>

        {/* Regional GMV */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs hover:border-blue-200 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Regional Sales GMV</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900">
            ₹{metrics.regionalGmv.toLocaleString('en-IN')}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Across local merchants</span>
        </div>

        {/* KYC Verification Pending */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs hover:border-blue-200 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">KYC Approvals Queue</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl border border-amber-100">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-600">
            {metrics.pendingApprovalRiders}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Awaiting partner verification</span>
        </div>
      </div>

      {/* Recent Regional Deliveries Table */}
      <div className="bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
            <Truck className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" /> Live Regional Deliveries
          </h3>
          <span className="text-xs text-slate-400 font-medium">{recentDeliveries.length} orders listed</span>
        </div>

        {recentDeliveries.length === 0 ? (
          <div className="py-10 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <Truck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs text-slate-500 font-medium">No active deliveries currently in this zone.</p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full text-left text-xs min-w-[550px] sm:min-w-0">
              <thead className="bg-slate-50 text-slate-600 uppercase font-semibold text-[11px] border-b border-slate-200/80">
                <tr>
                  <th className="p-3 sm:rounded-l-xl">Order</th>
                  <th className="p-3">Pickup & Dropoff</th>
                  <th className="p-3">Assigned Partner</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 sm:rounded-r-xl">Fee</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentDeliveries.map((del) => (
                  <tr key={del.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="p-3 font-mono font-bold text-blue-700">
                      #{del.order?.orderNumber || del.id.slice(0, 8)}
                    </td>
                    <td className="p-3">
                      <div className="text-slate-800 font-medium truncate max-w-[170px] sm:max-w-[220px]">{del.pickupName}</div>
                      <div className="text-slate-400 text-[11px] truncate max-w-[170px] sm:max-w-[220px]">➔ {del.dropoffName}</div>
                    </td>
                    <td className="p-3">
                      {del.riderProfile ? (
                        <div>
                          <span className="font-semibold text-slate-800">{del.riderProfile.user?.name}</span>
                          <span className="block text-[10px] text-slate-500 uppercase">{del.riderProfile.vehicleType}</span>
                        </div>
                      ) : (
                        <span className="text-orange-600 text-[11px] italic font-semibold">Broadcasted (Claiming)</span>
                      )}
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2.5 py-0.5 rounded-full font-bold uppercase text-[10px] inline-block ${
                          del.status === 'delivered'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : del.status === 'broadcasted'
                            ? 'bg-orange-50 text-orange-600 border border-orange-200 animate-pulse'
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}
                      >
                        {del.status}
                      </span>
                    </td>
                    <td className="p-3 font-bold text-emerald-600">
                      ₹{del.deliveryFee}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Glacons Service Demand Leads (Unserved Localities) */}
      <div className="bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-xs">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5 text-slate-800">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl border border-amber-100">
              <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg text-slate-900 font-heading">
                Unserved Service Demand Leads
              </h3>
              <p className="text-xs text-slate-400">
                Customer doorstep service requests in your territory where no active technician was available
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
            {demandLeads.length} Leads
          </span>
        </div>

        {demandLeads.length === 0 ? (
          <div className="py-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <p className="text-xs text-slate-600 font-medium">All customer doorstep requests in your territory currently have active technician coverage!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[500px]">
              <thead className="bg-slate-50 text-slate-600 uppercase font-semibold text-[11px] border-b border-slate-200/80">
                <tr>
                  <th className="p-3">Service</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Location / Pincode</th>
                  <th className="p-3">Contact</th>
                  <th className="p-3">Requested At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {demandLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="p-3 font-bold text-slate-800">{lead.serviceName}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-50 text-blue-700 border border-blue-200">
                        {lead.category}
                      </span>
                    </td>
                    <td className="p-3 font-mono font-semibold text-slate-700">
                      {lead.city || 'Territory'} {lead.pincode ? `(${lead.pincode})` : ''}
                    </td>
                    <td className="p-3 text-slate-600">{lead.phone || 'In-App Customer'}</td>
                    <td className="p-3 text-slate-400 text-[11px]">
                      {new Date(lead.createdAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};
