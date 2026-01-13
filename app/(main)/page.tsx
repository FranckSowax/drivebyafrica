import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Car, Shield, Truck, Headphones, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { createClient } from '@/lib/supabase/server';
import { VehicleCard } from '@/components/vehicles/VehicleCard';
import type { Vehicle } from '@/types/vehicle';

const features = [
  {
    icon: Car,
    title: 'Véhicules vérifiés',
    description:
      "Chaque véhicule est inspecté et dispose d'une fiche d'enchère détaillée avec historique complet.",
  },
  {
    icon: Shield,
    title: 'Transactions sécurisées',
    description:
      'Paiements sécurisés via Stripe et Mobile Money. Votre argent est protégé jusqu\'à la livraison.',
  },
  {
    icon: Truck,
    title: 'Livraison complète',
    description:
      'De l\'enchère au port africain. Suivi en temps réel et assistance douanière incluse.',
  },
  {
    icon: Headphones,
    title: 'Support 24/7',
    description:
      'Équipe dédiée disponible par WhatsApp. Assistance en français tout au long du processus.',
  },
];

const steps = [
  {
    number: '01',
    title: 'Choisissez',
    description: 'Parcourez notre catalogue et trouvez le véhicule idéal parmi des milliers d\'options.',
  },
  {
    number: '02',
    title: 'Enchérissez',
    description: 'Participez aux enchères en direct ou optez pour l\'achat immédiat.',
  },
  {
    number: '03',
    title: 'Payez',
    description: 'Réglez de manière sécurisée via carte bancaire ou Mobile Money.',
  },
  {
    number: '04',
    title: 'Recevez',
    description: 'Suivez votre véhicule jusqu\'à sa livraison au port de votre choix.',
  },
];

const stats = [
  { value: '15,000+', label: 'Véhicules disponibles' },
  { value: '2,500+', label: 'Clients satisfaits' },
  { value: '12', label: 'Pays desservis' },
  { value: '98%', label: 'Taux de satisfaction' },
];

