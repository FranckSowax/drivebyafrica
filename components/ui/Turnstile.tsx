'use client';

import { Turnstile as TurnstileWidget } from '@marsidev/react-turnstile';
import { useCallback, useState } from 'react';

interface TurnstileProps {
  onVerify: (token: string) => void;
  onError?: () => void;
  onExpire?: () => void;
  theme?: 'dark' | 'light' | 'auto';
}

/**
 * Cloudflare Turnstile CAPTCHA component
 *
 * Setup required:
 * 1. Create a Turnstile widget at https://dash.cloudflare.com/?to=/:account/turnstile
 * 2. Add NEXT_PUBLIC_TURNSTILE_SITE_KEY to your .env.local
 * 3. Add TURNSTILE_SECRET_KEY to your server environment
 */
export function Turnstile({ onVerify, onError, onExpire, theme = 'dark' }: TurnstileProps) {
  const [isLoading, setIsLoading] = useState(true);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  const handleSuccess = useCallback(
    (token: string) => {
      setIsLoading(false);
      onVerify(token);
    },
    [onVerify]
  );

  const handleError = useCallback(() => {
    setIsLoading(false);
    onError?.();
  }, [onError]);

  const handleExpire = useCallback(() => {
    onExpire?.();
  }, [onExpire]);

  // If no site key is configured, don't render the widget
  // This allows the app to work in development without Turnstile
  if (!siteKey) {
    // In development, auto-verify after a short delay
    if (process.env.NODE_ENV === 'development') {
      setTimeout(() => onVerify('dev-mode-token'), 100);
    }
    return null;
  }

  return (
    <div className="flex justify-center my-4">
      {isLoading && (
        <div className={`text-sm animate-pulse ${theme === 'light' ? 'text-gray-500' : 'text-nobel'}`}>
          Chargement de la vérification...
        </div>
      )}
      <TurnstileWidget
        siteKey={siteKey}
        onSuccess={handleSuccess}
        onError={handleError}
        onExpire={handleExpire}
        options={{
          theme,
          size: 'normal',
        }}
      />
    </div>
  );
}

/**
 * Server-side verification function
 * Call this from your API route to verify the Turnstile token
 */
export async function verifyTurnstileToken(token: string): Promise<boolean> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;

  // In development without secret key, accept all tokens
  if (!secretKey) {
    if (process.env.NODE_ENV === 'development') {
      return true;
    }
    console.error('TURNSTILE_SECRET_KEY not configured');
    return false;
  }

  try {
    const response = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          secret: secretKey,
          response: token,
        }),
      }
    );

    const data = await response.json();
    return data.success === true;
  } catch (error) {
    console.error('Turnstile verification failed:', error);
    return false;
  }
}
