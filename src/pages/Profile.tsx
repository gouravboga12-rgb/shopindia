import React, { useState, useEffect } from 'react';

import { useIsMobile } from '../hooks/useMediaQuery';
import { useApp } from '../context/AppContext';
import {
  User, ShieldCheck, Mail, Sparkles, LogIn, LogOut, Loader2,
  KeyRound, RefreshCw, CheckCircle2, Lock, X, Eye, EyeOff, ArrowLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { CustomerUser } from '../lib/customerAuth';
import { DashboardInner } from './dashboard/DashboardPortal';
import { ForgotPasswordModal } from '../components/auth/ForgotPasswordModal';
import {
  getCustomerToken,
  getCustomerUser,
  loginCustomer,
  sendSignupOtp,
  verifySignupOtp,
  setCustomerSession,
  clearCustomerSession,
} from '../lib/customerAuth';

export const ProfilePage: React.FC = () => {
  const isMobile = useIsMobile();
  const { navigateTo } = useApp();

  const [authUser, setAuthUser] = useState<CustomerUser | null>(() => {
    const u = getCustomerUser();
    return u && getCustomerToken() ? u : null;
  });

  // 'login' | 'register' | 'verify-otp'
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'verify-otp'>('login');
  const [aName, setAName] = useState('');
  const [aEmail, setAEmail] = useState('');
  const [aPass, setAPass] = useState('');
  const [aOtp, setAOtp] = useState('');
  const [aError, setAError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [authPromptMessage, setAuthPromptMessage] = useState<string | null>(() => {
    return sessionStorage.getItem('shopindia_auth_prompt_message');
  });

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // ── LOGIN ─────────────────────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAError('');
    setAuthLoading(true);
    try {
      const data = await loginCustomer(aEmail.trim(), aPass);
      setCustomerSession(data.token, data.user);
      setAuthUser(data.user);
      setAName(''); setAEmail(''); setAPass('');
      const redirectUrl = sessionStorage.getItem('shopindia_auth_redirect');
      sessionStorage.removeItem('shopindia_auth_redirect');
      sessionStorage.removeItem('shopindia_auth_prompt_message');
      window.location.href = redirectUrl && redirectUrl !== '/profile' ? redirectUrl : '/dashboard';
    } catch (err: any) {
      setAError(err.message || 'Authentication failed');
    } finally {
      setAuthLoading(false);
    }
  };

  // ── SIGNUP STEP 1: Send OTP ───────────────────────────────────────────────
  const handleSendSignupOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAError('');
    setAuthLoading(true);
    try {
      await sendSignupOtp(aName.trim(), aEmail.trim().toLowerCase(), aPass);
      setAuthMode('verify-otp');
      setAOtp('');
      setResendCooldown(60);
    } catch (err: any) {
      setAError(err.message || 'Failed to send verification OTP.');
    } finally {
      setAuthLoading(false);
    }
  };

  // ── SIGNUP STEP 1 RESEND ──────────────────────────────────────────────────
  const handleResendSignupOtp = async () => {
    if (resendCooldown > 0 || authLoading) return;
    setAError('');
    setAuthLoading(true);
    try {
      await sendSignupOtp(aName.trim(), aEmail.trim().toLowerCase(), aPass);
      setResendCooldown(60);
    } catch (err: any) {
      setAError(err.message || 'Failed to resend OTP.');
    } finally {
      setAuthLoading(false);
    }
  };

  // ── SIGNUP STEP 2: Verify OTP & create account ────────────────────────────
  const handleVerifySignupOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aOtp.trim() || aOtp.trim().length !== 6) {
      setAError('Please enter the 6-digit OTP sent to your email.');
      return;
    }
    setAError('');
    setAuthLoading(true);
    try {
      const data = await verifySignupOtp(aEmail.trim().toLowerCase(), aOtp.trim());
      setCustomerSession(data.token, data.user);
      setAuthUser(data.user);
      setAName(''); setAEmail(''); setAPass(''); setAOtp('');
      const redirectUrl = sessionStorage.getItem('shopindia_auth_redirect');
      sessionStorage.removeItem('shopindia_auth_redirect');
      sessionStorage.removeItem('shopindia_auth_prompt_message');
      window.location.href = redirectUrl && redirectUrl !== '/profile' ? redirectUrl : '/dashboard';
    } catch (err: any) {
      setAError(err.message || 'OTP verification failed. Please try again.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    clearCustomerSession();
    setAuthUser(null);
    window.location.reload();
  };

  const renderAuthBar = () => {
    const pad = isMobile ? 'px-4' : 'px-12';
    if (authUser) {
      return (
        <div className={`max-w-7xl mx-auto ${pad} pt-6 text-left`}>
          <div className="bg-white border border-brand-border rounded-card p-6 shadow-premium flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-brand-blue/10 flex items-center justify-center text-brand-blue font-black border border-brand-blue/20">
                <User size={20} />
              </div>
              <div className="flex flex-col leading-tight">
                <span className="font-extrabold text-sm text-brand-graphite font-heading">Signed in as {authUser.name}</span>
                <span className="text-xs text-brand-slate font-bold">{authUser.email}</span>
              </div>
            </div>
            <motion.button whileTap={{ scale: 0.95 }} onClick={handleLogout} className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-brand-graphite text-xs font-black rounded-xl uppercase tracking-wider flex items-center gap-2 transition-colors">
              <LogOut size={16} /> Log out
            </motion.button>
          </div>
        </div>
      );
    }

    return (
      <div className={`max-w-4xl mx-auto w-full ${isMobile ? 'px-3 pt-3 pb-28' : 'px-6 pt-8 pb-12'} text-left`}>
        {/* Mobile top navigation helper */}
        {isMobile && (
          <div className="flex items-center justify-between mb-3 px-1">
            <button
              onClick={() => navigateTo('home')}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-brand-blue py-1.5 px-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs active:scale-95 transition"
            >
              <ArrowLeft size={14} />
              <span>Back to Store</span>
            </button>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Customer Account
            </span>
          </div>
        )}

        <div className="bg-white border border-brand-border rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.06)] overflow-hidden flex flex-col md:flex-row">
          {/* Header Banner - Responsive: compact on mobile, elegant sidebar on desktop */}
          <div className="md:w-2/5 lg:w-1/3 bg-gradient-to-br from-[#0F2C59] via-[#1a3d73] to-[#0284c7] p-5 md:p-10 text-white flex flex-col justify-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-400/20 rounded-full blur-2xl translate-y-1/3 -translate-x-1/4 pointer-events-none" />
            
            <div className="relative z-10 flex md:flex-col items-center md:items-start gap-3.5 md:gap-0">
              <div className="w-12 h-12 md:w-14 md:h-14 bg-white/15 rounded-2xl backdrop-blur-md border border-white/20 flex items-center justify-center md:mb-6 shadow-inner shrink-0">
                {authMode === 'login'
                  ? <LogIn className="w-6 h-6 text-white" />
                  : authMode === 'verify-otp'
                  ? <KeyRound className="w-6 h-6 text-white" />
                  : <Sparkles className="w-6 h-6 text-white" />}
              </div>
              <div>
                <h2 className="text-xl md:text-3xl font-black font-heading md:mb-3 leading-tight tracking-tight text-white">
                  {authMode === 'login' ? 'Welcome Back!' : authMode === 'verify-otp' ? 'Verify Email' : 'Join Shop India'}
                </h2>
                <p className="text-blue-100/90 text-xs md:text-sm font-medium leading-relaxed max-w-[280px]">
                  {authMode === 'login'
                    ? 'Sign in to access your orders, saved addresses & fast checkout.'
                    : authMode === 'verify-otp'
                    ? `6-digit OTP code sent to ${aEmail}.`
                    : 'Create an account for exclusive deals & instant order tracking.'}
                </p>
              </div>
            </div>
          </div>

          {/* Right Side: Form & Quick Tabs */}
          <div className="md:w-3/5 lg:w-2/3 p-5 sm:p-8 md:p-10 lg:p-12 flex flex-col justify-center bg-white relative">
            {/* Required Auth Banner */}
            {authPromptMessage && (
              <div className="mb-5 p-3.5 sm:p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-amber-900 shadow-sm animate-in fade-in">
                <div className="p-2 rounded-xl bg-amber-500 text-white shrink-0 mt-0.5">
                  <Lock size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-extrabold text-xs uppercase tracking-wider text-amber-900">Login Required</h4>
                  <p className="text-xs text-amber-800 font-semibold mt-0.5 leading-relaxed">
                    {authPromptMessage}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    sessionStorage.removeItem('shopindia_auth_prompt_message');
                    setAuthPromptMessage(null);
                  }}
                  className="text-amber-500 hover:text-amber-700 p-1 cursor-pointer shrink-0"
                  title="Dismiss"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {/* Top Tab Switcher */}
            {authMode !== 'verify-otp' && (
              <div className="grid grid-cols-2 p-1 bg-slate-100/90 rounded-2xl mb-6 border border-slate-200/80">
                <button
                  type="button"
                  onClick={() => { setAuthMode('login'); setAError(''); }}
                  className={`py-2 text-xs font-black rounded-xl transition-all cursor-pointer ${
                    authMode === 'login'
                      ? 'bg-white text-brand-blue shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => { setAuthMode('register'); setAError(''); }}
                  className={`py-2 text-xs font-black rounded-xl transition-all cursor-pointer ${
                    authMode === 'register'
                      ? 'bg-white text-brand-blue shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Create Account
                </button>
              </div>
            )}

            {/* Error Banner */}
            <AnimatePresence>
              {aError && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-semibold flex items-center gap-2"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                  <span>{aError}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── LOGIN FORM ──────────────────────────────────────────────── */}
            {authMode === 'login' && (
              <form onSubmit={handleLogin} className="flex flex-col gap-4 w-full">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-black text-brand-slate uppercase tracking-wider flex items-center gap-1.5">
                    <Mail size={12}/> Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="email"
                      value={aEmail}
                      onChange={(e) => setAEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      autoComplete="email"
                      className="w-full pl-10 pr-4 py-3 sm:py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-sm font-semibold text-brand-graphite focus:outline-none focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10 transition-all focus:bg-white placeholder:text-slate-400"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-brand-slate uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldCheck size={12}/> Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowForgotPassword(true)}
                      className="text-xs font-bold text-brand-blue hover:underline cursor-pointer py-1"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={aPass}
                      onChange={(e) => setAPass(e.target.value)}
                      placeholder="••••••••"
                      required
                      autoComplete="current-password"
                      className="w-full pl-10 pr-11 py-3 sm:py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-sm font-semibold text-brand-graphite focus:outline-none focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10 transition-all focus:bg-white placeholder:text-slate-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                      tabIndex={-1}
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                
                <div className="mt-3 flex flex-col gap-3">
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={authLoading}
                    className="w-full py-3.5 bg-brand-blue hover:bg-blue-600 text-white text-sm font-black uppercase tracking-wider rounded-xl shadow-[0_8px_20px_rgb(14,165,233,0.3)] flex items-center justify-center gap-2 disabled:opacity-70 transition-all cursor-pointer min-h-[48px]"
                  >
                    {authLoading ? <Loader2 size={18} className="animate-spin" /> : <LogIn size={18} />}
                    <span>Log In Now</span>
                  </motion.button>
                  
                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => { setAuthMode('register'); setAError(''); }}
                      className="text-xs text-brand-slate hover:text-brand-blue font-bold underline transition-colors cursor-pointer py-1"
                    >
                      New to Shop India? Create an account
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* ── REGISTER FORM (Step 1) ──────────────────────────────────── */}
            {authMode === 'register' && (
              <form onSubmit={handleSendSignupOtp} className="flex flex-col gap-4 w-full">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-black text-brand-slate uppercase tracking-wider flex items-center gap-1.5">
                    <User size={12}/> Full Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      value={aName}
                      onChange={(e) => setAName(e.target.value)}
                      placeholder="E.g. Jane Doe"
                      required
                      autoComplete="name"
                      className="w-full pl-10 pr-4 py-3 sm:py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-sm font-semibold text-brand-graphite focus:outline-none focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10 transition-all focus:bg-white placeholder:text-slate-400"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-black text-brand-slate uppercase tracking-wider flex items-center gap-1.5">
                    <Mail size={12}/> Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="email"
                      value={aEmail}
                      onChange={(e) => setAEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      autoComplete="email"
                      className="w-full pl-10 pr-4 py-3 sm:py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-sm font-semibold text-brand-graphite focus:outline-none focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10 transition-all focus:bg-white placeholder:text-slate-400"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-black text-brand-slate uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck size={12}/> Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={aPass}
                      onChange={(e) => setAPass(e.target.value)}
                      placeholder="Min. 6 characters"
                      required
                      minLength={6}
                      autoComplete="new-password"
                      className="w-full pl-10 pr-11 py-3 sm:py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-sm font-semibold text-brand-graphite focus:outline-none focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10 transition-all focus:bg-white placeholder:text-slate-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                      tabIndex={-1}
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                
                <div className="mt-3 flex flex-col gap-3">
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={authLoading}
                    className="w-full py-3.5 bg-brand-blue hover:bg-blue-600 text-white text-sm font-black uppercase tracking-wider rounded-xl shadow-[0_8px_20px_rgb(14,165,233,0.3)] flex items-center justify-center gap-2 disabled:opacity-70 transition-all cursor-pointer min-h-[48px]"
                  >
                    {authLoading ? <Loader2 size={18} className="animate-spin" /> : <Mail size={18} />}
                    <span>{authLoading ? 'Sending OTP…' : 'Send Verification OTP'}</span>
                  </motion.button>
                  
                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => { setAuthMode('login'); setAError(''); }}
                      className="text-xs text-brand-slate hover:text-brand-blue font-bold underline transition-colors cursor-pointer py-1"
                    >
                      Already registered? Sign in instead
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* ── OTP VERIFY FORM (Step 2) ────────────────────────────────── */}
            {authMode === 'verify-otp' && (
              <form onSubmit={handleVerifySignupOtp} className="flex flex-col gap-4 w-full">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-bold text-brand-graphite font-heading">Verify Your Email</h3>
                  <div className="h-px flex-1 bg-slate-100 ml-2"></div>
                </div>

                {/* Email display + change link */}
                <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-3 flex items-start justify-between gap-2 text-xs text-blue-900">
                  <div className="overflow-hidden">
                    <span className="text-slate-600 block">OTP code sent to:</span>
                    <strong className="font-bold truncate block">{aEmail}</strong>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setAuthMode('register'); setAError(''); setAOtp(''); }}
                    className="text-brand-blue font-bold hover:underline shrink-0 py-1"
                  >
                    Change
                  </button>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-brand-slate uppercase tracking-wider flex items-center gap-1.5">
                      <KeyRound size={12}/> 6-Digit Code
                    </label>
                    <button
                      type="button"
                      onClick={handleResendSignupOtp}
                      disabled={resendCooldown > 0 || authLoading}
                      className="text-xs font-bold text-brand-blue hover:underline disabled:text-slate-400 disabled:no-underline flex items-center gap-1 py-1"
                    >
                      <RefreshCw className={`w-3 h-3 ${authLoading ? 'animate-spin' : ''}`} />
                      <span>{resendCooldown > 0 ? `Resend (${resendCooldown}s)` : 'Resend Code'}</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={aOtp}
                    onChange={(e) => setAOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    required
                    autoFocus
                    className="w-full text-center tracking-[8px] font-mono text-xl py-3.5 bg-slate-50 border border-slate-200 rounded-xl font-black text-slate-900 focus:bg-white focus:outline-none focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10 transition-all placeholder:tracking-normal placeholder:font-sans placeholder:text-sm placeholder:font-normal placeholder:text-slate-400"
                  />
                  <p className="text-xs text-slate-500 font-semibold text-center">⏱️ Code expires in 10 minutes</p>
                </div>
                
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-3.5 bg-gradient-to-r from-brand-blue to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-sm font-black uppercase tracking-wider rounded-xl shadow-[0_8px_20px_rgb(14,165,233,0.3)] flex items-center justify-center gap-2 disabled:opacity-70 transition-all cursor-pointer min-h-[48px] mt-2"
                >
                  {authLoading
                    ? <><Loader2 size={18} className="animate-spin" /><span>Verifying…</span></>
                    : <><CheckCircle2 size={18} /><span>Verify &amp; Create Account</span></>}
                </motion.button>
              </form>
            )}
          </div>
        </div>

        <ForgotPasswordModal
          isOpen={showForgotPassword}
          onClose={() => setShowForgotPassword(false)}
          initialEmail={aEmail}
        />
      </div>
    );
  };



  if (authUser) {
    return <DashboardInner initialTab="profile" />;
  }

  return (
    <>
      {renderAuthBar()}
    </>
  );
};
