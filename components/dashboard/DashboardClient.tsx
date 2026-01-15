'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  Package,
  FileText,
  Heart,
  Car,
  ArrowRight,
  TrendingUp,
  Ship,
  CheckCircle,
  Calculator,
  Search,
  Bell,
  Clock,
  MoreHorizontal,
  Wallet,
  Building2,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { formatUsdToLocal, formatCurrency } from '@/lib/utils/currency';
import type { Order, Profile, Quote } from '@/types/database';

interface DashboardClientProps {
  profile: Profile | null;
  orders: Order[];
  quotes: any[];
  favoritesCount: number;
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export function DashboardClient({ profile, orders, quotes, favoritesCount }: DashboardClientProps) {
  // Stats calculations
  const activeOrders = orders.filter(
    (o) => !['delivered', 'cancelled'].includes(o.status)
  ).length;
  const pendingQuotes = quotes.filter((q) => q.status === 'pending').length;
  const totalSpent = orders
    .filter((o) => o.status === 'delivered')
    .reduce((sum, o) => sum + (o.total_price_usd || 0), 0);

  // Status mapping for visual polish
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bonjour';
    if (hour < 18) return 'Bon après-midi';
    return 'Bonsoir';
  };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-8 pb-10"
    >
      {/* Header Section with glassmorphism feel */}
      <motion.div variants={item} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
            {getGreeting()}, <span className="text-mandarin">{profile?.full_name?.split(' ')[0] || 'Utilisateur'}</span>
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 font-medium">
            Voici un aperçu de vos activités d'importation aujourd'hui.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/cars">
            <Button variant="primary" className="shadow-lg shadow-mandarin/20 hover:shadow-mandarin/30 transition-all">
              <Search className="w-4 h-4 mr-2" />
              Trouver un véhicule
            </Button>
          </Link>
        </div>
      </motion.div>

      {/* Stats Grid - Ultra Responsive */}
      <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <ModernStatCard
          icon={FileText}
          label="Devis en attente"
          value={pendingQuotes.toString()}
          trend="Action requise"
          trendUp={pendingQuotes > 0}
          color="orange"
          href="/dashboard/quotes"
        />
        <ModernStatCard
          icon={Package}
          label="Commandes actives"
          value={activeOrders.toString()}
          trend="En cours"
          color="blue"
          href="/dashboard/orders"
        />
        <ModernStatCard
          icon={Heart}
          label="Véhicules favoris"
          value={favoritesCount.toString()}
          trend="Sauvegardés"
          color="red"
          href="/dashboard/favorites"
        />
        <ModernStatCard
          icon={Wallet}
          label="Total investi"
          value={formatUsdToLocal(totalSpent)}
          trend="Importations réussies"
          color="green"
          isCurrency
        />
      </motion.div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 md:gap-8">
        
        {/* Left Column (2/3 width on large screens) */}
        <div className="xl:col-span-2 space-y-6 md:space-y-8">
          
          {/* Quick Actions - Mobile First Design */}
          <motion.div variants={item}>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-mandarin" />
              Accès Rapide
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
              <QuickActionCard
                href="/cars"
                icon={Car}
                label="Véhicules"
                color="bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
              />
              <QuickActionCard
                href="/calculator"
                icon={Calculator}
                label="Simulateur"
                color="bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400"
              />
              <QuickActionCard
                href="/dashboard/quotes"
                icon={FileText}
                label="Mes Devis"
                color="bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400"
              />
              <QuickActionCard
                href="/dashboard/orders"
                icon={Ship}
                label="Suivi"
                color="bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400"
              />
            </div>
          </motion.div>

          {/* Recent Orders Section */}
          <motion.div variants={item}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Package className="w-5 h-5 text-mandarin" />
                Commandes Récentes
              </h2>
              <Link href="/dashboard/orders" className="text-sm font-medium text-mandarin hover:text-mandarin/80 transition-colors flex items-center group">
                Tout voir <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
            
            <div className="space-y-4">
              {orders.length > 0 ? (
                orders.slice(0, 3).map((order) => (
                  <ModernOrderCard key={order.id} order={order} />
                ))
              ) : (
                <EmptyState
                  icon={Package}
                  title="Aucune commande en cours"
                  description="Commencez par demander un devis pour votre véhicule de rêve."
                  actionLabel="Trouver un véhicule"
                  href="/cars"
                />
              )}
            </div>
          </motion.div>

          {/* Recent Quotes Section */}
          <motion.div variants={item}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-mandarin" />
                Derniers Devis
              </h2>
              <Link href="/dashboard/quotes" className="text-sm font-medium text-mandarin hover:text-mandarin/80 transition-colors flex items-center group">
                Tout voir <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {quotes.length > 0 ? (
                quotes.slice(0, 4).map((quote) => (
                  <ModernQuoteCard key={quote.id} quote={quote} />
                ))
              ) : (
                <div className="md:col-span-2">
                  <EmptyState
                    icon={FileText}
                    title="Aucun devis généré"
                    description="Explorez notre catalogue et demandez un devis gratuit."
                    actionLabel="Voir le catalogue"
                    href="/cars"
                  />
                </div>
              )}
            </div>
          </motion.div>

