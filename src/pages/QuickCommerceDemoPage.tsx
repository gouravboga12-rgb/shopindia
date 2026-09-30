import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  Search, ShoppingCart, User, MapPin, ChevronDown, Heart, Eye,
  ArrowRight, Sparkles, Smartphone, Monitor, ArrowLeft, CheckCircle2,
  Clock, ShieldCheck, Menu, ChevronRight, X
} from 'lucide-react';

export const QuickCommerceDemoPage: React.FC = () => {
  const { cart } = useApp();

  // Demo controls
  const [deviceMode, setDeviceMode] = useState<'responsive' | 'mobile-frame'>('responsive');
  const [activeTab, setActiveTab] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [quickCartCount, setQuickCartCount] = useState<Record<string, number>>({});
  const [likedItems, setLikedItems] = useState<Record<string, boolean>>({});
  const [previewModalProduct, setPreviewModalProduct] = useState<any | null>(null);

  // Quick category tabs from screenshots
  const CATEGORY_TABS = [
    { id: 'All', label: 'All', icon: '🛍️', activeColor: 'border-black text-black font-bold' },
    { id: 'Grocery', label: 'Grocery', icon: '🥬', activeColor: 'border-emerald-600 text-emerald-700 font-bold' },
    { id: 'Beauty', label: 'Beauty', icon: '💄', activeColor: 'border-pink-500 text-pink-600 font-bold' },
    { id: 'Pharmacy', label: 'Pharmacy', icon: '💊', activeColor: 'border-blue-500 text-blue-600 font-bold' },
    { id: 'Kids', label: 'Kids', icon: '🧸', activeColor: 'border-amber-500 text-amber-600 font-bold' },
    { id: 'Summer', label: 'Summer', icon: '☀️', activeColor: 'border-orange-500 text-orange-600 font-bold' },
  ];

  // Glow, Care & Fragrance vertical feature cards
  const GLOW_FEATURE_CARDS = [
    {
      id: 'glow-1',
      title: 'Luxury Perfumes',
      subtitle: 'Engage & Amber Hues',
      tag: 'Up to 50% Off',
      image: 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=500&auto=format&fit=crop&q=80',
      bgColor: 'from-amber-100/90 via-orange-50 to-amber-200/50',
      tagBg: 'bg-white text-gray-900',
    },
    {
      id: 'glow-2',
      title: 'Eau De Parfum',
      subtitle: 'Denver & Wild Stone',
      tag: 'Min. 30% Off',
      image: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=500&auto=format&fit=crop&q=80',
      bgColor: 'from-yellow-100/90 via-amber-50 to-amber-100/60',
      tagBg: 'bg-white text-gray-900',
    },
    {
      id: 'glow-3',
      title: 'Shampoos',
      subtitle: 'Anti-Dandruff & Repair',
      tag: 'Up to 65% Off',
      image: 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=500&auto=format&fit=crop&q=80',
      bgColor: 'from-emerald-100/90 via-green-50 to-emerald-200/60',
      tagBg: 'bg-white text-emerald-800 font-bold',
    },
    {
      id: 'glow-4',
      title: 'Sunscreens',
      subtitle: 'SPF 50+ Bright Sunscreen',
      tag: 'Up to 45% Off',
      image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=500&auto=format&fit=crop&q=80',
      bgColor: 'from-orange-100/90 via-amber-50 to-orange-200/60',
      tagBg: 'bg-white text-orange-800 font-bold',
    },
  ];

  // Skincare Essentials vertical feature cards
  const SKINCARE_FEATURE_CARDS = [
    {
      id: 'skin-1',
      title: 'Face Wash',
      tag: 'Min. 20% Off',
      image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=500&auto=format&fit=crop&q=80',
      bgColor: 'from-rose-100/80 via-orange-50 to-rose-200/70',
    },
    {
      id: 'skin-2',
      title: 'Body lotions',
      tag: 'Min. 40% Off',
      image: 'https://images.unsplash.com/photo-1608248597359-59754f2a7db5?w=500&auto=format&fit=crop&q=80',
      bgColor: 'from-pink-100/80 via-rose-50 to-pink-200/70',
    },
    {
      id: 'skin-3',
      title: 'Sunscreens',
      tag: 'Up to 45% Off',
      image: 'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=500&auto=format&fit=crop&q=80',
      bgColor: 'from-amber-100/80 via-yellow-50 to-orange-200/70',
    },
    {
      id: 'skin-4',
      title: 'Shampoos',
      tag: 'Up to 65% Off',
      image: 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=500&auto=format&fit=crop&q=80',
      bgColor: 'from-teal-100/80 via-emerald-50 to-teal-200/70',
    },
  ];

  // Grid category items matching Screenshot 1 & 3
  const CATEGORY_GRID_ITEMS = [
    { name: 'Dal & Pulses', icon: '🌾', img: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=200&auto=format&fit=crop&q=80' },
    { name: 'Bakery & Biscuits', icon: '🍪', img: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=200&auto=format&fit=crop&q=80' },
    { name: 'Dairy & Eggs', icon: '🥛', img: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=200&auto=format&fit=crop&q=80' },
    { name: 'Women Care', icon: '👗', img: 'https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?w=200&auto=format&fit=crop&q=80' },
    { name: 'Dry Fruits & Nuts', icon: '🥜', img: 'https://images.unsplash.com/photo-1508061257976-f7536b19aa18?w=200&auto=format&fit=crop&q=80' },
    { name: 'Edible Oil & Ghee', icon: '🛢️', img: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=200&auto=format&fit=crop&q=80' },
    { name: 'Mobiles & Acc.', icon: '📱', img: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=200&auto=format&fit=crop&q=80' },
    { name: 'Electronics', icon: '💻', img: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=200&auto=format&fit=crop&q=80' },
    { name: 'Home Appliances', icon: '🔌', img: 'https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?w=200&auto=format&fit=crop&q=80' },
    { name: 'Ice Creams & Sweets', icon: '🍦', img: 'https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?w=200&auto=format&fit=crop&q=80' },
    { name: 'Baby & Kids Care', icon: '🍼', img: 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=200&auto=format&fit=crop&q=80' },
    { name: 'Beauty & Cosmetics', icon: '💄', img: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=200&auto=format&fit=crop&q=80' },
  ];

  // Fresh Vegetables demo items matching Screenshot 2 & 3
  const FRESH_VEGGIES_ITEMS = [
    {
      id: 'veg-onion',
      title: 'Fresh Onion (Pyaz)',
      category: 'Fresh Vegetables',
      weight: '1 kg',
      price: 35,
      originalPrice: 85,
      discount: '59% OFF',
      deliveryTime: '15-20 mins',
      image: 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=500&auto=format&fit=crop&q=80',
    },
    {
      id: 'veg-tomato',
      title: 'Local Hybrid Tomato',
      category: 'Fresh Vegetables',
      weight: '1 kg',
      price: 20,
      originalPrice: 90,
      discount: '78% OFF',
      deliveryTime: '15-20 mins',
      image: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=500&auto=format&fit=crop&q=80',
    },
    {
      id: 'veg-carrot',
      title: 'Fresh Local Carrot (Gajar)',
      category: 'Fresh Vegetables',
      weight: '500g',
      price: 22,
      originalPrice: 35,
      discount: '37% OFF',
      deliveryTime: '15-20 mins',
      image: 'https://images.unsplash.com/photo-1598170845058-32b9d6a5c317?w=500&auto=format&fit=crop&q=80',
    },
    {
      id: 'veg-potato',
      title: 'Fresh New Potato (Aloo)',
      category: 'Fresh Vegetables',
      weight: '1 kg',
      price: 28,
      originalPrice: 45,
      discount: '38% OFF',
      deliveryTime: '15-20 mins',
      image: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=500&auto=format&fit=crop&q=80',
    },
  ];

  // Staples / Dal items matching Screenshot 2
  const STAPLES_ITEMS = [
    {
      id: 'staple-chana',
      title: 'Chana Dal Classic - 500g',
      category: 'Dal & Pulses',
      weight: '500g',
      price: 54.60,
      originalPrice: 60.00,
      discount: '10% OFF',
      deliveryTime: '15-20 mins',
      image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500&auto=format&fit=crop&q=80',
    },
    {
      id: 'staple-toor',
      title: 'Toor / Arhar Dal - 500g',
      category: 'Dal & Pulses',
      weight: '500g',
      price: 65.10,
      originalPrice: 71.40,
      discount: '9% OFF',
      deliveryTime: '15-20 mins',
      image: 'https://images.unsplash.com/photo-1515543237350-b3eea1ec8082?w=500&auto=format&fit=crop&q=80',
    },
    {
      id: 'staple-tata',
      title: 'Tata Sampann Unpolished Toor Dal - 500g',
      category: 'Dal & Pulses',
      weight: '500g',
      price: 86.10,
      originalPrice: 95.00,
      discount: '8% OFF',
      deliveryTime: '15-20 mins',
      image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500&auto=format&fit=crop&q=80',
    },
  ];

  // Brand logos matching Screenshot 2
  const BRAND_CARDS = [
    { name: 'MATTEL', color: 'text-red-600', bg: 'bg-red-50 hover:bg-red-100', border: 'border-red-100' },
    { name: 'LEGO', color: 'text-red-700 font-extrabold', bg: 'bg-yellow-50 hover:bg-yellow-100', border: 'border-yellow-100' },
    { name: 'Hasbro Gaming', color: 'text-blue-700', bg: 'bg-blue-50 hover:bg-blue-100', border: 'border-blue-100' },
    { name: 'Skillmatics', color: 'text-cyan-700', bg: 'bg-cyan-50 hover:bg-cyan-100', border: 'border-cyan-100' },
    { name: 'STORIO', color: 'text-purple-700', bg: 'bg-purple-50 hover:bg-purple-100', border: 'border-purple-100' },
    { name: 'FUNSKOOL', color: 'text-rose-600', bg: 'bg-rose-50 hover:bg-rose-100', border: 'border-rose-100' },
    { name: 'Smartivity', color: 'text-slate-800', bg: 'bg-slate-50 hover:bg-slate-100', border: 'border-slate-200' },
    { name: 'JAM & HONEY', color: 'text-pink-600', bg: 'bg-pink-50 hover:bg-pink-100', border: 'border-pink-100' },
  ];

  // Add / Increment item count helper
  const handleItemCountChange = (id: string, delta: number) => {
    setQuickCartCount((prev) => {
      const current = prev[id] || 0;
      const next = Math.max(0, current + delta);
      return { ...prev, [id]: next };
    });
  };

  const toggleDemoHeart = (id: string) => {
    setLikedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const totalCartCount = useMemo(() => {
    const localSum = Object.values(quickCartCount).reduce((acc, curr) => acc + curr, 0);
    const globalSum = cart.reduce((acc, item) => acc + item.quantity, 0);
    return Math.max(localSum, globalSum);
  }, [quickCartCount, cart]);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-800">
      {/* ============================================================== */}
      {/* TOP DEMO CONTROL BANNER (NON-INTRUSIVE FOR REVIEW) */}
      {/* ============================================================== */}
      <header className="sticky top-0 z-50 bg-slate-900 text-white px-3 py-2.5 shadow-md flex items-center justify-between flex-wrap gap-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="bg-amber-500 text-slate-950 font-bold px-2 py-0.5 rounded text-[11px] uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> DEMO PREVIEW
          </span>
          <span className="hidden sm:inline text-slate-200 font-medium">
            New Quick-Commerce Look (Inspired by Zinkit)
          </span>
          <span className="text-emerald-400 font-semibold text-[11px] bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/60 hidden md:inline">
            ✓ Live site is 100% untouched
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Device Frame Switcher */}
          <div className="bg-slate-800 rounded-lg p-0.5 border border-slate-700 flex items-center">
            <button
              onClick={() => setDeviceMode('responsive')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition ${
                deviceMode === 'responsive'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Full width responsive layout"
            >
              <Monitor className="w-3 h-3" />
              <span>Full Screen</span>
            </button>
            <button
              onClick={() => setDeviceMode('mobile-frame')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition ${
                deviceMode === 'mobile-frame'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Simulated mobile phone frame"
            >
              <Smartphone className="w-3 h-3" />
              <span>Mobile Frame</span>
            </button>
          </div>

          {/* Exit / Return button */}
          <a
            href="/"
            className="flex items-center gap-1 bg-white/10 hover:bg-white/20 active:scale-95 text-white font-medium px-2.5 py-1 rounded-md transition text-[11px]"
          >
            <ArrowLeft className="w-3 h-3" />
            <span>Return to Live Store</span>
          </a>
        </div>
      </header>

      {/* ============================================================== */}
      {/* MAIN CONTAINER (MOBILE PHONE CONTAINER OR FULL-SCREEN RESPONSIVE) */}
      {/* ============================================================== */}
      <div
        className={`mx-auto w-full transition-all duration-300 ${
          deviceMode === 'mobile-frame'
            ? 'max-w-[420px] my-6 rounded-[2.5rem] shadow-2xl overflow-hidden border-[8px] border-slate-800 bg-white ring-1 ring-slate-900/10'
            : 'max-w-7xl bg-white shadow-sm my-0'
        }`}
      >
        {/* ============================================================== */}
        {/* DESKTOP MICRO HEADER (Screenshot 2 Top Bar) */}
        {/* ============================================================== */}
        <div className="hidden md:flex items-center justify-between px-6 py-1.5 bg-[#FEF08A]/70 text-slate-700 text-xs border-b border-yellow-200/60 font-medium">
          <div className="flex items-center gap-4">
            <span className="text-slate-600">Follow Us:</span>
            <div className="flex items-center gap-2 text-slate-800">
              <span className="cursor-pointer hover:text-emerald-700 transition">Facebook</span>
              <span>•</span>
              <span className="cursor-pointer hover:text-emerald-700 transition">Instagram</span>
              <span>•</span>
              <span className="cursor-pointer hover:text-emerald-700 transition">WhatsApp</span>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-1.5 text-slate-800">
              <span>📞</span>
              <span className="font-semibold">+91 94335 22491</span>
            </div>
            <div className="flex items-center gap-1 cursor-pointer hover:text-emerald-700">
              <span>🌐 English</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* APP HEADER WITH SUNNY-GLOW GRADIENT (Screenshots 1, 2, 4) */}
        {/* ============================================================== */}
        <div className="bg-gradient-to-b from-[#FEF9C3] via-[#FEFCE8] to-white px-4 pt-3 pb-3 border-b border-yellow-100">
          {/* Top Row: Brand / Location / Cart */}
          <div className="flex items-center justify-between gap-3">
            {/* Left: Mobile hamburger or brand mark */}
            <div className="flex items-center gap-2">
              <button className="md:hidden p-1.5 text-slate-800 hover:bg-yellow-200/50 rounded-lg transition">
                <Menu className="w-6 h-6" />
              </button>
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white font-extrabold flex items-center justify-center text-xl shadow-sm">
                  Z
                </div>
                <div>
                  <div className="font-black tracking-tight text-slate-900 leading-none text-base">
                    Shop<span className="text-emerald-600">India</span>
                  </div>
                  <div className="text-[10px] text-emerald-700 font-semibold tracking-wider uppercase">
                    Quick Instant
                  </div>
                </div>
              </div>
            </div>

            {/* Center: Deliver To Location pill */}
            <div className="flex items-center gap-1.5 cursor-pointer hover:bg-yellow-200/40 px-2.5 py-1 rounded-full transition max-w-[200px] sm:max-w-xs">
              <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
              <div className="text-left overflow-hidden">
                <div className="text-[10px] uppercase font-semibold text-slate-500 leading-tight">
                  Deliver to
                </div>
                <div className="text-xs font-bold text-slate-900 truncate flex items-center gap-1">
                  <span>HSR Layout, Bengaluru</span>
                  <ChevronDown className="w-3 h-3 text-slate-600 shrink-0" />
                </div>
              </div>
            </div>

            {/* Right: Cart & Profile icons */}
            <div className="flex items-center gap-2.5">
              <button
                className="relative p-2 rounded-full hover:bg-yellow-200/50 active:scale-95 transition text-slate-800"
                title="Cart"
              >
                <ShoppingCart className="w-5 h-5" />
                {totalCartCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-emerald-600 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center ring-2 ring-white animate-pulse">
                    {totalCartCount}
                  </span>
                )}
              </button>

              <button
                className="hidden sm:flex items-center gap-1 p-2 rounded-full hover:bg-yellow-200/50 active:scale-95 transition text-slate-800"
                title="Account"
              >
                <User className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Search Bar matching Reference Screenshot ("I am looking for...") */}
          <div className="mt-3 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="I am looking for fresh vegetables, snacks, skincare, milk..."
              className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200/90 rounded-xl text-xs md:text-sm text-slate-800 placeholder-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
            />
          </div>

          {/* Horizontal Category Strip (All, Grocery, Beauty, Pharmacy, Kids, Summer) */}
          <div className="mt-3.5 flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            {CATEGORY_TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex flex-col items-center justify-center min-w-[62px] px-2.5 py-1.5 rounded-xl transition duration-150 relative shrink-0 ${
                    isActive
                      ? 'bg-white shadow-sm text-slate-900 border border-slate-200/80 font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  <span className="text-xl mb-0.5 drop-shadow-sm">{tab.icon}</span>
                  <span className="text-[11px] leading-tight font-medium">{tab.label}</span>
                  {isActive && (
                    <div className="w-6 h-0.5 bg-slate-900 rounded-full mt-1" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ============================================================== */}
        {/* MAIN BODY SCROLL AREA */}
        {/* ============================================================== */}
        <div className="p-3 md:p-6 space-y-7">
          {/* ============================================================== */}
          {/* HERO BANNER SECTION (Screenshot 1: Latest Tech. Best Prices) */}
          {/* ============================================================== */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-100/70 border border-emerald-200/60 p-5 md:p-8 shadow-sm">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
              <div className="space-y-3 max-w-md text-left">
                <span className="inline-block bg-emerald-600 text-white text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full tracking-wider shadow-sm">
                  ⚡ ELECTRONICS DEALS
                </span>
                <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 leading-tight">
                  Latest Tech. <br />
                  <span className="text-emerald-700">Best Prices.</span> 🌿
                </h2>
                <p className="text-xs md:text-sm text-slate-600 font-medium">
                  Top brands, latest gadgets & exciting lightning offers delivered in 15 mins.
                </p>

                <div className="pt-1">
                  <button className="inline-flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs md:text-sm px-5 py-2.5 rounded-xl shadow-md hover:shadow-lg active:scale-95 transition">
                    <span>Shop Now</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Trust Badges matching Screenshot 1 */}
                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-emerald-200/70 text-[10px] text-slate-700 font-semibold">
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>100% Original</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Fast Delivery</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>1 Yr Warranty</span>
                  </div>
                </div>
              </div>

              {/* Banner Right Image Collage with Discount Stamp */}
              <div className="relative shrink-0 w-full md:w-auto flex justify-center">
                <div className="relative max-w-xs md:max-w-md">
                  <img
                    src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80"
                    alt="Gadgets Collection"
                    className="w-full h-44 md:h-56 object-cover rounded-xl shadow-md"
                  />
                  {/* Up to 60% OFF Stamp Badge */}
                  <div className="absolute -top-3 -right-3 w-16 h-16 md:w-20 md:h-20 bg-emerald-500 text-white font-extrabold rounded-full flex flex-col items-center justify-center shadow-lg border-2 border-white rotate-12">
                    <span className="text-[9px] uppercase tracking-wider leading-none">UP TO</span>
                    <span className="text-lg md:text-xl leading-none">60%</span>
                    <span className="text-[9px] uppercase tracking-wider leading-none">OFF</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ============================================================== */}
          {/* SECTION 1: "Glow, Care & Fragrance" (4 Vertical Tall Cards) */}
          {/* ============================================================== */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg md:text-xl font-extrabold text-slate-900 tracking-tight">
                  Glow, Care & Fragrance
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Curated perfumes, luxury grooming & hair care
                </p>
              </div>
              <button className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1">
                <span>View all</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 4 Tall Cards in 2x2 or 4x1 grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              {GLOW_FEATURE_CARDS.map((card) => (
                <div
                  key={card.id}
                  onClick={() => setPreviewModalProduct(card)}
                  className={`group cursor-pointer relative overflow-hidden rounded-2xl bg-gradient-to-b ${card.bgColor} p-3.5 flex flex-col justify-between h-56 md:h-64 border border-amber-200/50 shadow-sm hover:shadow-md transition-all duration-200`}
                >
                  {/* Product Image */}
                  <div className="w-full h-32 md:h-40 flex items-center justify-center overflow-hidden rounded-xl bg-white/70 backdrop-blur-xs p-2 group-hover:scale-105 transition-transform duration-300">
                    <img
                      src={card.image}
                      alt={card.title}
                      className="w-full h-full object-contain drop-shadow"
                    />
                  </div>

                  {/* Card Bottom Meta & Pill */}
                  <div className="text-center pt-2 space-y-1">
                    <div className="text-xs md:text-sm font-bold text-slate-900 truncate">
                      {card.title}
                    </div>
                    <div className="inline-block bg-white text-slate-900 font-extrabold text-[10px] md:text-[11px] px-3 py-1 rounded-full shadow-xs border border-slate-200/80">
                      {card.tag}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ============================================================== */}
          {/* SECTION 2: CATEGORY ICONS GRID ("Pamper your skin...") */}
          {/* ============================================================== */}
          <div className="space-y-3 bg-amber-50/40 -mx-3 md:mx-0 p-4 md:p-6 md:rounded-2xl border-y md:border border-yellow-200/60">
            <div className="space-y-1">
              <h3 className="text-lg md:text-xl font-extrabold text-slate-900 tracking-tight">
                Pamper your skin with our premium skincare essentials.
              </h3>
              <p className="text-xs text-slate-600 font-medium">
                Everything your skin needs to look fresh, healthy and radiant.
              </p>
            </div>

            {/* 4-column (or 6 on desktop) category cards grid matching Screenshot 1 */}
            <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-6 gap-2.5 md:gap-3.5 pt-2">
              {CATEGORY_GRID_ITEMS.map((cat, idx) => (
                <div
                  key={idx}
                  className="bg-white hover:bg-slate-50 border border-slate-200/80 rounded-2xl p-2.5 flex flex-col items-center text-center cursor-pointer shadow-2xs hover:shadow-sm active:scale-95 transition group"
                >
                  <div className="w-12 h-12 md:w-16 md:h-16 rounded-xl overflow-hidden bg-slate-50 flex items-center justify-center p-1 mb-1.5 group-hover:scale-105 transition-transform">
                    <img
                      src={cat.img}
                      alt={cat.name}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  </div>
                  <span className="text-[11px] md:text-xs font-semibold text-slate-800 line-clamp-1">
                    {cat.name}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ============================================================== */}
          {/* SECTION 3: FRESH GROCERY & PRODUCT CAROUSEL (Screenshot 2 & 3) */}
          {/* ============================================================== */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                  FARM FRESH DIRECT
                </span>
                <h3 className="text-lg md:text-xl font-extrabold text-slate-900 tracking-tight mt-1">
                  Fresh Grocery & Daily Veggies
                </h3>
              </div>
              <button className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1">
                <span>View more</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Horizontal Product Cards Grid matching Screenshot 2 */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4">
              {FRESH_VEGGIES_ITEMS.map((item) => {
                const count = quickCartCount[item.id] || 0;
                const isLiked = likedItems[item.id] || false;

                return (
                  <div
                    key={item.id}
                    className="bg-white border border-slate-200/80 rounded-2xl p-3 flex flex-col justify-between shadow-2xs hover:shadow-md transition relative group"
                  >
                    {/* Discount badge top-left */}
                    <div className="absolute top-2.5 left-2.5 bg-emerald-600 text-white font-extrabold text-[10px] px-2 py-0.5 rounded-md shadow-xs z-10">
                      {item.discount}
                    </div>

                    {/* Action icons top-right (heart + eye) */}
                    <div className="absolute top-2.5 right-2.5 flex flex-col gap-1 z-10">
                      <button
                        onClick={() => toggleDemoHeart(item.id)}
                        className={`p-1.5 rounded-full bg-white/90 backdrop-blur-xs border border-slate-200/60 shadow-2xs transition ${
                          isLiked ? 'text-red-500 fill-red-500' : 'text-slate-400 hover:text-slate-700'
                        }`}
                      >
                        <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-red-500' : ''}`} />
                      </button>
                      <button
                        onClick={() => setPreviewModalProduct(item)}
                        className="p-1.5 rounded-full bg-white/90 backdrop-blur-xs border border-slate-200/60 shadow-2xs text-slate-400 hover:text-slate-700 transition"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Image Area */}
                    <div className="w-full h-32 md:h-36 rounded-xl bg-amber-50/50 flex items-center justify-center p-2 mb-2 overflow-hidden">
                      <img
                        src={item.image}
                        alt={item.title}
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-200"
                      />
                    </div>

                    {/* Delivery Time Badge matching Screenshot */}
                    <div className="flex items-center gap-1 text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md w-fit mb-1.5">
                      <Clock className="w-3 h-3 text-emerald-600" />
                      <span>{item.deliveryTime}</span>
                    </div>

                    {/* Product Title & Category */}
                    <div className="space-y-0.5 mb-2">
                      <div className="text-[10px] uppercase font-bold text-slate-400">
                        {item.category}
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 line-clamp-1">
                        {item.title}
                      </h4>
                      <div className="text-[10px] text-slate-500 font-medium">
                        {item.weight}
                      </div>
                    </div>

                    {/* Price & Add Button */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                      <div>
                        <div className="text-xs md:text-sm font-black text-slate-900">
                          ₹{item.price}
                        </div>
                        <div className="text-[10px] text-slate-400 line-through">
                          ₹{item.originalPrice}
                        </div>
                      </div>

                      {/* Add Button with green border & state */}
                      {count === 0 ? (
                        <button
                          onClick={() => handleItemCountChange(item.id, 1)}
                          className="px-3 py-1 bg-white hover:bg-emerald-50 text-emerald-700 font-extrabold text-xs rounded-lg border border-emerald-600 active:scale-95 shadow-2xs transition"
                        >
                          + Add
                        </button>
                      ) : (
                        <div className="flex items-center bg-emerald-600 text-white rounded-lg px-2 py-0.5 shadow-xs font-bold text-xs gap-2">
                          <button
                            onClick={() => handleItemCountChange(item.id, -1)}
                            className="text-sm leading-none px-0.5 active:scale-90"
                          >
                            -
                          </button>
                          <span>{count}</span>
                          <button
                            onClick={() => handleItemCountChange(item.id, 1)}
                            className="text-sm leading-none px-0.5 active:scale-90"
                          >
                            +
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ============================================================== */}
          {/* SECTION 4: SKINCARE ESSENTIALS (4 TALL CARDS) (Screenshot 3) */}
          {/* ============================================================== */}
          <div className="space-y-3">
            <div className="space-y-0.5">
              <h3 className="text-lg md:text-xl font-extrabold text-slate-900 tracking-tight">
                Skincare Essentials
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Pamper your skin with top skincare products at great prices.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              {SKINCARE_FEATURE_CARDS.map((card) => (
                <div
                  key={card.id}
                  className={`group relative overflow-hidden rounded-2xl bg-gradient-to-b ${card.bgColor} p-3.5 flex flex-col justify-between h-52 md:h-60 border border-slate-200/60 shadow-2xs hover:shadow-md transition`}
                >
                  <div className="w-full h-32 md:h-36 rounded-xl bg-white/70 p-2 flex items-center justify-center overflow-hidden">
                    <img
                      src={card.image}
                      alt={card.title}
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                    />
                  </div>
                  <div className="text-center pt-2 space-y-1">
                    <div className="text-xs md:text-sm font-bold text-slate-900">
                      {card.title}
                    </div>
                    <div className="inline-block bg-white text-slate-900 font-black text-[10px] md:text-[11px] px-3 py-0.5 rounded-full shadow-xs border border-slate-200">
                      {card.tag}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ============================================================== */}
          {/* SECTION 5: SAVER PACKS (RICE, DAL & MORE) (Screenshot 2 & 3) */}
          {/* ============================================================== */}
          <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-teal-500 via-emerald-600 to-teal-700 text-white p-4 md:p-6 flex items-center justify-between shadow-md">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded">
                BULK SAVINGS
              </span>
              <h3 className="text-xl md:text-2xl font-black mt-1">
                Saver packs <br />
                <span className="text-yellow-300">Rice, dal & more</span>
              </h3>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-emerald-100 block">From</span>
                <span className="text-2xl md:text-3xl font-black text-yellow-300">₹49</span>
              </div>
              <div className="w-10 h-10 rounded-full bg-white text-emerald-700 flex items-center justify-center font-bold shadow-md">
                <ArrowRight className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Staples Product Cards Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
            {STAPLES_ITEMS.map((item) => {
              const count = quickCartCount[item.id] || 0;
              return (
                <div
                  key={item.id}
                  className="bg-white border border-slate-200/80 rounded-2xl p-3 flex flex-col justify-between shadow-2xs hover:shadow-sm"
                >
                  <div className="flex gap-3">
                    <div className="w-20 h-20 rounded-xl bg-slate-50 p-1 shrink-0 overflow-hidden">
                      <img
                        src={item.image}
                        alt={item.title}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] font-extrabold uppercase text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                        {item.discount}
                      </span>
                      <h4 className="text-xs font-bold text-slate-900 line-clamp-2">
                        {item.title}
                      </h4>
                      <div className="text-[10px] text-slate-500 font-medium">
                        ⏱️ {item.deliveryTime}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-100">
                    <div>
                      <span className="text-xs md:text-sm font-black text-slate-900">
                        ₹{item.price.toFixed(2)}
                      </span>
                      <span className="text-[10px] text-slate-400 line-through ml-1.5">
                        ₹{item.originalPrice.toFixed(2)}
                      </span>
                    </div>

                    {count === 0 ? (
                      <button
                        onClick={() => handleItemCountChange(item.id, 1)}
                        className="px-3 py-1 bg-white hover:bg-emerald-50 text-emerald-700 font-extrabold text-xs rounded-lg border border-emerald-600 transition"
                      >
                        + Add
                      </button>
                    ) : (
                      <div className="flex items-center bg-emerald-600 text-white rounded-lg px-2 py-0.5 font-bold text-xs gap-2">
                        <button onClick={() => handleItemCountChange(item.id, -1)}>-</button>
                        <span>{count}</span>
                        <button onClick={() => handleItemCountChange(item.id, 1)}>+</button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ============================================================== */}
          {/* SECTION 6: "Explore Toys by Brand" (Screenshot 2) */}
          {/* ============================================================== */}
          <div className="space-y-3">
            <div className="space-y-0.5">
              <h3 className="text-lg md:text-xl font-extrabold text-slate-900 tracking-tight">
                Explore Toys by Brand
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Discover popular toy brands kids love for fun & learning.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 md:gap-3">
              {BRAND_CARDS.map((brand, idx) => (
                <div
                  key={idx}
                  className={`h-24 md:h-28 rounded-2xl ${brand.bg} border ${brand.border} p-3 flex flex-col items-center justify-center text-center cursor-pointer shadow-2xs hover:shadow-md transition active:scale-95`}
                >
                  <span className={`text-sm md:text-base tracking-wide font-black ${brand.color}`}>
                    {brand.name}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-1 font-medium">
                    Official Store
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ============================================================== */}
          {/* SECTION 7: DUAL VALUE PROPOSITION BANNERS (Screenshot 2) */}
          {/* ============================================================== */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
            {/* Banner 1: Free Delivery */}
            <div className="bg-gradient-to-r from-emerald-100 via-green-50 to-emerald-200/60 rounded-2xl p-4 md:p-5 border border-emerald-200 flex items-center justify-between">
              <div className="space-y-1">
                <div className="text-xl md:text-2xl font-black text-emerald-800 leading-none">
                  FREE <br />
                  <span className="text-slate-900">delivery at ₹99</span>
                </div>
                <p className="text-[11px] text-emerald-700 font-medium">
                  Lightning speed to your doorstep
                </p>
              </div>
              <div className="text-4xl md:text-5xl">🛵</div>
            </div>

            {/* Banner 2: Zero Platform Fee */}
            <div className="bg-gradient-to-r from-yellow-100 via-amber-50 to-yellow-200/60 rounded-2xl p-4 md:p-5 border border-yellow-200 flex items-center justify-between">
              <div className="space-y-1">
                <div className="text-xl md:text-2xl font-black text-amber-900 leading-none">
                  ZERO <br />
                  <span className="text-slate-900">Platform fee</span>
                </div>
                <p className="text-[11px] text-amber-700 font-medium">
                  Pay only for what you buy
                </p>
              </div>
              <div className="text-4xl md:text-5xl">🎁</div>
            </div>
          </div>

          {/* ============================================================== */}
          {/* SECTION 8: PROTEIN & NUTS BANNER (Screenshot 2) */}
          {/* ============================================================== */}
          <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-amber-50 via-orange-50 to-amber-100 border border-amber-200/70 p-5 md:p-7 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="space-y-2 text-left">
              <span className="text-[10px] font-black uppercase text-amber-800 bg-amber-200/70 px-2 py-0.5 rounded-full">
                WELLNESS ESSENTIALS
              </span>
              <h3 className="text-xl md:text-2xl font-black text-slate-900 leading-tight">
                PROTEIN & NUTS <br />
                <span className="text-amber-800 font-extrabold text-sm md:text-base">
                  Fuel Your Day. Nourish Your Body.
                </span>
              </h3>
              <div className="flex items-center gap-4 text-[10px] md:text-xs font-semibold text-slate-700 pt-1">
                <span>🍃 High in Protein</span>
                <span>⚡ Builds Strength</span>
                <span>💪 Sustained Energy</span>
              </div>
            </div>

            <div className="w-full md:w-56 h-28 md:h-36 rounded-xl overflow-hidden bg-white/70 p-2 shrink-0">
              <img
                src="https://images.unsplash.com/photo-1508061257976-f7536b19aa18?w=500&auto=format&fit=crop&q=80"
                alt="Almonds & Protein"
                className="w-full h-full object-cover rounded-lg"
              />
            </div>
          </div>

          {/* ============================================================== */}
          {/* SECTION 9: APP DOWNLOAD BANNER (Screenshot 2) */}
          {/* ============================================================== */}
          <div className="rounded-2xl bg-emerald-700 text-white p-5 md:p-7 flex flex-col sm:flex-row items-center justify-between gap-5 shadow-lg">
            <div className="space-y-2 text-center sm:text-left">
              <span className="bg-white/20 text-white font-extrabold text-[10px] uppercase px-2.5 py-0.5 rounded-full">
                SHOP ON THE GO
              </span>
              <h3 className="text-xl md:text-2xl font-black">
                Available on Android & iOS
              </h3>
              <p className="text-xs text-emerald-100 max-w-sm">
                Download the Shop India app today and enjoy a faster, smarter shopping experience with exclusive mobile coupons.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button className="bg-black hover:bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-md">
                <span>Google Play</span>
              </button>
              <button className="bg-black hover:bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-md">
                <span>App Store</span>
              </button>
            </div>
          </div>

          {/* ============================================================== */}
          {/* FOOTER ACCORDIONS & LINKS (Screenshot 2 Dark Footer) */}
          {/* ============================================================== */}
          <footer className="rounded-2xl bg-slate-950 text-slate-300 p-6 md:p-8 space-y-6 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="space-y-2.5">
                <h4 className="text-sm font-extrabold text-white uppercase tracking-wider">About Us</h4>
                <ul className="space-y-1.5 text-slate-400">
                  <li className="hover:text-white cursor-pointer transition">› Terms & Conditions</li>
                  <li className="hover:text-white cursor-pointer transition">› Privacy & Policy</li>
                  <li className="hover:text-white cursor-pointer transition">› Blogs</li>
                  <li className="hover:text-white cursor-pointer transition">› FAQs</li>
                </ul>
              </div>

              <div className="space-y-2.5">
                <h4 className="text-sm font-extrabold text-white uppercase tracking-wider">My Account</h4>
                <ul className="space-y-1.5 text-slate-400">
                  <li className="hover:text-white cursor-pointer transition">› Return & Exchanges Policy</li>
                  <li className="hover:text-white cursor-pointer transition">› Shipping Policy</li>
                  <li className="hover:text-white cursor-pointer transition">› Cancellation Policy</li>
                  <li className="hover:text-white cursor-pointer transition">› Order Tracking</li>
                </ul>
              </div>

              <div className="space-y-2.5">
                <h4 className="text-sm font-extrabold text-white uppercase tracking-wider">Get in touch</h4>
                <div className="space-y-2 text-slate-400">
                  <div className="flex items-center gap-2">
                    <span>📍</span>
                    <span>Bengaluru, Karnataka, India</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>📞</span>
                    <span className="font-semibold text-white">+91 94335 22491</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>✉️</span>
                    <span>support@shopindia.in</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-500 text-[11px]">
              <div>
                © 2026 Shop India Quick. Design demo inspired by reference screenshots.
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span className="text-emerald-400 font-semibold">Demo Sandbox Active</span>
              </div>
            </div>
          </footer>
        </div>

        {/* ============================================================== */}
        {/* MOBILE BOTTOM NAVIGATION BAR (Screenshots 1 & 4) */}
        {/* ============================================================== */}
        <div className="sticky bottom-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-6 py-2.5 flex items-center justify-around shadow-lg">
          <button className="flex flex-col items-center gap-0.5 text-emerald-600 font-bold">
            <span className="text-lg">🏠</span>
            <span className="text-[11px]">Home</span>
          </button>
          <button className="flex flex-col items-center gap-0.5 text-slate-500 hover:text-slate-800">
            <span className="text-lg">🗂️</span>
            <span className="text-[11px]">Categories</span>
          </button>
          <button className="flex flex-col items-center gap-0.5 text-slate-500 hover:text-slate-800 relative">
            <span className="text-lg">🛒</span>
            {totalCartCount > 0 && (
              <span className="absolute -top-1 -right-2 bg-emerald-600 text-white font-extrabold text-[9px] w-4 h-4 rounded-full flex items-center justify-center">
                {totalCartCount}
              </span>
            )}
            <span className="text-[11px]">Cart</span>
          </button>
          <button className="flex flex-col items-center gap-0.5 text-slate-500 hover:text-slate-800">
            <span className="text-lg">👤</span>
            <span className="text-[11px]">Login</span>
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* QUICK PREVIEW MODAL */}
      {/* ============================================================== */}
      {previewModalProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setPreviewModalProduct(null)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-full h-48 rounded-2xl bg-amber-50/50 p-2 flex items-center justify-center overflow-hidden">
              <img
                src={previewModalProduct.image}
                alt={previewModalProduct.title}
                className="w-full h-full object-contain"
              />
            </div>

            <div className="space-y-1">
              <div className="text-[11px] font-bold uppercase text-emerald-700">
                {previewModalProduct.category || 'Quick Commerce'}
              </div>
              <h3 className="text-base font-extrabold text-slate-900">
                {previewModalProduct.title}
              </h3>
              {previewModalProduct.subtitle && (
                <p className="text-xs text-slate-500">{previewModalProduct.subtitle}</p>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              {previewModalProduct.price ? (
                <div>
                  <div className="text-base font-black text-slate-900">
                    ₹{previewModalProduct.price}
                  </div>
                  {previewModalProduct.originalPrice && (
                    <div className="text-xs text-slate-400 line-through">
                      ₹{previewModalProduct.originalPrice}
                    </div>
                  )}
                </div>
              ) : (
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                  Special Collection
                </span>
              )}

              <button
                onClick={() => {
                  if (previewModalProduct.id) {
                    handleItemCountChange(previewModalProduct.id, 1);
                  }
                  setPreviewModalProduct(null);
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-2 rounded-xl shadow-sm active:scale-95 transition"
              >
                Add to Cart
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
