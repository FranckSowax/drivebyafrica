'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';

export interface SliderProps {
  min: number;
  max: number;
  step?: number;
  value: [number, number];
  onValueChange: (value: [number, number]) => void;
  className?: string;
  formatValue?: (value: number) => string;
}

export function Slider({
  min,
  max,
  step = 1,
  value,
  onValueChange,
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

  const handleMouseDown = (thumb: 'start' | 'end') => (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(thumb);
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;
      const newValue = getValueFromPosition(e.clientX);

      // Update local state only during drag (smooth UI, no re-renders of parent)
      setLocalValue(prev => {
        if (isDragging === 'start') {
          return [Math.min(newValue, prev[1] - step), prev[1]];
        } else {
          return [prev[0], Math.max(newValue, prev[0] + step)];
        }
      });
    },
    [isDragging, getValueFromPosition, step]
  );

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      // Only update parent state when drag ends - prevents flickering
      onValueChange(localValue);
    }
    setIsDragging(null);
  }, [isDragging, localValue, onValueChange]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

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
            'absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 bg-white rounded-full shadow-md cursor-grab border-2 border-mandarin transition-transform',
            isDragging === 'start' && 'scale-110 cursor-grabbing'
          )}
          style={{ left: `${getPercentage(displayValue[0])}%` }}
          onMouseDown={handleMouseDown('start')}
        />

        {/* End thumb */}
        <div
          className={cn(
            'absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 bg-white rounded-full shadow-md cursor-grab border-2 border-mandarin transition-transform',
            isDragging === 'end' && 'scale-110 cursor-grabbing'
          )}
          style={{ left: `${getPercentage(displayValue[1])}%` }}
          onMouseDown={handleMouseDown('end')}
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
