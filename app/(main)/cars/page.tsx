import type { Metadata } from 'next';
import CarsPageClient from './CarsPageClient';

export const metadata: Metadata = {
  title: "Véhicules d'occasion — Import Chine, Corée du Sud, Dubaï",
  description:
    "Achat de voitures d'occasion importées depuis la Chine, la Corée du Sud et Dubaï vers l'Afrique. Plus de 15 000 véhicules vérifiés, estimation gratuite des frais d'importation, livraison port à port.",
  alternates: { canonical: '/cars' },
  openGraph: {
    title: "Véhicules d'occasion — Import Chine, Corée, Dubaï | Driveby Africa",
    description:
      "Explorez notre catalogue de véhicules d'occasion à importer depuis la Chine, la Corée du Sud et Dubaï. Livraison vers l'Afrique.",
  },
};

export default function CarsPage() {
  return <CarsPageClient />;
}
