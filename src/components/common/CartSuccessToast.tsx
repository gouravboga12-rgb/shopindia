import React, { useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { CheckCircle2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const CartSuccessToast: React.FC = () => {
  const { lastAddedProduct, clearLastAddedProduct, navigateTo } = useApp();

  useEffect(() => {
    if (lastAddedProduct) {
      const timer = setTimeout(() => {
        clearLastAddedProduct();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [lastAddedProduct, clearLastAddedProduct]);

  if (!lastAddedProduct) return null;

  const { product } = lastAddedProduct;
  const imageSrc = product.image || (product as any)?.images?.[0]?.url || '';

  return (
    <AnimatePresence>
      <div className="fixed top-5 right-4 sm:right-6 z-[9999] pointer-events-auto max-w-sm w-[92vw] sm:w-[380px]">
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden text-slate-800"
        >
          <div className="p-3.5 flex items-center gap-3">
            {/* Product Thumbnail */}
            <div className="w-14 h-14 bg-slate-50 rounded-xl overflow-hidden border border-slate-100 flex items-center justify-center shrink-0 p-1">
              {imageSrc ? (
                <img
                  src={imageSrc}
                  alt={product.title}
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs font-bold text-slate-400">
                  Shop
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 text-emerald-600 font-extrabold text-[11px] uppercase tracking-wider mb-0.5">
                <CheckCircle2 size={13} className="text-emerald-500 fill-emerald-100" />
                <span>Success</span>
              </div>
              <h4 className="text-xs font-bold text-slate-900 truncate leading-tight">
                {product.title}
              </h4>
              <div className="flex items-center gap-2 mt-1 text-[11px]">
                <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Added to Cart</span>
                <span className="text-slate-300">•</span>
                <button
                  onClick={() => {
                    clearLastAddedProduct();
                    navigateTo('cart');
                  }}
                  className="font-extrabold text-slate-900 hover:text-brand-blue uppercase tracking-wider text-[11px] underline underline-offset-2 transition-colors cursor-pointer"
                >
                  View Cart
                </button>
              </div>
            </div>

            {/* Close Button */}
            <button
              onClick={clearLastAddedProduct}
              className="text-slate-400 hover:text-slate-700 p-1 rounded-full transition-colors self-start shrink-0"
              aria-label="Close"
            >
              <X size={15} />
            </button>
          </div>

          {/* Animated Progress Bar */}
          <div className="w-full h-1 bg-slate-100 overflow-hidden">
            <motion.div
              initial={{ width: '100%' }}
              animate={{ width: '0%' }}
              transition={{ duration: 4, ease: 'linear' }}
              className="h-full bg-emerald-500"
            />
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
