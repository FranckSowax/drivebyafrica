'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LogIn, UserPlus, User, X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Auth buttons for login and registration
 *
 * Uses dropdown on desktop and bottom sheet on mobile for consistent UX
 * Handles navigation programmatically to avoid issues with Next.js Link in dropdowns
 */
export function AuthButtons() {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const mobileSheetRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Handle mounting for portal
  useEffect(() => {
    setMounted(true);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const isInsideDropdown = dropdownRef.current?.contains(target);
      const isInsideMobileSheet = mobileSheetRef.current?.contains(target);

      if (!isInsideDropdown && !isInsideMobileSheet) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  const handleLogin = () => {
    setIsOpen(false);
    router.push('/login');
  };

  const handleRegister = () => {
    setIsOpen(false);
    router.push('/register');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-xl transition-all',
          'hover:bg-[var(--surface)] active:scale-95 touch-manipulation',
          'text-[var(--text-secondary)]',
          'min-h-[44px]',
          isOpen && 'bg-[var(--surface)]'
        )}
        aria-label="Menu de connexion"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <User className="w-5 h-5" />
        <div className="hidden sm:flex flex-col items-start text-left">
          <span className="text-xs text-[var(--text-muted)]">Bienvenue</span>
          <span className="text-sm font-medium text-[var(--text-primary)]">
            Se connecter / S&apos;inscrire
          </span>
        </div>
      </button>

      {/* Desktop Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="hidden md:block absolute right-0 top-full mt-2 w-72 z-50 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-mandarin/10 to-transparent border-b border-[var(--card-border)]">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[var(--surface)] flex items-center justify-center">
                  <User className="w-6 h-6 text-[var(--text-muted)]" />
                </div>
                <div>
                  <p className="font-semibold text-[var(--text-primary)]">Bienvenue</p>
                  <p className="text-xs text-[var(--text-muted)]">
                    Connectez-vous pour accéder à votre compte
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="p-4 space-y-3">
              <button
                onClick={handleLogin}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all bg-mandarin text-white hover:bg-orange-600 active:scale-[0.98] shadow-lg shadow-mandarin/25"
              >
                <LogIn className="w-4 h-4" />
                Se connecter
              </button>

              <button
                onClick={handleRegister}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all bg-[var(--surface)] text-[var(--text-primary)] hover:bg-[var(--surface)]/80 active:scale-[0.98] border border-[var(--card-border)]"
              >
                <UserPlus className="w-4 h-4" />
                Créer un compte
              </button>
            </div>

            {/* Footer */}
            <div className="px-4 pb-4">
              <p className="text-xs text-center text-[var(--text-muted)]">
                Inscription gratuite et sans engagement
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Bottom Sheet */}
      {mounted && createPortal(
        <AnimatePresence>
          {isOpen && (
            <>
              {/* Mobile Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 z-[9998] md:hidden"
                onClick={() => setIsOpen(false)}
              />

              {/* Mobile Bottom Sheet */}
              <motion.div
                ref={mobileSheetRef}
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="fixed inset-x-0 bottom-0 z-[9999] bg-[var(--card-bg)] border-t border-[var(--card-border)] rounded-t-2xl shadow-2xl overflow-hidden md:hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Handle */}
                <div className="flex justify-center pt-3 pb-2">
                  <div className="w-12 h-1.5 rounded-full bg-[var(--card-border)]" />
                </div>

                {/* Header */}
                <div className="px-4 pb-4 border-b border-[var(--card-border)]">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-[var(--surface)] flex items-center justify-center">
                        <User className="w-6 h-6 text-[var(--text-muted)]" />
                      </div>
                      <div>
                        <p className="font-semibold text-[var(--text-primary)]">Bienvenue</p>
                        <p className="text-xs text-[var(--text-muted)]">
                          Accédez à votre compte
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setIsOpen(false)}
                      className="p-2 rounded-lg hover:bg-[var(--surface)] transition-colors"
                      aria-label="Fermer"
                    >
                      <X className="w-5 h-5 text-[var(--text-muted)]" />
                    </button>
                  </div>
                </div>

                {/* Actions */}
                <div className="p-4 space-y-3">
                  <button
                    onClick={handleLogin}
                    className="w-full flex items-center justify-center gap-2 px-4 py-4 rounded-xl text-base font-semibold transition-all bg-mandarin text-white hover:bg-orange-600 active:scale-[0.98] shadow-lg shadow-mandarin/25"
                  >
                    <LogIn className="w-5 h-5" />
                    Se connecter
                  </button>

                  <button
                    onClick={handleRegister}
                    className="w-full flex items-center justify-center gap-2 px-4 py-4 rounded-xl text-base font-medium transition-all bg-[var(--surface)] text-[var(--text-primary)] hover:bg-[var(--surface)]/80 active:scale-[0.98] border border-[var(--card-border)]"
                  >
                    <UserPlus className="w-5 h-5" />
                    Créer un compte
                  </button>
                </div>

                {/* Footer with safe area padding for iPhone */}
                <div className="px-4 pb-8 pt-2">
                  <p className="text-xs text-center text-[var(--text-muted)]">
                    Inscription gratuite et sans engagement
                  </p>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
