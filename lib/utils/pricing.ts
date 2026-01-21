/**
 * Pricing constants and utilities for vehicle imports
 */

// Fixed fees
export const INSURANCE_RATE = 0.025; // 2.5% cargo insurance
export const INSPECTION_FEE_XAF = 225000; // 225,000 FCFA for inspection and documents
export const INSPECTION_FEE_USD = 350; // ~350 USD for inspection and documents (base value)

// Export taxes by source country (in USD)
export const EXPORT_TAX_USD: Record<string, number> = {
  china: 980, // China export tax: 980 USD
  korea: 0,
  dubai: 0,
};

/**
 * Get the export tax for a vehicle source
 * @param source - Vehicle source ('china', 'korea', 'dubai')
 * @returns Export tax in USD
 */
export function getExportTax(source: string): number {
  return EXPORT_TAX_USD[source] || 0;
}

/**
 * Calculate the effective vehicle price including export tax
 * @param priceUSD - Base price in USD
 * @param source - Vehicle source ('china', 'korea', 'dubai')
 * @returns Total price in USD including export tax
 */
export function getEffectiveVehiclePrice(priceUSD: number, source: string): number {
  return priceUSD + getExportTax(source);
}

/**
 * Calculate all import costs for a vehicle
 * @param params - Calculation parameters
 * @returns Detailed cost breakdown
 */
export function calculateImportCosts(params: {
  vehiclePriceUSD: number;
  vehicleSource: string;
  shippingCostUSD: number;
  xafRate: number;
  shippingMultiplier?: number;
}): {
  vehiclePriceUSD: number;
  exportTaxUSD: number;
  effectivePriceUSD: number;
  vehiclePriceXAF: number;
  exportTaxXAF: number;
  shippingCostXAF: number;
  insuranceCostXAF: number;
  inspectionFeeXAF: number;
  totalXAF: number;
} {
  const {
    vehiclePriceUSD,
    vehicleSource,
    shippingCostUSD,
    xafRate,
    shippingMultiplier = 1,
  } = params;

  // Export tax (only for China)
  const exportTaxUSD = getExportTax(vehicleSource);
  const effectivePriceUSD = vehiclePriceUSD + exportTaxUSD;

  // Convert to XAF
  const vehiclePriceXAF = vehiclePriceUSD * xafRate;
  const exportTaxXAF = exportTaxUSD * xafRate;
  const adjustedShippingCostUSD = shippingCostUSD * shippingMultiplier;
  const shippingCostXAF = adjustedShippingCostUSD * xafRate;

  // Insurance: 2.5% of (vehicle price + export tax + shipping)
  const insuranceCostXAF = (vehiclePriceXAF + exportTaxXAF + shippingCostXAF) * INSURANCE_RATE;
  const inspectionFeeXAF = INSPECTION_FEE_XAF;

  // Total
  const totalXAF = vehiclePriceXAF + exportTaxXAF + shippingCostXAF + insuranceCostXAF + inspectionFeeXAF;

  return {
    vehiclePriceUSD,
    exportTaxUSD,
    effectivePriceUSD,
    vehiclePriceXAF: Math.round(vehiclePriceXAF),
    exportTaxXAF: Math.round(exportTaxXAF),
    shippingCostXAF: Math.round(shippingCostXAF),
    insuranceCostXAF: Math.round(insuranceCostXAF),
    inspectionFeeXAF: Math.round(inspectionFeeXAF),
    totalXAF: Math.round(totalXAF),
  };
}
