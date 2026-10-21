import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Store, Phone, Package, MapPin } from 'lucide-react';

interface VendorItem {
  id: string;
  businessName: string;
  contactName: string;
  phone: string;
  street?: string;
  city?: string;
  state?: string;
  pincode?: string;
  category?: string;
  approvalStatus: string;
  orders?: {
    id: string;
    orderNumber: string;
    status: string;
    type: string;
    createdAt: string;
  }[];
}

export const RegionalVendors: React.FC = () => {
  const { token } = useAuth();
  const [vendors, setVendors] = useState<VendorItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    const fetchVendors = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/regional-admin/vendors', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setVendors(data.vendors || []);
        }
      } catch (e) {
        console.error('Failed to fetch regional vendors', e);
      } finally {
        setLoading(false);
      }
    };
    fetchVendors();
  }, [token]);

  return (
    <div className="space-y-6 text-slate-100 animate-in fade-in duration-200">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white">Territory Merchants & Stores</h2>
          <p className="text-xs text-slate-400">
            Monitor merchant packing speed, pending dispatch queues, and store contacts
          </p>
        </div>
        <span className="text-xs font-bold bg-blue-950 text-blue-400 border border-blue-500/30 px-3 py-1.5 rounded-full self-start">
          {vendors.length} Active Stores
        </span>
      </div>

      {loading ? (
        <div className="py-12 text-center text-slate-500 text-xs">Loading local merchants...</div>
      ) : vendors.length === 0 ? (
        <div className="py-16 text-center text-slate-500 bg-slate-900 border border-slate-800 rounded-3xl">
          <Store className="w-12 h-12 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No vendors registered under this region yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {vendors.map((vendor) => {
            const pendingOrders = vendor.orders || [];
            return (
              <div
                key={vendor.id}
                className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col justify-between space-y-4 hover:border-slate-700 transition-all"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-blue-500/10 text-blue-400 rounded-2xl border border-blue-500/20">
                        <Store className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-white">{vendor.businessName}</h3>
                        <p className="text-xs text-slate-400">{vendor.contactName}</p>
                      </div>
                    </div>

                    {vendor.phone && (
                      <a
                        href={`tel:${vendor.phone}`}
                        className="p-2.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-xl transition-colors border border-slate-700"
                        title="Call Store Manager"
                      >
                        <Phone className="w-4 h-4" />
                      </a>
                    )}
                  </div>

                  <p className="mt-3 text-xs text-slate-400 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="truncate">
                      {vendor.street ? `${vendor.street}, ${vendor.city || ''} ${vendor.pincode || ''}` : 'Location unmapped'}
                    </span>
                  </p>
                </div>

                {/* Pending Orders Alert */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-orange-400" />
                    <span className="text-slate-300 font-medium">Pending Packing / Dispatch:</span>
                  </div>
                  <span
                    className={`font-mono font-bold px-2 py-0.5 rounded-full ${
                      pendingOrders.length > 0
                        ? 'bg-orange-950 text-orange-400 border border-orange-500/30'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {pendingOrders.length} Orders
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
