import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';
import MetaPixel from '@/components/MetaPixel';

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

// Blocking script to prevent flash of incorrect theme
// This runs before React hydrates
const themeScript = `
  (function() {
    try {
      var theme = localStorage.getItem('driveby-theme');
      if (theme !== 'light' && theme !== 'dark') {
        theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        localStorage.setItem('driveby-theme', theme);
      }
      document.documentElement.setAttribute('data-theme', theme);
      document.documentElement.style.colorScheme = theme;
    } catch (e) {
      document.documentElement.setAttribute('data-theme', 'light');
      document.documentElement.style.colorScheme = 'light';
    }
  })();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        <MetaPixel />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
