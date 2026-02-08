'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Lock, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // Supabase sends the recovery tokens via URL hash fragment
    // The client library auto-detects them and sets up the session
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSessionReady(true);
      }
    });

    // Also check if we already have a session (page refresh after recovery link)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSessionReady(true);
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    setIsLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        setError(updateError.message);
        return;
      }

      setIsSuccess(true);
      setTimeout(() => router.push('/login'), 3000);
    } catch {
      setError('Une erreur est survenue');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-cod-gray flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-6 text-center">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-jewel/10 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-jewel" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-white">Mot de passe mis à jour</h2>
          <p className="text-nobel">
            Votre mot de passe a été réinitialisé avec succès. Redirection vers la connexion...
          </p>
          <Link href="/login" className="inline-flex items-center gap-2 text-mandarin hover:underline">
            <ArrowLeft className="w-4 h-4" />
            Retour à la connexion
          </Link>
        </div>
      </div>
    );
  }

  if (!sessionReady) {
    return (
      <div className="min-h-screen bg-cod-gray flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-6 text-center">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-mandarin/10 rounded-full flex items-center justify-center">
              <Lock className="w-8 h-8 text-mandarin" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-white">Vérification en cours...</h2>
          <p className="text-nobel">
            Si cette page ne se met pas à jour, votre lien de réinitialisation a peut-être expiré.
          </p>
          <Link href="/forgot-password" className="inline-flex items-center gap-2 text-mandarin hover:underline">
            Demander un nouveau lien
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cod-gray flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        <div>
          <Link href="/login" className="inline-flex items-center gap-2 text-sm text-nobel hover:text-white mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Retour
          </Link>
          <h2 className="text-2xl font-bold text-white">Nouveau mot de passe</h2>
          <p className="text-nobel mt-2">
            Entrez votre nouveau mot de passe
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-nobel mb-1.5">Nouveau mot de passe</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-nobel" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 8 caractères"
                className="w-full pl-10 pr-4 py-2.5 bg-mine-shaft border border-mine-shaft rounded-lg text-white placeholder:text-nobel/50 focus:border-mandarin focus:outline-none"
                required
                minLength={8}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-nobel mb-1.5">Confirmer le mot de passe</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-nobel" />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirmez le mot de passe"
                className="w-full pl-10 pr-4 py-2.5 bg-mine-shaft border border-mine-shaft rounded-lg text-white placeholder:text-nobel/50 focus:border-mandarin focus:outline-none"
                required
                minLength={8}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 px-4 bg-mandarin hover:bg-mandarin/90 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
          >
            {isLoading ? 'Mise à jour...' : 'Réinitialiser le mot de passe'}
          </button>
        </form>
      </div>
    </div>
  );
}
