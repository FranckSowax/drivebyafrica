/**
 * Seed the RAG knowledge base with initial content
 * Run via: npx tsx lib/rag/seed-knowledge.ts
 * Requires OPENAI_API_KEY and Supabase env vars
 */

import { addDocument, type KnowledgeCategory } from './knowledge-base';

interface SeedDocument {
  title: string;
  category: KnowledgeCategory;
  content: string;
}

const SEED_DOCUMENTS: SeedDocument[] = [
  {
    title: "Processus d'achat - 13 étapes",
    category: 'process',
    content: `Processus d'achat de véhicule sur Driveby Africa en 13 étapes :

Étape 1 - Choix du véhicule : L'utilisateur parcourt le catalogue et sélectionne un véhicule. Il peut demander un devis gratuit.

Étape 2 - Acompte : Paiement d'un acompte de 1 000 USD (environ 600 000 FCFA) pour bloquer le véhicule. Ce montant est déduit du prix total.

Étape 3 - Inspection : Une inspection détaillée du véhicule est réalisée. Le rapport complet (photos, vidéo, état mécanique) est envoyé au client.

Étape 4 - Validation : Si le client est satisfait du rapport d'inspection, il procède au paiement du solde. Si non satisfait, remboursement intégral de l'acompte ou choix d'un autre véhicule.

Étape 5 - Achat du véhicule : Driveby Africa achète le véhicule auprès du vendeur.

Étape 6 - Préparation export : Le véhicule est préparé pour l'exportation (nettoyage, documents douaniers, certificat d'exportation).

Étape 7 - Douane export : Passage en douane au pays d'origine.

Étape 8 - Chargement : Le véhicule est chargé dans le conteneur ou sur le navire (RORO).

Étape 9 - Transit maritime : Le véhicule est en mer vers le port de destination en Afrique.

Étape 10 - Arrivée au port : Le véhicule arrive au port de destination.

Étape 11 - Dédouanement : Procédures douanières au pays de destination (Gabon, Cameroun, etc.).

Étape 12 - Prêt pour retrait : Le véhicule est prêt à être récupéré par le client.

Étape 13 - Livraison : Le client récupère son véhicule ou nous organisons la livraison à domicile.`,
  },
  {
    title: 'Délais de livraison par origine',
    category: 'shipping',
    content: `Délais de livraison estimés par pays d'origine :

Corée du Sud : 4 à 6 semaines
- Transit maritime vers l'Afrique de l'Ouest : environ 35-45 jours
- Plus les formalités douanières : 3-5 jours

Chine : 6 à 8 semaines
- Transit maritime plus long
- Formalités d'exportation chinoises supplémentaires

Dubaï (Émirats Arabes Unis) : 3 à 5 semaines
- Transit maritime plus court vers l'Afrique
- Procédures d'exportation rapides

Ces délais sont indicatifs et peuvent varier selon :
- La disponibilité des navires
- Les conditions météorologiques
- Les procédures douanières au pays de destination
- Le type d'expédition choisi (conteneur 20HQ, 40HQ, RORO, Flat Rack)

Types d'expédition disponibles :
- Conteneur 20HQ : Pour 1 véhicule (petit/moyen)
- Conteneur 40HQ : Pour 2-3 véhicules ou 1 véhicule + accessoires
- RORO (Roll-on/Roll-off) : Le véhicule roule directement sur le navire, moins cher mais plus exposé
- Flat Rack : Pour les véhicules surdimensionnés ou les engins`,
  },
  {
    title: 'Modes de paiement acceptés',
    category: 'pricing',
    content: `Modes de paiement acceptés sur Driveby Africa :

1. Carte bancaire (Visa, Mastercard)
- Paiement sécurisé via Stripe
- Accepté pour l'acompte et le solde

2. Mobile Money
- Airtel Money
- MTN Mobile Money
- Orange Money
- Disponible au Gabon, Cameroun, Sénégal, Côte d'Ivoire

3. Virement bancaire
- Pour les montants importants
- Coordonnées bancaires fournies après validation du devis

4. Cash en agence
- Dépôt en espèces dans nos bureaux
- Bureau à Hong Kong

Devise de référence : USD (Dollar américain)
Les prix sont affichés en FCFA pour les pays de la zone CFA avec un taux de conversion actualisé.

L'acompte de 1 000 USD est obligatoire pour bloquer un véhicule.
Le solde doit être payé avant l'expédition du véhicule.`,
  },
  {
    title: 'Garanties et conditions',
    category: 'policy',
    content: `Garanties et conditions de vente Driveby Africa :

Garantie satisfaction sur l'inspection :
- Si le rapport d'inspection ne satisfait pas le client, remboursement intégral de l'acompte
- Le client peut également choisir un autre véhicule de valeur équivalente

Suivi en temps réel :
- Chaque commande dispose d'un suivi détaillé accessible depuis le tableau de bord client
- Notifications WhatsApp automatiques à chaque changement de statut
- 13 étapes de suivi du devis à la livraison

Documents fournis :
- Certificat d'exportation
- Facture commerciale
- Connaissement maritime (Bill of Lading)
- Rapport d'inspection avec photos et vidéo

Responsabilité :
- Driveby Africa assure le véhicule pendant le transit maritime
- Le client est responsable des frais de douane au pays de destination
- Le prix devis inclut le prix du véhicule, les frais d'exportation et le transport maritime
- Les frais de douane et taxes locales sont à la charge du client

Annulation :
- L'acompte est remboursable uniquement si l'inspection révèle un problème non signalé
- Après paiement du solde et achat du véhicule, l'annulation n'est plus possible`,
  },
  {
    title: 'FAQ - Questions fréquentes',
    category: 'faq',
    content: `Questions fréquemment posées :

Q: Combien coûte l'importation d'un véhicule ?
R: Le prix dépend du véhicule choisi. L'acompte est de 1 000 USD. Le prix final inclut le véhicule, les frais d'exportation et le transport maritime. Les frais de douane au pays de destination sont en supplément.

Q: Comment puis-je suivre ma commande ?
R: Connectez-vous à votre compte sur driveby-africa.com et accédez au tableau de bord "Mes commandes". Vous recevrez aussi des notifications WhatsApp à chaque étape.

Q: L'acompte est-il remboursable ?
R: Oui, si le rapport d'inspection ne vous convient pas, vous êtes remboursé intégralement. Vous pouvez aussi choisir un autre véhicule.

Q: Quels pays desservez-vous ?
R: Principalement le Gabon, le Cameroun, le Sénégal et la Côte d'Ivoire. Nous pouvons aussi expédier vers d'autres pays africains sur demande.

Q: D'où viennent les véhicules ?
R: De Corée du Sud (Hyundai, Kia, Samsung, etc.), de Chine (marques chinoises et internationales), et de Dubaï (véhicules de luxe et utilitaires).

Q: Puis-je inspecter le véhicule moi-même ?
R: Nous réalisons l'inspection pour vous avec un rapport détaillé (photos, vidéo, état mécanique). Vous pouvez demander des vérifications supplémentaires spécifiques.

Q: Quels types de véhicules proposez-vous ?
R: Berlines, SUV, pick-up, utilitaires, véhicules de luxe. Aussi bien des véhicules neufs que d'occasion avec faible kilométrage.

Q: Comment contacter le support ?
R: WhatsApp : +86 130 2205 2798 | Email : contact@driveby-africa.com | Horaires : Lun-Ven 8h-18h, Sam 9h-14h`,
  },
  {
    title: 'Informations véhicules - Sources et origines',
    category: 'vehicle_info',
    content: `Sources de véhicules Driveby Africa :

Corée du Sud (Encar) :
- Spécialisé dans les marques coréennes : Hyundai, Kia, Genesis, SsangYong, Samsung
- Aussi des marques japonaises et européennes disponibles en Corée
- Véhicules avec historique d'entretien coréen vérifié
- Contrôle technique coréen récent

Chine :
- Marques chinoises populaires : BYD, Chery, Geely, Great Wall, Haval
- Véhicules électriques et hybrides en forte croissance
- Bon rapport qualité/prix pour les véhicules neufs
- Taxe d'exportation chinoise incluse dans nos prix

Dubaï (EAU) :
- Véhicules de luxe : Mercedes, BMW, Porsche, Land Rover
- Pick-up et 4x4 : Toyota, Nissan, Mitsubishi
- Véhicules souvent avec faible kilométrage (climat favorable)
- Spécifications GCC (Gulf Cooperation Council)

Critères de sélection de nos véhicules :
- Kilométrage vérifié
- Historique d'accidents vérifié
- État mécanique inspecté
- Photos haute résolution disponibles
- Prix compétitifs par rapport au marché local`,
  },
  {
    title: 'Tarification et estimation des coûts',
    category: 'pricing',
    content: `Structure des coûts pour l'importation d'un véhicule :

1. Prix du véhicule (FOB - Free On Board)
- C'est le prix du véhicule au port d'origine
- Affiché sur notre catalogue en USD

2. Frais d'exportation
- Inclus dans notre devis
- Comprend : documentation, préparation export, manutention portuaire

3. Fret maritime
- Varie selon le type d'expédition et la destination
- Conteneur 20HQ : pour 1 véhicule compact/berline
- Conteneur 40HQ : pour 2-3 véhicules ou 1 grand SUV
- RORO : option économique, le véhicule roule sur le navire
- Flat Rack : pour véhicules surdimensionnés

4. Assurance maritime
- Incluse dans le prix du fret
- Couverture tous risques pendant le transit

5. Frais NON inclus (à la charge du client) :
- Droits de douane au pays de destination
- TVA locale
- Frais de dédouanement (transitaire)
- Immatriculation locale
- Transport depuis le port vers le domicile (optionnel)

Taux de change : USD vers FCFA actualisé régulièrement.
L'acompte de 1 000 USD est déduit du montant total.`,
  },
];

/**
 * Seed the knowledge base with initial documents
 */
export async function seedKnowledgeBase(): Promise<void> {
  console.log('Seeding knowledge base...');

  for (const doc of SEED_DOCUMENTS) {
    try {
      console.log(`  Adding: ${doc.title}`);
      await addDocument(doc.title, doc.content, doc.category, {
        source: 'admin',
        metadata: { seed: true },
      });
      console.log(`  ✓ Added: ${doc.title}`);
    } catch (error) {
      console.error(`  ✗ Failed: ${doc.title}`, error);
    }
  }

  console.log('Knowledge base seeding complete!');
}

// Allow running as standalone script
if (require.main === module) {
  seedKnowledgeBase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seed failed:', err);
      process.exit(1);
    });
}
