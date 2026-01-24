'use client';

import { Wallet, Plus, ArrowUpRight, ArrowDownLeft, History } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function WalletPage() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Mon Portefeuille</h1>
          <p className="text-nobel">Gérez vos fonds et vos transactions</p>
        </div>
        <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />}>
          Recharger le compte
        </Button>
      </div>

      {/* Balance Card */}
      <Card className="bg-gradient-primary p-8 text-white border-none shadow-glow-mandarin">
        <div className="flex items-center gap-3 opacity-90 mb-2">
          <Wallet className="w-5 h-5" />
          <span className="text-sm font-medium uppercase tracking-wider">Solde disponible</span>
        </div>
        <div className="text-4xl font-bold">0 FCFA</div>
        <div className="mt-6 flex gap-4">
          <div className="flex-1 bg-white/10 rounded-lg p-3 backdrop-blur-sm">
            <p className="text-xs opacity-70 mb-1">En attente</p>
            <p className="font-semibold">0 FCFA</p>
          </div>
          <div className="flex-1 bg-white/10 rounded-lg p-3 backdrop-blur-sm">
            <p className="text-xs opacity-70 mb-1">Total dépensé</p>
            <p className="font-semibold">0 FCFA</p>
          </div>
        </div>
      </Card>

      {/* Recent Transactions */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-white">
          <History className="w-5 h-5 text-mandarin" />
          <h2 className="text-lg font-bold">Transactions récentes</h2>
        </div>
        
        <Card className="bg-surface/50 border-nobel/10 p-12 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-nobel/10 rounded-full flex items-center justify-center mb-4">
            <History className="w-8 h-8 text-nobel/50" />
          </div>
          <h3 className="text-white font-medium">Aucune transaction</h3>
          <p className="text-nobel text-sm mt-1 max-w-xs">
            Vos transactions de recharge et de paiement apparaîtront ici.
          </p>
        </Card>
      </div>
    </div>
  );
}
