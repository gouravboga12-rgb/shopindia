import React, { useState } from 'react';
import { useCustomer } from '../../context/CustomerContext';
import { useApp } from '../../context/AppContext';
import { useProducts } from '../../hooks/useProducts';
import { PageHeader, EmptyState } from '../../components/dashboard/DashboardUI';
import { Heart, ShoppingCart, Share2, BellRing, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';

export const WishlistPage: React.FC = () => {
  const { wishlist, toggleWishlist } = useCustomer();
  const { addToCart, currentVertical } = useApp();
  const { products } = useProducts();

  const [filter, setFilter] = useState<'all' | 'shop' | 'quick' | 'services'>(
    currentVertical === 'quick' ? 'quick' : currentVertical === 'services' ? 'services' : 'all'
  );

  const items = wishlist.map((id) => products.find((p) => p.id === id)).filter(Boolean);

  const getProductVertical = (p: any): 'shop' | 'quick' | 'services' => {
    const v = (p?.category?.vertical || p?.vertical || '').toLowerCase();
    if (v === 'quick' || v === 'quick_commerce') return 'quick';
    if (v === 'services' || v === 'hvac' || v === 'hvac_service') return 'services';
    return 'shop';
  };

  const shopCount = items.filter((p) => getProductVertical(p) === 'shop').length;
  const quickCount = items.filter((p) => getProductVertical(p) === 'quick').length;
  const servicesCount = items.filter((p) => getProductVertical(p) === 'services').length;

  const displayedItems = filter === 'all' 
    ? items 
    : items.filter((p) => getProductVertical(p) === filter);

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Wishlist"
        subtitle={`${items.length} saved items total`}
        actions={
          items.length ? (
            <button 
              onClick={() => {
                if (navigator.clipboard) {
                  navigator.clipboard.writeText(window.location.href);
                }
                alert('Wishlist link copied to clipboard!');
              }} 
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-button text-xs font-bold text-brand-graphite cursor-pointer transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" /> Share Wishlist
            </button>
          ) : undefined
        }
      />

      {/* Store Filter Pills */}
      {items.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pb-1">
          <button
            onClick={() => setFilter('all')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
              filter === 'all'
                ? 'bg-brand-graphite text-white shadow-xs'
                : 'bg-slate-100 text-brand-slate hover:bg-slate-200'
            }`}
          >
            All Items ({items.length})
          </button>
          <button
            onClick={() => setFilter('shop')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
              filter === 'shop'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
            }`}
          >
            <span>🛍️ ShopIndia ({shopCount})</span>
          </button>
          <button
            onClick={() => setFilter('quick')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
              filter === 'quick'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
            }`}
          >
            <span>⚡ Quick Shopping ({quickCount})</span>
          </button>
          <button
            onClick={() => setFilter('services')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
              filter === 'services'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
            }`}
          >
            <span>🛠️ Glacons ({servicesCount})</span>
          </button>
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState 
          icon={<Heart className="w-6 h-6" />} 
          title="Your wishlist is empty" 
          message="Tap the heart on any product across ShopIndia, Quick Shopping, or Glacons to save it here for later." 
        />
      ) : displayedItems.length === 0 ? (
        <div className="bg-white border border-brand-border rounded-card p-8 text-center space-y-2">
          <p className="text-sm font-bold text-brand-graphite">No items saved in this store category.</p>
          <p className="text-xs text-brand-slate">Switch filters above to view your other saved items.</p>
          <button 
            onClick={() => setFilter('all')} 
            className="mt-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-brand-graphite rounded-button text-xs font-bold cursor-pointer"
          >
            View All ({items.length})
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedItems.map((p, i) => {
            const vert = getProductVertical(p);
            return (
              <motion.div 
                key={p!.id} 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ delay: i * 0.03 }} 
                className="bg-white border border-brand-border rounded-card shadow-premium p-4 flex flex-col hover:shadow-elevated hover:-translate-y-0.5 transition-all"
              >
                <div className="relative">
                  <img src={p!.image} alt={p!.title} className="w-full aspect-square object-cover rounded-xl bg-slate-50" loading="lazy" />
                  <button 
                    onClick={() => toggleWishlist(p!.id)} 
                    aria-label="Remove from wishlist" 
                    className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 shadow-soft flex items-center justify-center text-red-500 hover:bg-red-50 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <div className="absolute top-2 left-2 flex flex-col gap-1">
                    {p!.originalPrice > p!.price && (
                      <span className="px-2 py-0.5 rounded-full bg-brand-orange text-white text-[10px] font-black">
                        {Math.round(((p!.originalPrice - p!.price) / p!.originalPrice) * 100)}% OFF
                      </span>
                    )}
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                      vert === 'quick' ? 'bg-amber-500 text-white' : vert === 'services' ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white'
                    }`}>
                      {vert === 'quick' ? '⚡ Quick' : vert === 'services' ? '🛠️ Glacons' : '🛍️ ShopIndia'}
                    </span>
                  </div>
                </div>

                <h3 className="text-xs font-bold text-brand-graphite line-clamp-2 mt-3 font-heading">{p!.title}</h3>
                <div className="flex items-baseline gap-1.5 mt-1.5 font-numbers">
                  <span className="font-extrabold text-brand-graphite">₹{p!.price.toLocaleString('en-IN')}</span>
                  {p!.originalPrice > p!.price && (
                    <span className="text-xs text-brand-slate line-through">₹{p!.originalPrice.toLocaleString('en-IN')}</span>
                  )}
                </div>
                <div className="mt-1 flex items-center gap-1.5">
                  <BellRing className="w-3 h-3 text-amber-500" />
                  <span className="text-[11px] text-brand-slate font-semibold">Price drop & back-in-stock alerts</span>
                </div>

                <div className="mt-3 flex gap-2 pt-3 border-t border-brand-border/50">
                  <button 
                    onClick={() => addToCart(p!)} 
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-brand-blue text-white rounded-button text-xs font-bold hover:bg-blue-700 transition-colors cursor-pointer"
                  >
                    <ShoppingCart className="w-3.5 h-3.5" /> Add to Cart
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};
