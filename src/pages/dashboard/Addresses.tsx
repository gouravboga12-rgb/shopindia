import React, { useState, useEffect, useRef } from 'react';
import { useCustomer } from '../../context/CustomerContext';
import { PageHeader, EmptyState, Badge, PrimaryButton, fieldCls } from '../../components/dashboard/DashboardUI';
import {
  MapPin,
  Pencil,
  Trash2,
  Home,
  Briefcase,
  Map as MapIcon,
  Check,
  X,
  Navigation,
  RefreshCw,
  Search,
  Building,
  Compass,
  CheckCircle2,
} from 'lucide-react';
import {
  detectCurrentLocationWithMapbox,
  searchAddressesMapbox,
  type GeocodedAddress,
  type AddressHierarchy,
} from '../../lib/mapbox';
import type { Address, AddressType } from '../../data/dashboardTypes';

const typeIcon = (t: AddressType) =>
  t === 'home' ? <Home className="w-4 h-4" /> : t === 'work' ? <Briefcase className="w-4 h-4" /> : <MapIcon className="w-4 h-4" />;

export const AddressesPage: React.FC = () => {
  const { addresses, addAddress, updateAddress, removeAddress, setDefaultAddress, profile } = useCustomer();
  const [editing, setEditing] = useState<Address | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Omit<Address, 'id'>>({
    label: 'Home',
    type: 'home',
    fullName: '',
    mobile: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    country: 'India',
    pincode: '',
    landmark: '',
    isDefault: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // GPS & Location Search State
  const [detectingGps, setDetectingGps] = useState(false);
  const [gpsMessage, setGpsMessage] = useState<string | null>(null);
  const [locationSearch, setLocationSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<GeocodedAddress[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [reviewedLocation, setReviewedLocation] = useState<{
    fullAddress: string;
    hierarchy?: AddressHierarchy;
  } | null>(null);

  const searchBoxRef = useRef<HTMLDivElement>(null);

  function blank(): Omit<Address, 'id'> {
    return {
      label: 'Home',
      type: 'home',
      fullName: profile?.name || '',
      mobile: profile?.phone || '',
      line1: '',
      line2: '',
      city: '',
      state: '',
      country: 'India',
      pincode: '',
      landmark: '',
      isDefault: false,
    };
  }

  // Handle outside click for location search dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search for Google Maps-style location search
  useEffect(() => {
    if (!locationSearch || locationSearch.trim().length < 3) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await searchAddressesMapbox(locationSearch.trim());
        setSearchResults(results);
        setShowSearchResults(true);
      } catch (err) {
        console.warn('Location search error:', err);
      } finally {
        setSearching(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [locationSearch]);

  const applyGeocodedLocation = (geo: GeocodedAddress) => {
    const h = geo.hierarchy;

    // 1. Line 1: House / Flat / Door Number + Road / Street Name
    const houseNo = h?.houseNumber || geo.houseNumber || '';
    const roadName = h?.roadNumber || geo.road || '';
    const line1Candidate = geo.line1 || [houseNo ? `H.No ${houseNo}` : '', roadName].filter(Boolean).join(', ') || geo.formattedAddress?.split(',')[0] || '';

    // 2. Line 2: Colony, Area, Village, Mandal
    const colony = h?.colonyName || geo.colony || geo.neighborhood || '';
    const area = h?.areaName || geo.area || '';
    const village = h?.villageName || geo.village || '';
    const mandal = h?.mandal || geo.mandal || '';
    const line2Candidate = geo.line2 || [colony, area, village, mandal].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(', ');

    // 3. City & District
    const cityCandidate = h?.city || geo.city || geo.district || '';

    // 4. State & PIN Code
    const stateCandidate = h?.state || geo.state || '';
    const pincodeCandidate = h?.pincode || geo.pincode || '';

    // 5. Landmark
    const landmarkCandidate = geo.landmark || mandal || colony || '';

    setForm((f) => ({
      ...f,
      fullName: f.fullName || profile?.name || '',
      mobile: f.mobile || profile?.phone || '',
      line1: line1Candidate || f.line1,
      line2: line2Candidate || f.line2,
      city: cityCandidate || f.city,
      state: stateCandidate || f.state,
      pincode: pincodeCandidate || f.pincode,
      landmark: landmarkCandidate || f.landmark,
    }));

    setReviewedLocation({
      fullAddress: geo.fullAddress || geo.formattedAddress || '',
      hierarchy: h || {
        houseNumber: houseNo || null,
        roadNumber: roadName || null,
        colonyName: colony || null,
        areaName: area || null,
        villageName: village || null,
        mandal: mandal || null,
        district: geo.district || null,
        city: cityCandidate || null,
        pincode: pincodeCandidate || null,
        state: stateCandidate || null,
        country: 'India',
      },
    });

    setShowSearchResults(false);
  };

  const handleAutoDetectGPS = async () => {
    setDetectingGps(true);
    setGpsMessage(null);
    try {
      const geo = await detectCurrentLocationWithMapbox();
      applyGeocodedLocation(geo);
      setGpsMessage('Current GPS location detected and hierarchical review applied!');
      setTimeout(() => setGpsMessage(null), 4000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Unable to detect GPS location. Please allow location permissions in your browser.');
    } finally {
      setDetectingGps(false);
    }
  };

  const startAdd = () => {
    setForm(blank());
    setEditing(null);
    setReviewedLocation(null);
    setLocationSearch('');
    setOpen(true);
  };

  const startEdit = (a: Address) => {
    const { id, ...rest } = a;
    void id;
    setForm(rest);
    setEditing(a);
    setReviewedLocation(null);
    setLocationSearch('');
    setOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editing) await updateAddress({ ...form, id: editing.id });
      else await addAddress(form);
      setOpen(false);
    } catch (err) {
      alert('Failed to save address.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const setF = <K extends keyof Omit<Address, 'id'>>(k: K, v: Omit<Address, 'id'>[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Delivery Addresses"
        subtitle="Manage where your orders get delivered"
        actions={<PrimaryButton onClick={startAdd}>+ Add Address</PrimaryButton>}
      />

      {addresses.length === 0 && (
        <EmptyState
          icon={<MapPin className="w-6 h-6" />}
          title="No addresses yet"
          message="Add a delivery address to start shopping."
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {addresses.map((a) => (
          <div
            key={a.id}
            className={`bg-white border rounded-card shadow-premium p-5 flex flex-col gap-3 ${
              a.isDefault ? 'border-brand-blue/50 ring-1 ring-brand-blue/10' : 'border-brand-border'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-lg bg-brand-blue/10 text-brand-blue flex items-center justify-center">
                  {typeIcon(a.type)}
                </div>
                <div>
                  <p className="font-bold text-sm text-brand-graphite">{a.label}</p>
                  <p className="text-xs text-brand-slate">
                    {a.fullName} · {a.mobile}
                  </p>
                </div>
              </div>
              {a.isDefault && (
                <Badge tone="green">
                  <Check className="w-3 h-3 inline -mt-0.5 mr-0.5" /> Default
                </Badge>
              )}
            </div>
            <p className="text-xs text-brand-slate font-medium leading-relaxed">
              {a.line1}
              {a.line2 ? `, ${a.line2}` : ''}, {a.city}, {a.state} - {a.pincode}, {a.country}
              {a.landmark ? `\nLandmark: ${a.landmark}` : ''}
            </p>
            <div className="flex items-center justify-between pt-3 border-t border-brand-border/40">
              {!a.isDefault ? (
                <button onClick={() => setDefaultAddress(a.id)} className="text-xs font-bold text-brand-blue hover:underline">
                  Set as default
                </button>
              ) : (
                <span />
              )}
              <div className="flex gap-1.5">
                <button
                  disabled={isDeleting === a.id}
                  onClick={() => startEdit(a)}
                  aria-label="Edit"
                  className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-brand-slate disabled:opacity-50"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  disabled={isDeleting === a.id}
                  onClick={async () => {
                    if (confirm('Are you sure you want to delete this address?')) {
                      setIsDeleting(a.id);
                      try {
                        await removeAddress(a.id);
                      } catch (err) {
                        alert('Failed to delete address.');
                      } finally {
                        setIsDeleting(null);
                      }
                    }
                  }}
                  aria-label="Delete"
                  className="p-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center overflow-y-auto p-4 pt-12"
          onClick={() => setOpen(false)}
        >
          <form
            onSubmit={submit}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl shadow-elevated max-w-xl w-full p-6 space-y-4 my-auto max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base font-heading">
                    {editing ? 'Edit Delivery Address' : 'Add Delivery Address'}
                  </h3>
                  <p className="text-[11px] text-slate-500">Accurate address for 10-20 min quick commerce & pan-India courier</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* ─── Google Maps Style Location Search & GPS Bar ───────────── */}
            <div className="p-4 bg-slate-50/80 border border-slate-200/90 rounded-2xl space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Compass className="w-4 h-4 text-blue-600" />
                  <span>Search Location or Auto-Detect via GPS</span>
                </span>

                <button
                  type="button"
                  onClick={handleAutoDetectGPS}
                  disabled={detectingGps}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs disabled:opacity-50 flex items-center gap-1.5 cursor-pointer self-start sm:self-auto shrink-0"
                >
                  {detectingGps ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Detecting GPS...</span>
                    </>
                  ) : (
                    <>
                      <Navigation className="w-3.5 h-3.5" />
                      <span>Use Current Location</span>
                    </>
                  )}
                </button>
              </div>

              {/* Autocomplete Search Input */}
              <div ref={searchBoxRef} className="relative">
                <div className="relative flex items-center">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3" />
                  <input
                    type="text"
                    value={locationSearch}
                    onChange={(e) => setLocationSearch(e.target.value)}
                    onFocus={() => {
                      if (searchResults.length > 0) setShowSearchResults(true);
                    }}
                    placeholder="Search apartment, colony, road, area, or landmark (e.g. Chaitanyapuri, Hyderabad)..."
                    className="w-full pl-9 pr-9 py-2 text-xs rounded-xl bg-white border border-slate-200 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs font-medium"
                  />
                  {searching && (
                    <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin absolute right-3" />
                  )}
                </div>

                {/* Suggestions Dropdown */}
                {showSearchResults && searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden z-50 divide-y divide-slate-100 max-h-60 overflow-y-auto">
                    {searchResults.map((result, idx) => (
                      <div
                        key={idx}
                        onClick={() => applyGeocodedLocation(result)}
                        className="p-3 hover:bg-blue-50/70 cursor-pointer transition-colors flex items-start gap-2.5"
                      >
                        <MapPin className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">
                            {result.road || result.colony || result.formattedAddress?.split(',')[0]}
                          </p>
                          <p className="text-[11px] text-slate-500 truncate">{result.fullAddress}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {gpsMessage && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>{gpsMessage}</span>
                </div>
              )}
            </div>

            {/* ─── Google Maps Style Hierarchical Address Review Box ─────── */}
            {reviewedLocation && (
              <div className="p-4 bg-gradient-to-br from-blue-50/90 to-indigo-50/90 border border-blue-200 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-wider text-blue-800 flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-blue-600" />
                    <span>Hierarchical Location Review</span>
                  </span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                    Applied to Form Below
                  </span>
                </div>

                {/* Structured Hierarchy Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                  <div className="bg-white/80 p-2 rounded-xl border border-blue-100">
                    <span className="text-slate-400 block text-[10px] font-bold uppercase">House & Road</span>
                    <span className="font-bold text-slate-800">
                      {[reviewedLocation.hierarchy?.houseNumber ? `H.No ${reviewedLocation.hierarchy.houseNumber}` : '', reviewedLocation.hierarchy?.roadNumber].filter(Boolean).join(', ') || 'Road specified below'}
                    </span>
                  </div>

                  <div className="bg-white/80 p-2 rounded-xl border border-blue-100">
                    <span className="text-slate-400 block text-[10px] font-bold uppercase">Colony & Area</span>
                    <span className="font-bold text-slate-800">
                      {[reviewedLocation.hierarchy?.colonyName, reviewedLocation.hierarchy?.areaName].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(', ') || '—'}
                    </span>
                  </div>

                  <div className="bg-white/80 p-2 rounded-xl border border-blue-100">
                    <span className="text-slate-400 block text-[10px] font-bold uppercase">Mandal / Tehsil</span>
                    <span className="font-bold text-slate-800">
                      {reviewedLocation.hierarchy?.mandal || '—'}
                    </span>
                  </div>

                  <div className="bg-white/80 p-2 rounded-xl border border-blue-100">
                    <span className="text-slate-400 block text-[10px] font-bold uppercase">District</span>
                    <span className="font-bold text-slate-800">
                      {reviewedLocation.hierarchy?.district || '—'}
                    </span>
                  </div>

                  <div className="bg-white/80 p-2 rounded-xl border border-blue-100">
                    <span className="text-slate-400 block text-[10px] font-bold uppercase">City</span>
                    <span className="font-bold text-slate-800">
                      {reviewedLocation.hierarchy?.city || '—'}
                    </span>
                  </div>

                  <div className="bg-white/80 p-2 rounded-xl border border-blue-100">
                    <span className="text-slate-400 block text-[10px] font-bold uppercase">State & PIN</span>
                    <span className="font-bold text-slate-800">
                      {reviewedLocation.hierarchy?.state} {reviewedLocation.hierarchy?.pincode && `(${reviewedLocation.hierarchy.pincode})`}
                    </span>
                  </div>
                </div>

                <p className="text-[10px] text-slate-500 italic truncate">
                  Full GPS Path: {reviewedLocation.fullAddress}
                </p>
              </div>
            )}

            {/* ─── Address Form Inputs ───────────────────────────────────── */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="col-span-2 sm:col-span-1 flex flex-col gap-1">
                <label className="text-xs font-black uppercase text-brand-slate">Full Name</label>
                <input
                  className={fieldCls}
                  value={form.fullName}
                  onChange={(e) => setF('fullName', e.target.value)}
                  placeholder="e.g. Gourav Boga"
                  required
                />
              </div>

              <div className="col-span-2 sm:col-span-1 flex flex-col gap-1">
                <label className="text-xs font-black uppercase text-brand-slate">Mobile Number</label>
                <input
                  className={fieldCls}
                  type="tel"
                  maxLength={10}
                  value={form.mobile}
                  onChange={(e) => setF('mobile', e.target.value)}
                  placeholder="10-digit mobile number"
                  required
                />
              </div>

              <div className="col-span-2 flex flex-col gap-1">
                <label className="text-xs font-black uppercase text-brand-slate">
                  Address Line 1 (House No, Flat No, Road / Street)
                </label>
                <input
                  className={fieldCls}
                  value={form.line1}
                  onChange={(e) => setF('line1', e.target.value)}
                  placeholder="e.g. Flat 302, Sai Residency, Road No 5"
                  required
                />
              </div>

              <div className="col-span-2 flex flex-col gap-1">
                <label className="text-xs font-black uppercase text-brand-slate">
                  Address Line 2 (Colony, Area, Village, Mandal)
                </label>
                <input
                  className={fieldCls}
                  value={form.line2 || ''}
                  onChange={(e) => setF('line2', e.target.value)}
                  placeholder="e.g. Laxmi Nagar Colony, Chaitanyapuri, Saroornagar Mandal"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-black uppercase text-brand-slate">City</label>
                <input
                  className={fieldCls}
                  value={form.city}
                  onChange={(e) => setF('city', e.target.value)}
                  placeholder="e.g. Hyderabad"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-black uppercase text-brand-slate">State</label>
                <input
                  className={fieldCls}
                  value={form.state}
                  onChange={(e) => setF('state', e.target.value)}
                  placeholder="e.g. Telangana"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-black uppercase text-brand-slate">PIN Code (6 digits)</label>
                <input
                  className={fieldCls}
                  maxLength={6}
                  value={form.pincode}
                  onChange={(e) => setF('pincode', e.target.value)}
                  placeholder="e.g. 500035"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-black uppercase text-brand-slate">Landmark</label>
                <input
                  className={fieldCls}
                  value={form.landmark || ''}
                  onChange={(e) => setF('landmark', e.target.value)}
                  placeholder="e.g. Near Metro Station / Uppal Mandal"
                />
              </div>

              <div className="col-span-2 flex flex-col gap-1">
                <label className="text-xs font-black uppercase text-brand-slate">Address Type / Label</label>
                <select
                  className={fieldCls}
                  value={form.label}
                  onChange={(e) => {
                    const val = e.target.value;
                    setF('label', val);
                    setF('type', val === 'Home' ? 'home' : val === 'Work' ? 'work' : 'other');
                  }}
                >
                  <option>Home</option>
                  <option>Work</option>
                  <option>Other</option>
                </select>
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs font-bold text-brand-graphite pt-1 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isDefault}
                onChange={(e) => setF('isDefault', e.target.checked)}
                className="w-4 h-4 accent-brand-blue rounded"
              />
              <span>Set as default delivery address</span>
            </label>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={isSubmitting}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-brand-slate transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2 bg-brand-blue hover:bg-blue-600 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? 'Saving Address...' : 'Save Address'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
