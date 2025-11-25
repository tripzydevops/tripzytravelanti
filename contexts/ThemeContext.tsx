import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  effectiveTheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const getInitialTheme = (): Theme => {
  if (typeof window !== 'undefined' && window.localStorage) {
    const storedPrefs = window.localStorage.getItem('color-theme');
    if (storedPrefs === 'light' || storedPrefs === 'dark' || storedPrefs === 'system') {
      return storedPrefs;
    }
  }
  return 'system';
};

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, rawSetTheme] = useState<Theme>(getInitialTheme);

  const getSystemTheme = useCallback((): 'light' | 'dark' => {
    if (typeof window === 'undefined' || !window.matchMedia) return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }, []);

  const [effectiveTheme, setEffectiveTheme] = useState<'light' | 'dark'>(() => {
    const initialTheme = getInitialTheme();
    return initialTheme === 'system' ? getSystemTheme() : initialTheme;
  });

  const setTheme = (newTheme: Theme) => {
    const root = window.document.documentElement;
    localStorage.setItem('color-theme', newTheme);
    rawSetTheme(newTheme);

    const isDark = newTheme === 'dark' || (newTheme === 'system' && getSystemTheme() === 'dark');

    if (isDark) {
      root.classList.add('dark');
      setEffectiveTheme('dark');
    } else {
      root.classList.remove('dark');
      setEffectiveTheme('light');
    }
  };

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = () => {
      // Only update if the theme is currently set to 'system'
      if (localStorage.getItem('color-theme') === 'system') {
        const systemTheme = getSystemTheme();
        const root = window.document.documentElement;
        if (systemTheme === 'dark') {
          root.classList.add('dark');
        } else {
          root.classList.remove('dark');
        }
        setEffectiveTheme(systemTheme);
      }
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [getSystemTheme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, effectiveTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
