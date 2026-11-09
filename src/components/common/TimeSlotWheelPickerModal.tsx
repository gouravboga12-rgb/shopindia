import React, { useState, useMemo } from 'react';
import { X, Calendar, Clock, CheckCircle2, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TimeSlotWheelPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  serviceTitle: string;
  price: number;
  onConfirm: (slotData: { date: string; time: string }) => void;
}

interface DateOption {
  key: string;
  label: string;
  subLabel: string;
  dateObj: Date;
  isFriday: boolean;
}

interface SlotOption {
  id: string;
  timeRange: string;
  period: 'morning' | 'afternoon' | 'evening';
  startHour: number;
}

export const TimeSlotWheelPickerModal: React.FC<TimeSlotWheelPickerModalProps> = ({
  isOpen,
  onClose,
  serviceTitle,
  price,
  onConfirm,
}) => {
  // Generate 6 upcoming days
  const dateOptions: DateOption[] = useMemo(() => {
    const list: DateOption[] = [];
    const today = new Date();

    for (let i = 0; i < 6; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);

      let label = '';
      if (i === 0) label = 'Today';
      else if (i === 1) label = 'Tomorrow';
      else label = d.toLocaleDateString('en-IN', { weekday: 'short' });

      const subLabel = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      const isFriday = d.getDay() === 5;

      list.push({
        key: d.toISOString().split('T')[0],
        label,
        subLabel,
        dateObj: d,
        isFriday,
      });
    }
    return list;
  }, []);

  const [selectedDateIdx, setSelectedDateIdx] = useState<number>(0);
  const [selectedSlot, setSelectedSlot] = useState<string>('02:00 PM - 04:00 PM');

  const standardSlots: SlotOption[] = [
    { id: 'm1', timeRange: '08:00 AM - 10:00 AM', period: 'morning', startHour: 8 },
    { id: 'm2', timeRange: '10:00 AM - 12:00 PM', period: 'morning', startHour: 10 },
    { id: 'a1', timeRange: '12:00 PM - 02:00 PM', period: 'afternoon', startHour: 12 },
    { id: 'a2', timeRange: '02:00 PM - 04:00 PM', period: 'afternoon', startHour: 14 },
    { id: 'a3', timeRange: '04:00 PM - 06:00 PM', period: 'afternoon', startHour: 16 },
    { id: 'e1', timeRange: '06:00 PM - 08:00 PM', period: 'evening', startHour: 18 },
  ];

  const currentDateOption = dateOptions[selectedDateIdx] || dateOptions[0];

  // Check if slot is unavailable
  const isSlotDisabled = (slot: SlotOption) => {
    // 1. Friday Prayer Break check: 12 PM - 2 PM is paused
    if (currentDateOption.isFriday && slot.startHour === 12) {
      return { disabled: true, reason: 'Friday Prayer Break 🕌' };
    }

    // 2. If Today, check if slot has already passed
    if (selectedDateIdx === 0) {
      const now = new Date();
      const currentHour = now.getHours();
      if (currentHour >= slot.startHour) {
        return { disabled: true, reason: 'Slot Passed' };
      }
    }

    return { disabled: false, reason: '' };
  };

  const handleConfirm = () => {
    const formattedDate = `${currentDateOption.label} (${currentDateOption.subLabel})`;
    onConfirm({
      date: formattedDate,
      time: selectedSlot,
    });
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-[460px] bg-[#1A1D24] text-slate-100 rounded-3xl p-6 shadow-2xl border border-slate-700/60 flex flex-col font-sans max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex justify-between items-start pb-4 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 bg-teal-500/20 text-teal-300 font-black text-[10px] rounded-full uppercase tracking-wider border border-teal-500/30">
                  Glacons Appointment
                </span>
                <span className="text-xs text-amber-400 font-extrabold">₹{price}</span>
              </div>
              <h3 className="font-bold text-base text-white">{serviceTitle}</h3>
              <p className="text-xs text-slate-400 mt-0.5">Select your preferred date & 2-hour arrival window</p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* 1. Date Selector Pills */}
          <div className="py-4 border-b border-slate-800/80">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Calendar size={14} className="text-teal-400" />
              <span>Select Date</span>
            </span>

            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 mt-2">
              {dateOptions.map((opt, idx) => {
                const isSelected = selectedDateIdx === idx;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => {
                      setSelectedDateIdx(idx);
                      // If switching to Friday and selected slot is 12-2 PM, fallback to 2-4 PM
                      if (opt.isFriday && selectedSlot.includes('12:00 PM')) {
                        setSelectedSlot('02:00 PM - 04:00 PM');
                      }
                    }}
                    className={`py-2.5 px-2 rounded-2xl flex flex-col items-center justify-center transition-all ${
                      isSelected
                        ? 'bg-teal-500 text-slate-950 font-black shadow-lg shadow-teal-500/25 ring-2 ring-teal-400'
                        : 'bg-[#252A34] text-slate-300 hover:bg-[#2D333F]'
                    }`}
                  >
                    <span className="text-[11px] font-bold leading-tight">{opt.label}</span>
                    <span className={`text-[10px] mt-0.5 ${isSelected ? 'text-slate-900 font-extrabold' : 'text-slate-400'}`}>
                      {opt.subLabel}
                    </span>
                    {opt.isFriday && (
                      <span className="text-[9px] text-amber-300 font-bold mt-0.5">🕌 Fri</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Slot Selector Chips */}
          <div className="py-4 space-y-4">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Clock size={14} className="text-teal-400" />
              <span>Select 2-Hour Arrival Window</span>
            </span>

            {/* Morning */}
            <div>
              <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block mb-2">
                Morning
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {standardSlots.filter(s => s.period === 'morning').map(slot => {
                  const check = isSlotDisabled(slot);
                  const isSelected = selectedSlot === slot.timeRange;
                  return (
                    <button
                      key={slot.id}
                      type="button"
                      disabled={check.disabled}
                      onClick={() => setSelectedSlot(slot.timeRange)}
                      className={`py-3 px-3.5 rounded-xl text-left border flex items-center justify-between transition-all ${
                        check.disabled
                          ? 'opacity-40 bg-slate-900/40 border-slate-800 text-slate-500 cursor-not-allowed'
                          : isSelected
                          ? 'bg-teal-950/60 border-teal-400 text-teal-200 font-bold shadow-sm'
                          : 'bg-[#252A34] border-slate-700/60 text-slate-300 hover:border-slate-500'
                      }`}
                    >
                      <span className="text-xs">{slot.timeRange}</span>
                      {check.disabled ? (
                        <span className="text-[10px] text-rose-400 font-bold">{check.reason}</span>
                      ) : isSelected ? (
                        <CheckCircle2 size={15} className="text-teal-400" />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Afternoon */}
            <div>
              <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block mb-2">
                Afternoon
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {standardSlots.filter(s => s.period === 'afternoon').map(slot => {
                  const check = isSlotDisabled(slot);
                  const isSelected = selectedSlot === slot.timeRange;
                  return (
                    <button
                      key={slot.id}
                      type="button"
                      disabled={check.disabled}
                      onClick={() => setSelectedSlot(slot.timeRange)}
                      className={`py-3 px-3.5 rounded-xl text-left border flex items-center justify-between transition-all ${
                        check.disabled
                          ? 'opacity-45 bg-slate-900/40 border-slate-800 text-slate-500 cursor-not-allowed'
                          : isSelected
                          ? 'bg-teal-950/60 border-teal-400 text-teal-200 font-bold shadow-sm'
                          : 'bg-[#252A34] border-slate-700/60 text-slate-300 hover:border-slate-500'
                      }`}
                    >
                      <span className="text-xs">{slot.timeRange}</span>
                      {check.disabled ? (
                        <span className="text-[10px] text-amber-300 font-bold">{check.reason}</span>
                      ) : isSelected ? (
                        <CheckCircle2 size={15} className="text-teal-400" />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Evening */}
            <div>
              <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block mb-2">
                Evening
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {standardSlots.filter(s => s.period === 'evening').map(slot => {
                  const check = isSlotDisabled(slot);
                  const isSelected = selectedSlot === slot.timeRange;
                  return (
                    <button
                      key={slot.id}
                      type="button"
                      disabled={check.disabled}
                      onClick={() => setSelectedSlot(slot.timeRange)}
                      className={`py-3 px-3.5 rounded-xl text-left border flex items-center justify-between transition-all ${
                        check.disabled
                          ? 'opacity-40 bg-slate-900/40 border-slate-800 text-slate-500 cursor-not-allowed'
                          : isSelected
                          ? 'bg-teal-950/60 border-teal-400 text-teal-200 font-bold shadow-sm'
                          : 'bg-[#252A34] border-slate-700/60 text-slate-300 hover:border-slate-500'
                      }`}
                    >
                      <span className="text-xs">{slot.timeRange}</span>
                      {check.disabled ? (
                        <span className="text-[10px] text-rose-400 font-bold">{check.reason}</span>
                      ) : isSelected ? (
                        <CheckCircle2 size={15} className="text-teal-400" />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Appointment Summary Box */}
          <div className="bg-[#242933] p-3.5 rounded-2xl border border-slate-700/60 flex items-center gap-3 mt-1">
            <div className="w-9 h-9 rounded-xl bg-teal-500/20 text-teal-300 flex items-center justify-center flex-shrink-0">
              <Sparkles size={18} />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-teal-400 block">
                Appointment Summary
              </span>
              <p className="text-xs font-bold text-white">
                {currentDateOption.label} ({currentDateOption.subLabel}) at {selectedSlot}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-3 mt-5 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="py-3 px-4 rounded-xl border border-slate-700 bg-[#292D33] text-slate-300 hover:bg-[#32363D] text-xs font-bold uppercase tracking-wider transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="py-3 px-4 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-black uppercase tracking-wider shadow-lg shadow-teal-500/25 transition-all active:scale-95"
            >
              Confirm & Book
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
