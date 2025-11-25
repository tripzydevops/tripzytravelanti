
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
  const [language, setLanguage] = useState<Language>('en');

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