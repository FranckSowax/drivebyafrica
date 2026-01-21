/**
 * Real-time exchange rate conversion utility
 * Uses free exchange rate APIs to get live rates for accurate currency conversion
 *
 * This is used when converting from display currencies (NGN, KRW, CNY, etc.)
 * back to USD for accurate quote generation.
 */

// Cache for exchange rates (1 hour TTL)
interface RateCache {
  rates: Record<string, number>;
  timestamp: number;
}

let rateCache: RateCache | null = null;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

// Fallback rates (approximate, updated Jan 2025)
const FALLBACK_RATES: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  XAF: 615,
  XOF: 615,
  NGN: 1550,
  GHS: 15.5,
  KES: 154,
  ZAR: 18.5,
  CNY: 7.25,
  KRW: 1450,
  AED: 3.67,
  GBP: 0.79,
  JPY: 157,
};

/**
 * Fetch real-time exchange rates from free API
 * Uses frankfurter.app as primary (reliable, no API key)
 */
async function fetchRealTimeRates(): Promise<Record<string, number>> {
  // Check cache first
  if (rateCache && Date.now() - rateCache.timestamp < CACHE_TTL) {
    return rateCache.rates;
  }

  try {
    // frankfurter.app - free, reliable, no API key needed
    const response = await fetch(
      'https://api.frankfurter.app/latest?from=USD',
      {
        cache: 'no-store',
        signal: AbortSignal.timeout(5000)
      }
    );

    if (response.ok) {
      const data = await response.json();
      if (data.rates) {
        // Merge with fallback rates for currencies not covered by API
        const rates = { USD: 1, ...FALLBACK_RATES, ...data.rates };
        rateCache = { rates, timestamp: Date.now() };
        return rates;
      }
    }
  } catch (error) {
    console.warn('Exchange rate API failed, using fallback rates:', error);
  }

  // If API fails, return cached rates or fallback
  return rateCache?.rates || { USD: 1, ...FALLBACK_RATES };
}

/**
 * Convert an amount from any currency to USD using real-time rates
 * @param amount - The amount in the source currency
 * @param fromCurrency - The source currency code (e.g., 'NGN', 'KRW', 'CNY')
 * @returns The equivalent amount in USD
 */
export async function convertToUsdRealTime(
  amount: number,
  fromCurrency: string
): Promise<number> {
  if (fromCurrency === 'USD') {
    return amount;
  }

  const rates = await fetchRealTimeRates();
  const rate = rates[fromCurrency];

  if (!rate) {
    console.warn(`No rate found for ${fromCurrency}, returning original amount`);
    return amount;
  }

  // Convert to USD: amount / rate
  return amount / rate;
}

/**
 * Get the real-time exchange rate for a currency against USD
 * @param currency - The currency code
 * @returns The exchange rate (1 USD = X currency)
 */
export async function getRealTimeRate(currency: string): Promise<number> {
  if (currency === 'USD') {
    return 1;
  }

  const rates = await fetchRealTimeRates();
  return rates[currency] || 1;
}

/**
 * Get all available real-time rates
 */
export async function getAllRealTimeRates(): Promise<Record<string, number>> {
  return fetchRealTimeRates();
}

/**
 * Check if a currency is supported for real-time conversion
 */
export async function isCurrencySupported(currency: string): Promise<boolean> {
  const rates = await fetchRealTimeRates();
  return currency in rates;
}
