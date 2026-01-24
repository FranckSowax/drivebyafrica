'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';

interface AdminAuthGuardProps {
  children: React.ReactNode;
}

/**
 * Garde d'authentification simplifiée pour les pages admin
 * Vérifie le rôle via l'API une seule fois
 */
export function AdminAuthGuard({ children }: AdminAuthGuardProps) {
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Skip auth check for login page
    if (pathname === '/admin/login') {
      setIsLoading(false);
      return;
    }

    const checkAuth = async () => {
      try {
        const response = await fetch('/api/admin/check-role', {
          method: 'GET',
          credentials: 'include',
        });

        if (!response.ok) {
          setError('Erreur de vérification');
          window.location.href = '/admin/login';
          return;
        }

        const data = await response.json();

        if (data.isAdmin) {
          setIsAdmin(true);
          setIsLoading(false);
        } else {
          setError('Accès non autorisé');
          window.location.href = '/admin/login';
        }
      } catch (err) {
        console.error('Auth check error:', err);
        setError('Erreur de connexion');
        window.location.href = '/admin/login';
      }
    };

    checkAuth();
  }, [pathname]);

  // Skip guard for login page
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  // Afficher le loader pendant la vérification
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 text-royal-blue animate-spin mx-auto" />
          <p className="mt-4 text-[var(--text-muted)] text-sm">Vérification de l&apos;accès...</p>
        </div>
      </div>
    );
  }

  // Afficher un loader pendant la redirection si non autorisé
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 text-royal-blue animate-spin mx-auto" />
          <p className="mt-4 text-[var(--text-muted)] text-sm">
            {error || 'Redirection vers la page de connexion...'}
          </p>
        </div>
      </div>
    );
  }

  // Utilisateur authentifié et admin - afficher le contenu
  return <>{children}</>;
}
