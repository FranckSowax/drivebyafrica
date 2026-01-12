'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gavel, TrendingUp, Users, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { useBids } from '@/lib/hooks/useBids';
import { usePresence } from '@/lib/hooks/useRealtime';
import { useAuthStore } from '@/store/useAuthStore';
import { formatCurrency } from '@/lib/utils/currency';
import { CountdownTimer } from './CountdownTimer';
import { BidHistory, BidHistoryCompact } from './BidHistory';
import { cn } from '@/lib/utils';
import type { Vehicle } from '@/types/vehicle';

interface LiveBiddingProps {
  vehicle: Vehicle;
  className?: string;
}

const BID_INCREMENTS = [100, 250, 500, 1000, 2500];

export function LiveBidding({ vehicle, className }: LiveBiddingProps) {
  const { user } = useAuthStore();
  const toast = useToast();
  const [customAmount, setCustomAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showBidHistory, setShowBidHistory] = useState(false);

  const {
    bids,
    isLoading,
    placeBid,
    getHighestBid,
    hasActiveBid,
  } = useBids({ vehicleId: vehicle.id, realtime: true });

  const { onlineCount, isConnected } = usePresence({
    channelName: `auction-${vehicle.id}`,
    userId: user?.id,
    enabled: !!user,
  });

  const highestBid = getHighestBid();
  const currentPrice = highestBid?.amount_usd || vehicle.start_price_usd || 0;
  const minNextBid = currentPrice + 100;
  const userHasActiveBid = hasActiveBid();
  const isUserHighestBidder = highestBid?.user_id === user?.id;
  const auctionEnded = vehicle.auction_status === 'ended' || vehicle.auction_status === 'sold';

  // Animation for new bids
  const [newBidAnimation, setNewBidAnimation] = useState(false);
  useEffect(() => {
    if (highestBid) {
      setNewBidAnimation(true);
      const timer = setTimeout(() => setNewBidAnimation(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [highestBid?.id]);

  const handlePlaceBid = async (amount: number) => {
    if (!user) {
      toast.warning('Connexion requise', 'Connectez-vous pour enchérir');
      return;
    }

    if (amount < minNextBid) {
      toast.error('Montant insuffisant', `Le montant minimum est de ${formatCurrency(minNextBid, 'USD')}`);
      return;
    }

    setIsSubmitting(true);
    const result = await placeBid(vehicle.id, amount);
    setIsSubmitting(false);

    if (result.success) {
      setCustomAmount('');
    }
  };

  const handleQuickBid = (increment: number) => {
    handlePlaceBid(currentPrice + increment);
  };

  const handleCustomBid = () => {
    const amount = parseFloat(customAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Montant invalide', 'Veuillez entrer un montant valide');
      return;
    }
    handlePlaceBid(amount);
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Auction Status Header */}
      <Card className="relative overflow-hidden">
        {/* Live indicator */}
        {vehicle.auction_status === 'ongoing' && (
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
            </span>
            <span className="text-sm font-medium text-red-500">EN DIRECT</span>
          </div>
        )}

        {/* Online viewers */}
        {isConnected && onlineCount > 0 && (
          <div className="flex items-center gap-2 text-sm text-nobel mb-4">
            <Users className="w-4 h-4" />
            <span>{onlineCount} spectateur{onlineCount > 1 ? 's' : ''}</span>
          </div>
        )}

        {/* Current Price */}
        <div className="text-center mb-6">
          <p className="text-sm text-nobel mb-1">
            {highestBid ? 'Enchère actuelle' : 'Prix de départ'}
          </p>
          <motion.p
            className={cn(
              'text-4xl font-bold',
              newBidAnimation ? 'text-mandarin scale-110' : 'text-white'
            )}
            animate={newBidAnimation ? { scale: [1, 1.1, 1] } : {}}
            transition={{ duration: 0.3 }}
          >
            {formatCurrency(currentPrice, 'USD')}
          </motion.p>
          {highestBid && (
            <p className="text-sm text-nobel mt-1">
              {bids.filter((b) => b.status !== 'cancelled').length} enchère{bids.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        {/* Countdown */}
        {vehicle.auction_date && vehicle.auction_status === 'ongoing' && (
          <div className="flex justify-center mb-6">
            <CountdownTimer
              targetDate={vehicle.auction_date}
              size="md"
              onComplete={() => toast.info('Enchère terminée!')}
            />
          </div>
        )}

        {/* User Status */}
        {user && userHasActiveBid && (
          <div
            className={cn(
              'p-3 rounded-lg mb-4 flex items-center gap-2',
              isUserHighestBidder
                ? 'bg-jewel/10 border border-jewel/20'
                : 'bg-mandarin/10 border border-mandarin/20'
            )}
          >
            {isUserHighestBidder ? (
              <>
                <TrendingUp className="w-5 h-5 text-jewel" />
                <span className="text-jewel font-medium">
                  Vous êtes le meilleur enchérisseur!
                </span>
              </>
            ) : (
              <>
                <AlertCircle className="w-5 h-5 text-mandarin" />
                <span className="text-mandarin font-medium">
                  Vous avez été surenchéri!
                </span>
              </>
            )}
          </div>
        )}

        {/* Bidding Controls */}
        {!auctionEnded && vehicle.auction_status === 'ongoing' && (
          <>
            {/* Quick Bid Buttons */}
            <div className="grid grid-cols-5 gap-2 mb-4">
              {BID_INCREMENTS.map((increment) => (
                <Button
                  key={increment}
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickBid(increment)}
                  disabled={isSubmitting || !user}
                  className="text-xs"
                >
                  +${increment >= 1000 ? `${increment / 1000}k` : increment}
                </Button>
              ))}
            </div>

            {/* Custom Bid */}
            <div className="flex gap-2 mb-4">
              <Input
                type="number"
                placeholder={`Min: ${formatCurrency(minNextBid, 'USD')}`}
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                className="flex-1"
                disabled={isSubmitting || !user}
              />
              <Button
                variant="primary"
                onClick={handleCustomBid}
                disabled={isSubmitting || !user || !customAmount}
                isLoading={isSubmitting}
                leftIcon={<Gavel className="w-4 h-4" />}
              >
                Enchérir
              </Button>
            </div>

            {/* Min bid notice */}
            <p className="text-xs text-nobel text-center">
              Enchère minimum: {formatCurrency(minNextBid, 'USD')}
            </p>
          </>
        )}

        {/* Auction Ended */}
        {auctionEnded && (
          <div className="text-center py-4">
            <Badge variant="error" className="mb-2">Enchère terminée</Badge>
            {highestBid && (
              <p className="text-nobel">
                Vendu pour {formatCurrency(highestBid.amount_usd, 'USD')}
              </p>
            )}
          </div>
        )}

        {/* Buy Now */}
        {vehicle.buy_now_price_usd && !auctionEnded && (
          <div className="mt-4 pt-4 border-t border-nobel/20">
            <Button variant="secondary" className="w-full" disabled={!user}>
              Acheter maintenant - {formatCurrency(vehicle.buy_now_price_usd, 'USD')}
            </Button>
          </div>
        )}
      </Card>

      {/* Bid History Toggle */}
      <button
        onClick={() => setShowBidHistory(!showBidHistory)}
        className="w-full text-center text-sm text-mandarin hover:underline"
      >
        {showBidHistory ? 'Masquer' : 'Voir'} l&apos;historique des enchères
      </button>

      {/* Bid History */}
      <AnimatePresence>
        {showBidHistory && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Card>
              <h3 className="font-bold text-white mb-4">Historique des enchères</h3>
              {isLoading ? (
                <div className="text-center py-4 text-nobel">Chargement...</div>
              ) : (
                <BidHistory
                  bids={bids}
                  currentUserId={user?.id}
                  maxItems={10}
                />
              )}
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick History Preview (always visible) */}
      {!showBidHistory && bids.length > 0 && (
        <Card>
          <h4 className="text-sm font-medium text-nobel mb-2">Dernières enchères</h4>
          <BidHistoryCompact bids={bids} currentUserId={user?.id} />
        </Card>
      )}
    </div>
  );
}
