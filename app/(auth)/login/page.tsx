'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Lock, Phone } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { createClient } from '@/lib/supabase/client';
import { Spinner } from '@/components/ui/Spinner';

const emailSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères'),
});

const phoneSchema = z.object({
  phone: z.string().min(8, 'Numéro de téléphone invalide'),
});

type EmailFormData = z.infer<typeof emailSchema>;
type PhoneFormData = z.infer<typeof phoneSchema>;

type AuthMethod = 'email' | 'phone' | 'google';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/dashboard';
  const toast = useToast();
  const [authMethod, setAuthMethod] = useState<AuthMethod>('email');
  const [isLoading, setIsLoading] = useState(false);

  const emailForm = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
  });

  const phoneForm = useForm<PhoneFormData>({
    resolver: zodResolver(phoneSchema),
  });

  const supabase = createClient();

  const handleEmailLogin = async (data: EmailFormData) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) {
        toast.error('Erreur de connexion', error.message);
        return;
      }

      toast.success('Connexion réussie!');
      router.push(redirect);
      router.refresh();
    } catch {
      toast.error('Erreur', 'Une erreur est survenue');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhoneLogin = async (data: PhoneFormData) => {
    setIsLoading(true);
    try {
      const phone = data.phone.startsWith('+') ? data.phone : `+241${data.phone}`;

      const { error } = await supabase.auth.signInWithOtp({
        phone,
      });

      if (error) {
        toast.error('Erreur', error.message);
        return;
      }

      toast.success('Code envoyé!', 'Vérifiez vos SMS');
      router.push(`/verify?phone=${encodeURIComponent(phone)}&redirect=${encodeURIComponent(redirect)}`);
    } catch {
      toast.error('Erreur', 'Une erreur est survenue');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirect)}`,
        },
      });

      if (error) {
        toast.error('Erreur', error.message);
      }
    } catch {
      toast.error('Erreur', 'Une erreur est survenue');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center lg:text-left">
        <h2 className="text-2xl font-bold text-white">Connexion</h2>
        <p className="text-nobel mt-2">
          Connectez-vous à votre compte Driveby Africa
        </p>
      </div>

      {/* Auth Method Tabs */}
      <div className="flex rounded-lg bg-surface p-1">
        <button
          onClick={() => setAuthMethod('email')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            authMethod === 'email'
              ? 'bg-mandarin text-white'
              : 'text-nobel hover:text-white'
          }`}
        >
          <Mail className="w-4 h-4" />
          Email
        </button>
        <button
          onClick={() => setAuthMethod('phone')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            authMethod === 'phone'
              ? 'bg-mandarin text-white'
              : 'text-nobel hover:text-white'
          }`}
        >
          <Phone className="w-4 h-4" />
          Téléphone
        </button>
      </div>

      {/* Email Form */}
      {authMethod === 'email' && (
        <form onSubmit={emailForm.handleSubmit(handleEmailLogin)} className="space-y-4">
          <Input
            label="Email"
            type="email"
            placeholder="votre@email.com"
            leftIcon={<Mail className="w-4 h-4" />}
            error={emailForm.formState.errors.email?.message}
            {...emailForm.register('email')}
          />
          <Input
            label="Mot de passe"
            type="password"
            placeholder="••••••••"
            leftIcon={<Lock className="w-4 h-4" />}
            error={emailForm.formState.errors.password?.message}
            {...emailForm.register('password')}
          />
          <div className="flex justify-end">
            <Link
              href="/forgot-password"
              className="text-sm text-mandarin hover:underline"
            >
              Mot de passe oublié?
            </Link>
          </div>
          <Button
            type="submit"
            variant="primary"
            className="w-full"
            isLoading={isLoading}
          >
            Se connecter
          </Button>
        </form>
      )}

      {/* Phone Form */}
      {authMethod === 'phone' && (
        <form onSubmit={phoneForm.handleSubmit(handlePhoneLogin)} className="space-y-4">
          <Input
            label="Numéro de téléphone"
            type="tel"
            placeholder="+241 XX XX XX XX"
            leftIcon={<Phone className="w-4 h-4" />}
            hint="Vous recevrez un code de vérification par SMS"
            error={phoneForm.formState.errors.phone?.message}
            {...phoneForm.register('phone')}
          />
          <Button
            type="submit"
            variant="primary"
            className="w-full"
            isLoading={isLoading}
          >
            Recevoir le code
          </Button>
        </form>
      )}

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-nobel/30" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-4 bg-cod-gray text-nobel">ou continuer avec</span>
        </div>
      </div>

      {/* Google Login */}
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={handleGoogleLogin}
        isLoading={isLoading && authMethod === 'google'}
        leftIcon={
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
        }
      >
        Google
      </Button>

      {/* Register Link */}
      <p className="text-center text-sm text-nobel">
        Pas encore de compte?{' '}
        <Link href="/register" className="text-mandarin hover:underline font-medium">
          Créer un compte
        </Link>
      </p>
    </div>
  );
}

function LoginLoading() {
  return (
    <div className="flex items-center justify-center py-12">
      <Spinner size="lg" />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginLoading />}>
      <LoginForm />
    </Suspense>
  );
}
