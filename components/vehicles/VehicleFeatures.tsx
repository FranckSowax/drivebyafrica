'use client';

import { useMemo } from 'react';
import {
  Shield,
  Gauge,
  Sofa,
  Music,
  Car,
  Leaf,
  Wrench,
  Cog,
  Check,
  Zap,
  Sun,
  Fuel,
  Crown,
  Mountain,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  extractVehicleFeatures,
  getFeatureName,
  CATEGORY_LABELS,
  type FeatureCategory,
  type VehicleFeature,
  type VehicleData,
} from '@/lib/features/vehicle-features';

interface VehicleFeaturesProps {
  vehicle: VehicleData;
  locale?: 'en' | 'fr';
  showAllByDefault?: boolean;
  maxHighlights?: number;
  className?: string;
}

// Icon mapping
const ICONS: Record<string, React.ElementType> = {
  shield: Shield,
  gauge: Gauge,
  sofa: Sofa,
  music: Music,
  car: Car,
  leaf: Leaf,
  wrench: Wrench,
  cog: Cog,
  check: Check,
  zap: Zap,
  sun: Sun,
  fuel: Fuel,
  crown: Crown,
  mountain: Mountain,
};

// Category icons
const CATEGORY_ICON_MAP: Record<FeatureCategory, React.ElementType> = {
  drivetrain: Cog,
  safety: Shield,
  comfort: Sofa,
  entertainment: Music,
  exterior: Car,
  performance: Gauge,
  efficiency: Leaf,
  tuning: Wrench,
};

// Category colors
const CATEGORY_COLORS: Record<FeatureCategory, string> = {
  drivetrain: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  safety: 'bg-green-500/10 text-green-600 dark:text-green-400',
  comfort: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  entertainment: 'bg-pink-500/10 text-pink-600 dark:text-pink-400',
  exterior: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  performance: 'bg-red-500/10 text-red-600 dark:text-red-400',
  efficiency: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  tuning: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
};

/**
 * Feature Badge Component
 */
function FeatureBadge({
  feature,
  locale,
  size = 'sm',
}: {
  feature: VehicleFeature;
  locale: 'en' | 'fr';
  size?: 'sm' | 'md';
}) {
  const Icon = feature.icon ? ICONS[feature.icon] || Check : Check;
  const name = getFeatureName(feature, locale);

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium transition-colors',
        CATEGORY_COLORS[feature.category],
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
        feature.highlight && 'ring-1 ring-current/20'
      )}
    >
      <Icon className={cn(size === 'sm' ? 'w-3 h-3' : 'w-4 h-4')} />
      {name}
    </span>
  );
}

/**
 * Feature Category Section
 */
function FeatureCategorySection({
  category,
  features,
  locale,
}: {
  category: FeatureCategory;
  features: VehicleFeature[];
  locale: 'en' | 'fr';
}) {
  if (features.length === 0) return null;

  const Icon = CATEGORY_ICON_MAP[category];
  const label = locale === 'fr' ? CATEGORY_LABELS[category].fr : CATEGORY_LABELS[category].en;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-[var(--text-muted)]" />
        <h4 className="text-sm font-medium text-[var(--text-secondary)]">{label}</h4>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {features.map((feature) => (
          <FeatureBadge key={feature.id} feature={feature} locale={locale} size="sm" />
        ))}
      </div>
    </div>
  );
}

/**
 * Vehicle Features Component
 *
 * Displays vehicle features extracted from vehicle data.
 * Shows highlights first, then optionally all features grouped by category.
 */
export function VehicleFeatures({
  vehicle,
  locale = 'fr',
  showAllByDefault = false,
  maxHighlights = 5,
  className,
}: VehicleFeaturesProps) {
  const [showAll, setShowAll] = useState(showAllByDefault);

  const extracted = useMemo(() => {
    return extractVehicleFeatures(vehicle, locale);
  }, [vehicle, locale]);

  const { features, highlights, byCategory } = extracted;

  if (features.length === 0) {
    return null;
  }

  // Categories with features (sorted by priority)
  const categoryOrder: FeatureCategory[] = [
    'efficiency',
    'drivetrain',
    'safety',
    'comfort',
    'entertainment',
    'exterior',
    'performance',
    'tuning',
  ];

  const categoriesWithFeatures = categoryOrder.filter(
    (cat) => byCategory[cat].length > 0
  );

  return (
    <div className={cn('space-y-4', className)}>
      {/* Highlights Section */}
      {highlights.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {highlights.slice(0, maxHighlights).map((feature) => (
            <FeatureBadge key={feature.id} feature={feature} locale={locale} size="md" />
          ))}
          {highlights.length > maxHighlights && (
            <span className="inline-flex items-center px-3 py-1 text-sm text-[var(--text-muted)]">
              +{highlights.length - maxHighlights}
            </span>
          )}
        </div>
      )}

      {/* Expandable Full Features */}
      {features.length > highlights.length && (
        <div>
          <button
            onClick={() => setShowAll(!showAll)}
            className="flex items-center gap-2 text-sm font-medium text-mandarin hover:text-mandarin/80 transition-colors"
          >
            {showAll ? (
              <>
                <ChevronUp className="w-4 h-4" />
                {locale === 'fr' ? 'Masquer les détails' : 'Hide details'}
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                {locale === 'fr'
                  ? `Voir toutes les options (${features.length})`
                  : `View all features (${features.length})`}
              </>
            )}
          </button>

          {showAll && (
            <div className="mt-4 space-y-4 p-4 bg-[var(--surface)] rounded-xl border border-[var(--card-border)]">
              {categoriesWithFeatures.map((category) => (
                <FeatureCategorySection
                  key={category}
                  category={category}
                  features={byCategory[category]}
                  locale={locale}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Compact Features Display - For vehicle cards
 */
export function VehicleFeaturesCompact({
  vehicle,
  locale = 'fr',
  maxFeatures = 3,
  className,
}: {
  vehicle: VehicleData;
  locale?: 'en' | 'fr';
  maxFeatures?: number;
  className?: string;
}) {
  const extracted = useMemo(() => {
    return extractVehicleFeatures(vehicle, locale);
  }, [vehicle, locale]);

  const { highlights, features } = extracted;
  const toShow = highlights.length > 0 ? highlights : features;

  if (toShow.length === 0) {
    return null;
  }

  return (
    <div className={cn('flex flex-wrap gap-1', className)}>
      {toShow.slice(0, maxFeatures).map((feature) => (
        <FeatureBadge key={feature.id} feature={feature} locale={locale} size="sm" />
      ))}
      {toShow.length > maxFeatures && (
        <span className="inline-flex items-center px-2 py-0.5 text-xs text-[var(--text-muted)]">
          +{toShow.length - maxFeatures}
        </span>
      )}
    </div>
  );
}

export default VehicleFeatures;
