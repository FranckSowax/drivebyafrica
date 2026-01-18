import Link from 'next/link';
import Image from 'next/image';
import { Car } from 'lucide-react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-cod-gray flex">
      {/* Left side - Branding with background image */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Background Image */}
        <Image
          src="/LOGIN DRIVEBY.webp"
          alt="Driveby Africa - Import automobile"
          fill
          className="object-cover object-center"
          priority
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-cod-gray/80 via-cod-gray/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-cod-gray/90 via-transparent to-cod-gray/40" />

        {/* Content */}
        <div className="relative z-10 p-12 flex flex-col justify-between w-full">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/logo-driveby-africa-dark.png"
              alt="Driveby Africa"
              width={180}
              height={60}
              className="brightness-0 invert"
            />
          </Link>

          <div className="space-y-6">
            <h1 className="text-4xl font-bold text-white leading-tight">
              Importez votre véhicule
              <br />
              <span className="text-mandarin">depuis l&apos;Asie et Dubaï</span>
            </h1>
            <p className="text-lg text-white/80 max-w-md">
              Accédez aux enchères automobiles de Corée du Sud, Chine et Dubaï.
              Suivi complet de l&apos;enchère jusqu&apos;à la livraison.
            </p>

            <div className="flex items-center gap-6 pt-4">
              <div className="text-center">
                <p className="text-3xl">🇰🇷</p>
                <p className="text-sm text-white/70 mt-1">Corée</p>
              </div>
              <div className="text-center">
                <p className="text-3xl">🇨🇳</p>
                <p className="text-sm text-white/70 mt-1">Chine</p>
              </div>
              <div className="text-center">
                <p className="text-3xl">🇦🇪</p>
                <p className="text-sm text-white/70 mt-1">Dubaï</p>
              </div>
            </div>
          </div>

          <p className="text-sm text-white/60">
            © {new Date().getFullYear()} Driveby Africa. Tous droits réservés.
          </p>
        </div>
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
