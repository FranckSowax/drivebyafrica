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
    <div className="flex items-center gap-1 sm:gap-2">
      {/* Mobile: Icon buttons with proper touch targets (44x44 minimum) */}
      <Link
        href={loginUrl}
        className="sm:hidden inline-flex items-center justify-center min-w-[44px] min-h-[44px] p-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--surface)] active:bg-[var(--surface)] active:scale-95 transition-all touch-manipulation"
        aria-label="Connexion"
      >
        <LogIn className="w-5 h-5 pointer-events-none" />
      </Link>
      <Link
        href={registerUrl}
        className="sm:hidden inline-flex items-center justify-center min-w-[44px] min-h-[44px] p-2 rounded-lg bg-mandarin text-white hover:bg-orange-600 active:bg-orange-700 active:scale-95 transition-all touch-manipulation"
        aria-label="Inscription"
      >
        <UserPlus className="w-5 h-5 pointer-events-none" />
      </Link>

      {/* Desktop: Text buttons */}
      <Link
        href={loginUrl}
        className="hidden sm:inline-flex items-center justify-center font-medium transition-all duration-200 rounded-lg h-9 px-4 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface)] active:bg-[var(--surface)]"
      >
        Connexion
      </Link>
      <Link
        href={registerUrl}
        className="hidden sm:inline-flex items-center justify-center font-medium transition-all duration-200 rounded-lg h-9 px-4 text-sm bg-mandarin text-white hover:bg-orange-600 active:bg-orange-700 shadow-md hover:shadow-lg"
      >
        Inscription
      </Link>
    </div>
  );
}

function AuthButtonsFallback() {
  return (
    <div className="flex items-center gap-1 sm:gap-2">
      <Link
        href="/login"
        className="sm:hidden inline-flex items-center justify-center min-w-[44px] min-h-[44px] p-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--surface)] active:bg-[var(--surface)] active:scale-95 transition-all touch-manipulation"
        aria-label="Connexion"
      >
        <LogIn className="w-5 h-5 pointer-events-none" />
      </Link>
      <Link
        href="/register"
        className="sm:hidden inline-flex items-center justify-center min-w-[44px] min-h-[44px] p-2 rounded-lg bg-mandarin text-white hover:bg-orange-600 active:bg-orange-700 active:scale-95 transition-all touch-manipulation"
        aria-label="Inscription"
      >
        <UserPlus className="w-5 h-5 pointer-events-none" />
      </Link>
      <Link
        href="/login"
        className="hidden sm:inline-flex items-center justify-center font-medium transition-all duration-200 rounded-lg h-9 px-4 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface)] active:bg-[var(--surface)]"
      >
        Connexion
      </Link>
      <Link
        href="/register"
        className="hidden sm:inline-flex items-center justify-center font-medium transition-all duration-200 rounded-lg h-9 px-4 text-sm bg-mandarin text-white hover:bg-orange-600 active:bg-orange-700 shadow-md hover:shadow-lg"
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
