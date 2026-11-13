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
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedRatings, setSelectedRatings] = useState<number[]>([]);
  const [assuredOnly, setAssuredOnly] = useState<boolean>(false);
  const [inStockOnly, setInStockOnly] = useState<boolean>(false);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [officialBrands, setOfficialBrands] = useState<string[]>([]);

  React.useEffect(() => {
    fetch('/api/brands')
      .then(res => res.json())
      .then(data => {
        if (data?.brands && Array.isArray(data.brands)) {
          setOfficialBrands(data.brands.filter((b: any) => b.isActive !== false).map((b: any) => b.name));
        }
      })
      .catch(() => {});
  }, []);

  const toggleCategory = (cat: string) => {
    setSelectedCategories(prev => {
      const exists = prev.some(c => c.toLowerCase() === cat.toLowerCase());
      return exists ? prev.filter(c => c.toLowerCase() !== cat.toLowerCase()) : [...prev, cat];
    });
  };

  const toggleBrand = (brand: string) => {
    setSelectedBrands(prev => {
      const exists = prev.some(b => b.toLowerCase() === brand.toLowerCase());
      return exists ? prev.filter(b => b.toLowerCase() !== brand.toLowerCase()) : [...prev, brand];
    });
  };

  const toggleRating = (star: number) => {
    setSelectedRatings(prev => 
      prev.includes(star) ? prev.filter(s => s !== star) : [...prev, star]
    );
  };

  const categories = useMemo(() => {
    const catSet = new Set<string>();
    allProducts
      .filter(p => p.vertical === currentVertical)
      .forEach(p => {
        const c = (p.category || '').trim();
        if (c) catSet.add(c);
      });
    return Array.from(catSet).sort((a, b) => a.localeCompare(b));
  }, [allProducts, currentVertical]);

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

    // Apply categories filter
    if (selectedCategories.length > 0) {
      const selCatsLower = selectedCategories.map(c => c.toLowerCase());
      filtered = filtered.filter(p => {
        const cat = (p.category || '').toLowerCase();
        return selCatsLower.includes(cat);
      });
    }

    // Apply multiple brands filter (case-insensitive & intelligent name match)
    if (selectedBrands.length > 0) {
      const selectedBrandsLower = selectedBrands.map(b => b.toLowerCase());
      filtered = filtered.filter(p => {
        const prodBrand = (p.brand || '').toLowerCase();
        if (prodBrand && selectedBrandsLower.includes(prodBrand)) return true;
        return selectedBrandsLower.some(b => p.title.toLowerCase().includes(b));
      });
    }

    // Apply multiple ratings filter
    if (selectedRatings.length > 0) {
      const minStar = Math.min(...selectedRatings);
      filtered = filtered.filter(p => p.rating >= minStar);
    }

    // Apply Assured Only filter
    if (assuredOnly) {
      filtered = filtered.filter(p => p.isAssured);
    }

    // Apply In-Stock Only filter
    if (inStockOnly) {
      filtered = filtered.filter(p => !p.isOutOfStock && (p.stock === undefined || p.stock > 0));
    }

    // Apply Sorting
    if (sortBy === 'price-low') {
      filtered.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-high') {
      filtered.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'rating') {
      filtered.sort((a, b) => b.rating - a.rating);
    }

    return filtered;
  }, [allProducts, currentVertical, searchQuery, selectedCategories, selectedBrands, selectedRatings, assuredOnly, inStockOnly, sortBy]);

  const brands = useMemo(() => {
    const brandMap = new Map<string, string>(); // lowercase -> display name
    const currentProducts = allProducts.filter(p => p.vertical === currentVertical);

    // 1. Collect brands explicitly set on products in current vertical
    currentProducts.forEach(p => {
      const b = (p.brand || '').trim();
      if (b && !brandMap.has(b.toLowerCase())) {
        brandMap.set(b.toLowerCase(), b);
      }
    });

    // 2. Match official platform brands against products in this vertical
    officialBrands.forEach(ob => {
      const obLower = ob.toLowerCase();
      const hasMatch = currentProducts.some(p => {
        const pb = (p.brand || '').toLowerCase();
        return pb === obLower || p.title.toLowerCase().includes(obLower);
      });
      if (hasMatch && !brandMap.has(obLower)) {
        brandMap.set(obLower, ob);
      }
    });

    return Array.from(brandMap.values()).sort((a, b) => a.localeCompare(b));
  }, [allProducts, currentVertical, officialBrands]);

  const toggleWishlist = (productId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    customerToggleWishlist(productId);
  };

  const handleResetFilters = () => {
    setSelectedCategories([]);
    setSelectedBrands([]);
    setSelectedRatings([]);
    setAssuredOnly(false);
    setInStockOnly(false);
    setSortBy('relevance');
  };

  const hasActiveFilters = selectedCategories.length > 0 || selectedBrands.length > 0 || selectedRatings.length > 0 || assuredOnly || inStockOnly || sortBy !== 'relevance';

  const isServices = currentVertical === 'services';

  const renderDesktop = () => {
    return (
      <div className="max-w-7xl mx-auto w-full flex gap-8 py-8 px-12 text-left font-sans text-brand-graphite">
        {/* Left Filter Sidebar */}
        <aside className="w-full max-w-[260px] p-5 border rounded-card shrink-0 h-fit select-none shadow-premium bg-white border-brand-border">
          <div className="flex justify-between items-center border-b pb-3.5 mb-4 border-brand-border/60">
            <span className="font-black text-xs uppercase tracking-widest font-heading text-brand-graphite">Filters</span>
            {hasActiveFilters && (
              <button onClick={handleResetFilters} className="text-xs font-bold text-brand-blue hover:underline cursor-pointer">
                Clear All
              </button>
            )}
          </div>

          {/* Categories Filter */}
          {categories.length > 0 && (
            <div className="mb-5 pb-4 border-b border-brand-border/40">
              <div className="flex items-center justify-between mb-2.5">
                <span className="font-black text-xs uppercase text-brand-slate tracking-widest block font-heading">
                  Category {selectedCategories.length > 0 && `(${selectedCategories.length})`}
                </span>
                {selectedCategories.length > 0 && (
                  <button onClick={() => setSelectedCategories([])} className="text-[10px] font-bold text-brand-blue hover:underline cursor-pointer">
                    Reset
                  </button>
                )}
              </div>
              <div className="flex flex-col gap-2 max-h-44 overflow-y-auto no-scrollbar font-bold pr-1">
                {categories.map(cat => {
                  const isChecked = selectedCategories.some(c => c.toLowerCase() === cat.toLowerCase());
                  return (
                    <label key={cat} className="flex items-center gap-2.5 text-xs text-brand-slate hover:text-brand-graphite cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleCategory(cat)}
                        className="rounded-[4px] border-brand-border text-brand-blue focus:ring-brand-blue focus:ring-1 w-4 h-4 cursor-pointer accent-blue-600"
                      />
                      <span className={isChecked ? 'text-brand-graphite font-black' : 'font-semibold'}>
                        {cat}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Brands Filter */}
          {brands.length > 0 && (
            <div className="mb-5 pb-4 border-b border-brand-border/40">
              <div className="flex items-center justify-between mb-2.5">
                <span className="font-black text-xs uppercase text-brand-slate tracking-widest block font-heading">
                  Brand {selectedBrands.length > 0 && `(${selectedBrands.length})`}
                </span>
                {selectedBrands.length > 0 && (
                  <button onClick={() => setSelectedBrands([])} className="text-[10px] font-bold text-brand-blue hover:underline cursor-pointer">
                    Reset
                  </button>
                )}
              </div>
              <div className="flex flex-col gap-2 max-h-44 overflow-y-auto no-scrollbar font-bold pr-1">
                {brands.map(brand => {
                  const isChecked = selectedBrands.some(b => b.toLowerCase() === brand.toLowerCase());
                  return (
                    <label key={brand} className="flex items-center gap-2.5 text-xs text-brand-slate hover:text-brand-graphite cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleBrand(brand)}
                        className="rounded-[4px] border-brand-border text-brand-blue focus:ring-brand-blue focus:ring-1 w-4 h-4 cursor-pointer accent-blue-600"
                      />
                      <span className={isChecked ? 'text-brand-graphite font-black' : 'font-semibold'}>
                        {brand}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Customer Ratings Filter */}
          <div className="mb-5 pb-4 border-b border-brand-border/40">
            <span className="font-black text-xs uppercase text-brand-slate tracking-widest block mb-2.5 font-heading">Customer Rating</span>
            <div className="flex flex-col gap-2">
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
                    {star}★ &amp; above
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Availability & Assured Toggles */}
          <div>
            <span className="font-black text-xs uppercase text-brand-slate tracking-widest block mb-2.5 font-heading">Availability</span>
            <div className="flex flex-col gap-2.5">
              <label className="flex items-center gap-2.5 text-xs text-brand-slate hover:text-brand-graphite cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={assuredOnly}
                  onChange={e => setAssuredOnly(e.target.checked)}
                  className="rounded-[4px] border-brand-border text-brand-blue focus:ring-brand-blue focus:ring-1 w-4 h-4 cursor-pointer accent-blue-600"
                />
                <span className={assuredOnly ? 'text-brand-blue font-black' : 'font-semibold'}>
                  ShopIndia Assured Only
                </span>
              </label>
              <label className="flex items-center gap-2.5 text-xs text-brand-slate hover:text-brand-graphite cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={e => setInStockOnly(e.target.checked)}
                  className="rounded-[4px] border-brand-border text-brand-blue focus:ring-brand-blue focus:ring-1 w-4 h-4 cursor-pointer accent-blue-600"
                />
                <span className={inStockOnly ? 'text-brand-graphite font-black' : 'font-semibold'}>
                  In Stock Only
                </span>
              </label>
            </div>
          </div>
        </aside>

        {/* Search Results Display */}
        <main className="flex-1">
          <div className="p-4 border rounded-card mb-6 flex flex-wrap justify-between items-center gap-3 shadow-premium bg-white border-brand-border">
            <span className="text-xs font-bold text-brand-slate">
              Showing <strong className="font-numbers text-brand-graphite">{searchedProducts.length}</strong> results for "{searchQuery || 'All catalog'}"
            </span>

            {/* Horizontal Sort Selector Pills */}
            <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200 text-xs">
              <span className="text-slate-400 font-bold px-2 flex items-center gap-1 text-[11px]">
                <ArrowUpDown size={12} /> Sort By:
              </span>
              {[
                { id: 'relevance', name: 'Relevance' },
                { id: 'price-low', name: 'Price: Low to High' },
                { id: 'price-high', name: 'Price: High to Low' },
                { id: 'rating', name: 'Top Rated' }
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setSortBy(opt.id)}
                  className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                    sortBy === opt.id
                      ? 'bg-white text-brand-blue shadow-xs font-black'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {opt.name}
                </button>
              ))}
            </div>
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

                    <div className="w-full aspect-square flex items-center justify-center mb-5 bg-brand-elevated rounded-card border border-brand-border/40 p-2 overflow-hidden shadow-soft relative">
                      <img src={product.image} alt={product.title} className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300" />
                      {product.isAssured && (
                        <div className="absolute bottom-2 left-2 z-10 flex items-center gap-0.5 bg-blue-50/95 text-xs font-black italic px-1.5 py-0.5 rounded border border-brand-blue/20 backdrop-blur-sm select-none shadow-soft">
                          <span className="text-brand-blue">ShopIndia</span>
                          <span className="text-brand-orange">Assured</span>
                        </div>
                      )}
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

                  <div className="w-full aspect-square flex items-center justify-center mb-2.5 bg-brand-elevated rounded-[20px] p-1.5 overflow-hidden shadow-soft border border-brand-border/40 relative">
                    <img src={product.image} alt={product.title} className="max-h-full max-w-full object-contain" />
                    {product.isAssured && (
                      <div className="absolute bottom-1.5 left-1.5 z-10 flex items-center gap-0.5 bg-blue-50/95 text-[9.5px] font-black italic px-1.5 py-0.5 rounded border border-brand-blue/20 backdrop-blur-sm select-none shadow-sm">
                        <span className="text-brand-blue">ShopIndia</span>
                        <span className="text-brand-orange">Assured</span>
                      </div>
                    )}
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
                <span className="font-extrabold text-sm font-heading">Filter &amp; Sort Options</span>
                <button onClick={() => setMobileFilterOpen(false)} className="text-brand-slate hover:text-brand-graphite font-bold p-1">
                  ✕
                </button>
              </div>

              {/* Sort By Selection */}
              <div className="mb-4">
                <span className="text-xs text-brand-slate font-black uppercase tracking-widest font-heading block mb-2">
                  Sort By
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'relevance', name: 'Relevance' },
                    { id: 'price-low', name: 'Price: Low to High' },
                    { id: 'price-high', name: 'Price: High to Low' },
                    { id: 'rating', name: 'Top Rated' }
                  ].map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => setSortBy(opt.id)}
                      className={`py-2 text-center text-xs border rounded-xl font-bold transition-all cursor-pointer ${
                        sortBy === opt.id
                          ? 'bg-brand-blue text-white border-brand-blue shadow-xs font-black'
                          : 'bg-slate-50 text-brand-slate border-brand-border'
                      }`}
                    >
                      {opt.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Categories selection (Multi-Select) */}
              {categories.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-brand-slate font-black uppercase tracking-widest font-heading">
                      Category {selectedCategories.length > 0 && `(${selectedCategories.length})`}
                    </span>
                    {selectedCategories.length > 0 && (
                      <button onClick={() => setSelectedCategories([])} className="text-[11px] font-bold text-brand-blue hover:underline">
                        Reset
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto no-scrollbar pr-1">
                    {categories.map(cat => {
                      const isChecked = selectedCategories.some(c => c.toLowerCase() === cat.toLowerCase());
                      return (
                        <button
                          key={cat}
                          onClick={() => toggleCategory(cat)}
                          className={`px-3 py-1.5 rounded-full text-xs border transition-all cursor-pointer ${
                            isChecked
                              ? 'bg-brand-blue text-white border-brand-blue shadow-xs font-black'
                              : 'bg-slate-50 text-brand-slate border-brand-border'
                          }`}
                        >
                          {isChecked ? `✓ ${cat}` : cat}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Brands selection (Multi-Select) */}
              {brands.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-brand-slate font-black uppercase tracking-widest font-heading">
                      Select Brand {selectedBrands.length > 0 && `(${selectedBrands.length})`}
                    </span>
                    {selectedBrands.length > 0 && (
                      <button onClick={() => setSelectedBrands([])} className="text-[11px] font-bold text-brand-blue hover:underline">
                        Reset
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto no-scrollbar pr-1">
                    {brands.map(brand => {
                      const isChecked = selectedBrands.some(b => b.toLowerCase() === brand.toLowerCase());
                      return (
                        <button
                          key={brand}
                          onClick={() => toggleBrand(brand)}
                          className={`px-3 py-1.5 rounded-full text-xs border transition-all cursor-pointer ${
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
                </div>
              )}

              {/* Ratings selection (Multi-Select) */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-brand-slate font-black uppercase tracking-widest font-heading">
                    Customer Rating {selectedRatings.length > 0 && `(${selectedRatings.length})`}
                  </span>
                  {selectedRatings.length > 0 && (
                    <button onClick={() => setSelectedRatings([])} className="text-[11px] font-bold text-brand-blue hover:underline">
                      Reset
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2 font-bold">
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
              </div>

              {/* Availability toggles */}
              <div className="mb-5 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setAssuredOnly(!assuredOnly)}
                  className={`px-3 py-1.5 rounded-full text-xs border transition-all cursor-pointer font-bold ${
                    assuredOnly
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-slate-50 text-slate-600 border-slate-200'
                  }`}
                >
                  {assuredOnly ? '✓ ShopIndia Assured' : 'ShopIndia Assured'}
                </button>
                <button
                  type="button"
                  onClick={() => setInStockOnly(!inStockOnly)}
                  className={`px-3 py-1.5 rounded-full text-xs border transition-all cursor-pointer font-bold ${
                    inStockOnly
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-slate-50 text-slate-600 border-slate-200'
                  }`}
                >
                  {inStockOnly ? '✓ In Stock Only' : 'In Stock Only'}
                </button>
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

