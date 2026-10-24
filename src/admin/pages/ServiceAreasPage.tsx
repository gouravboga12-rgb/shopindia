import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Plus, Bell, MapPin, CheckCircle2 } from 'lucide-react';

export const ServiceAreasPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'zones' | 'leads'>('zones');
  const [areas, setAreas] = useState<any[]>([]);
  const [demandLeads, setDemandLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [pincodes, setPincodes] = useState('');
  const [deliveryType, setDeliveryType] = useState('both');

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get<any[]>('/api/admin/service-areas').catch(() => []),
      api.get<any[]>('/api/admin/service-areas/demand-leads').catch(() => []),
    ])
      .then(([areasData, leadsData]) => {
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

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Service Area & Demand Intelligence</h1>
          <p className="text-sm text-gray-500">Configure delivery zones, serviceable pincodes, and track unserved customer demand</p>
        </div>
        {activeTab === 'zones' && (
          <button
            onClick={() => setModal(true)}
            className="px-4 py-2 bg-[#0F2C59] text-white rounded-xl text-sm font-semibold flex items-center gap-2 hover:bg-[#1a3d73] cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Zone
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
        <button
          onClick={() => setActiveTab('zones')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'zones'
              ? 'bg-[#0F2C59] text-white shadow-xs'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <MapPin size={14} />
          <span>Active Service Zones ({areas.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('leads')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'leads'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Bell size={14} />
          <span>Unserved Locality Demand Leads ({demandLeads.length})</span>
        </button>
      </div>

      {activeTab === 'zones' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-5 h-44 skeleton-shimmer" />
            ))
          ) : areas.length === 0 ? (
            <div className="col-span-full py-12 text-center bg-white rounded-2xl border border-gray-200">
              <MapPin className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-gray-600">No custom service zones defined.</p>
            </div>
          ) : (
            areas.map((a) => (
              <div key={a.id || a._id} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-premium space-y-3">
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
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
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

      {modal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form onSubmit={createArea} className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-4">
            <h3 className="font-bold text-gray-900 text-lg">Add Service Zone</h3>
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
