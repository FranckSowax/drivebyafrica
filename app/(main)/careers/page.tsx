import { Metadata } from 'next';
import Link from 'next/link';
import {
  Briefcase, MapPin, Clock, ArrowRight, Users, Rocket,
  Heart, Globe, ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export const metadata: Metadata = {
  title: 'Carrières | Driveby Africa',
  description: 'Rejoignez l\'équipe Driveby Africa et participez à la révolution de l\'importation automobile en Afrique.',
};

const benefits = [
  {
    icon: Rocket,
    title: 'Croissance rapide',
    description: 'Évoluez dans une startup en pleine expansion avec des opportunités d\'avancement.',
  },
  {
    icon: Globe,
    title: 'Impact international',
    description: 'Travaillez sur des projets qui connectent l\'Afrique au monde.',
  },
  {
    icon: Heart,
    title: 'Culture bienveillante',
    description: 'Une équipe soudée qui valorise le bien-être et l\'équilibre vie pro/perso.',
  },
  {
    icon: Users,
    title: 'Équipe diversifiée',
    description: 'Collaborez avec des talents de différents pays et horizons.',
  },
];

const jobs = [
  {
    id: 1,
    title: 'Développeur Full Stack',
    department: 'Technologie',
    location: 'Libreville, Gabon',
    type: 'CDI',
    description: 'Rejoignez notre équipe tech pour développer et maintenir notre plateforme Next.js/Supabase.',
    requirements: [
      '3+ ans d\'expérience en développement web',
      'Maîtrise de React, TypeScript, Node.js',
      'Expérience avec PostgreSQL ou bases de données similaires',
      'Bonus: expérience avec Next.js et Supabase',
    ],
  },
  {
    id: 2,
    title: 'Responsable Logistique',
    department: 'Opérations',
    location: 'Douala, Cameroun',
    type: 'CDI',
    description: 'Gérez les opérations logistiques et le suivi des expéditions de véhicules.',
    requirements: [
      '5+ ans d\'expérience en logistique internationale',
      'Connaissance des procédures douanières africaines',
      'Expérience dans le transport maritime',
      'Anglais courant',
    ],
  },
  {
    id: 3,
    title: 'Chargé(e) de Clientèle',
    department: 'Service Client',
    location: 'Libreville, Gabon',
    type: 'CDI',
    description: 'Accompagnez nos clients dans leur parcours d\'achat et d\'importation de véhicules.',
    requirements: [
      '2+ ans d\'expérience en relation client',
      'Excellentes compétences en communication',
      'Maîtrise du français et de l\'anglais',
      'Patience et sens du service',
    ],
  },
  {
    id: 4,
    title: 'Business Developer',
    department: 'Commercial',
    location: 'Abidjan, Côte d\'Ivoire',
    type: 'CDI',
    description: 'Développez notre présence sur le marché ivoirien et ouest-africain.',
    requirements: [
      '3+ ans d\'expérience en développement commercial',
      'Réseau établi dans le secteur automobile',
      'Capacité à travailler de manière autonome',
      'Mobilité régionale',
    ],
  },
  {
    id: 5,
    title: 'Stage - Marketing Digital',
    department: 'Marketing',
    location: 'Remote',
    type: 'Stage (6 mois)',
    description: 'Participez à la création de contenu et aux campagnes marketing digitales.',
    requirements: [
      'Étudiant(e) en marketing/communication',
      'Maîtrise des réseaux sociaux',
      'Créativité et sens de l\'initiative',
      'Intérêt pour l\'automobile',
    ],
  },
];

export default function CareersPage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cod-gray via-cod-gray to-mandarin/20" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-mandarin/10 border border-mandarin/20 rounded-full px-4 py-2 mb-6">
              <Briefcase className="w-4 h-4 text-mandarin" />
              <span className="text-sm text-mandarin">Nous recrutons</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-6">
              Rejoignez l&apos;aventure <span className="text-mandarin">Driveby Africa</span>
            </h1>
            <p className="text-lg text-nobel mb-8">
              Participez à la révolution de l&apos;importation automobile en Afrique.
              Nous recherchons des talents passionnés pour construire l&apos;avenir de la mobilité.
            </p>
            <a href="#jobs">
              <Button variant="primary" size="lg" rightIcon={<ArrowRight className="w-5 h-5" />}>
                Voir les offres
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 bg-surface/50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: '25+', label: 'Collaborateurs' },
              { value: '5', label: 'Pays' },
              { value: '2019', label: 'Création' },
              { value: '100%', label: 'Croissance annuelle' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-3xl lg:text-4xl font-bold text-mandarin">{stat.value}</p>
                <p className="text-nobel mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white mb-4">
              Pourquoi nous <span className="text-mandarin">rejoindre</span>
            </h2>
            <p className="text-nobel max-w-xl mx-auto">
              Nous offrons un environnement de travail stimulant et des avantages attractifs
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((benefit) => (
              <Card key={benefit.title} className="p-6 text-center">
                <div className="w-12 h-12 bg-mandarin/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <benefit.icon className="w-6 h-6 text-mandarin" />
                </div>
                <h3 className="font-semibold text-white mb-2">{benefit.title}</h3>
                <p className="text-sm text-nobel">{benefit.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Jobs */}
      <section id="jobs" className="py-20 bg-surface/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white mb-4">
              Nos <span className="text-mandarin">offres d&apos;emploi</span>
            </h2>
            <p className="text-nobel max-w-xl mx-auto">
              Trouvez le poste qui correspond à vos compétences et ambitions
            </p>
          </div>

          <div className="max-w-4xl mx-auto space-y-4">
            {jobs.map((job) => (
              <Card key={job.id} hover className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-medium text-mandarin bg-mandarin/10 px-2 py-1 rounded">
                        {job.department}
                      </span>
                      <span className="text-xs text-nobel bg-surface px-2 py-1 rounded">
                        {job.type}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">{job.title}</h3>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-nobel">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {job.location}
                      </span>
                    </div>
                    <p className="text-sm text-nobel mt-3">{job.description}</p>
                  </div>
                  <div className="lg:text-right">
                    <a href={`mailto:careers@drivebyafrica.com?subject=Candidature: ${job.title}`}>
                      <Button variant="outline" size="sm" rightIcon={<ChevronRight className="w-4 h-4" />}>
                        Postuler
                      </Button>
                    </a>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-white mb-4">
                Notre <span className="text-mandarin">culture</span>
              </h2>
            </div>

            <div className="space-y-8">
              {[
                {
                  title: 'Innovation continue',
                  description: 'Nous encourageons l\'expérimentation et l\'amélioration constante de nos services.',
                },
                {
                  title: 'Transparence totale',
                  description: 'Communication ouverte, feedback régulier et partage des objectifs avec toute l\'équipe.',
                },
                {
                  title: 'Client au centre',
                  description: 'Chaque décision est prise en pensant à l\'impact sur nos clients.',
                },
                {
                  title: 'Responsabilité partagée',
                  description: 'Chacun est propriétaire de ses projets et contribue au succès collectif.',
                },
              ].map((value) => (
                <div key={value.title} className="flex gap-4">
                  <div className="w-2 h-2 bg-mandarin rounded-full mt-2 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-white mb-1">{value.title}</h3>
                    <p className="text-nobel">{value.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="relative overflow-hidden bg-gradient-to-r from-mandarin to-orange-600 rounded-2xl p-8 lg:p-12 text-center">
            <div className="relative z-10 max-w-2xl mx-auto">
              <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
                Candidature spontanée
              </h2>
              <p className="text-white/80 mb-8">
                Vous ne trouvez pas le poste idéal? Envoyez-nous votre candidature,
                nous sommes toujours à la recherche de nouveaux talents.
              </p>
              <a href="mailto:careers@drivebyafrica.com?subject=Candidature spontanée">
                <Button
                  variant="secondary"
                  size="lg"
                  className="bg-white text-mandarin hover:bg-white/90"
                  rightIcon={<ArrowRight className="w-5 h-5" />}
                >
                  Envoyer ma candidature
                </Button>
              </a>
            </div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
          </div>
        </div>
      </section>
    </div>
  );
}
