import Link from 'next/link';
import { Car } from 'lucide-react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-cod-gray flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-mandarin/20 to-royal-blue/20 p-12 flex-col justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-12 h-12 bg-mandarin rounded-xl flex items-center justify-center">
            <Car className="w-7 h-7 text-white" />
          </div>
          <span className="font-bold text-2xl text-white">
            Driveby<span className="text-mandarin">Africa</span>
          </span>
        </Link>

        <div className="space-y-6">
          <h1 className="text-4xl font-bold text-white leading-tight">
            Importez votre véhicule
            <br />
            <span className="text-mandarin">depuis le monde entier</span>
          </h1>
          <p className="text-lg text-nobel max-w-md">
            Accédez aux enchères automobiles de Corée du Sud, Chine et Dubaï.
            Suivi complet de l&apos;enchère jusqu&apos;à la livraison.
          </p>

          <div className="flex items-center gap-6 pt-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-mandarin">🇰🇷</p>
              <p className="text-sm text-nobel mt-1">Corée</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-mandarin">🇨🇳</p>
              <p className="text-sm text-nobel mt-1">Chine</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-mandarin">🇦🇪</p>
              <p className="text-sm text-nobel mt-1">Dubaï</p>
            </div>
          </div>
        </div>

        <p className="text-sm text-nobel">
          © {new Date().getFullYear()} Driveby Africa. Tous droits réservés.
        </p>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8 text-center">
            <Link href="/" className="inline-flex items-center gap-2">
              <div className="w-10 h-10 bg-mandarin rounded-lg flex items-center justify-center">
                <Car className="w-6 h-6 text-white" />
              </div>
              <span className="font-bold text-xl text-white">
                Driveby<span className="text-mandarin">Africa</span>
              </span>
            </Link>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
