'use client';

import { useState } from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { ChevronDown, Search, MessageCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';

const faqCategories = [
  { id: 'general', label: 'Général' },
  { id: 'achat', label: 'Achat & Enchères' },
  { id: 'paiement', label: 'Paiement' },
  { id: 'livraison', label: 'Livraison' },
  { id: 'garantie', label: 'Garantie' },
];

const faqs = [
  // Général
  {
    category: 'general',
    question: 'Qu\'est-ce que Driveby Africa?',
    answer: 'Driveby Africa est une plateforme qui permet aux acheteurs africains d\'accéder aux enchères automobiles de Corée du Sud, Chine et Dubaï. Nous simplifions l\'importation de véhicules en gérant l\'ensemble du processus: recherche, achat, paiement, expédition et dédouanement.',
  },
  {
    category: 'general',
    question: 'Dans quels pays livrez-vous?',
    answer: 'Nous livrons dans 12 pays africains, principalement: Gabon, Cameroun, Congo, Côte d\'Ivoire, Sénégal, RDC, Guinée, Mali, Burkina Faso, Bénin, Togo et Niger. Contactez-nous si votre pays n\'est pas listé.',
  },
  {
    category: 'general',
    question: 'Quels types de véhicules proposez-vous?',
    answer: 'Nous proposons tous types de véhicules: berlines, SUV, pick-ups, minivans, véhicules utilitaires et de luxe. Les marques les plus populaires incluent Hyundai, Kia, Toyota, Honda, Mercedes, BMW et bien d\'autres.',
  },
  // Achat & Enchères
  {
    category: 'achat',
    question: 'Comment fonctionne le système d\'enchères?',
    answer: 'Vous définissez votre prix maximum et notre système enchérit automatiquement pour vous. Vous pouvez aussi enchérir manuellement en temps réel. Vous recevez des notifications WhatsApp à chaque mise à jour importante.',
  },
  {
    category: 'achat',
    question: 'Puis-je acheter sans enchérir?',
    answer: 'Oui, certains véhicules proposent une option d\'achat immédiat à prix fixe. Recherchez le badge "Achat immédiat" sur les fiches véhicules.',
  },
  {
    category: 'achat',
    question: 'Comment vérifier l\'état d\'un véhicule?',
    answer: 'Chaque véhicule dispose d\'une fiche d\'inspection détaillée avec: kilométrage, historique d\'entretien, rapport d\'accident, photos haute résolution (extérieur, intérieur, moteur). Nos experts peuvent aussi vous fournir une analyse personnalisée.',
  },
  {
    category: 'achat',
    question: 'Que se passe-t-il si je gagne une enchère?',
    answer: 'Vous recevez une notification WhatsApp immédiate. Vous avez 48h pour effectuer le paiement. Une fois le paiement confirmé, nous préparons les documents d\'exportation et organisons l\'expédition.',
  },
  // Paiement
  {
    category: 'paiement',
    question: 'Quels modes de paiement acceptez-vous?',
    answer: 'Nous acceptons: les cartes bancaires (Visa, Mastercard) via Stripe, le Mobile Money (Airtel Money, MTN Mobile Money, Orange Money), et les virements bancaires pour les montants importants.',
  },
  {
    category: 'paiement',
    question: 'Le paiement en plusieurs fois est-il possible?',
    answer: 'Oui, nous proposons le paiement en 2 ou 3 fois sans frais pour les achats supérieurs à 5,000 USD. Contactez notre équipe pour mettre en place un plan de paiement.',
  },
  {
    category: 'paiement',
    question: 'Quels sont les frais inclus dans le prix?',
    answer: 'Le prix affiché est le prix FOB (Free On Board). Utilisez notre calculateur pour voir le coût total incluant: frais d\'enchère, transport maritime, assurance, et estimation des frais de douane.',
  },
  {
    category: 'paiement',
    question: 'En quelle devise sont les prix?',
    answer: 'Tous les prix sont affichés en USD. Pour les paiements Mobile Money, la conversion est effectuée au taux du jour.',
  },
  // Livraison
  {
    category: 'livraison',
    question: 'Combien de temps prend la livraison?',
    answer: 'Le délai moyen est de 4 à 6 semaines après le paiement. Cela inclut: préparation des documents (1 semaine), transport maritime (3-4 semaines), dédouanement (3-5 jours).',
  },
  {
    category: 'livraison',
    question: 'Puis-je suivre mon véhicule?',
    answer: 'Oui, vous pouvez suivre votre véhicule en temps réel via votre tableau de bord. Vous recevez aussi des notifications WhatsApp à chaque étape importante: départ du port, arrivée, dédouanement.',
  },
  {
    category: 'livraison',
    question: 'Que se passe-t-il à l\'arrivée au port?',
    answer: 'Notre équipe locale vous contacte pour organiser le dédouanement. Nous vous assistons dans toutes les démarches administratives. Une fois dédouané, le véhicule peut être livré à votre domicile (option payante) ou récupéré au port.',
  },
  {
    category: 'livraison',
    question: 'L\'assurance est-elle incluse?',
    answer: 'Oui, une assurance tous risques maritime est incluse dans nos tarifs. Elle couvre la valeur totale du véhicule pendant le transport.',
  },
  // Garantie
  {
    category: 'garantie',
    question: 'Les véhicules sont-ils garantis?',
    answer: 'Nous offrons une garantie de conformité: si le véhicule reçu ne correspond pas à la description (kilométrage, état), nous vous remboursons intégralement ou proposons une compensation.',
  },
  {
    category: 'garantie',
    question: 'Que faire en cas de problème?',
    answer: 'Contactez notre service client via WhatsApp 24/7. Nous traitons toutes les réclamations sous 48h et trouvons une solution adaptée: remboursement, réparation ou compensation.',
  },
  {
    category: 'garantie',
    question: 'Puis-je annuler ma commande?',
    answer: 'Vous pouvez annuler gratuitement dans les 24h suivant le paiement. Au-delà, des frais d\'annulation de 5% s\'appliquent. Une fois le véhicule embarqué, l\'annulation n\'est plus possible.',
  },
];

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-surface last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-4 flex items-center justify-between text-left"
      >
        <span className="font-medium text-white pr-4">{question}</span>
        <ChevronDown
          className={cn(
            'w-5 h-5 text-mandarin flex-shrink-0 transition-transform',
            isOpen && 'rotate-180'
          )}
        />
      </button>
      <div
        className={cn(
          'overflow-hidden transition-all duration-300',
          isOpen ? 'max-h-96 pb-4' : 'max-h-0'
        )}
      >
        <p className="text-nobel text-sm">{answer}</p>
      </div>
    </div>
  );
}

