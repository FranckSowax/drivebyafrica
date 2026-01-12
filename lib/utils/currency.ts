const EXCHANGE_RATES: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  XAF: 605.5, // CFA Franc
  XOF: 605.5, // West African CFA
  NGN: 1550,  // Nigerian Naira
};

export type Currency = keyof typeof EXCHANGE_RATES;

export function formatCurrency(
  amount: number,
  currency: Currency = 'USD',
  locale: string = 'fr-FR'
): string {
  const formatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency === 'XAF' || currency === 'XOF' ? 'XAF' : currency,
    minimumFractionDigits: currency === 'XAF' || currency === 'XOF' ? 0 : 2,
    maximumFractionDigits: currency === 'XAF' || currency === 'XOF' ? 0 : 2,
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
