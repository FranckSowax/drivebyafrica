/**
 * Unified Vehicle Features System
 *
 * Provides a consistent way to extract, store, and display vehicle features
 * across all data sources (Encar, Dongchedi, CHE168, Dubicars).
 *
 * Features can come from:
 * - API-specific options data (e.g., Encar options codes)
 * - Standard vehicle attributes (transmission, fuel_type, body_type, drive_type)
 * - Derived features (electric, hybrid, AWD/4WD, luxury, etc.)
 */

// Feature categories for UI display
export type FeatureCategory =
  | 'drivetrain'     // Engine, transmission, drive type
  | 'safety'         // ABS, airbags, sensors
  | 'comfort'        // AC, seats, sunroof
  | 'entertainment'  // Navigation, audio, bluetooth
  | 'exterior'       // Wheels, roof rails, body kit
  | 'performance'    // ECU tuning, exhaust, suspension
  | 'efficiency'     // Hybrid, electric, fuel economy
  | 'tuning';        // Aftermarket modifications

export interface VehicleFeature {
  id: string;           // Unique feature identifier
  name: string;         // Display name (English)
  nameFr?: string;      // Display name (French)
  category: FeatureCategory;
  icon?: string;        // Lucide icon name
  highlight?: boolean;  // Show as a highlight/badge
}

// Standard drivetrain features derived from vehicle data
export const DRIVETRAIN_FEATURES: Record<string, VehicleFeature> = {
  // Transmission
  automatic: {
    id: 'automatic',
    name: 'Automatic Transmission',
    nameFr: 'Boîte automatique',
    category: 'drivetrain',
    icon: 'gauge',
  },
  manual: {
    id: 'manual',
    name: 'Manual Transmission',
    nameFr: 'Boîte manuelle',
    category: 'drivetrain',
    icon: 'gauge',
  },
  cvt: {
    id: 'cvt',
    name: 'CVT Transmission',
    nameFr: 'Boîte CVT',
    category: 'drivetrain',
    icon: 'gauge',
  },

  // Drive type
  fwd: {
    id: 'fwd',
    name: 'Front-Wheel Drive',
    nameFr: 'Traction avant',
    category: 'drivetrain',
    icon: 'car',
  },
  rwd: {
    id: 'rwd',
    name: 'Rear-Wheel Drive',
    nameFr: 'Propulsion arrière',
    category: 'drivetrain',
    icon: 'car',
  },
  awd: {
    id: 'awd',
    name: 'All-Wheel Drive',
    nameFr: 'Transmission intégrale',
    category: 'drivetrain',
    icon: 'car',
    highlight: true,
  },
  '4wd': {
    id: '4wd',
    name: '4-Wheel Drive',
    nameFr: '4x4',
    category: 'drivetrain',
    icon: 'mountain',
    highlight: true,
  },
};

// Fuel type features
export const FUEL_FEATURES: Record<string, VehicleFeature> = {
  petrol: {
    id: 'petrol',
    name: 'Petrol/Gasoline',
    nameFr: 'Essence',
    category: 'drivetrain',
    icon: 'fuel',
  },
  diesel: {
    id: 'diesel',
    name: 'Diesel',
    nameFr: 'Diesel',
    category: 'drivetrain',
    icon: 'fuel',
  },
  electric: {
    id: 'electric',
    name: 'Electric',
    nameFr: 'Électrique',
    category: 'efficiency',
    icon: 'zap',
    highlight: true,
  },
  hybrid: {
    id: 'hybrid',
    name: 'Hybrid',
    nameFr: 'Hybride',
    category: 'efficiency',
    icon: 'leaf',
    highlight: true,
  },
  lpg: {
    id: 'lpg',
    name: 'LPG/CNG',
    nameFr: 'GPL/GNV',
    category: 'efficiency',
    icon: 'fuel',
  },
};

// Body type features
export const BODY_TYPE_FEATURES: Record<string, VehicleFeature> = {
  suv: {
    id: 'suv',
    name: 'SUV',
    nameFr: 'SUV',
    category: 'exterior',
    icon: 'car',
  },
  sedan: {
    id: 'sedan',
    name: 'Sedan',
    nameFr: 'Berline',
    category: 'exterior',
    icon: 'car',
  },
  hatchback: {
    id: 'hatchback',
    name: 'Hatchback',
    nameFr: 'Compacte',
    category: 'exterior',
    icon: 'car',
  },
  coupe: {
    id: 'coupe',
    name: 'Coupe',
    nameFr: 'Coupé',
    category: 'exterior',
    icon: 'car',
  },
  convertible: {
    id: 'convertible',
    name: 'Convertible',
    nameFr: 'Cabriolet',
    category: 'exterior',
    icon: 'sun',
  },
  wagon: {
    id: 'wagon',
    name: 'Wagon/Estate',
    nameFr: 'Break',
    category: 'exterior',
    icon: 'car',
  },
  minivan: {
    id: 'minivan',
    name: 'Minivan',
    nameFr: 'Monospace',
    category: 'exterior',
    icon: 'car',
  },
  van: {
    id: 'van',
    name: 'Van',
    nameFr: 'Van',
    category: 'exterior',
    icon: 'truck',
  },
  pickup: {
    id: 'pickup',
    name: 'Pickup Truck',
    nameFr: 'Pick-up',
    category: 'exterior',
    icon: 'truck',
  },
};

