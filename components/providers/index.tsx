'use client';

import { AuthProvider } from './AuthProvider';
import { ThemeProvider } from './ThemeProvider';
import { LocaleProvider } from './LocaleProvider';
import { ToastProvider } from '@/components/ui/Toast';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <LocaleProvider>
        <AuthProvider>
          <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
      </LocaleProvider>
    </ThemeProvider>
  );
}
