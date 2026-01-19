'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { LogIn, UserPlus } from 'lucide-react';
import { Suspense } from 'react';

function AuthButtonsContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Build current URL with search params for redirect after login
  const currentUrl = searchParams.toString()
    ? `${pathname}?${searchParams.toString()}`
    : pathname;
  
  const loginUrl = `/login?redirect=${encodeURIComponent(currentUrl)}`;
  const registerUrl = `/register?redirect=${encodeURIComponent(currentUrl)}`;

  return (
    <div className="flex items-center gap-2">
      {/* Mobile: Icon buttons only */}
      <Link
        href={loginUrl}
        className="sm:hidden inline-flex items-center justify-center p-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--surface)] active:bg-[var(--surface)] transition-colors relative z-10"
        aria-label="Connexion"
      >
        <LogIn className="w-5 h-5" />
      </Link>
      <Link
        href={registerUrl}
        className="sm:hidden inline-flex items-center justify-center p-2 rounded-lg bg-mandarin text-white hover:bg-orange-600 active:bg-orange-700 transition-colors relative z-10"
        aria-label="Inscription"
      >
        <UserPlus className="w-5 h-5" />
      </Link>

      {/* Desktop: Text buttons */}
      <Link
        href={loginUrl}
        className="hidden sm:inline-flex items-center justify-center font-medium transition-all duration-200 rounded-lg h-9 px-4 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface)] active:bg-[var(--surface)] relative z-10"
      >
        Connexion
      </Link>
      <Link
        href={registerUrl}
        className="hidden sm:inline-flex items-center justify-center font-medium transition-all duration-200 rounded-lg h-9 px-4 text-sm bg-mandarin text-white hover:bg-orange-600 active:bg-orange-700 shadow-md hover:shadow-lg relative z-10"
      >
        Inscription
      </Link>
    </div>
  );
}

function AuthButtonsFallback() {
  return (
    <div className="flex items-center gap-2">
      <Link
        href="/login"
        className="sm:hidden inline-flex items-center justify-center p-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--surface)] active:bg-[var(--surface)] transition-colors relative z-10"
        aria-label="Connexion"
      >
        <LogIn className="w-5 h-5" />
      </Link>
      <Link
        href="/register"
        className="sm:hidden inline-flex items-center justify-center p-2 rounded-lg bg-mandarin text-white hover:bg-orange-600 active:bg-orange-700 transition-colors relative z-10"
        aria-label="Inscription"
      >
        <UserPlus className="w-5 h-5" />
      </Link>
      <Link
        href="/login"
        className="hidden sm:inline-flex items-center justify-center font-medium transition-all duration-200 rounded-lg h-9 px-4 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface)] active:bg-[var(--surface)] relative z-10"
      >
        Connexion
      </Link>
      <Link
        href="/register"
        className="hidden sm:inline-flex items-center justify-center font-medium transition-all duration-200 rounded-lg h-9 px-4 text-sm bg-mandarin text-white hover:bg-orange-600 active:bg-orange-700 shadow-md hover:shadow-lg relative z-10"
      >
        Inscription
      </Link>
    </div>
  );
}

export function AuthButtons() {
  return (
    <Suspense fallback={<AuthButtonsFallback />}>
      <AuthButtonsContent />
    </Suspense>
  );
}
