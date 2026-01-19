import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export type AdminCheckResult =
  | { isAdmin: true; user: { id: string; email: string }; supabase: Awaited<ReturnType<typeof createClient>> }
  | { isAdmin: false; response: NextResponse };

/**
 * Vérifie si l'utilisateur actuel est un administrateur
 * Retourne soit les infos admin, soit une réponse d'erreur prête à être retournée
 */
export async function requireAdmin(): Promise<AdminCheckResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return {
      isAdmin: false,
      response: NextResponse.json(
        { error: 'Authentification requise' },
        { status: 401 }
      ),
    };
  }

  // Vérifier le rôle admin dans la table profiles
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const role = profile?.role as string | undefined;
  const isAdminRole = role === 'admin' || role === 'super_admin';

  if (!isAdminRole) {
    return {
      isAdmin: false,
      response: NextResponse.json(
        { error: 'Accès réservé aux administrateurs' },
        { status: 403 }
      ),
    };
  }

  return {
    isAdmin: true,
    user: { id: user.id, email: user.email || '' },
    supabase,
  };
}

/**
 * Vérifie si l'utilisateur est authentifié (pas nécessairement admin)
 */
export async function requireAuth(): Promise<
  | { isAuthenticated: true; user: { id: string; email: string }; supabase: Awaited<ReturnType<typeof createClient>> }
  | { isAuthenticated: false; response: NextResponse }
> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return {
      isAuthenticated: false,
      response: NextResponse.json(
        { error: 'Authentification requise' },
        { status: 401 }
      ),
    };
  }

  return {
    isAuthenticated: true,
    user: { id: user.id, email: user.email || '' },
    supabase,
  };
}
