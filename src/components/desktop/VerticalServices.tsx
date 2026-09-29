import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { useCustomer } from '../../context/CustomerContext';
import { useProducts } from '../../hooks/useProducts';
import { useCategories } from '../../hooks/useCategories';
import {
  Star, Clock, Calendar, ShieldCheck,
  Heart, LayoutGrid,
  Home, Wrench, Shield, PhoneCall
} from 'lucide-react';
import { motion } from 'framer-motion';
import { VehicleSelectorModal } from '../common/VehicleSelectorModal';
import { TimeSlotWheelPickerModal } from '../common/TimeSlotWheelPickerModal';
import type { Product } from '../../data/types';

type ServiceSubVertical = 'home' | 'vehicle';

const HOME_CATEGORIES = [
  'All Home Services',
  'AC Repair & Service',
  'Deep House Cleaning',
  'Electrician & Plumber',
  'Appliance Maintenance',
  'Salon & Grooming at Home',
  'Carpentry & Painting',
];

const VEHICLE_CATEGORIES = [
  'All Vehicle Services',
  'Periodic Car/Bike Service',
  'Doorstep Foam Wash & Spa',
  'Emergency Roadside Towing (24x7)',
  'Battery Jumpstart & Check',
  'Brakes, Tyres & Wheel Balancing',
  'Engine & AC Diagnostics',
];

