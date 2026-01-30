'use client';

import { useCollaboratorLocale, type Locale } from './CollaboratorLocaleProvider';
import { cn } from '@/lib/utils';

interface CollaboratorLanguageSwitcherProps {
  className?: string;
  variant?: 'default' | 'compact';
}

const localeConfig: Record<Locale, { flag: string; label: string; shortLabel: string }> = {
  en: { flag: '🇬🇧', label: 'English', shortLabel: 'EN' },
  zh: { flag: '🇨🇳', label: '中文', shortLabel: '中' },
  fr: { flag: '🇫🇷', label: 'Français', shortLabel: 'FR' },
};

export function CollaboratorLanguageSwitcher({
  className,
  variant = 'default',
}: CollaboratorLanguageSwitcherProps) {
  const { locale, setLocale } = useCollaboratorLocale();

  const toggleLocale = () => {
    setLocale(locale === 'en' ? 'zh' : 'en');
  };

  const currentConfig = localeConfig[locale];
  const otherLocale: Locale = locale === 'en' ? 'zh' : 'en';
  const otherConfig = localeConfig[otherLocale];

  if (variant === 'compact') {
    return (
      <button
        onClick={toggleLocale}
        className={cn(
          'flex items-center gap-1.5 px-2 py-1 rounded-md',
          'bg-nobel/20 hover:bg-nobel/30 transition-colors',
          'text-sm font-medium',
          className
        )}
        aria-label={`Switch to ${otherConfig.label}`}
      >
        <span>{currentConfig.flag}</span>
        <span className="hidden sm:inline">{currentConfig.shortLabel}</span>
      </button>
    );
  }

  return (
    <div
      className={cn(
        'flex items-center gap-1 p-1 rounded-lg bg-nobel/10',
        className
      )}
    >
      <button
        onClick={() => setLocale('en')}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all',
          'text-sm font-medium',
          locale === 'en'
            ? 'bg-mandarin text-white shadow-sm'
            : 'text-gray-400 hover:text-white hover:bg-nobel/20'
        )}
        aria-pressed={locale === 'en'}
      >
        <span>{localeConfig.en.flag}</span>
        <span className="hidden sm:inline">{localeConfig.en.label}</span>
      </button>
      <button
        onClick={() => setLocale('zh')}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all',
          'text-sm font-medium',
          locale === 'zh'
            ? 'bg-mandarin text-white shadow-sm'
            : 'text-gray-400 hover:text-white hover:bg-nobel/20'
        )}
        aria-pressed={locale === 'zh'}
      >
        <span>{localeConfig.zh.flag}</span>
        <span className="hidden sm:inline">{localeConfig.zh.label}</span>
      </button>
    </div>
  );
}
