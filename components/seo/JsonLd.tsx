import type { Vehicle, VehicleSource } from '@/types/vehicle';
import { SOURCE_NAMES } from '@/types/vehicle';
import { parseImagesField } from '@/lib/utils/imageProxy';

function JsonLdScript({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function OrganizationJsonLd() {
  return (
    <JsonLdScript
      data={{
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'Driveby Africa',
        url: 'https://driveby-africa.com',
        logo: 'https://driveby-africa.com/Favcon -driveby-africa-dark.png',
        description:
          "Plateforme d'importation de véhicules d'occasion depuis la Chine, la Corée du Sud et Dubaï vers l'Afrique.",
        contactPoint: {
          '@type': 'ContactPoint',
          telephone: '+86-130-2205-2798',
          contactType: 'customer service',
          availableLanguage: ['French', 'English', 'Chinese'],
        },
        areaServed: ['Gabon', 'Cameroun', 'Congo', "Côte d'Ivoire", 'Sénégal'],
      }}
    />
  );
}

export function ProductJsonLd({ vehicle }: { vehicle: Vehicle }) {
  const images = parseImagesField(vehicle.images);
  const sourceName = SOURCE_NAMES[vehicle.source as VehicleSource] || vehicle.source;
  const year = vehicle.year && vehicle.year > 0 ? vehicle.year : '';
  const name = `${vehicle.make} ${vehicle.model}${year ? ` ${year}` : ''}`;

  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    description: `${name} d'occasion — Importation depuis ${sourceName} vers l'Afrique`,
    brand: { '@type': 'Brand', name: vehicle.make },
    url: `https://driveby-africa.com/cars/${vehicle.id}`,
  };

  if (images.length > 0) {
    data.image = images.slice(0, 5);
  }

  if (vehicle.fob_price_usd) {
    data.offers = {
      '@type': 'Offer',
      price: vehicle.fob_price_usd,
      priceCurrency: 'USD',
      availability:
        vehicle.status === 'available'
          ? 'https://schema.org/InStock'
          : vehicle.status === 'sold'
            ? 'https://schema.org/SoldOut'
            : 'https://schema.org/LimitedAvailability',
      seller: { '@type': 'Organization', name: 'Driveby Africa' },
    };
  }

  if (vehicle.mileage) {
    data.mileageFromOdometer = {
      '@type': 'QuantitativeValue',
      value: vehicle.mileage,
      unitCode: 'KMT',
    };
  }

  if (vehicle.year && vehicle.year > 0) {
    data.productionDate = String(vehicle.year);
  }

  return <JsonLdScript data={data} />;
}

interface FAQItem {
  question: string;
  answer: string;
}

export function FAQPageJsonLd({ faqs }: { faqs: FAQItem[] }) {
  return (
    <JsonLdScript
      data={{
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqs.map((faq) => ({
          '@type': 'Question',
          name: faq.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: faq.answer,
          },
        })),
      }}
    />
  );
}

export function ItemListJsonLd({
  name,
  items,
}: {
  name: string;
  items: { name: string; url: string; image?: string; position: number }[];
}) {
  return (
    <JsonLdScript
      data={{
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name,
        itemListElement: items.map((item) => ({
          '@type': 'ListItem',
          position: item.position,
          item: {
            '@type': 'Product',
            name: item.name,
            url: item.url,
            ...(item.image ? { image: item.image } : {}),
          },
        })),
      }}
    />
  );
}
