'use client';

import { cn } from '@/lib/utils';
import {
  getCollaboratorInitials,
  getColorFromUserId,
  getTextClassForColor,
} from '@/lib/collaborator-colors';
import { formatDistanceToNow } from 'date-fns';
import { fr, zhCN, enUS } from 'date-fns/locale';

interface CollaboratorBadgeProps {
  collaboratorId: string;
  collaboratorName: string | null | undefined;
  badgeColor: string | null | undefined;
  size?: 'sm' | 'md';
  showFullName?: boolean;
  timestamp?: string | null;
  locale?: 'fr' | 'en' | 'zh';
}

const dateLocales = {
  fr,
  en: enUS,
  zh: zhCN,
};

/**
 * A badge showing collaborator initials with their assigned color.
 * Used to identify who modified an order at a glance.
 */
export function CollaboratorBadge({
  collaboratorId,
  collaboratorName,
  badgeColor,
  size = 'sm',
  showFullName = false,
  timestamp,
  locale = 'fr',
}: CollaboratorBadgeProps) {
  const initials = getCollaboratorInitials(collaboratorName);

  // Use assigned color or fall back to deterministic color from user ID
  const color = badgeColor || getColorFromUserId(collaboratorId).hex;
  const textClass = getTextClassForColor(badgeColor) || 'text-white';

  const dateLocale = dateLocales[locale] || fr;

  return (
    <div className="flex items-center gap-1.5" title={collaboratorName || 'Unknown'}>
      <span
        className={cn(
          'inline-flex items-center justify-center rounded-full font-semibold shrink-0',
          size === 'sm' ? 'w-6 h-6 text-[10px]' : 'w-8 h-8 text-xs',
          textClass
        )}
        style={{ backgroundColor: color }}
      >
        {initials}
      </span>
      {showFullName && collaboratorName && (
        <span className="text-xs font-medium text-[var(--text-primary)] truncate max-w-[120px]">
          {collaboratorName}
        </span>
      )}
      {timestamp && (
        <span className="text-xs text-[var(--text-muted)]">
          {formatDistanceToNow(new Date(timestamp), { addSuffix: true, locale: dateLocale })}
        </span>
      )}
    </div>
  );
}

/**
 * Compact version showing just the colored circle with initials.
 * Useful for table rows where space is limited.
 */
export function CollaboratorBadgeCompact({
  collaboratorId,
  collaboratorName,
  badgeColor,
}: Pick<CollaboratorBadgeProps, 'collaboratorId' | 'collaboratorName' | 'badgeColor'>) {
  const initials = getCollaboratorInitials(collaboratorName);
  const color = badgeColor || getColorFromUserId(collaboratorId).hex;
  const textClass = getTextClassForColor(badgeColor) || 'text-white';

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full font-semibold w-6 h-6 text-[10px] shrink-0',
        textClass
      )}
      style={{ backgroundColor: color }}
      title={collaboratorName || 'Unknown collaborator'}
    >
      {initials}
    </span>
  );
}
