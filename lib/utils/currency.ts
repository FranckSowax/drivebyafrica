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
    return `${formatted} FCFA`;
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
