import React, { useState, useMemo, useEffect } from 'react';
import {
  X, Calendar, Clock, CheckCircle2, Sparkles, ShieldCheck,
  Zap, MapPin, Phone, MessageSquare
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

interface SlotOption {
  id: string;
  timeRange: string;
  period: 'morning' | 'afternoon' | 'evening';
  startHour: number;
}

function parseSlotString(rawSlot: string, index: number): SlotOption {
  const trimmed = rawSlot.trim();
  let startHour = 8;
  const match = trimmed.match(/^(\d{1,2}):?(\d{2})?\s*(AM|PM)?/i);
  if (match) {
    let h = parseInt(match[1], 10);
    const meridiem = (match[3] || '').toUpperCase();
    if (meridiem === 'PM' && h < 12) h += 12;
    if (meridiem === 'AM' && h === 12) h = 0;
    if (!meridiem) {
      if (trimmed.toUpperCase().includes('PM')) {
        if (h === 12) {
          // 12 PM
        } else if (h < 12 && (h === 1 || h === 2 || h === 3 || h === 4 || h === 5 || h === 6 || h >= 12)) {
          h += 12;
        }
      }
    }
    startHour = h;
  }

  let period: 'morning' | 'afternoon' | 'evening' = 'morning';
  if (startHour >= 12 && startHour < 17) {
    period = 'afternoon';
  } else if (startHour >= 17) {
    period = 'evening';
  }

  return {
    id: `slot-${index}-${startHour}`,
    timeRange: trimmed,
    period,
    startHour,
  };
}

export const TimeSlotWheelPickerModal: React.FC<TimeSlotWheelPickerModalProps> = ({
  isOpen,
  onClose,
  serviceTitle,
  price,
  availableSlots,
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

  // Sync customer phone when available
  useEffect(() => {
    if (profile?.phone) {
      if (!contactPhone) setContactPhone(profile.phone);
      if (!whatsappPhone) setWhatsappPhone(profile.phone);
    }
  }, [profile?.phone]);

  // Fetch real-time platform operating status (respecting Super Admin Friday break toggle)
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

  const standardSlots: SlotOption[] = [
    { id: 'm1', timeRange: '08:00 AM - 10:00 AM', period: 'morning', startHour: 8 },
    { id: 'm2', timeRange: '10:00 AM - 12:00 PM', period: 'morning', startHour: 10 },
    { id: 'a1', timeRange: '12:00 PM - 02:00 PM', period: 'afternoon', startHour: 12 },
    { id: 'a2', timeRange: '02:00 PM - 04:00 PM', period: 'afternoon', startHour: 14 },
    { id: 'a3', timeRange: '04:00 PM - 06:00 PM', period: 'afternoon', startHour: 16 },
    { id: 'e1', timeRange: '06:00 PM - 08:00 PM', period: 'evening', startHour: 18 },
  ];

  // Dynamic slots configured by Super Admin on the service, or standard 2-hr fallback
  const activeSlots: SlotOption[] = useMemo(() => {
    if (availableSlots && availableSlots.length > 0) {
      return availableSlots.map((raw, idx) => parseSlotString(raw, idx));
    }
    return standardSlots;
  }, [availableSlots]);

  const [selectedSlot, setSelectedSlot] = useState<string>('');

  useEffect(() => {
    if (activeSlots.length > 0) {
      setSelectedSlot(activeSlots[0].timeRange);
    }
  }, [activeSlots]);

  const currentDateOption = dateOptions[selectedDateIdx] || dateOptions[0];

  // Dynamic Friday Prayer Break check: strictly respect Admin toggle & vertical scope
  const isFridayBreakConfigured = Boolean(
    operatingStatus?.fridayBreak?.isEnabled &&
    (!operatingStatus?.fridayBreak?.verticals || operatingStatus.fridayBreak.verticals === 'both' || operatingStatus.fridayBreak.verticals === 'services')
  );
  const fStartHour = parseInt(operatingStatus?.fridayBreak?.start?.split(':')[0] || '12', 10);
  const fEndHour = parseInt(operatingStatus?.fridayBreak?.end?.split(':')[0] || '14', 10);

  // Check if slot is unavailable dynamically
  const isSlotDisabled = (slot: SlotOption) => {
    // 1. Dynamic Friday Prayer Break check: ONLY disable if enabled in Admin settings
    if (currentDateOption.isFriday && isFridayBreakConfigured) {
      if (slot.startHour >= fStartHour && slot.startHour < fEndHour) {
        return {
          disabled: true,
          reason: operatingStatus?.fridayBreak?.title || 'Friday Prayer Break 🕌',
        };
      }
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

  const morningSlots = activeSlots.filter(s => s.period === 'morning');
  const afternoonSlots = activeSlots.filter(s => s.period === 'afternoon');
  const eveningSlots = activeSlots.filter(s => s.period === 'evening');

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
      const formattedDate = `${currentDateOption.label} (${currentDateOption.subLabel})`;
      onConfirm({
        mode: 'scheduled',
        date: formattedDate,
        time: selectedSlot || activeSlots[0]?.timeRange || '10:00 AM - 12:00 PM',
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
              <p className="text-xs text-slate-500 mt-0.5 font-medium">Choose instant dispatch or schedule a convenient slot</p>
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
                  <Calendar size={14} className={bookingMode === 'scheduled' ? 'text-teal-200' : 'text-teal-600'} />
                  <span>Schedule for Later</span>
                </button>
              </div>
            )}

            {/* ShopIndia Automatic Location Fetch (Zero Map Canvas Clutter) */}
            <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2">
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-orange-100 text-[#FF6B00] flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Service Address (Auto-Detected)
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" /> GPS Verified
                    </span>
                  </div>
                  <p className="text-xs font-bold text-slate-800 line-clamp-2 mt-0.5 leading-snug">
                    {location || 'Current Detected Service Location'}
                  </p>
                </div>
              </div>

              {/* Manual Flat / Landmark Details */}
              <div>
                <input
                  type="text"
                  value={addressDetails}
                  onChange={e => setAddressDetails(e.target.value)}
                  placeholder="Flat / House No, Building, Apartment, Detailed Landmark *"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00] transition-all"
                />
              </div>
            </div>

            {/* Contact Details (Phone & WhatsApp) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1">
                  <Phone size={11} className="text-slate-400" />
                  <span>Contact Phone Number</span>
                </label>
                <input
                  type="tel"
                  value={contactPhone}
                  onChange={e => setContactPhone(e.target.value)}
                  placeholder="Active mobile number"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-[#FF6B00] transition-all"
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
                  placeholder="WhatsApp contact"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-emerald-500 transition-all"
                />
              </div>
            </div>

            {/* MODE 1: INSTANT MATCH EXPERIENCE (15–30 Min Arrival) */}
            {bookingMode === 'instant' && (
              <div className="bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50 p-4 rounded-2xl border border-orange-200 space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#FF6B00] text-white flex items-center justify-center text-lg font-black shadow-md shadow-orange-500/25 shrink-0">
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
                      Your request is broadcasted immediately to nearby verified technicians with turn-by-turn live GPS tracking.
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-orange-200/60 flex items-center justify-between text-[11px] text-orange-950 font-bold">
                  <span>Guaranteed Technician Response</span>
                  <span className="text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md">Direct Field Dispatch</span>
                </div>
              </div>
            )}

            {/* MODE 2: SCHEDULED BOOKING EXPERIENCE (Date & 2-Hour Dynamic Slots) */}
            {bookingMode === 'scheduled' && (
              <div className="space-y-4">
                {/* 1. Date Selector Pills */}
                <div className="space-y-2">
                  <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar size={14} className="text-teal-600" />
                    <span>Select Date</span>
                  </span>

                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {dateOptions.map((opt, idx) => {
                      const isSelected = selectedDateIdx === idx;
                      return (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => {
                            setSelectedDateIdx(idx);
                            if (opt.isFriday && isFridayBreakConfigured && selectedSlot.includes('12:00 PM')) {
                              setSelectedSlot('02:00 PM - 04:00 PM');
                            }
                          }}
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

                {/* 2. Slot Selector Chips */}
                <div className="space-y-3 pt-1">
                  <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock size={14} className="text-teal-600" />
                    <span>Select 2-Hour Arrival Window</span>
                  </span>

                  {/* Morning Slots */}
                  {morningSlots.length > 0 && (
                    <div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5">
                        Morning
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {morningSlots.map((slot) => {
                          const check = isSlotDisabled(slot);
                          const isSelected = selectedSlot === slot.timeRange;
                          return (
                            <button
                              key={slot.id}
                              type="button"
                              disabled={check.disabled}
                              onClick={() => setSelectedSlot(slot.timeRange)}
                              className={`py-2.5 px-3 rounded-xl text-left border flex items-center justify-between transition-all cursor-pointer ${
                                check.disabled
                                  ? 'opacity-40 bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                                  : isSelected
                                  ? 'bg-teal-50 border-2 border-teal-700 text-teal-950 font-bold shadow-xs'
                                  : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                              }`}
                            >
                              <span className="text-xs font-bold">{slot.timeRange}</span>
                              {check.disabled ? (
                                <span className="text-[10px] text-rose-600 font-extrabold">{check.reason}</span>
                              ) : isSelected ? (
                                <CheckCircle2 size={15} className="text-teal-700" />
                              ) : null}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Afternoon Slots */}
                  {afternoonSlots.length > 0 && (
                    <div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5">
                        Afternoon
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {afternoonSlots.map((slot) => {
                          const check = isSlotDisabled(slot);
                          const isSelected = selectedSlot === slot.timeRange;
                          return (
                            <button
                              key={slot.id}
                              type="button"
                              disabled={check.disabled}
                              onClick={() => setSelectedSlot(slot.timeRange)}
                              className={`py-2.5 px-3 rounded-xl text-left border flex items-center justify-between transition-all cursor-pointer ${
                                check.disabled
                                  ? 'opacity-45 bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                                  : isSelected
                                  ? 'bg-teal-50 border-2 border-teal-700 text-teal-950 font-bold shadow-xs'
                                  : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                              }`}
                            >
                              <span className="text-xs font-bold">{slot.timeRange}</span>
                              {check.disabled ? (
                                <span className="text-[10px] text-amber-700 font-extrabold">{check.reason}</span>
                              ) : isSelected ? (
                                <CheckCircle2 size={15} className="text-teal-700" />
                              ) : null}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Evening Slots */}
                  {eveningSlots.length > 0 && (
                    <div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5">
                        Evening
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {eveningSlots.map((slot) => {
                          const check = isSlotDisabled(slot);
                          const isSelected = selectedSlot === slot.timeRange;
                          return (
                            <button
                              key={slot.id}
                              type="button"
                              disabled={check.disabled}
                              onClick={() => setSelectedSlot(slot.timeRange)}
                              className={`py-2.5 px-3 rounded-xl text-left border flex items-center justify-between transition-all cursor-pointer ${
                                check.disabled
                                  ? 'opacity-40 bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                                  : isSelected
                                  ? 'bg-teal-50 border-2 border-teal-700 text-teal-950 font-bold shadow-xs'
                                  : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                              }`}
                            >
                              <span className="text-xs font-bold">{slot.timeRange}</span>
                              {check.disabled ? (
                                <span className="text-[10px] text-rose-600 font-extrabold">{check.reason}</span>
                              ) : isSelected ? (
                                <CheckCircle2 size={15} className="text-teal-700" />
                              ) : null}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Appointment Summary Card */}
                <div className="bg-gradient-to-r from-teal-50 via-emerald-50 to-teal-50 p-3.5 rounded-2xl border border-teal-200 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-teal-700 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Sparkles size={18} />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-black uppercase tracking-wider text-teal-700 block">
                      Scheduled Roster Appointment
                    </span>
                    <p className="text-xs font-extrabold text-slate-900 truncate">
                      {currentDateOption.label} ({currentDateOption.subLabel}) at {selectedSlot}
                    </p>
                    <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                      <ShieldCheck size={12} className="text-emerald-600 shrink-0" />
                      <span>Technician assigned to your advance roster</span>
                    </span>
                  </div>
                </div>
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
              onClick={handleConfirm}
              className={`flex-1 py-3 px-6 rounded-2xl text-white text-xs font-black uppercase tracking-wider shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer ${
                bookingMode === 'instant'
                  ? 'bg-[#FF6B00] hover:bg-orange-600 shadow-orange-500/25'
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
                  <span>Confirm Scheduled Booking (₹{price})</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
