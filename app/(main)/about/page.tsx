import { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Users, Globe, Shield, Award, Target, Heart } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export const metadata: Metadata = {
  title: 'À propos | Driveby Africa',
  description: 'Découvrez Driveby Africa, votre partenaire de confiance pour l\'importation de véhicules depuis la Corée du Sud, la Chine et Dubaï vers l\'Afrique.',
};

const values = [
  {
    icon: Shield,
    title: 'Transparence',
    description: 'Nous fournissons toutes les informations sur les véhicules : historique, inspection, et estimation complète des coûts.',
  },
  {
    icon: Heart,
    title: 'Confiance',
    description: 'Plus de 2 500 clients satisfaits nous font confiance pour leurs importations de véhicules.',
  },
  {
    icon: Target,
    title: 'Excellence',
    description: 'Nous sélectionnons uniquement les meilleurs véhicules et partenaires pour garantir votre satisfaction.',
  },
  {
    icon: Award,
    title: 'Expertise',
    description: 'Notre équipe cumule plus de 15 ans d\'expérience dans l\'importation automobile vers l\'Afrique.',
  },
];

const team = [
  {
    name: 'Jean-Pierre Moussavou',
    role: 'Fondateur & CEO',
    image: '/images/team/ceo.jpg',
  },
  {
    name: 'Marie-Claire Nzeng',
    role: 'Directrice des Opérations',
    image: '/images/team/coo.jpg',
  },
  {
    name: 'David Ondo',
    role: 'Responsable Logistique',
    image: '/images/team/logistics.jpg',
  },
  {
    name: 'Sarah Bongo',
    role: 'Service Client',
    image: '/images/team/support.jpg',
  },
];

const stats = [
  { value: '2019', label: 'Année de création' },
  { value: '15,000+', label: 'Véhicules importés' },
  { value: '12', label: 'Pays desservis' },
  { value: '24/7', label: 'Support disponible' },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cod-gray via-cod-gray to-mandarin/20" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl">
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-6">
              Votre partenaire pour{' '}
              <span className="text-mandarin">l&apos;importation automobile</span>
            </h1>
            <p className="text-lg text-nobel mb-8">
              Driveby Africa connecte les acheteurs africains aux meilleures enchères automobiles
              du monde. Notre mission : rendre l&apos;importation de véhicules simple, transparente et accessible.
            </p>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 bg-surface/50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-3xl lg:text-4xl font-bold text-mandarin">{stat.value}</p>
                <p className="text-nobel mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-white mb-6">
                Notre <span className="text-mandarin">histoire</span>
              </h2>
              <div className="space-y-4 text-nobel">
                <p>
                  Fondée en 2019 à Hong Kong, Driveby Africa est née d&apos;un constat simple :
                  l&apos;importation de véhicules vers l&apos;Afrique était trop complexe, opaque et coûteuse.
                </p>
                <p>
                  Notre fondateur, après avoir lui-même vécu les difficultés d&apos;importer un véhicule
                  depuis la Corée du Sud, a décidé de créer une plateforme qui simplifierait ce processus
                  pour tous les Africains.
                </p>
                <p>
                  Aujourd&apos;hui, nous avons aidé plus de 2 500 clients à importer leur véhicule depuis
                  la Corée du Sud, la Chine et Dubaï. Notre équipe de 25 personnes travaille chaque jour
                  pour offrir le meilleur service possible.
                </p>
              </div>
            </div>
            <div className="relative">
              <div className="aspect-video bg-surface rounded-2xl overflow-hidden">
                <div className="w-full h-full bg-gradient-to-br from-mandarin/20 to-royal-blue/20 flex items-center justify-center">
                  <div className="text-center">
                    <Globe className="w-16 h-16 text-mandarin mx-auto mb-4" />
                    <p className="text-white font-semibold">Présent dans 12 pays africains</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 bg-surface/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white mb-4">
              Nos <span className="text-mandarin">valeurs</span>
            </h2>
            <p className="text-nobel max-w-xl mx-auto">
              Les principes qui guident chacune de nos actions
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {values.map((value) => (
              <Card key={value.title} hover className="flex gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-mandarin/10 rounded-xl flex items-center justify-center">
                  <value.icon className="w-6 h-6 text-mandarin" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">{value.title}</h3>
                  <p className="text-nobel text-sm">{value.description}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white mb-4">
              Notre <span className="text-mandarin">équipe</span>
            </h2>
            <p className="text-nobel max-w-xl mx-auto">
              Des experts passionnés à votre service
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {team.map((member) => (
              <div key={member.name} className="text-center">
                <div className="w-24 h-24 mx-auto mb-4 bg-surface rounded-full flex items-center justify-center">
                  <Users className="w-10 h-10 text-nobel" />
                </div>
                <h3 className="font-semibold text-white">{member.name}</h3>
                <p className="text-sm text-nobel">{member.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="relative overflow-hidden bg-gradient-to-r from-mandarin to-orange-600 rounded-2xl p-8 lg:p-12">
            <div className="relative z-10 max-w-xl">
              <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
                Prêt à nous faire confiance?
              </h2>
              <p className="text-white/80 mb-8">
                Rejoignez les milliers de clients satisfaits qui ont choisi Driveby Africa.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/register">
                  <Button
                    variant="secondary"
                    size="lg"
                    className="bg-white text-mandarin hover:bg-white/90"
                  >
                    Commencer maintenant
                  </Button>
                </Link>
                <Link href="/contact">
                  <Button
                    variant="outline"
                    size="lg"
                    className="border-white text-white hover:bg-white/10"
                  >
                    Nous contacter
                  </Button>
                </Link>
              </div>
            </div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          </div>
        </div>
      </section>
    </div>
  );
}
