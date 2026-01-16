'use client';

import { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { useLocaleStore, type Language, type CurrencyInfo } from '@/store/useLocaleStore';

export type { Language, CurrencyInfo };
import frTranslations from '@/locales/fr.json';
import enTranslations from '@/locales/en.json';
import { setDynamicRates } from '@/lib/utils/currency';

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

    // Refresh currencies every 5 minutes to catch updates
    const intervalId = setInterval(fetchCurrencies, 5 * 60 * 1000);
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

  // Format price in selected currency
  const formatPrice = useCallback(
    (amountUsd: number): string => {
      const converted = convertFromUsd(amountUsd);
      const code = currencyInfo?.code || 'USD';
      const symbol = currencyInfo?.symbol || '$';
      const locale = language === 'fr' ? 'fr-FR' : 'en-US';

      // For CFA currencies, use custom format
      if (code === 'XAF' || code === 'XOF') {
        const formatted = new Intl.NumberFormat(locale, {
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(Math.round(converted));
        return `${formatted} FCFA`;
      }

      // For other currencies with symbols
      if (code === 'NGN') {
        const formatted = new Intl.NumberFormat(locale, {
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(Math.round(converted));
        return `${symbol}${formatted}`;
      }

      // For currencies with special symbols
      if (['GNF', 'RWF', 'BIF'].includes(code)) {
        const formatted = new Intl.NumberFormat(locale, {
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(Math.round(converted));
        return `${formatted} ${symbol}`;
      }

      // For USD and EUR, use standard formatter
      try {
        return new Intl.NumberFormat(locale, {
          style: 'currency',
          currency: code,
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(converted);
      } catch {
        const formatted = new Intl.NumberFormat(locale, {
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(Math.round(converted));
        return `${symbol}${formatted}`;
      }
    },
    [convertFromUsd, currencyInfo, language]
  );

  // Get raw converted value
  const formatPriceRaw = useCallback(
    (amountUsd: number): number => {
      return Math.round(convertFromUsd(amountUsd));
    },
    [convertFromUsd]
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
  } = useLocale();
  return {
    currency,
    currencyInfo,
    setCurrency,
    availableCurrencies,
    formatPrice,
    formatPriceRaw,
    convertFromUsd,
  };
}
