'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAdminAuth } from '@/lib/hooks/useAdminAuth';

interface AdminAuthGuardProps {
  children: React.ReactNode;
}

/**
 * Garde d'authentification pour les pages admin
 * Utilise le hook useAdminAuth pour une gestion robuste de la session
 */
export function AdminAuthGuard({ children }: AdminAuthGuardProps) {
  const pathname = usePathname();
  const { isLoading, isAuthenticated, isAdmin, error } = useAdminAuth();

  useEffect(() => {
    // Ne pas rediriger si on est encore en train de charger
    if (isLoading) return;

    // Skip auth check for login page
    if (pathname === '/admin/login') return;

    // Si non authentifié ou non admin, rediriger vers login
    if (!isAuthenticated || !isAdmin) {
      // Utiliser window.location pour une navigation complète
      // Cela garantit que les cookies sont bien lus au prochain chargement
      window.location.href = '/admin/login';
    }
  }, [isLoading, isAuthenticated, isAdmin, pathname]);

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
  if (!isAuthenticated || !isAdmin) {
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
