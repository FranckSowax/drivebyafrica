'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Mail, Phone, MapPin, Facebook, Instagram, Twitter } from 'lucide-react';
import { useTheme } from '@/components/providers/ThemeProvider';

const footerLinks = {
  company: [
    { label: 'À propos', href: '/about' },
    { label: 'Comment ça marche', href: '/how-it-works' },
    { label: 'Contact', href: '/contact' },
    { label: 'Carrières', href: '/careers' },
  ],
  services: [
    { label: 'Véhicules', href: '/cars' },
    { label: 'Estimation des frais', href: '/calculator' },
    { label: 'Suivi de commande', href: '/dashboard/orders' },
    { label: 'Demander un devis', href: '/cars' },
  ],
  support: [
    { label: 'FAQ', href: '/faq' },
    { label: 'Guides', href: '/guides' },
    { label: 'Conditions générales', href: '/terms' },
    { label: 'Politique de confidentialité', href: '/privacy' },
  ],
};

const destinations = ['Gabon', 'Cameroun', 'Congo', "Côte d'Ivoire", 'Sénégal'];

export function Footer() {
  const { theme, mounted } = useTheme();

  // Use dark logo as default during SSR to prevent flash
  const logoSrc = mounted
    ? (theme === 'dark' ? '/logo-driveby-africa.png' : '/logo-driveby-africa-dark.png')
    : '/logo-driveby-africa-dark.png';

  return (
    <footer className="bg-[var(--surface)] border-t border-[var(--card-border)]">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link href="/" className="inline-block mb-4">
              <Image
                src={logoSrc}
                alt="Driveby Africa"
                width={320}
                height={90}
                className="h-20 w-auto"
              />
            </Link>
            <p className="text-[var(--text-muted)] text-sm mb-6 max-w-sm">
              Votre partenaire de confiance pour l&apos;importation de véhicules
              depuis la Corée du Sud, la Chine et Dubaï vers l&apos;Afrique.
            </p>
            <div className="space-y-2 text-sm">
              <a
                href="mailto:contact@drivebyafrica.com"
                className="flex items-center gap-2 text-[var(--text-muted)] hover:text-mandarin transition-colors"
              >
                <Mail className="w-4 h-4" />
                contact@drivebyafrica.com
              </a>
              <a
                href="tel:+24177000000"
                className="flex items-center gap-2 text-[var(--text-muted)] hover:text-mandarin transition-colors"
              >
                <Phone className="w-4 h-4" />
                +241 77 00 00 00
              </a>
              <p className="flex items-center gap-2 text-[var(--text-muted)]">
                <MapPin className="w-4 h-4" />
                Hong Kong
              </p>
            </div>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-semibold text-[var(--text-primary)] mb-4">Entreprise</h4>
            <ul className="space-y-2">
              {footerLinks.company.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-[var(--text-muted)] hover:text-mandarin transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <h4 className="font-semibold text-[var(--text-primary)] mb-4">Services</h4>
            <ul className="space-y-2">
              {footerLinks.services.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-[var(--text-muted)] hover:text-mandarin transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-semibold text-[var(--text-primary)] mb-4">Support</h4>
            <ul className="space-y-2">
              {footerLinks.support.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-[var(--text-muted)] hover:text-mandarin transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Destinations */}
        <div className="mt-12 pt-8 border-t border-[var(--card-border)]">
          <h4 className="font-semibold text-[var(--text-primary)] mb-4">Destinations de livraison</h4>
          <div className="flex flex-wrap gap-2">
            {destinations.map((destination) => (
              <span
                key={destination}
                className="px-3 py-1 bg-[var(--surface-hover)] text-sm text-[var(--text-secondary)] rounded-full"
              >
                {destination}
              </span>
            ))}
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-8 border-t border-[var(--card-border)] flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-[var(--text-muted)]">
            © {new Date().getFullYear()} Driveby Africa. Tous droits réservés.
          </p>
          <div className="flex items-center gap-4">
            <a
              href="https://facebook.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--text-muted)] hover:text-mandarin transition-colors"
            >
              <Facebook className="w-5 h-5" />
            </a>
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--text-muted)] hover:text-mandarin transition-colors"
            >
              <Instagram className="w-5 h-5" />
            </a>
            <a
              href="https://twitter.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--text-muted)] hover:text-mandarin transition-colors"
            >
              <Twitter className="w-5 h-5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
