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
      console.log('AuthProvider: Calling initialize()');
      initialize().then(() => {
        console.log('AuthProvider: initialize() completed');
      }).catch((err) => {
        console.error('AuthProvider: initialize() error:', err);
      });
    }
  }, [initialize, isInitialized]);

  return <>{children}</>;
}
