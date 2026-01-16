'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, ChevronDown, Check, Loader2, Search, X, Coins } from 'lucide-react';
import { useLocale, type Language, type CurrencyInfo } from '@/components/providers/LocaleProvider';
import { cn } from '@/lib/utils';

const languages: { code: Language; label: string; flag: string }[] = [
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
];

// Currency code to flag emoji mapping
const CURRENCY_FLAGS: Record<string, string> = {
  // Base currencies
  USD: '🇺🇸',
  EUR: '🇪🇺',
  // Zone CFA
  XAF: '🇨🇲', // Cameroun (représente CEMAC)
  XOF: '🇸🇳', // Sénégal (représente UEMOA)
  // Afrique de l'Ouest
  NGN: '🇳🇬',
  GHS: '🇬🇭',
  GNF: '🇬🇳',
  SLL: '🇸🇱',
  LRD: '🇱🇷',
  GMD: '🇬🇲',
  MRU: '🇲🇷',
  CVE: '🇨🇻',
  // Afrique Centrale
  STN: '🇸🇹',
  // Afrique de l'Est
  KES: '🇰🇪',
  TZS: '🇹🇿',
  UGX: '🇺🇬',
  RWF: '🇷🇼',
  BIF: '🇧🇮',
  ETB: '🇪🇹',
  DJF: '🇩🇯',
  ERN: '🇪🇷',
  SOS: '🇸🇴',
  SSP: '🇸🇸',
  // Afrique du Nord
  MAD: '🇲🇦',
  DZD: '🇩🇿',
  TND: '🇹🇳',
  LYD: '🇱🇾',
  EGP: '🇪🇬',
  SDG: '🇸🇩',
  // Afrique Australe
  ZAR: '🇿🇦',
  MZN: '🇲🇿',
  ZMW: '🇿🇲',
  ZWL: '🇿🇼',
  BWP: '🇧🇼',
  MWK: '🇲🇼',
  // Océan Indien
  MGA: '🇲🇬',
  MUR: '🇲🇺',
  SCR: '🇸🇨',
  KMF: '🇰🇲',
};

// Currency regions for grouping
const CURRENCY_REGIONS: Record<string, { label: string; codes: string[] }> = {
  cfa: {
    label: 'Zone Franc CFA',
    codes: ['XAF', 'XOF'],
  },
  base: {
    label: 'Devises principales',
    codes: ['USD', 'EUR'],
  },
  westAfrica: {
    label: 'Afrique de l\'Ouest',
    codes: ['NGN', 'GHS', 'GNF', 'SLL', 'LRD', 'GMD', 'MRU', 'CVE'],
  },
  centralAfrica: {
    label: 'Afrique Centrale',
    codes: ['STN'],
  },
  eastAfrica: {
    label: 'Afrique de l\'Est',
    codes: ['KES', 'TZS', 'UGX', 'RWF', 'BIF', 'ETB', 'DJF', 'ERN', 'SOS', 'SSP'],
  },
  northAfrica: {
    label: 'Afrique du Nord',
    codes: ['MAD', 'DZD', 'TND', 'LYD', 'EGP', 'SDG'],
  },
  southernAfrica: {
    label: 'Afrique Australe',
    codes: ['ZAR', 'MZN', 'ZMW', 'ZWL', 'BWP', 'MWK'],
  },
  indianOcean: {
    label: 'Océan Indien',
    codes: ['MGA', 'MUR', 'SCR', 'KMF'],
  },
};

// Popular currencies to show at top
const POPULAR_CURRENCIES = ['XAF', 'XOF', 'USD', 'EUR', 'NGN', 'GHS', 'ZAR', 'KES', 'MAD', 'TZS', 'MZN'];

