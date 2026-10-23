import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRider } from '../context/RiderContext';
import {
  ShieldCheck,
  AlertCircle,
  Bike,
  Navigation,
  CheckCircle2,
  Wrench,
  Check,
  User,
  Phone,
  Mail,
  MapPin,
  Upload,
  CreditCard,
  Save,
  CheckCircle,
  ExternalLink,
} from 'lucide-react';
import {
  PARTNER_SKILLS,
  PARTNER_TYPES,
  type PartnerType,
} from '../../data/partnerSkills';

export const RiderProfile: React.FC = () => {
  const { user } = useAuth();
  const { profile, updatePartnerProfile, uploadRiderDoc, updateGpsLocation } = useRider();

  // Active section tab
  const [activeTab, setActiveTab] = useState<'identity' | 'vehicle' | 'kyc' | 'bank' | 'skills'>('identity');

  // 1. Personal & Identity state
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [address, setAddress] = useState(profile?.address || '');
  const [isGpsUpdating, setIsGpsUpdating] = useState(false);
  const [gpsFeedback, setGpsFeedback] = useState<string | null>(null);

  // 2. Vehicle state
  const [vehicleType, setVehicleType] = useState(profile?.vehicleType || 'scooter');
  const [vehicleNumber, setVehicleNumber] = useState(profile?.vehicleNumber || '');
  const [rcUrl, setRcUrl] = useState(profile?.rcUrl || '');

  // 3. KYC Documents state
  const [licenseNumber, setLicenseNumber] = useState(profile?.licenseNumber || '');
  const [licenseUrl, setLicenseUrl] = useState(profile?.licenseUrl || '');
  const [aadhaarNumber, setAadhaarNumber] = useState(profile?.aadhaarNumber || '');
  const [aadhaarUrl, setAadhaarUrl] = useState(profile?.aadhaarUrl || '');
  const [panNumber, setPanNumber] = useState(profile?.panNumber || '');
  const [panUrl, setPanUrl] = useState(profile?.panUrl || '');

  // 4. Bank & UPI state
  const [upiId, setUpiId] = useState(profile?.upiId || '');
  const [accountHolder, setAccountHolder] = useState(profile?.accountHolder || '');
  const [accountNumber, setAccountNumber] = useState(profile?.accountNumber || '');
  const [ifsc, setIfsc] = useState(profile?.ifsc || '');
  const [bankName, setBankName] = useState(profile?.bankName || '');

  // 5. Operating Radius & Skills state
  const [radius, setRadius] = useState(profile?.serviceRadiusKm || 25);
  const [partnerType, setPartnerType] = useState<PartnerType>(
    (profile?.partnerType as PartnerType) || 'delivery'
  );
  const [skills, setSkills] = useState<string[]>(profile?.skills || []);
  const [experienceYears, setExperienceYears] = useState<number>(profile?.experienceYears || 1);

  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [saveErrorMsg, setSaveErrorMsg] = useState<string | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);

  // Sync state whenever profile or user loads
  useEffect(() => {
    if (user) {
      if (user.name) setName(user.name);
      if (user.phone) setPhone(user.phone);
    }
    if (profile) {
      if (profile.address) setAddress(profile.address);
      if (profile.vehicleType) setVehicleType(profile.vehicleType);
      if (profile.vehicleNumber) setVehicleNumber(profile.vehicleNumber);
      if (profile.rcUrl) setRcUrl(profile.rcUrl);

      if (profile.licenseNumber) setLicenseNumber(profile.licenseNumber);
      if (profile.licenseUrl) setLicenseUrl(profile.licenseUrl);
      if (profile.aadhaarNumber) setAadhaarNumber(profile.aadhaarNumber);
      if (profile.aadhaarUrl) setAadhaarUrl(profile.aadhaarUrl);
      if (profile.panNumber) setPanNumber(profile.panNumber);
      if (profile.panUrl) setPanUrl(profile.panUrl);

      if (profile.upiId) setUpiId(profile.upiId);
      if (profile.accountHolder) setAccountHolder(profile.accountHolder);
      if (profile.accountNumber) setAccountNumber(profile.accountNumber);
      if (profile.ifsc) setIfsc(profile.ifsc);
      if (profile.bankName) setBankName(profile.bankName);

      if (profile.serviceRadiusKm) setRadius(profile.serviceRadiusKm);
      if (profile.partnerType) setPartnerType(profile.partnerType as PartnerType);
      if (profile.skills) setSkills(profile.skills);
      if (profile.experienceYears) setExperienceYears(profile.experienceYears);
    }
  }, [profile, user]);

  // Handle Document Upload to AWS S3
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, docType: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingDoc(docType);
      setSaveErrorMsg(null);
      const res = await uploadRiderDoc(file, docType);
      if (res.success && res.url) {
        if (docType === 'rc') setRcUrl(res.url);
        if (docType === 'license') setLicenseUrl(res.url);
        if (docType === 'aadhaar') setAadhaarUrl(res.url);
        if (docType === 'pan') setPanUrl(res.url);
        setSaveSuccessMsg(`File uploaded to AWS S3. Click "Save Changes" to commit.`);
        setTimeout(() => setSaveSuccessMsg(null), 3000);
      } else {
        setSaveErrorMsg(res.error || 'Failed to upload document to AWS S3');
      }
    } catch (err: unknown) {
      setSaveErrorMsg(err instanceof Error ? err.message : 'Upload error');
    } finally {
      setUploadingDoc(null);
    }
  };

  // Handle GPS Auto-detect
  const handleDetectLocation = async () => {
    try {
      setIsGpsUpdating(true);
      setGpsFeedback(null);
      const res = await updateGpsLocation();
      if (res.success && res.address) {
        setAddress(res.address);
        setGpsFeedback('Base station GPS synchronized via Mapbox!');
        setTimeout(() => setGpsFeedback(null), 3500);
      } else {
        setGpsFeedback(res.error || 'Failed to detect GPS location');
      }
    } catch {
      setGpsFeedback('Error getting location.');
    } finally {
      setIsGpsUpdating(false);
    }
  };

  // Save all profile changes directly to AWS RDS PostgreSQL
  const handleSaveProfile = async () => {
    setIsSaving(true);
    setSaveErrorMsg(null);
    setSaveSuccessMsg(null);

    const payload = {
      name: name.trim(),
      phone: phone.trim(),
      address: address.trim(),
      vehicleType,
      vehicleNumber: vehicleNumber.trim().toUpperCase(),
      rcUrl,
      licenseNumber: licenseNumber.trim().toUpperCase(),
      licenseUrl,
      aadhaarNumber: aadhaarNumber.trim(),
      aadhaarUrl,
      panNumber: panNumber.trim().toUpperCase(),
      panUrl,
      upiId: upiId.trim(),
      accountHolder: accountHolder.trim(),
      accountNumber: accountNumber.trim(),
      ifsc: ifsc.trim().toUpperCase(),
      bankName: bankName.trim(),
      serviceRadiusKm: radius,
      partnerType,
      skills,
      experienceYears,
    };

    const success = await updatePartnerProfile(payload);
    setIsSaving(false);

    if (success) {
      setSaveSuccessMsg('Profile and KYC details successfully updated in AWS!');
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    } else {
      setSaveErrorMsg('Failed to update details. Please check your network and try again.');
    }
  };

  const toggleSkill = (skillId: string) => {
    setSkills((prev) =>
      prev.includes(skillId) ? prev.filter((s) => s !== skillId) : [...prev, skillId]
    );
  };

  const homeSkills = PARTNER_SKILLS.filter((s) => s.category === 'home');
  const vehicleSkills = PARTNER_SKILLS.filter((s) => s.category === 'vehicle');

  return (
    <div className="space-y-5 pb-24 text-slate-800 animate-in fade-in duration-200 max-w-4xl mx-auto">
      
      {/* Header Profile Summary Card */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-xs relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center text-white font-black text-2xl shadow-md shadow-orange-500/20">
              {name ? name[0].toUpperCase() : 'R'}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900">{name || 'Partner Profile'}</h2>
                {profile?.isApproved ? (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> KYC Verified
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600" /> KYC Under Review
                  </span>
                )}
                <span className="text-[11px] font-bold text-orange-700 bg-orange-50 px-2.5 py-0.5 rounded-full border border-orange-200 uppercase">
                  {vehicleType} • {vehicleNumber || 'Plate Pending'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" /> {user?.email}
                {phone && (
                  <>
                    <span className="text-slate-300">•</span>
                    <Phone className="w-3.5 h-3.5 text-slate-400" /> {phone}
                  </>
                )}
              </p>
              <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="line-clamp-1">{address || 'No base address configured'}</span>
              </p>
            </div>
          </div>

          <div className="flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
            <span className="text-[11px] font-bold text-slate-400">AWS Cloud Synced</span>
            <span className="text-xs font-mono font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-xl">
              PostgreSQL RDS Active
            </span>
          </div>
        </div>
      </div>

      {/* Profile Section Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setActiveTab('identity')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-xs whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'identity'
              ? 'bg-orange-500 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <User className="w-4 h-4" />
          <span>Identity & Contact</span>
        </button>

        <button
          onClick={() => setActiveTab('vehicle')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-xs whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'vehicle'
              ? 'bg-orange-500 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Bike className="w-4 h-4" />
          <span>Vehicle Details</span>
        </button>

        <button
          onClick={() => setActiveTab('kyc')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-xs whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'kyc'
              ? 'bg-orange-500 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>KYC Documents</span>
        </button>

        <button
          onClick={() => setActiveTab('bank')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-xs whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'bank'
              ? 'bg-orange-500 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Bank & UPI</span>
        </button>

        <button
          onClick={() => setActiveTab('skills')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-xs whitespace-nowrap transition-all cursor-pointer ${
            activeTab === 'skills'
              ? 'bg-orange-500 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Wrench className="w-4 h-4" />
          <span>Skills & Radius</span>
        </button>
      </div>

      {/* TAB 1: IDENTITY & CONTACT DETAILS */}
      {activeTab === 'identity' && (
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-xs space-y-5 animate-in fade-in">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <User className="w-5 h-5 text-orange-600" />
              Rider Personal Identity & Contact
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Update your registered name, phone number, and primary operational base address.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Full Name (As per Aadhaar/DL)
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Gourav Boga"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-medium focus:bg-white focus:outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Contact Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 9876543210"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-medium focus:bg-white focus:outline-none focus:border-orange-500"
              />
            </div>

            <div className="sm:col-span-2">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Operational Base Address / Territory
                </label>
                <button
                  type="button"
                  onClick={handleDetectLocation}
                  disabled={isGpsUpdating}
                  className="text-[11px] text-orange-600 hover:text-orange-700 font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <Navigation className={`w-3 h-3 ${isGpsUpdating ? 'animate-spin' : ''}`} />
                  <span>{isGpsUpdating ? 'Detecting GPS...' : 'Auto-fill from GPS'}</span>
                </button>
              </div>
              <textarea
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. Road No 21, Dilsukhnagar, Hyderabad, Telangana 507001"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 font-medium focus:bg-white focus:outline-none focus:border-orange-500 resize-none"
              />
              {gpsFeedback && (
                <p className="text-[11px] font-semibold text-emerald-600 mt-1 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> {gpsFeedback}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: VEHICLE & FLEET SPECIFICATION */}
      {activeTab === 'vehicle' && (
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-xs space-y-5 animate-in fade-in">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Bike className="w-5 h-5 text-orange-600" />
              Vehicle Type & Registration Plate
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Specify your delivery vehicle type and official license plate number.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Vehicle Category
              </label>
              <select
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-medium focus:bg-white focus:outline-none focus:border-orange-500 cursor-pointer"
              >
                <option value="scooter">🛵 Scooter / Moped (Activa, Access, Jupiter)</option>
                <option value="bike">🏍️ Motorcycle / Bike (Pulsar, Splendor, FZ)</option>
                <option value="electric">⚡ Electric Scooter / EV (Ola, Ather, Chetak)</option>
                <option value="cycle">🚲 Bicycle / Non-motorized</option>
                <option value="auto">🛺 Delivery Auto / 3-Wheeler Cargo</option>
                <option value="van">🚐 Delivery Van / Mini Cargo (Tata Ace)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Registration Plate Number
              </label>
              <input
                type="text"
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                placeholder="e.g. AP29L0679 or TS09UB1234"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono font-bold focus:bg-white focus:outline-none focus:border-orange-500 uppercase"
              />
            </div>

            {/* RC Certificate Document Upload */}
            <div className="sm:col-span-2 border-t border-slate-100 pt-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-800">
                    Vehicle RC (Registration Certificate)
                  </label>
                  <p className="text-[11px] text-slate-500">
                    Upload official RC book photo or smartcard scan (Saved securely in AWS S3)
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {rcUrl && (
                    <a
                      href={rcUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1 border border-blue-200 bg-blue-50 px-2.5 py-1 rounded-xl"
                    >
                      <ExternalLink className="w-3 h-3" /> View RC Document
                    </a>
                  )}

                  <label className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs px-3.5 py-2 rounded-xl transition-all cursor-pointer">
                    <Upload className="w-3.5 h-3.5 text-slate-600" />
                    <span>{uploadingDoc === 'rc' ? 'Uploading to S3...' : rcUrl ? 'Replace RC' : 'Upload RC'}</span>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) => handleFileUpload(e, 'rc')}
                      disabled={uploadingDoc === 'rc'}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: KYC DOCUMENTS & IDENTITY */}
      {activeTab === 'kyc' && (
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-xs space-y-6 animate-in fade-in">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-orange-600" />
              Government KYC Identification & Document Uploads
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              All documents are stored directly in AWS Cloud Storage (S3) and encrypted for compliance.
            </p>
          </div>

          <div className="space-y-4">
            {/* Driving License */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Driving License Number (DL)
                  </label>
                  <input
                    type="text"
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value.toUpperCase())}
                    placeholder="e.g. DL-0420110012345"
                    className="w-full sm:w-80 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-orange-500 uppercase"
                  />
                </div>

                <div className="flex items-center gap-2">
                  {licenseUrl && (
                    <a
                      href={licenseUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1 border border-blue-200 bg-blue-50 px-2.5 py-1.5 rounded-xl"
                    >
                      <ExternalLink className="w-3 h-3" /> View DL Photo
                    </a>
                  )}

                  <label className="flex items-center gap-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 font-bold text-xs px-3.5 py-2 rounded-xl transition-all cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{uploadingDoc === 'license' ? 'Uploading to S3...' : licenseUrl ? 'Update DL' : 'Upload DL'}</span>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) => handleFileUpload(e, 'license')}
                      disabled={uploadingDoc === 'license'}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* Aadhaar Card */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Aadhaar Card Number (12 Digits)
                  </label>
                  <input
                    type="text"
                    maxLength={12}
                    value={aadhaarNumber}
                    onChange={(e) => setAadhaarNumber(e.target.value.replace(/\D/g, ''))}
                    placeholder="e.g. 5432 1098 7654"
                    className="w-full sm:w-80 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div className="flex items-center gap-2">
                  {aadhaarUrl && (
                    <a
                      href={aadhaarUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1 border border-blue-200 bg-blue-50 px-2.5 py-1.5 rounded-xl"
                    >
                      <ExternalLink className="w-3 h-3" /> View Aadhaar
                    </a>
                  )}

                  <label className="flex items-center gap-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 font-bold text-xs px-3.5 py-2 rounded-xl transition-all cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{uploadingDoc === 'aadhaar' ? 'Uploading to S3...' : aadhaarUrl ? 'Update Aadhaar' : 'Upload Aadhaar'}</span>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) => handleFileUpload(e, 'aadhaar')}
                      disabled={uploadingDoc === 'aadhaar'}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* PAN Card */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Permanent Account Number (PAN)
                  </label>
                  <input
                    type="text"
                    maxLength={10}
                    value={panNumber}
                    onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                    placeholder="e.g. ABCDE1234F"
                    className="w-full sm:w-80 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-orange-500 uppercase"
                  />
                </div>

                <div className="flex items-center gap-2">
                  {panUrl && (
                    <a
                      href={panUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1 border border-blue-200 bg-blue-50 px-2.5 py-1.5 rounded-xl"
                    >
                      <ExternalLink className="w-3 h-3" /> View PAN Photo
                    </a>
                  )}

                  <label className="flex items-center gap-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 font-bold text-xs px-3.5 py-2 rounded-xl transition-all cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{uploadingDoc === 'pan' ? 'Uploading to S3...' : panUrl ? 'Update PAN' : 'Upload PAN'}</span>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) => handleFileUpload(e, 'pan')}
                      disabled={uploadingDoc === 'pan'}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: BANK & UPI DETAILS */}
      {activeTab === 'bank' && (
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-xs space-y-5 animate-in fade-in">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-orange-600" />
              Direct Earnings Settlement & UPI Details
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Deliveries and service job payouts will be wired directly to this UPI ID or Bank Account.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Instant Payout UPI ID (GPay / PhonePe / Paytm)
              </label>
              <input
                type="text"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="e.g. rider@okaxis or 9876543210@paytm"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-medium focus:bg-white focus:outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Account Holder Name
              </label>
              <input
                type="text"
                value={accountHolder}
                onChange={(e) => setAccountHolder(e.target.value)}
                placeholder="As printed on bank passbook"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-medium focus:bg-white focus:outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Bank Account Number
              </label>
              <input
                type="text"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="e.g. 50100234567890"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono font-medium focus:bg-white focus:outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                IFSC Code & Bank Name
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={ifsc}
                  onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                  placeholder="IFSC (e.g. HDFC0001234)"
                  className="w-1/2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-mono font-bold uppercase focus:bg-white focus:outline-none focus:border-orange-500"
                />
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="Bank Name"
                  className="w-1/2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 font-medium focus:bg-white focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: SKILLS & OPERATING RADIUS */}
      {activeTab === 'skills' && (
        <div className="space-y-5 animate-in fade-in">
          {/* Operating Radius Slider */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-orange-600">
                <Navigation className="w-5 h-5" />
                <h3 className="text-base font-bold text-slate-900">Delivery & Service Operating Radius</h3>
              </div>
              <span className="text-lg sm:text-xl font-black text-orange-600 bg-orange-50 border border-orange-200 px-3.5 py-1 rounded-xl">
                {radius} km
              </span>
            </div>

            <p className="text-xs text-slate-500">
              Only delivery and service requests within this distance from your base station will be broadcasted to you.
            </p>

            <div className="py-2">
              <input
                type="range"
                min="10"
                max="100"
                step="5"
                value={radius}
                onChange={(e) => setRadius(parseInt(e.target.value, 10))}
                className="w-full accent-orange-500 cursor-pointer h-2 bg-slate-100 rounded-lg"
              />
              <div className="flex justify-between text-[11px] text-slate-400 font-mono mt-2">
                <span>10 km (Hyper-local)</span>
                <span>50 km (Citywide)</span>
                <span>100 km (Regional)</span>
              </div>
            </div>
          </div>

          {/* Partner Role & Skills */}
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-7 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-orange-600">
                <Wrench className="w-5 h-5" />
                <h3 className="text-base font-bold text-slate-900">Partner Role & Multi-Select Service Skills</h3>
              </div>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-xl">
                {skills.length} Skills Active
              </span>
            </div>

            {/* Specialization Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {PARTNER_TYPES.map((type) => {
                const isSelected = partnerType === type.id;
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setPartnerType(type.id)}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-orange-50 border-orange-500 text-slate-900 shadow-2xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-orange-200'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-2xl">{type.icon}</span>
                        {isSelected && (
                          <span className="w-4 h-4 rounded-full bg-orange-500 text-white flex items-center justify-center text-[10px] font-black">
                            ✓
                          </span>
                        )}
                      </div>
                      <div className="font-bold text-xs text-slate-900">{type.label}</div>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1 leading-snug">{type.sublabel}</p>
                  </button>
                );
              })}
            </div>

            {/* Multi-Select Service Skills */}
            {(partnerType === 'service' || partnerType === 'both') && (
              <div className="space-y-4 pt-3 border-t border-slate-100">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[...homeSkills, ...vehicleSkills].map((skill) => {
                    const isChecked = skills.includes(skill.id);
                    return (
                      <button
                        key={skill.id}
                        type="button"
                        onClick={() => toggleSkill(skill.id)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 ${
                          isChecked
                            ? 'bg-orange-50 border-orange-500 text-orange-950 font-bold shadow-2xs'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-base">{skill.icon}</span>
                          <span className="line-clamp-1">{skill.name}</span>
                        </div>
                        <div
                          className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${
                            isChecked
                              ? 'bg-orange-500 border-orange-500 text-white'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

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

      {/* Save Button Bar (Sticky at bottom of card) */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-4 sm:p-5 shadow-xs flex items-center justify-between gap-4">
        <div className="text-xs text-slate-500 hidden sm:block">
          All modifications are immediately synced to your AWS PostgreSQL record.
        </div>

        <button
          onClick={handleSaveProfile}
          disabled={isSaving}
          className="w-full sm:w-auto px-7 py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-xs sm:text-sm rounded-2xl shadow-md shadow-orange-500/25 transition-all active:scale-95 disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2 ml-auto"
        >
          {isSaving ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          <span>{isSaving ? 'Saving to AWS...' : 'Save Changes'}</span>
        </button>
      </div>

    </div>
  );
};
