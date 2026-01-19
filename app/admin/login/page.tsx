'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Loader2, Lock, Mail, AlertCircle, Shield, CheckCircle } from 'lucide-react';
import Image from 'next/image';
import { useAdminAuth } from '@/lib/hooks/useAdminAuth';

type LoginStep = 'idle' | 'authenticating' | 'verifying' | 'redirecting' | 'success';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [step, setStep] = useState<LoginStep>('idle');
  const [error, setError] = useState<string | null>(null);

  const { isAdmin, isLoading: authLoading, isAuthenticated, signIn } = useAdminAuth();

  // Rediriger si déjà connecté en tant qu'admin
  useEffect(() => {
    if (!authLoading && isAuthenticated && isAdmin) {
      setStep('redirecting');
      // Navigation directe vers le dashboard
      window.location.href = '/admin';
    }
  }, [authLoading, isAuthenticated, isAdmin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setStep('authenticating');

    // Étape 1: Authentification
    const result = await signIn(email, password);

    if (!result.success) {
      setError(result.error || 'Erreur de connexion');
      setStep('idle');
      return;
    }

    // Étape 2: Vérification admin réussie
    setStep('verifying');

    // Petit délai pour permettre aux cookies de se synchroniser
    await new Promise(resolve => setTimeout(resolve, 300));

    // Étape 3: Redirection
    setStep('redirecting');

    // Utiliser une navigation dure pour s'assurer que le serveur reçoit les cookies
    window.location.href = '/admin';
  };

  const getStepMessage = () => {
    switch (step) {
      case 'authenticating':
        return 'Authentification...';
      case 'verifying':
        return 'Vérification des droits...';
      case 'redirecting':
        return 'Redirection...';
      case 'success':
        return 'Connecté!';
      default:
        return 'Se connecter';
    }
  };

  const isProcessing = step !== 'idle';

  // Afficher un loader si on vérifie la session existante
  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-gray-50">
        <div className="w-full max-w-md text-center">
          <Loader2 className="h-8 w-8 animate-spin text-royal-blue mx-auto mb-4" />
          <p className="text-gray-500">Vérification de la session...</p>
        </div>
      </div>
    );
  }

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
              {step === 'success' ? (
                <CheckCircle className="h-8 w-8 text-green-600" />
              ) : (
                <Shield className="h-8 w-8 text-royal-blue" />
              )}
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
                  placeholder="admin@drivebyafrica.com"
                  required
                  disabled={isProcessing}
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
                  disabled={isProcessing}
                  className="pl-10 bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-royal-blue focus:ring-royal-blue disabled:opacity-50"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isProcessing}
              className="w-full bg-royal-blue hover:bg-royal-blue/90 text-white font-semibold py-3"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {getStepMessage()}
                </>
              ) : (
                'Se connecter'
              )}
            </Button>
          </form>

          {/* Progress indicator */}
          {isProcessing && (
            <div className="mt-6">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                <span className={step === 'authenticating' ? 'text-royal-blue font-medium' : ''}>
                  Authentification
                </span>
                <span className={step === 'verifying' ? 'text-royal-blue font-medium' : ''}>
                  Vérification
                </span>
                <span className={step === 'redirecting' || step === 'success' ? 'text-royal-blue font-medium' : ''}>
                  Redirection
                </span>
              </div>
              <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-royal-blue transition-all duration-300"
                  style={{
                    width: step === 'authenticating' ? '33%' :
                           step === 'verifying' ? '66%' :
                           step === 'redirecting' || step === 'success' ? '100%' : '0%'
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-gray-500 text-sm mt-8">
          Administration &copy; {new Date().getFullYear()} Driveby Africa
        </p>
      </div>
    </div>
  );
}
