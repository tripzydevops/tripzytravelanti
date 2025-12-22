import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';

export type Theme = 'light';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  effectiveTheme: 'light';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>('light');
  const [effectiveTheme, setEffectiveTheme] = useState<'light'>('light');

  const setTheme = (newTheme: Theme) => {
    // No-op as we only want light mode
    console.log('Theme change requested to:', newTheme, 'but light mode is forced.');
  };

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('dark');
    // Ensure local storage is also cleaned up if it exists
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem('color-theme', 'light');
    }
    setEffectiveTheme('light');
    setThemeState('light');
  }, []);

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