export const VerticalServices: React.FC = () => {
  const { addToCart, navigateTo } = useApp();
  const { products } = useProducts();
  const { categories: apiCategories } = useCategories();

  const [activeSubVertical, setActiveSubVertical] = useState<ServiceSubVertical>('home');
  const [selectedCategory, setSelectedCategory] = useState('');

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

  // Booking Slot Modal
  const [selectedServiceForBooking, setSelectedServiceForBooking] = useState<Product | null>(null);
  const [selectedDate, setSelectedDate] = useState('Tomorrow');
  const [selectedTime, setSelectedTime] = useState('10:00 AM');
  const { wishlist, toggleWishlist: customerToggleWishlist } = useCustomer();

  // Filter service items
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
    const defaultLabel = activeSubVertical === 'home' ? 'All Home Services' : 'All Vehicle Services';

    const merged = Array.from(new Set([...fromApi, ...fromProds, ...fallback.slice(1)]));
    return [defaultLabel, ...merged];
  }, [apiCategories, activeSubVertical, services]);

  const filteredServices = selectedCategory === '' || selectedCategory.startsWith('All')
    ? services
    : services.filter((p) => p.category === selectedCategory || (p.tags && p.tags.includes(selectedCategory)));

  const handleBookNow = (service: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedServiceForBooking(service);
    setSelectedDate('Tomorrow');
    const slots = service.serviceSlots && service.serviceSlots.length > 0
      ? service.serviceSlots
      : ['08:00 AM', '10:00 AM', '01:00 PM', '04:00 PM', '06:00 PM'];
    setSelectedTime(slots[0] || '10:00 AM');
  };

  const confirmBooking = (slotData?: { date: string; time: string }) => {
    if (!selectedServiceForBooking) return;
    const date = slotData?.date || selectedDate;
    const time = slotData?.time || selectedTime;
    const bookingDetails: Product = {
      ...selectedServiceForBooking,
      deliveryTime: `${date} at ${time}`,
      specs: {
        ...selectedServiceForBooking.specs,
        'Scheduled Slot': `${date}, ${time}`,
        'Service Vertical': activeSubVertical === 'home' ? 'Home Services' : `Vehicle Services (${selectedVehicle?.brand} ${selectedVehicle?.model})`,
        'Technician': 'Certified Professional Assigned',
      },
    };
    addToCart(bookingDetails);
    setSelectedServiceForBooking(null);
    navigateTo('cart');
  };

  const toggleWishlist = (productId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    customerToggleWishlist(productId);
  };

  return (
    <div className="w-full flex flex-col min-h-screen bg-[#FAF9F6] text-slate-800 py-6 px-8 select-none font-sans">
      <div className="max-w-[1440px] mx-auto w-full space-y-6">
        {/* 1. Sub-Vertical Segmented Switcher */}
        <div className="bg-white/90 backdrop-blur-md p-2 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full md:w-auto">
            <button
              onClick={() => {
                setActiveSubVertical('home');
                setSelectedCategory('');
              }}
              className={`flex items-center gap-2.5 px-6 py-3 rounded-2xl font-extrabold text-xs transition-all ${activeSubVertical === 'home'
                  ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/20 scale-[1.02]'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
            >
              <Home className="w-4 h-4" />
              <span>Home Services</span>
              <span className={`text-[10px] uppercase px-2 py-0.5 rounded-full font-black ${activeSubVertical === 'home' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                Style
              </span>
            </button>

            <button
              onClick={() => {
                setActiveSubVertical('vehicle');
                setSelectedCategory('');
              }}
              className={`flex items-center gap-2.5 px-6 py-3 rounded-2xl font-extrabold text-xs transition-all ${activeSubVertical === 'vehicle'
                  ? 'bg-blue-700 text-white shadow-lg shadow-blue-700/20 scale-[1.02]'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
            >
              <Wrench className="w-4 h-4" />
              <span>Vehicle Services</span>
              <span className={`text-[10px] uppercase px-2 py-0.5 rounded-full font-black ${activeSubVertical === 'vehicle' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                Technician Mkt
              </span>
            </button>
          </div>

          {/* Vehicle Selector Badge (if in Vehicle Mode) */}
          {activeSubVertical === 'vehicle' ? (
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 px-4 py-2 rounded-2xl">
              <div className="text-xs">
                <span className="text-slate-500 font-semibold block text-[10px] uppercase">Active Vehicle:</span>
                <span className="font-bold text-blue-900">
                  {selectedVehicle ? `${selectedVehicle.brand} ${selectedVehicle.model} (${selectedVehicle.fuel})` : 'No vehicle selected'}
                </span>
              </div>
              <button
                onClick={() => setVehicleModalOpen(true)}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm ml-2"
              >
                Change
              </button>
            </div>
          ) : (
            <div className="text-xs font-semibold text-slate-500 flex items-center gap-2 px-3">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>30-Day Post-Service Warranty & Pre-Vetted Pros</span>
            </div>
          )}
        </div>

        {/* 2. Hero Banner */}
        <div
          className={`w-full p-8 rounded-hero text-white shadow-premium relative overflow-hidden bg-gradient-to-r ${activeSubVertical === 'home'
              ? 'from-amber-700 via-amber-800 to-stone-900'
              : 'from-blue-800 via-indigo-900 to-slate-950'
            }`}
        >
          <div className="relative z-10 max-w-2xl space-y-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-white/15 backdrop-blur-md">
              <Shield className="w-3.5 h-3.5" />
              {activeSubVertical === 'home' ? ' Company Standardized Quality' : 'Doorstep & Garage Technician Network'}
            </span>
            <h1 className="text-3xl md:text-4xl font-black font-heading tracking-tight leading-tight">
              {activeSubVertical === 'home'
                ? 'Expert Home Cleaning, Repair & Grooming at Your Doorstep'
                : 'Top-Rated Mechanics, Car Spa & Emergency 24x7 Towing'}
            </h1>
            <p className="text-xs md:text-sm text-white/80 font-medium">
              {activeSubVertical === 'home'
                ? 'Transparent rate cards, verified technicians with safety gear, and complete 30-day rework warranty.'
                : 'Genuine OEM spare parts, live technician tracking, and upfront estimates with zero hidden charges.'}
            </p>
          </div>
        </div>

        {/* 3. Main Catalog Area */}
        <div className="flex flex-col md:flex-row gap-8 items-start">
          {/* Left Category Filter */}
          <aside className="w-full md:w-64 shrink-0 bg-white p-4 rounded-card border border-slate-200 shadow-soft sticky top-28 space-y-2">
            <div className="flex items-center gap-2 pb-3 mb-1 border-b border-slate-100 text-xs font-black uppercase tracking-wider text-slate-400">
              <LayoutGrid size={14} />
              <span>{activeSubVertical === 'home' ? 'Home Categories' : 'Vehicle Categories'}</span>
            </div>

            <div className="flex flex-row md:flex-col gap-1.5 overflow-x-auto md:overflow-visible pb-2 md:pb-0">
              {activeCategories.map((catName) => {
                const isSelected = selectedCategory === catName || (selectedCategory === '' && catName.startsWith('All'));
                return (
                  <button
                    key={catName}
                    onClick={() => setSelectedCategory(catName.startsWith('All') ? '' : catName)}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left whitespace-nowrap ${isSelected
                        ? activeSubVertical === 'home'
                          ? 'bg-amber-50 text-amber-900 border-l-4 border-amber-600'
                          : 'bg-blue-50 text-blue-900 border-l-4 border-blue-600'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                  >
                    <span>{catName}</span>
                  </button>
                );
              })}
            </div>

            {activeSubVertical === 'vehicle' && (
              <div className="pt-4 border-t border-slate-100">
                <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-900 space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <PhoneCall className="w-3.5 h-3.5 text-red-600 animate-bounce" /> 24x7 Roadside RSA
                  </p>
                  <p className="text-[11px] text-red-700">Call 1800-SHOP-INDIA for instant breakdown towing dispatch.</p>
                </div>
              </div>
            )}
          </aside>

          {/* Right Services List */}
          <main className="flex-1 w-full min-w-0">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-black text-lg text-slate-800 flex items-center gap-2">
                <span>{selectedCategory || activeCategories[0]}</span>
                <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                  {filteredServices.length} packages
                </span>
              </h3>
            </div>

            {filteredServices.length === 0 ? (
              <div className="w-full py-16 text-center bg-white rounded-3xl border border-slate-200 p-8 space-y-3">
                <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <Wrench className="w-8 h-8" />
                </div>
                <h4 className="font-bold text-slate-700">No specific packages listed in this category</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Select another category or click Book Custom Inspection to send a certified technician for diagnostics.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredServices.map((service) => {
                  const discount = service.originalPrice > service.price
                    ? Math.round(((service.originalPrice - service.price) / service.originalPrice) * 100)
                    : 0;

                  return (
                    <motion.div
                      key={service.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="group bg-white rounded-card p-4 border border-slate-200/80 hover:border-slate-300 shadow-soft hover:shadow-premium transition-all duration-300 flex flex-col justify-between relative cursor-pointer"
                      onClick={() => navigateTo('detail', service.id)}
                    >
                      {discount > 0 && (
                        <span className="absolute top-3 left-3 bg-emerald-600 text-white text-[10px] font-black px-2 py-0.5 rounded shadow-sm z-10">
                          {discount}% OFF
                        </span>
                      )}

                      <button
                        onClick={(e) => toggleWishlist(service.id, e)}
                        className="absolute top-3 right-3 p-1.5 rounded-full bg-white/80 backdrop-blur-md text-slate-400 hover:text-red-500 shadow-soft z-10"
                      >
                        <Heart size={14} className={wishlist.includes(service.id) ? 'fill-red-500 text-red-500' : ''} />
                      </button>

                      {/* Image */}
                      <div className="w-full h-40 bg-slate-100 rounded-2xl overflow-hidden mb-3 relative">
                        <img
                          src={service.image || (activeSubVertical === 'vehicle' ? 'https://images.unsplash.com/photo-1487754180451-c456f719a1fc?w=500&auto=format&fit=crop&q=60' : 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=500&auto=format&fit=crop&q=60')}
                          alt={service.title}
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = activeSubVertical === 'vehicle'
                              ? 'https://images.unsplash.com/photo-1487754180451-c456f719a1fc?w=500&auto=format&fit=crop&q=60'
                              : 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=500&auto=format&fit=crop&q=60';
                          }}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                          <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                          <span>{service.rating || 4.8} ({service.ratingCount || 120})</span>
                        </div>
                      </div>

                      {/* Title & Info */}
                      <div className="space-y-1.5 mb-3">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
                          <Clock size={12} className="text-amber-600" />
                          <span>{service.durationEstimate || '45-90 mins service'}</span>
                          <span>•</span>
                          <span className="text-emerald-700 font-extrabold">30-Day Guarantee</span>
                        </div>

                        <h4 className="text-sm font-bold text-slate-900 group-hover:text-amber-700 transition-colors leading-snug">
                          {service.title}
                        </h4>

                        <p className="text-xs text-slate-500 line-clamp-2">
                          {service.description || 'Pre-vetted technician with specialized equipment, upfront diagnosis, and post-service cleanup.'}
                        </p>
                      </div>

                      {/* Price & Book Button */}
                      <div className="flex items-center justify-between pt-3 border-t border-slate-100" onClick={(e) => e.stopPropagation()}>
                        <div>
                          <span className="text-base font-black text-slate-900">₹{service.price}</span>
                          {service.originalPrice > service.price && (
                            <span className="text-xs text-slate-400 line-through block">₹{service.originalPrice}</span>
                          )}
                        </div>

                        <button
                          onClick={(e) => handleBookNow(service, e)}
                          className={`px-5 py-2 text-xs font-black rounded-xl transition-all shadow-md flex items-center gap-1.5 text-white ${activeSubVertical === 'home'
                              ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/25'
                              : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/25'
                            }`}
                        >
                          <Calendar size={13} />
                          <span>Book Slot</span>
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* 4. Slot Booking Dialog (Wheel/Roller Picker matching reference) */}
      <TimeSlotWheelPickerModal
        isOpen={!!selectedServiceForBooking}
        onClose={() => setSelectedServiceForBooking(null)}
        serviceTitle={selectedServiceForBooking?.title || ''}
        price={selectedServiceForBooking?.price || 0}
        onConfirm={confirmBooking}
      />

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
