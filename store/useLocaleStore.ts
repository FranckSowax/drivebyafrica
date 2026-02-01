import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Types
export type Language = 'fr' | 'en';

export interface CurrencyInfo {
  code: string;
  name: string;
  symbol: string;
  rateToUsd: number;
  countries: string[];
}

interface LocaleState {
  // Language
  language: Language;
  setLanguage: (lang: Language) => void;

  // Currency
  currency: string;
  currencyInfo: CurrencyInfo | null;
  setCurrency: (code: string) => void;
  setCurrencyInfo: (info: CurrencyInfo | null) => void;

  // Available currencies (fetched from API)
  availableCurrencies: CurrencyInfo[];
  setAvailableCurrencies: (currencies: CurrencyInfo[]) => void;

  // Country (for auto-selecting currency)
  country: string | null;
  setCountry: (country: string | null) => void;

  // Loading state
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

// Default currency info — rateToUsd is 0 to signal "not yet loaded from API"
// The real rate is fetched from /api/currencies on mount and persisted in localStorage
const defaultCurrencyInfo: CurrencyInfo = {
  code: 'XAF',
  name: 'Franc CFA BEAC',
  symbol: 'FCFA',
  rateToUsd: 0,
  countries: ['Cameroun', 'Gabon', 'Congo', 'Centrafrique', 'Tchad', 'Guinée équatoriale'],
};

export const useLocaleStore = create<LocaleState>()(
  persist(
    (set) => ({
      // Language - default to French
      language: 'fr',
      setLanguage: (lang) => set({ language: lang }),

      // Currency - default to XAF (FCFA)
      currency: 'XAF',
      currencyInfo: defaultCurrencyInfo,
      setCurrency: (code) => set({ currency: code }),
      setCurrencyInfo: (info) => set({ currencyInfo: info }),

      // Available currencies
      availableCurrencies: [defaultCurrencyInfo],
      setAvailableCurrencies: (currencies) => set({ availableCurrencies: currencies }),

      // Country
      country: null,
      setCountry: (country) => set({ country }),

      // Loading
      isLoading: false,
      setIsLoading: (loading) => set({ isLoading: loading }),
    }),
    {
      name: 'driveby-locale',
      partialize: (state) => ({
        language: state.language,
        currency: state.currency,
        currencyInfo: state.currencyInfo,
        country: state.country,
      }),
    }
  )
);

// Selectors
export const selectLanguage = (state: LocaleState) => state.language;
export const selectCurrency = (state: LocaleState) => state.currency;
export const selectCurrencyInfo = (state: LocaleState) => state.currencyInfo;
export const selectAvailableCurrencies = (state: LocaleState) => state.availableCurrencies;
