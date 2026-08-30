import React from 'react';
import { Skeleton } from '../common/Skeleton';
import { AlertCircle } from 'lucide-react';

export const PageHeader: React.FC<{ title: string; subtitle?: string; actions?: React.ReactNode }> = ({ title, subtitle, actions }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
    <div className="min-w-0">
      <h1 className="text-xl font-bold text-brand-graphite font-heading tracking-tight">{title}</h1>
      {subtitle && <p className="text-sm text-brand-slate font-medium mt-0.5">{subtitle}</p>}
    </div>
    {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
  </div>
);

export const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: string; sub?: string; color: string; to?: string }> = ({ icon, label, value, sub, color }) => (
  <button
    type="button"
    className="bg-white rounded-2xl p-5 shadow-premium border border-brand-border flex items-start gap-4 hover:shadow-elevated hover:-translate-y-0.5 transition-all text-left w-full"
  >
    <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>{icon}</div>
    <div className="min-w-0">
      <p className="text-[13px] text-brand-slate font-semibold">{label}</p>
      <p className="text-2xl font-bold text-brand-graphite font-numbers mt-0.5">{value}</p>
      {sub && <p className="text-xs text-brand-slate mt-0.5 font-medium">{sub}</p>}
    </div>
  </button>
);

export const EmptyState: React.FC<{ icon: React.ReactNode; title: string; message: string; action?: React.ReactNode }> = ({ icon, title, message, action }) => (
  <div className="bg-white border border-brand-border rounded-card p-10 text-center shadow-premium flex flex-col items-center gap-3">
    <div className="w-14 h-14 rounded-full bg-brand-blue/5 flex items-center justify-center text-brand-blue">{icon}</div>
    <h3 className="text-sm font-extrabold text-brand-graphite font-heading">{title}</h3>
    <p className="text-xs text-brand-slate font-medium max-w-sm">{message}</p>
    {action && <div className="mt-2">{action}</div>}
  </div>
);

export const ErrorState: React.FC<{ message: string; onRetry?: () => void }> = ({ message, onRetry }) => (
  <div className="bg-red-50 border border-red-200 rounded-card p-6 flex items-center gap-3 text-left">
    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
    <div className="flex-1">
      <p className="text-sm font-bold text-red-700">Something went wrong</p>
      <p className="text-xs text-red-600">{message}</p>
    </div>
    {onRetry && (
      <button onClick={onRetry} className="text-xs font-bold bg-red-600 text-white px-3 py-1.5 rounded-button">Retry</button>
    )}
  </div>
);

export const LoadingGrid: React.FC<{ count?: number }> = ({ count = 4 }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
    {Array.from({ length: count }).map((_, i) => (
      <Skeleton key={i} className="h-28" />
    ))}
  </div>
);

export const SectionCard: React.FC<{ title: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }> = ({ title, subtitle, action, children, className = '' }) => (
  <div className={`bg-white border border-brand-border rounded-card shadow-premium p-6 ${className}`}>
    <div className="flex items-center justify-between mb-4">
      <div>
        <h3 className="font-extrabold text-sm text-brand-graphite font-heading">{title}</h3>
        {subtitle && <p className="text-xs text-brand-slate mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
    {children}
  </div>
);

export const Badge: React.FC<{ children: React.ReactNode; tone?: 'blue' | 'green' | 'amber' | 'red' | 'slate' | 'purple' }> = ({ children, tone = 'slate' }) => {
  const tones: Record<string, string> = {
    blue: 'bg-blue-50 text-brand-blue border-blue-100',
    green: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    red: 'bg-red-50 text-red-600 border-red-100',
    slate: 'bg-slate-100 text-brand-slate border-slate-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-100',
  };
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-bold capitalize tracking-wide border ${tones[tone]}`}>
      {children}
    </span>
  );
};

export const statusTone = (s: string): 'green' | 'amber' | 'blue' | 'red' | 'purple' | 'slate' => {
  if (['delivered', 'paid', 'refunded', 'completed'].includes(s)) return 'green';
  if (['pending', 'requested', 'return_requested', 'exchange_requested'].includes(s)) return 'amber';
  if (['shipped', 'in_transit', 'processing', 'confirmed', 'placed', 'packing'].includes(s)) return 'blue';
  if (['cancelled', 'failed', 'suspended'].includes(s)) return 'red';
  if (['active', 'available'].includes(s)) return 'purple';
  return 'slate';
};

export const RatingStars: React.FC<{ value: number; size?: number }> = ({ value, size = 14 }) => (
  <div className="flex items-center gap-0.5" aria-label={`${value} out of 5`}>
    {[1, 2, 3, 4, 5].map((i) => (
      <svg key={i} width={size} height={size} viewBox="0 0 24 24" fill={i <= value ? '#F5A623' : '#E5E5EA'} className="flex-shrink-0">
        <path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7-6.2-3.7-6.2 3.7 1.6-7L2 9.2l7.1-.6L12 2z" />
      </svg>
    ))}
  </div>
);

export const PrimaryButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = (props) => (
  <button
    {...props}
    className={`px-5 py-2.5 bg-brand-blue hover:bg-blue-700 text-white rounded-button text-xs font-bold uppercase tracking-wider shadow-soft disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${props.className || ''}`}
  />
);

export const GhostButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = (props) => (
  <button
    {...props}
    className={`px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-brand-graphite rounded-button text-xs font-bold transition-colors disabled:opacity-50 ${props.className || ''}`}
  />
);

export const fieldCls = 'w-full px-3.5 py-2.5 border border-brand-border bg-white rounded-xl text-xs font-bold text-brand-graphite focus:outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10 transition-all shadow-sm';
export const selectCls = 'w-full px-3.5 py-2.5 border border-brand-border bg-white rounded-xl text-xs font-bold text-brand-graphite focus:outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10 appearance-none transition-all pr-10 cursor-pointer shadow-sm';