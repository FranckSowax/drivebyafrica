'use client';

import { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { useLocaleStore, type Language, type CurrencyInfo } from '@/store/useLocaleStore';

export type { Language, CurrencyInfo };
import frTranslations from '@/locales/fr.json';
import enTranslations from '@/locales/en.json';
import { setDynamicRates } from '@/lib/utils/currency';

// Currencies that support full quote conversion (devis + estimations)
// Other currencies only display prices but quotes/orders are in USD
const QUOTE_CURRENCIES = ['USD', 'EUR', 'XAF'] as const;
type QuoteCurrency = typeof QUOTE_CURRENCIES[number];

// Translations type
type TranslationKeys = typeof frTranslations;

interface LocaleContextType {
  // Language
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;

  // Currency
  currency: string;
  currencyInfo: CurrencyInfo | null;
  setCurrency: (code: string) => void;
  availableCurrencies: CurrencyInfo[];

  // Formatting functions
  formatPrice: (amountUsd: number) => string;
  formatPriceRaw: (amountUsd: number) => number;
  convertFromUsd: (amountUsd: number) => number;

  // Quote currency functions (USD, EUR, XAF support full conversion; others show USD)
  isQuoteCurrency: () => boolean;
  getQuoteCurrency: () => CurrencyInfo;
  getQuoteCurrencyCode: () => string;
  formatQuotePrice: (amountUsd: number) => string;
  convertToQuoteCurrency: (amountUsd: number) => number;

  // Loading state
  isLoading: boolean;
  mounted: boolean;
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

// Translations map
const translations: Record<Language, TranslationKeys> = {
  fr: frTranslations,
  en: enTranslations,
};

// Get nested value from object by dot notation
function getNestedValue(obj: unknown, path: string): string {
  const keys = path.split('.');
  let current = obj as Record<string, unknown>;

  for (const key of keys) {
    if (current === undefined || current === null) return path;
    current = current[key] as Record<string, unknown>;
  }

  return typeof current === 'string' ? current : path;
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  // Zustand store
  const {
    language,
    setLanguage: setStoreLang,
    currency,
    currencyInfo,
    setCurrency: setStoreCurrency,
    setCurrencyInfo,
    availableCurrencies,
    setAvailableCurrencies,
    isLoading,
    setIsLoading,
    country,
  } = useLocaleStore();

  // Fetch currencies on mount and periodically refresh
  useEffect(() => {
    const fetchCurrencies = async () => {
      try {
        setIsLoading(true);
        // Add cache-busting query param
        const response = await fetch(`/api/currencies?_t=${Date.now()}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
          },
        });
        if (response.ok) {
          const data = await response.json();
          setAvailableCurrencies(data.currencies || []);

          // Update dynamic rates in currency utility for non-hook usage
          if (data.currencies && data.currencies.length > 0) {
            const ratesMap: Record<string, number> = {};
            data.currencies.forEach((c: CurrencyInfo) => {
              ratesMap[c.code] = c.rateToUsd;
            });
            setDynamicRates(ratesMap);
          }

          // If we have a country set, find matching currency
          if (country) {
            const matchingCurrency = data.currencies?.find((c: CurrencyInfo) =>
              c.countries.some((ctry: string) =>
                ctry.toLowerCase() === country.toLowerCase()
              )
            );
            if (matchingCurrency && matchingCurrency.code !== currency) {
              setStoreCurrency(matchingCurrency.code);
              setCurrencyInfo(matchingCurrency);
            }
          }

          // Always update currency info with fresh data from API
          const currentCurrencyData = data.currencies?.find(
            (c: CurrencyInfo) => c.code === currency
          );
          if (currentCurrencyData) {
            setCurrencyInfo(currentCurrencyData);
          }
        }
      } catch (error) {
        console.error('Failed to fetch currencies:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCurrencies();
    setMounted(true);

    // Refresh currencies every 12 hours (2 times per day)
    const intervalId = setInterval(fetchCurrencies, 12 * 60 * 60 * 1000);
    return () => clearInterval(intervalId);
  }, []);

  // Translation function
  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      let value = getNestedValue(translations[language], key);

      if (params) {
        Object.entries(params).forEach(([paramKey, paramValue]) => {
          value = value.replace(`{${paramKey}}`, String(paramValue));
        });
      }

      return value;
    },
    [language]
  );

  // Set language and update document
  const setLanguage = useCallback(
    (lang: Language) => {
      setStoreLang(lang);
      if (typeof document !== 'undefined') {
        document.documentElement.lang = lang;
      }
    },
    [setStoreLang]
  );

  // Set currency and update info
  const setCurrency = useCallback(
    (code: string) => {
      setStoreCurrency(code);
      const info = availableCurrencies.find((c) => c.code === code);
      if (info) {
        setCurrencyInfo(info);
      }
    },
    [setStoreCurrency, setCurrencyInfo, availableCurrencies]
  );

  // Convert USD to selected currency
  const convertFromUsd = useCallback(
    (amountUsd: number): number => {
      const rate = currencyInfo?.rateToUsd || 1;
      return amountUsd * rate;
    },
    [currencyInfo]
  );

  // Format number with proper thousand separators (regular spaces)
  const formatWithSpaces = useCallback((num: number): string => {
    // Format with regular spaces as thousand separators
    return Math.round(num)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }, []);

  // Format price in selected currency
  const formatPrice = useCallback(
    (amountUsd: number): string => {
      const converted = convertFromUsd(amountUsd);
      const code = currencyInfo?.code || 'USD';
      const symbol = currencyInfo?.symbol || '$';

      // For CFA currencies, use custom format with regular spaces
      if (code === 'XAF' || code === 'XOF') {
        return `${formatWithSpaces(converted)} FCFA`;
      }

      // For other currencies with symbols (prefix)
      if (code === 'NGN') {
        return `${symbol}${formatWithSpaces(converted)}`;
      }

      // For currencies with special symbols (suffix)
      if (['GNF', 'RWF', 'BIF'].includes(code)) {
        return `${formatWithSpaces(converted)} ${symbol}`;
      }

      // For USD
      if (code === 'USD') {
        return `$${formatWithSpaces(converted)}`;
      }

      // For EUR
      if (code === 'EUR') {
        return `${formatWithSpaces(converted)} €`;
      }

      // Default: symbol prefix
      return `${symbol}${formatWithSpaces(converted)}`;
    },
    [convertFromUsd, currencyInfo, formatWithSpaces]
  );

  // Get raw converted value
  const formatPriceRaw = useCallback(
    (amountUsd: number): number => {
      return Math.round(convertFromUsd(amountUsd));
    },
    [convertFromUsd]
  );

  // Check if current currency supports full quote conversion
  const isQuoteCurrency = useCallback((): boolean => {
    const code = currencyInfo?.code || 'USD';
    return QUOTE_CURRENCIES.includes(code as QuoteCurrency);
  }, [currencyInfo]);

  // Get the currency to use for quotes (selected if quote currency, otherwise USD)
  const getQuoteCurrency = useCallback((): CurrencyInfo => {
    const code = currencyInfo?.code || currency || 'USD';

    // If current currency is a quote currency, use it
    if (QUOTE_CURRENCIES.includes(code as QuoteCurrency)) {
      // Return currencyInfo if available
      if (currencyInfo && currencyInfo.rateToUsd) {
        return currencyInfo;
      }
      // Try to find in availableCurrencies
      const found = availableCurrencies.find(c => c.code === code);
      if (found && found.rateToUsd) {
        return found;
      }
      // Fallback with default rates for quote currencies
      if (code === 'XAF' || code === 'XOF') {
        return {
          code: code,
          name: code === 'XAF' ? 'Franc CFA BEAC' : 'Franc CFA BCEAO',
          symbol: 'FCFA',
          rateToUsd: 615,
          countries: [],
        };
      }
      if (code === 'EUR') {
        return {
          code: 'EUR',
          name: 'Euro',
          symbol: '€',
          rateToUsd: 0.92,
          countries: [],
        };
      }
    }
    // Return USD info for non-quote currencies or as ultimate fallback
    return availableCurrencies.find(c => c.code === 'USD') || {
      code: 'USD',
      name: 'US Dollar',
      symbol: '$',
      rateToUsd: 1,
      countries: [],
    };
  }, [currencyInfo, currency, availableCurrencies]);

  // Get the currency code to use for quotes
  const getQuoteCurrencyCode = useCallback((): string => {
    return getQuoteCurrency().code;
  }, [getQuoteCurrency]);

  // Convert USD to quote currency (selected if quote currency, otherwise USD)
  const convertToQuoteCurrency = useCallback(
    (amountUsd: number): number => {
      const quoteCurrency = getQuoteCurrency();
      const rate = quoteCurrency.rateToUsd || 1;
      return amountUsd * rate;
    },
    [getQuoteCurrency]
  );

  // Format price for quotes (uses quote currency)
  const formatQuotePrice = useCallback(
    (amountUsd: number): string => {
      const quoteCurrency = getQuoteCurrency();
      const converted = convertToQuoteCurrency(amountUsd);
      const code = quoteCurrency.code;
      const symbol = quoteCurrency.symbol;

      // For CFA currencies, use custom format with regular spaces
      if (code === 'XAF' || code === 'XOF') {
        return `${formatWithSpaces(converted)} FCFA`;
      }

      // For USD
      if (code === 'USD') {
        return `$${formatWithSpaces(converted)}`;
      }

      // For EUR
      if (code === 'EUR') {
        return `${formatWithSpaces(converted)} €`;
      }

      // Default: symbol prefix
      return `${symbol}${formatWithSpaces(converted)}`;
    },
    [getQuoteCurrency, convertToQuoteCurrency, formatWithSpaces]
  );

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t,
      currency,
      currencyInfo,
      setCurrency,
      availableCurrencies,
      formatPrice,
      formatPriceRaw,
      convertFromUsd,
      isQuoteCurrency,
      getQuoteCurrency,
      getQuoteCurrencyCode,
      formatQuotePrice,
      convertToQuoteCurrency,
      isLoading,
      mounted,
    }),
    [
      language,
      setLanguage,
      t,
      currency,
      currencyInfo,
      setCurrency,
      availableCurrencies,
      formatPrice,
      formatPriceRaw,
      convertFromUsd,
      isQuoteCurrency,
      getQuoteCurrency,
      getQuoteCurrencyCode,
      formatQuotePrice,
      convertToQuoteCurrency,
      isLoading,
      mounted,
    ]
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (context === undefined) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }
  return context;
}

// Shorthand hooks
export function useTranslation() {
  const { t, language, setLanguage } = useLocale();
  return { t, language, setLanguage };
}

export function useCurrency() {
  const {
    currency,
    currencyInfo,
    setCurrency,
    availableCurrencies,
    formatPrice,
    formatPriceRaw,
    convertFromUsd,
    isQuoteCurrency,
    getQuoteCurrency,
    getQuoteCurrencyCode,
    formatQuotePrice,
    convertToQuoteCurrency,
  } = useLocale();
  return {
    currency,
    currencyInfo,
    setCurrency,
    availableCurrencies,
    formatPrice,
    formatPriceRaw,
    convertFromUsd,
    // Quote currency functions (USD, EUR, XAF support full conversion; others use USD)
    isQuoteCurrency,
    getQuoteCurrency,
    getQuoteCurrencyCode,
    formatQuotePrice,
    convertToQuoteCurrency,
  };
}
