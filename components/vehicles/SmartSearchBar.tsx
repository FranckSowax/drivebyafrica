'use client';

import { useRef } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SmartSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  isLoading?: boolean;
  className?: string;
}

export function SmartSearchBar({ value, onChange, onSubmit, isLoading, className }: SmartSearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSubmit?.();
      inputRef.current?.blur();
    }
  };

  return (
    <div className={cn('relative', className)}>
      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
        <Search className="w-4 h-4" />
      </div>
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Rechercher marque, modèle, référence..."
        className={cn(
          'w-full h-11 sm:h-10 pl-10 pr-10 bg-[var(--surface)] border rounded-lg text-base sm:text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]',
          'transition-colors duration-200',
          'focus:outline-none focus:ring-2 focus:ring-mandarin focus:border-transparent',
          'border-[var(--card-border)] hover:border-[var(--text-muted)]',
        )}
      />
      {value && !isLoading && (
        <button
          type="button"
          onClick={() => { onChange(''); inputRef.current?.focus(); }}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      )}
      {isLoading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <Loader2 className="w-4 h-4 animate-spin text-mandarin" />
        </div>
      )}
    </div>
  );
}
