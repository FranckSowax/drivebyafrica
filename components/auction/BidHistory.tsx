'use client';

import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { User, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatUsdToLocal } from '@/lib/utils/currency';
import type { Bid } from '@/types/database';

interface BidHistoryProps {
  bids: Bid[];
  currentUserId?: string;
  className?: string;
  maxItems?: number;
  showAll?: boolean;
}

export function BidHistory({
  bids,
  currentUserId,
  className,
  maxItems = 10,
  showAll = false,
}: BidHistoryProps) {
  // Sort by amount descending (highest first) and filter active bids
  const sortedBids = [...bids]
    .filter((b) => b.status !== 'cancelled')
    .sort((a, b) => b.amount_usd - a.amount_usd);

  const displayBids = showAll ? sortedBids : sortedBids.slice(0, maxItems);
  const highestBid = sortedBids[0];

  if (displayBids.length === 0) {
    return (
      <div className={cn('text-center py-8 text-nobel', className)}>
        <p>Aucune enchère pour le moment</p>
        <p className="text-sm mt-1">Soyez le premier à enchérir!</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      {displayBids.map((bid, index) => {
        const isHighest = bid.id === highestBid?.id;
        const isCurrentUser = bid.user_id === currentUserId;
        const timeAgo = formatDistanceToNow(new Date(bid.created_at), {
          addSuffix: true,
          locale: fr,
        });

        return (
          <div
            key={bid.id}
            className={cn(
              'flex items-center justify-between p-3 rounded-lg transition-colors',
              isHighest
                ? 'bg-mandarin/10 border border-mandarin/20'
                : 'bg-surface',
              isCurrentUser && !isHighest && 'ring-1 ring-royal-blue/30'
            )}
          >
            <div className="flex items-center gap-3">
              {/* Rank or User Icon */}
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold',
                  isHighest
                    ? 'bg-mandarin text-white'
                    : 'bg-nobel/20 text-nobel'
                )}
              >
                {isHighest ? (
                  <Trophy className="w-4 h-4" />
                ) : (
                  index + 1
                )}
              </div>

              {/* User Info */}
              <div>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-nobel" />
                  <span className={cn('text-sm', isCurrentUser ? 'text-royal-blue font-medium' : 'text-white')}>
                    {isCurrentUser ? 'Vous' : `Enchérisseur #${bid.user_id.slice(-4)}`}
                  </span>
                  {isHighest && (
                    <span className="text-xs bg-mandarin/20 text-mandarin px-2 py-0.5 rounded-full">
                      Meilleure
                    </span>
                  )}
                </div>
                <span className="text-xs text-nobel">{timeAgo}</span>
              </div>
            </div>

            {/* Bid Amount */}
            <div className="text-right">
              <p
                className={cn(
                  'font-bold',
                  isHighest ? 'text-mandarin' : 'text-white'
                )}
              >
                {formatUsdToLocal(bid.amount_usd)}
              </p>
              {bid.status === 'pending' && (
                <span className="text-xs text-jewel">En attente</span>
              )}
              {bid.status === 'won' && (
                <span className="text-xs text-jewel">Gagnant</span>
              )}
              {bid.status === 'outbid' && (
                <span className="text-xs text-nobel">Surenchéri</span>
              )}
            </div>
          </div>
        );
      })}

      {!showAll && sortedBids.length > maxItems && (
        <p className="text-center text-sm text-nobel">
          +{sortedBids.length - maxItems} autres enchères
        </p>
      )}
    </div>
  );
}

// Compact version for sidebar
interface BidHistoryCompactProps {
  bids: Bid[];
  currentUserId?: string;
  className?: string;
}

export function BidHistoryCompact({
  bids,
  currentUserId,
  className,
}: BidHistoryCompactProps) {
  const sortedBids = [...bids]
    .filter((b) => b.status !== 'cancelled')
    .sort((a, b) => b.amount_usd - a.amount_usd)
    .slice(0, 5);

  return (
    <div className={cn('space-y-2', className)}>
      {sortedBids.map((bid) => {
        const isCurrentUser = bid.user_id === currentUserId;

        return (
          <div
            key={bid.id}
            className="flex items-center justify-between text-sm"
          >
            <span className={cn(isCurrentUser ? 'text-royal-blue' : 'text-nobel')}>
              {isCurrentUser ? 'Vous' : `#${bid.user_id.slice(-4)}`}
            </span>
            <span className="text-white font-medium">
              {formatUsdToLocal(bid.amount_usd)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
