/**
 * Vehicle Features Module
 *
 * Re-exports all feature-related utilities and types.
 */

export {
  extractVehicleFeatures,
  getFeatureName,
  DRIVETRAIN_FEATURES,
  FUEL_FEATURES,
  BODY_TYPE_FEATURES,
  CATEGORY_LABELS,
  CATEGORY_ICONS,
  type FeatureCategory,
  type VehicleFeature,
  type VehicleData,
  type ExtractedFeatures,
} from './vehicle-features';

// Re-export Encar-specific options if needed
export {
  ENCAR_STANDARD_OPTIONS,
  ENCAR_TUNING_OPTIONS,
  parseEncarOptions,
  getFeatureNames as getEncarFeatureNames,
  getFeaturesByCategory as getEncarFeaturesByCategory,
  getFeatureSummary as getEncarFeatureSummary,
  hasFeature as hasEncarFeature,
  type EncarOptionsData,
} from '../api/encar-options';
