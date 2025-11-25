
import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';
import { translations } from '../localization';

type Language = 'en' | 'tr';

interface LanguageContextType {
  language: Language;
  toggleLanguage: () => void;
  t: (key: string, params?: Record<string, string>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Detect browser language and default to Turkish unless user is from English-speaking region
  const getInitialLanguage = (): Language => {
    const savedLanguage = localStorage.getItem('language');
    if (savedLanguage === 'en' || savedLanguage === 'tr') {
      return savedLanguage as Language;
    }

    // Check browser language
    const browserLang = navigator.language.toLowerCase();

    // Use Turkish if browser is set to Turkish
    if (browserLang.startsWith('tr')) {
      return 'tr';
    }

    // Default to English for all other cases (Global)
    return 'en';
  };

  const [language, setLanguage] = useState<Language>(getInitialLanguage());

  const toggleLanguage = useCallback(() => {
    setLanguage((prevLang) => (prevLang === 'en' ? 'tr' : 'en'));
  }, []);

  const t = useCallback((key: string, params?: Record<string, string>): string => {
    const keys = key.split('.');
    let result: any = translations[language];
    for (const k of keys) {
      result = result?.[k];
      if (result === undefined) {
        return key; // Return key if translation not found
      }
    }

    let resultString = result as string;
    if (params) {
      Object.keys(params).forEach(pKey => {
        resultString = resultString.replace(`{${pKey}}`, params[pKey]);
      });
    }

    return resultString;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};