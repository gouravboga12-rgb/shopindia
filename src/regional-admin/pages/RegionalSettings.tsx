import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Building2,
  MapPin,
  RefreshCw,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Upload,
  Eye,
  ExternalLink,
  X,
  Lock,
  User,
  Phone,
  Mail,
  Globe2,
  Save,
  FileText,
  KeyRound,
  Compass,
} from 'lucide-react';
import { detectCurrentLocationWithMapbox } from '../../lib/mapbox';
import { INDIAN_STATES_AND_UTS } from './RegionalAdminRegister';

export const RegionalSettings: React.FC = () => {
  const { token } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [detectingGps, setDetectingGps] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [saveErrorMsg, setSaveErrorMsg] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<{ title: string; url: string } | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('pending_approval');
  const [approvedAt, setApprovedAt] = useState<string | null>(null);

  // Hub & Territory
  const [regionName, setRegionName] = useState('');
  const [district, setDistrict] = useState('');
  const [state, setState] = useState('Telangana');
  const [pincodesInput, setPincodesInput] = useState('');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [idProofUrl, setIdProofUrl] = useState<string | null>(null);

  // Password Security
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSuccessMsg, setPasswordSuccessMsg] = useState<string | null>(null);
  const [passwordErrorMsg, setPasswordErrorMsg] = useState<string | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);

  // Fetch Profile on Mount
  const fetchProfile = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/regional-admin/profile', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          setName(data.user.name || '');
          setEmail(data.user.email || '');
          setPhone(data.user.phone || '');
        }
        if (data.profile) {
          setRegionName(data.profile.regionName || '');
          setDistrict(data.profile.district || '');
          setState(data.profile.state || 'Telangana');
          setAddress(data.profile.address || '');
          setLatitude(data.profile.currentLat || null);
          setLongitude(data.profile.currentLng || null);
          setIdProofUrl(data.profile.idProofUrl || null);
          setStatus(data.profile.status || 'pending_approval');
          setApprovedAt(data.profile.approvedAt || null);

          const pins = Array.isArray(data.profile.assignedPincodes)
            ? data.profile.assignedPincodes.join(', ')
            : '';
          setPincodesInput(pins);
        }
      }
    } catch (err) {
      console.error('Error fetching regional admin profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [token]);

  // GPS Auto-detect via Mapbox
  const handleDetectGps = async () => {
    setDetectingGps(true);
    setSaveErrorMsg(null);
    try {
      const geocoded = await detectCurrentLocationWithMapbox();
      if (geocoded.latitude && geocoded.longitude) {
        setLatitude(geocoded.latitude);
        setLongitude(geocoded.longitude);
      }
      if (geocoded.fullAddress || geocoded.formattedAddress) {
        setAddress(geocoded.fullAddress || geocoded.formattedAddress || '');
      }
      if (geocoded.district) setDistrict(geocoded.district);
      if (geocoded.state) {
        const stateLower = geocoded.state.toLowerCase();
        const match = INDIAN_STATES_AND_UTS.find(
          (s) => s.toLowerCase() === stateLower
        );
        if (match) setState(match);
      }
      if (geocoded.pincode) {
        const detectedPin = geocoded.pincode;
        setPincodesInput((prev) => {
          const existing = prev
            .split(',')
            .map((p) => p.trim())
            .filter(Boolean);
          if (!existing.includes(detectedPin)) {
            return [...existing, detectedPin].join(', ');
          }
          return prev;
        });
      }
      setSaveSuccessMsg('GPS coordinates and base station location detected via Mapbox!');
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    } catch (err: unknown) {
      setSaveErrorMsg(err instanceof Error ? err.message : 'Failed to detect live GPS location.');
    } finally {
      setDetectingGps(false);
    }
  };

  // Direct ID Proof Upload to AWS S3 with instant auto-save
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;

    setUploadingDoc(true);
    setSaveErrorMsg(null);
    try {
      const formData = new FormData();
      formData.append('document', file);

      const res = await fetch('/api/regional-admin/upload-doc', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.url) {
        setIdProofUrl(data.url);
        setSaveSuccessMsg('ID Document successfully uploaded to AWS S3 & auto-saved to profile!');
        setTimeout(() => setSaveSuccessMsg(null), 4000);
      } else {
        setSaveErrorMsg(data.error || 'Failed to upload document.');
      }
    } catch (err: unknown) {
      setSaveErrorMsg(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploadingDoc(false);
    }
  };

  // Save General Profile & Territory Details
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setSaving(true);
    setSaveErrorMsg(null);
    setSaveSuccessMsg(null);

    try {
      const pincodeList = pincodesInput
        .split(',')
        .map((p) => p.trim().replace(/\D/g, ''))
        .filter((p) => p.length === 6);

      const payload = {
        name: name.trim(),
        phone: phone.trim(),
        regionName: regionName.trim(),
        district: district.trim(),
        state: state.trim(),
        assignedPincodes: pincodeList,
        address: address.trim(),
        latitude,
        longitude,
        idProofUrl,
      };

      const res = await fetch('/api/regional-admin/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSaveSuccessMsg('Hub profile and territory jurisdiction saved! Super Admin notified.');
        setTimeout(() => setSaveSuccessMsg(null), 4000);
      } else {
        setSaveErrorMsg(data.error || 'Failed to update profile.');
      }
    } catch (err: unknown) {
      setSaveErrorMsg(err instanceof Error ? err.message : 'Network error.');
    } finally {
      setSaving(false);
    }
  };

  // Change Password Handler
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (!currentPassword) {
      setPasswordErrorMsg('Please enter your current password.');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordErrorMsg('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordErrorMsg('New passwords do not match.');
      return;
    }

    setSavingPassword(true);
    setPasswordErrorMsg(null);
    setPasswordSuccessMsg(null);

    try {
      const res = await fetch('/api/regional-admin/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setPasswordSuccessMsg('Password updated successfully! Keep your credentials secure.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => setPasswordSuccessMsg(null), 4000);
      } else {
        setPasswordErrorMsg(data.error || 'Failed to update password.');
      }
    } catch (err: unknown) {
      setPasswordErrorMsg(err instanceof Error ? err.message : 'Network error.');
    } finally {
      setSavingPassword(false);
    }
  };

  const parsedPincodes = pincodesInput
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-400 text-sm">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
        Loading Hub Profile & Settings...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16 text-slate-800 animate-in fade-in duration-200">
      
      {/* ─── Header Summary Card ─── */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-xs relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-2xl shadow-md shadow-blue-500/20">
              {name ? name[0].toUpperCase() : 'H'}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900">{name || 'Regional Administrator'}</h2>
                <span className="text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200/80 px-2.5 py-0.5 rounded-full font-mono">
                  HUB MANAGER
                </span>
                {status === 'approved' ? (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Super Admin Approved
                    {approvedAt && <span className="font-mono text-[10px] text-emerald-600">({new Date(approvedAt).toLocaleDateString('en-IN')})</span>}
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600" /> Under Verification
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="font-mono text-slate-700">{email}</span>
                </span>
                {phone && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="font-mono text-slate-700">{phone}</span>
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Globe2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="font-semibold text-blue-700">{regionName || 'General Hub'}</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Global Status Feedback Messages */}
      {saveSuccessMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 flex items-center gap-2.5 shadow-sm animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="font-bold">{saveSuccessMsg}</span>
        </div>
      )}

      {saveErrorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 flex items-center gap-2.5 shadow-sm animate-in fade-in">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <span className="font-bold">{saveErrorMsg}</span>
        </div>
      )}

      {/* ─── Main Details & Territory Form ─── */}
      <form onSubmit={handleSaveProfile} className="space-y-6">

        {/* Section 1: Personal Contact Details */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-xs space-y-5">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <User className="w-5 h-5 text-blue-600" />
              Administrator Personal & Contact Details
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              These details appear on dispatch reports, merchant communications, and Super Admin oversight records.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Full Name / Contact Person <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="e.g. Gourav Boga"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-semibold focus:bg-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Mobile Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                placeholder="e.g. 9876543210"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono font-bold focus:bg-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Registered Email Address (Account Login)
              </label>
              <input
                type="email"
                value={email}
                disabled
                className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-500 font-mono font-semibold cursor-not-allowed"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Your email address is your official authentication anchor and cannot be altered directly.
              </p>
            </div>
          </div>
        </div>

        {/* Section 2: Hub & Territory Jurisdiction */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-600" />
                Territory Jurisdiction & Hub Coverage
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Orders, merchant registrations, and rider dispatch matching dynamically route to your hub based on these settings.
              </p>
            </div>

            <button
              type="button"
              onClick={handleDetectGps}
              disabled={detectingGps}
              className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5 self-start sm:self-auto shrink-0 shadow-2xs"
            >
              <Compass className={`w-3.5 h-3.5 ${detectingGps ? 'animate-spin' : ''}`} />
              <span>{detectingGps ? 'Detecting via Mapbox...' : 'Auto-Detect Hub GPS'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Regional Hub Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={regionName}
                onChange={(e) => setRegionName(e.target.value)}
                required
                placeholder="e.g. Uppal Mandal Hub (Medchal-Malkajgiri)"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-bold focus:bg-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                District / City <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                required
                placeholder="e.g. Medchal-Malkajgiri or Hyderabad"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-semibold focus:bg-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                State / Union Territory <span className="text-red-500">*</span>
              </label>
              <select
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-semibold focus:bg-white focus:outline-none focus:border-blue-500"
              >
                {INDIAN_STATES_AND_UTS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Assigned Operating Pincodes (Comma-separated)
              </label>
              <input
                type="text"
                value={pincodesInput}
                onChange={(e) => setPincodesInput(e.target.value)}
                placeholder="e.g. 500039, 500098, 500007"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono font-bold focus:bg-white focus:outline-none focus:border-blue-500"
              />
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <span className="text-[11px] text-slate-400 font-semibold">Active Territory Pincodes ({parsedPincodes.length}):</span>
                {parsedPincodes.length === 0 ? (
                  <span className="text-[11px] text-amber-600 font-mono">No pincodes assigned</span>
                ) : (
                  parsedPincodes.map((pin) => (
                    <span
                      key={pin}
                      className="text-[10px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-md"
                    >
                      {pin}
                    </span>
                  ))
                )}
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Physical Hub Base Address & Landmark
              </label>
              <textarea
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. Plot No 42, Industrial Area, Uppal, Medchal-Malkajgiri, Telangana - 500039"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-semibold focus:bg-white focus:outline-none focus:border-blue-500 resize-none"
              />
            </div>

            {latitude && longitude && (
              <div className="sm:col-span-2 p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  <span className="font-mono text-slate-700 font-semibold">
                    GPS Coordinates: {latitude.toFixed(6)}, {longitude.toFixed(6)}
                  </span>
                </div>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Synchronized
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Section 3: Official KYC & ID Proof Documents */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-xs space-y-5">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              Official Verification & ID Proof Document
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Upload Aadhaar Card, PAN Card, Trade License, or Hub Registration Certificate for Super Admin compliance audit.
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-blue-600" />
                <span>Regional Admin Official ID Proof</span>
                <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.2 rounded border border-orange-200">
                  Compliance Document
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Encrypted and stored in AWS Cloud S3. Click View to inspect in-page without leaving the portal.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {idProofUrl ? (
                <button
                  type="button"
                  onClick={() => setPreviewDoc({ title: `Official ID Proof • ${name || 'Hub Admin'}`, url: idProofUrl })}
                  className="text-[11px] text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1.5 border border-blue-200 bg-blue-50 px-3 py-1.5 rounded-xl cursor-pointer shadow-2xs hover:bg-blue-100 transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" /> View ID Proof
                </button>
              ) : (
                <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  Not Uploaded
                </span>
              )}

              <label className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition-all cursor-pointer shadow-2xs">
                <Upload className="w-3.5 h-3.5" />
                <span>{uploadingDoc ? 'Uploading to S3...' : idProofUrl ? 'Update ID Proof' : 'Upload ID Proof'}</span>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleFileUpload}
                  disabled={uploadingDoc}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Save Bar */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-4 sm:p-5 shadow-xs flex items-center justify-between gap-4">
          <div className="text-xs text-slate-500 hidden sm:block">
            Modifications will be dynamically updated across Super Admin and Customer dispatch.
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto px-7 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-xs sm:text-sm rounded-2xl shadow-md shadow-blue-500/25 transition-all active:scale-95 disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2 ml-auto"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{saving ? 'Saving Details...' : 'Save Hub Profile & Settings'}</span>
          </button>
        </div>
      </form>

      {/* ─── Section 4: Security & Password Update ─── */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-xs space-y-5">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-purple-600" />
            Account Security & Password Management
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Regularly rotate your regional administrator password to maintain hub command center security.
          </p>
        </div>

        {passwordSuccessMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{passwordSuccessMsg}</span>
          </div>
        )}

        {passwordErrorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{passwordErrorMsg}</span>
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Current Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono focus:bg-white focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                New Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 6 characters"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono focus:bg-white focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Confirm New Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono focus:bg-white focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={savingPassword}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all active:scale-95 disabled:opacity-60 cursor-pointer flex items-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{savingPassword ? 'Updating Password...' : 'Update Password'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* ─── In-Page Document Preview Lightbox Modal ─── */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh] border border-slate-200">
            {/* Modal Header */}
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                <h3 className="font-bold text-sm text-slate-900 truncate">{previewDoc.title}</h3>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={previewDoc.url}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-colors"
                  title="Open in new window"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewDoc(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Document Viewer Body */}
            <div className="flex-1 overflow-auto p-4 sm:p-6 bg-slate-950 flex items-center justify-center min-h-[350px]">
              {previewDoc.url.toLowerCase().includes('.pdf') ? (
                <iframe
                  src={previewDoc.url}
                  className="w-full h-[65vh] rounded-xl border border-slate-800"
                  title={previewDoc.title}
                />
              ) : (
                <img
                  src={previewDoc.url}
                  alt={previewDoc.title}
                  className="max-w-full max-h-[70vh] object-contain rounded-xl shadow-2xl"
                />
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
              <span className="font-mono text-[11px] text-slate-500">AWS Cloud S3 Verified Storage</span>
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="px-4 py-1.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
