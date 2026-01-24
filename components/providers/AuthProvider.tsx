'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/store/useAuthStore';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const initialize = useAuthStore((state) => state.initialize);

  useEffect(() => {
    // Always call initialize on mount - it handles preventing duplicate calls internally
    initialize();
  }, [initialize]);

  return <>{children}</>;
}
