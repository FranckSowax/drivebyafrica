'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useCollaboratorLocale } from '@/components/collaborator/CollaboratorLocaleProvider';
import { CollaboratorLanguageSwitcher } from '@/components/collaborator/CollaboratorLanguageSwitcher';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Loader2, Lock, Mail, AlertCircle } from 'lucide-react';
import Image from 'next/image';

function CollaboratorLoginContent() {
  const { t } = useCollaboratorLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/collaborator';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(t('auth.invalidCredentials'));
        return;
      }

      if (!data.user) {
        setError(t('auth.loginError'));
        return;
      }

      // Check if user is a collaborator
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single();

      if (profileError || !profile) {
        await supabase.auth.signOut();
        setError(t('errors.accessDenied'));
        return;
      }

      if (profile.role !== 'collaborator' && profile.role !== 'admin' && profile.role !== 'super_admin') {
        await supabase.auth.signOut();
        setError(t('errors.accessDenied'));
        return;
      }

      // Successful login - redirect
      router.push(redirectTo);
      router.refresh();
    } catch {
      setError(t('errors.serverError'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      {/* Language switcher */}
      <div className="absolute top-4 right-4">
        <CollaboratorLanguageSwitcher />
      </div>

      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Image
            src="/logo-driveby-africa-dark.png"
            alt="Driveby Africa"
            width={250}
            height={80}
            className="h-16 w-auto"
          />
        </div>

        {/* Login card */}
        <div className="bg-nobel/10 rounded-2xl p-8 border border-nobel/20">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white mb-2">
              {t('collaborator.login')}
            </h1>
            <p className="text-gray-400 text-sm">
              {t('collaborator.loginSubtitle')}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                {t('auth.email')}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-500" />
                </div>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  required
                  className="pl-10 bg-white border-nobel/30 text-black placeholder:text-gray-400"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                {t('auth.password')}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-500" />
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="pl-10 bg-white border-nobel/30 text-black placeholder:text-gray-400"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-mandarin hover:bg-mandarin/90 text-white font-semibold py-3"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('common.loading')}
                </>
              ) : (
                t('auth.loginButton')
              )}
            </Button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-gray-500 text-sm mt-8">
          {t('collaborator.portal')} &copy; {new Date().getFullYear()} Driveby Africa
        </p>
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 text-mandarin animate-spin" />
    </div>
  );
}

export default function CollaboratorLoginPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <CollaboratorLoginContent />
    </Suspense>
  );
}
