// Default exchange rates (fallback values)
// These will be overridden by dynamic rates from the API when available
const DEFAULT_EXCHANGE_RATES: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  XAF: 615, // CFA Franc BEAC (Central Africa)
  XOF: 615, // CFA Franc BCEAO (West Africa)
  NGN: 1550,  // Nigerian Naira
};

export type Currency = keyof typeof DEFAULT_EXCHANGE_RATES | string;

// Store for dynamic rates fetched from API
let dynamicRates: Record<string, number> | null = null;

/**
 * Set dynamic exchange rates from API
 * Call this after fetching rates from /api/currencies
 */
export function setDynamicRates(rates: Record<string, number>) {
  dynamicRates = rates;
}

/**
 * Get the current exchange rate for a currency
 * Uses dynamic rates if available, falls back to defaults
 */
export function getRate(currency: string): number {
  if (dynamicRates && dynamicRates[currency] !== undefined) {
    return dynamicRates[currency];
  }
  return DEFAULT_EXCHANGE_RATES[currency] || 1;
}

/**
 * Format number with proper thousand separators (regular spaces)
 */
function formatWithSpaces(num: number): string {
  return Math.round(num)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export function formatCurrency(
  amount: number,
  currency: Currency = 'XAF',
  _locale: string = 'fr-FR'
): string {
  // Pour XAF/XOF, on utilise un format personnalisé avec "FCFA"
  if (currency === 'XAF' || currency === 'XOF') {
    return `${formatWithSpaces(amount)} FCFA`;
  }

  // NGN - symbol prefix
  if (currency === 'NGN') {
    return `₦${formatWithSpaces(amount)}`;
  }

  // USD - dollar prefix
  if (currency === 'USD') {
    return `$${formatWithSpaces(amount)}`;
  }

  // EUR - symbol suffix
  if (currency === 'EUR') {
    return `${formatWithSpaces(amount)} €`;
  }

  // Default - currency code suffix
  return `${formatWithSpaces(amount)} ${currency}`;
}

export function convertCurrency(
  amount: number,
  from: Currency,
  to: Currency,
  customRates?: Record<string, number>
): number {
  const rates = customRates || dynamicRates || DEFAULT_EXCHANGE_RATES;
  const fromRate = rates[from] || 1;
  const toRate = rates[to] || 1;
  const inUsd = amount / fromRate;
  return inUsd * toRate;
}

export function formatUsdToLocal(
  amountUsd: number,
  targetCurrency: Currency = 'XAF',
  customRate?: number
): string {
  const rate = customRate ?? getRate(targetCurrency);
  const converted = amountUsd * rate;
  return formatCurrency(converted, targetCurrency);
}

/**
 * Format USD to FCFA with abbreviated format (1M, 500K)
 * Useful for compact display in filters
 * @param amountUsd - Amount in USD
 * @param xafRate - Optional custom XAF rate (uses dynamic/default if not provided)
 */
export function formatUsdToFcfaShort(amountUsd: number, xafRate?: number): string {
  const rate = xafRate ?? getRate('XAF');
  const fcfa = amountUsd * rate;

  if (fcfa >= 1_000_000) {
    const millions = fcfa / 1_000_000;
    // Show decimal only if not a whole number
    const formatted = millions % 1 === 0 ? millions.toString() : millions.toFixed(1);
    return `${formatted}M`;
  }

  if (fcfa >= 1_000) {
    const thousands = fcfa / 1_000;
    const formatted = thousands % 1 === 0 ? thousands.toString() : thousands.toFixed(0);
    return `${formatted}K`;
  }

  return Math.round(fcfa).toString();
}
