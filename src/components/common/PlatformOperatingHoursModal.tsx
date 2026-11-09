import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, X, Moon, ArrowRight } from 'lucide-react';

export interface OperatingHoursStatus {
  midnightBlackout: {
    isActive: boolean;
    title: string;
    message: string;
    remainingSeconds: number;
    resumeTime: string;
    verticals: string;
  };
  fridayBreak: {
    isActive: boolean;
    title: string;
    subtitle: string;
    message: string;
    remainingSeconds: number;
    resumeTime: string;
    verticals: string;
  };
}

interface PlatformOperatingHoursModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: OperatingHoursStatus | null;
  vertical?: 'quick' | 'services' | 'shop';
}

export const PlatformOperatingHoursModal: React.FC<PlatformOperatingHoursModalProps> = ({
  isOpen,
  onClose,
  status,
  vertical: _vertical = 'quick',
}) => {
  if (!isOpen || !status) return null;

  const isFriday = status.fridayBreak?.isActive;
  const isMidnight = !isFriday && status.midnightBlackout?.isActive;

  if (!isFriday && !isMidnight) return null;

  // Real-time ticking countdown timer
  const initialSeconds = isFriday
    ? status.fridayBreak.remainingSeconds
    : status.midnightBlackout.remainingSeconds;

  const [secondsLeft, setSecondsLeft] = useState<number>(Math.max(0, initialSeconds));

  useEffect(() => {
    setSecondsLeft(Math.max(0, initialSeconds));
  }, [initialSeconds, isFriday]);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setInterval(() => {
      setSecondsLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [secondsLeft]);

  const formatCountdown = (totalSec: number) => {
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(hours)}:${pad(minutes)}:${pad(secs)}`;
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          transition={{ duration: 0.24, ease: 'easeOut' }}
          className="relative w-full max-w-lg overflow-hidden rounded-3xl shadow-2xl border text-left"
        >
          {/* Close X pill */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 p-2 rounded-full bg-black/30 hover:bg-black/50 text-white/80 hover:text-white transition-all backdrop-blur-md"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {/* VIEW A: FRIDAY PRAYER BREAK (Matching Image 55) */}
          {isFriday && (
            <div className="bg-gradient-to-b from-emerald-950 via-teal-950 to-emerald-900 text-white p-7 sm:p-8 flex flex-col items-center text-center border border-emerald-800/80">
              {/* Islamic Arch Motif / Mosque Graphic */}
              <div className="relative mb-5 flex items-center justify-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 p-0.5 shadow-xl">
                  <div className="w-full h-full rounded-full bg-emerald-950 flex items-center justify-center text-4xl shadow-inner">
                    🕌
                  </div>
                </div>
                <div className="absolute -top-1 -right-1 text-2xl animate-pulse">
                  ✨
                </div>
              </div>

              <span className="px-3.5 py-1 bg-amber-400/20 text-amber-300 font-black text-xs rounded-full uppercase tracking-widest border border-amber-400/40 mb-2">
                Weekly Prayer Observance
              </span>

              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white uppercase font-heading">
                {status.fridayBreak.title || 'Friday Prayer Break'}
              </h2>

              <p className="text-amber-300 font-bold text-sm sm:text-base mt-1">
                {status.fridayBreak.subtitle || 'Jummah Mubarak! Services temporarily paused.'}
              </p>

              {/* Real-time Ticking Countdown Box */}
              <div className="my-6 w-full max-w-xs py-3 px-5 bg-black/40 rounded-2xl border border-emerald-600/50 backdrop-blur-lg flex flex-col items-center shadow-inner">
                <span className="text-[11px] font-black uppercase tracking-widest text-emerald-300/90 flex items-center gap-1.5 mb-1">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  Services Resume In
                </span>
                <span className="font-mono text-3xl sm:text-4xl font-black text-amber-300 tracking-wider">
                  {formatCountdown(secondsLeft)}
                </span>
                <span className="text-[10px] text-emerald-200/70 mt-1">
                  Resuming prompt at {status.fridayBreak.resumeTime} IST
                </span>
              </div>

              <p className="text-xs sm:text-sm text-emerald-100/85 max-w-md leading-relaxed mb-6 font-medium">
                {status.fridayBreak.message ||
                  'Our deliveries and field services are on a brief pause for Friday Jummah prayers. You may continue to browse and build your cart.'}
              </p>

              <button
                onClick={onClose}
                className="w-full py-3.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-emerald-950 rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <span>Browse Products & Add to Cart</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* VIEW B: MIDNIGHT BLACKOUT (Matching Image 54 / Zepto Shutters Down) */}
          {isMidnight && (
            <div className="bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950 text-white p-7 sm:p-8 flex flex-col items-center text-center border border-slate-800">
              {/* Shutter Icon Graphic */}
              <div className="w-20 h-20 rounded-3xl bg-indigo-950/80 border border-indigo-700/50 flex items-center justify-center text-4xl shadow-xl mb-4 text-indigo-400">
                🔒
              </div>

              <span className="px-3.5 py-1 bg-indigo-500/20 text-indigo-300 font-black text-xs rounded-full uppercase tracking-widest border border-indigo-500/30 mb-2">
                Night Hours Pause
              </span>

              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white font-heading">
                {status.midnightBlackout.title || "Closed for the day! We'll be back at 7 AM"}
              </h2>

              <p className="text-xs sm:text-sm text-slate-300 max-w-md leading-relaxed mt-2.5 mb-6 font-medium">
                {status.midnightBlackout.message ||
                  "Our midnight operations are temporarily closed to allow our riders and partner technicians to rest. Ordering reopens in the morning."}
              </p>

              {/* Remaining time pill */}
              <div className="mb-6 inline-flex items-center gap-2.5 px-4 py-2 bg-indigo-900/40 rounded-full border border-indigo-700/50 text-xs font-bold text-indigo-200">
                <Moon className="w-4 h-4 text-amber-400" />
                <span>Ordering reopens at {status.midnightBlackout.resumeTime} IST</span>
              </div>

              <button
                onClick={onClose}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <span>Browse Catalog & Prepare Cart</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
