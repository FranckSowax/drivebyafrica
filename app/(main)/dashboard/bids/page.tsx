'use client';

import { Gavel, Clock, Trophy, XCircle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

export default function BidsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Mes Enchères</h1>
        <p className="text-nobel">Suivez vos offres en temps réel</p>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-surface border-nobel/10 p-4 flex items-center gap-4">
          <div className="w-12 h-12 bg-mandarin/10 rounded-xl flex items-center justify-center">
            <Clock className="w-6 h-6 text-mandarin" />
          </div>
          <div>
            <p className="text-xs text-nobel uppercase tracking-wider font-medium">En cours</p>
            <p className="text-xl font-bold text-white">0</p>
          </div>
        </Card>
        <Card className="bg-surface border-nobel/10 p-4 flex items-center gap-4">
          <div className="w-12 h-12 bg-jewel/10 rounded-xl flex items-center justify-center">
            <Trophy className="w-6 h-6 text-jewel" />
          </div>
          <div>
            <p className="text-xs text-nobel uppercase tracking-wider font-medium">Gagnées</p>
            <p className="text-xl font-bold text-white">0</p>
          </div>
        </Card>
        <Card className="bg-surface border-nobel/10 p-4 flex items-center gap-4">
          <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center">
            <XCircle className="w-6 h-6 text-red-500" />
          </div>
          <div>
            <p className="text-xs text-nobel uppercase tracking-wider font-medium">Perdues</p>
            <p className="text-xl font-bold text-white">0</p>
          </div>
        </Card>
      </div>

      {/* Bids List */}
      <Card className="bg-surface/50 border-nobel/10 p-12 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 bg-nobel/10 rounded-full flex items-center justify-center mb-4">
          <Gavel className="w-8 h-8 text-nobel/50" />
        </div>
        <h3 className="text-white font-medium">Aucune enchère en cours</h3>
        <p className="text-nobel text-sm mt-1 max-w-xs">
          Parcourez notre catalogue pour trouver des véhicules aux enchères.
        </p>
      </Card>
    </div>
  );
}
