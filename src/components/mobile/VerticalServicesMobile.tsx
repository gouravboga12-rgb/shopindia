import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { useCustomer } from '../../context/CustomerContext';
import { useProducts } from '../../hooks/useProducts';
import { useCategories } from '../../hooks/useCategories';
import {
  Star, Heart, Calendar, Home, Wrench,
  Clock
} from 'lucide-react';
import { VehicleSelectorModal } from '../common/VehicleSelectorModal';
import { TimeSlotWheelPickerModal } from '../common/TimeSlotWheelPickerModal';
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
  const { wishlist, toggleWishlist: customerToggleWishlist } = useCustomer();

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


  const confirmBooking = (slotData?: { date: string; time: string }) => {
    if (!bookingService) return;
    const date = slotData?.date || selectedDate;
    const time = slotData?.time || selectedTime;
    const bookingDetails: Product = {
      ...bookingService,
      deliveryTime: `${date} at ${time}`,
      specs: {
        ...bookingService.specs,
        'Scheduled Slot': `${date}, ${time}`,
        'Service Vertical': activeSubVertical === 'home' ? 'Home Services' : `Vehicle Services (${selectedVehicle?.brand} ${selectedVehicle?.model})`,
        'Technician': 'Certified Professional Assigned',
      },
    };
    addToCart(bookingDetails);
    setBookingService(null);
    navigateTo('cart');
  };

  const toggleWishlist = (productId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    customerToggleWishlist(productId);
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
      ) : null}

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
                <Heart size={13} className={wishlist.includes(service.id) ? 'fill-red-500 text-red-500' : ''} />
              </button>

              <div className="flex gap-3">
                {/* Image */}
                <div className="w-24 h-24 rounded-xl bg-slate-100 overflow-hidden shrink-0 relative">
                  <img
                    src={service.image || (activeSubVertical === 'vehicle' ? 'https://images.unsplash.com/photo-1487754180451-c456f719a1fc?w=300&auto=format&fit=crop&q=60' : 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=300&auto=format&fit=crop&q=60')}
                    alt={service.title}
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = activeSubVertical === 'vehicle'
                        ? 'https://images.unsplash.com/photo-1487754180451-c456f719a1fc?w=300&auto=format&fit=crop&q=60'
                        : 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=300&auto=format&fit=crop&q=60';
                    }}
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

      {/* Slot Booking Dialog (Wheel/Roller Picker matching reference) */}
      <TimeSlotWheelPickerModal
        isOpen={!!bookingService}
        onClose={() => setBookingService(null)}
        serviceTitle={bookingService?.title || ''}
        price={bookingService?.price || 0}
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
