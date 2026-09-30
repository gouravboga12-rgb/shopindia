import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { useCustomer } from '../../context/CustomerContext';
import { useProducts } from '../../hooks/useProducts';
import { useCategories } from '../../hooks/useCategories';
import {
  Plus, Minus, Clock, ShoppingCart, ArrowRight, Heart, LayoutGrid,
  Zap, UtensilsCrossed, Pill, Sparkles, UploadCloud, ShieldCheck
} from 'lucide-react';
import { motion } from 'framer-motion';
import type { Product } from '../../data/types';
import { FoodCustomizationModal } from '../common/FoodCustomizationModal';
import { PrescriptionUploadModal } from '../common/PrescriptionUploadModal';
import { requireCustomerAuth } from '../../lib/customerAuth';

type QuickSubVertical = 'grocery' | 'food' | 'pharmacy';

const SUB_VERTICAL_TABS = [
  {
    id: 'grocery' as QuickSubVertical,
    label: 'Instant Grocery',
    tagline: '10-20 Min Delivery from Dark Store',
    icon: Zap,
    color: 'from-emerald-500 to-teal-600',
    activeBg: 'bg-emerald-600 text-white',
    badge: '10 MINS',
  },
  {
    id: 'food' as QuickSubVertical,
    label: 'Food Delivery',
    tagline: 'Hot & Fresh Meals from Top Kitchens',
    icon: UtensilsCrossed,
    color: 'from-orange-500 to-amber-600',
    activeBg: 'bg-orange-600 text-white',
    badge: 'LIVE KITCHENS',
  },
  {
    id: 'pharmacy' as QuickSubVertical,
    label: 'Pharmacy Medicines',
    tagline: 'Rx Medicines & Health Essentials',
    icon: Pill,
    color: 'from-blue-600 to-cyan-600',
    activeBg: 'bg-blue-600 text-white',
    badge: 'CERTIFIED PHARMA',
  },
];

const QUICK_CATEGORIES_FALLBACK: Record<QuickSubVertical, string[]> = {
  grocery: ['All Items', 'Fruits & Veggies', 'Dairy, Bread & Eggs', 'Snacks & Munchies', 'Cold Drinks & Juices', 'Personal Care'],
  food: ['All Food', 'Biryani & Rice', 'Pizza & Fast Food', 'Thalis & Curries', 'Healthy & Bowls', 'Desserts & Shakes'],
  pharmacy: ['All Medicines', 'Fever & Pain Relief', 'Cough & Cold', 'Vitamins & Immunity', 'First Aid & Care', 'Diabetes Care', 'Ayurveda'],
};

