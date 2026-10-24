import React, { useState, useRef, useEffect } from 'react';
import { useCustomer } from '../../context/CustomerContext';
import { useApp } from '../../context/AppContext';
import { api } from '../../lib/api';
import type { DashboardTab } from '../../components/dashboard/DashboardLayout';
import {
  User,
  Camera,
  Mail,
  Phone,
  Calendar,
  CheckCircle2,
  Package,
  MapPin,
  Heart,
  Edit3,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  LogOut,
  ChevronRight,
  AlertCircle,
  Loader2,
  Sparkles
} from 'lucide-react';

interface ProfileSettingsPageProps {
  onNavigate?: (tab: DashboardTab) => void;
}

export const ProfileSettingsPage: React.FC<ProfileSettingsPageProps> = ({ onNavigate }) => {
  const { profile, updateProfile, addresses, wishlist, logout } = useCustomer();
  const { navigateTo, orders } = useApp();

  // Profile Edit State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [name, setName] = useState(profile.name || '');
  const [email, setEmail] = useState(profile.email || '');
  const [phone, setPhone] = useState(profile.phone || '');
  const [dob, setDob] = useState(profile.dob || '');
  const [gender, setGender] = useState(profile.gender || '');
  const [avatar, setAvatar] = useState(profile.avatar || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Password Edit State
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sync state whenever customer context profile loads
  useEffect(() => {
    setName(profile.name || '');
    setEmail(profile.email || '');
    setPhone(profile.phone || '');
    setDob(profile.dob || '');
    setGender(profile.gender || '');
    setAvatar(profile.avatar || '');
  }, [profile]);

  // Reliable navigation across desktop, mobile and dashboard tabs
  const handleShortcutNavigate = (target: DashboardTab) => {
    if (onNavigate) {
      onNavigate(target);
    } else {
      navigateTo(target as any);
    }
  };

  // Avatar Upload Handler
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('Please select an image smaller than 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setAvatar(base64);
      try {
        await updateProfile({ avatar: base64 });
        setProfileSuccess('Profile picture updated successfully!');
        setTimeout(() => setProfileSuccess(null), 3000);
      } catch (err: any) {
        console.error('Avatar update failed:', err);
      }
    };
    reader.readAsDataURL(file);
  };

  // Profile Save
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setProfileError(null);
    setProfileSuccess(null);

    try {
      await updateProfile({
        name: name.trim(),
        phone: phone.trim(),
        dob: dob || undefined,
        gender: gender || undefined,
        avatar: avatar || undefined
      });
      setProfileSuccess('Profile updated successfully!');
      setIsEditingProfile(false);
      setTimeout(() => setProfileSuccess(null), 3000);
    } catch (err: any) {
      setProfileError(err.message || 'Failed to update profile. Please try again.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Profile Cancel
  const handleCancelProfile = () => {
    setName(profile.name || '');
    setEmail(profile.email || '');
    setPhone(profile.phone || '');
    setDob(profile.dob || '');
    setGender(profile.gender || '');
    setAvatar(profile.avatar || '');
    setProfileError(null);
    setIsEditingProfile(false);
  };

  // Password Update
  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match. Please re-enter.');
      return;
    }

    setIsSavingPassword(true);
    try {
      const res: any = await api.post('/api/customer/profile/change-password', {
        currentPassword,
        newPassword
      });

      setPasswordSuccess(res.message || 'Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setIsEditingPassword(false);
        setPasswordSuccess(null);
      }, 2000);
    } catch (err: any) {
      setPasswordError(err.message || 'Current password incorrect. Please try again.');
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleCancelPassword = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError(null);
    setIsEditingPassword(false);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 font-heading">Profile Settings</h1>
        <p className="text-xs text-gray-500 mt-0.5">Manage your personal information, delivery contact, and account security</p>
      </div>

      {/* Global Success Notification */}
      {profileSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2.5 text-xs text-emerald-800 font-bold animate-in fade-in duration-200">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <span>{profileSuccess}</span>
        </div>
      )}

      {/* 1. Profile Hero Card */}
      <div className="bg-white border border-brand-border/80 rounded-3xl p-6 shadow-premium relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
          {/* Avatar with Camera Trigger */}
          <div className="relative group shrink-0">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-brand-blue/10 border-3 border-white shadow-md flex items-center justify-center text-brand-blue text-3xl font-black">
              {avatar ? (
                <img src={avatar} alt={profile.name} className="w-full h-full object-cover" />
              ) : (
                <span>{(profile.name?.[0] || 'G').toUpperCase()}</span>
              )}
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-1 -right-1 p-2 bg-[#0F2C59] hover:bg-[#1A3D73] text-white rounded-full shadow-lg transition-transform active:scale-95 cursor-pointer border-2 border-white"
              title="Upload profile picture"
            >
              <Camera size={14} />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
          </div>

          {/* User Meta */}
          <div className="flex-1 text-center sm:text-left min-w-0">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
              <h2 className="text-xl font-black text-brand-graphite font-heading truncate">
                {profile.name || 'ShopIndia Customer'}
              </h2>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold border border-emerald-200/80">
                <Sparkles size={11} className="text-emerald-600" />
                <span>Plus Member</span>
              </span>
            </div>
            <p className="text-xs text-gray-500 font-medium">{profile.email}</p>
            <p className="text-[11px] text-gray-400 mt-1">
              Customer Account • Active Member
            </p>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-brand-blue hover:underline cursor-pointer"
            >
              <Camera size={12} />
              <span>Change Profile Picture</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Quick Shortcuts Strip (Orders, Saved Addresses, Wishlist) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Shortcut 1: My Orders */}
        <button
          onClick={() => handleShortcutNavigate('orders')}
          className="bg-white hover:bg-gray-50 border border-gray-200/80 rounded-2xl p-4 shadow-xs text-left transition-all active:scale-[0.98] cursor-pointer flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Package size={18} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-900 font-heading">My Orders</p>
              <p className="text-[11px] text-gray-500">{orders?.length ? `${orders.length} placed` : 'Track purchases'}</p>
            </div>
          </div>
          <ChevronRight size={14} className="text-gray-400 group-hover:text-blue-600 transition-colors" />
        </button>

        {/* Shortcut 2: Saved Addresses */}
        <button
          onClick={() => handleShortcutNavigate('addresses')}
          className="bg-white hover:bg-gray-50 border border-gray-200/80 rounded-2xl p-4 shadow-xs text-left transition-all active:scale-[0.98] cursor-pointer flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <MapPin size={18} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-900 font-heading">Saved Addresses</p>
              <p className="text-[11px] text-gray-500">{addresses?.length ? `${addresses.length} saved` : 'Delivery locations'}</p>
            </div>
          </div>
          <ChevronRight size={14} className="text-gray-400 group-hover:text-emerald-600 transition-colors" />
        </button>

        {/* Shortcut 3: Wishlist */}
        <button
          onClick={() => handleShortcutNavigate('wishlist')}
          className="bg-white hover:bg-gray-50 border border-gray-200/80 rounded-2xl p-4 shadow-xs text-left transition-all active:scale-[0.98] cursor-pointer flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Heart size={18} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-900 font-heading">My Wishlist</p>
              <p className="text-[11px] text-gray-500">{wishlist?.length ? `${wishlist.length} saved` : 'Saved items'}</p>
            </div>
          </div>
          <ChevronRight size={14} className="text-gray-400 group-hover:text-rose-600 transition-colors" />
        </button>
      </div>

      {/* 3. Personal Details Card (Default View Mode with Edit Profile Toggle) */}
      <div className="bg-white border border-brand-border/80 rounded-3xl p-6 shadow-premium space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-base text-gray-900 font-heading">Personal Details</h3>
            <p className="text-xs text-gray-500">Contact information used across deliveries and notifications</p>
          </div>

          {!isEditingProfile ? (
            <button
              type="button"
              onClick={() => setIsEditingProfile(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-xs font-bold transition-all cursor-pointer border border-blue-200/60"
            >
              <Edit3 size={13} />
              <span>Edit Profile</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCancelProfile}
                disabled={isSavingProfile}
                className="px-3 py-1.5 text-xs font-bold text-gray-600 hover:text-gray-900 rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        {profileError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-semibold flex items-center gap-2">
            <AlertCircle size={14} className="shrink-0 text-red-500" />
            <span>{profileError}</span>
          </div>
        )}

        {/* View Mode (Clean, formatted display) */}
        {!isEditingProfile ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 bg-gray-50/70 rounded-2xl border border-gray-100">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Full Name</span>
              <p className="text-sm font-bold text-gray-900">{profile.name || 'Not provided'}</p>
            </div>

            <div className="p-3.5 bg-gray-50/70 rounded-2xl border border-gray-100">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Email Address</span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                  <CheckCircle2 size={10} /> Verified
                </span>
              </div>
              <p className="text-sm font-bold text-gray-900">{profile.email}</p>
            </div>

            <div className="p-3.5 bg-gray-50/70 rounded-2xl border border-gray-100">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Mobile Number</span>
              <p className="text-sm font-bold text-gray-900 font-mono">{profile.phone || '+91 98765 43210'}</p>
            </div>

            <div className="p-3.5 bg-gray-50/70 rounded-2xl border border-gray-100">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Gender</span>
              <p className="text-sm font-bold text-gray-900 capitalize">{profile.gender || 'Not specified'}</p>
            </div>

            <div className="p-3.5 bg-gray-50/70 rounded-2xl border border-gray-100 md:col-span-2">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Date of Birth</span>
              <p className="text-sm font-bold text-gray-900">
                {profile.dob ? new Date(profile.dob).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Not provided'}
              </p>
            </div>
          </div>
        ) : (
          /* Edit Mode (Interactive inputs) */
          <form onSubmit={handleSaveProfile} className="space-y-4 text-xs animate-in fade-in duration-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Full Name */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                  <User size={13} className="text-gray-400" />
                  <span>Full Name</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Enter your full name"
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0F2C59]/15"
                />
              </div>

              {/* Email Address (Read Only) */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                  <Mail size={13} className="text-gray-400" />
                  <span>Email Address</span>
                  <span className="text-[10px] text-emerald-600 font-bold ml-auto flex items-center gap-0.5">
                    <CheckCircle2 size={10} /> Verified
                  </span>
                </label>
                <input
                  type="email"
                  value={email}
                  disabled
                  className="w-full px-3.5 py-2.5 bg-gray-100 border border-gray-200 rounded-xl text-xs font-bold text-gray-500 cursor-not-allowed"
                />
              </div>

              {/* Mobile Number */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                  <Phone size={13} className="text-gray-400" />
                  <span>Mobile Number</span>
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-900 font-mono focus:outline-none focus:ring-2 focus:ring-[#0F2C59]/15"
                />
              </div>

              {/* Gender Selector */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700">Gender</label>
                <div className="grid grid-cols-3 gap-2">
                  {['Male', 'Female', 'Other'].map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGender(g)}
                      className={`py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                        gender.toLowerCase() === g.toLowerCase()
                          ? 'bg-[#0F2C59] text-white border-[#0F2C59]'
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date of Birth */}
              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                  <Calendar size={13} className="text-gray-400" />
                  <span>Date of Birth</span>
                </label>
                <input
                  type="date"
                  value={dob ? dob.slice(0, 10) : ''}
                  onChange={(e) => setDob(e.target.value)}
                  className="w-full sm:w-64 px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0F2C59]/15"
                />
              </div>
            </div>

            {/* Save / Cancel Action Bar */}
            <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
              <button
                type="submit"
                disabled={isSavingProfile}
                className="px-5 py-2.5 bg-[#0F2C59] hover:bg-[#1A3D73] text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer flex items-center gap-2 disabled:opacity-60"
              >
                {isSavingProfile && <Loader2 size={13} className="animate-spin" />}
                <span>{isSavingProfile ? 'Saving Changes...' : 'Save Changes'}</span>
              </button>
              <button
                type="button"
                onClick={handleCancelProfile}
                disabled={isSavingProfile}
                className="px-4 py-2.5 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {/* 4. Login & Security Card (Default View Mode with Change Password Toggle) */}
      <div className="bg-white border border-brand-border/80 rounded-3xl p-6 shadow-premium space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-base text-gray-900 font-heading">Login &amp; Security</h3>
            <p className="text-xs text-gray-500">Manage account authentication for {profile.email}</p>
          </div>

          {!isEditingPassword ? (
            <button
              type="button"
              onClick={() => setIsEditingPassword(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold transition-all cursor-pointer border border-gray-200/80"
            >
              <Lock size={12} />
              <span>Change Password</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCancelPassword}
              disabled={isSavingPassword}
              className="px-3 py-1.5 text-xs font-bold text-gray-600 hover:text-gray-900 rounded-xl transition-all cursor-pointer"
            >
              Cancel
            </button>
          )}
        </div>

        {passwordSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-bold flex items-center gap-2 animate-in fade-in duration-200">
            <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
            <span>{passwordSuccess}</span>
          </div>
        )}

        {passwordError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-semibold flex items-center gap-2 animate-in fade-in duration-200">
            <AlertCircle size={14} className="text-red-500 shrink-0" />
            <span>{passwordError}</span>
          </div>
        )}

        {/* View Mode (Masked password display) */}
        {!isEditingPassword ? (
          <div className="p-4 bg-gray-50/70 rounded-2xl border border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gray-200/80 text-gray-700 flex items-center justify-center shrink-0">
                <ShieldCheck size={18} />
              </div>
              <div>
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Account Password</span>
                <span className="text-sm font-mono tracking-widest text-gray-700 font-black">••••••••••••</span>
              </div>
            </div>
            <span className="text-[11px] text-gray-400 hidden sm:inline">Encrypted &amp; Secured</span>
          </div>
        ) : (
          /* Edit Mode (Password Change Form) */
          <form onSubmit={handleSavePassword} className="space-y-3.5 text-xs animate-in fade-in duration-200">
            {/* Current Password */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">Current Password</label>
              <div className="relative">
                <input
                  type={showCurrentPass ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  placeholder="Enter your current password"
                  className="w-full px-3.5 py-2.5 pr-10 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0F2C59]/15"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPass(!showCurrentPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                >
                  {showCurrentPass ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">New Password (minimum 6 characters)</label>
              <div className="relative">
                <input
                  type={showNewPass ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="Enter new strong password"
                  className="w-full px-3.5 py-2.5 pr-10 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0F2C59]/15"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                >
                  {showNewPass ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700">Confirm New Password</label>
              <div className="relative">
                <input
                  type={showConfirmPass ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="Confirm new password"
                  className="w-full px-3.5 py-2.5 pr-10 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0F2C59]/15"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPass(!showConfirmPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                >
                  {showConfirmPass ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={isSavingPassword || !currentPassword || !newPassword || !confirmPassword}
                className="px-5 py-2.5 bg-[#0F2C59] hover:bg-[#1A3D73] text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
              >
                {isSavingPassword && <Loader2 size={13} className="animate-spin" />}
                <span>{isSavingPassword ? 'Updating Password...' : 'Update Password'}</span>
              </button>
              <button
                type="button"
                onClick={handleCancelPassword}
                disabled={isSavingPassword}
                className="px-4 py-2.5 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {/* 5. Minimal Account Actions (Logout) */}
      <div className="pt-2 text-center sm:text-left">
        <button
          onClick={logout}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl border border-red-200/80 transition-all cursor-pointer"
        >
          <LogOut size={14} />
          <span>Log out from this device</span>
        </button>
      </div>
    </div>
  );
};
