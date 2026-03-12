import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';
import TrackingScripts from '@/components/MetaPixel';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://driveby-africa.com'),
  title: {
    default: 'Driveby Africa — Achat véhicules occasion Chine, Corée, Dubaï vers Afrique',
    template: '%s | Driveby Africa',
  },
  description:
    "Achat et importation de véhicules d'occasion depuis la Chine, la Corée du Sud et Dubaï vers l'Afrique. Voitures vérifiées, livraison port à port, paiement sécurisé. Plus de 15 000 véhicules disponibles.",
  keywords: [
    'achat véhicule chine',
    'voiture occasion corée',
    'importation voiture dubai',
    'véhicule occasion dubaï',
    'voiture chine occasion',
    'importation véhicules afrique',
    'voiture occasion corée du sud',
    'achat voiture dubaï',
    'import auto chine afrique',
    'véhicule importation gabon',
    'voiture occasion cameroun',
    'importation véhicule côte ivoire',
  ],
  authors: [{ name: 'Driveby Africa' }],
  icons: {
    icon: '/Favcon -driveby-africa-dark.png',
    shortcut: '/Favcon -driveby-africa-dark.png',
    apple: '/Favcon -driveby-africa-dark.png',
  },
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Driveby Africa — Achat véhicules occasion Chine, Corée, Dubaï',
    description:
      "Importez votre véhicule d'occasion depuis la Chine, la Corée du Sud ou Dubaï vers l'Afrique. Véhicules vérifiés, livraison complète, paiement sécurisé.",
    type: 'website',
    locale: 'fr_FR',
    siteName: 'Driveby Africa',
    images: [
      {
        url: '/Favcon -driveby-africa-dark.png',
        width: 512,
        height: 512,
        alt: 'Driveby Africa — Import véhicules occasion',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Driveby Africa — Achat véhicules occasion Chine, Corée, Dubaï',
    description:
      "Importez votre véhicule d'occasion depuis la Chine, la Corée du Sud ou Dubaï vers l'Afrique.",
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
        <TrackingScripts />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
