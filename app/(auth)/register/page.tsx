'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Lock, User, Phone } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/components/ui/Toast';
import { Turnstile } from '@/components/ui/Turnstile';
import { createClient } from '@/lib/supabase/client';

const registerSchema = z
  .object({
    fullName: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
    email: z.string().email('Email invalide'),
    whatsapp: z.string().min(8, 'Numéro WhatsApp requis').regex(/^\+?[0-9\s-]+$/, 'Format invalide'),
    country: z.string().min(1, 'Sélectionnez un pays'),
    password: z
      .string()
      .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
      .regex(/[A-Z]/, 'Le mot de passe doit contenir au moins une majuscule')
      .regex(/[a-z]/, 'Le mot de passe doit contenir au moins une minuscule')
      .regex(/[0-9]/, 'Le mot de passe doit contenir au moins un chiffre'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmPassword'],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

const countries = [
  { value: 'GA', label: 'Gabon' },
  { value: 'CM', label: 'Cameroun' },
  { value: 'CG', label: 'Congo' },
  { value: 'CI', label: "Côte d'Ivoire" },
  { value: 'SN', label: 'Sénégal' },
  { value: 'BJ', label: 'Bénin' },
  { value: 'TG', label: 'Togo' },
  { value: 'ML', label: 'Mali' },
  { value: 'BF', label: 'Burkina Faso' },
  { value: 'GN', label: 'Guinée' },
  { value: 'OTHER', label: 'Autre' },
];

export default function RegisterPage() {
  const router = useRouter();
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      country: 'GA',
    },
  });

  const supabase = createClient();

  // Check if Turnstile is configured
  const turnstileConfigured = !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  const onSubmit = async (data: RegisterFormData) => {
    // Only require Turnstile verification if it's configured
    if (turnstileConfigured && !turnstileToken) {
      toast.error('Vérification requise', 'Veuillez compléter la vérification de sécurité');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.fullName,
            whatsapp: data.whatsapp,
            country: data.country,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        toast.error('Erreur', error.message);
        return;
      }

      toast.success(
        'Compte créé!',
        'Vérifiez votre email pour confirmer votre compte'
      );
      router.push('/login');
    } catch {
      toast.error('Erreur', 'Une erreur est survenue');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
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
        <h2 className="text-2xl font-bold text-white">Créer un compte</h2>
        <p className="text-nobel mt-2">
          Rejoignez Driveby Africa et commencez à importer
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Nom complet"
          placeholder="Jean Dupont"
          leftIcon={<User className="w-4 h-4" />}
          error={errors.fullName?.message}
          {...register('fullName')}
        />

        <Input
          label="Email"
          type="email"
          placeholder="votre@email.com"
          leftIcon={<Mail className="w-4 h-4" />}
          error={errors.email?.message}
          {...register('email')}
        />

        <Input
          label="WhatsApp"
          type="tel"
          placeholder="+241 XX XX XX XX"
          leftIcon={<Phone className="w-4 h-4" />}
          hint="Obligatoire pour recevoir vos documents et notifications"
          error={errors.whatsapp?.message}
          {...register('whatsapp')}
        />

        <Select
          label="Pays"
          options={countries}
          error={errors.country?.message}
          {...register('country')}
        />

        <Input
          label="Mot de passe"
          type="password"
          placeholder="••••••••"
          leftIcon={<Lock className="w-4 h-4" />}
          hint="Au moins 6 caractères"
          error={errors.password?.message}
          {...register('password')}
        />

        <Input
          label="Confirmer le mot de passe"
          type="password"
          placeholder="••••••••"
          leftIcon={<Lock className="w-4 h-4" />}
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />

        {/* Anti-bot verification */}
        <Turnstile
          onVerify={setTurnstileToken}
          onExpire={() => setTurnstileToken(null)}
        />

        <Button
          type="submit"
          variant="primary"
          className="w-full"
          isLoading={isLoading}
        >
          Créer mon compte
        </Button>
      </form>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-nobel/30" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-4 bg-cod-gray text-nobel">ou continuer avec</span>
        </div>
      </div>

      {/* Google Sign Up */}
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={handleGoogleSignUp}
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

      {/* Terms */}
      <p className="text-xs text-nobel text-center">
        En créant un compte, vous acceptez nos{' '}
        <Link href="/terms" className="text-mandarin hover:underline">
          Conditions générales
        </Link>{' '}
        et notre{' '}
        <Link href="/privacy" className="text-mandarin hover:underline">
          Politique de confidentialité
        </Link>
      </p>

      {/* Login Link */}
      <p className="text-center text-sm text-nobel">
        Déjà un compte?{' '}
        <Link href="/login" className="text-mandarin hover:underline font-medium">
          Se connecter
        </Link>
      </p>
    </div>
  );
}
