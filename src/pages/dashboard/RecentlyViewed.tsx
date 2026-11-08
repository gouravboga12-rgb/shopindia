import React from 'react';
import { useCustomer } from '../../context/CustomerContext';
import { useApp } from '../../context/AppContext';
import { useProducts } from '../../hooks/useProducts';
import { PageHeader, GhostButton, PrimaryButton } from '../../components/dashboard/DashboardUI';
import { ShoppingCart, Heart, Trash2, Search, ArrowRight, Eye } from 'lucide-react';

const RECENT_SEARCHES = ['iphone 15 pro', 'wireless headphones', 'air conditioner', 'grocery staples', 'men casual shoes'];

export const RecentlyViewedPage: React.FC = () => {
  const { recentlyViewed, toggleWishlist, clearRecentlyViewed, wishlist } = useCustomer();
  const { addToCart, navigateTo } = useApp();
  const { products, loading } = useProducts();

  // Look up products matching the recently viewed IDs
  const items = recentlyViewed
    .map((id) => products.find((p) => p.id === id || String(p.id) === String(id)))
    .filter(Boolean);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Recently Viewed"
        subtitle="Pick up right where you left off with items you've checked out recently"
        actions={
          items.length ? (
            <GhostButton onClick={clearRecentlyViewed} className="inline-flex items-center gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50">
              <Trash2 className="w-3.5 h-3.5" /> Clear History
            </GhostButton>
          ) : undefined
        }
      />

      {loading && items.length === 0 ? (
        <div className="py-12 flex flex-col items-center justify-center text-slate-400">
          <div className="w-8 h-8 border-2 border-brand-blue border-t-transparent rounded-full animate-spin mb-2"></div>
          <p className="text-xs font-medium">Loading your recently viewed items...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white border border-brand-border rounded-2xl p-8 text-center shadow-xs">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-50 text-brand-blue flex items-center justify-center mb-4">
            <Eye className="w-7 h-7" />
          </div>
          <h3 className="font-bold text-base text-gray-900 font-heading">No recently viewed items yet</h3>
          <p className="text-xs text-gray-500 max-w-md mx-auto mt-1 mb-5">
            As you browse products on Shop India or Quick Shopping, they will appear here so you can easily compare and reorder them.
          </p>
          <PrimaryButton
            onClick={() => navigateTo('home')}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold"
          >
            <span>Explore Products</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </PrimaryButton>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
          {items.map((p) => {
            const isWish = wishlist.includes(p!.id);
            const discountPct = p!.originalPrice && p!.originalPrice > p!.price
              ? Math.round(((p!.originalPrice - p!.price) / p!.originalPrice) * 100)
              : 0;

            return (
              <div
                key={p!.id}
                className="bg-white border border-brand-border rounded-xl shadow-xs p-3 flex flex-col hover:shadow-md transition-all group relative cursor-pointer"
                onClick={() => navigateTo('detail', p!.id)}
              >
                <div className="relative overflow-hidden rounded-lg bg-slate-50">
                  <img
                    src={p!.image}
                    alt={p!.title}
                    className="w-full aspect-square object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  {discountPct > 0 && (
                    <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded text-[10px] font-black bg-emerald-600 text-white shadow-xs">
                      {discountPct}% OFF
                    </span>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleWishlist(p!.id);
                    }}
                    aria-label="Add to wishlist"
                    className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-white/90 shadow-soft flex items-center justify-center transition-colors hover:bg-white"
                  >
                    <Heart className={`w-3.5 h-3.5 ${isWish ? 'fill-red-500 text-red-500' : 'text-slate-400'}`} />
                  </button>
                </div>

                <div className="mt-2.5 flex-1 flex flex-col justify-between">
                  <div>
                    {p!.category && (
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                        {p!.category}
                      </span>
                    )}
                    <h3 className="text-xs font-bold text-gray-800 line-clamp-2 mt-0.5 font-heading group-hover:text-brand-blue transition-colors">
                      {p!.title}
                    </h3>
                  </div>

                  <div className="mt-2">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-sm font-black font-numbers text-gray-900">
                        ₹{p!.price.toLocaleString('en-IN')}
                      </span>
                      {p!.originalPrice && p!.originalPrice > p!.price && (
                        <span className="text-[11px] text-gray-400 line-through font-numbers">
                          ₹{p!.originalPrice.toLocaleString('en-IN')}
                        </span>
                      )}
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        addToCart(p!);
                      }}
                      className="w-full mt-2 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-brand-blue/10 text-brand-blue rounded-lg text-xs font-bold hover:bg-brand-blue hover:text-white transition-colors cursor-pointer"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      <span>Buy Again</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Recently searched */}
      <div className="bg-white border border-brand-border rounded-xl shadow-xs p-4">
        <div className="flex items-center gap-2 mb-2.5">
          <Search className="w-4 h-4 text-brand-blue" />
          <h3 className="font-extrabold text-xs text-gray-800 font-heading uppercase tracking-wide">Popular &amp; Recent Searches</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {RECENT_SEARCHES.map((s) => (
            <button
              key={s}
              onClick={() => {
                navigateTo('search');
              }}
              className="px-3 py-1 bg-slate-50 border border-brand-border rounded-full text-xs font-medium text-gray-600 hover:border-brand-blue hover:text-brand-blue transition-colors cursor-pointer"
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
