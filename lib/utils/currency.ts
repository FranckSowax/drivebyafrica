const EXCHANGE_RATES: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  XAF: 640, // CFA Franc (1 USD = 640 FCFA)
  XOF: 640, // West African CFA
  NGN: 1550,  // Nigerian Naira
};

export type Currency = keyof typeof EXCHANGE_RATES;

export function formatCurrency(
  amount: number,
  currency: Currency = 'XAF',
  locale: string = 'fr-FR'
): string {
  // Pour XAF/XOF, on utilise un format personnalisé avec "FCFA"
  if (currency === 'XAF' || currency === 'XOF') {
    const formatted = new Intl.NumberFormat(locale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.round(amount));
    // Remplacer les espaces insécables (8239, 160) par des espaces normaux pour un affichage cohérent
    const withNormalSpaces = formatted.replace(/[\u202F\u00A0]/g, ' ');
    return `${withNormalSpaces} FCFA`;
  }

  const formatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return formatter.format(amount);
}

export function convertCurrency(
  amount: number,
  from: Currency,
  to: Currency
): number {
  const inUsd = amount / EXCHANGE_RATES[from];
  return inUsd * EXCHANGE_RATES[to];
}

export function formatUsdToLocal(
  amountUsd: number,
  targetCurrency: Currency = 'XAF'
): string {
  const converted = convertCurrency(amountUsd, 'USD', targetCurrency);
  return formatCurrency(converted, targetCurrency);
}

/**
 * Format USD to FCFA with abbreviated format (1M, 500K)
 * Useful for compact display in filters
 */
export function formatUsdToFcfaShort(amountUsd: number): string {
  const fcfa = amountUsd * EXCHANGE_RATES.XAF;

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
