import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { useProducts } from '../../hooks/useProducts';
import { useCategories } from '../../hooks/useCategories';
import {
  Plus, Minus, Clock, Heart,
  Zap, UtensilsCrossed, Pill, ShieldCheck
} from 'lucide-react';
import type { Product } from '../../data/types';
import { FoodCustomizationModal } from '../common/FoodCustomizationModal';
import { PrescriptionUploadModal } from '../common/PrescriptionUploadModal';

type QuickSubVertical = 'grocery' | 'food' | 'pharmacy';

const MOBILE_SUB_TABS = [
  { id: 'grocery' as QuickSubVertical, label: 'Instant', icon: Zap, color: 'bg-emerald-600' },
  { id: 'food' as QuickSubVertical, label: 'Food', icon: UtensilsCrossed, color: 'bg-orange-600' },
  { id: 'pharmacy' as QuickSubVertical, label: 'Pharma', icon: Pill, color: 'bg-blue-600' },
];

const QUICK_CATEGORIES_FALLBACK: Record<QuickSubVertical, string[]> = {
  grocery: ['All', 'Fruits & Veggies', 'Dairy, Bread & Eggs', 'Snacks & Munchies', 'Cold Drinks & Juices', 'Personal Care'],
  food: ['All', 'Biryani & Rice', 'Pizza & Fast Food', 'Thalis & Curries', 'Healthy & Bowls', 'Desserts & Shakes'],
  pharmacy: ['All', 'Fever & Pain Relief', 'Cough & Cold', 'Vitamins & Immunity', 'First Aid & Care', 'Diabetes Care', 'Ayurveda'],
};

