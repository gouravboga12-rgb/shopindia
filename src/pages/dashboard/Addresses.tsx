import React, { useState } from 'react';
import { useCustomer } from '../../context/CustomerContext';
import { PageHeader, EmptyState, Badge, PrimaryButton, fieldCls } from '../../components/dashboard/DashboardUI';
import { MapPin, Pencil, Trash2, Home, Briefcase, Map as MapIcon, Check, X, Navigation, RefreshCw } from 'lucide-react';
import { detectCurrentLocationWithMapbox } from '../../lib/mapbox';
import type { Address, AddressType } from '../../data/dashboardTypes';

const typeIcon = (t: AddressType) => (t === 'home' ? <Home className="w-4 h-4" /> : t === 'work' ? <Briefcase className="w-4 h-4" /> : <MapIcon className="w-4 h-4" />);

export const AddressesPage: React.FC = () => {
  const { addresses, addAddress, updateAddress, removeAddress, setDefaultAddress } = useCustomer();
  const [editing, setEditing] = useState<Address | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Omit<Address, 'id'>>({ label: 'Home', type: 'home', fullName: '', mobile: '', line1: '', line2: '', city: '', state: '', country: 'India', pincode: '', landmark: '', isDefault: false });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const [detectingGps, setDetectingGps] = useState(false);
  const [gpsMessage, setGpsMessage] = useState<string | null>(null);

  function blank(): Omit<Address, 'id'> {
    return { label: 'Home', type: 'home', fullName: '', mobile: '', line1: '', line2: '', city: '', state: '', country: 'India', pincode: '', landmark: '', isDefault: false };
  }

  const handleAutoDetectGPS = async () => {
    setDetectingGps(true);
    setGpsMessage(null);
    try {
      const geo = await detectCurrentLocationWithMapbox();
      const detectedPincode = geo.pincode || '';
      const detectedCity = geo.city || geo.district || '';
      const detectedState = geo.state || '';
      const detectedRoad = [geo.road, geo.colony || geo.neighborhood || geo.village].filter(Boolean).join(', ');
      const detectedLandmark = geo.mandal || geo.neighborhood || '';

      setForm((f) => ({
        ...f,
        pincode: detectedPincode || f.pincode,
        city: detectedCity || f.city,
        state: detectedState || f.state,
        line1: detectedRoad || geo.formattedAddress || f.line1,
        landmark: detectedLandmark || f.landmark,
      }));
      setGpsMessage('Current GPS location detected and filled successfully!');
      setTimeout(() => setGpsMessage(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Unable to detect GPS location. Please check location permissions in your browser.');
    } finally {
      setDetectingGps(false);
    }
  };

  const startAdd = () => { setForm(blank()); setEditing(null); setOpen(true); };
  const startEdit = (a: Address) => { const { id, ...rest } = a; void id; setForm(rest); setEditing(a); setOpen(true); };

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

  const setF = <K extends keyof Omit<Address, 'id'>>(k: K, v: Omit<Address, 'id'>[K]) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="space-y-6">
      <PageHeader title="Delivery Addresses" subtitle="Manage where your orders get delivered" actions={<PrimaryButton onClick={startAdd}>+ Add Address</PrimaryButton>} />

      {addresses.length === 0 && <EmptyState icon={<MapPin className="w-6 h-6" />} title="No addresses yet" message="Add a delivery address to start shopping." />}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {addresses.map((a) => (
          <div key={a.id} className={`bg-white border rounded-card shadow-premium p-5 flex flex-col gap-3 ${a.isDefault ? 'border-brand-blue/50 ring-1 ring-brand-blue/10' : 'border-brand-border'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-lg bg-brand-blue/10 text-brand-blue flex items-center justify-center">{typeIcon(a.type)}</div>
                <div>
                  <p className="font-bold text-sm text-brand-graphite">{a.label}</p>
                  <p className="text-xs text-brand-slate">{a.fullName} · {a.mobile}</p>
                </div>
              </div>
              {a.isDefault && <Badge tone="green"><Check className="w-3 h-3 inline -mt-0.5 mr-0.5" /> Default</Badge>}
            </div>
            <p className="text-xs text-brand-slate font-medium leading-relaxed">
              {a.line1}{a.line2 ? `, ${a.line2}` : ''}, {a.city}, {a.state} - {a.pincode}, {a.country}
              {a.landmark ? `\nLandmark: ${a.landmark}` : ''}
            </p>
            <div className="flex items-center justify-between pt-3 border-t border-brand-border/40">
              {!a.isDefault ? (
                <button onClick={() => setDefaultAddress(a.id)} className="text-xs font-bold text-brand-blue hover:underline">Set as default</button>
              ) : <span />}
              <div className="flex gap-1.5">
                <button disabled={isDeleting === a.id} onClick={() => startEdit(a)} aria-label="Edit" className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-brand-slate disabled:opacity-50"><Pencil className="w-3.5 h-3.5" /></button>
                <button disabled={isDeleting === a.id} onClick={async () => {
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
                }} aria-label="Delete" className="p-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 disabled:opacity-50"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center overflow-y-auto p-4 pt-16" onClick={() => setOpen(false)}>
          <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="bg-white rounded-card shadow-elevated max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-brand-graphite font-heading">{editing ? 'Edit Address' : 'Add Address'}</h3>
              <button type="button" onClick={() => setOpen(false)} className="text-brand-slate hover:text-brand-graphite cursor-pointer"><X className="w-4 h-4" /></button>
            </div>

            {/* Auto GPS Detection Button */}
            <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-2xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-100/80 text-blue-600 rounded-xl">
                  <Navigation className={`w-4 h-4 ${detectingGps ? 'animate-spin' : ''}`} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">Auto-Detect via GPS</p>
                  <p className="text-[11px] text-slate-500">Automatically fills pincode, city, state, & street address</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleAutoDetectGPS}
                disabled={detectingGps}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                {detectingGps ? (
                  <>
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span>Locating...</span>
                  </>
                ) : (
                  <>
                    <MapPin className="w-3 h-3" />
                    <span>Use Current Location</span>
                  </>
                )}
              </button>
            </div>

            {gpsMessage && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>{gpsMessage}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 flex flex-col gap-1">
                <label className="text-xs font-black uppercase text-brand-slate">Full Name</label>
                <input className={fieldCls} value={form.fullName} onChange={(e) => setF('fullName', e.target.value)} required />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-black uppercase text-brand-slate">Mobile</label>
                <input className={fieldCls} value={form.mobile} onChange={(e) => setF('mobile', e.target.value)} required />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-black uppercase text-brand-slate">Pincode</label>
                <input className={fieldCls} value={form.pincode} onChange={(e) => setF('pincode', e.target.value)} required />
              </div>
              <div className="col-span-2 flex flex-col gap-1">
                <label className="text-xs font-black uppercase text-brand-slate">Address Line 1</label>
                <input className={fieldCls} value={form.line1} onChange={(e) => setF('line1', e.target.value)} required />
              </div>
              <div className="col-span-2 flex flex-col gap-1">
                <label className="text-xs font-black uppercase text-brand-slate">Address Line 2</label>
                <input className={fieldCls} value={form.line2 || ''} onChange={(e) => setF('line2', e.target.value)} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-black uppercase text-brand-slate">City</label>
                <input className={fieldCls} value={form.city} onChange={(e) => setF('city', e.target.value)} required />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-black uppercase text-brand-slate">State</label>
                <input className={fieldCls} value={form.state} onChange={(e) => setF('state', e.target.value)} required />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-black uppercase text-brand-slate">Landmark</label>
                <input className={fieldCls} value={form.landmark || ''} onChange={(e) => setF('landmark', e.target.value)} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-black uppercase text-brand-slate">Label</label>
                <select className={fieldCls} value={form.label} onChange={(e) => setF('label', e.target.value)}>
                  <option>Home</option><option>Work</option><option>Other</option>
                </select>
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs font-bold text-brand-graphite">
              <input type="checkbox" checked={form.isDefault} onChange={(e) => setF('isDefault', e.target.checked)} className="accent-brand-blue" />
              Set as default address
            </label>

            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} disabled={isSubmitting} className="px-4 py-2 bg-slate-100 rounded-button text-xs font-bold text-brand-slate disabled:opacity-50">Cancel</button>
              <button type="submit" disabled={isSubmitting} className="px-5 py-2 bg-brand-blue text-white rounded-button text-xs font-bold disabled:opacity-50">{isSubmitting ? 'Saving...' : 'Save Address'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};