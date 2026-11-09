import React, { useState, useMemo, useEffect } from 'react';
import {
  X, Calendar, Clock, Sparkles, ShieldCheck,
  Zap, MapPin, Phone, MessageSquare, AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../lib/api';
import { useApp } from '../../context/AppContext';
import { useCustomer } from '../../context/CustomerContext';

export interface SlotConfirmationData {
  mode: 'instant' | 'scheduled';
  date: string;
  time: string;
  addressDetails?: string;
  notes?: string;
  contactPhone?: string;
  whatsappPhone?: string;
}

interface TimeSlotWheelPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  serviceTitle: string;
  price: number;
  availableSlots?: string[];
  supportedBookingModes?: 'both' | 'instant' | 'scheduled';
  onConfirm: (slotData: SlotConfirmationData) => void;
}

interface DateOption {
  key: string;
  label: string;
  subLabel: string;
  dateObj: Date;
  isFriday: boolean;
}

const QUICK_TIME_PRESETS = [
  '09:30 AM',
  '11:00 AM',
  '02:30 PM',
  '05:00 PM',
  '07:00 PM'
];

export const TimeSlotWheelPickerModal: React.FC<TimeSlotWheelPickerModalProps> = ({
  isOpen,
  onClose,
  serviceTitle,
  price,
  supportedBookingModes = 'both',
  onConfirm,
}) => {
  const { location } = useApp();
  const { profile } = useCustomer();

  // Mode Selection: 'instant' vs 'scheduled' (Parrow Skills Model)
  const initialMode = supportedBookingModes === 'scheduled' ? 'scheduled' : 'instant';
  const [bookingMode, setBookingMode] = useState<'instant' | 'scheduled'>(initialMode);

  // Address Details & Notes (Zero Mapbox Canvas, Pure Auto-Fetch Location)
  const [addressDetails, setAddressDetails] = useState('');
  const [contactPhone, setContactPhone] = useState(profile?.phone || '');
  const [whatsappPhone, setWhatsappPhone] = useState(profile?.phone || '');
  const [specialNotes, setSpecialNotes] = useState('');

  // Dynamic Customer Time Selection
  const [selectedHour, setSelectedHour] = useState<string>('10');
  const [selectedMinute, setSelectedMinute] = useState<string>('00');
  const [selectedPeriod, setSelectedPeriod] = useState<'AM' | 'PM'>('AM');

  // Sync customer phone when available
  useEffect(() => {
    if (profile?.phone) {
      if (!contactPhone) setContactPhone(profile.phone);
      if (!whatsappPhone) setWhatsappPhone(profile.phone);
    }
  }, [profile?.phone]);

  // Fetch real-time platform operating status (respecting Super Admin Friday break & midnight blackout)
  const [operatingStatus, setOperatingStatus] = useState<any>(null);

  useEffect(() => {
    if (!isOpen) return;
    api.get<any>('/api/orders/pricing-config')
      .then(res => {
        if (res?.operatingStatus) {
          setOperatingStatus(res.operatingStatus);
        }
      })
      .catch(() => {});
  }, [isOpen]);

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
  const currentDateOption = dateOptions[selectedDateIdx] || dateOptions[0];

  const formattedSelectedTime = `${selectedHour}:${selectedMinute} ${selectedPeriod}`;

  // Helper to compute selected minutes from midnight
  const getSelectedTimeMinutes = () => {
    let h = parseInt(selectedHour, 10);
    const m = parseInt(selectedMinute, 10);
    if (selectedPeriod === 'PM' && h < 12) h += 12;
    if (selectedPeriod === 'AM' && h === 12) h = 0;
    return h * 60 + m;
  };

  // 1. Dynamic Friday Prayer Break Safeguard
  const isFridayBreakConfigured = Boolean(
    operatingStatus?.fridayBreak?.isEnabled &&
    (!operatingStatus?.fridayBreak?.verticals || operatingStatus.fridayBreak.verticals === 'both' || operatingStatus.fridayBreak.verticals === 'services')
  );

  const fridayConflict = useMemo(() => {
    if (!currentDateOption.isFriday || !isFridayBreakConfigured) {
      return { hasConflict: false, reason: '', formattedStart: '', formattedEnd: '' };
    }
    const fStartParts = (operatingStatus?.fridayBreak?.start || '12:00').split(':').map(Number);
    const fEndParts = (operatingStatus?.fridayBreak?.end || '14:00').split(':').map(Number);
    const fStartMin = fStartParts[0] * 60 + (fStartParts[1] || 0);
    const fEndMin = fEndParts[0] * 60 + (fEndParts[1] || 0);
    const selMin = getSelectedTimeMinutes();

    if (selMin >= fStartMin && selMin < fEndMin) {
      return {
        hasConflict: true,
        reason: operatingStatus?.fridayBreak?.title || 'Friday Prayer Break (Jummah)',
        formattedStart: operatingStatus?.fridayBreak?.formattedStart || '12:00 PM',
        formattedEnd: operatingStatus?.fridayBreak?.formattedEnd || '02:00 PM'
      };
    }
    return { hasConflict: false, reason: '', formattedStart: '', formattedEnd: '' };
  }, [currentDateOption.isFriday, isFridayBreakConfigured, operatingStatus, selectedHour, selectedMinute, selectedPeriod]);

  // 2. Dynamic Midnight Blackout Safeguard
  const isMidnightConfigured = Boolean(
    operatingStatus?.midnightBlackout?.isEnabled &&
    (!operatingStatus?.midnightBlackout?.verticals || operatingStatus.midnightBlackout.verticals === 'both' || operatingStatus.midnightBlackout.verticals === 'services')
  );

  const midnightConflict = useMemo(() => {
    if (!isMidnightConfigured) {
      return { hasConflict: false, reason: '', formattedStart: '', formattedEnd: '' };
    }
    const mStartParts = (operatingStatus?.midnightBlackout?.start || '23:00').split(':').map(Number);
    const mEndParts = (operatingStatus?.midnightBlackout?.end || '07:00').split(':').map(Number);
    const mStartMin = mStartParts[0] * 60 + (mStartParts[1] || 0);
    const mEndMin = mEndParts[0] * 60 + (mEndParts[1] || 0);
    const selMin = getSelectedTimeMinutes();

    let inBlackout = false;
    if (mStartMin > mEndMin) {
      inBlackout = selMin >= mStartMin || selMin < mEndMin;
    } else {
      inBlackout = selMin >= mStartMin && selMin < mEndMin;
    }

    if (inBlackout) {
      return {
        hasConflict: true,
        reason: operatingStatus?.midnightBlackout?.title || 'Overnight Operations Closed',
        formattedStart: operatingStatus?.midnightBlackout?.formattedStart || '11:00 PM',
        formattedEnd: operatingStatus?.midnightBlackout?.formattedEnd || '07:00 AM'
      };
    }
    return { hasConflict: false, reason: '', formattedStart: '', formattedEnd: '' };
  }, [isMidnightConfigured, operatingStatus, selectedHour, selectedMinute, selectedPeriod]);

  // 3. Past Time Safeguard (If booking for "Today")
  const pastConflict = useMemo(() => {
    if (selectedDateIdx !== 0) return { hasConflict: false, reason: '' };
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const selMin = getSelectedTimeMinutes();

    if (selMin <= nowMin + 45) {
      return {
        hasConflict: true,
        reason: 'This time has already passed or is within 45 mins. Please choose a time at least 45 minutes ahead, or switch to ⚡ Instant Match for 15–30 min emergency dispatch.'
      };
    }
    return { hasConflict: false, reason: '' };
  }, [selectedDateIdx, selectedHour, selectedMinute, selectedPeriod]);

  const hasScheduleConflict = fridayConflict.hasConflict || midnightConflict.hasConflict || pastConflict.hasConflict;

  const handleSelectPreset = (preset: string) => {
    const match = preset.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (match) {
      setSelectedHour(match[1].padStart(2, '0'));
      setSelectedMinute(match[2]);
      setSelectedPeriod(match[3].toUpperCase() as 'AM' | 'PM');
    }
  };

  const handleConfirm = () => {
    if (bookingMode === 'instant') {
      onConfirm({
        mode: 'instant',
        date: 'Today',
        time: 'Instant Match (15–30 Min ETA)',
        addressDetails: addressDetails.trim(),
        contactPhone: contactPhone.trim(),
        whatsappPhone: whatsappPhone.trim(),
        notes: specialNotes.trim(),
      });
    } else {
      if (hasScheduleConflict) return;
      const formattedDate = `${currentDateOption.label} (${currentDateOption.subLabel})`;
      onConfirm({
        mode: 'scheduled',
        date: formattedDate,
        time: formattedSelectedTime,
        addressDetails: addressDetails.trim(),
        contactPhone: contactPhone.trim(),
        whatsappPhone: whatsappPhone.trim(),
        notes: specialNotes.trim(),
      });
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/65 backdrop-blur-md select-none animate-in fade-in duration-200">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-[500px] bg-white text-slate-800 rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border border-slate-200 flex flex-col font-sans overflow-hidden"
        >
          {/* Header with ShopIndia Branding */}
          <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between bg-gradient-to-r from-orange-50/70 via-white to-amber-50/70 shrink-0">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 bg-orange-100 text-[#FF6B00] font-black text-[10px] rounded-full uppercase tracking-wider border border-orange-200/80">
                  Glacons Doorstep Care
                </span>
                <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  ₹{price}
                </span>
              </div>
              <h3 className="font-extrabold text-base text-slate-900 leading-snug">{serviceTitle}</h3>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">Choose instant dispatch or schedule a custom arrival time</p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 -mr-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          {/* Scrollable Body */}
          <div className="max-h-[72vh] overflow-y-auto px-5 py-4 space-y-4">
            
            {/* Parrow Skills Dual-Mode Segmented Switcher */}
            {supportedBookingModes === 'both' && (
              <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200/80">
                <button
                  type="button"
                  onClick={() => setBookingMode('instant')}
                  className={`py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    bookingMode === 'instant'
                      ? 'bg-[#FF6B00] text-white shadow-md shadow-orange-500/20'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  <Zap size={14} className={bookingMode === 'instant' ? 'fill-white' : 'text-[#FF6B00]'} />
                  <span>Instant Match (15–30m)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBookingMode('scheduled')}
                  className={`py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    bookingMode === 'scheduled'
                      ? 'bg-teal-700 text-white shadow-md shadow-teal-700/20'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  <Calendar size={14} />
                  <span>Schedule for Later</span>
                </button>
              </div>
            )}

            {/* Auto-Location & Contact Info Section */}
            <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
                    <MapPin size={12} className="text-[#FF6B00]" />
                    <span>Service Location</span>
                  </span>
                  <span className="text-[9.5px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    Auto-Fetched
                  </span>
                </div>
                <p className="text-xs font-bold text-slate-900 truncate">
                  {location || 'Detecting address...'}
                </p>
              </div>

              <div>
                <input
                  type="text"
                  value={addressDetails}
                  onChange={e => setAddressDetails(e.target.value)}
                  placeholder="Flat / House No, Apartment, Landmark details (Optional)"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#FF6B00] transition-all"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 border-t border-slate-200/60">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1">
                    <Phone size={11} className="text-slate-400" />
                    <span>Contact Phone</span>
                  </label>
                  <input
                    type="tel"
                    value={contactPhone}
                    onChange={e => setContactPhone(e.target.value)}
                    placeholder="+91 Mobile number"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#FF6B00]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1">
                    <MessageSquare size={11} className="text-emerald-500" />
                    <span>WhatsApp Number</span>
                  </label>
                  <input
                    type="tel"
                    value={whatsappPhone}
                    onChange={e => setWhatsappPhone(e.target.value)}
                    placeholder="+91 WhatsApp updates"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#FF6B00]"
                  />
                </div>
              </div>
            </div>

            {/* MODE 1: INSTANT DISPATCH BADGE */}
            {bookingMode === 'instant' && (
              <div className="p-3.5 bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50 border border-orange-200 rounded-2xl space-y-2">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#FF6B00] text-white flex items-center justify-center font-black text-lg shrink-0 shadow-sm shadow-orange-500/30">
                    ⚡
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-black text-slate-900">Instant Match Active</h4>
                      <span className="px-2 py-0.5 bg-[#FF6B00] text-white font-black text-[9px] uppercase tracking-wider rounded-md">
                        15–30 Min ETA
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                      Your request is broadcasted immediately to verified technicians with turn-by-turn live GPS tracking.
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-orange-200/60 flex items-center justify-between text-[11px] text-orange-950 font-bold">
                  <span>Guaranteed Technician Response</span>
                  <span className="text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md">Direct Field Dispatch</span>
                </div>
              </div>
            )}

            {/* MODE 2: SCHEDULED BOOKING EXPERIENCE (Date & Dynamic Customer Time) */}
            {bookingMode === 'scheduled' && (
              <div className="space-y-4">
                {/* 1. Date Selector Pills */}
                <div className="space-y-2">
                  <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar size={14} className="text-teal-600" />
                    <span>1. Select Preferred Date</span>
                  </span>

                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {dateOptions.map((opt, idx) => {
                      const isSelected = selectedDateIdx === idx;
                      return (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => setSelectedDateIdx(idx)}
                          className={`py-2 px-1.5 rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-teal-700 text-white font-black shadow-md shadow-teal-700/25 ring-2 ring-teal-400 scale-[1.02]'
                              : 'bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700'
                          }`}
                        >
                          <span className="text-[11px] font-extrabold leading-tight">{opt.label}</span>
                          <span className={`text-[10px] mt-0.5 ${isSelected ? 'text-teal-100 font-bold' : 'text-slate-500 font-medium'}`}>
                            {opt.subLabel}
                          </span>
                          {opt.isFriday && isFridayBreakConfigured && (
                            <span className={`text-[8.5px] font-extrabold mt-0.5 px-1 rounded ${isSelected ? 'bg-white/20 text-white' : 'text-emerald-700 bg-emerald-50'}`}>
                              🕌 Fri
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Dynamic Time Picker */}
                <div className="space-y-2.5 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Clock size={14} className="text-teal-600" />
                      <span>2. Select Arrival Time</span>
                    </span>
                    <span className="text-[11px] font-black text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-md border border-teal-200">
                      {formattedSelectedTime}
                    </span>
                  </div>

                  {/* Dynamic Time Wheel Controls */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-center gap-3">
                    {/* Hour Select */}
                    <div className="flex flex-col items-center">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Hour</span>
                      <select
                        value={selectedHour}
                        onChange={e => setSelectedHour(e.target.value)}
                        className="px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-base font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 cursor-pointer shadow-2xs"
                      >
                        {['01','02','03','04','05','06','07','08','09','10','11','12'].map(h => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>

                    <span className="text-xl font-black text-slate-400 pt-3">:</span>

                    {/* Minute Select */}
                    <div className="flex flex-col items-center">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Minute</span>
                      <select
                        value={selectedMinute}
                        onChange={e => setSelectedMinute(e.target.value)}
                        className="px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-base font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 cursor-pointer shadow-2xs"
                      >
                        {['00','15','30','45'].map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </div>

                    {/* AM / PM Segmented Control */}
                    <div className="flex flex-col items-center">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Period</span>
                      <div className="flex items-center bg-white border border-slate-300 rounded-xl p-0.5 shadow-2xs">
                        <button
                          type="button"
                          onClick={() => setSelectedPeriod('AM')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                            selectedPeriod === 'AM'
                              ? 'bg-teal-700 text-white shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          AM
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedPeriod('PM')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                            selectedPeriod === 'PM'
                              ? 'bg-teal-700 text-white shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          PM
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Fast One-Tap Presets */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                      Quick Popular Times
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {QUICK_TIME_PRESETS.map((preset) => {
                        const isPresetActive = formattedSelectedTime === preset;
                        return (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => handleSelectPreset(preset)}
                            className={`px-2.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer border ${
                              isPresetActive
                                ? 'bg-teal-700 text-white border-teal-700 shadow-xs'
                                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            {preset}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* 3. Conflict Detection Banners with 1-Tap Auto-Fixes */}
                {fridayConflict.hasConflict && (
                  <div className="p-3 bg-amber-50 border border-amber-300 rounded-2xl flex items-start gap-2.5 animate-in fade-in">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="flex-1 text-xs">
                      <p className="font-extrabold text-amber-900">🕌 Friday Prayer Break Window</p>
                      <p className="text-amber-800 text-[11px] mt-0.5 leading-snug">
                        Doorstep technician services are paused between {fridayConflict.formattedStart} and {fridayConflict.formattedEnd} for Friday prayers. Please pick an arrival time before or after this window.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedHour('02');
                          setSelectedMinute('15');
                          setSelectedPeriod('PM');
                        }}
                        className="mt-2 px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-black text-[10px] rounded-lg transition-all cursor-pointer shadow-xs inline-flex items-center gap-1"
                      >
                        <span>⚡ Shift to 02:15 PM</span>
                      </button>
                    </div>
                  </div>
                )}

                {midnightConflict.hasConflict && (
                  <div className="p-3 bg-indigo-50 border border-indigo-300 rounded-2xl flex items-start gap-2.5 animate-in fade-in">
                    <AlertCircle className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                    <div className="flex-1 text-xs">
                      <p className="font-extrabold text-indigo-900">🔒 Overnight Operations Closed</p>
                      <p className="text-indigo-800 text-[11px] mt-0.5 leading-snug">
                        Field technicians do not operate overnight between {midnightConflict.formattedStart} and {midnightConflict.formattedEnd}. Please select daytime hours (e.g. 08:00 AM to 08:00 PM).
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedHour('08');
                          setSelectedMinute('00');
                          setSelectedPeriod('AM');
                        }}
                        className="mt-2 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] rounded-lg transition-all cursor-pointer shadow-xs inline-flex items-center gap-1"
                      >
                        <span>⚡ Shift to 08:00 AM</span>
                      </button>
                    </div>
                  </div>
                )}

                {pastConflict.hasConflict && (
                  <div className="p-3 bg-rose-50 border border-rose-300 rounded-2xl flex items-start gap-2.5 animate-in fade-in">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div className="flex-1 text-xs">
                      <p className="font-extrabold text-rose-900">Selected Time Unavailable</p>
                      <p className="text-rose-800 text-[11px] mt-0.5 leading-snug">
                        {pastConflict.reason}
                      </p>
                      <button
                        type="button"
                        onClick={() => setBookingMode('instant')}
                        className="mt-2 px-3 py-1 bg-[#FF6B00] hover:bg-orange-600 text-white font-black text-[10px] rounded-lg transition-all cursor-pointer shadow-xs inline-flex items-center gap-1"
                      >
                        <Zap size={11} className="fill-white" />
                        <span>Switch to Instant Match (15–30m)</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Appointment Summary Card */}
                {!hasScheduleConflict && (
                  <div className="bg-gradient-to-r from-teal-50 via-emerald-50 to-teal-50 p-3.5 rounded-2xl border border-teal-200 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-teal-700 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Sparkles size={18} />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] font-black uppercase tracking-wider text-teal-700 block">
                        Scheduled Roster Appointment
                      </span>
                      <p className="text-xs font-extrabold text-slate-900 truncate">
                        {currentDateOption.label} ({currentDateOption.subLabel}) at {formattedSelectedTime}
                      </p>
                      <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                        <ShieldCheck size={12} className="text-emerald-600 shrink-0" />
                        <span>Technicians will review your preferred arrival time</span>
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Special Instructions / Notes */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                Special Instructions / Problem Note (Optional)
              </label>
              <textarea
                rows={2}
                value={specialNotes}
                onChange={e => setSpecialNotes(e.target.value)}
                placeholder="e.g. AC leaking water from front vent, main MCB tripping, urgent tap leakage..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-[#FF6B00] transition-all"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-5 py-3.5 bg-white border-t border-slate-100 flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="py-3 px-4 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={bookingMode === 'scheduled' && hasScheduleConflict}
              onClick={handleConfirm}
              className={`flex-1 py-3 px-6 rounded-2xl text-white text-xs font-black uppercase tracking-wider shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer ${
                bookingMode === 'instant'
                  ? 'bg-[#FF6B00] hover:bg-orange-600 shadow-orange-500/25'
                  : hasScheduleConflict
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                  : 'bg-teal-700 hover:bg-teal-800 shadow-teal-700/25'
              }`}
            >
              {bookingMode === 'instant' ? (
                <>
                  <Zap size={14} className="fill-white" />
                  <span>Confirm Instant Dispatch (₹{price})</span>
                </>
              ) : (
                <>
                  <Calendar size={14} />
                  <span>
                    {hasScheduleConflict ? 'Select Valid Daytime Hour' : `Confirm Scheduled Booking (₹${price})`}
                  </span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
