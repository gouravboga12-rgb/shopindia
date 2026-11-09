import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Store, Phone, Package, MapPin, MessageCircle, ExternalLink, Zap, ShoppingBag, FileText } from 'lucide-react';

interface VendorItem {
  id: string;
  businessName: string;
  contactName: string;
  phone: string;
  email?: string;
  street?: string;
  city?: string;
  state?: string;
  pincode?: string;
  lat?: number;
  lng?: number;
  supportsQuick?: boolean;
  deliveryRadiusKm?: number;
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

interface RegionalVendorsProps {
  onOpenStatement?: (partyType: string, partyId: string, name?: string) => void;
}

export const RegionalVendors: React.FC<RegionalVendorsProps> = ({ onOpenStatement }) => {
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
    <div className="space-y-5 sm:space-y-6 text-slate-800 animate-in fade-in duration-200">
      {/* Header */}
      <div className="bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900">Territory Merchants & Stores</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Verified local merchants mapped within your regional hub radius and assigned pincodes
          </p>
        </div>
        <span className="text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200/80 px-3 py-1.5 rounded-full self-start shadow-2xs">
          {vendors.length} Territory Store{vendors.length === 1 ? '' : 's'} Active
        </span>
      </div>

      {loading ? (
        <div className="py-12 text-center text-slate-400 text-xs">Loading territory merchants...</div>
      ) : vendors.length === 0 ? (
        <div className="py-16 text-center bg-white border border-dashed border-slate-200 rounded-3xl p-8">
          <Store className="w-12 h-12 mx-auto mb-2 text-slate-300" />
          <p className="text-sm text-slate-500 font-medium">No vendors registered in your territory radius yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {vendors.map((vendor) => {
            const pendingOrders = vendor.orders || [];
            const cleanPhone = (vendor.phone || '').replace(/[^0-9]/g, '');
            const phoneWith91 = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;
            const hasGps = vendor.lat != null && vendor.lng != null;

            return (
              <div
                key={vendor.id}
                className="bg-white border border-slate-200/80 rounded-2xl sm:rounded-3xl p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-blue-300 transition-all"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100 shadow-2xs">
                        <Store className="w-5 h-5 sm:w-6 sm:h-6" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-900">{vendor.businessName}</h3>
                        <p className="text-xs text-slate-500">Contact: {vendor.contactName || 'Store Manager'}</p>
                      </div>
                    </div>

                    {/* 1-Click Action Buttons */}
                    <div className="flex items-center gap-1.5">
                      {cleanPhone && (
                        <>
                          <a
                            href={`tel:${cleanPhone}`}
                            className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl transition-colors border border-blue-200 shadow-2xs"
                            title={`Call ${vendor.businessName}`}
                          >
                            <Phone className="w-3.5 h-3.5 text-blue-600" />
                          </a>
                          <a
                            href={`https://wa.me/${phoneWith91}?text=Hello%20${encodeURIComponent(
                              vendor.contactName || vendor.businessName
                            )},%20this%20is%20Shop%20India%20Regional%20Hub%20Dispatch.`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors shadow-2xs"
                            title="Chat on WhatsApp"
                          >
                            <MessageCircle className="w-3.5 h-3.5 text-emerald-100" />
                          </a>
                        </>
                      )}

                      {onOpenStatement && (
                        <button
                          type="button"
                          onClick={() => onOpenStatement('VENDOR', vendor.id, vendor.businessName)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 rounded-xl border border-slate-200 hover:border-emerald-300 text-xs font-bold transition-colors cursor-pointer"
                          title="View Merchant Passbook Statement"
                        >
                          <FileText className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Statement</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Address & GPS */}
                  <div className="mt-3 space-y-1">
                    <p className="text-xs text-slate-600 flex items-start gap-1.5 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                      <span>{vendor.street || 'Area not specified'}</span>
                    </p>
                    <p className="text-[11px] text-slate-500 pl-5">
                      {vendor.city || '—'}, {vendor.state || '—'} {vendor.pincode && `(PIN: ${vendor.pincode})`}
                    </p>

                    <div className="pl-5 pt-0.5 flex flex-wrap items-center gap-2">
                      {hasGps && vendor.lat && vendor.lng && (
                        <a
                          href={`https://www.google.com/maps?q=${vendor.lat},${vendor.lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-800"
                        >
                          GPS Pin <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                      {vendor.supportsQuick && (
                        <span className="text-[9px] font-bold bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.2 rounded inline-flex items-center gap-1">
                          <Zap className="w-2.5 h-2.5 text-amber-600" />
                          {vendor.deliveryRadiusKm || 5} km Quick Commerce
                        </span>
                      )}
                      {!vendor.supportsQuick && (
                        <span className="text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.2 rounded inline-flex items-center gap-1">
                          <ShoppingBag className="w-2.5 h-2.5 text-blue-600" />
                          Shop India Courier
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Pending Orders Alert */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-orange-600" />
                    <span className="text-slate-600 font-medium">Pending Packing / Dispatch:</span>
                  </div>
                  <span
                    className={`font-mono font-bold px-2.5 py-0.5 rounded-full text-[11px] ${
                      pendingOrders.length > 0
                        ? 'bg-orange-50 text-orange-700 border border-orange-200'
                        : 'bg-slate-100 text-slate-600'
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
