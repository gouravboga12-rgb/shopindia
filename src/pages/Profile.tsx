import React, { useState, useEffect } from 'react';

import { useIsMobile } from '../hooks/useMediaQuery';
import { User, ShieldCheck, Mail, Sparkles, LogIn, LogOut, Loader2, KeyRound, RefreshCw, CheckCircle2 } from 'lucide-react';
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
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

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
      window.location.href = '/dashboard';
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
      window.location.href = '/dashboard';
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
      <div className={`max-w-7xl mx-auto ${pad} pt-8 pb-4 text-left`}>
        <div className="bg-white border border-brand-border rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden flex flex-col md:flex-row min-h-[360px]">
          {/* Left Side: Gradient Banner */}
          <div className="md:w-2/5 lg:w-1/3 bg-gradient-to-br from-brand-blue to-blue-800 p-8 md:p-10 text-white flex flex-col justify-center relative overflow-hidden">
             <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
             <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-400/20 rounded-full blur-2xl translate-y-1/3 -translate-x-1/4 pointer-events-none" />
             
             <div className="relative z-10 flex flex-col h-full justify-center">
                <div className="w-14 h-14 bg-white/10 rounded-2xl backdrop-blur-md border border-white/20 flex items-center justify-center mb-6 shadow-inner">
                   {authMode === 'login'
                     ? <LogIn size={28} className="text-white" />
                     : authMode === 'verify-otp'
                     ? <KeyRound size={28} className="text-white" />
                     : <Sparkles size={28} className="text-white" />}
                </div>
                <h2 className="text-3xl font-black font-heading mb-3 leading-tight tracking-tight">
                  {authMode === 'login' ? 'Welcome Back!' : authMode === 'verify-otp' ? 'Verify Email' : 'Join Shop India'}
                </h2>
                <p className="text-blue-50 text-sm font-semibold leading-relaxed max-w-[260px]">
                  {authMode === 'login'
                    ? 'Sign in to access your saved addresses, track orders, and experience fast checkout.'
                    : authMode === 'verify-otp'
                    ? `A 6-digit OTP has been sent to ${aEmail}. Enter it below to activate your account.`
                    : 'Create an account for personalized recommendations, faster checkout, and exclusive offers.'}
                </p>
             </div>
          </div>

          {/* Right Side: Form */}
          <div className="md:w-3/5 lg:w-2/3 p-8 md:p-10 lg:p-12 flex flex-col justify-center bg-white relative">

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
               <form onSubmit={handleLogin} className="flex flex-col gap-5 w-full max-w-md">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-xl font-bold text-brand-graphite font-heading">Secure Login</h3>
                    <div className="h-px flex-1 bg-slate-100 ml-4"></div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-black text-brand-slate uppercase tracking-wider flex items-center gap-1.5"><Mail size={12}/> Email Address</label>
                    <input type="email" value={aEmail} onChange={(e) => setAEmail(e.target.value)} placeholder="you@example.com" required className="px-4 py-3.5 border border-slate-200 rounded-xl text-sm font-bold text-brand-graphite focus:outline-none focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10 transition-all bg-slate-50 focus:bg-white placeholder:text-slate-400" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black text-brand-slate uppercase tracking-wider flex items-center gap-1.5"><ShieldCheck size={12}/> Password</label>
                      <button type="button" onClick={() => setShowForgotPassword(true)} className="text-xs font-bold text-brand-blue hover:underline cursor-pointer">
                        Forgot Password?
                      </button>
                    </div>
                    <input type="password" value={aPass} onChange={(e) => setAPass(e.target.value)} placeholder="••••••••" required className="px-4 py-3.5 border border-slate-200 rounded-xl text-sm font-bold text-brand-graphite focus:outline-none focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10 transition-all bg-slate-50 focus:bg-white placeholder:text-slate-400" />
                  </div>
                  
                  <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-5">
                    <motion.button whileTap={{ scale: 0.97 }} type="submit" disabled={authLoading}
                      className="w-full sm:w-auto px-8 py-3.5 bg-brand-blue hover:bg-blue-650 text-white text-sm font-black uppercase tracking-wider rounded-xl shadow-[0_8px_20px_rgb(14,165,233,0.3)] flex items-center justify-center gap-2 disabled:opacity-70 transition-all cursor-pointer">
                      {authLoading ? <Loader2 size={18} className="animate-spin" /> : <LogIn size={18} />}
                      Log In Now
                    </motion.button>
                    
                    <button type="button" onClick={() => { setAuthMode('register'); setAError(''); }}
                      className="text-xs text-brand-slate hover:text-brand-blue font-bold underline transition-colors w-full sm:w-auto text-center cursor-pointer">
                      New here? Create account
                    </button>
                  </div>
               </form>
             )}

             {/* ── REGISTER FORM (Step 1) ──────────────────────────────────── */}
             {authMode === 'register' && (
               <form onSubmit={handleSendSignupOtp} className="flex flex-col gap-5 w-full max-w-md">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-xl font-bold text-brand-graphite font-heading">Create Account</h3>
                    <div className="h-px flex-1 bg-slate-100 ml-4"></div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-black text-brand-slate uppercase tracking-wider flex items-center gap-1.5"><User size={12}/> Full Name</label>
                    <input value={aName} onChange={(e) => setAName(e.target.value)} placeholder="E.g. Jane Doe" required className="px-4 py-3.5 border border-slate-200 rounded-xl text-sm font-bold text-brand-graphite focus:outline-none focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10 transition-all bg-slate-50 focus:bg-white placeholder:text-slate-400" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-black text-brand-slate uppercase tracking-wider flex items-center gap-1.5"><Mail size={12}/> Email Address</label>
                    <input type="email" value={aEmail} onChange={(e) => setAEmail(e.target.value)} placeholder="you@example.com" required className="px-4 py-3.5 border border-slate-200 rounded-xl text-sm font-bold text-brand-graphite focus:outline-none focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10 transition-all bg-slate-50 focus:bg-white placeholder:text-slate-400" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-black text-brand-slate uppercase tracking-wider flex items-center gap-1.5"><ShieldCheck size={12}/> Password</label>
                    <input type="password" value={aPass} onChange={(e) => setAPass(e.target.value)} placeholder="Min. 6 characters" required minLength={6} className="px-4 py-3.5 border border-slate-200 rounded-xl text-sm font-bold text-brand-graphite focus:outline-none focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10 transition-all bg-slate-50 focus:bg-white placeholder:text-slate-400" />
                  </div>
                  
                  <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-5">
                    <motion.button whileTap={{ scale: 0.97 }} type="submit" disabled={authLoading}
                      className="w-full sm:w-auto px-8 py-3.5 bg-brand-blue hover:bg-blue-650 text-white text-sm font-black uppercase tracking-wider rounded-xl shadow-[0_8px_20px_rgb(14,165,233,0.3)] flex items-center justify-center gap-2 disabled:opacity-70 transition-all cursor-pointer">
                      {authLoading ? <Loader2 size={18} className="animate-spin" /> : <Mail size={18} />}
                      {authLoading ? 'Sending OTP…' : 'Send Verification OTP'}
                    </motion.button>
                    
                    <button type="button" onClick={() => { setAuthMode('login'); setAError(''); }}
                      className="text-xs text-brand-slate hover:text-brand-blue font-bold underline transition-colors w-full sm:w-auto text-center cursor-pointer">
                      Already registered? Log in
                    </button>
                  </div>
               </form>
             )}

             {/* ── OTP VERIFY FORM (Step 2) ────────────────────────────────── */}
             {authMode === 'verify-otp' && (
               <form onSubmit={handleVerifySignupOtp} className="flex flex-col gap-5 w-full max-w-md">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-xl font-bold text-brand-graphite font-heading">Verify Your Email</h3>
                    <div className="h-px flex-1 bg-slate-100 ml-4"></div>
                  </div>

                  {/* Email display + change link */}
                  <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-3 flex items-start justify-between gap-2 text-xs text-blue-900">
                    <div>
                      <span>OTP sent to: </span>
                      <strong className="font-bold">{aEmail}</strong>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setAuthMode('register'); setAError(''); setAOtp(''); }}
                      className="text-brand-blue font-bold hover:underline shrink-0"
                    >
                      Change
                    </button>
                  </div>

                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black text-brand-slate uppercase tracking-wider flex items-center gap-1.5">
                        <KeyRound size={12}/> 6-Digit OTP Code
                      </label>
                      <button
                        type="button"
                        onClick={handleResendSignupOtp}
                        disabled={resendCooldown > 0 || authLoading}
                        className="text-xs font-bold text-brand-blue hover:underline disabled:text-slate-400 disabled:no-underline flex items-center gap-1"
                      >
                        <RefreshCw className={`w-3 h-3 ${authLoading ? 'animate-spin' : ''}`} />
                        {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
                      </button>
                    </div>
                    <input
                      type="text"
                      maxLength={6}
                      value={aOtp}
                      onChange={(e) => setAOtp(e.target.value.replace(/\D/g, ''))}
                      placeholder="123456"
                      required
                      className="w-full text-center tracking-[8px] font-mono text-xl py-3.5 bg-slate-50 border border-slate-200 rounded-xl font-black text-slate-900 focus:bg-white focus:outline-none focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10 transition-all placeholder:tracking-normal placeholder:font-sans placeholder:text-sm placeholder:font-normal placeholder:text-slate-400"
                    />
                    <p className="text-xs text-slate-500 font-semibold text-center">⏱️ OTP valid for 10 minutes</p>
                  </div>
                  
                  <motion.button whileTap={{ scale: 0.97 }} type="submit" disabled={authLoading}
                    className="w-full py-3.5 bg-gradient-to-r from-brand-blue to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-sm font-black uppercase tracking-wider rounded-xl shadow-[0_8px_20px_rgb(14,165,233,0.3)] flex items-center justify-center gap-2 disabled:opacity-70 transition-all cursor-pointer">
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