// High-value / Luxury brand indicators
const LUXURY_BRANDS = new Set([
  'mercedes-benz', 'mercedes', 'bmw', 'audi', 'lexus', 'porsche',
  'maserati', 'bentley', 'rolls-royce', 'ferrari', 'lamborghini',
  'aston martin', 'jaguar', 'land rover', 'range rover', 'infiniti',
  'acura', 'genesis', 'lincoln', 'cadillac', 'volvo', 'alfa romeo',
]);

const SPORTS_BRANDS = new Set([
  'porsche', 'ferrari', 'lamborghini', 'mclaren', 'aston martin',
  'lotus', 'bugatti', 'koenigsegg', 'pagani',
]);

export interface VehicleData {
  make?: string | null;
  model?: string | null;
  transmission?: string | null;
  fuel_type?: string | null;
  body_type?: string | null;
  drive_type?: string | null;
  engine_cc?: number | null;
  condition_report?: string | null; // JSON with options data
}

export interface ExtractedFeatures {
  features: VehicleFeature[];
  highlights: VehicleFeature[];
  byCategory: Record<FeatureCategory, VehicleFeature[]>;
  summary: string;
}

/**
 * Extract features from vehicle data
 */
export function extractVehicleFeatures(vehicle: VehicleData, locale: 'en' | 'fr' = 'en'): ExtractedFeatures {
  const features: VehicleFeature[] = [];
  const seenIds = new Set<string>();

  const addFeature = (feature: VehicleFeature | undefined) => {
    if (feature && !seenIds.has(feature.id)) {
      seenIds.add(feature.id);
      features.push(feature);
    }
  };

  // 1. Add drivetrain features
  if (vehicle.transmission) {
    addFeature(DRIVETRAIN_FEATURES[vehicle.transmission.toLowerCase()]);
  }

  if (vehicle.drive_type) {
    addFeature(DRIVETRAIN_FEATURES[vehicle.drive_type.toLowerCase()]);
  }

  // 2. Add fuel type features
  if (vehicle.fuel_type) {
    addFeature(FUEL_FEATURES[vehicle.fuel_type.toLowerCase()]);
  }

  // 3. Add body type features
  if (vehicle.body_type) {
    addFeature(BODY_TYPE_FEATURES[vehicle.body_type.toLowerCase()]);
  }

  // 4. Add derived features (luxury, sports, etc.)
  const makeLower = vehicle.make?.toLowerCase() || '';
  if (LUXURY_BRANDS.has(makeLower)) {
    addFeature({
      id: 'luxury',
      name: 'Luxury Brand',
      nameFr: 'Marque Premium',
      category: 'exterior',
      icon: 'crown',
      highlight: true,
    });
  }

  if (SPORTS_BRANDS.has(makeLower)) {
    addFeature({
      id: 'sports',
      name: 'Sports Car',
      nameFr: 'Voiture de sport',
      category: 'performance',
      icon: 'zap',
      highlight: true,
    });
  }

  // 5. Add engine size feature
  if (vehicle.engine_cc) {
    if (vehicle.engine_cc >= 3000) {
      addFeature({
        id: 'large_engine',
        name: `${(vehicle.engine_cc / 1000).toFixed(1)}L Engine`,
        nameFr: `Moteur ${(vehicle.engine_cc / 1000).toFixed(1)}L`,
        category: 'performance',
        icon: 'gauge',
        highlight: true,
      });
    } else if (vehicle.engine_cc >= 2000) {
      addFeature({
        id: 'medium_engine',
        name: `${(vehicle.engine_cc / 1000).toFixed(1)}L Engine`,
        nameFr: `Moteur ${(vehicle.engine_cc / 1000).toFixed(1)}L`,
        category: 'drivetrain',
        icon: 'gauge',
      });
    }
  }

  // 6. Parse condition_report for API-specific options (Encar)
  if (vehicle.condition_report) {
    try {
      const report = typeof vehicle.condition_report === 'string'
        ? JSON.parse(vehicle.condition_report)
        : vehicle.condition_report;

      // Parse Encar options
      if (report.options?.features && Array.isArray(report.options.features)) {
        for (const featureName of report.options.features) {
          const id = featureName.toLowerCase().replace(/[^a-z0-9]/g, '_');
          if (!seenIds.has(id)) {
            seenIds.add(id);
            features.push({
              id,
              name: featureName,
              nameFr: featureName, // Could add French translations
              category: categorizeFeature(featureName),
              icon: getFeatureIcon(featureName),
            });
          }
        }
      }
    } catch {
      // Ignore parsing errors
    }
  }

  // Build result
  const highlights = features.filter(f => f.highlight);
  const byCategory = groupByCategory(features);
  const summary = buildFeatureSummary(features, locale);

  return { features, highlights, byCategory, summary };
}

