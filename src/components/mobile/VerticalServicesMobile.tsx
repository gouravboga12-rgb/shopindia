import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { useProducts } from '../../hooks/useProducts';
import { useCategories } from '../../hooks/useCategories';
import {
  Star, Heart, Calendar, Home, Wrench,
  ShieldCheck, Clock, X
} from 'lucide-react';
import { motion } from 'framer-motion';
import { VehicleSelectorModal } from '../common/VehicleSelectorModal';
import type { Product } from '../../data/types';

type ServiceSubVertical = 'home' | 'vehicle';

const HOME_CATEGORIES = [
  'All',
  'AC Repair & Service',
  'Deep House Cleaning',
  'Electrician & Plumber',
  'Appliance Maintenance',
  'Salon & Grooming at Home',
];

const VEHICLE_CATEGORIES = [
  'All',
  'Periodic Car/Bike Service',
  'Doorstep Foam Wash & Spa',
  'Emergency Roadside Towing (24x7)',
  'Battery Jumpstart & Check',
  'Brakes, Tyres & Wheel Balancing',
];

export const VerticalServicesMobile: React.FC = () => {
  const { addToCart, navigateTo } = useApp();
  const { products } = useProducts();
  const { categories: apiCategories } = useCategories();

  const [activeSubVertical, setActiveSubVertical] = useState<ServiceSubVertical>('home');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [bookingService, setBookingService] = useState<Product | null>(null);
  const [selectedDate, setSelectedDate] = useState('Tomorrow');
  const [selectedTime, setSelectedTime] = useState('10:00 AM');
  const [wishlist, setWishlist] = useState<Record<string, boolean>>({});

  // Selected Vehicle state
  const [selectedVehicle, setSelectedVehicle] = useState<{
    type: 'car' | 'bike';
    brand: string;
    model: string;
    fuel?: string;
  } | null>({
    type: 'car',
    brand: 'Hyundai',
    model: 'Creta',
    fuel: 'Petrol',
  });
  const [vehicleModalOpen, setVehicleModalOpen] = useState(false);

  // Dynamically generate the next 4 calendar days (Today, Tomorrow, and upcoming weekday names)
  const dates = useMemo(() => {
    const result: string[] = [];
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const now = new Date();
    for (let i = 0; i < 4; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() + i);
      if (i === 0) result.push('Today');
      else if (i === 1) result.push('Tomorrow');
      else result.push(dayNames[d.getDay()]);
    }
    return result;
  }, []);

  // Dynamically resolve time slots configured by admin/vendor for the selected service
  const times = useMemo(() => {
    if (bookingService?.serviceSlots && bookingService.serviceSlots.length > 0) {
      return bookingService.serviceSlots;
    }
    return ['08:00 AM', '10:00 AM', '01:00 PM', '04:00 PM', '06:00 PM'];
  }, [bookingService]);

  const services = products.filter((p) => {
    if (p.vertical !== 'services') return false;
    const isVehicle = p.subVertical === 'vehicle_service' || p.serviceType === 'vehicle' ||
      p.category?.toLowerCase().includes('vehicle') || p.category?.toLowerCase().includes('car') || p.category?.toLowerCase().includes('bike') ||
      p.title?.toLowerCase().includes('car') || p.title?.toLowerCase().includes('bike') || p.title?.toLowerCase().includes('towing') || p.title?.toLowerCase().includes('mechanic');

    return activeSubVertical === 'vehicle' ? isVehicle : !isVehicle;
  });

  // Dynamically derive live category aisles from Admin API + Products
  const activeCategories = useMemo(() => {
    const fromApi = apiCategories
      .filter((c) => {
        if (c.isActive === false) return false;
        const v = (c.vertical || '').toLowerCase();
        if (activeSubVertical === 'home') return v === 'services_home' || v === 'services';
        if (activeSubVertical === 'vehicle') return v === 'services_vehicle';
        return v === 'services';
      })
      .map((c) => c.name);

    const fromProds = services.map((p) => p.category).filter(Boolean);
    const fallback = activeSubVertical === 'home' ? HOME_CATEGORIES : VEHICLE_CATEGORIES;

    const merged = Array.from(new Set([...fromApi, ...fromProds, ...fallback.slice(1)]));
    return ['All', ...merged];
  }, [apiCategories, activeSubVertical, services]);

  const currentServices = !selectedCategory || selectedCategory === 'All'
    ? services
    : services.filter((p) => p.category === selectedCategory || (p.tags && p.tags.includes(selectedCategory)));

  const handleBookClick = (service: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    setBookingService(service);
    setSelectedDate('Tomorrow');
    const slots = service.serviceSlots && service.serviceSlots.length > 0
      ? service.serviceSlots
      : ['08:00 AM', '10:00 AM', '01:00 PM', '04:00 PM', '06:00 PM'];
    setSelectedTime(slots[0] || '10:00 AM');
  };

  const toggleWishlist = (productId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setWishlist((prev) => ({ ...prev, [productId]: !prev[productId] }));
  };

  const confirmBooking = () => {
    if (!bookingService) return;
    const bookingDetails: Product = {
      ...bookingService,
      deliveryTime: `${selectedDate} at ${selectedTime}`,
      specs: {
        ...bookingService.specs,
        'Scheduled Slot': `${selectedDate}, ${selectedTime}`,
        'Service Vertical': activeSubVertical === 'home' ? 'Home Services ( Company Style)' : `Vehicle Services (${selectedVehicle?.brand} ${selectedVehicle?.model})`,
        'Technician': 'Certified Professional Assigned',
        'Warranty': '30-Day Guarantee',
      },
    };
    addToCart(bookingDetails);
    setBookingService(null);
    navigateTo('cart');
  };

  return (
    <div className="w-full flex flex-col gap-3 py-3 px-3 bg-[#FAF9F6] min-h-screen text-slate-800 font-sans pb-32">
      {/* 1. Mobile Sub-Vertical Switcher */}
      <div className="flex items-center gap-1.5 p-1 bg-white rounded-2xl border border-slate-200 shadow-sm">
        <button
          onClick={() => {
            setActiveSubVertical('home');
            setSelectedCategory('');
          }}
          className={`flex-1 py-2 px-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all ${activeSubVertical === 'home'
              ? 'bg-amber-600 text-white shadow-md'
              : 'text-slate-600 bg-slate-50'
            }`}
        >
          <Home className="w-3.5 h-3.5" />
          <span>Home Services</span>
        </button>

        <button
          onClick={() => {
            setActiveSubVertical('vehicle');
            setSelectedCategory('');
          }}
          className={`flex-1 py-2 px-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all ${activeSubVertical === 'vehicle'
              ? 'bg-blue-700 text-white shadow-md'
              : 'text-slate-600 bg-slate-50'
            }`}
        >
          <Wrench className="w-3.5 h-3.5" />
          <span>Vehicle Care</span>
        </button>
      </div>

      {/* 2. Top Info / Vehicle Selector Strip */}
      {activeSubVertical === 'vehicle' ? (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-between">
          <div className="text-xs">
            <span className="text-slate-500 font-bold block text-[10px] uppercase">Selected Vehicle</span>
            <span className="font-extrabold text-blue-950">
              {selectedVehicle ? `${selectedVehicle.brand} ${selectedVehicle.model}` : 'Pick Vehicle'}
            </span>
          </div>
          <button
            onClick={() => setVehicleModalOpen(true)}
            className="px-3 py-1 bg-blue-600 text-white text-[11px] font-bold rounded-xl shadow-sm"
          >
            Change
          </button>
        </div>
      ) : (
        <div className="py-2 px-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between text-xs font-bold text-amber-900">
          <span className="flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-amber-600" />
            30-Day Service Guarantee
          </span>
          <span className="bg-amber-600 text-white text-[10px] px-2 py-0.5 rounded-full font-black">
            PRO
          </span>
        </div>
      )}

      {/* 3. Horizontal Categories */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar -mx-1 px-1">
        {activeCategories.map((cat) => {
          const isSelected = selectedCategory === cat || (!selectedCategory && cat === 'All');
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat === 'All' ? '' : cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${isSelected
                  ? activeSubVertical === 'home'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-blue-700 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200'
                }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* 4. Services List Cards */}
      <div className="space-y-3">
        {currentServices.map((service) => {
          const discount = service.originalPrice > service.price
            ? Math.round(((service.originalPrice - service.price) / service.originalPrice) * 100)
            : 0;

          return (
            <div
              key={service.id}
              onClick={() => navigateTo('detail', service.id)}
              className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-2.5 relative"
            >
              {discount > 0 && (
                <span className="absolute top-2 left-2 bg-emerald-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-sm z-10">
                  {discount}% OFF
                </span>
              )}

              <button
                onClick={(e) => toggleWishlist(service.id, e)}
                className="absolute top-3 right-3 p-1.5 rounded-full bg-white/90 text-slate-400 hover:text-red-500 shadow-sm z-10"
              >
                <Heart size={13} className={wishlist[service.id] ? 'fill-red-500 text-red-500' : ''} />
              </button>

              <div className="flex gap-3">
                {/* Image */}
                <div className="w-24 h-24 rounded-xl bg-slate-100 overflow-hidden shrink-0 relative">
                  <img
                    src={service.image || 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=300&auto=format&fit=crop&q=60'}
                    alt={service.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-1 left-1 bg-black/60 text-white text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                    <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                    <span>{service.rating || 4.8}</span>
                  </div>
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 leading-snug line-clamp-2 mb-1">
                      {service.title}
                    </h4>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-semibold mb-1">
                      <Clock size={11} className="text-amber-600" />
                      <span>{service.durationEstimate || '45-90 min'}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-1">
                    <div>
                      <span className="text-sm font-black text-slate-900">₹{service.price}</span>
                      {service.originalPrice > service.price && (
                        <span className="text-[10px] text-slate-400 line-through block">₹{service.originalPrice}</span>
                      )}
                    </div>

                    <button
                      onClick={(e) => handleBookClick(service, e)}
                      className={`px-3 py-1.5 text-xs font-black rounded-xl text-white shadow-sm flex items-center gap-1 ${activeSubVertical === 'home'
                          ? 'bg-amber-600 hover:bg-amber-700'
                          : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                    >
                      <Calendar size={11} />
                      <span>Book Slot</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Slot Booking Dialog (Bottom Sheet Style) */}
      {bookingService && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs">
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="w-full bg-white rounded-t-3xl p-5 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900">Select Date & Time Slot</h3>
                <p className="text-xs text-slate-500 truncate max-w-[240px]">{bookingService.title}</p>
              </div>
              <button
                onClick={() => setBookingService(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">Date</label>
              <div className="grid grid-cols-4 gap-1.5">
                {dates.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setSelectedDate(d)}
                    className={`py-2 px-1 rounded-xl text-xs font-bold border ${selectedDate === d
                        ? 'bg-amber-600 text-white border-amber-600'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">Time Slot</label>
              <div className="grid grid-cols-3 gap-1.5">
                {times.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setSelectedTime(t)}
                    className={`py-2 px-1 rounded-xl text-xs font-bold border ${selectedTime === t
                        ? 'bg-amber-600 text-white border-amber-600'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl flex items-center justify-between text-xs font-bold">
              <span className="text-slate-600">Total Payable:</span>
              <span className="text-base font-black text-slate-900">₹{bookingService.price}</span>
            </div>

            <button
              onClick={confirmBooking}
              className="w-full py-3.5 bg-amber-600 text-white rounded-2xl text-xs font-black shadow-md shadow-amber-600/25"
            >
              Confirm Slot & Add to Cart
            </button>
          </motion.div>
        </div>
      )}

      {/* Vehicle Selector Modal */}
      <VehicleSelectorModal
        isOpen={vehicleModalOpen}
        onClose={() => setVehicleModalOpen(false)}
        selectedVehicle={selectedVehicle}
        onSelectVehicle={(v) => setSelectedVehicle(v)}
      />
    </div>
  );
};
