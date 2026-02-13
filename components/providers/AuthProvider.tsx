'use client';

import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/useAuthStore';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const initialize = useAuthStore((state) => state.initialize);
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const initCalled = useRef(false);

  useEffect(() => {
    // Only call initialize once per mount, and only if not already initialized
    if (!initCalled.current && !isInitialized) {
      initCalled.current = true;
      initialize().catch(() => {
        // Silently ignore initialization errors
      });
    }
  }, [initialize, isInitialized]);

  return <>{children}</>;
}
