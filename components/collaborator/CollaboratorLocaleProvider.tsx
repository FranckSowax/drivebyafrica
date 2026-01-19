'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import enTranslations from '@/locales/en.json';
import zhTranslations from '@/locales/zh.json';

type Locale = 'en' | 'zh';

type TranslationKeys = typeof enTranslations;

interface LocaleContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

const translations: Record<Locale, TranslationKeys> = {
  en: enTranslations as TranslationKeys,
  zh: zhTranslations as unknown as TranslationKeys,
};

const LOCALE_STORAGE_KEY = 'collaborator-locale';

function detectBrowserLocale(): Locale {
  if (typeof window === 'undefined') return 'en';

  const browserLang = navigator.language || (navigator as unknown as { userLanguage?: string }).userLanguage || 'en';

  // Check if browser language starts with 'zh' (Chinese)
  if (browserLang.toLowerCase().startsWith('zh')) {
    return 'zh';
  }

  return 'en';
}

function getNestedValue(obj: unknown, path: string): string | undefined {
  const keys = path.split('.');
  let current: unknown = obj;

  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }

  return typeof current === 'string' ? current : undefined;
}

function interpolate(template: string, params: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    return params[key] !== undefined ? String(params[key]) : `{${key}}`;
  });
}

interface CollaboratorLocaleProviderProps {
  children: React.ReactNode;
  defaultLocale?: Locale;
}

export function CollaboratorLocaleProvider({
  children,
  defaultLocale
}: CollaboratorLocaleProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale || 'en');
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize locale from storage or browser detection
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const storedLocale = localStorage.getItem(LOCALE_STORAGE_KEY) as Locale | null;

    if (storedLocale && (storedLocale === 'en' || storedLocale === 'zh')) {
      setLocaleState(storedLocale);
    } else {
      const detected = detectBrowserLocale();
      setLocaleState(detected);
      localStorage.setItem(LOCALE_STORAGE_KEY, detected);
    }

    setIsInitialized(true);
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCALE_STORAGE_KEY, newLocale);
    }
  }, []);

  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    const translation = getNestedValue(translations[locale], key);

    if (!translation) {
      // Fallback to English if key not found in current locale
      const fallback = getNestedValue(translations.en, key);
      if (fallback) {
        return params ? interpolate(fallback, params) : fallback;
      }
      // Return key if not found in any locale
      console.warn(`Translation key not found: ${key}`);
      return key;
    }

    return params ? interpolate(translation, params) : translation;
  }, [locale]);

  // Prevent hydration mismatch by rendering children only after initialization
  if (!isInitialized && typeof window !== 'undefined') {
    return null;
  }

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useCollaboratorLocale(): LocaleContextType {
  const context = useContext(LocaleContext);

  if (!context) {
    throw new Error('useCollaboratorLocale must be used within a CollaboratorLocaleProvider');
  }

  return context;
}

// Export locale type for use in other components
export type { Locale };
