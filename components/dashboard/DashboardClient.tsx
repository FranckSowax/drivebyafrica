'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Package,
  FileText,
  Heart,
  Car,
  ArrowRight,
  TrendingUp,
  Ship,
  Calculator,
  Search,
  Wallet,
  Building2,
  LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatUsdToLocal, formatCurrency } from '@/lib/utils/currency';
import { ORDER_STATUSES, type OrderStatus } from '@/lib/hooks/useOrders';
import type { Order, Profile, Quote } from '@/types/database';

interface DashboardClientProps {
  profile: Profile | null;
  orders: Order[];
  quotes: Quote[];
  favoritesCount: number;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: 'spring' as const,
      stiffness: 100,
    },
  },
};

export default function DashboardClient({
  profile,
  orders,
  quotes,
  favoritesCount,
}: DashboardClientProps) {
  const stats = [
    {
      label: 'Commandes',
      value: orders.length,
      icon: Package,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      href: '/dashboard/orders',
    },
    {
      label: 'Devis',
      value: quotes.length,
      icon: FileText,
      color: 'text-mandarin',
      bgColor: 'bg-orange-50',
      href: '/dashboard/quotes',
    },
    {
      label: 'Favoris',
      value: favoritesCount,
      icon: Heart,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      href: '/favorites',
    },
    {
      label: 'Portefeuille',
      value: formatCurrency(0),
      icon: Wallet,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      href: '/dashboard/wallet',
    },
  ];

  return (
    <div className="space-y-8 pb-12">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white flex items-center gap-3">
            Tableau de bord
            <span className="text-mandarin animate-pulse">.</span>
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Bienvenue, <span className="text-gray-900 dark:text-white font-bold">{profile?.full_name || 'Importateur'}</span> 👋
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/shipping-estimator">
            <Button className="bg-mandarin hover:bg-mandarin/90 text-white shadow-lg shadow-mandarin/20 rounded-xl px-6">
              Nouveau Devis
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {stats.map((stat, idx) => (
          <motion.div key={idx} variants={itemVariants}>
            <Link href={stat.href}>
              <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
                <div className={`absolute top-0 right-0 w-24 h-24 ${stat.bgColor} rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-110 opacity-50`} />
                <stat.icon className={`w-5 h-5 ${stat.color} mb-3 relative z-10`} />
                <p className="text-2xl font-black text-gray-900 dark:text-white relative z-10">
                  {stat.value}
                </p>
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider relative z-10">
                  {stat.label}
                </p>
              </div>
            </Link>
          </motion.div>
        ))}
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Content: Orders & Quotes */}
        <div className="lg:col-span-2 space-y-8">
          {/* Recent Orders */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                <Package className="w-5 h-5 text-mandarin" />
                Commandes récentes
              </h2>
              <Link href="/dashboard/orders" className="text-xs font-bold text-mandarin hover:underline flex items-center gap-1">
                Tout voir <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            
            {orders.length > 0 ? (
              <div className="grid sm:grid-cols-2 gap-4">
                {orders.slice(0, 4).map((order) => (
                  <ModernOrderCard key={order.id} order={order} />
                ))}
              </div>
            ) : (
              <EmptyState 
                icon={Package}
                title="Aucune commande"
                description="Vous n'avez pas encore passé de commande. Commencez par créer un devis."
                actionLabel="Calculer un devis"
                href="/shipping-estimator"
              />
            )}
          </section>

          {/* Recent Quotes */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-mandarin" />
                Devis récents
              </h2>
              <Link href="/dashboard/quotes" className="text-xs font-bold text-mandarin hover:underline flex items-center gap-1">
                Tout voir <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {quotes.length > 0 ? (
              <div className="grid sm:grid-cols-2 gap-4">
                {quotes.slice(0, 4).map((quote) => (
                  <ModernQuoteCard key={quote.id} quote={quote} />
                ))}
              </div>
            ) : (
              <EmptyState 
                icon={FileText}
                title="Aucun devis"
                description="Utilisez notre simulateur pour estimer le coût d'importation de votre véhicule."
                actionLabel="Calculer maintenant"
                href="/shipping-estimator"
              />
            )}
          </section>
        </div>

        {/* Sidebar: Next Steps & Quick Actions */}
        <div className="space-y-8">
          {/* Progress Card */}
          <div className="bg-gray-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-mandarin/20 rounded-full -mr-32 -mt-32 blur-3xl group-hover:bg-mandarin/30 transition-colors" />
            <h3 className="text-xl font-black mb-4 relative z-10">Comment ça marche ?</h3>
            <div className="space-y-4 relative z-10">
              <ProcessStep 
                number="1"
                title="Simulation"
                desc="Créez votre devis personnalisé en quelques secondes."
              />
              <ProcessStep 
                number="2"
                title="Acompte"
                desc="Payez 600k FCFA pour lancer l'achat de votre véhicule."
              />
              <ProcessStep 
                number="3"
                title="Suivi"
                desc="Suivez chaque étape du transport jusqu'au port."
              />
              <ProcessStep 
                number="4"
                title="Livraison"
                desc="Récupérez vos clés et profitez de votre nouvelle voiture !"
                isLast
              />
            </div>
            <Link href="/how-it-works" className="block mt-6">
              <Button className="w-full bg-white text-gray-900 hover:bg-gray-100 font-bold py-6 rounded-2xl">
                Guide complet
              </Button>
            </Link>
          </div>

          {/* Quick Tools */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
            <h3 className="text-lg font-black text-gray-900 dark:text-white mb-4">Outils rapides</h3>
            <div className="grid grid-cols-2 gap-3">
              <QuickTool 
                icon={Search} 
                label="Rechercher" 
                href="/vehicles" 
                color="text-purple-600" 
                bgColor="bg-purple-50 dark:bg-purple-900/20"
              />
              <QuickTool 
                icon={Calculator} 
                label="Simulateur" 
                href="/shipping-estimator" 
                color="text-orange-600" 
                bgColor="bg-orange-50 dark:bg-orange-900/20"
              />
              <QuickTool 
                icon={TrendingUp} 
                label="Marché" 
                href="/vehicles" 
                color="text-green-600" 
                bgColor="bg-green-50 dark:bg-green-900/20"
              />
              <QuickTool 
                icon={Building2} 
                label="Concession" 
                href="/vehicles" 
                color="text-blue-600" 
                bgColor="bg-blue-50 dark:bg-blue-900/20"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ModernOrderCard({ order }: { order: Order }) {
  const status = ORDER_STATUSES[order.status as OrderStatus] || ORDER_STATUSES.deposit_pending;
  const title = order.vehicle_make && order.vehicle_model 
    ? `${order.vehicle_make} ${order.vehicle_model}`
    : `Commande #${order.id.slice(0, 8)}`;

  return (
    <Link href={`/dashboard/orders/${order.id}`}>
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all group">
        <div className="flex justify-between items-start mb-2">
          <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded-lg group-hover:bg-mandarin/10 transition-colors">
            <Car className="w-5 h-5 text-gray-600 dark:text-gray-300 group-hover:text-mandarin" />
          </div>
          <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase">
            {new Date(order.created_at).toLocaleDateString()}
          </p>
        </div>
        <h3 className="font-bold text-sm text-gray-900 dark:text-white mb-1 truncate">
          {title}
        </h3>
        <div className="flex items-center justify-between mt-3">
          <p className="font-black text-gray-900 dark:text-white text-sm">
            {formatUsdToLocal(order.vehicle_price_usd || 0)}
          </p>
          <span className={`text-[10px] ${status.color.replace('bg-', 'text-')} bg-opacity-10 px-2 py-0.5 rounded-full font-medium`}>
            {status.label}
          </span>
        </div>
      </div>
    </Link>
  );
}

function ModernQuoteCard({ quote }: { quote: Quote }) {
  const statusConfig = {
    pending: { label: 'En attente', class: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
    accepted: { label: 'Accepté', class: 'bg-green-100 text-green-700 border-green-200' },
    rejected: { label: 'Refusé', class: 'bg-red-100 text-red-700 border-red-200' },
    expired: { label: 'Expiré', class: 'bg-gray-100 text-gray-700 border-gray-200' },
  };

  const status = statusConfig[quote.status as keyof typeof statusConfig] || statusConfig.pending;

  return (
    <Link href={`/dashboard/quotes`}>
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md hover:border-mandarin/30 transition-all group">
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <Car className="w-4 h-4 text-gray-600 dark:text-gray-300" />
            </div>
            <div>
              <p className="font-bold text-sm text-gray-900 dark:text-white truncate max-w-[120px] sm:max-w-[180px]">
                {quote.vehicle_make} {quote.vehicle_model}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {new Date(quote.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${status.class}`}>
            {status.label}
          </span>
        </div>
        
        <div className="flex items-center justify-between pt-3 border-t border-gray-50 dark:border-gray-700">
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Ship className="w-3 h-3" />
            {quote.destination_name}
          </div>
          <p className="font-black text-mandarin text-sm">
            {formatCurrency(quote.total_cost_xaf)}
          </p>
        </div>
      </div>
    </Link>
  );
}

interface ProcessStepProps {
  number: string;
  title: string;
  desc: string;
  isLast?: boolean;
}

function ProcessStep({ number, title, desc, isLast }: ProcessStepProps) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className="w-8 h-8 rounded-full bg-mandarin text-white flex items-center justify-center font-bold text-sm shadow-lg shadow-mandarin/30 z-10">
          {number}
        </div>
        {!isLast && <div className="w-0.5 flex-1 bg-gray-700 my-1"></div>}
      </div>
      <div className="pb-6">
        <h4 className="text-sm font-bold text-white">{title}</h4>
        <p className="text-xs text-gray-400 mt-1 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel: string;
  href: string;
}

function EmptyState({ icon: Icon, title, description, actionLabel, href }: EmptyStateProps) {
  return (
    <div className="text-center py-8 px-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
      <div className="w-12 h-12 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm">
        <Icon className="w-6 h-6 text-gray-400" />
      </div>
      <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">{title}</h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 max-w-xs mx-auto">
        {description}
      </p>
      <Link href={href}>
        <Button variant="outline" size="sm" className="text-xs">
          {actionLabel}
        </Button>
      </Link>
    </div>
  );
}

function QuickTool({ 
  icon: Icon, 
  label, 
  href, 
  color, 
  bgColor 
}: { 
  icon: LucideIcon; 
  label: string; 
  href: string; 
  color: string; 
  bgColor: string; 
}) {
  return (
    <Link href={href}>
      <div className={`${bgColor} p-4 rounded-2xl flex flex-col items-center text-center group hover:scale-105 transition-transform`}>
        <Icon className={`w-6 h-6 ${color} mb-2`} />
        <span className="text-[10px] font-black text-gray-900 dark:text-white uppercase tracking-tighter">
          {label}
        </span>
      </div>
    </Link>
  );
}
