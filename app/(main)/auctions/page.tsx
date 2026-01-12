import { Metadata } from 'next';
import Link from 'next/link';
import { Clock, Gavel, Users, TrendingUp, ArrowRight, Bell, Filter } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export const metadata: Metadata = {
  title: 'Enchères en direct | Driveby Africa',
  description: 'Participez aux enchères automobiles en direct depuis la Corée du Sud, la Chine et Dubaï. Des milliers de véhicules disponibles chaque semaine.',
};

const features = [
  {
    icon: Clock,
    title: 'Enchères en temps réel',
    description: 'Suivez et participez aux enchères en direct avec mises à jour instantanées.',
  },
  {
    icon: Bell,
    title: 'Notifications WhatsApp',
    description: 'Recevez des alertes instantanées quand vous êtes surenchéri ou quand vous gagnez.',
  },
  {
    icon: Users,
    title: 'Assistance d\'experts',
    description: 'Notre équipe vous accompagne pour maximiser vos chances de succès.',
  },
  {
    icon: TrendingUp,
    title: 'Prix compétitifs',
    description: 'Accédez aux mêmes prix que les professionnels du secteur automobile.',
  },
];

const auctionSources = [
  {
    country: 'Corée du Sud',
    flag: '🇰🇷',
    platform: 'Encar',
    vehicles: '50,000+',
    description: 'Véhicules coréens de qualité: Hyundai, Kia, Genesis, Samsung',
  },
  {
    country: 'Chine',
    flag: '🇨🇳',
    platform: 'Bientôt',
    vehicles: 'À venir',
    description: 'Véhicules chinois et internationaux à prix compétitifs',
  },
  {
    country: 'Dubaï',
    flag: '🇦🇪',
    platform: 'Bientôt',
    vehicles: 'À venir',
    description: 'Véhicules de luxe et américains en excellent état',
  },
];

export default function AuctionsPage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cod-gray via-cod-gray to-mandarin/20" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-mandarin/10 border border-mandarin/20 rounded-full px-4 py-2 mb-6">
              <Gavel className="w-4 h-4 text-mandarin" />
              <span className="text-sm text-mandarin">Enchères en direct</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-6">
              Participez aux <span className="text-mandarin">enchères automobiles</span>
            </h1>
            <p className="text-lg text-nobel mb-8">
              Accédez aux plus grandes enchères automobiles d&apos;Asie et du Moyen-Orient.
              Des milliers de véhicules disponibles chaque semaine à prix d&apos;importateur.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/cars">
                <Button variant="primary" size="lg" rightIcon={<ArrowRight className="w-5 h-5" />}>
                  Voir les véhicules
                </Button>
              </Link>
              <Link href="/register">
                <Button variant="outline" size="lg">
                  Créer un compte
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 bg-surface/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature) => (
              <Card key={feature.title} className="text-center p-6">
                <div className="w-12 h-12 bg-mandarin/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <feature.icon className="w-6 h-6 text-mandarin" />
                </div>
                <h3 className="font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-nobel">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Auction Sources */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white mb-4">
              Nos <span className="text-mandarin">sources d&apos;enchères</span>
            </h2>
            <p className="text-nobel max-w-xl mx-auto">
              Nous travaillons avec les meilleures plateformes d&apos;enchères automobiles
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {auctionSources.map((source) => (
              <Card key={source.country} hover className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-4xl">{source.flag}</span>
                  <div>
                    <h3 className="text-xl font-bold text-white">{source.country}</h3>
                    <p className="text-sm text-mandarin">{source.platform}</p>
                  </div>
                </div>
                <p className="text-nobel mb-4">{source.description}</p>
                <div className="flex items-center justify-between pt-4 border-t border-surface">
                  <span className="text-sm text-nobel">Véhicules disponibles</span>
                  <span className="font-bold text-white">{source.vehicles}</span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How Bidding Works */}
      <section className="py-20 bg-surface/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white mb-4">
              Comment <span className="text-mandarin">enchérir</span>
            </h2>
            <p className="text-nobel max-w-xl mx-auto">
              Un processus simple pour participer aux enchères
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {[
              { step: '1', title: 'Créez votre compte', description: 'Inscrivez-vous gratuitement en moins de 2 minutes' },
              { step: '2', title: 'Trouvez un véhicule', description: 'Parcourez notre catalogue et trouvez le véhicule parfait' },
              { step: '3', title: 'Placez votre enchère', description: 'Définissez votre prix maximum et enchérissez en temps réel' },
              { step: '4', title: 'Gagnez et payez', description: 'Si vous gagnez, procédez au paiement sécurisé' },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-12 h-12 bg-mandarin rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white font-bold">{item.step}</span>
                </div>
                <h3 className="font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-sm text-nobel">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: '50,000+', label: 'Véhicules disponibles' },
              { value: '15,000+', label: 'Véhicules vendus' },
              { value: '98%', label: 'Taux de satisfaction' },
              { value: '24/7', label: 'Support disponible' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-3xl lg:text-4xl font-bold text-mandarin">{stat.value}</p>
                <p className="text-nobel mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="relative overflow-hidden bg-gradient-to-r from-mandarin to-orange-600 rounded-2xl p-8 lg:p-12 text-center">
            <div className="relative z-10 max-w-2xl mx-auto">
              <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
                Prêt à enchérir?
              </h2>
              <p className="text-white/80 mb-8">
                Créez votre compte gratuitement et accédez à des milliers de véhicules aux enchères.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/cars">
                  <Button
                    variant="secondary"
                    size="lg"
                    className="bg-white text-mandarin hover:bg-white/90"
                    rightIcon={<ArrowRight className="w-5 h-5" />}
                  >
                    Explorer les véhicules
                  </Button>
                </Link>
              </div>
            </div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
          </div>
        </div>
      </section>
    </div>
  );
}
