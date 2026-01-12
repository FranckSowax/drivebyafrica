import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Driveby Africa - Importation de véhicules',
  description:
    "Plateforme d'importation de véhicules depuis la Corée du Sud, la Chine et Dubaï vers l'Afrique. Enchères en direct, suivi de livraison et paiement sécurisé.",
  keywords: [
    'importation véhicules',
    'voitures Corée',
    'enchères auto',
    'Gabon',
    'Afrique',
    'Dubaï',
  ],
  authors: [{ name: 'Driveby Africa' }],
  openGraph: {
    title: 'Driveby Africa - Importation de véhicules',
    description:
      "Votre partenaire de confiance pour l'importation de véhicules vers l'Afrique",
    type: 'website',
    locale: 'fr_FR',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
