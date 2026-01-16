'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, ChevronDown, Check, Loader2 } from 'lucide-react';
import { useLocale, type Language } from '@/components/providers/LocaleProvider';

const languages: { code: Language; label: string; flag: string }[] = [
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
];

export function LocaleSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
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
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Group currencies
  const cfaCurrencies = availableCurrencies.filter((c) =>
    ['XAF', 'XOF'].includes(c.code)
  );
  const otherCurrencies = availableCurrencies.filter(
    (c) => !['XAF', 'XOF'].includes(c.code)
  );

  const currentLanguage = languages.find((l) => l.code === language);

  if (!mounted) {
    return (
      <div className="w-20 h-8 bg-[var(--surface)] rounded-lg animate-pulse" />
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2 py-1.5 text-sm rounded-lg hover:bg-[var(--surface)] transition-colors text-[var(--text-secondary)]"
        aria-label="Change language and currency"
      >
        <Globe className="w-4 h-4" />
        <span className="hidden sm:inline">{currentLanguage?.flag}</span>
        <span className="font-medium">{currencyInfo?.code || currency}</span>
        <ChevronDown
          className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-72 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl shadow-xl overflow-hidden z-50"
          >
            {/* Language Section */}
            <div className="p-3 border-b border-[var(--card-border)]">
              <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                Langue / Language
              </p>
              <div className="flex gap-2">
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => setLanguage(lang.code)}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      language === lang.code
                        ? 'bg-mandarin text-white'
                        : 'bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--surface)]/80'
                    }`}
                  >
                    <span>{lang.flag}</span>
                    <span>{lang.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Currency Section */}
            <div className="p-3 max-h-80 overflow-y-auto">
              <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                Devise / Currency
              </p>

              {isLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-mandarin" />
                </div>
              ) : (
                <>
                  {/* CFA Zone */}
                  {cfaCurrencies.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs text-[var(--text-muted)] mb-1 px-1">
                        Zone Franc CFA
                      </p>
                      <div className="space-y-1">
                        {cfaCurrencies.map((curr) => (
                          <button
                            key={curr.code}
                            onClick={() => {
                              setCurrency(curr.code);
                              setIsOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                              currency === curr.code
                                ? 'bg-mandarin/10 text-mandarin'
                                : 'hover:bg-[var(--surface)] text-[var(--text-secondary)]'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">{curr.symbol}</span>
                              <span>{curr.name}</span>
                            </div>
                            {currency === curr.code && (
                              <Check className="w-4 h-4" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Other Currencies */}
                  {otherCurrencies.length > 0 && (
                    <div>
                      <p className="text-xs text-[var(--text-muted)] mb-1 px-1">
                        Autres devises
                      </p>
                      <div className="space-y-1">
                        {otherCurrencies.map((curr) => (
                          <button
                            key={curr.code}
                            onClick={() => {
                              setCurrency(curr.code);
                              setIsOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                              currency === curr.code
                                ? 'bg-mandarin/10 text-mandarin'
                                : 'hover:bg-[var(--surface)] text-[var(--text-secondary)]'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">{curr.symbol}</span>
                              <span>{curr.name}</span>
                            </div>
                            {currency === curr.code && (
                              <Check className="w-4 h-4" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
