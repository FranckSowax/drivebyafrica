'use client';

import { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  mounted: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Storage key for consistency
const THEME_STORAGE_KEY = 'driveby-theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Initialize from DOM attribute which was set by inline script
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      // First check DOM attribute (set by blocking script)
      const domTheme = document.documentElement.getAttribute('data-theme') as Theme | null;
      if (domTheme === 'light' || domTheme === 'dark') {
        return domTheme;
      }
      // Fallback to localStorage
      try {
        const stored = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
        if (stored === 'light' || stored === 'dark') {
          return stored;
        }
      } catch {
        // localStorage not available
      }
    }
    return 'light';
  });
  const [mounted, setMounted] = useState(false);

  // Sync with DOM on mount and apply theme
  useEffect(() => {
    // Read the actual theme from DOM (set by blocking script before React)
    const domTheme = document.documentElement.getAttribute('data-theme') as Theme | null;

    if (domTheme === 'light' || domTheme === 'dark') {
      setThemeState(domTheme);
    } else {
      // No theme set yet, apply from localStorage or default
      try {
        const stored = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
        const finalTheme = stored === 'dark' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', finalTheme);
        setThemeState(finalTheme);
      } catch {
        document.documentElement.setAttribute('data-theme', 'light');
      }
    }

    setMounted(true);
  }, []);

  const setTheme = useCallback((newTheme: Theme) => {
    // Update state
    setThemeState(newTheme);

    // Update DOM immediately
    document.documentElement.setAttribute('data-theme', newTheme);

    // Persist to localStorage
    try {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch {
      // localStorage not available
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  }, [theme, setTheme]);

  const value = useMemo(
    () => ({ theme, toggleTheme, setTheme, mounted }),
    [theme, toggleTheme, setTheme, mounted]
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
