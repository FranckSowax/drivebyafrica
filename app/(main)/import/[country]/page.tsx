import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { supabaseAdmin } from '@/lib/supabase/admin';
import CountryLandingContent from '@/components/seo/CountryLandingContent';
import { FAQPageJsonLd, ItemListJsonLd } from '@/components/seo/JsonLd';
import type { Vehicle } from '@/types/vehicle';
import type { VehicleBatch } from '@/types/vehicle-batch';
import { parseImagesField } from '@/lib/utils/imageProxy';

export const revalidate = 3600; // ISR: 1 hour

interface CountryConfig {
  source: string;
  name: string;
  flag: string;
  title: string;
  description: string;
  intro: string[];
  faqs: { question: string; answer: string }[];
}

const COUNTRIES: Record<string, CountryConfig> = {
  chine: {
    source: 'china',
    name: 'la Chine',
    flag: '\u{1F1E8}\u{1F1F3}',
    title: 'Achat véhicule occasion Chine — Import voiture Chine vers Afrique',
    description:
      "Achetez votre véhicule d'occasion directement depuis la Chine. Voitures chinoises et internationales vérifiées, livraison port à port vers l'Afrique. BYD, Changan, Geely, Haval, Jetour et plus.",
    intro: [
      "Accédez à des milliers de véhicules d'occasion depuis la Chine, le plus grand marché automobile mondial. Des marques chinoises innovantes comme BYD, Changan, Geely, Haval ou Jetour aux marques internationales, trouvez le véhicule idéal à importer vers l'Afrique.",
      "La Chine est devenue le premier exportateur mondial d'automobiles. Grâce à Driveby Africa, vous accédez directement aux plateformes d'enchères et de vente chinoises, avec des véhicules inspectés et vérifiés avant expédition.",
      "Notre équipe basée en Chine sélectionne les meilleurs véhicules, gère l'ensemble des formalités d'exportation et organise le transport maritime jusqu'à votre port de destination en Afrique. Paiement sécurisé et suivi en temps réel de votre commande.",
    ],
    faqs: [
      {
        question: "Comment importer une voiture de Chine vers l'Afrique ?",
        answer:
          "Avec Driveby Africa, l'importation est simple : choisissez votre véhicule sur notre plateforme, réservez avec un acompte, et nous gérons l'inspection, les formalités d'exportation et le transport maritime jusqu'à votre port en Afrique. Délai moyen : 4 à 6 semaines.",
      },
      {
        question: "Quels sont les prix des voitures d'occasion en Chine ?",
        answer:
          "Les prix varient selon la marque, le modèle et l'état du véhicule. Les véhicules chinois (BYD, Changan, Geely) offrent un excellent rapport qualité-prix, souvent 20 à 40% moins chers que les équivalents japonais ou coréens. Les prix affichés incluent le prix FOB (Free On Board).",
      },
      {
        question: 'Quelles marques chinoises sont disponibles ?',
        answer:
          "Nous proposons toutes les grandes marques chinoises : BYD, Changan, Geely, Haval, Great Wall, Jetour, Chery, MG, Zeekr, NIO, et bien d'autres. Nous avons aussi des marques internationales vendues sur le marché chinois (Toyota, Honda, Volkswagen, BMW).",
      },
      {
        question: "Combien coûte le transport maritime depuis la Chine ?",
        answer:
          "Le coût du transport maritime dépend du port de destination en Afrique. Utilisez notre calculateur de frais pour obtenir une estimation précise incluant le transport, l'assurance et les frais portuaires. Les tarifs sont généralement compétitifs grâce à la fréquence des liaisons maritimes Chine-Afrique.",
      },
      {
        question: 'Les véhicules chinois sont-ils fiables ?',
        answer:
          "Les constructeurs chinois ont considérablement progressé en qualité ces dernières années. BYD est devenu le premier constructeur mondial de véhicules électriques. Chaque véhicule proposé sur Driveby Africa est inspecté avant expédition, avec un rapport détaillé disponible.",
      },
      {
        question: "Quels documents sont nécessaires pour importer un véhicule de Chine ?",
        answer:
          "Driveby Africa gère l'ensemble des documents d'exportation : certificat d'origine, facture commerciale, connaissement maritime (Bill of Lading), et certificat d'inspection. Vous recevrez tous les documents nécessaires pour le dédouanement dans votre pays.",
      },
    ],
  },
  coree: {
    source: 'korea',
    name: 'la Corée du Sud',
    flag: '\u{1F1F0}\u{1F1F7}',
    title: 'Voiture occasion Corée du Sud — Import véhicule Corée vers Afrique',
    description:
      "Importez votre voiture d'occasion depuis la Corée du Sud. Hyundai, Kia, SsangYong, Samsung vérifiés avec historique complet. Livraison port à port vers l'Afrique.",
    intro: [
      "Importez votre véhicule d'occasion directement depuis la Corée du Sud, l'un des marchés les plus fiables pour les voitures d'occasion. Hyundai, Kia, SsangYong, Genesis et plus — des véhicules bien entretenus avec historique complet.",
      "La Corée du Sud est réputée pour la qualité de ses véhicules d'occasion. Le système d'inspection rigoureux coréen garantit des véhicules en excellent état, avec un historique d'entretien détaillé et transparent. C'est la source idéale pour les acheteurs exigeants.",
      "Driveby Africa vous connecte aux principales plateformes d'enchères coréennes (Encar, SK Encar). Notre équipe sélectionne les véhicules selon vos critères, vérifie leur état et organise l'expédition complète vers votre destination en Afrique.",
    ],
    faqs: [
      {
        question: "Comment importer une voiture de Corée du Sud vers l'Afrique ?",
        answer:
          "Choisissez votre véhicule sur Driveby Africa, réservez-le avec un acompte. Notre équipe en Corée gère l'achat aux enchères, l'inspection finale, le dédouanement export et le transport maritime. Délai moyen : 3 à 5 semaines selon la destination.",
      },
      {
        question: "Pourquoi acheter une voiture d'occasion en Corée du Sud ?",
        answer:
          "La Corée du Sud offre des véhicules bien entretenus à des prix compétitifs. Les Coréens changent de voiture fréquemment (tous les 3-4 ans), ce qui crée un marché d'occasion riche en véhicules récents et peu kilométrés. Le contrôle technique coréen est parmi les plus stricts au monde.",
      },
      {
        question: 'Quelles marques coréennes sont disponibles ?',
        answer:
          "Nous proposons Hyundai (Tucson, Santa Fe, Palisade), Kia (Sportage, Sorento, Carnival), SsangYong (Rexton, Torres), Genesis (luxe), et Renault Samsung. Vous trouverez aussi des marques importées vendues en Corée (BMW, Mercedes, Toyota).",
      },
      {
        question: 'Combien coûte le transport maritime depuis la Corée ?',
        answer:
          "Le transport maritime depuis la Corée est très compétitif grâce aux liaisons régulières vers l'Afrique de l'Ouest et Centrale. Utilisez notre calculateur pour une estimation précise selon votre port de destination (Libreville, Douala, Pointe-Noire, Abidjan, Dakar).",
      },
      {
        question: "Les véhicules coréens d'occasion sont-ils en bon état ?",
        answer:
          "Oui, la Corée du Sud a l'un des systèmes d'inspection les plus rigoureux au monde. Les véhicules d'occasion coréens sont généralement très bien entretenus, avec un historique complet. Chaque véhicule sur notre plateforme est accompagné d'un rapport d'inspection détaillé.",
      },
    ],
  },
  dubai: {
    source: 'dubai',
    name: 'Dubaï',
    flag: '\u{1F1E6}\u{1F1EA}',
    title: "Véhicule occasion Dubaï — Import voiture Dubaï vers Afrique",
    description:
      "Importez votre véhicule d'occasion depuis Dubaï (Émirats Arabes Unis). SUV, berlines de luxe, 4x4 à prix compétitifs. Toyota, Nissan, Lexus, Land Rover. Livraison vers l'Afrique.",
    intro: [
      "Importez votre véhicule d'occasion depuis Dubaï, la plaque tournante automobile du Moyen-Orient. Des SUV premium aux 4x4 robustes, trouvez des véhicules parfaitement adaptés aux routes africaines à des prix imbattables.",
      "Dubaï est un hub mondial pour le commerce de véhicules d'occasion. Les résidents des Émirats changent de voiture régulièrement, créant un marché regorgeant de véhicules récents, souvent avec peu de kilomètres. Les Toyota Land Cruiser, Nissan Patrol et Lexus sont particulièrement populaires.",
      "Driveby Africa collabore avec les principaux revendeurs et plateformes d'enchères de Dubaï (Dubicars, Emirates Auction). Nous sélectionnons des véhicules adaptés aux conditions africaines : robustes, fiables, et avec des pièces détachées facilement disponibles.",
    ],
    faqs: [
      {
        question: "Comment importer une voiture de Dubaï vers l'Afrique ?",
        answer:
          "Sélectionnez votre véhicule sur Driveby Africa, versez un acompte pour le réserver. Notre équipe à Dubaï finalise l'achat, organise l'inspection et l'expédition maritime. Les liaisons maritimes Dubaï-Afrique sont fréquentes avec des délais de 2 à 4 semaines.",
      },
      {
        question: "Pourquoi acheter un véhicule d'occasion à Dubaï ?",
        answer:
          "Dubaï offre des véhicules premium à prix réduit. Les résidents des Émirats changent souvent de voiture (tous les 2-3 ans), ce qui permet de trouver des véhicules récents et bien équipés. De plus, les véhicules de Dubaï sont souvent en version GCC (Gulf Cooperation Council), adaptée aux climats chauds.",
      },
      {
        question: 'Quels types de véhicules trouve-t-on à Dubaï ?',
        answer:
          "Dubaï excelle pour les SUV et 4x4 : Toyota Land Cruiser, Nissan Patrol, Toyota Prado, Lexus LX, Range Rover. Vous trouverez aussi des berlines (Toyota Camry, Nissan Altima) et des véhicules de luxe (Mercedes, BMW, Porsche) à des prix très compétitifs.",
      },
      {
        question: 'Les véhicules de Dubaï sont-ils adaptés à l\'Afrique ?',
        answer:
          "Absolument. Les véhicules vendus à Dubaï sont souvent en spécification GCC, conçue pour les climats chauds : climatisation renforcée, protection anti-corrosion, filtres à air améliorés. Les SUV et 4x4 de Dubaï sont particulièrement adaptés aux routes africaines.",
      },
      {
        question: 'Combien coûte le transport maritime depuis Dubaï ?',
        answer:
          "Dubaï bénéficie d'excellentes connexions maritimes avec l'Afrique, ce qui rend le transport compétitif. Les délais sont souvent plus courts que depuis l'Asie (2-4 semaines). Utilisez notre calculateur de frais pour une estimation personnalisée selon votre destination.",
      },
    ],
  },
};

