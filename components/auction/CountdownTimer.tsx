'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface CountdownTimerProps {
  targetDate: string | Date;
  onComplete?: () => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showLabels?: boolean;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

function calculateTimeLeft(targetDate: Date): TimeLeft {
  const difference = targetDate.getTime() - Date.now();

  if (difference <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
  }

  return {
    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((difference / 1000 / 60) % 60),
    seconds: Math.floor((difference / 1000) % 60),
    total: difference,
  };
}

const sizeStyles = {
  sm: {
    container: 'gap-1',
    box: 'w-10 h-10',
    number: 'text-sm',
    label: 'text-[10px]',
    separator: 'text-sm',
  },
  md: {
    container: 'gap-2',
    box: 'w-14 h-14',
    number: 'text-lg',
    label: 'text-xs',
    separator: 'text-lg',
  },
  lg: {
    container: 'gap-3',
    box: 'w-20 h-20',
    number: 'text-2xl',
    label: 'text-sm',
    separator: 'text-2xl',
  },
};

export function CountdownTimer({
  targetDate,
  onComplete,
  className,
  size = 'md',
  showLabels = true,
}: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() =>
    calculateTimeLeft(new Date(targetDate))
  );
  const [isComplete, setIsComplete] = useState(false);

  const styles = sizeStyles[size];

  useEffect(() => {
    const target = new Date(targetDate);
    const interval = setInterval(() => {
      const newTimeLeft = calculateTimeLeft(target);
      setTimeLeft(newTimeLeft);

      if (newTimeLeft.total <= 0 && !isComplete) {
        setIsComplete(true);
        onComplete?.();
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [targetDate, onComplete, isComplete]);

  if (isComplete) {
    return (
      <div className={cn('text-center', className)}>
        <span className="text-mandarin font-bold">Enchère terminée</span>
      </div>
    );
  }

  const TimeBox = ({
    value,
    label,
  }: {
    value: number;
    label: string;
  }) => (
    <div className="flex flex-col items-center">
      <div
        className={cn(
          'bg-surface rounded-lg flex items-center justify-center',
          styles.box
        )}
      >
        <span className={cn('font-bold text-white tabular-nums', styles.number)}>
          {value.toString().padStart(2, '0')}
        </span>
      </div>
      {showLabels && (
        <span className={cn('text-nobel mt-1 uppercase', styles.label)}>
          {label}
        </span>
      )}
    </div>
  );

  const Separator = () => (
    <span className={cn('text-nobel font-bold self-start mt-3', styles.separator)}>
      :
    </span>
  );

  const isUrgent = timeLeft.total < 60 * 60 * 1000; // Less than 1 hour

  return (
    <div className={cn('flex items-start', styles.container, className)}>
      {timeLeft.days > 0 && (
        <>
          <TimeBox value={timeLeft.days} label="Jours" />
          <Separator />
        </>
      )}
      <TimeBox value={timeLeft.hours} label="Heures" />
      <Separator />
      <TimeBox value={timeLeft.minutes} label="Min" />
      <Separator />
      <div className={cn(isUrgent && 'animate-pulse')}>
        <TimeBox value={timeLeft.seconds} label="Sec" />
      </div>
    </div>
  );
}

// Simplified inline countdown for cards
interface InlineCountdownProps {
  targetDate: string | Date;
  className?: string;
}

export function InlineCountdown({ targetDate, className }: InlineCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() =>
    calculateTimeLeft(new Date(targetDate))
  );

  useEffect(() => {
    const target = new Date(targetDate);
    const interval = setInterval(() => {
      setTimeLeft(calculateTimeLeft(target));
    }, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  if (timeLeft.total <= 0) {
    return <span className={cn('text-red-500 font-medium', className)}>Terminée</span>;
  }

  const isUrgent = timeLeft.total < 60 * 60 * 1000;
  const parts: string[] = [];

  if (timeLeft.days > 0) {
    parts.push(`${timeLeft.days}j`);
  }
  parts.push(`${timeLeft.hours}h`);
  parts.push(`${timeLeft.minutes}m`);
  if (timeLeft.days === 0) {
    parts.push(`${timeLeft.seconds}s`);
  }

  return (
    <span
      className={cn(
        'font-medium tabular-nums',
        isUrgent ? 'text-mandarin animate-pulse' : 'text-white',
        className
      )}
    >
      {parts.join(' ')}
    </span>
  );
}