export const VerticalQuickCommerceMobile: React.FC = () => {
  const { cart, addToCart, updateQuantity, navigateTo } = useApp();
  const { products } = useProducts();
  const { categories: apiCategories } = useCategories();

  const [activeSubVertical, setActiveSubVertical] = useState<QuickSubVertical>('grocery');
  const [activeCat, setActiveCat] = useState('');
  const [wishlist, setWishlist] = useState<Record<string, boolean>>({});

  // Modals state
  const [customizingProduct, setCustomizingProduct] = useState<Product | null>(null);
  const [rxModalOpen, setRxModalOpen] = useState(false);
  const [selectedRxProduct, setSelectedRxProduct] = useState<Product | null>(null);

  const handleSubVerticalChange = (sub: QuickSubVertical) => {
    setActiveSubVertical(sub);
    setActiveCat('');
  };

  const quickProducts = products.filter((p) => {
    if (p.vertical !== 'quick') return false;
    if (p.subVertical) return p.subVertical === activeSubVertical;

    const text = `${p.category || ''} ${p.title || ''} ${p.description || ''}`.toLowerCase();
    if (activeSubVertical === 'pharmacy') {
      return text.includes('pharma') || text.includes('medicine') || text.includes('tablet') || text.includes('capsule') || text.includes('syrup') || text.includes('first aid');
    }
    if (activeSubVertical === 'food') {
      return text.includes('food') || text.includes('biryani') || text.includes('pizza') || text.includes('burger') || text.includes('meal') || text.includes('paneer') || text.includes('kitchen') || text.includes('roll');
    }
    return !text.includes('pharma') && !text.includes('medicine') && !text.includes('biryani') && !text.includes('pizza') && !text.includes('burger');
  });

  const currentProducts = !activeCat || activeCat === 'All'
    ? quickProducts
    : quickProducts.filter((p) => p.category === activeCat || (p.tags && p.tags.includes(activeCat)));

  const getCartQty = (id: string) => {
    const item = cart.find((i) => i.product.id === id);
    return item ? item.quantity : 0;
  };

  const toggleWishlist = (productId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setWishlist((prev) => ({ ...prev, [productId]: !prev[productId] }));
  };

  const handleAddToCartWithCustomization = (product: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeSubVertical === 'food') {
      setCustomizingProduct(product);
    } else if (activeSubVertical === 'pharmacy' && product.requiresPrescription) {
      setSelectedRxProduct(product);
      setRxModalOpen(true);
    } else {
      addToCart(product);
    }
  };


  // Dynamic live categories from database
  const subCategories = useMemo(() => {
    const fromApi = apiCategories
      .filter((c) => {
        if (c.isActive === false) return false;
        const v = (c.vertical || '').toLowerCase();
        if (activeSubVertical === 'grocery') return v === 'quick_grocery' || v === 'quick';
        if (activeSubVertical === 'food') return v === 'quick_food';
        if (activeSubVertical === 'pharmacy') return v === 'quick_pharmacy';
        return v === 'quick';
      })
      .map((c) => c.name);

    const fromProds = quickProducts.map((p) => p.category).filter(Boolean);
    const fallback = QUICK_CATEGORIES_FALLBACK[activeSubVertical] || [];

    const merged = Array.from(new Set([...fromApi, ...fromProds, ...fallback.slice(1)]));
    return ['All', ...merged];
  }, [apiCategories, activeSubVertical, quickProducts]);

  return (
    <div className="w-full flex flex-col gap-3 py-3 px-3 bg-[#FAF9F6] min-h-screen text-slate-800 font-sans pb-32">
      {/* 1. Mobile Sub-Vertical Pill Switcher */}
      <div className="flex items-center gap-1.5 p-1 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
        {MOBILE_SUB_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubVertical === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleSubVerticalChange(tab.id)}
              className={`flex-1 py-2 px-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
                isActive
                  ? `${tab.color} text-white shadow-md`
                  : 'text-slate-600 hover:text-slate-900 bg-slate-50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 2. Top Info Strip */}
      <div
        className={`w-full py-2 px-3 rounded-2xl flex justify-between items-center text-xs font-bold border ${
          activeSubVertical === 'grocery'
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200/60'
            : activeSubVertical === 'food'
            ? 'bg-orange-50 text-orange-800 border-orange-200/60'
            : 'bg-blue-50 text-blue-800 border-blue-200/60'
        }`}
      >
        <span className="flex items-center gap-1.5">
          <Clock size={13} className="animate-pulse" />
          {activeSubVertical === 'grocery' && 'Delivered in 10-15 mins'}
          {activeSubVertical === 'food' && 'Hot & fresh in 25-30 mins'}
          {activeSubVertical === 'pharmacy' && 'Verified Pharmacy Delivery'}
        </span>
        <span
          className={`text-[10px] uppercase tracking-wider text-white px-2 py-0.5 rounded-full font-black ${
            activeSubVertical === 'grocery'
              ? 'bg-emerald-600'
              : activeSubVertical === 'food'
              ? 'bg-orange-600'
              : 'bg-blue-600'
          }`}
        >
          {activeSubVertical === 'grocery' ? '10 MINS' : activeSubVertical === 'food' ? 'KITCHEN' : 'RX PHARMA'}
        </span>
      </div>

      {/* Pharmacy Prescription CTA banner on mobile */}
      {activeSubVertical === 'pharmacy' && (
        <div className="p-3 bg-gradient-to-r from-blue-700 to-indigo-800 text-white rounded-2xl flex items-center justify-between shadow-md">
          <div className="space-y-0.5">
            <h4 className="text-xs font-black flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> Have a Doctor's Prescription?
            </h4>
            <p className="text-[10px] text-blue-100">Upload now for quick pharmacist verification</p>
          </div>
          <button
            onClick={() => {
              setSelectedRxProduct(null);
              setRxModalOpen(true);
            }}
            className="px-3 py-1.5 bg-white text-blue-800 font-extrabold text-[11px] rounded-xl shadow-sm hover:bg-blue-50 shrink-0"
          >
            Upload Rx
          </button>
        </div>
      )}

      {/* 3. Horizontal Category Chips */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar -mx-1 px-1">
        {subCategories.map((cat) => {
          const isSelected = activeCat === cat || (!activeCat && cat === 'All');
          return (
            <button
              key={cat}
              onClick={() => setActiveCat(cat === 'All' ? '' : cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                isSelected
                  ? activeSubVertical === 'grocery'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : activeSubVertical === 'food'
                    ? 'bg-orange-600 text-white shadow-sm'
                    : 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200/80'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* 4. Product Cards Grid */}
      <div className="grid grid-cols-2 gap-2.5">
        {currentProducts.map((product) => {
          const qty = getCartQty(product.id);
          const discount = product.originalPrice > product.price
            ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
            : 0;

          return (
            <div
              key={product.id}
              onClick={() => navigateTo('detail', product.id)}
              className="bg-white p-2.5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between relative isolate"
            >
              <button
                onClick={(e) => toggleWishlist(product.id, e)}
                className="absolute top-2 right-2 p-1 rounded-full bg-white/90 text-slate-400 hover:text-red-500 z-10 shadow-sm"
              >
                <Heart size={12} className={wishlist[product.id] ? 'fill-red-500 text-red-500' : ''} />
              </button>

              {discount > 0 && (
                <span className="absolute top-2 left-2 bg-red-50 text-red-600 text-[9px] font-black px-1.5 py-0.5 rounded z-10">
                  {discount}% OFF
                </span>
              )}

              {/* Product Image */}
              <div className="w-full aspect-square bg-slate-50 rounded-xl overflow-hidden mb-2 flex items-center justify-center p-1">
                <img
                  src={product.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&auto=format&fit=crop&q=60'}
                  alt={product.title}
                  className="max-h-full max-w-full object-contain"
                />
              </div>

              {/* Badges */}
              <div className="space-y-0.5 mb-1.5">
                {activeSubVertical === 'food' && (
                  <div className="flex items-center gap-1 text-[10px] text-slate-500 font-semibold truncate">
                    <span
                      className={`w-2.5 h-2.5 rounded-xs border flex items-center justify-center shrink-0 ${
                        product.isVeg !== false ? 'border-emerald-600' : 'border-red-600'
                      }`}
                    >
                      <span className={`w-1 h-1 rounded-full ${product.isVeg !== false ? 'bg-emerald-600' : 'bg-red-600'}`} />
                    </span>
                    <span className="truncate">{product.restaurantName || 'Kitchen'}</span>
                  </div>
                )}

                {activeSubVertical === 'pharmacy' && product.requiresPrescription && (
                  <span className="inline-block text-[9px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                    Rx Required
                  </span>
                )}

                <div className="flex items-center gap-1 text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded w-max">
                  <Clock size={9} />
                  <span>{product.deliveryTime || (activeSubVertical === 'grocery' ? '10-15 Min' : '25 Min')}</span>
                </div>
              </div>

              {/* Title */}
              <h4 className="text-xs font-bold text-slate-800 line-clamp-2 leading-tight min-h-[30px] mb-1">
                {product.title}
              </h4>

              {/* Price & Add */}
              <div className="flex items-center justify-between mt-auto pt-1.5 border-t border-slate-100" onClick={(e) => e.stopPropagation()}>
                <div>
                  <span className="text-xs font-black text-slate-900">₹{product.price}</span>
                  {product.originalPrice > product.price && (
                    <span className="text-[9px] text-slate-400 line-through block">₹{product.originalPrice}</span>
                  )}
                </div>

                {activeSubVertical === 'food' ? (
                  <button
                    onClick={(e) => handleAddToCartWithCustomization(product, e)}
                    className="px-2.5 py-1 bg-orange-50 text-orange-700 border border-orange-200 text-[11px] font-bold rounded-lg"
                  >
                    Add +
                  </button>
                ) : qty === 0 ? (
                  <button
                    onClick={(e) => handleAddToCartWithCustomization(product, e)}
                    className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-black rounded-lg uppercase"
                  >
                    Add
                  </button>
                ) : (
                  <div className="flex items-center bg-emerald-600 text-white rounded-lg overflow-hidden text-xs font-bold">
                    <button
                      onClick={() => updateQuantity(product.id, qty - 1)}
                      className="px-1.5 py-1 hover:bg-emerald-700"
                    >
                      <Minus size={10} strokeWidth={3} />
                    </button>
                    <span className="px-1.5 text-[11px]">{qty}</span>
                    <button
                      onClick={() => updateQuantity(product.id, qty + 1)}
                      className="px-1.5 py-1 hover:bg-emerald-700"
                    >
                      <Plus size={10} strokeWidth={3} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>



      {/* Sub-Vertical Modals */}
      <FoodCustomizationModal
        isOpen={Boolean(customizingProduct)}
        onClose={() => setCustomizingProduct(null)}
        product={customizingProduct}
        onAddToCart={(p) => addToCart(p)}
      />

      <PrescriptionUploadModal
        isOpen={rxModalOpen}
        onClose={() => setRxModalOpen(false)}
        productName={selectedRxProduct?.title}
        onUploadSuccess={() => {
          if (selectedRxProduct) addToCart(selectedRxProduct);
        }}
      />
    </div>
  );
};
