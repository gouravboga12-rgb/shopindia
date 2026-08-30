import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useProducts } from '../hooks/useProducts';
import { useCustomer } from '../context/CustomerContext';
import { useIsMobile } from '../hooks/useMediaQuery';
import { Star, ShoppingCart, Zap, ArrowLeft, Heart, Share2, MapPin, BadgePercent, ChevronRight, ShieldCheck, Truck, RefreshCcw, Mic, Battery, Bluetooth, Cpu, Smartphone, Calendar, Wrench, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

export const ProductDetailPage: React.FC = () => {
  const { selectedProductId, addToCart, navigateTo, goBack, currentVertical, cart } = useApp();
  const { reviews } = useCustomer();
  const isMobile = useIsMobile();
  const { products, loading } = useProducts();
  const [pincode, setPincode] = useState('');
  const [pincodeCheckResult, setPincodeCheckResult] = useState<string | null>(null);
  const [isWishlisted, setIsWishlisted] = useState(false);

  const cartItemCount = (cart || []).reduce((acc, item) => acc + item.quantity, 0);

  // Retrieve the selected product
  const product = products.find(p => p.id === selectedProductId);
  const discount = product ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100) : 0;
  const isServices = currentVertical === 'services' || product?.vertical === 'services';

  const handlePincodeCheck = (e: React.FormEvent) => {
    e.preventDefault();
    if (pincode.length === 6 && /^\d+$/.test(pincode)) {
      if (isServices) {
        setPincodeCheckResult(`Certified professional available at pincode ${pincode} tomorrow.`);
      } else {
        setPincodeCheckResult(`Standard delivery by tomorrow, 11:00 AM. Free shipping.`);
      }
    } else {
      setPincodeCheckResult('Invalid pincode. Please enter a 6-digit postal code.');
    }
  };

  const handleAddToCart = () => {
    if (product) addToCart(product);
  };

  const handleBuyNow = () => {
    if (product) {
      addToCart(product);
      navigateTo('cart');
    }
  };

  const handleBookNow = () => {
    if (product) {
      const bookingDetails = {
        ...product,
        deliveryTime: 'Tomorrow at 10:00 AM',
        specs: {
          ...product.specs,
          'Scheduled Slot': 'Tomorrow, 10:00 AM',
          'Technician': 'Certified Professional Assigned'
        }
      };
      addToCart(bookingDetails);
      navigateTo('cart');
    }
  };

  // Real live verified customer reviews matching this product
  const liveReviews = (reviews || []).filter(r => 
    r.productId === product?.id || 
    (product?.title && r.productName && r.productName.toLowerCase() === product.title.toLowerCase())
  );

  const displayReviews = liveReviews.map(r => ({
    name: 'Verified Customer',
    rating: r.rating,
    date: new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
    title: r.title,
    comment: r.body,
    images: r.images || [],
    isVerified: true
  }));

  const similarProducts = product ? products.filter(p => p.id !== product.id && p.vertical === product.vertical).slice(0, 5) : [];

  // Desktop Page Layout
  const renderDesktop = () => {
    if (loading) {
      return (
        <div className="max-w-7xl mx-auto px-12 py-8 text-left">
          <div className="animate-pulse flex flex-col gap-8">
            <div className="h-4 bg-slate-200 rounded w-1/4"></div>
            <div className="grid grid-cols-5 gap-8">
              <div className="col-span-2 h-[500px] bg-slate-200 rounded-[20px]"></div>
              <div className="col-span-3 flex flex-col gap-4">
                <div className="h-10 bg-slate-200 rounded w-3/4"></div>
                <div className="h-6 bg-slate-200 rounded w-1/2"></div>
                <div className="h-20 bg-slate-200 rounded w-full mt-4"></div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (!product) {
      return (
        <div className="max-w-7xl mx-auto px-12 py-20 text-center">
          <h2 className="text-2xl font-bold text-brand-slate">Product not found</h2>
          <button onClick={() => navigateTo('home')} className="mt-4 px-6 py-2 bg-brand-blue text-white rounded-full">Return Home</button>
        </div>
      );
    }

    return (
      <div className="max-w-7xl mx-auto px-12 py-8 text-left select-none text-brand-graphite font-sans">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-1.5 text-xs text-brand-slate font-bold mb-6 font-heading uppercase tracking-wider">
          <button onClick={() => navigateTo('home')} className="hover:underline">Home</button>
          <ChevronRight size={12} />
          <button onClick={() => navigateTo('search')} className="hover:underline capitalize">{isServices ? 'Services' : product.vertical} Catalog</button>
          <ChevronRight size={12} />
          <span className="text-brand-graphite font-black truncate max-w-sm dark:text-white">{product.title}</span>
        </div>

        <div className="grid grid-cols-5 gap-8">
          {/* Left Column: Image & Checkout Buttons (Span 2) */}
          <div className="col-span-2 flex flex-col gap-5">
            <div className="border rounded-[20px] p-8 aspect-square flex items-center justify-center relative bg-white border-brand-border shadow-premium">
              {/* Floating Wishlist Heart */}
              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={() => setIsWishlisted(!isWishlisted)}
                className="absolute top-4 right-4 p-2.5 rounded-full bg-white text-zinc-400 hover:text-brand-red shadow-soft border border-brand-border transition-colors z-10"
              >
                <Heart size={16} className={isWishlisted ? "fill-brand-red text-brand-red" : ""} />
              </motion.button>

              <img src={product.image} alt={product.title} className="max-h-full max-w-full object-contain rounded" />
              {product.isAssured && (
                <div className="absolute bottom-4 left-4 z-10 flex items-center gap-0.5 bg-blue-50/95 text-xs font-black italic px-2 py-0.5 rounded border border-brand-blue/20 backdrop-blur-sm select-none shadow-sm">
                  <span className="text-brand-blue">ShopIndia</span>
                  <span className="text-brand-orange">Assured</span>
                </div>
              )}
            </div>

            {/* CTA action buttons (16px curved) */}
            {product.isOutOfStock || (product.stock !== undefined && product.stock <= 0) ? (
              <div className="w-full py-3.5 rounded-button bg-gray-100 text-gray-400 flex items-center justify-center gap-2 text-sm font-black uppercase tracking-wider select-none font-heading border border-gray-200 cursor-not-allowed">
                <span>{isServices ? 'Currently Unavailable' : 'Out of Stock'}</span>
              </div>
            ) : isServices ? (
              <div className="w-full">
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={handleBookNow}
                  className="w-full py-4 rounded-button bg-amber-600 hover:bg-amber-700 text-white flex items-center justify-center gap-2.5 shadow-premium transition-all uppercase tracking-wider font-black text-sm font-heading"
                >
                  <Calendar size={18} />
                  <span>Book Service Now</span>
                </motion.button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 text-xs font-extrabold select-none font-heading">
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={handleAddToCart}
                  className="w-full py-3.5 rounded-button bg-brand-orange hover:bg-orange-655 text-white flex items-center justify-center gap-2 shadow-premium transition-all uppercase tracking-wider font-black"
                >
                  <ShoppingCart size={16} />
                  <span>Add to Cart</span>
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={handleBuyNow}
                  className="w-full py-3.5 rounded-button bg-brand-blue hover:bg-blue-600 text-white flex items-center justify-center gap-2 shadow-premium transition-all uppercase tracking-wider font-black"
                >
                  <Zap size={16} />
                  <span>Buy Now</span>
                </motion.button>
              </div>
            )}
          </div>

          {/* Right Column: Info details (Span 3) */}
          <div className="col-span-3 flex flex-col gap-6">
            <div>
              <h1 className="text-lg font-bold leading-relaxed mb-2.5 font-heading text-brand-graphite">
                {product.title}
              </h1>
              <div className="flex items-center gap-2 mb-3 leading-none">
                <div className="flex items-center gap-0.5 bg-brand-green text-white font-extrabold text-xs px-2 py-0.5 rounded shadow-soft font-numbers">
                  <span>{product.rating}</span>
                  <Star size={10} className="fill-white text-white" />
                </div>
                <span className="text-xs text-brand-slate font-bold font-numbers">
                  ({product.ratingCount.toLocaleString('en-IN')} {isServices ? 'Verified Service Reviews' : 'Customer Reviews'})
                </span>
              </div>
            </div>

            {/* Price Details */}
            <div className="flex items-baseline gap-3 border-b border-brand-border/10 pb-5 leading-none font-numbers">
              <span className="text-2xl font-black text-brand-graphite">₹{product.price.toLocaleString('en-IN')}</span>
              {product.originalPrice > product.price && (
                <>
                  <span className="text-sm text-brand-slate line-through">₹{product.originalPrice.toLocaleString('en-IN')}</span>
                  <span className="text-sm font-black text-brand-orange uppercase tracking-wider">{discount}% off</span>
                </>
              )}
            </div>

            {/* Bank offers */}
            <div className="flex flex-col gap-3">
              <span className="font-black text-xs uppercase tracking-widest font-heading text-brand-graphite">Available Offers & Discounts</span>
              <div className="flex flex-col gap-2 text-xs text-brand-slate font-semibold">
                <div className="flex gap-2.5 items-start leading-relaxed text-left">
                  <BadgePercent size={15} className="text-brand-green shrink-0 mt-0.5" />
                  <span><strong>Bank Offer:</strong> Get 10% instant discount on Credit Cards, up to ₹1,500.</span>
                </div>
                <div className="flex gap-2.5 items-start leading-relaxed text-left">
                  <BadgePercent size={15} className="text-brand-green shrink-0 mt-0.5" />
                  <span><strong>Bank Offer:</strong> Flat ₹100 instant cashback on Wallet transactions above ₹999.</span>
                </div>
              </div>
            </div>

            {/* Pincode checker (16px curves) */}
            <div className="py-5 border-t border-b border-brand-border/10 flex flex-col gap-3">
              <span className="font-black text-xs uppercase tracking-widest font-heading text-brand-graphite">
                {isServices ? 'Service Availability & Slot Estimates' : 'Delivery & Slot Estimates'}
              </span>
              <form onSubmit={handlePincodeCheck} className="flex gap-2.5 max-w-sm">
                <div className="flex border border-brand-border rounded-input overflow-hidden w-full bg-white shadow-soft">
                  <span className="p-2 text-brand-slate"><MapPin size={15} /></span>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder={isServices ? "Enter 6-digit service pincode" : "Enter 6-digit delivery pincode"}
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    className="w-full py-1.5 text-xs font-bold focus:outline-none text-brand-graphite"
                  />
                </div>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  type="submit"
                  className={`px-5 text-white font-extrabold text-xs rounded-button uppercase tracking-wider transition-colors ${
                    isServices ? 'bg-amber-600 hover:bg-amber-700' : 'bg-brand-blue hover:bg-blue-650'
                  }`}
                >
                  Check
                </motion.button>
              </form>
              {pincodeCheckResult && (
                <span className={`text-xs font-bold ${pincodeCheckResult.includes('Invalid') ? 'text-brand-red' : 'text-brand-green'}`}>
                  {pincodeCheckResult}
                </span>
              )}
            </div>

            {/* Specs tables (20px curves) */}
            {product.specs && Object.keys(product.specs).length > 0 && (
              <div className="flex flex-col gap-3">
                <span className="font-black text-xs uppercase tracking-widest font-heading text-brand-graphite">
                  {isServices ? 'Service Inclusions & Scope' : 'Specifications & Features'}
                </span>
                <div className="border border-brand-border rounded-card overflow-hidden text-xs shadow-soft">
                  {Object.entries(product.specs).map(([key, val], idx) => (
                    <div key={key} className={`grid grid-cols-3 p-3 text-left ${
                      idx % 2 === 0 ? 'bg-slate-50/50' : 'bg-white'
                    } border-b border-brand-border last:border-0`}>
                      <span className="font-extrabold text-brand-slate">{key}</span>
                      <span className="col-span-2 font-bold text-brand-graphite">{val}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reviews list */}
            <div className="flex flex-col gap-3.5">
              <div className="flex items-center justify-between">
                <span className="font-black text-xs uppercase tracking-widest font-heading text-brand-graphite">
                  {isServices ? 'Ratings & Service Feedback' : 'Ratings & Customer Reviews'}
                </span>
                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 size={13} /> {displayReviews.length} Verified Reviews
                </span>
              </div>
              <div className="flex flex-col gap-3">
                {displayReviews.length === 0 ? (
                  <div className="p-6 border border-brand-border/80 rounded-2xl text-center bg-slate-50/50">
                    <p className="text-xs font-bold text-brand-graphite">No verified reviews for this {isServices ? 'service' : 'product'} yet.</p>
                    <p className="text-[11px] text-brand-slate mt-1">Verified customers who booked or ordered this item can submit feedback from their account.</p>
                  </div>
                ) : (
                  displayReviews.map((rev, i) => (
                    <div key={i} className="p-4 sm:p-5 border border-brand-border rounded-2xl text-left shadow-soft bg-white">
                      <div className="flex justify-between items-center mb-2 leading-none font-heading">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-xs text-brand-graphite">{rev.name}</span>
                          {rev.isVerified && (
                            <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold border border-emerald-200/60 flex items-center gap-0.5">
                              <CheckCircle2 size={10} /> Verified
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-brand-slate font-bold font-numbers">{rev.date}</span>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex gap-0.5 text-[#ffe500]">
                          {Array.from({ length: rev.rating }).map((_, idx) => (
                            <Star key={idx} size={12} className="fill-brand-orange text-brand-orange" />
                          ))}
                        </div>
                        {rev.title && <span className="text-xs font-extrabold text-brand-graphite">{rev.title}</span>}
                      </div>
                      <p className="text-xs text-brand-slate font-medium leading-relaxed bg-slate-50/50 p-2.5 rounded-xl border border-slate-100/80">{rev.comment}</p>
                      {rev.images && rev.images.length > 0 && (
                        <div className="flex gap-2 mt-2.5 flex-wrap">
                          {rev.images.map((img, idx) => (
                            <img key={idx} src={img} alt="review attachment" className="w-14 h-14 rounded-xl object-cover border border-slate-200 shadow-sm" />
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Recommended Products */}
        {similarProducts.length > 0 && (
          <div className="mt-16 pt-10 border-t border-brand-border/20">
            <h2 className="text-xl font-bold mb-6 font-heading text-brand-graphite">
              {isServices ? 'Recommended Services' : 'Recommended for you'}
            </h2>
            <div className="grid grid-cols-5 gap-5">
              {similarProducts.map((p) => {
                const pDiscount = Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100);
                return (
                  <div 
                    key={p.id}
                    onClick={() => {
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                      navigateTo('detail', p.id);
                    }}
                    className="border rounded-xl flex flex-col group cursor-pointer hover:shadow-hover-lift transition-all duration-300 overflow-hidden bg-white border-brand-border/60 hover:border-brand-blue/30"
                  >
                    <div className="w-full aspect-square flex items-center justify-center p-4 bg-white relative">
                      <img src={p.image} alt={p.title} className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300" />
                      {pDiscount > 0 && (
                        <span className="absolute top-2 left-2 bg-[#ECFDF5] border border-brand-green/10 text-brand-green text-[10px] font-black px-1.5 py-0.5 rounded shadow-sm font-numbers uppercase tracking-wider">
                          {pDiscount}% OFF
                        </span>
                      )}
                    </div>
                    <div className="p-4 flex flex-col flex-grow">
                      <h3 className="text-xs font-bold line-clamp-2 leading-relaxed mb-2 font-heading text-brand-graphite group-hover:text-brand-blue">
                        {p.title}
                      </h3>
                      <div className="mt-auto flex flex-col font-numbers">
                        <span className={`text-sm font-black ${isServices ? 'text-white' : 'text-brand-graphite'}`}>₹{p.price.toLocaleString('en-IN')}</span>
                        {p.originalPrice > p.price && (
                          <span className="text-[10px] text-brand-slate line-through mt-0.5">₹{p.originalPrice.toLocaleString('en-IN')}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Mobile Page Layout
  const renderMobile = () => {
    if (loading) {
      return (
        <div className="pb-24 bg-white animate-pulse">
          <div className="w-full aspect-square bg-slate-200"></div>
          <div className="p-4 flex flex-col gap-3">
            <div className="h-8 bg-slate-200 rounded w-3/4"></div>
            <div className="h-6 bg-slate-200 rounded w-1/2"></div>
            <div className="h-16 bg-slate-200 rounded w-full mt-2"></div>
          </div>
        </div>
      );
    }

    if (!product) {
      return (
        <div className="py-20 text-center">
          <h2 className="text-xl font-bold text-brand-slate">Product not found</h2>
          <button onClick={() => navigateTo('home')} className="mt-4 px-6 py-2 bg-brand-blue text-white rounded-full">Return Home</button>
        </div>
      );
    }

    return (
      <div className="w-full flex flex-col bg-white min-h-screen text-left pb-36 select-none text-brand-graphite font-sans selection:bg-brand-blue/20">
        {/* Navigation header row */}
        <div className="px-4 py-3.5 sticky top-0 z-30 flex items-center justify-between border-b bg-white/80 backdrop-blur-xl border-slate-200/60 text-brand-graphite shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)]">
          <button 
            onClick={goBack} 
            className="w-9 h-9 rounded-full flex items-center justify-center transition-colors active:scale-95 bg-slate-100 hover:bg-slate-200 text-zinc-700"
          >
            <ArrowLeft size={18} strokeWidth={2.5} className="text-zinc-700" />
          </button>
          <span className="font-extrabold text-xs tracking-wider font-heading uppercase text-zinc-800">
            {isServices ? 'Service Details' : 'Product Details'}
          </span>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsWishlisted(!isWishlisted)}
              className="w-9 h-9 rounded-full flex items-center justify-center transition-colors active:scale-95 bg-slate-100 hover:bg-slate-200 text-zinc-700 cursor-pointer"
            >
              <Heart size={16} strokeWidth={2.5} className={isWishlisted ? "fill-brand-red text-brand-red" : "text-zinc-700"} />
            </button>
            <button 
              onClick={() => navigateTo('cart')}
              className="w-9 h-9 rounded-full flex items-center justify-center transition-colors active:scale-95 bg-slate-100 hover:bg-slate-200 text-zinc-700 relative cursor-pointer"
            >
              <ShoppingCart size={16} strokeWidth={2.2} className="text-zinc-700" />
              {cartItemCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white font-numbers shadow-sm border-2 border-white">
                  {cartItemCount}
                </span>
              )}
            </button>
            <button 
              onClick={() => {
                if (navigator.share) {
                  navigator.share({ title: product?.title || 'ShopIndia', url: window.location.href }).catch(() => {});
                }
              }}
              className="w-9 h-9 rounded-full flex items-center justify-center transition-colors active:scale-95 bg-slate-100 hover:bg-slate-200 text-zinc-700 cursor-pointer"
            >
              <Share2 size={16} strokeWidth={2.5} className="text-zinc-700" />
            </button>
          </div>
        </div>

        {/* Large picture */}
        <div className="w-full aspect-square sm:aspect-[4/3] flex items-center justify-center p-10 border-b relative overflow-hidden bg-gradient-to-b from-slate-50 via-white to-slate-50/40 border-slate-200/60">
          <div className="absolute inset-0 bg-brand-blue/5 blur-3xl rounded-full scale-150 opacity-40 mix-blend-multiply"></div>
          
          <img 
            src={product.image} 
            alt={product.title} 
            className="max-h-full max-w-full object-contain drop-shadow-[0_16px_32px_rgba(0,0,0,0.12)] z-10 transition-transform duration-500 ease-out hover:scale-[1.03]" 
          />
          
          {product.isAssured && (
            <div className="absolute bottom-4 left-4 z-20 flex items-center gap-0.5 bg-white/95 text-xs font-black italic px-2 py-1 rounded-full border border-blue-100 shadow-[0_4px_12px_rgba(0,0,0,0.08)] backdrop-blur-md">
              <span className="text-brand-blue">ShopIndia</span>
              <span className="text-brand-orange">Assured</span>
            </div>
          )}
        </div>

        {/* Product / Service details */}
        <div className="p-5 flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <h1 className="text-[17px] font-extrabold leading-snug tracking-tight font-heading text-brand-graphite">{product.title}</h1>
            <div className="flex items-center gap-2.5 leading-none">
              <div className="flex items-center justify-center gap-0.5 bg-[#17B169] text-white font-black text-xs px-2 py-0.5 rounded-[5px] font-numbers shadow-[0_2px_8px_rgba(23,177,105,0.25)]">
                <span>{product.rating}</span>
                <Star size={9} className="fill-white text-white" />
              </div>
              <span className="text-xs text-slate-500 font-bold font-numbers tracking-tight">({product.ratingCount.toLocaleString('en-IN')} Reviews)</span>
            </div>
          </div>

          {/* Pricing detail */}
          <div className="flex items-end gap-2.5 border-b border-slate-200/60 pb-6 leading-none font-numbers">
            <span className="text-3xl font-black text-brand-graphite tracking-tighter">₹{product.price.toLocaleString('en-IN')}</span>
            {product.originalPrice > product.price && (
              <>
                <span className="text-[13px] text-slate-400 line-through mb-1 font-semibold">₹{product.originalPrice.toLocaleString('en-IN')}</span>
                <span className="text-xs font-black text-brand-orange uppercase tracking-widest mb-1.5 bg-orange-50 px-1.5 py-0.5 rounded text-orange-600">{discount}% OFF</span>
              </>
            )}
          </div>

          {/* Service/Delivery Availability checker */}
          <div className="flex flex-col gap-3 py-1">
            <span className="text-xs uppercase font-black tracking-widest text-slate-400 font-heading">
              {isServices ? 'Service Availability' : 'Delivery to'}
            </span>
            <form onSubmit={handlePincodeCheck} className="flex gap-2 w-full max-w-sm relative">
              <input
                type="text"
                maxLength={6}
                placeholder={isServices ? "Enter 6-digit service pincode" : "Enter 6-digit code"}
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                className="w-full pl-5 pr-24 py-3.5 bg-slate-100/80 border-transparent rounded-full text-[13px] font-bold focus:outline-none focus:bg-white focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue/30 transition-all placeholder:text-slate-400"
              />
              <button type="submit" className={`absolute right-1.5 top-1.5 bottom-1.5 px-5 text-white rounded-full text-xs font-black uppercase tracking-wider active:scale-95 transition-all shadow-sm ${
                isServices ? 'bg-amber-600 hover:bg-amber-700' : 'bg-zinc-900 hover:bg-zinc-800'
              }`}>
                Check
              </button>
            </form>
            {pincodeCheckResult && (
              <span className={`text-xs font-bold pl-1 ${pincodeCheckResult.includes('Invalid') ? 'text-brand-red' : 'text-[#17B169]'}`}>
                {pincodeCheckResult}
              </span>
            )}
          </div>

          {/* Key Specs / Service Inclusions */}
          {product.specs && Object.keys(product.specs).length > 0 && (
            <div className="flex flex-col gap-3 mt-1">
              <span className="text-xs uppercase font-black tracking-widest text-slate-400 font-heading">
                {isServices ? 'Service Inclusions & Details' : 'Key Specifications'}
              </span>
              <div className="flex flex-col gap-2.5">
                {Object.entries(product.specs).map(([key, val]) => {
                  const keyLower = key.toLowerCase();
                  let Icon = Zap;
                  if (keyLower.includes('mic') || keyLower.includes('audio')) Icon = Mic;
                  else if (keyLower.includes('battery') || keyLower.includes('power')) Icon = Battery;
                  else if (keyLower.includes('connect') || keyLower.includes('bluetooth')) Icon = Bluetooth;
                  else if (keyLower.includes('processor') || keyLower.includes('chip')) Icon = Cpu;
                  else if (keyLower.includes('display') || keyLower.includes('screen')) Icon = Smartphone;
                  else if (keyLower.includes('slot') || keyLower.includes('time') || keyLower.includes('schedule')) Icon = Calendar;
                  else if (keyLower.includes('technician') || keyLower.includes('warranty')) Icon = Wrench;
                  
                  return (
                    <div key={key} className="flex items-center gap-3.5 p-4 bg-slate-50/80 border border-slate-200/50 rounded-2xl transition-colors hover:bg-slate-100/80">
                      <div className="text-zinc-600 shrink-0 w-8 flex justify-center bg-white p-2 rounded-full shadow-sm border border-slate-100">
                        <Icon size={16} strokeWidth={2.5} />
                      </div>
                      <div className="grid grid-cols-[1fr_1.5fr] w-full items-center gap-3">
                        <span className="text-xs font-bold text-slate-500">{key}</span>
                        <span className="text-[13px] font-black text-zinc-800 leading-tight">{val}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Trust Badges */}
          <div className="grid grid-cols-3 gap-2 p-5 mt-4 bg-white rounded-2xl border border-slate-200/60 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)]">
            <div className="flex flex-col items-center text-center gap-2">
              <div className={`p-2.5 rounded-full ${isServices ? 'bg-amber-50 text-amber-700' : 'bg-slate-50 text-zinc-700'}`}>
                <ShieldCheck size={18} strokeWidth={2.5} />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-black text-zinc-800 tracking-tight">{isServices ? '100% Verified' : '100% Original'}</span>
                <span className="text-xs font-bold text-slate-400">{isServices ? 'Professionals' : 'Products'}</span>
              </div>
            </div>
            <div className="flex flex-col items-center text-center gap-2 relative before:content-[''] before:absolute before:left-0 before:top-[10%] before:h-[80%] before:w-px before:bg-slate-100">
              <div className={`p-2.5 rounded-full ${isServices ? 'bg-amber-50 text-amber-700' : 'bg-slate-50 text-zinc-700'}`}>
                {isServices ? <Calendar size={18} strokeWidth={2.5} /> : <Truck size={18} strokeWidth={2.5} />}
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-black text-zinc-800 tracking-tight">{isServices ? 'On-Time Arrival' : 'Fast Delivery'}</span>
                <span className="text-xs font-bold text-slate-400">{isServices ? 'Doorstep Service' : 'In Minutes'}</span>
              </div>
            </div>
            <div className="flex flex-col items-center text-center gap-2 relative before:content-[''] before:absolute before:left-0 before:top-[10%] before:h-[80%] before:w-px before:bg-slate-100">
              <div className={`p-2.5 rounded-full ${isServices ? 'bg-amber-50 text-amber-700' : 'bg-slate-50 text-zinc-700'}`}>
                <RefreshCcw size={18} strokeWidth={2.5} />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-black text-zinc-800 tracking-tight">{isServices ? 'Service Cover' : 'Easy Returns'}</span>
                <span className="text-xs font-bold text-slate-400">{isServices ? '30-Day Guarantee' : 'Hassle Free'}</span>
              </div>
            </div>
          </div>
          {/* Mobile Ratings & Customer Reviews */}
          <div className="mt-4 p-5 rounded-2xl border bg-white border-slate-200/60">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs uppercase font-black tracking-widest font-heading text-slate-400">
                {isServices ? 'Service Feedback' : 'Customer Reviews'}
              </span>
              <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-0.5">
                <CheckCircle2 size={11} /> {displayReviews.length} Reviews
              </span>
            </div>

            <div className="flex flex-col gap-3">
              {displayReviews.length === 0 ? (
                <div className="p-5 rounded-xl border text-center bg-slate-50/50 border-slate-100">
                  <p className="text-xs font-bold text-brand-graphite">No verified reviews yet</p>
                  <p className="text-[11px] text-brand-slate mt-0.5">Reviews appear here once verified customers submit their ratings.</p>
                </div>
              ) : (
                displayReviews.map((rev, i) => (
                  <div key={i} className="p-4 rounded-xl border text-left bg-slate-50/50 border-slate-100">
                    <div className="flex justify-between items-center mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-xs text-brand-graphite">{rev.name}</span>
                        {rev.isVerified && (
                          <span className="text-[9px] bg-emerald-50 text-emerald-700 px-1.5 py-0.2 rounded font-bold">Verified</span>
                        )}
                      </div>
                      <span className="text-[10px] text-brand-slate font-numbers">{rev.date}</span>
                    </div>
                    <div className="flex items-center gap-1 mb-1.5">
                      <div className="flex gap-0.5 text-[#ffe500]">
                        {Array.from({ length: rev.rating }).map((_, idx) => (
                          <Star key={idx} size={10} className="fill-brand-orange text-brand-orange" />
                        ))}
                      </div>
                      {rev.title && <span className="text-xs font-bold text-brand-graphite ml-1">{rev.title}</span>}
                    </div>
                    <p className="text-xs text-brand-slate leading-relaxed">{rev.comment}</p>
                    {rev.images && rev.images.length > 0 && (
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {rev.images.map((img, idx) => (
                          <img key={idx} src={img} alt="review" className="w-12 h-12 rounded-lg object-cover border border-slate-200" />
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Mobile Recommended Services/Products */}
        {similarProducts.length > 0 && (
          <div className="mt-2 pt-6 pb-4 border-t bg-white border-slate-200/60">
            <h2 className="px-5 text-sm font-black uppercase tracking-widest font-heading mb-4 text-slate-400">
              {isServices ? 'Recommended Services' : 'Recommended for you'}
            </h2>
            <div className="grid grid-cols-2 gap-3 px-4 pb-4">
              {similarProducts.slice(0, 4).map((p) => {
                const pDiscount = Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100);
                return (
                  <div 
                    key={p.id}
                    onClick={() => {
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                      navigateTo('detail', p.id);
                    }}
                    className="w-full flex-col border rounded-xl flex group cursor-pointer overflow-hidden shadow-sm bg-white border-slate-200/60"
                  >
                    <div className="w-full aspect-square flex items-center justify-center p-3 bg-white relative border-b border-slate-100">
                      <img src={p.image} alt={p.title} className="max-h-full max-w-full object-contain" />
                      {pDiscount > 0 && (
                        <span className="absolute top-1.5 left-1.5 bg-[#ECFDF5] border border-brand-green/10 text-brand-green text-[9px] font-black px-1 py-0.5 rounded shadow-sm font-numbers uppercase tracking-widest">
                          {pDiscount}% OFF
                        </span>
                      )}
                    </div>
                    <div className="p-3 flex flex-col flex-grow">
                      <h3 className="text-[11px] font-bold line-clamp-2 leading-snug mb-1.5 font-heading text-brand-graphite">
                        {p.title}
                      </h3>
                      <div className="mt-auto flex flex-col font-numbers">
                        <span className={`text-[13px] font-black tracking-tight ${isServices ? 'text-white' : 'text-brand-graphite'}`}>₹{p.price.toLocaleString('en-IN')}</span>
                        {p.originalPrice > p.price && (
                          <span className="text-[9px] text-slate-400 line-through mt-0.5">₹{p.originalPrice.toLocaleString('en-IN')}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Floating Mobile Bottom CTA Buttons */}
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-slate-200/60 z-45 text-center select-none shadow-[0_-8px_20px_-8px_rgba(0,0,0,0.1)] px-4 py-3 pb-safe">
          {product.isOutOfStock || (product.stock !== undefined && product.stock <= 0) ? (
            <div className="w-full h-[52px] bg-gray-100 text-gray-400 border border-gray-200 flex items-center justify-center gap-2 uppercase text-xs font-black rounded-full tracking-wide cursor-not-allowed">
              <span>{isServices ? 'Service Currently Unavailable' : 'Out of Stock'}</span>
            </div>
          ) : isServices ? (
            <button
              onClick={handleBookNow}
              className="w-full h-[52px] bg-amber-600 hover:bg-amber-700 text-white flex items-center justify-center gap-2 uppercase active:scale-[0.98] transition-all rounded-full tracking-wide shadow-[0_4px_16px_rgba(217,119,6,0.35)] font-black text-sm font-heading"
            >
              <Calendar size={18} strokeWidth={2.5} />
              <span>Book Service Now</span>
            </button>
          ) : (
            <div className="grid grid-cols-2 gap-3 text-xs font-extrabold font-heading">
              <button
                onClick={handleAddToCart}
                className="w-full h-[52px] text-zinc-800 bg-white border-2 border-slate-200/80 flex items-center justify-center gap-2 uppercase hover:bg-slate-50 active:scale-[0.98] transition-all rounded-full tracking-wide shadow-sm font-black"
              >
                <ShoppingCart size={17} strokeWidth={2.5} />
                <span>Add to Cart</span>
              </button>
              <button
                onClick={handleBuyNow}
                className="w-full h-[52px] bg-[#0A1022] text-white flex items-center justify-center gap-2 uppercase hover:bg-black active:scale-[0.98] transition-all rounded-full tracking-wide shadow-[0_4px_14px_rgba(10,16,34,0.3)] font-black"
              >
                <Zap size={17} fill="white" strokeWidth={2} />
                <span>Buy Now</span>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return isMobile ? renderMobile() : renderDesktop();
};
