import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { useCustomer } from '../../context/CustomerContext';

import { useProducts } from '../../hooks/useProducts';
import { useCategories } from '../../hooks/useCategories';
import { Star, Award, Heart, ChevronLeft, ChevronRight, Clock, ShoppingCart, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../lib/api';
import { requireCustomerAuth } from '../../lib/customerAuth';

const BRAND_LOGOS: Record<string, string> = {
  'Apple': 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/apple.svg',
  'Samsung': 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/samsung.svg',
  'boAt': 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 40"><text x="50" y="27" fill="%23E11D48" font-family="Arial,sans-serif" font-weight="900" font-style="italic" font-size="22" text-anchor="middle">bo<tspan fill="%23111827">A</tspan>t</text></svg>',
  'OnePlus': 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/oneplus.svg',
  'Levi’s': 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 40"><path fill="%23C41230" d="M0 0h100v28c-12 8-28 12-50 12s-38-4-50-12V0z"/><text x="50" y="24" fill="white" font-family="Arial,sans-serif" font-weight="900" font-size="16" text-anchor="middle" letter-spacing="1">LEVI%27S</text></svg>',
  "Levi's": 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 40"><path fill="%23C41230" d="M0 0h100v28c-12 8-28 12-50 12s-38-4-50-12V0z"/><text x="50" y="24" fill="white" font-family="Arial,sans-serif" font-weight="900" font-size="16" text-anchor="middle" letter-spacing="1">LEVI%27S</text></svg>',
  'Nike': 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/nike.svg',
  'Sony': 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/sony.svg',
  'Puma': 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/puma.svg',
  'Wildcraft': 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 40"><text x="60" y="26" fill="%23D97706" font-family="Arial,sans-serif" font-weight="900" font-size="15" text-anchor="middle" letter-spacing="1.5">WILDCRAFT</text></svg>',
  'LEGO': 'https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/lego.svg',
  'Voltas': 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 40"><text x="50" y="26" fill="%230284C7" font-family="Arial,sans-serif" font-weight="900" font-size="17" text-anchor="middle" letter-spacing="2">VOLTAS</text></svg>',
};

export const VerticalShop: React.FC = () => {
  const { navigateTo, setSearchQuery, addToCart } = useApp();
  const { wishlist, toggleWishlist: customerToggleWishlist } = useCustomer();
  const { products, loading: productsLoading } = useProducts();
  const { categories } = useCategories();
  const [timeLeft, setTimeLeft] = useState({ hours: 14, minutes: 32, seconds: 45 });
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isHoveringCarousel, setIsHoveringCarousel] = useState(false);
  const [banners, setBanners] = useState<any[]>([]);

  const CURATED_DEFAULT_BRANDS = ['Apple', 'Samsung', 'boAt', 'OnePlus', 'Levi’s', 'Nike', 'Sony', 'Puma'];

  useEffect(() => {
    api.get<{ banners: any[] }>('/api/banners')
      .then(d => {
        const filtered = (d.banners || []).filter((b: any) => b.vertical === 'shop');
        if (filtered.length > 0) setBanners(filtered);
        else {
          setBanners([
            {
              id: 'b-default-1',
              title: 'Flagship Electronics & Gadgets',
              subtitle: 'Discover cutting-edge smartphones, wireless audio, and premium accessories.',
              image: 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?auto=format&fit=crop&w=1800&q=80',
              vertical: 'shop'
            },
            {
              id: 'b-default-2',
              title: 'Curated Fashion & Lifestyle',
              subtitle: 'Top-tier wardrobe essentials delivered directly to your doorstep.',
              image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1800&q=80',
              vertical: 'shop'
            }
          ]);
        }
      })
      .catch(() => {
        setBanners([
          {
            id: 'b-default-1',
            title: 'Flagship Electronics & Gadgets',
            subtitle: 'Discover cutting-edge smartphones, wireless audio, and premium accessories.',
            image: 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?auto=format&fit=crop&w=1800&q=80',
            vertical: 'shop'
          }
        ]);
      });
  }, []);

  // Filter products for this vertical
  const shopProducts = products.filter(p => p.vertical === 'shop');

  // Dynamic sections
  const topBrands = React.useMemo(() => {
    const live = Array.from(new Set(shopProducts.map(p => p.brand))).filter(Boolean) as string[];
    const combined = Array.from(new Set([...live, ...CURATED_DEFAULT_BRANDS]));
    return combined.slice(0, 8);
  }, [shopProducts]);

  const justForYou = shopProducts.length > 5 ? shopProducts.slice().sort(() => 0.5 - Math.random()).slice(0, 6) : shopProducts.slice(0, 6);

  // Autoplay for Hero Carousel
  useEffect(() => {
    if (isHoveringCarousel || banners.length === 0) return;
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % banners.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [isHoveringCarousel, banners.length]);

  // Deals countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { hours: prev.hours, minutes: prev.minutes - 1, seconds: 59 };
        } else if (prev.hours > 0) {
          return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        } else {
          return { hours: 23, minutes: 59, seconds: 59 }; // reset
        }
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatNumber = (num: number) => String(num).padStart(2, '0');

  const toggleWishlist = (productId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    customerToggleWishlist(productId);
  };

  // Real dynamic categories matching products for Shop vertical
  const populatedCategories = React.useMemo(() => {
    const fromApi = categories
      .filter(cat => (cat.vertical || '').toLowerCase() === 'shop' && cat.isActive !== false)
      .map(category => {
        const categoryProducts = shopProducts.filter(p => {
          if ((p as any).categoryId && (p as any).categoryId === category.id) return true;
          const pCat = (p.category || '').toLowerCase().trim();
          const catName = (category.name || '').toLowerCase().trim();
          const catSlug = (category.slug || '').toLowerCase().trim();
          return pCat === catName || pCat === catSlug || (p.tags && p.tags.includes(category.name));
        });
        return {
          id: category.id,
          name: category.name,
          image: category.image || (categoryProducts[0]?.image ?? ''),
          products: categoryProducts
        };
      })
      .filter(c => c.products.length > 0);

    if (fromApi.length > 0) return fromApi;

    // Fallback: If not linked by category ID, dynamically group active products by product.category
    const map = new Map<string, typeof shopProducts>();
    for (const p of shopProducts) {
      const cName = p.category || 'Trending Collections';
      if (!map.has(cName)) map.set(cName, []);
      map.get(cName)!.push(p);
    }

    return Array.from(map.entries()).map(([name, prods], idx) => ({
      id: `dyn-cat-${idx}`,
      name,
      image: prods[0]?.image || '',
      products: prods
    }));
  }, [categories, shopProducts]);

  const displayShopCategories = React.useMemo(() => {
    const adminShopCats = categories.filter(cat => (cat.vertical || '').toLowerCase() === 'shop' && cat.isActive !== false);
    if (adminShopCats.length > 0) return adminShopCats;
    return populatedCategories.map(c => ({
      id: c.id,
      name: c.name,
      image: c.image,
      vertical: 'shop'
    }));
  }, [categories, populatedCategories]);

  // Horizontal scroll container reference for deals
  const dealsScrollRef = useRef<HTMLDivElement>(null);

  const scrollDeals = (direction: 'left' | 'right') => {
    if (dealsScrollRef.current) {
      const scrollAmount = 400;
      dealsScrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="w-full py-10 px-6 md:px-12 xl:px-16 bg-brand-bg min-h-screen text-brand-graphite font-sans transition-colors duration-300">
      <div className="max-w-[1440px] mx-auto w-full flex flex-col gap-16">

        {/* Categories Bar (Horizontal Scrollable, dynamically sensed from database) */}
        <div className="w-full flex justify-center border-b border-brand-border/40 pb-8 overflow-hidden select-none">
          <div className="flex items-center gap-12 overflow-x-auto no-scrollbar py-4 max-w-full px-4 scroll-smooth scrollbar-none">
            {displayShopCategories.map(cat => (
              <div
                key={cat.id}
                onClick={() => {
                  setSearchQuery(cat.name);
                  navigateTo('search');
                }}
                className="flex flex-col items-center cursor-pointer group text-center shrink-0 px-2 py-1 rounded-card hover:bg-slate-50/40 transition-colors duration-300"
              >
                <div className="w-28 h-28 rounded-full overflow-hidden mb-3 flex items-center justify-center bg-white border border-brand-border/80 shadow-soft group-hover:scale-[1.04] group-hover:shadow-premium group-hover:border-brand-blue/30 transition-all duration-300">
                  <img
                    src={cat.image || undefined}
                    alt={cat.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                  />
                </div>
                <span className="text-sm font-extrabold text-brand-slate group-hover:text-brand-blue transition-colors duration-300 whitespace-nowrap tracking-wide mt-1 font-heading">
                  {cat.name}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 1. Hero Banner Carousel (Redesigned from Scratch with Apple-like typography & progress indicator dots) */}
        <div
          className="w-full h-[260px] md:h-[320px] lg:h-[380px] rounded-hero overflow-hidden shadow-premium relative bg-zinc-950 group"
          onMouseEnter={() => setIsHoveringCarousel(true)}
          onMouseLeave={() => setIsHoveringCarousel(false)}
        >
          {banners.length > 0 ? (
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSlide}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="absolute inset-0 w-full h-full"
              >
                {/* Main Image */}
                <img
                  src={banners[currentSlide]?.image}
                  alt={banners[currentSlide]?.title}
                  className="absolute inset-0 w-full h-full object-cover object-center select-none"
                />

                {/* Text Overlay */}
                <div className="absolute inset-y-0 left-0 pl-10 md:pl-20 flex flex-col justify-center max-w-xl z-10 text-left text-white select-none drop-shadow-md">
                  <motion.span
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                    className="bg-brand-orange/90 text-xs font-bold uppercase px-3 py-1 rounded-sm w-max tracking-widest mb-5 shadow-soft"
                  >
                    Exclusive Launch
                  </motion.span>
                  <motion.h2
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.6 }}
                    className="text-4xl font-bold tracking-tight mb-3 font-heading leading-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.4)]"
                  >
                    {banners[currentSlide]?.title}
                  </motion.h2>
                  <motion.p
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 0.6 }}
                    className="text-sm font-medium text-zinc-100 mb-8 leading-relaxed max-w-md drop-shadow-md"
                  >
                    {banners[currentSlide]?.subtitle}
                  </motion.p>

                  <motion.button
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5, duration: 0.4 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigateTo('search')}
                    className="group px-8 py-3.5 bg-white text-zinc-950 rounded-full font-bold text-xs tracking-wider shadow-[0_8px_20px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_25px_rgba(255,255,255,0.2)] hover:bg-zinc-50 transition-all w-max uppercase flex items-center gap-2.5"
                  >
                    <span>Shop Collection</span>
                    <span className="text-brand-orange group-hover:translate-x-1 transition-transform">→</span>
                  </motion.button>
                </div>
              </motion.div>
            </AnimatePresence>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-zinc-500 text-sm bg-[#FAF9F6]">Loading promotions...</div>
          )}

          {/* Carousel Prev/Next Arrows (Elegant & unobtrusive) */}
          {banners.length > 0 && (
            <>
              <button
                onClick={() => setCurrentSlide(prev => (prev - 1 + banners.length) % banners.length)}
                className="absolute left-6 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/10 hover:bg-black/25 text-white/90 flex items-center justify-center backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all duration-300 active:scale-90"
                aria-label="Previous Slide"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setCurrentSlide(prev => (prev + 1) % banners.length)}
                className="absolute right-6 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/10 hover:bg-black/25 text-white/90 flex items-center justify-center backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all duration-300 active:scale-90"
                aria-label="Next Slide"
              >
                <ChevronRight size={16} />
              </button>

              {/* Progress Navigation Dots (Apple style line indicators) */}
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2.5 z-20">
                {banners.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentSlide(idx)}
                    className="group relative focus:outline-none"
                    aria-label={`Go to slide ${idx + 1}`}
                  >
                    <span className={`block h-1 rounded-full transition-all duration-500 ${currentSlide === idx ? 'w-8 bg-white' : 'w-2 bg-white/40 group-hover:bg-white/70'
                      }`} />
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Top Brands Grid (Full width responsive balanced layout with real brand logos) */}
        {topBrands.length > 0 && (
          <div className="w-full bg-white rounded-card shadow-premium border border-brand-border p-6 select-none flex flex-col gap-5">
            <div className="flex justify-between items-center px-1">
              <div className="flex items-center gap-2">
                <span className="h-4 w-1 bg-brand-blue rounded-full"></span>
                <h3 className="text-xs font-bold tracking-wider text-brand-graphite uppercase font-heading">Explore Top Brands</h3>
              </div>
              <button
                onClick={() => { setSearchQuery(''); navigateTo('search'); }}
                className="text-xs font-bold text-brand-blue hover:text-blue-700 transition-colors uppercase tracking-wider"
              >
                View All Brands
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3.5">
              {topBrands.map(brand => {
                const logoUrl = BRAND_LOGOS[brand];
                return (
                  <div
                    key={brand}
                    onClick={() => { setSearchQuery(brand); navigateTo('search'); }}
                    className="h-20 rounded-xl border border-brand-border/80 bg-slate-50/70 hover:bg-white hover:border-brand-blue/40 flex flex-col items-center justify-center cursor-pointer hover:shadow-soft transition-all group px-2 text-center active:scale-95 gap-1.5"
                  >
                    <div className="h-7 w-full flex items-center justify-center px-2">
                      {logoUrl ? (
                        <img
                          src={logoUrl}
                          alt={brand}
                          onError={(e) => {
                            // If external image fails, hide image and show text badge
                            e.currentTarget.style.display = 'none';
                            const fallback = e.currentTarget.parentElement?.querySelector('.brand-fallback');
                            if (fallback) (fallback as HTMLElement).style.display = 'block';
                          }}
                          className="max-h-full max-w-[75px] object-contain transition-transform group-hover:scale-105"
                        />
                      ) : null}
                      <span className={`brand-fallback font-extrabold text-xs text-brand-graphite ${logoUrl ? 'hidden' : 'block'}`}>{brand}</span>
                    </div>
                    <span className="font-bold text-[10.5px] text-slate-500 group-hover:text-brand-blue transition-colors line-clamp-1">
                      {brand}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Just For You (Full-width responsive product grid) */}
        {justForYou.length > 0 && (
          <div className="w-full flex flex-col gap-4">
            <div className="flex justify-between items-center px-1">
              <div className="flex items-center gap-2">
                <span className="h-4 w-1 bg-brand-orange rounded-full"></span>
                <h3 className="text-xs font-bold tracking-wider text-brand-graphite uppercase font-heading">Just For You</h3>
              </div>
              <button
                onClick={() => { setSearchQuery(''); navigateTo('search'); }}
                className="text-xs font-bold text-brand-blue hover:text-blue-700 transition-colors uppercase tracking-wider"
              >
                See More Recommendations
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 w-full">
              {justForYou.map(product => {
                const discount = Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);
                const isWishlisted = wishlist.includes(product.id);
                return (
                  <div
                    key={'jfy-' + product.id}
                    onClick={() => navigateTo('detail', product.id)}
                    className="w-full min-h-[355px] border border-brand-border/70 rounded-2xl flex flex-col justify-between bg-white p-3 hover:shadow-hover-lift hover:border-brand-blue/40 transition-all duration-300 cursor-pointer group relative shadow-soft"
                  >
                    {/* Wishlist Heart */}
                    <motion.button
                      whileTap={{ scale: 0.8 }}
                      onClick={(e) => toggleWishlist(product.id, e)}
                      className="absolute top-4 right-4 p-1.5 rounded-full bg-white/90 hover:bg-white text-zinc-400 hover:text-brand-red shadow-soft border border-brand-border/60 transition-colors z-10"
                    >
                      <Heart size={12} className={isWishlisted ? "fill-brand-red text-brand-red" : ""} />
                    </motion.button>

                    {/* Uniform Image Frame */}
                    <div className="w-full h-[140px] flex items-center justify-center bg-slate-50/80 rounded-xl p-3 relative overflow-hidden mb-2 border border-slate-100">
                      <img
                        src={product.image}
                        alt={product.title}
                        className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-500 ease-out mix-blend-multiply"
                      />
                      {product.isAssured && (
                        <div className="absolute bottom-2 left-2 flex items-center gap-0.5 bg-white/95 text-[9px] font-black italic px-1.5 py-0.5 rounded shadow-sm border border-brand-blue/10">
                          <span className="text-brand-blue">Shop</span><span className="text-brand-orange">Assured</span>
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex flex-col flex-1 justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-brand-graphite line-clamp-2 leading-snug group-hover:text-brand-blue transition-colors font-heading min-h-[32px]">
                          {product.title}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-1.5 leading-none font-numbers">
                          <div className="flex items-center gap-0.5 bg-emerald-50 border border-emerald-200/60 text-emerald-700 font-extrabold text-[10px] px-1.5 py-0.5 rounded">
                            <span>{product.rating}</span>
                            <Star size={7} className="fill-emerald-700 text-emerald-700" />
                          </div>
                          <span className="text-[10px] text-slate-400 font-bold">({product.ratingCount.toLocaleString('en-IN')})</span>
                        </div>
                      </div>

                      {/* Price and Discount */}
                      <div className="pt-2 border-t border-brand-border/50 flex items-baseline justify-between font-numbers leading-none mt-2">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-sm font-extrabold text-brand-graphite">₹{product.price.toLocaleString('en-IN')}</span>
                          {product.originalPrice > product.price && (
                            <span className="text-[10.5px] text-slate-400 line-through">₹{product.originalPrice.toLocaleString('en-IN')}</span>
                          )}
                        </div>
                        {product.originalPrice > product.price && (
                          <span className="text-[9.5px] font-black text-brand-orange uppercase">{discount}% OFF</span>
                        )}
                      </div>

                      {/* Action buttons: Add to Cart and Buy Now */}
                      <div className="grid grid-cols-2 gap-1.5 mt-2.5 pt-2 border-t border-brand-border/40">
                        <motion.button
                          whileTap={{ scale: 0.94 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            addToCart(product);
                          }}
                          className="py-1.5 px-1.5 rounded-lg bg-orange-50 hover:bg-orange-100 border border-brand-orange/30 text-brand-orange font-extrabold text-[11px] flex items-center justify-center gap-1 shadow-xs transition-colors"
                          title="Add to Cart"
                        >
                          <ShoppingCart size={11} className="text-brand-orange shrink-0" />
                          <span>Add</span>
                        </motion.button>
                        <motion.button
                          whileTap={{ scale: 0.94 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!requireCustomerAuth('buy this product')) return;
                            addToCart(product);
                            navigateTo('cart');
                          }}
                          className="py-1.5 px-1.5 rounded-lg bg-brand-blue hover:bg-blue-700 text-white font-extrabold text-[11px] flex items-center justify-center gap-1 shadow-xs transition-colors"
                          title="Buy Now"
                        >
                          <Zap size={11} className="fill-amber-400 text-amber-400 shrink-0" />
                          <span>Buy</span>
                        </motion.button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 2. Deals of the Day (Polished details, luxury monospaced countdown timer, horizontal carousel buttons) */}
        <div className="w-full bg-white rounded-card flex flex-col md:flex-row shadow-premium overflow-hidden border border-brand-border relative">
          {/* Left Side: Editorial timer and badge */}
          <div
            className="w-full md:w-full max-w-[280px] p-8 border-b md:border-b-0 md:border-r border-brand-border flex flex-col items-center justify-center text-center shrink-0 bg-cover bg-bottom bg-no-repeat relative"
            style={{ backgroundImage: `linear-gradient(to top, rgba(255,255,255,0.98), rgba(255,255,255,0.95)), url('https://images.unsplash.com/photo-1542838132-92c53300491e?w=300&auto=format')` }}
          >
            <div className="flex items-center gap-1.5 text-brand-orange bg-orange-50/80 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-3.5 border border-brand-orange/10">
              <Clock size={10} className="animate-spin-slow" />
              <span>Limited Offer</span>
            </div>
            <h3 className="text-sm font-bold mb-4 tracking-wider text-brand-graphite uppercase font-heading">Deals of the Day</h3>

            {/* Monospaced Digit blocks */}
            <div className="flex items-center gap-2 mb-7 font-numbers text-xs font-bold select-none">
              <div className="flex flex-col items-center">
                <span className="w-9 h-9 flex items-center justify-center bg-brand-graphite text-white rounded-sm shadow-soft text-sm font-bold leading-none">
                  {formatNumber(timeLeft.hours)}
                </span>
                <span className="text-[7.5px] uppercase font-bold tracking-wider text-brand-slate mt-1.5">Hours</span>
              </div>
              <span className="text-brand-slate font-bold mb-4">:</span>
              <div className="flex flex-col items-center">
                <span className="w-9 h-9 flex items-center justify-center bg-brand-graphite text-white rounded-sm shadow-soft text-sm font-bold leading-none">
                  {formatNumber(timeLeft.minutes)}
                </span>
                <span className="text-[7.5px] uppercase font-bold tracking-wider text-brand-slate mt-1.5">Mins</span>
              </div>
              <span className="text-brand-slate font-bold mb-4">:</span>
              <div className="flex flex-col items-center">
                <span className="w-9 h-9 flex items-center justify-center bg-brand-graphite text-white rounded-sm shadow-soft text-sm font-bold leading-none">
                  {formatNumber(timeLeft.seconds)}
                </span>
                <span className="text-[7.5px] uppercase font-bold tracking-wider text-brand-slate mt-1.5">Secs</span>
              </div>
            </div>

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => navigateTo('search')}
              className="px-6 py-2.5 bg-brand-blue hover:bg-blue-600 text-white font-bold text-xs tracking-wider rounded-button shadow-premium transition-colors uppercase"
            >
              Explore All Deals
            </motion.button>
          </div>

          {/* Right Side: Horizontal products list with slider arrows */}
          <div className="flex-1 relative flex items-center">
            {/* Scroll Navigation Arrows */}
            <button
              onClick={() => scrollDeals('left')}
              className="absolute left-3 w-8 h-8 rounded-full bg-white border border-brand-border/60 hover:border-brand-border shadow-soft flex items-center justify-center text-brand-slate hover:text-brand-graphite hover:scale-105 active:scale-95 transition-all z-10"
              aria-label="Scroll left"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => scrollDeals('right')}
              className="absolute right-3 w-8 h-8 rounded-full bg-white border border-brand-border/60 hover:border-brand-border shadow-soft flex items-center justify-center text-brand-slate hover:text-brand-graphite hover:scale-105 active:scale-95 transition-all z-10"
              aria-label="Scroll right"
            >
              <ChevronRight size={16} />
            </button>

            {/* Horizontal Grid Content */}
            <div
              ref={dealsScrollRef}
              className="w-full flex gap-6 overflow-x-auto p-8 scroll-smooth no-scrollbar"
            >
              {shopProducts.slice(0, 5).map(product => {
                const discount = Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);
                const isWishlisted = wishlist.includes(product.id);
                return (
                  <div
                    key={product.id}
                    onClick={() => navigateTo('detail', product.id)}
                    className="w-full max-w-[160px] flex-shrink-0 flex flex-col items-center text-center group cursor-pointer relative"
                  >
                    {/* Wishlist Heart Animation */}
                    <motion.button
                      whileTap={{ scale: 0.8 }}
                      onClick={(e) => toggleWishlist(product.id, e)}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-white/90 hover:bg-white text-zinc-400 hover:text-brand-red shadow-soft transition-colors z-10"
                    >
                      <Heart size={12} className={isWishlisted ? "fill-brand-red text-brand-red" : ""} />
                    </motion.button>

                    {/* Editorial zoom wrapper */}
                    <div className="w-full max-w-[120px] h-[120px] flex items-center justify-center mb-3 bg-slate-50/50 rounded-full p-4 relative overflow-hidden group-hover:bg-slate-100/50 transition-colors">
                      <img
                        src={product.image}
                        alt={product.title}
                        className="max-h-full max-w-full object-contain group-hover:scale-110 transition-transform duration-500 ease-out mix-blend-multiply"
                      />
                    </div>
                    <h4 className="text-xs font-semibold text-brand-graphite line-clamp-1 group-hover:text-brand-blue transition-colors px-2 leading-tight font-heading">
                      {product.title}
                    </h4>
                    <div className="flex items-center gap-1.5 mt-2 justify-center leading-none font-numbers text-xs">
                      <span className="font-semibold text-brand-graphite">₹{product.price.toLocaleString('en-IN')}</span>
                      {product.originalPrice > product.price && (
                        <span className="text-xs text-brand-slate line-through">₹{product.originalPrice.toLocaleString('en-IN')}</span>
                      )}
                    </div>
                    {product.originalPrice > product.price && (
                      <span className="text-xs text-brand-orange font-bold mt-2 bg-orange-50 border border-brand-orange/10 px-2.5 py-0.5 rounded-full uppercase tracking-wider font-numbers">
                        {discount}% OFF
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 3. Main Multi-Column Product Display Grids (Polished visual borders, shadows, image-zooms & consistent rhythm spacing) */}
        <div className="w-full grid grid-cols-1 lg:grid-cols-4 gap-8 text-left items-start select-none">

          {/* Left Column: Product Grid Sections (Span 3) */}
          <div className="col-span-1 lg:col-span-3 flex flex-col gap-10">

            {populatedCategories.length === 0 && (
              <div className="w-full bg-brand-card p-8 rounded-card shadow-premium text-center border border-brand-border text-brand-slate font-semibold text-sm">
                No products found in this vertical. Add some in the Vendor or Admin panel!
              </div>
            )}

            {populatedCategories.map((category) => {
              const categoryProducts = category.products;

              return (
                <div key={category.id} className="w-full bg-brand-card p-8 rounded-card shadow-premium flex flex-col gap-6 border border-brand-border">
                  <div className="flex justify-between items-center border-b border-brand-border pb-4 leading-none">
                    <div className="flex items-center gap-2.5">
                      <span className="h-4 w-1 bg-brand-blue rounded-full"></span>
                      <h3 className="text-xs font-semibold text-brand-graphite uppercase tracking-wider font-heading">
                        {category.name}
                      </h3>
                    </div>
                    <button
                      onClick={() => {
                        setSearchQuery(category.name);
                        navigateTo('search');
                      }}
                      className="text-xs font-semibold text-brand-blue hover:text-blue-600 transition-colors uppercase tracking-wider"
                    >
                      View All
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-6">
                    {productsLoading ? (
                      Array(3).fill(0).map((_, i) => (
                        <div key={i} className="border border-brand-border rounded-card p-6 flex flex-col bg-brand-card h-full relative">
                          <div className="w-full aspect-[5/4] bg-slate-100/80 rounded-card mb-4 animate-pulse"></div>
                          <div className="h-3.5 bg-slate-100/80 rounded w-3/4 mb-2.5 animate-pulse"></div>
                          <div className="h-3.5 bg-slate-100/80 rounded w-1/2 mb-4 animate-pulse"></div>

                          <div className="flex items-center gap-2 mb-4 mt-auto">
                            <div className="h-3 w-8 bg-slate-100/80 rounded animate-pulse"></div>
                            <div className="h-3 w-16 bg-slate-100/80 rounded animate-pulse"></div>
                          </div>

                          <div className="flex items-center justify-between mt-1">
                            <div className="flex flex-col gap-1.5 w-1/2">
                              <div className="h-4 w-3/4 bg-slate-100/80 rounded animate-pulse"></div>
                              <div className="h-3 w-1/2 bg-slate-100/80 rounded-full animate-pulse"></div>
                            </div>
                            <div className="h-8 w-8 rounded-full bg-slate-100/80 animate-pulse"></div>
                          </div>
                        </div>
                      ))
                    ) : (
                      categoryProducts.map(product => {
                        const discount = Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);
                        const isWishlisted = wishlist.includes(product.id);
                        return (
                          <div
                            key={product.id}
                            onClick={() => navigateTo('detail', product.id)}
                            className="border border-brand-border/60 rounded-xl flex flex-col bg-white hover:shadow-hover-lift hover:-translate-y-1 hover:border-brand-blue/30 transition-all duration-300 ease-out cursor-pointer h-full group relative overflow-hidden"
                          >
                            {/* Wishlist Button */}
                            <motion.button
                              whileTap={{ scale: 0.8 }}
                              onClick={(e) => toggleWishlist(product.id, e)}
                              className="absolute top-3 right-3 p-2 rounded-full bg-white/80 backdrop-blur-md text-zinc-400 hover:text-brand-red hover:bg-white shadow-soft transition-colors z-10"
                            >
                              <Heart size={13} className={isWishlisted ? "fill-brand-red text-brand-red" : ""} />
                            </motion.button>

                            <div className="w-full aspect-[4/3] flex items-center justify-center relative overflow-hidden bg-slate-50/50 p-6 border-b border-brand-border/30">
                              <img
                                src={product.image}
                                alt={product.title}
                                className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-500 ease-out mix-blend-multiply"
                              />
                              {product.isAssured && (
                                <div className="absolute bottom-3 left-3 z-10 flex items-center gap-0.5 bg-white/95 text-xs font-black italic px-1.5 py-0.5 rounded shadow-sm border border-brand-blue/10 select-none">
                                  <span className="text-brand-blue">ShopIndia</span>
                                  <span className="text-brand-orange">Assured</span>
                                </div>
                              )}
                            </div>

                            <div className="p-5 flex flex-col flex-1">
                              <h4 className="text-xs font-semibold text-brand-graphite line-clamp-2 leading-relaxed mb-3 group-hover:text-brand-blue transition-colors font-heading min-h-[36px]">
                                {product.title}
                              </h4>

                              {/* Ratings and Count Row */}
                              <div className="flex items-center gap-2 mb-4 mt-auto leading-none select-none">
                                <div className="flex items-center gap-0.5 bg-brand-green/10 border border-brand-green/20 text-brand-green font-semibold text-xs px-2 py-0.5 rounded shadow-soft font-numbers">
                                  <span>{product.rating}</span>
                                  <Star size={8} className="fill-brand-green text-brand-green" />
                                </div>
                                <span className="text-xs text-brand-slate font-semibold font-numbers">({product.ratingCount.toLocaleString('en-IN')} ratings)</span>
                              </div>

                              {/* Price and discount badges details */}
                              <div className="flex items-center justify-between mt-2 pt-3 border-t border-brand-border/40">
                                <div className="flex flex-col gap-0.5 leading-none font-numbers">
                                  <div className="flex items-baseline gap-2">
                                    <span className="text-sm font-bold text-brand-graphite">₹{product.price.toLocaleString('en-IN')}</span>
                                    {product.originalPrice > product.price && (
                                      <span className="text-xs text-brand-slate line-through">₹{product.originalPrice.toLocaleString('en-IN')}</span>
                                    )}
                                  </div>
                                  {product.originalPrice > product.price && (
                                    <span className="text-xs font-extrabold text-brand-green w-max tracking-wide">{discount}% Off</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <motion.button
                                    whileTap={{ scale: 0.94 }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      addToCart(product);
                                    }}
                                    className="py-1 px-2 rounded-lg bg-orange-50 hover:bg-orange-100 border border-brand-orange/30 text-brand-orange font-extrabold text-[11px] flex items-center justify-center gap-1 shadow-xs transition-colors"
                                    title="Add to Cart"
                                  >
                                    <ShoppingCart size={11} className="text-brand-orange" />
                                    <span>Add</span>
                                  </motion.button>
                                  <motion.button
                                    whileTap={{ scale: 0.94 }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (!requireCustomerAuth('buy this product')) return;
                                      addToCart(product);
                                      navigateTo('cart');
                                    }}
                                    className="py-1 px-2 rounded-lg bg-brand-blue hover:bg-blue-700 text-white font-extrabold text-[11px] flex items-center justify-center gap-1 shadow-xs transition-colors"
                                    title="Buy Now"
                                  >
                                    <Zap size={11} className="fill-amber-400 text-amber-400" />
                                    <span>Buy</span>
                                  </motion.button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Column: Promotional Sidebar / Advertisements (Span 1) */}
          <div className="col-span-1 flex flex-col gap-6 lg:sticky lg:top-[140px] h-fit">
            <div className="w-full bg-brand-card p-6 rounded-card shadow-premium flex flex-col gap-4 border border-brand-border">
              <span className="font-bold text-xs tracking-widest text-brand-slate uppercase font-heading">Spotlight Brand</span>
              <div className="relative aspect-[3/4] rounded-card overflow-hidden shadow-inner group cursor-pointer bg-neutral-900">
                <img
                  src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&auto=format"
                  alt="Ad"
                  className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-700 ease-out"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-brand-graphite via-transparent to-transparent flex flex-col justify-end p-5 text-white">
                  <span className="text-xs font-bold uppercase tracking-wider text-brand-orange bg-orange-50/15 border border-brand-orange/20 px-2 py-0.5 rounded w-max mb-1.5 font-heading">
                    Partnership
                  </span>
                  <h4 className="text-base font-bold leading-tight mb-1 font-heading">Active Jordan series</h4>
                  <p className="text-[10.5px] text-zinc-300 leading-normal mb-4 font-medium">Claim premium cashbacks instantly.</p>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigateTo('search')}
                    className="px-5 py-2 bg-brand-blue text-white rounded-button font-bold text-xs tracking-wide w-max shadow hover:bg-blue-650 transition-colors uppercase font-heading"
                  >
                    Shop Now
                  </motion.button>
                </div>
              </div>
            </div>

            <div className="w-full bg-brand-card p-6 rounded-card shadow-premium flex flex-col gap-3.5 border border-brand-border text-left">
              <div className="flex gap-3 items-center">
                <div className="w-9 h-9 rounded-full bg-orange-50 flex items-center justify-center text-brand-orange border border-brand-orange/10 shadow-soft">
                  <Award size={16} />
                </div>
                <div className="flex flex-col leading-tight">
                  <span className="font-semibold text-xs text-brand-graphite font-heading">Plus Guaranteed Partner</span>
                  <span className="text-xs text-brand-slate font-bold">1-day fast delivery</span>
                </div>
              </div>
              <p className="text-xs text-brand-slate leading-relaxed border-t border-brand-border pt-3.5 font-semibold">
                Enjoy 1-day delivery and special discount prices on items displaying the <strong>ShopIndia Assured</strong> badge.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