export const VerticalQuickCommerce: React.FC = () => {
  const { cart, addToCart, updateQuantity, navigateTo } = useApp();
  const { products } = useProducts();
  const { categories: apiCategories } = useCategories();

  const [activeSubVertical, setActiveSubVertical] = useState<QuickSubVertical>('grocery');
  const [selectedCatId, setSelectedCatId] = useState<string>('');
  const { wishlist, toggleWishlist: customerToggleWishlist } = useCustomer();

  // Modals state
  const [customizingProduct, setCustomizingProduct] = useState<Product | null>(null);
  const [rxModalOpen, setRxModalOpen] = useState(false);
  const [selectedRxProduct, setSelectedRxProduct] = useState<Product | null>(null);

  // Reset category filter on sub-vertical change
  const handleSubVerticalChange = (sub: QuickSubVertical) => {
    setActiveSubVertical(sub);
    setSelectedCatId('');
  };

  // Filter products by vertical and active sub-vertical
  const quickProducts = products.filter((p) => {
    if (p.vertical !== 'quick') return false;
    if (p.subVertical) return p.subVertical === activeSubVertical;

    // Fallback classification based on category or title
    const text = `${p.category || ''} ${p.title || ''} ${p.description || ''}`.toLowerCase();
    if (activeSubVertical === 'pharmacy') {
      return text.includes('pharma') || text.includes('medicine') || text.includes('tablet') || text.includes('capsule') || text.includes('syrup') || text.includes('first aid');
    }
    if (activeSubVertical === 'food') {
      return text.includes('food') || text.includes('biryani') || text.includes('pizza') || text.includes('burger') || text.includes('meal') || text.includes('paneer') || text.includes('kitchen') || text.includes('roll');
    }
    return !text.includes('pharma') && !text.includes('medicine') && !text.includes('biryani') && !text.includes('pizza') && !text.includes('burger');
  });

  const activeProducts = selectedCatId === '' || selectedCatId === 'All Items' || selectedCatId === 'All Food' || selectedCatId === 'All Medicines'
    ? quickProducts
    : quickProducts.filter((p) => p.category === selectedCatId || (p.tags && p.tags.includes(selectedCatId)));

  const getCartQty = (id: string) => {
    const item = cart.find((i) => i.product.id === id);
    return item ? item.quantity : 0;
  };

  const toggleWishlist = (productId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    customerToggleWishlist(productId);
  };

  const handleAddToCartWithCustomization = (product: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!requireCustomerAuth('add quick commerce items to your cart')) return;
    if (activeSubVertical === 'food') {
      setCustomizingProduct(product);
    } else if (activeSubVertical === 'pharmacy' && product.requiresPrescription) {
      setSelectedRxProduct(product);
      setRxModalOpen(true);
    } else {
      addToCart(product);
    }
  };

  const activeCartItems = cart.filter((i) => i.product.vertical === 'quick');
  const activeCartCount = activeCartItems.reduce((acc, i) => acc + i.quantity, 0);
  const activeCartTotal = activeCartItems.reduce((acc, i) => acc + i.product.price * i.quantity, 0);

  // Dynamically derive live category aisles from Admin API + Products
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
    const defaultLabel = activeSubVertical === 'food' ? 'All Food' : activeSubVertical === 'pharmacy' ? 'All Medicines' : 'All Items';

    const merged = Array.from(new Set([...fromApi, ...fromProds, ...fallback.slice(1)]));
    return [defaultLabel, ...merged];
  }, [apiCategories, activeSubVertical, quickProducts]);

  return (
    <div className="w-full flex flex-col min-h-screen bg-brand-bg text-brand-graphite relative select-none font-sans">
      {/* 1. Sub-Vertical Segmented Switcher */}
      <div className="max-w-[1440px] mx-auto w-full px-8 pt-6">
        {/* Design Demo Preview Callout */}
        <div className="mb-4 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 p-[1px] rounded-2xl shadow-sm">
          <div className="bg-amber-50/90 rounded-2xl px-5 py-3 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🎨</span>
              <div>
                <h4 className="text-sm font-extrabold text-slate-900 leading-tight">
                  Design Preview Available: New Zinkit Quick-Commerce Interface
                </h4>
                <p className="text-xs text-slate-600 font-medium">
                  Review the warm lemon-yellow aesthetic, curated visual cards, and brand tiles in a safe demo sandbox.
                </p>
              </div>
            </div>
            <a
              href="/demo-design"
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-sm active:scale-95 transition"
            >
              <span>Explore Demo Design</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-md p-2 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            {SUB_VERTICAL_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeSubVertical === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleSubVerticalChange(tab.id)}
                  className={`flex items-center gap-2.5 px-5 py-3 rounded-2xl font-extrabold text-xs transition-all whitespace-nowrap ${
                    isActive
                      ? `${tab.activeBg} shadow-lg shadow-black/10 scale-[1.02]`
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                  <span className="font-heading tracking-wide">{tab.label}</span>
                  <span
                    className={`text-[10px] uppercase px-2 py-0.5 rounded-full font-black tracking-wider ${
                      isActive ? 'bg-white/25 text-white' : 'bg-slate-200/80 text-slate-600'
                    }`}
                  >
                    {tab.badge}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="text-xs font-semibold text-slate-500 px-3 hidden lg:flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
            <span>
              {SUB_VERTICAL_TABS.find((t) => t.id === activeSubVertical)?.tagline}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Sub-Vertical Hero Banner Strip */}
      <div className="max-w-[1440px] mx-auto w-full px-8 pt-5">
        <div
          className={`w-full p-6 md:p-8 rounded-hero overflow-hidden shadow-premium relative text-white bg-gradient-to-r ${
            activeSubVertical === 'grocery'
              ? 'from-emerald-700 via-teal-800 to-emerald-950'
              : activeSubVertical === 'food'
              ? 'from-orange-600 via-amber-700 to-orange-950'
              : 'from-blue-700 via-indigo-800 to-slate-950'
          }`}
        >
          <div className="relative z-10 max-w-2xl space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-white/20 backdrop-blur-md">
              <Clock className="w-3.5 h-3.5" />
              {activeSubVertical === 'grocery' && 'Delivered in 10-15 Mins'}
              {activeSubVertical === 'food' && 'Hot & Fresh In 25-35 Mins'}
              {activeSubVertical === 'pharmacy' && 'Verified Pharmacy Dispatch in 20 Mins'}
            </span>
            <h2 className="text-2xl md:text-3xl font-black font-heading tracking-tight">
              {activeSubVertical === 'grocery' && 'Fresh Groceries, Snacks & Daily Essentials'}
              {activeSubVertical === 'food' && 'Order Food Online from Verified Kitchens'}
              {activeSubVertical === 'pharmacy' && '100% Genuine Medicines & Health Wellness'}
            </h2>
            <p className="text-xs md:text-sm text-white/80 font-medium">
              {activeSubVertical === 'grocery' && 'Dark-store stocked with fresh fruits, farm dairy, and top FMCG brands.'}
              {activeSubVertical === 'food' && 'Live preparation tracking with food safety hygiene guarantee.'}
              {activeSubVertical === 'pharmacy' && 'Upload doctor prescription for quick doorstep medicine delivery.'}
            </p>

            {activeSubVertical === 'pharmacy' && (
              <div className="pt-2 flex items-center gap-3">
                <button
                  onClick={() => {
                    setSelectedRxProduct(null);
                    setRxModalOpen(true);
                  }}
                  className="px-5 py-2.5 bg-white text-blue-800 font-extrabold text-xs rounded-xl shadow-lg hover:bg-blue-50 transition-all flex items-center gap-2"
                >
                  <UploadCloud className="w-4 h-4 text-blue-600" />
                  Upload Prescription (Rx)
                </button>
                <span className="text-xs text-white/80 flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" /> Pharmacist Checked
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Main Catalog Area (Aisles & Product Grid) */}
      <div className="max-w-[1440px] mx-auto w-full px-8 py-8 flex flex-col md:flex-row gap-8 items-start">
        {/* Left Category Sidebar */}
        <aside className="w-full md:w-64 shrink-0 flex flex-col gap-2 sticky top-28 bg-white p-4 rounded-card border border-slate-200/80 shadow-soft">
          <div className="flex items-center gap-2 pb-3 mb-1 border-b border-slate-100 text-xs font-black uppercase tracking-wider text-slate-400 font-heading">
            <LayoutGrid size={14} className="text-brand-slate" />
            <span>Category Aisles</span>
          </div>

          <div className="flex flex-row md:flex-col gap-1.5 overflow-x-auto md:overflow-visible pb-2 md:pb-0">
            {subCategories.map((catName) => {
              const isSelected = selectedCatId === catName || (selectedCatId === '' && catName.startsWith('All'));
              return (
                <button
                  key={catName}
                  onClick={() => setSelectedCatId(catName.startsWith('All') ? '' : catName)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left whitespace-nowrap ${
                    isSelected
                      ? activeSubVertical === 'grocery'
                        ? 'bg-emerald-50 text-emerald-800 border-l-4 border-emerald-600'
                        : activeSubVertical === 'food'
                        ? 'bg-orange-50 text-orange-800 border-l-4 border-orange-600'
                        : 'bg-blue-50 text-blue-800 border-l-4 border-blue-600'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <span>{catName}</span>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Right Products Grid */}
        <main className="flex-1 w-full min-w-0">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-black text-lg text-slate-800 flex items-center gap-2">
              <span>{selectedCatId || subCategories[0]}</span>
              <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                {activeProducts.length} items
              </span>
            </h3>
          </div>

          {activeProducts.length === 0 ? (
            <div className="w-full py-16 text-center bg-white rounded-3xl border border-slate-200/80 p-8 space-y-3">
              <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <LayoutGrid className="w-8 h-8" />
              </div>
              <h4 className="font-bold text-slate-700">No products found in this aisle</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Try picking another category from the left aisle or switch between Grocery, Food, and Pharmacy above.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {activeProducts.map((product) => {
                const qty = getCartQty(product.id);
                const discount = product.originalPrice > product.price
                  ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
                  : 0;

                return (
                  <motion.div
                    key={product.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="group bg-white rounded-card p-3.5 border border-slate-200/80 hover:border-slate-300 shadow-soft hover:shadow-premium transition-all duration-300 flex flex-col justify-between relative cursor-pointer"
                    onClick={() => navigateTo('detail', product.id)}
                  >
                    {/* Wishlist Button */}
                    <button
                      onClick={(e) => toggleWishlist(product.id, e)}
                      className="absolute top-3 right-3 p-1.5 rounded-full bg-white/80 backdrop-blur-md text-slate-400 hover:text-red-500 shadow-soft z-10"
                    >
                      <Heart size={14} className={wishlist.includes(product.id) ? 'fill-red-500 text-red-500' : ''} />
                    </button>

                    {/* Discount Badge */}
                    {discount > 0 && (
                      <span className="absolute top-3 left-3 bg-red-50 text-red-600 text-[10px] font-black px-2 py-0.5 rounded shadow-sm z-10">
                        {discount}% OFF
                      </span>
                    )}

                    {/* Image Container */}
                    <div className="w-full aspect-square flex items-center justify-center mb-3 bg-slate-50 rounded-2xl overflow-hidden p-2">
                      <img
                        src={product.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&auto=format&fit=crop&q=60'}
                        alt={product.title}
                        className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>

                    {/* Domain Specific Badges */}
                    <div className="space-y-1 mb-2">
                      {activeSubVertical === 'food' && (
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`w-3 h-3 rounded-sm border flex items-center justify-center ${
                              product.isVeg !== false ? 'border-emerald-600' : 'border-red-600'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                product.isVeg !== false ? 'bg-emerald-600' : 'bg-red-600'
                              }`}
                            />
                          </span>
                          <span className="text-[11px] font-bold text-slate-500 truncate">
                            {product.restaurantName || product.brand || 'Cloud Kitchen'}
                          </span>
                        </div>
                      )}

                      {activeSubVertical === 'pharmacy' && product.requiresPrescription && (
                        <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-bold">
                          <Pill size={10} />
                          <span>Rx Prescription Required</span>
                        </div>
                      )}

                      {/* Delivery Time Badge */}
                      <div className="flex items-center gap-1 text-[11px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md w-max">
                        <Clock size={10} />
                        <span>{product.deliveryTime || (activeSubVertical === 'grocery' ? '10-15 Mins' : activeSubVertical === 'food' ? '25-30 Mins' : '20 Mins')}</span>
                      </div>
                    </div>

                    {/* Title */}
                    <h4 className="text-xs font-bold text-slate-800 line-clamp-2 leading-relaxed mb-1 min-h-[34px] group-hover:text-brand-green transition-colors">
                      {product.title}
                    </h4>

                    {/* Quantity / Unit */}
                    <div className="text-[11px] text-slate-400 font-semibold mb-3">
                      {product.specs?.['Weight'] || product.packSize || product.cuisine || 'Standard Pack'}
                    </div>

                    {/* Price & Action Row */}
                    <div className="flex items-center justify-between mt-auto pt-2 border-t border-slate-100" onClick={(e) => e.stopPropagation()}>
                      <div className="flex flex-col leading-none">
                        <span className="text-sm font-extrabold text-slate-900">₹{product.price}</span>
                        {product.originalPrice > product.price && (
                          <span className="text-[10px] text-slate-400 line-through mt-0.5">₹{product.originalPrice}</span>
                        )}
                      </div>

                      {activeSubVertical === 'food' ? (
                        <button
                          onClick={(e) => handleAddToCartWithCustomization(product, e)}
                          className="px-3.5 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 text-xs font-bold rounded-xl transition-all shadow-sm"
                        >
                          Customize +
                        </button>
                      ) : qty === 0 ? (
                        <div className="flex items-center gap-1.5">
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!requireCustomerAuth('buy this item')) return;
                              addToCart(product);
                              navigateTo('cart');
                            }}
                            className={`px-3 py-1.5 text-xs font-black rounded-xl transition-all shadow-sm uppercase tracking-wider text-white ${
                              activeSubVertical === 'pharmacy'
                                ? 'bg-blue-600 hover:bg-blue-700'
                                : 'bg-emerald-600 hover:bg-emerald-700'
                            }`}
                          >
                            Buy
                          </motion.button>
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={(e) => handleAddToCartWithCustomization(product, e)}
                            className={`px-3 py-1.5 text-xs font-black rounded-xl transition-all shadow-sm uppercase tracking-wider ${
                              activeSubVertical === 'pharmacy'
                                ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                            }`}
                          >
                            Add
                          </motion.button>
                        </div>
                      ) : (
                        <div className="flex items-center bg-emerald-600 text-white rounded-xl overflow-hidden text-xs font-bold shadow-sm">
                          <button
                            onClick={() => updateQuantity(product.id, qty - 1)}
                            className="px-2 py-1.5 hover:bg-emerald-700 transition-colors"
                          >
                            <Minus size={11} strokeWidth={3} />
                          </button>
                          <span className="px-2 text-center select-none">{qty}</span>
                          <button
                            onClick={() => updateQuantity(product.id, qty + 1)}
                            className="px-2 py-1.5 hover:bg-emerald-700 transition-colors"
                          >
                            <Plus size={11} strokeWidth={3} />
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {/* Floating Bottom Cart Bar */}
      {activeCartCount > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-xl bg-slate-900 text-white px-5 py-3 rounded-3xl shadow-2xl flex items-center justify-between z-40 transition-transform duration-300 hover:bg-black border border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-2xl bg-white/10 relative">
              <ShoppingCart size={18} />
              <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-black text-white">
                {activeCartCount}
              </span>
            </div>
            <div className="flex flex-col leading-tight text-left">
              <span className="font-extrabold text-sm">₹{activeCartTotal.toLocaleString('en-IN')}</span>
              <span className="text-[10px] text-slate-300 uppercase tracking-wider font-semibold">
                Quick Checkout • 10-25 Mins
              </span>
            </div>
          </div>
          <button
            onClick={() => navigateTo('cart')}
            className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-5 py-2 rounded-2xl text-xs font-black shadow-lg transition-colors uppercase tracking-wider cursor-pointer"
          >
            <span>Proceed to Pay</span>
            <ArrowRight size={14} />
          </button>
        </div>
      )}

      {/* Sub-Vertical Modals */}
      <FoodCustomizationModal
        isOpen={Boolean(customizingProduct)}
        onClose={() => setCustomizingProduct(null)}
        product={customizingProduct}
        onAddToCart={(p) => {
          addToCart(p);
        }}
      />

      <PrescriptionUploadModal
        isOpen={rxModalOpen}
        onClose={() => setRxModalOpen(false)}
        productName={selectedRxProduct?.title}
        onUploadSuccess={() => {
          if (selectedRxProduct) {
            addToCart(selectedRxProduct);
          }
        }}
      />
    </div>
  );
};
