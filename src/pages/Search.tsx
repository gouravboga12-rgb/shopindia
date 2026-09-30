import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useCustomer } from '../context/CustomerContext';
import { useProducts } from '../hooks/useProducts';
import { useIsMobile } from '../hooks/useMediaQuery';
import { Search, Star, Filter, ArrowUpDown, Heart, ShoppingCart, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { requireCustomerAuth } from '../lib/customerAuth';

export const SearchPage: React.FC = () => {
  const { currentVertical, searchQuery, setSearchQuery, navigateTo, addToCart } = useApp();
  const { wishlist, toggleWishlist: customerToggleWishlist } = useCustomer();
  const isMobile = useIsMobile();
  const { products: allProducts, loading } = useProducts();

  // Filters state
  const [sortBy, setSortBy] = useState<string>('relevance');
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedRatings, setSelectedRatings] = useState<number[]>([]);
  const [maxPrice, setMaxPrice] = useState<number>(150000);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  const toggleBrand = (brand: string) => {
    setSelectedBrands(prev => 
      prev.includes(brand) ? prev.filter(b => b !== brand) : [...prev, brand]
    );
  };

  const toggleRating = (star: number) => {
    setSelectedRatings(prev => 
      prev.includes(star) ? prev.filter(s => s !== star) : [...prev, star]
    );
  };

  // Filter products
  const searchedProducts = useMemo(() => {
    let filtered = allProducts.filter(p => p.vertical === currentVertical);

    // Apply search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.title.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        (p.brand && p.brand.toLowerCase().includes(q)) ||
        (p.description && p.description.toLowerCase().includes(q))
      );
    }

    // Apply multiple brands filter
    if (selectedBrands.length > 0) {
      filtered = filtered.filter(p => p.brand && selectedBrands.includes(p.brand));
    }

    // Apply multiple ratings filter
    if (selectedRatings.length > 0) {
      const minStar = Math.min(...selectedRatings);
      filtered = filtered.filter(p => p.rating >= minStar);
    }

    filtered = filtered.filter(p => p.price <= maxPrice);

    // Apply Sorting
    if (sortBy === 'price-low') {
      filtered.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-high') {
      filtered.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'rating') {
      filtered.sort((a, b) => b.rating - a.rating);
    }

    return filtered;
  }, [allProducts, currentVertical, searchQuery, selectedBrands, selectedRatings, maxPrice, sortBy]);

  const brands = useMemo(() => {
    const allBrands = allProducts
      .filter(p => p.vertical === currentVertical)
      .map(p => p.brand)
      .filter((b): b is string => Boolean(b && b.trim()));
    return Array.from(new Set(allBrands)).sort();
  }, [allProducts, currentVertical]);

  const toggleWishlist = (productId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    customerToggleWishlist(productId);
  };

  const handleResetFilters = () => {
    setSelectedBrands([]);
    setSelectedRatings([]);
    setMaxPrice(150000);
    setSortBy('relevance');
  };

  const isServices = currentVertical === 'services';

  const renderDesktop = () => {
    return (
      <div className="max-w-7xl mx-auto w-full flex gap-8 py-8 px-12 text-left font-sans text-brand-graphite">
        {/* Left Filter Sidebar */}
        <aside className="w-full max-w-[260px] p-6 border rounded-card shrink-0 h-fit select-none shadow-premium bg-white border-brand-border">
          <div className="flex justify-between items-center border-b pb-3.5 mb-5 border-brand-border/60">
            <span className="font-black text-xs uppercase tracking-widest font-heading">Filters</span>
            {(selectedBrands.length > 0 || selectedRatings.length > 0 || maxPrice < 150000 || sortBy !== 'relevance') && (
              <button onClick={handleResetFilters} className="text-xs font-bold text-brand-blue hover:underline cursor-pointer">
                Clear All
              </button>
            )}
          </div>

          {/* Sort By Section */}
          <div className="mb-6">
            <span className="font-black text-xs uppercase text-brand-slate tracking-widest block mb-3 font-heading">Sort Results</span>
            <div className="flex flex-col gap-2">
              {[
                { id: 'relevance', name: 'Relevance' },
                { id: 'price-low', name: 'Price: Low to High' },
                { id: 'price-high', name: 'Price: High to Low' },
                { id: 'rating', name: 'Popularity (Rating)' }
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setSortBy(opt.id)}
                  className={`text-xs text-left font-bold py-1.5 transition-all cursor-pointer ${
                    sortBy === opt.id
                      ? 'text-brand-blue font-extrabold pl-2 border-l-2 border-brand-blue'
                      : 'text-brand-slate hover:text-brand-graphite'
                  }`}
                >
                  {opt.name}
                </button>
              ))}
            </div>
          </div>

          {/* Price Range Slider */}
          <div className="mb-6">
            <span className="font-black text-xs uppercase text-brand-slate tracking-widest block mb-2.5 font-heading">Price Limit</span>
            <input
              type="range"
              min={0}
              max={150000}
              step={100}
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              className="w-full h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-brand-blue mb-3"
            />
            <div className="flex justify-between text-xs font-black text-brand-slate font-numbers">
              <span>₹0</span>
              <span>₹{maxPrice.toLocaleString('en-IN')}</span>
            </div>
          </div>

          {/* Brands Multi-Select Filter */}
          {brands.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <span className="font-black text-xs uppercase text-brand-slate tracking-widest block font-heading">
                  Brand {selectedBrands.length > 0 && `(${selectedBrands.length})`}
                </span>
                {selectedBrands.length > 0 && (
                  <button onClick={() => setSelectedBrands([])} className="text-[10px] font-bold text-brand-blue hover:underline">
                    Reset
                  </button>
                )}
              </div>
              <div className="flex flex-col gap-2.5 max-h-48 overflow-y-auto no-scrollbar font-bold pr-1">
                {brands.map(brand => (
                  <label key={brand} className="flex items-center gap-2.5 text-xs text-brand-slate hover:text-brand-graphite cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={selectedBrands.includes(brand)}
                      onChange={() => toggleBrand(brand)}
                      className="rounded-[4px] border-brand-border text-brand-blue focus:ring-brand-blue focus:ring-1 w-4 h-4 cursor-pointer accent-blue-600"
                    />
                    <span className={selectedBrands.includes(brand) ? 'text-brand-graphite font-black' : 'font-semibold'}>
                      {brand}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Customer Ratings Filter */}
          <div className="mb-2">
            <span className="font-black text-xs uppercase text-brand-slate tracking-widest block mb-3 font-heading">Customer Rating</span>
            <div className="flex flex-col gap-2.5">
              {[4, 3, 2].map(star => (
                <label
                  key={star}
                  className="flex items-center gap-2.5 text-xs text-brand-slate hover:text-brand-graphite cursor-pointer select-none"
                >
                  <input
                    type="checkbox"
                    checked={selectedRatings.includes(star)}
                    onChange={() => toggleRating(star)}
                    className="rounded-[4px] border-brand-border text-brand-blue focus:ring-brand-blue focus:ring-1 w-4 h-4 cursor-pointer accent-blue-600"
                  />
                  <span className={`font-bold ${selectedRatings.includes(star) ? 'text-brand-blue font-extrabold' : ''}`}>
                    {star}★ & above
                  </span>
                </label>
              ))}
            </div>
          </div>
        </aside>

        {/* Search Results Display */}
        <main className="flex-1">
          <div className="p-5 border rounded-card mb-6 flex justify-between items-center shadow-premium bg-white border-brand-border">
            <span className="text-xs font-bold text-brand-slate">
              Showing <strong className="font-numbers text-brand-graphite">{searchedProducts.length}</strong> results for "{searchQuery || 'All catalog'}"
            </span>
          </div>

          {loading ? (
            <div className="w-full py-16 flex justify-center items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue"></div>
            </div>
          ) : searchedProducts.length === 0 ? (
            <div className="w-full py-16 bg-white border border-brand-border rounded-card flex flex-col items-center justify-center text-center p-6 shadow-premium">
              <span className="text-4xl mb-4">🔍</span>
              <h3 className="text-sm font-extrabold text-brand-graphite mb-1.5 font-heading">No matches found</h3>
              <p className="text-xs text-brand-slate max-w-sm mb-5 font-semibold">Try modifying filters or checking keywords spelling</p>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => { setSearchQuery(''); handleResetFilters(); }}
                className="px-5 py-2.5 bg-brand-blue text-white rounded-button text-xs font-extrabold shadow-premium hover:bg-blue-600 transition-colors uppercase tracking-wider"
              >
                Reset Search Filters
              </motion.button>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-5 select-none">
              {searchedProducts.map(product => {
                const discount = Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);
                const isWishlisted = wishlist.includes(product.id);
                return (
                  <div
                    key={product.id}
                    onClick={() => navigateTo('detail', product.id)}
                    className={`border rounded-card p-5 flex flex-col hover:shadow-hover-lift hover:-translate-y-1 transition-all duration-350 cursor-pointer group h-full relative isolate ${
                      isServices ? 'bg-[#2C2C2E] border-zinc-800 text-white' : 'bg-white border-brand-border'
                    }`}
                  >
                    {/* Wishlist Button */}
                    <motion.button
                      whileTap={{ scale: 0.85 }}
                      onClick={(e) => toggleWishlist(product.id, e)}
                      className="absolute top-3 right-3 p-1.5 rounded-full bg-white/90 text-zinc-400 hover:text-brand-red shadow-soft border border-brand-border transition-colors z-10"
                    >
                      <Heart size={12} className={isWishlisted ? "fill-brand-red text-brand-red" : ""} />
                    </motion.button>

                    {product.isAssured && (
                      <div className="absolute bottom-3.5 left-3.5 z-10 flex items-center gap-0.5 bg-blue-50/95 text-xs font-black italic px-1.5 py-0.5 rounded border border-brand-blue/20 backdrop-blur-sm select-none shadow-soft">
                        <span className="text-brand-blue">ShopIndia</span>
                        <span className="text-brand-orange">Assured</span>
                      </div>
                    )}
                    <div className="w-full aspect-square flex items-center justify-center mb-5 bg-brand-elevated rounded-card border border-brand-border/40 p-2 overflow-hidden shadow-soft">
                      <img src={product.image} alt={product.title} className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300" />
                    </div>
                    <h3 className="text-xs font-bold text-brand-graphite line-clamp-2 leading-relaxed mb-2.5 min-h-[36px] group-hover:text-brand-blue transition-colors dark:group-hover:text-services-gold dark:text-white font-heading">
                      {product.title}
                    </h3>
                    <div className="flex items-center gap-2 mb-3 mt-auto leading-none">
                      <div className="flex items-center gap-0.5 bg-brand-green text-white font-extrabold text-xs px-1.5 py-0.5 rounded shadow-soft font-numbers">
                        <span>{product.rating}</span>
                        <Star size={8} className="fill-white text-white" />
                      </div>
                      <span className="text-xs text-brand-slate font-bold font-numbers">({product.ratingCount.toLocaleString('en-IN')})</span>
                    </div>
                    <div className="flex items-baseline gap-1.5 leading-none font-numbers mt-1">
                      <span className="text-sm font-extrabold text-brand-graphite dark:text-white">₹{product.price.toLocaleString('en-IN')}</span>
                      {product.originalPrice > product.price && (
                        <>
                          <span className="text-xs text-brand-slate line-through">₹{product.originalPrice.toLocaleString('en-IN')}</span>
                          <span className="text-xs font-black text-brand-orange uppercase tracking-wider">{discount}% Off</span>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    );
  };

  const renderMobile = () => {
    return (
      <div className="w-full flex flex-col gap-3 p-3 bg-[#FAF9F6] min-h-screen text-left pb-20 select-none text-brand-graphite font-sans">
        {/* Mobile Input Search Bar */}
        <div className="flex gap-2.5 bg-white p-3 rounded-[16px] shadow-soft items-center border border-brand-border">
          <Search size={15} className="text-brand-slate ml-1.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search products, brands and catalog..."
            className="w-full bg-transparent focus:outline-none text-xs font-semibold text-brand-graphite"
          />
        </div>

        {/* Sort & Filter controls strip */}
        <div className="grid grid-cols-2 gap-2 bg-white p-2 rounded-[16px] shadow-soft border border-brand-border leading-none select-none font-heading">
          <button
            onClick={() => setMobileFilterOpen(true)}
            className="flex items-center justify-center gap-2 text-xs font-bold text-brand-slate border-r border-slate-100 py-1.5"
          >
            <Filter size={14} />
            <span>Filter</span>
          </button>
          <button
            onClick={() => {
              setSortBy(prev => prev === 'price-low' ? 'price-high' : 'price-low');
            }}
            className="flex items-center justify-center gap-2 text-xs font-bold text-brand-slate py-1.5"
          >
            <ArrowUpDown size={14} />
            <span>Sort Price</span>
          </button>
        </div>

        {loading ? (
          <div className="w-full py-16 flex justify-center items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue"></div>
          </div>
        ) : searchedProducts.length === 0 ? (
          <div className="w-full py-16 bg-white border border-brand-border rounded-[20px] flex flex-col items-center justify-center text-center p-6 shadow-soft mt-2">
            <span className="text-3xl mb-4">🔍</span>
            <h3 className="text-xs font-extrabold text-brand-graphite mb-1.5 font-heading">No matches found</h3>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => { setSearchQuery(''); handleResetFilters(); }}
              className="px-4 py-2 bg-brand-blue text-white rounded-button text-xs font-black shadow mt-2 uppercase tracking-wider"
            >
              Reset Filters
            </motion.button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 mt-1">
            {searchedProducts.map(product => {
              const discount = Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);
              const isWishlisted = wishlist.includes(product.id);
              return (
                <div
                  key={product.id}
                  onClick={() => navigateTo('detail', product.id)}
                  className="bg-white border border-brand-border rounded-[20px] p-3 flex flex-col cursor-pointer relative shadow-soft isolate"
                >
                  {/* Wishlist Button */}
                  <motion.button
                    whileTap={{ scale: 0.85 }}
                    onClick={(e) => toggleWishlist(product.id, e)}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-white/95 text-zinc-400 hover:text-brand-red shadow-soft border border-brand-border transition-colors z-10"
                  >
                    <Heart size={10} className={isWishlisted ? "fill-brand-red text-brand-red" : ""} />
                  </motion.button>

                  {product.isAssured && (
                      <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-0.5 bg-blue-50/95 text-xs font-black italic px-1 py-0.5 rounded border border-brand-blue/20 backdrop-blur-sm select-none shadow-sm">
                        <span className="text-brand-blue">ShopIndia</span>
                        <span className="text-brand-orange">Assured</span>
                      </div>
                  )}
                  <div className="w-full aspect-square flex items-center justify-center mb-2.5 bg-brand-elevated rounded-[20px] p-1.5 overflow-hidden shadow-soft border border-brand-border/40">
                    <img src={product.image} alt={product.title} className="max-h-full max-w-full object-contain" />
                  </div>
                  <h3 className="text-xs font-bold text-brand-graphite line-clamp-2 leading-snug mb-1 min-h-[30px] font-heading">
                    {product.title}
                  </h3>
                  <div className="flex items-center gap-1.5 mb-1.5 mt-auto leading-none">
                    <div className="flex items-center gap-0.5 bg-brand-green text-white font-extrabold text-xs px-1.5 py-0.5 rounded shadow-soft font-numbers">
                      <span>{product.rating}</span>
                      <Star size={7} className="fill-white text-white" />
                    </div>
                    <span className="text-xs text-brand-slate font-bold font-numbers">({product.ratingCount.toLocaleString('en-IN')})</span>
                  </div>
                  <div className="flex items-baseline gap-1 mt-1 leading-none font-numbers">
                    <span className="text-xs font-extrabold text-brand-graphite">₹{product.price.toLocaleString('en-IN')}</span>
                    <span className="text-xs text-brand-slate line-through">₹{product.originalPrice.toLocaleString('en-IN')}</span>
                    <span className="text-xs font-black text-brand-orange uppercase tracking-wider">{discount}%</span>
                  </div>

                  {/* Action Buttons: Add to Cart & Buy Now */}
                  <div className="grid grid-cols-2 gap-1.5 mt-2.5 pt-2 border-t border-brand-border/60">
                    <motion.button
                      whileTap={{ scale: 0.94 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        addToCart(product);
                      }}
                      className="py-1.5 px-1 rounded-lg bg-orange-50 hover:bg-orange-100 border border-brand-orange/30 text-brand-orange font-extrabold text-[10px] flex items-center justify-center gap-1 shadow-xs transition-colors"
                    >
                      <ShoppingCart size={11} className="text-brand-orange shrink-0" />
                      <span className="truncate">Add to Cart</span>
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.94 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!requireCustomerAuth('buy this product')) return;
                        addToCart(product);
                        navigateTo('cart');
                      }}
                      className="py-1.5 px-1 rounded-lg bg-brand-blue hover:bg-blue-900 text-white font-extrabold text-[10px] flex items-center justify-center gap-1 shadow-xs transition-colors"
                    >
                      <Zap size={11} className="fill-amber-400 text-amber-400 shrink-0" />
                      <span className="truncate">Buy Now</span>
                    </motion.button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Mobile Filter Drawer Sheet */}
        {mobileFilterOpen && (
          <div className="fixed inset-0 bg-brand-graphite/40 z-50 flex items-end justify-center">
            <div className="absolute inset-0" onClick={() => setMobileFilterOpen(false)} />
            <div className="w-full bg-white rounded-t-bottom-nav p-5 pb-8 z-50 text-left shadow-elevated border-t border-brand-border text-brand-graphite">
              <div className="flex justify-between items-center border-b border-brand-border pb-3 mb-4 leading-none">
                <span className="font-extrabold text-sm font-heading">Filter & Sort Options</span>
                <button onClick={() => setMobileFilterOpen(false)} className="text-brand-slate hover:text-brand-graphite font-bold p-1">
                  ✕
                </button>
              </div>

              {/* Brands selection (Multi-Select) */}
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs text-brand-slate font-black uppercase tracking-widest font-heading">
                  Select Brand {selectedBrands.length > 0 && `(${selectedBrands.length})`}
                </span>
                {selectedBrands.length > 0 && (
                  <button onClick={() => setSelectedBrands([])} className="text-[11px] font-bold text-brand-blue hover:underline">
                    Reset
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2 mb-5 font-bold max-h-40 overflow-y-auto no-scrollbar pr-1">
                {brands.map(brand => {
                  const isChecked = selectedBrands.includes(brand);
                  return (
                    <button
                      key={brand}
                      onClick={() => toggleBrand(brand)}
                      className={`px-3.5 py-1.5 rounded-full text-xs border transition-all cursor-pointer ${
                        isChecked
                          ? 'bg-brand-blue text-white border-brand-blue shadow-xs font-black'
                          : 'bg-slate-50 text-brand-slate border-brand-border'
                      }`}
                    >
                      {isChecked ? `✓ ${brand}` : brand}
                    </button>
                  );
                })}
              </div>

              {/* Ratings selection (Multi-Select) */}
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs text-brand-slate font-black uppercase tracking-widest font-heading">
                  Customer Rating {selectedRatings.length > 0 && `(${selectedRatings.length})`}
                </span>
                {selectedRatings.length > 0 && (
                  <button onClick={() => setSelectedRatings([])} className="text-[11px] font-bold text-brand-blue hover:underline">
                    Reset
                  </button>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2 mb-6 font-bold">
                {[4, 3, 2].map(star => {
                  const isChecked = selectedRatings.includes(star);
                  return (
                    <button
                      key={star}
                      onClick={() => toggleRating(star)}
                      className={`py-2 text-center text-xs border rounded-xl transition-all cursor-pointer ${
                        isChecked
                          ? 'border-brand-blue bg-blue-50 text-brand-blue font-bold shadow-xs'
                          : 'border-brand-border bg-slate-50 text-brand-slate'
                      }`}
                    >
                      {isChecked ? `✓ ${star}★ & above` : `${star}★ & above`}
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleResetFilters}
                  className="w-full py-3 bg-slate-100 text-brand-graphite font-extrabold text-xs rounded-xl uppercase tracking-wider"
                >
                  Clear All
                </button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setMobileFilterOpen(false)}
                  className="w-full py-3 bg-brand-blue hover:bg-blue-600 text-white font-extrabold text-xs rounded-xl uppercase tracking-wider shadow"
                >
                  Apply Filters
                </motion.button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return isMobile ? renderMobile() : renderDesktop();
};

