import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { Store, Eye, EyeOff, Loader2 } from 'lucide-react';
import { ForgotPasswordModal } from '../../components/auth/ForgotPasswordModal';

export const VendorLogin: React.FC<{ initialRegister?: boolean }> = ({ initialRegister = false }) => {
  const { login } = useAuth();
  const [isRegister, setIsRegister] = useState(initialRegister);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showForgot, setShowForgot] = useState(false);

  // Form states
  const [email, setEmail] = useState('vendor@demo.in');
  const [password, setPassword] = useState('Vendor@1234');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [panNumber, setPanNumber] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(''); setSuccess('');

    try {
      if (isRegister) {
        // FR-02.1 Vendor registration
        const res = await api.post<any>('/api/vendor/auth/register', {
          name, email, phone, password, businessName, gstNumber, panNumber
        });
        setSuccess(res.message || 'Registration submitted! Please wait for admin approval.');
        setIsRegister(false);
      } else {
        // Vendor Login
        const res = await api.post<{ token: string; user: any }>('/api/vendor/auth/login', { email, password });
        login(res.token, res.user);
      }
    } catch (err: any) {
      setError(err.message || 'Action failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-3 sm:p-6">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-emerald-500 text-white shadow-lg mb-3 sm:mb-4">
            <Store className="w-7 h-7 sm:w-8 sm:h-8" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 font-heading">ShopIndia Vendor Portal</h1>
          <p className="text-gray-500 text-xs sm:text-sm mt-1">Manage your store, products, and orders</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl p-5 sm:p-8 border border-gray-100">
          <div className="flex border-b border-gray-200 mb-6">
            <button
              onClick={() => { setIsRegister(false); setError(''); setSuccess(''); }}
              className={`flex-1 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer ${
                !isRegister ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              Vendor Sign In
            </button>
            <button
              onClick={() => { setIsRegister(true); setError(''); setSuccess(''); }}
              className={`flex-1 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer ${
                isRegister ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              Register as Vendor
            </button>
          </div>

          {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs sm:text-sm">{error}</div>}
          {success && <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs sm:text-sm">{success}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Your Name *</label>
                    <input required value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2.5 border rounded-xl text-base sm:text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Phone *</label>
                    <input required value={phone} onChange={e => setPhone(e.target.value)} className="w-full px-3 py-2.5 border rounded-xl text-base sm:text-sm" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Business / Store Name *</label>
                  <input required value={businessName} onChange={e => setBusinessName(e.target.value)} className="w-full px-4 py-2.5 border rounded-xl text-base sm:text-sm" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">GST Number</label>
                    <input value={gstNumber} onChange={e => setGstNumber(e.target.value)} placeholder="Optional" className="w-full px-3 py-2.5 border rounded-xl text-base sm:text-sm uppercase" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">PAN Number</label>
                    <input value={panNumber} onChange={e => setPanNumber(e.target.value)} placeholder="Optional" className="w-full px-3 py-2 border rounded-xl text-xs uppercase" />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Email Address *</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-2.5 border rounded-xl text-base sm:text-sm" />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-gray-700">Password *</label>
                {!isRegister && (
                  <button
                    type="button"
                    onClick={() => setShowForgot(true)}
                    className="text-xs font-semibold text-emerald-600 hover:underline cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 pr-10 border rounded-xl text-base sm:text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#10B981] text-white rounded-xl font-semibold text-sm hover:bg-[#059669] flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-60"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : isRegister ? 'Submit Application' : 'Vendor Sign In'}
            </button>
          </form>
        </div>
      </div>

      <ForgotPasswordModal
        isOpen={showForgot}
        onClose={() => setShowForgot(false)}
        initialEmail={email}
      />
    </div>
  );
};
