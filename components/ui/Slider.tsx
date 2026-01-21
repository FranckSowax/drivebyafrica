'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';

export interface SliderProps {
  min: number;
  max: number;
  step?: number;
  value: [number, number];
  onValueChange: (value: [number, number]) => void;
  onLiveChange?: (value: [number, number]) => void; // Called during drag for live preview
  className?: string;
  formatValue?: (value: number) => string;
}

export function Slider({
  min,
  max,
  step = 1,
  value,
  onValueChange,
  onLiveChange,
  className,
  formatValue,
}: SliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState<'start' | 'end' | null>(null);
  // Local state for smooth dragging - only update parent on mouse up
  const [localValue, setLocalValue] = useState<[number, number]>(value);

  // Sync local value with prop when not dragging
  useEffect(() => {
    if (!isDragging) {
      setLocalValue(value);
    }
  }, [value, isDragging]);

  const getPercentage = (val: number) => ((val - min) / (max - min)) * 100;

  const getValueFromPosition = useCallback(
    (clientX: number) => {
      if (!trackRef.current) return min;
      const rect = trackRef.current.getBoundingClientRect();
      const percentage = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const rawValue = min + percentage * (max - min);
      return Math.round(rawValue / step) * step;
    },
    [min, max, step]
  );

  // Mouse events
  const handleMouseDown = (thumb: 'start' | 'end') => (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(thumb);
  };

  // Touch events
  const handleTouchStart = (thumb: 'start' | 'end') => (e: React.TouchEvent) => {
    e.stopPropagation();
    setIsDragging(thumb);
  };

  const handleMove = useCallback(
    (clientX: number) => {
      if (!isDragging) return;
      const newValue = getValueFromPosition(clientX);

      // Update local state only during drag (smooth UI, no re-renders of parent)
      setLocalValue(prev => {
        let newLocalValue: [number, number];
        if (isDragging === 'start') {
          newLocalValue = [Math.min(newValue, prev[1] - step), prev[1]];
        } else {
          newLocalValue = [prev[0], Math.max(newValue, prev[0] + step)];
        }
        // Call onLiveChange for live preview during drag
        onLiveChange?.(newLocalValue);
        return newLocalValue;
      });
    },
    [isDragging, getValueFromPosition, step, onLiveChange]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      handleMove(e.clientX);
    },
    [handleMove]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (e.touches.length > 0) {
        handleMove(e.touches[0].clientX);
      }
    },
    [handleMove]
  );

  const handleEnd = useCallback(() => {
    if (isDragging) {
      // Only update parent state when drag ends - prevents flickering
      onValueChange(localValue);
    }
    setIsDragging(null);
  }, [isDragging, localValue, onValueChange]);

  useEffect(() => {
    if (isDragging) {
      // Mouse events
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleEnd);
      // Touch events
      window.addEventListener('touchmove', handleTouchMove, { passive: true });
      window.addEventListener('touchend', handleEnd);
      window.addEventListener('touchcancel', handleEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleEnd);
      window.removeEventListener('touchcancel', handleEnd);
    };
  }, [isDragging, handleMouseMove, handleTouchMove, handleEnd]);

  // Use local value for display (smooth during drag)
  const displayValue = localValue;

  return (
    <div className={cn('w-full', className)}>
      <div
        ref={trackRef}
        className="relative h-2 bg-nobel/30 rounded-full cursor-pointer"
      >
        {/* Active track */}
        <div
          className="absolute h-full bg-mandarin rounded-full"
          style={{
            left: `${getPercentage(displayValue[0])}%`,
            width: `${getPercentage(displayValue[1]) - getPercentage(displayValue[0])}%`,
          }}
        />

        {/* Start thumb */}
        <div
          className={cn(
            'absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 bg-white rounded-full shadow-md cursor-grab border-2 border-mandarin transition-transform touch-none',
            isDragging === 'start' && 'scale-110 cursor-grabbing'
          )}
          style={{ left: `${getPercentage(displayValue[0])}%` }}
          onMouseDown={handleMouseDown('start')}
          onTouchStart={handleTouchStart('start')}
        />

        {/* End thumb */}
        <div
          className={cn(
            'absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 bg-white rounded-full shadow-md cursor-grab border-2 border-mandarin transition-transform touch-none',
            isDragging === 'end' && 'scale-110 cursor-grabbing'
          )}
          style={{ left: `${getPercentage(displayValue[1])}%` }}
          onMouseDown={handleMouseDown('end')}
          onTouchStart={handleTouchStart('end')}
        />
      </div>

      {/* Value labels */}
      {formatValue && (
        <div className="flex justify-between mt-2 text-xs text-nobel">
          <span>{formatValue(displayValue[0])}</span>
          <span>{formatValue(displayValue[1])}</span>
        </div>
      )}
    </div>
  );
}
