import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronRight, Check } from 'lucide-react';

interface SlideToConfirmProps {
  label: string;
  onConfirm: () => void;
  isLoading?: boolean;
  color?: 'emerald' | 'orange' | 'blue';
}

export const SlideToConfirm: React.FC<SlideToConfirmProps> = ({
  label,
  onConfirm,
  isLoading = false,
  color = 'orange',
}) => {
  const [sliderPos, setSliderPos] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const colorStyles = {
    orange: {
      track: 'bg-orange-950/60 border-orange-500/40',
      thumb: 'bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 shadow-orange-500/30',
      fill: 'bg-orange-500/30',
      text: 'text-orange-200',
    },
    emerald: {
      track: 'bg-emerald-950/60 border-emerald-500/40',
      thumb: 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 shadow-emerald-500/30',
      fill: 'bg-emerald-500/30',
      text: 'text-emerald-200',
    },
    blue: {
      track: 'bg-blue-950/60 border-blue-500/40',
      thumb: 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-blue-500/30',
      fill: 'bg-blue-500/30',
      text: 'text-blue-200',
    },
  }[color];

  const triggerConfirm = useCallback(() => {
    setConfirmed(true);
    onConfirm();
    setTimeout(() => {
      setSliderPos(0);
      setConfirmed(false);
    }, 1200);
  }, [onConfirm]);

  const handleTouchMove = (e: TouchEvent) => {
    if (!isDragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const touchX = e.touches[0].clientX - rect.left - 24;
    const maxDrag = rect.width - 56;
    const clamped = Math.max(0, Math.min(touchX, maxDrag));
    setSliderPos(clamped);

    if (clamped >= maxDrag * 0.92) {
      setIsDragging(false);
      triggerConfirm();
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    if (!confirmed) {
      setSliderPos(0);
    }
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleTouchEnd);
    }
    return () => {
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-14 rounded-2xl border flex items-center select-none overflow-hidden p-1 shadow-inner ${colorStyles.track}`}
    >
      {/* Background progress fill */}
      <div
        className={`absolute left-0 top-0 bottom-0 transition-all ${colorStyles.fill}`}
        style={{ width: `${sliderPos + 48}px` }}
      />

      {/* Shimmering Center Label */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none px-12">
        <span className={`text-xs sm:text-sm font-bold tracking-wide uppercase ${colorStyles.text}`}>
          {isLoading ? 'Processing...' : confirmed ? 'Confirmed!' : label}
        </span>
      </div>

      {/* Draggable Thumb */}
      <div
        onTouchStart={() => setIsDragging(true)}
        onMouseDown={() => {
          // Fallback click on desktop to easily test/proceed
          triggerConfirm();
        }}
        className={`relative z-10 w-12 h-12 rounded-xl flex items-center justify-center cursor-grab active:cursor-grabbing shadow-lg transition-transform ${
          colorStyles.thumb
        }`}
        style={{
          transform: `translateX(${sliderPos}px)`,
          transition: isDragging ? 'none' : 'transform 0.25s ease-out',
        }}
      >
        {confirmed ? (
          <Check className="w-5 h-5 text-slate-950 animate-bounce" />
        ) : (
          <ChevronRight className="w-6 h-6 stroke-[3] animate-pulse" />
        )}
      </div>
    </div>
  );
};