        </div>

        {/* Right Column (1/3 width) - Sidebar-like content */}
        <div className="space-y-6 md:space-y-8">
          
          {/* Process Steps */}
          <motion.div variants={item} className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-32 bg-mandarin/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
            
            <h3 className="text-lg font-bold mb-6 relative z-10">Processus d'importation</h3>
            
            <div className="space-y-6 relative z-10">
              <ProcessStep 
                number="1" 
                title="Choix & Devis" 
                desc="Sélectionnez votre véhicule et validez le devis." 
                isLast={false} 
              />
              <ProcessStep 
                number="2" 
                title="Paiement Acompte" 
                desc="1000$ pour bloquer le véhicule et l'inspecter." 
                isLast={false} 
              />
              <ProcessStep 
                number="3" 
                title="Inspection & Solde" 
                desc="Validation technique et paiement final." 
                isLast={false} 
              />
              <ProcessStep 
                number="4" 
                title="Livraison" 
                desc="Expédition sécurisée jusqu'au port." 
                isLast={true} 
              />
            </div>

            <Link href="/how-it-works" className="inline-block mt-8 text-sm font-medium text-mandarin hover:text-white transition-colors">
              En savoir plus sur le processus &rarr;
            </Link>
          </motion.div>

          {/* Need Help Card */}
          <motion.div variants={item} className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <Building2 className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="font-bold text-gray-900 dark:text-white">Besoin d'aide ?</h3>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Nos agents sont disponibles pour vous accompagner dans votre projet.
            </p>
            <div className="space-y-2">
              <a href="https://wa.me/24177000000" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center w-full py-2.5 px-4 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg text-sm font-medium transition-colors">
                Contacter sur WhatsApp
              </a>
              <a href="mailto:contact@drivebyafrica.com" className="flex items-center justify-center w-full py-2.5 px-4 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-lg text-sm font-medium transition-colors">
                Envoyer un email
              </a>
            </div>
          </motion.div>

        </div>
      </div>
    </motion.div>
  );
}

// Sub-components for cleaner code

function ModernStatCard({ icon: Icon, label, value, trend, trendUp, color, href, isCurrency }: any) {
  const colorStyles = {
    orange: 'bg-orange-50 text-orange-600 dark:bg-orange-900/10 dark:text-orange-400',
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/10 dark:text-blue-400',
    red: 'bg-red-50 text-red-600 dark:bg-red-900/10 dark:text-red-400',
    green: 'bg-green-50 text-green-600 dark:bg-green-900/10 dark:text-green-400',
  };

  const Content = (
    <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow h-full flex flex-col justify-between group">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-xl ${colorStyles[color as keyof typeof colorStyles]}`}>
          <Icon className="w-5 h-5" />
        </div>
        {trend && (
          <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
            trendUp ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'
          }`}>
            {trend}
          </span>
        )}
      </div>
      <div>
        <p className={`text-2xl font-black text-gray-900 dark:text-white mb-1 group-hover:scale-105 transition-transform origin-left ${isCurrency ? 'text-lg sm:text-2xl' : ''}`}>
          {value}
        </p>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
          {label}
        </p>
      </div>
    </div>
  );

  if (href) {
    return <Link href={href} className="block h-full">{Content}</Link>;
  }
  return Content;
}

function QuickActionCard({ href, icon: Icon, label, color }: any) {
  return (
    <Link href={href}>
      <div className="flex flex-col items-center justify-center p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all cursor-pointer h-full group">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 transition-transform group-hover:scale-110 ${color}`}>
          <Icon className="w-6 h-6" />
        </div>
        <span className="text-sm font-bold text-gray-700 dark:text-gray-300 group-hover:text-mandarin transition-colors">
          {label}
        </span>
      </div>
    </Link>
  );
}

function ModernOrderCard({ order }: { order: Order }) {
  const title = order.vehicle_make && order.vehicle_model 
    ? `${order.vehicle_make} ${order.vehicle_model}`
    : `Commande #${order.id.slice(0, 8)}`;

  return (
    <Link href={`/dashboard/orders/${order.id}`}>
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md hover:border-mandarin/30 transition-all group flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
            <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="font-bold text-sm text-gray-900 dark:text-white">{title}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {new Date(order.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-bold text-mandarin text-sm">
            {formatUsdToLocal(order.total_price_usd || 0)}
          </p>
          <span className="text-[10px] bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full text-gray-600 dark:text-gray-300">
            {order.status}
          </span>
        </div>
      </div>
    </Link>
  );
}

function ModernQuoteCard({ quote }: { quote: any }) {
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

function ProcessStep({ number, title, desc, isLast }: any) {
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

function EmptyState({ icon: Icon, title, description, actionLabel, href }: any) {
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
