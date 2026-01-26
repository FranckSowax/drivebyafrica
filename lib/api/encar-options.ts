/**
 * Encar API Options Codes Mapping
 * Maps option codes to human-readable feature names
 *
 * API returns options in format:
 * {
 *   "standard": ["001", "003", ...],  // Factory/OEM features
 *   "tuning": ["023", ...],           // Aftermarket modifications
 *   "choice": [],
 *   "etc": [],
 *   "type": "CAR"
 * }
 */

// Standard options codes - Factory/OEM features
export const ENCAR_STANDARD_OPTIONS: Record<string, string> = {
  // Safety Features
  "001": "Anti-lock Braking System (ABS)",
  "019": "Traction Control System (TCS)",
  "020": "Side Airbags",
  "026": "Driver Airbag",
  "027": "Passenger Airbag",
  "033": "Tire Pressure Monitoring System (TPMS)",
  "055": "Electronic Stability Control (ESC)",
  "056": "Curtain Airbags",
  "085": "Front Parking Sensors",
  "086": "Blind Spot Monitoring",
  "087": "360° Around View Monitor",
  "088": "Lane Departure Warning System (LDWS)",

  // Comfort & Convenience
  "006": "Central Locking",
  "007": "Power Windows",
  "008": "Power Steering",
  "010": "Sunroof",
  "014": "Leather Seats",
  "015": "Keyless Entry",
  "021": "Power Driver Seat",
  "022": "Heated Front Seats",
  "023": "Automatic Climate Control",
  "024": "Power Folding Mirrors",
  "030": "Auto-Dimming Rearview Mirror (ECM)",
  "034": "Ventilated Driver Seat",
  "035": "Power Passenger Seat",
  "051": "Driver Seat Memory",
  "057": "Smart Key",
  "059": "Power Tailgate",
  "063": "Heated Rear Seats",
  "068": "Cruise Control",
  "077": "Ventilated Passenger Seat",
  "078": "Passenger Seat Memory",
  "079": "Adaptive Cruise Control",
  "080": "Soft-Close Doors",
  "081": "Rain Sensor",
  "082": "Heated Steering Wheel",
  "083": "Power Adjustable Steering Wheel",
  "084": "Paddle Shifters",
  "089": "Power Rear Seats",
  "090": "Ventilated Rear Seats",
  "091": "Massage Seats",
  "092": "Rear Sunshades",
  "093": "Rear Window Sunshade",
  "094": "Electronic Parking Brake (EPB)",
  "095": "Head-Up Display (HUD)",
  "097": "Automatic Headlights",

  // Lighting
  "029": "HID Headlights",
  "075": "LED Headlights",

  // Exterior
  "002": "Electronic Controlled Suspension (ECS)",
  "017": "Alloy Wheels",
  "062": "Roof Rails",

  // Entertainment & Navigation
  "003": "CD Player",
  "004": "Front AV Monitor",
  "005": "Navigation System",
  "031": "Steering Wheel Audio Controls",
  "054": "Rear AV Monitor",
  "071": "AUX Input",
  "072": "USB Port",
  "074": "Hi-pass System",
  "096": "Bluetooth",

  // Camera & Sensors
  "032": "Rear Parking Sensors",
  "058": "Rear View Camera",
};

// Tuning options codes - Aftermarket modifications
export const ENCAR_TUNING_OPTIONS: Record<string, string> = {
  // Exterior Modifications
  "001": "Roof Wrap",
  "002": "Body Wrap (Vinyl Wrapping)",
  "003": "Body Kit",
  "004": "Spoiler",
  "005": "Side Skirts",
  "006": "LED Brake Lights",
  "007": "Tow Hitch",

  // Interior Modifications
  "008": "Comfort Seats",
  "009": "Bucket Seats",
  "010": "D-Cut Steering Wheel",
  "011": "LED Interior Lighting",

  // Audio & Electronics
  "012": "Head Unit (Audio System)",
  "013": "Speakers/Amplifier/Subwoofer",
  "014": "Sound Deadening/Undercoating",
  "023": "Dash Cam",
  "024": "Push Start Button",
  "025": "Remote Start",

  // Performance
  "015": "Intake System Tuning",
  "016": "Exhaust System Tuning",
  "017": "Performance Exhaust",
  "018": "ECU Tuning (Chip Tuning)",
  "019": "Performance Sway Bar",
  "020": "Strut Bar",
  "021": "Brake System Upgrade",
  "022": "Sport Pedals",

  // Wheels & Suspension
  "026": "Wheel Inch-Up",
  "027": "Aftermarket Wheels",
  "028": "Lowering Springs",
  "029": "Coilovers",
  "030": "Adjustable Suspension",
};

// Options structure from the API
export interface EncarOptionsData {
  standard?: string[];
  tuning?: string[];
  choice?: string[];
  etc?: string[];
  type?: string;
}

// Feature categories for UI display
export type FeatureCategory =
  | 'safety'
  | 'comfort'
  | 'entertainment'
  | 'exterior'
  | 'performance'
  | 'lighting'
  | 'tuning';

