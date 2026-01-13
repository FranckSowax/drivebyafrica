'use client';

import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/components/providers/ThemeProvider';
import { cn } from '@/lib/utils';

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        'relative w-14 h-7 rounded-full transition-all duration-300',
        'bg-[var(--surface-hover)] border border-[var(--card-border)]',
        'hover:border-mandarin/50',
        className
      )}
      aria-label={theme === 'light' ? 'Activer le mode sombre' : 'Activer le mode clair'}
    >
      {/* Toggle circle */}
      <div
        className={cn(
          'absolute top-0.5 w-6 h-6 rounded-full transition-all duration-300',
          'flex items-center justify-center',
          theme === 'light'
            ? 'left-0.5 bg-mandarin text-white'
            : 'left-7 bg-mandarin text-white'
        )}
      >
        {theme === 'light' ? (
          <Sun className="w-4 h-4" />
        ) : (
          <Moon className="w-4 h-4" />
        )}
      </div>
    </button>
  );
}
