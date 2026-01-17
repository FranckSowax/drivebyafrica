import { Metadata } from 'next';
import Link from 'next/link';
import { Shield, ArrowLeft } from 'lucide-react';
import { Card } from '@/components/ui/Card';

export const metadata: Metadata = {
  title: 'Politique de confidentialité | Driveby Africa',
  description: 'Politique de confidentialité et protection des données personnelles de Driveby Africa.',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cod-gray via-cod-gray to-mandarin/20" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto">
            <Link href="/" className="inline-flex items-center gap-2 text-nobel hover:text-white mb-6 transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Retour à l&apos;accueil
            </Link>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-royal-blue/10 rounded-xl flex items-center justify-center">
                <Shield className="w-6 h-6 text-royal-blue" />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-white">
                  Politique de confidentialité
                </h1>
                <p className="text-nobel">Dernière mise à jour: Janvier 2025</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <Card className="p-6 lg:p-8">
              <div className="prose prose-invert prose-nobel max-w-none">
                <h2 className="text-xl font-bold text-white mt-0">1. Introduction</h2>
                <p className="text-nobel">
                  Driveby Africa s&apos;engage à protéger la confidentialité de vos données personnelles.
                  Cette politique explique comment nous collectons, utilisons et protégeons vos informations
                  lorsque vous utilisez notre plateforme.
                </p>

                <h2 className="text-xl font-bold text-white">2. Données collectées</h2>
                <p className="text-nobel">Nous collectons les types de données suivants:</p>

                <h3 className="text-lg font-semibold text-white">2.1 Données d&apos;identification</h3>
                <ul className="text-nobel list-disc pl-6 space-y-2">
                  <li>Nom et prénom</li>
                  <li>Adresse email</li>
                  <li>Numéro de téléphone</li>
                  <li>Adresse postale</li>
                  <li>Pièce d&apos;identité (pour la vérification du compte)</li>
                </ul>

                <h3 className="text-lg font-semibold text-white">2.2 Données de transaction</h3>
                <ul className="text-nobel list-disc pl-6 space-y-2">
                  <li>Historique des enchères</li>
                  <li>Véhicules achetés</li>
                  <li>Informations de paiement (traitées de manière sécurisée par Stripe)</li>
                  <li>Adresses de livraison</li>
                </ul>

                <h3 className="text-lg font-semibold text-white">2.3 Données techniques</h3>
                <ul className="text-nobel list-disc pl-6 space-y-2">
                  <li>Adresse IP</li>
                  <li>Type de navigateur et appareil</li>
                  <li>Pages visitées et durée des sessions</li>
                  <li>Cookies et identifiants de session</li>
                </ul>

                <h2 className="text-xl font-bold text-white">3. Utilisation des données</h2>
                <p className="text-nobel">Vos données sont utilisées pour:</p>
                <ul className="text-nobel list-disc pl-6 space-y-2">
                  <li>Créer et gérer votre compte utilisateur</li>
                  <li>Traiter vos enchères et commandes</li>
                  <li>Vous envoyer des notifications sur vos enchères (email, WhatsApp)</li>
                  <li>Améliorer nos services et votre expérience utilisateur</li>
                  <li>Prévenir la fraude et assurer la sécurité</li>
                  <li>Respecter nos obligations légales</li>
                </ul>

                <h2 className="text-xl font-bold text-white">4. Partage des données</h2>
                <p className="text-nobel">
                  Nous ne vendons jamais vos données personnelles. Nous pouvons les partager avec:
                </p>
                <ul className="text-nobel list-disc pl-6 space-y-2">
                  <li><strong>Partenaires logistiques:</strong> pour organiser le transport de votre véhicule</li>
                  <li><strong>Processeurs de paiement:</strong> Stripe pour sécuriser les transactions</li>
                  <li><strong>Services de communication:</strong> Whapi.cloud pour les notifications WhatsApp</li>
                  <li><strong>Autorités:</strong> si requis par la loi ou pour protéger nos droits</li>
                </ul>

                <h2 className="text-xl font-bold text-white">5. Sécurité des données</h2>
                <p className="text-nobel">
                  Nous mettons en œuvre des mesures de sécurité appropriées:
                </p>
                <ul className="text-nobel list-disc pl-6 space-y-2">
                  <li>Chiffrement SSL/TLS pour toutes les communications</li>
                  <li>Stockage sécurisé des données sur Supabase avec chiffrement au repos</li>
                  <li>Authentification à deux facteurs disponible</li>
                  <li>Accès restreint aux données personnelles</li>
                  <li>Audits de sécurité réguliers</li>
                </ul>

                <h2 className="text-xl font-bold text-white">6. Conservation des données</h2>
                <p className="text-nobel">
                  Nous conservons vos données pendant la durée nécessaire à la fourniture de nos services:
                </p>
                <ul className="text-nobel list-disc pl-6 space-y-2">
                  <li>Données de compte: tant que votre compte est actif</li>
                  <li>Données de transaction: 10 ans (obligations comptables)</li>
                  <li>Données de navigation: 13 mois maximum</li>
                </ul>
                <p className="text-nobel">
                  Après suppression de votre compte, vos données personnelles sont anonymisées ou supprimées
                  dans un délai de 30 jours, sauf obligation légale de conservation.
                </p>

                <h2 className="text-xl font-bold text-white">7. Vos droits</h2>
                <p className="text-nobel">
                  Conformément à la réglementation applicable, vous disposez des droits suivants:
                </p>
                <ul className="text-nobel list-disc pl-6 space-y-2">
                  <li><strong>Droit d&apos;accès:</strong> obtenir une copie de vos données personnelles</li>
                  <li><strong>Droit de rectification:</strong> corriger vos données inexactes</li>
                  <li><strong>Droit à l&apos;effacement:</strong> demander la suppression de vos données</li>
                  <li><strong>Droit à la portabilité:</strong> recevoir vos données dans un format structuré</li>
                  <li><strong>Droit d&apos;opposition:</strong> vous opposer au traitement de vos données</li>
                  <li><strong>Droit de limitation:</strong> restreindre le traitement de vos données</li>
                </ul>
                <p className="text-nobel">
                  Pour exercer ces droits, contactez-nous à privacy@drivebyafrica.com
                </p>

                <h2 className="text-xl font-bold text-white">8. Cookies</h2>
                <p className="text-nobel">
                  Notre site utilise des cookies pour améliorer votre expérience:
                </p>
                <ul className="text-nobel list-disc pl-6 space-y-2">
                  <li><strong>Cookies essentiels:</strong> nécessaires au fonctionnement du site</li>
                  <li><strong>Cookies de performance:</strong> pour analyser l&apos;utilisation du site</li>
                  <li><strong>Cookies de préférence:</strong> pour mémoriser vos choix</li>
                </ul>
                <p className="text-nobel">
                  Vous pouvez gérer vos préférences de cookies dans les paramètres de votre navigateur.
                </p>

                <h2 className="text-xl font-bold text-white">9. Communications marketing</h2>
                <p className="text-nobel">
                  Avec votre consentement, nous pouvons vous envoyer des communications marketing par email
                  ou WhatsApp. Vous pouvez vous désabonner à tout moment:
                </p>
                <ul className="text-nobel list-disc pl-6 space-y-2">
                  <li>Via le lien de désinscription dans nos emails</li>
                  <li>En répondant &quot;STOP&quot; à nos messages WhatsApp</li>
                  <li>Dans les paramètres de votre compte</li>
                </ul>

                <h2 className="text-xl font-bold text-white">10. Transferts internationaux</h2>
                <p className="text-nobel">
                  Vos données peuvent être transférées vers des pays hors de votre pays de résidence
                  (notamment pour le traitement des commandes avec nos partenaires en Corée du Sud).
                  Nous nous assurons que ces transferts respectent les garanties appropriées.
                </p>

                <h2 className="text-xl font-bold text-white">11. Mineurs</h2>
                <p className="text-nobel">
                  Notre service n&apos;est pas destiné aux personnes de moins de 18 ans. Nous ne collectons
                  pas sciemment de données personnelles de mineurs.
                </p>

                <h2 className="text-xl font-bold text-white">12. Modifications</h2>
                <p className="text-nobel">
                  Nous pouvons mettre à jour cette politique à tout moment. Les modifications importantes
                  vous seront notifiées par email ou via notre plateforme.
                </p>

                <h2 className="text-xl font-bold text-white">13. Contact</h2>
                <p className="text-nobel">
                  Pour toute question concernant cette politique ou vos données personnelles:
                </p>
                <ul className="text-nobel list-none pl-0 space-y-1">
                  <li>Email: privacy@drivebyafrica.com</li>
                  <li>WhatsApp: +241 77 00 00 00</li>
                  <li>Adresse: Central Business District, Hong Kong</li>
                </ul>
              </div>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
