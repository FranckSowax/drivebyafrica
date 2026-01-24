'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { createClient } from '@/lib/supabase/client';

const forgotPasswordSchema = z.object({
  email: z.string().email('Email invalide'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const toast = useToast();
  const supabase = createClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) {
        toast.error('Erreur', error.message);
        return;
      }

      setIsSubmitted(true);
      toast.success('Email envoyé', 'Vérifiez votre boîte de réception');
    } catch {
      toast.error('Erreur', 'Une erreur est survenue lors de l\'envoi de l\'email');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="space-y-6 text-center">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-jewel/10 rounded-full flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-jewel" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-white">Vérifiez vos emails</h2>
        <p className="text-nobel">
          Nous avons envoyé un lien de réinitialisation de mot de passe à votre adresse email.
        </p>
        <Link href="/login" className="inline-flex items-center gap-2 text-mandarin hover:underline">
          <ArrowLeft className="w-4 h-4" />
          Retour à la connexion
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center lg:text-left">
        <Link href="/login" className="inline-flex items-center gap-2 text-sm text-nobel hover:text-white mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Retour
        </Link>
        <h2 className="text-2xl font-bold text-white">Mot de passe oublié</h2>
        <p className="text-nobel mt-2">
          Entrez votre email pour recevoir un lien de réinitialisation
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Email"
          type="email"
          placeholder="votre@email.com"
          leftIcon={<Mail className="w-4 h-4" />}
          error={errors.email?.message}
          {...register('email')}
        />
        <Button
          type="submit"
          variant="primary"
          className="w-full"
          isLoading={isLoading}
        >
          Envoyer le lien
        </Button>
      </form>
    </div>
  );
}