export function LocaleSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'popular' | 'all'>('popular');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const {
    language,
    setLanguage,
    currency,
    currencyInfo,
    setCurrency,
    availableCurrencies,
    isLoading,
    mounted,
  } = useLocale();

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Filter currencies based on search
  const filteredCurrencies = useMemo(() => {
    if (!searchQuery) return availableCurrencies;
    const query = searchQuery.toLowerCase();
    return availableCurrencies.filter(
      (c) =>
        c.code.toLowerCase().includes(query) ||
        c.name.toLowerCase().includes(query) ||
        c.symbol.toLowerCase().includes(query) ||
        c.countries.some((country) => country.toLowerCase().includes(query))
    );
  }, [availableCurrencies, searchQuery]);

  // Get popular currencies
  const popularCurrencies = useMemo(() => {
    return POPULAR_CURRENCIES
      .map((code) => availableCurrencies.find((c) => c.code === code))
      .filter(Boolean) as CurrencyInfo[];
  }, [availableCurrencies]);

  // Group currencies by region
  const groupedCurrencies = useMemo(() => {
    const groups: { label: string; currencies: CurrencyInfo[] }[] = [];

    Object.entries(CURRENCY_REGIONS).forEach(([, region]) => {
      const currencies = region.codes
        .map((code) => filteredCurrencies.find((c) => c.code === code))
        .filter(Boolean) as CurrencyInfo[];

      if (currencies.length > 0) {
        groups.push({ label: region.label, currencies });
      }
    });

    // Add any remaining currencies not in regions
    const allRegionCodes = Object.values(CURRENCY_REGIONS).flatMap((r) => r.codes);
    const otherCurrencies = filteredCurrencies.filter(
      (c) => !allRegionCodes.includes(c.code)
    );
    if (otherCurrencies.length > 0) {
      groups.push({ label: 'Autres', currencies: otherCurrencies });
    }

    return groups;
  }, [filteredCurrencies]);

  const currentLanguage = languages.find((l) => l.code === language);

  // Display name for current currency (show FCFA for both XAF and XOF)
  const displayCurrency = useMemo(() => {
    if (currency === 'XAF' || currency === 'XOF') return 'FCFA';
    return currencyInfo?.code || currency;
  }, [currency, currencyInfo]);

  // Handle currency selection - merge XAF/XOF display
  const getCurrencyDisplay = (curr: CurrencyInfo) => {
    if (curr.code === 'XAF' || curr.code === 'XOF') {
      return {
        symbol: 'FCFA',
        name: curr.code === 'XAF' ? 'Franc CFA (CEMAC)' : 'Franc CFA (UEMOA)',
        subtitle: curr.countries.slice(0, 3).join(', ') + (curr.countries.length > 3 ? '...' : ''),
      };
    }
    return {
      symbol: curr.symbol,
      name: curr.name,
      subtitle: curr.countries.slice(0, 2).join(', '),
    };
  };

  if (!mounted) {
    return (
      <div className="w-20 h-8 bg-[var(--surface)] rounded-lg animate-pulse" />
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-1.5 px-2.5 py-1.5 text-sm rounded-xl transition-all',
          'hover:bg-[var(--surface)] active:scale-95',
          'text-[var(--text-secondary)]',
          isOpen && 'bg-[var(--surface)]'
        )}
        aria-label="Change language and currency"
      >
        <Globe className="w-4 h-4" />
        <span className="hidden sm:inline text-base">{currentLanguage?.flag}</span>
        <span className="font-semibold text-[var(--text-primary)]">{displayCurrency}</span>
        <ChevronDown
          className={cn(
            'w-3.5 h-3.5 transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Mobile Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 md:hidden"
              onClick={() => setIsOpen(false)}
            />

            {/* Dropdown */}
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className={cn(
                'z-50 bg-[var(--card-bg)] border border-[var(--card-border)] shadow-2xl overflow-hidden',
                // Mobile: Full width bottom sheet
                'fixed inset-x-0 bottom-0 rounded-t-2xl max-h-[85vh]',
                // Desktop: Dropdown
                'md:absolute md:right-0 md:bottom-auto md:top-full md:mt-2 md:w-96 md:rounded-2xl md:max-h-[70vh]'
              )}
            >
              {/* Header */}
              <div className="sticky top-0 bg-[var(--card-bg)] border-b border-[var(--card-border)] z-10">
                {/* Mobile Handle */}
                <div className="flex justify-center pt-2 pb-1 md:hidden">
                  <div className="w-10 h-1 rounded-full bg-[var(--card-border)]" />
                </div>

                {/* Language Section */}
                <div className="p-4 pb-3">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                      Langue
                    </p>
                    <button
                      onClick={() => setIsOpen(false)}
                      className="p-1 rounded-lg hover:bg-[var(--surface)] md:hidden"
                    >
                      <X className="w-5 h-5 text-[var(--text-muted)]" />
                    </button>
                  </div>
                  <div className="flex gap-2">
                    {languages.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => setLanguage(lang.code)}
                        className={cn(
                          'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all',
                          language === lang.code
                            ? 'bg-mandarin text-white shadow-lg shadow-mandarin/25'
                            : 'bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--surface)]/80'
                        )}
                      >
                        <span className="text-lg">{lang.flag}</span>
                        <span>{lang.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Currency Header with Search */}
                <div className="px-4 pb-3">
                  <div className="flex items-center gap-2 mb-3">
                    <Coins className="w-4 h-4 text-mandarin" />
                    <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                      Devise
                    </p>
                  </div>

                  {/* Search Input */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      placeholder="Rechercher une devise ou un pays..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className={cn(
                        'w-full pl-10 pr-10 py-2.5 rounded-xl text-sm',
                        'bg-[var(--surface)] border border-[var(--card-border)]',
                        'text-[var(--text-primary)] placeholder:text-[var(--text-muted)]',
                        'focus:outline-none focus:border-mandarin focus:ring-2 focus:ring-mandarin/20'
                      )}
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Tabs - Only show when not searching */}
                  {!searchQuery && (
                    <div className="flex gap-1 mt-3 p-1 bg-[var(--surface)] rounded-xl">
                      <button
                        onClick={() => setActiveTab('popular')}
                        className={cn(
                          'flex-1 py-2 text-xs font-medium rounded-lg transition-all',
                          activeTab === 'popular'
                            ? 'bg-[var(--card-bg)] text-[var(--text-primary)] shadow-sm'
                            : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                        )}
                      >
                        Populaires
                      </button>
                      <button
                        onClick={() => setActiveTab('all')}
                        className={cn(
                          'flex-1 py-2 text-xs font-medium rounded-lg transition-all',
                          activeTab === 'all'
                            ? 'bg-[var(--card-bg)] text-[var(--text-primary)] shadow-sm'
                            : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                        )}
                      >
                        Toutes les devises
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Currency List */}
              <div className="overflow-y-auto max-h-[50vh] md:max-h-[40vh] overscroll-contain">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-mandarin" />
                  </div>
                ) : searchQuery ? (
                  // Search Results
                  <div className="p-3">
                    {filteredCurrencies.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-[var(--text-muted)]">Aucune devise trouvée</p>
                        <p className="text-xs text-[var(--text-muted)] mt-1">
                          Essayez un autre terme de recherche
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-1">
                        {filteredCurrencies.map((curr) => {
                          const display = getCurrencyDisplay(curr);
                          return (
                            <CurrencyButton
                              key={curr.code}
                              currency={curr}
                              display={display}
                              isSelected={currency === curr.code}
                              onClick={() => {
                                setCurrency(curr.code);
                                setIsOpen(false);
                                setSearchQuery('');
                              }}
                            />
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : activeTab === 'popular' ? (
                  // Popular Currencies
                  <div className="p-3">
                    <div className="grid grid-cols-1 gap-1">
                      {popularCurrencies.map((curr) => {
                        const display = getCurrencyDisplay(curr);
                        return (
                          <CurrencyButton
                            key={curr.code}
                            currency={curr}
                            display={display}
                            isSelected={currency === curr.code}
                            onClick={() => {
                              setCurrency(curr.code);
                              setIsOpen(false);
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  // All Currencies Grouped
                  <div className="p-3 space-y-4">
                    {groupedCurrencies.map((group) => (
                      <div key={group.label}>
                        <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider px-2 mb-2">
                          {group.label}
                        </p>
                        <div className="grid grid-cols-1 gap-1">
                          {group.currencies.map((curr) => {
                            const display = getCurrencyDisplay(curr);
                            return (
                              <CurrencyButton
                                key={curr.code}
                                currency={curr}
                                display={display}
                                isSelected={currency === curr.code}
                                onClick={() => {
                                  setCurrency(curr.code);
                                  setIsOpen(false);
                                }}
                              />
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="sticky bottom-0 p-3 bg-[var(--card-bg)] border-t border-[var(--card-border)]">
                <p className="text-xs text-center text-[var(--text-muted)]">
                  {availableCurrencies.length} devises disponibles
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// Currency Button Component
function CurrencyButton({
  currency: curr,
  display,
  isSelected,
  onClick,
}: {
  currency: CurrencyInfo;
  display: { symbol: string; name: string; subtitle: string };
  isSelected: boolean;
  onClick: () => void;
}) {
  const flag = CURRENCY_FLAGS[curr.code] || '💰';

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all',
        isSelected
          ? 'bg-mandarin/10 text-mandarin border border-mandarin/30'
          : 'hover:bg-[var(--surface)] text-[var(--text-secondary)] border border-transparent'
      )}
    >
      <div className={cn(
        'flex items-center justify-center w-10 h-10 rounded-lg text-2xl',
        isSelected ? 'bg-mandarin/20' : 'bg-[var(--surface)]'
      )}>
        {flag}
      </div>
      <div className="flex-1 text-left min-w-0">
        <p className={cn(
          'font-medium truncate',
          isSelected ? 'text-mandarin' : 'text-[var(--text-primary)]'
        )}>
          {display.name}
        </p>
        <p className="text-xs text-[var(--text-muted)] truncate">
          {display.symbol} • {display.subtitle}
        </p>
      </div>
      {isSelected && (
        <Check className="w-5 h-5 text-mandarin flex-shrink-0" />
      )}
    </button>
  );
}
