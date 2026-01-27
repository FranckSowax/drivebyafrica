'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Loader2, Lock, Mail, AlertCircle, Shield } from 'lucide-react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';

export default function AdminLoginPage() {
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
      // 1. Sign in with Supabase
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError('Email ou mot de passe incorrect');
        setIsLoading(false);
        return;
      }

      if (!data.user) {
        setError('Erreur de connexion');
        setIsLoading(false);
        return;
      }

      // 2. Check if user is admin via API (pass token for localStorage-based auth)
      const response = await fetch('/api/admin/check-role', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${data.session?.access_token}`,
        },
      });

      const roleData = await response.json();

      if (!roleData.isAdmin) {
        // Not admin, sign out
        await supabase.auth.signOut();
        setError('Accès réservé aux administrateurs');
        setIsLoading(false);
        return;
      }

      // 3. Set auth marker cookie for middleware
      const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toUTCString();
      document.cookie = `dba-auth-marker=1; path=/; expires=${expires}; SameSite=Lax`;

      // 4. Success - redirect to admin dashboard
      // Use window.location for a hard navigation to ensure cookies are sent
      window.location.href = '/admin';
    } catch (err) {
      console.error('Login error:', err);
      setError('Erreur de connexion au serveur');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-gray-50">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Image
            src="/logo-driveby-africa-dark.png"
            alt="Driveby Africa"
            width={250}
            height={80}
            className="h-16 w-auto"
            priority
          />
        </div>

        {/* Login card */}
        <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200">
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 bg-royal-blue/10 rounded-full flex items-center justify-center mb-4">
              <Shield className="h-8 w-8 text-royal-blue" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Administration
            </h1>
            <p className="text-gray-500 text-sm">
              Connectez-vous pour accéder au panneau d&apos;administration
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@driveby-africa.com"
                  required
                  disabled={isLoading}
                  className="pl-10 bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-royal-blue focus:ring-royal-blue disabled:opacity-50"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Mot de passe
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  disabled={isLoading}
                  className="pl-10 bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-royal-blue focus:ring-royal-blue disabled:opacity-50"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-royal-blue hover:bg-royal-blue/90 text-white font-semibold py-3"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connexion...
                </>
              ) : (
                'Se connecter'
              )}
            </Button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-gray-500 text-sm mt-8">
          Administration &copy; {new Date().getFullYear()} Driveby Africa
        </p>
      </div>
    </div>
  );
}
