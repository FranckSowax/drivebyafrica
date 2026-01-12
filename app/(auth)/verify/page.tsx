'use client';

import { Suspense, useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { createClient } from '@/lib/supabase/client';
import { Spinner } from '@/components/ui/Spinner';

function VerifyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phone = searchParams.get('phone') || '';
  const redirect = searchParams.get('redirect') || '/dashboard';
  const toast = useToast();

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(60);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const supabase = createClient();

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  useEffect(() => {
    // Focus first input on mount
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when complete
    if (newOtp.every((digit) => digit) && newOtp.join('').length === 6) {
      handleVerify(newOtp.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);
    if (!/^\d+$/.test(pastedData)) return;

    const newOtp = [...otp];
    pastedData.split('').forEach((char, index) => {
      if (index < 6) newOtp[index] = char;
    });
    setOtp(newOtp);

    if (newOtp.every((digit) => digit)) {
      handleVerify(newOtp.join(''));
    }
  };

  const handleVerify = async (code: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        phone,
        token: code,
        type: 'sms',
      });

      if (error) {
        toast.error('Code invalide', 'Veuillez vérifier le code et réessayer');
        setOtp(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
        return;
      }

      toast.success('Vérification réussie!');
      router.push(redirect);
      router.refresh();
    } catch {
      toast.error('Erreur', 'Une erreur est survenue');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;

    try {
      const { error } = await supabase.auth.signInWithOtp({ phone });

      if (error) {
        toast.error('Erreur', error.message);
        return;
      }

      toast.success('Code envoyé!', 'Vérifiez vos SMS');
      setResendCooldown(60);
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch {
      toast.error('Erreur', 'Impossible d\'envoyer le code');
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white">Vérification</h2>
        <p className="text-nobel mt-2">
          Entrez le code envoyé au{' '}
          <span className="text-white font-medium">{phone}</span>
        </p>
      </div>

      {/* OTP Input */}
      <div className="flex justify-center gap-3" onPaste={handlePaste}>
        {otp.map((digit, index) => (
          <input
            key={index}
            ref={(el) => { inputRefs.current[index] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            className="w-12 h-14 text-center text-xl font-bold bg-surface border border-nobel/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-mandarin focus:border-transparent transition-all"
            disabled={isLoading}
          />
        ))}
      </div>

      {/* Verify Button */}
      <Button
        variant="primary"
        className="w-full"
        onClick={() => handleVerify(otp.join(''))}
        isLoading={isLoading}
        disabled={!otp.every((digit) => digit)}
      >
        Vérifier
      </Button>

      {/* Resend */}
      <div className="text-center">
        <p className="text-sm text-nobel mb-2">
          Vous n&apos;avez pas reçu le code?
        </p>
        <button
          onClick={handleResend}
          disabled={resendCooldown > 0}
          className={`text-sm font-medium ${
            resendCooldown > 0
              ? 'text-nobel cursor-not-allowed'
              : 'text-mandarin hover:underline'
          }`}
        >
          {resendCooldown > 0
            ? `Renvoyer dans ${resendCooldown}s`
            : 'Renvoyer le code'}
        </button>
      </div>

      {/* Back to login */}
      <p className="text-center text-sm text-nobel">
        <button
          onClick={() => router.push('/login')}
          className="text-mandarin hover:underline"
        >
          Retour à la connexion
        </button>
      </p>
    </div>
  );
}

function VerifyLoading() {
  return (
    <div className="flex items-center justify-center py-12">
      <Spinner size="lg" />
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<VerifyLoading />}>
      <VerifyForm />
    </Suspense>
  );
}
