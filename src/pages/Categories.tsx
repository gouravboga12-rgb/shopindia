import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useCategories } from '../hooks/useCategories';
import { useProducts } from '../hooks/useProducts';
import { 
  Search, ShoppingBag, Zap, Wrench, 
  ChevronRight, ArrowLeft, ShoppingCart
} from 'lucide-react';

export const CategoriesPage: React.FC = () => {
  const { navigateTo, setSearchQuery, currentVertical, setCurrentVertical, cart } = useApp();
  const { categories, loading: loadingCats } = useCategories();
  const { products } = useProducts();
  
  const [searchFilter, setSearchFilter] = useState('');
  const cartItemCount = (cart || []).reduce((acc, item) => acc + item.quantity, 0);

  // Normalize vertical string from DB
  const normalizeVertical = (v?: string): 'shop' | 'quick' | 'services' => {
    if (!v) return 'shop';
    const lower = v.toLowerCase();
    if (lower.startsWith('quick')) return 'quick';
    if (lower.startsWith('service')) return 'services';
    return 'shop';
  };

  // Strictly filter categories belonging to the current active module only
  const activeVerticalCategories = useMemo(() => {
    const active = categories.filter(c => c.isActive !== false);
    return active.filter(cat => {
      const v = normalizeVertical(cat.vertical);
      if (v !== currentVertical) return false;
      if (!searchFilter.trim()) return true;
      return cat.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
        cat.slug.toLowerCase().includes(searchFilter.toLowerCase());
    });
  }, [categories, currentVertical, searchFilter]);

  const handleOpenCategory = (cat: typeof categories[0]) => {
    const v = normalizeVertical(cat.vertical);
    setCurrentVertical(v);
    setSearchQuery(cat.name);
    navigateTo('search');
  };

  // Helper to count products for a category
  const getProductCount = (cat: typeof categories[0]) => {
    return products.filter(p => 
      (p as any).categoryId === cat.id || 
      (p.category && p.category.toLowerCase() === cat.name.toLowerCase()) ||
      (p.tags && p.tags.includes(cat.name))
    ).length;
  };

  const moduleInfo = {
    shop: {
      title: 'Shop Categories',
      subtitle: 'Mobiles, Electronics, Fashion, Home & Living',
      icon: ShoppingBag,
      searchPlaceholder: 'Search in Shop categories...',
      emptyText: 'No shop categories found'
    },
    quick: {
      title: 'Quick Categories',
      subtitle: '10-15 Min Groceries, Food, Dairy & Pharmacy',
      icon: Zap,
      searchPlaceholder: 'Search grocery, food & pharmacy categories...',
      emptyText: 'No quick categories found'
    },
    services: {
      title: 'Services Categories',
      subtitle: 'AC Repair, Deep Cleaning, Plumber & Vehicle Care',
      icon: Wrench,
      searchPlaceholder: 'Search appliance, home & vehicle services...',
      emptyText: 'No service categories found'
    }
  };

  const currentModule = moduleInfo[currentVertical] || moduleInfo.shop;

  return (
    <div className="w-full min-h-screen bg-[#F8F9FA] text-slate-800 pb-28 select-none">
      
      {/* 1. Clean Header (Single Module Only, No cross-module buttons) */}
      <div className="sticky top-0 z-30 bg-white border-b border-slate-200/80 shadow-xs px-4 pt-3 pb-3">
        <div className="max-w-5xl mx-auto flex flex-col gap-3">
          
          {/* Top Title & Cart */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => navigateTo('home')} 
                className="p-1.5 -ml-1 text-slate-500 hover:text-slate-900 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <ArrowLeft size={18} />
              </button>
              <div className="flex flex-col leading-tight text-left">
                <h1 className="text-sm sm:text-base font-black font-heading text-slate-900 tracking-tight">
                  {currentModule.title}
                </h1>
                <p className="text-[10.5px] text-slate-400 font-medium line-clamp-1">
                  {currentModule.subtitle}
                </p>
              </div>
            </div>

            <button 
              onClick={() => navigateTo('cart')}
              className="w-9 h-9 rounded-full flex items-center justify-center transition-colors active:scale-95 bg-slate-100 hover:bg-slate-200 text-zinc-700 relative shrink-0 cursor-pointer"
            >
              <ShoppingCart size={16} strokeWidth={2.2} className="text-zinc-700" />
              {cartItemCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white font-numbers shadow-sm border-2 border-white">
                  {cartItemCount}
                </span>
              )}
            </button>
          </div>

          {/* Search Input for Current Module */}
          <div className="relative w-full">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={currentModule.searchPlaceholder}
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full pl-9 pr-9 py-2.5 bg-slate-100/90 border border-slate-200/60 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
            />
            {searchFilter && (
              <button 
                onClick={() => setSearchFilter('')} 
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            )}
          </div>

        </div>
      </div>

      {/* 2. Module-Specific Categories Grid */}
      <div className="max-w-5xl mx-auto px-4 py-5 flex flex-col gap-6">
        
        {loadingCats ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 sm:gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-4 flex flex-col items-center gap-2 animate-pulse border border-slate-200/60 shadow-xs">
                <div className="w-16 h-16 bg-slate-200 rounded-full" />
                <div className="w-12 h-3 bg-slate-200 rounded" />
              </div>
            ))}
          </div>
        ) : activeVerticalCategories.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-xs my-6">
            <currentModule.icon size={36} className="mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-bold text-slate-700">
              {searchFilter ? `No categories found matching "${searchFilter}"` : currentModule.emptyText}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {searchFilter ? 'Try another keyword or clear search.' : 'Categories can be added in the Admin Panel.'}
            </p>
            {searchFilter && (
              <button
                onClick={() => setSearchFilter('')}
                className="mt-4 px-5 py-2 bg-blue-600 text-white rounded-full text-xs font-bold shadow-xs hover:bg-blue-700 transition-colors cursor-pointer"
              >
                Clear Search
              </button>
            )}
          </div>
        ) : (
          /* Render Active Vertical Categories in Clean E-Commerce Grid */
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 sm:gap-4">
            {activeVerticalCategories.map((cat) => {
              const count = getProductCount(cat);

              return (
                <div
                  key={cat.id}
                  onClick={() => handleOpenCategory(cat)}
                  className="bg-white border border-slate-200/70 rounded-2xl p-3 sm:p-3.5 flex flex-col items-center text-center shadow-xs hover:shadow-soft hover:border-blue-400/50 transition-all cursor-pointer group active:scale-95 relative overflow-hidden"
                >
                  {/* Category Image Circle */}
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden bg-slate-50 border border-slate-100 flex items-center justify-center mb-2.5 shadow-2xs group-hover:scale-105 transition-transform duration-300">
                    {cat.image ? (
                      <img
                        src={cat.image}
                        alt={cat.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400 text-base font-black">
                        {cat.name.charAt(0)}
                      </div>
                    )}
                  </div>

                  {/* Category Title */}
                  <h3 className="text-[11px] sm:text-xs font-bold text-slate-800 line-clamp-2 leading-tight font-heading group-hover:text-blue-600 transition-colors h-7 flex items-center justify-center">
                    {cat.name}
                  </h3>

                  {/* Product Count or Action */}
                  <div className="mt-1.5">
                    {count > 0 ? (
                      <span className="text-[10px] font-semibold text-slate-400 font-numbers">
                        {count} {count === 1 ? 'item' : 'items'}
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-slate-400 group-hover:text-blue-600 flex items-center gap-0.5">
                        <span>Explore</span>
                        <ChevronRight size={10} />
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

    </div>
  );
};
