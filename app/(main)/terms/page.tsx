import { Metadata } from 'next';
import Link from 'next/link';
import { FileText, ArrowLeft } from 'lucide-react';
import { Card } from '@/components/ui/Card';

export const metadata: Metadata = {
  title: 'Conditions d\'utilisation | Driveby Africa',
  description: 'Conditions générales d\'utilisation de la plateforme Driveby Africa pour l\'importation de véhicules.',
};

export default function TermsPage() {
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
              <div className="w-12 h-12 bg-mandarin/10 rounded-xl flex items-center justify-center">
                <FileText className="w-6 h-6 text-mandarin" />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-white">
                  Conditions d&apos;utilisation
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
                <h2 className="text-xl font-bold text-white mt-0">1. Acceptation des conditions</h2>
                <p className="text-nobel">
                  En accédant et en utilisant la plateforme Driveby Africa, vous acceptez d&apos;être lié par ces
                  conditions d&apos;utilisation. Si vous n&apos;acceptez pas ces conditions, veuillez ne pas utiliser notre service.
                </p>

                <h2 className="text-xl font-bold text-white">2. Description du service</h2>
                <p className="text-nobel">
                  Driveby Africa est une plateforme d&apos;intermédiation qui permet aux utilisateurs d&apos;accéder aux
                  enchères automobiles de Corée du Sud, Chine et Dubaï. Nous facilitons:
                </p>
                <ul className="text-nobel list-disc pl-6 space-y-2">
                  <li>La recherche et la consultation de véhicules disponibles aux enchères</li>
                  <li>La participation aux enchères via notre système de proxy bidding</li>
                  <li>Le paiement sécurisé des véhicules remportés</li>
                  <li>L&apos;organisation du transport et de l&apos;expédition des véhicules</li>
                  <li>L&apos;assistance au dédouanement dans les pays de destination</li>
                </ul>

                <h2 className="text-xl font-bold text-white">3. Inscription et compte utilisateur</h2>
                <p className="text-nobel">
                  Pour utiliser nos services, vous devez créer un compte en fournissant des informations exactes et
                  complètes. Vous êtes responsable de:
                </p>
                <ul className="text-nobel list-disc pl-6 space-y-2">
                  <li>La confidentialité de vos identifiants de connexion</li>
                  <li>Toutes les activités effectuées depuis votre compte</li>
                  <li>La mise à jour de vos informations personnelles</li>
                </ul>

                <h2 className="text-xl font-bold text-white">4. Processus d&apos;enchères</h2>
                <p className="text-nobel">
                  Lorsque vous placez une enchère sur notre plateforme:
                </p>
                <ul className="text-nobel list-disc pl-6 space-y-2">
                  <li>Vous vous engagez à acheter le véhicule si votre enchère est gagnante</li>
                  <li>Les enchères sont définitives et ne peuvent être annulées</li>
                  <li>Le prix affiché est le prix FOB (Free On Board) auquel s&apos;ajoutent les frais de service</li>
                  <li>Les frais d&apos;enchère (5%) sont non remboursables</li>
                </ul>

                <h2 className="text-xl font-bold text-white">5. Paiement</h2>
                <p className="text-nobel">
                  Le paiement du véhicule doit être effectué dans les 48 heures suivant la confirmation de l&apos;enchère
                  gagnante. Nous acceptons:
                </p>
                <ul className="text-nobel list-disc pl-6 space-y-2">
                  <li>Les cartes bancaires (Visa, Mastercard) via Stripe</li>
                  <li>Le Mobile Money (Airtel Money, MTN Mobile Money, Orange Money)</li>
                  <li>Les virements bancaires pour les montants supérieurs à 10,000 USD</li>
                </ul>
                <p className="text-nobel">
                  En cas de non-paiement dans les délais, nous nous réservons le droit d&apos;annuler la transaction et
                  de suspendre votre compte.
                </p>

                <h2 className="text-xl font-bold text-white">6. Livraison et transport</h2>
                <p className="text-nobel">
                  Les délais de livraison indiqués sont estimatifs et peuvent varier en fonction:
                </p>
                <ul className="text-nobel list-disc pl-6 space-y-2">
                  <li>De la disponibilité des navires</li>
                  <li>Des conditions météorologiques</li>
                  <li>Des procédures douanières</li>
                  <li>Des jours fériés et événements exceptionnels</li>
                </ul>
                <p className="text-nobel">
                  Driveby Africa ne peut être tenu responsable des retards indépendants de sa volonté.
                </p>

                <h2 className="text-xl font-bold text-white">7. Garantie et responsabilité</h2>
                <p className="text-nobel">
                  Nous garantissons la conformité du véhicule livré avec sa description sur notre plateforme.
                  Toutefois:
                </p>
                <ul className="text-nobel list-disc pl-6 space-y-2">
                  <li>Les véhicules sont vendus en l&apos;état, sans garantie mécanique</li>
                  <li>Les photos et rapports d&apos;inspection sont fournis à titre informatif</li>
                  <li>L&apos;acheteur est responsable de vérifier la conformité aux normes locales</li>
                </ul>

                <h2 className="text-xl font-bold text-white">8. Annulation et remboursement</h2>
                <p className="text-nobel">
                  L&apos;annulation est possible dans les conditions suivantes:
                </p>
                <ul className="text-nobel list-disc pl-6 space-y-2">
                  <li>Dans les 24h suivant le paiement: remboursement intégral</li>
                  <li>Après 24h et avant embarquement: remboursement moins 5% de frais</li>
                  <li>Après embarquement: aucun remboursement possible</li>
                </ul>
                <p className="text-nobel">
                  En cas de non-conformité majeure du véhicule, contactez notre service client pour étudier
                  les options de compensation.
                </p>

                <h2 className="text-xl font-bold text-white">9. Propriété intellectuelle</h2>
                <p className="text-nobel">
                  Tous les contenus de la plateforme (textes, images, logos, logiciels) sont la propriété de
                  Driveby Africa ou de ses partenaires. Toute reproduction sans autorisation est interdite.
                </p>

                <h2 className="text-xl font-bold text-white">10. Modification des conditions</h2>
                <p className="text-nobel">
                  Nous nous réservons le droit de modifier ces conditions à tout moment. Les modifications
                  entrent en vigueur dès leur publication sur la plateforme. Nous vous encourageons à consulter
                  régulièrement cette page.
                </p>

                <h2 className="text-xl font-bold text-white">11. Droit applicable</h2>
                <p className="text-nobel">
                  Ces conditions sont régies par le droit de Hong Kong. Tout litige sera soumis à la compétence
                  exclusive des tribunaux de Hong Kong.
                </p>

                <h2 className="text-xl font-bold text-white">12. Contact</h2>
                <p className="text-nobel">
                  Pour toute question concernant ces conditions, contactez-nous:
                </p>
                <ul className="text-nobel list-none pl-0 space-y-1">
                  <li>Email: legal@drivebyafrica.com</li>
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
