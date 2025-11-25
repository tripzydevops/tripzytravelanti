
import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

const Footer: React.FC = () => {
  const { t } = useLanguage();

  return (
    <footer className="bg-brand-dark text-white mt-12">
      <div className="container mx-auto px-6 py-4 text-center">
        <p>{t('footerText')}</p>
      </div>
    </footer>
  );
};

export default Footer;