export default function FAQPage() {
  const [activeCategory, setActiveCategory] = useState('general');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredFaqs = faqs.filter((faq) => {
    const matchesCategory = faq.category === activeCategory;
    const matchesSearch = searchQuery === '' ||
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cod-gray via-cod-gray to-mandarin/20" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-6">
              Questions <span className="text-mandarin">fréquentes</span>
            </h1>
            <p className="text-lg text-nobel mb-8">
              Trouvez rapidement les réponses à vos questions sur l&apos;importation
              de véhicules avec Driveby Africa.
            </p>

            {/* Search */}
            <div className="relative max-w-md mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-nobel" />
              <input
                type="text"
                placeholder="Rechercher une question..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-surface border border-nobel/20 rounded-xl text-white placeholder:text-nobel focus:outline-none focus:border-mandarin"
              />
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Content */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            {/* Category Tabs */}
            <div className="flex flex-wrap gap-2 mb-8">
              {faqCategories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setActiveCategory(category.id)}
                  className={cn(
                    'px-4 py-2 rounded-full text-sm font-medium transition-colors',
                    activeCategory === category.id
                      ? 'bg-mandarin text-white'
                      : 'bg-surface text-nobel hover:text-white'
                  )}
                >
                  {category.label}
                </button>
              ))}
            </div>

            {/* FAQ List */}
            <Card className="p-6">
              {filteredFaqs.length > 0 ? (
                filteredFaqs.map((faq) => (
                  <FAQItem
                    key={faq.question}
                    question={faq.question}
                    answer={faq.answer}
                  />
                ))
              ) : (
                <p className="text-center text-nobel py-8">
                  Aucune question trouvée pour cette recherche.
                </p>
              )}
            </Card>
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="py-20 bg-surface/30">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <MessageCircle className="w-16 h-16 text-mandarin mx-auto mb-6" />
            <h2 className="text-3xl font-bold text-white mb-4">
              Vous n&apos;avez pas trouvé votre réponse?
            </h2>
            <p className="text-nobel mb-8">
              Notre équipe est disponible 24/7 pour répondre à toutes vos questions.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="https://wa.me/24177000000" target="_blank" rel="noopener noreferrer">
                <Button variant="primary" rightIcon={<ArrowRight className="w-5 h-5" />}>
                  Contacter sur WhatsApp
                </Button>
              </a>
              <Link href="/contact">
                <Button variant="outline">
                  Voir nos contacts
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