export default async function HomePage() {
  const supabase = await createClient();

  // Fetch featured vehicles
  const { data } = await supabase
    .from('vehicles')
    .select('*')
    .eq('auction_status', 'upcoming')
    .order('favorites_count', { ascending: false })
    .limit(6);

  const featuredVehicles = (data || []) as Vehicle[];

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--surface)] via-[var(--background)] to-mandarin/10" />
        <div className="absolute inset-0 bg-[url('/images/hero-pattern.svg')] opacity-5" />

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-mandarin/10 rounded-full border border-mandarin/20 mb-6">
              <span className="text-mandarin font-medium text-sm">
                Nouveau: Enchères en direct depuis Dubaï 🇦🇪
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[var(--text-primary)] leading-tight mb-6">
              Importez votre véhicule depuis{' '}
              <span className="text-mandarin">le monde entier</span>
            </h1>

            <p className="text-lg text-[var(--text-muted)] mb-8 max-w-xl">
              Accédez aux enchères automobiles de Corée du Sud, Chine et Dubaï.
              Suivi complet de l&apos;enchère jusqu&apos;à la livraison en Afrique.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/cars">
                <Button variant="primary" size="lg" rightIcon={<ArrowRight className="w-5 h-5" />}>
                  Explorer les véhicules
                </Button>
              </Link>
              <Link href="/how-it-works">
                <Button variant="outline" size="lg">
                  Comment ça marche
                </Button>
              </Link>
            </div>

            {/* Source Badges */}
            <div className="flex items-center gap-6 mt-12">
              <p className="text-sm text-[var(--text-muted)]">Sources:</p>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--surface)] rounded-full">
                  <span className="text-xl">🇰🇷</span>
                  <span className="text-sm text-[var(--text-secondary)]">Corée</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--surface)] rounded-full">
                  <span className="text-xl">🇨🇳</span>
                  <span className="text-sm text-[var(--text-secondary)]">Chine</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--surface)] rounded-full">
                  <span className="text-xl">🇦🇪</span>
                  <span className="text-sm text-[var(--text-secondary)]">Dubaï</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Hero Car Image */}
        <div className="hidden lg:block absolute right-0 bottom-0 w-1/2 h-full">
          <div className="relative w-full h-full flex items-end justify-center">
            <Image
              src="/imgi_62_image.png"
              alt="Véhicules disponibles"
              width={800}
              height={400}
              className="object-contain max-w-full h-auto"
              priority
            />
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-[var(--surface)]">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-3xl lg:text-4xl font-bold text-mandarin">{stat.value}</p>
                <p className="text-[var(--text-muted)] mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Vehicles */}
      {featuredVehicles && featuredVehicles.length > 0 && (
        <section className="py-20 bg-[var(--background)]">
          <div className="container mx-auto px-4">
            <div className="flex justify-between items-end mb-10">
              <div>
                <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-2">
                  Véhicules <span className="text-mandarin">populaires</span>
                </h2>
                <p className="text-[var(--text-muted)]">
                  Les véhicules les plus recherchés par nos clients
                </p>
              </div>
              <Link href="/cars">
                <Button variant="outline" rightIcon={<ArrowRight className="w-4 h-4" />}>
                  Voir tout
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredVehicles.map((vehicle) => (
                <VehicleCard key={vehicle.id} vehicle={vehicle} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* How It Works */}
      <section className="py-20 bg-gradient-to-b from-[var(--background)] to-[var(--surface)]">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-4">
              Comment ça <span className="text-mandarin">fonctionne</span>
            </h2>
            <p className="text-[var(--text-muted)] max-w-xl mx-auto">
              Un processus simple et transparent pour importer votre véhicule
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <div key={step.number} className="relative">
                {/* Connector line */}
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-8 left-1/2 w-full h-0.5 bg-gradient-to-r from-mandarin to-transparent" />
                )}

                <div className="relative bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-6 hover:border-mandarin/50 transition-colors shadow-sm">
                  <span className="text-5xl font-bold text-mandarin/20">{step.number}</span>
                  <h3 className="text-xl font-bold text-[var(--text-primary)] mt-4 mb-2">{step.title}</h3>
                  <p className="text-[var(--text-muted)] text-sm">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-[var(--background)]">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-4">
              Pourquoi <span className="text-mandarin">Driveby Africa</span>
            </h2>
            <p className="text-[var(--text-muted)] max-w-xl mx-auto">
              Une plateforme conçue pour simplifier l&apos;importation de véhicules vers l&apos;Afrique
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map((feature) => (
              <Card key={feature.title} hover className="flex gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-mandarin/10 rounded-xl flex items-center justify-center">
                  <feature.icon className="w-6 h-6 text-mandarin" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">{feature.title}</h3>
                  <p className="text-[var(--text-muted)] text-sm">{feature.description}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="relative overflow-hidden bg-gradient-to-r from-mandarin to-orange-600 rounded-2xl p-8 lg:p-12">
            <div className="relative z-10 max-w-xl">
              <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
                Prêt à importer votre prochain véhicule?
              </h2>
              <p className="text-white/80 mb-8">
                Créez votre compte gratuitement et accédez à des milliers de véhicules
                aux meilleurs prix.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/register">
                  <Button
                    variant="secondary"
                    size="lg"
                    className="bg-white text-mandarin hover:bg-white/90"
                  >
                    Créer un compte gratuit
                  </Button>
                </Link>
                <Link href="/cars">
                  <Button
                    variant="outline"
                    size="lg"
                    className="border-white text-white hover:bg-white/10"
                  >
                    Explorer les véhicules
                  </Button>
                </Link>
              </div>
            </div>

            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 right-1/4 w-32 h-32 bg-white/10 rounded-full translate-y-1/2" />
          </div>
        </div>
      </section>
    </div>
  );
}
