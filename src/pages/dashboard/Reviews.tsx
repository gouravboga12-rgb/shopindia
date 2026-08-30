import React, { useState, useRef } from 'react';
import { useCustomer } from '../../context/CustomerContext';
import { useApp } from '../../context/AppContext';
import { useProducts } from '../../hooks/useProducts';
import { PageHeader, EmptyState, PrimaryButton, RatingStars, Badge } from '../../components/dashboard/DashboardUI';
import { 
  Star, Pencil, Trash2, X, CheckCircle2, ShieldCheck, 
  ShoppingBag, Sparkles, Camera, Check
} from 'lucide-react';

export const ReviewsPage: React.FC = () => {
  const { reviews, addReview, updateReview, removeReview } = useCustomer();
  const { orders, navigateTo } = useApp();
  const { products } = useProducts();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [productId, setProductId] = useState('');
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // STRICT RULE: Only products from the customer's actual past orders (Verified Purchases)
  const purchasedProducts = (orders || []).flatMap((o: any) => {
    return (o.items || []).map((it: any) => {
      const prod = it.product;
      return {
        id: prod?.id || it.productId || it.id || `prod-${it.name}`,
        title: prod?.title || it.name || it.title || 'Ordered Product',
        image: prod?.image || it.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200&auto=format&fit=crop&q=60',
        price: prod?.price || it.price || 0,
        orderNumber: o.orderNumber || 'OD-VERIFIED',
      };
    });
  }).filter((p: any) => p && p.id);

  // Deduplicate purchased products by id
  const purchasable = Array.from(new Map(purchasedProducts.map(p => [p.id, p])).values());

  const selectedProduct = purchasable.find(p => p.id === productId) || purchasable[0];

  const openNew = () => {
    setEditId(null);
    setProductId(purchasable[0]?.id || '');
    setRating(5);
    setTitle('');
    setBody('');
    setImages([]);
    setOpen(true);
  };

  const openEdit = (id: string) => {
    const r = reviews.find((x) => x.id === id);
    if (!r) return;
    setEditId(id);
    setProductId(r.productId);
    setRating(r.rating);
    setTitle(r.title);
    setBody(r.body);
    setImages(r.images || []);
    setOpen(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).slice(0, 4 - images.length).forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setImages((prev) => [...prev, reader.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const prod = selectedProduct || purchasable.find(p => p.id === productId);
    if (!prod) return;

    setIsSubmitting(true);
    const payload = {
      productId: prod.id,
      productName: prod.title,
      productImage: prod.image,
      rating,
      title,
      body,
      images,
      isVerified: true
    };

    try {
      if (editId) {
        await updateReview({
          ...payload,
          id: editId,
          createdAt: reviews.find((x) => x.id === editId)?.createdAt || new Date().toISOString()
        });
      } else {
        await addReview(payload);
      }
      setOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const ratingFeedback = [
    { star: 1, label: 'Disappointed 😞', desc: 'Needs significant improvement' },
    { star: 2, label: 'Fair 😐', desc: 'Could have been better' },
    { star: 3, label: 'Good 🙂', desc: 'Met expectations' },
    { star: 4, label: 'Very Good 😊', desc: 'Exceeded expectations' },
    { star: 5, label: 'Outstanding! 🌟', desc: 'Loved everything about it' },
  ];

  const currentScore = hoverRating || rating;
  const activeFeedback = ratingFeedback.find(f => f.star === currentScore) || ratingFeedback[4];

  return (
    <div className="space-y-6 text-left font-sans">
      <PageHeader 
        title="Reviews & Ratings" 
        subtitle={`${reviews.length} verified review${reviews.length === 1 ? '' : 's'} shared`} 
        actions={
          <PrimaryButton onClick={openNew} className="flex items-center gap-1.5 shadow-md shadow-brand-blue/20">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Write a Review</span>
          </PrimaryButton>
        } 
      />

      {reviews.length === 0 && (
        <EmptyState 
          icon={<Star className="w-6 h-6 text-amber-500" />} 
          title="No verified reviews yet" 
          message="Share your genuine feedback on items you have purchased to help the community." 
        />
      )}

      {/* Review Cards */}
      <div className="flex flex-col gap-4">
        {reviews.map((r) => {
          const prodInfo = (products || []).find((x: any) => x.id === r.productId) ||
                           purchasable.find(x => x.id === r.productId);
          const displayName = r.productName || prodInfo?.title || 'Verified Item Review';
          const displayImg = r.productImage || prodInfo?.image || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200&auto=format&fit=crop&q=60';

          return (
            <div key={r.id} className="bg-white border border-brand-border rounded-2xl shadow-premium p-4 sm:p-5 hover:shadow-elevated transition-all">
              <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                {/* Product Thumbnail */}
                <div className="flex items-center gap-3 sm:block">
                  <img 
                    src={displayImg} 
                    alt={displayName} 
                    className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover bg-slate-50 border border-brand-border/60 shadow-sm flex-shrink-0" 
                  />
                  <div className="sm:hidden min-w-0 flex-1">
                    <p className="text-sm font-extrabold text-brand-graphite font-heading truncate">{displayName}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <RatingStars value={r.rating} />
                      <Badge tone="green">
                        <CheckCircle2 className="w-3 h-3 inline -mt-0.5 mr-0.5" /> Verified
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  {/* Desktop header line */}
                  <div className="hidden sm:flex items-center justify-between gap-2 flex-wrap">
                    <div>
                      <p className="text-sm font-extrabold text-brand-graphite font-heading truncate max-w-md">{displayName}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <RatingStars value={r.rating} />
                        <span className="text-xs font-bold text-amber-600 font-numbers">{r.rating}.0</span>
                        <Badge tone="green">
                          <CheckCircle2 className="w-3 h-3 inline -mt-0.5 mr-0.5" /> Verified Purchase
                        </Badge>
                      </div>
                    </div>
                    <span className="text-[11px] font-medium text-brand-slate bg-slate-50 px-2.5 py-1 rounded-full border border-slate-200/60">
                      {new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>

                  {/* Mobile date line */}
                  <div className="sm:hidden flex items-center justify-between mt-1 text-[11px] text-brand-slate">
                    <span>Reviewed on {new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </div>

                  {/* Review Title & Body */}
                  {r.title && <p className="text-xs font-bold text-brand-graphite mt-2.5">{r.title}</p>}
                  <p className="text-xs text-brand-slate mt-1 leading-relaxed bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                    {r.body}
                  </p>

                  {/* Attached Photos */}
                  {r.images && r.images.length > 0 && (
                    <div className="flex gap-2.5 mt-3 flex-wrap">
                      {r.images.map((img, i) => (
                        <img 
                          key={i} 
                          src={img} 
                          alt="review attachment" 
                          className="w-16 h-16 rounded-xl object-cover border border-brand-border/80 shadow-sm hover:scale-105 transition-transform" 
                        />
                      ))}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center gap-3 mt-3.5 pt-3 border-t border-brand-border/50">
                    <button 
                      onClick={() => openEdit(r.id)} 
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-slate hover:text-brand-blue transition-colors px-2 py-1 rounded-lg hover:bg-blue-50"
                    >
                      <Pencil className="w-3.5 h-3.5" /> Edit Review
                    </button>
                    <button 
                      onClick={() => removeReview(r.id)} 
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-slate hover:text-red-500 transition-colors px-2 py-1 rounded-lg hover:bg-red-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Premium Write Review Modal */}
      {open && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center overflow-y-auto p-4 animate-in fade-in duration-200" 
          onClick={() => setOpen(false)}
        >
          <div 
            onClick={(e) => e.stopPropagation()} 
            className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-brand-border/80 text-left my-8"
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-brand-graphite via-slate-900 to-brand-graphite px-6 py-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-brand-blue/20 flex items-center justify-center text-brand-blue border border-brand-blue/30">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base font-heading">
                    {editId ? 'Edit Review' : 'Verified Customer Review'}
                  </h3>
                  <p className="text-[11px] text-slate-300 font-medium">Rate & review items you've purchased</p>
                </div>
              </div>
              <button 
                onClick={() => setOpen(false)} 
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* If user hasn't purchased any product */}
            {purchasable.length === 0 && !editId ? (
              <div className="p-8 text-center flex flex-col items-center gap-3">
                <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-500 shadow-sm">
                  <ShoppingBag className="w-7 h-7" />
                </div>
                <h4 className="font-extrabold text-sm text-brand-graphite font-heading mt-1">
                  Only Purchased Items Can Be Reviewed
                </h4>
                <p className="text-xs text-brand-slate max-w-sm leading-relaxed">
                  To keep all reviews 100% genuine and helpful, you can only write a review for products or services you have previously ordered.
                </p>
                <div className="flex items-center gap-2.5 mt-3">
                  <button 
                    onClick={() => { setOpen(false); navigateTo('home'); }} 
                    className="px-5 py-2.5 bg-brand-blue text-white rounded-xl text-xs font-bold shadow-md shadow-brand-blue/20 hover:bg-blue-700 transition-colors"
                  >
                    Browse Products
                  </button>
                  <button 
                    onClick={() => { setOpen(false); navigateTo('orders'); }} 
                    className="px-5 py-2.5 bg-slate-100 text-brand-graphite rounded-xl text-xs font-bold hover:bg-slate-200 transition-colors"
                  >
                    View My Orders
                  </button>
                </div>
              </div>
            ) : (
              /* Review Form with Visual Purchased Product Cards */
              <form onSubmit={submit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
                {/* Visual Product Selector */}
                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase tracking-wider text-brand-slate font-heading flex items-center justify-between">
                    <span>Select Purchased Item</span>
                    <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Verified Purchase
                    </span>
                  </label>

                  {/* Horizontal Scrollable Product Tiles */}
                  <div className="grid grid-cols-1 gap-2">
                    {purchasable.map((p) => {
                      const isSelected = (productId ? p.id === productId : p.id === purchasable[0]?.id);
                      return (
                        <div
                          key={p.id}
                          onClick={() => setProductId(p.id)}
                          className={`flex items-center gap-3.5 p-3 rounded-2xl border transition-all cursor-pointer ${
                            isSelected 
                              ? 'border-brand-blue bg-blue-50/50 ring-2 ring-brand-blue/20 shadow-sm' 
                              : 'border-brand-border bg-slate-50/40 hover:bg-slate-50 hover:border-slate-300'
                          }`}
                        >
                          <img 
                            src={p.image} 
                            alt={p.title} 
                            className="w-12 h-12 rounded-xl object-cover bg-white border border-brand-border/60 flex-shrink-0" 
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-brand-graphite truncate">{p.title}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[11px] font-extrabold text-brand-blue font-numbers">₹{p.price.toLocaleString()}</span>
                              <span className="text-[10px] text-slate-400 font-medium">• Order Verified</span>
                            </div>
                          </div>
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${
                            isSelected ? 'bg-brand-blue border-brand-blue text-white' : 'border-slate-300 bg-white'
                          }`}>
                            {isSelected && <Check className="w-3 h-3" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Rating with Interactive Stars & Feedback Badge */}
                <div className="bg-slate-50 border border-slate-200/70 rounded-2xl p-4 text-center space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase tracking-wider text-brand-slate font-heading">Your Overall Rating</span>
                    <span className="text-xs font-bold text-brand-graphite">{activeFeedback.label}</span>
                  </div>
                  
                  <div className="flex items-center justify-center gap-2 py-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <button
                        key={i}
                        type="button"
                        onMouseEnter={() => setHoverRating(i)}
                        onMouseLeave={() => setHoverRating(null)}
                        onClick={() => setRating(i)}
                        className="p-1 transition-transform hover:scale-125 focus:outline-none"
                      >
                        <Star 
                          className={`w-8 h-8 transition-colors ${
                            i <= currentScore 
                              ? 'fill-amber-400 text-amber-400 drop-shadow-sm' 
                              : 'text-slate-200 hover:text-amber-200'
                          }`} 
                        />
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-brand-slate font-medium">{activeFeedback.desc}</p>
                </div>

                {/* Headline / Title */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black uppercase tracking-wider text-brand-slate font-heading">
                    Review Headline
                  </label>
                  <input
                    className="w-full px-4 py-3 bg-slate-50/50 border border-brand-border rounded-xl text-xs font-bold text-brand-graphite focus:outline-none focus:border-brand-blue focus:bg-white focus:ring-2 focus:ring-brand-blue/10 transition-all placeholder:text-slate-400 shadow-sm"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Best purchase ever! / Excellent prompt service"
                    required
                  />
                </div>

                {/* Detailed Review Textarea */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black uppercase tracking-wider text-brand-slate font-heading">
                    Detailed Experience
                  </label>
                  <textarea
                    className="w-full px-4 py-3 bg-slate-50/50 border border-brand-border rounded-xl text-xs font-medium text-brand-graphite focus:outline-none focus:border-brand-blue focus:bg-white focus:ring-2 focus:ring-brand-blue/10 transition-all placeholder:text-slate-400 min-h-[95px] resize-none shadow-sm"
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="What did you like about the quality, packaging, delivery speed or technician's work?"
                    required
                  />
                </div>

                {/* Photo Upload Zone */}
                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase tracking-wider text-brand-slate font-heading flex items-center justify-between">
                    <span>Add Photos (Optional)</span>
                    <span className="text-[10px] text-brand-slate">{images.length}/4 photos</span>
                  </label>

                  <div className="flex gap-2.5 flex-wrap items-center">
                    {images.map((img, i) => (
                      <div key={i} className="relative group">
                        <img src={img} alt="review upload" className="w-16 h-16 rounded-xl object-cover border border-brand-border shadow-sm" />
                        <button
                          type="button"
                          onClick={() => setImages(images.filter((_, j) => j !== i))}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center shadow-md hover:bg-red-600 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}

                    {images.length < 4 && (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-300 hover:border-brand-blue hover:bg-blue-50/40 flex flex-col items-center justify-center text-brand-slate hover:text-brand-blue transition-all cursor-pointer"
                      >
                        <Camera className="w-5 h-5 mb-0.5" />
                        <span className="text-[9px] font-bold">Add</span>
                      </button>
                    )}
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileUpload} 
                      accept="image/*" 
                      multiple 
                      className="hidden" 
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-brand-border/60">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-brand-slate rounded-xl text-xs font-bold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2.5 bg-brand-blue hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-blue/25 disabled:opacity-50 transition-all"
                  >
                    {isSubmitting ? 'Saving Review...' : (editId ? 'Update Review' : 'Submit Review')}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