/**
 * Categorize a feature by its name
 */
function categorizeFeature(name: string): FeatureCategory {
  const nameLower = name.toLowerCase();

  // Safety features
  if (/(airbag|abs|tcs|esc|blind spot|lane|collision|parking sensor|tpms|brake)/i.test(nameLower)) {
    return 'safety';
  }

  // Comfort features
  if (/(seat|climate|ac |a\/c|sunroof|heated|ventilated|massage|power window|keyless|smart key|cruise)/i.test(nameLower)) {
    return 'comfort';
  }

  // Entertainment features
  if (/(navigation|audio|bluetooth|usb|aux|cd player|monitor|display|speaker)/i.test(nameLower)) {
    return 'entertainment';
  }

  // Exterior features
  if (/(wheel|roof rail|wrap|body kit|spoiler|led.*light|hid)/i.test(nameLower)) {
    return 'exterior';
  }

  // Performance features
  if (/(ecu|tuning|exhaust|intake|suspension|strut|sway bar|brake.*upgrade)/i.test(nameLower)) {
    return 'performance';
  }

  // Tuning features
  if (/(aftermarket|modified|custom|lowered|coilover)/i.test(nameLower)) {
    return 'tuning';
  }

  // Default to comfort
  return 'comfort';
}

/**
 * Get an appropriate icon for a feature
 */
function getFeatureIcon(name: string): string {
  const nameLower = name.toLowerCase();

  if (/airbag/i.test(nameLower)) return 'shield';
  if (/abs|brake/i.test(nameLower)) return 'octagon';
  if (/sunroof/i.test(nameLower)) return 'sun';
  if (/seat/i.test(nameLower)) return 'armchair';
  if (/navigation/i.test(nameLower)) return 'map';
  if (/bluetooth|audio|speaker/i.test(nameLower)) return 'music';
  if (/camera/i.test(nameLower)) return 'camera';
  if (/wheel/i.test(nameLower)) return 'circle';
  if (/led|light/i.test(nameLower)) return 'lightbulb';
  if (/climate|ac /i.test(nameLower)) return 'thermometer';
  if (/heated/i.test(nameLower)) return 'flame';
  if (/cruise/i.test(nameLower)) return 'gauge';
  if (/parking/i.test(nameLower)) return 'parking-circle';
  if (/key/i.test(nameLower)) return 'key';

  return 'check';
}

/**
 * Group features by category
 */
function groupByCategory(features: VehicleFeature[]): Record<FeatureCategory, VehicleFeature[]> {
  const grouped: Record<FeatureCategory, VehicleFeature[]> = {
    drivetrain: [],
    safety: [],
    comfort: [],
    entertainment: [],
    exterior: [],
    performance: [],
    efficiency: [],
    tuning: [],
  };

  for (const feature of features) {
    grouped[feature.category].push(feature);
  }

  return grouped;
}

/**
 * Build a summary string of key features
 */
function buildFeatureSummary(features: VehicleFeature[], locale: 'en' | 'fr', maxFeatures: number = 3): string {
  const highlights = features.filter(f => f.highlight);
  const toShow = highlights.length > 0 ? highlights : features;

  if (toShow.length === 0) return '';

  const names = toShow.slice(0, maxFeatures).map(f =>
    locale === 'fr' && f.nameFr ? f.nameFr : f.name
  );

  if (toShow.length <= maxFeatures) {
    return names.join(', ');
  }

  const remaining = toShow.length - maxFeatures;
  return `${names.join(', ')} +${remaining}`;
}

/**
 * Get feature display name based on locale
 */
export function getFeatureName(feature: VehicleFeature, locale: 'en' | 'fr' = 'en'): string {
  return locale === 'fr' && feature.nameFr ? feature.nameFr : feature.name;
}

/**
 * Category labels for UI
 */
export const CATEGORY_LABELS: Record<FeatureCategory, { en: string; fr: string }> = {
  drivetrain: { en: 'Drivetrain', fr: 'Motorisation' },
  safety: { en: 'Safety', fr: 'Sécurité' },
  comfort: { en: 'Comfort', fr: 'Confort' },
  entertainment: { en: 'Entertainment', fr: 'Multimédia' },
  exterior: { en: 'Exterior', fr: 'Extérieur' },
  performance: { en: 'Performance', fr: 'Performance' },
  efficiency: { en: 'Efficiency', fr: 'Efficacité' },
  tuning: { en: 'Tuning', fr: 'Tuning' },
};

/**
 * Category icons for UI
 */
export const CATEGORY_ICONS: Record<FeatureCategory, string> = {
  drivetrain: 'cog',
  safety: 'shield-check',
  comfort: 'sofa',
  entertainment: 'music',
  exterior: 'car',
  performance: 'gauge',
  efficiency: 'leaf',
  tuning: 'wrench',
};

export default {
  extractVehicleFeatures,
  getFeatureName,
  DRIVETRAIN_FEATURES,
  FUEL_FEATURES,
  BODY_TYPE_FEATURES,
  CATEGORY_LABELS,
  CATEGORY_ICONS,
};
