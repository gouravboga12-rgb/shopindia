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
  LogOut,
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
    <div className="space-y-3.5 max-w-xl mx-auto px-1 sm:px-0 pb-16">
      {/* Top Page Title */}
      <div className="px-1 pt-1">
        <h1 className="text-xl font-bold text-gray-900 font-heading">Profile Settings</h1>
        <p className="text-xs text-gray-500 mt-0.5">Manage your personal information and account security</p>
      </div>

      {/* Global Success Notification */}
      {profileSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2 text-xs text-emerald-800 font-bold animate-in fade-in duration-200">
          <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
          <span>{profileSuccess}</span>
        </div>
      )}

      {/* 1. Profile Hero Card (Compact, Proportional Mobile Layout) */}
      <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-xs">
        <div className="flex items-center gap-3.5">
          {/* Avatar with Camera Overlay */}
          <div className="relative shrink-0">
            <div className="w-14 h-14 rounded-full overflow-hidden bg-blue-50 border-2 border-white shadow-xs flex items-center justify-center text-brand-blue text-xl font-black">
              {avatar ? (
                <img src={avatar} alt={profile.name} className="w-full h-full object-cover" />
              ) : (
                <span>{(profile.name?.[0] || 'G').toUpperCase()}</span>
              )}
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#0F2C59] hover:bg-[#1A3D73] text-white rounded-full flex items-center justify-center shadow-sm cursor-pointer border border-white transition-transform active:scale-95"
              title="Change Photo"
            >
              <Camera size={11} />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
          </div>

          {/* User Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-extrabold text-gray-900 truncate">
                {profile.name || 'ShopIndia Customer'}
              </h2>
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-bold border border-emerald-200/60 shrink-0">
                <Sparkles size={9} className="text-emerald-600" />
                <span>Plus Member</span>
              </span>
            </div>
            <p className="text-xs text-gray-500 truncate mt-0.5">{profile.email}</p>
            <p className="text-[11px] font-mono text-gray-400 mt-0.5">{profile.phone || '+91 98765 43210'}</p>
          </div>
        </div>
      </div>

      {/* 2. Quick Shortcuts (Orders, Addresses, Wishlist - Uniform 3 Columns) */}
      <div className="grid grid-cols-3 gap-2">
        {/* Shortcut 1: My Orders */}
        <button
          onClick={() => handleShortcutNavigate('orders')}
          className="bg-white hover:bg-gray-50 border border-gray-100 rounded-2xl p-3 shadow-xs text-center transition-all active:scale-[0.98] cursor-pointer flex flex-col items-center justify-center gap-1 group"
        >
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Package size={15} />
          </div>
          <span className="text-xs font-bold text-gray-900 leading-tight">My Orders</span>
          <span className="text-[10px] text-gray-400">{orders?.length ? `${orders.length} placed` : 'Track'}</span>
        </button>

        {/* Shortcut 2: Saved Addresses */}
        <button
          onClick={() => handleShortcutNavigate('addresses')}
          className="bg-white hover:bg-gray-50 border border-gray-100 rounded-2xl p-3 shadow-xs text-center transition-all active:scale-[0.98] cursor-pointer flex flex-col items-center justify-center gap-1 group"
        >
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <MapPin size={15} />
          </div>
          <span className="text-xs font-bold text-gray-900 leading-tight">Addresses</span>
          <span className="text-[10px] text-gray-400">{addresses?.length ? `${addresses.length} saved` : 'Locations'}</span>
        </button>

        {/* Shortcut 3: Wishlist */}
        <button
          onClick={() => handleShortcutNavigate('wishlist')}
          className="bg-white hover:bg-gray-50 border border-gray-100 rounded-2xl p-3 shadow-xs text-center transition-all active:scale-[0.98] cursor-pointer flex flex-col items-center justify-center gap-1 group"
        >
          <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Heart size={15} />
          </div>
          <span className="text-xs font-bold text-gray-900 leading-tight">Wishlist</span>
          <span className="text-[10px] text-gray-400">{wishlist?.length ? `${wishlist.length} saved` : 'Saved'}</span>
        </button>
      </div>

      {/* 3. Personal Details (Uniform Settings List Layout) */}
      <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-xs space-y-3">
        {/* Section Header */}
        <div className="flex items-center justify-between pb-2 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-xs uppercase tracking-wider text-gray-500">Personal Information</h3>
          </div>

          {!isEditingProfile ? (
            <button
              type="button"
              onClick={() => setIsEditingProfile(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-bold transition-all cursor-pointer border border-blue-200/50"
            >
              <Edit3 size={11} />
              <span>Edit</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCancelProfile}
              disabled={isSavingProfile}
              className="px-2 py-1 text-xs font-bold text-gray-500 hover:text-gray-800 transition-all cursor-pointer"
            >
              Cancel
            </button>
          )}
        </div>

        {profileError && (
          <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-semibold flex items-center gap-1.5">
            <AlertCircle size={13} className="shrink-0 text-red-500" />
            <span>{profileError}</span>
          </div>
        )}

        {/* View Mode (Clean, native list rows with dividers) */}
        {!isEditingProfile ? (
          <div className="divide-y divide-gray-100 text-xs">
            {/* Full Name */}
            <div className="py-2.5 flex items-center justify-between">
              <span className="text-gray-500 font-medium flex items-center gap-2">
                <User size={13} className="text-gray-400" />
                <span>Full Name</span>
              </span>
              <span className="font-bold text-gray-900">{profile.name || 'Not provided'}</span>
            </div>

            {/* Email Address */}
            <div className="py-2.5 flex items-center justify-between">
              <span className="text-gray-500 font-medium flex items-center gap-2">
                <Mail size={13} className="text-gray-400" />
                <span>Email Address</span>
              </span>
              <div className="flex items-center gap-1.5 text-right">
                <span className="font-bold text-gray-900 truncate max-w-[170px]">{profile.email}</span>
                <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded-full font-bold shrink-0">
                  ✓
                </span>
              </div>
            </div>

            {/* Mobile Number */}
            <div className="py-2.5 flex items-center justify-between">
              <span className="text-gray-500 font-medium flex items-center gap-2">
                <Phone size={13} className="text-gray-400" />
                <span>Mobile Number</span>
              </span>
              <span className="font-bold text-gray-900 font-mono">{profile.phone || '+91 98765 43210'}</span>
            </div>

            {/* Gender */}
            <div className="py-2.5 flex items-center justify-between">
              <span className="text-gray-500 font-medium">Gender</span>
              <span className="font-bold text-gray-900 capitalize">{profile.gender || 'Not specified'}</span>
            </div>

            {/* Date of Birth */}
            <div className="py-2.5 flex items-center justify-between">
              <span className="text-gray-500 font-medium flex items-center gap-2">
                <Calendar size={13} className="text-gray-400" />
                <span>Date of Birth</span>
              </span>
              <span className="font-bold text-gray-900">
                {profile.dob ? new Date(profile.dob).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Not provided'}
              </span>
            </div>
          </div>
        ) : (
          /* Edit Mode (Clean, uniform input form) */
          <form onSubmit={handleSaveProfile} className="space-y-3 text-xs pt-1 animate-in fade-in duration-200">
            {/* Full Name */}
            <div>
              <label className="block text-gray-500 font-semibold mb-1">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F2C59]/15"
              />
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-gray-500 font-semibold mb-1">Email Address (Registered)</label>
              <input
                type="email"
                value={email}
                disabled
                className="w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded-xl text-xs font-semibold text-gray-500 cursor-not-allowed"
              />
            </div>

            {/* Mobile Number */}
            <div>
              <label className="block text-gray-500 font-semibold mb-1">Mobile Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F2C59]/15"
              />
            </div>

            {/* Gender Toggle */}
            <div>
              <label className="block text-gray-500 font-semibold mb-1">Gender</label>
              <div className="grid grid-cols-3 gap-2">
                {['Male', 'Female', 'Other'].map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGender(g)}
                    className={`py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                      gender.toLowerCase() === g.toLowerCase()
                        ? 'bg-[#0F2C59] text-white border-[#0F2C59]'
                        : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            {/* Date of Birth */}
            <div>
              <label className="block text-gray-500 font-semibold mb-1">Date of Birth</label>
              <input
                type="date"
                value={dob ? dob.slice(0, 10) : ''}
                onChange={(e) => setDob(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F2C59]/15"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="submit"
                disabled={isSavingProfile}
                className="flex-1 py-2.5 bg-[#0F2C59] hover:bg-[#1A3D73] text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-60"
              >
                {isSavingProfile && <Loader2 size={12} className="animate-spin" />}
                <span>{isSavingProfile ? 'Saving...' : 'Save Changes'}</span>
              </button>
              <button
                type="button"
                onClick={handleCancelProfile}
                disabled={isSavingProfile}
                className="px-4 py-2.5 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {/* 4. Login & Security (Uniform Settings List Layout) */}
      <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-xs space-y-3">
        {/* Section Header */}
        <div className="flex items-center justify-between pb-2 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-xs uppercase tracking-wider text-gray-500">Security</h3>
          </div>

          {!isEditingPassword ? (
            <button
              type="button"
              onClick={() => setIsEditingPassword(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-xs font-bold transition-all cursor-pointer border border-gray-200/60"
            >
              <Lock size={11} />
              <span>Change</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCancelPassword}
              disabled={isSavingPassword}
              className="px-2 py-1 text-xs font-bold text-gray-500 hover:text-gray-800 transition-all cursor-pointer"
            >
              Cancel
            </button>
          )}
        </div>

        {passwordSuccess && (
          <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-bold flex items-center gap-1.5 animate-in fade-in duration-200">
            <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
            <span>{passwordSuccess}</span>
          </div>
        )}

        {passwordError && (
          <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-semibold flex items-center gap-1.5 animate-in fade-in duration-200">
            <AlertCircle size={13} className="text-red-500 shrink-0" />
            <span>{passwordError}</span>
          </div>
        )}

        {/* View Mode (Clean single row) */}
        {!isEditingPassword ? (
          <div className="py-2 flex items-center justify-between text-xs">
            <span className="text-gray-500 font-medium flex items-center gap-2">
              <Lock size={13} className="text-gray-400" />
              <span>Account Password</span>
            </span>
            <span className="text-xs font-mono tracking-widest text-gray-600 font-black">••••••••••••</span>
          </div>
        ) : (
          /* Edit Mode (Uniform Password Change Form) */
          <form onSubmit={handleSavePassword} className="space-y-3 text-xs pt-1 animate-in fade-in duration-200">
            {/* Current Password */}
            <div>
              <label className="block text-gray-500 font-semibold mb-1">Current Password</label>
              <div className="relative">
                <input
                  type={showCurrentPass ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  placeholder="Enter current password"
                  className="w-full px-3 py-2 pr-9 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F2C59]/15"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPass(!showCurrentPass)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                >
                  {showCurrentPass ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className="block text-gray-500 font-semibold mb-1">New Password (min 6 chars)</label>
              <div className="relative">
                <input
                  type={showNewPass ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="Enter new password"
                  className="w-full px-3 py-2 pr-9 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F2C59]/15"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                >
                  {showNewPass ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div>
              <label className="block text-gray-500 font-semibold mb-1">Confirm New Password</label>
              <div className="relative">
                <input
                  type={showConfirmPass ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="Confirm new password"
                  className="w-full px-3 py-2 pr-9 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F2C59]/15"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPass(!showConfirmPass)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                >
                  {showConfirmPass ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="submit"
                disabled={isSavingPassword || !currentPassword || !newPassword || !confirmPassword}
                className="flex-1 py-2.5 bg-[#0F2C59] hover:bg-[#1A3D73] text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {isSavingPassword && <Loader2 size={12} className="animate-spin" />}
                <span>{isSavingPassword ? 'Updating...' : 'Update Password'}</span>
              </button>
              <button
                type="button"
                onClick={handleCancelPassword}
                disabled={isSavingPassword}
                className="px-4 py-2.5 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {/* 5. Account Actions (Full-Width, Uniform Proportional Logout Button) */}
      <div className="pt-1">
        <button
          onClick={logout}
          className="w-full py-3 px-4 bg-red-50 hover:bg-red-100/80 active:scale-[0.99] text-red-600 rounded-2xl border border-red-200/60 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-2xs cursor-pointer"
        >
          <LogOut size={14} />
          <span>Log out from ShopIndia</span>
        </button>
      </div>
    </div>
  );
};
