import { Metadata } from 'next';
import Link from 'next/link';
import { Car, Ship, FileText } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Admin - Driveby Africa',
  description: 'Administration de la plateforme Driveby Africa',
};

const navItems = [
  { href: '/admin/vehicles', label: 'Véhicules', icon: Car },
  { href: '/admin/shipping', label: 'Transport', icon: Ship },
  { href: '/admin/quotes', label: 'Devis', icon: FileText },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Admin Header */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-[var(--card-bg)] border-b border-[var(--card-border)] z-50">
        <div className="container mx-auto px-4 h-full flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/admin/vehicles" className="flex items-center gap-2">
              <span className="text-xl font-bold text-mandarin">Driveby</span>
              <span className="text-sm bg-mandarin/10 text-mandarin px-2 py-0.5 rounded">Admin</span>
            </Link>
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)] transition-colors"
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <Link
            href="/"
            className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            Retour au site
          </Link>
        </div>
      </header>
      {/* Content */}
      <main className="pt-16">
        {children}
      </main>
    </div>
  );
}
