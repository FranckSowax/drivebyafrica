import { Metadata } from 'next';
import Link from 'next/link';
import {
  Search, MousePointer, CreditCard, Truck, Ship, CheckCircle,
  ArrowRight, MessageCircle, FileCheck, Package
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export const metadata: Metadata = {
  title: 'Comment ça marche | Driveby Africa',
  description: 'Découvrez le processus simple et transparent pour importer votre véhicule depuis la Corée du Sud, la Chine ou Dubaï vers l\'Afrique.',
};

const steps = [
  {
    number: '01',
    icon: Search,
    title: 'Recherchez votre véhicule',
    description: 'Parcourez notre catalogue de milliers de véhicules disponibles depuis la Corée du Sud, la Chine et Dubaï. Utilisez nos filtres avancés pour trouver exactement ce que vous cherchez.',
    details: [
      'Filtres par marque, modèle, année, kilométrage',
      'Photos HD et fiches d\'inspection détaillées',
      'Historique complet du véhicule',
      'Estimation du prix total livré',
    ],
  },
  {
    number: '02',
    icon: MousePointer,
    title: 'Enchérissez ou achetez',
    description: 'Participez aux enchères en direct ou optez pour l\'achat immédiat sur certains véhicules. Suivez vos enchères en temps réel et recevez des notifications.',
    details: [
      'Enchères en temps réel',
      'Option d\'achat immédiat disponible',
      'Notifications par WhatsApp',
      'Assistance de nos experts',
    ],
  },
  {
    number: '03',
    icon: CreditCard,
    title: 'Payez en toute sécurité',
    description: 'Une fois votre enchère remportée, effectuez le paiement via notre plateforme sécurisée. Nous acceptons les cartes bancaires et le Mobile Money.',
    details: [
      'Paiement sécurisé par Stripe',
      'Mobile Money (Airtel, MTN, Orange)',
      'Paiement en plusieurs fois possible',
      'Facture détaillée fournie',
    ],
  },
  {
    number: '04',
    icon: FileCheck,
    title: 'Vérification et préparation',
    description: 'Notre équipe sur place vérifie le véhicule, prépare tous les documents d\'exportation et organise le transport vers le port d\'embarquement.',
    details: [
      'Inspection finale du véhicule',
      'Préparation des documents douaniers',
      'Nettoyage et conditionnement',
      'Photos de départ envoyées',
    ],
  },
  {
    number: '05',
    icon: Ship,
    title: 'Expédition maritime',
    description: 'Votre véhicule est chargé dans un conteneur et expédié vers le port africain de votre choix. Suivez son trajet en temps réel.',
    details: [
      'Conteneur sécurisé et assuré',
      'Suivi GPS en temps réel',
      'Délai moyen: 4-6 semaines',
      'Assurance tous risques incluse',
    ],
  },
  {
    number: '06',
    icon: CheckCircle,
    title: 'Livraison finale',
    description: 'À l\'arrivée au port, nous vous assistons pour les formalités douanières. Récupérez votre véhicule prêt à rouler!',
    details: [
      'Assistance dédouanement',
      'Accompagnement administratif',
      'Livraison à domicile optionnelle',
      'Garantie satisfaction',
    ],
  },
];

const faqs = [
  {
    question: 'Combien de temps prend l\'importation?',
    answer: 'En moyenne, comptez 4 à 6 semaines entre l\'achat et la livraison au port africain.',
  },
  {
    question: 'Quels sont les frais totaux?',
    answer: 'Le prix total inclut: prix du véhicule + frais d\'enchère + transport + assurance + frais de port. Notre calculateur vous donne une estimation précise.',
  },
  {
    question: 'Le véhicule est-il garanti?',
    answer: 'Tous nos véhicules disposent d\'une fiche d\'inspection détaillée. Nous offrons une garantie satisfaction ou remboursement.',
  },
];

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cod-gray via-cod-gray to-mandarin/20" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl sm:text-5xl font-bold text-mandarin mb-6">
              Comment ça marche
            </h1>
            <p className="text-lg text-nobel mb-8">
              Un processus simple en 6 étapes pour importer votre véhicule depuis
              la Corée du Sud, la Chine ou Dubaï vers l&apos;Afrique.
            </p>
            <Link href="/cars">
              <Button variant="primary" size="lg" rightIcon={<ArrowRight className="w-5 h-5" />}>
                Commencer maintenant
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="space-y-16">
            {steps.map((step, index) => (
              <div
                key={step.number}
                className={`grid lg:grid-cols-2 gap-12 items-center ${
                  index % 2 === 1 ? 'lg:flex-row-reverse' : ''
                }`}
              >
                <div className={index % 2 === 1 ? 'lg:order-2' : ''}>
                  <div className="flex items-center gap-4 mb-4">
                    <span className="text-5xl font-bold text-mandarin/30">{step.number}</span>
                    <div className="w-12 h-12 bg-mandarin/10 rounded-xl flex items-center justify-center">
                      <step.icon className="w-6 h-6 text-mandarin" />
                    </div>
                  </div>
                  <h2 className="text-2xl font-bold text-mandarin mb-4">{step.title}</h2>
                  <p className="text-nobel mb-6">{step.description}</p>
                  <ul className="space-y-3">
                    {step.details.map((detail) => (
                      <li key={detail} className="flex items-center gap-3 text-sm text-nobel">
                        <CheckCircle className="w-5 h-5 text-jewel flex-shrink-0" />
                        {detail}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className={index % 2 === 1 ? 'lg:order-1' : ''}>
                  <div className="aspect-video bg-surface rounded-2xl overflow-hidden">
                    <div className="w-full h-full bg-gradient-to-br from-mandarin/10 to-royal-blue/10 flex items-center justify-center">
                      <step.icon className="w-20 h-20 text-mandarin/50" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-surface/30">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-mandarin text-center mb-12">
              Questions fréquentes
            </h2>
            <div className="space-y-4">
              {faqs.map((faq) => (
                <Card key={faq.question} className="p-6">
                  <h3 className="font-semibold text-white mb-2">{faq.question}</h3>
                  <p className="text-nobel text-sm">{faq.answer}</p>
                </Card>
              ))}
            </div>
            <div className="text-center mt-8">
              <Link href="/faq">
                <Button variant="outline" rightIcon={<ArrowRight className="w-4 h-4" />}>
                  Voir toutes les FAQ
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Support Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-8">
            <Card hover className="p-8">
              <MessageCircle className="w-12 h-12 text-mandarin mb-4" />
              <h3 className="text-xl font-bold text-mandarin mb-2">Besoin d&apos;aide?</h3>
              <p className="text-nobel mb-6">
                Notre équipe est disponible 24/7 par WhatsApp pour répondre à toutes vos questions.
              </p>
              <a href="https://wa.me/24177000000" target="_blank" rel="noopener noreferrer">
                <Button variant="primary">
                  Contacter sur WhatsApp
                </Button>
              </a>
            </Card>
            <Card hover className="p-8">
              <Package className="w-12 h-12 text-royal-blue mb-4" />
              <h3 className="text-xl font-bold text-mandarin mb-2">Calculez votre budget</h3>
              <p className="text-nobel mb-6">
                Utilisez notre calculateur pour estimer le coût total de votre importation.
              </p>
              <Link href="/calculator">
                <Button variant="outline">
                  Ouvrir le calculateur
                </Button>
              </Link>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="relative overflow-hidden bg-gradient-to-r from-mandarin to-orange-600 rounded-2xl p-8 lg:p-12 text-center">
            <div className="relative z-10 max-w-2xl mx-auto">
              <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
                Prêt à commencer?
              </h2>
              <p className="text-white/80 mb-8">
                Explorez notre catalogue et trouvez le véhicule parfait pour vous.
              </p>
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
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
          </div>
        </div>
      </section>
    </div>
  );
}