export interface VehicleFeature {
  code: string;
  name: string;
  category: FeatureCategory;
  isTuning: boolean;
}

// Category mapping for standard options
const STANDARD_CATEGORY_MAP: Record<string, FeatureCategory> = {
  // Safety
  "001": "safety", "019": "safety", "020": "safety", "026": "safety", "027": "safety",
  "033": "safety", "055": "safety", "056": "safety", "085": "safety", "086": "safety",
  "087": "safety", "088": "safety",

  // Comfort
  "006": "comfort", "007": "comfort", "008": "comfort", "010": "comfort", "014": "comfort",
  "015": "comfort", "021": "comfort", "022": "comfort", "023": "comfort", "024": "comfort",
  "030": "comfort", "034": "comfort", "035": "comfort", "051": "comfort", "057": "comfort",
  "059": "comfort", "063": "comfort", "068": "comfort", "077": "comfort", "078": "comfort",
  "079": "comfort", "080": "comfort", "081": "comfort", "082": "comfort", "083": "comfort",
  "084": "comfort", "089": "comfort", "090": "comfort", "091": "comfort", "092": "comfort",
  "093": "comfort", "094": "comfort", "095": "comfort", "097": "comfort",

  // Lighting
  "029": "lighting", "075": "lighting",

  // Exterior
  "002": "exterior", "017": "exterior", "062": "exterior",

  // Entertainment
  "003": "entertainment", "004": "entertainment", "005": "entertainment", "031": "entertainment",
  "054": "entertainment", "071": "entertainment", "072": "entertainment", "074": "entertainment",
  "096": "entertainment", "032": "entertainment", "058": "entertainment",
};

/**
 * Get the feature name from a standard option code
 */
export function getStandardFeatureName(code: string): string | null {
  return ENCAR_STANDARD_OPTIONS[code] || null;
}

/**
 * Get the feature name from a tuning option code
 */
export function getTuningFeatureName(code: string): string | null {
  return ENCAR_TUNING_OPTIONS[code] || null;
}

/**
 * Parse Encar options data and return a list of human-readable features
 */
export function parseEncarOptions(options: EncarOptionsData | undefined | null): VehicleFeature[] {
  if (!options) return [];

  const features: VehicleFeature[] = [];

  // Parse standard options
  if (options.standard && Array.isArray(options.standard)) {
    for (const code of options.standard) {
      const name = ENCAR_STANDARD_OPTIONS[code];
      if (name) {
        features.push({
          code,
          name,
          category: STANDARD_CATEGORY_MAP[code] || 'comfort',
          isTuning: false,
        });
      }
    }
  }

  // Parse tuning options
  if (options.tuning && Array.isArray(options.tuning)) {
    for (const code of options.tuning) {
      const name = ENCAR_TUNING_OPTIONS[code];
      if (name) {
        features.push({
          code,
          name,
          category: 'tuning',
          isTuning: true,
        });
      }
    }
  }

  return features;
}

/**
 * Get features as a simple string array (for storage in condition_report or similar)
 */
export function getFeatureNames(options: EncarOptionsData | undefined | null): string[] {
  return parseEncarOptions(options).map(f => f.name);
}

/**
 * Get features grouped by category
 */
export function getFeaturesByCategory(options: EncarOptionsData | undefined | null): Record<FeatureCategory, string[]> {
  const features = parseEncarOptions(options);

  const grouped: Record<FeatureCategory, string[]> = {
    safety: [],
    comfort: [],
    entertainment: [],
    exterior: [],
    performance: [],
    lighting: [],
    tuning: [],
  };

  for (const feature of features) {
    grouped[feature.category].push(feature.name);
  }

  return grouped;
}

/**
 * Check if a vehicle has a specific feature by code
 */
export function hasFeature(options: EncarOptionsData | undefined | null, code: string): boolean {
  if (!options) return false;

  const inStandard = options.standard?.includes(code) || false;
  const inTuning = options.tuning?.includes(code) || false;

  return inStandard || inTuning;
}

/**
 * Get a summary of features for display (e.g., "Sunroof, Leather Seats, Navigation, +5 more")
 */
export function getFeatureSummary(options: EncarOptionsData | undefined | null, maxFeatures: number = 3): string {
  const features = parseEncarOptions(options);

  if (features.length === 0) return '';

  if (features.length <= maxFeatures) {
    return features.map(f => f.name).join(', ');
  }

  const displayed = features.slice(0, maxFeatures).map(f => f.name).join(', ');
  const remaining = features.length - maxFeatures;

  return `${displayed}, +${remaining} more`;
}

export default {
  ENCAR_STANDARD_OPTIONS,
  ENCAR_TUNING_OPTIONS,
  parseEncarOptions,
  getFeatureNames,
  getFeaturesByCategory,
  hasFeature,
  getFeatureSummary,
  getStandardFeatureName,
  getTuningFeatureName,
};