const ALL_SLUGS = Object.keys(COUNTRIES);

export function generateStaticParams() {
  return ALL_SLUGS.map((country) => ({ country }));
}

interface PageProps {
  params: Promise<{ country: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { country } = await params;
  const config = COUNTRIES[country];
  if (!config) return {};

  return {
    title: config.title,
    description: config.description,
    alternates: { canonical: `/import/${country}` },
    openGraph: {
      title: config.title,
      description: config.description,
    },
    twitter: {
      card: 'summary_large_image',
      title: config.title,
      description: config.description,
    },
  };
}

export default async function ImportCountryPage({ params }: PageProps) {
  const { country } = await params;
  const config = COUNTRIES[country];
  if (!config) notFound();

  // Fetch vehicles from this source
  const { data: vehicles } = await supabaseAdmin
    .from('vehicles')
    .select('id, source, source_id, source_url, make, model, grade, year, mileage, fob_price_usd, fuel_type, transmission, drive_type, body_type, color, engine_cc, images, status, auction_status, created_at, updated_at, is_visible, start_price_usd, current_price_usd, buy_now_price_usd, auction_platform, auction_date')
    .eq('is_visible', true)
    .eq('source', config.source)
    .order('created_at', { ascending: false })
    .limit(12);

  const safeVehicles = (vehicles || []) as Vehicle[];

  // Fetch batches from this source country
  const { data: batches } = await supabaseAdmin
    .from('vehicle_batches')
    .select('*')
    .eq('is_visible', true)
    .eq('status', 'approved')
    .eq('source_country', config.source as 'china' | 'korea' | 'dubai')
    .order('created_at', { ascending: false })
    .limit(6);

  const safeBatches = (batches || []) as VehicleBatch[];

  // Build JSON-LD data
  const otherCountries = ALL_SLUGS
    .filter((s) => s !== country)
    .map((s) => ({ slug: s, name: COUNTRIES[s].name, flag: COUNTRIES[s].flag }));

  const itemListItems = safeVehicles.map((v, i) => {
    const images = parseImagesField(v.images);
    return {
      name: `${v.make} ${v.model}${v.year && v.year > 0 ? ` ${v.year}` : ''}`,
      url: `https://driveby-africa.com/cars/${v.id}`,
      image: images[0],
      position: i + 1,
    };
  });

  return (
    <>
      <FAQPageJsonLd faqs={config.faqs} />
      {itemListItems.length > 0 && (
        <ItemListJsonLd
          name={`Véhicules d'occasion depuis ${config.name}`}
          items={itemListItems}
        />
      )}
      <CountryLandingContent
        vehicles={safeVehicles}
        batches={safeBatches}
        sourceFilter={config.source}
        countryName={config.name}
        flag={config.flag}
        intro={config.intro}
        faqs={config.faqs}
        otherCountries={otherCountries}
      />
    </>
  );
}
