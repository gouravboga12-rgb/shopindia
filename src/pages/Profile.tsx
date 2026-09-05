import React, { useState } from 'react';

import { useIsMobile } from '../hooks/useMediaQuery';
import { User, ShieldCheck, Mail, Sparkles, LogIn, LogOut, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import type { CustomerUser } from '../lib/customerAuth';
import { DashboardInner } from './dashboard/DashboardPortal';
import { ForgotPasswordModal } from '../components/auth/ForgotPasswordModal';
import {
  getCustomerToken,
  getCustomerUser,
  loginCustomer,
  registerCustomer,
  setCustomerSession,
  clearCustomerSession,
} from '../lib/customerAuth';

export const ProfilePage: React.FC = () => {
  const isMobile = useIsMobile();

  const [authUser, setAuthUser] = useState<CustomerUser | null>(() => {
    const u = getCustomerUser();
    return u && getCustomerToken() ? u : null;
  });

  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [aName, setAName] = useState('');
  const [aEmail, setAEmail] = useState('');
  const [aPass, setAPass] = useState('');
  const [aError, setAError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAError('');
    setAuthLoading(true);
    try {
      const data = authMode === 'login'
        ? await loginCustomer(aEmail.trim(), aPass)
        : await registerCustomer(aName.trim(), aEmail.trim(), aPass);
      setCustomerSession(data.token, data.user);
      setAuthUser(data.user);
      setAName('');
      setAEmail('');
      setAPass('');
      window.location.hash = '#/dashboard';
      window.location.reload(); // Force contexts to fetch user data
    } catch (err: any) {
      setAError(err.message || 'Authentication failed');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    clearCustomerSession();
    setAuthUser(null);
    window.location.reload(); // Force contexts to clear user data
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
             {/* Decorative Elements */}
             <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
             <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-400/20 rounded-full blur-2xl translate-y-1/3 -translate-x-1/4 pointer-events-none" />
             
             <div className="relative z-10 flex flex-col h-full justify-center">
                <div className="w-14 h-14 bg-white/10 rounded-2xl backdrop-blur-md border border-white/20 flex items-center justify-center mb-6 shadow-inner">
                   {authMode === 'login' ? <LogIn size={28} className="text-white" /> : <Sparkles size={28} className="text-white" />}
                </div>
                <h2 className="text-3xl font-black font-heading mb-3 leading-tight tracking-tight">
                  {authMode === 'login' ? 'Welcome Back!' : 'Join ShopIndia'}
                </h2>
                <p className="text-blue-50 text-sm font-semibold leading-relaxed max-w-[260px]">
                  {authMode === 'login' 
                    ? 'Sign in to access your saved addresses, track orders, and experience fast checkout.'
                    : 'Create an account for personalized recommendations, faster checkout, and exclusive offers.'}
                </p>
             </div>
          </div>

          {/* Right Side: Form */}
          <div className="md:w-3/5 lg:w-2/3 p-8 md:p-10 lg:p-12 flex flex-col justify-center bg-white relative">
             <form onSubmit={handleAuthSubmit} className="flex flex-col gap-5 w-full max-w-md">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-xl font-bold text-brand-graphite font-heading">
                    {authMode === 'login' ? 'Secure Login' : 'Create Account'}
                  </h3>
                  <div className="h-px flex-1 bg-slate-100 ml-4"></div>
                </div>

                {authMode === 'register' && (
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-black text-brand-slate uppercase tracking-wider flex items-center gap-1.5"><User size={12}/> Full Name</label>
                    <input value={aName} onChange={(e) => setAName(e.target.value)} placeholder="E.g. Jane Doe" required className="px-4 py-3.5 border border-slate-200 rounded-xl text-sm font-bold text-brand-graphite focus:outline-none focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10 transition-all bg-slate-50 focus:bg-white placeholder:text-slate-400" />
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-black text-brand-slate uppercase tracking-wider flex items-center gap-1.5"><Mail size={12}/> Email Address</label>
                  <input type="email" value={aEmail} onChange={(e) => setAEmail(e.target.value)} placeholder="you@example.com" required className="px-4 py-3.5 border border-slate-200 rounded-xl text-sm font-bold text-brand-graphite focus:outline-none focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10 transition-all bg-slate-50 focus:bg-white placeholder:text-slate-400" />
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-brand-slate uppercase tracking-wider flex items-center gap-1.5"><ShieldCheck size={12}/> Password</label>
                    {authMode === 'login' && (
                      <button
                        type="button"
                        onClick={() => setShowForgotPassword(true)}
                        className="text-xs font-bold text-brand-blue hover:underline cursor-pointer"
                      >
                        Forgot Password?
                      </button>
                    )}
                  </div>
                  <input type="password" value={aPass} onChange={(e) => setAPass(e.target.value)} placeholder="••••••••" required className="px-4 py-3.5 border border-slate-200 rounded-xl text-sm font-bold text-brand-graphite focus:outline-none focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10 transition-all bg-slate-50 focus:bg-white placeholder:text-slate-400" />
                </div>
                
                <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-5">
                  <motion.button whileTap={{ scale: 0.97 }} type="submit" disabled={authLoading}
                    className="w-full sm:w-auto px-8 py-3.5 bg-brand-blue hover:bg-blue-650 text-white text-sm font-black uppercase tracking-wider rounded-xl shadow-[0_8px_20px_rgb(14,165,233,0.3)] flex items-center justify-center gap-2 disabled:opacity-70 transition-all cursor-pointer">
                    {authLoading ? <Loader2 size={18} className="animate-spin" /> : (authMode === 'login' ? <LogIn size={18} /> : <User size={18} />)}
                    {authMode === 'login' ? 'Log In Now' : 'Register Now'}
                  </motion.button>
                  
                  <button type="button" onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setAError(''); }}
                    className="text-xs text-brand-slate hover:text-brand-blue font-bold underline transition-colors w-full sm:w-auto text-center cursor-pointer">
                    {authMode === 'login' ? "New here? Create account" : 'Already registered? Log in'}
                  </button>
                </div>
                {aError && (
                  <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="p-3 mt-2 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 font-bold flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"></span>{aError}
                  </motion.div>
                )}
             </form>
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

