import React, { useState } from 'react';
import { ShieldCheck, CheckCircle2, AlertCircle, Building2 } from 'lucide-react';

interface RegionalAdminRegisterProps {
  onSwitchToLogin: () => void;
}

export const RegionalAdminRegister: React.FC<RegionalAdminRegisterProps> = ({ onSwitchToLogin }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    regionName: '',
    district: '',
    state: 'Telangana',
    assignedPincodes: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const pincodeList = formData.assignedPincodes
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean);

      const res = await fetch('/api/regional-admin/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          assignedPincodes: pincodeList,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');

      setSuccess('Application submitted! Once approved by Super Admin, your login credentials will be activated.');
      setTimeout(() => onSwitchToLogin(), 2500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 py-8 text-slate-100">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full blur-sm" />

        <div className="text-center mb-6">
          <div className="w-14 h-14 mx-auto mb-3 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
            <Building2 className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight text-white">
            Regional Hub Application
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Apply to operate and supervise quick-commerce and 3PL dispatch for your territory
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-950/70 border border-red-500/40 rounded-xl text-xs text-red-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 bg-emerald-950/70 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Full Legal Name</label>
              <input
                type="text"
                name="name"
                required
                placeholder="Manager Name"
                value={formData.name}
                onChange={handleChange}
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Phone Number</label>
              <input
                type="tel"
                name="phone"
                required
                placeholder="+91 98765 43210"
                value={formData.phone}
                onChange={handleChange}
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Official Email</label>
              <input
                type="email"
                name="email"
                required
                placeholder="zone.lead@shopindia.com"
                value={formData.email}
                onChange={handleChange}
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
              <input
                type="password"
                name="password"
                required
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800 space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Territory / Region Name</label>
              <input
                type="text"
                name="regionName"
                required
                placeholder="e.g. Hyderabad Central Hub or Bengaluru South"
                value={formData.regionName}
                onChange={handleChange}
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">District / Division</label>
                <input
                  type="text"
                  name="district"
                  placeholder="e.g. Hyderabad"
                  value={formData.district}
                  onChange={handleChange}
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">State</label>
                <select
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="Telangana">Telangana</option>
                  <option value="Andhra Pradesh">Andhra Pradesh</option>
                  <option value="Karnataka">Karnataka</option>
                  <option value="Maharashtra">Maharashtra</option>
                  <option value="Tamil Nadu">Tamil Nadu</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Assigned Postal Codes (Pincodes)</label>
              <input
                type="text"
                name="assignedPincodes"
                placeholder="500081, 500084, 500032 (comma-separated)"
                value={formData.assignedPincodes}
                onChange={handleChange}
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <ShieldCheck className="w-5 h-5" />
                <span>Submit Regional Application</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-5 text-center text-xs text-slate-400">
          <p>
            Already an approved Regional Manager?{' '}
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="text-blue-400 hover:underline font-bold"
            >
              Sign In
            </button>
          </p>
        </div>

      </div>
    </div>
  );
};
