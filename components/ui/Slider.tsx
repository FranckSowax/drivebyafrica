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

      if (isDragging === 'start') {
        onValueChange([Math.min(newValue, value[1] - step), value[1]]);
      } else {
        onValueChange([value[0], Math.max(newValue, value[0] + step)]);
      }
    },
    [isDragging, getValueFromPosition, onValueChange, value, step]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(null);
  }, []);

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
            left: `${getPercentage(value[0])}%`,
            width: `${getPercentage(value[1]) - getPercentage(value[0])}%`,
          }}
        />

        {/* Start thumb */}
        <div
          className={cn(
            'absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 bg-white rounded-full shadow-md cursor-grab border-2 border-mandarin transition-transform',
            isDragging === 'start' && 'scale-110 cursor-grabbing'
          )}
          style={{ left: `${getPercentage(value[0])}%` }}
          onMouseDown={handleMouseDown('start')}
        />

        {/* End thumb */}
        <div
          className={cn(
            'absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 bg-white rounded-full shadow-md cursor-grab border-2 border-mandarin transition-transform',
            isDragging === 'end' && 'scale-110 cursor-grabbing'
          )}
          style={{ left: `${getPercentage(value[1])}%` }}
          onMouseDown={handleMouseDown('end')}
        />
      </div>

      {/* Value labels */}
      {formatValue && (
        <div className="flex justify-between mt-2 text-xs text-nobel">
          <span>{formatValue(value[0])}</span>
          <span>{formatValue(value[1])}</span>
        </div>
      )}
    </div>
  );
}
