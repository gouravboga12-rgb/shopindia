import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, KeyRound, Lock, Eye, EyeOff, Loader2, CheckCircle2, ArrowLeft, RefreshCw } from 'lucide-react';
import { requestPasswordReset, resetPassword } from '../../lib/customerAuth';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialEmail?: string;
  onSuccess?: () => void;
  portalType?: 'customer' | 'rider' | 'regional_admin' | 'vendor' | 'admin';
  onRequestOtp?: (email: string) => Promise<void>;
  onResetPassword?: (email: string, otp: string, newPass: string) => Promise<void>;
  themeColor?: 'blue' | 'orange' | 'indigo' | 'slate';
  title?: string;
  roleBadge?: string;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  onClose,
  initialEmail = '',
  onSuccess,
  portalType = 'customer',
  onRequestOtp,
  onResetPassword,
  themeColor = portalType === 'rider' ? 'orange' : portalType === 'regional_admin' ? 'indigo' : 'blue',
  title,
  roleBadge = portalType === 'rider' ? 'Delivery Partner' : portalType === 'regional_admin' ? 'Regional Hub' : 'ShopIndia',
}) => {
  const [step, setStep] = useState<'request' | 'reset' | 'success'>('request');
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  // Sync initial email when modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialEmail) setEmail(initialEmail);
      setError('');
      setOtp('');
      setNewPassword('');
      setConfirmPassword('');
      setStep('request');
    }
  }, [isOpen, initialEmail]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const dispatchOtpRequest = async (targetEmail: string) => {
    if (onRequestOtp) {
      await onRequestOtp(targetEmail);
    } else if (portalType === 'rider') {
      const res = await fetch('/api/rider/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send OTP to rider email');
    } else if (portalType === 'regional_admin') {
      const res = await fetch('/api/regional-admin/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send OTP to regional admin email');
    } else {
      await requestPasswordReset(targetEmail);
    }
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your registered email address.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      await dispatchOtpRequest(email.trim().toLowerCase());
      setOtp('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPassword(false);
      setStep('reset');
      setResendCooldown(60);
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || loading) return;
    setError('');
    setLoading(true);

    try {
      await dispatchOtpRequest(email.trim().toLowerCase());
      setResendCooldown(60);
    } catch (err: any) {
      setError(err.message || 'Failed to resend OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!otp.trim() || otp.trim().length !== 6) {
      setError('Please enter the valid 6-digit OTP code.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please verify both fields.');
      return;
    }

    setLoading(true);
    try {
      if (onResetPassword) {
        await onResetPassword(email.trim().toLowerCase(), otp.trim(), newPassword);
      } else if (portalType === 'rider') {
        const res = await fetch('/api/rider/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim().toLowerCase(), otp: otp.trim(), newPassword }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to reset password');
      } else if (portalType === 'regional_admin') {
        const res = await fetch('/api/regional-admin/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim().toLowerCase(), otp: otp.trim(), newPassword }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to reset password');
      } else {
        await resetPassword(email.trim().toLowerCase(), otp.trim(), newPassword);
      }
      setStep('success');
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to reset password. Please check your OTP.');
    } finally {
      setLoading(false);
    }
  };


  if (!isOpen) return null;

  const isOrange = themeColor === 'orange';
  const isIndigo = themeColor === 'indigo';

  const headerGradient = isOrange
    ? 'bg-gradient-to-r from-orange-600 via-amber-600 to-amber-500'
    : isIndigo
    ? 'bg-gradient-to-r from-blue-700 via-indigo-600 to-indigo-700'
    : 'bg-gradient-to-r from-[#0F2C59] to-[#0284c7]';

  const buttonGradient = isOrange
    ? 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-slate-950 shadow-orange-500/25 font-extrabold'
    : isIndigo
    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-500/25 font-bold'
    : 'bg-gradient-to-r from-brand-blue to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-blue-500/25 font-bold';

  const focusClass = isOrange
    ? 'focus:border-orange-500 focus:ring-orange-500/10'
    : isIndigo
    ? 'focus:border-blue-500 focus:ring-blue-500/10'
    : 'focus:border-brand-blue focus:ring-brand-blue/10';

  const textAccent = isOrange
    ? 'text-orange-600 hover:text-orange-500'
    : isIndigo
    ? 'text-blue-600 hover:text-blue-500'
    : 'text-brand-blue hover:text-blue-700';

  const bannerBg = isOrange
    ? 'bg-orange-50/90 border-orange-200/80 text-orange-950'
    : isIndigo
    ? 'bg-blue-50/90 border-blue-200/80 text-blue-950'
    : 'bg-blue-50/70 border-blue-100 text-blue-900';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 z-10 max-h-[92vh] flex flex-col"
        >
          {/* Header Bar */}
          <div className={`${headerGradient} px-5 sm:px-6 py-4 sm:py-5 text-white flex items-center justify-between relative overflow-hidden shrink-0`}>
            <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none -translate-y-1/2 translate-x-1/3" />
            <div className="flex items-center gap-3 relative z-10">
              <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center text-white border border-white/20 shadow-inner shrink-0">
                {step === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-300" />
                ) : step === 'reset' ? (
                  <KeyRound className="w-5 h-5 text-white" />
                ) : (
                  <Lock className="w-5 h-5 text-white" />
                )}
              </div>
              <div>
                <h3 className="text-base font-bold font-heading">
                  {title || (step === 'success' ? 'Password Reset' : step === 'reset' ? 'Enter OTP & New Password' : 'Forgot Password')}
                </h3>
                <p className="text-xs text-white/80">
                  {step === 'success' ? 'Account security updated' : `${roleBadge} account recovery`}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 sm:p-8 overflow-y-auto flex-1">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-semibold flex items-center gap-2"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}

            {/* STEP 1: REQUEST OTP */}
            {step === 'request' && (
              <form onSubmit={handleRequestOtp} autoComplete="off" className="space-y-4">
                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  Enter your registered email address below. We'll send you a 6-digit verification code to reset your password.
                </p>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="email"
                      name="reset_request_email"
                      id="reset_request_email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      required
                      className={`w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-4 transition-all placeholder:text-slate-400 ${focusClass}`}
                    />
                  </div>
                </div>

                <motion.button
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={loading}
                  className={`w-full py-3.5 ${buttonGradient} text-sm rounded-xl shadow-lg flex items-center justify-center gap-2 disabled:opacity-60 transition-all cursor-pointer`}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sending OTP…</span>
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4" />
                      <span>Send Verification OTP</span>
                    </>
                  )}
                </motion.button>

                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={onClose}
                    className={`text-xs font-bold text-slate-500 ${textAccent} inline-flex items-center gap-1.5 transition-colors cursor-pointer`}
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
                  </button>
                </div>
              </form>
            )}

            {/* STEP 2: ENTER OTP & NEW PASSWORD */}
            {step === 'reset' && (
              <form onSubmit={handleResetPassword} autoComplete="off" className="space-y-4">
                {/* Hidden decoy fields to intercept browser/Chromium aggressive credential autofill heuristics */}
                <input
                  type="text"
                  name="prevent_autofill_username"
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                  style={{ position: 'absolute', opacity: 0, height: 0, width: 0, zIndex: -1, pointerEvents: 'none' }}
                />
                <input
                  type="password"
                  name="prevent_autofill_password"
                  tabIndex={-1}
                  autoComplete="new-password"
                  aria-hidden="true"
                  style={{ position: 'absolute', opacity: 0, height: 0, width: 0, zIndex: -1, pointerEvents: 'none' }}
                />

                <div className={`${bannerBg} rounded-xl p-3 flex items-start justify-between gap-2 text-xs border`}>
                  <div>
                    <span>OTP sent to: </span>
                    <strong className="font-bold">{email}</strong>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setStep('request');
                      setError('');
                      setOtp('');
                      setNewPassword('');
                      setConfirmPassword('');
                      setShowPassword(false);
                    }}
                    className={`font-bold hover:underline shrink-0 cursor-pointer ${textAccent}`}
                  >
                    Change
                  </button>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      6-Digit OTP Code
                    </label>
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={resendCooldown > 0 || loading}
                      className={`text-xs font-bold ${textAccent} hover:underline disabled:text-slate-400 disabled:no-underline flex items-center gap-1 cursor-pointer`}
                    >
                      <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                      {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
                    </button>
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    name="reset_otp_code"
                    id="reset_otp_code"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    required
                    className={`w-full text-center tracking-[8px] font-mono text-xl py-3 bg-slate-50 border border-slate-200 rounded-xl font-black text-slate-900 focus:bg-white focus:outline-none focus:ring-4 transition-all placeholder:tracking-normal placeholder:font-sans placeholder:text-sm placeholder:font-normal placeholder:text-slate-400 ${focusClass}`}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="new_password"
                      id="new_password"
                      autoComplete="new-password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      required
                      minLength={6}
                      className={`w-full px-4 pr-11 py-3 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-4 transition-all placeholder:text-slate-400 ${focusClass}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    name="confirm_password"
                    id="confirm_password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your new password"
                    required
                    className={`w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-4 transition-all placeholder:text-slate-400 ${focusClass}`}
                  />
                </div>

                <motion.button
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={loading}
                  className={`w-full py-3.5 ${buttonGradient} text-sm rounded-xl shadow-lg flex items-center justify-center gap-2 disabled:opacity-60 transition-all cursor-pointer mt-2`}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Updating Password…</span>
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-4 h-4" />
                      <span>Set New Password</span>
                    </>
                  )}
                </motion.button>
              </form>
            )}

            {/* STEP 3: SUCCESS */}
            {step === 'success' && (
              <div className="text-center py-4 space-y-4">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-slate-900 font-heading">Password Reset Successfully!</h4>
                  <p className="text-xs text-slate-600 mt-1 max-w-xs mx-auto">
                    Your password has been securely updated. You can now log in to your account with your new password.
                  </p>
                </div>
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={onClose}
                  className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-xl transition-all cursor-pointer"
                >
                  Back to Sign In
                </motion.button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

