import { Metadata } from 'next';
import Link from 'next/link';
import {
  BookOpen, FileText, Calculator, Ship, Shield, CreditCard,
  ArrowRight, Clock, ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export const metadata: Metadata = {
  title: 'Guides | Driveby Africa',
  description: 'Guides complets pour l\'importation de véhicules depuis la Corée du Sud, la Chine et Dubaï vers l\'Afrique.',
};

const guides = [
  {
    id: 'guide-importation',
    icon: Ship,
    title: 'Guide complet de l\'importation',
    description: 'Tout ce que vous devez savoir pour importer votre premier véhicule avec Driveby Africa.',
    readTime: '15 min',
    category: 'Débutant',
    topics: [
      'Les étapes de l\'importation',
      'Documents requis',
      'Délais et planification',
      'Erreurs à éviter',
    ],
  },
  {
    id: 'guide-encheres',
    icon: FileText,
    title: 'Maîtriser les enchères',
    description: 'Stratégies et conseils pour remporter vos enchères au meilleur prix.',
    readTime: '10 min',
    category: 'Enchères',
    topics: [
      'Comment fonctionnent les enchères',
      'Définir son budget maximum',
      'Lire les rapports d\'inspection',
      'Stratégies de dernière minute',
    ],
  },
  {
    id: 'guide-inspection',
    icon: Shield,
    title: 'Comprendre les rapports d\'inspection',
    description: 'Apprenez à déchiffrer les rapports d\'inspection coréens et évaluer l\'état réel d\'un véhicule.',
    readTime: '12 min',
    category: 'Véhicules',
    topics: [
      'Les différents types de rapports',
      'Notes et classifications',
      'Points à vérifier absolument',
      'Signes d\'alerte',
    ],
  },
  {
    id: 'guide-douanes',
    icon: Calculator,
    title: 'Douanes et taxes d\'importation',
    description: 'Guide pays par pays des procédures douanières et taxes applicables.',
    readTime: '20 min',
    category: 'Administratif',
    topics: [
      'Calcul des droits de douane',
      'Documents pour le dédouanement',
      'Procédures par pays',
      'Exonérations possibles',
    ],
  },
  {
    id: 'guide-paiement',
    icon: CreditCard,
    title: 'Options de paiement',
    description: 'Toutes les méthodes de paiement disponibles et leurs avantages.',
    readTime: '8 min',
    category: 'Paiement',
    topics: [
      'Carte bancaire via Stripe',
      'Mobile Money',
      'Virement bancaire',
      'Paiement échelonné',
    ],
  },
  {
    id: 'guide-livraison',
    icon: Ship,
    title: 'Suivi de livraison',
    description: 'Comment suivre votre véhicule de l\'achat à la livraison.',
    readTime: '7 min',
    category: 'Logistique',
    topics: [
      'Les étapes de livraison',
      'Tracking en temps réel',
      'Que faire à l\'arrivée',
      'Récupération au port',
    ],
  },
];

const quickTips = [
  'Vérifiez toujours le rapport d\'inspection avant d\'enchérir',
  'Définissez votre budget maximum incluant tous les frais',
  'Les véhicules de moins de 5 ans ont souvent moins de droits de douane',
  'Privilégiez les véhicules avec historique d\'entretien complet',
  'Contactez notre équipe pour une estimation personnalisée',
];

export default function GuidesPage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cod-gray via-cod-gray to-mandarin/20" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-mandarin/10 border border-mandarin/20 rounded-full px-4 py-2 mb-6">
              <BookOpen className="w-4 h-4 text-mandarin" />
              <span className="text-sm text-mandarin">Centre de ressources</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-6">
              Guides et <span className="text-mandarin">tutoriels</span>
            </h1>
            <p className="text-lg text-nobel">
              Des ressources complètes pour vous accompagner dans votre projet
              d&apos;importation de véhicule.
            </p>
          </div>
        </div>
      </section>

      {/* Guides Grid */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {guides.map((guide) => (
              <Card key={guide.id} hover className="p-6 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-mandarin/10 rounded-xl flex items-center justify-center">
                    <guide.icon className="w-6 h-6 text-mandarin" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-nobel bg-surface px-2 py-1 rounded">
                      {guide.category}
                    </span>
                  </div>
                </div>

                <h3 className="text-lg font-bold text-white mb-2">{guide.title}</h3>
                <p className="text-sm text-nobel mb-4 flex-1">{guide.description}</p>

                <div className="flex items-center gap-2 text-xs text-nobel mb-4">
                  <Clock className="w-4 h-4" />
                  <span>{guide.readTime} de lecture</span>
                </div>

                <ul className="space-y-2 mb-6">
                  {guide.topics.map((topic) => (
                    <li key={topic} className="flex items-center gap-2 text-sm text-nobel">
                      <ChevronRight className="w-4 h-4 text-mandarin flex-shrink-0" />
                      {topic}
                    </li>
                  ))}
                </ul>

                <Button variant="outline" size="sm" className="mt-auto" rightIcon={<ArrowRight className="w-4 h-4" />}>
                  Lire le guide
                </Button>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Quick Tips */}
      <section className="py-20 bg-surface/30">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-white mb-4">
                Conseils <span className="text-mandarin">rapides</span>
              </h2>
              <p className="text-nobel">
                Quelques astuces essentielles pour réussir votre importation
              </p>
            </div>

            <Card className="p-6">
              <ul className="space-y-4">
                {quickTips.map((tip, index) => (
                  <li key={index} className="flex items-start gap-4">
                    <span className="w-6 h-6 bg-mandarin/10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold text-mandarin">
                      {index + 1}
                    </span>
                    <p className="text-nobel">{tip}</p>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>
      </section>

      {/* Video Tutorials Placeholder */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">
              Tutoriels <span className="text-mandarin">vidéo</span>
            </h2>
            <p className="text-nobel max-w-xl mx-auto">
              Des vidéos explicatives pour vous guider pas à pas
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                title: 'Comment créer un compte',
                duration: '3:45',
                thumbnail: 'Création de compte et vérification',
              },
              {
                title: 'Placer sa première enchère',
                duration: '5:20',
                thumbnail: 'Recherche et enchère sur un véhicule',
              },
              {
                title: 'Suivre sa commande',
                duration: '4:10',
                thumbnail: 'Tableau de bord et notifications',
              },
            ].map((video) => (
              <Card key={video.title} hover className="overflow-hidden">
                <div className="aspect-video bg-surface flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-mandarin/20 rounded-full flex items-center justify-center mx-auto mb-2">
                      <div className="w-0 h-0 border-t-8 border-t-transparent border-l-12 border-l-mandarin border-b-8 border-b-transparent ml-1" />
                    </div>
                    <p className="text-sm text-nobel">{video.thumbnail}</p>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-white mb-1">{video.title}</h3>
                  <p className="text-sm text-nobel">{video.duration}</p>
                </div>
              </Card>
            ))}
          </div>

          <div className="text-center mt-8">
            <p className="text-nobel mb-4">Plus de vidéos bientôt disponibles</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="relative overflow-hidden bg-gradient-to-r from-mandarin to-orange-600 rounded-2xl p-8 lg:p-12 text-center">
            <div className="relative z-10 max-w-2xl mx-auto">
              <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
                Besoin d&apos;aide personnalisée?
              </h2>
              <p className="text-white/80 mb-8">
                Notre équipe d&apos;experts est disponible pour répondre à toutes vos questions
                et vous accompagner dans votre projet.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a href="https://wa.me/24177000000" target="_blank" rel="noopener noreferrer">
                  <Button
                    variant="secondary"
                    size="lg"
                    className="bg-white text-mandarin hover:bg-white/90"
                    rightIcon={<ArrowRight className="w-5 h-5" />}
                  >
                    Contacter un expert
                  </Button>
                </a>
                <Link href="/faq">
                  <Button
                    variant="outline"
                    size="lg"
                    className="border-white text-white hover:bg-white/10"
                  >
                    Voir la FAQ
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
