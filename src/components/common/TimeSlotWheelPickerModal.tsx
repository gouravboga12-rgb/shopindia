import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TimeSlotWheelPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  serviceTitle: string;
  price: number;
  onConfirm: (slotData: { date: string; time: string }) => void;
}

export const TimeSlotWheelPickerModal: React.FC<TimeSlotWheelPickerModalProps> = ({
  isOpen,
  onClose,
  serviceTitle,
  price,
  onConfirm,
}) => {
  const [selectedHour, setSelectedHour] = useState<number>(10);
  const [selectedMinute, setSelectedMinute] = useState<number>(30);
  const [selectedPeriod, setSelectedPeriod] = useState<'am' | 'pm'>('am');
  const [dateIndex, setDateIndex] = useState<number>(0);

  const dates = [
    'Today',
    'Tomorrow',
    'Day After Tomorrow',
    new Date(Date.now() + 3 * 86400000).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' }),
    new Date(Date.now() + 4 * 86400000).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' }),
  ];

  const resetToCurrentTime = () => {
    const now = new Date();
    let hours = now.getHours();
    const minutes = now.getMinutes();
    const period = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12;
    hours = hours ? hours : 12;
    setSelectedHour(hours);
    setSelectedMinute(minutes);
    setSelectedPeriod(period);
    setDateIndex(0);
  };

  useEffect(() => {
    if (isOpen) {
      resetToCurrentTime();
    }
  }, [isOpen]);

  const handlePrevHour = () => setSelectedHour(h => (h === 1 ? 12 : h - 1));
  const handleNextHour = () => setSelectedHour(h => (h === 12 ? 1 : h + 1));

  const handlePrevMinute = () => setSelectedMinute(m => (m === 0 ? 59 : m - 1));
  const handleNextMinute = () => setSelectedMinute(m => (m === 59 ? 0 : m + 1));

  const togglePeriod = () => setSelectedPeriod(p => (p === 'am' ? 'pm' : 'am'));

  const handlePrevDate = () => setDateIndex(i => (i > 0 ? i - 1 : dates.length - 1));
  const handleNextDate = () => setDateIndex(i => (i < dates.length - 1 ? i + 1 : 0));

  const handleSet = () => {
    const timeFormatted = `${selectedHour.toString().padStart(2, '0')}:${selectedMinute.toString().padStart(2, '0')} ${selectedPeriod.toUpperCase()}`;
    const dateFormatted = dates[dateIndex];
    onConfirm({ date: dateFormatted, time: timeFormatted });
  };

  const prevHour = selectedHour === 1 ? 12 : selectedHour - 1;
  const nextHour = selectedHour === 12 ? 1 : selectedHour + 1;

  const prevMinute = selectedMinute === 0 ? 59 : selectedMinute - 1;
  const nextMinute = selectedMinute === 59 ? 0 : selectedMinute + 1;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-[340px] bg-[#22252A] text-slate-100 rounded-3xl p-6 shadow-2xl border border-slate-700/50 flex flex-col font-sans"
        >
          {/* Header */}
          <div className="flex justify-between items-center pb-3 border-b border-slate-700/40 mb-4">
            <div>
              <h3 className="font-bold text-sm text-slate-100">{serviceTitle}</h3>
              <p className="text-[11px] text-cyan-400 font-semibold font-numbers">₹{price} • Select Booking Slot</p>
            </div>
            <button onClick={onClose} className="p-1 rounded-full text-slate-400 hover:text-white transition-colors">
              <X size={16} />
            </button>
          </div>

          {/* Time Wheel / Roller */}
          <div className="py-4 flex flex-col items-center justify-center relative">
            <div className="grid grid-cols-3 gap-6 w-full max-w-[260px] text-center items-center">
              {/* Column 1: Hours */}
              <div className="flex flex-col items-center">
                <button
                  type="button"
                  onClick={handlePrevHour}
                  className="h-10 text-slate-500 hover:text-slate-300 text-lg font-light flex items-center justify-center transition-colors"
                >
                  {prevHour}
                </button>
                <div className="w-full border-t border-slate-500 my-1" />
                <div className="h-12 flex items-center justify-center text-2xl font-normal text-white">
                  {selectedHour}
                </div>
                <div className="w-full border-b border-slate-500 my-1" />
                <button
                  type="button"
                  onClick={handleNextHour}
                  className="h-10 text-slate-500 hover:text-slate-300 text-lg font-light flex items-center justify-center transition-colors"
                >
                  {nextHour}
                </button>
              </div>

              {/* Column 2: Minutes with Colon Separator */}
              <div className="flex flex-col items-center relative">
                {/* Colon Indicator */}
                <span className="absolute left-[-10px] top-1/2 -translate-y-1/2 text-2xl font-light text-slate-400 select-none">
                  :
                </span>
                <button
                  type="button"
                  onClick={handlePrevMinute}
                  className="h-10 text-slate-500 hover:text-slate-300 text-lg font-light flex items-center justify-center transition-colors"
                >
                  {prevMinute.toString().padStart(2, '0')}
                </button>
                <div className="w-full border-t border-slate-500 my-1" />
                <div className="h-12 flex items-center justify-center text-2xl font-normal text-white">
                  {selectedMinute.toString().padStart(2, '0')}
                </div>
                <div className="w-full border-b border-slate-500 my-1" />
                <button
                  type="button"
                  onClick={handleNextMinute}
                  className="h-10 text-slate-500 hover:text-slate-300 text-lg font-light flex items-center justify-center transition-colors"
                >
                  {nextMinute.toString().padStart(2, '0')}
                </button>
              </div>

              {/* Column 3: AM / PM */}
              <div className="flex flex-col items-center">
                <button
                  type="button"
                  onClick={togglePeriod}
                  className="h-10 text-slate-500 hover:text-slate-300 text-base font-light flex items-center justify-center transition-colors opacity-50"
                >
                  {selectedPeriod === 'am' ? 'pm' : 'am'}
                </button>
                <div className="w-full border-t border-slate-500 my-1" />
                <div
                  onClick={togglePeriod}
                  className="h-12 flex items-center justify-center text-xl font-normal text-white cursor-pointer hover:text-cyan-400 transition-colors"
                >
                  {selectedPeriod}
                </div>
                <div className="w-full border-b border-slate-500 my-1" />
                <button
                  type="button"
                  onClick={togglePeriod}
                  className="h-10 text-slate-500 hover:text-slate-300 text-base font-light flex items-center justify-center transition-colors opacity-50"
                >
                  {selectedPeriod === 'am' ? 'pm' : 'am'}
                </button>
              </div>
            </div>
          </div>

          {/* Date Selector Row */}
          <div className="mt-4 flex items-center justify-between px-6 py-2.5 bg-[#2B2F36] rounded-2xl border border-slate-700/60">
            <button
              type="button"
              onClick={handlePrevDate}
              className="text-slate-400 hover:text-white p-1 transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="text-sm font-medium text-slate-200">{dates[dateIndex]}</span>
            <button
              type="button"
              onClick={handleNextDate}
              className="text-slate-400 hover:text-white p-1 transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Reset Link */}
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={resetToCurrentTime}
              className="text-xs font-medium text-[#38BDF8] hover:text-[#0EA5E9] hover:underline transition-colors"
            >
              Reset to current time
            </button>
          </div>

          {/* Footer Actions */}
          <div className="grid grid-cols-2 gap-3 mt-6 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="py-3 px-4 rounded-xl border border-slate-700 bg-[#292D33] text-slate-300 hover:bg-[#32363D] text-sm font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSet}
              className="py-3 px-4 rounded-xl bg-[#2DD4BF] hover:bg-[#14B8A6] text-slate-900 text-sm font-bold shadow-lg shadow-teal-500/20 transition-all active:scale-95"
            >
              Set
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
